import React from 'react';
import { activatePanicMode } from '@/core/crypto/secure-wipe.service';
import { clearAllHistory } from '@/core/db/sqlite.service'; // Importamos tu función de borrado
import { exportHistoryToPDF } from '@/core/export/export.service';

const ConfigPage: React.FC = () => {

  const handlePanic = async () => {
    const confirm = window.confirm(
      "⚠️ ADVERTENCIA CRÍTICA: Se eliminarán permanentemente todos los datos, modelos y logs. Esta acción no se puede deshacer. ¿Proceder?"
    );
    if (confirm) {
      await activatePanicMode();
    }
  };

  const handleClearHistory = async () => {
    if (window.confirm("¿Deseas eliminar todo el historial de mensajes? (Derecho al Olvido)")) {
      await clearAllHistory();
      alert("Historial destruido físicamente mediante VACUUM.");
    }
  };

  return (
    <div className="p-6 space-y-8 bg-[#F5F1E8] h-full overflow-y-auto">
      {/* SECCIÓN 1: SEGURIDAD CRÍTICA */}
      <section>
        <h2 className="text-[#C65D3B] font-bold text-sm uppercase tracking-widest mb-4">
          Seguridad Crítica
        </h2>
        <button 
          onClick={handlePanic}
          className="w-full bg-[#2D2A26] hover:bg-black text-white p-4 rounded-lg flex justify-between items-center transition-colors shadow-lg"
        >
          <span className="font-bold">MODO PÁNICO (Borrado Total)</span>
          <span className="text-[10px] bg-red-600 px-2 py-1 rounded animate-pulse">IRREVERSIBLE</span>
        </button>
        <p className="text-[10px] text-[#6B5E4F] mt-2 italic">
          Protocolo de autodestrucción: Elimina instantáneamente base de datos, modelos IA y archivos locales.
        </p>
      </section>

      {/* SECCIÓN 2: GESTIÓN DE DATOS */}
      <section>
        <h2 className="text-[#588157] font-bold text-sm uppercase tracking-widest mb-4">
          Gestión de Datos (Ley 1581)
        </h2>
        <div className="bg-white rounded-lg border border-[#D4A373]/30 shadow-sm overflow-hidden text-sm">
          <button 
            onClick={handleClearHistory}
            className="w-full p-4 text-left border-b border-[#D4A373]/10 hover:bg-gray-50 text-[#6B5E4F] flex justify-between"
          >
            Eliminar historial de mensajes
            <span className="text-[10px] text-[#C65D3B]">Derecho al olvido</span>
          </button>
          
          <button 
            onClick={() => exportHistoryToPDF({ shareAfterExport: true })}
            className="w-full p-4 text-left hover:bg-gray-50 text-[#6B5E4F] flex justify-between"
          >
            Exportar reporte de portabilidad
            <span className="text-[10px] text-blue-600">PDF Cifrado</span>
          </button>
        </div>
      </section>

      {/* SECCIÓN 3: INFORMACIÓN TÉCNICA (Soberanía) */}
      <section className="pt-4">
        <div className="bg-[#D4A373]/10 p-4 rounded-lg border border-dashed border-[#D4A373]/40">
          <p className="text-[10px] text-[#6B5E4F] leading-relaxed">
            <strong>RAÍCES - Nodo de Confianza:</strong> Los datos contenidos en este dispositivo 
            son propiedad exclusiva del usuario. El motor de inferencia (Gemma-2B) y la base 
            vectorial operan de forma 100% local sin salida a internet.
          </p>
        </div>
      </section>
    </div>
  );
};

export default ConfigPage;