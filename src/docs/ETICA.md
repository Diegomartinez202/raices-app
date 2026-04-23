# ETICA.md - Lineamientos Éticos y Protocolo de Investigación RAÍCES

**Versión:** 1.0  
**Fecha:** Abril 2026  
**Marco Normativo:** Resolución 8430 de 1993, Ley 1581 de 2012, Ley 1448 de 2011, Principios de Helsinki  
**Población:** Víctimas indirectas del conflicto armado - Macrocaso 10 JEP  
**Clasificación de Riesgo:** Riesgo Mínimo - Art. 11, Lit. b, Res. 8430/1993

## 1. Principios Éticos Rectores

El desarrollo y pilotaje de RAÍCES se rige por el principio de **Acción sin Daño / No Maleficencia**. Se prioriza la protección de la dignidad, integridad y seguridad de la víctima sobre los objetivos de la investigación.

| **Principio** | **Implementación en RAÍCES** | **Verificable en** |
| --- | --- | --- |
| **Autonomía** | Consentimiento informado digital. Usuario controla sus datos con botón de pánico. | `Onboarding/PinSetup.tsx`, `SEGURIDAD.md` |
| **Beneficencia** | Acceso a información sobre derechos, rutas JEP y RUV sin barreras geográficas. | `ARQUITECTURA.md` - Módulo RAG |
| **No Maleficencia** | Arquitectura 100% offline. Cero exposición a vigilancia. Diseño trauma-informado. | `SEGURIDAD.md` - Modelo de Amenaza |
| **Justicia** | Acceso gratuito. Funciona en celulares gama baja. No requiere plan de datos. | `README.md` - Requisitos No Funcionales |

## 2. Justificación de Riesgo Mínimo

Conforme al Art. 11 de la Resolución 8430 de 1993, esta investigación se clasifica como **Riesgo Mínimo** porque:

1. **No hay intervención biomédica:** No se administran fármacos, no se toman muestras biológicas, no hay procedimientos invasivos.
2. **No hay intervención psicológica que manipule conducta:** La app es informativa. No aplica terapias, no diagnostica, no induce estados emocionales. El lenguaje es de acompañamiento, no de intervención.
3. **Los registros son anónimos:** No se recolectan datos personales identificables. El `seudónimo UUIDv4` no es invertible. Los hashes `SHA-256` de interacciones no permiten reconstruir el texto original.
4. **Riesgo principal mitigado:** El único riesgo es la pérdida de confidencialidad por incautación del dispositivo. Este riesgo se mitiga con el Botón de Pánico de borrado criptográfico, documentado en `SEGURIDAD.md`.

## 3. Protocolo de Consentimiento Informado Digital

Antes del primer uso, la app presenta un flujo obligatorio de 3 pantallas. El usuario no puede usar el chat sin aceptar.

**Pantalla 1: ¿Qué es RAÍCES?**
> "Hola. Soy RAÍCES, una herramienta para ayudarte a encontrar información sobre tus derechos como víctima. No soy un abogado ni un psicólogo. No guardo tu nombre ni tu historia. Todo funciona sin internet, solo en tu celular."

**Pantalla 2: Tu Privacidad y Seguridad**
> "Para protegerte: 1. No te pediré tu nombre o cédula. 2. Tu información se guarda con un candado (PIN) que solo tú conoces. 3. Si te sientes en peligro, puedes borrar todo al instante con el botón 'Salida Segura'. ¿Entiendes que RAÍCES es un espacio privado y que tú tienes el control?"

**Pantalla 3: Tu Decisión**
> "Al crear tu PIN y continuar, aceptas usar RAÍCES bajo estas condiciones. Puedes borrar la app y tus datos cuando quieras. Si en algún momento sientes malestar, te recomendamos buscar apoyo psicosocial en tu territorio."
> 
> [Botón: Entiendo y Acepto] [Botón: No Acepto y Salir]

## 4. Tratamiento de Datos Personales - Ley 1581 de 2012

1. **Dato Personal Recolectado:** Ninguno. El `seudónimo UUID` no es un dato personal según la definición del Art. 3, Lit. c, pues no permite la identificación de una persona natural.
2. **Dato Sensible:** No se solicita ni almacena información sobre origen racial, orientación política, creencias religiosas o estado de salud.
3. **Finalidad del Tratamiento:** Los `hashes` de interacción se usan exclusivamente para generar estadísticas agregadas de uso (Ej: "el 80% de consultas fueron sobre acreditación JEP"). Estas estadísticas son el insumo para el informe de impacto de la tesis Misión 5 Paz.
4. **Encargado y Responsable:** El Investigador Principal, Diego Armando Martínez Cano, es el responsable. No hay encargados terceros. Los datos no salen del dispositivo del titular.
5. **Derechos del Titular:** Los derechos de acceso, actualización, rectificación y supresión se garantizan mediante el Botón de Pánico, que ejecuta una supresión total e inmediata.

## 5. Protocolo de Acción en Caso de Crisis Emocional

RAÍCES es una herramienta informativa, no de atención en crisis. Si el SLM detecta palabras clave de ideación suicida, autolesión o crisis aguda, el protocolo es:

1. **No diagnosticar ni intervenir.**
2. **Responder con mensaje de contención predefinido:**
   > "Lamento mucho que estés pasando por esto. Tu vida es muy valiosa. En este momento no puedo darte el apoyo humano que necesitas. Por favor, comunícate ahora mismo con la Línea 106 o la Línea Púrpura 155. Ellos sí pueden escucharte y ayudarte. No estás sola, no estás solo."
3. **Bloquear la conversación** por 24 horas y sugerir cerrar la app.

Este protocolo fue diseñado con asesoría psicosocial para evitar iatrogenia.

## 6. Avales Requeridos

Para el pilotaje de este proyecto se requiere:
1. **Aval del Comité de Ética en Investigación de la ECJP-UNAD.**
2. **Concepto de la VIACI Zona Amazonía Orinoquía** sobre el componente de innovación.
3. **Consentimiento de la comunidad:** Socialización con mesas de víctimas del Meta antes del despliegue.
---
