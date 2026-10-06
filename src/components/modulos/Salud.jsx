// src/components/modulos/Salud.jsx
//
// Modulo perezoso (Fase 2). Salio de App.jsx el 5 oct 2026; se mudaron con el sus propias
// piezas (calcIMC, categoriaIMC, IndicadorMetaRow, MetasSaludForm, PERIODOS_TENDENCIA, GraficaSalud, ResumenMetaPeso, SaludTendencias, SaludForm, sugerenciasEjercicio, EJERCICIO_VACIO, resumenEjercicio, SelectorTipoEjercicio, NuevoEjercicioForm, Ejercicio, RutinasEjercicio, RutinaModal, RutinaItemRow, SesionEjercicio, SesionItemRow, fmtMMSS, avisarFinFase, TimerEjercicio, CAMPOS_MEDIDAS, MedidasCorporales, MedidasForm, ProgresoEjercicio, TIPOS_COMIDA, Nutricion, ComidasDelDia, CopiarDiaForm, ComidaRow, Recetas, RecetaForm, ListaCompras), que nadie mas usaba.

import { Badge, Field, IconBtn } from "../ui/basicos";
import { CartesianGrid, Legend, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Check, ChevronLeft, ChevronRight, Copy, Download, FileText, Pencil, Play, Plus, Settings, Trash2 } from "lucide-react";
import { Modal } from "../ui/Modal";
import { OrdenSelector, Th } from "../ui/tablas";
import { compararEs, ordenadosPorNombre, ordenarLista } from "../../lib/listas";
import { exportarFilasExcel, exportarFilasPDF } from "../../lib/exportar";
import { horaActualHHMM, todayISO, uid } from "../../lib/formato";
import { supabase } from "../../supabaseClient";
import { useEffect, useState } from "react";
import Medicamentos from "./Medicamentos";

/* Bitácora universal: comentarios + adjuntos (fotos/audio/video/documentos) para cualquier entidad. */

const calcIMC = (pesoKg, alturaCm) => {
  const p = Number(pesoKg), a = Number(alturaCm);
  if (!p || !a) return null;
  const alturaM = a / 100;
  return p / (alturaM * alturaM);
};

const categoriaIMC = (imc) => {
  if (imc == null) return null;
  if (imc < 18.5) return "Bajo peso";
  if (imc < 25) return "Normal";
  if (imc < 30) return "Sobrepeso";
  return "Obesidad";
};

/* ---------- Salud ---------- */
export default function Salud({ data, onAdd, onEdit, onRemove, onUpdatePerfil, soloCuidado, onAddGenerico, onEditGenerico, onRemoveGenerico, crearAlEntrar, onConsumirCrearAlEntrar }) {
  const [modal, setModal] = useState(null);
  const [tab, setTab] = useState("historial"); // "historial" | "tendencias" | "ejercicio" | "nutricion"
  // Acceso rápido "Entrenamiento" del Centro de mando: llega con preset.tab (y preset.subtab
  // para Ejercicio) en vez de abrir un formulario de "Nuevo" — se guarda aparte en estado local
  // porque `crearAlEntrar` se limpia (vuelve null) apenas se consume, y Ejercicio lo necesita
  // ya montado para elegir su pestaña inicial.
  const [ejercicioAccionInicial, setEjercicioAccionInicial] = useState(null);
  useEffect(() => {
    if (!crearAlEntrar?.preset) return;
    if (crearAlEntrar.preset.tab) setTab(crearAlEntrar.preset.tab);
    setEjercicioAccionInicial(crearAlEntrar.preset);
    onConsumirCrearAlEntrar();
  }, [crearAlEntrar]);
  // Personas con seguimiento de Salud: "Yo" + cualquier Contacto que ya tenga al menos un
  // registro de Salud o un medicamento — nunca una ficha duplicada, siempre viene de Contactos.
  const idsConSeguimiento = [...new Set([
    ...data.salud.map((s) => s.contactoId).filter(Boolean),
    ...(data.medicamentos || []).map((m) => m.contactoId).filter(Boolean),
  ])];
  // Un Cuidador (sin módulo completo de Salud) no tiene datos propios que mostrar en "Yo",
  // así que arranca directo en la primera persona a su cargo.
  const [personaId, setPersonaId] = useState(soloCuidado ? (idsConSeguimiento[0] || null) : null);
  const [agregandoPersona, setAgregandoPersona] = useState(false);
  const [orden, setOrden] = useState("default");
  const [ordenDir, setOrdenDir] = useState("asc");
  const toggleOrden = (key) => { if (orden === key) setOrdenDir((d) => (d === "asc" ? "desc" : "asc")); else { setOrden(key); setOrdenDir("asc"); } };

  const nombreContacto = (id) => data.contactos.find((c) => c.id === id)?.nombre || "—";
  const personas = soloCuidado
    ? idsConSeguimiento.map((id) => ({ id, nombre: nombreContacto(id) }))
    : [{ id: null, nombre: "Yo" }, ...idsConSeguimiento.map((id) => ({ id, nombre: nombreContacto(id) }))];
  const contactosDisponiblesParaAgregar = data.contactos.filter((c) => !idsConSeguimiento.includes(c.id));

  const saludPersona = data.salud.filter((s) => (s.contactoId || null) === personaId);
  const empty = { fecha: todayISO(), hora: horaActualHHMM(), peso: "", glucosa: "", sistolica: "", diastolica: "", colesterol: "", trigliceridos: "", notas: "", estudio: null, origen: "completo", contactoId: personaId };
  const camposOrden = {
    fecha: { get: (s) => s.fecha, tipo: "fecha" },
    registro: { get: (s) => s.createdAt, tipo: "fecha" },
    peso: { get: (s) => Number(s.peso) || null, tipo: "numero" },
  };
  const opcionesOrden = [
    { key: "fecha", label: "fecha" },
    { key: "registro", label: "fecha de registro" },
    { key: "peso", label: "peso" },
  ];
  const base = orden === "default" ? [...saludPersona].sort((a, b) => (b.fecha || "").localeCompare(a.fecha || "")) : saludPersona;
  const ordenados = ordenarLista(base, orden, camposOrden, ordenDir);
  const alturaCm = data.perfilSalud?.[personaId || "yo"]?.alturaCm;
  const [altura, setAltura] = useState(alturaCm || "");
  useEffect(() => { setAltura(alturaCm || ""); }, [personaId, alturaCm]);
  const metasSalud = data.perfilSalud?.[personaId || "yo"]?.metasSalud || {};
  const mostrar = (key) => metasSalud?.[key]?.mostrar !== false;
  const [metasModal, setMetasModal] = useState(false);

  const toneCategoria = (cat) => (cat === "Normal" ? "teal" : cat === "Bajo peso" ? "gold" : cat === "Sobrepeso" ? "gold" : cat === "Obesidad" ? "red" : "muted");

  return (
    <div>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-1">
        <h2 className="gp-serif text-2xl">Salud</h2>
        {(tab === "historial" || tab === "tendencias") && (
          <div className="flex gap-2 w-full sm:w-auto">
            <button onClick={() => setMetasModal(true)} className="gp-btn-ghost flex items-center justify-center gap-1 px-3 py-1.5 text-sm flex-1 sm:flex-none"><Settings size={14} /> Metas</button>
            <button onClick={() => setModal({ item: empty })} className="gp-btn flex items-center justify-center gap-1 px-3 py-1.5 text-sm flex-1 sm:flex-none"><Plus size={14} /> Registrar</button>
          </div>
        )}
      </div>
      <p className="text-sm gp-text-muted mb-4">Peso, glucosa, presión arterial, colesterol, triglicéridos, medicamentos, ejercicio y nutrición, todo en un mismo lugar.</p>

      <div className="flex flex-wrap items-center gap-1 mb-4">
        {personas.map((p) => (
          <button key={p.id || "yo"} onClick={() => setPersonaId(p.id)} className={`text-xs px-3 py-1.5 rounded-full border ${personaId === p.id ? "gp-btn" : "gp-text-muted"}`}>{p.nombre}</button>
        ))}
        {!soloCuidado && (
          <button onClick={() => setAgregandoPersona(true)} className="text-xs px-3 py-1.5 rounded-full border gp-text-muted flex items-center gap-1"><Plus size={12} /> Otra persona</button>
        )}
      </div>
      {soloCuidado && (
        <p className="text-xs gp-text-muted mb-4">Estás viendo Salud como cuidador — solo ves a las personas que te asignaron, no el resto de esta cuenta.</p>
      )}
      {agregandoPersona && (
        <Modal title="Seguimiento de Salud para otra persona" onClose={() => setAgregandoPersona(false)}>
          <p className="text-xs gp-text-muted mb-3">Selecciona un contacto ya existente — no se crea una ficha nueva, se reutiliza su expediente de Contactos.</p>
          {contactosDisponiblesParaAgregar.length === 0 ? (
            <p className="text-sm gp-text-muted">No tienes otros contactos disponibles. Puedes crear uno primero desde Contactos.</p>
          ) : (
            <div className="flex flex-col gap-1">
              {contactosDisponiblesParaAgregar.map((c) => (
                <button key={c.id} onClick={() => { setPersonaId(c.id); setAgregandoPersona(false); }} className="gp-btn-ghost text-left px-3 py-2 rounded text-sm">{c.nombre}</button>
              ))}
            </div>
          )}
        </Modal>
      )}

      <div className="flex gap-1 mb-4 flex-wrap">
        {[{ key: "historial", label: "Historial" }, { key: "tendencias", label: "Tendencias" }, { key: "medicamentos", label: "Medicamentos" }, { key: "ejercicio", label: "Ejercicio" }, { key: "nutricion", label: "Nutrición" }].map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)} className={`text-xs px-3 py-1.5 rounded-full border ${tab === t.key ? "gp-btn" : "gp-text-muted"}`}>{t.label}</button>
        ))}
      </div>

      {tab === "medicamentos" ? (
        <Medicamentos data={data} onAdd={(i) => onAddGenerico("medicamentos", i)} onEdit={(id, p) => onEditGenerico("medicamentos", id, p)} onRemove={(id) => onRemoveGenerico("medicamentos", id)} soloCuidado={soloCuidado} />
      ) : tab === "ejercicio" ? (
        <Ejercicio data={data} personaId={personaId} onAdd={onAddGenerico} onEdit={onEditGenerico} onRemove={onRemoveGenerico} accionInicial={ejercicioAccionInicial} />
      ) : tab === "nutricion" ? (
        <Nutricion data={data} personaId={personaId} onAdd={onAddGenerico} onEdit={onEditGenerico} onRemove={onRemoveGenerico} />
      ) : tab === "tendencias" ? (
        <SaludTendencias salud={saludPersona} metasSalud={metasSalud} />
      ) : (
      <>
      {mostrar("peso") && (
        <div className="gp-panel p-3 mb-4 flex flex-wrap items-center gap-3">
          <span className="text-xs gp-text-muted">Tu estatura (para calcular IMC):</span>
          <input type="number" className="gp-input" style={{ maxWidth: 100 }} value={altura}
            onChange={(e) => setAltura(e.target.value)}
            onBlur={() => onUpdatePerfil(personaId, { alturaCm: altura })} />
          <span className="text-xs gp-text-muted">cm</span>
          {!alturaCm && <span className="text-xs gp-text-gold">Captúrala para ver tu categoría de peso.</span>}
        </div>
      )}
      <div className="mb-5"><OrdenSelector opciones={opcionesOrden} value={orden} onChange={setOrden} /></div>

      <div className="gp-panel overflow-x-auto">
        <table className="gp-table">
          <thead>
            <tr>
              <Th label="Fecha" sortKey="fecha" orden={orden} ordenDir={ordenDir} onToggle={toggleOrden} />
              {mostrar("peso") && <><Th label="Peso (kg)" sortKey="peso" orden={orden} ordenDir={ordenDir} onToggle={toggleOrden} /><th>IMC</th><th>Categoría</th></>}
              {mostrar("glucosa") && <th>Glucosa</th>}
              {mostrar("presion") && <th>Presión</th>}
              {mostrar("colesterol") && <th>Colesterol</th>}
              {mostrar("trigliceridos") && <th>Triglicéridos</th>}
              <th>Estudio</th><th>Notas</th><th></th>
            </tr>
          </thead>
          <tbody>
            {ordenados.map((s) => {
              const imc = calcIMC(s.peso, alturaCm);
              const cat = categoriaIMC(imc);
              return (
                <tr key={s.id}>
                  <td className="gp-mono">{s.fecha}{s.hora ? <span className="gp-text-muted"> {s.hora.slice(0, 5)}</span> : ""}</td>
                  {mostrar("peso") && (
                    <>
                      <td className="gp-mono">{s.peso || "—"}</td>
                      <td className="gp-mono">{imc ? imc.toFixed(1) : "—"}</td>
                      <td>{cat ? <Badge tone={toneCategoria(cat)}>{cat}</Badge> : "—"}</td>
                    </>
                  )}
                  {mostrar("glucosa") && <td className="gp-mono">{s.glucosa || "—"}</td>}
                  {mostrar("presion") && <td className="gp-mono">{s.sistolica && s.diastolica ? `${s.sistolica}/${s.diastolica}` : "—"}</td>}
                  {mostrar("colesterol") && <td className="gp-mono">{s.colesterol || "—"}</td>}
                  {mostrar("trigliceridos") && <td className="gp-mono">{s.trigliceridos || "—"}</td>}
                  <td>
                    {s.estudio ? (
                      <a href={s.estudio.url} target="_blank" rel="noopener noreferrer" className="gp-text-gold text-xs flex items-center gap-1">
                        <FileText size={12} /> {s.estudio.nombre.length > 14 ? s.estudio.nombre.slice(0, 14) + "…" : s.estudio.nombre}
                      </a>
                    ) : "—"}
                  </td>
                  <td className="gp-text-muted">{s.notas}</td>
                  <td><div className="flex gap-1"><IconBtn title="Editar" onClick={() => setModal({ item: s })}><Pencil size={13} /></IconBtn><IconBtn title="Eliminar" onClick={() => onRemove(s.id)}><Trash2 size={13} /></IconBtn></div></td>
                </tr>
              );
            })}
            {ordenados.length === 0 && (
              <tr><td colSpan={1 + (mostrar("peso") ? 3 : 0) + (mostrar("glucosa") ? 1 : 0) + (mostrar("presion") ? 1 : 0) + (mostrar("colesterol") ? 1 : 0) + (mostrar("trigliceridos") ? 1 : 0) + 3} className="text-center gp-text-muted py-6">Sin registros de salud.</td></tr>
            )}
          </tbody>
        </table>
      </div>
      </>
      )}

      {modal && (
        <Modal title={modal.item.id ? "Editar registro" : "Nuevo registro"} onClose={() => setModal(null)}>
          <SaludForm item={modal.item} metasSalud={metasSalud} onSave={(v) => { modal.item.id ? onEdit(modal.item.id, v) : onAdd(v); setModal(null); }} />
        </Modal>
      )}

      {metasModal && (
        <Modal title="Metas e indicadores de Salud" onClose={() => setMetasModal(false)}>
          <MetasSaludForm metasSalud={metasSalud} onSave={async (v) => { await onUpdatePerfil(personaId, { metasSalud: v }); setMetasModal(false); }} />
        </Modal>
      )}
    </div>
  );
}

