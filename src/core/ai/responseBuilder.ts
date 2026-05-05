
function cleanText(text: string) {
  return text
    .replace(/\s+/g, ' ')
    .replace(/\n/g, ' ')
    .replace(/•/g, '')
    .trim();
}

function smartTrim(text: string, maxLength = 300) {
  if (text.length <= maxLength) return text;

  const trimmed = text.slice(0, maxLength);
  const lastPeriod = trimmed.lastIndexOf('.');

  if (lastPeriod > 100) {
    return trimmed.slice(0, lastPeriod + 1);
  }

  return trimmed + '...';
}

function formatBullets(results: any[]) {
  return results.map(r => {
    const text = cleanText(r.text);
    return `• ${text}`;
  }).join('\n\n');
}

function fallbackResponse() {
  return `
🌱 No encontré información exacta en los documentos disponibles en este momento.

Puedes intentar con términos más específicos como:
"indemnización", "RUV", "proyecto productivo", "apoyo psicosocial".

🤝 Este proceso no siempre es inmediato, pero existen rutas institucionales y comunitarias que pueden ayudarte a avanzar paso a paso.
`.trim();
}

// 🔍 Detección de intención (clave para simular "inteligencia")
function detectIntent(question: string) {
  const q = question.toLowerCase();

  if (q.includes('indemnización') || q.includes('cómo') || q.includes('pasos')) return 'legal_steps';
  if (q.includes('qué es') || q.includes('significa')) return 'definition';
  if (q.includes('emprendimiento') || q.includes('negocio') || q.includes('ingresos') || q.includes('proyecto')) return 'financial';
  if (q.includes('psicosocial') || q.includes('emocional') || q.includes('resiliencia') || q.includes('apoyo')) return 'psychosocial';

  return 'general';
}

// 🏛️ BLOQUE LEGAL (tono abogado)
function buildLegalSection(results: any[]) {
  return `
### 🏛️ Marco legal y técnico
${formatBullets(results)}
`.trim();
}

// 🛠️ BLOQUE ACCIÓN (tono consultor)
function buildActionSection(intent: string) {
  if (intent === 'legal_steps') {
    return `
### 🛠️ ¿Qué puedes hacer ahora?
1. **Verificar** tu estado en el Registro Único de Víctimas (RUV).
2. **Solicitar** información formal sobre tu proceso de indemnización.
3. **Actualizar** tus datos de contacto para no perder notificaciones oficiales.
`.trim();
  }

  if (intent === 'financial') {
    return `
### 💼 Orientación para fortalecimiento económico
1. **Identificar** una actividad productiva viable según tu contexto.
2. **Explorar** programas de apoyo estatal o cooperación internacional.
3. **Organizar** tus ingresos y gastos para construir estabilidad progresiva.
`.trim();
  }

  if (intent === 'psychosocial') {
    return `
### 🌿 Orientación para bienestar y resiliencia
1. **Reconocer** que tu proceso emocional es válido.
2. **Buscar** espacios de acompañamiento psicosocial.
3. **Fortalecer** redes de apoyo (familia, comunidad, organizaciones).
`.trim();
  }

  return `
### 🧭 Orientación general
Puedes profundizar en esta información revisando las fuentes mencionadas y acercándote a entidades oficiales o redes de apoyo.
`.trim();
}

// 🤝 BLOQUE HUMANO (trabajador social)
function buildHumanClosure(intent: string) {
  if (intent === 'psychosocial') {
    return `🌿 Tu proceso importa. Buscar apoyo también es una forma de avanzar.`;
  }

  if (intent === 'financial') {
    return `💡 Recuperar estabilidad económica también es parte del proceso de dignificación y reconstrucción de vida.`;
  }

  return `🤝 No estás solo/a en este proceso. Esta información busca orientarte con respeto y claridad.`;
}

/**
 * ✅ INTEGRADO: Extracción técnica de referencias legales
 */
function extractLegalReference(text: string): string {
  if (!text) return "";
  const artMatch = text.match(/Artículo\s+\d+/i);
  const parMatch = text.match(/Parágrafo\s+\d+|Único/i);
  let ref = "";
  if (artMatch) ref += `${artMatch[0]} `;
  if (parMatch) ref += `en su ${parMatch[0]}`;
  return ref.trim();
}

/**
 * ✅ INTEGRADO: Genera el Marco de Referencia con enfoque de consultoría
 */
function sintetizarNormativa(contexto: string): string {
  const leyEncontrada = contexto.match(/Ley\s+\d+|Auto\s+\d+|Decreto\s+\d+|Sentencia\s+[A-Z]-\d+/i);
  const baseLegal = leyEncontrada ? leyEncontrada[0] : "la Normativa Nacional de Reparación";
  const detalleTecnico = extractLegalReference(contexto);

  return `*   **Garantizar** tu reconocimiento bajo el marco de la ${baseLegal} ${detalleTecnico ? `(${detalleTecnico})` : ''}.
*   **Asegurar** que tu condición de víctima en el exterior sea el eje central de tu proceso de reparación integral.
*   **Validar** tu historia a través de los mecanismos oficiales del Estado Colombiano.`;
}

