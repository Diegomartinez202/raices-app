
export const LoadingScreen = ({ msg }: { msg: string }) => (
  <div className="flex flex-col items-center justify-center h-screen bg-[#F5F1E8] p-6 text-center">
    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#C65D3B] mb-6"></div>
    <h2 className="text-[#C65D3B] font-bold text-2xl mb-2">RAÍCES</h2>
    <p className="text-[#6B5E4F] font-medium">{msg}</p>
    <span className="text-[10px] mt-12 opacity-40 uppercase tracking-widest">Tecnología Soberana - JEP</span>
  </div>
);