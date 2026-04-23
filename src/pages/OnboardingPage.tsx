import React from 'react';

const OnboardingPage: React.FC<{ onComplete: () => void }> = ({ onComplete }) => {
  return (
    <div className="flex flex-col h-screen bg-[#F5F1E8] p-8 justify-between">
      <div className="mt-12 space-y-6">
        <div className="bg-[#C65D3B] w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg">
          {/* Logo SVG de Raíces */}
          <svg width="32" height="32" viewBox="0 0 40 40" fill="none">
            <path d="M20 30V18M20 18C20 18 20 12 26 10M20 18C20 18 20 12 14 10" stroke="#F5F1E8" strokeWidth="3" strokeLinecap="round"/>
          </svg>
        </div>
        
        <h1 className="text-3xl font-bold text-[#2D2A26] leading-tight">
          Tu información es <span className="text-[#C65D3B]">Soberana</span>
        </h1>
        
        <div className="space-y-4 text-[#6B5E4F]">
          <p className="flex items-start gap-3">
            <span className="text-[#588157] font-bold">✓</span>
            <span><strong>Sin Internet:</strong> RAÍCES funciona totalmente offline para proteger tu ubicación.</span>
          </p>
          <p className="flex items-start gap-3">
            <span className="text-[#588157] font-bold">✓</span>
            <span><strong>Privacidad:</strong> Tus conversaciones se cifran y guardan solo en este dispositivo.</span>
          </p>
          <p className="flex items-start gap-3">
            <span className="text-[#588157] font-bold">✓</span>
            <span><strong>Derechos:</strong> Información basada en protocolos oficiales de la JEP y MinCiencias.</span>
          </p>
        </div>
      </div>

      <button 
        onClick={onComplete}
        className="w-full bg-[#588157] text-white py-4 rounded-xl font-bold shadow-md active:scale-95 transition-transform"
      >
        COMENZAR ORIENTACIÓN
      </button>
    </div>
  );
};

export default OnboardingPage;