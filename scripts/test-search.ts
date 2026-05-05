// @ts-nocheck
import { raicesConsole } from '../src/services/raicesConsole';
import { domainService } from '../src/core/ai/domain.service';
import * as fs from 'fs';
import * as path from 'path';

async function test() {
    console.log("\n--- 🌱 MODO RAÍCES: Asistente Técnico de Alta Precisión (Producción) ---");

    // 1. Carga de base de conocimiento
    const embeddingsPath = path.resolve('src/assets/corpus/embeddings.json');
    if (!fs.existsSync(embeddingsPath)) {
        console.error("❌ Error: No se encontró la base de conocimientos (embeddings.json).");
        return;
    }
    
    const data = JSON.parse(fs.readFileSync(embeddingsPath, 'utf-8'));
    const corpus = data.embeddings || data;

    const userQuery = "¿Cómo afecta la causación de una factura de proveedor al inventario y al cálculo del IVA?";
    console.log(`\n🔎 Consulta recibida: "${userQuery}"`);

    try {
        // 2. Validación de Seguridad
        console.log("⏳ Verificando protocolos de seguridad...");
        const validation = await domainService.validateQuery(userQuery);
        if (!validation.allowed) {
            console.log(`\n🛡️ Bloqueo de Seguridad: ${validation.message}`);
            return;
        }

        // 3. Ejecución de Búsqueda Semántica y Construcción de Respuesta
        console.log("⏳ Consultando base de datos soberana y estructurando respuesta...");
        
        // El servicio raicesConsole ahora hace todo el trabajo pesado de forma local y rápida
        const respuesta = await raicesConsole.ask(userQuery, corpus);

        console.log("\n============================================================");
        console.log("🌱 RESPUESTA TÉCNICA RAÍCES");
        console.log("============================================================");
        
        console.log(respuesta);
        
        console.log("\n============================================================");
        console.log("✨ SISTEMA LISTO: Información verificada y segura.");

    } catch (error) {
        console.error("❌ Error en la ejecución del asistente:", error.message);
    }
}

test();