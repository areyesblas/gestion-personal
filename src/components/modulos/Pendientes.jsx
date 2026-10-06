// src/components/modulos/Pendientes.jsx
//
// Modulo perezoso (Fase 2). Salio de App.jsx el 5 oct 2026; se mudaron con el sus propias
// piezas (MindMapPendientes, FichaTarea), que nadie mas usaba.

import Bitacora from "../comunes/Bitacora";
import { Badge, BarraGuardar, IconBtn } from "../ui/basicos";
import { BotonArbolTareas, CheckTareaHecha, ConfirmacionModal, ContadorRamaColapsada, ToggleArbolTarea, preguntaCompletarTarea } from "../comunes/arbolTareas";
import { ESTATUS_TAREA, ESTATUS_TAREA_CERRADOS, toneEstatusTarea } from "../../lib/catalogos";
import { MessageCircle, Pencil, Plus, Trash2, X } from "lucide-react";
import { Modal } from "../ui/Modal";
import { OrdenSelector } from "../ui/tablas";
import { PendienteForm } from "../comunes/formularios";
import { SelectGuardable } from "../ui/campos";
import { buildTareaTree, calcAvanceTarea, descendientesDe, flattenTareas, fmtFechaCompletado, idsRamasTareas, reabrirTarea } from "../../lib/tareas";
import { confirmarDescartarCambios, useBorrador } from "../ui/borradores";
import { daysUntil, fmtMoney, todayISO, uid } from "../../lib/formato";
import { ordenadosPorNombre, ordenarLista } from "../../lib/listas";
import { supabase } from "../../supabaseClient";
import { useEffect, useState } from "react";
import { usePanelRedimensionable } from "../ui/usePanelRedimensionable";

