// src/components/modulos/Facturas.jsx
//
// Modulo perezoso (Fase 2). Salio de App.jsx el 5 oct 2026; se mudaron con el sus propias
// piezas (TIPO_FACTURA, ESTATUS_FACTURA, TASA_IVA, FacturaForm), que nadie mas usaba.

import Bitacora from "../comunes/Bitacora";
import { Badge, Field, IconBtn } from "../ui/basicos";
import { MessageCircle, Pencil, Plus, Trash2 } from "lucide-react";
import { Modal } from "../ui/Modal";
import { MoneyInput } from "../ui/campos";
import { OrdenSelector, Th } from "../ui/tablas";
import { fmtMoney, todayISO, uid } from "../../lib/formato";
import { ordenadosPorNombre, ordenarLista } from "../../lib/listas";
import { useState } from "react";

const TIPO_FACTURA = ["Emitida", "Recibida"];

const ESTATUS_FACTURA = ["Pendiente", "Pagada", "Cancelada"];

const TASA_IVA = 0.16;

/* ---------- Facturas e IVA ---------- */
export default function Facturas({ data, onAdd, onEdit, onRemove, onAddComentario, onRemoveComentario, onAddFinanzas }) {
  const [modal, setModal] = useState(null);
  const [comentariosDe, setComentariosDe] = useState(null);
  const [filtroTipo, setFiltroTipo] = useState("Todas");
  const [filtroMes, setFiltroMes] = useState(todayISO().slice(0, 7));
  const [orden, setOrden] = useState("default");
  const [ordenDir, setOrdenDir] = useState("asc");
  const toggleOrden = (key) => { if (orden === key) setOrdenDir((d) => (d === "asc" ? "desc" : "asc")); else { setOrden(key); setOrdenDir("asc"); } };
  const empty = { tipo: "Recibida", proyectoId: "", contactoId: "", folio: "", fecha: todayISO(), concepto: "", subtotal: "", iva: "", total: "", estatus: "Pendiente", notas: "", finanzasId: "" };

  const nombreProyecto = (id) => data.proyectos.find((p) => p.id === id)?.nombre || "—";
  const nombreContacto = (id) => data.contactos.find((c) => c.id === id)?.nombre || "—";
  const nComentarios = (id) => (data.comentarios || []).filter((c) => c.entidadTipo === "facturas" && c.entidadId === id).length;

  const camposOrden = {
    fecha: { get: (f) => f.fecha, tipo: "fecha" },
    registro: { get: (f) => f.createdAt, tipo: "fecha" },
    alfabetico: { get: (f) => f.folio || f.concepto, tipo: "texto" },
    total: { get: (f) => Number(f.total) || 0, tipo: "numero" },
  };
  const opcionesOrden = [
    { key: "fecha", label: "fecha" },
    { key: "registro", label: "fecha de registro" },
    { key: "alfabetico", label: "alfabético (folio)" },
    { key: "total", label: "total" },
  ];

  let filtradas = data.facturas.filter((f) => f.estatus !== "Cancelada" || true); // se listan todas, canceladas visibles con badge
  if (filtroTipo !== "Todas") filtradas = filtradas.filter((f) => f.tipo === filtroTipo);
  if (filtroMes !== "Todos") filtradas = filtradas.filter((f) => (f.fecha || "").slice(0, 7) === filtroMes);
  const base = orden === "default" ? [...filtradas].sort((a, b) => (b.fecha || "").localeCompare(a.fecha || "")) : filtradas;
  const ordenadas = ordenarLista(base, orden, camposOrden, ordenDir);

  // IVA: solo cuenta facturas no canceladas, respetando el filtro de mes/tipo actual (menos el de tipo, que ignoramos aquí).
  const paraIva = data.facturas.filter((f) => f.estatus !== "Cancelada" && (filtroMes === "Todos" || (f.fecha || "").slice(0, 7) === filtroMes));
  const ivaTrasladado = paraIva.filter((f) => f.tipo === "Emitida").reduce((s, f) => s + (Number(f.iva) || 0), 0);
  const ivaAcreditable = paraIva.filter((f) => f.tipo === "Recibida").reduce((s, f) => s + (Number(f.iva) || 0), 0);
  const diferencia = ivaTrasladado - ivaAcreditable;
  const meses = [...new Set(data.facturas.map((f) => (f.fecha || "").slice(0, 7)).filter(Boolean))].sort().reverse();

  return (
    <div>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-1">
        <h2 className="gp-serif text-2xl">Facturas e IVA</h2>
        <button onClick={() => setModal({ item: empty })} className="gp-btn flex items-center justify-center gap-1 px-3 py-1.5 text-sm w-full sm:w-auto"><Plus size={14} /> Nueva factura</button>
      </div>
      <p className="text-sm gp-text-muted mb-3">Facturas emitidas y recibidas, con IVA trasladado/acreditable estimado.</p>

      <div className="gp-panel p-4 mb-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-2">
          <div><p className="text-xs gp-text-muted">IVA trasladado (cobrado)</p><p className="gp-serif text-lg gp-text-teal">{fmtMoney(ivaTrasladado)}</p></div>
          <div><p className="text-xs gp-text-muted">IVA acreditable (pagado)</p><p className="gp-serif text-lg gp-text-gold">{fmtMoney(ivaAcreditable)}</p></div>
          <div><p className="text-xs gp-text-muted">Diferencia estimada a pagar</p><p className={`gp-serif text-lg ${diferencia >= 0 ? "gp-text-red" : "gp-text-teal"}`}>{fmtMoney(diferencia)}</p></div>
        </div>
        <p className="text-xs gp-text-muted">
          {filtroMes === "Todos" ? "Considerando todo tu historial." : `Considerando el mes ${filtroMes}.`} Esto es una estimación de referencia — <strong>no sustituye a un contador</strong> ni a tu declaración fiscal real.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div className="flex flex-wrap gap-1">
          {["Todas", "Emitida", "Recibida"].map((t) => (
            <button key={t} onClick={() => setFiltroTipo(t)} className={`text-xs px-2.5 py-1 rounded-full border ${filtroTipo === t ? "gp-btn" : "gp-text-muted"}`}>{t === "Todas" ? "Todas" : t + "s"}</button>
          ))}
        </div>
        <select className="gp-input text-xs py-1.5" style={{ width: "auto" }} value={filtroMes} onChange={(e) => setFiltroMes(e.target.value)}>
          <option value="Todos">Todos los meses</option>
          {meses.map((m) => <option key={m} value={m}>{m}</option>)}
        </select>
        <OrdenSelector opciones={opcionesOrden} value={orden} onChange={setOrden} />
      </div>

      <div className="gp-panel overflow-x-auto">
        <table className="gp-table">
          <thead><tr><Th label="Folio" sortKey="alfabetico" orden={orden} ordenDir={ordenDir} onToggle={toggleOrden} /><th>Tipo</th><Th label="Fecha" sortKey="fecha" orden={orden} ordenDir={ordenDir} onToggle={toggleOrden} /><th>Proyecto</th><th>Contacto</th><th>Subtotal</th><th>IVA</th><Th label="Total" sortKey="total" orden={orden} ordenDir={ordenDir} onToggle={toggleOrden} /><th>Estatus</th><th>Movimiento</th><th></th></tr></thead>
          <tbody>
            {ordenadas.map((f) => {
              const nc = nComentarios(f.id);
              return (
                <tr key={f.id} style={f.estatus === "Cancelada" ? { opacity: 0.5 } : undefined}>
                  <td>{f.folio || "—"}</td>
                  <td><Badge tone={f.tipo === "Emitida" ? "teal" : "gold"}>{f.tipo}</Badge></td>
                  <td className="gp-mono">{f.fecha || "—"}</td>
                  <td className="gp-text-muted">{nombreProyecto(f.proyectoId)}</td>
                  <td className="gp-text-muted">{f.contactoId ? nombreContacto(f.contactoId) : "—"}</td>
                  <td className="gp-mono">{fmtMoney(f.subtotal)}</td>
                  <td className="gp-mono">{fmtMoney(f.iva)}</td>
                  <td className="gp-mono">{fmtMoney(f.total)}</td>
                  <td>
                    <select className="gp-input" style={{ padding: "2px 6px" }} value={f.estatus} onChange={(e) => onEdit(f.id, { estatus: e.target.value })}>
                      {ESTATUS_FACTURA.map((s) => <option key={s}>{s}</option>)}
                    </select>
                  </td>
                  <td>{f.finanzasId ? <Badge tone="teal">🔗 Vinculada</Badge> : <Badge tone="muted">Sin vincular</Badge>}</td>
                  <td><div className="flex gap-1">
                    <IconBtn title="Comentarios" onClick={() => setComentariosDe(f)}><MessageCircle size={13} />{nc > 0 && <span className="gp-mono" style={{ fontSize: 9, marginLeft: 2 }}>{nc}</span>}</IconBtn>
                    <IconBtn title="Editar" onClick={() => setModal({ item: f })}><Pencil size={13} /></IconBtn><IconBtn title="Eliminar" onClick={() => onRemove(f.id)}><Trash2 size={13} /></IconBtn>
                  </div></td>
                </tr>
              );
            })}
            {ordenadas.length === 0 && <tr><td colSpan={11} className="text-center gp-text-muted py-6">Sin facturas registradas con este filtro.</td></tr>}
          </tbody>
        </table>
      </div>

      {comentariosDe && (
        <Modal title={`Comentarios — ${comentariosDe.folio || comentariosDe.concepto || "Factura"}`} onClose={() => setComentariosDe(null)}>
          <Bitacora data={data} entidadTipo="facturas" entidadId={comentariosDe.id} onAdd={onAddComentario} onRemove={onRemoveComentario} />
        </Modal>
      )}

      {modal && (
        <Modal title={modal.item.id ? "Editar factura" : "Nueva factura"} onClose={() => setModal(null)}>
          <FacturaForm item={modal.item} proyectos={data.proyectos} contactos={data.contactos} finanzas={data.finanzas} onAddFinanzas={onAddFinanzas} onSave={(v) => { modal.item.id ? onEdit(modal.item.id, v) : onAdd(v); setModal(null); }} />
        </Modal>
      )}
    </div>
  );
}

