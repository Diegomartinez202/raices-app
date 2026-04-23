import React, { useState } from 'react';

interface ChatInputProps {
  onSendMessage: (text: string) => void;
  isLoading: boolean;
}

export const ChatInput: React.FC<ChatInputProps> = ({ isLoading, onSendMessage }) => {
  const [texto, setTexto] = useState('');

  // En React, manejar el envío mediante un Form es la mejor práctica
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault(); // Evita que la página se recargue
    if (texto.trim() !== '' && !isLoading) {
      onSendMessage(texto);
      setTexto('');
    }
  };

  return (
    <form 
      onSubmit={handleSubmit}
      className="flex gap-2 p-4 bg-white border-t border-[#D4A373]/20"
    >
      <input
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        type="text"
        disabled={isLoading}
        placeholder={isLoading ? 'RAÍCES está pensando...' : 'Escribe tu pregunta aquí...'}
        className="flex-1 px-4 py-3 rounded-full border border-[#D4A373] text-base outline-none focus:border-[#C65D3B] disabled:bg-[#F5F1E8] transition-all"
      />
      
      <button 
        type="submit"
        disabled={isLoading || !texto.trim()}
        className="px-6 rounded-full font-bold text-white transition-all bg-[#C65D3B] disabled:bg-[#6B5E4F] disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
      >
        {isLoading ? (
          <span className="animate-pulse">...</span>
        ) : (
          "Enviar"
        )}
      </button>
    </form>
  );
};