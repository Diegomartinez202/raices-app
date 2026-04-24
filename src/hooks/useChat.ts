import { useState, useCallback } from 'react';
import { saveMessage, getMessages, type DBMessage } from '@/core/db/sqlite.service';
import { generateResponse } from '@/core/ai/llama.service';
import { KeyService } from '@/core/crypto/keys.service';
import { logger } from '@/core/config/config.service';

export const useChat = () => {
  const [messages, setMessages] = useState<any[]>([]);
  const [isTyping, setIsTyping] = useState(false);

  /**
   * CARGA DE HISTORIAL: Formatea datos de DB a UI
   */
  const loadHistory = useCallback(async () => {
    try {
      const history = await getMessages();
      const formatted = history.map(msg => ({
        ...msg,
        isUser: Boolean(msg.isUser),
        // Formateo de fecha para la interfaz
        displayDate: new Date(msg.timestamp).toLocaleString('es-CO', { 
          hour12: true, 
          hour: '2-digit', 
          minute: '2-digit' 
        })
      }));
      setMessages(formatted);
    } catch (error) {
      logger.error('[DB] Error cargando historial:', error);
    }
  }, []);

  /**
   * ENVÍO DE MENSAJE: Gestión de Seguridad y Persistencia
   */
  const sendMessage = async (text: string) => {
    if (!text.trim()) return;

    setIsTyping(true);
    
    // 1. PROTOCOLO DE SEGURIDAD: Obtención de Llave Dinámica
    const sessionKey = await KeyService.obtenerClaveDinamica();
    
    // El sessionId es requerido por tu interfaz DBMessage
    const currentSessionId = `SESSION-${sessionKey.substring(0, 8)}`;

    // 2. PREPARACIÓN MENSAJE USUARIO
    const timestampNow = Date.now();
    const userMsgUI = {
      id: timestampNow.toString(),
      text,
      isUser: true,
      timestamp: timestampNow,
      displayDate: new Date(timestampNow).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })
    };

    const userMsgDB: DBMessage = {
      id: userMsgUI.id,
      text: userMsgUI.text,
      isUser: 1, 
      timestamp: userMsgUI.timestamp,
      sessionId: currentSessionId // Inyectamos el sessionId requerido
    };

    setMessages(prev => [...prev, userMsgUI]);

    try {
      // 3. PERSISTENCIA CIFRADA
      await saveMessage(userMsgDB as any);

      // 4. RESPUESTA DE INTELIGENCIA ARTIFICIAL
      const aiResponseText = await generateResponse(text);
      
      const aiTimestamp = Date.now();
      const aiMsgUI = {
        id: aiTimestamp.toString(),
        text: aiResponseText,
        isUser: false,
        timestamp: aiTimestamp,
        displayDate: new Date(aiTimestamp).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })
      };

      const aiMsgDB: DBMessage = {
        id: aiMsgUI.id,
        text: aiMsgUI.text,
        isUser: 0,
        timestamp: aiMsgUI.timestamp,
        sessionId: currentSessionId // Trazabilidad de la respuesta
      };

      setMessages(prev => [...prev, aiMsgUI]);
      await saveMessage(aiMsgDB as any);

    } catch (error) {
      logger.error('[SEGURIDAD/AI] Fallo en cadena de procesamiento:', error);
    } finally {
      setIsTyping(false);
    }
  };

  // RETORNO DE ESTADOS Y FUNCIONES (Asegura que App.tsx no reciba 'void')
  return {
    messages,
    isTyping,
    sendMessage,
    loadHistory
  };
};