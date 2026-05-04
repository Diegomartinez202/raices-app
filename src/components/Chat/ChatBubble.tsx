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

  // NUEVA MEJORA: Función para resaltar leyes y decretos con colores de seguridad (Verde Bosque)
  const renderFormattedText = (text: string) => {
    return text.split('\n').map((line, i) => {
      // Si la línea contiene palabras legales, le damos un estilo de fuente segura y fuerte
      const isLegalRef = /Auto|Ley|Decreto|Sentencia|Corte|Artículo|Párrafo/i.test(line);
      
      return (
        <span 
          key={i} 
          style={{ 
            color: isLegalRef ? "#2D4F1E" : "inherit", 
            fontWeight: isLegalRef ? "700" : "normal" 
          }}
        >
          {line}
          <br />
        </span>
      );
    });
  };

  return (
    <div className={`bubble-wrapper ${message.isUser ? 'user-align' : 'ai-align'}`}>
      <div className={`bubble ${message.isUser ? 'user-style' : 'ai-style'}`}>
        
        {/* Texto del mensaje con el nuevo formateo de leyes integrado */}
        <p className="text">
          {renderFormattedText(message.text)}
        </p>
        
        {/* Lógica de fuentes (SourceBadge) para respuestas de la IA */}
        {!message.isUser && message.sources?.map((src, index) => (
          <SourceBadge key={index} source={src} />
        ))}

        {/* Hora del mensaje */}
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
          position: relative;
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

        .text { 
          margin: 0; 
          font-size: 1rem; 
          word-wrap: break-word;
        }
        
        .time { 
          font-size: 0.7rem; 
          margin-top: 6px; 
          opacity: 0.7; 
          font-style: italic;
        }
        
        .text-right { text-align: right; }
        .text-left { text-align: left; }
      `}} />
    </div>
  );
};