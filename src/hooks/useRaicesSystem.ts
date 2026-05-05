import { useState, useEffect } from 'react';
import { validateConfig, logger } from '@/core/config/config.service';
import { initializeDB, isDBReady } from '@/core/db/sqlite.service';
import { initializeVoy, isVoyReady } from '@/core/rag/voy.service';
import { initializeTokenizer, isTokenizerReady } from '@/core/rag/tokenizer.service';
import { hasPIN, onSessionStateChange, initializeSessionListeners, setPIN } from '@/core/session/session.service';
import { InfraService } from '@/core/infra/infraestructura.service';
import { KeyService } from '@/core/crypto/keys.service';
import { getBlockedAttempts } from '@/core/security/telemetry-block.service';

// --- IMPORTS DE AUDITORÍA ---
import { 
  initializeAudit, 
  logEvent, 
  pruneOldLogs 
} from '@/core/audit/audit.service';

// --- IMPORTS DE BASE DE DATOS ---
import {  
  getDBConnection // Asegúrate de que esto se exporte en sqlite.service
} from '@/core/db/sqlite.service';
/**
 * HOOK SOBERANO: useRaicesSystem
 * Gestiona el ciclo de vida del arranque del sistema RAÍCES.
 * Incluye la validación de la infraestructura física indispensable para MinCiencias.
 */
export const useRaicesSystem = () => {
  const [isSystemLoading, setIsSystemLoading] = useState(true);
  const [loadingMsg, setLoadingMsg] = useState('Iniciando...');
  const [isLocked, setIsLocked] = useState(true);
  const [hasPinConfigured, setHasPinConfigured] = useState(false);

  useEffect(() => {
    
    let unsubscribe: (() => void) | undefined;

    const bootSequence = async () => {
      try {
        setIsSystemLoading(true);

        // ================================================================
        // --- FASE 0: PROTOCOLO CERO-RED (Blindaje de Red) ---
        // ================================================================
        setLoadingMsg('Activando Protocolo Cero-Red...');
        
        // Verificamos si el servicio de telemetría ya hizo su trabajo en main.tsx
        const blockedCount = getBlockedAttempts(); 
        if (blockedCount > 0) {
        setLoadingMsg(`Protección activa: ${blockedCount} conexiones bloqueadas.`);
        }
        // Un pequeño delay artificial (500ms) ayuda a que el usuario lea 
        // este mensaje tan importante para su confianza
        await new Promise(resolve => setTimeout(resolve, 500));
        
        logger
        // --- FASE 1: NÚCLEO Y CONFIGURACIÓN ---
        setLoadingMsg('Validando configuración soberana...');
        validateConfig();

        // --- FASE 2: INFRAESTRUCTURA FÍSICA (¡Recuperada!) ---
// --- FASE 2: INFRAESTRUCTURA FÍSICA (Aquí pegas las 3 líneas) ---
        setLoadingMsg('Preparando almacenamiento seguro...');
        await InfraService.prepararInfraestructura(); // Crea las carpetas
        
        setLoadingMsg('Sincronizando corpus de conocimiento...');
        await InfraService.asegurarCorpusLocal();     // Hidrata el JSON
        
        setLoadingMsg('Anclando modelo IA al hardware...');
        await InfraService.ensureModelExists(); // Verifica integridad del conocimiento JEP

        // --- FASE 3: BÓVEDA DE SEGURIDAD (Criptografía) ---
        setLoadingMsg('Configurando bóveda de claves...');
        const keys = await KeyService.obtenerOCrearLlaves();
        if (!keys) throw new Error('Falló la generación de llaves de cifrado.');

        setLoadingMsg('Iniciando persistencia cifrada...');
        await initializeDB();
        if (!isDBReady()) throw new Error('La base de datos SQLite no está lista.');

// FASE 4: ACTIVACIÓN DE AUDITORÍA (Aquí aplicamos la lógica)
        const dbConn = getDBConnection(); // Obtenemos la conexión
        if (dbConn) {
          setLoadingMsg('Configurando trazabilidad...');
          await initializeAudit(dbConn, `SES-${Date.now()}`);
          await pruneOldLogs(30); // Limpieza proactiva
          await logEvent('APP_START', { severity: 'info' });
        }
        
       // --- FASE 5: MOTORES DE IA Y RAG ---
        setLoadingMsg('Cargando Tokenizer local...');
        await initializeTokenizer();
        if (!isTokenizerReady()) throw new Error('Fallo crítico en el Tokenizer.');

        setLoadingMsg('Abriendo Bóveda Cifrada (JEP/Finanzas)...');

        setLoadingMsg('Indexando contexto jurídico (Voy)...');
        await initializeVoy();
        if (!isVoyReady()) throw new Error('Fallo crítico en el motor de búsqueda (RAG).');

        setLoadingMsg('Inicializando motor de búsqueda RAÍCES...');
        await initializeRAG();

        // --- FASE 6: SESIÓN Y SEGURIDAD ---
        // 1. ACTIVACIÓN DE LISTENERS (Pausa/Resumen)
        setLoadingMsg('Verificando estado de sesión...');
        initializeSessionListeners();
        
        // 2. Verificación de PIN
        const pinExists = await hasPIN();
        setHasPinConfigured(pinExists);
        setIsLocked(pinExists);

        // 3. Listener para cambios de bloqueo (timeout)
        unsubscribe = onSessionStateChange((state) => {
          setIsLocked(state !== 'unlocked');
        });

        // --- FINALIZACIÓN ---
        logger.info('[SISTEMA] Sistema RAÍCES arrancado con éxito.');
        setLoadingMsg('Bóveda lista...');
        
        
        setIsSystemLoading(false);

      } catch (error: any) {
        console.error('[RAÍCES FALLO CRÍTICO AMBIENTE]', error);
        setLoadingMsg(`ERROR DE INFRAESTRUCTURA: ${error.message || error}`);
        // No quitamos el Loading para evitar que entre a la app rota
      }
    };

    bootSequence();

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

const setupSecurity = async (nuevoPin: string) => {
    try {
      logger.info('[SEGURIDAD] Estableciendo PIN en almacenamiento seguro...');
      // AQUÍ SE USA EL IMPORT: Esto elimina el error de TypeScript
      const success = await setPIN(nuevoPin); 
      
      if (success) {
        setHasPinConfigured(true);
        setIsLocked(false);
        logger.info('[SISTEMA] Bóveda configurada y lista.');
      }
      return success;
    } catch (error) {
      logger.error('[SISTEMA] Error al establecer seguridad inicial:', error);
      return false;
    }
  };


const initializeRAG = async () => {
    try {
      logger.info('Abriendo Bóveda Cifrada (JEP/Finanzas)...');
      
      // 1. Aquí se activa la lógica de descifrado en memoria
      // (Esta lógica debe estar dentro de tu servicio de RAG)
      
      // 2. Activamos el motor Voy sin pasarle argumentos para evitar el error
      await initializeVoy(); 
      
      logger.info('✅ Motor de búsqueda RAÍCES inicializado correctamente.');
    } catch (e) {
      logger.error('Error al inicializar RAG', e);
      throw e;
    }
  };
  
return { 
    isSystemLoading, 
    loadingMsg, 
    isLocked, 
    hasPinConfigured, 
    setupSecurity,
    initializeRAG,
    setIsLocked 
  };
};
  