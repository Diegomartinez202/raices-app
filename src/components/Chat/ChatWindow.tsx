import React, { useState, useEffect, useRef } from 'react';
import { Header } from '@/components/Layout/Header';
import { ChatBubble } from '@/components/Chat/ChatBubble';
import { ChatInput } from '@/components/Chat/ChatInput';
import { saveMessage, getMessages, DBMessage } from '@/core/db/sqlite.service';
import { exportHistoryToPDF } from '@/core/export/export.service';

export const ChatWindow: React.FC = () => {
  // --- ESTADO ---
  const [messages, setMessages] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
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
    const loadHistory = async () => {
      const history = await getMessages(50);
      const formatted = history.map((m: DBMessage) => ({
        ...m,
        isUser: m.isUser === 1 // Conversión SQLite a Booleano
      }));
      setMessages(formatted);
    };
    loadHistory();
  }, []);

  // --- LÓGICA DE MENSAJERÍA ---
  const processUserMessage = async (text: string) => {
    const userMsg = {
      id: Date.now().toString(),
      text,
      isUser: true,
      timestamp: Date.now()
    };

    // Actualizar UI y guardar en SQLCipher
    setMessages(prev => [...prev, userMsg]);
    await saveMessage({ ...userMsg, isUser: true }); // Adaptado para tu servicio

    setIsLoading(true);

    try {
      // Simulación de IA (Aquí conectarás tu RAG)
      setTimeout(async () => {
        const aiMsg = {
          id: (Date.now() + 1).toString(),
          text: "He recibido tu consulta. Estoy procesando la información desde el corpus de la JEP...",
          isUser: false,
          timestamp: Date.now()
        };
        
        setMessages(prev => [...prev, aiMsg]);
        await saveMessage({ ...aiMsg, isUser: false });
        setIsLoading(false);
      }, 1500);

    } catch (error) {
      console.error("Error en flujo de IA:", error);
      setIsLoading(false);
    }
  };

  const handleExport = () => exportHistoryToPDF({ shareAfterExport: true });

  return (
    <div className="chat-window">
      <Header onExport={handleExport} />

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