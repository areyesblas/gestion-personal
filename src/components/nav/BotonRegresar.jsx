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
// arriba, pegado al borde superior del contenido, que es donde la mano lo busca. Se achicó a 36 px de
// alto el 1 oct 2026 a pedido de Angel: con el ancho del texto el objetivo táctil sigue siendo
// cómodo en iPhone, aunque quede por debajo de los 44 px de alto.

import { ChevronLeft } from 'lucide-react';

export default function BotonRegresar({ onRegresar }) {
  return (
    <button
      onClick={onRegresar}
      title="Regresar a la pantalla anterior"
      className="gp-btn-ghost inline-flex items-center gap-1.5 pl-1 pr-3 mb-3.5 -mt-1 text-[13px] font-medium rounded-full"
      style={{ minHeight: 36 }}
    >
      <span
        className="inline-flex items-center justify-center rounded-full shrink-0"
        style={{ width: 24, height: 24, background: 'var(--gold)', color: '#0B2341' }}
      >
        <ChevronLeft size={15} />
      </span>
      Regresar
    </button>
  );
}
