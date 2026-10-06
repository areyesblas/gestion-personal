// src/components/modulos/Actividades.jsx
//
// Modulo perezoso (Fase 2). Salio de App.jsx el 5 oct 2026; se mudaron con el sus propias
// piezas (TIPO_ACTIVIDAD, ActividadForm), que nadie mas usaba.

import { Badge, Field, IconBtn } from "../ui/basicos";
import { Modal } from "../ui/Modal";
import { MoneyInput } from "../ui/campos";
import { OrdenSelector, Th } from "../ui/tablas";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { fmtMoney, todayISO } from "../../lib/formato";
import { ordenAlfabetico, ordenadosPorNombre, ordenarLista } from "../../lib/listas";
import { useState } from "react";

const TIPO_ACTIVIDAD = ordenAlfabetico(["Gym", "Evento", "Capacitación", "Otro"]);

/* ---------- Actividades ---------- */
export default function Actividades({ data, onAdd, onEdit, onRemove }) {
  const [modal, setModal] = useState(null);
  const [orden, setOrden] = useState("default");
  const [ordenDir, setOrdenDir] = useState("asc");
  const toggleOrden = (key) => { if (orden === key) setOrdenDir((d) => (d === "asc" ? "desc" : "asc")); else { setOrden(key); setOrdenDir("asc"); } };
  const empty = { tipo: "Gym", nombre: "", fecha: todayISO(), proyectoId: "", ganancia: "", notas: "" };
  const camposOrden = {
    fecha: { get: (a) => a.fecha, tipo: "fecha" },
    registro: { get: (a) => a.createdAt, tipo: "fecha" },
    alfabetico: { get: (a) => a.nombre, tipo: "texto" },
  };
  const opcionesOrden = [
    { key: "fecha", label: "fecha" },
    { key: "registro", label: "fecha de registro" },
    { key: "alfabetico", label: "alfabético" },
  ];
  const base = orden === "default" ? [...data.actividades].sort((a, b) => (b.fecha || "").localeCompare(a.fecha || "")) : data.actividades;
  const ordenados = ordenarLista(base, orden, camposOrden, ordenDir);
  const nombreProyecto = (id) => data.proyectos.find((p) => p.id === id)?.nombre || "—";

  return (
    <div>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-1">
        <h2 className="gp-serif text-2xl">Diario</h2>
        <button onClick={() => setModal({ item: empty })} className="gp-btn flex items-center justify-center gap-1 px-3 py-1.5 text-sm w-full sm:w-auto"><Plus size={14} /> Registrar</button>
      </div>
      <p className="text-sm gp-text-muted mb-3">Tu diario: escribe aquí tu día a día por fecha — gym, eventos, capacitación (PLC's, Vibe Coding/SDD, inglés), o cualquier cosa que valga la pena recordar de ese día.</p>
      <div className="mb-4"><OrdenSelector opciones={opcionesOrden} value={orden} onChange={setOrden} /></div>

      <div className="gp-panel overflow-x-auto">
        <table className="gp-table">
          <thead><tr><Th label="Fecha" sortKey="fecha" orden={orden} ordenDir={ordenDir} onToggle={toggleOrden} /><th>Tipo</th><Th label="Actividad" sortKey="alfabetico" orden={orden} ordenDir={ordenDir} onToggle={toggleOrden} /><th>Proyecto</th><th>Ganancia</th><th>Notas</th><th></th></tr></thead>
          <tbody>
            {ordenados.map((a) => (
              <tr key={a.id}>
                <td className="gp-mono">{a.fecha}</td>
                <td><Badge tone="muted">{a.tipo}</Badge></td>
                <td>{a.nombre}</td>
                <td className="gp-text-muted">{nombreProyecto(a.proyectoId)}</td>
                <td className="gp-mono gp-text-teal">{a.ganancia ? fmtMoney(a.ganancia) : "—"}</td>
                <td className="gp-text-muted">{a.notas}</td>
                <td><div className="flex gap-1"><IconBtn title="Editar" onClick={() => setModal({ item: a })}><Pencil size={13} /></IconBtn><IconBtn title="Eliminar" onClick={() => onRemove(a.id)}><Trash2 size={13} /></IconBtn></div></td>
              </tr>
            ))}
            {ordenados.length === 0 && <tr><td colSpan={7} className="text-center gp-text-muted py-6">Aún no has escrito nada en tu diario.</td></tr>}
          </tbody>
        </table>
      </div>

      {modal && (
        <Modal title={modal.item.id ? "Editar entrada del diario" : "Nueva entrada del diario"} onClose={() => setModal(null)}>
          <ActividadForm item={modal.item} proyectos={data.proyectos} onSave={(v) => { modal.item.id ? onEdit(modal.item.id, v) : onAdd(v); setModal(null); }} />
        </Modal>
      )}
    </div>
  );
}

function ActividadForm({ item, proyectos, onSave }) {
  const [v, setV] = useState(item);
  const [error, setError] = useState("");
  return (
    <div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="Tipo"><select className="gp-input" value={v.tipo} onChange={(e) => setV({ ...v, tipo: e.target.value })}>{TIPO_ACTIVIDAD.map((c) => <option key={c}>{c}</option>)}</select></Field>
        <Field label="Fecha"><input type="date" className="gp-input" value={v.fecha} onChange={(e) => setV({ ...v, fecha: e.target.value })} /></Field>
      </div>
      <Field label="Actividad"><input className="gp-input" placeholder="ej. Rutina de pierna, Curso de PLC's, Evento X" value={v.nombre} onChange={(e) => setV({ ...v, nombre: e.target.value })} /></Field>
      <Field label="Proyecto relacionado (opcional)">
        <select className="gp-input" value={v.proyectoId} onChange={(e) => setV({ ...v, proyectoId: e.target.value })}>
          <option value="">— ninguno —</option>
          {ordenadosPorNombre(proyectos).map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
        </select>
      </Field>
      <Field label="Ganancia generada (si aplica)"><MoneyInput className="gp-input" value={v.ganancia} onChange={(val) => setV({ ...v, ganancia: val })} /></Field>
      <Field label="Notas"><textarea className="gp-input" rows={2} value={v.notas} onChange={(e) => setV({ ...v, notas: e.target.value })} /></Field>
      {error && <p className="text-xs gp-text-red mb-2">{error}</p>}

      <button className="gp-btn w-full py-2 text-sm mt-2" onClick={() => { if (!v.nombre?.toString().trim()) { setError("El nombre de la actividad es obligatorio."); return; } setError(""); onSave(v); }}>Guardar</button>
    </div>
  );
}
