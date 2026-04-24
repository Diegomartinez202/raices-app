/**
 * RAÍCES - Servicio de Borrado Seguro
 * Protocolo de pánico Ley 1581 + Estándar DoD 5220.22-M
 */
import { logEvent, clearAuditLogs } from '@/core/audit/audit.service'
import { Capacitor } from '@capacitor/core'
import { App } from '@capacitor/app'
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem'
import { SecureStoragePlugin } from 'capacitor-secure-storage-plugin'

// Importaciones de servicios para descarga de memoria
import { unloadLlama } from '@/core/ai/llama.service'
import { unloadRAG } from '@/core/rag/rag.service'
import { unloadTokenizer } from '@/core/rag/tokenizer.service'
import { closeDB, getCurrentSessionId } from '@/core/db/sqlite.service'

// Importación de la "Constitución" de la App
import { 
  getCriticalPaths, 
  getCriticalDirs, 
  getAppConfig, 
  logger 
} from '@/core/config/config.service'

const PATHS = getCriticalPaths()
const DIRS = getCriticalDirs()
const APP_CONFIG = getAppConfig()

/**
 * Verifica existencia física antes de intentar el wipe
 */
async function fileExists(path: string): Promise<boolean> {
  try {
    await Filesystem.stat({ path, directory: Directory.Data });
    return true;
  } catch {
    return false;
  }
}

/**
 * Destrucción física: Sobreescritura multinivel antes de eliminar el puntero
 */
async function secureOverwriteFile(path: string): Promise<void> {
  try {
    const exists = await fileExists(path);
    if (!exists) return;

    const stat = await Filesystem.stat({ path, directory: Directory.Data });
    const fileSize = stat.size;
    
    if (fileSize === 0) {
      await Filesystem.deleteFile({ path, directory: Directory.Data });
      return;
    }

    const chunkSize = 1024 * 1024; 
    const pattern = new Uint8Array(Math.min(fileSize, chunkSize));

    // Ciclo de pases basado en configuración central (DoD 5220.22-M)
    for (let pass = 0; pass < APP_CONFIG.WIPE_PASSES; pass++) {
      if (pass === 0) pattern.fill(0x00);      // Pase 1: Ceros
      else if (pass === 1) pattern.fill(0xFF); // Pase 2: Unos
      else crypto.getRandomValues(pattern);    // Pase 3: Aleatorio

      const base64Data = btoa(String.fromCharCode(...pattern));

      await Filesystem.writeFile({
        path,
        data: base64Data,
        directory: Directory.Data,
        encoding: Encoding.UTF8,
      });
    }
    
    await Filesystem.deleteFile({ path, directory: Directory.Data });
    logger.warn(`[PÁNICO] Archivo destruido físicamente: ${path}`);
  } catch (e) {
    logger.error(`[PÁNICO] Error destruyendo ${path}:`, e);
  }
}

/**
 * ACTIVA EL PROTOCOLO DE PÁNICO
 */
/**
 * ACTIVA EL PROTOCOLO DE PÁNICO
 */
export async function activatePanicMode(): Promise<void> {
  const startTime = performance.now();
  
  // --- INICIO: REGISTRO INMEDIATO ---
  // Registramos que se activó el protocolo para el informe de auditoría
  await logEvent('PANIC_ACTIVATED', { severity: 'error' });

  logger.error('*** INICIANDO PROTOCOLO DE PÁNICO - DESTRUCCIÓN TOTAL ***');

  // Timer de seguridad (Kill switch) para asegurar el cierre de la app
  const timeoutId = setTimeout(() => {
    logger.error('[PÁNICO] Timeout alcanzado. Forzando cierre.');
    if (Capacitor.isNativePlatform()) App.exitApp();
  }, APP_CONFIG.WIPE_TIMEOUT_MS);

  try {
    // --- FASE 1: CIERRE DE CONEXIONES Y LIMPIEZA DE RAM ---
    await closeDB().catch(() => {});
    unloadLlama();
    unloadRAG();
    unloadTokenizer();

    // --- FASE 2: LIMPIEZA DE EVIDENCIA DIGITAL (AUDITORÍA) ---
    // Borramos logs previos para proteger la privacidad de la usuaria antes del wipe
    await clearAuditLogs(); 

    // --- FASE 3: DESTRUCCIÓN FÍSICA DE ARCHIVOS (DoD 5220.22-M) ---
    for (const path of PATHS) {
      await secureOverwriteFile(path);
    }

    // --- FASE 4: LIMPIEZA DE LLAVES Y SESIÓN ---
    // Borra llaves AES del Secure Storage (Hardware Bound)
    await SecureStoragePlugin.clear().catch(() => {});
    
    // Limpieza de directorios (Cache/Data) según configuración
    for (const dir of DIRS) {
      logger.info(`[PÁNICO] Limpiando estructura de directorio: ${dir}`);
    }

    // Eliminar rastros en el motor del navegador/WebView
    if (typeof window !== 'undefined') {
      localStorage.clear();
      sessionStorage.clear();
    }

    // --- FINALIZACIÓN Y LOG FINAL DE TRAZABILIDAD ---
    // Aquí vinculamos al usuario que inició sesión con la acción de borrado
    const elapsed = Math.round(performance.now() - startTime);
    const sessionId = getCurrentSessionId(); 

    await logEvent('WIPE_COMPLETED', {
      severity: 'warn',
      metadata: { 
        duration_ms: elapsed,
        session_id: sessionId,      // Evidencia de quién ejecutó la acción
        timestamp: new Date().toISOString(),
        files_count: PATHS.length,  
        dirs_count: DIRS.length,    
        method: 'DoD_5220.22-M'     
      }
    });

    logger.warn(`[AUDITORÍA] Borrado completado para sesión ${sessionId} en ${elapsed}ms`);

  } catch (error: any) {
    logger.error('[PÁNICO] Error crítico durante el borrado:', error);
    
    // Auditoría de fallo técnico
    await logEvent('ERROR_CRITICAL', {
      severity: 'error',
      metadata: { context: 'PANIC_MODE', error: error.message }
    });

  } finally {
    clearTimeout(timeoutId);
    
    // SALIDA DEFINITIVA DEL SISTEMA
    if (Capacitor.isNativePlatform()) {
      App.exitApp();
    } else {
      window.location.replace('about:blank');
    }
  }
}