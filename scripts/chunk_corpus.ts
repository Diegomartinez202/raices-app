// @ts-nocheck
import * as fs from 'fs';
import * as path from 'path';

const CONFIG = {
    INPUT_DIR: "docs/fuentes_txt",
    OUTPUT_DIR: "docs/chunks",
    CHUNK_SIZE: 1200, // Tamaño ideal para MinCiencia (caracteres)
    OVERLAP: 200      // Lo que se repite entre bloques para no perder contexto
};

function createChunks(text: string, fileName: string) {
    const chunks = [];

    // 🔥 LIMPIEZA PREVIA
    text = cleanRawText(text);

    let start = 0;

    while (start < text.length) {
        let end = start + CONFIG.CHUNK_SIZE;

        if (end < text.length) {
            const lastBreak = text.lastIndexOf('\n', end);
            const lastPeriod = text.lastIndexOf('. ', end);
            const optimalBreak = Math.max(lastBreak, lastPeriod);

            if (optimalBreak > start + (CONFIG.CHUNK_SIZE * 0.7)) {
                end = optimalBreak + 1;
            }
        }

        const content = text.substring(start, end).trim();

        // 🔥 FILTRO PRO
        if (content.length > 80 && !isGarbage(content)) {
            chunks.push({
                source: fileName,
                content,
                index: chunks.length
            });
        }

        start = end - CONFIG.OVERLAP;
    }

    return chunks;
}

function isGarbage(text: string) {
  const words = text.split(' ');

  // muy corto o repetitivo
  if (words.length < 10) return true;

  // demasiado repetido tipo "la la la"
  const unique = new Set(words);
  if (unique.size / words.length < 0.4) return true;

  return false;
}

async function main() {
    console.log("\n[RAÍCES] Iniciando Fase 2: Fragmentación de Conocimiento...\n");

    if (!fs.existsSync(CONFIG.OUTPUT_DIR)) {
        fs.mkdirSync(CONFIG.OUTPUT_DIR, { recursive: true });
    }

    const files = fs.readdirSync(CONFIG.INPUT_DIR).filter(f => f.endsWith('.txt'));
    let totalChunks = 0;

    for (const file of files) {
        const text = fs.readFileSync(path.join(CONFIG.INPUT_DIR, file), 'utf-8');
        const chunks = createChunks(text, file);
        
        // Guardamos los chunks en un archivo JSON para la fase de vectores (Paso 3)
        const chunkFileName = file.replace('.txt', '_chunks.json');
        fs.writeFileSync(
            path.join(CONFIG.OUTPUT_DIR, chunkFileName), 
            JSON.stringify(chunks, null, 2)
        );

        console.log(`  📦 ${file}: Dividido en ${chunks.length} fragmentos.`);
        totalChunks += chunks.length;
    }

    console.log(`\n✅ Proceso completado.`);
    console.log(`📊 Total de fragmentos listos para indexar: ${totalChunks}`);
}

main();