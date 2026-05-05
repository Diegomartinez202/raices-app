import fs from 'fs';
import path from 'path';

const CORPUS_PATH = path.join(process.cwd(), 'src/assets/corpus/embeddings.json');

// Mapa de traducción de archivos técnicos a nombres humanos y legales
const nombresLegales: Record<string, string> = {
  // --- MARCO LEGAL Y JUSTICIA ---
  "CONGRESO_2011_Ley1448Victimas.txt": "Ley 1448 de 2011 (Ley de Víctimas y Restitución de Tierras)",
  "CONGRESO_2011_Ley1448Estatutos.txt": "Estatutos Derivados de la Ley 1448 de 2011",
  "CONGRESO_2019_LeyStatutariaJEP.txt": "Ley Estatutaria de la Jurisdicción Especial para la Paz (JEP)",
  "CEJ_2020_ModeloJusticiaTransicional.txt": "Modelo de Justicia Transicional (CEJ 2020)",
  "JEP_2024_ManualJusticiaRestaurativa.txt": "Manual de Justicia Restaurativa de la JEP (2024)",
  "EP_2021_ManualParticipacionVictimas.txt": "Manual de Participación para las Víctimas (2021)",

  // --- SALUD Y ATENCIÓN PSICOSOCIAL ---
  "MINSALUD_2015_ProtocoloPAPSIVI.txt": "Protocolo PAPSIVI (Atención Psicosocial y Salud Integral)",
  "MINSALUD_2023_MetodologíaAtencionExterior.txt": "Metodología de Atención a Víctimas en el Exterior (2023)",
  "UARIV_2020_RutaAtencionPsicosocial.txt": "Ruta de Atención Psicosocial de la Unidad para las Víctimas",

  // --- EMPRENDIMIENTO Y FINANZAS ---
  "Cartilla-Financiera_Manejo_Productivo_Contable_2011.txt": "Cartilla de Manejo Productivo y Contable para Emprendedores",
  "Guia_Financiar_Proyectos__Territoriales_DNP_2023.txt": "Guía DNP para la Financiación de Proyectos Territoriales (2023)",
  "MANUAL__plan de negocios_FIODM_2022.txt": "Manual para la Elaboración de Planes de Negocio (FIODM)",
  "Libro3EmprendedoresenCrecimiento_2017.txt": "Guía para Emprendedores en Etapa de Crecimiento",
  "Manual_financiero_financiación_fondo_emprender_2002.txt": "Manual de Financiación del Fondo Emprender",
  "Cartillaguia_Camara_Comercio_Bogota_plandeempresa.2011pdf.txt": "Guía de Plan de Empresa (Cámara de Comercio de Bogotá)",
  "Modelo_Emprendimiento_TI_Colombia_2000.txt": "Modelo Nacional de Emprendimiento en Tecnologías de la Información",
  "SuarezJohn_Guia_Practica_Emprendedores_2022_Anexo.txt": "Guía Práctica para Emprendedores (Anexo Suárez John)"
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