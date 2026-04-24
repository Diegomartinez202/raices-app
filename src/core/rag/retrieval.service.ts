import { Filesystem, Directory, } from '@capacitor/filesystem';
import { getPaths , logger } from '@/core/config/config.service';

const PATHS = getPaths();

/**
 * Servicio de Recuperación (Retrieval)
 * Lee el corpus cifrado y prepara los datos para el Chat.
 */

// 1. Función para descifrar (La que no encontraste, la creamos aquí)
async function decryptCorpus(encryptedData: Uint8Array): Promise<any> {
  const keyBase64 = import.meta.env.VITE_CORPUS_KEY;
  if (!keyBase64) throw new Error('Llave de cifrado no encontrada en .env');

  const keyBuffer = Uint8Array.from(atob(keyBase64), c => c.charCodeAt(0));
  
  const cryptoKey = await window.crypto.subtle.importKey(
    'raw',
    keyBuffer,
    { name: 'AES-GCM' },
    false,
    ['decrypt']
  );

  const iv = encryptedData.slice(0, 12);
  const data = encryptedData.slice(12);

  const decryptedBuffer = await window.crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: iv },
    cryptoKey,
    data
  );

  return JSON.parse(new TextDecoder().decode(decryptedBuffer));
}

// 2. Función principal para cargar el conocimiento
export async function loadContext(): Promise<any> {
  try {
    logger.info('[RETRIEVAL] Cargando corpus cifrado...');

    // Leer el archivo desde el almacenamiento del móvil
    const file = await Filesystem.readFile({
      path: PATHS.CORPUS_ENCRYPTED,
      directory: Directory.Data,
    });

    // Convertir de base64 a binario (Uint8Array)
    const binaryString = atob(file.data as string);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    // Descifrar
    const corpus = await decryptCorpus(bytes);
    logger.info(`[RETRIEVAL] ${corpus.chunks.length} fragmentos de conocimiento listos.`);
    
    return corpus;
  } catch (error) {
    logger.error('[RETRIEVAL] Error al cargar contexto:', error);
    return null;
  }
}