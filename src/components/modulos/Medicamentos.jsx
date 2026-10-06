// src/components/modulos/Medicamentos.jsx
//
// Modulo perezoso (Fase 2). Salio de App.jsx el 5 oct 2026; se mudaron con el sus propias
// piezas (DIAS_SEMANA_LABELS, MedicamentoForm), que nadie mas usaba.

import { Badge, Field, IconBtn } from "../ui/basicos";
import { Check, Pencil, Plus, Trash2, X } from "lucide-react";
import { Modal } from "../ui/Modal";
import { ordenadosPorNombre } from "../../lib/listas";
import { todayISO } from "../../lib/formato";
import { useState } from "react";

/* ---------- Medicamentos ---------- */
const DIAS_SEMANA_LABELS = ["D", "L", "M", "M", "J", "V", "S"]; // 0=domingo … 6=sábado


function MedicamentoForm({ inicial, contactos, soloCuidado, onSave, onCancel }) {
  const [form, setForm] = useState(inicial || {
    nombre: "", dosis: "", contactoId: soloCuidado ? (contactos || [])[0]?.id || null : null, horarios: ["08:00"], diasSemana: [0, 1, 2, 3, 4, 5, 6],
    fechaInicio: todayISO(), fechaFin: "", instrucciones: "", activo: true,
    motivo: "", medico: "", viaAdministracion: "", observaciones: "",
  });
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const toggleDia = (d) => set("diasSemana", form.diasSemana.includes(d) ? form.diasSemana.filter((x) => x !== d) : [...form.diasSemana, d].sort());
  const cambiarHorario = (i, valor) => set("horarios", form.horarios.map((h, idx) => (idx === i ? valor : h)));
  const agregarHorario = () => set("horarios", [...form.horarios, "08:00"]);
  const quitarHorario = (i) => set("horarios", form.horarios.filter((_, idx) => idx !== i));

  return (
    <div>
      <Field label="Nombre del medicamento"><input className="gp-input" value={form.nombre} onChange={(e) => set("nombre", e.target.value)} /></Field>
      <Field label="Dosis"><input className="gp-input" placeholder="ej. 1 tableta, 5ml" value={form.dosis} onChange={(e) => set("dosis", e.target.value)} /></Field>
      <Field label="¿Para quién es?">
        <select className="gp-input" value={form.contactoId || ""} onChange={(e) => set("contactoId", e.target.value || null)}>
          {!soloCuidado && <option value="">Yo</option>}
          {ordenadosPorNombre(contactos).map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
        </select>
      </Field>

      <p className="text-xs gp-text-muted mb-1">Horarios de toma</p>
      <div className="space-y-1.5 mb-3">
        {form.horarios.map((h, i) => (
          <div key={i} className="flex items-center gap-2">
            <input type="time" className="gp-input" style={{ width: 140 }} value={h} onChange={(e) => cambiarHorario(i, e.target.value)} />
            {form.horarios.length > 1 && <IconBtn title="Eliminar" onClick={() => quitarHorario(i)}><Trash2 size={13} /></IconBtn>}
          </div>
        ))}
        <button type="button" onClick={agregarHorario} className="text-xs gp-text-gold">+ Agregar otro horario</button>
      </div>

      <p className="text-xs gp-text-muted mb-1">Días</p>
      <div className="flex gap-1.5 mb-3">
        {DIAS_SEMANA_LABELS.map((label, d) => (
          <button
            key={d} type="button" onClick={() => toggleDia(d)}
            className="w-8 h-8 rounded-full text-xs"
            style={{ background: form.diasSemana.includes(d) ? "var(--gold)" : "transparent", color: form.diasSemana.includes(d) ? "#161822" : "var(--muted)", border: "1px solid var(--border)" }}
          >{label}</button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Field label="Empieza"><input type="date" className="gp-input" value={form.fechaInicio} onChange={(e) => set("fechaInicio", e.target.value)} /></Field>
        <Field label="Termina (opcional)"><input type="date" className="gp-input" value={form.fechaFin} onChange={(e) => set("fechaFin", e.target.value)} /></Field>
      </div>
      <Field label="Instrucciones (opcional)"><input className="gp-input" placeholder="ej. Tomar con alimentos" value={form.instrucciones} onChange={(e) => set("instrucciones", e.target.value)} /></Field>

      <details className="mb-3">
        <summary className="text-xs gp-text-gold cursor-pointer">+ Datos complementarios (opcionales)</summary>
        <div className="mt-2 space-y-2">
          <Field label="Motivo / indicación"><input className="gp-input" placeholder="ej. Presión alta" value={form.motivo} onChange={(e) => set("motivo", e.target.value)} /></Field>
          <Field label="Médico que lo indicó"><input className="gp-input" value={form.medico} onChange={(e) => set("medico", e.target.value)} /></Field>
          <Field label="Vía de administración"><input className="gp-input" placeholder="ej. Oral, sublingual, tópica" value={form.viaAdministracion} onChange={(e) => set("viaAdministracion", e.target.value)} /></Field>
          <Field label="Observaciones"><textarea className="gp-input" rows={2} value={form.observaciones} onChange={(e) => set("observaciones", e.target.value)} /></Field>
        </div>
      </details>

      <div className="flex gap-2 mt-3">
        <button className="gp-btn-ghost flex-1 py-2 text-sm" onClick={onCancel}>Cancelar</button>
        <button
          className="gp-btn flex-1 py-2 text-sm"
          onClick={() => {
            if (!form.nombre.trim() || !form.horarios.length) return;
            const nombrePersona = form.contactoId ? (contactos || []).find((c) => c.id === form.contactoId)?.nombre : "Yo";
            onSave({ ...form, diasSemana: form.diasSemana.length ? form.diasSemana : [0, 1, 2, 3, 4, 5, 6], paraQuien: nombrePersona || "Yo" });
          }}
        >Guardar</button>
      </div>
    </div>
  );
}

export default function Medicamentos({ data, onAdd, onEdit, onRemove, soloCuidado }) {
  const [modal, setModal] = useState(null); // null | "nuevo" | medicamento a editar

  const lista = [...(data.medicamentos || [])].sort((a, b) => (a.activo === b.activo ? 0 : a.activo ? -1 : 1));
  const nombrePersona = (m) => (m.contactoId ? data.contactos.find((c) => c.id === m.contactoId)?.nombre || m.paraQuien || "—" : "Yo");

  return (
    <div>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-1">
        <h2 className="gp-serif text-2xl">Medicamentos</h2>
        <button onClick={() => setModal("nuevo")} className="gp-btn flex items-center justify-center gap-1 px-3 py-1.5 text-sm w-full sm:w-auto"><Plus size={14} /> Agregar</button>
      </div>
      <p className="text-sm gp-text-muted mb-6">Configura horarios y ARKEYONE te avisa por notificación push, con botones de "Tomado" y "Posponer".</p>
      {soloCuidado && <p className="text-xs gp-text-muted mb-4">Estás viendo Medicamentos como cuidador — solo ves a las personas que te asignaron.</p>}

      <div className="space-y-2">
        {lista.map((m) => (
          <div key={m.id} className="gp-panel p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-medium">{m.nombre}</span>
                  {m.dosis && <Badge tone="muted">{m.dosis}</Badge>}
                  <Badge tone="gold">{nombrePersona(m)}</Badge>
                  {!m.activo && <Badge tone="red">Pausado</Badge>}
                </div>
                <div className="flex flex-wrap gap-1 mt-2">
                  {(m.horarios || []).map((h, i) => <Badge key={i} tone="teal">{String(h).slice(0, 5)}</Badge>)}
                </div>
                <p className="text-xs gp-text-muted mt-1.5">
                  {(m.diasSemana || []).length === 7 ? "Todos los días" : (m.diasSemana || []).map((d) => DIAS_SEMANA_LABELS[d]).join(" ")}
                  {m.instrucciones ? ` · ${m.instrucciones}` : ""}
                  {m.motivo ? ` · ${m.motivo}` : ""}
                </p>
                {(m.medico || m.viaAdministracion || m.observaciones) && (
                  <p className="text-xs gp-text-muted mt-1">
                    {[m.medico && `Dr(a). ${m.medico}`, m.viaAdministracion, m.observaciones].filter(Boolean).join(" · ")}
                  </p>
                )}
              </div>
              <div className="flex gap-1 shrink-0">
                <IconBtn onClick={() => onEdit(m.id, { activo: !m.activo })} title={m.activo ? "Pausar" : "Reactivar"}>
                  {m.activo ? <X size={13} /> : <Check size={13} />}
                </IconBtn>
                <IconBtn onClick={() => setModal(m)} title="Editar"><Pencil size={13} /></IconBtn>
                <IconBtn onClick={() => onRemove(m.id)} title="Eliminar"><Trash2 size={13} /></IconBtn>
              </div>
            </div>
          </div>
        ))}
        {lista.length === 0 && <p className="text-sm gp-text-muted">Aún no tienes medicamentos registrados.</p>}
      </div>

      {modal && (
        <Modal title={modal === "nuevo" ? "Nuevo medicamento" : "Editar medicamento"} onClose={() => setModal(null)}>
          <MedicamentoForm
            inicial={modal === "nuevo" ? null : modal}
            contactos={data.contactos}
            soloCuidado={soloCuidado}
            onCancel={() => setModal(null)}
            onSave={(vals) => { modal === "nuevo" ? onAdd(vals) : onEdit(modal.id, vals); setModal(null); }}
          />
        </Modal>
      )}
    </div>
  );
}
