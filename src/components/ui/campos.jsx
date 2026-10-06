// src/components/ui/campos.jsx
//
// Campos de captura con comportamiento propio (formato de dinero, guardar en renglon, buscar y agregar).
// Salio de App.jsx en la Fase 0 del corte por modulos (5 oct 2026): movimiento puro, sin un
// solo cambio de comportamiento.

import { useState, useEffect } from "react";
import { Check, X, Pencil, Plus, Trash2 } from "lucide-react";
import { IconBtn } from "./basicos";

// Campo de captura de dinero: mientras escribes, va formateando con $ y comas (como una app de banco).
// Por dentro sigue guardando un número plano (ej. "1234.5") para no romper nada de la base de datos;
// solo lo que se VE en pantalla lleva el formato.
export function MoneyInput({ value, onChange, className = "gp-input", placeholder, autoFocus, style, moneda = "MXN" }) {
  const digitsFromValue = (val) => {
    if (val === "" || val === null || val === undefined) return "";
    const n = Math.round((Number(val) || 0) * 100);
    return Number.isFinite(n) ? String(n) : "";
  };
  const [digits, setDigits] = useState(() => digitsFromValue(value));

  // Si el valor cambia desde afuera (ej. al abrir el modal con datos ya existentes), lo reflejamos.
  useEffect(() => { setDigits(digitsFromValue(value)); }, [value]);

  const formatted = digits === "" ? "" : (() => {
    const n = (Number(digits) || 0) / 100;
    try { return n.toLocaleString("es-MX", { style: "currency", currency: moneda || "MXN" }); }
    catch { return n.toLocaleString("es-MX"); }
  })();

  const handleChange = (e) => {
    const soloDigitos = e.target.value.replace(/[^\d]/g, "");
    const limpio = soloDigitos.replace(/^0+(?=\d)/, "");
    setDigits(limpio);
    onChange(limpio === "" ? "" : (Number(limpio) / 100).toString());
  };

  return (
    <input
      type="text"
      inputMode="decimal"
      autoFocus={autoFocus}
      className={className}
      style={style}
      placeholder={placeholder}
      value={formatted}
      onChange={handleChange}
    />
  );
}

// Versión de renglón del patrón de guardar: un selector dentro de una tabla no puede abrir una
// barra completa, así que al cambiarlo aparecen un ✓ y una ✕ junto a él, en su propia fila
// (Angel, 1 oct 2026: "una barra por renglón"). Mientras no se confirme, nada se escribe, y el
// renglón cuenta como cambio pendiente para el aviso de salir.
// `etiquetas` permite que lo GUARDADO y lo MOSTRADO difieran. Hace falta porque el estado
// "Cobrado" de la base vale para los dos lados del dinero, pero en un egreso leerlo como
// "cobrado" confunde: ahí se dice "Pagado". El valor en la tabla no cambia, solo la palabra.
export function SelectGuardable({ valor, opciones, onGuardar, ariaLabel, style, etiquetas }) {
  const { borrador, cambiar, descartar, sucio } = useBorrador({ v: valor });
  return (
    <span className="inline-flex items-center gap-1">
      <select
        className="gp-input" style={{ padding: "2px 6px", ...(style || {}) }}
        value={borrador.v} onChange={(e) => cambiar({ v: e.target.value })} aria-label={ariaLabel}
      >
        {opciones.map((o) => <option key={o} value={o}>{etiquetas?.[o] || o}</option>)}
      </select>
      {sucio && (
        <>
          <IconBtn title="Guardar este cambio" onClick={() => { const v = borrador.v; descartar(); onGuardar(v); }}>
            <Check size={13} className="gp-text-teal" />
          </IconBtn>
          <IconBtn title="Descartar" onClick={descartar}><X size={13} className="gp-text-red" /></IconBtn>
        </>
      )}
    </span>
  );
}

