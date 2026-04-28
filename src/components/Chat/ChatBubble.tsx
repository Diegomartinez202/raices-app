import React from 'react';
import { SourceBadge } from './SourceBadge';

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: number | Date;
  sources?: string[];
}

interface ChatBubbleProps {
  message: Message;
}

export const ChatBubble: React.FC<ChatBubbleProps> = ({ message }) => {
  
  // Función para formatear la hora (equivalente al formatTime de Vue)
  const formatTime = (ts: number | Date) => {
    const date = typeof ts === 'number' ? new Date(ts) : ts;
    return date.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className={`bubble-wrapper ${message.isUser ? 'user-align' : 'ai-align'}`}>
      <div className={`bubble ${message.isUser ? 'user-style' : 'ai-style'}`}>
        <p className="text">{message.text}</p>
        
        {/* Lógica condicional: en React usamos && */}
{!message.isUser && message.sources?.map((src, index) => (
  <SourceBadge key={index} source={src} />
))}

        <p className={`time ${message.isUser ? 'text-right' : 'text-left'}`}>
          {formatTime(message.timestamp)}
        </p>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .bubble-wrapper { display: flex; width: 100%; margin-bottom: 12px; }
        .user-align { justify-content: flex-end; }
        .ai-align { justify-content: flex-start; }

        .bubble {
          max-width: 85%;
          padding: 12px 16px;
          border-radius: 18px;
          line-height: 1.5;
        }

        .user-style {
          background-color: #C65D3B;
          color: white;
          border-bottom-right-radius: 4px;
        }

        .ai-style {
          background-color: white;
          color: #2D2A26;
          border: 1px solid rgba(212, 163, 115, 0.3);
          border-bottom-left-radius: 4px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.05);
        }

        .text { margin: 0; font-size: 1rem; }
        .time { font-size: 0.7rem; margin-top: 4px; opacity: 0.7; }
        .text-right { text-align: right; }
        .text-left { text-align: left; }
      `}} />
    </div>
  );
};