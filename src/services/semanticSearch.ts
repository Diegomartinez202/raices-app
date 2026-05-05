import { pipeline, env } from '@xenova/transformers';
import { join, resolve } from 'path';
import { logEvent } from '../core/audit/audit.service';
import { createDecipheriv } from 'crypto';
import { existsSync, readFileSync } from 'fs';
import { getPaths } from '../core/config/config.service';
const paths = getPaths();
// 1. Configuración de Soberanía IA (Alineado con download-assets.ts)
env.allowRemoteModels = false;
// 💡 CAMBIO: Ajustamos la ruta a 'corpus' donde descargamos el MiniLM
env.localModelPath = join(process.cwd(), 'public');

env.useBrowserCache = false;
env.allowLocalModels = true; 

// 2. Funciones de Cálculo de Precisión
function cosineSimilarity(vecA: number[], vecB: number[]): number {
    if (!vecA || !vecB || vecA.length !== vecB.length) return 0;
    
    let dotProduct = 0, normA = 0, normB = 0;
    for (let i = 0; i < vecA.length; i++) {
        dotProduct += vecA[i] * vecB[i];
        normA += vecA[i] * vecA[i];
        normB += vecB[i] * vecB[i];
    }
    const magnitude = Math.sqrt(normA) * Math.sqrt(normB);
    return magnitude === 0 ? 0 : dotProduct / magnitude;
}

// 3. Sistema de Clasificación por Ejes RAÍCES
function detectDocType(text: string): 'legal' | 'psychosocial' | 'financial' | 'general' {
    const t = text.toLowerCase();
    if (/ley|articulo|decreto|jep|jurisprudencia/.test(t)) return 'legal';
    if (/psicosocial|emocional|duelo|resiliencia|acompañamiento/.test(t)) return 'psychosocial';
    if (/proyecto productivo|emprendimiento|ingresos|negocio|pyme|credito|financiamiento|bancaria|microcredito|factura|iva/.test(t)) {
        return 'financial';
    }
    
    return 'general';
}

export class SemanticSearchService {
    private extractor: any = null;

    /**
     * Valida la clave y la existencia del corpus antes de cargar el motor.
     */
private preFlightCheck(): Buffer {
    const keyBase64 = process.env.CORPUS_ENCRYPTION_KEY;
    if (!keyBase64) throw new Error("Falta CORPUS_ENCRYPTION_KEY");

    const key = Buffer.from(keyBase64, 'base64');
    
    // 💡 DINÁMICO: Usa la ruta centralizada de getPaths()
    const corpusPath = resolve('public', paths.CORPUS_ENCRYPTED);
    if (!existsSync(corpusPath)) {
        throw new Error(`Conocimiento no encontrado en: ${corpusPath}`);
    }

    return key;
}

private validateEncryptionKey(): Buffer {
        const keyBase64 = process.env.CORPUS_ENCRYPTION_KEY;
        
        if (!keyBase64) {
            throw new Error("Falta la clave en el .env (CORPUS_ENCRYPTION_KEY)");
        }

        try {
            const key = Buffer.from(keyBase64, 'base64');
            // Validamos longitud para AES-256 (32 bytes)
            if (key.length !== 32) {
                throw new Error(`Longitud de clave inválida: ${key.length} bytes.`);
            }
            return key;
        } catch (error) {
            throw new Error("La clave de cifrado no tiene un formato Base64 válido.");
        }
    }

