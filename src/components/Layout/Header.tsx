import React, { useState } from 'react';
import { clearAllHistory } from '@/core/db/sqlite.service';

interface HeaderProps {
  onExport: () => void;
  onUpdateCorpus: () => void; // Esta es la conexión con App.tsx
}

export const Header: React.FC<HeaderProps> = ({ onExport, onUpdateCorpus }) => {
  const [clickCount, setClickCount] = useState(0);
  const [lastClickTime, setLastClickTime] = useState(0);

  const handleLogoClick = async () => {
    const now = Date.now();
    
    // Lógica de Pánico: 3 clics en menos de 1 segundo
    if (now - lastClickTime > 1000) {
      setClickCount(1);
    } else {
      const newCount = clickCount + 1;
      setClickCount(newCount);
      
      if (newCount === 3) {
        console.warn('[RAÍCES] ¡ACTIVADO PROTOCOLO DE PÁNICO!');
        await clearAllHistory();
        alert("Información protegida. La aplicación se cerrará.");
        window.location.href = "https://www.google.com";
      }
    }
    setLastClickTime(now);
  };

  return (
    <header className="bg-[#C65D3B] text-white p-3 px-5 flex justify-between items-center select-none shadow-md">
      {/* Logo con Protocolo de Pánico */}
      <div className="cursor-pointer" onClick={handleLogoClick}>
        <h1 className="m-0 text-xl font-bold tracking-tight">RAÍCES</h1>
      </div>
      
      <div className="flex gap-3">
        {/* NUEVO: Botón para actualizar Base de Conocimiento (Corpus) */}
        <button 
          onClick={onUpdateCorpus}
          title="Actualizar Conocimiento"
          className="bg-white/15 border-none rounded-full w-9 h-9 flex items-center justify-center hover:bg-white/25 active:scale-90 transition-all"
        >
          <span style={{ fontSize: '1.2rem' }}>🔄</span>
        </button>

        {/* Botón de Exportar Historial */}
        <button 
          onClick={onExport}
          title="Exportar Historial"
          className="bg-white/15 border-none rounded-full w-9 h-9 flex items-center justify-center hover:bg-white/25 active:scale-90 transition-all"
        >
          <span style={{ fontSize: '1.2rem' }}>📄</span>
        </button>
      </div>
    </header>
  );
};