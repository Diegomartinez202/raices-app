import { useRaicesSystem } from '@/hooks/useRaicesSystem';
import { useChat } from '@/hooks/useChat';
import { Header } from '@/components/Layout/Header';
import { ChatInput } from '@/components/Chat/ChatInput';
import { ChatBubble } from '@/components/Chat/ChatBubble';
import { LoadingScreen } from '@/components/UI/LoadingScreen';
import { PinSetup } from '@/components/Auth/PinSetup';
import LockScreen from '@/components/UI/LockScreen';

export default function App() {
  // Hook de Sistema (Seguridad e Infraestructura)
  const { isSystemLoading, loadingMsg, isLocked, hasPinConfigured } = useRaicesSystem();
  
  // Hook de Chat (Mensajes y Clave Dinámica)
  const { messages, isTyping, sendMessage } = useChat();

  if (isSystemLoading) return <LoadingScreen msg={loadingMsg} />;
  if (!hasPinConfigured) return <PinSetup />;
  if (isLocked) return <LockScreen />;

  return (
    <div className="flex flex-col h-screen bg-[#F5F1E8]">
      <Header onExport={() => {}} />
      
<main className="flex-1 overflow-y-auto p-4 space-y-4">
  {messages.map((msg) => (
    <ChatBubble 
      key={msg.id} 
      message={{
        ...msg,
        isUser: Boolean(msg.isUser) // Convierte el 1/0 de SQLite a true/false
      }} 
    />
  ))}
  {isTyping && <div className="text-xs text-[#C65D3B] animate-pulse">RAÍCES está pensando...</div>}
</main>

<ChatInput onSendMessage={sendMessage} isLoading={isTyping} />
    </div>
  );
}