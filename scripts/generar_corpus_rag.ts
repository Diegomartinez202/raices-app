import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { pipeline } from '@xenova/transformers';
import PDFParser from "pdf2json";

const CONFIG = {
  PDF_DIR: path.join(process.cwd(), 'docs', 'fuentes_raw'), 
  OUTPUT_DIR: path.join(process.cwd(), 'src/assets/corpus'),
  MODEL: 'Xenova/all-MiniLM-L6-v2',
  CHUNK_SIZE: 500,
  CHUNK_OVERLAP: 50
};
interface VoyEmbedding {
  id: string;
  metadata: string;
  embeddings: number[];
}
async function extraerTextoPDF(filePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const pdfParser = new (PDFParser as any)(null, 1);
    
    // Timeout de 30 segundos por archivo para evitar bloqueos
    const timeout = setTimeout(() => {
      reject(new Error("Timeout: El PDF es demasiado complejo o está corrupto"));
    }, 30000);

    pdfParser.on("pdfParser_dataError", (errData: any) => {
      clearTimeout(timeout);
      reject(errData.parserError);
    });

    pdfParser.on("pdfParser_dataReady", () => {
      clearTimeout(timeout);
      resolve(pdfParser.getRawTextContent());
    });

    try {
      pdfParser.loadPDF(filePath);
    } catch (err) {
      clearTimeout(timeout);
      reject(err);
    }
  });
}

async function generarCorpus() {
  console.log('--- 🌿 INICIANDO SIEMBRA DE CONOCIMIENTO (RAÍCES) ---');

  console.log('[1/4] Cargando modelo de embeddings...');
  const extractor = await pipeline('feature-extraction', CONFIG.MODEL);

  const pdfFiles = fs.readdirSync(CONFIG.PDF_DIR).filter(f => f.endsWith('.pdf'));
  const todosLosChunks: any[] = [];

  console.log(`[2/4] Analizando ${pdfFiles.length} archivos...`);

  for (const file of pdfFiles) {
    try {
      const fullPath = path.join(CONFIG.PDF_DIR, file);
      const rawText = await extraerTextoPDF(fullPath);
      
      // Limpieza básica de texto
      const cleanText = rawText.replace(/\r\n/g, ' ').replace(/\s+/g, ' ');
      const palabras = cleanText.split(' ');
      
      console.log(`  ✅ Procesado: ${file}`);

      for (let i = 0; i < palabras.length; i += (CONFIG.CHUNK_SIZE - CONFIG.CHUNK_OVERLAP)) {
        const chunkText = palabras.slice(i, i + CONFIG.CHUNK_SIZE).join(' ');
        if (chunkText.trim().length < 100) continue;

        const id = crypto.createHash('md5').update(`${file}-${i}`).digest('hex').substring(0, 8);
        todosLosChunks.push({ id, text: chunkText, source: file });
      }
    } catch (error: any) {
      console.error(`  ❌ Error en archivo ${file}: ${error.message || error}`);
    }
  }

  if (todosLosChunks.length === 0) {
    console.error('❌ No se generaron fragmentos.');
    return;
  }

console.log(`[3/4] Generando vectores para ${todosLosChunks.length} fragmentos...`);

// AQUÍ EL CAMBIO: Declarar el tipo explícitamente
const voyEmbeddings: VoyEmbedding[] = []; 

for (const chunk of todosLosChunks) {
  const output = await extractor(chunk.text, { pooling: 'mean', normalize: true });
  
  voyEmbeddings.push({
    id: chunk.id as string,
    metadata: JSON.stringify({ texto: chunk.text, fuente: chunk.source }),
    embeddings: Array.from(output.data as any)
  });
}

  if (!fs.existsSync(CONFIG.OUTPUT_DIR)) fs.mkdirSync(CONFIG.OUTPUT_DIR, { recursive: true });
  fs.writeFileSync(
    path.join(CONFIG.OUTPUT_DIR, 'embeddings.json'), 
    JSON.stringify({ embeddings: voyEmbeddings }, null, 2)
  );

  console.log(`--- ✅ PROCESO COMPLETADO ---`);
}

generarCorpus().catch(err => console.error('❌ Fallo crítico:', err));