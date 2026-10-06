// src/components/modulos/ProyectoDetalle.jsx
//
// Modulo perezoso (Fase 2). Salio de App.jsx el 5 oct 2026; se mudaron con el sus propias
// piezas (NumeroGuardable), que nadie mas usaba.

import Bitacora from "../comunes/Bitacora";
import { Badge, IconBtn } from "../ui/basicos";
import { BotonArbolTareas, CheckTareaHecha, ConfirmacionModal, ContadorRamaColapsada, ToggleArbolTarea, preguntaCompletarTarea } from "../comunes/arbolTareas";
import { CANDADO_SENSIBLE_ACTIVO, ESTATUS_TAREA } from "../../lib/catalogos";
import { Check, ChevronRight, MessageCircle, Pencil, Plus, Trash2, X } from "lucide-react";
import { EtiquetaDiasEntrega } from "../comunes/EtiquetaDiasEntrega";
import { MetaForm, PendienteForm } from "../comunes/formularios";
import { Modal } from "../ui/Modal";
import { buildTareaTree, calcAvanceTarea, descendientesDe, flattenTareas, fmtFechaCompletado, idsRamasTareas, reabrirTarea } from "../../lib/tareas";
import { daysUntil, fmtMoney, todayISO, uid } from "../../lib/formato";
import { rentabilidadProyecto, repartoCostosProyecto } from "../../lib/proyectos";
import { useBorrador } from "../ui/borradores";
import { useEffect, useState } from "react";

// Mismo patrón que SelectGuardable, para los campos numéricos de una tabla (el avance en el
// árbol de tareas del centro de proyecto).
function NumeroGuardable({ valor, placeholder, onGuardar, ariaLabel, style }) {
  const { borrador, cambiar, descartar, sucio } = useBorrador({ v: valor ?? "" });
  return (
    <span className="inline-flex items-center gap-1">
      <input
        type="number" min={0} max={100} aria-label={ariaLabel}
        value={borrador.v} placeholder={placeholder}
        onChange={(e) => cambiar({ v: e.target.value === "" ? "" : Math.max(0, Math.min(100, Number(e.target.value))) })}
        className="gp-input gp-mono" style={{ width: 48, padding: "1px 4px", fontSize: 10, ...(style || {}) }}
      />
      {sucio && (
        <>
          <IconBtn title="Guardar este cambio" onClick={() => { const v = borrador.v; descartar(); onGuardar(v === "" ? null : Number(v)); }}>
            <Check size={12} className="gp-text-teal" />
          </IconBtn>
          <IconBtn title="Descartar" onClick={descartar}><X size={12} className="gp-text-red" /></IconBtn>
        </>
      )}
    </span>
  );
}

