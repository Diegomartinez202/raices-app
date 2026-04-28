/**
 * RAÍCES - Servicio de Sesión Segura
 * Auto-bloqueo por inactividad + PIN/Biometría
 * Trauma-informado: protege sin juzgar ni pedir datos personales
 */

import { App } from '@capacitor/app'
import { SecureStoragePlugin as SecureStorage } from 'capacitor-secure-storage-plugin'
import { NativeBiometric } from 'capacitor-native-biometric'
import { sha256 } from 'js-sha256'
import { getAppConfig, getSecureKeys, logger } from '@/core/config/config.service'
import { unloadLlama } from '@/core/ai/llama.service'
import { unloadRAG } from '@/core/rag/rag.service'
import { unloadVoy } from '@/core/rag/voy.service'
import { unloadTokenizer } from '@/core/rag/tokenizer.service'
import { closeDB } from '@/core/db/sqlite.service'
import { logEvent } from '@/core/audit/audit.service';
type SessionState = 'unlocked' | 'expired' | 'locked' // Añade 'locked'
let sessionState: SessionState = 'locked';
let lastActivityTime: number = Date.now();
let inactivityTimer: ReturnType<typeof setTimeout> | null = null;
let sessionCallbacks: ((state: SessionState) => void)[] = []

const APP = getAppConfig()
const KEYS = getSecureKeys()

// ================================================================
// GESTIÓN DE PIN
// ================================================================

/**
 * Verifica si ya existe un PIN configurado
 */
export async function hasPIN(): Promise<boolean> {
  try {
    const pin = await SecureStorage.get({ key: KEYS.APP_PIN })
    return !!pin.value
  } catch {
    return false
  }
}

/**
 * Guarda PIN hasheado en Keychain - nunca en texto plano
 * @param pin PIN de 6 dígitos
 */
export async function setPIN(pin: string): Promise<boolean> {
  if (!/^\d{6}$/.test(pin)) {
    throw new Error('PIN debe ser de 6 dígitos')
  }

  try {
    // Hashea con SHA-256 + salt fijo para evitar rainbow tables
    const salt = 'RAICES_PIN_SALT_V1'
    const hashedPIN = sha256(pin + salt)

    await SecureStorage.set({ key: KEYS.APP_PIN, value: hashedPIN })
    logger.info('PIN configurado correctamente')
    await logEvent('PIN_CREATED', { severity: 'info' });
    return true
  } catch (error) {
    logger.error('Error al guardar PIN:', error)
    return false
  }
}

/**
 * Verifica PIN ingresado contra el hash guardado
 */
export async function verifyPIN(pin: string): Promise<boolean> {
  try {
    const stored = await SecureStorage.get({ key: KEYS.APP_PIN })
    if (!stored.value) return false

    const salt = 'RAICES_PIN_SALT_V1'
    const hashedInput = sha256(pin + salt)

    return hashedInput === stored.value
  } catch (error) {
    logger.error('Error al verificar PIN:', error)
    return false
  }
}

/**
 * Elimina PIN - usado en botón de pánico o reset
 */
export async function removePIN(): Promise<void> {
  try {
    await SecureStorage.remove({ key: KEYS.APP_PIN })
    logger.info('PIN eliminado')
  } catch (error) {
    logger.warn('No había PIN para eliminar')
  }
}

// ================================================================
// BIOMETRÍA - Huella/FaceID
// ================================================================

/**
 * Verifica si el dispositivo soporta biometría
 */
export async function isBiometricAvailable(): Promise<boolean> {
  try {
    // Cambiamos BiometricAuth por NativeBiometric
    const result = await NativeBiometric.isAvailable();
    return result.isAvailable; 
  } catch {
    return false;
  }
}
/**
 * Autentica con biometría y desbloquea la sesión
 */
export async function authenticateWithBiometric(): Promise<boolean> {
  try {
    await NativeBiometric.verifyIdentity({
      reason: 'Desbloquea RAÍCES para acceder a tu información',
      title: 'Verificación de identidad',
      subtitle: 'Usa tu huella o rostro',
      description: 'RAÍCES protege tu privacidad',
    });
    
    // IMPORTANTE: Si la biometría es exitosa, desbloqueamos la sesión
    sessionState = 'unlocked';
    lastActivityTime = Date.now();
    startInactivityTimer();
    notifyStateChange();
    await logEvent('SESSION_UNLOCK', { 
  severity: 'info', 
  metadata: { method: 'biometric' } 
});
    return true; 
  } catch (error) {
    logger.warn('Biometría cancelada o falló');
    return false;
  }
}
/**
 * Activa/desactiva biometría
 */
export async function setBiometricEnabled(enabled: boolean): Promise<void> {
  await SecureStorage.set({ 
    key: KEYS.BIOMETRIC_ENABLED, 
    value: enabled? 'true' : 'false' 
  })
}

/**
 * Verifica si biometría está activada
 */
export async function isBiometricEnabled(): Promise<boolean> {
  try {
    const val = await SecureStorage.get({ key: KEYS.BIOMETRIC_ENABLED })
    return val.value === 'true'
  } catch {
    return false
  }
}

// ================================================================
// CONTROL DE SESIÓN
// ================================================================
/**
 * Intenta desbloquear la sesión validando el PIN ingresado.
 */
export async function unlockWithPIN(pin: string): Promise<boolean> {
  const isValid = await verifyPIN(pin); // Reutiliza la lógica de hash que ya tienes
  
  if (isValid) {
    sessionState = 'unlocked';
    lastActivityTime = Date.now();
    startInactivityTimer();
    notifyStateChange();
    logger.info('Sesión desbloqueada con PIN');
    await logEvent('SESSION_UNLOCK', { 
  severity: 'info', 
  metadata: { method: 'pin' } 
});
    return true;
  }
  
  logger.warn('Intento de desbloqueo con PIN fallido');
  await logEvent('SESSION_UNLOCK_FAIL', { severity: 'warn' });
  return false;
}
/**
 * Inicia sesión desbloqueada - después de PIN o biometría exitosa
 */
