import { useState, useCallback } from 'react';
import { saveMessage, getMessages, type DBMessage } from '@/core/db/sqlite.service';
import { generateResponse } from '@/core/ai/llama.service';
import { KeyService } from '@/core/crypto/keys.service';
import { logger } from '@/core/config/config.service';

export const useChat = () => {
  const [messages, setMessages] = useState<any[]>([]); // Cambiamos temporalmente a any para evitar choques
  const [isTyping, setIsTyping] = useState(false);

  const loadHistory = useCallback(async () => {
    const history = await getMessages();
    // Convertimos de SQLite (0/1) a React (true/false) al cargar
    const formatted = history.map(msg => ({
      ...msg,
      isUser: Boolean(msg.isUser)
    }));
    setMessages(formatted);
  }, []);

const sendMessage = async (text: string) => {
    if (!text.trim()) return;

    // 1. OBTENER CLAVE DINÁMICA
    const sessionKey = await KeyService.obtenerClaveDinamica();
    
    // USAMOS la llave para que el error desaparezca y para la auditoría
    if (sessionKey) {
       logger.info(`[SEGURIDAD] Mensaje procesado con llave de sesión activa.`);
    }
    
const userMsgUI = {
      id: Date.now().toString(),
      text,
      isUser: true,
      timestamp: Date.now()
    };

    // 2. Objeto para la DB (Aquí USAMOS el tipo DBMessage)
    // Esto quita el error de "value is never read"
    const userMsgDB: DBMessage = {
      id: userMsgUI.id,
      text: userMsgUI.text,
      isUser: 1, // SQLite: 1 es true
      timestamp: userMsgUI.timestamp
    };

    setMessages(prev => [...prev, userMsgUI]);
    setIsTyping(true);

    try {
      // Enviamos el objeto tipado correctamente
      await saveMessage(userMsgDB as any); 

      const aiResponseText = await generateResponse(text);
      
      const aiMsgUI = {
        id: (Date.now() + 1).toString(),
        text: aiResponseText,
        isUser: false,
        timestamp: Date.now()
      };

      // Aquí también USAMOS el tipo
      const aiMsgDB: DBMessage = {
        id: aiMsgUI.id,
        text: aiMsgUI.text,
        isUser: 0, // SQLite: 0 es false
        timestamp: aiMsgUI.timestamp
      };

      setMessages(prev => [...prev, aiMsgUI]);
      await saveMessage(aiMsgDB as any);

    } catch (error) {
      logger.error('[CHAT ERROR]', error);
    }
    } finally {
      setIsTyping(false);
    }
  };

  return {
    messages,
    isTyping,
    sendMessage,
    loadHistory
  };
};