import { pipeline, env } from '@xenova/transformers';
import path from 'path';

// 1. Configuración de Soberanía IA (Offline Total)
env.allowRemoteModels = false;
env.localModelPath = path.join(process.cwd(), 'public', 'models'); 

// 2. IMPORTANTE para Windows: Forzamos el uso de rutas locales sin caché de navegador
env.useBrowserCache = false;
env.allowLocalModels = true; // Habilitamos explícitamente modelos locales

// 3. Ajuste de barras para compatibilidad con la librería Transformers.js
// A veces la librería espera '/' incluso en Windows para las subrutas de modelos
const MODEL_NAME = 'all-MiniLM-L6-v2';

// Configuramos dónde buscar el subproceso de ONNX si fuera necesario
env.backends.onnx.wasm.wasmPaths = path.resolve('node_modules/@xenova/transformers/dist/');

function cosineSimilarity(vecA: number[], vecB: number[]): number {
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < vecA.length; i++) {
        dotProduct += vecA[i] * vecB[i];
        normA += vecA[i] * vecA[i];
        normB += vecB[i] * vecB[i];
    }
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

export class SemanticSearchService {
    private extractor: any = null;

async init() {
    if (this.extractor) return;
    
    console.log("[RAÍCES] Cargando motor de conocimiento local...");
    
    try {
        // Forzamos a que no busque versiones comprimidas y use el path exacto
        this.extractor = await pipeline('feature-extraction', 'all-MiniLM-L6-v2', {
            quantized: false, 
            local_files_only: true // Reforzamos que NO busque nada en internet
        });
        console.log("✅ Motor de búsqueda listo.");
    } catch (error) {
        console.error("❌ Error crítico de carga:", error);
        throw error;
    }
}

    async search(query: string, corpusEmbeddings: any[]) {
        if (!this.extractor) await this.init();

        // Generar el embedding de la pregunta
        const output = await this.extractor(query, { pooling: 'mean', normalize: true });
        const queryVector = Array.from(output.data) as number[];

        return corpusEmbeddings
            .map(item => {
                // Manejamos el caso de que metadata ya sea un objeto o un string JSON
                const metadata = typeof item.metadata === 'string' ? JSON.parse(item.metadata) : item.metadata;
                return {
                    id: item.id,
                    text: metadata.texto || metadata.text,
                    source: metadata.fuente || metadata.source,
                    similarity: cosineSimilarity(queryVector, item.embeddings)
                };
            })
            .sort((a, b) => b.similarity - a.similarity)
            .slice(0, 3);
    }
}