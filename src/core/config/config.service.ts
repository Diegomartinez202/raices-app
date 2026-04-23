/**
 * RAÍCES - Servicio de Configuración Central
 * Single Source of Truth para rutas, claves y parámetros
 * No hardcodear nada en otros servicios. Todo pasa por aquí.
 */

import { Directory } from '@capacitor/filesystem'

// ================================================================
// TIPOS
// ================================================================
export type LogLevel = 'debug' | 'info' | 'warn' | 'error'
export type Environment = 'development' | 'staging' | 'production'

// ================================================================
// CONFIGURACIÓN GLOBAL
// ================================================================
const APP_CONFIG = {
  // App
  NAME: 'RAÍCES',
  VERSION: '1.0.0',
  ENV: (import.meta.env.MODE as Environment) || 'development',
  LOG_LEVEL: (import.meta.env.VITE_LOG_LEVEL as LogLevel) || 'info',

  // Seguridad
  PANIC_TAP_COUNT: 3,
  PANIC_TAP_WINDOW_MS: 2000,
  WIPE_TIMEOUT_MS: 2000,
  WIPE_PASSES: 3, // DoD 5220.22-M simplificado

  // Sesión
  SESSION_TIMEOUT_MS: 30 * 60 * 1000, // 30 min sin actividad = cierra sesión
}

// ================================================================
// RUTAS DE ARCHIVOS - Todo relativo a Directory.Data
// ================================================================
const PATHS = {
  // LLM
  LLM_MODEL: 'llm/gemma-2b-it-q4_k_m.gguf',
  LLM_DIR: 'llm',

  // RAG + FAISS
  CORPUS_ENCRYPTED: 'corpus/jep_m10_corpus.json.enc',
  CORPUS_METADATA: 'corpus/metadata.json', // Solo para debug, no va en APK
  CORPUS_JSON: 'corpus/embeddings.json', // El que generaste con el script
  EMBEDDING_MODEL: 'models/all-MiniLM-L6-v2.onnx',
  TOKENIZER_JSON: 'corpus/tokenizer.json',
  TOKENIZER_CONFIG: 'corpus/tokenizer_config.json',
  CORPUS_DIR: 'corpus',

  // Base de datos
  DB_NAME: 'raices_db',
  DB_PATH: 'db/raices.db',
  DB_WAL: 'db/raices.db-wal',
  DB_SHM: 'db/raices.db-shm',
  DB_DIR: 'db',

  // Exports
  EXPORTS_DIR: 'exports',

  // Temp
  TEMP_DIR: 'temp',
}

// ================================================================
// CLAVES SECURE STORAGE - Keychain/Keystore
// ================================================================
const SECURE_KEYS = {
  CORPUS_KEY: 'RAICES_CORPUS_KEY',
  DB_KEY: 'RAICES_DB_KEY',
  USER_SESSION: 'USER_SESSION',
  CHAT_HISTORY: 'CHAT_HISTORY',
  EXPORT_BEFORE_PANIC: 'EXPORT_BEFORE_PANIC',
  APP_PIN: 'APP_PIN', // Para futuro bloqueo con PIN
  BIOMETRIC_ENABLED: 'BIOMETRIC_ENABLED',
}

// ================================================================
// PARÁMETROS LLM - Gemma 2B
// ================================================================
const LLM_PARAMS = {
  CONTEXT_SIZE: 2048, // Tokens de contexto máximo
  THREADS: 4, // Hilos CPU. Ajustar según dispositivo
  GPU_LAYERS: 0, // 0 = solo CPU. Más compatible gama baja
  TEMPERATURE: 0.7, // Creatividad controlada
  TOP_K: 40,
  TOP_P: 0.9,
  REPEAT_PENALTY: 1.1,
  N_PREDICT: 512, // Máx tokens de respuesta
  BATCH_SIZE: 512,
}

// ================================================================
// PARÁMETROS RAG + EMBEDDINGS
// ================================================================
const RAG_PARAMS = {
  EMBEDDING_DIM: 384, // all-MiniLM-L6-v2
  EMBEDDING_MODEL_NAME: 'all-MiniLM-L6-v2',
  MAX_TOKEN_LENGTH: 256, // Límite del modelo
  TOP_K: 3, // Chunks a recuperar
  MIN_SCORE: 0.3, // Umbral mínimo similitud coseno
  CHUNK_SIZE: 400, // Caracteres por chunk en indexación
  CHUNK_OVERLAP: 50, // Overlap entre chunks
}

// ================================================================
// PARÁMETROS FAISS
// ================================================================
const FAISS_PARAMS = {
  METRIC: 'L2' as const,
  INDEX_TYPE: 'Flat' as const, // Futuro: 'HNSW' para >10k vectores
  NPROBE: 10, // Solo para IVF. Flat lo ignora
}

