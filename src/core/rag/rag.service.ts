import { Filesystem, Directory, Encoding } from '@capacitor/filesystem'
import * as ort from 'onnxruntime-web'

// 1. IMPORTACIONES DE SERVICIOS
import { 
  initializeTokenizer, 
  getEmbedding as getRealEmbedding, 
  isTokenizerReady 
} from './tokenizer.service'
import { KeyService } from '../crypto/keys.service';
import { getPaths, getRAGParams, logger } from '@/core/config/config.service';

// ================================================================
// TIPOS E INTERFACES
// ================================================================
const PATHS = getPaths();
const RAG = getRAGParams();

export interface RAGResult {
  chunks: string[]
  sources: string[]
  scores: number[]
}

interface CorpusChunk {
  id: string
  texto: string
  fuente: string
  macrocaso?: number // Mantenemos tus campos opcionales del script
  tema?: string
  embedding?: number[] 
}

// ================================================================
// ESTADO GLOBAL
// ================================================================
let corpusMetadata: CorpusChunk[] = []
let embeddingSession: ort.InferenceSession | null = null
let isInitialized = false

// ================================================================
// FUNCIONES DE APOYO (CIFRADO HARDWARE AES-GCM) - ¡TU LÓGICA INTACTA!
// ================================================================

/**
 * Descifra el corpus usando AES-GCM con una llave específica (Master o Dinámica)
 */
async function decryptCorpus(encryptedData: string, keyStr: string): Promise<CorpusChunk[]> {
  try {
    const keyBuffer = Uint8Array.from(atob(keyStr), c => c.charCodeAt(0));
    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      keyBuffer,
      { name: 'AES-GCM' },
      false,
      ['decrypt']
    );

    const encryptedBuffer = Uint8Array.from(atob(encryptedData), c => c.charCodeAt(0));
    const iv = encryptedBuffer.slice(0, 12);
    const data = encryptedBuffer.slice(12);

    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      cryptoKey,
      data
    );

    const jsonString = new TextDecoder().decode(decrypted);
    const parsed = JSON.parse(jsonString);
    return parsed.chunks as CorpusChunk[];
  } catch (error) {
    logger.error('[RAÍCES RAG] Error crítico de descifrado:', error);
    throw error;
  }
}

/**
 * Cifra el corpus para vincularlo permanentemente al hardware del dispositivo
 */
async function encryptCorpus(chunks: CorpusChunk[], keyStr: string): Promise<string> {
  const jsonString = JSON.stringify({ chunks });
  const data = new TextEncoder().encode(jsonString);
  
  const keyBuffer = Uint8Array.from(atob(keyStr), c => c.charCodeAt(0));
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyBuffer,
    { name: 'AES-GCM' },
    false,
    ['encrypt']
  );

  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    cryptoKey,
    data
  );

  const combined = new Uint8Array(iv.length + encrypted.byteLength);
  combined.set(iv);
  combined.set(new Uint8Array(encrypted), iv.length);
  
  return btoa(String.fromCharCode(...combined));
}

/**
 * Similitud Coseno para comparación de vectores semánticos
 */
function cosineSimilarity(vecA: number[] | Float32Array, vecB: number[] | Float32Array): number {
  let dotProduct = 0, mA = 0, mB = 0;
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    mA += vecA[i] * vecA[i];
    mB += vecB[i] * vecB[i];
  }
  const magnitude = Math.sqrt(mA) * Math.sqrt(mB);
  return magnitude === 0 ? 0 : dotProduct / magnitude;
}

/**
 * Convierte texto a embedding usando el motor de inferencia local
 */
async function getEmbedding(text: string): Promise<number[]> {
  if (!isTokenizerReady()) {
    throw new Error('Tokenizer no listo.')
  }
  const floatArray = await getRealEmbedding(text, true); 
  return Array.from(floatArray); 
}

// ================================================================
// EXPORTS PRINCIPALES (INICIALIZACIÓN Y CONSULTA)
// ================================================================

