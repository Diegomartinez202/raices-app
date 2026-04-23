import { SecureStoragePlugin } from 'capacitor-secure-storage-plugin';

const MASTER_CORPUS_KEY = 'CLAVE_ESTATICA_QUE_CIFRA_EL_JSON_INICIAL'; // La que usaste para cifrar el .enc originalmente

/**
 * Gestiona la identidad criptográfica única del dispositivo.
 */
export const KeyService = {
  /**
   * Obtiene la llave estática necesaria para el primer contacto con el corpus
   */
  getMasterKey: () => MASTER_CORPUS_KEY,

  /**
   * Genera o recupera la llave única del hardware (TEE)
   */
  async getOrCreateDynamicKey(): Promise<string> {
    const KEY_NAME = 'RAICES_DYNAMIC_KEY';
    try {
      const res = await SecureStoragePlugin.get({ key: KEY_NAME });
      if (res.value) return res.value;
    } catch (e) { /* No existe */ }

    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    const newKey = btoa(String.fromCharCode(...array));
    
    await SecureStoragePlugin.set({ key: KEY_NAME, value: newKey });
    return newKey;
  }
};