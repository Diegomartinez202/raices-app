import React, { useState } from 'react';
import { useRaicesSystem } from '@/hooks/useRaicesSystem';

export const SetupPin: React.FC = () => {
  const [pin, setPin] = useState('');
  const { setupSecurity } = useRaicesSystem();

  const handleCreatePin = async () => {
    if (pin.length === 6) {
      const exito = await setupSecurity(pin);
      if (exito) {
        // Aquí rediriges al usuario al Chat o Dashboard
        window.location.reload(); // O usa tu router: navigate('/chat');
      }
    }
  };

  return (
    <div className="p-6 text-center">
      <h2 className="text-[#C65D3B] font-bold text-xl">Configura tu Bóveda</h2>
      <p className="text-sm mb-4">Crea un PIN de 6 dígitos para proteger tus datos.</p>
      
      <input 
        type="password" 
        maxLength={6}
        value={pin}
        onChange={(e) => setPin(e.target.value)}
        className="border-2 border-[#D4A373] p-2 rounded-xl text-center text-2xl tracking-widest"
      />

      <button 
        onClick={handleCreatePin}
        className="mt-6 bg-[#C65D3B] text-white px-8 py-3 rounded-full font-bold"
      >
        GUARDAR PIN SOBERANO
      </button>
    </div>
  );
};