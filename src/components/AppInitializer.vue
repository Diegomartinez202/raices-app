<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { SecureStoragePlugin } from 'capacitor-secure-storage-plugin';
import { KeyService } from '@/core/crypto/keys.service';
import { initializeDB } from '@/core/db/sqlite.service';
import { initializeRAG } from '@/core/rag/rag.service';
import { initializeTokenizer } from '@/core/rag/tokenizer.service';
// import { initializeLlama } from '@/core/ai/llama.service'; // Activar cuando esté listo
/**
 * Mueve el modelo de 'assets' (solo lectura) a 'Directory.Data' (lectura/escritura)
 * para que el motor WASM pueda cargarlo.
 */
export async function ensureModelExists() {
  const modelPath = 'models/gemma-2b-it-q4_k_m.gguf';
  
  try {
    // 1. ¿Ya existe en la zona de datos?
    await Filesystem.stat({ path: modelPath, directory: Directory.Data });
    console.log('[RAÍCES] Modelo detectado en zona segura.');
  } catch (e) {
    console.log('[RAÍCES] Copiando modelo desde assets por primera vez...');
    
    // 2. En Capacitor, los assets están en la carpeta 'public' (o 'www')
    // Leemos el archivo como Base64 (necesario para archivos grandes en Filesystem)
    const assetPath = Capacitor.getPlatform() === 'android' 
      ? `public/assets/${modelPath}` 
      : `assets/${modelPath}`;

    const file = await Filesystem.readFile({
      path: assetPath,
      directory: Directory.External // O Directory.Resource dependiendo de tu config
    });

    // 3. Escribimos en el directorio privado de la app
    await Filesystem.writeFile({
      path: modelPath,
      data: file.data,
      directory: Directory.Data,
      recursive: true
    });
    console.log('[RAÍCES] Modelo anclado correctamente.');
  }
}
const isReady = ref(false);
const statusMessage = ref('Iniciando RAÍCES...');
const progress = ref(0);

const initStorage = async () => {
  try {
    await Filesystem.mkdir({ path: 'corpus', directory: Directory.Data, recursive: true });
    await Filesystem.mkdir({ path: 'exports', directory: Directory.Data, recursive: true });
  } catch (e) { /* Ya existen */ }
};

onMounted(async () => {
  try {
    // 1. Directorios
    await initStorage();
    progress.value = 20;

    // 2. Seguridad
    statusMessage.value = 'Configurando bóveda de seguridad...';
    const key = await KeyService.getOrCreateDynamicKey();
    await SecureStoragePlugin.set({ key: 'RAICES_CORPUS_KEY', value: key });
    progress.value = 40;

    // 3. IA y RAG
    statusMessage.value = 'Vinculando corpus al hardware...';
    await initializeTokenizer();
    await initializeRAG();
    // await initializeLlama(); // Descomentar al integrar Llama
    progress.value = 70;

    // 4. Base de Datos
    statusMessage.value = 'Abriendo baúl de mensajes...';
    await initializeDB();
    progress.value = 100;

    setTimeout(() => isReady.value = true, 800);
  } catch (error) {
    statusMessage.value = 'Fallo crítico de integridad.';
    console.error(error);
  }
});
</script>

<template>
  <div v-if="!isReady" class="splash">
    <div class="loader">
      <h1>RAÍCES</h1>
      <p>{{ statusMessage }}</p>
      <div class="bar"><div class="fill" :style="{ width: progress + '%' }"></div></div>
    </div>
  </div>
  <slot v-else />
</template>

<style scoped>
/* Tus estilos de splash anteriores */
.splash { height: 100vh; display: flex; align-items: center; justify-content: center; background: #F5F1E8; }
.bar { width: 200px; height: 4px; background: #D4A37333; margin: 10px auto; }
.fill { height: 100%; background: #C65D3B; transition: 0.3s; }
</style>