import { descendientesDe } from "../../lib/tareas";
import { Badge, Field } from "../ui/basicos";
import { ComboboxMultiBuscar, MoneyInput } from "../ui/campos";
import { ESTATUS_META, PRIORIDADES } from "../../lib/catalogos";
import { ordenadosPor, ordenadosPorNombre } from "../../lib/listas";
import { useEffect, useMemo, useState } from "react";

export function PendienteForm({ item, proyectos, contactos, pendientes, colaboradores, onCrearContacto, onCrearProyecto, onEnviarInvitacion, onAceptarEnNombre, onSave, proyectoFijoId }) {
  const [v, setV] = useState({ ...item, colaboradorContactoId: item.colaboradorContactoId || null, fechaPagoAprox: item.fechaPagoAprox || "" });
  const [error, setError] = useState("");
  const [enviarCorreo, setEnviarCorreo] = useState(!item.id);
  const [enviando, setEnviando] = useState(false);
  const excluidos = item.id ? [item.id, ...descendientesDe(item.id, pendientes)] : [];
  // Si el proyecto está fijo (venimos desde el detalle de un proyecto), solo se puede elegir
  // como tarea principal a otra tarea de ESE mismo proyecto — no tiene sentido anidar entre proyectos distintos.
  const opcionesParent = pendientes.filter((t) => !excluidos.includes(t.id) && (!proyectoFijoId || t.proyectoId === proyectoFijoId));

  // Si es subtarea de algo, el proyecto se hereda de la tarea principal — no se elige aparte.
  // Esto se sincroniza cada vez que cambias de qué tarea es subtarea (por si eliges otra tarea principal).
  useEffect(() => {
    if (v.parentId) {
      const padre = pendientes.find((t) => t.id === v.parentId);
      if (padre && padre.proyectoId !== v.proyectoId) setV((prev) => ({ ...prev, proyectoId: padre.proyectoId }));
    }
  }, [v.parentId]);

  const proyectoHeredado = v.parentId ? proyectos.find((p) => p.id === v.proyectoId) : null;
  const proyectoFijo = proyectoFijoId ? proyectos.find((p) => p.id === proyectoFijoId) : null;
  const colaboradorElegido = v.colaboradorContactoId ? contactos.find((c) => c.id === v.colaboradorContactoId) : null;
  const clienteElegido = v.contactoId ? (contactos || []).find((c) => c.id === v.contactoId) : null;
  const proyectoElegido = v.proyectoId ? (proyectos || []).find((x) => x.id === v.proyectoId) : null;
  const porNombre = (a, b) => (a.nombre || "").localeCompare(b.nombre || "", "es", { sensitivity: "base" });
  const contactosOrdenados = useMemo(() => [...(contactos || [])].sort(porNombre), [contactos]);
  const proyectosOrdenados = useMemo(() => [...(proyectos || [])].sort(porNombre), [proyectos]);

  return (
    <div>
      <Field label="Descripción"><input className="gp-input" value={v.descripcion} onChange={(e) => setV({ ...v, descripcion: e.target.value })} /></Field>
      <Field label="Es subtarea de (opcional)">
        <select className="gp-input" value={v.parentId || ""} onChange={(e) => setV({ ...v, parentId: e.target.value })}>
          <option value="">— tarea principal —</option>
          {ordenadosPor(opcionesParent, (t) => t.descripcion).map((t) => <option key={t.id} value={t.id}>{t.descripcion}</option>)}
        </select>
      </Field>
      <Field label="Proyecto">
        {proyectoFijoId ? (
          <div>
            <input className="gp-input" disabled value={proyectoFijo ? proyectoFijo.nombre : "—"} style={{ opacity: 0.7 }} />
            <p className="text-xs gp-text-muted mt-1">Estás creando este pendiente desde el detalle de este proyecto, así que no se puede cambiar aquí.</p>
          </div>
        ) : v.parentId ? (
          <div>
            <input className="gp-input" disabled value={proyectoHeredado ? proyectoHeredado.nombre : "— sin proyecto —"} style={{ opacity: 0.7 }} />
            <p className="text-xs gp-text-muted mt-1">Hereda el proyecto de su tarea principal. Si necesitas cambiarlo, cambia el proyecto de esa tarea principal.</p>
          </div>
        ) : (
          /* Buscador en vez de lista larga, y si el proyecto no existe todavía se crea desde aquí
             mismo (pedido de Angel, 29 sept 2026): el proyecto queda creado de verdad en Proyectos
             e ideas, como Idea, y luego se le completan los detalles allá. */
          <ComboboxMultiBuscar
            max={1}
            seleccionados={proyectoElegido ? [{ id: proyectoElegido.id, label: proyectoElegido.nombre }] : []}
            opciones={proyectosOrdenados.map((x) => ({ id: x.id, label: x.nombre }))}
            onAgregar={(o) => setV({ ...v, proyectoId: o.id })}
            onQuitar={() => setV({ ...v, proyectoId: "" })}
            onCrear={onCrearProyecto ? (nombre) => setV({ ...v, proyectoId: onCrearProyecto(nombre) }) : undefined}
            placeholder="Buscar proyecto… (opcional)"
            crearLabel={(t) => `Crear proyecto "${t}"`}
          />
        )}
      </Field>
      <Field label="Cliente (a quién se le entrega)">
        <ComboboxMultiBuscar
          max={1}
          seleccionados={clienteElegido ? [{ id: clienteElegido.id, label: clienteElegido.nombre }] : []}
          opciones={contactosOrdenados.map((c) => ({ id: c.id, label: c.nombre }))}
          onAgregar={(o) => setV({ ...v, contactoId: o.id })}
          onQuitar={() => setV({ ...v, contactoId: "" })}
          onCrear={onCrearContacto ? (nombre) => setV({ ...v, contactoId: onCrearContacto(nombre, ["Cliente"]) }) : undefined}
          placeholder="Buscar cliente… (opcional)"
          crearLabel={(t) => `Crear contacto "${t}"`}
        />
      </Field>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="Fecha límite"><input type="date" className="gp-input" value={v.fechaLimite} onChange={(e) => setV({ ...v, fechaLimite: e.target.value })} /></Field>
        <Field label="Prioridad"><select className="gp-input" value={v.prioridad} onChange={(e) => setV({ ...v, prioridad: e.target.value })}>{PRIORIDADES.map((c) => <option key={c}>{c}</option>)}</select></Field>
      </div>
      <Field label="Fecha de revisión (opcional)"><input type="date" className="gp-input" value={v.fechaRevision || ""} onChange={(e) => setV({ ...v, fechaRevision: e.target.value })} /></Field>

      {/* Cuándo la vas a HACER, que no es lo mismo que para cuándo debe estar lista (migración
          20261002). Normalmente esto se llena arrastrando la tarea en la Agenda; aquí está para
          poder verlo y corregirlo sin salir del formulario. Sin día programado, la tarea vive en
          la franja "Tareas del día" de la Agenda en vez de ocupar una hora del horario. */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="Día en que la harás (opcional)">
          <input type="date" className="gp-input" value={v.fechaProgramada || ""}
            onChange={(e) => setV({ ...v, fechaProgramada: e.target.value, horaInicio: e.target.value ? v.horaInicio : "" })} />
        </Field>
        <Field label="Hora de inicio (opcional)">
          <input type="time" className="gp-input" value={v.horaInicio || ""} disabled={!v.fechaProgramada}
            onChange={(e) => setV({ ...v, horaInicio: e.target.value })} />
        </Field>
      </div>

      <Field label="Colaborador (opcional — se le puede pagar y le llega correo para aceptar)">
        <ComboboxMultiBuscar
          max={1}
          seleccionados={colaboradorElegido ? [{ id: colaboradorElegido.id, label: colaboradorElegido.nombre }] : []}
          opciones={contactos.map((c) => ({ id: c.id, label: c.nombre }))}
          onAgregar={(o) => setV({ ...v, colaboradorContactoId: o.id })}
          onQuitar={() => setV({ ...v, colaboradorContactoId: null })}
          onCrear={(nombre) => setV({ ...v, colaboradorContactoId: onCrearContacto(nombre, ["Colaborador"]) })}
          placeholder="Buscar o agregar colaborador…"
          crearLabel={(texto) => `Crear contacto "${texto}"`}
        />
      </Field>

      {colaboradorElegido && (
        <div className="gp-panel-hi p-3 mb-3 text-xs" style={{ border: "1px solid var(--border)", borderRadius: 6 }}>
          {!colaboradorElegido.correo ? (
            <p className="gp-text-gold">Este contacto no tiene correo — agrégaselo desde Contactos para poder enviarle la invitación.</p>
          ) : !item.id ? (
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={enviarCorreo} onChange={(e) => setEnviarCorreo(e.target.checked)} />
              Enviarle un correo a {colaboradorElegido.correo} en cuanto guarde, para que acepte o rechace esta tarea
            </label>
          ) : !v.estadoAceptacion ? (
            <div className="flex items-center justify-between gap-2">
              <span className="gp-text-muted">Aún no se le ha avisado.</span>
              <button type="button" disabled={enviando} className="gp-btn-ghost px-2.5 py-1 rounded" onClick={async () => { setEnviando(true); await onEnviarInvitacion(item.id); setEnviando(false); }}>
                {enviando ? "Enviando…" : "Enviar invitación por correo"}
              </button>
            </div>
          ) : v.estadoAceptacion === "pendiente" ? (
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <Badge tone="gold">Esperando que {colaboradorElegido.nombre} confirme</Badge>
              <button type="button" className="gp-btn-ghost px-2.5 py-1 rounded" onClick={() => onAceptarEnNombre(item.id)}>Aceptar en su nombre</button>
            </div>
          ) : v.estadoAceptacion === "aceptada" ? (
            <Badge tone="teal">Aceptada{v.aceptadaPorCreador ? " (por ti, en su nombre)" : ""}</Badge>
          ) : (
            <Badge tone="red">Rechazada</Badge>
          )}
        </div>
      )}

      {colaboradores && colaboradores.length > 0 && (
        <Field label="Asignar a colaborador ARKEYONE (opcional — le llega notificación push)">
          <select className="gp-input" value={v.asignadoA || ""} onChange={(e) => setV({ ...v, asignadoA: e.target.value })}>
            <option value="">— sin asignar —</option>
            {ordenadosPor(colaboradores, (c) => c.colaborador_email).map((c) => <option key={c.colaborador_user_id} value={c.colaborador_user_id}>{c.colaborador_email}</option>)}
          </select>
        </Field>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="Precio pactado (si es delegado)"><MoneyInput className="gp-input" value={v.precio} onChange={(val) => setV({ ...v, precio: val })} /></Field>
        <Field label="Fecha aprox. de pago (opcional)"><input type="date" className="gp-input" value={v.fechaPagoAprox} onChange={(e) => setV({ ...v, fechaPagoAprox: e.target.value })} /></Field>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="Tiempo estimado (horas)"><input type="number" className="gp-input" value={v.tiempoEstimado} onChange={(e) => setV({ ...v, tiempoEstimado: e.target.value })} /></Field>
        <Field label="Tiempo real (horas, cuando termine)"><input type="number" className="gp-input" value={v.tiempoReal} onChange={(e) => setV({ ...v, tiempoReal: e.target.value })} /></Field>
      </div>
      {/* El % de avance se puede poner aquí, en la ficha de la derecha de Tareas o en el árbol del
          centro de proyecto — es el mismo campo. Si la tarea tiene subtareas, este número se
          ignora: ahí el avance es la ponderación de los hijos, para no tener dos verdades. */}
      <Field label="Avance (%, opcional — se ignora si la tarea tiene subtareas)">
        <input type="number" min={0} max={100} className="gp-input" value={v.avance ?? ""} placeholder="0"
          onChange={(e) => setV({ ...v, avance: e.target.value === "" ? "" : Math.max(0, Math.min(100, Number(e.target.value))) })} />
      </Field>
      {error && <p className="text-xs gp-text-red mb-2">{error}</p>}

      <button
        className="gp-btn w-full py-2 text-sm mt-2"
        onClick={() => {
          if (!v.descripcion?.toString().trim()) { setError("La descripción del pendiente es obligatoria."); return; }
          setError("");
          onSave(v, !item.id && colaboradorElegido && colaboradorElegido.correo ? enviarCorreo : false);
        }}
      >
        Guardar
      </button>
    </div>
  );
}

export function MetaForm({ item, proyectos, onSave }) {
  const [v, setV] = useState(item);
  const [error, setError] = useState("");
  return (
    <div>
      <Field label="Proyecto">
        <select className="gp-input" value={v.proyectoId} onChange={(e) => setV({ ...v, proyectoId: e.target.value })}>
          <option value="">— sin proyecto —</option>
          {ordenadosPorNombre(proyectos).map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
        </select>
      </Field>
      <Field label="Meta"><input className="gp-input" placeholder="ej. Llegar a 1000 seguidores, cerrar 3 clientes" value={v.descripcion} onChange={(e) => setV({ ...v, descripcion: e.target.value })} /></Field>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="Fecha objetivo"><input type="date" className="gp-input" value={v.fechaObjetivo} onChange={(e) => setV({ ...v, fechaObjetivo: e.target.value })} /></Field>
        <Field label="Estatus"><select className="gp-input" value={v.estatus} onChange={(e) => setV({ ...v, estatus: e.target.value })}>{ESTATUS_META.map((c) => <option key={c}>{c}</option>)}</select></Field>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="Prioridad"><select className="gp-input" value={v.prioridad || "Media"} onChange={(e) => setV({ ...v, prioridad: e.target.value })}>{PRIORIDADES.map((c) => <option key={c}>{c}</option>)}</select></Field>
        <Field label="Fecha de revisión (opcional)"><input type="date" className="gp-input" value={v.fechaRevision || ""} onChange={(e) => setV({ ...v, fechaRevision: e.target.value })} /></Field>
      </div>
      {error && <p className="text-xs gp-text-red mb-2">{error}</p>}

      <button className="gp-btn w-full py-2 text-sm mt-2" onClick={() => { if (!v.descripcion?.toString().trim()) { setError("La meta es obligatoria."); return; } setError(""); onSave(v); }}>Guardar</button>
    </div>
  );
}
