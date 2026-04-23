import { SecureStoragePlugin } from 'capacitor-secure-storage-plugin';
import { logger } from '@/core/config/config.service';

/**
 * SERVICIO DE ALMACENAMIENTO SEGURO
 * Gestiona datos sensibles en el enclave de hardware del dispositivo.
 * Indispensable para el cumplimiento de Soberanía de Datos.
 */
export const SecureStorage = {
  
  /**
   * Guarda un dato cifrado (ej. el PIN o la Llave Maestra)
   */
  async set(key: string, value: string): Promise<boolean> {
    try {
      await SecureStoragePlugin.set({ key, value });
      return true;
    } catch (error) {
      logger.error(`[SECURE STORAGE] Error guardando ${key}`, error);
      return false;
    }
  },

  /**
   * Recupera un dato del área segura
   */
  async get(key: string): Promise<string | null> {
    try {
      const { value } = await SecureStoragePlugin.get({ key });
      return value;
    } catch (error) {
      // Es normal que falle si la llave no existe aún
      return null;
    }
  },

  /**
   * Elimina un dato específico (Usado en el Protocolo de Pánico)
   */
  async remove(key: string): Promise<boolean> {
    try {
      await SecureStoragePlugin.remove({ key });
      return true;
    } catch (error) {
      logger.error(`[SECURE STORAGE] Error eliminando ${key}`, error);
      return false;
    }
  },

  /**
   * Limpieza total de la bóveda
   */
  async clearAll(): Promise<boolean> {
    try {
      await SecureStoragePlugin.clear();
      return true;
    } catch (error) {
      logger.error('[SECURE STORAGE] Error en limpieza total', error);
      return false;
    }
  }
};