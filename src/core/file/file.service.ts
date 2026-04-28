/**     
* RAÍCES - Servicio de Archivos
 * Maneja subida, validación y gestión de PDFs para indexación
 * Trauma-informado: límites claros, mensajes sin culpa
 */

import { Filesystem, Directory } from '@capacitor/filesystem';
import { getPaths, getAppConfig, logger } from '@/core/config/config.service';
import { logEvent } from '@/core/audit/audit.service';

const PATHS = getPaths();
const APP = getAppConfig(); // Reintegrado por seguridad

export interface SourceFile {
  name: string;
  path: string;
  size: number;
  modifiedAt: number;
}

const FILE_CONFIG = {
  MAX_SIZE_MB: 50,
  ALLOWED_TYPES: ['application/pdf'],
  SOURCES_DIR: PATHS.SOURCES_DIR || 'sources',
};

// ================================================================
// SUBIDA DE ARCHIVOS
// ================================================================

/**
 * Abre selector nativo y sube PDF a Directory.Data/sources/
 * Retorna ruta relativa si éxito, null si cancela o falla
 */
export async function pickAndUploadPDF(): Promise<string | null> {
  try {
    logger.info('[FILE] Abriendo selector nativo...');

    return new Promise((resolve, reject) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'application/pdf';

      input.onchange = async (e: any) => {
        const file = e.target.files[0];
        if (!file) return resolve(null);

        try {
          // 1. Validar tipo
          if (file.type !== 'application/pdf') {
            throw new Error('Solo se permiten archivos PDF');
          }

          // 2. Validar tamaño
          const sizeMB = file.size / (1024 * 1024);
          if (sizeMB > FILE_CONFIG.MAX_SIZE_MB) {
            throw new Error(`Archivo muy grande (${sizeMB.toFixed(1)}MB)`);
          }

          // 3. Leer archivo y guardar
          const reader = new FileReader();
          reader.readAsDataURL(file);
          reader.onload = async () => {
            try {
              const base64Data = (reader.result as string).split(',')[1];
              const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
              const destPath = `${FILE_CONFIG.SOURCES_DIR}/${safeName}`;

              await Filesystem.writeFile({
                path: destPath,
                data: base64Data,
                directory: Directory.Data,
                recursive: true,
              });

              await logEvent('FILE_UPLOAD_SUCCESS', {
                severity: 'info',
                metadata: { 
                  filename: safeName, 
                  env: APP.ENV,
                  size: String(Math.round(sizeMB)) 
                },
              });

              resolve(destPath);
            } catch (err: any) {
              reject(err);
            }
          };
        } catch (err: any) {
          reject(err);
        }
      };

      input.onerror = (err) => reject(err);
      input.click();
    });
  } catch (error: any) {
    logger.error('[FILE] Error:', error);
    await logEvent('FILE_UPLOAD_FAIL', {
      severity: 'error',
      metadata: { error: String(error.message) },
    });
    throw error;
  }
}
// ================================================================
// GESTIÓN DE ARCHIVOS
// ================================================================

/**
 * Lista todos los PDFs en /sources/
 */
export async function listSourceFiles(): Promise<SourceFile[]> {
  try {
    const result = await Filesystem.readdir({
      path: FILE_CONFIG.SOURCES_DIR,
      directory: Directory.Data,
    })

    const files: SourceFile[] = []

    for (const file of result.files) {
      if (file.type === 'file' && file.name.endsWith('.pdf')) {
        const stat = await Filesystem.stat({
          path: `${FILE_CONFIG.SOURCES_DIR}/${file.name}`,
          directory: Directory.Data,
        })

        files.push({
          name: file.name,
          path: `${FILE_CONFIG.SOURCES_DIR}/${file.name}`,
          size: stat.size,
          modifiedAt: Number(stat.mtime),
        })
      }
    }

    // Ordena por fecha, más reciente primero
    return files.sort((a, b) => b.modifiedAt - a.modifiedAt)

  } catch (error) {
    // Si no existe /sources/, retorna vacío
    logger.warn('[FILE] No hay carpeta sources aún')
    return []
  }
}

/**
 * Borra un PDF de /sources/
 */
export async function deleteSourceFile(path: string): Promise<boolean> {
  try {
    // Verificación de seguridad: No permitir borrar si el entorno está bloqueado
    // (Ejemplo de uso de APP_CONFIG para seguridad)
    if (APP.ENV === 'production' && !path.startsWith(FILE_CONFIG.SOURCES_DIR)) {
        logger.warn('[FILE] Intento de borrado fuera de la carpeta permitida');
        return false;
    }

    await Filesystem.deleteFile({
      path,
      directory: Directory.Data,
    });

    logger.info(`[FILE] Archivo borrado: ${path}`);

    // CORRECCIÓN ERROR 2322: Aseguramos que filename sea string y no undefined
    const fileName = path.split('/').pop() || 'unknown_file';

    await logEvent('FILE_DELETE', {
      severity: 'info',
      metadata: { 
        filename: String(fileName),
        env: APP.ENV // Registramos el entorno por seguridad
      },
    });

    return true;
  } catch (error: any) {
    logger.error('[FILE] Error al borrar:', error);
    return false;
  }
}

/**
 * Borra todos los PDFs de /sources/ - usado en pánico
 */
export async function clearAllSourceFiles(): Promise<void> {
  try {
    const files = await listSourceFiles()
    await Promise.all(files.map(f => deleteSourceFile(f.path)))
    logger.info('[FILE] Todos los archivos fuente borrados')
  } catch (error) {
    logger.error('[FILE] Error al limpiar sources:', error)
  }
}

/**
 * Verifica si un archivo existe
 */
export async function sourceFileExists(path: string): Promise<boolean> {
  try {
    await Filesystem.stat({ path, directory: Directory.Data })
    return true
  } catch {
    return false
  }
}

/**
 * Lee PDF como base64 - útil para preview
 */
export async function readPDFAsBase64(path: string): Promise<string | null> {
  try {
    const result = await Filesystem.readFile({
      path,
      directory: Directory.Data,
    })
    return result.data as string
  } catch (error) {
    logger.error('[FILE] Error al leer PDF:', error)
    return null
  }
}