/**
 * RAÍCES - Punto de entrada principal
 * El orden de los imports y ejecuciones aquí es CRÍTICO para la seguridad.
 */
import { initializeTelemetryBlock, injectCSP } from '@/core/security/telemetry-block.service';

// 1. BLOQUEO INMEDIATO: Antes de cualquier importación de React o lógica de App
initializeTelemetryBlock();
injectCSP();

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// Inicializadores de infraestructura
import { initializeDB } from '@/core/db/sqlite.service';
import { initializeSessionListeners } from '@/core/session/session.service';

const rootElement = document.getElementById('root')!;

/**
 * Función de arranque con orquestación de servicios locales
 */
async function startApp() {
  try {
    // 2. Persistencia: Abrir la bóveda SQLite antes de mostrar la UI
    await initializeDB();
    
    // 3. Auditoría de Ciclo de Vida: Escuchar pausa/reanudación
    initializeSessionListeners();
    
    // 4. Renderizado: Solo si la infraestructura está lista
    ReactDOM.createRoot(rootElement).render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );
  } catch (error) {
    // Error fatal: El sistema no arranca si no hay seguridad garantizada
    console.error("Fallo crítico en el arranque de RAÍCES:", error);
    
    // Opcional: Podrías inyectar un HTML simple de error aquí si la DB falla
    rootElement.innerHTML = `
      <div style="padding: 20px; color: #C65D3B; font-family: sans-serif;">
        <h2>Error de Seguridad Crítico</h2>
        <p>No se pudo inicializar la bóveda local. Por seguridad, la aplicación no se iniciará.</p>
      </div>
    `;
  }
}

startApp();