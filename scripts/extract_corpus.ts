// @ts-nocheck
import * as fs from 'fs';
import * as path from 'path';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);

/**
 * RAÍCES - Extractor de Texto (Versión Inteligente)
 */

const CONFIG = {
    // Ajustado a la carpeta donde tienes los archivos nuevos
    INPUT_DIR: "docs/fuentes_raw", 
    OUTPUT_DIR: "docs/fuentes_txt",
    MIN_CHARS: 100
};

async function processPdf(pdfPath: string, outputPath: string) {
    try {
        const buffer = fs.readFileSync(pdfPath);
        const lib = require('pdf-parse');
        let data;
        
        if (typeof lib === 'function') {
            data = await lib(buffer);
        } else if (lib.default && typeof lib.default === 'function') {
            data = await lib.default(buffer);
        } else {
            const func = Object.values(lib).find(v => typeof v === 'function') as Function;
            if (!func) throw new Error("No se encontró la función de extracción");
            data = await func(buffer);
        }

        if (!data.text || data.text.length < CONFIG.MIN_CHARS) {
            console.log(`  ⚠️  ${path.basename(pdfPath)}: Sin texto suficiente.`);
            return false;
        }

        const cleanText = data.text
            .replace(/\n\s*\n/g, '\n\n')
            .replace(/[ \t]+/g, ' ')
            .trim();

        if (!fs.existsSync(CONFIG.OUTPUT_DIR)) {
            fs.mkdirSync(CONFIG.OUTPUT_DIR, { recursive: true });
        }

        fs.writeFileSync(outputPath, cleanText, 'utf-8');
        console.log(`  ✅ ${path.basename(pdfPath)} -> Procesado`);
        return true;

    } catch (err) {
        console.error(`  ❌ Error en ${path.basename(pdfPath)}:`, err.message);
        return false;
    }
}

async function main() {
    console.log("\n[RAÍCES] Iniciando procesamiento de documentos...\n");
    
    if (!fs.existsSync(CONFIG.INPUT_DIR)) {
        console.log(`❌ La carpeta '${CONFIG.INPUT_DIR}' no existe.`);
        return;
    }

    const files = fs.readdirSync(CONFIG.INPUT_DIR).filter(f => f.toLowerCase().endsWith('.pdf'));
    
    if (files.length === 0) {
        console.log("❌ No se encontraron archivos PDF nuevos.");
        return;
    }

    let success = 0;
    let skipped = 0;

    for (const file of files) {
        const fullPath = path.join(CONFIG.INPUT_DIR, file);
        const outPath = path.join(CONFIG.OUTPUT_DIR, file.replace('.pdf', '.txt'));

        // Salta archivos que ya procesamos antes
        if (fs.existsSync(outPath)) {
            console.log(`  ⏩ Saltando: ${file} (ya existe el .txt)`);
            skipped++;
            continue;
        }

        if (await processPdf(fullPath, outPath)) success++;
    }

    console.log(`\n🎉 Resumen:`);
    console.log(`   ✅ Nuevos convertidos: ${success}`);
    console.log(`   ⏩ Ya existentes: ${skipped}`);
    console.log(`   📊 Total analizados: ${files.length}`);
}

main();