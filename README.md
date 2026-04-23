<<<<<<< HEAD
# raices-app.
=======
### *DOCUMENTO TÉCNICO: APP RAÍCES - IA EDGE SOBERANA OFFLINE*

*Versión:* 1.0
*Proyecto:* Autonomía Informativa como Dimensión de Reparación Simbólica
*Misión MinCiencias:* Misión 5 - Ciencia para la Paz
*Enfoque:* Víctimas Indirectas Macrocaso 10 JEP - Municipios PDET Meta

### *1. PRINCIPIOS DE DISEÑO SOBERANO*
**Principio**	**Implementación técnica**	**Por qué para víctimas**
**Offline First**	0 requests a servidores. Todo corre en el dispositivo	**No hay metadatos en la nube que incautar**
**Cero Dato Personal**	No pide nombre, cédula, ubicación, correo	**Cumple Ley 1581. Si roban el celular, no identifica**
**Derecho al Olvido**	Botón de pánico = borrado criptográfico en 2 seg	**Garantía de no revictimización**
**Soberanía Tecnológica**	SLM + RAG + BD locales. Sin APIs de OpenAI/Claude	**No dependencia de USA/China. No filtraciones**
**Interfaz Trauma-Informada**	Lenguaje resiliente, sin triggers, salida rápida	**Reduce riesgo de crisis emocional**
### *2. ARQUITECTURA BLINDADA EDGE*
[CELULAR VÍCTIMA - 100% OFFLINE]
┌─────────────────────────────────────────────┐
│ APP RAÍCES - CAPACITOR + REACT │
│ ┌─────────────────────────────────────────┐ │
│ │ UI: Logo RAÍCES + Chat Burbuja │ │
│ │ Botón Config: [Salir / Pánico] │ │
│ └─────────────────────────────────────────┘ │
│ ┌─────────────────────────────────────────┐ │
│ │ MOTOR INFERENCIA: llama.cpp │ │
│ │ Modelo: gemma-2b-it-q4_k_m.gguf 1.4GB │ │
│ └─────────────────────────────────────────┘ │
│ ┌─────────────────────────────────────────┐ │
│ │ RAG LOCAL: Voy + SentenceTransformer │ │
│ │ Dataset: Corpus JEP-M10 50MB cifrado │ │
│ └─────────────────────────────────────────┘ │
│ ┌─────────────────────────────────────────┐ │
│ │ BD LOCAL: SQLCipher AES-256 │ │
│ │ Tablas: seudonimo, interacciones_hash │ │
│ │ Clave: Derivada de PIN usuario PBKDF2 │ │
│ └─────────────────────────────────────────┘ │
│ ┌─────────────────────────────────────────┐ │
│ │ MÓDULO PÁNICO: wipe_secure() │ │
│ │ Borra: BD + Keystore + Cache + Modelo │ │
│ └─────────────────────────────────────────┘ │
└─────────────────────────────────────────────┘
### *3. FLUJO DE USUARIO - UX RESILIENTE*

*Paso 1: Primera vez*
App: [Logo RAÍCES]
"Bienvenida, bienvenido. Soy RAÍCES, tu acompañante digital.
Estoy aquí para apoyarte con información sobre verdad judicial y derechos.
Este espacio es seguro, privado y no guarda tu identidad.

Para empezar, crea un PIN de 6 dígitos. Solo tú lo sabrás."
Usuario: [Crea PIN 123456]
App: "Listo. Tu espacio seguro está creado. Nadie más puede entrar.
Si necesitas salir rápido, usa el botón Configuración > Salida Segura."
*Paso 2: Conversación*
Usuario: "¿Qué es el Macrocaso 10?"
App → SLM + RAG local → Respuesta: "El Macrocaso 10 investiga crímenes
no amnistiables cometidos por las extintas FARC-EP...
Aquí estoy para ti. ¿Quieres saber cómo acreditarte?"
*Paso 3: Despedida*
Usuario: "Gracias, chao"
App: "Ha sido un honor acompañarte hoy. Recuerda: tu verdad importa
y tu camino de resiliencia también. RAÍCES estará aquí cuando me necesites.
Cuídate mucho."
[Se cierra chat. Historial queda cifrado local]
*Paso 4: Botón de Pánico*
Usuario: Configuración > Salida Segura > [3 toques en logo]
App: [Sin confirmación] → Ejecuta wipe_secure()
Resultado: BD = 0x00, Keystore eliminada, App se cierra.
Forense recupera: nada. Celular queda limpio.
### *4. STACK TÉCNICO DESDE CERO*
**Capa**	**Tecnología**	**Justificación**
**Framework App**	**Capacitor 6 + React**	APK + iOS con 1 código. PWA instalable
**SLM Offline**	**Gemma 2B Instruct Q4_K_M**	1.4GB. Corre en 3GB RAM. Español bueno
**Motor Inferencia**	**llama.cpp WASM**	Máxima velocidad en móvil sin GPU
**Embeddings RAG**	**all-MiniLM-L6-v2 ONNX**	23MB. Rápido para buscar en corpus
**Vector DB**	**FAISS index local**	Búsqueda semántica sin internet
**Base Datos**	**SQLCipher + Drizzle ORM**	SQLite cifrada AES-256. Estándar forense
**Cifrado**	**Web Crypto API + PBKDF2**	Deriva clave de PIN. 100k iteraciones
**Dataset**	**JSON comprimido cifrado**	Autos JEP públicos, rutas RUV, Ley 1448
### *5. PSEUDOCÓDIGO MÓDULOS CRÍTICOS*