// Fila de configuración de un indicador de Salud dentro de "Metas e indicadores": mostrar/
// ocultar + meta(s) + fecha objetivo. `campos` es 1 o 2 campos numéricos (presión usa 2).
function IndicadorMetaRow({ titulo, unidad, valor, campos, onChange }) {
  return (
    <div className="gp-panel-hi rounded p-3">
      <div className="flex items-center justify-between mb-2 gap-2">
        <p className="text-sm font-medium">{titulo}{unidad ? <span className="gp-text-muted font-normal"> ({unidad})</span> : ""}</p>
        <label className="flex items-center gap-2 text-xs shrink-0">
          <input type="checkbox" checked={valor.mostrar !== false} onChange={(e) => onChange({ mostrar: e.target.checked })} /> Mostrar
        </label>
      </div>
      {valor.mostrar !== false && (
        <div className={campos.length === 2 ? "grid grid-cols-3 gap-2" : "grid grid-cols-2 gap-2"}>
          {campos.map((c) => (
            <Field key={c.key} label={c.label}><input type="number" className="gp-input" value={valor[c.key] ?? ""} onChange={(e) => onChange({ [c.key]: e.target.value })} /></Field>
          ))}
          <Field label="Fecha objetivo"><input type="date" className="gp-input" value={valor.fecha ?? ""} onChange={(e) => onChange({ fecha: e.target.value })} /></Field>
        </div>
      )}
    </div>
  );
}

function MetasSaludForm({ metasSalud, onSave }) {
  const [v, setV] = useState(() => ({
    peso: { mostrar: true, ...metasSalud?.peso },
    glucosa: { mostrar: true, ...metasSalud?.glucosa },
    presion: { mostrar: true, ...metasSalud?.presion },
    colesterol: { mostrar: true, ...metasSalud?.colesterol },
    trigliceridos: { mostrar: true, ...metasSalud?.trigliceridos },
  }));
  const [guardando, setGuardando] = useState(false);
  const set = (key, patch) => setV((prev) => ({ ...prev, [key]: { ...prev[key], ...patch } }));
  const guardar = async () => { setGuardando(true); await onSave(v); setGuardando(false); };

  return (
    <div>
      <p className="text-xs gp-text-muted mb-3">Elige qué indicadores usar y, si quieres, una meta con fecha objetivo. Los que desactives dejan de pedirse al registrar y de mostrarse en el historial y las gráficas. Peso es el principal — el único con una tarjeta de avance en Tendencias.</p>
      <div className="flex flex-col gap-3">
        <IndicadorMetaRow titulo="Peso" unidad="kg" valor={v.peso} campos={[{ key: "meta", label: "Meta" }]} onChange={(patch) => set("peso", patch)} />
        <IndicadorMetaRow titulo="Glucosa" unidad="mg/dL" valor={v.glucosa} campos={[{ key: "meta", label: "Meta" }]} onChange={(patch) => set("glucosa", patch)} />
        <IndicadorMetaRow titulo="Presión arterial" unidad="mmHg" valor={v.presion}
          campos={[{ key: "metaSistolica", label: "Meta sistólica" }, { key: "metaDiastolica", label: "Meta diastólica" }]}
          onChange={(patch) => set("presion", patch)} />
        <IndicadorMetaRow titulo="Colesterol" unidad="mg/dL" valor={v.colesterol} campos={[{ key: "meta", label: "Meta" }]} onChange={(patch) => set("colesterol", patch)} />
        <IndicadorMetaRow titulo="Triglicéridos" unidad="mg/dL" valor={v.trigliceridos} campos={[{ key: "meta", label: "Meta" }]} onChange={(patch) => set("trigliceridos", patch)} />
      </div>
      <button className="gp-btn w-full py-2 text-sm mt-4 disabled:opacity-70" disabled={guardando} onClick={guardar}>{guardando ? "Guardando…" : "Guardar"}</button>
    </div>
  );
}

const PERIODOS_TENDENCIA = [
  { key: "7d", label: "7 días", dias: 7 },
  { key: "30d", label: "30 días", dias: 30 },
  { key: "3m", label: "3 meses", dias: 90 },
  { key: "6m", label: "6 meses", dias: 180 },
  { key: "1a", label: "1 año", dias: 365 },
  { key: "todo", label: "Todo", dias: null },
];

