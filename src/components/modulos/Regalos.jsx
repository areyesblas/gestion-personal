// src/components/modulos/Regalos.jsx
//
// Modulo perezoso (Fase 2). Salio de App.jsx el 5 oct 2026; se mudaron con el sus propias
// piezas (OCASIONES_REGALO, ESTATUS_REGALO, TIPOS_ATENCION, RegaloForm), que nadie mas usaba.

import { Badge, Field, IconBtn } from "../ui/basicos";
import { BarraListaEstandar, OrdenSelector, Th } from "../ui/tablas";
import { ComboboxMultiBuscar, MoneyInput, SelectGuardable } from "../ui/campos";
import { FichaContacto } from "../comunes/fichaContacto";
import { Modal } from "../ui/Modal";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { exportarFilasExcel, exportarFilasPDF } from "../../lib/exportar";
import { filtrarPorBusqueda, ordenAlfabetico, ordenarLista } from "../../lib/listas";
import { fmtMoney } from "../../lib/formato";
import { useMemo, useState } from "react";
import { usePanelRedimensionable } from "../ui/usePanelRedimensionable";

// Tipo de cambio del DÍA del movimiento, no el de hoy: api.frankfurter.dev responde histórico
// pidiéndole una fecha. Si falla (sin internet, fecha futura, moneda que la API no cubre) se
const OCASIONES_REGALO = ordenAlfabetico(["Cumpleaños", "Navidad", "Aniversario", "Felicitación", "Otro"]);

const ESTATUS_REGALO = ["Por comprar", "Comprado", "Envuelto", "Entregado"];

// Tipo de atención: distinto de la ocasión (Cumpleaños/Navidad/…). La ocasión es CUÁNDO/POR QUÉ;
// el tipo es QUÉ clase de atención se dio o se dará.
const TIPOS_ATENCION = ordenAlfabetico(["Regalo", "Felicitación", "Condolencia", "Agradecimiento", "Llamada", "Visita", "Mensaje", "Otro"]);

