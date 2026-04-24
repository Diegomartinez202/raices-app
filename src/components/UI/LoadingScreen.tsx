import React from 'react';

interface LoadingScreenProps {
  msg: string;
  progress?: number; // Añadimos soporte para progreso
}

export const LoadingScreen: React.FC<LoadingScreenProps> = ({ msg, progress = 0 }) => {
  return (
    <div className="flex h-screen items-center justify-center bg-[#F5F1E8]">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-[#C65D3B] tracking-widest mb-4">RAÍCES</h1>
        <p className="text-[#D4A373] font-medium animate-pulse">{msg}</p>
        
        {/* Barra de progreso idónea para MinCiencias */}
        <div className="w-64 h-1.5 bg-[#D4A37333] rounded-full mt-4 overflow-hidden">
          <div 
            className="h-full bg-[#C65D3B] transition-all duration-500 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
        
        <p className="mt-8 text-[10px] text-[#A68A64] uppercase tracking-tighter">
          Infraestructura de IA Soberana - Nodo Local
        </p>
      </div>
    </div>
  );
};