    /**
     * 2. Descifrado en Tiempo de Ejecución: Procesa el corpus sin guardarlo en disco.
     * Resuelve el aviso 'createDecipheriv is declared but never read'.
     */
    private decryptCorpus(encryptedPath: string): any[] {
        // Llamada al validador interno
        const key = this.validateEncryptionKey(); 
        
        // Lectura del archivo .enc
        const buffer = readFileSync(resolve(encryptedPath));

        /**
         * Estructura del buffer RAÍCES:
         * [0-11]: IV (12 bytes)
         * [12-27]: Tag (16 bytes)
         * [28-end]: Datos cifrados
         */
        const iv = buffer.subarray(0, 12);
        const tag = buffer.subarray(12, 28);
        const encryptedData = buffer.subarray(28);

        // Uso de la función importada para descifrar
        const decipher = createDecipheriv('aes-256-gcm', key, iv);
        decipher.setAuthTag(tag);

        const decrypted = Buffer.concat([
            decipher.update(encryptedData),
            decipher.final()
        ]);

        // Transformación a objeto JSON para el motor semántico
        return JSON.parse(decrypted.toString('utf-8'));
    }

async init() {
    if (this.extractor) return;
    
    try {
        this.preFlightCheck();
        
        // 💡 CAMBIO CRÍTICO:
        // En lugar de 'all-MiniLM-L6-v2', pasamos la ruta relativa desde 'public'
        // que es 'models/all-MiniLM-L6-v2'
        const modelPath = 'models/all-MiniLM-L6-v2'; 

        this.extractor = await pipeline('feature-extraction', modelPath, {
            quantized: false, 
            local_files_only: true
        });
            
            console.log(" ✅ Motor de recuperación de información listo.");
            
        } catch (error: any) {
            console.error(" ❌ Fallo en el arranque del motor:");
            
            // Registro en auditoría con el tipo de evento actualizado
            await logEvent('SEARCH_ENGINE_ERROR', {
                severity: 'error',
                metadata: { phase: 'init', reason: error.message }
            });
            
            throw error;
        }
    }
 async search(query: string, corpusEmbeddings: any[]) {
    try {
        // Asegurar inicialización del motor
        if (!this.extractor) await this.init();

        // 1. Generar embedding de la consulta
        const output = await this.extractor(query, { pooling: 'mean', normalize: true });
        const queryVector = Array.from(output.data) as number[];
        
        // 2. Detectar intención de la pregunta (Eje del proyecto)
        const queryType = detectDocType(query);

        // 3. Procesamiento del Corpus y Scoring Híbrido
        const results = (corpusEmbeddings || [])
            .map(item => {
                const metadata = typeof item.metadata === 'string'
                    ? JSON.parse(item.metadata)
                    : (item.metadata || {});

                const text = metadata.texto || metadata.text || item.text || "";
                const source = metadata.fuente || metadata.source || "Fuente Oficial";
                const vector = item.embeddings || item.embedding;
                const docType = detectDocType(text);

                // Cálculo de Similitud del Coseno
                const semantic = vector ? cosineSimilarity(queryVector, vector) : 0;
                
                // Boost de coincidencia de eje (Ejem: Pregunta legal -> Documento legal)
                let intentBoost = (queryType !== 'general' && queryType === docType) ? 0.25 : 0;

                // Score final ponderado (Soberanía y Precisión)
                const hybridScore = (semantic * 0.7) + intentBoost;

                return {
                    id: item.id,
                    text,
                    source,
                    similarity: semantic,
                    score: hybridScore,
                    type: docType
                };
            })
            .sort((a, b) => b.score - a.score)
            .slice(0, 5);

        // 💡 INTEGRACIÓN DE AUDITORÍA: Registro de éxito
// 💡 INTEGRACIÓN DE AUDITORÍA: Registro de éxito
await logEvent('SEMANTIC_SEARCH_PERFORMED', {
    severity: 'info',
    metadata: {
        query: query.substring(0, 100),
        detected_intent: queryType, // 'legal', 'psychosocial', etc.
        top_score: results[0]?.score || 0,
        results_count: results.length
    }
});

        return results;

    } catch (error: any) {
        // 💡 INTEGRACIÓN DE AUDITORÍA: Registro de error técnico crítico
        console.error("❌ Error en el motor de búsqueda:", error);
        
// 💡 INTEGRACIÓN DE AUDITORÍA: Registro de error
await logEvent('SEARCH_ENGINE_ERROR', {
    severity: 'error',
    metadata: { 
        message: error.message.substring(0, 200) // Evitar strings demasiado largos
    }
});

        throw error;
    }
  }
}