// Pantalla completa de un solo proyecto: todos sus pendientes con subtareas anidadas,
// porcentaje de avance (manual en tareas finales, calculado en tareas con hijos), y comentarios.
export default function ProyectoDetalle({ data, proyectoId, onVolver, onAddTarea, onEditTarea, onEditProyecto, onRemoveTarea, onAddComentario, onRemoveComentario, onAddMeta, onEditMeta, onRemoveMeta, onIrAVista, sensibleDesbloqueadoHasta, onDesbloquear, onCrearContacto, onEnviarInvitacion, onAceptarEnNombre }) {
  const proyecto = data.proyectos.find((p) => p.id === proyectoId);
  const [modal, setModal] = useState(null);
  const [modalMeta, setModalMeta] = useState(null);
  const [comentariosDe, setComentariosDe] = useState(null);
  // Ramas del árbol de tareas que están cerradas (ids de las tareas padre). Vacío = todo abierto.
  const [colapsadas, setColapsadas] = useState(() => new Set());
  const [confirmacion, setConfirmacion] = useState(null);
  // Etapa 7 (Centro de Proyecto, secc. 24.1): vista integral con pestañas — no crea tablas nuevas,
  // solo consulta y filtra las entidades reales por proyectoId y permite navegar al módulo fuente.
  const [tab, setTab] = useState("resumen");

  // Mismo enmascarado que Centro de Mando y Notificaciones (secc. 23.8): Finanzas y Legal/
  // Documentos son módulos sensibles — verlos resumidos aquí sin candado sería el mismo hueco que
  // ya se corrigió ahí. Se protege mientras la ventana de 15 min no esté vigente.
  const [, forceTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => forceTick((t) => t + 1), 15000);
    return () => clearInterval(id);
  }, []);
  const sensibleDesbloqueado = !CANDADO_SENSIBLE_ACTIVO || Date.now() < (sensibleDesbloqueadoHasta || 0);

  if (!proyecto) {
    return (
      <div>
        <button onClick={onVolver} className="text-xs gp-text-muted flex items-center gap-1 mb-4"><ChevronRight size={12} style={{ transform: "rotate(180deg)" }} /> Proyectos e ideas</button>
        <p className="text-sm gp-text-muted">Este proyecto ya no existe o no tienes acceso a él.</p>
      </div>
    );
  }

  const empty = { proyectoId, parentId: "", descripcion: "", fechaLimite: todayISO(), fechaRevision: "", prioridad: "Media", estatus: "Pendiente", colaboradorContactoId: null, contactoId: "", precio: "", fechaPagoAprox: "", tiempoEstimado: "", tiempoReal: "", asignadoA: "", avance: "" };
  const tareasProyecto = data.pendientes.filter((t) => t.proyectoId === proyectoId);
  const arbol = buildTareaTree(tareasProyecto);
  const filas = flattenTareas(arbol, 0, colapsadas);
  const idsRamas = idsRamasTareas(arbol);
  const toggleRama = (id) => setColapsadas((prev) => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });
  const avanceGeneral = arbol.length ? Math.round(arbol.reduce((s, n) => s + calcAvanceTarea(n), 0) / arbol.length) : 0;
  const r = rentabilidadProyecto(data, proyectoId);
  const metasProyecto = (data.metas || []).filter((m) => m.proyectoId === proyectoId);
  const nComentarios = (id) => (data.comentarios || []).filter((c) => c.entidadTipo === "pendientes" && c.entidadId === id).length;
  const nombreResp = (id) => data.contactos.find((c) => c.id === id)?.nombre || "Tú";
  const nombreCliente = (id) => data.contactos.find((c) => c.id === id)?.nombre || "—";
  const paraEditar = (t) => { const { hijos, ...limpio } = t; return limpio; };
  const pedirCompletarTarea = (t) => setConfirmacion(preguntaCompletarTarea({
    tarea: t, data, onEditTarea, onEditProyecto, onAviso: (m) => alert(m),
  }));
  // Elegir "Completada" en el selector pasa por la misma regla que el check: confirma y registra
  // la fecha. Salir de "Completada" la borra, junto con el avance de 100 que se había fijado.
  const cambiarEstatusTarea = (t, nuevo) => {
    if (nuevo === t.estatus) return;
    if (nuevo === "Completada") { pedirCompletarTarea(t); return; }
    onEditTarea(t.id, t.estatus === "Completada" ? { estatus: nuevo, completadaEn: null, avance: null } : { estatus: nuevo });
  };
  const confirmarBorrado = (item) => {
    const hijosIds = descendientesDe(item.id, data.pendientes);
    if (hijosIds.length > 0) {
      onRemoveTarea(item.id, hijosIds, `Esta tarea tiene ${hijosIds.length} subtarea${hijosIds.length > 1 ? "s" : ""} debajo. Si la eliminas, también se eliminan todas sus subtareas.`);
    } else {
      onRemoveTarea(item.id);
    }
  };

  // Datos de los demás módulos relacionados a este proyecto — solo se consultan y filtran, nada
  // se duplica; "Ver en <módulo>" navega a la fuente real (secc. 24.1: "permitir navegación al
  // registro fuente").
  const finanzasProyecto = (data.finanzas || []).filter((f) => f.proyectoId === proyectoId).sort((a, b) => (b.fecha || "").localeCompare(a.fecha || ""));
  const facturasProyecto = (data.facturas || []).filter((f) => f.proyectoId === proyectoId);
  const campanasProyecto = (data.campanas || []).filter((c) => c.proyectoId === proyectoId);
  const redesProyecto = (data.redesMetricas || []).filter((r2) => r2.proyectoId === proyectoId);
  const documentosProyecto = (data.documentos || []).filter((d) => d.proyectoId === proyectoId);
  // Contacto–Proyecto es muchos-a-muchos desde la tabla puente contacto_proyectos (antes era un
  // campo proyectoId directo en el contacto, ya no existe esa columna).
  const contactosProyecto = (data.contactoProyectos || [])
    .filter((v) => v.proyectoId === proyectoId)
    .map((v) => data.contactos.find((c) => c.id === v.contactoId))
    .filter(Boolean);

  const TABS = [
    { key: "resumen", label: "Resumen" },
    { key: "finanzas", label: `Finanzas${finanzasProyecto.length + facturasProyecto.length ? ` (${finanzasProyecto.length + facturasProyecto.length})` : ""}` },
    { key: "marketing", label: `Marketing${campanasProyecto.length ? ` (${campanasProyecto.length})` : ""}` },
    { key: "legal", label: `Documentos${documentosProyecto.length ? ` (${documentosProyecto.length})` : ""}` },
    { key: "contactos", label: `Contactos${contactosProyecto.length ? ` (${contactosProyecto.length})` : ""}` },
  ];

  return (
    <div>
      {/* breadcrumb: para siempre saber en dónde estás navegando dentro de la app */}
      <div className="flex items-center gap-1.5 text-xs gp-text-muted mb-3">
        <button onClick={onVolver} className="hover:underline">Proyectos e ideas</button>
        <ChevronRight size={12} />
        <span className="gp-text-teal">{proyecto.nombre}</span>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between mb-1">
        <div>
          <h2 className="gp-serif text-2xl">{proyecto.nombre}</h2>
          <div className="flex items-center gap-2 flex-wrap mt-1">
            <Badge tone="muted">{proyecto.categoria}</Badge>
            <Badge tone={proyecto.modo === "Continuo" ? "teal" : "muted"}>{proyecto.modo || "Finito"}</Badge>
            {proyecto.prioridad && <Badge tone={proyecto.prioridad === "Alta" ? "red" : proyecto.prioridad === "Media" ? "gold" : "muted"}>{proyecto.prioridad}</Badge>}
            {/* Lo primero que quieres saber al abrir un proyecto: cuánto falta para entregarlo. */}
            <EtiquetaDiasEntrega p={proyecto} />
          </div>
        </div>
        <button onClick={() => setModal({ item: empty })} className="gp-btn flex items-center justify-center gap-1 px-3 py-1.5 text-sm w-full sm:w-auto"><Plus size={14} /> Nueva tarea</button>
      </div>
      {proyecto.descripcion && <p className="text-sm gp-text-muted mb-4">{proyecto.descripcion}</p>}

      {/* Pestañas del Centro de Proyecto */}
      <div className="flex gap-1 mb-4 flex-wrap">
        {TABS.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)} className="px-3 py-1.5 text-xs rounded-full border"
            style={{ background: tab === t.key ? "var(--gold)" : "transparent", color: tab === t.key ? "#0B2341" : "inherit", borderColor: tab === t.key ? "var(--gold)" : "var(--border)" }}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === "resumen" && (
        <>
          <div className="gp-panel-hi p-3 mb-4 grid grid-cols-2 sm:grid-cols-6 gap-2 text-xs">
            <div><p className="gp-text-muted">Avance general</p><p className="gp-mono gp-text-gold">{avanceGeneral}%</p></div>
            {sensibleDesbloqueado ? (
              <>
                <div><p className="gp-text-muted">Ingresos</p><p className="gp-mono gp-text-teal">{fmtMoney(r.ingresos)}</p></div>
                <div><p className="gp-text-muted">Egresos</p><p className="gp-mono gp-text-red">{fmtMoney(r.egresos)}</p></div>
                <div><p className="gp-text-muted">Neto</p><p className={`gp-mono ${r.neto >= 0 ? "gp-text-teal" : "gp-text-red"}`}>{fmtMoney(r.neto)}</p></div>
                <div><p className="gp-text-muted">Pagado a colaboradores</p><p className="gp-mono gp-text-gold">{fmtMoney(r.pagosColab)}</p></div>
                <div><p className="gp-text-muted">Costo estimado total</p><p className="gp-mono">{fmtMoney(r.costoEstimadoTotal)}</p></div>
              </>
            ) : (
              <button onClick={onDesbloquear} className="col-span-2 sm:col-span-5 text-left">
                <p className="text-xs gp-text-gold">🔒 Verifica tu contraseña para ver los números de este proyecto</p>
              </button>
            )}
          </div>

          {sensibleDesbloqueado && (() => {
            const reparto = repartoCostosProyecto(data, proyectoId);
            if (reparto.length === 0) return null;
            return (
              <div className="mb-4">
                <p className="text-sm font-medium mb-2">Reparto de costos por participante</p>
                <div className="gp-panel overflow-x-auto">
                  <table className="gp-table">
                    <thead><tr><th>Participante</th><th>Tareas con precio</th><th>Ya generado</th><th>Por hacer</th><th>Total pactado</th></tr></thead>
                    <tbody>
                      {reparto.map((g) => (
                        <tr key={g.key}>
                          <td>{g.esYo ? "Tú" : g.nombre}</td>
                          <td className="gp-mono">{g.tareas}</td>
                          <td className="gp-mono gp-text-teal">{fmtMoney(g.generado)}</td>
                          <td className="gp-mono gp-text-gold">{fmtMoney(g.pendiente)}</td>
                          <td className="gp-mono">{fmtMoney(g.total)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="text-xs gp-text-muted mt-1">Es un estimado según el precio pactado en cada tarea (columna "Precio" del pendiente). Lo tuyo ("Tú") es ingreso potencial y no se suma solo a Ingresos y egresos; para eso registra el movimiento ahí cuando lo cobres.</p>
              </div>
            );
          })()}

          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium">Metas — qué define el éxito de este proyecto</p>
              <button onClick={() => setModalMeta({ item: { proyectoId, descripcion: "", fechaObjetivo: todayISO(), fechaRevision: "", prioridad: "Media", estatus: "No iniciada" } })} className="gp-btn-ghost px-2.5 py-1 text-xs flex items-center gap-1"><Plus size={12} /> Nueva meta</button>
            </div>
            {metasProyecto.length === 0 ? (
              <p className="text-xs gp-text-muted">Sin metas todavía — agrega una para darle rumbo a este proyecto.</p>
            ) : (
              <div className="space-y-1.5">
                {metasProyecto.map((m) => {
                  const cumplida = m.estatus === "Cumplida";
                  return (
                    <div key={m.id} className="gp-panel p-2.5 flex items-center gap-2" style={cumplida ? { background: "var(--teal-tint)", color: "var(--teal-text)" } : undefined}>
                      <input
                        type="checkbox"
                        checked={cumplida}
                        title="Marcar como cumplida"
                        onChange={(e) => onEditMeta(m.id, { estatus: e.target.checked ? "Cumplida" : "En progreso" })}
                        style={{ width: 15, height: 15, accentColor: "var(--gold)", cursor: "pointer" }}
                      />
                      <span className="text-sm flex-1">{m.descripcion}</span>
                      <Badge tone={m.prioridad === "Alta" ? "red" : m.prioridad === "Media" ? "gold" : "muted"}>{m.prioridad || "Media"}</Badge>
                      {m.fechaObjetivo && <span className="text-xs gp-mono gp-text-muted">{m.fechaObjetivo}</span>}
                      <IconBtn title="Editar" onClick={() => setModalMeta({ item: m })}><Pencil size={12} /></IconBtn>
                      <IconBtn title="Eliminar" onClick={() => onRemoveMeta(m.id)}><Trash2 size={12} /></IconBtn>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {modalMeta && (
            <Modal title={modalMeta.item.id ? "Editar meta" : "Nueva meta"} onClose={() => setModalMeta(null)}>
              <MetaForm item={modalMeta.item} proyectos={data.proyectos} onSave={(v) => { modalMeta.item.id ? onEditMeta(modalMeta.item.id, v) : onAddMeta(v); setModalMeta(null); }} />
            </Modal>
          )}

          <div className="flex items-center justify-between gap-2 mb-2">
            <p className="text-sm font-medium">Tareas y subtareas · {tareasProyecto.length}</p>
            <BotonArbolTareas idsRamas={idsRamas} colapsadas={colapsadas} onCambiar={setColapsadas} />
          </div>

          <div className="gp-panel overflow-x-auto">
            <table className="gp-table">
              <thead><tr><th style={{ width: 30 }}></th><th>Pendiente</th><th>Cliente</th><th>Responsable</th><th>Fecha</th><th>Prioridad</th><th>Avance</th><th>Precio</th><th></th></tr></thead>
              <tbody>
                {filas.map(({ item: p, nivel }) => {
                  const vencido = p.estatus !== "Completada" && p.fechaLimite && daysUntil(p.fechaLimite) < 0;
                  const nc = nComentarios(p.id);
                  const tieneHijos = p.hijos && p.hijos.length > 0;
                  const colapsada = colapsadas.has(p.id);
                  const hecha = p.estatus === "Completada";
                  const avance = Math.round(calcAvanceTarea(p));
                  return (
                    <tr key={p.id} className={hecha ? "gp-fila-hecha" : undefined}>
                      <td><CheckTareaHecha tarea={p} onCompletar={pedirCompletarTarea} onReabrir={(t) => reabrirTarea(t, onEditTarea)} /></td>
                      <td>
                        <span style={{ paddingLeft: nivel * 18 }} className="flex items-center gap-1">
                          {nivel > 0 && <span className="gp-text-muted shrink-0">└</span>}
                          <ToggleArbolTarea nodo={p} colapsada={colapsada} onToggle={toggleRama} />
                          <span className={hecha ? "gp-texto-hecho" : ""} style={hecha ? { textDecoration: "line-through" } : undefined}>{p.descripcion}</span>
                          <ContadorRamaColapsada nodo={p} colapsada={colapsada} />
                        </span>
                      </td>
                      <td className="gp-text-muted">{p.contactoId ? nombreCliente(p.contactoId) : "—"}</td>
                      <td className="gp-text-muted">{nombreResp(p.colaboradorContactoId)}</td>
                      <td className="gp-mono" style={{ color: hecha ? "var(--teal)" : vencido ? "var(--red)" : undefined }}>
                        {hecha
                          ? <span title={p.fechaLimite ? `Fecha límite: ${p.fechaLimite}` : undefined}>✓ {p.completadaEn ? fmtFechaCompletado(p.completadaEn) : "—"}</span>
                          : p.fechaLimite}
                      </td>
                      <td><Badge tone={p.prioridad === "Alta" ? "red" : p.prioridad === "Media" ? "gold" : "muted"}>{p.prioridad}</Badge></td>
                      <td>
                        <div className="flex items-center gap-1.5" style={{ minWidth: 130 }}>
                          <div className="h-1.5 rounded flex-1" style={{ background: "var(--border)" }}>
                            <div className="h-1.5 rounded" style={{ width: `${avance}%`, background: avance === 100 ? "var(--teal)" : "var(--gold)" }} />
                          </div>
                          {tieneHijos ? (
                            <span className="gp-mono" style={{ fontSize: 10 }}>{avance}%</span>
                          ) : (
                            <NumeroGuardable
                              valor={p.avance} placeholder={String(avance)} ariaLabel="Avance de la tarea"
                              onGuardar={(val) => onEditTarea(p.id, { avance: val })}
                            />
                          )}
                          {!tieneHijos && (
                            <select className="gp-input" style={{ padding: "1px 4px", fontSize: 10, width: 88 }} value={p.estatus} onChange={(e) => cambiarEstatusTarea(p, e.target.value)}>
                              {ESTATUS_TAREA.map((s) => <option key={s}>{s}</option>)}
                            </select>
                          )}
                        </div>
                      </td>
                      <td className="gp-mono">{sensibleDesbloqueado ? (p.precio ? fmtMoney(p.precio) : "—") : (p.precio ? "🔒" : "—")}</td>
                      <td><div className="flex gap-1">
                        <IconBtn title="Agregar subtarea" onClick={() => setModal({ item: { ...empty, parentId: p.id } })}><Plus size={13} /></IconBtn>
                        <IconBtn title="Comentarios" onClick={() => setComentariosDe(p)}><MessageCircle size={13} />{nc > 0 && <span className="gp-mono" style={{ fontSize: 9, marginLeft: 2 }}>{nc}</span>}</IconBtn>
                        <IconBtn title="Editar" onClick={() => setModal({ item: paraEditar(p) })}><Pencil size={13} /></IconBtn>
                        <IconBtn title="Eliminar" onClick={() => confirmarBorrado(p)}><Trash2 size={13} /></IconBtn>
                      </div></td>
                    </tr>
                  );
                })}
                {filas.length === 0 && <tr><td colSpan={9} className="text-center gp-text-muted py-6">Sin tareas registradas en este proyecto todavía.</td></tr>}
              </tbody>
            </table>
          </div>

          <div className="border-t gp-border pt-4 mt-6">
            <p className="text-sm font-medium mb-2">Actividad — comentarios del proyecto</p>
            <Bitacora data={data} entidadTipo="proyectos" entidadId={proyecto.id} onAdd={onAddComentario} onRemove={onRemoveComentario} />
          </div>
        </>
      )}

      {tab === "finanzas" && (
        <div>
          {!sensibleDesbloqueado ? (
            <button onClick={onDesbloquear} className="text-left">
              <p className="text-sm gp-text-gold">🔒 Verifica tu contraseña para ver Finanzas de este proyecto</p>
            </button>
          ) : (
            <>
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium">Movimientos financieros de este proyecto</p>
                <button onClick={() => onIrAVista("finanzas")} className="text-xs gp-text-gold">Ver en Finanzas →</button>
              </div>
              {finanzasProyecto.length === 0 ? (
                <p className="text-xs gp-text-muted mb-4">Sin movimientos registrados con este proyecto todavía.</p>
              ) : (
                <div className="gp-panel overflow-x-auto mb-4">
                  <table className="gp-table">
                    <thead><tr><th>Concepto</th><th>Tipo</th><th>Fecha</th><th>Estatus</th><th>Monto</th></tr></thead>
                    <tbody>
                      {finanzasProyecto.map((f) => (
                        <tr key={f.id}>
                          <td>{f.concepto || "—"}{f.eventoId && <span className="gp-text-muted text-xs"> · Eventos</span>}{f.activoId && <span className="gp-text-muted text-xs"> · Activos digitales</span>}</td>
                          <td><Badge tone={f.tipo === "Ingreso" ? "teal" : "red"}>{f.tipo}</Badge></td>
                          <td className="gp-mono">{f.fecha}</td>
                          <td><Badge tone={f.estatus === "Cobrado" ? "teal" : "gold"}>{f.estatus}</Badge></td>
                          <td className={`gp-mono ${f.tipo === "Ingreso" ? "gp-text-teal" : "gp-text-red"}`}>{f.tipo === "Ingreso" ? "+" : "−"}{fmtMoney(f.monto)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium">Facturas de este proyecto</p>
                <button onClick={() => onIrAVista("facturas")} className="text-xs gp-text-gold">Ver en Finanzas →</button>
              </div>
              {facturasProyecto.length === 0 ? (
                <p className="text-xs gp-text-muted">Sin facturas ligadas a este proyecto.</p>
              ) : (
                <div className="gp-panel overflow-x-auto">
                  <table className="gp-table">
                    <thead><tr><th>Concepto</th><th>Fecha</th><th>Estatus</th><th>Total</th></tr></thead>
                    <tbody>
                      {facturasProyecto.map((f) => (
                        <tr key={f.id}>
                          <td>{f.concepto || f.folio || "—"}</td>
                          <td className="gp-mono">{f.fecha}</td>
                          <td><Badge tone={f.estatus === "Pagada" || f.estatus === "Cobrado" ? "teal" : "gold"}>{f.estatus}</Badge></td>
                          <td className="gp-mono">{fmtMoney(f.total)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {tab === "marketing" && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium">Campañas de este proyecto</p>
            <button onClick={() => onIrAVista("marketing")} className="text-xs gp-text-gold">Ver en Marketing →</button>
          </div>
          {campanasProyecto.length === 0 ? (
            <p className="text-xs gp-text-muted mb-4">Sin campañas ligadas a este proyecto.</p>
          ) : (
            <div className="space-y-1.5 mb-4">
              {campanasProyecto.map((c) => (
                <div key={c.id} className="gp-panel p-2.5 flex items-center justify-between gap-2 text-sm">
                  <span>{c.nombre}</span>
                  <div className="flex items-center gap-2">
                    <Badge tone="muted">{c.plataforma}</Badge>
                    <Badge tone={c.estatus === "Activa" ? "teal" : c.estatus === "Planeada" ? "gold" : "muted"}>{c.estatus}</Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium">Cuentas y métricas de redes</p>
            <button onClick={() => onIrAVista("redes")} className="text-xs gp-text-gold">Ver en Marketing →</button>
          </div>
          {redesProyecto.length === 0 ? (
            <p className="text-xs gp-text-muted">Sin cuentas de redes ligadas a este proyecto.</p>
          ) : (
            <div className="space-y-1.5">
              {redesProyecto.map((rm) => (
                <div key={rm.id} className="gp-panel p-2.5 flex items-center justify-between gap-2 text-sm">
                  <span>{rm.plataforma}</span>
                  <span className="text-xs gp-text-muted">{rm.seguidores ? `${rm.seguidores} seguidores` : ""}{rm.fecha ? ` · ${rm.fecha}` : ""}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === "legal" && (
        <div>
          {!sensibleDesbloqueado ? (
            <button onClick={onDesbloquear} className="text-left">
              <p className="text-sm gp-text-gold">🔒 Verifica tu contraseña para ver los documentos de este proyecto</p>
            </button>
          ) : (
            <>
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium">Documentos y contratos de este proyecto</p>
                <button onClick={() => onIrAVista("documentos")} className="text-xs gp-text-gold">Ver en Documentos →</button>
              </div>
              {documentosProyecto.length === 0 ? (
                <p className="text-xs gp-text-muted">Sin documentos o contratos ligados a este proyecto.</p>
              ) : (
                <div className="space-y-1.5">
                  {documentosProyecto.map((doc) => {
                    const dd = doc.fechaVencimiento ? daysUntil(doc.fechaVencimiento) : null;
                    return (
                      <div key={doc.id} className="gp-panel p-2.5 flex items-center justify-between gap-2 text-sm">
                        <div>
                          <span>{doc.nombre}</span>
                          <span className="gp-text-muted text-xs ml-2">{doc.tipo}</span>
                        </div>
                        {doc.fechaVencimiento && <Badge tone={dd < 0 ? "red" : dd <= 14 ? "gold" : "muted"}>{dd < 0 ? "Vencido" : `Vence ${doc.fechaVencimiento}`}</Badge>}
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {tab === "contactos" && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium">Personas relacionadas con este proyecto</p>
            <button onClick={() => onIrAVista("contactos")} className="text-xs gp-text-gold">Ver en Contactos →</button>
          </div>
          {contactosProyecto.length === 0 ? (
            <p className="text-xs gp-text-muted">Sin contactos ligados a este proyecto todavía. Desde la ficha de un contacto puedes relacionarlo a este proyecto.</p>
          ) : (
            <div className="space-y-1.5">
              {contactosProyecto.map((c) => (
                <div key={c.id} className="gp-panel p-2.5 flex items-center justify-between gap-2 text-sm">
                  <span>{c.nombre}</span>
                  <span className="text-xs gp-text-muted">{c.correo || c.whatsapp || ""}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <ConfirmacionModal pregunta={confirmacion} onCerrar={() => setConfirmacion(null)} />

      <ConfirmacionModal pregunta={confirmacion} onCerrar={() => setConfirmacion(null)} />

      {comentariosDe && (
        <Modal title={`Comentarios — ${comentariosDe.descripcion}`} onClose={() => setComentariosDe(null)}>
          <Bitacora data={data} entidadTipo="pendientes" entidadId={comentariosDe.id} onAdd={onAddComentario} onRemove={onRemoveComentario} />
        </Modal>
      )}

      {modal && (
        <Modal title={modal.item.id ? "Editar tarea" : modal.item.parentId ? "Nueva subtarea" : "Nueva tarea"} onClose={() => setModal(null)}>
          <PendienteForm item={modal.item} proyectos={data.proyectos} contactos={data.contactos} pendientes={data.pendientes} colaboradores={[]} proyectoFijoId={proyectoId}
            onCrearContacto={(nombre, tipos) => onCrearContacto(nombre, tipos || ["Colaborador"])}
            onEnviarInvitacion={onEnviarInvitacion}
            onAceptarEnNombre={onAceptarEnNombre}
            onSave={(v, enviarCorreo) => {
              if (modal.item.id) {
                onEditTarea(modal.item.id, v);
                if (v.proyectoId !== modal.item.proyectoId) {
                  const hijosIds = descendientesDe(modal.item.id, data.pendientes);
                  hijosIds.forEach((hid) => onEditTarea(hid, { proyectoId: v.proyectoId }));
                }
              } else {
                const nuevoId = uid();
                onAddTarea({ ...v, id: nuevoId });
                if (enviarCorreo) onEnviarInvitacion(nuevoId);
              }
              setModal(null);
            }}
          />
        </Modal>
      )}
    </div>
  );
}
