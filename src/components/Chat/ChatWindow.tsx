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

  // --- AUTO-SCROLL ---
  const scrollToBottom = () => {
    if (scrollBox.current) {
      scrollBox.current.scrollTo({
        top: scrollBox.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  // --- CARGA INICIAL ---
  useEffect(() => {
    const loadInitialData = async () => {
      setIsLoading(true);
      try {
        const history = await getMessages(50);
        const formatted = history.map((m: DBMessage) => ({
          ...m,
          isUser: m.isUser === 1 
        }));
        setMessages(formatted);

        const response = await fetch('/assets/corpus/embeddings.json');
        const data = await response.json();
        setCorpus(data.embeddings);
        console.log("✅ RAÍCES: Memoria lista.");
      } catch (error) {
        console.error("❌ Error en carga inicial:", error);
      } finally {
        setIsLoading(false);
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

    setMessages(prev => [...prev, userMsg]);
    await saveMessage({ ...userMsg, isUser: true } as any);
    setIsLoading(true);

    try {
      // 2. EJECUCIÓN DEL MOTOR RAÍCES
      const responseText = await raicesConsole.ask(text, corpus);

      // 💡 CORRECCIÓN AQUÍ: Se cerró correctamente el objeto aiMsg y se eliminó la variable 'principal' no definida
      const aiMsg = {
        id: (Date.now() + 1).toString(),
        text: responseText,
        isUser: false,
        timestamp: Date.now(),
        sources: [] // Se inicializa vacío para evitar error de 'principal'
      };

      // 3. Guardar y mostrar respuesta
      setMessages(prev => [...prev, aiMsg]);
      await saveMessage({ ...aiMsg, isUser: false } as any);
    } catch (error) {
      console.error("❌ Error en flujo de IA:", error);
    } finally {
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