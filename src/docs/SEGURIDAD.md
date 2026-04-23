# SEGURIDAD.md - Protocolo de Seguridad y Privacidad RAÍCES

**Versión:** 1.0  
**Fecha:** Abril 2026  
**Clasificación:** Público - Auditable  
**Marco Legal:** Ley 1581 de 2012, Ley 1712 de 2014, Resolución 8430 de 1993

## 1. Modelo de Amenaza

RAÍCES está diseñado para operar en un entorno de alto riesgo para la población víctima del conflicto armado. Se asumen los siguientes vectores de amenaza:

| **Amenaza** | **Actor** | **Impacto si se materializa** | **Mitigación en RAÍCES** |
| --- | --- | --- | --- |
| **T1. Incautación física del dispositivo** | Actor armado, familiar agresor, autoridad sin orden | Revictimización, identificación, riesgo a la vida | **Botón de Pánico:** Borrado criptográfico <2s. Sin huella digital. |
| **T2. Coerción para revelar información** | Actor armado, redes de control territorial | Entrega de datos de otras víctimas, pérdida de confianza | **Anonimato por diseño:** La app no conoce el nombre. No hay nada que entregar. |
| **T3. Interceptación de red** | Vigilancia masiva, redes WiFi públicas | Fuga de consultas sobre JEP, rutas, derechos | **100% Offline:** 0 paquetes de red. Verificable por auditoría de tráfico. |
| **T4. Análisis forense post-incautación** | Laboratorios de informática forense | Recuperación de BD borrada, logs, caché | **Borrado Seguro:** Sobrescritura con `/dev/urandom` 3 pasadas + eliminación de claves de Keystore. |
| **T5. Ingeniería social a la víctima** | Suplantación de funcionario, familiar | Instalación de app falsa, entrega de PIN | **Integridad:** APK firmada. PIN no recupera datos, solo descifra. Sin PIN, datos son inútiles. |

## 2. Principios de Seguridad Implementados

1. **Minimización de Datos (Ley 1581 Art. 4):** Solo se captura un `UUIDv4` generado aleatoriamente. No se solicita ni almacena nombre, cédula, ubicación, IP, IMEI o correo.
2. **Cifrado en Reposo:** La base de datos `raices.db` usa `SQLCipher` con `AES-256-CBC`. La clave se deriva del PIN del usuario con `PBKDF2-HMAC-SHA256` y 100,000 iteraciones. Sin el PIN, la BD es computacionalmente indescifrable.
3. **Cifrado en Tránsito:** No aplica. La arquitectura es `air-gapped`. No existe tránsito de datos.
4. **Derecho a la Supresión / Derecho al Olvido:** Materializado en el "Botón de Pánico". Es una supresión total, inmediata e irreversible por parte del titular del dato.
5. **Separación de Responsabilidades:** El equipo de investigación no tiene acceso a los dispositivos. La víctima tiene control total del ciclo de vida de sus datos.

## 3. Especificación Técnica del Botón de Pánico

**Objetivo:** Garantizar la no maleficencia. Permitir a la víctima destruir toda evidencia digital de uso de la app en una situación de riesgo inminente.

**Activación:** `Configuración > Salida Segura` + 3 toques consecutivos sobre el logo RAÍCES. No pide confirmación para priorizar velocidad.

**Pseudocódigo `secure-wipe.service.ts`:**
```typescript
import { Capacitor } from '@capacitor/core';
import { SecureStorage } from '@capacitor/secure-storage-plugin';
import { Filesystem, Directory } from '@capacitor/filesystem';

const DB_PATH = 'raices.db';
const MODEL_DIR = 'llm';
const CACHE_DIR = 'cache';

export async function activatePanicMode() {
  // La velocidad es crítica. No usar await en secuencia si es posible.
  // Ejecutar operaciones destructivas en paralelo.
  
  const wipePromises = [];

  try {
    // 1. Borrado Seguro de Base de Datos - Anti-Forense
    // Sobrescribe el archivo con datos aleatorios 3 veces antes de borrar.
    wipePromises.push(SecureFilesystem.wipeFile(DB_PATH, { passes: 3 }));

    // 2. Eliminación de Clave de Cifrado del Keystore
    // Sin esta clave, aunque se recupere la BD, es inútil.
    wipePromises.push(SecureStorage.clear()); 

    // 3. Borrado de Caché, Modelos y Vectores RAG
    wipePromises.push(Filesystem.rmdir({ path: MODEL_DIR, directory: Directory.Data, recursive: true }));
    wipePromises.push(Filesystem.rmdir({ path: CACHE_DIR, directory: Directory.Cache, recursive: true }));

    // 4. Limpiar SharedPreferences / UserDefaults
    wipePromises.push(Capacitor.clearAllPreferences());

    await Promise.all(wipePromises);

  } catch (error) {
    // Si algo falla, no notificar al usuario. El tiempo es vital.
    console.error("Panic mode error, but proceeding to exit.", error);
  } finally {
    // 5. Cierre forzado de la aplicación
    // En Android, esto mata el proceso. En iOS, la envía a background.
    App.exitApp(); 
  }
}
## 4. Consideraciones Éticas - Resolución 8430 de 1993

Bajo los criterios del Art. 11, la investigación con RAÍCES se clasifica como *Investigación con Riesgo Mínimo*, pues:
1. No se realizan intervenciones que modifiquen variables biológicas o psicológicas.
2. El único registro es de metadatos de uso, anonimizados y agregados.
3. El mecanismo de botón de pánico mitiga el riesgo psicosocial de la portabilidad de información sensible.
4. Se implementa proceso de consentimiento informado digital, explicando el PIN, el cifrado y el botón de pánico antes del primer uso.

## 5. Auditoría y Verificación

Cualquier ente de control (MINTIC, Comité de Ética UNAD, JEP) puede verificar:
1. *Ausencia de tráfico de red:* Mediante análisis de `pcap` con la app en uso. Resultado esperado: 0 paquetes.
2. *Eficacia del botón de pánico:* Instalando la app, usándola, activando el pánico y sometiendo el dispositivo a análisis con `Autopsy` o `Cellebrite`. Resultado esperado: 0 artefactos recuperables.
3. *Código Abierto:* Todo el código de `/src/core/crypto` es auditable en el repositorio.