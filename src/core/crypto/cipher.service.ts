/**
 * RAÍCES - Servicio Criptográfico de Alto Nivel
 * Implementación de AES-GCM (Estándar NIST) para Soberanía de Datos.
 */

/**
 * Descifra el corpus utilizando la llave dinámica del dispositivo.
 */
export async function decryptCorpus(encryptedData: string, keyStr: string): Promise<any> {
  try {
    // 1. Importar la llave en bruto (Base64 a CryptoKey)
    const keyBuffer = Uint8Array.from(atob(keyStr), c => c.charCodeAt(0));
    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      keyBuffer,
      { name: 'AES-GCM' },
      false,
      ['decrypt']
    );

    // 2. Extraer IV (primeros 12 bytes) y datos cifrados
    const encryptedBuffer = Uint8Array.from(atob(encryptedData), c => c.charCodeAt(0));
    const iv = encryptedBuffer.slice(0, 12);
    const data = encryptedBuffer.slice(12);

    // 3. Descifrado real por hardware
    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      cryptoKey,
      data
    );

    // 4. Decodificar y parsear a JSON
    const jsonString = new TextDecoder().decode(decrypted);
    return JSON.parse(jsonString);
  } catch (error) {
    console.error('[RAÍCES CRYPTO] Error en descifrado. ¿Llave incorrecta?', error);
    throw new Error('FALLO_DESCIFRADO_CORPUS');
  }
}

/**
 * Cifra el corpus vinculándolo a la llave del dispositivo.
 */
export async function encryptCorpus(data: any, keyStr: string): Promise<string> {
  try {
    const jsonStr = JSON.stringify(data);
    const encodedData = new TextEncoder().encode(jsonStr);

    // 1. Importar la llave
    const keyBuffer = Uint8Array.from(atob(keyStr), c => c.charCodeAt(0));
    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      keyBuffer,
      { name: 'AES-GCM' },
      false,
      ['encrypt']
    );

    // 2. Generar Vector de Inicialización (IV) único
    const iv = crypto.getRandomValues(new Uint8Array(12));

    // 3. Cifrado AES-GCM
    const encrypted = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      cryptoKey,
      encodedData
    );

    // 4. Paquete final: IV + Datos Cifrados en Base64
    const combined = new Uint8Array(iv.length + encrypted.byteLength);
    combined.set(iv);
    combined.set(new Uint8Array(encrypted), iv.length);

    return btoa(String.fromCharCode(...combined));
  } catch (error) {
    console.error('[RAÍCES CRYPTO] Error en cifrado:', error);
    throw new Error('FALLO_CIFRADO_CORPUS');
  }
}