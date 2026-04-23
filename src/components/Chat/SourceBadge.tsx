import React from 'react';

// 1. DEFINIMOS LA INTERFAZ (Esto quita el error "Cannot find name")
interface SourceBadgeProps {
  source: string;
}

// 2. EL COMPONENTE (Ahora sí sabe qué es SourceBadgeProps)
export const SourceBadge: React.FC<SourceBadgeProps> = ({ source }) => {
  const sourceLower = source.toLowerCase();
  const isMacrocaso = sourceLower.includes('001') || 
                      sourceLower.includes('m10') || 
                      sourceLower.includes('macrocaso');

  return (
    <div className="flex items-center gap-2 mt-2 pt-2 border-t border-dashed border-[#D4A373]/20">
      <div className={`px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase tracking-wider text-white ${
        isMacrocaso ? 'bg-[#C65D3B]' : 'bg-[#588157]'
      }`}>
        {isMacrocaso ? 'JEP - Macrocaso 10' : 'Fuente Oficial JEP'}
      </div>
      <span className="text-[9px] text-[#6B5E4F] italic truncate max-w-[140px]">
        Doc: {source}
      </span>
    </div>
  );
};