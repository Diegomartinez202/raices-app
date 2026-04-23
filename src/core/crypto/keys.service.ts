import { SecureStoragePlugin } from 'capacitor-secure-storage-plugin';

const MASTER_CORPUS_KEY = 'CLAVE_ESTATICA_QUE_CIFRA_EL_JSON_INICIAL'; 

/**
 * SERVICIO DE IDENTIDAD CRIPTOGRÁFICA SOBERANA
 * Gestiona el ciclo de vida de las llaves en el TEE (Trusted Execution Environment).
 */
export const KeyService = {
  
  /**
   * Llave maestra para el descifrado del Corpus JEP inicial.
   */
  getMasterKey: () => MASTER_CORPUS_KEY,

  /**
   * FASE 3 DEL ARRANQUE: Inicializa el entorno seguro.
   * Reemplaza a getOrCreateDynamicKey para ser compatible con useRaicesSystem.
   */
  async obtenerOCrearLlaves(): Promise<string> {
    return await this.obtenerClaveDinamica();
  },

  /**
   * CLAVE DINÁMICA: Recupera del hardware seguro o genera una nueva.
   * Implementa entropía de hardware mediante crypto.getRandomValues.
   */
  async obtenerClaveDinamica(): Promise<string> {
    const KEY_NAME = 'RAICES_HARDWARE_KEY_V1';
    
    try {
      // Intentamos recuperar la llave del enclave seguro
      const res = await SecureStoragePlugin.get({ key: KEY_NAME });
      if (res.value) {
        console.log('[CRYPTO] Llave persistente recuperada del hardware.');
        return res.value;
      }
    } catch (e) { 
      // Si falla o no existe, procedemos a generar una nueva
      console.warn('[CRYPTO] Generando nueva identidad criptográfica...');
    }

    // GENERACIÓN DE ENTROPÍA (32 bytes = 256 bits, estándar AES-256)
    const array = new Uint8Array(32);
    window.crypto.getRandomValues(array);
    
    // Codificación segura para almacenamiento
    const newKey = btoa(String.fromCharCode(...array));
    
    // Persistencia en el KeyStore/Keychain nativo
    await SecureStoragePlugin.set({ 
      key: KEY_NAME, 
      value: newKey 
    });

    return newKey;
  }
};