// src/components/nav/Breadcrumb.jsx
//
// Ruta de navegación dentro de la app ("Inicio > Proyectos > Mi Proyecto") con "volver" a
// cualquier paso anterior, no solo al inmediato (pedido por Angel, 21 sept 2026). El historial
// se arma en App.jsx (historialVistas/volverA) observando pasivamente los cambios de `view` —
// este componente solo dibuja lo que le pasan, no tiene lógica de navegación propia.
// No se monta en el propio Centro de mando (ver el call site en App.jsx).

import { ChevronRight, Home } from 'lucide-react';

export default function Breadcrumb({ pasos, actual, onInicio, onIrA }) {
  return (
    <div className="flex items-center gap-1.5 text-xs mb-3 flex-wrap">
      <button onClick={onInicio} className="flex items-center gap-1 gp-text-muted hover:underline shrink-0">
        <Home size={12} /> Inicio
      </button>
      {pasos.map((p) => (
        <span key={p.indice} className="flex items-center gap-1.5 shrink-0">
          <ChevronRight size={12} className="gp-text-muted" />
          <button onClick={() => onIrA(p.indice)} className="gp-text-muted hover:underline truncate max-w-[160px]">{p.label}</button>
        </span>
      ))}
      <span className="flex items-center gap-1.5 min-w-0">
        <ChevronRight size={12} className="gp-text-muted shrink-0" />
        <span className="font-medium truncate">{actual}</span>
      </span>
    </div>
  );
}
