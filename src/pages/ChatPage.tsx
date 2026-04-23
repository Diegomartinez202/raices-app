import React from 'react';
// IMPORTANTE: Quitamos el .vue y usamos las llaves { } si los exportaste como const
import { ChatBubble } from '@/components/Chat/ChatBubble';
import { ChatInput } from '@/components/Chat/ChatInput';

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
  sources?: string[];
}

interface ChatPageProps {
  messages: Message[];
  onSend: (text: string) => void;
  isLoading?: boolean;
}

const ChatPage: React.FC<ChatPageProps> = ({ messages, onSend, isLoading = false }) => {
  return (
    <div className="flex flex-col h-full bg-[#F5F1E8]">
      {/* Área de Mensajes */}
      <main className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg) => (
          // Usamos el componente ya migrado a React
          <ChatBubble key={msg.id} message={msg} />
        ))}
        
        {/* Indicador de carga visual para el usuario */}
        {isLoading && (
          <div className="text-[10px] text-[#C65D3B] italic animate-pulse">
            RAÍCES está consultando el corpus...
          </div>
        )}
      </main>
      
      {/* Footer con el Input y lema de soberanía */}
      <footer className="p-4 bg-white border-t border-[#D4A373]/20">
        <ChatInput 
          onSendMessage={onSend} 
          isLoading={isLoading} 
        />
        
        <p className="text-[8px] text-center text-[#6B5E4F]/50 mt-2 italic">
          "Información soberana para la reconstrucción del tejido social"
        </p>
      </footer>
    </div>
  );
};

export default ChatPage;