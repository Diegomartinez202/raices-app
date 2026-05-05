import fs from 'fs';
import axios from 'axios';
import path from 'path';

/**
 * RAÍCES - Script de aprovisionamiento de modelos (Optimizado)
 * Descarga exclusivamente los componentes del motor de búsqueda semántica MiniLM.
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
  }
];

async function download() {
  console.log('\n--- 🌱 RAÍCES: Protocolo de Aprovisionamiento de Motor Semántico ---');

  // Asegurar que exista el directorio del corpus (eliminamos /models por optimización)
  const dir = 'public/corpus';
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log(` ✅ Estructura de conocimiento creada: ${dir}`);
  }

  for (const asset of ASSETS) {
    const absolutePath = path.resolve(asset.path);
    const fileName = path.basename(asset.path);

    if (fs.existsSync(absolutePath)) {
      console.log(` ✨ Activo verificado: ${fileName}`);
      continue;
    }

    console.log(` ⏳ Adquiriendo componente: ${fileName}...`);
    
    try {
      const response = await axios({
        url: asset.url,
        method: 'GET',
        responseType: 'stream'
      });

      // Implementación de barra de progreso básica para archivos grandes
// Usamos parseInt con un fallback de string vacío para asegurar el tipo string
      const contentLength = response.headers['content-length'];
      const totalLength = parseInt(typeof contentLength === 'string' ? contentLength : '0', 10);
      let downloadedLength = 0;

      const writer = fs.createWriteStream(asset.path);
      
      response.data.on('data', (chunk: Buffer) => {
        downloadedLength += chunk.length;
        if (totalLength > 0) {
          const progress = ((downloadedLength / totalLength) * 100).toFixed(1);
          process.stdout.write(`    Progreso: ${progress}%\r`);
        }
      });

      response.data.pipe(writer);

      // 2. Solución al Error de Promise (Línea 70)
      // TypeScript espera que la función resolve coincida exactamente con la firma de la Promesa
      await new Promise<void>((resolve, reject) => {
        writer.on('finish', () => resolve()); // Se llama sin argumentos para cumplir con Promise<void>
        writer.on('error', (err) => reject(err));
      });

      console.log(`\n 🚀 Integración exitosa: ${fileName}`);
    } catch (error: any) {
      console.error(` ❌ Error crítico en ${fileName}: ${error.message}`);
    }
  }
  
  console.log('\n✅ [RAÍCES] Aprovisionamiento completado. El motor está listo para operar.');
}

download().catch(err => {
  console.error('[RAÍCES] Error fatal en el despliegue:', err);
  process.exit(1);
});