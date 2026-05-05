/**
 * RAÍCES - Servicio de Configuración Central
 * Single Source of Truth para rutas, claves y parámetros.
 */
import { Directory } from '@capacitor/filesystem';

// ================================================================
// 1. DEFINICIÓN DE CONSTANTES INTERNAS (Lo que faltaba)
// ================================================================

const APP_CONFIG = {
  NAME: 'RAÍCES',
  VERSION: '1.0.0',
  ENV: (import.meta.env.MODE as 'development' | 'production') || 'development',
  LOG_LEVEL: (import.meta.env.VITE_LOG_LEVEL as 'debug' | 'info' | 'warn' | 'error') || 'info',
  SESSION_TIMEOUT_MS: 30 * 60 * 1000,
  WIPE_PASSES: 3,           // Mínimo 3 pases para DoD 5220.22-M
  WIPE_TIMEOUT_MS: 5000,     // Tiempo máximo para completar el protocolo de pánico
};

const PATHS = {
  LLM_MODEL: 'llm/gemma-2b-it-q4_k_m.gguf',
  LLM_DIR: 'llm',
  CORPUS_ENCRYPTED: 'corpus/jep_m10_corpus.json.enc',
  CORPUS_JSON: 'corpus/embeddings.json',
  CORPUS_DIR: 'corpus',
  DB_NAME: 'raices_db',
  DB_PATH: 'db/raices.db',
  DB_DIR: 'db',
  SOURCES_DIR: 'sources', 
  AUDIT_LOGS: 'logs/audit.db',
  EXPORTS_DIR: 'exports',
  EMBEDDING_MODEL: 'models/all-MiniLM-L6-v2/onnx/model.onnx', 
  TOKENIZER_JSON: 'models/all-MiniLM-L6-v2/tokenizer.json',
};

const SECURE_KEYS = {
  DB_KEY: 'RAICES_DB_KEY',
  APP_PIN: 'APP_PIN',
  USER_SESSION: 'USER_SESSION',
  BIOMETRIC_ENABLED: 'BIOMETRIC_ENABLED',
  CORPUS_ENCRYPTION_KEY: import.meta.env.VITE_CORPUS_ENCRYPTION_KEY || process.env.CORPUS_ENCRYPTION_KEY,
};

const LLM_PARAMS = {
  CONTEXT_SIZE: 2048,
  THREADS: 4,
  TEMPERATURE: 0.7,
};

const RAG_PARAMS = {
  EMBEDDING_MODEL_NAME: 'Xenova/all-MiniLM-L6-v2',
  EMBEDDING_DIM: 384,
  TOP_K: 3,
  MIN_SCORE: 0.3,
  CHUNK_SIZE: 1000,
  CHUNK_OVERLAP: 200
};

const VOY_PARAMS = {
  DISTANCE_METRIC: 'cosine' as const,
  STORAGE_TYPE: 'memory' as const,
};

const TELEMETRY_PARAMS = {
  ENABLED: false, // Inviolable por diseño en RAÍCES
  BLOCKED_DOMAINS: [
    'google-analytics.com', 'googletagmanager.com', 'firebase.com',
    'sentry.io', 'crashlytics.com', 'huggingface.co', 'onnxruntime.ai'
  ],
};

const DB_PARAMS = {
  VERSION: 1,
  ENCRYPTED: true,
  KDF_ITER: 256000,           // Iteraciones para derivación de clave (PBKDF2)
  CIPHER_PAGE_SIZE: 4096,     // Tamaño de página estándar de SQLCipher
  CIPHER_MEMORY_SECURITY: true // Limpia la memoria sensible después de usarla
};

const EXPORT_PARAMS = {
  COLORS: {
    TERRACOTA: '#9D482B',
    FONDO: '#F4F1EA',
    OCRE: '#D4A373',   // Agregado
    MEDIO: '#6C757D',  // Agregado
    OSCURO: '#212529'  // Agregado
  }
};

// ================================================================
// 2. FUNCIONES PÚBLICAS (Getters)
// ================================================================

export const getAppConfig = () => ({ ...APP_CONFIG });
export const getPaths = () => ({ ...PATHS });
export const getSecureKeys = () => ({ ...SECURE_KEYS });
export const getLLMParams = () => ({
  CONTEXT_SIZE: 2048,
  THREADS: 4,
  TEMPERATURE: 0.7,
  N_PREDICT: 512,  // <--- AÑADE ESTO
  TOP_K: 40,       // <--- AÑADE ESTO
  TOP_P: 0.95,     // <--- AÑADE ESTO
});
export const getRAGParams = () => ({ ...RAG_PARAMS });
export const getVoyParams = () => ({ ...VOY_PARAMS });
export const getTelemetryParams = () => ({ ...TELEMETRY_PARAMS });
export const getDBParams = () => ({ ...DB_PARAMS });
export const getExportParams = () => ({ ...EXPORT_PARAMS });

