import { 
  initializeVoy, 
  isVoyReady, 
  retrieveContext 
} from '@/core/rag/voy.service';
import { useState, useRef, useEffect } from 'react'
import { validateConfig, getAppConfig, logger } from '@/core/config/config.service'
// --- COMPONENTES DE INTERFAZ ---
import ChatInput from '@/components/Chat/ChatInput.vue'
import ChatBubble from '@/components/Chat/ChatBubble.vue'

// --- SEGURIDAD Y PROTOCOLOS ---
import { activatePanicMode } from '@/core/crypto/secure-wipe.service'
import { KeyService } from '@/core/crypto/keys.service'
import { SecureStoragePlugin } from 'capacitor-secure-storage-plugin'
import { Filesystem, Directory } from '@capacitor/filesystem'
import { Capacitor } from '@capacitor/core'

// --- SERVICIOS DE IA, RAG Y PERSISTENCIA ---
import { generateResponse, isLlamaReady, initializeLlama } from '@/core/ai/llama.service'
import { initializeTokenizer, isTokenizerReady } from '@/core/rag/tokenizer.service'
import { initializeDB, saveMessage, getMessages, isDBReady, type DBMessage } from '@/core/db/sqlite.service'
import { exportHistoryToPDF, exportHistoryToJSON } from '@/core/export/export.service'
import { asegurarCorpusLocal } from '@/core/infra/infraestructura.service';
import { 
  initializeSessionListeners, 
  registerActivity, 
  onSessionStateChange,
  hasPIN,
  setPIN,
  unlockSession,
  isSessionActive
} from '@/core/session/session.service'
import LockScreen from '@/components/Security/LockScreen'

interface Message {
  id: string
  text: string
  isUser: boolean
  timestamp: Date
  sources?: string[]
}

function App() {

  // --- ESTADOS DE CARGA (Para que no fallen los setLoading...) ---
  const [isSystemLoading, setIsSystemLoading] = useState(true);
  const [loadingMsg, setLoadingMsg] = useState('Iniciando RAÍCES...');
// --- ESTADOS DE SEGURIDAD (Los que agregamos de la sesión) ---
  const [isLocked, setIsLocked] = useState(true);
  const [hasPinConfigured, setHasPinConfigured] = useState(false);
  const [showPinSetup, setShowPinSetup] = useState(false);
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');

  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: 'Hola. Soy RAÍCES. Estoy aquí para ayudarte a encontrar información sobre tus derechos. Todo lo que hablemos se queda en tu celular. ¿En qué te puedo ayudar hoy?',
      isUser: false,
      timestamp: new Date()
    }
  ])

  // --- REFERENCIAS PARA PÁNICO Y UI ---
  const [tapCount, setTapCount] = useState(0)
  const tapTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  /**
   * UTILIDAD: Prepara la estructura física de archivos.
   * Líneas críticas para asegurar que el borrado físico de MinCiencias tenga objetivos válidos.
   */
const prepararInfraestructura = async () => {
    // --- ESTAS LÍNEAS VALIDAN LA SOBERANÍA DEL ENTORNO ---
    const platform = Capacitor.getPlatform();
    const isNative = Capacitor.isNativePlatform();
    
    console.log(`[RAÍCES] Iniciando en plataforma: ${platform} (Nativo: ${isNative})`);

    try {
      // Solo en nativo forzamos la creación de rutas físicas de alta seguridad
      if (isNative) {
        await Filesystem.mkdir({ 
          path: 'corpus', 
          directory: Directory.Data, 
          recursive: true 
        }).catch(() => {});

        await Filesystem.mkdir({ 
          path: 'models', 
          directory: Directory.Data, 
          recursive: true 
        }).catch(() => {});
        
        // Verificación de integridad del modelo para el borrado seguro
        const modelPath = 'models/gemma-2b-it-q4_k_m.gguf';
        const check = await Filesystem.stat({ 
          path: modelPath, 
          directory: Directory.Data 
        }).catch(() => null);

        if (!check) {
          console.error('[CRÍTICO] El modelo no reside en Directory.Data. El Protocolo de Pánico no podrá destruirlo físicamente.');
        }
      }
    } catch (e) {
      console.error('[RAÍCES ERROR INFRA]', e);
    }
  };

  /**
   * EFECTO DE ARRANQUE SOBERANO (Secuencial para optimizar RAM)
   */
