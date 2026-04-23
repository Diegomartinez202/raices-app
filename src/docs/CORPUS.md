# CORPUS.md - Gestión del Corpus de Conocimiento RAÍCES

**Versión:** 1.0  
**Responsable:** Equipo de Investigación RAÍCES  
**Principio:** Soberanía de Datos y Veracidad de la Fuente

## 1. Objetivo del Corpus

El corpus es la base de conocimiento "oficial" que usa el RAG de RAÍCES. Su objetivo es que el SLM responda exclusivamente con información verificada de fuentes primarias, evitando alucinaciones y garantizando la idoneidad de la orientación a las víctimas.

**Regla de Oro:** Si no está en el corpus, RAÍCES no lo responde. Debe decir: "No tengo información verificada sobre eso en mi base de conocimiento".

## 2. Fuentes Primarias Autorizadas para M10

Solo se indexan documentos de las siguientes fuentes, en orden de jerarquía:

| **Prioridad** | **Fuente** | **Tipo de Documentos** | **Ubicación** |
| --- | --- | --- | --- |
| **P1** | **Jurisdicción Especial para la Paz** | Autos de Sala de Reconocimiento, Resoluciones SRVR, Manuales de Acreditación | https://www.jep.gov.co/ |
| **P2** | **Unidad para las Víctimas (UARIV)** | Protocolos de atención, Rutas de reparación, Decretos Ley 1448 | https://www.unidadvictimas.gov.co/ |
| **P3** | **Corte Constitucional** | Sentencias C- sobre Ley 1448 y JEP | https://www.corteconstitucional.gov.co/ |
| **P4** | **UNAD - ECJP** | Documentos de grupos de investigación sobre paz territorial, validados por VIACI | Repositorio Interno |
| **P5** | **Organismos Internacionales** | Informes ONU, CIDH sobre estándares de reparación | Sitios oficiales |

**Prohibido indexar:** Notas de prensa, blogs, redes sociales, opiniones personales, PDFs sin fuente clara.

## 3. Proceso de Curaduría y Construcción del Corpus

Este proceso es semi-manual para garantizar la calidad. No se usa scraping masivo.

**Paso 1: Selección y Descarga**
1. El equipo jurídico selecciona 50-100 documentos PDF prioritarios para el MVP.
2. Se descargan y se almacenan en `/docs/fuentes_raw/` con nombre: `FUENTE_ANO_TITULO_CORTO.pdf`.
   Ej: `JEP_2018_Auto_004_Acreditacion.pdf`

**Paso 2: Extracción y Limpieza de Texto**
```bash
# Usar script para extraer texto plano y limpiar encabezados/pies de página
pnpm run corpus:extract
El script genera archivos `.txt` limpios en `/docs/fuentes_txt/`.

*Paso 3: Chunking y Metadata*
Cada `.txt` se divide en chunks de 500 tokens con solapamiento de 50. A cada chunk se le añade metadata:
{
  "id": "JEP_2018_Auto_004_chunk_12",
  "texto": "Para acreditarse como víctima indirecta, el familiar deberá demostrar...",
  "fuente": "Auto 004 de 2018 - Sala de Reconocimiento",
  "url_origen": "https://www.jep.gov.co/...",
  "macrocaso": 10,
  "tema": "acreditacion_jep",
  "fecha_documento": "2018-07-10"
}
Todos los chunks se consolidan en `src/assets/corpus/jep_m10_corpus.json`.

*Paso 4: Cifrado y Vectorización*
# 1. Cifra el JSON con clave maestra del proyecto
pnpm run corpus:encrypt

# 2. Genera embeddings y crea el índice FAISS
pnpm run corpus:index
Esto genera los 2 artefactos que van en el APK: `jep_m10_corpus.json.enc` y `faiss_index.bin`.

## 4. Actualización y Versionamiento del Corpus

1. *El corpus es inmutable en la app instalada.* Para actualizarlo, se debe compilar y distribuir una nueva versión del APK. Esto es una decisión de seguridad para evitar actualizaciones por red.
2. *Control de Versiones:* Cada versión del corpus lleva un tag: `corpus-m10-v1.0.0`. El `CHANGELOG_CORPUS.md` documenta qué documentos se añaden o eliminan.
3. *Escalabilidad a otros Macrocasos:* Para crear el corpus del Macrocaso 03, se repite este proceso en una nueva carpeta `/docs/fuentes_raw_m03/` y se compila un APK `raices-m03.apk`. El código no cambia.

## 5. Auditoría de Veracidad

Para que una respuesta sea auditable, el prompt del SLM obliga a citar la fuente.
*Ejemplo de respuesta de RAÍCES:*
> "Para acreditarte como víctima indirecta, necesitas tu cédula y el registro civil que pruebe el parentesco. [Fuente: Auto 004 de 2018 - JEP]"

El `[Fuente: ...]` viene del campo `metadata.fuente` del chunk que el RAG recuperó. Esto permite a la víctima y a cualquier veedor verificar la información en la página oficial de la JEP.

## 6. Consideraciones de Peso y Rendimiento

1. *Tamaño Corpus MVP:* 50 PDFs ≈ 15MB de texto ≈ 40MB de índice FAISS.
2. *Tamaño Modelo:* Gemma 2B Q4_K_M ≈ 1.4GB.
3. *Tamaño APK Total:* ∼1.5GB. Es grande, pero se justifica por ser 100% offline. La instalación se hace por APK directo o tiendas, no por descarga móvil.
4. *RAM en uso:* ∼2.5GB durante la inferencia. Requisito mínimo del dispositivo: 3GB RAM.

---
