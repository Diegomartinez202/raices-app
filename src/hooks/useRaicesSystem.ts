import { useState, useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { validateConfig, logger } from '@/core/config/config.service';
import { initializeDB, isDBReady } from '@/core/db/sqlite.service';
import { initializeLlama, isLlamaReady } from '@/core/ai/llama.service';
import { initializeVoy, isVoyReady } from '@/core/rag/voy.service';
import { initializeTokenizer, isTokenizerReady } from '@/core/rag/tokenizer.service';
import { hasPIN, onSessionStateChange, initializeSessionListeners, setPIN } from '@/core/session/session.service';
import { asegurarCorpusLocal } from '@/core/infra/infraestructura.service';
import { KeyService } from '@/core/crypto/keys.service';

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

  // --- FUNCIÓN DE INFRAESTRUCTURA (Reincorporada) ---
  const prepararInfraestructura = async () => {
    const platform = Capacitor.getPlatform();
    const isNative = Capacitor.isNativePlatform();
    logger.log(`[SISTEMA] Preparando entorno físico en: ${platform}`);

    try {
      if (isNative) {
        // Crear directorios para RAG y Modelos IA (Soberanía de datos)
        await Filesystem.mkdir({ path: 'corpus', directory: Directory.Data, recursive: true }).catch(() => {});
        await Filesystem.mkdir({ path: 'models', directory: Directory.Data, recursive: true }).catch(() => {});
        
        // Validación técnica para auditoría de MinCiencias
        const checkModel = await Filesystem.stat({ 
          path: 'models/gemma-2b-it-q4_k_m.gguf', // O el modelo que uses
          directory: Directory.Data 
        }).catch(() => null);

        if (!checkModel) {
          logger.warn('[ALERTA] Modelo IA no detectado en almacenamiento seguro.');
        } else {
          logger.log("[SISTEMA] Infraestructura física validada.");
        }
      } else {
        logger.log("[SISTEMA] Ejecutando en web, se omitió infraestructura física.");
      }
    } catch (e) {
      console.error("[ERROR INFRA]", e);
      throw e; // Lanza el error para capturarlo en la bootSequence
    }
  };

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;

    const bootSequence = async () => {
      try {
        setIsSystemLoading(true);

        // --- FASE 1: NÚCLEO Y CONFIGURACIÓN ---
        setLoadingMsg('Validando configuración soberana...');
        validateConfig();

        // --- FASE 2: INFRAESTRUCTURA FÍSICA (¡Recuperada!) ---
        setLoadingMsg('Verificando almacenamiento seguro...');
        await prepararInfraestructura(); 
        await asegurarCorpusLocal(); // Verifica integridad del conocimiento JEP

        // --- FASE 3: BÓVEDA DE SEGURIDAD (Criptografía) ---
        setLoadingMsg('Configurando bóveda de claves...');
        const keys = await KeyService.obtenerOCrearLlaves();
        if (!keys) throw new Error('Falló la generación de llaves de cifrado.');

        setLoadingMsg('Iniciando persistencia cifrada...');
        await initializeDB();
        if (!isDBReady()) throw new Error('La base de datos SQLite no está lista.');

        // --- FASE 4: MOTORES DE IA Y RAG ---
        setLoadingMsg('Cargando Tokenizer local...');
        await initializeTokenizer();
        if (!isTokenizerReady()) throw new Error('Fallo crítico en el Tokenizer.');

        setLoadingMsg('Indexando contexto jurídico (Voy)...');
        await initializeVoy();
        if (!isVoyReady()) throw new Error('Fallo crítico en el motor de búsqueda (RAG).');

        setLoadingMsg('Inicializando modelo IA (Llama)...');
        await initializeLlama();
        if (!isLlamaReady()) throw new Error('Fallo crítico en el motor de IA Llama.');

        // --- FASE 5: SESIÓN Y SEGURIDAD ---
        setLoadingMsg('Verificando estado de sesión...');
        initializeSessionListeners();
        
        const pinExists = await hasPIN();
        setHasPinConfigured(pinExists);
        setIsLocked(pinExists);

        // Listener para cambios de bloqueo (timeout)
        unsubscribe = onSessionStateChange((state) => {
          setIsLocked(state !== 'unlocked');
        });

        logger.log('[SISTEMA] Sistema RAÍCES arrancado con éxito.');
        setIsSystemLoading(false);

      } catch (error: any) {
        console.error('[RAÍCES FALLO CRÍTICO AMBIENTE]', error);
        setLoadingMsg(`ERROR EN ARRANQUE: ${error.message || error}`);
        // No quitamos el Loading para evitar que entre a la app rota
      }
    };

    bootSequence();

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  return { isSystemLoading, loadingMsg, isLocked, hasPinConfigured, setIsLocked };
};