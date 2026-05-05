/**
 * RAÍCES - Servicio de Persistencia Segura
 * Implementación de SQLCipher con Capacitor SQLite
 * Cumple Ley 1581 - Seguridad y Privacidad desde el Diseño
 */

import { CapacitorSQLite, SQLiteConnection, SQLiteDBConnection } from '@capacitor-community/sqlite'
import { SecureStoragePlugin } from 'capacitor-secure-storage-plugin'
import { getPaths, getSecureKeys, getDBParams, logger } from '@/core/config/config.service'
import { initializeAudit, logEvent } from '@/core/audit/audit.service';
import { DATABASE_SCHEMA } from './schema';
// --- INTERFACES ---
const PATHS = getPaths();
const KEYS = getSecureKeys();
const DB_PARAMS = getDBParams();

export interface DBMessage {
  id: string;
  text: string;
  isUser: number; // 0 o 1 en SQLite
  timestamp: number;
  source?: string;
  sessionId: string;
}

export interface ChatMessage {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: number;
  source?: string;
}

// --- ESTADO ---
let sqlite: SQLiteConnection | null = null;
let db: SQLiteDBConnection | null = null;
let isInitialized = false;
let currentSessionId: string = "SESSION_PENDING";

// ================================================================
// SEGURIDAD DE CLAVES (KEYCHAIN / KEYSTORE)
// ================================================================

async function getOrCreateDBKey(): Promise<string> {
  try {
    const res = await SecureStoragePlugin.get({ key: KEYS.DB_KEY });
    if (res.value) return res.value;
  } catch (e) { /* No existe, proceder a crearla */ }

  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  const key = btoa(String.fromCharCode(...array));

  await SecureStoragePlugin.set({ key: KEYS.DB_KEY, value: key });
  return key;
}

// ================================================================
// INICIALIZACIÓN
// ================================================================