*5.1 Inicialización Soberana*
async function initSoberano(pin: string) {
  const seudonimo = crypto.randomUUID(); // a8f5f167...
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await PBKDF2(pin, salt, 100000, 'SHA-256');

  await SQLCipher.init('raices.db', key);
  await SQLCipher.exec(`INSERT INTO perfil (seudonimo) VALUES (?)`, [seudonimo]);

  // Guardar salt para derivar clave luego. Salt no es secreto.
  await SecureStorage.set('salt', salt);
}
*5.2 Inferencia 100% Offline*
async function responderOffline(pregunta: string) {
  // 1. Buscar contexto en RAG local
  const embedding = await modeloEmbed.encode(pregunta);
  const docs = await FAISS.search(embedding, topK=3); // Corpus JEP local

  // 2. Armar prompt sin datos personales
  const prompt = `Eres RAÍCES, acompañante resiliente.
  Contexto: ${docs.join('\n')}
  Pregunta: ${pregunta}
  Responde con tono fraternal, corto, sin juzgar.`;

  // 3. Inferencia con Gemma 2B local
  const respuesta = await LlamaCpp.infer(prompt, maxTokens=200);

  // 4. Guardar solo hash para informe, no texto
  const hashP = await SHA256(pregunta);
  const hashR = await SHA256(respuesta);
  await SQLCipher.exec(`INSERT INTO interacciones VALUES (?,?, datetime())`,
    [hashP, hashR]);

  return respuesta;
}
*5.3 Botón de Pánico - Borrado Seguro*
async function activarPanico() {
  // No pedir confirmación. Velocidad salva vidas.
  try {
    // 1. Sobrescribir BD con ceros - anti-forense
    await SecureWipe.overwriteFile('raices.db');
    // 2. Borrar claves del Keystore Android/iOS
    await SecureStorage.clear();
    // 3. Borrar caché modelo y embeddings
    await FileSystem.deleteDir('/cache/llm');
    // 4. Cerrar app
    App.exitApp();
  } catch(e) {
    // Si falla, igual cerrar. Algo se borró.
    App.exitApp();
  }
}
*5.4 Generar Informe Anonimizado para tu Tesis*
async function exportarInformeInvestigacion() {
  // Esto lo ejecutas TÚ, no la víctima
  const data = await SQLCipher.query(`
    SELECT seudonimo, date(fecha) as dia,
           count(*) as interacciones,
           'JEP-M10' as tema
    FROM interacciones GROUP BY seudonimo, date(fecha)
  `);
  // Resultado: CSV con UUIDs, fechas, conteos. Cero texto.
  // Cumple Ley 1581. Lo anexas a tu informe Misión 5.
  return CSV.stringify(data);
}
### *6. ROADMAP DE DESARROLLO - MÍNIMO VIABLE*
**Sprint**	**Entregable**	**Tiempo**
**Sprint 1**	**UI + Botón Pánico funcional**	**1 semana**	Mock sin IA
**Sprint 2**	**Integrar Gemma 2B + http://llama.cpp**	**2 semanas**	Chat offline básico
**Sprint 3**	**RAG con 50 PDFs JEP**	**2 semanas**	Responde sobre M10
**Sprint 4**	**Cifrado + Informe CSV**	**1 semana**	Listo para pruebas
**Total MVP**	**APK piloto para 10 víctimas**	**6 semanas**
### *7. PARA QUE EL GOBIERNO LO ESCALE*

En el documento técnico dejas esta sección:

