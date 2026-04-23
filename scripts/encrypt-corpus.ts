import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'
import { createCipheriv, randomBytes } from 'crypto'
import { resolve, dirname } from 'path'

const CONFIG = {
  INPUT_JSON: 'public/corpus/jep_m10_corpus.json',
  OUTPUT_ENC: 'public/corpus/jep_m10_corpus.json.enc',
  KEY_ENV: 'CORPUS_ENCRYPTION_KEY',
}

function encrypt() {
  // 1. Validar Clave
  const keyBase64 = process.env[CONFIG.KEY_ENV]
  if (!keyBase64) {
    console.error(`❌ Error: Define ${CONFIG.KEY_ENV} en tu archivo .env`);
    process.exit(1);
  }
  const key = Buffer.from(keyBase64, 'base64');

  // 2. Validar Input
  const inputPath = resolve(CONFIG.INPUT_JSON);
  if (!existsSync(inputPath)) {
    console.error(`❌ Error: No existe el archivo ${CONFIG.INPUT_JSON}`);
    process.exit(1);
  }

  // 3. Proceso de Cifrado AES-256-GCM
  const iv = randomBytes(12);
  const plaintext = readFileSync(inputPath);
  const cipher = createCipheriv('aes-256-gcm', key, iv);

  const encrypted = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const tag = cipher.getAuthTag();

  // Estructura: IV (12) + TAG (16) + DATA
  const output = Buffer.concat([iv, tag, encrypted]);
  
  // Asegurar que la carpeta public/corpus exista
  const outputPath = resolve(CONFIG.OUTPUT_ENC);
  if (!existsSync(dirname(outputPath))) mkdirSync(dirname(outputPath), { recursive: true });

  writeFileSync(outputPath, output);
  
  console.log('--------------------------------------------------');
  console.log('✅ CORPUS CIFRADO CON ÉXITO');
  console.log(`📍 Destino: ${CONFIG.OUTPUT_ENC}`);
  console.log(`📦 Tamaño final: ${(output.length / 1024).toFixed(1)} KB`);
  console.log('--------------------------------------------------');
}

encrypt();