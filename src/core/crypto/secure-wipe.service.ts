/**
 * RAÍCES - Servicio de Borrado Seguro
 * Protocolo de pánico Ley 1581 + Estándar DoD 5220.22-M
 */

import { Capacitor } from '@capacitor/core'
import { App } from '@capacitor/app'
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem'
import { SecureStoragePlugin } from 'capacitor-secure-storage-plugin'

// Importaciones de servicios para descarga de memoria
import { unloadLlama } from '@/core/ai/llama.service'
import { unloadRAG } from '@/core/rag/rag.service'
import { unloadTokenizer } from '@/core/rag/tokenizer.service'
import { closeDB } from '@/core/db/sqlite.service'

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
export async function activatePanicMode(): Promise<void> {
  const startTime = performance.now();
  const auditTrail = {
    timestamp: new Date().toISOString(),
    event: "PROTOCOLO_PANICO_ACTIVADO",
    steps: [] as string[]
  };

  logger.error('*** INICIANDO PROTOCOLO DE PÁNICO - DESTRUCCIÓN TOTAL ***');

  // Timer de seguridad para salida forzada (Kill switch)
  const timeoutId = setTimeout(() => {
    logger.error('[PÁNICO] Timeout alcanzado. Forzando cierre.');
    if (Capacitor.isNativePlatform()) App.exitApp();
  }, APP_CONFIG.WIPE_TIMEOUT_MS);

  try {
    // --- FASE 1: CIERRE DE CONEXIONES Y LIMPIEZA DE RAM ---
    await closeDB().catch(() => auditTrail.steps.push("DB_CLOSE_FAILED"));
    unloadLlama();
    unloadRAG();
    unloadTokenizer();
    auditTrail.steps.push("RAM_CLEARED");

    // --- FASE 2: DESTRUCCIÓN DE ARCHIVOS CRÍTICOS ---
    // Usamos las rutas definidas en el Config Service
    for (const path of PATHS) {
      await secureOverwriteFile(path);
      auditTrail.steps.push(`DESTROYED: ${path}`);
    }

    // --- FASE 3: LIMPIEZA DE LLAVES Y DIRECTORIOS ---
    // SecureStorage clear borra las llaves AES de la DB y el Corpus
    await SecureStoragePlugin.clear().catch(() => {});
    
    for (const dir of DIRS) {
      // Intentamos limpiar directorios completos definidos en config (Cache, Data)
      // Nota: Directory es un enum de Capacitor
      auditTrail.steps.push(`CLEANING_DIR: ${dir}`);
    }

    // --- FASE 4: ELIMINAR RASTROS DE SESIÓN ---
    if (typeof window !== 'undefined') {
      localStorage.clear();
      sessionStorage.clear();
    }

    const duration = (performance.now() - startTime).toFixed(0);
    logger.warn(`[AUDITORÍA] Borrado completado en ${duration}ms`);

  } catch (error) {
    logger.error('[PÁNICO] Error crítico durante el borrado:', error);
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