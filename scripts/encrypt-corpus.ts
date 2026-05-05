import { readFileSync, writeFileSync, existsSync, mkdirSync, copyFileSync } from 'fs'
import { createCipheriv, randomBytes } from 'crypto'
import { resolve, dirname } from 'path'

const CONFIG = {
  INPUT_JSON: 'public/corpus/jep_m10_corpus.json',
  OUTPUT_ENC: 'public/corpus/jep_m10_corpus.json.enc',
  BACKUP_JSON: 'src/assets/corpus/embeddings.json', // Capa de Desarrollo
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
  if (key.length !== 32) {
    console.error('❌ Error: La clave en CORPUS_ENCRYPTION_KEY debe ser de 32 bytes (256 bits).');
    process.exit(1);
  }

  // 2. Validar e Identificar Rutas
  const inputPath = resolve(CONFIG.INPUT_JSON);
  const outputPath = resolve(CONFIG.OUTPUT_ENC);
  const backupPath = resolve(CONFIG.BACKUP_JSON);

  if (!existsSync(inputPath)) {
    console.error(`❌ Error: No existe el archivo fuente ${CONFIG.INPUT_JSON}`);
    process.exit(1);
  }

  // 3. Proceso de Cifrado AES-256-GCM
  const iv = randomBytes(12);
  const plaintext = readFileSync(inputPath);
  const cipher = createCipheriv('aes-256-gcm', key, iv);

  const encrypted = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const tag = cipher.getAuthTag();

  const output = Buffer.concat([iv, tag, encrypted]);
  
  // 4. Guardar Archivo Cifrado (Capa de Producción)
  if (!existsSync(dirname(outputPath))) mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, output);

  // 5. Sincronización de Idoneidad (Respaldo en Desarrollo)
  // Movido adentro para que 'inputPath' sea reconocido
  if (!existsSync(dirname(backupPath))) mkdirSync(dirname(backupPath), { recursive: true });
  copyFileSync(inputPath, backupPath); 
  
  console.log('--------------------------------------------------');
  console.log('✅ CORPUS PROTEGIDO Y SINCRONIZADO');
  console.log(`🔒 Cifrado: ${CONFIG.OUTPUT_ENC}`);
  console.log(`🔄 Respaldo: ${CONFIG.BACKUP_JSON}`);
  console.log(`📦 Tamaño: ${(output.length / 1024).toFixed(1)} KB`);
  console.log('--------------------------------------------------');
}

encrypt();