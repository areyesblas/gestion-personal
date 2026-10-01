// src/components/nav/BotonRegresar.jsx
//
// Reemplaza al antiguo "track" de breadcrumb (ruta completa Inicio > paso > paso > actual)
// — a pedido de Angel (22 sept 2026): solo un botón de regresar con una flecha, sin la lista de
// pasos intermedios. Usa el mismo historial que ya arma App.jsx (historialVistas/volverA) — solo
// retrocede un paso, al inmediato anterior.
// No se monta en el propio Centro de mando (ver el call site en App.jsx), ni cuando no hay a
// dónde regresar (historial vacío).
//
// 1 oct 2026: era un texto gris de 12 px que se perdía arriba de la pantalla y había que buscarlo.
// Ahora es un botón de verdad —con caja, flecha en círculo dorado y texto legible— y se pega más
// arriba, pegado al borde superior del contenido, que es donde la mano lo busca. Mantiene una
// altura de 44 px para que en iPhone sea un objetivo táctil cómodo.

import { ChevronLeft } from 'lucide-react';

export default function BotonRegresar({ onRegresar }) {
  return (
    <button
      onClick={onRegresar}
      title="Regresar a la pantalla anterior"
      className="gp-btn-ghost inline-flex items-center gap-2 pl-1.5 pr-3.5 mb-4 -mt-1 text-sm font-medium rounded-full"
      style={{ minHeight: 44 }}
    >
      <span
        className="inline-flex items-center justify-center rounded-full shrink-0"
        style={{ width: 30, height: 30, background: 'var(--gold)', color: '#0B2341' }}
      >
        <ChevronLeft size={18} />
      </span>
      Regresar
    </button>
  );
}
