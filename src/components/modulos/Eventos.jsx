// src/components/modulos/Eventos.jsx
//
// Modulo perezoso (Fase 2). Salio de App.jsx el 5 oct 2026; se mudaron con el sus propias
// piezas (EventoForm), que nadie mas usaba.

import Bitacora from "../comunes/Bitacora";
import { Badge, Field, IconBtn } from "../ui/basicos";
import { Camera, ChevronDown, ChevronRight, Clock, Film, MapPin, Pencil, Plus, Trash2 } from "lucide-react";
import { Modal } from "../ui/Modal";
import { MoneyInput } from "../ui/campos";
import { OrdenSelector } from "../ui/tablas";
import { fmtMoney, todayISO } from "../../lib/formato";
import { ordenadosPorNombre, ordenarLista } from "../../lib/listas";
import { supabase } from "../../supabaseClient";
import { useState } from "react";

export default function Eventos({ data, onAdd, onEdit, onRemove, onAddComentario, onRemoveComentario }) {
  const [modal, setModal] = useState(null);
  const [expanded, setExpanded] = useState(null);
  const [orden, setOrden] = useState("default");
  const empty = { nombre: "", fecha: todayISO(), proyectoId: "", contactoId: "", lugar: "", horario: "", costo: "", gastos: "", utilidad: "", comentarios: "", media: [] };
  const camposOrden = {
    fecha: { get: (e) => e.fecha, tipo: "fecha" },
    registro: { get: (e) => e.createdAt, tipo: "fecha" },
    alfabetico: { get: (e) => e.nombre, tipo: "texto" },
    utilidad: { get: (e) => (e.utilidad !== "" && e.utilidad != null ? Number(e.utilidad) : null), tipo: "numero" },
  };
  const opcionesOrden = [
    { key: "fecha", label: "fecha" },
    { key: "registro", label: "fecha de registro" },
    { key: "alfabetico", label: "alfabético" },
    { key: "utilidad", label: "utilidad" },
  ];
  const base = orden === "default" ? [...data.eventos].sort((a, b) => (b.fecha || "").localeCompare(a.fecha || "")) : data.eventos;
  const ordenados = ordenarLista(base, orden, camposOrden);
  const nombreProyecto = (id) => data.proyectos.find((p) => p.id === id)?.nombre || "—";
  const nombreCliente = (id) => data.contactos.find((c) => c.id === id)?.nombre || "—";

  return (
    <div>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-1">
        <h2 className="gp-serif text-2xl">Eventos</h2>
        <button onClick={() => setModal({ item: empty })} className="gp-btn flex items-center justify-center gap-1 px-3 py-1.5 text-sm w-full sm:w-auto"><Plus size={14} /> Nuevo</button>
      </div>
      <p className="text-sm gp-text-muted mb-3">Shows y eventos, con lugar, horario, costo/gastos, utilidad, fotos y comentarios.</p>
      <div className="mb-4"><OrdenSelector opciones={opcionesOrden} value={orden} onChange={setOrden} /></div>

      <div className="space-y-2">
        {ordenados.map((e) => {
          const utilidad = e.utilidad !== "" && e.utilidad != null ? Number(e.utilidad) : (e.costo || e.gastos ? Number(e.costo || 0) - Number(e.gastos || 0) : null);
          return (
          <div key={e.id} className="gp-panel">
            <div className="p-3 flex items-start gap-3 cursor-pointer" onClick={() => setExpanded(expanded === e.id ? null : e.id)}>
              {expanded === e.id ? <ChevronDown size={15} className="mt-0.5 gp-text-muted" /> : <ChevronRight size={15} className="mt-0.5 gp-text-muted" />}
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-medium">{e.nombre}</span>
                  <span className="gp-mono text-xs gp-text-muted">{e.fecha}</span>
                  {e.lugar && <span className="text-xs gp-text-muted flex items-center gap-1"><MapPin size={11} /> {e.lugar}</span>}
                  {e.horario && <span className="text-xs gp-text-muted flex items-center gap-1"><Clock size={11} /> {e.horario}</span>}
                  {e.proyectoId && <Badge tone="muted">{nombreProyecto(e.proyectoId)}</Badge>}
                  {e.contactoId && <Badge tone="muted">{nombreCliente(e.contactoId)}</Badge>}
                  {e.media?.length > 0 && <Badge tone="gold">{e.media.length} archivo(s)</Badge>}
                  {utilidad !== null && <Badge tone={utilidad >= 0 ? "teal" : "red"}>{fmtMoney(utilidad)}</Badge>}
                </div>
                {e.comentarios && <p className="text-xs gp-text-muted mt-1">{e.comentarios}</p>}
              </div>
              <div className="flex gap-1" onClick={(ev) => ev.stopPropagation()}>
                <IconBtn title="Editar" onClick={() => setModal({ item: e })}><Pencil size={13} /></IconBtn>
                <IconBtn title="Eliminar" onClick={() => onRemove(e.id)}><Trash2 size={13} /></IconBtn>
              </div>
            </div>
            {expanded === e.id && (
              <div className="px-4 pb-4 border-t gp-border pt-3">
                {(e.costo || e.gastos) && (
                  <div className="flex gap-4 text-xs gp-text-muted mb-3">
                    {e.costo ? <span>Costo: <span className="gp-mono">{fmtMoney(e.costo)}</span></span> : null}
                    {e.gastos ? <span>Gastos: <span className="gp-mono">{fmtMoney(e.gastos)}</span></span> : null}
                  </div>
                )}
                {e.media?.length > 0 && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-3">
                    {e.media.map((m, i) => (
                      <a key={i} href={m.url} target="_blank" rel="noopener noreferrer" className="gp-panel-hi rounded overflow-hidden block" style={{ border: "1px solid var(--border)" }}>
                        {m.tipo === "video" ? (
                          <video src={m.url} className="w-full h-24 object-cover" muted />
                        ) : (
                          <img src={m.url} alt={m.nombre} className="w-full h-24 object-cover" />
                        )}
                        <div className="px-2 py-1 flex items-center gap-1 text-xs gp-text-muted">
                          {m.tipo === "video" ? <Film size={11} /> : <Camera size={11} />}
                          <span className="truncate">{m.nombre}</span>
                        </div>
                      </a>
                    ))}
                  </div>
                )}
                <div className="border-t gp-border pt-3">
                  <Bitacora data={data} entidadTipo="eventos" entidadId={e.id} onAdd={onAddComentario} onRemove={onRemoveComentario} />
                </div>
              </div>
            )}
          </div>
        );})}
        {ordenados.length === 0 && <p className="text-sm gp-text-muted">Sin eventos registrados todavía.</p>}
      </div>

      {modal && (
        <Modal title={modal.item.id ? "Editar evento" : "Nuevo evento"} onClose={() => setModal(null)}>
          <EventoForm item={modal.item} proyectos={data.proyectos} contactos={data.contactos} onSave={(v) => { modal.item.id ? onEdit(modal.item.id, v) : onAdd(v); setModal(null); }} />
        </Modal>
      )}
    </div>
  );
}

