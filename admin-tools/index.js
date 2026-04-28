
/**
 * RAÍCES Updater - Indexador con Embeddings Reales
 * Usa all-MiniLM-L6-v2 via @xenova/transformers
 * Genera faiss_index.bin + corpus.json.enc para la app
 */

import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync } from 'fs'
import { join, basename, extname } from 'path'
import pdf from 'pdf-parse'
import crypto from 'crypto'
import { pipeline, env } from '@xenova/transformers'
import dotenv from 'dotenv'

dotenv.config()

// ================================================================
// CONFIGURACIÓN
// ================================================================
const CONFIG = {
  INPUT_DIR: './output/aprobados',
  OUTPUT_DIR: './output/build',
  CHUNK_SIZE: 1000,
  CHUNK_OVERLAP: 200,
  ENCRYPTION_KEY: process.env.RAICES_ENCRYPTION_KEY || 'CHANGE_ME_IN_PROD',
  MIN_CHUNK_LENGTH: 50,
  EMBEDDING_MODEL: 'Xenova/all-MiniLM-L6-v2', // 384 dimensiones
  BATCH_SIZE: 16, // Embeddings en paralelo
}

// Configura transformers para usar cache local
env.cacheDir = './.cache'
env.allowRemoteModels = true
env.allowLocalModels = true

// Crea carpetas
if (!existsSync(CONFIG.OUTPUT_DIR)) mkdirSync(CONFIG.OUTPUT_DIR, { recursive: true })
if (!existsSync('./.cache')) mkdirSync('./.cache')

// ================================================================
// 1. INICIALIZA MODELO DE EMBEDDINGS - TU TOKENIZER REAL
// ================================================================
let embedder = null

async function initializeEmbedder() {
  if (embedder) return embedder

  console.log('🧠 Cargando modelo all-MiniLM-L6-v2...')
  console.log(' Primera vez tarda 2-3 min descargando ~23MB')

  try {
    embedder = await pipeline('feature-extraction', CONFIG.EMBEDDING_MODEL, {
      quantized: true, // Usa modelo quantizado, más rápido
    })
    console.log('✓ Modelo cargado\n')
    return embedder
  } catch (e) {
    console.error('✗ Error cargando modelo:', e.message)
    console.error(' Verifica conexión a internet o cache en./.cache/')
    process.exit(1)
  }
}

/**
 * Genera embedding real con tu modelo
 * Replica la lógica de tokenizer.service.ts
 */
async function generateEmbedding(text) {
  if (!embedder) await initializeEmbedder()

  try {
    // Tokeniza y genera embedding
    const output = await embedder(text, {
      pooling: 'mean',
      normalize: true,
    })

    // Convierte a array de números
    return Array.from(output.data)
  } catch (e) {
    console.error('✗ Error generando embedding:', e.message)
    throw e
  }
}

/**
 * Genera embeddings en batch para velocidad
 */
async function generateEmbeddingsBatch(texts) {
  if (!embedder) await initializeEmbedder()

  const embeddings = []

  // Procesa en batches de BATCH_SIZE
  for (let i = 0; i < texts.length; i += CONFIG.BATCH_SIZE) {
    const batch = texts.slice(i, i + CONFIG.BATCH_SIZE)

    console.log(` Procesando batch ${Math.floor(i / CONFIG.BATCH_SIZE) + 1}/${Math.ceil(texts.length / CONFIG.BATCH_SIZE)}...`)

    const batchPromises = batch.map(text => generateEmbedding(text))
    const batchResults = await Promise.all(batchPromises)

    embeddings.push(...batchResults)
  }

  return embeddings
}

