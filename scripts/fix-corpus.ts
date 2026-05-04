import fs from 'fs';
import path from 'path';

const CORPUS_PATH = path.join(process.cwd(), 'src/assets/corpus/embeddings.json');

// Mapa de traducción de archivos técnicos a nombres humanos y legales
const nombresLegales: Record<string, string> = {
  "45.43.-METODOLOGIA-ATENCION-PSICOSOCIAL-INDIVIDUAL-PARA-VICTIMAS-EN-EL-EXTERIOR-V3-1.pdf": "Metodología de Atención Psicosocial para Víctimas en el Exterior",
  "AUTO-004-09.pdf": "Auto 004 de 2009 (Protección a Pueblos Indígenas)",
  // Agrega aquí los demás PDFs que tengas en tu carpeta
};

async function fixCorpus() {
  console.log("🌱 Iniciando cirugía estética del conocimiento RAÍCES...");
  
  const rawData = fs.readFileSync(CORPUS_PATH, 'utf-8');
  const data = JSON.parse(rawData);

  data.embeddings = data.embeddings.map((item: any) => {
    // 1. Parsear la metadata que viene como string
    const meta = JSON.parse(item.metadata);
    
    // 2. Limpiar el texto de ruidos de tabla de contenido y encabezados
    let textoLimpio = meta.texto
      .replace(/\.{2,}/g, '') // Quita filas de puntos de índices
      .replace(/Página: \d+ de \d+/g, '')
      .replace(/Código: [\d,.-]+/g, '')
      .replace(/Fecha: \d{2}\/\d{2}\/\d{4}/g, '')
      .replace(/----------------Page \(\d+\) Break----------------/g, '')
      .replace(/\s+/g, ' ')
      .trim();

    // 3. Renombrar la fuente a algo humano
    const fuenteHumana = nombresLegales[meta.fuente] || meta.fuente;

    // Guardamos la metadata limpia y estructurada
    return {
      ...item,
      metadata: JSON.stringify({
        texto: textoLimpio,
        fuente: fuenteHumana,
        fuente_original: meta.fuente // Guardamos el original por si acaso
      })
    };
  });

  fs.writeFileSync(CORPUS_PATH, JSON.stringify(data, null, 2));
  console.log("✅ ¡Corpus sanado! Ahora RAÍCES tiene redacción fluida y nombres claros.");
}

fixCorpus();