export async function initializeRAG(): Promise<boolean> {
  if (isInitialized) return true;

  try {
    logger.info('[RAÍCES RAG] Iniciando sistema soberano...');

    // A. Inicializar Tokenizer real
    const tokenizerOk = await initializeTokenizer();
    if (!tokenizerOk) throw new Error('Fallo al cargar tokenizer');

    // B. Configurar ONNX Runtime (WASM) usando las rutas del config central
    const modelUri = await Filesystem.getUri({
      path: PATHS.EMBEDDING_MODEL,
      directory: Directory.Data
    });
    
    // Limpieza de ruta para el binario ONNX
    const cleanPath = modelUri.uri.replace(/^file:\/\//, '');

    embeddingSession = await ort.InferenceSession.create(cleanPath, {
      executionProviders: ['wasm'],
      graphOptimizationLevel: 'all'
    });

    // C. GESTIÓN CRIPTOGRÁFICA HÍBRIDA (Tu lógica de migración Master -> Dynamic)
    const dynamicKey = await KeyService.getOrCreateDynamicKey();
    const masterKey = KeyService.getMasterKey();

    const fileContent = await Filesystem.readFile({
      path: PATHS.CORPUS_ENCRYPTED,
      directory: Directory.Data,
      encoding: Encoding.UTF8,
    });

    try {
      // 1. Intentar con llave de dispositivo (Estado persistente seguro)
      corpusMetadata = await decryptCorpus(fileContent.data as string, dynamicKey);
      logger.info('[RAÍCES RAG] Acceso exitoso vía Llave Dinámica.');
    } catch (e) {
      // 2. Fallo: Probablemente primer inicio o actualización de app. Migrar.
      logger.warn('[RAÍCES RAG] Primer inicio detectado. Migrando corpus...');
      corpusMetadata = await decryptCorpus(fileContent.data as string, masterKey);
      
      const reEncrypted = await encryptCorpus(corpusMetadata, dynamicKey);
      await Filesystem.writeFile({
        path: PATHS.CORPUS_ENCRYPTED,
        data: reEncrypted,
        directory: Directory.Data,
        encoding: Encoding.UTF8
      });
      logger.info('[RAÍCES RAG] Migración finalizada: Corpus anclado al hardware.');
    }

    isInitialized = true;
    logger.info(`[RAÍCES RAG] Sistema listo. Chunks activos: ${corpusMetadata.length}`);
    return true;
  } catch (error) {
    logger.error('[RAÍCES RAG] Fallo crítico en inicialización:', error);
    isInitialized = false;
    return false;
  }
}

export async function retrieveContext(question: string): Promise<RAGResult> {
  if (!isInitialized || !isTokenizerReady()) {
    throw new Error('Servicio RAG no disponible')
  }

  const queryVec = await getEmbedding(question)
  
  const scoredResults = corpusMetadata.map(chunk => ({
    chunk,
    score: chunk.embedding ? cosineSimilarity(queryVec, chunk.embedding) : 0
  }))

  const topResults = scoredResults
    .filter(r => r.score >= RAG.MIN_SCORE)
    .sort((a, b) => b.score - a.score)
    .slice(0, RAG.TOP_K)

  return {
    chunks: topResults.map(r => r.chunk.texto),
    sources: topResults.map(r => r.chunk.fuente),
    scores: topResults.map(r => Number(r.score.toFixed(3)))
  }
}

/**
 * Función de consulta simplificada para la UI
 */
export async function queryRAG(question: string) {
  const context = await retrieveContext(question);
  
  if (context.chunks.length === 0) {
    return {
      answer: "No encontré información específica en los documentos de la JEP sobre eso.",
      source: "Sistema RAÍCES"
    };
  }

  return {
    answer: context.chunks[0],
    source: context.sources[0]
  };
}

// Getters de estado y limpieza
export const isRAGReady = () => isInitialized && isTokenizerReady() && embeddingSession !== null;

export function releaseRAG(): void {
  embeddingSession = null;
  corpusMetadata = [];
  isInitialized = false;
  logger.info('[RAÍCES RAG] Memoria liberada.');
}

export const unloadRAG = releaseRAG;