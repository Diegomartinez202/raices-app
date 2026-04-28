import React, { useState, useEffect } from 'react';
import { activatePanicMode } from '@/core/crypto/secure-wipe.service';
import { clearAllHistory } from '@/core/db/sqlite.service'; 
import { exportHistoryToPDF } from '@/core/export/export.service';
import { pickAndUploadPDF, listSourceFiles, deleteSourceFile, SourceFile } from '@/core/file/file.service';
import { indexPDF, IndexingProgress } from '@/core/rag/indexing.service';
import { logger, shouldUpdateCorpus, markCorpusUpdated } from '@/core/config/config.service'; // <--- INTEGRADO
import { useRaicesSystem } from '@/hooks/useRaicesSystem';

const ConfigPage: React.FC = () => {
  const { initializeRAG } = useRaicesSystem();
  
  // --- ESTADOS ---
  const [sources, setSources] = useState<SourceFile[]>([]);
  const [indexingProgress, setIndexingProgress] = useState<IndexingProgress | null>(null);
  const [needsUpdate, setNeedsUpdate] = useState(false); // <--- NUEVA MEJORA

  useEffect(() => {
    listSourceFiles().then(setSources);
    setNeedsUpdate(shouldUpdateCorpus()); // <--- Verificación de ciclo de 30 días
  }, []);

  // --- LÓGICA DE SEGURIDAD ---
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

  // --- LÓGICA DE GESTIÓN DE DOCUMENTOS (CON MEJORA DE CICLO) ---
  const handleUploadAndIndex = async () => {
    try {
      const path = await pickAndUploadPDF();
      if (!path) return;
      
      const success = await indexPDF(path, (progress) => setIndexingProgress(progress));
      
      if (success) {
        logger.info('Documento indexado y cifrado correctamente');
        
        // RECARGA EL MOTOR RAG
        if (initializeRAG) await initializeRAG(); 
        
        // ACTUALIZACIÓN DEL CICLO DE MANTENIMIENTO
        await markCorpusUpdated(); 
        setNeedsUpdate(false);
        
        setSources(await listSourceFiles());
        alert("Conocimiento actualizado y ciclo de mantenimiento reiniciado.");
      }
    } catch (error: any) {
      alert(`Error al procesar: ${error.message}`);
    } finally {
      setIndexingProgress(null);
    }
  };

  return (
    <div className="p-6 space-y-8 bg-[#F5F1E8] h-full overflow-y-auto">
      
      {/* BANNER DE ACTUALIZACIÓN RECOMENDADA (MEJORA INYECTADA) */}
      {needsUpdate && (
        <div className="p-4 bg-[#FEF3C7] border-l-4 border-[#D97706] rounded-r-lg shadow-sm animate-pulse">
          <div className="flex items-center">
            <span className="text-lg mr-2">⚠️</span>
            <p className="text-xs font-bold text-[#D97706]">Mantenimiento de Datos Recomendado</p>
          </div>
          <p className="text-[10px] text-[#6B5E4F] mt-1">
            Han pasado más de 30 días. Por favor, revisa si hay nuevos documentos en la JEP o MinSalud para mantener la idoneidad legal de RAÍCES.
          </p>
        </div>
      )}

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

      {/* SECCIÓN 3: MEMORIA LOCAL (RAG) */}
      <section>
        <h2 className="text-[#3a5a40] font-bold text-sm uppercase tracking-widest mb-4">
          Fuentes de Conocimiento (RAG)
        </h2>
        <div className="space-y-4">
          <button
            onClick={handleUploadAndIndex}
            disabled={!!indexingProgress}
            className="w-full bg-[#588157] hover:bg-[#3a5a40] text-white p-4 rounded-lg flex justify-center items-center font-bold shadow-md disabled:opacity-50 transition-all"
          >
            {indexingProgress ? "ANALIZANDO..." : "SUBIR DOCUMENTO (PDF)"}
          </button>

          <div className="bg-white rounded-lg border border-[#D4A373]/30 shadow-sm p-4">
            <h3 className="text-xs font-bold text-[#6B5E4F] mb-3">Documentos en Memoria</h3>
            {sources.length === 0 ? (
              <p className="text-[10px] text-gray-400 italic">No hay documentos cargados.</p>
            ) : (
              sources.map(file => (
                <div key={file.path} className="flex justify-between items-center py-2 border-b border-gray-50 last:border-0">
                  <span className="text-[11px] text-[#6B5E4F] truncate max-w-[200px]">{file.name}</span>
                  <button
                    onClick={async () => {
                      if (window.confirm(`¿Eliminar "${file.name}" de la memoria?`)) {
                        try {
                          await deleteSourceFile(file.path);
                          setSources(await listSourceFiles());
                          if (initializeRAG) await initializeRAG();
                          logger.info(`Documento eliminado: ${file.name}`);
                        } catch (error) {
                          alert("Error al intentar eliminar el archivo.");
                        }
                      }
                    }}
                    className="text-[#C65D3B] text-[10px] font-bold uppercase hover:bg-red-50 p-1 rounded transition-colors"
                  >
                    Borrar
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      {/* OVERLAY DE PROGRESO */}
      {indexingProgress && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-6">
          <div className="bg-white p-6 rounded-xl w-full max-w-xs shadow-2xl">
            <h3 className="font-bold text-sm text-[#2D2A26] mb-2 text-center">Indexando Documento...</h3>
            <p className="text-[10px] text-[#6B5E4F] mb-4 text-center">{indexingProgress.message}</p>
            <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
              <div 
                className="bg-[#C65D3B] h-full transition-all duration-300"
                style={{ width: `${(indexingProgress.current / indexingProgress.total) * 100}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {/* SECCIÓN 4: INFORMACIÓN TÉCNICA */}
      <section className="pt-4 pb-10">
        <div className="bg-[#D4A373]/10 p-4 rounded-lg border border-dashed border-[#D4A373]/40">
          <p className="text-[10px] text-[#6B5E4F] leading-relaxed text-center">
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