/**
 * RAÍCES - Servicio de Auditoría
 * Registra eventos de seguridad sin datos personales
 * Cumple Ley 1581 - Trazabilidad sin invasión a la privacidad
 * Todos los logs van a SQLCipher, se borran con botón de pánico
 */

import { getDBParams, getPaths } from '@/core/config/config.service'
import { SQLiteDBConnection } from '@capacitor-community/sqlite'

// Tipos de eventos permitidos - nada de contenido de chat
export type AuditEventType =
  | 'APP_START' // App iniciada
  | 'APP_PAUSE' // App a background
  | 'APP_RESUME' // App vuelve a foreground
  | 'SESSION_UNLOCK' // Desbloqueo exitoso con PIN/bio
  | 'SESSION_LOCK' // Bloqueo por inactividad
  | 'SESSION_UNLOCK_FAIL' // Intento fallido de PIN
  | 'PIN_CREATED' // PIN configurado primera vez
  | 'PIN_REMOVED' // PIN eliminado
  | 'BIOMETRIC_ENABLED' // Biometría activada
  | 'BIOMETRIC_DISABLED' // Biometría desactivada
  | 'DB_INIT_SUCCESS' // SQLCipher inicializado
  | 'DB_INIT_FAIL' // Error al abrir BD
  | 'LLM_LOAD_SUCCESS' // Gemma cargado
  | 'LLM_LOAD_FAIL' // Error al cargar modelo
  | 'RAG_INIT_SUCCESS' // FAISS + corpus listo
  | 'RAG_INIT_FAIL' // Error en RAG
  | 'EXPORT_PDF' // Historial exportado a PDF
  | 'EXPORT_JSON' // Backup JSON generado
  | 'PANIC_ACTIVATED' // Botón de pánico presionado
  | 'WIPE_COMPLETED' // Borrado completado
  | 'WIPE_FAILED' // Error durante borrado
  | 'ERROR_CRITICAL' // Error no controlado

export interface AuditLog {
  id: string
  eventType: AuditEventType
  timestamp: number
  sessionId: string | null
  metadata?: string // JSON string con datos NO sensibles: ej {"duration_ms": 1200}
  severity: 'info' | 'warn' | 'error'
}

let db: SQLiteDBConnection | null = null
let currentSessionId: string | null = null
let isInitialized = false

const DB = getDBParams()
const PATHS = getPaths()

// ================================================================
// INICIALIZACIÓN
// ================================================================