// `metaLines` (opcional) dibuja una línea punteada horizontal por meta configurada en "Metas e
// indicadores" — [{ value, label, color }], se ignora si no hay meta capturada para ese campo.
function GraficaSalud({ titulo, unidad, puntos, series, metaLines }) {
  if (puntos.length === 0) {
    return (
      <div className="gp-panel p-4">
        <p className="text-sm font-medium mb-1">{titulo}</p>
        <p className="text-xs gp-text-muted py-6 text-center">Sin datos suficientes en este periodo.</p>
      </div>
    );
  }
  return (
    <div className="gp-panel p-4">
      <p className="text-sm font-medium mb-2">{titulo}{unidad ? <span className="gp-text-muted"> ({unidad})</span> : ""}</p>
      <div style={{ width: "100%", height: 220 }}>
        <ResponsiveContainer>
          <LineChart data={puntos} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,.08)" />
            <XAxis dataKey="etiqueta" tick={{ fontSize: 10, fill: "var(--muted)" }} />
            <YAxis tick={{ fontSize: 10, fill: "var(--muted)" }} domain={["auto", "auto"]} />
            <Tooltip
              contentStyle={{ background: "var(--panel-hi)", border: "1px solid var(--border)", fontSize: 12 }}
              labelFormatter={(label, payload) => payload?.[0]?.payload?.tooltipLabel || label}
            />
            {series.length > 1 && <Legend wrapperStyle={{ fontSize: 11 }} />}
            {(metaLines || []).map((m, i) => m.value !== null && m.value !== undefined && !isNaN(m.value) && (
              <ReferenceLine key={i} y={m.value} stroke={m.color || "var(--red)"} strokeDasharray="4 4"
                label={{ value: m.label || "Meta", fontSize: 10, fill: m.color || "var(--red)", position: "insideTopRight" }} />
            ))}
            {series.map((s) => (
              <Line key={s.key} type="monotone" dataKey={s.key} name={s.label} stroke={s.color} strokeWidth={2} dot={{ r: 3 }} connectNulls={false} />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// objetivo. `salud` va SIN filtrar por periodo: el avance debe verse contra el dato más
// reciente que exista, no solo contra lo que cae dentro del periodo elegido en Tendencias.
function ResumenMetaPeso({ salud, metaPeso }) {
  const metaNum = Number(metaPeso?.meta);
  if (!metaPeso?.meta || isNaN(metaNum)) return null;
  const ultimo = [...salud].filter((s) => s.peso !== null && s.peso !== undefined && s.peso !== "")
    .sort((a, b) => (b.fecha + (b.hora || "")).localeCompare(a.fecha + (a.hora || "")))[0];
  if (!ultimo) return null;
  const faltante = Number(ultimo.peso) - metaNum;
  const diasRestantes = metaPeso.fecha ? Math.ceil((new Date(metaPeso.fecha + "T00:00:00") - new Date()) / 86400000) : null;
  return (
    <div className="gp-panel p-4 mb-4 flex flex-wrap items-center gap-5">
      <div>
        <p className="text-xs gp-text-muted">Meta de peso</p>
        <p className="gp-serif text-xl">
          {Math.abs(faltante) < 0.05 ? "¡Meta alcanzada!" : `${Math.abs(faltante).toFixed(1)} kg por ${faltante > 0 ? "bajar" : "subir"}`}
        </p>
        <p className="text-xs gp-text-muted">Último registro: {ultimo.peso} kg del {ultimo.fecha} · meta {metaNum} kg</p>
      </div>
      {metaPeso.fecha && (
        <div>
          <p className="text-xs gp-text-muted">Fecha objetivo</p>
          <p className="text-sm">{metaPeso.fecha}</p>
          <p className="text-xs gp-text-muted">{diasRestantes >= 0 ? `${diasRestantes} día${diasRestantes === 1 ? "" : "s"} restantes` : "Fecha vencida"}</p>
        </div>
      )}
    </div>
  );
}

function SaludTendencias({ salud, metasSalud }) {
  const [periodo, setPeriodo] = useState("3m");
  const diasPeriodo = PERIODOS_TENDENCIA.find((p) => p.key === periodo)?.dias;
  const desde = diasPeriodo ? new Date(Date.now() - diasPeriodo * 86400000).toISOString().slice(0, 10) : null;

  const enRango = [...(salud || [])]
    .filter((s) => s.fecha && (!desde || s.fecha >= desde))
    .sort((a, b) => (a.fecha + (a.hora || "")).localeCompare(b.fecha + (b.hora || "")));

  const etiqueta = (s) => `${s.fecha.slice(5)}${s.hora ? " " + s.hora.slice(0, 5) : ""}`;
  const tooltipLabel = (s) => `${s.fecha}${s.hora ? " · " + s.hora.slice(0, 5) : ""}`;

  const puntosDe = (campo) => enRango.filter((s) => s[campo] !== null && s[campo] !== undefined && s[campo] !== "")
    .map((s) => ({ etiqueta: etiqueta(s), tooltipLabel: tooltipLabel(s), [campo]: Number(s[campo]) }));

  const puntosPresion = enRango.filter((s) => s.sistolica != null && s.sistolica !== "" && s.diastolica != null && s.diastolica !== "")
    .map((s) => ({ etiqueta: etiqueta(s), tooltipLabel: tooltipLabel(s), sistolica: Number(s.sistolica), diastolica: Number(s.diastolica) }));

  const mostrar = (key) => metasSalud?.[key]?.mostrar !== false;
  const metaPeso = metasSalud?.peso;
  const metaGlucosa = metasSalud?.glucosa;
  const metaPresion = metasSalud?.presion;
  const metaColesterol = metasSalud?.colesterol;
  const metaTrigliceridos = metasSalud?.trigliceridos;
  const lineaMeta = (valor) => { const n = Number(valor?.meta); return valor?.meta && !isNaN(n) ? [{ value: n, label: "Meta", color: "var(--red)" }] : []; };

  return (
    <div>
      {mostrar("peso") && <ResumenMetaPeso salud={salud || []} metaPeso={metaPeso} />}
      <div className="flex flex-wrap gap-1 mb-4">
        {PERIODOS_TENDENCIA.map((p) => (
          <button key={p.key} onClick={() => setPeriodo(p.key)} className={`text-xs px-2.5 py-1 rounded-full border ${periodo === p.key ? "gp-btn" : "gp-text-muted"}`}>{p.label}</button>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {mostrar("peso") && <GraficaSalud titulo="Peso" unidad="kg" puntos={puntosDe("peso")} series={[{ key: "peso", label: "Peso", color: "var(--teal)" }]} metaLines={lineaMeta(metaPeso)} />}
        {mostrar("glucosa") && <GraficaSalud titulo="Glucosa" unidad="mg/dL" puntos={puntosDe("glucosa")} series={[{ key: "glucosa", label: "Glucosa", color: "var(--gold)" }]} metaLines={lineaMeta(metaGlucosa)} />}
        {mostrar("presion") && (
          <GraficaSalud titulo="Presión arterial" unidad="mmHg" puntos={puntosPresion}
            series={[{ key: "sistolica", label: "Sistólica", color: "var(--red)" }, { key: "diastolica", label: "Diastólica", color: "var(--teal)" }]}
            metaLines={[
              ...(metaPresion?.metaSistolica && !isNaN(Number(metaPresion.metaSistolica)) ? [{ value: Number(metaPresion.metaSistolica), label: "Meta sist.", color: "var(--red)" }] : []),
              ...(metaPresion?.metaDiastolica && !isNaN(Number(metaPresion.metaDiastolica)) ? [{ value: Number(metaPresion.metaDiastolica), label: "Meta diast.", color: "var(--teal)" }] : []),
            ]}
          />
        )}
        {mostrar("colesterol") && <GraficaSalud titulo="Colesterol" unidad="mg/dL" puntos={puntosDe("colesterol")} series={[{ key: "colesterol", label: "Colesterol", color: "var(--gold)" }]} metaLines={lineaMeta(metaColesterol)} />}
        {mostrar("trigliceridos") && <GraficaSalud titulo="Triglicéridos" unidad="mg/dL" puntos={puntosDe("trigliceridos")} series={[{ key: "trigliceridos", label: "Triglicéridos", color: "var(--red)" }]} metaLines={lineaMeta(metaTrigliceridos)} />}
      </div>
      <p className="text-xs gp-text-muted mt-3">Solo se muestran las mediciones que realmente capturaste — no se inventan ni interpolan valores para rellenar huecos.</p>
    </div>
  );
}

function SaludForm({ item, metasSalud, onSave }) {
  const [v, setV] = useState(item);
  const [error, setError] = useState("");
  const [subiendo, setSubiendo] = useState(false);

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type !== "application/pdf") { setError("Solo se aceptan archivos PDF."); return; }
    if (file.size > 8 * 1024 * 1024) { setError("El PDF pesa más de 8 MB — intenta comprimirlo primero."); return; }
    setError("");
    setSubiendo(true);
    const path = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
    const { error: upErr } = await supabase.storage.from("estudios").upload(path, file);
    if (upErr) {
      setError("No se pudo subir el archivo: " + upErr.message);
      setSubiendo(false);
      return;
    }
    const { data } = supabase.storage.from("estudios").getPublicUrl(path);
    setV((prev) => ({ ...prev, estudio: { nombre: file.name, url: data.publicUrl } }));
    setSubiendo(false);
  };

  const mostrar = (key) => metasSalud?.[key]?.mostrar !== false;

  return (
    <div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Field label="Fecha"><input type="date" className="gp-input" value={v.fecha} onChange={(e) => setV({ ...v, fecha: e.target.value })} /></Field>
        <Field label="Hora"><input type="time" className="gp-input" value={v.hora || ""} onChange={(e) => setV({ ...v, hora: e.target.value })} /></Field>
        {mostrar("peso") && <Field label="Peso (kg)"><input type="number" className="gp-input" value={v.peso} onChange={(e) => setV({ ...v, peso: e.target.value })} /></Field>}
      </div>
      {(mostrar("glucosa") || mostrar("presion")) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {mostrar("glucosa") && <Field label="Glucosa (mg/dL)"><input type="number" className="gp-input" value={v.glucosa} onChange={(e) => setV({ ...v, glucosa: e.target.value })} /></Field>}
          {mostrar("presion") && (
            <Field label="Presión arterial (sistólica/diastólica)">
              <div className="flex items-center gap-2">
                <input type="number" placeholder="120" className="gp-input" value={v.sistolica || ""} onChange={(e) => setV({ ...v, sistolica: e.target.value })} />
                <span className="gp-text-muted">/</span>
                <input type="number" placeholder="80" className="gp-input" value={v.diastolica || ""} onChange={(e) => setV({ ...v, diastolica: e.target.value })} />
                <span className="text-xs gp-text-muted">mmHg</span>
              </div>
            </Field>
          )}
        </div>
      )}
      {(mostrar("colesterol") || mostrar("trigliceridos")) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {mostrar("colesterol") && <Field label="Colesterol (mg/dL)"><input type="number" className="gp-input" value={v.colesterol} onChange={(e) => setV({ ...v, colesterol: e.target.value })} /></Field>}
          {mostrar("trigliceridos") && <Field label="Triglicéridos (mg/dL)"><input type="number" className="gp-input" value={v.trigliceridos} onChange={(e) => setV({ ...v, trigliceridos: e.target.value })} /></Field>}
        </div>
      )}
      <Field label="Notas"><textarea className="gp-input" rows={2} value={v.notas} onChange={(e) => setV({ ...v, notas: e.target.value })} /></Field>
      <Field label="Adjuntar estudio (PDF)">
        <input type="file" accept="application/pdf" onChange={handleFile} className="text-xs gp-text-muted" disabled={subiendo} />
        {subiendo && <p className="text-xs gp-text-muted mt-1">Subiendo…</p>}
        {v.estudio && !subiendo && <p className="text-xs gp-text-teal mt-1 flex items-center gap-1"><FileText size={12} /> {v.estudio.nombre} adjunto</p>}
        {error && <p className="text-xs gp-text-red mt-1">{error}</p>}
      </Field>
      <button className="gp-btn w-full py-2 text-sm mt-2" disabled={subiendo} onClick={() => onSave(v)}>Guardar</button>
    </div>
  );
}

// Nombres de ejercicios ya usados por esta persona (rutinas + sesiones), más frecuentes primero
// — sugerencias para el campo de texto libre, sin necesitar un catálogo aparte que mantener.
function sugerenciasEjercicio(data, personaId) {
  const conteo = {};
  const contar = (nombre) => { if (!nombre) return; conteo[nombre] = (conteo[nombre] || 0) + 1; };
  (data.rutinaEjercicioItems || []).forEach((it) => {
    const rutina = data.rutinasEjercicio.find((r) => r.id === it.rutinaId);
    if (rutina && (rutina.contactoId || null) === personaId) contar(it.ejercicio);
  });
  (data.sesionEjercicioItems || []).forEach((it) => {
    const sesion = data.sesionesEjercicio.find((s) => s.id === it.sesionId);
    if (sesion && (sesion.contactoId || null) === personaId) contar(it.ejercicio);
  });
  return Object.keys(conteo).sort((a, b) => conteo[b] - conteo[a]);
}

// Fila para agregar un ejercicio nuevo (a una rutina o a una sesión libre), con autocompletar
// de los ya usados. `listId` debe ser único por instancia para no chocar datalist en el DOM.
const EJERCICIO_VACIO = { ejercicio: "", peso: "", series: "", repeticiones: "", duracionSegundos: "60", descansoSegundos: "30" };

// Resumen corto de un ejercicio (de rutina o de sesión) según su tipo, para chips/listas.
function resumenEjercicio(it) {
  const pesoTxt = it.peso ? `${it.peso}kg · ` : "";
  if (it.tipo === "tiempo") return `${pesoTxt}${it.duracionSegundos || "—"}s trabajo / ${it.descansoSegundos || "—"}s descanso`;
  return `${it.peso || "—"}kg · ${it.series || "—"}x${it.repeticiones || "—"}`;
}

// Selector chico "Series" / "Tiempo" — decide si el ejercicio se mide por peso/series/reps
// (como siempre) o por un cronómetro de trabajo/descanso (circuitos tipo Planet Fitness).
function SelectorTipoEjercicio({ tipo, onChange }) {
  return (
    <div className="flex gap-1 shrink-0">
      <button type="button" onClick={() => onChange("series")} className={`text-xs px-2.5 py-1 rounded-full border ${tipo !== "tiempo" ? "gp-btn" : "gp-text-muted"}`}>Series</button>
      <button type="button" onClick={() => onChange("tiempo")} className={`text-xs px-2.5 py-1 rounded-full border ${tipo === "tiempo" ? "gp-btn" : "gp-text-muted"}`}>Tiempo</button>
    </div>
  );
}

function NuevoEjercicioForm({ sugerencias, listId, onAdd }) {
  const [tipo, setTipo] = useState("series");
  const [v, setV] = useState(EJERCICIO_VACIO);
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <input list={listId} className="gp-input text-sm flex-1 min-w-[140px]" placeholder="Ejercicio" value={v.ejercicio} onChange={(e) => setV({ ...v, ejercicio: e.target.value })} />
        <SelectorTipoEjercicio tipo={tipo} onChange={setTipo} />
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <input type="number" className="gp-input text-sm" style={{ width: 70 }} placeholder="kg" value={v.peso} onChange={(e) => setV({ ...v, peso: e.target.value })} />
        {tipo === "tiempo" ? (
          <>
            <input type="number" className="gp-input text-sm" style={{ width: 70 }} placeholder="60" value={v.duracionSegundos} onChange={(e) => setV({ ...v, duracionSegundos: e.target.value })} />
            <span className="text-xs gp-text-muted">seg trabajo</span>
            <input type="number" className="gp-input text-sm" style={{ width: 70 }} placeholder="30" value={v.descansoSegundos} onChange={(e) => setV({ ...v, descansoSegundos: e.target.value })} />
            <span className="text-xs gp-text-muted">seg descanso</span>
          </>
        ) : (
          <>
            <input type="number" className="gp-input text-sm" style={{ width: 60 }} placeholder="series" value={v.series} onChange={(e) => setV({ ...v, series: e.target.value })} />
            <span className="text-xs gp-text-muted">x</span>
            <input type="number" className="gp-input text-sm" style={{ width: 60 }} placeholder="reps" value={v.repeticiones} onChange={(e) => setV({ ...v, repeticiones: e.target.value })} />
          </>
        )}
        <button
          className="gp-btn-ghost px-3 py-1.5 text-sm rounded flex items-center gap-1 disabled:opacity-50"
          disabled={!v.ejercicio.trim()}
          onClick={() => { onAdd({ ...v, tipo }); setV(EJERCICIO_VACIO); }}
        >
          <Plus size={13} /> Agregar
        </button>
      </div>
      <datalist id={listId}>{sugerencias.map((s) => <option key={s} value={s} />)}</datalist>
    </div>
  );
}

function Ejercicio({ data, personaId, onAdd, onEdit, onRemove, accionInicial }) {
  const [tab, setTab] = useState(() => accionInicial?.subtab || "rutinas"); // rutinas | sesion | medidas | progreso
  return (
    <div>
      <div className="flex gap-1 mb-4 flex-wrap">
        {[{ key: "rutinas", label: "Rutinas" }, { key: "sesion", label: "Sesión" }, { key: "medidas", label: "Medidas" }, { key: "progreso", label: "Progreso" }].map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)} className={`text-xs px-3 py-1.5 rounded-full border ${tab === t.key ? "gp-btn" : "gp-text-muted"}`}>{t.label}</button>
        ))}
      </div>
      {tab === "rutinas" && <RutinasEjercicio data={data} personaId={personaId} onAdd={onAdd} onEdit={onEdit} onRemove={onRemove} />}
      {tab === "sesion" && <SesionEjercicio data={data} personaId={personaId} onAdd={onAdd} onEdit={onEdit} onRemove={onRemove} />}
      {tab === "medidas" && <MedidasCorporales data={data} personaId={personaId} onAdd={onAdd} onEdit={onEdit} onRemove={onRemove} />}
      {tab === "progreso" && <ProgresoEjercicio data={data} personaId={personaId} />}
    </div>
  );
}

