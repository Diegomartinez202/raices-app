import React, { useState } from 'react';
 import { unlockWithPIN } from '@/core/session/session.service';

const LockScreen: React.FC = () => {
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);

const handleUnlock = async () => {
  // Ahora usamos la nueva función que valida Y desbloquea
  const success = await unlockWithPIN(pin); 
  
  if (success) {
    setError(false);
    // El sistema (useRaicesSystem) detectará el cambio por el notifyStateChange()
  } else {
    setError(true);
    setPin('');
  }
};

  return (
    <div className="flex flex-col items-center justify-center h-screen bg-[#F5F1E8] p-6 text-center">
      {/* Icono de Candado Soberano */}
      <div className={`w-20 h-20 rounded-full mb-8 flex items-center justify-center border-2 transition-all ${error ? 'border-red-500 animate-shake' : 'border-[#C65D3B]'}`}>
        <span className="text-3xl">🔒</span>
      </div>

      <h2 className="text-[#C65D3B] font-bold text-2xl mb-2 tracking-tight">BÓVEDA BLOQUEADA</h2>
      <p className="text-[#6B5E4F] text-sm mb-8">Ingrese su PIN de seguridad para acceder a RAÍCES</p>

      {/* Input de PIN */}
      <input
        type="password"
        value={pin}
        onChange={(e) => setPin(e.target.value)}
        placeholder="••••"
        className={`bg-white border-2 rounded-xl p-4 text-center text-2xl tracking-[1em] w-48 focus:outline-none transition-colors ${error ? 'border-red-500 text-red-500' : 'border-[#D4A373]/30 text-[#6B5E4F]'}`}
        maxLength={4}
      />

      <button
        onClick={handleUnlock}
        disabled={pin.length < 4}
        className="mt-8 bg-[#C65D3B] text-white font-bold py-3 px-10 rounded-xl shadow-lg active:scale-95 disabled:opacity-50 transition-all"
      >
        DESBLOQUEAR
      </button>

      <p className="text-[10px] mt-12 opacity-40 uppercase tracking-[0.2em] text-[#6B5E4F]">
        Tecnología Soberana - JEP
      </p>
    </div>
  );
};

export default LockScreen;