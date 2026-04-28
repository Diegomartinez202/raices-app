import { Filesystem, Directory } from '@capacitor/filesystem'
import { getPaths, getLLMParams, logger, getRaicesDomains } from '@/core/config/config.service'
import { logEvent } from '@/core/audit/audit.service'

// --- INTEGRACIÓN: INICIO DE NUEVAS REGLAS DE NEGOCIO ---
const DOMAINS = getRaicesDomains()

const RAICES_SYSTEM_PROMPT = `Eres RAÍCES, una acompañante digital para víctimas del conflicto armado en Colombia.

PERSONALIDAD Y TONO:
- Resiliente: Reconoces el dolor sin re-victimizar. Usas lenguaje de fortaleza y esperanza.
- Fraternal: Hablas como una hermana mayor que acompaña, no como una institución fría.
- Digna: Nunca usas diminutivos condescendientes. Tratas a la persona con respeto absoluto.
- Clara: Explicas términos legales/financieros con palabras sencillas, sin jerga.

DOMINIOS PERMITIDOS - SOLO RESPONDES SOBRE:
1. JURÍDICO JEP: Derechos de víctimas, proceso de acreditación, Auto 004 de 2018, jurisprudencia sobre reparación simbólica.
2. FINANZAS PYMES: Fortalecimiento de proyectos productivos, emprendimientos, acceso a microcrédito, sostenibilidad económica.
3. APOYO PSICOSOCIAL: Resiliencia, reconstrucción del tejido humano, herramientas de afrontamiento, rutas de atención.

LÍMITES ABSOLUTOS:
1. NO das estado de procesos individuales.
2. NO das diagnósticos psicológicos.
3. NO das asesoría financiera personalizada.

${DOMAINS.DISCLAIMER}`

/**
 * Nueva función: Detecta si la pregunta está fuera de dominio
 */
function isOutOfDomain(query: string): boolean {
  const lowerQuery = query.toLowerCase()
  const forbiddenKeywords = [
    'fútbol', 'política', 'presidente', 'elecciones', 'novela', 'farándula',
    'receta', 'cocina', 'bitcoin', 'cripto', 'precio', 'dólar',
    'mi caso', 'mi proceso', 'mi expediente', 'estado de mi solicitud',
  ]
  if (forbiddenKeywords.some(kw => lowerQuery.includes(kw))) return true
  
  const allowedKeywords = [
    'jep', 'jurisprudencia', 'auto 004', 'acreditación', 'víctima', 'reparación',
    'proyecto productivo', 'emprendimiento', 'pyme', 'microcrédito', 'negocio',
    'resiliencia', 'apoyo', 'tejido humano', 'sanar', 'duelo', 'afrontamiento',
  ]
  return !allowedKeywords.some(kw => lowerQuery.includes(kw))
}
// --- INTEGRACIÓN: FIN DE NUEVAS REGLAS DE NEGOCIO ---

interface LlamaContext {
  free: () => void;
  completion: (params: any) => Promise<{ text: string }>;
}

interface LlamaModel {
  createContext: (params: any) => LlamaContext
  free: () => void
}

const PATHS = getPaths();
const PARAMS = getLLMParams();

let model: LlamaModel | null = null
let context: LlamaContext | null = null
let isInitialized = false
let isGenerating = false

async function getAbsolutePath(path: string): Promise<string> {
  const result = await Filesystem.getUri({
    path: path,
    directory: Directory.Data
  });
  return result.uri.replace(/^file:\/\//, '');
}

export async function initializeLlama(): Promise<boolean> {
  if (isInitialized) return true
  const startTime = Date.now();
  try {
    logger.info('Iniciando carga de Gemma 2B desde almacenamiento local...');
    const { LLama } = await import('@llama-node/llama-cpp');

    try {
      await Filesystem.stat({ path: PATHS.LLM_MODEL, directory: Directory.Data });
    } catch {
      logger.warn('El modelo no está en Directory.Data.');
      return false; 
    }

    const absoluteModelPath = await getAbsolutePath(PATHS.LLM_MODEL);

    // @ts-ignore
    model = await LLama.load({
      modelPath: absoluteModelPath,
      enableLogging: false,
    });

    if (!model) throw new Error("Fallo al instanciar el modelo.");

    context = model.createContext({
      nCtx: PARAMS.CONTEXT_SIZE,
      nThreads: PARAMS.THREADS,
    })

    isInitialized = true;
    const elapsed = Date.now() - startTime;

    await logEvent('LLM_LOAD_SUCCESS', {
      severity: 'info',
      metadata: { 
        model: 'gemma-2b-it-q4_k_m', 
        duration_ms: elapsed,
        threads: PARAMS.THREADS 
      }
    });    
    
    logger.info('Motor de IA RAÍCES inicializado correctamente.');
    return true;

  } catch (error: any) {
    logger.error('Error fatal inicializando LLM:', error);
    await logEvent('LLM_LOAD_FAIL', { 
      severity: 'error',
      metadata: { error: error.message || 'Error desconocido' } 
    });
    isInitialized = false;
    return false;
  }
}

export async function generateResponse(
  question: string,
  ragContext: string[] = []
): Promise<string> {

  // --- INTEGRACIÓN: FILTRO DE DOMINIO ANTES DE GENERAR ---
  if (isOutOfDomain(question)) {
    await logEvent('QUERY_REJECTED_DOMAIN', {
      severity: 'info',
      metadata: { query: question.substring(0, 100) },
    })
    return DOMAINS.REJECT_MESSAGE
  }
  // --- FIN FILTRO ---

  if (!isInitialized || !context) {
    return "El sistema de IA se está inicializando. Por favor, espera un momento.";
  }

  if (isGenerating) return "Todavía estoy procesando la información anterior...";

  isGenerating = true;

  try {
    const contextString = ragContext.length > 0 
      ? ragContext.join('\n\n') 
      : 'No hay documentos específicos encontrados para esta consulta.';
    
    // INTEGRACIÓN: Se usa el nuevo RAICES_SYSTEM_PROMPT para guiar la respuesta
    const finalPrompt = `${RAICES_SYSTEM_PROMPT}

CONTEXTO SEGURO DE TU BIBLIOTECA:
${contextString}

PREGUNTA DEL USUARIO: ${question}
RESPUESTA RAÍCES (directa, cálida y citando fuentes):`;

    const response = await context.completion({
      prompt: finalPrompt,
      nPredict: PARAMS.N_PREDICT,
      temperature: PARAMS.TEMPERATURE,
      topK: PARAMS.TOP_K,
      topP: PARAMS.TOP_P,
      stop: ['USUARIO:', 'CONTEXTO:', 'PREGUNTA:', 'RESPUESTA:'],
    });

    await logEvent('RAG_INIT_SUCCESS', { 
      severity: 'info', 
      metadata: { 
        context_chunks: ragContext.length,
        prompt_size: finalPrompt.length 
      } 
    });

    isGenerating = false;
    return response.text.trim();

  } catch (error: any) {
    isGenerating = false;
    logger.error('Error en generación local:', error);
    await logEvent('ERROR_CRITICAL', { 
      severity: 'error',
      metadata: { 
        context: 'LLM_GENERATE', 
        error: error.message || 'Error desconocido' 
      } 
    });
    return "Lo siento, tuve un problema técnico al procesar la respuesta localmente.";
  }
}

export function isLlamaReady(): boolean {
  return isInitialized && !isGenerating;
}

export function unloadLlama(): void {
  if (context) context.free();
  if (model) model.free();
  isInitialized = false;
  logger.info('Memoria de IA liberada.');
}