export const isDev = (): boolean => APP_CONFIG.ENV === 'development';

// ================================================================
// 3. UTILIDADES (Logger y Validación)
// ================================================================

export const logger = {
  debug: (...args: any[]) => {
    if (APP_CONFIG.LOG_LEVEL === 'debug') console.debug('[RAÍCES]', ...args);
  },
  info: (...args: any[]) => {
    if (['debug', 'info'].includes(APP_CONFIG.LOG_LEVEL)) console.info('[RAÍCES]', ...args);
  },
  warn: (...args: any[]) => {
    if (['debug', 'info', 'warn'].includes(APP_CONFIG.LOG_LEVEL)) console.warn('[RAÍCES]', ...args);
  },
  error: (...args: any[]) => {
    console.error('[RAÍCES]', ...args);
  },
};

export function validateConfig(): void {
  const errors: string[] = [];

  // 1. Validación de Inteligencia Local
  if (LLM_PARAMS.CONTEXT_SIZE < 1024) {
    errors.push('CONTEXT_SIZE insuficiente para RAG.');
  }

  // 2. Validación de Seguridad Crítica (Telemetría)
  if (TELEMETRY_PARAMS.ENABLED) {
    errors.push('CRÍTICO: La telemetría no puede estar activada en este sistema.');
  }
  
// 🔐 NUEVA VALIDACIÓN DE SEGURIDAD:
  const key = SECURE_KEYS.CORPUS_ENCRYPTION_KEY;
  if (!key) {
    errors.push('CRÍTICO: Falta la clave de cifrado del corpus (CORPUS_ENCRYPTION_KEY).');
} else {
  // Verificamos la longitud de la cadena decodificada
  const decodedKey = atob(key); 
  if (decodedKey.length !== 32) {
    errors.push(`CRÍTICO: La clave de seguridad debe ser de exactamente 32 bytes (detectados: ${decodedKey.length}).`);
  }
}

  // 3. Validación de Seguridad de Sesión
  if (APP_CONFIG.SESSION_TIMEOUT_MS < 60000) {
    errors.push('El tiempo de sesión es demasiado corto (mínimo 1 minuto).');
  }

  // 4. Verificación de Rutas (Aquí usamos Directory para quitar el Warning)
  if (!Directory.Data) {
    errors.push('El sistema de archivos de Capacitor no está disponible.');
  }

  if (errors.length > 0) {
    throw new Error(`Error en configuración de RAÍCES:\n${errors.join('\n')}`);
  }

  logger.info(`Configuración v${APP_CONFIG.VERSION} cargada exitosamente [MODO VOY]`);
}

export function getCriticalPaths(): string[] {
  return [
    PATHS.DB_PATH,           // Usa la constante que ya tienes arriba
    PATHS.AUDIT_LOGS,        // Borra los logs de auditoría
    'settings.json',         // Configuraciones locales
    'capacitor_storage.db'   // Almacenamiento interno de Capacitor
  ];
}

export function getCriticalDirs(): string[] {
  return [
    PATHS.SOURCES_DIR,       // Carpeta de los PDFs
    PATHS.CORPUS_DIR,        // Carpeta de los Embeddings/Vectores
    'cache',
    'audit'
  ];
}

// Función para verificar si han pasado más de 30 días
export function shouldUpdateCorpus(): boolean {
  // Obtenemos la constante de ciclos de actualización (30 días)
  const UPDATE_CYCLE_DAYS = 30;
  const LAST_UPDATE_KEY = 'raices_last_corpus_update';

  const lastUpdate = localStorage.getItem(LAST_UPDATE_KEY);
  
  // Si no hay fecha (primera vez), marcamos que requiere actualización
  if (!lastUpdate) return true;
  
  // Calculamos la diferencia en días
  const daysSince = (Date.now() - parseInt(lastUpdate)) / (1000 * 60 * 60 * 24);
  
  return daysSince >= UPDATE_CYCLE_DAYS;
}

// Función para marcar que el usuario ya actualizó hoy
export function markCorpusUpdated(): void {
  const LAST_UPDATE_KEY = 'raices_last_corpus_update';
  localStorage.setItem(LAST_UPDATE_KEY, Date.now().toString());
}
// Asegúrate de que esta función exista y tenga el 'export'
export const getRaicesDomains = () => ({
  ALLOWED: [
    'JURIDICO_JEP', 
    'FINANZAS_PYMES', 
    'PSICOSOCIAL'
  ],
  REJECT_MESSAGE: `Estoy aquí para acompañarte...`, // (tu mensaje largo)
  DISCLAIMER: `RAÍCES te da orientación general...`, // (tu disclaimer)
  UPDATE_CYCLE_DAYS: 30,
  LAST_UPDATE_KEY: 'raices_last_corpus_update',
});
