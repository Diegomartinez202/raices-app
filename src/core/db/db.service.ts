import { isDBReady, getAllMessages, saveMessage, getDBConnection } from './sqlite.service';
import { logger } from '../config/config.service';
import { DATABASE_SCHEMA } from './schema'; // <--- Importante para la idoneidad

/**
 * RAÍCES - Orquestador de Persistencia
 * Centraliza las operaciones de datos asegurando la integridad del hito M10.
 */
export const DBService = {
  /**
   * Obtiene los datos para el informe de campo.
   * Valida la disponibilidad del motor SQLCipher.
   */
  async getExportData() {
    if (!isDBReady()) {
      // Intento de recuperación: si no está lista, no podemos inventar datos
      logger.error('[DB SERVICE] Acceso denegado: Base de datos no inicializada.');
      throw new Error("Bóveda de datos cerrada. Inicie la App con su PIN primero.");
    }
    
    logger.info('[DB SERVICE] Extrayendo datos protegidos para informe...');
    return await getAllMessages();
  },

  /**
   * Guarda conversaciones asegurando el cumplimiento del esquema.
   */
  async persistirMensaje(msg: any) {
    if (!msg.text || !msg.sessionId) {
      logger.warn('[DB SERVICE] Intento de guardado de mensaje incompleto omitido.');
      return;
    }
    return await saveMessage(msg);
  },

  /**
   * Verifica la integridad de las tablas (Ideal para auditorías de MinCiencia)
   */
  async verificarIntegridad() {
    const db = getDBConnection();
    if (!db) return false;
    
    // Verificamos si la tabla de mensajes existe realmente
    const res = await db.query(`SELECT name FROM sqlite_master WHERE type='table' AND name='${DATABASE_SCHEMA.TABLES.MESSAGES}';`);
    return (res.values && res.values.length > 0);
  }
};