// Combobox reutilizable de "buscar y agregar": escribe para filtrar entre opciones existentes,
// toca una para agregarla como chip, o si no existe aparece "Crear ..." al fondo para darla de
// alta al vuelo (Grupo C — multi-contacto y tags en Citas, pensado para reusarse en otras
// pantallas después). `opciones` y `seleccionados` son {id, label}. `onCrear` es opcional: si no
// se pasa, no se ofrece crear (por ejemplo, si algún día se usa solo para elegir entre existentes).
// `onRenombrarOpcion` y `onEliminarOpcion` son opcionales. Cuando se pasan, cada opción de la
// lista trae su lápiz y su bote: sirven para corregir un valor mal escrito o quitar uno que ya
// no se usa.
//
// OJO con lo que significan: estos catálogos NO son una tabla, son el conjunto de valores que
// ya están capturados en las fichas. Por eso renombrar una opción es renombrarla en TODOS los
// registros que la traen, y borrarla es quitarla de todos. Quien pasa los manejadores es quien
// hace ese recorrido, y avisa a cuántas fichas va a afectar antes de tocarlas.
export function ComboboxMultiBuscar({ seleccionados, opciones, onAgregar, onQuitar, onCrear, placeholder, crearLabel, max, onRenombrarOpcion, onEliminarOpcion }) {
  const [query, setQuery] = useState("");
  const [abierto, setAbierto] = useState(false);
  const idsSeleccionados = new Set(seleccionados.map((s) => s.id));
  const q = query.trim().toLowerCase();
  const filtradas = opciones.filter((o) => !idsSeleccionados.has(o.id) && o.label.toLowerCase().includes(q));
  const coincideExacto = opciones.some((o) => o.label.toLowerCase() === q);
  const lleno = max && seleccionados.length >= max;

  return (
    <div className="mb-3">
      {seleccionados.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {seleccionados.map((s) => (
            <span key={s.id} className="gp-bloque text-xs pl-2.5 pr-1.5 py-1 rounded-full flex items-center gap-1">
              {s.label}
              <button type="button" onClick={() => onQuitar(s.id)} className="gp-text-muted"><X size={11} /></button>
            </span>
          ))}
        </div>
      )}
      {!lleno && (
      <div className="relative">
        <input
          className="gp-input"
          placeholder={placeholder}
          value={query}
          onChange={(e) => { setQuery(e.target.value); setAbierto(true); }}
          onFocus={() => setAbierto(true)}
          onBlur={() => setTimeout(() => setAbierto(false), 150)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && q && !coincideExacto && onCrear) {
              e.preventDefault();
              onCrear(query.trim());
              setQuery("");
            }
          }}
        />
        {abierto && (q || filtradas.length > 0) && (
          <div className="absolute z-10 mt-1 w-full gp-panel overflow-y-auto gp-scroll" style={{ maxHeight: 200 }}>
            {filtradas.slice(0, 8).map((o) => (
              <div key={o.id} className="flex items-center gap-1 gp-panel-hi">
                <button
                  type="button"
                  className="flex-1 min-w-0 text-left px-3 py-2 text-sm truncate"
                  onMouseDown={(e) => { e.preventDefault(); onAgregar(o); setQuery(""); }}
                >
                  {o.label}
                </button>
                {onRenombrarOpcion && (
                  <button
                    type="button" title={`Renombrar "${o.label}" en todas las fichas`}
                    className="p-1.5 rounded gp-text-muted shrink-0"
                    onMouseDown={(e) => { e.preventDefault(); onRenombrarOpcion(o.id); }}
                  ><Pencil size={12} /></button>
                )}
                {onEliminarOpcion && (
                  <button
                    type="button" title={`Quitar "${o.label}" de todas las fichas`}
                    className="p-1.5 rounded gp-text-red shrink-0 mr-1"
                    onMouseDown={(e) => { e.preventDefault(); onEliminarOpcion(o.id); }}
                  ><Trash2 size={12} /></button>
                )}
              </div>
            ))}
            {q && !coincideExacto && onCrear && (
              <button
                type="button"
                className="w-full text-left px-3 py-2 text-sm gp-text-gold flex items-center gap-1.5"
                style={filtradas.length ? { borderTop: "1px solid var(--border)" } : undefined}
                onMouseDown={(e) => { e.preventDefault(); onCrear(query.trim()); setQuery(""); }}
              >
                <Plus size={13} /> {crearLabel ? crearLabel(query.trim()) : `Crear "${query.trim()}"`}
              </button>
            )}
          </div>
        )}
      </div>
      )}
    </div>
  );
}
