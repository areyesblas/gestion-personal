// src/components/nav/BotonRegresar.jsx
//
// Reemplaza al antiguo "track" de breadcrumb (ruta completa Inicio > paso > paso > actual)
// — a pedido de Angel (22 sept 2026): solo un botón de regresar con una flecha, sin la lista de
// pasos intermedios. Usa el mismo historial que ya arma App.jsx (historialVistas/volverA) — solo
// retrocede un paso, al inmediato anterior.
// No se monta en el propio Centro de mando (ver el call site en App.jsx), ni cuando no hay a
// dónde regresar (historial vacío).

import { ChevronLeft } from 'lucide-react';

export default function BotonRegresar({ onRegresar }) {
  return (
    <button onClick={onRegresar} className="flex items-center gap-1 text-xs gp-text-muted hover:underline mb-3">
      <ChevronLeft size={14} /> Regresar
    </button>
  );
}
