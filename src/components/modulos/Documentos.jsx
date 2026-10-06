// src/components/modulos/Documentos.jsx
//
// Modulo perezoso (Fase 2). Salio de App.jsx el 5 oct 2026; se mudaron con el sus propias
// piezas (TIPO_DOCUMENTO, DocumentoForm), que nadie mas usaba.

import PromptTareaRelacionada from "../comunes/PromptTareaRelacionada";
import { BarraListaEstandar, OrdenSelector, Th } from "../ui/tablas";
import { Field, IconBtn } from "../ui/basicos";
import { Modal } from "../ui/Modal";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { exportarFilasExcel, exportarFilasPDF } from "../../lib/exportar";
import { filtrarPorBusqueda, ordenAlfabetico, ordenadosPorNombre, ordenarLista } from "../../lib/listas";
import { uid } from "../../lib/formato";
import { useState } from "react";

const TIPO_DOCUMENTO = ordenAlfabetico(["Contrato", "Registro de marca (IMPI)", "Acta constitutiva", "Otro"]);

/* ---------- Documentos (antes "Legal y contratos", renombrado 22 sept 2026 secc. 9) ---------- */
export default function Documentos({ data, onAdd, onEdit, onRemove, onCrearTarea }) {
  const [modal, setModal] = useState(null);
  const [orden, setOrden] = useState("default");
  const [ordenDir, setOrdenDir] = useState("asc");
  const [busqueda, setBusqueda] = useState("");
  const toggleOrden = (key) => { if (orden === key) setOrdenDir((d) => (d === "asc" ? "desc" : "asc")); else { setOrden(key); setOrdenDir("asc"); } };
  const empty = { tipo: "Contrato", nombre: "", proyectoId: "", fechaVencimiento: "", notas: "" };
  const camposOrden = {
    vencimiento: { get: (d) => d.fechaVencimiento, tipo: "fecha" },
    registro: { get: (d) => d.createdAt, tipo: "fecha" },
    alfabetico: { get: (d) => d.nombre, tipo: "texto" },
  };
  const opcionesOrden = [
    { key: "vencimiento", label: "fecha de vencimiento" },
    { key: "registro", label: "fecha de registro" },
    { key: "alfabetico", label: "alfabético" },
  ];
  const nombreProyecto = (id) => data.proyectos.find((p) => p.id === id)?.nombre || "—";
  const buscados = filtrarPorBusqueda(data.documentos, busqueda, [(d) => d.nombre, (d) => d.tipo, (d) => d.notas, (d) => nombreProyecto(d.proyectoId)]);
  const base = orden === "default" ? [...buscados].sort((a, b) => (a.fechaVencimiento || "").localeCompare(b.fechaVencimiento || "")) : buscados;
  const ordenados = ordenarLista(base, orden, camposOrden, ordenDir);
  const columnasExport = [
    { label: "Documento", get: (d) => d.nombre }, { label: "Tipo", get: (d) => d.tipo },
    { label: "Proyecto", get: (d) => nombreProyecto(d.proyectoId) }, { label: "Vencimiento", get: (d) => d.fechaVencimiento },
    { label: "Notas", get: (d) => d.notas },
  ];

  return (
    <div>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-1">
        <h2 className="gp-serif text-2xl">Documentos</h2>
        <button onClick={() => setModal({ item: empty })} className="gp-btn flex items-center justify-center gap-1 px-3 py-1.5 text-sm w-full sm:w-auto"><Plus size={14} /> Nuevo</button>
      </div>
      <p className="text-sm gp-text-muted mb-3">Contratos, registros de marca ante IMPI y demás documentos, por proyecto.</p>
      <div className="mb-2"><OrdenSelector opciones={opcionesOrden} value={orden} onChange={setOrden} /></div>
      <BarraListaEstandar busqueda={busqueda} onBusqueda={setBusqueda} placeholder="Buscar por nombre, tipo, proyecto o notas…"
        onExportExcel={() => exportarFilasExcel(ordenados, columnasExport, "documentos")}
        onExportPDF={() => exportarFilasPDF(ordenados, columnasExport, "documentos", "Documentos", busqueda ? `búsqueda: "${busqueda}"` : "")} />

      <div className="gp-panel overflow-x-auto">
        <table className="gp-table">
          <thead><tr><Th label="Documento" sortKey="alfabetico" orden={orden} ordenDir={ordenDir} onToggle={toggleOrden} /><th>Tipo</th><th>Proyecto</th><Th label="Vencimiento" sortKey="vencimiento" orden={orden} ordenDir={ordenDir} onToggle={toggleOrden} /><th>Notas</th><th></th></tr></thead>
          <tbody>
            {ordenados.map((d) => (
              <tr key={d.id}>
                <td>{d.nombre}</td>
                <td className="gp-text-muted">{d.tipo}</td>
                <td className="gp-text-muted">{nombreProyecto(d.proyectoId)}</td>
                <td className="gp-mono">{d.fechaVencimiento || "—"}</td>
                <td className="gp-text-muted">{d.notas}</td>
                <td><div className="flex gap-1"><IconBtn title="Editar" onClick={() => setModal({ item: d })}><Pencil size={13} /></IconBtn><IconBtn title="Eliminar" onClick={() => onRemove(d.id)}><Trash2 size={13} /></IconBtn></div></td>
              </tr>
            ))}
            {ordenados.length === 0 && <tr><td colSpan={6} className="text-center gp-text-muted py-6">Sin documentos registrados.</td></tr>}
          </tbody>
        </table>
      </div>

      {modal && !modal.paso && (
        <Modal title={modal.item.id ? "Editar documento" : "Nuevo documento"} onClose={() => setModal(null)}>
          <DocumentoForm item={modal.item} proyectos={data.proyectos} onSave={(v) => {
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
            origenTabla="documentos" origenId={modal.origenId} proyectoId={modal.item.proyectoId}
            descripcionSugerida={`Dar seguimiento a ${modal.item.nombre}`}
            fechaSugerida={modal.item.fechaVencimiento}
            onCrear={(t) => { onCrearTarea(t); setModal(null); }}
            onOmitir={() => setModal(null)}
          />
        </Modal>
      )}
    </div>
  );
}

function DocumentoForm({ item, proyectos, onSave }) {
  const [v, setV] = useState(item);
  const [error, setError] = useState("");
  return (
    <div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="Tipo"><select className="gp-input" value={v.tipo} onChange={(e) => setV({ ...v, tipo: e.target.value })}>{TIPO_DOCUMENTO.map((c) => <option key={c}>{c}</option>)}</select></Field>
        <Field label="Nombre"><input className="gp-input" value={v.nombre} onChange={(e) => setV({ ...v, nombre: e.target.value })} /></Field>
      </div>
      <Field label="Proyecto relacionado">
        <select className="gp-input" value={v.proyectoId} onChange={(e) => setV({ ...v, proyectoId: e.target.value })}>
          <option value="">— ninguno —</option>
          {ordenadosPorNombre(proyectos).map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
        </select>
      </Field>
      <Field label="Fecha de vencimiento (si aplica)"><input type="date" className="gp-input" value={v.fechaVencimiento} onChange={(e) => setV({ ...v, fechaVencimiento: e.target.value })} /></Field>
      <Field label="Notas"><textarea className="gp-input" rows={2} value={v.notas} onChange={(e) => setV({ ...v, notas: e.target.value })} /></Field>
      {error && <p className="text-xs gp-text-red mb-2">{error}</p>}

      <button className="gp-btn w-full py-2 text-sm mt-2" onClick={() => { if (!v.nombre?.toString().trim()) { setError("El nombre del documento es obligatorio."); return; } setError(""); onSave(v); }}>Guardar</button>
    </div>
  );
}
