// src/components/modulos/MarketingYRedes.jsx
//
// Modulo perezoso (Fase 2). Salio de App.jsx el 5 oct 2026; se mudaron con el sus propias
// piezas (PLATAFORMAS_CAMPANA, ESTATUS_CAMPANA, PLATAFORMAS, RedesSociales, RedesForm, Marketing, DineroCampanaForm, CampanaActividades, ActividadCampanaForm, CampanaForm), que nadie mas usaba.

import Bitacora from "../comunes/Bitacora";
import { Badge, Field, IconBtn } from "../ui/basicos";
import { BarraListaEstandar, OrdenSelector, Th } from "../ui/tablas";
import { MessageCircle, Pencil, Plus, Trash2 } from "lucide-react";
import { Modal } from "../ui/Modal";
import { MoneyInput } from "../ui/campos";
import { exportarFilasExcel, exportarFilasPDF } from "../../lib/exportar";
import { filtrarPorBusqueda, ordenAlfabetico, ordenadosPorNombre, ordenarLista } from "../../lib/listas";
import { fmtMoney, montoBaseDe, todayISO, uid } from "../../lib/formato";
import { useState } from "react";

const PLATAFORMAS_CAMPANA = ordenAlfabetico(["Meta", "Google Ads", "TikTok", "Email", "Orgánico", "Otro"]);

const ESTATUS_CAMPANA = ["Planeada", "Activa", "Pausada", "Finalizada"];

const PLATAFORMAS = ordenAlfabetico(["Facebook", "Instagram", "TikTok", "YouTube", "WhatsApp Business"]);

function RedesSociales({ data, onAdd, onEdit, onRemove }) {
  const [modal, setModal] = useState(null);
  const [orden, setOrden] = useState("default");
  const [ordenDir, setOrdenDir] = useState("asc");
  const toggleOrden = (key) => { if (orden === key) setOrdenDir((d) => (d === "asc" ? "desc" : "asc")); else { setOrden(key); setOrdenDir("asc"); } };
  const empty = { proyectoId: "", plataforma: "Facebook", fecha: todayISO(), seguidores: "", alcance: "" };
  const camposOrden = {
    fecha: { get: (r) => r.fecha, tipo: "fecha" },
    registro: { get: (r) => r.createdAt, tipo: "fecha" },
    alfabetico: { get: (r) => r.plataforma, tipo: "texto" },
    seguidores: { get: (r) => Number(r.seguidores) || 0, tipo: "numero" },
  };
  const opcionesOrden = [
    { key: "fecha", label: "fecha" },
    { key: "registro", label: "fecha de registro" },
    { key: "alfabetico", label: "alfabético (plataforma)" },
    { key: "seguidores", label: "seguidores" },
  ];
  const base = orden === "default" ? [...data.redesMetricas].sort((a, b) => (b.fecha || "").localeCompare(a.fecha || "")) : data.redesMetricas;
  const ordenados = ordenarLista(base, orden, camposOrden, ordenDir);
  const nombreProyecto = (id) => data.proyectos.find((p) => p.id === id)?.nombre || "—";

  return (
    <div>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-1">
        <h2 className="gp-serif text-2xl">Redes sociales</h2>
        <button onClick={() => setModal({ item: empty })} className="gp-btn flex items-center justify-center gap-1 px-3 py-1.5 text-sm w-full sm:w-auto"><Plus size={14} /> Registrar</button>
      </div>
      <p className="text-sm gp-text-muted mb-3">Seguidores y alcance por proyecto y plataforma, para cruzarlo con ingresos.</p>
      <div className="mb-4"><OrdenSelector opciones={opcionesOrden} value={orden} onChange={setOrden} /></div>

      <div className="gp-panel overflow-x-auto">
        <table className="gp-table">
          <thead><tr><Th label="Fecha" sortKey="fecha" orden={orden} ordenDir={ordenDir} onToggle={toggleOrden} /><th>Proyecto</th><Th label="Plataforma" sortKey="alfabetico" orden={orden} ordenDir={ordenDir} onToggle={toggleOrden} /><Th label="Seguidores" sortKey="seguidores" orden={orden} ordenDir={ordenDir} onToggle={toggleOrden} /><th>Alcance</th><th></th></tr></thead>
          <tbody>
            {ordenados.map((r) => (
              <tr key={r.id}>
                <td className="gp-mono">{r.fecha}</td>
                <td className="gp-text-muted">{nombreProyecto(r.proyectoId)}</td>
                <td><Badge tone="muted">{r.plataforma}</Badge></td>
                <td className="gp-mono">{r.seguidores || "—"}</td>
                <td className="gp-mono">{r.alcance || "—"}</td>
                <td><div className="flex gap-1"><IconBtn title="Editar" onClick={() => setModal({ item: r })}><Pencil size={13} /></IconBtn><IconBtn title="Eliminar" onClick={() => onRemove(r.id)}><Trash2 size={13} /></IconBtn></div></td>
              </tr>
            ))}
            {ordenados.length === 0 && <tr><td colSpan={6} className="text-center gp-text-muted py-6">Sin métricas registradas.</td></tr>}
          </tbody>
        </table>
      </div>

      {modal && (
        <Modal title={modal.item.id ? "Editar registro" : "Registrar métrica"} onClose={() => setModal(null)}>
          <RedesForm item={modal.item} proyectos={data.proyectos} onSave={(v) => { modal.item.id ? onEdit(modal.item.id, v) : onAdd(v); setModal(null); }} />
        </Modal>
      )}
    </div>
  );
}

