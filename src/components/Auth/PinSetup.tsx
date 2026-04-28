import React, { useState } from 'react';

// Definimos la interfaz para que TS deje de protestar
interface SetupPinProps {
  onComplete: (nuevoPin: string) => Promise<boolean>;
}

export const SetupPin: React.FC<SetupPinProps> = ({ onComplete }) => {
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);

  const handleCreatePin = async () => {
    if (pin.length === 6) {
      setLoading(true);
      // USAMOS LA PROP onComplete que viene de App.tsx
      const exito = await onComplete(pin);
      if (!exito) {
        alert("Error al cifrar la bóveda. Intente de nuevo.");
        setLoading(false);
      }
      // Si tiene éxito, useRaicesSystem cambiará el estado y App.tsx hará el resto
    }
  };

  return (
    <div className="flex flex-col items-center justify-center h-screen bg-[#F5F1E8] p-6 text-center">
      <h2 className="text-[#C65D3B] font-bold text-xl mb-2">Configura tu Bóveda</h2>
      <p className="text-sm text-[#6B5E4F] mb-8">Crea un PIN de 6 dígitos para proteger tus datos.</p>
      
      <input 
        type="password" 
        maxLength={6}
        value={pin}
        onChange={(e) => setPin(e.target.value)}
        className="border-2 border-[#D4A373]/30 p-4 rounded-2xl text-center text-3xl tracking-[0.5em] w-64 focus:border-[#C65D3B] outline-none transition-all"
        placeholder="••••••"
      />

      <button 
        onClick={handleCreatePin}
        disabled={pin.length < 6 || loading}
        className="mt-8 bg-[#C65D3B] text-white px-10 py-4 rounded-xl font-bold shadow-lg disabled:opacity-50 active:scale-95 transition-all"
      >
        {loading ? "CIFRANDO BÓVEDA..." : "ESTABLECER IDENTIDAD"}
      </button>
    </div>
  );
};