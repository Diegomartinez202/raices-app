// @ts-nocheck
import * as fs from 'fs';
import * as path from 'path';
import Tesseract from 'tesseract.js';
import * as pdfjs from 'pdfjs-dist';

const CONFIG = {
    // Esta es la ruta exacta donde están tus archivos ahora:
    OCR_INPUT_DIR: "docs/requiere_ocr", 
    OUTPUT_DIR: "docs/fuentes_txt",
    LANG: "spa",
};

async function processOCR(pdfPath: string) {
    try {
        console.log(`\n[RAÍCES] Abriendo: ${path.basename(pdfPath)}`);
        
        const data = new Uint8Array(fs.readFileSync(pdfPath));
        const loadingTask = pdfjs.getDocument({
            data,
            useSystemFonts: true,
            disableFontFace: true 
        });
        
        const pdf = await loadingTask.promise;
        let fullText = "";

        console.log(`🔍 Documento de ${pdf.numPages} páginas. Iniciando motor visual...`);

        const worker = await Tesseract.createWorker("spa");

        for (let i = 1; i <= pdf.numPages; i++) {
            // Nota: Para simplificar el flujo en Node sin Canvas, 
            // le pasamos la ruta del PDF a Tesseract especificando la página.
            // Si esto falla por el formato, Tesseract nos avisará.
            
            const { data: { text } } = await worker.recognize(pdfPath, {
                // Tesseract.js soporta leer páginas específicas de PDFs en versiones recientes
                pdf_page: i 
            });

            process.stdout.write(`   ⏳ Procesada página ${i}/${pdf.numPages}\r`);
            fullText += `--- PÁGINA ${i} ---\n${text}\n\n`;
        }

        await worker.terminate();

        const outPath = path.join(CONFIG.OUTPUT_DIR, path.basename(pdfPath).replace('.pdf', '.txt'));
        fs.writeFileSync(outPath, fullText, 'utf-8');
        
        console.log(`\n✅ Guardado en: ${path.basename(outPath)}`);
        return true;

    } catch (err) {
        console.error(`\n❌ Error en el motor OCR:`, err.message);
        return false;
    }
}

async function main() {
    console.log("\n--- MOTOR DE RECONOCIMIENTO ÓPTICO RAÍCES ---");
    if (!fs.existsSync(CONFIG.OCR_INPUT_DIR)) {
        console.log("⚠️ Carpeta de entrada no encontrada.");
        return;
    }

    const files = fs.readdirSync(CONFIG.OCR_INPUT_DIR).filter(f => f.endsWith('.pdf'));
    for (const file of files) {
        await processOCR(path.join(CONFIG.OCR_INPUT_DIR, file));
    }
    console.log("\n🎉 Corpus completado al 100%.");
}

main();