useEffect(() => {
  const setupRaices = async () => {
    try {   
  // --- VALIDACIÓN Y REGISTRO ---
  validateConfig(); 
  // AQUÍ USAMOS LOS DOS:
  const config = getAppConfig();
  logger.info(`Iniciando RAÍCES Versión: ${config.VERSION}`);
  
      // PASO 1: Seguridad de Sesión (Prioridad 0)
  setIsSystemLoading(true);

        // 1. Inicializar Seguridad de Sesión
        initializeSessionListeners();
        
        const pinExists = await hasPIN();
        setHasPinConfigured(pinExists);

        if (!pinExists) {
          setShowPinSetup(true); // Flujo para crear PIN
          setIsLocked(false);
        } else {
          setIsLocked(true); // Bloquear hasta que ponga el PIN
        }

        // Suscribirse a cambios de estado (Auto-bloqueo)
        const unsubscribe = onSessionStateChange((state) => {
          setIsLocked(state !== 'unlocked');
        });

      // PASO 2: Infraestructura y Bóveda
      setLoadingMsg('Verificando base de conocimientos...');
      await asegurarCorpusLocal(); 
      await prepararInfraestructura();

      setLoadingMsg('Configurando bóveda de seguridad...');
      const llaveDinamica = await KeyService.getOrCreateDynamicKey();
      await SecureStoragePlugin.set({ key: 'RAICES_CORPUS_KEY', value: llaveDinamica });
      await asegurarCorpusLocal(); 
      await initializeLlama();
      await initializeTokenizer();
      await initializeVoy();
      await initializeDB();
      // PASO 3: Motores de IA
      setLoadingMsg('Iniciando motor de IA local...');
      const llmOk = await initializeLlama();
      const tokenizerOk = await initializeTokenizer();
      const voyOk = await initializeVoy(); 

      // PASO 4: Base de Datos
      setLoadingMsg('Abriendo baúl de mensajes...');
      const dbOk = await initializeDB();

      if (llmOk && tokenizerOk && voyOk && dbOk) {
        const history = await getMessages(20);
        if (history && history.length > 0) {
          const formattedHistory = history.map((m: DBMessage) => ({
            id: m.id, text: m.text, isUser: m.isUser === 1,
            timestamp: new Date(m.timestamp),
            sources: m.source ? [m.source] : []
          }));
          setMessages(formattedHistory.reverse());
        }


      setIsSystemLoading(false);
      } else {
        setLoadingMsg('Error de integridad. Reinicia la app.');
      }

      // El return del useEffect para limpiar la suscripción
      return () => unsubscribe();

    } catch (error) {
      console.error("[RAÍCES FATAL]", error);
      setLoadingMsg('Fallo crítico en el sistema.');
    }
  };

  setupRaices();
}, []);
  
const handleSetPIN = async () => {
    if (newPin.length < 4) {
      alert('El PIN debe tener al menos 4 dígitos');
      return;
    }
    if (newPin !== confirmPin) {
      alert('Los PINs no coinciden');
      return;
    }
    
    const ok = await setPIN(newPin);
    if (ok) {
      setHasPinConfigured(true);
      setShowPinSetup(false);
      setIsLocked(false);
      if (typeof logger !== 'undefined') logger.info("PIN configurado por primera vez.");
    }
  };

/**
   * LÓGICA DE PROCESAMIENTO SOBERANO (OFFLINE)
   */
const handleSendMessage = async (text: string) => {
    registerActivity(); // Registrar que el usuario está interactuando
    
    if (!isSessionActive()) {
      console.warn('[SEGURIDAD] Intento de envío con sesión inactiva');
      return;
    }

    if (!text.trim()) return;

    const now = Date.now();
    const userMsg: Message = {
      id: now.toString(),
      text,
      isUser: true,
      timestamp: new Date(now)
    };

    // --- 1. PERSISTENCIA INMEDIATA DEL USUARIO ---
setMessages(prev => [...prev, userMsg]);
if (isDBReady()) {
  await saveMessage({
    id: userMsg.id,
    text: userMsg.text,
    isUser: true, // Cambiado de 1 a true
    timestamp: now
  });
}

    // --- 2. VALIDACIÓN DE DISPONIBILIDAD ---
  if (!isLlamaReady() || !isVoyReady() || !isTokenizerReady()) { 
  const botWaitMsg: Message = {
    id: (now + 1).toString(),
    text: 'Estoy preparando mi conocimiento local. Por favor, espera un momento.',
    isUser: false,
    timestamp: new Date(now + 1)
  };
  setMessages(prev => [...prev, botWaitMsg]);
  return;
}

try {
  // --- 3. PROCESAMIENTO SOBERANO ---
  const ragResult = await retrieveContext(text);
  
  // CORRECCIÓN: ragResult es un objeto { chunks: [], sources: [] }. 
  // generateResponse necesita los chunks (el texto).
  const response = await generateResponse(text, ragResult.chunks);
      let finalText = response;
      if (ragResult.sources.length > 0) {
        finalText += `\n\n[Fuente: ${ragResult.sources[0]}]`;
      }

      const botTimestamp = Date.now();
      const botMsg: Message = {
        id: botTimestamp.toString(),
        text: finalText,
        isUser: false,
        timestamp: new Date(botTimestamp),
        sources: ragResult.sources
      };

// --- 4. PERSISTENCIA DE LA RESPUESTA ---
setMessages(prev => [...prev, botMsg]);
if (isDBReady()) {
  await saveMessage({
    id: botMsg.id,
    text: botMsg.text,
    isUser: false, // Cambiado de 0 a false
    timestamp: botTimestamp,
    source: ragResult.sources[0] || undefined
  });
}
} catch (error) {
      console.error(error);
    }
  };
  /**
   * PROTOCOLO DE PÁNICO (Silencioso)
   */
