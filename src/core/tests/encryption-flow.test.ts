import { describe, it, expect } from 'vitest'
// Importamos los nombres EXACTOS de tu archivo session.service.ts
import { setPIN, unlockWithPIN, lockSession, getSessionState } from '../session/session.service' 
import { initializeDB, saveMessage, getMessages } from '../db/sqlite.service'
import { activatePanicMode } from '../crypto/secure-wipe.service'

describe('Flujo de Seguridad Real - RAÍCES', () => {
  
  it('debe proteger los mensajes: Ciclo de vida completo', async () => {
    // 1. Configurar el PIN inicial (tu función usa 6 dígitos y sha256 interno)
    const pinValido = '123456';
    await setPIN(pinValido);

    // 2. Desbloquear la sesión (usando tu función unlockWithPIN)
    const unlocked = await unlockWithPIN(pinValido);
    expect(unlocked).toBe(true);
    expect(getSessionState()).toBe('unlocked');

    // 3. Inicializar base de datos cifrada
    await initializeDB();

    // 4. Guardar un mensaje (usando saveMessage de tu sqlite.service)
    await saveMessage({
      id: 'msg_001',
      text: 'Información sensible de la víctima',
      isUser: true,
      timestamp: Date.now()
    });

    // 5. Verificar que el mensaje es legible mientras está desbloqueado
    const msgs = await getMessages();
    expect(msgs.length).toBeGreaterThan(0);
    expect(msgs[0].text).toContain('sensible');

    // 6. BLOQUEO MANUAL (Tu función lockSession: descarga RAM y cierra DB)
    await lockSession();
    expect(getSessionState()).toBe('locked');

    // 7. Verificar que el acceso falla tras el bloqueo
    // Como lockSession llamó a closeDB(), cualquier intento de query debe fallar
    await expect(getMessages()).rejects.toThrow();
  });

  it('Protocolo de Pánico: Destrucción y limpieza', async () => {
    await setPIN('654321');
    await unlockWithPIN('654321');
    await initializeDB();

    // Activar pánico (Tu función activatePanicMode)
    await activatePanicMode();

    // Tras el pánico, el estado debe ser locked y el acceso imposible
    expect(getSessionState()).toBe('locked');
  });
});