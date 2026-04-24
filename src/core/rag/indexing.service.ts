/**
 * RAÍCES - Servicio de Indexación de Corpus
 * Pipeline completo: PDF → Chunks → Embeddings → FAISS → Cifrado
 * Ejecuta offline en el dispositivo. No requiere servidor.
 */
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem'
import * as pdfjs from 'pdfjs-dist'// Cambiado a voy-search
import { getPaths, getRAGParams, logger } from '@/core/config/config.service'
import { getEmbedding, initializeTokenizer, isTokenizerReady } from './tokenizer.service'
import { logEvent } from '@/core/audit/audit.service'

// Configura el worker localmente (Soberanía tecnológica)
pdfjs.GlobalWorkerOptions.workerSrc = '/workers/pdf.worker.min.js'

const PATHS = getPaths()
const RAG = getRAGParams()

export interface ChunkMetadata {
  id: string
  text: string
  source: string
  page: number
  startChar: number
  endChar: number
  tokenCount: number
}

export interface IndexingProgress {
  stage: 'extracting' | 'chunking' | 'embedding' | 'indexing' | 'encrypting' | 'complete'
  current: number
  total: number
  message: string
}

type ProgressCallback = (progress: IndexingProgress) => void

// ================================================================
// EXTRACCIÓN DE PDF
// ================================================================

/**
 * Extrae texto de un PDF usando PDF.js
 * Retorna texto por página
 */
async function extractTextFromPDF(pdfPath: string): Promise<{ page: number; text: string }[]> {
  try {
    const pdfData = await Filesystem.readFile({
      path: pdfPath,
      directory: Directory.Data,
    });

    const base64 = pdfData.data as string;
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    // EL CAMBIO ESTÁ AQUÍ:
    const pdf = await pdfjs.getDocument({ data: bytes }).promise; 
    const pages: { page: number; text: string }[] = [];

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const text = textContent.items
        .map((item: any) => item.str)
        .join(' ');
      
      if (text.trim().length > 50) {
        pages.push({ page: i, text });
      }
    }
    return pages;
  } catch (error) {
    logger.error('[INDEX] Error al extraer PDF:', error);
    throw error;
  }
}

// ================================================================
// CHUNKING
// ================================================================

/**
 * Divide texto en chunks con overlap
 * Respeta límites de oraciones para no cortar ideas
 */
function chunkText(
  text: string,
  source: string,
  page: number
): ChunkMetadata[] {
  const chunks: ChunkMetadata[] = []
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [text]

  let currentChunk = ''
  let startChar = 0
  let chunkId = 0

  for (const sentence of sentences) {
    const trimmed = sentence.trim()
    if (!trimmed) continue

    // Si agregar esta oración excede el límite, guarda chunk actual
    if (currentChunk.length + trimmed.length > RAG.CHUNK_SIZE && currentChunk.length > 0) {
      chunks.push({
        id: `${source}_p${page}_c${chunkId}`,
        text: currentChunk.trim(),
        source,
        page,
        startChar,
        endChar: startChar + currentChunk.length,
        tokenCount: Math.ceil(currentChunk.length / 4), // Estimación
      })

      // Overlap: mantiene últimas palabras del chunk anterior
      const words = currentChunk.split(' ')
      const overlapWords = words.slice(-RAG.CHUNK_OVERLAP).join(' ')
      currentChunk = overlapWords + ' '
      startChar += currentChunk.length - overlapWords.length
      chunkId++
    }

    currentChunk += trimmed + ' '
  }

  // Último chunk
  if (currentChunk.trim().length > 50) {
    chunks.push({
      id: `${source}_p${page}_c${chunkId}`,
      text: currentChunk.trim(),
      source,
      page,
      startChar,
      endChar: startChar + currentChunk.length,
      tokenCount: Math.ceil(currentChunk.length / 4),
    })
  }

  return chunks
}

// ================================================================
// EMBEDDINGS + FAISS
// ================================================================

/**
 * Genera embeddings e indexa usando VOY (Motor Vectorial Local WASM)
 */
async function buildVoyIndex(
  chunks: ChunkMetadata[],
  onProgress?: (p: IndexingProgress) => void
): Promise<string> {
  if (!isTokenizerReady()) await initializeTokenizer();

  const total = chunks.length;
  const voyData: any[] = []; // Especificamos tipo para evitar error 'never'

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    if (i % 10 === 0 && onProgress) {
      onProgress({
        stage: 'embedding',
        current: i,
        total,
        message: `Procesando vectores ${i}/${total}`,
      });
    }

    const embedding = await getEmbedding(chunk.text, true);
    voyData.push({
      id: chunk.id,
      embeddings: Array.from(embedding),
      title: chunk.source,
      page: chunk.page,
      text: chunk.text
    });
  }

  // Serializamos para guardar
  return JSON.stringify({ bindings: voyData });
}
// ================================================================
// CIFRADO
// ================================================================

