/**
 * RAÍCES - Servicio de Tokenización y Embeddings
 * Usa all-MiniLM-L6-v2 vía @xenova/transformers
 * 100% Offline. Corre en WebAssembly dentro de Capacitor.
 */

import { pipeline, env } from '@xenova/transformers'
import { Filesystem, Directory } from '@capacitor/filesystem'

// ================================================================
// CONFIGURACIÓN
// ================================================================

// Forzar que Transformers.js use archivos locales, no CDN
env.allowLocalModels = true
env.allowRemoteModels = false
env.localModelPath = '/assets/corpus/' // Capacitor sirve esto desde dist/

type EmbeddingPipeline = (text: string, options?: any) => Promise<any>

let embedder: EmbeddingPipeline | null = null
let isInitialized = false

const MODEL_CONFIG = {
  MODEL_NAME: 'all-MiniLM-L6-v2',
  MODEL_PATH: 'src/assets/corpus/', // Donde está model.onnx + tokenizer.json
  DIMENSION: 384,
  MAX_LENGTH: 256, // all-MiniLM-L6-v2 tiene contexto 256 tokens
}

// ================================================================
// INICIALIZACIÓN
// ================================================================

/**
 * Carga el modelo de embeddings y tokenizer en memoria
 * Tarda 2-4 segundos la primera vez. Luego queda cacheado.
 */
export async function initializeTokenizer(): Promise<boolean> {
  if (isInitialized) return true

  try {
    console.log('[RAÍCES TOKENIZER] Cargando all-MiniLM-L6-v2...')

    // Verifica que los archivos existan en assets
    const modelFiles = [
      'all-MiniLM-L6-v2.onnx',
      'tokenizer.json',
      'tokenizer_config.json'
    ]

    for (const file of modelFiles) {
      try {
        await Filesystem.stat({
          path: `corpus/${file}`,
          directory: Directory.Data
        })
      } catch {
        throw new Error(`Falta archivo: ${file}. Ejecuta pnpm exec tsx scripts/download-assets.ts`)
      }
    }

    // Crea el pipeline de feature-extraction
    // quantified: true = usa versión INT8 más rápida y pequeña
    embedder = await pipeline('feature-extraction', MODEL_CONFIG.MODEL_NAME, {
      quantized: true,
      local_files_only: true,
      cache_dir: MODEL_CONFIG.MODEL_PATH,
    })

    isInitialized = true
    console.log('[RAÍCES TOKENIZER] Modelo listo. Dimensión:', MODEL_CONFIG.DIMENSION)
    return true

  } catch (error) {
    console.error('[RAÍCES TOKENIZER] Error fatal al cargar modelo:', error)
    isInitialized = false
    return false
  }
}

// ================================================================
// GENERACIÓN DE EMBEDDINGS
// ================================================================

/**
 * Convierte texto a vector de 384 dimensiones usando MiniLM
 * @param text Texto a convertir - máximo 256 tokens
 * @param normalize Si true, retorna vector L2-normalizado para similitud coseno
 * @returns Float32Array de 384 dimensiones
 */
export async function getEmbedding(
  text: string,
  normalize: boolean = true
): Promise<Float32Array> {
  if (!isInitialized ||!embedder) {
    throw new Error('Tokenizer no inicializado. Llama a initializeTokenizer() primero.')
  }

  if (!text || text.trim().length === 0) {
    throw new Error('Texto vacío no se puede convertir a embedding.')
  }

  try {
    // 1. Trunca a 256 tokens aprox - 4 chars por token
    const truncated = text.length > 1000? text.substring(0, 1000) : text

    // 2. Genera embedding - pooling: 'mean' promedia todos los tokens
    const output = await embedder(truncated, {
      pooling: 'mean',
      normalize: normalize,
    })

    // 3. Extrae el Float32Array
    const embedding = output.data as Float32Array

    if (embedding.length!== MODEL_CONFIG.DIMENSION) {
      throw new Error(`Dimensión incorrecta: ${embedding.length}, esperado: ${MODEL_CONFIG.DIMENSION}`)
    }

    return embedding

  } catch (error) {
    console.error('[RAÍCES TOKENIZER] Error generando embedding:', error)
    // Fallback: vector de ceros para no romper el flujo
    return new Float32Array(MODEL_CONFIG.DIMENSION)
  }
}

/**
 * Genera embeddings en batch - más eficiente para indexar corpus
 * @param texts Array de textos
 * @returns Array de Float32Array
 */
export async function getEmbeddingsBatch(texts: string[]): Promise<Float32Array[]> {
  // 1. Chequeo de seguridad: Si no hay embedder, lanzamos error explícito
  if (!isInitialized || !embedder) {
    throw new Error('Tokenizer no inicializado.');
  }

  // 2. "Anclaje" de variable: Creamos una constante local. 
  // Esto le garantiza a TS que 'instance' no cambiará a null durante el proceso.
  const instance = embedder;

  try {
    console.log(`[RAÍCES TOKENIZER] Generando ${texts.length} embeddings...`);

    // 3. Ejecución y Mapeo: 
    // Usamos Promise.all para procesar el arreglo. 
    // Cada 'res' es el objeto que devuelve Transformers.js para UN texto.
    const results = await Promise.all(
      texts.map(t => instance(t, { pooling: 'mean', normalize: true }))
    );

    // 4. Extracción de datos:
    // Como usamos Promise.all, 'results' es un array de objetos, no un objeto con .data
    return results.map(res => {
      if (res && res.data instanceof Float32Array) {
        return res.data;
      }
      // Si por alguna razón falla un chunk, devolvemos un vector vacío para no romper el índice
      return new Float32Array(MODEL_CONFIG.DIMENSION);
    });

  } catch (error) {
    console.error('[RAÍCES TOKENIZER] Error en batch:', error);
    return texts.map(() => new Float32Array(MODEL_CONFIG.DIMENSION));
  }
}
export function isTokenizerReady(): boolean { 
  return isInitialized;
}
/**
 * Libera el tokenizer de la memoria RAM
 */
export function unloadTokenizer(): void {
  // En Xenova/Transformers.js, liberar la memoria suele ser 
  // simplemente limpiar la referencia si no hay un método .dispose()
  isInitialized = false;
  console.log('[TOKENIZER] Memoria liberada.');
}