function RutinasEjercicio({ data, personaId, onAdd, onEdit, onRemove }) {
  const [modalRutina, setModalRutina] = useState(null); // null | rutina base { id?, nombre, fechaInicio, fechaFin, notas }
  const rutinas = (data.rutinasEjercicio || []).filter((r) => (r.contactoId || null) === personaId)
    .sort((a, b) => (b.fechaInicio || "").localeCompare(a.fechaInicio || ""));
  const hoy = todayISO();
  const vigente = (r) => r.fechaInicio <= hoy && (!r.fechaFin || r.fechaFin >= hoy);
  const itemsDe = (rutinaId) => (data.rutinaEjercicioItems || []).filter((it) => it.rutinaId === rutinaId).sort((a, b) => (a.orden || 0) - (b.orden || 0));
  const sugerencias = sugerenciasEjercicio(data, personaId);

  return (
    <div>
      <div className="flex justify-end mb-3">
        <button onClick={() => setModalRutina({ nombre: "", fechaInicio: todayISO(), fechaFin: "", notas: "" })} className="gp-btn flex items-center gap-1 px-3 py-1.5 text-sm"><Plus size={14} /> Nueva rutina</button>
      </div>
      <div className="flex flex-col gap-2">
        {rutinas.map((r) => (
          <div key={r.id} className="gp-panel p-3">
            <div className="flex items-center justify-between gap-2 mb-1">
              <p className="text-sm font-medium">{r.nombre}</p>
              <div className="flex items-center gap-2">
                {vigente(r) ? <Badge tone="teal">Vigente</Badge> : <Badge tone="muted">Vencida</Badge>}
                <IconBtn title="Editar" onClick={() => setModalRutina(r)}><Pencil size={13} /></IconBtn>
                <IconBtn title="Eliminar" onClick={() => onRemove("rutinasEjercicio", r.id, { mensaje: "Se borrará la rutina y sus ejercicios configurados." })}><Trash2 size={13} /></IconBtn>
              </div>
            </div>
            <p className="text-xs gp-text-muted mb-2">Del {r.fechaInicio} {r.fechaFin ? `al ${r.fechaFin}` : "· sin fecha de fin"}</p>
            <div className="flex flex-wrap gap-1">
              {itemsDe(r.id).map((it) => (
                <span key={it.id} className="text-xs gp-panel-hi rounded px-2 py-1">{it.ejercicio} · {resumenEjercicio(it)}</span>
              ))}
              {itemsDe(r.id).length === 0 && <span className="text-xs gp-text-muted">Sin ejercicios — edítala para agregarlos.</span>}
            </div>
          </div>
        ))}
        {rutinas.length === 0 && <p className="text-sm gp-text-muted py-6 text-center">Sin rutinas todavía.</p>}
      </div>

      {modalRutina && (
        <RutinaModal
          data={data}
          rutina={modalRutina}
          personaId={personaId}
          sugerencias={sugerencias}
          onAdd={onAdd} onEdit={onEdit} onRemove={onRemove}
          onClose={() => setModalRutina(null)}
        />
      )}
    </div>
  );
}

