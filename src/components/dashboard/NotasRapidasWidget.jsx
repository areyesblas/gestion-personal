// src/components/dashboard/NotasRapidasWidget.jsx
//
// Parte de la columna 3: escribe directo en el módulo Notas real (misma tabla/CRUD que ya
// existe) vía onAddNota — no es un widget con estado propio efímero, la nota creada aparece
// también en el módulo Notas normal.

import { useState } from 'react';
import { Plus } from 'lucide-react';

export default function NotasRapidasWidget({ onAddNota }) {
  const [texto, setTexto] = useState('');
  const [guardando, setGuardando] = useState(false);

  const guardar = async () => {
    if (!texto.trim() || guardando) return;
    setGuardando(true);
    await onAddNota({ titulo: 'Nota rápida', contenido: texto.trim() });
    setTexto('');
    setGuardando(false);
  };

  return (
    <div className="gp-panel p-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-medium">Notas rápidas</h3>
        <button onClick={guardar} disabled={!texto.trim() || guardando} className="p-1 rounded gp-btn-ghost disabled:opacity-40" aria-label="Agregar nota">
          <Plus size={15} />
        </button>
      </div>
      <textarea
        className="gp-input text-sm w-full"
        rows={2}
        placeholder="Escribe una nota..."
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) guardar(); }}
      />
    </div>
  );
}
