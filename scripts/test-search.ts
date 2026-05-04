// @ts-nocheck
import { raicesConsole } from '../src/services/raicesConsole';
import { domainService } from '../src/core/ai/domain.service';
import * as fs from 'fs';
import * as path from 'path';

async function test() {
    console.log("\n--- 🌱 MODO RAÍCES: Buscador Semántico con Filtro de Seguridad ---");

    // 1. Carga de datos (Manteniendo tu estructura de rutas)
    const embeddingsPath = path.resolve('src/assets/corpus/embeddings.json');
    if (!fs.existsSync(embeddingsPath)) {
        console.error("❌ No encontré el archivo embeddings.json en la ruta especificada.");
        return;
    }
    
    const data = JSON.parse(fs.readFileSync(embeddingsPath, 'utf-8'));
    // Soporte para ambos formatos de corpus (directo o anidado en .embeddings)
    const corpus = data.embeddings || data;

    const userQuery = "¿Cuáles son mis derechos de reparación integral como víctima en el exterior según la ley?";
    console.log(`\n🔎 Usuario pregunta: "${userQuery}"`);

    try {
        // 2. Validación de Seguridad (Capa de Protección)
        console.log("⏳ Validando política de seguridad...");
        const validation = await domainService.validateQuery(userQuery);
        if (!validation.allowed) {
            console.log(`\n🛡️ RAÍCES Seguridad: ${validation.message}`);
            return;
        }

        console.log("⏳ Inicializando motor MiniLM...");
        
        // 3. LLAMADA AL SERVICIO EXPERTO
        // Aquí es donde ocurre la magia: usamos el método .ask() que ya tiene
        // los verbos de acción, la limpieza y la estructura de liderazgo.
        const respuestaFormateada = await raicesConsole.ask(userQuery, corpus);

        console.log("\n============================================================");
        console.log("🌱 RESPUESTA DE TU ACOMPAÑANTE RAÍCES");
        console.log("============================================================");
        
        console.log(respuestaFormateada);
        
        console.log("\n============================================================");
        console.log("✨ RECUERDA: Este camino no lo recorres solo/a.");

    } catch (error) {
        console.error("❌ Error en el proceso de ejecución del experto:", error);
    }
}

test();