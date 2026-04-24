/**
 * RAÍCES - Servicio Anti-Telemetría
 * Bloquea cualquier intento de envío de datos
 * Intercepta fetch, XMLHttpRequest, Sentry, Firebase, etc.
 * Cumple promesa: 0 red, 0 analytics, 0 tracking
 */

import {logger } from '@/core/config/config.service'
import { logEvent } from '@/core/audit/audit.service'

let isInitialized = false
let blockedAttempts = 0

// Lista de dominios bloqueados - telemetría conocida
const BLOCKED_DOMAINS = [
  'google-analytics.com',
  'googletagmanager.com',
  'firebase.com',
  'firebaseio.com',
  'crashlytics.com',
  'sentry.io',
  'bugsnag.com',
  'mixpanel.com',
  'amplitude.com',
  'segment.com',
  'facebook.com/tr',
  'doubleclick.net',
  'clarity.ms',
  'hotjar.com',
  'huggingface.co', 
  'onnxruntime.ai',
  'microsoft.com/onnx',
  'github.com',
]

// ================================================================
// INTERCEPTORS
// ================================================================

/**
 * Sobrescribe fetch para bloquear requests externos
 */
function interceptFetch(): void {
  const originalFetch = window.fetch

  window.fetch = async (...args: Parameters<typeof fetch>): Promise<Response> => {
    const url = args[0]?.toString() || ''

    // Permite solo file:// y capacitor:// para assets locales
    if (url.startsWith('file://') || url.startsWith('capacitor://') || url.startsWith('/')) {
      return originalFetch(...args)
    }

    // Bloquea todo lo demás
    blockedAttempts++
    logger.warn(`[TELEMETRY BLOCK] Fetch bloqueado: ${url.substring(0, 50)}`)

logEvent('TELEMETRY_BLOCKED', {
  severity: 'warn',
  metadata: {
    type: 'fetch',
    url: url.substring(0, 100), // <--- Aquí se "lee" la variable
    blocked_count: blockedAttempts,
  },
})

    // Retorna respuesta vacía para no romper la app
    return new Response(null, { status: 204, statusText: 'No Content' })
  }

  logger.info('[RAÍCES TELEMETRY] Fetch interceptado')
}

/**
 * Sobrescribe XMLHttpRequest
 */
function interceptXHR(): void {
  const originalOpen = XMLHttpRequest.prototype.open

  XMLHttpRequest.prototype.open = function(
    method: string,
    url: string | URL,
    async?: boolean,
    username?: string | null,
    password?: string | null
  ) {
    const urlStr = url.toString()

    // Permite solo locales
    if (urlStr.startsWith('file://') || urlStr.startsWith('capacitor://') || urlStr.startsWith('/')) {
      return originalOpen.call(this, method, url, async!, username, password)
    }

    // Bloquea
    blockedAttempts++
    logger.warn(`[TELEMETRY BLOCK] XHR bloqueado: ${urlStr.substring(0, 50)}`)

    logEvent('TELEMETRY_BLOCKED', {
      severity: 'warn',
      metadata: {
        type: 'xhr',
        url: urlStr.substring(0, 100),
        blocked_count: blockedAttempts,
      },
    })

    // Aborta el request
    this.abort()
    return
  }

  logger.info('[RAÍCES TELEMETRY] XMLHttpRequest interceptado')
}

/**
 * Sobrescribe WebSocket - algunos trackers lo usan
 */
function interceptWebSocket(): void {
  // Eliminamos 'OriginalWebSocket' si no lo vamos a usar
  window.WebSocket = function(url: string | URL, _protocols?: string | string[]) {
    const urlStr = url.toString();
    blockedAttempts++;

    logEvent('TELEMETRY_BLOCKED', {
      severity: 'warn',
      metadata: { type: 'websocket', url: urlStr.substring(0, 100) }
    });

    return {
      close: () => {},
      send: () => {},
      readyState: 3, 
    } as any;
  } as any;
}

