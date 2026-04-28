import fs from 'fs';
import axios from 'axios';
import path from 'path';

/**
 * RAÍCES - Script de aprovisionamiento de modelos
 * Descarga los pesos de la IA desde Hugging Face al almacenamiento local.
 */

const ASSETS = [
  {
    url: 'https://huggingface.co/sentence-transformers/all-MiniLM-L6-v2/resolve/main/onnx/model.onnx',
    path: 'public/corpus/all-MiniLM-L6-v2.onnx'
  },
  {
    url: 'https://huggingface.co/sentence-transformers/all-MiniLM-L6-v2/resolve/main/tokenizer.json',
    path: 'public/corpus/tokenizer.json'
  },
  {
    url: 'https://huggingface.co/sentence-transformers/all-MiniLM-L6-v2/resolve/main/tokenizer_config.json',
    path: 'public/corpus/tokenizer_config.json'
  },
  {
    url: 'https://huggingface.co/google/gemma-2b-it-GGUF/resolve/main/gemma-2b-it-q4_k_m.gguf',
    path: 'public/models/gemma-2b-it-q4_k_m.gguf'
  },
];

async function download() {
  console.log('[RAÍCES] Iniciando descarga de activos críticos...');

  // Asegurar que existan los directorios de destino
  const dirs = ['public/corpus', 'public/models'];
  dirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      console.log(` - Directorio creado: ${dir}`);
    }
  });

for (const asset of ASSETS) {
  const absolutePath = path.resolve(asset.path); // <--- AQUÍ SE "LEE" EL VALOR DE path
  
  if (fs.existsSync(absolutePath)) {
    console.log(` Ya existe: ${asset.path}`);
    continue;
  }

    console.log(` ⏳ Descargando: ${asset.path} desde Hugging Face...`);
    
    try {
      const response = await axios({
        url: asset.url,
        method: 'GET',
        responseType: 'stream'
      });

      const writer = fs.createWriteStream(asset.path);
      response.data.pipe(writer);

      await new Promise((resolve, reject) => {
      writer.on('finish', () => resolve(true));
        writer.on('error', reject);
      });

      console.log(` 🚀 OK: ${asset.path}`);
    } catch (error: any) {
      console.error(` ❌ Error descargando ${asset.url}: ${error.message}`);
    }
  }
  
  console.log('[RAÍCES] Aprovisionamiento completado.');
}

download().catch(err => {
  console.error('[RAÍCES] Error fatal en el script de descarga:', err);
  process.exit(1);
});