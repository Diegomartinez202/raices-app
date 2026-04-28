/**
 * RAÍCES Validator - Auditoría Humana y Ética
 * Uso: node validator.js output/reporte_2026-04-12.json
 */
import { readFileSync, writeFileSync } from 'fs'

const reporteFile = process.argv[2]
if (!reporteFile) {
  console.error('⚠️ Error: Debes especificar el archivo de reporte.')
  console.log('Uso: node validator.js output/reporte_YYYY-MM-DD.json')
  process.exit(1)
}

const reporte = JSON.parse(readFileSync(reporteFile, 'utf-8'))

console.log('═══════════════════════════════════════════════════════════')
console.log('       RAÍCES VALIDATOR - Protocolo de Auditoría')
console.log('═══════════════════════════════════════════════════════════')

reporte.forEach((h, index) => {
  if (h.estado === 'PENDIENTE_VALIDACION') {
    console.log(`\n[ID: ${index}] 📄 DOCUMENTO: ${h.titulo}`);
    console.log(`🔗 URL ORIGEN: ${h.url}`);
    console.log(`📂 ARCHIVO LOCAL: ./output/pendientes_validacion/${h.archivo_local || 'No descargado'}`);
    
    console.log('\n--- CHECKLIST OBLIGATORIO ---');
    console.log('1. Jurídico: ¿Cumple con Ley 1448 / JEP?');
    console.log('2. Psicosocial: ¿Evita la revictimización?');
    console.log('3. Seguridad: ¿Cumple con Habeas Data (Sin nombres reales)?');
    console.log('----------------------------');
  }
});

console.log('\n✅ INSTRUCCIONES:');
console.log('1. Abre el archivo JSON en tu editor.');
console.log('2. Cambia "estado": "APROBADO" y "aprobado": true en los seleccionados.');
console.log('3. Agrega tus comentarios en "notas_legal" y "notas_psicosocial".');
console.log('4. Guarda el JSON y procede a la carga en la App.\n');