/* ---------- Regalos (histórico de regalos/felicitaciones, incluye control de Navidad) ---------- */
export default function Regalos({ data, onAdd, onEdit, onRemove, filtroContactoInicial, onLimpiarFiltro, onVerContacto,
  onAddNota, onAddCita, onAddEvento, onAddComentario, onCrearContacto, onIrAVista, onVerProyecto }) {
  // Ancho de la ficha de la derecha, arrastrable y recordado por pantalla.
  const { contenedorRef, divisor, estiloPanel } = usePanelRedimensionable("atenciones");
  const [modal, setModal] = useState(null);
  // Ficha del contacto abierta a la derecha, sin salir de Atenciones (pedido de Angel,
  // 29 sept 2026): el grid se queda a la izquierda y la navegación no cambia de pantalla.
  const [contactoFichaId, setContactoFichaId] = useState(null);
  const [fichaTab, setFichaTab] = useState("informacion");
  const [filtroContacto, setFiltroContacto] = useState(filtroContactoInicial || "");
  const [filtroOcasion, setFiltroOcasion] = useState("Todos");
  const [filtroAnio, setFiltroAnio] = useState("Todos");
  const [orden, setOrden] = useState("default");
  const [ordenDir, setOrdenDir] = useState("asc");
  const [busqueda, setBusqueda] = useState("");
  const toggleOrden = (key) => { if (orden === key) setOrdenDir((d) => (d === "asc" ? "desc" : "asc")); else { setOrden(key); setOrdenDir("asc"); } };
  const anioActual = new Date().getFullYear();
  const empty = { contactoId: filtroContactoInicial || "", tipo: "Regalo", ocasion: "Cumpleaños", anio: anioActual, fecha: "", descripcion: "", costo: "", estatus: "Por comprar", notas: "" };

  const nombreContacto = (id) => data.contactos.find((c) => c.id === id)?.nombre || "—";
  const anios = [...new Set(data.regalos.map((r) => r.anio).filter(Boolean))].sort((a, b) => b - a);
  const contactoFicha = contactoFichaId ? (data.contactos || []).find((c) => c.id === contactoFichaId) : null;
  // Mismo cálculo que en Contactos: la ficha se arma con la tabla puente contacto_proyectos.
  const proyectosDeContacto = (contactoId) => (data.contactoProyectos || [])
    .filter((v) => v.contactoId === contactoId)
    .map((v) => (data.proyectos || []).find((p) => p.id === v.proyectoId))
    .filter(Boolean);
  const abrirFicha = (contactoId) => { setContactoFichaId(contactoId); setFichaTab("informacion"); };

  const camposOrden = {
    fecha: { get: (r) => r.fecha, tipo: "fecha" },
    registro: { get: (r) => r.createdAt, tipo: "fecha" },
    alfabetico: { get: (r) => nombreContacto(r.contactoId), tipo: "texto" },
    costo: { get: (r) => Number(r.costo) || 0, tipo: "numero" },
  };
  const opcionesOrden = [
    { key: "fecha", label: "fecha" },
    { key: "registro", label: "fecha de registro" },
    { key: "alfabetico", label: "alfabético (contacto)" },
    { key: "costo", label: "costo" },
  ];

  let filtrados = data.regalos;
  if (filtroContacto) filtrados = filtrados.filter((r) => r.contactoId === filtroContacto);
  if (filtroOcasion !== "Todos") filtrados = filtrados.filter((r) => r.ocasion === filtroOcasion);
  if (filtroAnio !== "Todos") filtrados = filtrados.filter((r) => String(r.anio) === String(filtroAnio));
  filtrados = filtrarPorBusqueda(filtrados, busqueda, [(r) => r.descripcion, (r) => r.ocasion, (r) => r.notas, (r) => nombreContacto(r.contactoId)]);
  const ordenados = ordenarLista(filtrados, orden, camposOrden, ordenDir);
  const totalGastado = ordenados.reduce((s, r) => s + (Number(r.costo) || 0), 0);
  const columnasExport = [
    { label: "Contacto", get: (r) => nombreContacto(r.contactoId) }, { label: "Tipo", get: (r) => r.tipo },
    { label: "Ocasión", get: (r) => r.ocasion }, { label: "Año", get: (r) => r.anio },
    { label: "Fecha", get: (r) => r.fecha }, { label: "Descripción", get: (r) => r.descripcion },
    { label: "Costo", get: (r) => r.costo }, { label: "Estatus", get: (r) => r.estatus },
  ];

  return (
    <div ref={contenedorRef} className="flex flex-col lg:flex-row gap-4 items-start">
      {/* El grid de atenciones se queda siempre aquí a la izquierda; la ficha del contacto abre a
          la derecha, sin cambiar de pantalla. En celular no caben lado a lado, así que ahí la
          ficha toma el ancho completo — mismo comportamiento que Contactos y Proyectos. */}
      <div className={`min-w-0 flex-1 w-full ${contactoFicha ? "hidden lg:block" : ""}`}>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-1">
        <h2 className="gp-serif text-2xl">Atenciones</h2>
        <button onClick={() => setModal({ item: empty })} className="gp-btn flex items-center justify-center gap-1 px-3 py-1.5 text-sm w-full sm:w-auto"><Plus size={14} /> Nuevo</button>
      </div>
      <p className="text-sm gp-text-muted mb-3">Regalos, felicitaciones, condolencias y agradecimientos a tus contactos. Para ver una ocasión concreta —Navidad, cumpleaños— usa el filtro de ocasión y el de año.</p>

      <div className="flex flex-wrap items-center gap-2 mb-2">
        {filtroContacto && (
          <span className="text-xs px-2.5 py-1 rounded-full border flex items-center gap-1">
            {nombreContacto(filtroContacto)}
            <button onClick={() => { setFiltroContacto(""); onLimpiarFiltro?.(); }} className="gp-text-red">✕</button>
          </span>
        )}
        <select className="gp-input text-xs py-1.5" style={{ width: "auto" }} value={filtroOcasion} onChange={(e) => setFiltroOcasion(e.target.value)}>
          <option value="Todos">Todas las ocasiones</option>
          {OCASIONES_REGALO.map((o) => <option key={o}>{o}</option>)}
        </select>
        <select className="gp-input text-xs py-1.5" style={{ width: "auto" }} value={filtroAnio} onChange={(e) => setFiltroAnio(e.target.value)}>
          <option value="Todos">Todos los años</option>
          {anios.map((a) => <option key={a} value={a}>{a}</option>)}
        </select>
        <OrdenSelector opciones={opcionesOrden} value={orden} onChange={setOrden} />
      </div>
      <BarraListaEstandar busqueda={busqueda} onBusqueda={setBusqueda} placeholder="Buscar por contacto, ocasión o descripción…"
        onExportExcel={() => exportarFilasExcel(ordenados, columnasExport, "atenciones")}
        onExportPDF={() => exportarFilasPDF(ordenados, columnasExport, "atenciones", "Atenciones", busqueda ? `búsqueda: "${busqueda}"` : "")} />

      {totalGastado > 0 && (
        <p className="text-xs gp-text-muted mb-3">Total en esta vista: <span className="gp-mono gp-text-gold">{fmtMoney(totalGastado)}</span></p>
      )}

      <div className="gp-panel overflow-x-auto">
        <table className="gp-table">
          <thead><tr><Th label="Contacto" sortKey="alfabetico" orden={orden} ordenDir={ordenDir} onToggle={toggleOrden} /><th>Tipo</th><th>Ocasión</th><th>Año</th><Th label="Fecha" sortKey="fecha" orden={orden} ordenDir={ordenDir} onToggle={toggleOrden} /><th>Detalle</th><Th label="Costo" sortKey="costo" orden={orden} ordenDir={ordenDir} onToggle={toggleOrden} /><th>Estatus</th><th></th></tr></thead>
          <tbody>
            {ordenados.map((r) => (
              // Tocar el renglón abre la ficha completa de esa persona en Contactos — la misma
              // misma ficha que usa Contactos (la entidad maestra de personas), no una copia.
              <tr key={r.id}
                onClick={() => r.contactoId && abrirFicha(r.contactoId)}
                style={{ cursor: r.contactoId ? "pointer" : "default", background: r.contactoId === contactoFichaId ? "var(--panel-hi)" : undefined }}
                title={r.contactoId ? "Ver la ficha de este contacto" : undefined}>
                <td>{nombreContacto(r.contactoId)}</td>
                <td><Badge tone="gold">{r.tipo || "Regalo"}</Badge></td>
                <td><Badge tone="muted">{r.ocasion}</Badge></td>
                <td className="gp-mono">{r.anio || "—"}</td>
                <td className="gp-mono">{r.fecha || "—"}</td>
                <td className="gp-text-muted">{r.descripcion}</td>
                <td className="gp-mono">{r.costo ? fmtMoney(r.costo) : "—"}</td>
                <td onClick={(e) => e.stopPropagation()}>
                  <SelectGuardable
                    valor={r.estatus || "Por comprar"} opciones={ESTATUS_REGALO} ariaLabel="Estatus de la atención"
                    onGuardar={(nuevo) => onEdit(r.id, { estatus: nuevo })}
                  />
                </td>
                <td onClick={(e) => e.stopPropagation()}><div className="flex gap-1"><IconBtn title="Editar" onClick={() => setModal({ item: r })}><Pencil size={13} /></IconBtn><IconBtn title="Eliminar" onClick={() => onRemove(r.id)}><Trash2 size={13} /></IconBtn></div></td>
              </tr>
            ))}
            {ordenados.length === 0 && <tr><td colSpan={9} className="text-center gp-text-muted py-6">Sin atenciones registradas con este filtro.</td></tr>}
          </tbody>
        </table>
      </div>

      {modal && (
        <Modal title={modal.item.id ? "Editar atención" : "Nueva atención"} onClose={() => setModal(null)}>
          <RegaloForm item={modal.item} contactos={data.contactos} onCrearContacto={onCrearContacto}
            onSave={(v) => { modal.item.id ? onEdit(modal.item.id, v) : onAdd(v); setModal(null); }} />
        </Modal>
      )}
      </div>

      {contactoFicha && divisor}
      {contactoFicha && (
        <div className="w-full shrink-0 lg:sticky lg:top-4" style={estiloPanel}>
          <FichaContacto
            c={contactoFicha}
            data={data}
            proyectosVinculados={proyectosDeContacto(contactoFicha.id)}
            onCerrar={() => setContactoFichaId(null)}
            /* Editar sí lleva a Contactos: ahí vive el formulario completo de la persona, y es un
               salto que el usuario pidió a propósito, no el efecto de tocar un renglón. */
            onEditar={() => onVerContacto?.(contactoFicha.id)}
            /* Ya estamos en Atenciones: "ver todas" filtra este mismo grid por esa persona. */
            onVerAtenciones={(c) => setFiltroContacto(c.id)}
            onIrAVista={onIrAVista}
            onAddNota={onAddNota}
            onAddCita={onAddCita}
            onAddEvento={onAddEvento}
            onAddComentario={onAddComentario}
            tab={fichaTab} onTab={setFichaTab}
            onVerProyecto={onVerProyecto}
          />
        </div>
      )}
    </div>
  );
}

