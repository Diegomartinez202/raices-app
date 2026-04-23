
export const PinSetup = ({ newPin, setNewPin, confirmPin, setConfirmPin, onSave }: any) => (
  <div className="flex flex-col items-center justify-center h-screen bg-[#F5F1E8] p-6 text-center">
    <h2 className="text-[#C65D3B] font-bold text-xl mb-4">Configura tu PIN</h2>
    <p className="text-[12px] text-[#6B5E4F] mb-6">Protege tu información soberana local.</p>
    <input 
      type="password" placeholder="Nuevo PIN"
      className="w-full p-4 mb-2 border rounded-xl text-center" 
      value={newPin} onChange={e => setNewPin(e.target.value)} 
    />
    <input 
      type="password" placeholder="Confirmar PIN"
      className="w-full p-4 mb-4 border rounded-xl text-center" 
      value={confirmPin} onChange={e => setConfirmPin(e.target.value)} 
    />
    <button onClick={onSave} className="bg-[#588157] text-white w-full py-4 rounded-xl font-bold active:scale-95 transition-transform">
      ACTIVAR SEGURIDAD
    </button>
  </div>
);