function RedesForm({ item, proyectos, onSave }) {
  const [v, setV] = useState(item);
  return (
    <div>
      <Field label="Proyecto">
        <select className="gp-input" value={v.proyectoId} onChange={(e) => setV({ ...v, proyectoId: e.target.value })}>
          <option value="">— sin proyecto —</option>
          {ordenadosPorNombre(proyectos).map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
        </select>
      </Field>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="Plataforma"><select className="gp-input" value={v.plataforma} onChange={(e) => setV({ ...v, plataforma: e.target.value })}>{PLATAFORMAS.map((c) => <option key={c}>{c}</option>)}</select></Field>
        <Field label="Fecha"><input type="date" className="gp-input" value={v.fecha} onChange={(e) => setV({ ...v, fecha: e.target.value })} /></Field>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="Seguidores"><input type="number" className="gp-input" value={v.seguidores} onChange={(e) => setV({ ...v, seguidores: e.target.value })} /></Field>
        <Field label="Alcance / engagement"><input type="number" className="gp-input" value={v.alcance} onChange={(e) => setV({ ...v, alcance: e.target.value })} /></Field>
      </div>
      <button className="gp-btn w-full py-2 text-sm mt-2" onClick={() => onSave(v)}>Guardar</button>
    </div>
  );
}

// Igual que Finanzas+Facturas: Marketing y Redes sociales se agrupan en pestañas de una misma
// pantalla porque las redes alimentan las campañas — sin tocar la lógica interna de ninguna.
export default function MarketingYRedes({ data, tabInicial, marketingProps, redesProps }) {
  const [tab, setTab] = useState(tabInicial || "campanas");
  return (
    <div>
      <div className="flex gap-1 mb-4">
        <button onClick={() => setTab("campanas")} className={`text-sm px-3 py-1.5 rounded-full border ${tab === "campanas" ? "gp-btn" : "gp-btn-ghost"}`}>Campañas</button>
        <button onClick={() => setTab("redes")} className={`text-sm px-3 py-1.5 rounded-full border ${tab === "redes" ? "gp-btn" : "gp-btn-ghost"}`}>Redes sociales</button>
      </div>
      {tab === "campanas" ? <Marketing data={data} {...marketingProps} /> : <RedesSociales data={data} {...redesProps} />}
    </div>
  );
}

function Marketing({ data, onAdd, onEdit, onRemove, onAddComentario, onRemoveComentario, onAddActividad, onEditActividad, onRemoveActividad, onAddFinanzas }) {
  const [modal, setModal] = useState(null);
  const [comentariosDe, setComentariosDe] = useState(null);
  const [actividadesDe, setActividadesDe] = useState(null); // campaña cuyas actividades se muestran
  const [actividadModal, setActividadModal] = useState(null); // {campanaId, item}
  const [dineroModal, setDineroModal] = useState(null); // {campana, tipo: "Egreso"|"Ingreso"}
  const [filtroProyecto, setFiltroProyecto] = useState("Todos");
  const [filtroEstatus, setFiltroEstatus] = useState("Todas");
  const [orden, setOrden] = useState("default");
  const [busqueda, setBusqueda] = useState("");
  const empty = { proyectoId: "", nombre: "", plataforma: "Meta", fechaInicio: todayISO(), fechaFin: "", presupuesto: "", alcance: "", clics: "", conversiones: "", estatus: "Planeada", idExterno: "", notas: "" };

  const nombreProyecto = (id) => data.proyectos.find((p) => p.id === id)?.nombre || "—";
  const nComentarios = (id) => (data.comentarios || []).filter((c) => c.entidadTipo === "campanas" && c.entidadId === id).length;
  const actividadesDeCampana = (id) => (data.campanaActividades || []).filter((a) => a.campanaId === id).sort((a, b) => (a.fecha || "").localeCompare(b.fecha || ""));
  // Regla maestra de dinero: gastado/ingreso NUNCA se capturan a mano — se suman los
  // movimientos reales de Finanzas que están ligados a esta campaña (campanaId).
  const gastadoDe = (id) => (data.finanzas || []).filter((f) => f.campanaId === id && f.tipo === "Egreso" && f.estatus !== "Cancelado").reduce((s, f) => s + montoBaseDe(f), 0);
  const ingresoDe = (id) => (data.finanzas || []).filter((f) => f.campanaId === id && f.tipo === "Ingreso" && f.estatus !== "Cancelado").reduce((s, f) => s + montoBaseDe(f), 0);
  const retorno = (c) => {
    const gastado = gastadoDe(c.id);
    const ingreso = ingresoDe(c.id);
    if (!gastado) return null;
    return ((ingreso - gastado) / gastado) * 100;
  };

  const camposOrden = {
    inicio: { get: (c) => c.fechaInicio, tipo: "fecha" },
    registro: { get: (c) => c.createdAt, tipo: "fecha" },
    alfabetico: { get: (c) => c.nombre, tipo: "texto" },
    presupuesto: { get: (c) => Number(c.presupuesto) || 0, tipo: "numero" },
    retorno: { get: (c) => retorno(c) ?? -Infinity, tipo: "numero" },
  };
  const opcionesOrden = [
    { key: "inicio", label: "fecha de inicio (calendario)" },
    { key: "registro", label: "fecha de registro" },
    { key: "alfabetico", label: "alfabético" },
    { key: "presupuesto", label: "presupuesto" },
    { key: "retorno", label: "retorno (ROI)" },
  ];

  let filtradas = data.campanas;
  if (filtroProyecto !== "Todos") filtradas = filtradas.filter((c) => c.proyectoId === filtroProyecto);
  if (filtroEstatus !== "Todas") filtradas = filtradas.filter((c) => c.estatus === filtroEstatus);
  filtradas = filtrarPorBusqueda(filtradas, busqueda, [(c) => c.nombre, (c) => c.plataforma, (c) => c.notas, (c) => nombreProyecto(c.proyectoId)]);
  const base = orden === "default" ? [...filtradas].sort((a, b) => (a.fechaInicio || "9999").localeCompare(b.fechaInicio || "9999")) : filtradas;
  const ordenadas = ordenarLista(base, orden, camposOrden);

  const totalPresupuesto = ordenadas.reduce((s, c) => s + (Number(c.presupuesto) || 0), 0);
  const totalGastado = ordenadas.reduce((s, c) => s + gastadoDe(c.id), 0);
  const totalIngreso = ordenadas.reduce((s, c) => s + ingresoDe(c.id), 0);
  const columnasExport = [
    { label: "Nombre", get: (c) => c.nombre }, { label: "Proyecto", get: (c) => nombreProyecto(c.proyectoId) },
    { label: "Plataforma", get: (c) => c.plataforma }, { label: "Estatus", get: (c) => c.estatus },
    { label: "Inicio", get: (c) => c.fechaInicio }, { label: "Fin", get: (c) => c.fechaFin },
    { label: "Presupuesto", get: (c) => c.presupuesto }, { label: "Gastado", get: (c) => gastadoDe(c.id) },
    { label: "Ingreso atribuido", get: (c) => ingresoDe(c.id) }, { label: "ROI %", get: (c) => { const r = retorno(c); return r === null ? "" : Math.round(r); } },
  ];

  return (
    <div>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-1">
        <h2 className="gp-serif text-2xl">Marketing</h2>
        <button onClick={() => setModal({ item: empty })} className="gp-btn flex items-center justify-center gap-1 px-3 py-1.5 text-sm w-full sm:w-auto"><Plus size={14} /> Nueva campaña</button>
      </div>
      <p className="text-sm gp-text-muted mb-3">Calendario de campañas por proyecto, con presupuesto, actividades, métricas y retorno real desde Finanzas.</p>

      <div className="gp-panel p-4 mb-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div><p className="text-xs gp-text-muted">Presupuesto (en esta vista)</p><p className="gp-serif text-lg">{fmtMoney(totalPresupuesto)}</p></div>
        <div><p className="text-xs gp-text-muted">Gastado real</p><p className="gp-serif text-lg gp-text-red">{fmtMoney(totalGastado)}</p></div>
        <div><p className="text-xs gp-text-muted">Ingreso real atribuido</p><p className="gp-serif text-lg gp-text-teal">{fmtMoney(totalIngreso)}</p></div>
      </div>

      <div className="flex flex-wrap items-center gap-2 mb-2">
        <select className="gp-input text-xs py-1.5" style={{ width: "auto" }} value={filtroProyecto} onChange={(e) => setFiltroProyecto(e.target.value)}>
          <option value="Todos">Todos los proyectos</option>
          {ordenadosPorNombre(data.proyectos).map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
        </select>
        <select className="gp-input text-xs py-1.5" style={{ width: "auto" }} value={filtroEstatus} onChange={(e) => setFiltroEstatus(e.target.value)}>
          <option value="Todas">Todos los estatus</option>
          {ESTATUS_CAMPANA.map((s) => <option key={s}>{s}</option>)}
        </select>
        <OrdenSelector opciones={opcionesOrden} value={orden} onChange={setOrden} />
      </div>
      <BarraListaEstandar busqueda={busqueda} onBusqueda={setBusqueda} placeholder="Buscar por nombre, plataforma o proyecto…"
        onExportExcel={() => exportarFilasExcel(ordenadas, columnasExport, "campanas")}
        onExportPDF={() => exportarFilasPDF(ordenadas, columnasExport, "campañas de marketing", `proyecto: ${filtroProyecto === "Todos" ? "todos" : nombreProyecto(filtroProyecto)} · estatus: ${filtroEstatus}${busqueda ? ` · búsqueda: "${busqueda}"` : ""}`)} />

      <div className="space-y-2">
        {ordenadas.map((c) => {
          const r = retorno(c);
          const nc = nComentarios(c.id);
          const acts = actividadesDeCampana(c.id);
          const actsPendientes = acts.filter((a) => a.estado !== "Publicada" && a.estado !== "Cancelada").length;
          return (
            <div key={c.id} className="gp-panel p-4">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium">{c.nombre}</span>
                    <Badge tone="muted">{c.plataforma}</Badge>
                    <Badge tone={c.estatus === "Activa" ? "teal" : c.estatus === "Finalizada" ? "muted" : "gold"}>{c.estatus}</Badge>
                    {r !== null && <Badge tone={r >= 0 ? "teal" : "red"}>ROI {r.toFixed(0)}%</Badge>}
                  </div>
                  <p className="text-xs gp-text-muted mt-0.5">
                    {nombreProyecto(c.proyectoId)} · {c.fechaInicio || "—"}{c.fechaFin ? ` a ${c.fechaFin}` : ""}
                  </p>
                </div>
                <div className="flex gap-1">
                  <IconBtn title="Comentarios" onClick={() => setComentariosDe(c)}><MessageCircle size={13} />{nc > 0 && <span className="gp-mono" style={{ fontSize: 9, marginLeft: 2 }}>{nc}</span>}</IconBtn>
                  <IconBtn title="Editar" onClick={() => setModal({ item: c })}><Pencil size={13} /></IconBtn><IconBtn title="Eliminar" onClick={() => onRemove(c.id)}><Trash2 size={13} /></IconBtn>
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mt-3 text-xs">
                <div><p className="gp-text-muted">Presupuesto</p><p className="gp-mono">{fmtMoney(c.presupuesto)}</p></div>
                <div><p className="gp-text-muted">Gastado real</p><p className="gp-mono gp-text-red">{fmtMoney(gastadoDe(c.id))}</p></div>
                <div><p className="gp-text-muted">Alcance</p><p className="gp-mono">{c.alcance || "—"}</p></div>
                <div><p className="gp-text-muted">Clics</p><p className="gp-mono">{c.clics || "—"}</p></div>
                <div><p className="gp-text-muted">Conversiones</p><p className="gp-mono">{c.conversiones || "—"}</p></div>
              </div>
              {c.notas && <p className="text-xs mt-2 gp-text-muted">{c.notas}</p>}
              <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t gp-border">
                <button onClick={() => setActividadesDe(c)} className="gp-btn-ghost px-3 py-1.5 text-xs rounded">
                  Actividades {acts.length > 0 && `(${actsPendientes}/${acts.length})`}
                </button>
                <button onClick={() => setDineroModal({ campana: c, tipo: "Egreso" })} className="gp-btn-ghost px-3 py-1.5 text-xs rounded">Registrar gasto</button>
                <button onClick={() => setDineroModal({ campana: c, tipo: "Ingreso" })} className="gp-btn-ghost px-3 py-1.5 text-xs rounded">Registrar ingreso</button>
              </div>
            </div>
          );
        })}
        {ordenadas.length === 0 && <p className="text-sm gp-text-muted">Sin campañas registradas con este filtro.</p>}
      </div>

      {comentariosDe && (
        <Modal title={`Comentarios — ${comentariosDe.nombre}`} onClose={() => setComentariosDe(null)}>
          <Bitacora data={data} entidadTipo="campanas" entidadId={comentariosDe.id} onAdd={onAddComentario} onRemove={onRemoveComentario} />
        </Modal>
      )}

      {modal && (
        <Modal title={modal.item.id ? "Editar campaña" : "Nueva campaña"} onClose={() => setModal(null)}>
          <CampanaForm item={modal.item} proyectos={data.proyectos} onSave={(v) => { modal.item.id ? onEdit(modal.item.id, v) : onAdd(v); setModal(null); }} />
        </Modal>
      )}

      {dineroModal && (
        <Modal title={`${dineroModal.tipo === "Egreso" ? "Registrar gasto" : "Registrar ingreso"} — ${dineroModal.campana.nombre}`} onClose={() => setDineroModal(null)}>
          <DineroCampanaForm
            tipo={dineroModal.tipo}
            onGuardar={({ monto, fecha, concepto }) => {
              onAddFinanzas({
                id: uid(), tipo: dineroModal.tipo, categoria: dineroModal.tipo === "Egreso" ? "Marketing — campaña" : "Ingreso de campaña",
                forma: "Transferencia", estatus: "Cobrado", esRecurrente: false,
                fecha, proyectoId: dineroModal.campana.proyectoId || "", campanaId: dineroModal.campana.id,
                concepto: concepto || `${dineroModal.tipo === "Egreso" ? "Gasto" : "Ingreso"} — ${dineroModal.campana.nombre}`, monto,
              });
              setDineroModal(null);
            }}
          />
        </Modal>
      )}

      {actividadesDe && (
        <Modal title={`Actividades — ${actividadesDe.nombre}`} onClose={() => setActividadesDe(null)}>
          <CampanaActividades
            campana={actividadesDe}
            actividades={actividadesDeCampana(actividadesDe.id)}
            contactos={data.contactos}
            onNueva={() => setActividadModal({ campanaId: actividadesDe.id, item: null })}
            onEditar={(item) => setActividadModal({ campanaId: actividadesDe.id, item })}
            onEliminar={onRemoveActividad}
            onCambiarEstado={(id, estado) => onEditActividad(id, { estado })}
          />
        </Modal>
      )}

      {actividadModal && (
        <Modal title={actividadModal.item ? "Editar actividad" : "Nueva actividad"} onClose={() => setActividadModal(null)}>
          <ActividadCampanaForm
            item={actividadModal.item}
            contactos={data.contactos}
            onSave={(v) => {
              if (actividadModal.item) onEditActividad(actividadModal.item.id, v);
              else onAddActividad({ ...v, campanaId: actividadModal.campanaId, proyectoId: actividadesDe?.proyectoId || "" });
              setActividadModal(null);
            }}
          />
        </Modal>
      )}
    </div>
  );
}

function DineroCampanaForm({ tipo, onGuardar }) {
  const [monto, setMonto] = useState("");
  const [fecha, setFecha] = useState(todayISO());
  const [concepto, setConcepto] = useState("");
  const [error, setError] = useState("");
  return (
    <div>
      <p className="text-xs gp-text-muted mb-3">Esto crea un {tipo === "Egreso" ? "Egreso" : "Ingreso"} real en Finanzas, ligado a esta campaña — así el gasto/ingreso de Marketing nunca se duplica ni se captura a mano.</p>
      <Field label="Concepto (opcional)"><input className="gp-input" placeholder={tipo === "Egreso" ? "ej. Pauta en Meta" : "ej. Venta atribuida a la campaña"} value={concepto} onChange={(e) => setConcepto(e.target.value)} /></Field>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="Monto"><MoneyInput className="gp-input" value={monto} onChange={setMonto} /></Field>
        <Field label="Fecha"><input type="date" className="gp-input" value={fecha} onChange={(e) => setFecha(e.target.value)} /></Field>
      </div>
      {error && <p className="text-xs gp-text-red mb-2">{error}</p>}
      <button className="gp-btn w-full py-2 text-sm mt-1" onClick={() => {
        const montoNum = Number(monto);
        if (!montoNum || montoNum <= 0) { setError("Captura un monto válido."); return; }
        onGuardar({ monto: montoNum, fecha, concepto });
      }}>Guardar</button>
    </div>
  );
}

// Lista de actividades calendarizadas de una campaña (sección 10 del documento: fecha/hora,
// canal, tipo de contenido, acción, responsable, prioridad, tiempo, estado).
function CampanaActividades({ campana, actividades, contactos, onNueva, onEditar, onEliminar, onCambiarEstado }) {
  const nombreResp = (id) => contactos.find((c) => c.id === id)?.nombre || "—";
  const toneEstado = { Pendiente: "gold", "En proceso": "teal", Publicada: "muted", Cancelada: "red" };
  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs gp-text-muted">Qué hacer, cuándo, en qué canal y para este proyecto — sin capturar dinero aquí.</p>
        <button onClick={onNueva} className="gp-btn px-3 py-1.5 text-xs shrink-0 flex items-center gap-1"><Plus size={13} /> Nueva</button>
      </div>
      {actividades.length === 0 && <p className="text-sm gp-text-muted">Sin actividades todavía.</p>}
      <div className="space-y-2 max-h-96 overflow-y-auto gp-scroll">
        {actividades.map((a) => (
          <div key={a.id} className="gp-panel p-3">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-sm">{a.accion}</p>
                <div className="flex flex-wrap gap-1.5 mt-1.5">
                  <span className="gp-mono text-xs gp-text-muted">{a.fecha}{a.hora ? ` · ${String(a.hora).slice(0, 5)}` : ""}</span>
                  {a.canal && <Badge tone="muted">{a.canal}</Badge>}
                  {a.tipoContenido && <Badge tone="muted">{a.tipoContenido}</Badge>}
                  {a.prioridad === "Alta" && <Badge tone="red">Alta</Badge>}
                  {a.responsableContactoId && <Badge tone="gold">{nombreResp(a.responsableContactoId)}</Badge>}
                </div>
              </div>
              <div className="flex gap-1 shrink-0">
                <IconBtn title="Editar" onClick={() => onEditar(a)}><Pencil size={13} /></IconBtn>
                <IconBtn title="Eliminar" onClick={() => onEliminar(a.id)}><Trash2 size={13} /></IconBtn>
              </div>
            </div>
            <div className="flex items-center justify-between mt-2">
              <select className="gp-input text-xs py-1" style={{ width: "auto" }} value={a.estado || "Pendiente"} onChange={(e) => onCambiarEstado(a.id, e.target.value)}>
                {["Pendiente", "En proceso", "Publicada", "Cancelada"].map((s) => <option key={s}>{s}</option>)}
              </select>
              {a.valorEstimado ? <span className="gp-mono text-xs gp-text-muted">Valor est.: {fmtMoney(a.valorEstimado)}</span> : null}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ActividadCampanaForm({ item, contactos, onSave }) {
  const [v, setV] = useState(item || { fecha: todayISO(), hora: "", canal: "", tipoContenido: "", accion: "", responsableContactoId: "", prioridad: "Media", valorEstimado: "", tiempoEstimadoHoras: "", estado: "Pendiente", notas: "" });
  const [error, setError] = useState("");
  return (
    <div>
      <Field label="¿Qué hay que hacer?"><input className="gp-input" placeholder="ej. Publicar Reel de detrás de cámaras" value={v.accion} onChange={(e) => setV({ ...v, accion: e.target.value })} /></Field>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="Fecha"><input type="date" className="gp-input" value={v.fecha} onChange={(e) => setV({ ...v, fecha: e.target.value })} /></Field>
        <Field label="Hora (opcional)"><input type="time" className="gp-input" value={v.hora || ""} onChange={(e) => setV({ ...v, hora: e.target.value })} /></Field>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="Canal"><input className="gp-input" placeholder="ej. Instagram, TikTok, Email" value={v.canal || ""} onChange={(e) => setV({ ...v, canal: e.target.value })} /></Field>
        <Field label="Tipo de contenido"><input className="gp-input" placeholder="ej. Post, Reel, Historia" value={v.tipoContenido || ""} onChange={(e) => setV({ ...v, tipoContenido: e.target.value })} /></Field>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="Responsable (opcional)">
          <select className="gp-input" value={v.responsableContactoId || ""} onChange={(e) => setV({ ...v, responsableContactoId: e.target.value || null })}>
            <option value="">— sin asignar —</option>
            {ordenadosPorNombre(contactos).map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
          </select>
        </Field>
        <Field label="Prioridad"><select className="gp-input" value={v.prioridad} onChange={(e) => setV({ ...v, prioridad: e.target.value })}>{["Baja", "Media", "Alta"].map((p) => <option key={p}>{p}</option>)}</select></Field>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="Valor estimado (opcional)"><MoneyInput className="gp-input" value={v.valorEstimado} onChange={(val) => setV({ ...v, valorEstimado: val })} /></Field>
        <Field label="Tiempo estimado (horas, opcional)"><input type="number" className="gp-input" value={v.tiempoEstimadoHoras || ""} onChange={(e) => setV({ ...v, tiempoEstimadoHoras: e.target.value })} /></Field>
      </div>
      <p className="text-xs gp-text-muted mb-3">El valor estimado es solo de planeación — no crea ningún movimiento en Finanzas.</p>
      <Field label="Notas (opcional)"><textarea className="gp-input" rows={2} value={v.notas || ""} onChange={(e) => setV({ ...v, notas: e.target.value })} /></Field>
      {error && <p className="text-xs gp-text-red mb-2">{error}</p>}
      <button className="gp-btn w-full py-2 text-sm mt-1" onClick={() => { if (!v.accion?.trim()) { setError("Describe qué hay que hacer."); return; } if (!v.fecha) { setError("Captura la fecha."); return; } setError(""); onSave(v); }}>Guardar</button>
    </div>
  );
}

function CampanaForm({ item, proyectos, onSave }) {
  const [v, setV] = useState(item);
  const [error, setError] = useState("");
  return (
    <div>
      <Field label="Nombre de la campaña"><input className="gp-input" placeholder="ej. Lanzamiento otoño, Promo Navidad" value={v.nombre} onChange={(e) => setV({ ...v, nombre: e.target.value })} /></Field>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="Proyecto">
          <select className="gp-input" value={v.proyectoId} onChange={(e) => setV({ ...v, proyectoId: e.target.value })}>
            <option value="">— sin proyecto —</option>
            {ordenadosPorNombre(proyectos).map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
          </select>
        </Field>
        <Field label="Plataforma"><select className="gp-input" value={v.plataforma} onChange={(e) => setV({ ...v, plataforma: e.target.value })}>{PLATAFORMAS_CAMPANA.map((c) => <option key={c}>{c}</option>)}</select></Field>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="Fecha de inicio"><input type="date" className="gp-input" value={v.fechaInicio} onChange={(e) => setV({ ...v, fechaInicio: e.target.value })} /></Field>
        <Field label="Fecha de fin (opcional)"><input type="date" className="gp-input" value={v.fechaFin || ""} onChange={(e) => setV({ ...v, fechaFin: e.target.value })} /></Field>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Field label="Presupuesto"><MoneyInput className="gp-input" value={v.presupuesto} onChange={(val) => setV({ ...v, presupuesto: val })} /></Field>
        <Field label="Alcance"><input type="number" className="gp-input" value={v.alcance} onChange={(e) => setV({ ...v, alcance: e.target.value })} /></Field>
        <Field label="Clics"><input type="number" className="gp-input" value={v.clics} onChange={(e) => setV({ ...v, clics: e.target.value })} /></Field>
      </div>
      <Field label="Conversiones"><input type="number" className="gp-input" value={v.conversiones} onChange={(e) => setV({ ...v, conversiones: e.target.value })} /></Field>
      <p className="text-xs gp-text-muted mb-3">Lo gastado y lo ganado de esta campaña se registran como movimientos reales en Finanzas desde la tarjeta de la campaña — no se capturan aquí, para no duplicar el dinero real (regla maestra de Finanzas).</p>
      <Field label="Estatus"><select className="gp-input" value={v.estatus} onChange={(e) => setV({ ...v, estatus: e.target.value })}>{ESTATUS_CAMPANA.map((c) => <option key={c}>{c}</option>)}</select></Field>
      <Field label="ID externo (opcional, para cuando conectes Meta/Google/Stripe)"><input className="gp-input" value={v.idExterno || ""} onChange={(e) => setV({ ...v, idExterno: e.target.value })} /></Field>
      <Field label="Notas"><textarea className="gp-input" rows={2} value={v.notas} onChange={(e) => setV({ ...v, notas: e.target.value })} /></Field>
      {error && <p className="text-xs gp-text-red mb-2">{error}</p>}

      <button className="gp-btn w-full py-2 text-sm mt-2" onClick={() => { if (!v.nombre?.toString().trim()) { setError("El nombre de la campaña es obligatorio."); return; } setError(""); onSave(v); }}>Guardar</button>
    </div>
  );
}
