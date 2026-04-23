/**
 * RAÍCES - Servicio de Infraestructura y Persistencia
 * Gestiona la preparación de directorios y la "hidratación" del corpus desde los assets del APK.
 */
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';

/**
 * Asegura que el archivo de conocimiento (embeddings.json) esté en el área de datos segura.
 * Es vital para la Soberanía Informativa: el dato viaja en el APK y se extrae localmente.
 */
export async function asegurarCorpusLocal(): Promise<void> {
  const CORPUS_PATH = 'corpus/embeddings.json';

  try {
    // 1. Intentamos verificar si el archivo ya existe en el almacenamiento privado
    await Filesystem.stat({
      path: CORPUS_PATH,
      directory: Directory.Data
    });
    console.log('[RAÍCES INFRA] Corpus ya presente en almacenamiento seguro.');
  } catch (e) {
    // 2. Si no existe (primera ejecución), lo copiamos desde los Assets del APK
    console.log('[RAÍCES INFRA] Primera ejecución: Extrayendo corpus desde el APK...');
    
    try {
      // Leemos el archivo que viene dentro del instalador (assets)
      const response = await fetch('assets/corpus/embeddings.json');
      if (!response.ok) throw new Error('No se encontró el corpus en los assets del APK');
      
      const data = await response.text();

      // Lo escribimos en la carpeta de datos privada (donde Voy podrá leerlo)
await Filesystem.writeFile({
  path: CORPUS_PATH,
  data: data,
  directory: Directory.Data,
  recursive: true,
  encoding: Encoding.UTF8 // Cambia 'utf8' por Encoding.UTF8
});
      
      console.log('[RAÍCES INFRA] Corpus "hidratado" correctamente en el dispositivo.');
    } catch (error) {
      console.error('[RAÍCES INFRA] Error crítico al extraer el corpus:', error);
      throw error; // Re-lanzamos para que App.tsx sepa que falló la carga
    }
  }
}

/**
 * Prepara otros directorios necesarios (logs, fotos temporales, etc)
 */
export async function prepararInfraestructura(): Promise<void> {
  const directorios = ['logs', 'exports', 'vault'];
  
  for (const dir of directorios) {
    try {
      await Filesystem.mkdir({
        path: dir,
        directory: Directory.Data,
        recursive: true
      });
    } catch (e) {
      // Si ya existe, no hacemos nada
    }
  }
  console.log('[RAÍCES INFRA] Directorios de seguridad preparados.');
}