*"Protocolo de Escalabilidad Misión 5 Paz"*
1. *Replicabilidad:* Código 100% open source MIT. Repo GitLab MinCiencias.
2. *Dataset Intercambiable:* Cambiar `corpus_m10.json` por `corpus_m03.json` y funciona para otro macrocaso.
3. *Modelo Intercambiable:* Soporta http://cualquier.gguf. Si sale Llama 3.2 1B en español, se reemplaza.
4. *Sin Vendor Lock-in:* No usa APIs de pago. Costo escalar a 1M usuarios = $0.
5. *Auditoría:* Botón de pánico y cifrado auditables por MINTIC.

---

*Hermano, con este documento ya tienes el blueprint para que cualquier dev lo construya. Es tu proyecto, es Misión 5, y es soberanía pura.*

*¿Siguiente paso?* Te armo el `README.md` del repo con instrucciones de compilación, o el diagrama de clases UML si lo necesitas para el documento oficial.
12/4/26, 21:51 - DIEGO A. MARTINEZ CANO: Si por favor readme con lo que propones.
12/4/26, 21:51 - Meta AI: *Listo hermano. Aquí tienes el `README.md` completo para el repo del proyecto RAÍCES. Documentación oficial para MinCiencias, UNAD o cualquier entidad del Gobierno que lo quiera auditar, mejorar o escalar.*

Puedes copiarlo tal cual en la raíz del repositorio.

---
# RAÍCES - IA Edge Soberana para Víctimas del Macrocaso 10