function EventoForm({ item, proyectos, contactos, onSave }) {
  const [v, setV] = useState(item);
  const [subiendo, setSubiendo] = useState(false);
  const [error, setError] = useState("");

  const setCostoGastos = (campo, val) => {
    const next = { ...v, [campo]: val };
    const costo = Number(campo === "costo" ? val : next.costo) || 0;
    const gastos = Number(campo === "gastos" ? val : next.gastos) || 0;
    if (next.costo !== "" || next.gastos !== "") next.utilidad = costo - gastos;
    setV(next);
  };

  const handleFiles = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    setError("");
    setSubiendo(true);
    const nuevos = [];
    for (const file of files) {
      const esVideo = file.type.startsWith("video/");
      const esImagen = file.type.startsWith("image/");
      if (!esVideo && !esImagen) { setError(`"${file.name}" no es foto ni video, se omitió.`); continue; }
      if (file.size > 25 * 1024 * 1024) { setError(`"${file.name}" pesa más de 25 MB, se omitió.`); continue; }
      const path = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
      const { error: upErr } = await supabase.storage.from("eventos").upload(path, file);
      if (upErr) { setError(`No se pudo subir "${file.name}": ${upErr.message}`); continue; }
      const { data } = supabase.storage.from("eventos").getPublicUrl(path);
      nuevos.push({ tipo: esVideo ? "video" : "imagen", nombre: file.name, url: data.publicUrl });
    }
    setV((prev) => ({ ...prev, media: [...(prev.media || []), ...nuevos] }));
    setSubiendo(false);
  };

  const quitarMedia = (idx) => setV((prev) => ({ ...prev, media: prev.media.filter((_, i) => i !== idx) }));

  return (
    <div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="Evento"><input className="gp-input" value={v.nombre} onChange={(e) => setV({ ...v, nombre: e.target.value })} /></Field>
        <Field label="Fecha"><input type="date" className="gp-input" value={v.fecha} onChange={(e) => setV({ ...v, fecha: e.target.value })} /></Field>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="Lugar"><input className="gp-input" placeholder="ej. Grand Toreo Casino" value={v.lugar || ""} onChange={(e) => setV({ ...v, lugar: e.target.value })} /></Field>
        <Field label="Horario"><input className="gp-input" placeholder="ej. 7:00pm a 10:00pm" value={v.horario || ""} onChange={(e) => setV({ ...v, horario: e.target.value })} /></Field>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="Proyecto relacionado (opcional)">
          <select className="gp-input" value={v.proyectoId} onChange={(e) => setV({ ...v, proyectoId: e.target.value })}>
            <option value="">— ninguno —</option>
            {ordenadosPorNombre(proyectos).map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
          </select>
        </Field>
        <Field label="Cliente (opcional)">
          <select className="gp-input" value={v.contactoId || ""} onChange={(e) => setV({ ...v, contactoId: e.target.value })}>
            <option value="">— ninguno —</option>
            {ordenadosPorNombre(contactos).map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
          </select>
        </Field>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Field label="Costo"><MoneyInput className="gp-input" value={v.costo} onChange={(val) => setCostoGastos("costo", val)} /></Field>
        <Field label="Gastos (staff, extras)"><MoneyInput className="gp-input" value={v.gastos} onChange={(val) => setCostoGastos("gastos", val)} /></Field>
        <Field label="Utilidad"><MoneyInput className="gp-input" value={v.utilidad} onChange={(val) => setV({ ...v, utilidad: val })} /></Field>
      </div>
      <Field label="Comentarios"><textarea className="gp-input" rows={2} value={v.comentarios} onChange={(e) => setV({ ...v, comentarios: e.target.value })} /></Field>
      <Field label="Fotos y videos">
        <input type="file" accept="image/*,video/*" multiple onChange={handleFiles} className="text-xs gp-text-muted" disabled={subiendo} />
        {subiendo && <p className="text-xs gp-text-muted mt-1">Subiendo…</p>}
        {error && <p className="text-xs gp-text-red mt-1">{error}</p>}
        {v.media?.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {v.media.map((m, i) => (
              <span key={i} className="text-xs gp-text-teal flex items-center gap-1 gp-panel px-2 py-1">
                {m.tipo === "video" ? <Film size={11} /> : <Camera size={11} />}
                {m.nombre.length > 16 ? m.nombre.slice(0, 16) + "…" : m.nombre}
                <button type="button" onClick={() => quitarMedia(i)} className="gp-text-red ml-1">✕</button>
              </span>
            ))}
          </div>
        )}
      </Field>
      {error && <p className="text-xs gp-text-red mb-2">{error}</p>}

      <button className="gp-btn w-full py-2 text-sm mt-2" disabled={subiendo} onClick={() => { if (!v.nombre?.toString().trim()) { setError("El nombre del evento es obligatorio."); return; } setError(""); onSave(v); }}>Guardar</button>
    </div>
  );
}