export async function initializeAudit(
  dbConnection: SQLiteDBConnection,
  sessionId: string
): Promise<boolean> {
  if (isInitialized) return true

  try {
    db = dbConnection
    currentSessionId = sessionId

    // INTEGRACIÓN TÉCNICA DE 'DB' Y 'PATHS'
    // Usamos 'DB' para validar el nivel de cifrado en el log de auditoría
    // Usamos 'PATHS' para dejar constancia de dónde reside el cerebro de la app
    const configMetadata = {
      cipher_version: DB.VERSION, // Accedemos a la propiedad que SÍ existe
      model_path: PATHS.LLM_MODEL, // Accedemos a la propiedad que SÍ existe
      encrypted_status: DB.ENCRYPTED
    };

    // Crea tabla si no existe
    await db.execute(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id TEXT PRIMARY KEY NOT NULL,
        eventType TEXT NOT NULL,
        timestamp INTEGER NOT NULL,
        sessionId TEXT,
        metadata TEXT,
        severity TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON audit_logs(timestamp);
    `)

    isInitialized = true
    
    // Registramos el inicio con la metadata técnica que acabamos de leer
    await logEvent('APP_START', { 
      severity: 'info',
      metadata: configMetadata 
    })
    
    return true

  } catch (error) {
    // Usamos DB.VERSION aquí para dar contexto al error sin usar 'database'
    console.error(`[RAÍCES AUDIT] Error en motor v${DB.VERSION}:`, error)
    return false
  }
}

// ================================================================
// LOGGING
// ================================================================

/**
 * Registra un evento de auditoría
 * @param eventType Tipo de evento - NO incluir contenido de chat
 * @param options Metadata opcional - solo datos técnicos no sensibles
 */
export async function logEvent(
  eventType: AuditEventType,
  options?: {
    metadata?: Record<string, string | number | boolean>
    severity?: 'info' | 'warn' | 'error'
    sessionId?: string
  }
): Promise<void> {
  if (!isInitialized ||!db) {
    // Si auditoría no está lista, solo console.log
    console.warn(`[AUDIT] ${eventType}`, options?.metadata)
    return
  }

  try {
    const log: AuditLog = {
      id: `${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      eventType,
      timestamp: Date.now(),
      sessionId: options?.sessionId || currentSessionId,
      metadata: options?.metadata? JSON.stringify(options.metadata) : undefined,
      severity: options?.severity || 'info',
    }

    await db.run(
      `INSERT INTO audit_logs (id, eventType, timestamp, sessionId, metadata, severity)
       VALUES (?,?,?,?,?,?)`,
      [log.id, log.eventType, log.timestamp, log.sessionId, log.metadata, log.severity]
    )

    // Log a consola solo en dev
    if (import.meta.env.DEV) {
      console.log(`[AUDIT ${log.severity.toUpperCase()}]`, eventType, log.metadata)
    }

  } catch (error) {
    // Si falla auditoría, no rompemos la app
    console.error('[RAÍCES AUDIT] Error al registrar evento:', error)
  }
}

/**
 * Registra error crítico con stack trace sanitizado
 */
export async function logError(error: Error, context?: string): Promise<void> {
  const sanitizedStack = error.stack
  ?.split('\n')
   .slice(0, 3) // Solo primeras 3 líneas
  ?.join(' | ') || 'no stack'

  await logEvent('ERROR_CRITICAL', {
    severity: 'error',
    metadata: {
      name: error.name,
      message: error.message.substring(0, 100), // Trunca mensaje
      context: context || 'unknown',
      stack: sanitizedStack,
    },
  })
}

// ================================================================
// CONSULTAS
// ================================================================

/**
 * Obtiene últimos N logs - para debug o exportar
 * NO incluye contenido de mensajes
 */
export async function getRecentLogs(limit: number = 100): Promise<AuditLog[]> {
  if (!isInitialized ||!db) return []

  try {
    const res = await db.query(`
      SELECT * FROM audit_logs
      ORDER BY timestamp DESC
      LIMIT?
    `, [limit])

    return res.values?.map(row => ({
      id: row.id,
      eventType: row.eventType as AuditEventType,
      timestamp: row.timestamp,
      sessionId: row.sessionId,
      metadata: row.metadata,
      severity: row.severity as 'info' | 'warn' | 'error',
    })) || []

  } catch (error) {
    console.error('[RAÍCES AUDIT] Error al leer logs:', error)
    return []
  }
}

/**
 * Cuenta eventos por tipo - útil para métricas
 */
export async function countEventsByType(eventType: AuditEventType): Promise<number> {
  if (!isInitialized ||!db) return 0

  try {
    const res = await db.query(
      'SELECT COUNT(*) as count FROM audit_logs WHERE eventType =?',
      [eventType]
    )
    return res.values?.[0]?.count || 0
  } catch {
    return 0
  }
}

/**
 * Obtiene logs de una sesión específica
 */
export async function getSessionLogs(sessionId: string): Promise<AuditLog[]> {
  if (!isInitialized ||!db) return []

  try {
    const res = await db.query(`
      SELECT * FROM audit_logs
      WHERE sessionId =?
      ORDER BY timestamp ASC
    `, [sessionId])

    return res.values?.map(row => ({
      id: row.id,
      eventType: row.eventType as AuditEventType,
      timestamp: row.timestamp,
      sessionId: row.sessionId,
      metadata: row.metadata,
      severity: row.severity as 'info' | 'warn' | 'error',
    })) || []

  } catch (error) {
    console.error('[RAÍCES AUDIT] Error al leer logs de sesión:', error)
    return []
  }
}

// ================================================================
// LIMPIEZA
// ================================================================

/**
 * Borra logs de auditoría - usado por botón de pánico
 * NOTA: secure-wipe.service.ts sobrescribe el archivo físico después
 */
export async function clearAuditLogs(): Promise<void> {
  if (!isInitialized ||!db) return

  try {
    await db.execute('DELETE FROM audit_logs')
    await db.execute('VACUUM')
    console.log('[RAÍCES AUDIT] Logs borrados')
  } catch (error) {
    console.error('[RAÍCES AUDIT] Error al borrar logs:', error)
  }
}

/**
 * Borra logs más antiguos que N días - rotación automática
 */
export async function pruneOldLogs(daysToKeep: number = 90): Promise<void> {
  if (!isInitialized ||!db) return

  try {
    const cutoff = Date.now() - (daysToKeep * 24 * 60 * 60 * 1000)
    await db.run('DELETE FROM audit_logs WHERE timestamp <?', [cutoff])
    await db.execute('VACUUM')
    console.log(`[RAÍCES AUDIT] Logs anteriores a ${daysToKeep} días eliminados`)
  } catch (error) {
    console.error('[RAÍCES AUDIT] Error al podar logs:', error)
  }
}

/**
 * Exporta logs a JSON - para debugging o reporte
 */
export async function exportAuditLogs(): Promise<string | null> {
  if (!isInitialized ||!db) return null

  try {
    const logs = await getRecentLogs(1000)
    const exportData = {
      app: 'RAÍCES',
      exportedAt: Date.now(),
      totalLogs: logs.length,
      logs: logs.map(l => ({
      ...l,
        metadata: l.metadata? JSON.parse(l.metadata) : undefined,
      })),
    }

    return JSON.stringify(exportData, null, 2)
  } catch (error) {
    console.error('[RAÍCES AUDIT] Error al exportar:', error)
    return null
  }
}

// ================================================================
// CIERRE
// ================================================================

/**
 * Cierra auditoría - no cierra DB, solo limpia estado
 */
export function closeAudit(): void {
  isInitialized = false
  db = null
  currentSessionId = null
  console.log('[RAÍCES AUDIT] Auditoría cerrada')
}