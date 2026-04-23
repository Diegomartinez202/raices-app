### **2. `docs/ARQUITECTURA.md`**

```markdown
# ARQUITECTURA.md - Documento de Arquitectura de Software RAÍCES

**Versión:** 1.0  
**Patrón:** Arquitectura Limpia + Edge Computing  
**Paradigma:** Offline-First, Privacy-by-Design, Soberanía Tecnológica

## 1. Diagrama C4 - Nivel 1: Contexto del Sistema

```mermaid
C4Context
    Person(victima, "Víctima Indirecta M10", "Usa la app en territorio PDET sin conectividad")
    System(raices_app, "App RAÍCES", "Sistema de IA Edge Soberana 100% Offline")
    System_Ext(jep, "Jurisdicción Especial para la Paz", "Fuente de Autos y sentencias públicas")
    System_Ext(unariv, "UARIV / RUV", "Fuente de rutas de atención públicas")
    
    Rel(victima, raices_app, "Consulta derechos y rutas", "Interfaz táctil")
    Rel(raices_app, jep, "N/A", "No hay conexión. Corpus pre-cargado")
    Rel(raices_app, unariv, "N/A", "No hay conexión. Corpus pre-cargado")
    
    UpdateLayoutConfig($c4ShapeInRow="3", $c4BoundaryInRow="1")
*Decisión Arquitectónica Clave 1:* El sistema RAÍCES no tiene dependencias externas en tiempo de ejecución. Todas las fuentes de conocimiento (JEP, UARIV) se integran como artefactos estáticos, cifrados y pre-indexados durante la compilación. Esto garantiza operación soberana.

## 2. Diagrama C4 - Nivel 2: Contenedores
C4Container
    Person(victima, "Víctima Indirecta M10")
    
    Container_Boundary(mobile, "Dispositivo Móvil") {
        Container(app, "Aplicación Móvil", "Capacitor/React/TypeScript", "Orquesta UI, IA y seguridad")
        ContainerDb(db, "Base de Datos Cifrada", "SQLCipher", "Almacena seudónimo y hashes de interacción")
        Container(llm_runtime, "Runtime LLM Local", "llama.cpp WASM", "Ejecuta Gemma 2B en el dispositivo")
        Container(fs, "Sistema de Archivos", "Nativo OS", "Almacena modelo.gguf, corpus.enc, faiss.index")
        Container(keystore, "Almacén de Claves", "Android Keystore / iOS Keychain", "Guarda la clave de cifrado de la BD")
    }
    
    Rel(victima, app, "Usa")
    Rel(app, db, "Lee/Escribe", "SQL")
    Rel(app, llm_runtime, "Infiere", "Prompt")
    Rel(app, fs, "Carga", "Modelo y Corpus")
    Rel(app, keystore, "Deriva Clave", "Desde PIN")
    Rel(db, keystore, "Se cifra con", "Clave AES-256")
## 3. Flujo de Datos - Consulta de Usuario

Secuencia de una pregunta desde que el usuario la escribe hasta que ve la respuesta.

1. *UI Layer `ChatInput.tsx`:* Usuario escribe "¿Cómo me acredito en la JEP?". El texto existe en memoria RAM.
2. *Core Layer `rag.service.ts`:* 
   a. Se genera `embedding` de la pregunta con `all-MiniLM-L6-v2.onnx`. Esto ocurre 100% local.  
   b. Se busca en `faiss_index.bin` los 3 chunks de texto más similares del `jep_m10_corpus.json.enc`.
3. *Core Layer `llama.service.ts`:*
   a. Se construye `prompt` con plantilla trauma-informada: `[ROL] + [CONTEXTO RAG] + [PREGUNTA] + [REGLA DE TONO]`.  
   b. `llama.cpp` carga `gemma-2b-it-q4_k_m.gguf` en RAM y ejecuta inferencia. No hay acceso a red.
4. *Core Layer `db.service.ts`:*
   a. Se calcula `SHA256(pregunta)` y `SHA256(respuesta)`.  
   b. Se ejecuta `INSERT INTO interacciones (pregunta_hash, respuesta_hash, fecha)`. El texto plano nunca se guarda en disco.
5. *UI Layer `ChatBubble.tsx`:* Se renderiza la respuesta. El string de la respuesta se libera de la memoria tras el render.

*Principio de Seguridad:* El dato sensible (texto de pregunta/respuesta) solo existe en memoria volátil durante ∼2 segundos. En disco solo persiste el hash, que es irreversible.

## 4. Modelo de Datos - `schema.ts`
// Drizzle ORM Schema - SQLCipher
import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

export const perfil = sqliteTable('perfil', {
  seudonimo: text('seudonimo').primaryKey(), // UUIDv4
  fecha_creacion: integer('fecha_creacion', { mode: 'timestamp' }).notNull(),
  pin_hash_verificacion: text('pin_hash_verificacion').notNull() // Hash del PIN para validar login, no para descifrar
});

export const interacciones = sqliteTable('interacciones', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  pregunta_hash: text('pregunta_hash').notNull(), // SHA-256
  respuesta_hash: text('respuesta_hash').notNull(), // SHA-256
  fecha: integer('fecha', { mode: 'timestamp' }).notNull(),
  tema_inferido: text('tema_inferido') // Ej: 'jep', 'ruv', 'salud_mental'. Sin texto.
});
*Nota de Anonimización:* Es computacionalmente inviable obtener la pregunta original desde `pregunta_hash`. Esto permite generar estadísticas de uso `COUNT(*)` y `GROUP BY tema_inferido` para el informe de investigación, cumpliendo la Ley 1581.

## 5. Decisiones de Tecnología y Justificación
**Componente**	**Alternativas Descartadas**	**Decisión Tomada**	**Justificación**
**Framework**	Flutter, React Native	**Capacitor**	Mayor control sobre plugins nativos para `SecureWipe` y `Keystore`. Curva baja para devs web.
**SLM**	Llama 3 8B, Phi-3 Medium	**Gemma 2B Q4_K_M**	Mejor balance tamaño/performance en español. Corre en 3GB RAM. <2s por respuesta.
**Vector DB**	ChromaDB, LanceDB	**FAISS**	Librería C++ madura, 0 dependencias, máxima velocidad en móvil para índices <100MB.
**Base de Datos**	Realm, WatermelonDB	**SQLCipher**	Estándar de facto en forense. Auditorías de MINTIC lo reconocen. Cifrado a nivel de archivo.
## 6. Requisitos No Funcionales

1. *Performance:* Tiempo de primera respuesta < 3 segundos en dispositivo gama media (Snapdragon 680, 4GB RAM).
2. *Portabilidad:* APK compatible con Android 9.0+ (API 28). Cobertura del 95% de dispositivos en territorios PDET.
3. *Mantenibilidad:* El corpus JEP es intercambiable sin recompilar código, solo assets. Permite escalar a Macrocaso 03, 05, etc.
4. *Usabilidad:* Tamaño de fuente mínimo 16px. Contraste WCAG AA. Flujo de "Salida Segura" en máximo 2 toques.

---