const handleLogoTap = () => {
    setTapCount(prev => prev + 1);
    if (tapTimeoutRef.current) clearTimeout(tapTimeoutRef.current);
    tapTimeoutRef.current = setTimeout(() => setTapCount(0), 1000);
    if (tapCount + 1 >= 3) {
      activatePanicMode();
    }
  };

 // --- ESCUCHA DE ACTIVIDAD (PARA AUTO-BLOQUEO) ---
  useEffect(() => {
    const handleActivity = () => registerActivity();
    window.addEventListener('click', handleActivity);
    window.addEventListener('keypress', handleActivity);
    window.addEventListener('touchstart', handleActivity);
    
    return () => {
      window.removeEventListener('click', handleActivity);
      window.removeEventListener('keypress', handleActivity);
      window.removeEventListener('touchstart', handleActivity);
    };
  }, []);

// --- JERARQUÍA DE SEGURIDAD Y RENDERIZADO ---

  // 1. Si está bloqueada y hay PIN: Pantalla de Bloqueo
  if (isLocked && hasPinConfigured) {
    return <LockScreen onUnlock={unlockSession} />;
  }

  // 2. Si no hay PIN (Primera vez): Pantalla de Configuración
  if (showPinSetup) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-[#F5F1E8] p-6 text-center">
        <h2 className="text-[#C65D3B] font-bold text-xl mb-4">Configura tu PIN</h2>
        <p className="text-[12px] text-[#6B5E4F] mb-6">Protege tu información soberana local.</p>
        <input 
          type="password" 
          placeholder="Nuevo PIN"
          className="w-full p-4 mb-2 border rounded-xl text-center" 
          value={newPin} 
          onChange={e => setNewPin(e.target.value)} 
        />
        <input 
          type="password" 
          placeholder="Confirmar PIN"
          className="w-full p-4 mb-4 border rounded-xl text-center" 
          value={confirmPin} 
          onChange={e => setConfirmPin(e.target.value)} 
        />
        <button 
          onClick={handleSetPIN} 
          className="bg-[#588157] text-white w-full py-4 rounded-xl font-bold active:scale-95 transition-transform"
        >
          ACTIVAR SEGURIDAD
        </button>
      </div>
    );
  }

  // 3. Si el sistema está cargando motores (WASM, DB, LLM)
  if (isSystemLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-[#F5F1E8] p-6 text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#C65D3B] mb-6"></div>
        <h2 className="text-[#C65D3B] font-bold text-2xl mb-2">RAÍCES</h2>
        <p className="text-[#6B5E4F] font-medium">{loadingMsg}</p>
        <span className="text-[10px] mt-12 opacity-40 uppercase tracking-widest">Tecnología Soberana - JEP</span>
      </div>
    );
  }

  // 4. RENDERIZADO FINAL (La aplicación cuando todo está OK)
  return (
    <div className="flex flex-col h-screen bg-[#F5F1E8] font-sans overflow-hidden">
      <header className="bg-[#C65D3B] text-white p-4 shadow-md z-10">
        <div 
          className="flex items-center gap-3 select-none active:scale-95 transition-transform cursor-pointer"
          onClick={handleLogoTap}
        >
          <div className="bg-[#588157] p-2 rounded-full">
            <svg width="20" height="20" viewBox="0 0 32 32" fill="none">
              <path d="M16 4C16 4 20 8 20 14C20 20 16 24C16 24 12 20 12 14C12 8 16 4Z" fill="#F5F1E8"/>
            </svg>
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-wide">RAÍCES</h1>
            <p className="text-[10px] opacity-80 uppercase tracking-tighter">Modo Seguro Offline</p>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-4 space-y-4 scroll-smooth">
        {messages.map((msg) => (
          <ChatBubble key={msg.id} message={msg} />
        ))}
      </main>

      <footer className="p-4 bg-white border-t border-[#D4A373]/20">
        <div className="flex justify-between items-center mb-3">
          <span className="text-[8px] text-[#588157] font-bold uppercase tracking-widest flex items-center gap-1">
            <div className="w-1.5 h-1.5 bg-[#588157] rounded-full"></div>
            Soberanía de Datos Offline
          </span>

          <div className="flex gap-2">
            <button
              onClick={async () => await exportHistoryToPDF({ shareAfterExport: true })}
              className="text-[9px] font-bold text-[#6B5E4F] bg-[#F5F1E8] border border-[#D4A373]/30 px-3 py-1.5 rounded-md active:scale-95 transition-all"
            >
              REPORTE PDF
            </button>
            <button
              onClick={async () => await exportHistoryToJSON()}
              className="text-[9px] font-bold text-white bg-[#588157] px-3 py-1.5 rounded-md active:scale-95 transition-all"
            >
              BACKUP JSON
            </button>
          </div>
        </div>

<ChatInput onSendMessage={handleSendMessage} isLoading={isSystemLoading} />
        
        <p className="text-[8px] text-center text-[#6B5E4F]/50 mt-2 italic">
          "Información soberana para la reconstrucción del tejido social"
        </p>
      </footer>
    </div>
  );
}
export default App;