// habilita agregar ejercicios — cada uno se guarda al momento (mismo patrón de autoguardado que
// el resto de la app), no hay un botón único de "Guardar todo" al final.
function RutinaModal({ data, rutina, personaId, sugerencias, onAdd, onEdit, onRemove, onClose }) {
  const [base, setBase] = useState(rutina);
  const [guardadaBase, setGuardadaBase] = useState(!!rutina.id);
  const items = (data.rutinaEjercicioItems || []).filter((it) => it.rutinaId === base.id).sort((a, b) => (a.orden || 0) - (b.orden || 0));

  const guardarBase = async () => {
    if (base.id) {
      await onEdit("rutinasEjercicio", base.id, { nombre: base.nombre, fechaInicio: base.fechaInicio, fechaFin: base.fechaFin, notas: base.notas });
    } else {
      const id = uid();
      await onAdd("rutinasEjercicio", { nombre: base.nombre, fechaInicio: base.fechaInicio, fechaFin: base.fechaFin, notas: base.notas, id, contactoId: personaId });
      setBase((b) => ({ ...b, id }));
    }
    setGuardadaBase(true);
  };

  return (
    <Modal title={rutina.id ? "Editar rutina" : "Nueva rutina"} onClose={onClose}>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="Nombre"><input className="gp-input" value={base.nombre} onChange={(e) => setBase({ ...base, nombre: e.target.value })} /></Field>
        <Field label="Notas"><input className="gp-input" value={base.notas || ""} onChange={(e) => setBase({ ...base, notas: e.target.value })} /></Field>
        <Field label="Vigente desde"><input type="date" className="gp-input" value={base.fechaInicio} onChange={(e) => setBase({ ...base, fechaInicio: e.target.value })} /></Field>
        <Field label="Vigente hasta (opcional)"><input type="date" className="gp-input" value={base.fechaFin || ""} onChange={(e) => setBase({ ...base, fechaFin: e.target.value })} /></Field>
      </div>
      <button className="gp-btn w-full py-2 text-sm mt-1 mb-4 disabled:opacity-50" onClick={guardarBase} disabled={!base.nombre?.trim() || !base.fechaInicio}>
        {guardadaBase ? "Guardar cambios" : "Crear rutina y agregar ejercicios"}
      </button>

      {guardadaBase && (
        <>
          <p className="text-xs gp-text-muted uppercase tracking-wide mb-2">Ejercicios</p>
          <div className="flex flex-col gap-2 mb-3">
            {items.map((it) => (
              <RutinaItemRow key={it.id} item={it} onEdit={(patch) => onEdit("rutinaEjercicioItems", it.id, patch)} onRemove={() => onRemove("rutinaEjercicioItems", it.id)} />
            ))}
            {items.length === 0 && <p className="text-xs gp-text-muted">Sin ejercicios todavía.</p>}
          </div>
          <NuevoEjercicioForm sugerencias={sugerencias} listId="sugerencias-ejercicio-rutina"
            onAdd={(v) => onAdd("rutinaEjercicioItems", { ...v, id: uid(), rutinaId: base.id, orden: items.length })} />
        </>
      )}
    </Modal>
  );
}

function RutinaItemRow({ item, onEdit, onRemove }) {
  const [v, setV] = useState(item);
  useEffect(() => setV(item), [item.id]);
  const esTiempo = v.tipo === "tiempo";
  const cambiarTipo = (tipo) => {
    const patch = tipo === "tiempo" && !v.duracionSegundos ? { tipo, duracionSegundos: 60, descansoSegundos: 30 } : { tipo };
    setV({ ...v, ...patch });
    onEdit(patch);
  };
  return (
    <div className="gp-panel-hi rounded p-2 flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <input list="sugerencias-ejercicio-rutina" className="gp-input text-sm flex-1 min-w-[140px]" value={v.ejercicio}
          onChange={(e) => setV({ ...v, ejercicio: e.target.value })} onBlur={() => onEdit({ ejercicio: v.ejercicio })} />
        <SelectorTipoEjercicio tipo={v.tipo} onChange={cambiarTipo} />
        <IconBtn title="Eliminar" onClick={onRemove}><Trash2 size={13} /></IconBtn>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <input type="number" className="gp-input text-sm" style={{ width: 70 }} placeholder="kg" value={v.peso ?? ""}
          onChange={(e) => setV({ ...v, peso: e.target.value })} onBlur={() => onEdit({ peso: v.peso })} />
        {esTiempo ? (
          <>
            <input type="number" className="gp-input text-sm" style={{ width: 70 }} placeholder="60" value={v.duracionSegundos ?? ""}
              onChange={(e) => setV({ ...v, duracionSegundos: e.target.value })} onBlur={() => onEdit({ duracionSegundos: v.duracionSegundos })} />
            <span className="text-xs gp-text-muted">seg trabajo</span>
            <input type="number" className="gp-input text-sm" style={{ width: 70 }} placeholder="30" value={v.descansoSegundos ?? ""}
              onChange={(e) => setV({ ...v, descansoSegundos: e.target.value })} onBlur={() => onEdit({ descansoSegundos: v.descansoSegundos })} />
            <span className="text-xs gp-text-muted">seg descanso</span>
          </>
        ) : (
          <>
            <input type="number" className="gp-input text-sm" style={{ width: 60 }} placeholder="series" value={v.series ?? ""}
              onChange={(e) => setV({ ...v, series: e.target.value })} onBlur={() => onEdit({ series: v.series })} />
            <span className="text-xs gp-text-muted">x</span>
            <input type="number" className="gp-input text-sm" style={{ width: 60 }} placeholder="reps" value={v.repeticiones ?? ""}
              onChange={(e) => setV({ ...v, repeticiones: e.target.value })} onBlur={() => onEdit({ repeticiones: v.repeticiones })} />
          </>
        )}
      </div>
    </div>
  );
}

