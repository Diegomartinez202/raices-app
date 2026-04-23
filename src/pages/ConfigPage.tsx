import React from 'react';
import { activatePanicMode } from '@/core/crypto/secure-wipe.service';

const ConfigPage: React.FC = () => {
  return (
    <div className="p-6 space-y-8 bg-[#F5F1E8] h-full">
      <section>
        <h2 className="text-[#C65D3B] font-bold text-sm uppercase tracking-widest mb-4">Seguridad Crítica</h2>
        <button 
          onClick={() => activatePanicMode()}
          className="w-full bg-[#2D2A26] text-white p-4 rounded-lg flex justify-between items-center"
        >
          <span>MODO PÁNICO (Borrado Total)</span>
          <span className="text-[10px] bg-red-600 px-2 py-1 rounded">IRREVERSIBLE</span>
        </button>
        <p className="text-[10px] text-[#6B5E4F] mt-2 italic">
          Elimina instantáneamente base de datos, modelos y archivos exportados.
        </p>
      </section>

      <section>
        <h2 className="text-[#588157] font-bold text-sm uppercase tracking-widest mb-4">Gestión de Datos (Ley 1581)</h2>
        <div className="bg-white rounded-lg border border-[#D4A373]/30 overflow-hidden text-sm">
          <button className="w-full p-4 text-left border-b border-[#D4A373]/10 hover:bg-gray-50 text-[#6B5E4F]">
            Verificar integridad de la base de datos
          </button>
          <button className="w-full p-4 text-left hover:bg-gray-50 text-[#6B5E4F]">
            Exportar reporte técnico de portabilidad
          </button>
        </div>
      </section>
    </div>
  );
};

export default ConfigPage;