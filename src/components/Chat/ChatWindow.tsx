import React, { useState, useEffect, useRef } from 'react';
import { Header } from '@/components/Layout/Header';
import { ChatBubble } from '@/components/Chat/ChatBubble';
import { ChatInput } from '@/components/Chat/ChatInput';
import { saveMessage, getMessages, DBMessage } from '@/core/db/sqlite.service';
import { exportHistoryToPDF } from '@/core/export/export.service';
import { raicesConsole } from '@/services/raicesConsole';

export const ChatWindow: React.FC = () => {
  // --- ESTADO ---
  const [messages, setMessages] = useState<any[]>([]);
  const [corpus, setCorpus] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const scrollBox = useRef<HTMLDivElement>(null);

  // --- AUTO-SCROLL (Reemplaza nextTick) ---
  const scrollToBottom = () => {
    if (scrollBox.current) {
      scrollBox.current.scrollTo({
        top: scrollBox.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  };

  // Cada vez que cambien los mensajes o el estado de carga, bajamos el scroll
  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  // --- CARGA INICIAL (Reemplaza onMounted) ---
useEffect(() => {
  const loadInitialData = async () => {
    setIsLoading(true); // Bloqueamos el input al iniciar
    
    try {
      // 1. Cargar Historial
      const history = await getMessages(50);
      const formatted = history.map((m: DBMessage) => ({
        ...m,
        isUser: m.isUser === 1 
      }));
      setMessages(formatted);

      // 2. Cargar Conocimiento
      const response = await fetch('/assets/corpus/embeddings.json');
      const data = await response.json();
      setCorpus(data.embeddings);
      console.log("✅ RAÍCES: Memoria lista.");

    } catch (error) {
      console.error("❌ Error en carga inicial:", error);
    } finally {
      setIsLoading(false); // Desbloqueamos el input pase lo que pase
    }
  };

  loadInitialData();
}, []);

 // --- LÓGICA DE MENSAJERÍA REAL ---
const processUserMessage = async (text: string) => {
  const userMsg = {
    id: Date.now().toString(),
    text,
    isUser: true,
    timestamp: Date.now()
  };

  // 1. Guardar y mostrar mensaje del usuario
  setMessages(prev => [...prev, userMsg]);
  await saveMessage({ ...userMsg, isUser: true });

  setIsLoading(true);

  try {
    // 2. EJECUCIÓN DEL MOTOR RAÍCES (Búsqueda semántica + Filtro)
    // Usamos el 'corpus' que cargamos en el useEffect inicial
    const responseText = await raicesConsole.ask(text, corpus);

    const aiMsg = {
      id: (Date.now() + 1).toString(),
      text: responseText,
      isUser: false,
      timestamp: Date.now()
      sources: [principal.source]

    // 3. Guardar y mostrar respuesta de la IA
    setMessages(prev => [...prev, aiMsg]);
    await saveMessage({ ...aiMsg, isUser: false });
    setIsLoading(false);

  } catch (error) {
    console.error("❌ Error en flujo de IA:", error);
    setIsLoading(false);
  }
};

  const handleExport = () => exportHistoryToPDF({ shareAfterExport: true });

  return (
    <div className="chat-window">
      <Header 
  onExport={handleExport} 
  onUpdateCorpus={() => {}} 
  onBack={() => {}} 
  isConfigView={false} 
/>

      <div className="messages-container" ref={scrollBox}>
        {messages.map((msg) => (
          <ChatBubble key={msg.id} message={msg} />
        ))}
        
        {isLoading && (
          <div className="typing-indicator">RAÍCES está analizando...</div>
        )}
      </div>

      <ChatInput isLoading={isLoading} onSendMessage={processUserMessage} />

      <style dangerouslySetInnerHTML={{ __html: `
        .chat-window { 
          display: flex; 
          flex-direction: column; 
          height: 100vh; 
          background-color: #F5F1E8; 
        }
        .messages-container {
          flex: 1;
          overflow-y: auto;
          padding: 20px;
          display: flex;
          flex-direction: column;
        }
        .typing-indicator {
          font-size: 0.8rem;
          color: #C65D3B;
          font-style: italic;
          margin-top: 10px;
          align-self: flex-start;
        }
      `}} />
    </div>
  );
};