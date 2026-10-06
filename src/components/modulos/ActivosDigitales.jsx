// src/components/modulos/ActivosDigitales.jsx
//
// Modulo perezoso (Fase 2). Salio de App.jsx el 5 oct 2026; se mudaron con el sus propias
// piezas (TIPO_ACTIVO, ActivoForm), que nadie mas usaba.

import PromptTareaRelacionada from "../comunes/PromptTareaRelacionada";
import { Badge, Field, IconBtn } from "../ui/basicos";
import { BarraListaEstandar, OrdenSelector, Th } from "../ui/tablas";
import { FRECUENCIA } from "../../lib/catalogos";
import { Modal } from "../ui/Modal";
import { MoneyInput } from "../ui/campos";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { daysUntil, fmtMoney, todayISO, uid } from "../../lib/formato";
import { exportarFilasExcel, exportarFilasPDF } from "../../lib/exportar";
import { filtrarPorBusqueda, ordenAlfabetico, ordenadosPorNombre, ordenarLista } from "../../lib/listas";
import { useState } from "react";

const TIPO_ACTIVO = ordenAlfabetico(["Dominio", "Hosting", "Marca (IMPI)", "Red social", "Otro"]);

/* ---------- Activos digitales ---------- */
export default function ActivosDigitales({ data, onAdd, onEdit, onRemove, onCrearTarea }) {
  const [modal, setModal] = useState(null);
  const [orden, setOrden] = useState("default");
  const [ordenDir, setOrdenDir] = useState("asc");
  const [busqueda, setBusqueda] = useState("");
  const toggleOrden = (key) => { if (orden === key) setOrdenDir((d) => (d === "asc" ? "desc" : "asc")); else { setOrden(key); setOrdenDir("asc"); } };
  const empty = { tipo: "Dominio", nombre: "", proyectoId: "", fechaVencimiento: todayISO(), costoRenovacion: "", notas: "", proveedor: "", urlIdentificador: "", cuentaPropietaria: "", renovacionAutomatica: false, frecuenciaRenovacion: "Anual" };
  const camposOrden = {
    vencimiento: { get: (a) => a.fechaVencimiento, tipo: "fecha" },
    registro: { get: (a) => a.createdAt, tipo: "fecha" },
    alfabetico: { get: (a) => a.nombre, tipo: "texto" },
  };
  const opcionesOrden = [
    { key: "vencimiento", label: "fecha de vencimiento" },
    { key: "registro", label: "fecha de registro" },
    { key: "alfabetico", label: "alfabético" },
  ];
  const nombreProyecto = (id) => data.proyectos.find((p) => p.id === id)?.nombre || "—";
  const buscados = filtrarPorBusqueda(data.activos || [], busqueda, [(a) => a.nombre, (a) => a.tipo, (a) => a.notas, (a) => nombreProyecto(a.proyectoId), (a) => a.proveedor, (a) => a.cuentaPropietaria]);
  const base = orden === "default" ? [...buscados].sort((a, b) => (a.fechaVencimiento || "").localeCompare(b.fechaVencimiento || "")) : buscados;
  const ordenados = ordenarLista(base, orden, camposOrden, ordenDir);
  const columnasExport = [
    { label: "Activo", get: (a) => a.nombre }, { label: "Tipo", get: (a) => a.tipo },
    { label: "Proyecto", get: (a) => nombreProyecto(a.proyectoId) }, { label: "Vence", get: (a) => a.fechaVencimiento },
    { label: "Costo renovación", get: (a) => a.costoRenovacion },
    { label: "Proveedor", get: (a) => a.proveedor }, { label: "URL/identificador", get: (a) => a.urlIdentificador },
    { label: "Cuenta propietaria", get: (a) => a.cuentaPropietaria },
    { label: "Renovación automática", get: (a) => (a.renovacionAutomatica ? "Sí" : "No") },
    { label: "Notas", get: (a) => a.notas },
  ];

  return (
    <div>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-1">
        <h2 className="gp-serif text-2xl">Activos digitales</h2>
        <button onClick={() => setModal({ item: empty })} className="gp-btn flex items-center justify-center gap-1 px-3 py-1.5 text-sm w-full sm:w-auto"><Plus size={14} /> Nuevo</button>
      </div>
      <p className="text-sm gp-text-muted mb-3">Dominios, hosting, marcas ante IMPI y redes — para que ningún vencimiento te tome por sorpresa.</p>
      <div className="mb-2"><OrdenSelector opciones={opcionesOrden} value={orden} onChange={setOrden} /></div>
      <BarraListaEstandar busqueda={busqueda} onBusqueda={setBusqueda} placeholder="Buscar por nombre, tipo, proyecto o notas…"
        onExportExcel={() => exportarFilasExcel(ordenados, columnasExport, "activos_digitales")}
        onExportPDF={() => exportarFilasPDF(ordenados, columnasExport, "activos_digitales", "Activos digitales", busqueda ? `búsqueda: "${busqueda}"` : "")} />

      <div className="gp-panel overflow-x-auto">
        <table className="gp-table">
          <thead><tr><Th label="Activo" sortKey="alfabetico" orden={orden} ordenDir={ordenDir} onToggle={toggleOrden} /><th>Tipo</th><th>Proyecto</th><Th label="Vence" sortKey="vencimiento" orden={orden} ordenDir={ordenDir} onToggle={toggleOrden} /><th>Estatus</th><th>Costo renovación</th><th>Auto</th><th></th></tr></thead>
          <tbody>
            {ordenados.map((a) => {
              const dd = daysUntil(a.fechaVencimiento);
              const tone = dd < 0 ? "red" : dd <= 14 ? "gold" : "teal";
              const label = dd < 0 ? `Vencido (${Math.abs(dd)}d)` : dd <= 14 ? `Renovar en ${dd}d` : "Vigente";
              return (
                <tr key={a.id}>
                  <td>
                    {a.nombre}
                    {(a.proveedor || a.cuentaPropietaria) && (
                      <div className="text-xs gp-text-muted">{[a.proveedor, a.cuentaPropietaria].filter(Boolean).join(" · ")}</div>
                    )}
                  </td>
                  <td className="gp-text-muted">{a.tipo}</td>
                  <td className="gp-text-muted">{nombreProyecto(a.proyectoId)}</td>
                  <td className="gp-mono">{a.fechaVencimiento}</td>
                  <td><Badge tone={tone}>{label}</Badge></td>
                  <td className="gp-mono">{a.costoRenovacion ? fmtMoney(a.costoRenovacion) : "—"}</td>
                  <td>{a.renovacionAutomatica ? <Badge tone="teal">Sí</Badge> : <span className="gp-text-muted text-xs">No</span>}</td>
                  <td><div className="flex gap-1"><IconBtn title="Editar" onClick={() => setModal({ item: a })}><Pencil size={13} /></IconBtn><IconBtn title="Eliminar" onClick={() => onRemove(a.id)}><Trash2 size={13} /></IconBtn></div></td>
                </tr>
              );
            })}
            {ordenados.length === 0 && <tr><td colSpan={8} className="text-center gp-text-muted py-6">Sin activos digitales registrados.</td></tr>}
          </tbody>
        </table>
      </div>

      {modal && !modal.paso && (
        <Modal title={modal.item.id ? "Editar activo" : "Nuevo activo digital"} onClose={() => setModal(null)}>
          <ActivoForm item={modal.item} proyectos={data.proyectos} onSave={(v) => {
            if (modal.item.id) { onEdit(modal.item.id, v); setModal(null); return; }
            const nuevoId = uid();
            onAdd({ ...v, id: nuevoId });
            setModal({ item: v, paso: "tarea", origenId: nuevoId });
          }} />
        </Modal>
      )}
      {modal && modal.paso === "tarea" && (
        <Modal title="Tarea relacionada" onClose={() => setModal(null)}>
          <PromptTareaRelacionada
            origenTabla="activos" origenId={modal.origenId} proyectoId={modal.item.proyectoId}
            descripcionSugerida={`Renovar ${modal.item.nombre}`}
            fechaSugerida={modal.item.fechaVencimiento}
            onCrear={(t) => { onCrearTarea(t); setModal(null); }}
            onOmitir={() => setModal(null)}
          />
        </Modal>
      )}
    </div>
  );
}