function FacturaForm({ item, proyectos, contactos, finanzas, onAddFinanzas, onSave }) {
  const [v, setV] = useState(item);
  const [error, setError] = useState("");
  const [creandoMov, setCreandoMov] = useState(false);

  const setSubtotal = (val) => {
    const subtotal = Number(val) || 0;
    const iva = Math.round(subtotal * TASA_IVA * 100) / 100;
    setV({ ...v, subtotal: val, iva: String(iva), total: String(subtotal + iva) });
  };

  return (
    <div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="Tipo"><select className="gp-input" value={v.tipo} onChange={(e) => setV({ ...v, tipo: e.target.value })}>{TIPO_FACTURA.map((c) => <option key={c}>{c}</option>)}</select></Field>
        <Field label="Fecha"><input type="date" className="gp-input" value={v.fecha} onChange={(e) => setV({ ...v, fecha: e.target.value })} /></Field>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="Folio (opcional)"><input className="gp-input" value={v.folio} onChange={(e) => setV({ ...v, folio: e.target.value })} /></Field>
        <Field label="Estatus"><select className="gp-input" value={v.estatus} onChange={(e) => setV({ ...v, estatus: e.target.value })}>{ESTATUS_FACTURA.map((c) => <option key={c}>{c}</option>)}</select></Field>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="Proyecto">
          <select className="gp-input" value={v.proyectoId} onChange={(e) => setV({ ...v, proyectoId: e.target.value })}>
            <option value="">— sin proyecto —</option>
            {ordenadosPorNombre(proyectos).map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
          </select>
        </Field>
        <Field label="Contacto (cliente o proveedor)">
          <select className="gp-input" value={v.contactoId || ""} onChange={(e) => setV({ ...v, contactoId: e.target.value })}>
            <option value="">— sin contacto —</option>
            {ordenadosPorNombre(contactos).map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
          </select>
        </Field>
      </div>
      <Field label="Concepto"><input className="gp-input" placeholder="ej. Servicio de desarrollo, renta de equipo" value={v.concepto} onChange={(e) => setV({ ...v, concepto: e.target.value })} /></Field>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Field label="Subtotal"><MoneyInput className="gp-input" value={v.subtotal} onChange={(val) => setSubtotal(val)} /></Field>
        <Field label="IVA (16% automático, editable)"><MoneyInput className="gp-input" value={v.iva} onChange={(val) => setV({ ...v, iva: val, total: String((Number(v.subtotal) || 0) + (Number(val) || 0)) })} /></Field>
        <Field label="Total"><MoneyInput className="gp-input" value={v.total} onChange={(val) => setV({ ...v, total: val })} /></Field>
      </div>
      <Field label="Notas"><textarea className="gp-input" rows={2} value={v.notas} onChange={(e) => setV({ ...v, notas: e.target.value })} /></Field>

      <div className="gp-panel p-3 mb-3">
        <p className="text-xs font-medium mb-2">Movimiento en Finanzas relacionado</p>
        <p className="text-xs gp-text-muted mb-2">El importe real vive en Finanzas; esta factura solo es su información fiscal relacionada (secc. 23.10).</p>
        <Field label={`Vincular a un ${v.tipo === "Emitida" ? "ingreso" : "egreso"} existente`}>
          <select className="gp-input" value={v.finanzasId || ""} onChange={(e) => setV({ ...v, finanzasId: e.target.value })}>
            <option value="">— sin vincular —</option>
            {(finanzas || []).filter((f) => f.tipo === (v.tipo === "Emitida" ? "Ingreso" : "Egreso"))
              .sort((a, b) => (b.fecha || "").localeCompare(a.fecha || ""))
              .map((f) => <option key={f.id} value={f.id}>{f.concepto || f.categoria || "(sin concepto)"} · {f.fecha} · {fmtMoney(f.monto)}</option>)}
          </select>
        </Field>
        {v.finanzasId ? (
          <p className="text-xs gp-text-teal mt-1">🔗 Vinculada a un movimiento de Finanzas.</p>
        ) : (
          <button type="button" disabled={creandoMov} className="text-xs px-2.5 py-1.5 rounded gp-btn-ghost mt-1"
            onClick={async () => {
              if (!onAddFinanzas) return;
              setCreandoMov(true);
              const nuevoId = uid();
              await onAddFinanzas({
                id: nuevoId, tipo: v.tipo === "Emitida" ? "Ingreso" : "Egreso", categoria: "Factura",
                concepto: v.concepto || v.folio || "Factura", monto: v.total || 0, fecha: v.fecha,
                proyectoId: v.proyectoId, contactoId: v.contactoId, forma: "Transferencia",
                estatus: v.estatus === "Pagada" ? "Cobrado" : "Pendiente", esRecurrente: false,
              });
              setCreandoMov(false);
              setV((prev) => ({ ...prev, finanzasId: nuevoId }));
            }}>{creandoMov ? "Creando…" : "＋ Crear movimiento en Finanzas con estos datos"}</button>
        )}
      </div>

      <p className="text-xs gp-text-muted mb-3">Esta información es de referencia para tu control interno — no sustituye a un contador ni a tu declaración fiscal real.</p>
      {error && <p className="text-xs gp-text-red mb-2">{error}</p>}

      <button className="gp-btn w-full py-2 text-sm mt-2" onClick={() => { if (!v.concepto?.toString().trim()) { setError("El concepto es obligatorio."); return; } setError(""); onSave(v); }}>Guardar</button>
    </div>
  );
}