// ================================================================
// PARÁMETROS SQLCIPHER
// ================================================================
const DB_PARAMS = {
  VERSION: 1,
  ENCRYPTED: true,
  KDF_ITER: 256000, // Iteraciones PBKDF2
  CIPHER_PAGE_SIZE: 4096,
  CIPHER_MEMORY_SECURITY: true,
}

// ================================================================
// PARÁMETROS EXPORT PDF
// ================================================================
const EXPORT_PARAMS = {
  PDF_FORMAT: 'letter' as const,
  PDF_ORIENTATION: 'portrait' as const,
  PDF_UNIT: 'mm' as const,
  COLORS: {
    TERRACOTA: '#C65D3B',
    OCRE: '#D4A373',
    VERDE: '#588157',
    FONDO: '#F5F1E8',
    OSCURO: '#2D2A26',
    MEDIO: '#6B5E4F',
  },
}

// ================================================================
// LISTAS CRÍTICAS PARA BORRADO
// ================================================================
const CRITICAL_PATHS = [
  PATHS.CORPUS_ENCRYPTED,
  PATHS.CORPUS_JSON,
  PATHS.LLM_MODEL,
  PATHS.EMBEDDING_MODEL,
  PATHS.DB_PATH,
  PATHS.DB_WAL,
  PATHS.DB_SHM,
]

const CRITICAL_DIRS = [
  Directory.Cache,
  Directory.Data,
]

const CRITICAL_KEYS = Object.values(SECURE_KEYS)

// ================================================================
// FUNCIONES PÚBLICAS - Getters inmutables
// ================================================================

/**
 * Configuración de la app
 */
export const getAppConfig = () => ({...APP_CONFIG })

/**
 * Rutas de archivos
 */
export const getPaths = () => ({...PATHS })

/**
 * Claves de SecureStorage
 */
export const getSecureKeys = () => ({...SECURE_KEYS })

/**
 * Parámetros LLM
 */
export const getLLMParams = () => ({...LLM_PARAMS })

/**
 * Parámetros RAG
 */
export const getRAGParams = () => ({...RAG_PARAMS })

/**
 * Parámetros FAISS
 */
export const getFAISSParams = () => ({...FAISS_PARAMS })

/**
 * Parámetros SQLCipher
 */
export const getDBParams = () => ({...DB_PARAMS })

/**
 * Parámetros Export
 */
export const getExportParams = () => ({...EXPORT_PARAMS })

/**
 * Lista de archivos críticos para borrar
 */
export const getCriticalPaths = (): string[] => [...CRITICAL_PATHS]

/**
 * Lista de directorios críticos para borrar
 */
export const getCriticalDirs = (): Directory[] => [...CRITICAL_DIRS]

/**
 * Lista de claves críticas para borrar
 */
export const getCriticalKeys = (): string[] => [...CRITICAL_KEYS]

/**
 * Verifica si estamos en modo desarrollo
 */
export const isDev = (): boolean => APP_CONFIG.ENV === 'development'

/**
 * Verifica si estamos en producción
 */
export const isProd = (): boolean => APP_CONFIG.ENV === 'production'

/**
 * Log condicional según nivel
 */
export const logger = {
  debug: (...args: any[]) => {
    if (['debug'].includes(APP_CONFIG.LOG_LEVEL)) console.debug('[RAÍCES]', ...args)
  },
  info: (...args: any[]) => {
    if (['debug', 'info'].includes(APP_CONFIG.LOG_LEVEL)) console.info('[RAÍCES]', ...args)
  },
  warn: (...args: any[]) => {
    if (['debug', 'info', 'warn'].includes(APP_CONFIG.LOG_LEVEL)) console.warn('[RAÍCES]', ...args)
  },
  error: (...args: any[]) => {
    console.error('[RAÍCES]', ...args) // Error siempre se loguea
  },
}

// ================================================================
// VALIDACIÓN AL INICIO
// ================================================================
/**
 * Valida que la configuración es consistente
 * Llamar al inicio de App.tsx
 */
export function validateConfig(): void {
  const errors: string[] = []

  // Validar que el contexto sea suficiente para el RAG
  if (LLM_PARAMS.CONTEXT_SIZE < 1024) {
    errors.push('LLM CONTEXT_SIZE es muy bajo para un sistema RAG fluido.');
  }

  // Verificar que el umbral de similitud sea lógico
  if (RAG_PARAMS.MIN_SCORE < 0 || RAG_PARAMS.MIN_SCORE > 1) {
    errors.push('MIN_SCORE debe estar entre 0 y 1');
  }

  if (errors.length > 0) {
    throw new Error(`Configuración de RAÍCES inválida:\n${errors.join('\n')}`);
  }

  logger.info(`Configuración v${APP_CONFIG.VERSION} cargada en modo ${APP_CONFIG.ENV}`);
}