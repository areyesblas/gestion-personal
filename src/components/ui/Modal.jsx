// src/components/ui/Modal.jsx
//
// El modal de la app, con su portal y su confirmacion de cerrar con cambios sin guardar.
// Salio de App.jsx en la Fase 0 del corte por modulos (5 oct 2026): movimiento puro, sin un
// solo cambio de comportamiento.

import { useState } from "react";
import { createPortal } from "react-dom";
import { X, AlertTriangle } from "lucide-react";
import { IconBtn } from "./basicos";

// A dónde se manda el modal con el portal. NO al <body>: todos los colores de la app son
// variables CSS declaradas en .gp-root, así que un modal colgado del body se queda sin ellas y
// se dibuja transparente —se ve "como si no pasara nada" al abrirlo— (pasó el 1 oct 2026).
// Colgarlo de .gp-root conserva las variables y el tema activo, y aun así lo saca de cualquier
// contenedor intermedio. Si por lo que sea no existiera, el body es mejor que nada.
const raizPortal = () => (typeof document === "undefined" ? null : (document.querySelector(".gp-root") || document.body));

// El modal se dibuja por un portal, no donde está escrito en el árbol.
// Motivo (bug del 1 oct 2026): la ficha del proyecto vive en una columna con position:sticky,
// y sticky crea su propio contexto de apilamiento. Un `fixed z-50` dentro de ahí queda atrapado
// en ese contexto, así que el banner de la pantalla —que lleva un z-10 propio— se dibujaba
// ENCIMA del modal. Con el portal el modal sale de cualquier contexto heredado y siempre queda
// arriba, en este y en cualquier otro panel que use sticky o transform.
export function Modal({ title, onClose, children }) {
  const [tocado, setTocado] = useState(false);
  const [confirmando, setConfirmando] = useState(false);

  const intentarCerrar = () => {
    if (tocado) setConfirmando(true);
    else onClose();
  };

  const destino = raizPortal();
  if (!destino) return null;

  return createPortal(
    <div className="fixed inset-0 z-[95] flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,.55)" }} onClick={intentarCerrar}>
      <div
        className="gp-panel w-full max-w-lg max-h-[85vh] overflow-y-auto gp-scroll p-5"
        onClick={(e) => e.stopPropagation()}
        onInputCapture={() => setTocado(true)}
        onChangeCapture={() => setTocado(true)}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="gp-serif text-lg">{title}</h3>
          <IconBtn title="Cerrar" onClick={intentarCerrar}><X size={16} /></IconBtn>
        </div>
        {children}

        {confirmando && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,.5)" }} onClick={(e) => e.stopPropagation()}>
            <div className="gp-panel w-full max-w-xs p-4">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle size={15} className="gp-text-gold" />
                <p className="text-sm font-medium">¿Descartar cambios?</p>
              </div>
              <p className="text-xs gp-text-muted mb-4">Hiciste cambios que no has guardado. Si sales ahora, se pierden.</p>
              <div className="flex gap-2">
                <button onClick={() => setConfirmando(false)} className="gp-btn-ghost flex-1 py-1.5 text-xs">Seguir editando</button>
                <button onClick={onClose} className="flex-1 py-1.5 text-xs rounded" style={{ background: "var(--red)", color: "#fff" }}>Descartar</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>,
    destino,
  );
}