export async function initializeDB(): Promise<boolean> {
  if (isInitialized && db) return true;

  try {
    logger.info('[RAÍCES DB] Inicializando persistencia cifrada...');
    
    // 1. Inicializar el motor de SQLite
    sqlite = new SQLiteConnection(CapacitorSQLite);
    
    // 2. Obtener o crear la llave criptográfica del hardware
    const dbKey = await getOrCreateDBKey();

    // 3. Crear la conexión técnica
    // Usamos sqlite! para asegurar que no es nulo tras la instancia
    db = await sqlite!.createConnection(
      PATHS.DB_NAME,
      DB_PARAMS.ENCRYPTED,
      'secret', // Password inicial de conexión
      DB_PARAMS.VERSION,
      false
    );

    // 4. Verificación de seguridad para TypeScript
    if (!db) {
      throw new Error('No se pudo crear la instancia de base de datos.');
    }

    // 5. Abrir el túnel de datos
    await db.open();

    // --- 6. HARDENING SQLCIPHER (Nivel Bancario) ---
    // Aplicamos la seguridad avanzada antes de crear tablas
    await db.execute(`PRAGMA key = '${dbKey}';`);
    
    if (DB_PARAMS.CIPHER_MEMORY_SECURITY) {
      await db.execute(`PRAGMA cipher_memory_security = ON;`);
    }
    
    await db.execute(`PRAGMA cipher_default_kdf_iter = ${DB_PARAMS.KDF_ITER};`);

// --- 7. ESTRUCTURA DE DATOS (Ddl) ---
// Ejecutamos las sentencias definidas en el esquema centralizado
    await db.execute(DATABASE_SCHEMA.CREATE_MESSAGES_TABLE);
    await db.execute(DATABASE_SCHEMA.CREATE_AUDIT_TABLE);

    // Aplicamos todos los índices definidos para optimizar SPSS/ATLAS.ti
    for (const indexQuery of DATABASE_SCHEMA.INDICES) {
      await db.execute(indexQuery);
    }

    // --- 8. GESTIÓN DE SESIÓN Y AUDITORÍA SOBERANA ---
    // Generamos el ID de sesión definitivo para este arranque
    currentSessionId = `SESS-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // Pasamos el control a la auditoría para que use esta misma conexión
    const auditOk = await initializeAudit(db, currentSessionId);

    // Si la auditoría se inició bien, registramos el éxito del arranque
    if (auditOk) {
      await logEvent('DB_INIT_SUCCESS', { 
        severity: 'info',
        metadata: { 
          engine: 'SQLCipher', 
          iterations: DB_PARAMS.KDF_ITER,
          mem_security: DB_PARAMS.CIPHER_MEMORY_SECURITY ? 'ON' : 'OFF',
          session: currentSessionId
        }
      });
    }

    isInitialized = true;
    logger.info(`[RAÍCES DB] SQLCipher Activo. Sesión: ${currentSessionId}`);
    return true;

  } catch (error: any) {
    logger.error('[RAÍCES DB ERROR]', error);
    
    // Intentamos registrar el fallo si la base de datos permite el acceso
    try {
      await logEvent('DB_INIT_FAIL', { 
        severity: 'error', 
        metadata: { error: error.message } 
      });
    } catch (auditErr) {
      // Fallo silencioso: si la DB no abrió, la auditoría no puede escribir
    }

    isInitialized = false;
    return false;
  }
}
// ================================================================
// OPERACIONES (CRUD) - RESTAURADAS
// ================================================================

export async function saveMessage(msg: ChatMessage): Promise<void> {
  if (!isInitialized || !db) return;

  try {
    // Usamos DATABASE_SCHEMA.TABLES.MESSAGES para asegurar consistencia
    const stmt = `
      INSERT OR REPLACE INTO ${DATABASE_SCHEMA.TABLES.MESSAGES} (id, text, isUser, timestamp, source, sessionId)
      VALUES (?, ?, ?, ?, ?, ?);
    `;
    await db.run(stmt, [
      msg.id,
      msg.text,
      msg.isUser ? 1 : 0,
      msg.timestamp,
      msg.source || null,
      currentSessionId
    ]);
  } catch (e) {
    logger.error('[RAÍCES DB] Error al guardar:', e);
  }
}

/**
 * Obtiene TODOS los mensajes para exportación (PDF/JSON)
 * ¡Función restaurada!
 */
export async function getAllMessages(): Promise<DBMessage[]> {
  if (!isInitialized || !db) return [];
  try {
    // Referencia dinámica a la tabla de mensajes
    const res = await db.query(`SELECT * FROM ${DATABASE_SCHEMA.TABLES.MESSAGES} ORDER BY timestamp ASC`);
    return res.values as DBMessage[] || [];
  } catch (e) {
    logger.error('[RAÍCES DB] Error en getAllMessages:', e);
    return [];
  }
}

/**
 * Obtiene los últimos mensajes para la interfaz de chat (Ordenados para UI)
 * ¡Función restaurada!
 */
export async function getMessages(limit: number = 50): Promise<DBMessage[]> {
  if (!isInitialized || !db) return [];

  try {
    const res = await db.query(`
      SELECT * FROM ${DATABASE_SCHEMA.TABLES.MESSAGES}
      ORDER BY timestamp DESC
      LIMIT ?
    `, [limit]);

    // Reverse para que en la UI aparezcan en orden cronológico
    return (res.values || []).reverse() as DBMessage[];
  } catch (e) {
    logger.error('[RAÍCES DB] Error en getMessages:', e);
    return [];
  }
}

/**
 * Derecho a la Supresión (Ley 1581)
 */
export async function clearAllHistory(): Promise<void> {
  if (!isInitialized || !db) return;
  await db.execute('DELETE FROM messages;');
  await db.execute('VACUUM;'); 
  logger.warn('[RAÍCES DB] Historial destruido físicamente.');
}

/**
 * Retorna la instancia activa de la base de datos
 * Útil para inicializar servicios dependientes como Auditoría
 */
export const getDBConnection = () => {
  return db; // <--- Ahora retorna 'db'
};
// ================================================================
// UTILIDADES Y CIERRE
// ================================================================

export function getCurrentSessionId(): string {
  return currentSessionId; 
}

/**
 * Verifica el estado operativo de la base de datos.
 */
export function isDBReady(): boolean {
  return isInitialized && db !== null;
}

export async function closeDB(): Promise<void> {
  try {
    if (db) {
      await db.close();
      db = null;
    }
    
    if (sqlite) {
      // false indica que no borramos el archivo físico, solo cerramos la conexión
      await sqlite.closeConnection(PATHS.DB_NAME, false);
    }
    
    isInitialized = false;
    logger.info('[SQLITE] Conexión cerrada y recursos liberados.');
  } catch (error) {
    logger.error('[SQLITE] Error al cerrar la conexión:', error);
  }
}

