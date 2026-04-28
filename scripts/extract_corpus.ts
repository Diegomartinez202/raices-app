import * as fs from 'fs';
import * as path from 'path';
// @ts-ignore
import pdf from 'pdf-parse';

/**
 * RAÍCES - Extractor de Texto para Corpus Soberano
 * Traducido a TypeScript para integración nativa con raices-app
 */

const CONFIG = {
    INPUT_DIR: "docs/fuentes_raw",
    OUTPUT_DIR: "docs/fuentes_txt",
    MIN_CHARS_PER_PAGE: 100,
};

const JUNK_PATTERNS = [
    /^\s*Página \d+ de \d+\s*$/i,
    /^\s*www\.jep\.gov\.co\s*$/i,
    /^\s*Bogotá D\.C\.,.*\d{4}\s*$/i,
    /^\s*República de Colombia\s*$/i,
    /^\s*Rama Judicial.*\s*$/i,
    /^\s*-\s*\d+\s*-\s*$/i,
];

function cleanText(text: string): string {
    const lines = text.split('\n');
    const cleanLines = lines.filter(line => {
        const trimmed = line.trim();
        const isJunk = JUNK_PATTERNS.some(pattern => pattern.test(trimmed));
        return !isJunk && trimmed.length > 0;
    });

    let cleaned = cleanLines.join('\n');
    cleaned = cleaned.replace(/ +/g, ' ');
    cleaned = cleaned.replace(/\n{3,}/g, '\n\n');
    return cleaned.trim();
}

function validateFilename(filename: string): boolean {
    const pattern = /^[A-Z]+_\d{4}_[A-Za-z0-9_]+\.pdf$/;
    if (!pattern.test(filename)) {
        console.log(`  ⚠️  AVISO: ${filename} no sigue formato FUENTE_ANO_TEMA.pdf`);
        return false;
    }
    return true;
}

async function extractPdfToTxt(pdfPath: string, outputPath: string): Promise<boolean> {
    try {
        const dataBuffer = fs.readFileSync(pdfPath);
        const data = await pdf(dataBuffer);

        if (data.text.trim().length < CONFIG.MIN_CHARS_PER_PAGE) {
            console.log(`  ❌ ERROR: No se extrajo texto útil de ${path.basename(pdfPath)}`);
            return false;
        }

        const cleaned = cleanText(data.text);
        
        if (!fs.existsSync(path.dirname(outputPath))) {
            fs.mkdirSync(path.dirname(outputPath), { recursive: true });
        }
        
        fs.writeFileSync(outputPath, cleaned, 'utf-8');
        console.log(`  ✅ ${path.basename(pdfPath)} → ${path.basename(outputPath)} | ${cleaned.length} chars`);
        return true;

    } catch (e) {
        console.error(`  ❌ ERROR procesando ${path.basename(pdfPath)}: ${e}`);
        return false;
    }
}

async function main() {
    console.log("[RAÍCES] Iniciando extracción de texto desde PDFs (Versión TS)...");

    const inputDir = CONFIG.INPUT_DIR;
    const outputDir = CONFIG.OUTPUT_DIR;

    if (!fs.existsSync(inputDir)) {
        fs.mkdirSync(inputDir, { recursive: true });
        console.log(`❌ No hay carpeta de entrada en ${inputDir}. Creada automáticamente.`);
        return;
    }

    const files = fs.readdirSync(inputDir).filter(f => f.endsWith('.pdf'));

    if (files.length === 0) {
        console.log(`❌ No hay PDFs en ${inputDir}`);
        return;
    }

    console.log(`[1/2] Encontrados ${files.length} PDFs para procesar...`);
    let success = 0;

    for (const file of files) {
        const pdfPath = path.join(inputDir, file);
        const txtName = path.parse(file).name + ".txt";
        const outputPath = path.join(outputDir, txtName);

        console.log(`\nProcesando: ${file}`);
        validateFilename(file);

        if (await extractPdfToTxt(pdfPath, outputPath)) {
            success++;
        }
    }

    console.log(`\n[2/2] Extracción completada.`);
    console.log(`✅ Éxito: ${success}/${files.length} archivos convertidos a .txt`);
}

main();