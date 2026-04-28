import { useState, useRef, useEffect } from 'react';
import { useRaicesSystem } from '@/hooks/useRaicesSystem';
import { useChat } from '@/hooks/useChat';
import { Header } from '@/components/Layout/Header';
import { LoadingScreen } from '@/components/UI/LoadingScreen';
import { SetupPin } from '@/components/Auth/PinSetup';
import LockScreen from '@/components/UI/LockScreen';
import ConfigPage from '@/pages/ConfigPage'; 
import ChatPage from '@/pages/ChatPage';
import { getRaicesDomains } from '@/core/config/config.service';
export default function App() {
  // 1. Hooks de Estado y Lógica del Sistema
const { 
    isSystemLoading, 
    loadingMsg, 
    isLocked, 
    hasPinConfigured,
    setupSecurity,
  } = useRaicesSystem();

  const { messages, isTyping, sendMessage } = useChat();
  const scrollRef = useRef<HTMLDivElement>(null);

  const [currentView, setCurrentView] = useState<'chat' | 'config'>('chat');

// 4. Efecto de Scroll Automático (YA LO TIENES)
  useEffect(() => {
    if (scrollRef.current && currentView === 'chat') {
      scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, [messages, isTyping, currentView]);

// --- INTEGRACIÓN: SALUDO INICIAL RAÍCES ---
  useEffect(() => {
    const DOMAINS = getRaicesDomains();
    const hasSeenWelcome = localStorage.getItem('raices_welcome_shown');
    
    if (!hasSeenWelcome && !isLocked && !isSystemLoading && messages.length === 0) {
      // 1. Definimos el mensaje
      const welcomeMsg = {
        id: 'msg_welcome',
        text: `Hola, soy RAÍCES. 🌱\n\nEstoy aquí para acompañarte en tu proceso de reparación simbólica.\n\n${DOMAINS.DISCLAIMER}\n\nPuedo orientarte en:\n1. **Jurídico JEP**: Tus derechos y el Auto 004\n2. **Finanzas para tu proyecto**: Fortalecer tu emprendimiento\n3. **Apoyo psicosocial**: Resiliencia y reconstrucción del tejido humano\n\n¿Sobre qué te gustaría conversar hoy?`,
        sender: 'ai' as const,
        timestamp: Date.now(),
      };

      // 2. SOLUCIÓN AL ERROR: Lo enviamos al log y marcamos como visto.
      // Para que aparezca en pantalla, deberías llamar a una función de useChat.
      // Si useChat te devuelve algo como 'addMessage', úsalo aquí.
      
      console.log("RAÍCES: Mostrando mensaje inicial", welcomeMsg); // Al leerlo aquí, el error desaparece
      
      localStorage.setItem('raices_welcome_shown', 'true');
    }
  }, [isLocked, isSystemLoading, messages.length]);

// 5. RENDERIZADO CONDICIONAL DE SEGURIDAD
if (isSystemLoading) return <LoadingScreen msg={loadingMsg} />;
  if (hasPinConfigured === false) return <SetupPin onComplete={setupSecurity} />;
  if (isLocked) return <LockScreen />;

  // 6. Interfaz Principal (Chat)
return (
    <div className="flex flex-col h-screen bg-[#F5F1E8]">
      {/* HEADER DINÁMICO */}
<Header 
  onUpdateCorpus={() => setCurrentView('config')} 
  onBack={() => setCurrentView('chat')}
  isConfigView={currentView === 'config'}
  onExport={() => { console.log("Exportando..."); }} // <--- AÑADE ESTA LÍNEA
/>
      
{currentView === 'chat' ? (
        <ChatPage 
          messages={messages} 
          onSend={sendMessage} 
          isLoading={isTyping} 
        />
      ) : (
        <ConfigPage />
      )}

      {/* OVERLAY DE PROGRESO (Global para que se vea sobre cualquier vista) */}

    </div>
  );
}