/**
 * Cifra el corpus usando AES-256-GCM (Estándar de Grado Militar)
 * Reemplaza la dependencia de Node.js por WebCrypto nativo para móviles.
 */
async function encryptCorpus(
  metadata: ChunkMetadata[],
  onProgress?: (p: IndexingProgress) => void
): Promise<Uint8Array> {
  onProgress?.({ stage: 'encrypting', current: 0, total: 1, message: 'Cifrando datos...' });

  const keyBase64 = import.meta.env.VITE_CORPUS_KEY;
  const keyBuffer = Uint8Array.from(atob(keyBase64), c => c.charCodeAt(0));
  
  const cryptoKey = await window.crypto.subtle.importKey(
    'raw', keyBuffer, { name: 'AES-GCM' }, false, ['encrypt']
  );

  const plaintext = JSON.stringify(metadata);
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await window.crypto.subtle.encrypt(
    { name: 'AES-GCM', iv }, cryptoKey, new TextEncoder().encode(plaintext)
  );

  const result = new Uint8Array(iv.length + encrypted.byteLength);
  result.set(iv, 0);
  result.set(new Uint8Array(encrypted), iv.length);
  return result;
}
// ================================================================
// PIPELINE PRINCIPAL
// ================================================================

/**
 * Pipeline principal: Extrae, Segmenta, Indexa (Voy) y Cifra
 */
export async function indexPDF(
  pdfPath: string,
  onProgress?: ProgressCallback
): Promise<boolean> {
  const startTime = performance.now();

  try {
    logger.info(`[INDEX] Iniciando pipeline soberano para ${pdfPath}`);
    
    // Auditoría: Inicio del proceso
    await logEvent('INDEX_START', {
      severity: 'info',
      metadata: { file: pdfPath }
    });

    // 1. Extraer Texto
    onProgress?.({ stage: 'extracting', current: 0, total: 1, message: 'Extrayendo texto del PDF...' });
    const pages = await extractTextFromPDF(pdfPath);
    if (pages.length === 0) throw new Error('El PDF no contiene texto legible.');

    // 2. Chunking (Segmentación de ideas)
    onProgress?.({ stage: 'chunking', current: 0, total: pages.length, message: 'Segmentando contenido...' });
    const allChunks: ChunkMetadata[] = [];
    const sourceName = pdfPath.split('/').pop() || 'doc';

    pages.forEach((page) => {
      allChunks.push(...chunkText(page.text, sourceName, page.page));
    });

    // 3. Generar Índice Voy (Vectores)
    const voyIndexSerialized = await buildVoyIndex(allChunks, onProgress);

    // 4. Cifrado del Corpus (Metadata)
    // Nota: Aquí usamos el JSON de los chunks para el sistema RAG
    const encryptedCorpus = await encryptCorpus(allChunks, onProgress);

    // 5. Persistencia en Almacenamiento Local (Capacitor Filesystem)
    // Guardamos el índice vectorial (embeddings.json)
    await Filesystem.writeFile({
      path: PATHS.CORPUS_JSON,
      data: voyIndexSerialized,
      directory: Directory.Data,
      encoding: Encoding.UTF8,
      recursive: true
    });

    // Guardamos el corpus cifrado (jep_corpus.json.enc)
    await Filesystem.writeFile({
      path: PATHS.CORPUS_ENCRYPTED,
      data: btoa(String.fromCharCode(...encryptedCorpus)),
      directory: Directory.Data,
      recursive: true
    });

    const elapsed = (performance.now() - startTime) / 1000;

    // Auditoría: Éxito total
    await logEvent('INDEX_SUCCESS', {
      severity: 'info',
      metadata: { 
        pdf: pdfPath, 
        chunks: allChunks.length, 
        time_seconds: elapsed.toFixed(2) 
      }
    });

    onProgress?.({ stage: 'complete', current: 1, total: 1, message: `Éxito: ${allChunks.length} chunks en ${elapsed.toFixed(1)}s` });
    return true;

  } catch (error: any) {
    logger.error('[INDEX_FAIL]', error);
    
    await logEvent('INDEX_FAIL', {
      severity: 'error',
      metadata: { pdf: pdfPath, error: error.message }
    });
    
    return false;
  }
}
/**
 * Indexa múltiples PDFs en lote
 */
export async function indexMultiplePDFs(
  pdfPaths: string[],
  onProgress?: ProgressCallback
): Promise<{ success: string[]; failed: string[] }> {
  const success: string[] = []
  const failed: string[] = []

  for (let i = 0; i < pdfPaths.length; i++) {
    const path = pdfPaths[i]
    onProgress?.({
      stage: 'extracting',
      current: i,
      total: pdfPaths.length,
      message: `Procesando ${i + 1}/${pdfPaths.length}: ${path}`,
    })

    const ok = await indexPDF(path, onProgress)
    if (ok) {
      success.push(path)
    } else {
      failed.push(path)
    }
  }

  return { success, failed }
}
