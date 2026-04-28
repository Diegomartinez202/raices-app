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
<div className="flex flex-col items-center justify-center h-screen bg-raices-crema p-6 text-center">
      
      {/* EL LOGO SOBERANO */}
      <div className={`mb-6 transition-all duration-300 ${error ? 'animate-shake' : 'hover:scale-105'}`}>
        <img 
          src="/icon/logo.png" 
          alt="RAÍCES" 
          className="w-28 h-28 object-contain drop-shadow-xl rounded-2xl border-2 border-raices-terracota/10"
        />
      </div>

      <h2 className="text-raices-terracota font-bold text-3xl mb-1 tracking-tighter">RAÍCES</h2>
      <p className="text-[10px] text-raices-soft uppercase tracking-[0.4em] mb-8 font-black opacity-80">
        Bóveda de Seguridad Local
      </p>

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

<p className="mt-12 text-[9px] text-raices-soft opacity-40 tracking-widest uppercase font-bold">
        Justicia y Verdad · 2026
      </p>
    </div>
  );
};

export default LockScreen;