export async function unlockSession(): Promise<void> {
  sessionState = 'unlocked';
  lastActivityTime = Date.now();
  startInactivityTimer();
  notifyStateChange();
  logger.info('Sesión desbloqueada');

  // REGISTRO CORRECTO: Avisamos que la sesión se abrió
  await logEvent('SESSION_UNLOCK', { 
    severity: 'info', 
    metadata: { method: 'automatic_or_resume' } 
  });
}

/**
 * Bloquea sesión - descarga modelos de RAM y limpia estado
 */
export async function lockSession(): Promise<void> {
  // Guardamos la razón ANTES de cambiar el estado a 'locked'
  const reason = sessionState === 'expired' ? 'timeout' : 'manual';
  
  sessionState = 'locked'; // Ahora sí bloqueamos
  stopInactivityTimer();
  
  // Limpieza de RAM (lo que ya tenías)
  unloadLlama();
  unloadRAG();
  unloadVoy();
  unloadTokenizer();
  await closeDB();

  notifyStateChange();
  logger.info(`Sesión bloqueada por: ${reason}`);

  // REGISTRO CORRECTO: Avisamos por qué se cerró
  await logEvent('SESSION_LOCK', { 
    severity: 'info', 
    metadata: { reason: reason } 
  });
}

/**
 * Registra actividad del usuario - resetea timer
 */
export function registerActivity(): void {
  if (sessionState!== 'unlocked') return
  
  lastActivityTime = Date.now()
  resetInactivityTimer()
}

/**
 * Timer de inactividad - bloquea después de SESSION_TIMEOUT_MS
 */
function startInactivityTimer(): void {
  stopInactivityTimer()
  
  inactivityTimer = setTimeout(() => {
    logger.warn('Sesión expirada por inactividad')
    sessionState = 'expired'
    lockSession()
  }, APP.SESSION_TIMEOUT_MS)
}

function resetInactivityTimer(): void {
  stopInactivityTimer()
  startInactivityTimer()
}

function stopInactivityTimer(): void {
  if (inactivityTimer) {
    clearTimeout(inactivityTimer)
    inactivityTimer = null
  }
}

/**
 * Obtiene estado actual de sesión
 */
export function getSessionState(): SessionState {
  return sessionState
}

/**
 * Verifica si la sesión está activa
 */
export function isSessionActive(): boolean {
  return sessionState === 'unlocked'
}

/**
 * Tiempo restante antes de auto-bloqueo en ms
 */
export function getTimeUntilLock(): number {
  if (sessionState!== 'unlocked') return 0
  const elapsed = Date.now() - lastActivityTime
  return Math.max(0, APP.SESSION_TIMEOUT_MS - elapsed)
}

// ================================================================
// LISTENERS Y EVENTOS
// ================================================================

/**
 * Suscribe a cambios de estado de sesión
 */
export function onSessionStateChange(callback: (state: SessionState) => void): () => void {
  sessionCallbacks.push(callback)
  // Retorna función para desuscribirse
  return () => {
    sessionCallbacks = sessionCallbacks.filter(cb => cb!== callback)
  }
}

function notifyStateChange(): void {
  sessionCallbacks.forEach(cb => cb(sessionState))
}

/**
 * Inicializa listeners de app - pausar/reanudar
 */
export function initializeSessionListeners(): void {
  // Listener de cambios de estado (Background/Foreground)
  App.addListener('appStateChange', async ({ isActive }) => {
    try {
      if (!isActive) {
        // --- LA APP SE PAUSA ---
        logger.info('App en background.');
        
        await logEvent('APP_PAUSE', { 
          severity: 'info',
          metadata: { 
            session_status: sessionState, // 'unlocked', 'locked' o 'expired'
            last_activity: new Date(lastActivityTime).toISOString()
          }
        });

      } else {
        // --- LA APP SE REANUDA ---
        logger.info('App vuelve a foreground.');
        
        // Verificamos si al volver la sesión debe morir por tiempo real
        const now = Date.now();
        const elapsed = now - lastActivityTime;
        
        if (elapsed > APP.SESSION_TIMEOUT_MS && sessionState === 'unlocked') {
          logger.warn('Tiempo de inactividad superado durante la pausa. Bloqueando...');
          await lockSession();
        }

        await logEvent('APP_RESUME', { 
          severity: 'info',
          metadata: { 
            session_status_on_resume: sessionState,
            inactive_duration_sec: Math.round(elapsed / 1000)
          }
        });
      }
    } catch (error) {
      logger.error('Error en auditoría de ciclo de vida:', error);
    }
  });

  // Listener de 'resume' (específico para recuperar el foco)
  App.addListener('resume', () => {
    const now = Date.now();
    const elapsed = now - lastActivityTime;
    if (elapsed > APP.SESSION_TIMEOUT_MS && sessionState === 'unlocked') {
      lockSession(); 
    }
  });
}

// ================================================================
// LIMPIEZA
// ================================================================

/**
 * Limpia todo - usado en botón de pánico
 */
export async function clearSession(): Promise<void> {
  stopInactivityTimer()
  await lockSession()
  await removePIN()
  await SecureStorage.remove({ key: KEYS.BIOMETRIC_ENABLED }).catch(() => {})
  sessionCallbacks = []
  
  await logEvent('PANIC_ACTIVATED', { 
  severity: 'error', 
  metadata: { action: 'session_wipe' } 
});
  logger.warn('Sesión completamente eliminada')
}