// Vista mind-map: dibuja el proyecto en el centro y sus pendientes/subtareas ramificándose a la derecha.
function MindMapPendientes({ proyecto, tareas, onNodoClick, onAgregar, onEliminar }) {
  const NODE_W = 190, NODE_H = 36, GAP_Y = 12, GAP_X = 60;
  const BTN_R = 8; // radio de los botoncitos "+" y "×"
  const raices = buildTareaTree(tareas.filter((t) => t.proyectoId === proyecto.id));
  const root = { id: "_root", descripcion: proyecto.nombre, estatus: null, hijos: raices };

  let leafIndex = 0;
  const posiciones = [];
  const walk = (nodo, nivel) => {
    let y;
    if (!nodo.hijos || nodo.hijos.length === 0) {
      y = leafIndex * (NODE_H + GAP_Y);
      leafIndex++;
    } else {
      const ys = nodo.hijos.map((h) => walk(h, nivel + 1));
      y = (ys[0] + ys[ys.length - 1]) / 2;
    }
    posiciones.push({ nodo, nivel, y });
    return y;
  };
  walk(root, 0);

  const posById = {};
  posiciones.forEach((p) => (posById[p.nodo.id] = p));
  const edges = [];
  const conectar = (nodo) => {
    (nodo.hijos || []).forEach((h) => {
      edges.push({ from: posById[nodo.id], to: posById[h.id] });
      conectar(h);
    });
  };
  conectar(root);

  if (posiciones.length === 1) {
    return (
      <div className="text-center py-10">
        <p className="text-sm gp-text-muted mb-3">Este proyecto todavía no tiene tareas registradas.</p>
        <button onClick={() => onAgregar && onAgregar(root)} className="gp-btn px-4 py-2 text-sm inline-flex items-center gap-1"><Plus size={14} /> Agregar el primero</button>
      </div>
    );
  }

  const maxNivel = Math.max(...posiciones.map((p) => p.nivel));
  const maxY = Math.max(...posiciones.map((p) => p.y));
  const width = (maxNivel + 1) * (NODE_W + GAP_X) + 20;
  const height = maxY + NODE_H + 20;
  const colorEstatus = (estatus) => (estatus === "Completada" ? "var(--teal)" : estatus === "En proceso" ? "var(--gold)" : estatus === "En espera" ? "var(--red)" : estatus === "Cancelada" ? "var(--muted)" : "var(--border)");

  return (
    <div>
      <p className="text-xs gp-text-muted mb-2">Clic en un pendiente para editarlo · <span className="gp-text-gold">➕</span> agrega una subtarea · <span className="gp-text-red">✕</span> la elimina.</p>
      <div className="overflow-auto gp-scroll gp-panel p-4" style={{ maxHeight: 560 }}>
        <svg width={width} height={height} style={{ minWidth: width, display: "block" }}>
          {edges.map((e, i) => {
            const x1 = e.from.nivel * (NODE_W + GAP_X) + NODE_W;
            const y1 = e.from.y + NODE_H / 2;
            const x2 = e.to.nivel * (NODE_W + GAP_X);
            const y2 = e.to.y + NODE_H / 2;
            const mx = (x1 + x2) / 2;
            return <path key={i} d={`M ${x1} ${y1} C ${mx} ${y1}, ${mx} ${y2}, ${x2} ${y2}`} stroke="var(--border)" strokeWidth={1.5} fill="none" />;
          })}
          {posiciones.map((p) => {
            const x = p.nivel * (NODE_W + GAP_X);
            const esRaiz = p.nodo.id === "_root";
            const texto = (p.nodo.descripcion || "").length > 26 ? p.nodo.descripcion.slice(0, 25) + "…" : p.nodo.descripcion;
            return (
              <g key={p.nodo.id}>
                <g transform={`translate(${x},${p.y})`} style={{ cursor: esRaiz ? "default" : "pointer" }} onClick={() => !esRaiz && onNodoClick && onNodoClick(p.nodo)}>
                  <rect width={NODE_W} height={NODE_H} rx={8}
                    fill={esRaiz ? "var(--gold)" : "var(--panel-hi)"}
                    stroke={esRaiz ? "var(--gold)" : colorEstatus(p.nodo.estatus)}
                    strokeWidth={esRaiz ? 0 : 2} />
                  <text x={10} y={NODE_H / 2 + 4} fontSize={12} fontFamily="'IBM Plex Sans',sans-serif"
                    fontWeight={esRaiz ? 600 : 400}
                    fill={esRaiz ? "#161822" : "var(--text)"}>
                    {texto}
                  </text>
                </g>
                {/* botón "+" para agregar una subtarea colgando de este nodo, y "×" para eliminarlo (todos menos el proyecto) */}
                <g
                  transform={`translate(${x + NODE_W + (GAP_X / 2)},${p.y + NODE_H / 2 - (esRaiz ? 0 : 9)})`}
                  style={{ cursor: "pointer" }}
                  onClick={() => onAgregar && onAgregar(p.nodo)}
                >
                  <circle r={BTN_R} fill="var(--gold)" />
                  <text x={0} y={3.5} fontSize={12} textAnchor="middle" fontWeight={700} fill="#161822">+</text>
                </g>
                {!esRaiz && (
                  <g
                    transform={`translate(${x + NODE_W + (GAP_X / 2)},${p.y + NODE_H / 2 + 9})`}
                    style={{ cursor: "pointer" }}
                    onClick={() => onEliminar && onEliminar(p.nodo)}
                  >
                    <circle r={BTN_R} fill="var(--red)" />
                    <text x={0} y={3.5} fontSize={11} textAnchor="middle" fontWeight={700} fill="#fff">✕</text>
                  </g>
                )}
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}

export default function Pendientes({ data, activeOwnerId, onAdd, onEdit, onEditProyecto, onRemove, onAddComentario, onRemoveComentario, onAsignar, onCrearContacto, onCrearProyecto, onEnviarInvitacion, onAceptarEnNombre, crearAlEntrar, onConsumirCrearAlEntrar, filtroProyectoInicial, onConsumirFiltroProyecto }) {
  // Ancho de la ficha de la derecha, arrastrable y recordado por pantalla.
  const { contenedorRef, divisor, estiloPanel } = usePanelRedimensionable("tareas");
  const [modal, setModal] = useState(null);
  const [comentariosDe, setComentariosDe] = useState(null);
  const [orden, setOrden] = useState("default");
  const [vista, setVista] = useState("lista"); // "lista" | "mindmap"
  const [proyectoMindMap, setProyectoMindMap] = useState("");
  // Se entra aquí ya filtrado cuando vienes de "Ver todas las tareas" en la ficha de un proyecto.
  const [filtroProyecto, setFiltroProyecto] = useState(filtroProyectoInicial || ""); // "" = todos los proyectos, en la vista de lista
  const [filtroAvance, setFiltroAvance] = useState("todas"); // todas | sinTerminar | sinEmpezar | enProceso | terminadas
  const [tareaSelId, setTareaSelId] = useState(null); // ficha abierta en el panel de la derecha
  // Ramas del árbol de tareas que están cerradas (ids de las tareas padre). Vacío = todo abierto.
  const [colapsadas, setColapsadas] = useState(() => new Set());
  const [confirmacion, setConfirmacion] = useState(null);
  const [colaboradores, setColaboradores] = useState([]);
  // Si la lista está filtrada por un proyecto, la tarea nueva ya nace en ese proyecto: es de
  // donde viene el usuario y volver a elegirlo a mano era un paso de más (pedido de Angel,
  // 29 sept 2026). Se recalcula en cada render, así que siempre refleja el filtro actual.
  const empty = { proyectoId: filtroProyecto && filtroProyecto !== "_sin_" ? filtroProyecto : "", parentId: "", descripcion: "", fechaLimite: todayISO(), fechaRevision: "", prioridad: "Media", estatus: "Pendiente", colaboradorContactoId: null, contactoId: "", precio: "", fechaPagoAprox: "", tiempoEstimado: "", tiempoReal: "", asignadoA: "" };

  useEffect(() => {
    if (crearAlEntrar) { setModal({ item: { ...empty, ...(crearAlEntrar.preset || {}) } }); onConsumirCrearAlEntrar(); }
  }, [crearAlEntrar]);

  // El filtro que llega desde la ficha de un proyecto se consume una sola vez: si no, volver a
  // Tareas por el menú te dejaría filtrado sin que lo hayas pedido.
  useEffect(() => {
    if (filtroProyectoInicial) { setFiltroProyecto(filtroProyectoInicial); onConsumirFiltroProyecto?.(); }
  }, [filtroProyectoInicial]);

  useEffect(() => {
    if (!activeOwnerId) return;
    supabase.from("colaboradores").select("colaborador_user_id, colaborador_email").eq("propietario_id", activeOwnerId).eq("estatus", "Activo")
      .then(({ data: rows }) => setColaboradores(rows || []));
  }, [activeOwnerId]);

  const camposOrden = {
    entrega: { get: (p) => p.fechaLimite, tipo: "fecha" },
    registro: { get: (p) => p.createdAt, tipo: "fecha" },
    revision: { get: (p) => p.fechaRevision, tipo: "fecha" },
    alfabetico: { get: (p) => p.descripcion, tipo: "texto" },
    prioridad: { get: (p) => p.prioridad, tipo: "prioridad" },
  };
  const opcionesOrden = [
    { key: "entrega", label: "fecha de entrega" },
    { key: "registro", label: "fecha de registro" },
    { key: "revision", label: "fecha de revisión" },
    { key: "alfabetico", label: "alfabético" },
    { key: "prioridad", label: "prioridad" },
  ];
  const nombreProyectoOrden = (t) => (t.proyectoId ? (data.proyectos.find((pr) => pr.id === t.proyectoId)?.nombre || "") : "");
  const porProyecto = filtroProyecto === "_sin_"
    ? data.pendientes.filter((t) => !t.proyectoId)
    : filtroProyecto ? data.pendientes.filter((t) => t.proyectoId === filtroProyecto) : data.pendientes;
  // Filtro por avance (pedido de Angel, 29 sept 2026). "Sin terminar" es el de todos los días:
  // todo lo que sigue vivo. Una tarea cuenta como empezada si tiene estatus "En proceso" o si le
  // pusieron un porcentaje mayor a cero.
  const empezada = (t) => t.estatus === "En proceso" || (Number(t.avance) > 0 && Number(t.avance) < 100);
  const pendientesFiltrados = (() => {
    switch (filtroAvance) {
      case "sinTerminar": return porProyecto.filter((t) => !ESTATUS_TAREA_CERRADOS.includes(t.estatus));
      case "sinEmpezar": return porProyecto.filter((t) => !ESTATUS_TAREA_CERRADOS.includes(t.estatus) && !empezada(t));
      case "enProceso": return porProyecto.filter((t) => !ESTATUS_TAREA_CERRADOS.includes(t.estatus) && empezada(t));
      case "terminadas": return porProyecto.filter((t) => t.estatus === "Completada");
      default: return porProyecto;
    }
  })();
  // Orden por default: alfabético por proyecto (los que no tienen proyecto van al final), y dentro
  // de cada proyecto por fecha de entrega. Como las subtareas siempre heredan el proyecto de su
  // tarea principal, este orden agrupa cada proyecto junto sin romper la jerarquía de subtareas.
  const base = orden === "default"
    ? [...pendientesFiltrados].sort((a, b) => {
        const pa = nombreProyectoOrden(a), pb = nombreProyectoOrden(b);
        if (!pa && pb) return 1;
        if (pa && !pb) return -1;
        if (pa !== pb) return pa.localeCompare(pb, "es");
        return (a.fechaLimite || "").localeCompare(b.fechaLimite || "");
      })
    : ordenarLista(pendientesFiltrados, orden, camposOrden);
  const arbol = buildTareaTree(base);
  const filas = flattenTareas(arbol, 0, colapsadas);
  const idsRamas = idsRamasTareas(arbol);
  const toggleRama = (id) => setColapsadas((prev) => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });
  const pedirCompletarTarea = (t) => setConfirmacion(preguntaCompletarTarea({
    tarea: t, data, onEditTarea: onEdit, onEditProyecto, onAviso: (m) => alert(m),
  }));
  // Elegir "Completada" en el selector pasa por la misma regla que el check: confirma y registra
  // la fecha. Salir de "Completada" la borra, junto con el avance de 100 que se había fijado.
  const cambiarEstatusTarea = (t, nuevo) => {
    if (nuevo === t.estatus) return;
    if (nuevo === "Completada") { pedirCompletarTarea(t); return; }
    onEdit(t.id, t.estatus === "Completada" ? { estatus: nuevo, completadaEn: null, avance: null } : { estatus: nuevo });
  };
  const nComentarios = (id) => (data.comentarios || []).filter((c) => c.entidadTipo === "pendientes" && c.entidadId === id).length;

  const nombreProyecto = (id) => data.proyectos.find((p) => p.id === id)?.nombre || "—";
  const nombreResp = (id) => data.contactos.find((c) => c.id === id)?.nombre || "Tú";
  const nombreCliente = (id) => data.contactos.find((c) => c.id === id)?.nombre || "—";
  // Los objetos armados por buildTareaTree traen un campo "hijos" que es solo para dibujar el árbol
  // en pantalla — hay que quitarlo antes de mandar el ítem a editar, porque no es una columna real.
  const paraEditar = (t) => { const { hijos, ...limpio } = t; return limpio; };
  // Si la tarea tiene subtareas debajo, avisa que también se van a borrar (si no, se quedarían "huérfanas").
  const confirmarBorrado = (item) => {
    const hijosIds = descendientesDe(item.id, data.pendientes);
    if (hijosIds.length > 0) {
      onRemove(item.id, hijosIds, `Esta tarea tiene ${hijosIds.length} subtarea${hijosIds.length > 1 ? "s" : ""} debajo. Si la eliminas, también se eliminan todas sus subtareas.`);
    } else {
      onRemove(item.id);
    }
  };

  const tareaSel = tareaSelId ? data.pendientes.find((t) => t.id === tareaSelId) : null;

  return (
    <div ref={contenedorRef} className="flex flex-col lg:flex-row gap-4 items-start">
      {/* Lista a la izquierda, ficha de la tarea a la derecha — mismo patrón que Contactos. */}
      <div className={`min-w-0 flex-1 w-full ${tareaSel ? "hidden lg:block" : ""}`}>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-1">
        <h2 className="gp-serif text-2xl">Tareas</h2>
        <button onClick={() => setModal({ item: empty })} className="gp-btn flex items-center justify-center gap-1 px-3 py-1.5 text-sm w-full sm:w-auto"><Plus size={14} /> Nueva</button>
      </div>
      <p className="text-sm gp-text-muted mb-3">De todos tus proyectos, en un solo lugar. Puedes anidar subtareas sin límite con el ➕ de cada fila.</p>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
        <div className="flex gap-1 gp-panel p-1 w-fit">
          <button onClick={() => setVista("lista")} className={`px-3 py-1 text-xs rounded ${vista === "lista" ? "gp-btn" : "gp-text-muted"}`}>Lista</button>
          <button onClick={() => setVista("mindmap")} className={`px-3 py-1 text-xs rounded ${vista === "mindmap" ? "gp-btn" : "gp-text-muted"}`}>Mind-map</button>
        </div>
        {vista === "lista" && (
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <select className="gp-input" style={{ maxWidth: 220 }} value={filtroProyecto} onChange={(e) => setFiltroProyecto(e.target.value)}>
              {/* Las tareas sueltas no tenían forma de verse: con "Todos" se perdían entre las de
                  proyecto y no había filtro que las aislara. Va hasta arriba, como pidió Angel. */}
              <option value="_sin_">— Sin proyecto —</option>
              <option value="">Todos los proyectos</option>
              {ordenadosPorNombre(data.proyectos).map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
            </select>
            <select className="gp-input" style={{ maxWidth: 190 }} value={filtroAvance} onChange={(e) => setFiltroAvance(e.target.value)} aria-label="Filtrar por avance">
              <option value="todas">Avance: todas</option>
              <option value="sinTerminar">Todas menos las terminadas</option>
              <option value="sinEmpezar">Sin empezar</option>
              <option value="enProceso">En proceso</option>
              <option value="terminadas">Terminadas</option>
            </select>
            <OrdenSelector opciones={opcionesOrden} value={orden} onChange={setOrden} />
            <BotonArbolTareas idsRamas={idsRamas} colapsadas={colapsadas} onCambiar={setColapsadas} />
          </div>
        )}
        {vista === "mindmap" && (
          <select className="gp-input" style={{ maxWidth: 260 }} value={proyectoMindMap} onChange={(e) => setProyectoMindMap(e.target.value)}>
            <option value="">— elige un proyecto —</option>
            {ordenadosPorNombre(data.proyectos).map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
          </select>
        )}
      </div>

      {vista === "mindmap" ? (
        proyectoMindMap ? (
          <MindMapPendientes
            proyecto={data.proyectos.find((p) => p.id === proyectoMindMap)}
            tareas={data.pendientes}
            onNodoClick={(nodo) => setModal({ item: paraEditar(nodo) })}
            onAgregar={(nodo) => setModal({ item: { ...empty, proyectoId: proyectoMindMap, parentId: nodo.id === "_root" ? "" : nodo.id } })}
            onEliminar={(nodo) => confirmarBorrado(nodo)}
          />
        ) : (
          <p className="text-sm gp-text-muted py-8 text-center">Elige un proyecto arriba para ver su mind-map de pendientes.</p>
        )
      ) : (
      <div className="gp-panel overflow-x-auto">
        <table className="gp-table gp-tabla-tareas">
          <thead>
            <tr>
              <th style={{ width: 30 }}></th>
              <th>Pendiente</th>
              <th className="hidden md:table-cell">Proyecto</th>
              <th className="hidden md:table-cell">Cliente</th>
              <th className="hidden md:table-cell">Responsable</th>
              <th className="hidden md:table-cell">Fecha</th>
              <th className="hidden md:table-cell">Prioridad</th>
              <th>Avance</th>
              <th className="hidden md:table-cell">Precio</th>
              <th className="hidden md:table-cell">Horas</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filas.map(({ item: p, nivel }) => {
              const vencido = p.estatus !== "Completada" && p.fechaLimite && daysUntil(p.fechaLimite) < 0;
              const nc = nComentarios(p.id);
              const tieneHijos = p.hijos && p.hijos.length > 0;
              const colapsada = colapsadas.has(p.id);
              const hecha = p.estatus === "Completada";
              const avance = tieneHijos ? Math.round(calcAvanceTarea(p)) : null;
              // Con subtareas el avance es la ponderación; sin ellas, el capturado o el que se
              // deduce del estatus (0 / 50 / 100). La barrita de la columna usa siempre este.
              const avanceFila = Math.round(calcAvanceTarea(p));
              return (
                <tr key={p.id}
                  className={`${hecha ? "gp-fila-hecha" : ""} ${p.id === tareaSelId ? "gp-fila-sel" : ""}`.trim() || undefined}
                  onClick={() => setTareaSelId(p.id)}
                  title="Ver el detalle de esta tarea">
                  <td onClick={(e) => e.stopPropagation()}><CheckTareaHecha tarea={p} onCompletar={pedirCompletarTarea} onReabrir={(t) => reabrirTarea(t, onEdit)} /></td>
                  <td style={{ maxWidth: 220 }}>
                    <span style={{ paddingLeft: nivel * 18 }} className="flex items-start gap-1">
                      {nivel > 0 && <span className="gp-text-muted shrink-0">└</span>}
                      <ToggleArbolTarea nodo={p} colapsada={colapsada} onToggle={toggleRama} />
                      <span className={`line-clamp-2 md:line-clamp-none ${hecha ? "gp-texto-hecho" : ""}`} style={hecha ? { textDecoration: "line-through" } : undefined}>{p.descripcion}</span>
                      <ContadorRamaColapsada nodo={p} colapsada={colapsada} />
                    </span>
                  </td>
                  <td className="gp-text-muted hidden md:table-cell">{nombreProyecto(p.proyectoId)}</td>
                  <td className="gp-text-muted hidden md:table-cell">{p.contactoId ? nombreCliente(p.contactoId) : "—"}</td>
                  <td className="gp-text-muted hidden md:table-cell">{nombreResp(p.colaboradorContactoId)}</td>
                  <td className="gp-mono hidden md:table-cell" style={{ color: hecha ? "var(--teal)" : vencido ? "var(--red)" : undefined }}>
                    {hecha
                      ? <span title={p.fechaLimite ? `Fecha límite: ${p.fechaLimite}` : undefined}>✓ {p.completadaEn ? fmtFechaCompletado(p.completadaEn) : "—"}</span>
                      : p.fechaLimite}
                  </td>
                  <td className="hidden md:table-cell"><Badge tone={p.prioridad === "Alta" ? "red" : p.prioridad === "Media" ? "gold" : "muted"}>{p.prioridad}</Badge></td>
                  <td onClick={(e) => e.stopPropagation()}>
                    {/* La barrita se ve SIEMPRE, tenga o no subtareas: es la columna de avance y
                        antes, en las tareas sin hijos, ahí solo salía el selector de estatus. */}
                    <div className="flex items-center gap-1.5 mb-1" style={{ minWidth: 86 }}>
                      <div className="h-1.5 rounded flex-1" style={{ background: "var(--border)" }}>
                        <div className="h-1.5 rounded" style={{ width: `${avanceFila}%`, background: avanceFila >= 100 ? "var(--teal)" : avanceFila >= 50 ? "#087CF5" : "var(--gold)" }} />
                      </div>
                      <span className="gp-mono" style={{ fontSize: 10 }}>{avanceFila}%</span>
                    </div>
                    {tieneHijos ? null : (
                      // El check de completar ya vive en su propia columna; aquí queda el selector
                      // completo para los demás estados (En proceso, En espera, Cancelada…). En
                      // celular el selector no cabe, así que ahí se muestra el estado como badge.
                      <>
                        <span className="md:hidden"><Badge tone={toneEstatusTarea(p.estatus)}>{p.estatus}</Badge></span>
                        <span className="hidden md:inline-flex">
                          <SelectGuardable
                            valor={p.estatus} opciones={ESTATUS_TAREA} ariaLabel="Estatus de la tarea"
                            onGuardar={(nuevo) => cambiarEstatusTarea(p, nuevo)}
                          />
                        </span>
                      </>
                    )}
                  </td>
                  <td className="gp-mono hidden md:table-cell">{p.precio ? fmtMoney(p.precio) : "—"}</td>
                  <td className="gp-mono gp-text-muted hidden md:table-cell">{p.tiempoEstimado ? `${p.tiempoEstimado}h` : "—"}{p.tiempoReal ? ` / ${p.tiempoReal}h` : ""}</td>
                  <td onClick={(e) => e.stopPropagation()}><div className="flex gap-1">
                    <IconBtn title="Editar" onClick={() => setModal({ item: paraEditar(p) })}><Pencil size={13} /></IconBtn>
                    <IconBtn title="Agregar subtarea" onClick={() => setModal({ item: { ...empty, proyectoId: p.proyectoId, parentId: p.id } })}><Plus size={13} /></IconBtn>
                    <IconBtn title="Comentarios" onClick={() => setComentariosDe(p)}><MessageCircle size={13} />{nc > 0 && <span className="gp-mono" style={{ fontSize: 9, marginLeft: 2 }}>{nc}</span>}</IconBtn>
                    <IconBtn title="Eliminar" onClick={() => confirmarBorrado(p)}><Trash2 size={13} /></IconBtn>
                  </div></td>
                </tr>
              );
            })}
            {filas.length === 0 && <tr><td colSpan={11} className="text-center gp-text-muted py-6">Sin tareas registradas.</td></tr>}
          </tbody>
        </table>
      </div>
      )}
      </div>

      {tareaSel && divisor}
      {tareaSel && (
        <div className="w-full shrink-0 lg:sticky lg:top-4" style={estiloPanel}>
          <FichaTarea
            key={tareaSel.id}
            t={tareaSel}
            data={data}
            onCerrar={() => setTareaSelId(null)}
            onEditar={() => setModal({ item: paraEditar(tareaSel) })}
            onAgregarSubtarea={() => setModal({ item: { ...empty, proyectoId: tareaSel.proyectoId, parentId: tareaSel.id } })}
            onComentarios={() => setComentariosDe(tareaSel)}
            onEliminar={() => { confirmarBorrado(tareaSel); setTareaSelId(null); }}
            onCambiarAvance={(valor) => onEdit(tareaSel.id, { avance: valor })}
            onCambiarEstatus={(nuevo) => cambiarEstatusTarea(tareaSel, nuevo)}
            nComentarios={nComentarios(tareaSel.id)}
          />
        </div>
      )}

      <ConfirmacionModal pregunta={confirmacion} onCerrar={() => setConfirmacion(null)} />

      {comentariosDe && (
        <Modal title={`Comentarios — ${comentariosDe.descripcion}`} onClose={() => setComentariosDe(null)}>
          <Bitacora data={data} entidadTipo="pendientes" entidadId={comentariosDe.id} onAdd={onAddComentario} onRemove={onRemoveComentario} />
        </Modal>
      )}

      {modal && (
        <Modal title={modal.item.id ? "Editar tarea" : modal.item.parentId ? "Nueva subtarea" : "Nueva tarea"} onClose={() => setModal(null)}>
          <PendienteForm item={modal.item} proyectos={data.proyectos} contactos={data.contactos} pendientes={data.pendientes} colaboradores={colaboradores}
            onCrearContacto={(nombre, tipos) => onCrearContacto(nombre, tipos || ["Colaborador"])}
            onCrearProyecto={onCrearProyecto}
            onEnviarInvitacion={onEnviarInvitacion}
            onAceptarEnNombre={onAceptarEnNombre}
            onSave={(v, enviarCorreo) => {
              if (modal.item.id) {
                onEdit(modal.item.id, v);
                // Si cambió de proyecto (directo, o porque ahora es subtarea de otra tarea en otro proyecto),
                // arrastra el cambio a todas sus propias subtareas para que nunca queden en un proyecto distinto.
                if (v.proyectoId !== modal.item.proyectoId) {
                  const hijosIds = descendientesDe(modal.item.id, data.pendientes);
                  hijosIds.forEach((hid) => onEdit(hid, { proyectoId: v.proyectoId }));
                }
                if (v.asignadoA && v.asignadoA !== modal.item.asignadoA) onAsignar(modal.item.id);
              } else {
                const nuevoId = uid();
                onAdd({ ...v, id: nuevoId });
                if (v.asignadoA) onAsignar(nuevoId);
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

// el formulario completo: mover el porcentaje de avance y cambiar el estatus. Lo demás son
// atajos a lo que ya existe (editar, subtarea, comentarios, eliminar).
function FichaTarea({ t, data, onCerrar, onEditar, onAgregarSubtarea, onComentarios, onEliminar, onCambiarAvance, onCambiarEstatus, nComentarios }) {
  // El avance y el estatus se editan en un borrador: mover la barra ya no escribe en la base.
  // Se guardan al dar Guardar, y si intentas salir con cambios la app pregunta antes.
  const { borrador, cambiar, descartar, sucio } = useBorrador({
    avance: t.avance ?? "", estatus: t.estatus,
  });
  const guardar = () => {
    if (borrador.avance !== (t.avance ?? "")) onCambiarAvance(borrador.avance === "" ? null : Number(borrador.avance));
    // Completar pasa por su propia confirmación (fecha, subtareas abiertas): se delega al mismo
    // camino de siempre en vez de escribir el estatus a mano desde aquí.
    if (borrador.estatus !== t.estatus) onCambiarEstatus(borrador.estatus);
  };
  const subtareas = (data.pendientes || []).filter((x) => x.parentId === t.id);
  const tieneHijos = subtareas.length > 0;
  // Con subtareas el avance NO se teclea: es la ponderación de los hijos. Teclearlo encima sería
  // tener dos verdades para el mismo número.
  const avance = Math.round(calcAvanceTarea(buildTareaTree((data.pendientes || []).filter((x) => x.id === t.id || descendientesDe(t.id, data.pendientes).includes(x.id)))[0] || t));
  const hecha = t.estatus === "Completada";
  const vencida = !hecha && t.fechaLimite && daysUntil(t.fechaLimite) < 0;
  // Lo que se está viendo en la barra: el borrador si se movió, y si no el calculado.
  const avanceEditable = borrador.avance === "" || borrador.avance === null || borrador.avance === undefined
    ? avance : Number(borrador.avance);
  const colorAvance = avanceEditable >= 100 ? "var(--teal)" : avanceEditable >= 50 ? "#087CF5" : "var(--gold)";
  const nombreDe = (lista, id, vacio = "—") => (lista || []).find((x) => x.id === id)?.nombre || vacio;
  const padre = t.parentId ? (data.pendientes || []).find((x) => x.id === t.parentId) : null;

  const Dato = ({ label, valor, color }) => (
    valor ? (
      <div className="flex items-start justify-between gap-3 py-1.5">
        <span className="text-xs gp-text-muted shrink-0">{label}</span>
        <span className="text-xs text-right" style={color ? { color } : undefined}>{valor}</span>
      </div>
    ) : null
  );

  return (
    <div className="gp-panel p-4">
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="min-w-0">
          <p className="text-[10px] uppercase tracking-wide gp-text-muted">{padre ? "Subtarea" : "Tarea"}</p>
          <p className="gp-serif text-base leading-tight break-words" style={hecha ? { textDecoration: "line-through" } : undefined}>{t.descripcion}</p>
          {padre && <p className="text-xs gp-text-muted mt-1">de: {padre.descripcion}</p>}
        </div>
        <IconBtn title="Cerrar" onClick={() => { if (confirmarDescartarCambios()) onCerrar(); }}><X size={15} /></IconBtn>
      </div>

      <div className="gp-bloque rounded-lg p-3 mb-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs gp-text-muted">Avance</span>
          <span className="gp-mono text-sm" style={{ color: colorAvance }}>{avanceEditable}%</span>
        </div>
        {tieneHijos ? (
          <>
            <div className="h-2.5 rounded-full mb-2" style={{ background: "var(--border)" }}>
              <div className="h-2.5 rounded-full" style={{ width: `${avance}%`, background: colorAvance }} />
            </div>
            <p className="text-[10px] gp-text-muted">Se calcula solo: es el promedio del avance de sus {subtareas.length} subtarea{subtareas.length === 1 ? "" : "s"}.</p>
          </>
        ) : (
          /* Una sola barra: la misma que muestra el porcentaje es la que se arrastra, y se tiñe
             según cuánto lleve. Tener dos (una de progreso y un deslizador aparte) hacía creer
             que eran cosas distintas. */
          <div className="flex items-center gap-2.5">
            <input
              type="range" min={0} max={100} step={5} className="gp-rango flex-1"
              value={avanceEditable}
              onChange={(e) => cambiar({ avance: Number(e.target.value) })}
              aria-label="Porcentaje de avance"
              style={{
                color: colorAvance,
                background: `linear-gradient(to right, ${colorAvance} 0%, ${colorAvance} ${avanceEditable}%, var(--border) ${avanceEditable}%, var(--border) 100%)`,
              }}
            />
            <input
              type="number" min={0} max={100} className="gp-input" style={{ width: 68 }}
              value={borrador.avance ?? ""} placeholder={String(avance)}
              onChange={(e) => cambiar({ avance: e.target.value === "" ? "" : Math.max(0, Math.min(100, Number(e.target.value))) })}
            />
          </div>
        )}
      </div>

      <div className="mb-3">
        <span className="text-xs gp-text-muted">Estatus</span>
        <select className="gp-input mt-1" value={borrador.estatus} onChange={(e) => cambiar({ estatus: e.target.value })}>
          {ESTATUS_TAREA.map((x) => <option key={x}>{x}</option>)}
        </select>
      </div>

      <BarraGuardar sucio={sucio} onGuardar={guardar} onDescartar={descartar} />

      <div className="flex flex-col gap-0.5 mb-3">
        <Dato label="Proyecto" valor={nombreDe(data.proyectos, t.proyectoId, "")} />
        <Dato label="Cliente" valor={nombreDe(data.contactos, t.contactoId, "")} />
        <Dato label="Responsable" valor={t.colaboradorContactoId ? nombreDe(data.contactos, t.colaboradorContactoId) : "Tú"} />
        <Dato label="Prioridad" valor={t.prioridad} />
        <Dato label="Fecha límite" valor={t.fechaLimite} color={vencida ? "var(--red)" : undefined} />
        <Dato label="Programada" valor={t.fechaProgramada ? `${t.fechaProgramada}${t.horaInicio ? ` ${t.horaInicio}` : ""}` : ""} />
        <Dato label="Revisión" valor={t.fechaRevision} />
        <Dato label="Horas" valor={t.tiempoEstimado ? `${t.tiempoEstimado}h estimadas${t.tiempoReal ? ` · ${t.tiempoReal}h reales` : ""}` : ""} />
        <Dato label="Precio" valor={t.precio ? fmtMoney(t.precio) : ""} />
        <Dato label="Completada" valor={t.completadaEn ? fmtFechaCompletado(t.completadaEn) : ""} color="var(--teal)" />
      </div>

      {tieneHijos && (
        <div className="mb-3">
          <p className="text-[10px] uppercase tracking-wide gp-text-muted mb-1.5">Subtareas ({subtareas.length})</p>
          <div className="flex flex-col gap-1">
            {subtareas.map((h) => (
              <div key={h.id} className="flex items-center justify-between gap-2 text-xs">
                <span className="truncate" style={h.estatus === "Completada" ? { textDecoration: "line-through", color: "var(--muted)" } : undefined}>{h.descripcion}</span>
                <span className="gp-mono gp-text-muted shrink-0">{h.estatus === "Completada" ? "100%" : `${h.avance ?? 0}%`}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-2">
        <button onClick={onEditar} className="gp-btn-ghost py-2 text-xs rounded flex items-center justify-center gap-1.5"><Pencil size={13} /> Editar</button>
        <button onClick={onAgregarSubtarea} className="gp-btn-ghost py-2 text-xs rounded flex items-center justify-center gap-1.5"><Plus size={13} /> Subtarea</button>
        <button onClick={onComentarios} className="gp-btn-ghost py-2 text-xs rounded flex items-center justify-center gap-1.5"><MessageCircle size={13} /> Comentarios{nComentarios > 0 ? ` (${nComentarios})` : ""}</button>
        <button onClick={onEliminar} className="gp-btn-ghost py-2 text-xs rounded flex items-center justify-center gap-1.5 gp-text-red"><Trash2 size={13} /> Eliminar</button>
      </div>
    </div>
  );
}
