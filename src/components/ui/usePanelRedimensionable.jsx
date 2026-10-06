// src/components/ui/usePanelRedimensionable.jsx
//
// El divisor arrastrable del patron lista + ficha (Proyectos, Tareas, Contactos, Atenciones y
// Notas usan el mismo). Salio de App.jsx en la Fase 2 (5 oct 2026) porque lo comparten cinco
// modulos y tres de ellos se vuelven perezosos.

import { useState, useEffect, useRef } from "react";

const ANCHO_PANEL_MIN = 320;
const ANCHO_PANEL_DEFECTO = 440;

export function usePanelRedimensionable(clave) {
  const contenedorRef = useRef(null);
  const [esEscritorio, setEsEscritorio] = useState(() => {
    try { return window.matchMedia("(min-width: 1024px)").matches; } catch { return true; }
  });
  const [ancho, setAncho] = useState(() => {
    try { return Number(localStorage.getItem(`arkeyone_panel_${clave}`)) || ANCHO_PANEL_DEFECTO; }
    catch { return ANCHO_PANEL_DEFECTO; }
  });
  const arrastrandoRef = useRef(false);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const alCambiar = (e) => setEsEscritorio(e.matches);
    mq.addEventListener("change", alCambiar);
    return () => mq.removeEventListener("change", alCambiar);
  }, []);

  useEffect(() => {
    const alMover = (e) => {
      if (!arrastrandoRef.current || !contenedorRef.current) return;
      const caja = contenedorRef.current.getBoundingClientRect();
      // El ancho se mide desde el borde DERECHO del contenedor: arrastrar hacia la izquierda
      // agranda la ficha y encoge la lista, que es lo que uno espera al jalar el divisor.
      const propuesto = caja.right - e.clientX;
      const maximo = Math.max(ANCHO_PANEL_MIN, caja.width - 380); // la lista nunca baja de 380
      setAncho(Math.round(Math.max(ANCHO_PANEL_MIN, Math.min(propuesto, maximo))));
    };
    const alSoltar = () => {
      if (!arrastrandoRef.current) return;
      arrastrandoRef.current = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      try { localStorage.setItem(`arkeyone_panel_${clave}`, String(ancho)); } catch { /* modo privado */ }
    };
    window.addEventListener("pointermove", alMover);
    window.addEventListener("pointerup", alSoltar);
    window.addEventListener("pointercancel", alSoltar);
    return () => {
      window.removeEventListener("pointermove", alMover);
      window.removeEventListener("pointerup", alSoltar);
      window.removeEventListener("pointercancel", alSoltar);
    };
  }, [clave, ancho]);

  const divisor = (
    <div
      className="gp-divisor hidden lg:flex items-stretch justify-center shrink-0 self-stretch"
      style={{ width: 11, touchAction: "none", minHeight: 120 }}
      title="Arrastra para cambiar el ancho. Doble clic para volver al original."
      role="separator" aria-orientation="vertical"
      onPointerDown={(e) => {
        e.preventDefault();
        arrastrandoRef.current = true;
        document.body.style.cursor = "col-resize";
        document.body.style.userSelect = "none";
      }}
      onDoubleClick={() => {
        setAncho(ANCHO_PANEL_DEFECTO);
        try { localStorage.setItem(`arkeyone_panel_${clave}`, String(ANCHO_PANEL_DEFECTO)); } catch { /* modo privado */ }
      }}
    >
      <span className="gp-divisor-linea" />
    </div>
  );

  // En celular no se fija ancho: los bloques se apilan y cada uno toma todo el ancho.
  return { contenedorRef, divisor, estiloPanel: esEscritorio ? { width: ancho } : undefined };
}
