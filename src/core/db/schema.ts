/**
 * RAÍCES - Esquema de Datos Soberano
 * Define la estructura de la base de datos SQLCipher.
 * Cumple con estándares de integridad para MinCiencia 2026.
 */

export const DATABASE_SCHEMA = {
  TABLES: {
    MESSAGES: 'messages',
    AUDIT_LOGS: 'audit_logs'
  },
  
  // Sentencia de creación para la persistencia de conversaciones
  CREATE_MESSAGES_TABLE: `
    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY NOT NULL,
      text TEXT NOT NULL,
      isUser INTEGER NOT NULL,
      timestamp INTEGER NOT NULL,
      source TEXT,
      sessionId TEXT NOT NULL
    );
  `,

  // Sentencia para la trazabilidad y auditoría de campo
  CREATE_AUDIT_TABLE: `
    CREATE TABLE IF NOT EXISTS audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      eventType TEXT NOT NULL,
      severity TEXT NOT NULL,
      metadata TEXT,
      sessionId TEXT NOT NULL
    );
  `,

  // Índices para optimizar la triangulación de datos en SPSS/ATLAS.ti
  INDICES: [
    'CREATE INDEX IF NOT EXISTS idx_timestamp ON messages(timestamp);',
    'CREATE INDEX IF NOT EXISTS idx_session ON messages(sessionId);',
    'CREATE INDEX IF NOT EXISTS idx_audit_type ON audit_logs(eventType);'
  ]
};