function RegaloForm({ item, contactos, onCrearContacto, onSave }) {
  const [v, setV] = useState(item);
  const [error, setError] = useState("");
  const contactoElegido = v.contactoId ? (contactos || []).find((c) => c.id === v.contactoId) : null;
  // Combo alfabético, como el resto de los combos de la app: la lista llega en orden de captura
  // y con muchos contactos encontrar a alguien se vuelve una lotería.
  const contactosOrdenados = useMemo(
    () => [...(contactos || [])].sort((a, b) => (a.nombre || "").localeCompare(b.nombre || "", "es", { sensitivity: "base" })),
    [contactos]);
  return (
    <div>
      {/* Misma mecánica que en Nueva tarea (pedido de Angel, 30 sept 2026): se busca por nombre y,
          si la persona no existe, se crea desde aquí. Al crearla se abre el formulario corto para
          completar apellidos, correo y WhatsApp sin salir de la atención. */}
      <Field label="Contacto">
        <ComboboxMultiBuscar
          max={1}
          seleccionados={contactoElegido ? [{ id: contactoElegido.id, label: contactoElegido.nombre }] : []}
          opciones={contactosOrdenados.map((c) => ({ id: c.id, label: c.nombre }))}
          onAgregar={(o) => setV({ ...v, contactoId: o.id })}
          onQuitar={() => setV({ ...v, contactoId: "" })}
          onCrear={onCrearContacto ? (nombre) => setV({ ...v, contactoId: onCrearContacto(nombre) }) : undefined}
          placeholder="Buscar persona o crearla…"
          crearLabel={(t) => `Crear contacto "${t}"`}
        />
      </Field>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="Tipo de atención"><select className="gp-input" value={v.tipo || "Regalo"} onChange={(e) => setV({ ...v, tipo: e.target.value })}>{TIPOS_ATENCION.map((t) => <option key={t}>{t}</option>)}</select></Field>
        <Field label="Ocasión"><select className="gp-input" value={v.ocasion} onChange={(e) => setV({ ...v, ocasion: e.target.value })}>{OCASIONES_REGALO.map((o) => <option key={o}>{o}</option>)}</select></Field>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="Año"><input type="number" className="gp-input" value={v.anio} onChange={(e) => setV({ ...v, anio: e.target.value })} /></Field>
      </div>
      <Field label="Fecha (opcional)"><input type="date" className="gp-input" value={v.fecha || ""} onChange={(e) => setV({ ...v, fecha: e.target.value })} /></Field>
      {/* Se llama "Mensaje" y es de varios renglones (Angel, 2 oct 2026): la mayoría de las
          atenciones son justo eso —un texto de condolencia, una felicitación—, y en un renglón
          no cabía ni se podía releer antes de mandarlo. */}
      <Field label="Mensaje">
        <textarea className="gp-input" rows={3}
          placeholder="ej. el texto de la felicitación, o qué se regaló: perfume, tarjeta, transferencia"
          value={v.descripcion} onChange={(e) => setV({ ...v, descripcion: e.target.value })} />
      </Field>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="Costo (opcional)"><MoneyInput className="gp-input" value={v.costo} onChange={(val) => setV({ ...v, costo: val })} /></Field>
        <Field label="Estatus"><select className="gp-input" value={v.estatus} onChange={(e) => setV({ ...v, estatus: e.target.value })}>{ESTATUS_REGALO.map((s) => <option key={s}>{s}</option>)}</select></Field>
      </div>
      <Field label="Notas"><textarea className="gp-input" rows={2} value={v.notas} onChange={(e) => setV({ ...v, notas: e.target.value })} /></Field>
      {error && <p className="text-xs gp-text-red mb-2">{error}</p>}

      <button className="gp-btn w-full py-2 text-sm mt-2" onClick={() => { if (!v.contactoId) { setError("Elige a qué contacto es el regalo."); return; } setError(""); onSave(v); }}>Guardar</button>
    </div>
  );
}
