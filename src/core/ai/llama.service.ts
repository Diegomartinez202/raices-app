import { Filesystem, Directory } from '@capacitor/filesystem'
import { getPaths, getLLMParams, logger } from '@/core/config/config.service'

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

/**
 * Convierte rutas relativas a rutas absolutas del sistema de archivos real
 */
async function getAbsolutePath(path: string): Promise<string> {
  const result = await Filesystem.getUri({
    path: path,
    directory: Directory.Data
  });
  return result.uri.replace(/^file:\/\//, '');
}

/**
 * Inicializa el modelo local Gemma 2B
 */
export async function initializeLlama(): Promise<boolean> {
  if (isInitialized) return true

  try {
    logger.info('Iniciando carga de Gemma 2B desde almacenamiento local...');

    // 1. Cargar la librería dinámica (WASM/C++ Bindings)
    const { LLama } = await import('@llama-node/llama-cpp');

    // 2. Verificar existencia del modelo
    try {
      await Filesystem.stat({ path: PATHS.LLM_MODEL, directory: Directory.Data });
    } catch {
      logger.warn('El modelo no está en Directory.Data. Es necesario asegurar que se copió al instalar.');
      return false; 
    }

    const absoluteModelPath = await getAbsolutePath(PATHS.LLM_MODEL);

    // 3. Cargar el modelo en memoria RAM
    // @ts-ignore
    model = await LLama.load({
      modelPath: absoluteModelPath,
      enableLogging: false,
    });

    if (!model) throw new Error("Fallo al instanciar el modelo.");

    // 4. Crear el contexto de inferencia
    context = model.createContext({
      nCtx: PARAMS.CONTEXT_SIZE,
      nThreads: PARAMS.THREADS,
    })

    isInitialized = true;
    logger.info('Motor de IA RAÍCES inicializado correctamente.');
    return true;

  } catch (error) {
    logger.error('Error fatal inicializando LLM:', error);
    isInitialized = false;
    return false;
  }
}

/**
 * Genera una respuesta utilizando el contexto recuperado (RAG)
 */
export async function generateResponse(
  question: string,
  ragContext: string[] = []
): Promise<string> {
  if (!isInitialized || !context) {
    return "El sistema de IA se está inicializando. Por favor, espera un momento.";
  }

  if (isGenerating) return "Todavía estoy procesando la información anterior...";

  isGenerating = true;

  try {
    const contextString = ragContext.length > 0 
      ? ragContext.join('\n\n') 
      : 'No hay documentos específicos encontrados para esta consulta.';
    
    // Prompt optimizado para Gemma 2B
    const finalPrompt = `Eres "RAÍCES", una IA de apoyo a víctimas en Colombia. 
CONTEXTO SEGURO:
${contextString}

USUARIO: ${question}
RESPUESTA RAÍCES:`;

    const response = await context.completion({
      prompt: finalPrompt,
      nPredict: PARAMS.N_PREDICT,
      temperature: PARAMS.TEMPERATURE,
      topK: PARAMS.TOP_K,
      topP: PARAMS.TOP_P,
      stop: ['USUARIO:', 'CONTEXTO:', 'PREGUNTA:'],
    });

    isGenerating = false;
    return response.text.trim();

  } catch (error) {
    isGenerating = false;
    logger.error('Error en generación local:', error);
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