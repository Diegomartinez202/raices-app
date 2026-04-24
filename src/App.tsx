import { useState, useRef, useEffect } from 'react';
import { useRaicesSystem } from '@/hooks/useRaicesSystem';
import { useChat } from '@/hooks/useChat';
import { Header } from '@/components/Layout/Header';
import { ChatInput } from '@/components/Chat/ChatInput';
import { ChatBubble } from '@/components/Chat/ChatBubble';
import { LoadingScreen } from '@/components/UI/LoadingScreen';
import { SetupPin } from '@/components/Auth/PinSetup';
import LockScreen from '@/components/UI/LockScreen';

// Importaciones para la indexación
import { indexPDF, IndexingProgress } from '@/core/rag/indexing.service';

export default function App() {
  // 1. Hooks de Estado y Lógica del Sistema
  const { 
    isSystemLoading, 
    loadingMsg, 
    isLocked, 
    hasPinConfigured,
    initializeRAG // Asumiendo que tu hook expone la reinicialización
  } = useRaicesSystem();

  const { messages, isTyping, sendMessage } = useChat();
  const scrollRef = useRef<HTMLDivElement>(null);

  // 2. Estado para el progreso de indexación
  const [indexingProgress, setIndexingProgress] = useState<IndexingProgress | null>(null);

  // 3. Manejador para actualizar el Corpus
  const handleIndexPDF = async () => {
    // Nota: El PDF debe existir previamente en el Directorio de Datos
    const pdfToProcess = 'sources/JEP_Auto_004_2018.pdf';
    
    const success = await indexPDF(
      pdfToProcess,
      (progress) => setIndexingProgress(progress)
    );

    if (success) {
      alert('Corpus actualizado con éxito.');
      // Recarga el sistema RAG para que lea los nuevos archivos .enc y .json
      if (initializeRAG) await initializeRAG();
    } else {
      alert('Error al indexar el documento. Revisa los logs de auditoría.');
    }

    setIndexingProgress(null);
  };

  // 4. Efecto de Scroll Automático
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  }, [messages, isTyping]); 

  // 5. Renderizado Condicional (Carga y Seguridad)
  if (isSystemLoading) return <LoadingScreen msg={loadingMsg} />;
  if (hasPinConfigured === false) return <SetupPin />;
  if (isLocked) return <LockScreen />;

  // 6. Interfaz Principal (Chat)
  return (
    <div className="flex flex-col h-screen bg-[#F5F1E8]">
      {/* Pasamos handleIndexPDF al Header o a un botón de configuración */}
      <Header onExport={() => {}} onUpdateCorpus={handleIndexPDF} />
      
      <main ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg) => (
          <ChatBubble 
            key={msg.id} 
            message={{
              ...msg,
              isUser: Boolean(msg.isUser) 
            }} 
          />
        ))}
        {isTyping && (
          <div className="text-xs text-[#C65D3B] animate-pulse font-medium">
            RAÍCES está pensando...
          </div>
        )}
      </main>

      {/* Overlay de Progreso de Indexación */}
      {indexingProgress && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[100] backdrop-blur-sm">
          <div className="bg-white p-6 rounded-xl shadow-2xl w-80 border border-[#C65D3B]/20">
            <h3 className="font-bold text-[#6B5E4F] mb-2 text-center">Actualizando Conocimiento</h3>
            <p className="text-sm text-gray-600 mb-4 text-center">{indexingProgress.message}</p>
            
            <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
              <div
                className="bg-[#C65D3B] h-full transition-all duration-300"
                style={{ width: `${(indexingProgress.current / indexingProgress.total) * 100}%` }}
              />
            </div>
            
            <p className="text-[10px] mt-3 text-right text-gray-400 font-mono">
              PÁGINA {indexingProgress.current} DE {indexingProgress.total}
            </p>
          </div>
        </div>
      )}

      <div className="bg-white shadow-[0_-2px_10px_rgba(0,0,0,0.05)]">
        <ChatInput onSendMessage={sendMessage} isLoading={isTyping || !!indexingProgress} />
        <p className="text-[10px] text-center text-[#6B5E4F] opacity-60 pb-2 bg-white">
          Privacidad absoluta: Sin nubes, sin rastros.
        </p>
      </div>
    </div>
  );
}