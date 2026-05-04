// src/views/BovedaDocs.tsx
import React from 'react';

export const BovedaDocs = () => {
  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4">📚 Bóveda de Conocimiento RAÍCES</h2>
      <p className="mb-6">Auditoría de fuentes para la reparación integral y proyectos productivos.</p>
      <table className="min-w-full bg-white border">
        <thead className="bg-slate-100">
          <tr>
            <th className="p-3 border">Fuente (PDF/Norma)</th>
            <th className="p-3 border">Estado Semántico</th>
            <th className="p-3 border">Dominio</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className="p-3 border text-sm">Metodología Atención Psicosocial (V3-1)</td>
            <td className="p-3 border text-center">✅ Indexado (3,344 fragmentos)</td>
            <td className="p-3 border text-center">Psicosocial</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
};