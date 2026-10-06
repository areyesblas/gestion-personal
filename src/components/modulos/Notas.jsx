// src/components/modulos/Notas.jsx
//
// Modulo perezoso (Fase 2). Salio de App.jsx el 5 oct 2026; se mudaron con el sus propias
// piezas (COLORES_ETIQUETA_NOTA, colorEtiquetaNota, ChipEtiquetaNota, EditorNota), que nadie mas usaba.

import ArchivosEntidad from "../comunes/ArchivosEntidad";
import { BarraGuardar, IconBtn } from "../ui/basicos";
import { ComboboxMultiBuscar } from "../ui/campos";
import { Download, FileText, Flame, ListChecks, MessageCircle, Plus, Search, Square, StickyNote, Trash2, X } from "lucide-react";
import { ahoraISO, uid } from "../../lib/formato";
import { compararEs, filtrarPorBusqueda } from "../../lib/listas";
import { confirmarDescartarCambios, useBorrador } from "../ui/borradores";
import { exportarFilasExcel, exportarFilasPDF } from "../../lib/exportar";
import { leerPendientesOffline, quitarPendientesOffline } from "../../lib/offline";
import { usePanelRedimensionable } from "../ui/usePanelRedimensionable";
import { useState } from "react";

// Color de una etiqueta de nota. No se guarda en la base: se deduce del propio nombre, así la
// misma etiqueta sale siempre del mismo color en cualquier pantalla y sin mantener una paleta.
const COLORES_ETIQUETA_NOTA = ["#087CF5", "#EC4899", "#8B5CF6", "#F59E0B", "#16A36A", "#14B8A6", "#E5484D", "#64748B"];

function colorEtiquetaNota(nombre) {
  const txt = (nombre || "").toString();
  let suma = 0;
  for (let i = 0; i < txt.length; i++) suma = (suma * 31 + txt.charCodeAt(i)) % 100000;
  return COLORES_ETIQUETA_NOTA[suma % COLORES_ETIQUETA_NOTA.length];
}

function ChipEtiquetaNota({ nombre }) {
  const color = colorEtiquetaNota(nombre);
  return <span className="gp-badge whitespace-nowrap" style={{ color, background: `${color}22` }}>{nombre}</span>;
}

