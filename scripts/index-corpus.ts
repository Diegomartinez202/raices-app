import * as fs from 'fs';
import * as path from 'path';
// @ts-ignore
import pdf from 'pdf-parse';

const CONFIG = {
    INPUT_DIR: "docs/fuentes_pdf",
    OUTPUT_DIR: "docs/fuentes_txt"
};

const JUNK_PATTERNS = [
    /Página \d+ de \d+/gi,
    /Documento firmado electrónicamente/gi,
    /Expediente No\./gi
];

function cleanText(text: string): string {
    let lines = text.split('\n');
    let cleanedLines = lines.filter(line => {
        const trimmed = line.trim();
        const isJunk = JUNK_PATTERNS.some(pattern => pattern.test(trimmed));
        return !isJunk && trimmed.length > 0;
    });
    return cleanedLines.join('\n').replace(/ +/g, ' ').replace(/\n{3,}/g, '\n\n');
}

async function main() {
    console.log("[RAÍCES] Extrayendo texto de PDFs...");
    if (!fs.existsSync(CONFIG.INPUT_DIR)) fs.mkdirSync(CONFIG.INPUT_DIR, { recursive: true });
    if (!fs.existsSync(CONFIG.OUTPUT_DIR)) fs.mkdirSync(CONFIG.OUTPUT_DIR, { recursive: true });

    const files = fs.readdirSync(CONFIG.INPUT_DIR).filter(f => f.endsWith('.pdf'));
    
    for (const file of files) {
        try {
            const dataBuffer = fs.readFileSync(path.join(CONFIG.INPUT_DIR, file));
            const data = await pdf(dataBuffer);
            const cleaned = cleanText(data.text);
            fs.writeFileSync(path.join(CONFIG.OUTPUT_DIR, file.replace('.pdf', '.txt')), cleaned);
            console.log(`✅ Procesado: ${file}`);
        } catch (e) {
            console.error(`❌ Error en ${file}:`, e);
        }
    }
}

main();