/**
 * Sobrescribe navigator.sendBeacon - usado por analytics
 */
function interceptBeacon(): void {
  if (navigator.sendBeacon) {
    navigator.sendBeacon = (url: string | URL, _data?: BodyInit | null): boolean => {
      const urlStr = url.toString(); // <--- Aquí se lee la variable
      blockedAttempts++;

      // Registramos el intento con la URL para trazabilidad
      logger.warn(`[TELEMETRY BLOCK] sendBeacon interceptado: ${urlStr}`);
      
      logEvent('TELEMETRY_BLOCKED', {
        severity: 'warn',
        metadata: { 
          type: 'beacon', 
          url: urlStr.substring(0, 100) 
        }
      });

      return false; 
    };
  }
}
/**
 * Stub de librerías comunes - Firebase, Sentry, etc.
 */
function stubCommonLibraries(): void {
  if (typeof window !== 'undefined') {
    // Firebase Stub
    (window as any).firebase = {
      analytics: () => ({ logEvent: () => {}, setUserId: () => {}, setUserProperties: () => {} }),
      crashlytics: () => ({ log: () => {}, recordError: () => {}, setUserId: () => {} }),
    };

    // Sentry Stub
    (window as any).Sentry = {
      init: () => {},
      captureException: () => {},
      captureMessage: () => {},
      setUser: () => {},
    };

    // Google & DataLayer Stubs
    const blockMsg = () => logger.warn('[TELEMETRY BLOCK] Bloqueado');
    (window as any).gtag = blockMsg;
    (window as any).ga = blockMsg;
    (window as any).dataLayer = { push: blockMsg };

    logger.info('[RAÍCES TELEMETRY] Librerías comunes stubbed');
  }
}

// ================================================================
// INICIALIZACIÓN
// ================================================================

/**
 * Activa todos los bloqueos de telemetría
 * Llamar ANTES de cargar cualquier otra librería
 */
export function initializeTelemetryBlock(): void {
  if (isInitialized) return

  logger.info('[RAÍCES TELEMETRY] Activando bloqueos de telemetría...')

  try {
    interceptFetch()
    interceptXHR()
    interceptWebSocket()
    interceptBeacon()
    stubCommonLibraries()

    isInitialized = true
    logger.info('[RAÍCES TELEMETRY] Todos los bloqueos activos. 0 telemetría garantizada.')

    logEvent('TELEMETRY_BLOCK_INIT', {
      severity: 'info',
      metadata: { blocked_domains: BLOCKED_DOMAINS.length },
    })

  } catch (error) {
    logger.error('[RAÍCES TELEMETRY] Error al inicializar bloqueos:', error)
  }
}

/**
 * Verifica si hay intentos bloqueados - para debug
 */
export function getBlockedAttempts(): number {
  return blockedAttempts
}

/**
 * Resetea contador - solo para testing
 */
export function resetBlockedCounter(): void {
  blockedAttempts = 0
}

/**
 * Verifica si un dominio está en la lista negra
 */
export function isDomainBlocked(url: string): boolean {
  return BLOCKED_DOMAINS.some(domain => url.includes(domain))
}

// ================================================================
// CSP - Content Security Policy
// ================================================================

/**
 * Inyecta CSP meta tag para bloquear requests en el navegador
 * Solo funciona en web, no en Capacitor nativo
 */
export function injectCSP(): void {
  if (typeof document === 'undefined') return

  const meta = document.createElement('meta')
  meta.httpEquiv = 'Content-Security-Policy'
  meta.content = [
    "default-src 'self' capacitor: file:",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'", // Necesario para ONNX Runtime
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self'",
    "connect-src 'self' capacitor: file:", // Solo local
    "media-src 'self'",
    "object-src 'none'",
    "frame-src 'none'",
    "worker-src 'self' blob:", // Para ONNX WASM
  ].join('; ')

  document.head.appendChild(meta)
  logger.info('[RAÍCES TELEMETRY] CSP inyectado')
}
