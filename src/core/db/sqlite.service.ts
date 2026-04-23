/**
 * RAÍCES - Servicio de Persistencia Segura
 * Implementación de SQLCipher con Capacitor SQLite
 * Cumple Ley 1581 - Seguridad y Privacidad desde el Diseño
 */

import { CapacitorSQLite, SQLiteConnection, SQLiteDBConnection } from '@capacitor-community/sqlite'
import { SecureStoragePlugin } from 'capacitor-secure-storage-plugin'
import { getPaths, getSecureKeys, getDBParams, logger } from '@/core/config/config.service'

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
let sqlite: SQLiteConnection;
let db: SQLiteDBConnection | null = null;
let isInitialized = false;
let currentSessionId: string = '';

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
  if (isInitialized) return true;

  try {
    logger.info('[RAÍCES DB] Inicializando persistencia cifrada...');
    sqlite = new SQLiteConnection(CapacitorSQLite);
    const dbKey = await getOrCreateDBKey();

    db = await sqlite.createConnection(
      PATHS.DB_NAME,
      DB_PARAMS.ENCRYPTED,
      'secret', // Activa SQLCipher
      DB_PARAMS.VERSION,
      false
    );

    await db.open();

    // Hardening SQLCipher (Nivel Bancario)
    await db.execute(`PRAGMA key = '${dbKey}';`);
    if (DB_PARAMS.CIPHER_MEMORY_SECURITY) {
      await db.execute(`PRAGMA cipher_memory_security = ON;`);
    }
    await db.execute(`PRAGMA cipher_default_kdf_iter = ${DB_PARAMS.KDF_ITER};`);

    // Crear tablas con soporte para sesiones y auditoría
    await db.execute(`
      CREATE TABLE IF NOT EXISTS messages (
        id TEXT PRIMARY KEY NOT NULL,
        text TEXT NOT NULL,
        isUser INTEGER NOT NULL,
        timestamp INTEGER NOT NULL,
        source TEXT,
        sessionId TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_timestamp ON messages(timestamp);
      CREATE INDEX IF NOT EXISTS idx_session ON messages(sessionId);
    `);

    // ID de sesión único para trazabilidad de la ejecución actual
    currentSessionId = `SESSION_${Date.now()}`;
    
    isInitialized = true;
    logger.info(`[RAÍCES DB] SQLCipher Activo. Sesión: ${currentSessionId}`);
    return true;
  } catch (error) {
    logger.error('[RAÍCES DB ERROR]', error);
    return false;
  }
}

// ================================================================
// OPERACIONES (CRUD) - RESTAURADAS
// ================================================================

export async function saveMessage(msg: ChatMessage): Promise<void> {
  if (!isInitialized || !db) return;

  try {
    const stmt = `
      INSERT OR REPLACE INTO messages (id, text, isUser, timestamp, source, sessionId)
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
    const res = await db.query(`SELECT * FROM messages ORDER BY timestamp ASC`);
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
      SELECT * FROM messages
      ORDER BY timestamp DESC
      LIMIT ?
    `, [limit]);

    // Reverse para que en la UI aparezcan en orden cronológico (abajo el más nuevo)
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
export function getDatabaseConnection(): SQLiteDBConnection | null {
  return db;
}
// ================================================================
// UTILIDADES Y CIERRE
// ================================================================

export function getCurrentSessionId(): string {
  return currentSessionId; 
}

export function isDBReady(): boolean {
  return isInitialized && db !== null;
}

export async function closeDB(): Promise<void> {
  if (db) {
    await db.close();
    db = null;
  }
  if (sqlite) {
    await sqlite.closeConnection(PATHS.DB_NAME, false);
  }
  isInitialized = false;
}