// ================================================================
// 2. EXTRACCIÓN DE TEXTO DE PDF
// ================================================================
async function extractTextFromPDF(filepath) {
  try {
    const dataBuffer = readFileSync(filepath)
    const data = await pdf(dataBuffer)

    const cleanText = data.text
    .replace(/\s+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[^\w\sáéíóúÁÉÍÓÚñÑ.,;:¿?¡!()\[\]\"'-]/g, '') // Limpia caracteres raros
    .trim()

    return {
      text: cleanText,
      pages: data.numpages,
      info: data.info,
    }
  } catch (e) {
    console.error(`✗ Error leyendo PDF ${basename(filepath)}:`, e.message)
    return null
  }
}

// ================================================================
// 3. CHUNKING INTELIGENTE
// ================================================================
function chunkText(text, sourceId) {
  const chunks = []
  const sentences = text.split(/(?<=[.!?])\s+/)

  let currentChunk = ''
  let chunkIndex = 0

  for (const sentence of sentences) {
    const sentenceClean = sentence.trim()
    if (sentenceClean.length < 10) continue // Ignora fragmentos

    if ((currentChunk + sentenceClean).length > CONFIG.CHUNK_SIZE && currentChunk.length > 0) {
      if (currentChunk.length >= CONFIG.MIN_CHUNK_LENGTH) {
        chunks.push({
          id: `${sourceId}_chunk_${chunkIndex}`,
          text: currentChunk.trim(),
          source: sourceId,
          chunk_index: chunkIndex,
          char_count: currentChunk.length,
        })
        chunkIndex++
      }

      // Overlap: últimas 3 oraciones
      const sentencesInChunk = currentChunk.split(/(?<=[.!?])\s+/)
      const overlap = sentencesInChunk.slice(-3).join(' ')
      currentChunk = overlap + ' ' + sentenceClean
    } else {
      currentChunk += (currentChunk? ' ' : '') + sentenceClean
    }
  }

  if (currentChunk.length >= CONFIG.MIN_CHUNK_LENGTH) {
    chunks.push({
      id: `${sourceId}_chunk_${chunkIndex}`,
      text: currentChunk.trim(),
      source: sourceId,
      chunk_index: chunkIndex,
      char_count: currentChunk.length,
    })
  }

  return chunks
}

// ================================================================
// 4. CIFRADO AES-256-GCM
// ================================================================
function encryptCorpus(corpus) {
  const algorithm = 'aes-256-gcm'
  const key = crypto.scryptSync(CONFIG.ENCRYPTION_KEY, 'raices-salt', 32)
  const iv = crypto.randomBytes(16)
  const cipher = crypto.createCipheriv(algorithm, key, iv)

  const jsonString = JSON.stringify(corpus)
  let encrypted = cipher.update(jsonString, 'utf8', 'hex')
  encrypted += cipher.final('hex')

  const authTag = cipher.getAuthTag()

  return {
    iv: iv.toString('hex'),
    authTag: authTag.toString('hex'),
    data: encrypted,
    algorithm,
  }
}

// ================================================================
// 5. GENERACIÓN FAISS INDEX BINARIO
// ================================================================
function generateFAISSIndex(embeddings) {
  // Convierte embeddings a Float32Array para compatibilidad con faiss.service.ts
  const vectors = embeddings.map(e => ({
    id: e.id,
    source: e.source,
    vector: Array.from(new Float32Array(e.embedding)), // Asegura Float32
  }))

  const index = {
    version: '1.0.0',
    dimension: 384,
    metric: 'cosine',
    total_vectors: vectors.length,
    vectors: vectors,
    metadata: {
      created_at: new Date().toISOString(),
      model: CONFIG.EMBEDDING_MODEL,
      source_count: new Set(embeddings.map(e => e.source)).size,
      chunk_count: embeddings.length,
    }
  }

  return index
}

// ================================================================
// 6. MAIN
// ================================================================
async function main() {
  console.log('═══════════════════════════════════════════════════════════')
  console.log('RAÍCES INDEXER - Embeddings Reales con all-MiniLM-L6-v2')
  console.log('═══════════════════════════════════════════════════════════\n')

  // 1. Inicializa modelo
  await initializeEmbedder()

  // 2. Lee PDFs
  if (!existsSync(CONFIG.INPUT_DIR)) {
    console.error(`✗ Carpeta no existe: ${CONFIG.INPUT_DIR}`)
    console.error(' Mueve los PDFs validados aquí')
    process.exit(1)
  }

  const pdfFiles = readdirSync(CONFIG.INPUT_DIR)
  .filter(f => extname(f).toLowerCase() === '.pdf')

  if (pdfFiles.length === 0) {
    console.error('✗ No hay PDFs en./output/aprobados/')
    process.exit(1)
  }

  console.log(`📚 PDFs a indexar: ${pdfFiles.length}\n`)

  const allChunks = []
  const corpus = {
    version: '1.0.0',
    updated_at: new Date().toISOString(),
    documents: [],
  }

  // 3. Extrae y chunkea
  for (const pdfFile of pdfFiles) {
    const filepath = join(CONFIG.INPUT_DIR, pdfFile)
    const sourceId = basename(pdfFile, '.pdf')

    console.log(`📄 ${pdfFile}`)
    const extracted = await extractTextFromPDF(filepath)
    if (!extracted) continue

    const chunks = chunkText(extracted.text, sourceId)
    console.log(` → ${extracted.pages} páginas, ${chunks.length} chunks\n`)

    allChunks.push(...chunks)
    corpus.documents.push({
      id: sourceId,
      filename: pdfFile,
      pages: extracted.pages,
      chunks: chunks.length,
      indexed_at: new Date().toISOString(),
    })
  }

  console.log(`Total chunks: ${allChunks.length}\n`)

  // 4. Genera embeddings REALES
  console.log('🧠 Generando embeddings con all-MiniLM-L6-v2...')
  console.log(` Total: ${allChunks.length} textos, Batch: ${CONFIG.BATCH_SIZE}\n`)

  const texts = allChunks.map(c => c.text)
  const embeddingVectors = await generateEmbeddingsBatch(texts)

  const embeddings = allChunks.map((chunk, i) => ({
    id: chunk.id,
    source: chunk.source,
    text: chunk.text,
    embedding: embeddingVectors[i],
  }))

  console.log(`✓ Embeddings generados: ${embeddings.length}\n`)

  // 5. Genera FAISS
  console.log('💾 Generando faiss_index.bin...')
  const faissIndex = generateFAISSIndex(embeddings)
  const faissBuffer = Buffer.from(JSON.stringify(faissIndex))
  writeFileSync(join(CONFIG.OUTPUT_DIR, 'faiss_index.bin'), faissBuffer)
  console.log(`✓ Tamaño: ${(faissBuffer.length / 1024 / 1024).toFixed(2)} MB\n`)

  // 6. Cifra corpus
  console.log('🔐 Cifrando corpus.json.enc...')
  const corpusData = {
  ...corpus,
    chunks: allChunks.map(c => ({
      id: c.id,
      source: c.source,
      text: c.text,
    }))
  }
  const encrypted = encryptCorpus(corpusData)
  writeFileSync(
    join(CONFIG.OUTPUT_DIR, 'corpus.json.enc'),
    JSON.stringify(encrypted, null, 2)
  )
  console.log(`✓ Cifrado AES-256-GCM\n`)

  // 7. Manifiesto
  const manifest = {
    version: '1.1.0',
    generated_at: new Date().toISOString(),
    model: CONFIG.EMBEDDING_MODEL,
    encryption: 'aes-256-gcm',
    files: {
      'faiss_index.bin': {
        size_bytes: faissBuffer.length,
        size_mb: (faissBuffer.length / 1024 / 1024).toFixed(2),
        vectors: embeddings.length,
        dimension: 384,
      },
      'corpus.json.enc': {
        documents: corpus.documents.length,
        chunks: allChunks.length,
      }
    },
    sources: corpus.documents,
    disclaimer: 'Base validada por equipo legal y psicosocial RAÍCES',
  }

  writeFileSync(
    join(CONFIG.OUTPUT_DIR, 'manifest.json'),
    JSON.stringify(manifest, null, 2)
  )

  console.log('═══════════════════════════════════════════════════════════')
  console.log('✓ INDEXACIÓN COMPLETADA CON EMBEDDINGS REALES')
  console.log('═══════════════════════════════════════════════════════════')
  console.log(`Documentos: ${corpus.documents.length}`)
  console.log(`Chunks: ${allChunks.length}`)
  console.log(`Vectores 384D: ${embeddings.length}`)
  console.log(`Modelo: ${CONFIG.EMBEDDING_MODEL}`)
  console.log(`\nArchivos en: ${CONFIG.OUTPUT_DIR}/`)
  console.log(' - faiss_index.bin')
  console.log(' - corpus.json.enc')
  console.log(' - manifest.json')
  console.log('\n⚠️ PASOS SIGUIENTES:')
  console.log('1. cp output/build/*../raices-app/public/assets/')
  console.log('2. Actualiza VERSION en config.service.ts')
  console.log('3. pnpm run build && npx cap sync android')
  console.log('4. Sube AAB a Play Store')
  console.log('═══════════════════════════════════════════════════════════\n')
}

main().catch(err => {
  console.error('\n✗ ERROR FATAL:', err.message)
  process.exit(1)
})