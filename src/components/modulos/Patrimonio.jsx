// src/components/modulos/Patrimonio.jsx
//
// Modulo perezoso (Fase 2). Salio de App.jsx el 5 oct 2026; se mudaron con el sus propias
// piezas (CATEGORIAS_PATRIMONIO, PatrimonioForm, ValuacionForm), que nadie mas usaba.

import Bitacora from "../comunes/Bitacora";
import { Badge, Field, IconBtn } from "../ui/basicos";
import { BarraListaEstandar, OrdenSelector } from "../ui/tablas";
import { MessageCircle, Pencil, Plus, Trash2 } from "lucide-react";
import { Modal } from "../ui/Modal";
import { MoneyInput } from "../ui/campos";
import { exportarFilasExcel, exportarFilasPDF } from "../../lib/exportar";
import { filtrarPorBusqueda, ordenAlfabetico, ordenarLista } from "../../lib/listas";
import { fmtMoney, todayISO } from "../../lib/formato";
import { useState } from "react";

const CATEGORIAS_PATRIMONIO = ordenAlfabetico(["Inmueble", "Auto", "Joyería", "Equipo de audio", "Electrónica", "Muebles", "Otro"]);

/* ---------- Patrimonio (bienes con historial de valuaciones) ---------- */
export default function Patrimonio({ data, onAdd, onEdit, onRemove, onAddValuacion, onRemoveValuacion, onAddComentario, onRemoveComentario }) {
  const [modal, setModal] = useState(null);
  const [valuacionModal, setValuacionModal] = useState(null); // { bien }
  const [historialDe, setHistorialDe] = useState(null); // { bien }
  const [comentariosDe, setComentariosDe] = useState(null);
  const [filtroCategoria, setFiltroCategoria] = useState("Todas");
  const [orden, setOrden] = useState("default");
  const [ordenDir, setOrdenDir] = useState("asc");
  const [busqueda, setBusqueda] = useState("");
  const toggleOrden = (key) => { if (orden === key) setOrdenDir((d) => (d === "asc" ? "desc" : "asc")); else { setOrden(key); setOrdenDir("asc"); } };
  const empty = { nombre: "", categoria: "Inmueble", fechaAdquisicion: todayISO(), valorAdquisicion: "", notas: "" };

  const valuacionesDe = (id) => (data.patrimonioValuaciones || []).filter((v) => v.patrimonioId === id).sort((a, b) => (b.fecha || "").localeCompare(a.fecha || ""));
  const valorActual = (bien) => {
    const vals = valuacionesDe(bien.id);
    return vals.length ? Number(vals[0].valor) : Number(bien.valorAdquisicion) || 0;
  };
  const nComentarios = (id) => (data.comentarios || []).filter((c) => c.entidadTipo === "patrimonio" && c.entidadId === id).length;

  const camposOrden = {
    alfabetico: { get: (b) => b.nombre, tipo: "texto" },
    registro: { get: (b) => b.createdAt, tipo: "fecha" },
    adquisicion: { get: (b) => b.fechaAdquisicion, tipo: "fecha" },
    valor: { get: (b) => valorActual(b), tipo: "numero" },
  };
  const opcionesOrden = [
    { key: "alfabetico", label: "alfabético" },
    { key: "registro", label: "fecha de registro" },
    { key: "adquisicion", label: "fecha de adquisición" },
    { key: "valor", label: "valor actual" },
  ];

  let bienes = data.patrimonio;
  if (filtroCategoria !== "Todas") bienes = bienes.filter((b) => b.categoria === filtroCategoria);
  bienes = filtrarPorBusqueda(bienes, busqueda, [(b) => b.nombre, (b) => b.categoria, (b) => b.notas]);
  const ordenados = ordenarLista(bienes, orden, camposOrden, ordenDir);
  const totalPatrimonio = ordenados.reduce((s, b) => s + valorActual(b), 0);
  const totalAdquisicion = ordenados.reduce((s, b) => s + (Number(b.valorAdquisicion) || 0), 0);
  const columnasExport = [
    { label: "Nombre", get: (b) => b.nombre }, { label: "Categoría", get: (b) => b.categoria },
    { label: "Fecha de adquisición", get: (b) => b.fechaAdquisicion }, { label: "Valor de adquisición", get: (b) => b.valorAdquisicion },
    { label: "Valor actual", get: (b) => valorActual(b) }, { label: "Notas", get: (b) => b.notas },
  ];

  return (
    <div>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-1">
        <h2 className="gp-serif text-2xl">Patrimonio</h2>
        <button onClick={() => setModal({ item: empty })} className="gp-btn flex items-center justify-center gap-1 px-3 py-1.5 text-sm w-full sm:w-auto"><Plus size={14} /> Nuevo bien</button>
      </div>
      <p className="text-sm gp-text-muted mb-3">Inmuebles, autos, joyería, equipo — con historial de valuaciones para registrar plusvalía o minusvalía a lo largo del tiempo.</p>

      <div className="gp-panel p-4 mb-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div><p className="text-xs gp-text-muted">Valor de adquisición (total)</p><p className="gp-serif text-lg">{fmtMoney(totalAdquisicion)}</p></div>
        <div><p className="text-xs gp-text-muted">Valor actual estimado</p><p className="gp-serif text-lg gp-text-teal">{fmtMoney(totalPatrimonio)}</p></div>
        <div>
          <p className="text-xs gp-text-muted">Plusvalía / minusvalía</p>
          <p className={`gp-serif text-lg ${totalPatrimonio - totalAdquisicion >= 0 ? "gp-text-teal" : "gp-text-red"}`}>{fmtMoney(totalPatrimonio - totalAdquisicion)}</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 mb-2">
        <select className="gp-input text-xs py-1.5" style={{ width: "auto" }} value={filtroCategoria} onChange={(e) => setFiltroCategoria(e.target.value)}>
          <option value="Todas">Todas las categorías</option>
          {CATEGORIAS_PATRIMONIO.map((c) => <option key={c}>{c}</option>)}
        </select>
        <OrdenSelector opciones={opcionesOrden} value={orden} onChange={setOrden} />
      </div>
      <BarraListaEstandar busqueda={busqueda} onBusqueda={setBusqueda} placeholder="Buscar por nombre, categoría o notas…"
        onExportExcel={() => exportarFilasExcel(ordenados, columnasExport, "patrimonio")}
        onExportPDF={() => exportarFilasPDF(ordenados, columnasExport, "patrimonio", "Patrimonio", `categoría: ${filtroCategoria}${busqueda ? ` · búsqueda: "${busqueda}"` : ""}`)} />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {ordenados.map((b) => {
          const actual = valorActual(b);
          const adquisicion = Number(b.valorAdquisicion) || 0;
          const diferencia = actual - adquisicion;
          const pct = adquisicion ? (diferencia / adquisicion) * 100 : 0;
          const nc = nComentarios(b.id);
          return (
            <div key={b.id} className="gp-panel p-4">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-medium">{b.nombre}</p>
                    <Badge tone="muted">{b.categoria}</Badge>
                  </div>
                  <p className="text-xs gp-text-muted mt-0.5">Adquirido {b.fechaAdquisicion || "—"} por {fmtMoney(adquisicion)}</p>
                </div>
                <div className="flex gap-1">
                  <IconBtn title="Comentarios" onClick={() => setComentariosDe(b)}><MessageCircle size={13} />{nc > 0 && <span className="gp-mono" style={{ fontSize: 9, marginLeft: 2 }}>{nc}</span>}</IconBtn>
                  <IconBtn title="Editar" onClick={() => setModal({ item: b })}><Pencil size={13} /></IconBtn><IconBtn title="Eliminar" onClick={() => onRemove(b.id)}><Trash2 size={13} /></IconBtn>
                </div>
              </div>
              <div className="mt-3 flex items-end justify-between">
                <div>
                  <p className="text-xs gp-text-muted">Valor actual</p>
                  <p className="gp-serif text-lg">{fmtMoney(actual)}</p>
                </div>
                {adquisicion > 0 && (
                  <Badge tone={diferencia >= 0 ? "teal" : "red"}>{diferencia >= 0 ? "+" : ""}{fmtMoney(diferencia)} ({pct >= 0 ? "+" : ""}{pct.toFixed(0)}%)</Badge>
                )}
              </div>
              {b.notas && <p className="text-xs mt-2 gp-text-muted">{b.notas}</p>}
              <div className="flex gap-2 mt-3">
                <button onClick={() => setValuacionModal({ bien: b })} className="gp-btn-ghost flex-1 py-1.5 text-xs">Registrar valuación</button>
                <button onClick={() => setHistorialDe({ bien: b })} className="gp-btn-ghost flex-1 py-1.5 text-xs">Ver historial ({valuacionesDe(b.id).length})</button>
              </div>
            </div>
          );
        })}
        {ordenados.length === 0 && <p className="text-sm gp-text-muted col-span-2">Aún no registras bienes patrimoniales.</p>}
      </div>

      {comentariosDe && (
        <Modal title={`Comentarios — ${comentariosDe.nombre}`} onClose={() => setComentariosDe(null)}>
          <Bitacora data={data} entidadTipo="patrimonio" entidadId={comentariosDe.id} onAdd={onAddComentario} onRemove={onRemoveComentario} />
        </Modal>
      )}

      {valuacionModal && (
        <Modal title={`Registrar valuación — ${valuacionModal.bien.nombre}`} onClose={() => setValuacionModal(null)}>
          <ValuacionForm onSave={(v) => { onAddValuacion({ ...v, patrimonioId: valuacionModal.bien.id }); setValuacionModal(null); }} />
        </Modal>
      )}

      {historialDe && (
        <Modal title={`Historial de valuaciones — ${historialDe.bien.nombre}`} onClose={() => setHistorialDe(null)}>
          <div className="space-y-2">
            <p className="text-xs gp-text-muted mb-2">Valor de adquisición: {fmtMoney(historialDe.bien.valorAdquisicion)} ({historialDe.bien.fechaAdquisicion || "sin fecha"})</p>
            {valuacionesDe(historialDe.bien.id).map((v) => (
              <div key={v.id} className="gp-panel p-3 flex items-center justify-between text-sm">
                <div>
                  <p className="gp-mono">{v.fecha}</p>
                  {v.notas && <p className="text-xs gp-text-muted">{v.notas}</p>}
                </div>
                <div className="flex items-center gap-2">
                  <span className="gp-mono">{fmtMoney(v.valor)}</span>
                  <IconBtn title="Eliminar" onClick={() => onRemoveValuacion(v.id)}><Trash2 size={13} /></IconBtn>
                </div>
              </div>
            ))}
            {valuacionesDe(historialDe.bien.id).length === 0 && <p className="text-xs gp-text-muted">Sin valuaciones registradas todavía — el valor actual es el de adquisición.</p>}
          </div>
        </Modal>
      )}

      {modal && (
        <Modal title={modal.item.id ? "Editar bien" : "Nuevo bien"} onClose={() => setModal(null)}>
          <PatrimonioForm item={modal.item} onSave={(v) => { modal.item.id ? onEdit(modal.item.id, v) : onAdd(v); setModal(null); }} />
        </Modal>
      )}
    </div>
  );
}

