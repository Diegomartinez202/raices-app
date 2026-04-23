import React, { useEffect, useState } from 'react';
import { clearAllHistory } from '@/core/db/sqlite.service';

interface PanicModalProps {
  onClose?: () => void;
}

export const PanicModal: React.FC<PanicModalProps> = ({ onClose }) => {
  const [status, setStatus] = useState<'counting' | 'wiping' | 'done'>('counting');
  const [countdown, setCountdown] = useState(3);

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else if (countdown === 0 && status === 'counting') {
      setStatus('wiping');
      executeSecureWipe();
    }
  }, [countdown, status]); // Añadido status a las dependencias por seguridad

  const executeSecureWipe = async () => {
    try {
      console.warn('[RAÍCES] Iniciando borrado seguro de bóveda...');
      await clearAllHistory(); 
      await new Promise(res => setTimeout(res, 1500)); 
      
      setStatus('done');
      
      setTimeout(() => {
        window.location.href = "https://www.google.com";
      }, 1000);

    } catch (error) {
      console.error('[RAÍCES ERROR PANIC]', error);
      alert('Error en el borrado. Por favor, desinstale la aplicación manualmente.');
      window.location.href = "https://www.google.com";
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-6 z-[9999] backdrop-blur-sm">
      <div className="bg-[#FAF8F5] p-8 rounded-2xl shadow-2xl border-2 border-[#C65D3B]/20 w-full max-w-md text-center">
        
        <div className={`mx-auto w-16 h-16 rounded-full flex items-center justify-center mb-6 border-4 transition-colors ${status === 'done' ? 'border-[#588157] bg-[#588157]/10' : 'border-[#C65D3B] bg-[#C65D3B]/10'}`}>
          <span className={`text-3xl ${status === 'done' ? 'text-[#588157]' : 'text-[#C65D3B]'}`}>
            {status === 'done' ? '✓' : '!'}
          </span>
        </div>

        {status === 'counting' && (
          <>
            <h2 className="text-[#C65D3B] text-2xl font-bold mb-3 tracking-tight">
              PROTOCOLO DE SEGURIDAD
            </h2>
            <p className="text-[#6B5E4F] mb-6 text-sm">
              Se ha detectado una acción de pánico. Toda la información local será eliminada en:
            </p>
            <div className="text-6xl font-extrabold text-[#C65D3B] animate-pulse">
              {countdown}
            </div>
            {onClose && (
              <button 
                onClick={onClose}
                className="mt-6 text-[#6B5E4F] text-xs underline opacity-50 hover:opacity-100"
              >
                Cancelar acción
              </button>
            )}
          </>
        )}

        {status === 'wiping' && (
          <>
            <h2 className="text-[#C65D3B] text-2xl font-bold mb-3 tracking-tight">
              BORRANDO INFORMACIÓN...
            </h2>
            <div className="flex justify-center my-8">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#C65D3B]"></div>
            </div>
            <p className="text-[#C65D3B] text-sm font-medium italic">
              Ejecutando limpieza física de la base de datos...
            </p>
          </>
        )}

        {status === 'done' && (
          <>
            <h2 className="text-[#588157] text-2xl font-bold mb-3 tracking-tight">
              BÓVEDA PROTEGIDA
            </h2>
            <p className="text-[#6B5E4F] mb-6 text-sm">
              La información ha sido eliminada. La aplicación se cerrará por seguridad.
            </p>
            <div className="h-12 w-12 mx-auto rounded-full bg-[#588157]/20 flex items-center justify-center">
                <span className="text-2xl text-[#588157]">🔒</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
};