function SesionEjercicio({ data, personaId, onAdd, onEdit, onRemove }) {
  const [sesionActivaId, setSesionActivaId] = useState(null);
  const [modalIniciar, setModalIniciar] = useState(false);
  const hoy = todayISO();

  // Al entrar (o cambiar de persona), retoma sola la sesión de hoy si ya existe — así el
  // acceso rápido "Entrenamiento" del Centro de mando lleva directo al entrenamiento en curso
  // en vez de a una lista vacía que hay que volver a abrir con otro clic.
  useEffect(() => {
    const deHoy = (data.sesionesEjercicio || []).find((s) => (s.contactoId || null) === personaId && s.fecha === hoy);
    setSesionActivaId(deHoy ? deHoy.id : null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [personaId]);

  const rutinasVigentes = (data.rutinasEjercicio || []).filter((r) => (r.contactoId || null) === personaId && r.fechaInicio <= hoy && (!r.fechaFin || r.fechaFin >= hoy));
  const itemsDeRutina = (rutinaId) => (data.rutinaEjercicioItems || []).filter((it) => it.rutinaId === rutinaId).sort((a, b) => (a.orden || 0) - (b.orden || 0));
  const sesiones = (data.sesionesEjercicio || []).filter((s) => (s.contactoId || null) === personaId).sort((a, b) => (b.fecha || "").localeCompare(a.fecha || ""));
  const itemsDeSesion = (sesionId) => (data.sesionEjercicioItems || []).filter((it) => it.sesionId === sesionId).sort((a, b) => (a.orden || 0) - (b.orden || 0));
  const sugerencias = sugerenciasEjercicio(data, personaId);
  const nombreRutina = (id) => data.rutinasEjercicio.find((r) => r.id === id)?.nombre;

  const iniciarSesion = async (rutinaId) => {
    const sesionId = uid();
    await onAdd("sesionesEjercicio", { id: sesionId, contactoId: personaId, rutinaId: rutinaId || null, fecha: hoy, hora: horaActualHHMM(), notas: "" });
    if (rutinaId) {
      const itemsRutina = itemsDeRutina(rutinaId);
      for (let i = 0; i < itemsRutina.length; i++) {
        const it = itemsRutina[i];
        await onAdd("sesionEjercicioItems", { id: uid(), sesionId, rutinaItemId: it.id, ejercicio: it.ejercicio, tipo: it.tipo || "series", peso: it.peso, series: it.series, repeticiones: it.repeticiones, duracionSegundos: it.duracionSegundos, descansoSegundos: it.descansoSegundos, hecho: false, orden: i });
      }
    }
    setSesionActivaId(sesionId);
    setModalIniciar(false);
  };

  const sesionActiva = sesiones.find((s) => s.id === sesionActivaId);

  return (
    <div>
      {!sesionActiva ? (
        <div className="flex justify-end mb-3">
          <button onClick={() => setModalIniciar(true)} className="gp-btn flex items-center gap-1 px-3 py-1.5 text-sm"><Plus size={14} /> Iniciar sesión</button>
        </div>
      ) : (
        <div className="gp-panel p-4 mb-5">
          <div className="flex items-center justify-between mb-1">
            <p className="text-sm font-medium">Sesión del {sesionActiva.fecha}{sesionActiva.rutinaId ? ` · ${nombreRutina(sesionActiva.rutinaId) || "Rutina"}` : " · Entrenamiento libre"}</p>
            <button onClick={() => setSesionActivaId(null)} className="text-xs gp-text-gold shrink-0">Cerrar</button>
          </div>
          <div className="flex flex-col gap-2 my-3">
            {itemsDeSesion(sesionActiva.id).map((it) => (
              <SesionItemRow key={it.id} item={it} onEdit={(patch) => onEdit("sesionEjercicioItems", it.id, patch)} onRemove={() => onRemove("sesionEjercicioItems", it.id)} />
            ))}
            {itemsDeSesion(sesionActiva.id).length === 0 && <p className="text-xs gp-text-muted">Sin ejercicios — agrega el primero abajo.</p>}
          </div>
          <NuevoEjercicioForm sugerencias={sugerencias} listId="sugerencias-ejercicio-sesion"
            onAdd={(v) => onAdd("sesionEjercicioItems", { ...v, id: uid(), sesionId: sesionActiva.id, rutinaItemId: null, hecho: false, orden: itemsDeSesion(sesionActiva.id).length })} />
        </div>
      )}

      <p className="text-xs gp-text-muted uppercase tracking-wide mb-2">Sesiones anteriores</p>
      <div className="flex flex-col gap-1">
        {sesiones.map((s) => {
          const its = itemsDeSesion(s.id);
          const hechos = its.filter((it) => it.hecho).length;
          return (
            <div key={s.id} className="gp-panel p-3 flex items-center justify-between gap-2">
              <button onClick={() => setSesionActivaId(s.id)} className="text-left flex-1 min-w-0">
                <p className="text-sm">{s.fecha} {s.hora ? <span className="gp-text-muted">{s.hora.slice(0, 5)}</span> : ""} {s.rutinaId ? `· ${nombreRutina(s.rutinaId) || "Rutina"}` : "· Entrenamiento libre"}</p>
                <p className="text-xs gp-text-muted">{hechos}/{its.length} ejercicios hechos</p>
              </button>
              <IconBtn title="Eliminar" onClick={() => onRemove("sesionesEjercicio", s.id, { mensaje: "Se borrará la sesión y sus ejercicios registrados." })}><Trash2 size={13} /></IconBtn>
            </div>
          );
        })}
        {sesiones.length === 0 && <p className="text-sm gp-text-muted py-6 text-center">Sin sesiones todavía.</p>}
      </div>

      {modalIniciar && (
        <Modal title="Iniciar sesión" onClose={() => setModalIniciar(false)}>
          <p className="text-xs gp-text-muted mb-3">Elige una rutina vigente para precargar sus ejercicios, o empieza un entrenamiento libre.</p>
          <div className="flex flex-col gap-1">
            {rutinasVigentes.map((r) => (
              <button key={r.id} onClick={() => iniciarSesion(r.id)} className="gp-btn-ghost text-left px-3 py-2 rounded text-sm">{r.nombre}</button>
            ))}
            <button onClick={() => iniciarSesion(null)} className="gp-btn-ghost text-left px-3 py-2 rounded text-sm gp-text-gold">Entrenamiento libre</button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function SesionItemRow({ item, onEdit, onRemove }) {
  const [v, setV] = useState(item);
  useEffect(() => setV(item), [item.id]);
  const toggleHecho = () => { const hecho = !v.hecho; setV({ ...v, hecho }); onEdit({ hecho }); };
  const esTiempo = v.tipo === "tiempo";
  return (
    <div className={`gp-panel-hi rounded p-2 flex flex-col gap-2 ${v.hecho ? "opacity-70" : ""}`}>
      <div className="flex flex-wrap items-center gap-2">
        <button onClick={toggleHecho} className="shrink-0" title={v.hecho ? "Marcar como pendiente" : "Marcar como hecho"}>
          <div className="w-5 h-5 rounded flex items-center justify-center border" style={{ borderColor: v.hecho ? "var(--teal)" : "var(--border)", background: v.hecho ? "var(--teal)" : "transparent" }}>
            {v.hecho && <Check size={13} color="#fff" />}
          </div>
        </button>
        <span className={`text-sm flex-1 min-w-[100px] ${v.hecho ? "line-through gp-text-muted" : ""}`}>{v.ejercicio}</span>
        <input type="number" className="gp-input text-sm" style={{ width: 70 }} placeholder="kg" value={v.peso ?? ""}
          onChange={(e) => setV({ ...v, peso: e.target.value })} onBlur={() => onEdit({ peso: v.peso })} />
        {!esTiempo && (
          <>
            <input type="number" className="gp-input text-sm" style={{ width: 60 }} placeholder="series" value={v.series ?? ""}
              onChange={(e) => setV({ ...v, series: e.target.value })} onBlur={() => onEdit({ series: v.series })} />
            <span className="text-xs gp-text-muted">x</span>
            <input type="number" className="gp-input text-sm" style={{ width: 60 }} placeholder="reps" value={v.repeticiones ?? ""}
              onChange={(e) => setV({ ...v, repeticiones: e.target.value })} onBlur={() => onEdit({ repeticiones: v.repeticiones })} />
          </>
        )}
        <IconBtn title="Eliminar" onClick={onRemove}><Trash2 size={13} /></IconBtn>
      </div>
      {esTiempo && (
        <div className="flex flex-wrap items-center justify-between gap-3 pl-7">
          <TimerEjercicio duracion={Number(v.duracionSegundos) || 60} descanso={Number(v.descansoSegundos) || 30} />
          <div className="flex items-center gap-1">
            <input type="number" className="gp-input text-xs" style={{ width: 48 }} title="Segundos de trabajo" value={v.duracionSegundos ?? ""}
              onChange={(e) => setV({ ...v, duracionSegundos: e.target.value })} onBlur={() => onEdit({ duracionSegundos: v.duracionSegundos })} />
            <span className="text-[10px] gp-text-muted">/</span>
            <input type="number" className="gp-input text-xs" style={{ width: 48 }} title="Segundos de descanso" value={v.descansoSegundos ?? ""}
              onChange={(e) => setV({ ...v, descansoSegundos: e.target.value })} onBlur={() => onEdit({ descansoSegundos: v.descansoSegundos })} />
            <span className="text-[10px] gp-text-muted">seg</span>
          </div>
        </div>
      )}
    </div>
  );
}

function fmtMMSS(totalSegundos) {
  const s = Math.max(0, totalSegundos);
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${String(r).padStart(2, "0")}`;
}

// Aviso corto (beep vía Web Audio, sin archivo que cargar) + vibración al terminar una fase
// del cronómetro — para notar el cambio sin tener que ver la pantalla todo el tiempo.
function avisarFinFase() {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    const ctx = new Ctx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    osc.start();
    osc.stop(ctx.currentTime + 0.25);
    osc.onended = () => ctx.close();
  } catch {}
  try { navigator.vibrate?.([200, 100, 200]); } catch {}
}

// ritmo (pedido explícito de Angel, no auto-avanzar). El check de "hecho" sigue siendo aparte,
// manual, ya en SesionItemRow — el cronómetro es solo una ayuda, no reemplaza ese registro.
function TimerEjercicio({ duracion, descanso }) {
  const [fase, setFase] = useState("trabajo"); // "trabajo" | "descanso"
  const [restante, setRestante] = useState(duracion);
  const [corriendo, setCorriendo] = useState(false);

  useEffect(() => { setFase("trabajo"); setRestante(duracion); setCorriendo(false); }, [duracion, descanso]);

  useEffect(() => {
    if (!corriendo) return;
    if (restante <= 0) { setCorriendo(false); avisarFinFase(); return; }
    const t = setTimeout(() => setRestante((r) => r - 1), 1000);
    return () => clearTimeout(t);
  }, [corriendo, restante]);

  const iniciar = () => {
    if (restante <= 0) {
      const siguiente = fase === "trabajo" ? "descanso" : "trabajo";
      setFase(siguiente);
      setRestante(siguiente === "trabajo" ? duracion : descanso);
    }
    setCorriendo(true);
  };
  const reiniciar = () => { setFase("trabajo"); setRestante(duracion); setCorriendo(false); };
  const etiquetaBoton = restante > 0 ? "Iniciar" : fase === "trabajo" ? "Iniciar descanso" : "Repetir";

  return (
    <div className="flex items-center gap-3">
      <span className={`text-[10px] px-2 py-0.5 rounded-full border shrink-0 ${fase === "trabajo" ? "gp-text-teal" : "gp-text-gold"}`}>
        {fase === "trabajo" ? "Trabajo" : "Descanso"}
      </span>
      <span className="gp-mono text-2xl font-semibold" style={{ minWidth: 56 }}>{fmtMMSS(restante)}</span>
      {corriendo ? (
        <button onClick={() => setCorriendo(false)} className="gp-btn-ghost px-3 py-1.5 text-xs rounded">Pausar</button>
      ) : (
        <button onClick={iniciar} className="gp-btn px-3 py-1.5 text-xs rounded flex items-center gap-1"><Play size={12} /> {etiquetaBoton}</button>
      )}
      <button onClick={reiniciar} className="text-xs gp-text-muted underline decoration-dotted">Reiniciar</button>
    </div>
  );
}

const CAMPOS_MEDIDAS = [
  { key: "cinturaCm", label: "Cintura", unidad: "cm", color: "var(--teal)" },
  { key: "caderaCm", label: "Cadera", unidad: "cm", color: "var(--gold)" },
  { key: "pechoCm", label: "Pecho", unidad: "cm", color: "var(--red)" },
  { key: "bicepsCm", label: "Bíceps", unidad: "cm", color: "var(--teal)" },
  { key: "musloCm", label: "Muslo", unidad: "cm", color: "var(--gold)" },
  { key: "pantorrillaCm", label: "Pantorrilla", unidad: "cm", color: "var(--red)" },
  { key: "cuelloCm", label: "Cuello", unidad: "cm", color: "var(--teal)" },
];

function MedidasCorporales({ data, personaId, onAdd, onEdit, onRemove }) {
  const [modal, setModal] = useState(null);
  const [orden, setOrden] = useState("default");
  const [ordenDir, setOrdenDir] = useState("asc");
  const toggleOrden = (key) => { if (orden === key) setOrdenDir((d) => (d === "asc" ? "desc" : "asc")); else { setOrden(key); setOrdenDir("asc"); } };
  const medidas = (data.medidasCorporales || []).filter((m) => (m.contactoId || null) === personaId);
  const camposOrden = { fecha: { get: (m) => m.fecha, tipo: "fecha" } };
  const base = orden === "default" ? [...medidas].sort((a, b) => (b.fecha || "").localeCompare(a.fecha || "")) : medidas;
  const ordenados = ordenarLista(base, orden, camposOrden, ordenDir);
  const empty = { fecha: todayISO(), cinturaCm: "", caderaCm: "", pechoCm: "", bicepsCm: "", musloCm: "", pantorrillaCm: "", cuelloCm: "", notas: "", contactoId: personaId };
  const columnasExport = [{ label: "Fecha", get: (m) => m.fecha }, ...CAMPOS_MEDIDAS.map((c) => ({ label: c.label, get: (m) => m[c.key] })), { label: "Notas", get: (m) => m.notas }];

  return (
    <div>
      <div className="flex justify-between items-center mb-3 gap-2 flex-wrap">
        <OrdenSelector opciones={[{ key: "fecha", label: "fecha" }]} value={orden} onChange={setOrden} />
        <div className="flex gap-2">
          <button onClick={() => exportarFilasExcel(ordenados, columnasExport, "medidas-corporales")} className="gp-btn-ghost px-3 py-1.5 text-xs rounded flex items-center gap-1"><Download size={12} /> Excel</button>
          <button onClick={() => exportarFilasPDF(ordenados, columnasExport, "medidas-corporales", "Medidas corporales")} className="gp-btn-ghost px-3 py-1.5 text-xs rounded flex items-center gap-1"><Download size={12} /> PDF</button>
          <button onClick={() => setModal({ item: empty })} className="gp-btn flex items-center gap-1 px-3 py-1.5 text-sm"><Plus size={14} /> Registrar</button>
        </div>
      </div>
      <div className="gp-panel overflow-x-auto">
        <table className="gp-table">
          <thead><tr><Th label="Fecha" sortKey="fecha" orden={orden} ordenDir={ordenDir} onToggle={toggleOrden} />{CAMPOS_MEDIDAS.map((c) => <th key={c.key}>{c.label}</th>)}<th>Notas</th><th></th></tr></thead>
          <tbody>
            {ordenados.map((m) => (
              <tr key={m.id}>
                <td className="gp-mono">{m.fecha}</td>
                {CAMPOS_MEDIDAS.map((c) => <td key={c.key} className="gp-mono">{m[c.key] || "—"}</td>)}
                <td className="gp-text-muted">{m.notas}</td>
                <td><div className="flex gap-1"><IconBtn title="Editar" onClick={() => setModal({ item: m })}><Pencil size={13} /></IconBtn><IconBtn title="Eliminar" onClick={() => onRemove("medidasCorporales", m.id)}><Trash2 size={13} /></IconBtn></div></td>
              </tr>
            ))}
            {ordenados.length === 0 && <tr><td colSpan={CAMPOS_MEDIDAS.length + 3} className="text-center gp-text-muted py-6">Sin medidas registradas.</td></tr>}
          </tbody>
        </table>
      </div>
      {modal && (
        <Modal title={modal.item.id ? "Editar medidas" : "Nuevas medidas"} onClose={() => setModal(null)}>
          <MedidasForm item={modal.item} onSave={(v) => { modal.item.id ? onEdit("medidasCorporales", modal.item.id, v) : onAdd("medidasCorporales", v); setModal(null); }} />
        </Modal>
      )}
    </div>
  );
}

function MedidasForm({ item, onSave }) {
  const [v, setV] = useState(item);
  return (
    <div>
      <Field label="Fecha"><input type="date" className="gp-input" value={v.fecha} onChange={(e) => setV({ ...v, fecha: e.target.value })} /></Field>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {CAMPOS_MEDIDAS.map((c) => (
          <Field key={c.key} label={`${c.label} (cm)`}><input type="number" className="gp-input" value={v[c.key]} onChange={(e) => setV({ ...v, [c.key]: e.target.value })} /></Field>
        ))}
      </div>
      <Field label="Notas"><textarea className="gp-input" rows={2} value={v.notas} onChange={(e) => setV({ ...v, notas: e.target.value })} /></Field>
      <button className="gp-btn w-full py-2 text-sm mt-2" onClick={() => onSave(v)}>Guardar</button>
    </div>
  );
}

function ProgresoEjercicio({ data, personaId }) {
  const [periodo, setPeriodo] = useState("3m");
  const diasPeriodo = PERIODOS_TENDENCIA.find((p) => p.key === periodo)?.dias;
  const desde = diasPeriodo ? new Date(Date.now() - diasPeriodo * 86400000).toISOString().slice(0, 10) : null;

  const sesionesPersona = (data.sesionesEjercicio || []).filter((s) => (s.contactoId || null) === personaId);
  const sesionesPorId = Object.fromEntries(sesionesPersona.map((s) => [s.id, s]));
  const itemsHechos = (data.sesionEjercicioItems || []).filter((it) => it.hecho && sesionesPorId[it.sesionId] && (!desde || sesionesPorId[it.sesionId].fecha >= desde));

  // Los ejercicios "por tiempo" no cargan peso — no tiene sentido ofrecerlos en esta gráfica.
  const ejerciciosDisponibles = [...new Set(itemsHechos.filter((it) => it.tipo !== "tiempo").map((it) => it.ejercicio))].sort((a, b) => a.localeCompare(b, "es"));
  const [ejercicioSel, setEjercicioSel] = useState("");
  useEffect(() => { if (!ejerciciosDisponibles.includes(ejercicioSel)) setEjercicioSel(ejerciciosDisponibles[0] || ""); }, [ejerciciosDisponibles.join("|")]);

  const puntosPeso = itemsHechos.filter((it) => it.ejercicio === ejercicioSel && it.peso !== null && it.peso !== undefined && it.peso !== "")
    .map((it) => {
      const s = sesionesPorId[it.sesionId];
      return { etiqueta: s.fecha.slice(5), tooltipLabel: s.fecha, peso: Number(it.peso) };
    })
    .sort((a, b) => a.tooltipLabel.localeCompare(b.tooltipLabel));

  const medidas = (data.medidasCorporales || []).filter((m) => (m.contactoId || null) === personaId && m.fecha && (!desde || m.fecha >= desde))
    .sort((a, b) => a.fecha.localeCompare(b.fecha));
  const puntosMedida = (campo) => medidas.filter((m) => m[campo] !== null && m[campo] !== undefined && m[campo] !== "")
    .map((m) => ({ etiqueta: m.fecha.slice(5), tooltipLabel: m.fecha, [campo]: Number(m[campo]) }));

  return (
    <div>
      <div className="flex flex-wrap gap-1 mb-4">
        {PERIODOS_TENDENCIA.map((p) => (
          <button key={p.key} onClick={() => setPeriodo(p.key)} className={`text-xs px-2.5 py-1 rounded-full border ${periodo === p.key ? "gp-btn" : "gp-text-muted"}`}>{p.label}</button>
        ))}
      </div>

      <p className="text-xs gp-text-muted uppercase tracking-wide mb-2">Peso cargado</p>
      {ejerciciosDisponibles.length === 0 ? (
        <p className="text-sm gp-text-muted py-4">Aún no hay ejercicios marcados como hechos en este periodo.</p>
      ) : (
        <>
          <select className="gp-input text-sm mb-3" style={{ maxWidth: 260 }} value={ejercicioSel} onChange={(e) => setEjercicioSel(e.target.value)}>
            {[...ejerciciosDisponibles].sort(compararEs).map((e) => <option key={e} value={e}>{e}</option>)}
          </select>
          <div className="mb-5">
            <GraficaSalud titulo={ejercicioSel} unidad="kg" puntos={puntosPeso} series={[{ key: "peso", label: "Peso", color: "var(--teal)" }]} />
          </div>
        </>
      )}

      <p className="text-xs gp-text-muted uppercase tracking-wide mb-2">Medidas corporales</p>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {CAMPOS_MEDIDAS.map((c) => (
          <GraficaSalud key={c.key} titulo={c.label} unidad={c.unidad} puntos={puntosMedida(c.key)} series={[{ key: c.key, label: c.label, color: c.color }]} />
        ))}
      </div>
      <p className="text-xs gp-text-muted mt-3">Solo se muestran los valores que realmente capturaste.</p>
    </div>
  );
}

/* ---------- Nutrición (sub-sección de Salud) ---------- */

const TIPOS_COMIDA = ["Desayuno", "Comida", "Cena", "Snack"];

function Nutricion({ data, personaId, onAdd, onEdit, onRemove }) {
  const [tab, setTab] = useState("comidas"); // comidas | recetas | lista
  return (
    <div>
      <div className="flex gap-1 mb-4 flex-wrap">
        {[{ key: "comidas", label: "Comidas del día" }, { key: "recetas", label: "Recetas" }, { key: "lista", label: "Lista de compras" }].map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)} className={`text-xs px-3 py-1.5 rounded-full border ${tab === t.key ? "gp-btn" : "gp-text-muted"}`}>{t.label}</button>
        ))}
      </div>
      {tab === "comidas" && <ComidasDelDia data={data} personaId={personaId} onAdd={onAdd} onEdit={onEdit} onRemove={onRemove} />}
      {tab === "recetas" && <Recetas data={data} onAdd={onAdd} onEdit={onEdit} onRemove={onRemove} />}
      {tab === "lista" && <ListaCompras data={data} personaId={personaId} />}
    </div>
  );
}

function ComidasDelDia({ data, personaId, onAdd, onEdit, onRemove }) {
  const [fecha, setFecha] = useState(todayISO());
  const [copiarModal, setCopiarModal] = useState(false);
  const comidasDia = (data.dietaDias || []).filter((d) => (d.contactoId || null) === personaId && d.fecha === fecha);
  const recetas = data.recetas || [];
  const nombreReceta = (id) => recetas.find((r) => r.id === id)?.nombre;

  const cambiarDia = (delta) => { const d = new Date(fecha + "T00:00:00"); d.setDate(d.getDate() + delta); setFecha(d.toISOString().slice(0, 10)); };
  const agregar = (tipoComida) => onAdd("dietaDias", { id: uid(), contactoId: personaId, fecha, tipoComida, recetaId: null, descripcion: "", notas: "" });

  const copiarA = async (fechaDestino) => {
    for (const c of comidasDia) {
      await onAdd("dietaDias", { id: uid(), contactoId: personaId, fecha: fechaDestino, tipoComida: c.tipoComida, recetaId: c.recetaId, descripcion: c.descripcion, notas: c.notas });
    }
    setCopiarModal(false);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4 gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <IconBtn title="Día anterior" onClick={() => cambiarDia(-1)}><ChevronLeft size={14} /></IconBtn>
          <input type="date" className="gp-input text-sm" value={fecha} onChange={(e) => setFecha(e.target.value)} />
          <IconBtn title="Día siguiente" onClick={() => cambiarDia(1)}><ChevronRight size={14} /></IconBtn>
        </div>
        <button onClick={() => setCopiarModal(true)} disabled={comidasDia.length === 0} className="gp-btn-ghost px-3 py-1.5 text-xs rounded flex items-center gap-1 disabled:opacity-50"><Copy size={12} /> Copiar día</button>
      </div>

      <div className="flex flex-col gap-3">
        {TIPOS_COMIDA.map((tipo) => {
          const items = comidasDia.filter((c) => c.tipoComida === tipo);
          return (
            <div key={tipo} className="gp-panel p-3">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium">{tipo}</p>
                <button onClick={() => agregar(tipo)} className="text-xs gp-text-gold flex items-center gap-1"><Plus size={12} /> Agregar</button>
              </div>
              <div className="flex flex-col gap-2">
                {items.map((c) => (
                  <ComidaRow key={c.id} item={c} recetas={recetas} nombreReceta={nombreReceta}
                    onEdit={(patch) => onEdit("dietaDias", c.id, patch)}
                    onRemove={() => onRemove("dietaDias", c.id)} />
                ))}
                {items.length === 0 && <p className="text-xs gp-text-muted">Nada capturado.</p>}
              </div>
            </div>
          );
        })}
      </div>

      {copiarModal && (
        <Modal title="Copiar día" onClose={() => setCopiarModal(false)}>
          <p className="text-xs gp-text-muted mb-3">Copia las comidas del {fecha} a otro día.</p>
          <CopiarDiaForm onCopiar={copiarA} />
        </Modal>
      )}
    </div>
  );
}

function CopiarDiaForm({ onCopiar }) {
  const [destino, setDestino] = useState(todayISO());
  const [copiando, setCopiando] = useState(false);
  return (
    <div>
      <Field label="Copiar a"><input type="date" className="gp-input" value={destino} onChange={(e) => setDestino(e.target.value)} /></Field>
      <button className="gp-btn w-full py-2 text-sm mt-2 disabled:opacity-70" disabled={copiando} onClick={async () => { setCopiando(true); await onCopiar(destino); }}>
        {copiando ? "Copiando…" : "Copiar"}
      </button>
    </div>
  );
}

function ComidaRow({ item, recetas, nombreReceta, onEdit, onRemove }) {
  const [v, setV] = useState(item);
  useEffect(() => setV(item), [item.id]);
  return (
    <div className="gp-panel-hi rounded p-2 flex flex-wrap items-center gap-2">
      <select className="gp-input text-sm" style={{ minWidth: 160 }} value={v.recetaId || ""}
        onChange={(e) => { const recetaId = e.target.value || null; setV({ ...v, recetaId }); onEdit({ recetaId }); }}>
        <option value="">Sin receta (libre)</option>
        {ordenadosPorNombre(recetas).map((r) => <option key={r.id} value={r.id}>{r.nombre}</option>)}
      </select>
      {!v.recetaId && (
        <input className="gp-input text-sm flex-1 min-w-[140px]" placeholder="Qué comiste…" value={v.descripcion || ""}
          onChange={(e) => setV({ ...v, descripcion: e.target.value })} onBlur={() => onEdit({ descripcion: v.descripcion })} />
      )}
      <IconBtn title="Eliminar" onClick={onRemove}><Trash2 size={13} /></IconBtn>
    </div>
  );
}

function Recetas({ data, onAdd, onEdit, onRemove }) {
  const [modal, setModal] = useState(null);
  const [busqueda, setBusqueda] = useState("");
  const recetas = (data.recetas || []).filter((r) => !busqueda || (r.nombre || "").toLowerCase().includes(busqueda.toLowerCase()))
    .sort((a, b) => (a.nombre || "").localeCompare(b.nombre || "", "es"));

  return (
    <div>
      <div className="flex justify-between items-center mb-3 gap-2 flex-wrap">
        <input className="gp-input text-sm flex-1 min-w-[180px] max-w-xs" placeholder="Buscar receta…" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
        <button onClick={() => setModal({ item: { nombre: "", categoria: "Comida", porciones: "", ingredientes: [], instrucciones: "", notas: "" } })} className="gp-btn flex items-center gap-1 px-3 py-1.5 text-sm"><Plus size={14} /> Nueva receta</button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {recetas.map((r) => (
          <div key={r.id} className="gp-panel p-3">
            <div className="flex items-center justify-between gap-2 mb-1">
              <p className="text-sm font-medium">{r.nombre}</p>
              <div className="flex items-center gap-1">
                <IconBtn title="Editar" onClick={() => setModal({ item: r })}><Pencil size={13} /></IconBtn>
                <IconBtn title="Eliminar" onClick={() => onRemove("recetas", r.id)}><Trash2 size={13} /></IconBtn>
              </div>
            </div>
            <p className="text-xs gp-text-muted mb-1">{r.categoria}{r.porciones ? ` · ${r.porciones} porciones` : ""}</p>
            <p className="text-xs gp-text-muted">{(r.ingredientes || []).length} ingredientes</p>
          </div>
        ))}
        {recetas.length === 0 && <p className="text-sm gp-text-muted py-6 text-center col-span-2">Sin recetas todavía.</p>}
      </div>
      {modal && (
        <Modal title={modal.item.id ? "Editar receta" : "Nueva receta"} onClose={() => setModal(null)}>
          <RecetaForm item={modal.item} onSave={(v) => { modal.item.id ? onEdit("recetas", modal.item.id, v) : onAdd("recetas", { ...v, id: uid() }); setModal(null); }} />
        </Modal>
      )}
    </div>
  );
}

function RecetaForm({ item, onSave }) {
  const [v, setV] = useState({ ...item, ingredientes: item.ingredientes || [] });
  const agregarIngrediente = () => setV({ ...v, ingredientes: [...v.ingredientes, { nombre: "", cantidad: "", unidad: "" }] });
  const editarIngrediente = (i, patch) => setV({ ...v, ingredientes: v.ingredientes.map((ing, idx) => (idx === i ? { ...ing, ...patch } : ing)) });
  const quitarIngrediente = (i) => setV({ ...v, ingredientes: v.ingredientes.filter((_, idx) => idx !== i) });

  return (
    <div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Field label="Nombre"><input className="gp-input" value={v.nombre} onChange={(e) => setV({ ...v, nombre: e.target.value })} /></Field>
        <Field label="Categoría">
          <select className="gp-input" value={v.categoria || ""} onChange={(e) => setV({ ...v, categoria: e.target.value })}>
            {TIPOS_COMIDA.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </Field>
        <Field label="Porciones"><input type="number" className="gp-input" value={v.porciones} onChange={(e) => setV({ ...v, porciones: e.target.value })} /></Field>
      </div>

      <p className="text-xs gp-text-muted uppercase tracking-wide mb-2 mt-2">Ingredientes</p>
      <div className="flex flex-col gap-2 mb-2">
        {v.ingredientes.map((ing, i) => (
          <div key={i} className="flex items-center gap-2">
            <input className="gp-input text-sm flex-1" placeholder="Ingrediente" value={ing.nombre} onChange={(e) => editarIngrediente(i, { nombre: e.target.value })} />
            <input className="gp-input text-sm" style={{ width: 70 }} placeholder="cant." value={ing.cantidad} onChange={(e) => editarIngrediente(i, { cantidad: e.target.value })} />
            <input className="gp-input text-sm" style={{ width: 70 }} placeholder="unidad" value={ing.unidad} onChange={(e) => editarIngrediente(i, { unidad: e.target.value })} />
            <IconBtn title="Eliminar" onClick={() => quitarIngrediente(i)}><Trash2 size={13} /></IconBtn>
          </div>
        ))}
      </div>
      <button onClick={agregarIngrediente} className="text-xs gp-text-gold flex items-center gap-1 mb-3"><Plus size={12} /> Agregar ingrediente</button>

      <Field label="Instrucciones de preparación"><textarea className="gp-input" rows={4} value={v.instrucciones || ""} onChange={(e) => setV({ ...v, instrucciones: e.target.value })} /></Field>
      <Field label="Notas"><textarea className="gp-input" rows={2} value={v.notas || ""} onChange={(e) => setV({ ...v, notas: e.target.value })} /></Field>
      <button className="gp-btn w-full py-2 text-sm mt-2" onClick={() => onSave(v)}>Guardar</button>
    </div>
  );
}

// dinámica). El check "ya lo compré" es de un viaje al súper, no vale la pena sincronizarlo
// entre dispositivos ni guardarlo en la base de datos — vive solo en este navegador.
function ListaCompras({ data, personaId }) {
  const hoy = todayISO();
  const [desde, setDesde] = useState(hoy);
  const [hasta, setHasta] = useState(() => { const d = new Date(hoy + "T00:00:00"); d.setDate(d.getDate() + 6); return d.toISOString().slice(0, 10); });
  const [marcados, setMarcados] = useState({});

  useEffect(() => {
    try { setMarcados(JSON.parse(localStorage.getItem(`arkeyone_lista_compras_${desde}_${hasta}`) || "{}")); } catch { setMarcados({}); }
  }, [desde, hasta]);

  const toggleMarcado = (nombre) => {
    setMarcados((prev) => {
      const next = { ...prev, [nombre]: !prev[nombre] };
      try { localStorage.setItem(`arkeyone_lista_compras_${desde}_${hasta}`, JSON.stringify(next)); } catch {}
      return next;
    });
  };

  const comidasRango = (data.dietaDias || []).filter((d) => (d.contactoId || null) === personaId && d.fecha >= desde && d.fecha <= hasta && d.recetaId);
  const recetasPorId = Object.fromEntries((data.recetas || []).map((r) => [r.id, r]));

  const agregados = {};
  comidasRango.forEach((c) => {
    const receta = recetasPorId[c.recetaId];
    (receta?.ingredientes || []).forEach((ing) => {
      if (!ing.nombre) return;
      const key = ing.nombre.trim().toLowerCase();
      if (!agregados[key]) agregados[key] = { nombre: ing.nombre.trim(), cantidades: [] };
      if (ing.cantidad || ing.unidad) agregados[key].cantidades.push(`${ing.cantidad || ""} ${ing.unidad || ""}`.trim());
    });
  });
  const lista = Object.values(agregados).sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
  const columnasExport = [{ label: "Ingrediente", get: (i) => i.nombre }, { label: "Cantidad", get: (i) => i.cantidades.join(" + ") }];

  return (
    <div>
      <div className="flex flex-wrap items-end gap-2 mb-4">
        <Field label="Desde"><input type="date" className="gp-input" value={desde} onChange={(e) => setDesde(e.target.value)} /></Field>
        <Field label="Hasta"><input type="date" className="gp-input" value={hasta} onChange={(e) => setHasta(e.target.value)} /></Field>
        <div className="flex gap-2 mb-3">
          <button onClick={() => exportarFilasExcel(lista, columnasExport, "lista-compras")} className="gp-btn-ghost px-3 py-1.5 text-xs rounded flex items-center gap-1"><Download size={12} /> Excel</button>
          <button onClick={() => exportarFilasPDF(lista, columnasExport, "lista-compras", "Lista de compras")} className="gp-btn-ghost px-3 py-1.5 text-xs rounded flex items-center gap-1"><Download size={12} /> PDF</button>
        </div>
      </div>
      <div className="gp-panel">
        {lista.map((i, idx) => (
          <label key={i.nombre} className={`flex items-center gap-3 p-3 cursor-pointer ${idx < lista.length - 1 ? "border-b" : ""}`} style={{ borderColor: "var(--border)" }}>
            <input type="checkbox" checked={!!marcados[i.nombre]} onChange={() => toggleMarcado(i.nombre)} />
            <span className={`text-sm flex-1 ${marcados[i.nombre] ? "line-through gp-text-muted" : ""}`}>{i.nombre}</span>
            {i.cantidades.length > 0 && <span className="text-xs gp-text-muted">{i.cantidades.join(" + ")}</span>}
          </label>
        ))}
        {lista.length === 0 && <p className="text-sm gp-text-muted py-6 text-center">No hay recetas asignadas en este rango de fechas.</p>}
      </div>
    </div>
  );
}
