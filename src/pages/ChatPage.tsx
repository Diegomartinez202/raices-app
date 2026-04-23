import React from 'react';
// Cambiamos el nombre para que coincida con cómo lo usas abajo
import ChatInput from '@/components/Chat/ChatInput.vue'; 
import ChatBubble from '@/components/Chat/ChatBubble.vue';

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
  isLoading?: boolean; // Añadimos esto para manejar el estado de carga
}

const ChatPage: React.FC<ChatPageProps> = ({ messages, onSend, isLoading = false }) => {
  return (
    <div className="flex flex-col h-full bg-[#F5F1E8]">
      {/* Área de Mensajes */}
      <main className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg) => (
          <ChatBubble key={msg.id} message={msg} />
        ))}
      </main>
      
      {/* Footer con el Input y botones */}
      <footer className="p-4 bg-white border-t border-[#D4A373]/20">
        {/* Aquí usamos por fin ChatInput y onSend */}
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