function ActivoForm({ item, proyectos, onSave }) {
  const [v, setV] = useState(item);
  const [error, setError] = useState("");
  return (
    <div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="Tipo"><select className="gp-input" value={v.tipo} onChange={(e) => setV({ ...v, tipo: e.target.value })}>{TIPO_ACTIVO.map((c) => <option key={c}>{c}</option>)}</select></Field>
        <Field label="Nombre"><input className="gp-input" placeholder="ej. armoniq.mx, marca ARKeyData" value={v.nombre} onChange={(e) => setV({ ...v, nombre: e.target.value })} /></Field>
      </div>
      <Field label="Proyecto relacionado">
        <select className="gp-input" value={v.proyectoId} onChange={(e) => setV({ ...v, proyectoId: e.target.value })}>
          <option value="">— ninguno —</option>
          {ordenadosPorNombre(proyectos).map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
        </select>
      </Field>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="Fecha de vencimiento"><input type="date" className="gp-input" value={v.fechaVencimiento} onChange={(e) => setV({ ...v, fechaVencimiento: e.target.value })} /></Field>
        <Field label="Costo de renovación"><MoneyInput className="gp-input" value={v.costoRenovacion} onChange={(val) => setV({ ...v, costoRenovacion: val })} /></Field>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="Proveedor"><input className="gp-input" placeholder="ej. AKKY, GoDaddy, IMPI" value={v.proveedor || ""} onChange={(e) => setV({ ...v, proveedor: e.target.value })} /></Field>
        <Field label="Cuenta propietaria"><input className="gp-input" placeholder="ej. cuenta principal, cuenta ARKEYMEDIA" value={v.cuentaPropietaria || ""} onChange={(e) => setV({ ...v, cuentaPropietaria: e.target.value })} /></Field>
      </div>
      <Field label="URL o identificador"><input className="gp-input" placeholder="ej. https://... o número de expediente" value={v.urlIdentificador || ""} onChange={(e) => setV({ ...v, urlIdentificador: e.target.value })} /></Field>
      <label className="flex items-center gap-2 mb-3 text-sm cursor-pointer select-none">
        <input type="checkbox" checked={!!v.renovacionAutomatica} onChange={(e) => setV({ ...v, renovacionAutomatica: e.target.checked })} style={{ width: 16, height: 16, accentColor: "var(--gold)" }} />
        Renovación automática
      </label>
      {v.renovacionAutomatica && (
        <div className="mb-3">
          <Field label="Frecuencia de renovación">
            <select className="gp-input" value={v.frecuenciaRenovacion || "Anual"} onChange={(e) => setV({ ...v, frecuenciaRenovacion: e.target.value })}>{FRECUENCIA.map((c) => <option key={c}>{c}</option>)}</select>
          </Field>
          {Number(v.costoRenovacion) > 0 && (
            <p className="text-xs gp-text-muted">ARKEYONE creará/actualizará un egreso recurrente en Finanzas por {fmtMoney(v.costoRenovacion)} ({(v.frecuenciaRenovacion || "Anual").toLowerCase()}), ligado a este activo.</p>
          )}
        </div>
      )}
      <Field label="Notas"><textarea className="gp-input" rows={2} value={v.notas} onChange={(e) => setV({ ...v, notas: e.target.value })} /></Field>
      {error && <p className="text-xs gp-text-red mb-2">{error}</p>}

      <button className="gp-btn w-full py-2 text-sm mt-2" onClick={() => { if (!v.nombre?.toString().trim()) { setError("El nombre del activo es obligatorio."); return; } setError(""); onSave(v); }}>Guardar</button>
    </div>
  );
}