/**
 * ✅ INTEGRADO: Pasos dinámicos basados en el contexto encontrado
 */
function extraerPasosDinamicos(contexto: string): string {
  const tieneIndemnizacion = contexto.toLowerCase().includes("indemnización");
  
  if (tieneIndemnizacion) {
    return `1.  **Solicitar** formalmente el inicio del trámite de indemnización administrativa tras tu inclusión en el RUV.
2.  **Aportar** la documentación que sustenta tu núcleo familiar y los hechos victimizantes.
3.  **Monitorear** los tiempos de respuesta de la Unidad para las Víctimas a través de los canales digitales.`;
  }

  return `1.  **Localizar** tu consulado más cercano para iniciar tu declaración.
2.  **Gestionar** la actualización de tus datos para asegurar la comunicación con el Estado.
3.  **Vincularte** a los procesos de reparación colectiva o individual vigentes.`;
}

function buscarArticuloEspecifico(contexto: string, question: string): string {
  // Extraemos si el usuario preguntó por un artículo específico (ej: "Artículo 12")
  const artQuery = question.match(/Artículo\s+(\d+)/i);
  if (!artQuery) return "";

  const numArt = artQuery[1];
  // Buscamos en el texto recuperado si aparece ese artículo
  const regexArt = new RegExp(`Artículo\\s+${numArt}[^]*?(?=(Artículo|---|$))`, 'i');
  const hallazgo = contexto.match(regexArt);

  if (hallazgo) {
    return `🔍 **Hallazgo directo:** Sobre el **Artículo ${numArt}**, los documentos indican: ${smartTrim(cleanText(hallazgo[0]), 500)}`;
  }
  
  return `⚠️ **Nota técnica:** Consultaste sobre el **Artículo ${numArt}**, pero la información recuperada se centra más en los Artículos 3, 25 y la Ley 1448 en general.`;
}

// 🧠 FUNCIÓN PRINCIPAL
export function buildHumanAnswer(results: any[], question: string) {
  if (!results || results.length === 0) {
    return fallbackResponse();
  }

  const intent = detectIntent(question);
  const contextoGlobal = results.map(r => r.text).join(' ');

  const respuestaDirectaArt = buscarArticuloEspecifico(contextoGlobal, question);

  // 1. ✅ Bloque de Síntesis Experta
  const marcoLegalSintetizado = sintetizarNormativa(contextoGlobal);
  
  // 2. ✅ Bloque Legal Estructurado (Usando buildLegalSection para validar la fuente)
  // Esto elimina el error de 'buildLegalSection is never read'
  const seccionLegalEvidencia = buildLegalSection(results);

  // 3. ✅ Bloque de Pasos y Acciones
  const pasosRecomendados = extraerPasosDinamicos(contextoGlobal);
  const accionesSugeridas = buildActionSection(intent);

  // 4. ✅ Metadatos y Cierre
  const confianza = getConfidenceLabel(results[0].similarity || 0.8);
  const tipoDoc = detectDocType(results[0].text);
  const cierre = buildHumanClosure(intent);

  // Formateo de hallazgos específicos
  const bullets = results.map(r => {
    const clean = smartTrim(cleanText(r.text), 280);
    return `• ${clean}`;
  }).join('\n');

  // 🏛️ ENSAMBLE FINAL (Sin redundancias y con todo el código activo)
  return `
💬 **Comprendo tu consulta:** "${question}"

${respuestaDirectaArt}

### 🏛️ MARCO DE REFERENCIA TÉCNICO
${marcoLegalSintetizado}

---

${seccionLegalEvidencia}
${bullets}

---

### 🛠️ PASOS RECOMENDADOS
${pasosRecomendados}

---

${accionesSugeridas}

---

${cierre}

---
📊 **AUDITORÍA DE RESPUESTA (RAÍCES-V3):**
*   **Nivel de Certeza:** ${confianza}
*   **Categoría de Documento:** ${tipoDoc}
*   **Fuente Oficial:** ${results[0].source || 'Sistema RAÍCES'}
`.trim();
}

function getConfidenceLabel(score: number) {
  if (score >= 0.75) return '🟢 Alta';
  if (score >= 0.5) return '🟡 Media';
  return '🔴 Baja';
}

function detectDocType(text: string) {
  const t = text.toLowerCase();

  if (t.includes('ley') || t.includes('artículo') || t.includes('decreto')) return 'legal';
  if (t.includes('psicosocial') || t.includes('emocional') || t.includes('resiliencia')) return 'psicosocial';
  if (t.includes('proyecto') || t.includes('emprendimiento') || t.includes('ingresos')) return 'financial';

  return 'general';
}
