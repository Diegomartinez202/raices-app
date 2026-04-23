import React from 'react';

interface OnboardingProps {
  onComplete: () => void;
}

const OnboardingPage: React.FC<OnboardingProps> = ({ onComplete }) => {
  return (
    <div className="flex flex-col h-screen bg-[#F5F1E8] p-8 justify-between">
      <div className="mt-12 space-y-6">
        {/* Contenedor del Logo con sombra suave */}
        <div className="bg-[#C65D3B] w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg animate-bounce-slow">
          {/* Logo SVG de Raíces */}
          <svg width="32" height="32" viewBox="0 0 40 40" fill="none">
            <path 
              d="M20 30V18M20 18C20 18 20 12 26 10M20 18C20 18 20 12 14 10" 
              stroke="#F5F1E8" 
              strokeWidth="3" 
              strokeLinecap="round"
            />
          </svg>
        </div>
        
        <h1 className="text-3xl font-bold text-[#2D2A26] leading-tight">
          Tu información es <br/>
          <span className="text-[#C65D3B]">Soberana</span>
        </h1>
        
        <div className="space-y-4 text-[#6B5E4F]">
          <div className="flex items-start gap-3">
            <div className="mt-1 bg-[#588157]/20 p-1 rounded-full">
              <span className="text-[#588157] text-xs font-bold">✓</span>
            </div>
            <p className="text-sm">
              <strong>Sin Internet:</strong> RAÍCES funciona totalmente offline para proteger tu ubicación y anonimato.
            </p>
          </div>

          <div className="flex items-start gap-3">
            <div className="mt-1 bg-[#588157]/20 p-1 rounded-full">
              <span className="text-[#588157] text-xs font-bold">✓</span>
            </div>
            <p className="text-sm">
              <strong>Privacidad:</strong> Tus conversaciones se cifran bajo el estándar militar SQLCipher en este dispositivo.
            </p>
          </div>

          <div className="flex items-start gap-3">
            <div className="mt-1 bg-[#588157]/20 p-1 rounded-full">
              <span className="text-[#588157] text-xs font-bold">✓</span>
            </div>
            <p className="text-sm">
              <strong>Fuentes Oficiales:</strong> Respuestas basadas en el corpus de la JEP y protocolos de justicia transicional.
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <p className="text-[10px] text-center text-[#6B5E4F]/60">
          Al continuar, aceptas el tratamiento local de datos bajo la Ley 1581.
        </p>
        <button 
          onClick={onComplete}
          className="w-full bg-[#588157] hover:bg-[#4a6d49] text-white py-4 rounded-xl font-bold shadow-md active:scale-95 transition-all duration-200"
        >
          COMENZAR ORIENTACIÓN
        </button>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes bounce-slow {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-5px); }
        }
        .animate-bounce-slow {
          animation: bounce-slow 3s ease-in-out infinite;
        }
      `}} />
    </div>
  );
};

export default OnboardingPage;