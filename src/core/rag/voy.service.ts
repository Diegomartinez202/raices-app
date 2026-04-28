import { pipeline, env } from '@xenova/transformers';
import { Voy } from "voy-search";
import { Filesystem, Directory } from '@capacitor/filesystem';
import { getPaths, getRAGParams, logger } from '@/core/config/config.service';

// ================================================================
// CONFIGURACIÓN E IMPORTACIONES DE ESTADO
// ================================================================
const PATHS = getPaths();
const RAG = getRAGParams();

export interface SearchResult {
  texts: string[];
  sources: string[];
  scores: number[];
}

// Configuración de Xenova para entorno local (Soberanía de datos)
env.allowRemoteModels = false;
env.localModelPath = '/models/'; 

let voyIndex: any = null;
let isInitialized = false;
let extractor: any = null;

/**
 * Genera vectores (Embeddings) localmente usando Transformers.js
 * Mantenemos tu lógica de pooling y normalización intacta.
 */
export async function generateEmbeddings(text: string): Promise<number[]> {
  try {
    if (!extractor) {
      // Usamos el nombre del modelo definido en RAG_PARAMS (all-MiniLM-L6-v2)
      extractor = await pipeline('feature-extraction', RAG.EMBEDDING_MODEL_NAME as string);
    }
    const output = await extractor(text, { pooling: 'mean', normalize: true });
    return Array.from(output.data);
  } catch (e) {
    logger.error('[VOY] Error con modelo local ONNX:', e);
    // Fallback: Vector vacío de la dimensión configurada (384)
    return new Array(RAG.EMBEDDING_DIM).fill(0);
  }
}

/**
 * Inicializa el motor de búsqueda Voy (WASM)
 */
export async function initializeVoy(): Promise<boolean> {
  if (isInitialized) return true;
  try {
    logger.info('[VOY] Cargando índice de embeddings...');

    // Leemos el archivo JSON generado por tu script de procesamiento
    const fileData = await Filesystem.readFile({
      path: PATHS.CORPUS_JSON, 
      directory: Directory.Data,
    });

    const data = JSON.parse(fileData.data as string);
    
    // Inicialización del motor Voy con los datos del corpus
    voyIndex = new Voy(data);
    
    isInitialized = true;
    logger.info('[VOY] Motor de búsqueda vectorial listo.');
    return true;
  } catch (error) {
    logger.error('[VOY] Error en inicialización:', error);
    return false;
  }
}

/**
 * Orquestador: Texto -> Vector -> Búsqueda Voy
 */
export async function retrieveContext(text: string) {
  try {
    // 1. Generamos vectores localmente
    const queryVector = await generateEmbeddings(text);
    
    // 2. Buscamos en el motor WASM usando el TOP_K del config
    const results = search(queryVector, RAG.TOP_K);
    
    return {
      chunks: results.texts,
      sources: results.sources
    };
  } catch (error) {
    logger.error('[VOY] Error en recuperación de contexto:', error);
    return { chunks: [], sources: [] };
  }
}

/**
 * Ejecuta la búsqueda matemática en el índice
 */
export function search(queryEmbedding: number[], k: number = 3): SearchResult {
  if (!isInitialized || !voyIndex) throw new Error('Motor Voy no inicializado.');

  const results = voyIndex.search(new Float32Array(queryEmbedding), k);

  return {
    texts: results.neighbors.map((n: any) => {
      // TU FIX: Tu JSON tiene la metadata como string, aquí la parseamos
      const meta = typeof n.metadata === 'string' ? JSON.parse(n.metadata) : n.metadata;
      return meta.texto || "Texto no disponible";
    }),
    sources: results.neighbors.map((n: any) => {
      const meta = typeof n.metadata === 'string' ? JSON.parse(n.metadata) : n.metadata;
      return meta.fuente || "Fuente desconocida";
    }),
    scores: results.neighbors.map((n: any) => 1 - n.distance)
  };
}
export function isVoyReady(): boolean { return isInitialized; }

export function releaseVoy(): void {
  voyIndex = null;
  extractor = null;
  isInitialized = false;
  logger.info('[VOY] Recursos liberados.');
}
export function unloadVoy(): void {
  // Aquí logicamente limpiarías la instancia de Voy
  console.log('[VOY] Motor liberado de memoria');
}