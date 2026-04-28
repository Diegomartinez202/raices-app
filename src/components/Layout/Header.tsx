import React, { useState } from 'react';
import { clearAllHistory } from '@/core/db/sqlite.service';
import { shouldUpdateCorpus } from '@/core/config/config.service';
interface HeaderProps {
  onExport: () => void;
  onUpdateCorpus: () => void;
  onBack: () => void;
  isConfigView: boolean;
}

export const Header: React.FC<HeaderProps> = ({ 
  onExport, 
  onUpdateCorpus, 
  onBack, 
  isConfigView 
}) => {
  const [clickCount, setClickCount] = useState(0);
  const [lastClickTime, setLastClickTime] = useState(0);

  // Protocolo de Pánico: 3 clics rápidos en el nombre "RAÍCES"
  const handleLogoClick = async () => {
    const now = Date.now();
    
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
    <>
      <header className="bg-[#C65D3B] text-white p-3 px-5 flex justify-between items-center select-none shadow-md">
        {/* ... (Todo tu código anterior del header se mantiene igual) ... */}
        
        <div className="flex items-center gap-3">
          {isConfigView ? (
            <button onClick={onBack} className="text-xl hover:bg-white/10 p-1 rounded-full transition-colors">⬅</button>
          ) : (
            <div className="cursor-pointer active:opacity-70" onClick={handleLogoClick}>
              <h1 className="m-0 text-xl font-bold tracking-tight">RAÍCES</h1>
            </div>
          )}
          {isConfigView && <span className="font-bold">Configuración</span>}
        </div>

        <div className="flex gap-3">
           {/* ... Tus botones de Exportar y Ajustes ... */}
           {!isConfigView ? (
              <>
                <button onClick={onExport} className="bg-white/15 rounded-full w-9 h-9 flex items-center justify-center hover:bg-white/25">
                   <span style={{ fontSize: '1.2rem' }}>📄</span>
                </button>
                <button onClick={onUpdateCorpus} className="bg-white/15 rounded-full w-9 h-9 flex items-center justify-center hover:bg-white/25">
                   <span style={{ fontSize: '1.2rem' }}>⚙️</span>
                </button>
              </>
           ) : (
              <button onClick={onUpdateCorpus} className="bg-white/15 rounded-full w-9 h-9 flex items-center justify-center hover:bg-white/25">
                 <span style={{ fontSize: '1.2rem' }}>🔄</span>
              </button>
           )}
        </div>
      </header>

      {/* --- MEJORA INTEGRADA: BANNER DE ACTUALIZACIÓN --- */}
      {!isConfigView && shouldUpdateCorpus() && (
        <div 
          onClick={onUpdateCorpus}
          className="bg-[#FEF3C7] border-b border-[#D97706]/30 p-3 flex items-center gap-3 cursor-pointer hover:bg-[#FDE68A] transition-colors animate-pulse"
        >
          <span className="text-lg">⚠️</span>
          <div className="flex-1">
            <p className="text-[10px] text-[#92400E] font-bold uppercase tracking-widest leading-none">
              Actualización Recomendada
            </p>
            <p className="text-[10px] text-[#6B5E4F] mt-1 leading-tight">
              Más de 30 días sin actualizar la jurisprudencia JEP. Toca aquí para poner al día el corpus.
            </p>
          </div>
          <span className="text-[#D97706] text-xs">➔</span>
        </div>
      )}
    </>
  );
};