export default function Notas({ data, ownerId, onAdd, onEdit, onRemove, onAddComentario }) {
  const [busqueda, setBusqueda] = useState("");
  const [filtroEtiqueta, setFiltroEtiqueta] = useState("Todas");
  const [orden, setOrden] = useState("reciente"); // reciente | antigua | alfabetico
  const [vista, setVista] = useState(() => {
    try { return localStorage.getItem("arkeyone_notas_vista") || "cuadricula"; } catch { return "cuadricula"; }
  });
  const [seleccionada, setSeleccionada] = useState(null); // id de la nota abierta a la derecha
  const [menuAbierto, setMenuAbierto] = useState(null);
  const [tick, setTick] = useState(0); // fuerza releer la cola local tras quitar un pendiente
  const { contenedorRef, divisor, estiloPanel } = usePanelRedimensionable("notas");

  const cambiarVista = (v) => {
    setVista(v);
    try { localStorage.setItem("arkeyone_notas_vista", v); } catch { /* modo privado */ }
  };

  // Pendientes guardados sin conexión (ver addItem/editItem/removeItem): viven solo en este
  // navegador hasta que el usuario decida qué hacer con ellos al reconectar. Se muestran aquí
  // como notas de solo lectura, marcadas claramente, para que se vean aunque no haya internet.
  const pendientesOffline = leerPendientesOffline()
    .filter((p) => p.ownerId === ownerId)
    .map((p) => ({ id: `pendiente-${p.id}`, pendienteOfflineId: p.id, titulo: "⏳ Pendiente por subir", contenido: p.descripcion, etiquetas: [], createdAt: p.creadoEn, updatedAt: p.creadoEn }));

  const todas = [...pendientesOffline, ...(data.notas || [])];
  const etiquetas = [...new Set(todas.flatMap((n) => n.etiquetas || []))].sort((a, b) => compararEs(a, b));
  const contarEtiqueta = (e) => (e === "Todas" ? todas.length : todas.filter((n) => (n.etiquetas || []).includes(e)).length);

  const porEtiqueta = filtroEtiqueta === "Todas" ? todas : todas.filter((n) => (n.etiquetas || []).includes(filtroEtiqueta));
  const buscadas = filtrarPorBusqueda(porEtiqueta, busqueda, [(n) => n.titulo, (n) => n.contenido, (n) => (n.etiquetas || []).join(" ")]);
  const fechaDe = (n) => n.updatedAt || n.createdAt || "";
  // Las fijadas van siempre primero, sin importar el orden elegido: para eso se fijan.
  const ordenadas = [...buscadas].sort((a, b) => {
    if (!!a.fijada !== !!b.fijada) return a.fijada ? -1 : 1;
    if (orden === "antigua") return fechaDe(a).localeCompare(fechaDe(b));
    if (orden === "alfabetico") return compararEs(a.titulo || "", b.titulo || "");
    return fechaDe(b).localeCompare(fechaDe(a));
  });

  const nota = seleccionada ? (data.notas || []).find((n) => n.id === seleccionada) : null;
  const adjuntosDe = (id) => (data.comentarios || [])
    .filter((c) => c.entidadTipo === "notas" && c.entidadId === id)
    .flatMap((c) => c.adjuntos || []);
  const nComentariosDe = (id) => (data.comentarios || [])
    .filter((c) => c.entidadTipo === "notas" && c.entidadId === id && (c.texto || "").trim()).length;

  const fmtFechaNota = (iso) => (iso ? new Date(iso).toLocaleDateString("es-MX", { day: "numeric", month: "short", year: "numeric" }) : "");
  const columnasExport = [
    { label: "Título", get: (n) => n.titulo },
    { label: "Etiquetas", get: (n) => (n.etiquetas || []).join(", ") },
    { label: "Contenido", get: (n) => n.contenido },
    { label: "Última edición", get: (n) => n.updatedAt || n.createdAt },
  ];

  const crearNota = () => {
    const id = uid();
    onAdd({ id, titulo: "", contenido: "", etiquetas: filtroEtiqueta === "Todas" ? [] : [filtroEtiqueta], fijada: false });
    setSeleccionada(id);
  };

  const nuevaEtiqueta = () => {
    const nombre = window.prompt("Nombre de la etiqueta nueva. Se crea al ponérsela a una nota.");
    if (!nombre || !nombre.trim()) return;
    // Una etiqueta sin notas no existe en ningún lado (el catálogo son las ya usadas), así que
    // se crea poniéndosela a la nota abierta; si no hay ninguna, se crea una nota para ella.
    const limpio = nombre.trim();
    if (nota) onEdit(nota.id, { etiquetas: [...new Set([...(nota.etiquetas || []), limpio])] });
    else {
      const id = uid();
      onAdd({ id, titulo: "", contenido: "", etiquetas: [limpio], fijada: false });
      setSeleccionada(id);
    }
    setFiltroEtiqueta(limpio);
  };

  const BotonVista = ({ id, icono, titulo }) => (
    <button onClick={() => cambiarVista(id)} title={titulo}
      className={`p-1.5 rounded ${vista === id ? "gp-btn" : "gp-btn-ghost"}`}>{icono}</button>
  );

  return (
    <div ref={contenedorRef} className="flex flex-col lg:flex-row gap-4 items-start">
      <div className={`min-w-0 flex-1 w-full ${nota ? "hidden lg:block" : ""}`}>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-1">
          <h2 className="gp-serif text-2xl flex items-center gap-2"><StickyNote size={20} className="gp-text-gold" /> Notas</h2>
          <button onClick={crearNota} className="gp-btn flex items-center justify-center gap-1 px-3 py-1.5 text-sm w-full sm:w-auto"><Plus size={14} /> Nueva nota</button>
        </div>
        <p className="text-sm gp-text-muted mb-4">Texto libre, sin ligar a ningún proyecto, tarea ni nada — para anotar cualquier cosa rápido.</p>

        <div className="flex flex-wrap items-center gap-2 mb-3">
          <div className="relative flex-1" style={{ minWidth: 180, maxWidth: 320 }}>
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 gp-text-muted" style={{ pointerEvents: "none" }} />
            <input className="gp-input gp-buscador text-sm" style={{ paddingLeft: 32 }} placeholder="Buscar en tus notas…"
              value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
          </div>
          <select className="gp-input text-xs py-1.5" style={{ width: "auto" }} value={filtroEtiqueta} onChange={(e) => setFiltroEtiqueta(e.target.value)} aria-label="Filtrar por etiqueta">
            <option value="Todas">Todas las etiquetas</option>
            {etiquetas.map((e) => <option key={e} value={e}>{e}</option>)}
          </select>
          <select className="gp-input text-xs py-1.5" style={{ width: "auto" }} value={orden} onChange={(e) => setOrden(e.target.value)} aria-label="Ordenar">
            <option value="reciente">Orden: más reciente</option>
            <option value="antigua">Orden: más antigua</option>
            <option value="alfabetico">Orden: alfabético</option>
          </select>
          <div className="flex gap-1">
            <BotonVista id="cuadricula" titulo="Ver en cuadrícula" icono={<Square size={14} />} />
            <BotonVista id="lista" titulo="Ver en lista" icono={<ListChecks size={14} />} />
          </div>
          <div className="flex gap-1 ml-auto">
            <button onClick={() => exportarFilasExcel(ordenadas, columnasExport, "notas")} className="text-xs px-2.5 py-1.5 rounded gp-btn-ghost flex items-center gap-1"><Download size={12} /> Excel</button>
            <button onClick={() => exportarFilasPDF(ordenadas, columnasExport, "notas", "Notas", busqueda ? `búsqueda: "${busqueda}"` : "")} className="text-xs px-2.5 py-1.5 rounded gp-btn-ghost flex items-center gap-1"><Download size={12} /> PDF</button>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 items-start">
          {/* Panel de etiquetas: cuántas notas tiene cada una y filtro de un clic. */}
          <div className="gp-panel p-3 w-full sm:w-48 shrink-0">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium">Etiquetas</p>
              <IconBtn title="Nueva etiqueta" onClick={nuevaEtiqueta}><Plus size={14} /></IconBtn>
            </div>
            <div className="flex flex-col gap-0.5">
              {["Todas", ...etiquetas].map((e) => (
                <button key={e} onClick={() => setFiltroEtiqueta(e)}
                  className="flex items-center gap-2 px-2 py-1.5 rounded text-xs text-left"
                  style={filtroEtiqueta === e ? { background: "var(--panel-hi)", fontWeight: 600 } : undefined}>
                  <span className="rounded-full shrink-0" style={{ width: 8, height: 8, background: e === "Todas" ? "var(--gold)" : colorEtiquetaNota(e) }} />
                  <span className="flex-1 truncate">{e}</span>
                  <span className="gp-mono gp-text-muted">{contarEtiqueta(e)}</span>
                </button>
              ))}
            </div>
            <button onClick={nuevaEtiqueta} className="gp-btn-ghost w-full mt-2 py-1.5 text-xs rounded flex items-center justify-center gap-1"><Plus size={12} /> Nueva etiqueta</button>
          </div>

          <div className="min-w-0 flex-1 w-full">
            {ordenadas.length === 0 && (
              <p className="text-sm gp-text-muted text-center py-6">{busqueda || filtroEtiqueta !== "Todas" ? "Sin resultados." : "Aún no tienes notas."}</p>
            )}
            <div className={vista === "cuadricula" ? "grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3" : "flex flex-col gap-2"}>
              {ordenadas.map((n) => {
                const nAdj = n.pendienteOfflineId ? 0 : adjuntosDe(n.id).length;
                const nCom = n.pendienteOfflineId ? 0 : nComentariosDe(n.id);
                const elegida = n.id === seleccionada;
                return (
                  <div key={n.id}
                    onClick={() => { if (!n.pendienteOfflineId) setSeleccionada(n.id); }}
                    className={`gp-panel p-3.5 flex flex-col ${n.pendienteOfflineId ? "" : "cursor-pointer"}`}
                    style={{
                      minHeight: vista === "cuadricula" ? 130 : undefined,
                      borderColor: elegida ? "var(--gold)" : undefined,
                      ...(n.pendienteOfflineId ? { borderStyle: "dashed", opacity: 0.9 } : {}),
                    }}>
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <span className="flex items-center gap-1.5 flex-wrap min-w-0">
                        {(n.etiquetas || []).slice(0, 2).map((e) => <ChipEtiquetaNota key={e} nombre={e} />)}
                        <span className="text-[11px] gp-text-muted">{n.pendienteOfflineId ? "sin subir" : fmtFechaNota(fechaDe(n))}</span>
                      </span>
                      <span className="flex items-center gap-0.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                        {!n.pendienteOfflineId && (
                          <IconBtn title={n.fijada ? "Dejar de fijar" : "Fijar arriba"} onClick={() => onEdit(n.id, { fijada: !n.fijada })}>
                            <Flame size={13} style={n.fijada ? { color: "var(--gold)" } : undefined} />
                          </IconBtn>
                        )}
                        <IconBtn title="Eliminar" onClick={() => {
                          if (n.pendienteOfflineId) { quitarPendientesOffline([n.pendienteOfflineId]); setTick((t) => t + 1); }
                          else { onRemove(n.id); if (seleccionada === n.id) setSeleccionada(null); }
                        }}><Trash2 size={13} /></IconBtn>
                      </span>
                    </div>
                    <p className="text-sm font-medium truncate mb-1">{n.titulo || "Sin título"}</p>
                    <p className="text-xs gp-text-muted flex-1" style={{ display: "-webkit-box", WebkitLineClamp: vista === "cuadricula" ? 4 : 2, WebkitBoxOrient: "vertical", overflow: "hidden", whiteSpace: "pre-wrap" }}>{n.contenido}</p>
                    {(nAdj > 0 || nCom > 0) && (
                      <div className="flex items-center gap-3 mt-2 text-[11px] gp-text-muted">
                        {nAdj > 0 && <span className="flex items-center gap-1"><FileText size={11} /> {nAdj}</span>}
                        {nCom > 0 && <span className="flex items-center gap-1"><MessageCircle size={11} /> {nCom}</span>}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {nota && divisor}
      {nota && (
        <div className="w-full shrink-0 lg:sticky lg:top-4" style={estiloPanel}>
          <EditorNota
            key={nota.id}
            nota={nota} data={data} etiquetasExistentes={etiquetas}
            onEdit={onEdit} onAddComentario={onAddComentario}
            onCerrar={() => setSeleccionada(null)}
            onEliminar={() => { onRemove(nota.id); setSeleccionada(null); }}
          />
        </div>
      )}
    </div>
  );
}

// Editor de la nota abierta. Guarda con el patrón de borrador del resto de la app: escribir no
// escribe en la base, aparece la barra de Guardar y al salir con cambios pendientes se avisa.
function EditorNota({ nota, data, etiquetasExistentes, onEdit, onAddComentario, onCerrar, onEliminar }) {
  const { borrador, cambiar, descartar, sucio } = useBorrador({
    titulo: nota.titulo || "", contenido: nota.contenido || "", etiquetas: nota.etiquetas || [],
  });
  const adjuntos = (data.comentarios || [])
    .filter((c) => c.entidadTipo === "notas" && c.entidadId === nota.id)
    .flatMap((c) => (c.adjuntos || []).map((a) => ({ ...a, comentarioId: c.id })));

  return (
    <div className="gp-panel p-4">
      <div className="flex items-start justify-between gap-2 mb-2">
        <span className="flex items-center gap-1.5 flex-wrap min-w-0">
          {(borrador.etiquetas || []).map((e) => <ChipEtiquetaNota key={e} nombre={e} />)}
          <span className="text-[11px] gp-text-muted">
            {nota.updatedAt || nota.createdAt ? new Date(nota.updatedAt || nota.createdAt).toLocaleString("es-MX", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" }) : ""}
          </span>
        </span>
        <span className="flex items-center gap-0.5 shrink-0">
          <IconBtn title={nota.fijada ? "Dejar de fijar" : "Fijar arriba"} onClick={() => onEdit(nota.id, { fijada: !nota.fijada })}>
            <Flame size={14} style={nota.fijada ? { color: "var(--gold)" } : undefined} />
          </IconBtn>
          <IconBtn title="Eliminar nota" onClick={onEliminar}><Trash2 size={14} /></IconBtn>
          <IconBtn title="Cerrar" onClick={() => { if (confirmarDescartarCambios()) onCerrar(); }}><X size={15} /></IconBtn>
        </span>
      </div>

      <input className="gp-input mb-2" style={{ fontSize: 16, fontWeight: 600, height: 40 }}
        placeholder="Título de la nota" value={borrador.titulo}
        onChange={(e) => cambiar({ titulo: e.target.value })} />

      <textarea className="gp-input" rows={12} placeholder="Escribe lo que sea…"
        value={borrador.contenido} onChange={(e) => cambiar({ contenido: e.target.value })} />

      <div className="mt-3">
        <p className="text-[10px] uppercase tracking-wide gp-text-muted mb-1.5">Etiquetas</p>
        <ComboboxMultiBuscar
          seleccionados={(borrador.etiquetas || []).map((e) => ({ id: e, label: e }))}
          opciones={etiquetasExistentes.map((e) => ({ id: e, label: e }))}
          onAgregar={(o) => cambiar({ etiquetas: [...new Set([...(borrador.etiquetas || []), o.id])] })}
          onQuitar={(id) => cambiar({ etiquetas: (borrador.etiquetas || []).filter((x) => x !== id) })}
          onCrear={(texto) => cambiar({ etiquetas: [...new Set([...(borrador.etiquetas || []), texto])] })}
          placeholder="Escribe una etiqueta…"
          crearLabel={(t) => `Crear etiqueta "${t}"`}
        />
      </div>

      <BarraGuardar sucio={sucio} onGuardar={() => onEdit(nota.id, { ...borrador, updatedAt: ahoraISO() })} onDescartar={descartar} />

      {/* Archivos de la nota: usan el mismo mecanismo de adjuntos del resto de la app. */}
      <div className="mt-3 pt-3 border-t gp-border">
        <ArchivosEntidad
          entidadTipo="notas" entidadId={nota.id} carpeta="notas"
          data={data} onAddComentario={onAddComentario}
          vacioTexto="Sin archivos. Agrega fotos, PDF o lo que acompañe a esta nota."
        />
      </div>
      {adjuntos.length > 0 && <p className="text-[10px] gp-text-muted mt-1">{adjuntos.length} archivo(s) en esta nota.</p>}
    </div>
  );
}