function PatrimonioForm({ item, onSave }) {
  const [v, setV] = useState(item);
  const [error, setError] = useState("");
  return (
    <div>
      <Field label="Nombre"><input className="gp-input" placeholder="ej. Depa Subancuy, Honda Civic, Reloj X" value={v.nombre} onChange={(e) => setV({ ...v, nombre: e.target.value })} /></Field>
      <Field label="Categoría"><select className="gp-input" value={v.categoria} onChange={(e) => setV({ ...v, categoria: e.target.value })}>{CATEGORIAS_PATRIMONIO.map((c) => <option key={c}>{c}</option>)}</select></Field>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="Fecha de adquisición"><input type="date" className="gp-input" value={v.fechaAdquisicion || ""} onChange={(e) => setV({ ...v, fechaAdquisicion: e.target.value })} /></Field>
        <Field label="Valor de adquisición"><MoneyInput className="gp-input" value={v.valorAdquisicion} onChange={(val) => setV({ ...v, valorAdquisicion: val })} /></Field>
      </div>
      <Field label="Notas"><textarea className="gp-input" rows={2} value={v.notas} onChange={(e) => setV({ ...v, notas: e.target.value })} /></Field>
      {error && <p className="text-xs gp-text-red mb-2">{error}</p>}

      <button className="gp-btn w-full py-2 text-sm mt-2" onClick={() => { if (!v.nombre?.toString().trim()) { setError("El nombre es obligatorio."); return; } setError(""); onSave(v); }}>Guardar</button>
    </div>
  );
}

function ValuacionForm({ onSave }) {
  const [v, setV] = useState({ fecha: todayISO(), valor: "", notas: "" });
  const [error, setError] = useState("");
  return (
    <div>
      <Field label="Fecha de la valuación"><input type="date" className="gp-input" value={v.fecha} onChange={(e) => setV({ ...v, fecha: e.target.value })} /></Field>
      <Field label="Valor estimado"><MoneyInput className="gp-input" value={v.valor} onChange={(val) => setV({ ...v, valor: val })} /></Field>
      <Field label="Notas (opcional)"><input className="gp-input" placeholder="ej. avalúo bancario, cotización de agente" value={v.notas} onChange={(e) => setV({ ...v, notas: e.target.value })} /></Field>
      {error && <p className="text-xs gp-text-red mb-2">{error}</p>}
      <button className="gp-btn w-full py-2 text-sm mt-2" onClick={() => { if (!v.valor) { setError("Captura el valor estimado."); return; } setError(""); onSave(v); }}>Guardar valuación</button>
    </div>
  );
}