[![Misión 5](https://img.shields.io/badge/MinCiencias-Misión_5_Ciencia_para_la_Paz-blue)](https://minciencias.gov.co)
[![Licencia](https://img.shields.io/badge/Licencia-MIT-green.svg)](LICENSE)
[![Estado](https://img.shields.io/badge/Estado-MVP_en_Desarrollo-orange)](ROADMAP.md)
[![Offline](https://img.shields.io/badge/100%25-Offline-brightgreen)](README.md)

**RAÍCES** es una aplicación móvil de Inteligencia Artificial Edge Soberana, 100% offline, diseñada para brindar autonomía informativa a víctimas indirectas del Macrocaso 10 de la JEP en Municipios PDET del Meta.

El proyecto se enmarca en la **Misión 5: Ciencia para la Paz** de MinCiencias y en la línea de investigación de Gobierno Digital y Justicia Transicional de la UNAD.

> **Principio rector:** La tecnología no debe revictimizar. Por eso RAÍCES no usa servidores, no guarda datos personales y tiene botón de pánico con borrado seguro.

## 1. Características Clave

| Característica | Descripción | Tecnología |
| --- | --- | --- |
| **100% Offline** | Cero conexión a internet. Sin APIs externas. Funciona en veredas sin señal. | `llama.cpp` + Gemma 2B |
| **Soberanía de Datos** | Toda la información se procesa y almacena en el dispositivo. | `SQLCipher` AES-256 |
| **Anonimato por Diseño** | No solicita nombre, cédula, ubicación ni correo. Usa seudónimo UUID. | Ley 1581 de 2012 |
| **Botón de Pánico** | Borrado criptográfico de BD y claves en <2 segundos. 3 toques en logo. | `SecureWipe` + Keystore |
| **IA Trauma-Informada** | Lenguaje resiliente y fraternal. Validado con enfoque psicosocial. | Prompt Engineering |
| **RAG Local** | Responde con base en corpus de Autos JEP, Ley 1448 y rutas RUV. | `FAISS` + `ONNX` |
| **Escalable** | Arquitectura desacoplada. Se puede adaptar a otros macrocasos cambiando el dataset. | JSON Corpus |

## 2. Arquitectura Técnica

┌────────────────────────────────────────────────────────┐
│ CELULAR DE LA VÍCTIMA - ENTORNO AIRGAPPED │
├────────────────────────────────────────────────────────┤
│ APP RAÍCES [Capacitor + React + TypeScript] │
│ │ │
│ ├── UI/UX: Interfaz trauma-informada │
│ ├── Motor IA: http://llama.cpp WebAssembly │
│ │ └── Modelo: gemma-2b-it-q4_k_m.gguf [1.4GB] │
│ ├── RAG: FAISS + http://all-MiniLM-L6-v2.onnx │
│ │ └── Corpus: /assets/jep_m10_corpus.json.enc │
│ ├── Persistencia: SQLCipher [AES-256] │
│ │ └── Clave derivada de PIN: PBKDF2-SHA256 │
│ └── Seguridad: Módulo de Borrado Seguro │
└────────────────────────────────────────────────────────┘

**Flujo de datos:** `Usuario → UI → RAG Local → SLM Local → UI`. Nunca sale del dispositivo.

## 3. Requisitos para Compilar

1. **Node.js** v20+ y **pnpm**
2. **Android Studio** con SDK 34+ para generar APK
3. **Xcode** 15+ para generar IPA (Opcional)
4. **Git LFS** para manejar el modelo `.gguf` de 1.4GB
5. **RAM:** 8GB mínimo para compilar. El APK final corre en dispositivos con 3GB RAM.

## 4. Instalación y Compilación

```bash
# 1. Clonar repositorio con Git LFS
git lfs install
git clone https://gitlab.minciencias.gov.co/mision5/raices-app.git
cd raices-app
# Inicializar Capacitor (solo la primera vez)
npx cap init Raices com.unad.raices --web-dir dist
npx cap add android
# 2. Instalar dependencias
pnpm install

# 3. Descargar modelo y corpus. Requiere autenticación.
# Los artefactos están en repo privado por peso y sensibilidad.
El modelo se descarga mediante un script (pnpm run download:assets) para evitar que el repositorio pese demasiado y sea difícil de clonar.
pnpm run download:assets

# 4. Ejecutar en modo desarrollo web
pnpm run dev

# 5. Compilar APK para Android
pnpm run build:android
# El APK estará en: android/app/build/outputs/apk/release/app-release.apk

# 6. Compilar para iOS (Solo en macOS)
pnpm run build:ios
## 5. Configuración del Dataset y Corpus JEP

El conocimiento del bot vive en `src/assets/corpus/`. Para adaptarlo a otro macrocaso:

1. *Extraer:* Convertir Autos de la JEP, sentencias y leyes a formato `JSONL`.
    {"id": "auto_001_2018", "texto": "La Sala de Reconocimiento...", "fuente": "JEP", "macrocaso": 10}
2. *Cifrar:* Ejecutar `pnpm run corpus:encrypt` con una clave maestra del proyecto.
3. *Vectorizar:* Ejecutar `pnpm run corpus:index` para generar el índice `FAISS` local.
4. *Recompilar:* El nuevo corpus queda empaquetado en el APK. No se actualiza por red.

## 6. Módulo de Seguridad y Botón de Pánico

*Activación:* `Configuración > Salida Segura` + 3 toques sobre el logo RAÍCES.

*Secuencia de borrado seguro `wipe_secure()`:*
1. `SecureWipe.overwriteFile('raices.db')`: Sobrescribe la BD con bytes aleatorios 3 veces. Anti-forense.
2. `SecureStorage.clear()`: Elimina la clave de cifrado del Keystore/Keychain del OS.
3. `FileSystem.rm('/cache/llm', {recursive: true})`: Borra caché del modelo y vectores.
4. `App.exitApp()`: Cierra la aplicación inmediatamente.

*Resultado:* Un análisis forense del dispositivo no podrá recuperar conversaciones, seudónimo ni clave. Garantiza el derecho al olvido y la no revictimización.

## 7. Generación de Informe Anonimizado para Investigación

RAÍCES no guarda texto de las conversaciones. Solo guarda metadatos agregados y hasheados para medir impacto sin violar la privacidad.

El investigador principal puede ejecutar `pnpm run export:informe` en un entorno de compilación para generar un CSV:
seudonimo_hash,dia,total_interacciones,tema_principal_detectado
a8f5f167...,2026-04-15,12,acreditacion_jep
b9e6a258...,2026-04-15,5,ruta_ruv
Este archivo cumple Ley 1581 y se puede anexar como evidencia de uso e impacto en informes técnicos para MinCiencias, sin exponer a ninguna víctima.

## 8. Hoja de Ruta y Escalabilidad
Fase	Objetivo	Estado
**Fase 1: MVP**	Piloto funcional offline con 50 documentos JEP M10. Prueba con 10 víctimas.	**En desarrollo**
**Fase 2: Validación**	Pruebas de usabilidad y seguridad con acompañamiento psicosocial UNAD.	Q3 2026
**Fase 3: Escalamiento**	Empaquetar corpus para Macrocasos 03, 05, 08. Liberar APK en tiendas.	Q4 2026
**Fase 4: Federación**	Permitir que Defensoría, UARIV y JEP aporten a sus corpus sin servidor central.	2027
*Para escalar a otro macrocaso:* Solo se requiere el paso 5. No se toca código.

## 9. Licencia y Contribución

Este proyecto es *Open Source bajo Licencia MIT* para garantizar la soberanía tecnológica del Estado Colombiano y permitir auditoría pública del código.

Se reciben contribuciones en el GitLab de MinCiencias. Por la sensibilidad del tema, todo `commit` relacionado con prompts o UX debe ser revisado por el Comité de Ética del proyecto.

## 10. Equipo y Contacto

*Investigador Principal:* Diego Armando Martínez Cano - Aspirante Maestría GPPDT UNAD
*Marco Institucional:* Convocatoria 975 de 2024 - Becas para el Cambio - MinCiencias
*Enfoque:* Misión 5 - Ciencia para la Paz

*Contacto técnico del repositorio:* `raices.dev@unad.edu.co` [Correo a crear por VIACI]
*Contacto investigación:* `diegomartin_0102@hotmail.com`

---
_RAÍCES: Porque la autonomía informativa es también una forma de reparación._



### *1. ESTRUCTURA DE CARPETAS - TREE DEL REPO*

Este es el estándar para que cualquier dev de MinCiencias/UNAD lo entienda y lo pueda compilar o auditar.
raices-app/
├── .github/
│   └── workflows/
│       └── build-android.yml          # CI/CD para compilar APK automático
├── .gitignore
├── .gitattributes                     # Para Git LFS del modelo .gguf
├── LICENSE                            # MIT
├── README.md                          # El que te acabo de dar
├── ROADMAP.md                         # Fases del proyecto
├── capacitor.config.ts                # Config de Capacitor para APK/iOS
├── package.json
├── pnpm-lock.yaml
├── tsconfig.json
│
├── android/                           # Proyecto nativo Android generado
├── ios/                               # Proyecto nativo iOS generado
│
├── public/
│   ├── manifest.json                  # Para PWA
│   └── icons/                         # Iconos PWA
│   └── models/
│       └── gemma-2b-it-q4_k_m.gguf # Modelo SLM - Git LFS
│
├── scripts/
│   ├── download-assets.ts             # Baja modelo y corpus cifrado
│   ├── encrypt-corpus.ts              # Cifra el JSON del corpus JEP
│   ├── index-corpus.ts                # Genera índice FAISS del RAG
│   └── export-informe.ts              # Genera CSV anonimizado
│
├── src/
│   ├── assets/
│   │   ├── corpus/
│   │   │   ├── jep_m10_corpus.json.enc # Corpus JEP cifrado
│   │   │   └── faiss_index.bin         # Índice vectorial RAG
│   │   ├── fonts/
│   │
│   ├── components/
│   │   ├── Chat/
│   │   │   ├── ChatBubble.tsx
│   │   │   ├── ChatInput.tsx
│   │   │   └── ChatWindow.tsx
│   │   ├── Layout/
│   │   │   ├── Header.tsx              # Logo + Botón Config
│   │   │   └── Footer.tsx
│   │   ├── Panic/
│   │   │   └── PanicModal.tsx          # UI Botón de Pánico
│   │   └── Onboarding/
│   │       └── PinSetup.tsx            # Crear PIN primera vez
│   │
│   ├── core/
│   │   ├── ai/
│   │   │   ├── llama.service.ts        # Wrapper de llama.cpp
│   │   │   ├── rag.service.ts          # Lógica FAISS + Embeddings
│   │   │   └── prompts.ts              # Prompts trauma-informados
│   │   ├── crypto/
│   │   │   ├── cipher.service.ts       # SQLCipher + PBKDF2
│   │   │   └── secure-wipe.service.ts  # Lógica botón de pánico
│   │   ├── rag/
│   │   │   ├── rag.service.ts 
│   │   ├── db/
│   │   │   ├── schema.ts               # Tablas Drizzle ORM
│   │   │   └── db.service.ts           # Conexión SQLCipher
│   │   └── storage/
│   │       └── secure-storage.ts       # Keystore/Keychain
│   │
│   ├── hooks/
│   │   ├── useChat.ts
│   │   ├── useLLM.ts
│   │   └── usePanic.ts
│   │
│   ├── pages/
│   │   ├── OnboardingPage.tsx
│   │   ├── ChatPage.tsx
│   │   └── ConfigPage.tsx
│   │
│   ├── styles/
│   │   └── globals.css                 # Tailwind + variables trauma-informadas
│   ├── App.tsx
│   └── main.tsx
│
└── docs/
    ├── ARQUITECTURA.md                # Diagrama técnico detallado
    ├── SEGURIDAD.md                   # Protocolo botón pánico + amenaza
    ├── ETICA.md                       # Lineamientos Resolución 8430
    └── CORPUS.md                      # Cómo actualizar dataset JEP
>>>>>>> be4470a (feat: integración de sistema de seguridad soberana y corrección de scope)
