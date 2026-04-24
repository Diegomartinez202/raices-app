import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Capacitor } from '@capacitor/core';
import { logger } from '@/core/config/config.service';

/**
 * SERVICIO DE INFRAESTRUCTURA Y SOBERANÍA - RAÍCES
 * Centraliza la gestión de archivos físicos, anclaje de modelos y "hidratación" de datos.
 */
export const InfraService = {

  /**
   * Prepara todos los directorios necesarios para el funcionamiento local.
   * Vital para la persistencia de logs, exportaciones y seguridad (vault).
   */
  async prepararInfraestructura(): Promise<void> {
    const directorios = ['models', 'corpus', 'logs', 'exports', 'vault'];
    
    for (const dir of directorios) {
      try {
        await Filesystem.mkdir({
          path: dir,
          directory: Directory.Data,
          recursive: true
        });
      } catch (e) {
        // El directorio ya existe
      }
    }
    logger.info('[INFRA] Infraestructura de directorios preparada.');
  },

  /**
   * Asegura que el archivo de conocimiento (embeddings.json) esté en el área de datos segura.
   * Soberanía Informativa: Extrae el conocimiento del APK hacia el almacenamiento privado.
   */
  async asegurarCorpusLocal(): Promise<void> {
    const CORPUS_PATH = 'corpus/embeddings.json';

    try {
      await Filesystem.stat({
        path: CORPUS_PATH,
        directory: Directory.Data
      });
      logger.info('[INFRA] Corpus de conocimiento ya presente en almacenamiento seguro.');
    } catch (e) {
      logger.info('[INFRA] Primera ejecución: Extrayendo corpus desde los assets...');
      
      try {
        // En Capacitor, usamos fetch para leer assets locales de manera eficiente
        const response = await fetch('assets/corpus/embeddings.json');
        if (!response.ok) throw new Error('No se encontró el corpus en los assets.');
        
        const data = await response.text();

        await Filesystem.writeFile({
          path: CORPUS_PATH,
          data: data,
          directory: Directory.Data,
          recursive: true,
          encoding: Encoding.UTF8
        });
        
        logger.info('[INFRA] Corpus "hidratado" correctamente en el dispositivo.');
      } catch (error) {
        logger.error('[INFRA] Error crítico al extraer el corpus:', error);
        throw error;
      }
    }
  },

  /**
   * Ancla el modelo de IA (GGUF) al hardware.
   * Necesario para que el motor WASM de Llama pueda realizar inferencia local.
   */
  async ensureModelExists(): Promise<boolean> {
    const modelPath = 'models/gemma-2b-it-q4_k_m.gguf';
    
    try {
      await Filesystem.stat({ path: modelPath, directory: Directory.Data });
      logger.info('[INFRA] Modelo IA detectado en zona segura.');
      return true;
    } catch (e) {
      logger.info('[INFRA] Iniciando anclaje de modelo IA al hardware...');
      
      try {
        const assetPath = Capacitor.getPlatform() === 'android' 
          ? `public/assets/${modelPath}` 
          : `assets/${modelPath}`;

        // Leemos desde el instalador (Assets)
        const file = await Filesystem.readFile({
          path: assetPath
        });

        // Escribimos en almacenamiento de alta velocidad (Data)
        await Filesystem.writeFile({
          path: modelPath,
          data: file.data,
          directory: Directory.Data,
          recursive: true
        });
        
        logger.info('[INFRA] Modelo anclado correctamente.');
        return true;
      } catch (err) {
        logger.error('[INFRA] Fallo crítico al anclar modelo:', err);
        throw new Error('Infraestructura de IA física no disponible.');
      }
    }
  }
};
