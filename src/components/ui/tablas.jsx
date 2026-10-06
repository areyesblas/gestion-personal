// src/components/ui/tablas.jsx
//
// El cromo estandar de una lista: encabezado ordenable, selector de orden y la barra de buscar/exportar.
// Salio de App.jsx en la Fase 0 del corte por modulos (5 oct 2026): movimiento puro, sin un
// solo cambio de comportamiento.

import { useState } from "react";
import { ChevronDown, ChevronUp, Search, Download, AlertTriangle } from "lucide-react";
import { Field } from "./basicos";
import { todayISO } from "../../lib/formato";

/* Encabezado de tabla clicable para ordenar (como en Excel): clic ordena asc, clic de
   nuevo invierte a desc. sortKey debe existir en el mismo objeto `campos` que usa OrdenSelector. */
export function Th({ label, sortKey, orden, ordenDir, onToggle, children }) {
  if (!sortKey) return <th>{children || label}</th>;
  const activo = orden === sortKey;
  return (
    <th onClick={() => onToggle(sortKey)} style={{ cursor: "pointer", userSelect: "none" }} title="Clic para ordenar">
      <span className="inline-flex items-center gap-0.5">
        {children || label}
        {activo && (ordenDir === "desc" ? <ChevronDown size={11} /> : <ChevronUp size={11} />)}
      </span>
    </th>
  );
}

/* Selector de orden reutilizable. `opciones` es [{ key, label }]. */
export function OrdenSelector({ opciones, value, onChange }) {
  if (!opciones || opciones.length === 0) return null;
  return (
    <select
      className="gp-input text-xs py-1.5"
      style={{ width: "auto" }}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      aria-label="Ordenar por"
    >
      <option value="default">Orden: más reciente</option>
      {opciones.map((o) => <option key={o.key} value={o.key}>Orden: {o.label}</option>)}
    </select>
  );
}

// Barra reutilizable: campo de búsqueda por contenido (independiente del buscador global) +
// botones de exportar Excel/PDF, para el estándar transversal de listas.
// `extra` es opcional (lo usa Contactos para su botón "Filtros"): se dibuja junto al buscador y,
// cuando se pasa, empuja Excel/PDF al extremo derecho de la fila. Sin `extra` el diseño queda
// idéntico al de siempre en las demás pantallas.
export function BarraListaEstandar({ busqueda, onBusqueda, placeholder, onExportExcel, onExportPDF, rangoExport, extra }) {
  // rangoExport es opcional — solo Citas lo usa por ahora (Grupo B, punto 7). Cuando se pasa:
  // { opciones: [{key,label}], contar: (rangoKey, desde, hasta) => number }. Si no se pasa,
  // el comportamiento es exactamente el de antes: confirmar y exportar todo lo visible.
  const [confirmando, setConfirmando] = useState(null); // null | "excel" | "pdf"
  const [rango, setRango] = useState(rangoExport?.opciones?.[0]?.key || null);
  const [desde, setDesde] = useState(todayISO());
  const [hasta, setHasta] = useState(todayISO());
  const cantidad = rangoExport ? rangoExport.contar(rango, desde, hasta) : null;
  const avisoGrande = rangoExport && confirmando === "pdf" && cantidad > 500;

  const confirmar = () => {
    const opts = rangoExport ? { rango, desde, hasta } : undefined;
    (confirmando === "excel" ? onExportExcel : onExportPDF)(opts);
    setConfirmando(null);
  };

  return (
    <div className="flex flex-wrap items-center gap-2 mb-4">
      <div className="relative flex-1" style={{ minWidth: 180, maxWidth: 320 }}>
        <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 gp-text-muted" style={{ pointerEvents: "none" }} />
        <input className="gp-input gp-buscador text-sm" style={{ paddingLeft: 32 }} placeholder={placeholder || "Buscar en esta lista…"} value={busqueda} onChange={(e) => onBusqueda(e.target.value)} />
      </div>
      {extra}
      <button onClick={() => setConfirmando("excel")} className={`text-xs px-2.5 py-1.5 rounded gp-btn-ghost flex items-center gap-1 ${extra ? "ml-auto" : ""}`}><Download size={12} /> Excel</button>
      <button onClick={() => setConfirmando("pdf")} className="text-xs px-2.5 py-1.5 rounded gp-btn-ghost flex items-center gap-1"><Download size={12} /> PDF</button>

      {confirmando && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,.6)" }} onClick={() => setConfirmando(null)}>
          <div className="gp-panel w-full max-w-sm p-5" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-2 mb-2">
              <Download size={16} className="gp-text-gold" />
              <h3 className="gp-serif text-lg">¿Exportar a {confirmando === "excel" ? "Excel" : "PDF"}?</h3>
            </div>

            {rangoExport ? (
              <>
                <p className="text-sm gp-text-muted mb-3">Elige qué rango de fechas exportar.</p>
                <Field label="Rango">
                  <select className="gp-input" value={rango} onChange={(e) => setRango(e.target.value)}>
                    {rangoExport.opciones.map((o) => <option key={o.key} value={o.key}>{o.label}</option>)}
                  </select>
                </Field>
                {rango === "personalizado" && (
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Desde"><input type="date" className="gp-input" value={desde} onChange={(e) => setDesde(e.target.value)} /></Field>
                    <Field label="Hasta"><input type="date" className="gp-input" value={hasta} onChange={(e) => setHasta(e.target.value)} /></Field>
                  </div>
                )}
                <p className="text-xs gp-text-muted mb-3">Se exportarán <span className="gp-mono">{cantidad}</span> registro{cantidad === 1 ? "" : "s"}.</p>
                {avisoGrande && (
                  <p className="text-xs gp-text-gold mb-3 flex items-start gap-1.5">
                    <AlertTriangle size={13} className="shrink-0 mt-0.5" /> Son muchos registros para un PDF — puede tardar o trabar tu navegador. Considera un rango más chico, o usa Excel.
                  </p>
                )}
              </>
            ) : (
              <p className="text-sm gp-text-muted mb-5">
                Se descargará {confirmando === "excel" ? "un archivo .xlsx" : "un archivo .pdf"} con lo que estás viendo ahora mismo (búsqueda, filtros y orden aplicados).
              </p>
            )}

            <div className="flex gap-2">
              <button onClick={() => setConfirmando(null)} className="gp-btn-ghost flex-1 py-2 text-sm">Cancelar</button>
              <button onClick={confirmar} className="gp-btn flex-1 py-2 text-sm">Exportar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
