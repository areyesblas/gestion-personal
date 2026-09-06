import React, { useState, useEffect, useMemo } from "react";
import { supabase } from "./supabaseClient";
import * as XLSX from "xlsx";
import {
  LayoutDashboard, FolderKanban, CheckSquare, Wallet, AlertTriangle,
  Users, Activity, Plus, X, Trash2, Pencil, Github, ChevronDown,
  ChevronRight, Bell, Lightbulb, Rocket, MessageCircle, Mail, Globe,
  Target, Contact, BarChart3, FileText, Flame, HeartPulse, Check, Menu, PieChart as PieChartIcon,
  PiggyBank, Camera, Film, Upload, MapPin, Clock, Mic, Gift, Receipt, Megaphone, ChevronUp, Gem, Download, Sun, Moon,
} from "lucide-react";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  PieChart, Pie, Cell, LineChart, Line,
} from "recharts";

/* ---------- estilos y tokens ---------- */
const Tokens = ({ tema = "oscuro" }) => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@500;600;700&family=IBM+Plex+Sans:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap');
    .gp-root{ --bg:#0B2341; --panel:#12304F; --panel-hi:#1A3D63; --border:#234A70;
      --text:#EAF1FA; --muted:#93A7C4; --gold:#F59E0B; --teal:#22C55E; --red:#EF4444;
      background:var(--bg); color:var(--text); font-family:'IBM Plex Sans',sans-serif; }
    .gp-root.claro{ --bg:#E8F1FB; --panel:#F7FBFF; --panel-hi:#DCEAFA; --border:#C3D9EE;
      --text:#0B2341; --muted:#5B7A9E; --gold:#F59E0B; --teal:#16A34A; --red:#DC2626; }
    .gp-serif{ font-family:'Poppins',sans-serif; font-weight:600; }
    .gp-mono{ font-family:'IBM Plex Mono',monospace; }
    .gp-panel{ background:var(--panel); border:1px solid var(--border); border-radius:6px; }
    .gp-panel-hi:hover{ background:var(--panel-hi); }
    .gp-border{ border-color:var(--border); }
    .gp-input{ background:var(--bg); border:1px solid var(--border); color:var(--text);
      border-radius:4px; padding:6px 10px; font-size:13px; width:100%; }
    .gp-input:focus{ outline:1px solid var(--gold); border-color:var(--gold); }
    .gp-btn{ background:var(--gold); color:#161822; font-weight:600; border-radius:4px; }
    .gp-btn:hover{ opacity:.9; }
    .gp-btn-ghost{ background:transparent; border:1px solid var(--border); color:var(--text); border-radius:4px; }
    .gp-btn-ghost:hover{ background:var(--panel-hi); }
    .gp-navitem{ color:var(--muted); border-radius:4px; }
    .gp-navitem:hover{ background:var(--panel-hi); color:var(--text); }
    .gp-navitem-active{ background:var(--panel-hi); color:var(--text); border-left:2px solid var(--gold); }
    .gp-dot-teal{ background:var(--teal); } .gp-dot-red{ background:var(--red); } .gp-dot-gold{ background:var(--gold); }
    .gp-text-muted{ color:var(--muted); }
    .gp-text-gold{ color:var(--gold); } .gp-text-teal{ color:var(--teal); } .gp-text-red{ color:var(--red); }
    table.gp-table{ border-collapse:collapse; width:100%; font-size:13px; }
    table.gp-table th{ text-align:left; color:var(--muted); font-weight:500; padding:8px 10px; border-bottom:1px solid var(--border); font-size:11px; letter-spacing:.02em; }
    table.gp-table td{ padding:8px 10px; border-bottom:1px solid var(--border); vertical-align:top; }
    table.gp-table tr:hover td{ background:var(--panel-hi); }
    .gp-badge{ display:inline-block; padding:2px 8px; border-radius:3px; font-size:11px; font-weight:500; }
    .gp-scroll::-webkit-scrollbar{ width:6px; height:6px; }
    .gp-scroll::-webkit-scrollbar-thumb{ background:var(--border); border-radius:3px; }
  `}</style>
);

// Recuerda tu tema (Azul Claro / Azul Oscuro) entre visitas, guardado en este navegador
// y, una vez que inicias sesión, también en tu cuenta (para que te siga en otros dispositivos).
function useTema() {
  const [tema, setTemaState] = useState(() => {
    try { return localStorage.getItem("arkeyone-tema") || "oscuro"; } catch { return "oscuro"; }
  });
  const setTema = (valor) => {
    setTemaState(valor);
    try { localStorage.setItem("arkeyone-tema", valor); } catch {}
  };
  const toggleTema = () => setTema(tema === "oscuro" ? "claro" : "oscuro");
  return [tema, toggleTema, setTema];
}


/* ---------- datos base ---------- */
const CATS = ["Fundación", "Software", "Música", "Renta", "Marketing", "Chatbots", "Personal", "Otro"];
const ESTATUS_PROYECTO = ["Idea", "En validación", "En desarrollo", "Activo", "Finalizado", "Pausado", "Archivado"];
const MODO_PROYECTO = ["Finito", "Continuo"];
const MONETIZACION = ["Dinero", "Especie", "Intercambio", "No genera dinero"];
const PRIORIDADES = ["Alta", "Media", "Baja"];
const ESTATUS_TAREA = ["Pendiente", "En progreso", "Hecho"];
const TIPO_FIN = ["Ingreso", "Egreso"];
const FORMA_PAGO = ["Efectivo", "Transferencia", "Especie", "Intercambio"];
const OCASIONES_REGALO = ["Cumpleaños", "Navidad", "Aniversario", "Felicitación", "Otro"];
const ESTATUS_REGALO = ["Por comprar", "Comprado", "Envuelto", "Entregado"];
const PARENTESCOS = ["Papá", "Mamá", "Hermano/a", "Hijo/a", "Esposo/a", "Abuelo/a", "Tío/a", "Primo/a", "Sobrino/a", "Cuñado/a", "Suegro/a", "Compadre/Comadre", "Amigo cercano", "Conocido"];
const TIPO_FACTURA = ["Emitida", "Recibida"];
const ESTATUS_FACTURA = ["Pendiente", "Pagada", "Cancelada"];
const TASA_IVA = 0.16;
const PLATAFORMAS_CAMPANA = ["Meta", "Google Ads", "TikTok", "Email", "Orgánico", "Otro"];
const ESTATUS_CAMPANA = ["Planeada", "Activa", "Pausada", "Finalizada"];
const CATEGORIAS_PATRIMONIO = ["Inmueble", "Auto", "Joyería", "Equipo de audio", "Electrónica", "Muebles", "Otro"];
const FRECUENCIA = ["Semanal", "Quincenal", "Mensual", "Anual"];
const TIPO_ACTIVIDAD = ["Gym", "Evento", "Capacitación", "Otro"];
const TIPO_ACTIVO = ["Dominio", "Hosting", "Marca (IMPI)", "Red social", "Otro"];
const ESTATUS_META = ["No iniciada", "En progreso", "Cumplida"];
const PLATAFORMAS = ["Facebook", "Instagram", "TikTok", "YouTube", "WhatsApp Business"];
const TIPO_DOCUMENTO = ["Contrato", "Registro de marca (IMPI)", "Acta constitutiva", "Otro"];

const seed = () => ({
  proyectos: [
    { id: "p1", nombre: "Fundación María Roberta Blas Martínez", categoria: "Fundación", estatus: "Activo", monetizacion: "No genera dinero", descripcion: "Iniciativa de apoyo social/comunitario.", github: "", githubSubido: false, notas: [] },
    { id: "p2", nombre: "ARKeyData", categoria: "Software", estatus: "En desarrollo", monetizacion: "Dinero", descripcion: "Plataforma de control y automatización de software.", github: "", githubSubido: false, notas: [] },
    { id: "p3", nombre: "Armoniq", categoria: "Música", estatus: "En desarrollo", monetizacion: "Dinero", descripcion: "Canciones personalizadas generadas con IA (Suno).", github: "", githubSubido: false, notas: [] },
    { id: "p4", nombre: "Angel Rey (proyecto musical)", categoria: "Música", estatus: "Activo", monetizacion: "Dinero", descripcion: "Proyecto musical personal, artista de música regional mexicana.", github: "", githubSubido: false, notas: [] },
    { id: "p5", nombre: "Escápate YA", categoria: "Renta", estatus: "Activo", monetizacion: "Dinero", descripcion: "Renta a corto plazo de departamento en Acapulco.", github: "", githubSubido: false, notas: [] },
    { id: "p6", nombre: "AI Marketing Agency", categoria: "Marketing", estatus: "En desarrollo", monetizacion: "Dinero", descripcion: "Agencia de servicios de marketing con IA.", github: "", githubSubido: false, notas: [] },
    { id: "p7", nombre: "ChatBot creation service", categoria: "Chatbots", estatus: "En desarrollo", monetizacion: "Dinero", descripcion: "Servicio de desarrollo de chatbots.", github: "", githubSubido: false, notas: [] },
  ],
  pendientes: [],
  equipo: [],
  finanzas: [],
  deudas: [],
  actividades: [],
  activos: [],
  metas: [],
  contactos: [],
  redesMetricas: [],
  documentos: [],
  habitos: [],
  salud: [],
  perfilSalud: { alturaCm: "" },
});

const uid = () => (crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2, 10) + Date.now().toString(36));
const fmtMoney = (n) => (Number(n) || 0).toLocaleString("es-MX", { style: "currency", currency: "MXN" });
const todayISO = () => new Date().toISOString().slice(0, 10);
const daysUntil = (dateStr) => Math.ceil((new Date(dateStr) - new Date(todayISO())) / 86400000);
// Días que faltan para el próximo cumpleaños (a partir de una fecha de nacimiento cualquiera).
const diasParaCumple = (fechaNacimiento) => {
  if (!fechaNacimiento) return null;
  const hoy = new Date(todayISO());
  const nac = new Date(fechaNacimiento);
  let proximo = new Date(hoy.getFullYear(), nac.getMonth(), nac.getDate());
  if (proximo < hoy) proximo = new Date(hoy.getFullYear() + 1, nac.getMonth(), nac.getDate());
  return Math.round((proximo - hoy) / 86400000);
};

const PRIORIDAD_ORDEN = { Alta: 0, Media: 1, Baja: 2 };

/* Ordena una lista según una clave de criterio ("campo:tipo"), con nulls siempre al final. */
function ordenarLista(lista, criterio, campos, dir = "asc") {
  if (!criterio || criterio === "default" || !campos[criterio]) return lista;
  const { get, tipo } = campos[criterio];
  const copia = [...lista];
  copia.sort((a, b) => {
    const va = get(a);
    const vb = get(b);
    const aVacio = va === null || va === undefined || va === "";
    const bVacio = vb === null || vb === undefined || vb === "";
    if (aVacio && bVacio) return 0;
    if (aVacio) return 1;
    if (bVacio) return -1;
    let r;
    if (tipo === "texto") r = String(va).localeCompare(String(vb), "es");
    else if (tipo === "prioridad") r = (PRIORIDAD_ORDEN[va] ?? 9) - (PRIORIDAD_ORDEN[vb] ?? 9);
    else r = va < vb ? -1 : va > vb ? 1 : 0;
    return dir === "desc" ? -r : r;
  });
  return copia;
}

/* Encabezado de tabla clicable para ordenar (como en Excel): clic ordena asc, clic de
   nuevo invierte a desc. sortKey debe existir en el mismo objeto `campos` que usa OrdenSelector. */
function Th({ label, sortKey, orden, ordenDir, onToggle, children }) {
  if (!sortKey) return <th>{children || label}</th>;
  const activo = orden === sortKey;
  return (
    <th onClick={() => onToggle(sortKey)} style={{ cursor: "pointer", userSelect: "none" }} title="Clic para ordenar">
      <span className="inline-flex items-center gap-0.5">
        {children || label}
        {activo && (ordenDir === "desc" ? <ChevronDown size={11} /> : <ChevronUp size={11} />)}
      </span>
    </th>
  );
}

/* Selector de orden reutilizable. `opciones` es [{ key, label }]. */
function OrdenSelector({ opciones, value, onChange }) {
  if (!opciones || opciones.length === 0) return null;
  return (
    <select
      className="gp-input text-xs py-1.5"
      style={{ width: "auto" }}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      aria-label="Ordenar por"
    >
      <option value="default">Orden: más reciente</option>
      {opciones.map((o) => <option key={o.key} value={o.key}>Orden: {o.label}</option>)}
    </select>
  );
}

/* Bitácora universal: comentarios + adjuntos (fotos/audio/video/documentos) para cualquier entidad. */
function Bitacora({ data, entidadTipo, entidadId, onAdd, onRemove }) {
  const [texto, setTexto] = useState("");
  const [subiendo, setSubiendo] = useState(false);
  const [adjuntosNuevos, setAdjuntosNuevos] = useState([]);
  const [error, setError] = useState("");

  const comentarios = (data.comentarios || [])
    .filter((c) => c.entidadTipo === entidadTipo && c.entidadId === entidadId)
    .sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));

  const iconoTipo = (t) => t === "video" ? <Film size={11} /> : t === "audio" ? <Mic size={11} /> : t === "imagen" ? <Camera size={11} /> : <FileText size={11} />;

  const handleFiles = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    setError("");
    setSubiendo(true);
    const nuevos = [];
    for (const file of files) {
      if (file.size > 25 * 1024 * 1024) { setError(`"${file.name}" pesa más de 25 MB, se omitió.`); continue; }
      const path = `${entidadTipo}/${entidadId}/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
      const { error: upErr } = await supabase.storage.from("adjuntos").upload(path, file);
      if (upErr) { setError(`No se pudo subir "${file.name}": ${upErr.message}`); continue; }
      const { data: pub } = supabase.storage.from("adjuntos").getPublicUrl(path);
      const tipo = file.type.startsWith("image/") ? "imagen" : file.type.startsWith("video/") ? "video" : file.type.startsWith("audio/") ? "audio" : "documento";
      nuevos.push({ tipo, nombre: file.name, url: pub.publicUrl });
    }
    setAdjuntosNuevos((prev) => [...prev, ...nuevos]);
    setSubiendo(false);
  };

  const enviar = () => {
    if (!texto.trim() && adjuntosNuevos.length === 0) return;
    onAdd({ entidadTipo, entidadId, texto: texto.trim(), adjuntos: adjuntosNuevos });
    setTexto("");
    setAdjuntosNuevos([]);
  };

  return (
    <div>
      <p className="text-xs font-medium mb-2 gp-text-muted">Comentarios y adjuntos</p>
      <div className="space-y-1.5 mb-2 max-h-56 overflow-y-auto gp-scroll">
        {comentarios.map((c) => (
          <div key={c.id} className="text-xs gp-panel p-2">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1">
                {c.texto && <p>{c.texto}</p>}
                {c.adjuntos?.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-1">
                    {c.adjuntos.map((a, i) => (
                      <a key={i} href={a.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 gp-text-gold">
                        {iconoTipo(a.tipo)} {a.nombre.length > 16 ? a.nombre.slice(0, 16) + "…" : a.nombre}
                      </a>
                    ))}
                  </div>
                )}
                <p className="gp-mono gp-text-muted mt-1" style={{ fontSize: "10px" }}>{c.createdAt ? new Date(c.createdAt).toLocaleString("es-MX") : ""}</p>
              </div>
              <button onClick={() => onRemove(c.id)} className="gp-text-red shrink-0">✕</button>
            </div>
          </div>
        ))}
        {comentarios.length === 0 && <p className="text-xs gp-text-muted">Sin comentarios todavía.</p>}
      </div>
      <textarea className="gp-input" rows={2} placeholder="Escribe un comentario…" value={texto} onChange={(e) => setTexto(e.target.value)} />
      <div className="flex items-center justify-between mt-2 gap-2 flex-wrap">
        <input type="file" accept="image/*,video/*,audio/*,.pdf,.doc,.docx" multiple onChange={handleFiles} className="text-xs gp-text-muted" disabled={subiendo} style={{ maxWidth: 190 }} />
        <button className="gp-btn-ghost px-3 py-1.5 text-xs" disabled={subiendo} onClick={enviar}>Agregar</button>
      </div>
      {subiendo && <p className="text-xs gp-text-muted mt-1">Subiendo…</p>}
      {error && <p className="text-xs gp-text-red mt-1">{error}</p>}
      {adjuntosNuevos.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {adjuntosNuevos.map((a, i) => (
            <span key={i} className="text-xs gp-text-teal flex items-center gap-1 gp-panel px-2 py-1">
              {iconoTipo(a.tipo)} {a.nombre.length > 16 ? a.nombre.slice(0, 16) + "…" : a.nombre}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

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

/* ---------- persistencia relacional ---------- */
const TABLES = ["proyectos", "pendientes", "equipo", "finanzas", "deudas", "actividades", "activos", "metas", "contactos", "redesMetricas", "documentos", "habitos", "salud", "apartados", "eventos", "comentarios", "saldoInicial", "regalos", "facturas", "campanas", "patrimonio", "patrimonioValuaciones"];
const OLD_STORAGE_KEY = "gestion_personal_data"; // localStorage, versión muy vieja
const OLD_BLOB_TABLE = "gestion_data"; // tabla única jsonb, versión anterior a este modelo relacional

const camelToSnake = (s) => s.replace(/[A-Z]/g, (c) => "_" + c.toLowerCase());
const snakeToCamel = (s) => s.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
const tableName = (key) => camelToSnake(key);

const ETIQUETA_TABLA = {
  proyectos: "Proyecto", pendientes: "Pendiente", equipo: "Equipo", finanzas: "Movimiento financiero",
  deudas: "Deuda", actividades: "Actividad", activos: "Activo digital", metas: "Meta",
  contactos: "Contacto", redesMetricas: "Métrica de red social", documentos: "Documento",
  habitos: "Hábito", salud: "Registro de salud", apartados: "Apartado", eventos: "Evento",
  comentarios: "Comentario", saldoInicial: "Saldo inicial", regalos: "Regalo",
  facturas: "Factura", campanas: "Campaña", patrimonio: "Bien patrimonial",
  patrimonioValuaciones: "Valuación de patrimonio",
};

// Exporta toda la información visible del usuario a un archivo Excel, un módulo por hoja.
// Respeta lo que cada quien puede ver: si eres colaborador con acceso limitado, `data` ya
// viene filtrado por la base de datos, así que el archivo solo trae lo que sí te toca ver.
function exportarExcel(data, nombreCuenta) {
  const wb = XLSX.utils.book_new();
  const camposInternos = ["id", "userId", "deletedAt"];

  for (const key of TABLES) {
    const filas = data[key] || [];
    if (filas.length === 0) continue;
    const limpias = filas.map((item) => {
      const out = {};
      for (const [k, v] of Object.entries(item)) {
        if (camposInternos.includes(k)) continue;
        out[k] = typeof v === "object" && v !== null ? JSON.stringify(v) : v;
      }
      return out;
    });
    const hoja = XLSX.utils.json_to_sheet(limpias);
    const nombreHoja = (ETIQUETA_TABLA[key] || key).slice(0, 31);
    XLSX.utils.book_append_sheet(wb, hoja, nombreHoja);
  }

  if (wb.SheetNames.length === 0) {
    alert("Todavía no tienes datos para exportar.");
    return;
  }
  const fecha = todayISO();
  XLSX.writeFile(wb, `arkeyone_${nombreCuenta || "mis-datos"}_${fecha}.xlsx`);
}


function labelFor(key, item) {
  switch (key) {
    case "proyectos": case "equipo": case "actividades": case "activos": case "contactos":
    case "documentos": case "apartados": case "eventos": case "campanas": case "patrimonio":
    case "habitos":
      return item.nombre || "(sin nombre)";
    case "pendientes": case "metas": case "regalos":
      return item.descripcion || "(sin descripción)";
    case "finanzas":
      return item.concepto || item.categoria || "(sin concepto)";
    case "deudas":
      return item.acreedor || "(sin acreedor)";
    case "redesMetricas":
      return item.plataforma || "(sin plataforma)";
    case "salud":
      return `Registro del ${item.fecha || "—"}`;
    case "comentarios":
      return (item.texto || "Adjunto").slice(0, 60);
    case "saldoInicial":
      return `Punto de partida del ${item.fecha || "—"}`;
    case "facturas":
      return item.folio || item.concepto || "(sin folio)";
    case "patrimonioValuaciones":
      return `Valuación del ${item.fecha || "—"}`;
    default:
      return item.id;
  }
}


function rowToJs(row) {
  const out = {};
  for (const [k, v] of Object.entries(row)) {
    out[snakeToCamel(k)] = v;
  }
  return out;
}
function jsToRow(obj) {
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    if (k === "createdAt") continue; // el servidor lo controla (default now()), nunca se reescribe desde el cliente
    // "" no es un valor válido para columnas numéricas/fecha en Postgres — se manda null en su lugar.
    out[camelToSnake(k)] = v === "" ? null : v;
  }
  return out;
}
// la tabla "salud" guarda el PDF adjunto como dos columnas planas en vez de un objeto anidado
function saludToRow(s) {
  const { estudio, ...rest } = s;
  const row = jsToRow(rest);
  row.estudio_nombre = estudio?.nombre || null;
  row.estudio_url = estudio?.url || null;
  return row;
}
function rowToSalud(row) {
  const { estudioNombre, estudioUrl, ...rest } = rowToJs(row);
  return { ...rest, estudio: estudioNombre ? { nombre: estudioNombre, url: estudioUrl } : null };
}
const toRow = (key, obj) => (key === "salud" ? saludToRow(obj) : jsToRow(obj));
const fromRow = (key, row) => (key === "salud" ? rowToSalud(row) : rowToJs(row));

async function fetchTable(key, ownerId) {
  const { data, error } = await supabase.from(tableName(key)).select("*").eq("user_id", ownerId).is("deleted_at", null).order("created_at", { ascending: true });
  if (error) { console.error(`Error al leer ${tableName(key)}:`, error); return []; }
  return data.map((row) => fromRow(key, row));
}
async function fetchPapelera(ownerId) {
  const entries = await Promise.all(TABLES.map(async (key) => {
    const { data, error } = await supabase.from(tableName(key)).select("*").eq("user_id", ownerId).not("deleted_at", "is", null).order("deleted_at", { ascending: false });
    if (error) { console.error(`Error al leer papelera de ${tableName(key)}:`, error); return [key, []]; }
    return [key, data.map((row) => fromRow(key, row))];
  }));
  return Object.fromEntries(entries);
}

async function loadAllTables(ownerId) {
  const entries = await Promise.all(TABLES.map(async (key) => [key, await fetchTable(key, ownerId)]));
  const result = Object.fromEntries(entries);
  const { data: perfilRow } = await supabase.from("perfil_salud").select("*").eq("user_id", ownerId).limit(1).maybeSingle();
  result.perfilSalud = { alturaCm: perfilRow?.altura_cm ?? "" };
  return result;
}

// migración única desde la versión anterior (un solo blob jsonb), solo si las tablas nuevas están vacías
async function migrateFromOldBlobIfNeeded(current, ownerId) {
  const allEmpty = TABLES.every((k) => current[k].length === 0);
  if (!allEmpty) return current;
  try {
    const { data: blobRow } = await supabase.from(OLD_BLOB_TABLE).select("data").eq("id", "main").maybeSingle();
    const blob = blobRow?.data;
    if (!blob) return current;
    for (const key of TABLES) {
      for (const item of blob[key] || []) {
        const { error } = await supabase.from(tableName(key)).insert(toRow(key, item));
        if (error) console.error(`Error migrando ${key}:`, error);
      }
    }
    if (blob.perfilSalud?.alturaCm) {
      await supabase.from("perfil_salud").upsert({ altura_cm: blob.perfilSalud.alturaCm }, { onConflict: "user_id" });
    }
    return await loadAllTables(ownerId);
  } catch (e) {
    console.error("No se pudo migrar desde la versión anterior:", e);
    return current;
  }
}

/* ---------- UI genéricos ---------- */
function Badge({ children, tone = "muted" }) {
  const toneStyle = {
    muted: { color: "var(--muted)", background: "rgba(141,146,163,.12)" },
    gold: { color: "var(--gold)", background: "rgba(201,162,39,.14)" },
    teal: { color: "var(--teal)", background: "rgba(79,168,143,.14)" },
    red: { color: "var(--red)", background: "rgba(209,85,74,.14)" },
  }[tone];
  return <span className="gp-badge" style={toneStyle}>{children}</span>;
}

function IconBtn({ onClick, children, title }) {
  return (
    <button onClick={onClick} title={title}
      className="p-1.5 rounded gp-btn-ghost" style={{ lineHeight: 0 }}>
      {children}
    </button>
  );
}

function Field({ label, children }) {
  return (
    <label className="block mb-3">
      <span className="block text-xs gp-text-muted mb-1">{label}</span>
      {children}
    </label>
  );
}

// Campo de captura de dinero: mientras escribes, va formateando con $ y comas (como una app de banco).
// Por dentro sigue guardando un número plano (ej. "1234.5") para no romper nada de la base de datos;
// solo lo que se VE en pantalla lleva el formato.
function MoneyInput({ value, onChange, className = "gp-input", placeholder, autoFocus, style }) {
  const digitsFromValue = (val) => {
    if (val === "" || val === null || val === undefined) return "";
    const n = Math.round((Number(val) || 0) * 100);
    return Number.isFinite(n) ? String(n) : "";
  };
  const [digits, setDigits] = useState(() => digitsFromValue(value));

  // Si el valor cambia desde afuera (ej. al abrir el modal con datos ya existentes), lo reflejamos.
  useEffect(() => { setDigits(digitsFromValue(value)); }, [value]);

  const formatted = digits === "" ? "" : ((Number(digits) || 0) / 100).toLocaleString("es-MX", { style: "currency", currency: "MXN" });

  const handleChange = (e) => {
    const soloDigitos = e.target.value.replace(/[^\d]/g, "");
    const limpio = soloDigitos.replace(/^0+(?=\d)/, "");
    setDigits(limpio);
    onChange(limpio === "" ? "" : (Number(limpio) / 100).toString());
  };

  return (
    <input
      type="text"
      inputMode="decimal"
      autoFocus={autoFocus}
      className={className}
      style={style}
      placeholder={placeholder}
      value={formatted}
      onChange={handleChange}
    />
  );
}

function Modal({ title, onClose, children }) {
  const [tocado, setTocado] = useState(false);
  const [confirmando, setConfirmando] = useState(false);

  const intentarCerrar = () => {
    if (tocado) setConfirmando(true);
    else onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,.55)" }} onClick={intentarCerrar}>
      <div
        className="gp-panel w-full max-w-lg max-h-[85vh] overflow-y-auto gp-scroll p-5"
        onClick={(e) => e.stopPropagation()}
        onInputCapture={() => setTocado(true)}
        onChangeCapture={() => setTocado(true)}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="gp-serif text-lg">{title}</h3>
          <IconBtn onClick={intentarCerrar}><X size={16} /></IconBtn>
        </div>
        {children}

        {confirmando && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,.5)" }} onClick={(e) => e.stopPropagation()}>
            <div className="gp-panel w-full max-w-xs p-4">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle size={15} className="gp-text-gold" />
                <p className="text-sm font-medium">¿Descartar cambios?</p>
              </div>
              <p className="text-xs gp-text-muted mb-4">Hiciste cambios que no has guardado. Si sales ahora, se pierden.</p>
              <div className="flex gap-2">
                <button onClick={() => setConfirmando(false)} className="gp-btn-ghost flex-1 py-1.5 text-xs">Seguir editando</button>
                <button onClick={onClose} className="flex-1 py-1.5 text-xs rounded" style={{ background: "var(--red)", color: "#fff" }}>Descartar</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ---------- login ---------- */
// Evalúa la fortaleza de una contraseña (0 a 4) y qué requisitos le faltan.
function evaluarPassword(pw) {
  const criterios = {
    largo: pw.length >= 8,
    mayuscula: /[A-Z]/.test(pw),
    minuscula: /[a-z]/.test(pw),
    numero: /[0-9]/.test(pw),
    especial: /[^A-Za-z0-9]/.test(pw),
  };
  const cumplidos = Object.values(criterios).filter(Boolean).length;
  const cumpleMinimo = criterios.largo && criterios.mayuscula && criterios.minuscula && criterios.numero;
  return { criterios, cumplidos, cumpleMinimo };
}

function MedidorPassword({ password }) {
  const { criterios, cumplidos } = evaluarPassword(password);
  if (!password) return null;
  const nivel = cumplidos <= 2 ? "Débil" : cumplidos <= 4 ? "Media" : "Fuerte";
  const color = cumplidos <= 2 ? "var(--red)" : cumplidos <= 4 ? "var(--gold)" : "var(--teal)";
  return (
    <div className="mb-3">
      <div className="flex gap-1 mb-1">
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="h-1 rounded flex-1" style={{ background: i < cumplidos ? color : "var(--border)" }} />
        ))}
      </div>
      <p className="text-xs" style={{ color }}>{nivel}</p>
      <p className="text-xs gp-text-muted mt-1">
        Mínimo 8 caracteres, con mayúscula, minúscula y número
        {criterios.especial ? " (y un carácter especial — bien)" : ""}.
      </p>
    </div>
  );
}

const AVISO_PRIVACIDAD = `
**Última actualización:** ${todayISO()}

**Responsable:** ArkeyOne (operado por ARKeyData) es responsable del tratamiento de tus datos personales conforme a la Ley Federal de Protección de Datos Personales en Posesión de los Particulares (México).

**Contacto:** privacidad@arkeyone.com

**1. Datos que recabamos**
Recabamos los datos que tú mismo capturas al usar el sistema: información de proyectos, finanzas, contactos, salud, y demás módulos que decidas utilizar. También recabamos tu correo electrónico y contraseña (encriptada) para tu cuenta, y datos técnicos básicos (fecha de registro, último acceso).

**2. Para qué usamos tus datos**
- Darte acceso a tu cuenta y a la información que tú mismo capturaste.
- Enviarte correos operativos (confirmación de cuenta, recuperación de contraseña, alertas que actives).
- Mejorar el funcionamiento del sistema.
No vendemos ni compartimos tu información con terceros para fines de publicidad.

**3. Aislamiento y confidencialidad**
Tu información está técnicamente aislada de la de cualquier otro usuario mediante reglas de seguridad a nivel de base de datos (Row Level Security). Ni otros usuarios, ni — salvo causa justificada de soporte técnico, con tu conocimiento — el equipo de ArkeyOne, acceden de forma rutinaria a tu información de negocio (finanzas, contactos, salud, etc.).

**4. Terceros que nos ayudan a operar**
Usamos los siguientes proveedores para operar el servicio, cada uno con sus propias políticas de privacidad:
- **Supabase** (base de datos y autenticación)
- **Resend** (envío de correos)
- **Netlify** (hospedaje del sitio)

**5. Tus derechos (ARCO)**
Tienes derecho a Acceder, Rectificar, Cancelar y Oponerte al tratamiento de tus datos personales. Puedes exportar toda tu información en cualquier momento desde el botón "Exportar mis datos" dentro del sistema, o solicitar la eliminación completa de tu cuenta escribiendo a privacidad@arkeyone.com.

**6. Menores de edad**
Este servicio no está dirigido a menores de 18 años.

**7. Cambios a este aviso**
Podemos actualizar este aviso de privacidad. Te notificaremos cambios importantes por correo o dentro del sistema.
`.trim();

const TERMINOS_CONDICIONES = `
**Última actualización:** ${todayISO()}

**1. Aceptación**
Al crear una cuenta en ArkeyOne, aceptas estos Términos y Condiciones y el Aviso de Privacidad.

**2. Qué es ArkeyOne**
ArkeyOne es un sistema de gestión personal y de negocio (proyectos, finanzas, contactos, salud, y más) que organiza tu información en un solo lugar.

**3. Tu cuenta**
Eres responsable de la confidencialidad de tu contraseña y de toda actividad realizada desde tu cuenta. Debes proporcionar información veraz al registrarte.

**4. Uso permitido**
No debes usar ArkeyOne para actividades ilegales, para almacenar contenido que viole derechos de terceros, ni para intentar vulnerar la seguridad del sistema.

**5. Tu información**
La información que capturas es tuya. Puedes exportarla en cualquier momento (botón "Exportar mis datos") y solicitar la eliminación de tu cuenta cuando quieras.

**6. Colaboradores**
Si invitas a otras personas a tu cuenta con permisos específicos, eres responsable de las acciones que realicen dentro de los módulos a los que les diste acceso.

**7. Disponibilidad del servicio**
Hacemos nuestro mejor esfuerzo por mantener el servicio disponible, pero no garantizamos disponibilidad ininterrumpida. No somos responsables por pérdidas derivadas de interrupciones del servicio ajenas a nuestro control (fallas de terceros, caso fortuito, fuerza mayor).

**8. Planes y pagos**
Actualmente ArkeyOne se ofrece de forma gratuita durante su etapa de prueba. Si en el futuro se introducen planes de pago, se te notificará con anticipación y podrás decidir si continuar.

**9. Cancelación**
Puedes cancelar tu cuenta en cualquier momento. Nos reservamos el derecho de suspender cuentas que violen estos términos.

**10. Limitación de responsabilidad**
ArkeyOne se ofrece "tal cual". No somos responsables por decisiones de negocio, financieras o de salud que tomes con base en la información capturada en el sistema — el sistema es una herramienta de organización, no un sustituto de asesoría profesional (contable, legal, médica o financiera).

**11. Ley aplicable**
Estos términos se rigen por las leyes de los Estados Unidos Mexicanos.

**12. Contacto**
Dudas o solicitudes: contacto@arkeyone.com
`.trim();

// Convierte el texto en negritas **así** a <strong>, y separa párrafos — sin dependencias externas.
function renderLegalText(texto) {
  return texto.split("\n\n").map((parrafo, i) => {
    const partes = parrafo.split(/(\*\*[^*]+\*\*)/g);
    return (
      <p key={i} className="text-sm mb-4 leading-relaxed">
        {partes.map((parte, j) =>
          parte.startsWith("**") && parte.endsWith("**")
            ? <strong key={j}>{parte.slice(2, -2)}</strong>
            : parte
        )}
      </p>
    );
  });
}

function DocumentoLegal({ titulo, texto, onVolver, tema }) {
  return (
    <div className={`gp-root ${tema === "claro" ? "claro" : ""}`} style={{ minHeight: "100vh" }}>
      <Tokens tema={tema} />
      <div className="max-w-2xl mx-auto p-6">
        <button onClick={onVolver} className="text-xs gp-text-gold mb-4">← Regresar</button>
        <h1 className="gp-serif text-2xl mb-6">{titulo}</h1>
        {renderLegalText(texto)}
      </div>
    </div>
  );
}


function LoginScreen({ tema, toggleTema }) {
  const [modo, setModo] = useState("entrar"); // "entrar" | "crear" | "recuperar"
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [avisoRegistro, setAvisoRegistro] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setAvisoRegistro("");
    setLoading(true);

    if (modo === "entrar") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      setLoading(false);
      if (error) setError("Correo o contraseña incorrectos.");
      return;
    }

    if (modo === "recuperar") {
      const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin });
      setLoading(false);
      if (error) { setError("No se pudo enviar el correo. Intenta de nuevo."); return; }
      setAvisoRegistro("Si ese correo tiene una cuenta, te acabamos de mandar un enlace para restablecer tu contraseña. Revisa tu bandeja (y spam).");
      return;
    }

    // crear cuenta
    const { cumpleMinimo } = evaluarPassword(password);
    if (!cumpleMinimo) {
      setLoading(false);
      setError("La contraseña necesita mínimo 8 caracteres, con mayúscula, minúscula y número.");
      return;
    }
    if (password !== confirmPassword) {
      setLoading(false);
      setError("Las contraseñas no coinciden.");
      return;
    }
    const { data, error } = await supabase.auth.signUp({ email, password });
    setLoading(false);
    if (error) { setError(error.message === "User already registered" ? "Ese correo ya tiene una cuenta." : "No se pudo crear la cuenta."); return; }
    if (data.session) return; // quedó logueado directo (confirmación de correo desactivada)
    if (data.user && data.user.identities && data.user.identities.length === 0) {
      // Supabase no manda error explícito para no revelar qué correos existen — esta es la señal real.
      setError("Ese correo ya tiene una cuenta. Intenta iniciar sesión.");
      return;
    }
    setAvisoRegistro("Cuenta creada. Revisa tu correo para confirmarla antes de entrar.");
  };

  return (
    <div className={`gp-root flex items-center justify-center ${tema === "claro" ? "claro" : ""}`} style={{ minHeight: "100vh" }}>
      <Tokens tema={tema} />
      <form onSubmit={handleSubmit} className="gp-panel p-6 w-full max-w-sm relative">
        <button type="button" onClick={toggleTema} className="absolute top-4 right-4 gp-btn-ghost p-1.5 rounded" aria-label="Cambiar tema" title={tema === "claro" ? "Cambiar a Azul Oscuro" : "Cambiar a Azul Claro"}>
          {tema === "claro" ? <Moon size={14} /> : <Sun size={14} />}
        </button>
        <img src="/logo-arkeyone.png" alt="ArkeyOne" style={{ height: 44 }} className="mb-3" />
        <p className="text-xs gp-text-muted mb-4">
          {modo === "entrar" ? "Inicia sesión para entrar a tu sistema." : modo === "crear" ? "Crea tu cuenta." : "Te mandamos un enlace para poner una contraseña nueva."}
        </p>

        {modo !== "recuperar" && (
          <div className="flex gap-1 mb-4">
            <button type="button" onClick={() => { setModo("entrar"); setError(""); setAvisoRegistro(""); }} className={`text-xs px-3 py-1.5 rounded-full border flex-1 ${modo === "entrar" ? "gp-btn" : "gp-text-muted"}`}>Iniciar sesión</button>
            <button type="button" onClick={() => { setModo("crear"); setError(""); setAvisoRegistro(""); }} className={`text-xs px-3 py-1.5 rounded-full border flex-1 ${modo === "crear" ? "gp-btn" : "gp-text-muted"}`}>Crear cuenta</button>
          </div>
        )}

        <Field label="Correo"><input type="email" required className="gp-input" value={email} onChange={(e) => setEmail(e.target.value)} /></Field>
        {modo !== "recuperar" && (
          <Field label="Contraseña"><input type="password" required className="gp-input" value={password} onChange={(e) => setPassword(e.target.value)} /></Field>
        )}
        {modo === "crear" && <MedidorPassword password={password} />}
        {modo === "crear" && (
          <Field label="Confirmar contraseña"><input type="password" required className="gp-input" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} /></Field>
        )}
        {modo === "entrar" && (
          <button type="button" onClick={() => { setModo("recuperar"); setError(""); setAvisoRegistro(""); }} className="text-xs gp-text-gold mb-3 -mt-1">¿Olvidaste tu contraseña?</button>
        )}
        {error && <p className="text-xs gp-text-red mb-3">{error}</p>}
        {avisoRegistro && <p className="text-xs gp-text-teal mb-3">{avisoRegistro}</p>}
        <button type="submit" disabled={loading} className="gp-btn w-full py-2 text-sm mt-1">
          {loading ? "Un momento…" : modo === "entrar" ? "Entrar" : modo === "crear" ? "Crear cuenta" : "Enviar enlace de recuperación"}
        </button>
        {modo === "recuperar" && (
          <button type="button" onClick={() => { setModo("entrar"); setError(""); setAvisoRegistro(""); }} className="text-xs gp-text-muted w-full text-center mt-3">← Regresar a iniciar sesión</button>
        )}
      </form>
    </div>
  );
}

function NuevaPasswordScreen({ onListo, tema }) {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [listo, setListo] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    const { cumpleMinimo } = evaluarPassword(password);
    if (!cumpleMinimo) { setError("La contraseña necesita mínimo 8 caracteres, con mayúscula, minúscula y número."); return; }
    if (password !== confirmPassword) { setError("Las contraseñas no coinciden."); return; }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) { setError("No se pudo actualizar la contraseña. Intenta de nuevo."); return; }
    setListo(true);
  };

  return (
    <div className={`gp-root flex items-center justify-center ${tema === "claro" ? "claro" : ""}`} style={{ minHeight: "100vh" }}>
      <Tokens tema={tema} />
      <div className="gp-panel p-6 w-full max-w-sm">
        <img src="/logo-arkeyone.png" alt="ArkeyOne" style={{ height: 44 }} className="mb-3" />
        {listo ? (
          <>
            <p className="text-sm mb-4">Tu contraseña ya se actualizó. Ya puedes seguir usando tu cuenta con la nueva.</p>
            <button onClick={onListo} className="gp-btn w-full py-2 text-sm">Continuar</button>
          </>
        ) : (
          <form onSubmit={handleSubmit}>
            <p className="text-xs gp-text-muted mb-4">Pon tu contraseña nueva.</p>
            <Field label="Contraseña nueva"><input type="password" required className="gp-input" value={password} onChange={(e) => setPassword(e.target.value)} /></Field>
            <MedidorPassword password={password} />
            <Field label="Confirmar contraseña"><input type="password" required className="gp-input" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} /></Field>
            {error && <p className="text-xs gp-text-red mb-3">{error}</p>}
            <button type="submit" disabled={loading} className="gp-btn w-full py-2 text-sm mt-1">{loading ? "Un momento…" : "Guardar contraseña nueva"}</button>
          </form>
        )}
      </div>
    </div>
  );
}

/* ---------- app (portero de sesión) ---------- */
// Pantalla de bienvenida (~5 seg) que se ve al abrir la app, antes de mostrar login o el sistema.
// Es puramente visual — la sesión se carga en paralelo mientras esto se muestra.
function SplashScreen({ tema, fadingOut }) {
  return (
    <div
      className={`gp-root fixed inset-0 z-[100] flex items-center justify-center ${tema === "claro" ? "claro" : ""}`}
      style={{ transition: "opacity .4s ease", opacity: fadingOut ? 0 : 1 }}
    >
      <Tokens tema={tema} />
      <style>{`
        @keyframes splashLogoIn { from { opacity:0; transform:scale(.9) translateY(6px);} to { opacity:1; transform:scale(1) translateY(0);} }
        @keyframes splashTaglineIn { from { opacity:0; transform:translateY(4px);} to { opacity:1; transform:translateY(0);} }
        @keyframes splashBarFill { from { width:0%;} to { width:100%;} }
        .splash-logo{ animation: splashLogoIn .6s cubic-bezier(.16,1,.3,1) both; }
        .splash-tagline{ animation: splashTaglineIn .5s ease .5s both; }
        .splash-bar-track{ width:140px; height:3px; border-radius:999px; background:var(--border); overflow:hidden; margin-top:22px; }
        .splash-bar-fill{ height:100%; background:var(--gold); animation: splashBarFill 4.2s cubic-bezier(.4,0,.2,1) .5s both; border-radius:999px; }
      `}</style>
      <div className="flex flex-col items-center">
        <img src="/logo-arkeyone.png" alt="ArkeyOne" className="splash-logo" style={{ height: 56 }} />
        <p className="splash-tagline text-xs gp-text-muted mt-3 tracking-wide">Alinea tu vida, impúlsala</p>
        <div className="splash-bar-track"><div className="splash-bar-fill" /></div>
      </div>
    </div>
  );
}

export default function App() {
  const [session, setSession] = useState(undefined); // undefined = cargando, null = sin sesión
  const [recuperando, setRecuperando] = useState(false);
  const [tema, toggleTema, setTema] = useTema();
  const [showSplash, setShowSplash] = useState(true);
  const [splashFadingOut, setSplashFadingOut] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: listener } = supabase.auth.onAuthStateChange((event, newSession) => {
      if (event === "PASSWORD_RECOVERY") setRecuperando(true);
      setSession(newSession);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  // El splash dura ~5 seg fijos, sin importar qué tan rápido cargue la sesión (que corre en paralelo arriba).
  useEffect(() => {
    const fadeTimer = setTimeout(() => setSplashFadingOut(true), 4600);
    const hideTimer = setTimeout(() => setShowSplash(false), 5000);
    return () => { clearTimeout(fadeTimer); clearTimeout(hideTimer); };
  }, []);

  if (showSplash) {
    return <SplashScreen tema={tema} fadingOut={splashFadingOut} />;
  }

  if (session === undefined) {
    return (
      <div className={`gp-root min-h-screen flex items-center justify-center ${tema === "claro" ? "claro" : ""}`}>
        <Tokens tema={tema} />
        <p className="gp-text-muted text-sm">Cargando…</p>
      </div>
    );
  }
  if (recuperando) return <NuevaPasswordScreen onListo={() => setRecuperando(false)} tema={tema} toggleTema={toggleTema} />;
  if (!session) return <LoginScreen tema={tema} toggleTema={toggleTema} />;
  return <AppLoggedIn session={session} tema={tema} toggleTema={toggleTema} setTema={setTema} />;
}

const VIEW_TO_MODULO = {
  proyectos: "proyectos", metas: "metas", pendientes: "pendientes",
  finanzas: "finanzas", facturas: "facturas", deudas: "deudas", apartados: "apartados",
  patrimonio: "patrimonio", activos: "activos", documentos: "documentos",
  equipo: "equipo", contactos: "contactos", regalos: "regalos",
  redes: "redes_metricas", marketing: "campanas",
  actividades: "actividades", eventos: "eventos", habitos: "habitos", salud: "salud",
};

function AppLoggedIn({ session, tema, toggleTema, setTema }) {
  const misId = session.user.id;
  const miEmail = session.user.email;
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState("dashboard");
  const [regalosFiltroContacto, setRegalosFiltroContacto] = useState("");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null); // { key, id, label }
  const [activeOwnerId, setActiveOwnerId] = useState(misId);
  const [activeOwnerEmail, setActiveOwnerEmail] = useState(miEmail);
  const [modulosPermitidos, setModulosPermitidos] = useState(null); // null = soy el dueño, acceso total
  const [misColaboraciones, setMisColaboraciones] = useState([]);

  useEffect(() => {
    (async () => {
      await supabase.rpc("vincular_invitaciones");
      const { data: colabs } = await supabase.from("colaboradores").select("*").eq("colaborador_user_id", misId).eq("estatus", "Activo");
      setMisColaboraciones((colabs || []).map((c) => ({ propietarioId: c.propietario_id, propietarioEmail: c.propietario_email, modulos: c.modulos })));

      const { data: pref } = await supabase.from("preferencias").select("tema").eq("user_id", misId).maybeSingle();
      if (pref?.tema && pref.tema !== tema) setTema(pref.tema);

      let result = await loadAllTables(misId);
      result = await migrateFromOldBlobIfNeeded(result, misId);
      // Nota: ya no se siembran proyectos de ejemplo en cuentas nuevas — esto era correcto
      // cuando la app era solo para Angel, pero con registro abierto (SaaS) sembrarle a un
      // desconocido los proyectos personales de Angel no tiene sentido, y además los ids
      // fijos ("p1".."p7") chocarían con los que ya existen en la cuenta de Angel.
      setData(result);
      setLoading(false);
    })();
  }, []);

  const cambiarTema = async (nuevoValor) => {
    setTema(nuevoValor);
    await supabase.from("preferencias").upsert({ user_id: misId, tema: nuevoValor }, { onConflict: "user_id" });
  };

  const cambiarCuenta = async (ownerId, ownerEmail, modulos) => {
    setLoading(true);
    setActiveOwnerId(ownerId);
    setActiveOwnerEmail(ownerEmail);
    setModulosPermitidos(modulos); // null = tu propia cuenta
    const result = await loadAllTables(ownerId);
    setData(result);
    setView(modulos ? Object.keys(VIEW_TO_MODULO).find((v) => modulos.includes(VIEW_TO_MODULO[v])) || "dashboard" : "dashboard");
    setLoading(false);
  };

  const addItem = async (key, item) => {
    const newItem = { ...item, id: uid(), userId: activeOwnerId };
    const { error } = await supabase.from(tableName(key)).insert(toRow(key, newItem));
    if (error) { console.error(`Error al guardar en ${tableName(key)}:`, error); alert("No se pudo guardar. Revisa tu conexión a internet."); return; }
    setData((prev) => ({ ...prev, [key]: [...prev[key], newItem] }));
  };
  const editItem = async (key, id, patch) => {
    const { error } = await supabase.from(tableName(key)).update(toRow(key, patch)).eq("id", id);
    if (error) { console.error(`Error al actualizar ${tableName(key)}:`, error); alert("No se pudo guardar el cambio."); return; }
    setData((prev) => ({ ...prev, [key]: prev[key].map((i) => (i.id === id ? { ...i, ...patch } : i)) }));
  };
  const removeItem = async (key, id) => {
    const { error } = await supabase.from(tableName(key)).update({ deleted_at: new Date().toISOString() }).eq("id", id);
    if (error) { console.error(`Error al borrar en ${tableName(key)}:`, error); alert("No se pudo borrar."); return; }
    setData((prev) => ({ ...prev, [key]: prev[key].filter((i) => i.id !== id) }));
  };
  const restoreItem = async (key, id) => {
    const { error } = await supabase.from(tableName(key)).update({ deleted_at: null }).eq("id", id);
    if (error) { console.error(`Error al restaurar en ${tableName(key)}:`, error); alert("No se pudo restaurar."); return false; }
    const fresh = await fetchTable(key, activeOwnerId);
    setData((prev) => ({ ...prev, [key]: fresh }));
    return true;
  };
  const permanentDelete = async (key, id) => {
    const { error } = await supabase.from(tableName(key)).delete().eq("id", id);
    if (error) { console.error(`Error al borrar definitivamente en ${tableName(key)}:`, error); alert("No se pudo borrar definitivamente."); return false; }
    return true;
  };
  const askDelete = (key, id) => setConfirmDelete({ key, id });
  const updatePerfilSalud = async (patch) => {
    const { error } = await supabase.from("perfil_salud").upsert({ altura_cm: patch.alturaCm || null }, { onConflict: "user_id" });
    if (error) { console.error("Error al guardar tu estatura:", error); return; }
    setData((prev) => ({ ...prev, perfilSalud: { ...(prev.perfilSalud || {}), ...patch } }));
  };
  const moverFondosApartado = async (apartado, { monto, proyectoId, concepto, nuevoMontoActual }) => {
    await editItem("apartados", apartado.id, { montoActual: nuevoMontoActual });
    await addItem("finanzas", {
      concepto,
      tipo: "Ingreso",
      proyectoId: proyectoId || "",
      contactoId: "",
      fecha: todayISO(),
      monto: String(monto),
      categoria: "Movimiento de apartado",
      forma: "Transferencia",
      estatus: "Cobrado",
      pautando: false,
      esRecurrente: false,
      frecuencia: "Mensual",
      fechaFin: "",
    });
  };

  if (loading || !data) {
    return (
      <div className={`gp-root min-h-screen flex items-center justify-center ${tema === "claro" ? "claro" : ""}`}>
        <Tokens tema={tema} />
        <p className="gp-text-muted text-sm">Cargando tu sistema…</p>
      </div>
    );
  }

  const navGroups = [
    { label: "General", items: [
      { id: "dashboard", label: "Panorama", icon: LayoutDashboard },
      { id: "proyectos", label: "Proyectos e ideas", icon: FolderKanban },
      { id: "metas", label: "Metas por proyecto", icon: Target },
      { id: "pendientes", label: "Pendientes", icon: CheckSquare },
    ]},
    { label: "Dinero", items: [
      { id: "finanzas", label: "Ingresos y egresos", icon: Wallet },
      { id: "facturas", label: "Facturas e IVA", icon: Receipt },
      { id: "reportes", label: "Reportes", icon: PieChartIcon },
      { id: "deudas", label: "Deudas", icon: AlertTriangle },
      { id: "apartados", label: "Apartados", icon: PiggyBank },
      { id: "patrimonio", label: "Patrimonio", icon: Gem },
      { id: "activos", label: "Activos digitales", icon: Globe },
      { id: "documentos", label: "Legal y contratos", icon: FileText },
    ]},
    { label: "Gente", items: [
      { id: "equipo", label: "Equipo", icon: Users },
      { id: "contactos", label: "Contactos", icon: Contact },
      { id: "regalos", label: "Regalos", icon: Gift },
    ]},
    { label: "Presencia", items: [
      { id: "redes", label: "Redes sociales", icon: BarChart3 },
      { id: "marketing", label: "Marketing", icon: Megaphone },
    ]},
    { label: "Vida", items: [
      { id: "actividades", label: "Actividades y vida", icon: Activity },
      { id: "eventos", label: "Eventos", icon: Camera },
      { id: "habitos", label: "Hábitos", icon: Flame },
      { id: "salud", label: "Salud", icon: HeartPulse },
    ]},
  ];

  const navGroupsFiltrados = modulosPermitidos === null
    ? navGroups
    : navGroups
        .map((g) => ({ ...g, items: g.items.filter((it) => VIEW_TO_MODULO[it.id] && modulosPermitidos.includes(VIEW_TO_MODULO[it.id])) }))
        .filter((g) => g.items.length > 0);

  return (
    <div className={`gp-root overflow-hidden ${tema === "claro" ? "claro" : ""}`} style={{ minHeight: "100vh" }}>
      <Tokens tema={tema} />
      <div className="flex relative" style={{ minHeight: "100vh" }}>
        {/* barra superior solo en móvil */}
        <div className="md:hidden fixed top-0 left-0 right-0 z-30 flex items-center justify-between px-4 py-3 border-b gp-border" style={{ background: "var(--bg)" }}>
          <button onClick={() => setMobileNavOpen(true)} className="p-2 -ml-2 gp-btn-ghost rounded" aria-label="Abrir menú">
            <Menu size={20} />
          </button>
          <img src="/icono-arkeyone.png" alt="ArkeyOne" style={{ height: 28 }} />
          <button onClick={() => supabase.auth.signOut()} className="text-xs gp-text-muted px-2 py-1">Salir</button>
        </div>

        {/* fondo oscuro al abrir el cajón en móvil */}
        {mobileNavOpen && (
          <div className="md:hidden fixed inset-0 z-40" style={{ background: "rgba(0,0,0,.6)" }} onClick={() => setMobileNavOpen(false)} />
        )}

        {/* rail lateral / cajón */}
        <div
          className={`w-64 md:w-56 shrink-0 border-r gp-border p-4 flex flex-col gap-4 overflow-y-auto gp-scroll fixed md:static inset-y-0 left-0 z-50 md:z-auto transition-transform duration-200 ${mobileNavOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}`}
          style={{ maxHeight: "100vh", background: "var(--bg)" }}
        >
          <div className="px-2 flex items-start justify-between">
            <div>
              <img src="/logo-arkeyone.png" alt="ArkeyOne" style={{ height: 32 }} className="mb-1" />
              <p className="text-xs gp-text-muted truncate" style={{ maxWidth: 160 }}>
                {activeOwnerId === misId ? miEmail : `Viendo: ${activeOwnerEmail}`}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => supabase.auth.signOut()} title="Cerrar sesión" className="text-xs gp-text-muted gp-btn-ghost px-2 py-1 rounded hidden md:inline-block">Salir</button>
              <button onClick={() => setMobileNavOpen(false)} className="md:hidden p-1 gp-btn-ghost rounded" aria-label="Cerrar menú"><X size={16} /></button>
            </div>
          </div>

          {misColaboraciones.length > 0 && (
            <div className="px-2">
              <select
                className="gp-input text-xs w-full"
                value={activeOwnerId}
                onChange={(e) => {
                  if (e.target.value === misId) cambiarCuenta(misId, miEmail, null);
                  else {
                    const c = misColaboraciones.find((x) => x.propietarioId === e.target.value);
                    cambiarCuenta(c.propietarioId, c.propietarioEmail, c.modulos);
                  }
                }}
              >
                <option value={misId}>Mi cuenta</option>
                {misColaboraciones.map((c) => (
                  <option key={c.propietarioId} value={c.propietarioId}>Cuenta de {c.propietarioEmail}</option>
                ))}
              </select>
            </div>
          )}

          {navGroupsFiltrados.map((g) => (
            <div key={g.label}>
              <p className="text-xs gp-text-muted px-3 mb-1">{g.label}</p>
              <div className="flex flex-col gap-0.5">
                {g.items.map((n) => (
                  <button key={n.id} onClick={() => { setView(n.id); setMobileNavOpen(false); }}
                    className={`gp-navitem flex items-center gap-2 px-3 py-2.5 md:py-2 text-sm text-left ${view === n.id ? "gp-navitem-active" : ""}`}>
                    <n.icon size={15} /> {n.label}
                  </button>
                ))}
              </div>
            </div>
          ))}
          <div className="mt-auto pt-2 border-t gp-border flex flex-col gap-0.5">
            <button onClick={() => cambiarTema(tema === "claro" ? "oscuro" : "claro")} className="gp-navitem flex items-center gap-2 px-3 py-2.5 md:py-2 text-sm text-left w-full">
              {tema === "claro" ? <Moon size={15} /> : <Sun size={15} />} {tema === "claro" ? "Tema Azul Oscuro" : "Tema Azul Claro"}
            </button>
            <button onClick={() => exportarExcel(data, activeOwnerId === misId ? "mi-cuenta" : activeOwnerEmail?.split("@")[0])}
              className="gp-navitem flex items-center gap-2 px-3 py-2.5 md:py-2 text-sm text-left w-full">
              <Download size={15} /> Exportar mis datos
            </button>
            {activeOwnerId === misId && (
              <>
                <button onClick={() => { setView("colaboradores"); setMobileNavOpen(false); }}
                  className={`gp-navitem flex items-center gap-2 px-3 py-2.5 md:py-2 text-sm text-left w-full ${view === "colaboradores" ? "gp-navitem-active" : ""}`}>
                  <Users size={15} /> Colaboradores
                </button>
                <button onClick={() => { setView("papelera"); setMobileNavOpen(false); }}
                  className={`gp-navitem flex items-center gap-2 px-3 py-2.5 md:py-2 text-sm text-left w-full ${view === "papelera" ? "gp-navitem-active" : ""}`}>
                  <Trash2 size={15} /> Papelera
                </button>
              </>
            )}
          </div>
        </div>

        {/* contenido */}
        <div className="flex-1 p-4 pt-16 md:p-6 md:pt-6 overflow-y-auto gp-scroll w-full" style={{ maxHeight: "100vh" }}>
          {view === "dashboard" && <Dashboard data={data} setView={setView} onAddSaldo={(i) => addItem("saldoInicial", i)} />}
          {view === "papelera" && <Papelera onRestore={restoreItem} onPermanentDelete={permanentDelete} ownerId={activeOwnerId} />}
          {view === "colaboradores" && <Colaboradores misId={misId} miEmail={miEmail} />}
          {view === "proyectos" && (
            <Proyectos data={data} onAdd={(i) => addItem("proyectos", i)} onEdit={(id, p) => editItem("proyectos", id, p)} onRemove={(id) => askDelete("proyectos", id)} onAddComentario={(i) => addItem("comentarios", i)} onRemoveComentario={(id) => askDelete("comentarios", id)} />
          )}
          {view === "metas" && (
            <Metas data={data} onAdd={(i) => addItem("metas", i)} onEdit={(id, p) => editItem("metas", id, p)} onRemove={(id) => askDelete("metas", id)} />
          )}
          {view === "pendientes" && (
            <Pendientes data={data} onAdd={(i) => addItem("pendientes", i)} onEdit={(id, p) => editItem("pendientes", id, p)} onRemove={(id) => askDelete("pendientes", id)} onAddComentario={(i) => addItem("comentarios", i)} onRemoveComentario={(id) => askDelete("comentarios", id)} />
          )}
          {view === "finanzas" && (
            <Finanzas data={data} onAdd={(i) => addItem("finanzas", i)} onEdit={(id, p) => editItem("finanzas", id, p)} onRemove={(id) => askDelete("finanzas", id)} />
          )}
          {view === "facturas" && (
            <Facturas data={data} onAdd={(i) => addItem("facturas", i)} onEdit={(id, p) => editItem("facturas", id, p)} onRemove={(id) => askDelete("facturas", id)} onAddComentario={(i) => addItem("comentarios", i)} onRemoveComentario={(id) => askDelete("comentarios", id)} />
          )}
          {view === "reportes" && <Reportes data={data} />}
          {view === "deudas" && (
            <Deudas data={data} onAdd={(i) => addItem("deudas", i)} onEdit={(id, p) => editItem("deudas", id, p)} onRemove={(id) => askDelete("deudas", id)} />
          )}
          {view === "apartados" && (
            <Apartados data={data} onAdd={(i) => addItem("apartados", i)} onEdit={(id, p) => editItem("apartados", id, p)} onRemove={(id) => askDelete("apartados", id)} onMoverFondos={moverFondosApartado} />
          )}
          {view === "patrimonio" && (
            <Patrimonio data={data} onAdd={(i) => addItem("patrimonio", i)} onEdit={(id, p) => editItem("patrimonio", id, p)} onRemove={(id) => askDelete("patrimonio", id)} onAddValuacion={(i) => addItem("patrimonioValuaciones", i)} onRemoveValuacion={(id) => askDelete("patrimonioValuaciones", id)} onAddComentario={(i) => addItem("comentarios", i)} onRemoveComentario={(id) => askDelete("comentarios", id)} />
          )}
          {view === "documentos" && (
            <Documentos data={data} onAdd={(i) => addItem("documentos", i)} onEdit={(id, p) => editItem("documentos", id, p)} onRemove={(id) => askDelete("documentos", id)} />
          )}
          {view === "equipo" && (
            <Equipo data={data} onAdd={(i) => addItem("equipo", i)} onEdit={(id, p) => editItem("equipo", id, p)} onRemove={(id) => askDelete("equipo", id)} />
          )}
          {view === "contactos" && (
            <Contactos data={data} onAdd={(i) => addItem("contactos", i)} onEdit={(id, p) => editItem("contactos", id, p)} onRemove={(id) => askDelete("contactos", id)} onAddComentario={(i) => addItem("comentarios", i)} onRemoveComentario={(id) => askDelete("comentarios", id)} onVerRegalos={(c) => { setRegalosFiltroContacto(c.id); setView("regalos"); }} />
          )}
          {view === "regalos" && (
            <Regalos data={data} onAdd={(i) => addItem("regalos", i)} onEdit={(id, p) => editItem("regalos", id, p)} onRemove={(id) => askDelete("regalos", id)} filtroContactoInicial={regalosFiltroContacto} onLimpiarFiltro={() => setRegalosFiltroContacto("")} />
          )}
          {view === "redes" && (
            <RedesSociales data={data} onAdd={(i) => addItem("redesMetricas", i)} onEdit={(id, p) => editItem("redesMetricas", id, p)} onRemove={(id) => askDelete("redesMetricas", id)} />
          )}
          {view === "marketing" && (
            <Marketing data={data} onAdd={(i) => addItem("campanas", i)} onEdit={(id, p) => editItem("campanas", id, p)} onRemove={(id) => askDelete("campanas", id)} onAddComentario={(i) => addItem("comentarios", i)} onRemoveComentario={(id) => askDelete("comentarios", id)} />
          )}
          {view === "actividades" && (
            <Actividades data={data} onAdd={(i) => addItem("actividades", i)} onEdit={(id, p) => editItem("actividades", id, p)} onRemove={(id) => askDelete("actividades", id)} />
          )}
          {view === "eventos" && (
            <Eventos data={data} onAdd={(i) => addItem("eventos", i)} onEdit={(id, p) => editItem("eventos", id, p)} onRemove={(id) => askDelete("eventos", id)} onAddComentario={(i) => addItem("comentarios", i)} onRemoveComentario={(id) => askDelete("comentarios", id)} />
          )}
          {view === "habitos" && (
            <Habitos data={data} onAdd={(i) => addItem("habitos", i)} onEdit={(id, p) => editItem("habitos", id, p)} onRemove={(id) => askDelete("habitos", id)} />
          )}
          {view === "salud" && (
            <Salud data={data} onAdd={(i) => addItem("salud", i)} onEdit={(id, p) => editItem("salud", id, p)} onRemove={(id) => askDelete("salud", id)} onUpdatePerfil={updatePerfilSalud} />
          )}
          {view === "activos" && (
            <ActivosDigitales data={data} onAdd={(i) => addItem("activos", i)} onEdit={(id, p) => editItem("activos", id, p)} onRemove={(id) => askDelete("activos", id)} />
          )}
        </div>
      </div>

      {confirmDelete && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,.6)" }} onClick={() => setConfirmDelete(null)}>
          <div className="gp-panel w-full max-w-sm p-5" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle size={16} className="gp-text-red" />
              <h3 className="gp-serif text-lg">¿Eliminar esto?</h3>
            </div>
            <p className="text-sm gp-text-muted mb-5">Esta acción no se puede deshacer.</p>
            <div className="flex gap-2">
              <button onClick={() => setConfirmDelete(null)} className="gp-btn-ghost flex-1 py-2 text-sm">Cancelar</button>
              <button
                onClick={() => { removeItem(confirmDelete.key, confirmDelete.id); setConfirmDelete(null); }}
                className="flex-1 py-2 text-sm rounded"
                style={{ background: "var(--red)", color: "#fff" }}
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------- Dashboard ---------- */
/* ---------- Papelera (recuperar o borrar definitivamente) ---------- */
/* ---------- Colaboradores (invitar gente a tu cuenta, con permisos por módulo) ---------- */
function Colaboradores({ misId, miEmail }) {
  const [lista, setLista] = useState(null);
  const [modal, setModal] = useState(false);
  const [busy, setBusy] = useState(null);
  const [revocarConfirm, setRevocarConfirm] = useState(null);

  const cargar = async () => {
    setLista(null);
    const { data, error } = await supabase.from("colaboradores").select("*").eq("propietario_id", misId).order("created_at", { ascending: false });
    if (error) { console.error("Error al cargar colaboradores:", error); setLista([]); return; }
    setLista(data);
  };
  useEffect(() => { cargar(); }, []);

  const invitar = async ({ correo, modulos }) => {
    setBusy("nuevo");
    const modulosSnake = modulos.map((k) => tableName(k));
    // "comentarios" siempre viene incluido si se dio acceso a cualquier módulo, para que vean la bitácora.
    if (modulosSnake.length && !modulosSnake.includes("comentarios")) modulosSnake.push("comentarios");
    // las valuaciones de patrimonio van junto con el módulo de patrimonio.
    if (modulos.includes("patrimonio") && !modulosSnake.includes("patrimonio_valuaciones")) modulosSnake.push("patrimonio_valuaciones");
    const { error } = await supabase.from("colaboradores").insert({
      propietario_id: misId, propietario_email: miEmail,
      colaborador_email: correo.trim().toLowerCase(), modulos: modulosSnake, estatus: "Pendiente",
    });
    setBusy(null);
    if (error) { alert("No se pudo invitar: " + error.message); return; }
    setModal(false);
    cargar();
  };

  const revocar = async (id) => {
    setBusy(id);
    const { error } = await supabase.from("colaboradores").update({ estatus: "Revocado" }).eq("id", id);
    setBusy(null);
    if (error) { alert("No se pudo revocar."); return; }
    setRevocarConfirm(null);
    cargar();
  };

  const reactivar = async (id) => {
    setBusy(id);
    const { error } = await supabase.from("colaboradores").update({ estatus: "Activo" }).eq("id", id);
    setBusy(null);
    if (error) { alert("No se pudo reactivar."); return; }
    cargar();
  };

  const toneEstatus = { Activo: "teal", Pendiente: "gold", Revocado: "red" };

  return (
    <div>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-1">
        <h2 className="gp-serif text-2xl">Colaboradores</h2>
        <button onClick={() => setModal(true)} className="gp-btn flex items-center justify-center gap-1 px-3 py-1.5 text-sm w-full sm:w-auto"><Plus size={14} /> Invitar</button>
      </div>
      <p className="text-sm gp-text-muted mb-6">Invita por correo a alguien (tu contador, un asistente) y elige exactamente qué módulos puede ver y editar dentro de tu cuenta.</p>

      {lista === null && <p className="text-sm gp-text-muted">Cargando…</p>}
      {lista !== null && lista.length === 0 && <p className="text-sm gp-text-muted">Aún no has invitado a nadie.</p>}

      {lista !== null && lista.length > 0 && (
        <div className="space-y-2">
          {lista.map((c) => (
            <div key={c.id} className="gp-panel p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium truncate">{c.colaborador_email}</span>
                    <Badge tone={toneEstatus[c.estatus]}>{c.estatus}</Badge>
                  </div>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {(c.modulos || []).filter((m) => m !== "comentarios").map((m) => {
                      const key = Object.keys(ETIQUETA_TABLA).find((k) => tableName(k) === m);
                      return <Badge key={m} tone="muted">{key ? ETIQUETA_TABLA[key] : m}</Badge>;
                    })}
                  </div>
                </div>
                <div className="flex gap-1 shrink-0">
                  {c.estatus === "Revocado" ? (
                    <button disabled={busy === c.id} onClick={() => reactivar(c.id)} className="gp-btn-ghost px-3 py-1.5 text-xs">Reactivar</button>
                  ) : (
                    <button disabled={busy === c.id} onClick={() => setRevocarConfirm(c)} className="px-3 py-1.5 text-xs rounded" style={{ background: "var(--red)", color: "#fff" }}>Revocar</button>
                  )}
                </div>
              </div>
              {c.estatus === "Pendiente" && <p className="text-xs gp-text-muted mt-2">Se activa solo, en cuanto esa persona cree su cuenta o inicie sesión con ese correo.</p>}
            </div>
          ))}
        </div>
      )}

      {revocarConfirm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,.6)" }} onClick={() => setRevocarConfirm(null)}>
          <div className="gp-panel w-full max-w-sm p-5" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-2 mb-2"><AlertTriangle size={16} className="gp-text-red" /><h3 className="gp-serif text-lg">¿Revocar acceso?</h3></div>
            <p className="text-sm gp-text-muted mb-5">{revocarConfirm.colaborador_email} ya no va a poder ver ni editar nada de tu cuenta. Puedes reactivarlo después si quieres.</p>
            <div className="flex gap-2">
              <button onClick={() => setRevocarConfirm(null)} className="gp-btn-ghost flex-1 py-2 text-sm">Cancelar</button>
              <button onClick={() => revocar(revocarConfirm.id)} className="flex-1 py-2 text-sm rounded" style={{ background: "var(--red)", color: "#fff" }}>Revocar</button>
            </div>
          </div>
        </div>
      )}

      {modal && (
        <Modal title="Invitar colaborador" onClose={() => setModal(false)}>
          <InvitarForm busy={busy === "nuevo"} onSave={invitar} />
        </Modal>
      )}
    </div>
  );
}

function InvitarForm({ onSave, busy }) {
  const [correo, setCorreo] = useState("");
  const [modulos, setModulos] = useState([]);
  const [error, setError] = useState("");

  const toggle = (key) => setModulos((prev) => prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]);

  return (
    <div>
      <Field label="Correo de la persona"><input type="email" className="gp-input" value={correo} onChange={(e) => setCorreo(e.target.value)} /></Field>
      <p className="text-xs gp-text-muted mb-2">¿Qué puede ver y editar?</p>
      <div className="grid grid-cols-2 gap-1.5 mb-4 max-h-56 overflow-y-auto gp-scroll">
        {TABLES.filter((k) => k !== "comentarios" && k !== "patrimonioValuaciones").map((k) => (
          <label key={k} className="flex items-center gap-1.5 text-xs">
            <input type="checkbox" checked={modulos.includes(k)} onChange={() => toggle(k)} />
            {ETIQUETA_TABLA[k] || k}
          </label>
        ))}
      </div>
      {error && <p className="text-xs gp-text-red mb-2">{error}</p>}
      <button
        className="gp-btn w-full py-2 text-sm mt-1 disabled:opacity-50"
        disabled={busy}
        onClick={() => {
          if (!correo.trim() || !correo.includes("@")) { setError("Captura un correo válido."); return; }
          if (modulos.length === 0) { setError("Elige al menos un módulo."); return; }
          setError("");
          onSave({ correo, modulos });
        }}
      >
        {busy ? "Invitando…" : "Invitar"}
      </button>
    </div>
  );
}


function Papelera({ onRestore, onPermanentDelete, ownerId }) {
  const [items, setItems] = useState(null); // null = cargando
  const [busyId, setBusyId] = useState(null);
  const [confirmarBorrar, setConfirmarBorrar] = useState(null); // { key, id, label }

  const cargar = async () => {
    setItems(null);
    const resultado = await fetchPapelera(ownerId);
    const plano = [];
    for (const key of TABLES) {
      for (const item of resultado[key] || []) {
        plano.push({ key, item });
      }
    }
    plano.sort((a, b) => (b.item.deletedAt || "").localeCompare(a.item.deletedAt || ""));
    setItems(plano);
  };

  useEffect(() => { cargar(); }, []);

  const restaurar = async (key, id) => {
    setBusyId(id);
    const ok = await onRestore(key, id);
    if (ok) setItems((prev) => prev.filter((x) => x.item.id !== id));
    setBusyId(null);
  };

  const borrarDefinitivo = async () => {
    const { key, id } = confirmarBorrar;
    setBusyId(id);
    const ok = await onPermanentDelete(key, id);
    if (ok) setItems((prev) => prev.filter((x) => x.item.id !== id));
    setBusyId(null);
    setConfirmarBorrar(null);
  };

  return (
    <div>
      <h2 className="gp-serif text-2xl mb-1">Papelera</h2>
      <p className="text-sm gp-text-muted mb-6">Todo lo que has eliminado, de cualquier módulo. Puedes recuperarlo o borrarlo definitivamente.</p>

      {items === null && <p className="text-sm gp-text-muted">Cargando…</p>}

      {items !== null && items.length === 0 && (
        <p className="text-sm gp-text-muted">La papelera está vacía.</p>
      )}

      {items !== null && items.length > 0 && (
        <div className="space-y-2">
          {items.map(({ key, item }) => (
            <div key={`${key}-${item.id}`} className="gp-panel p-3 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge tone="muted">{ETIQUETA_TABLA[key] || key}</Badge>
                  <span className="text-sm truncate">{labelFor(key, item)}</span>
                </div>
                <p className="text-xs gp-text-muted mt-1">Eliminado el {item.deletedAt ? new Date(item.deletedAt).toLocaleString("es-MX") : "—"}</p>
              </div>
              <div className="flex gap-2 shrink-0">
                <button disabled={busyId === item.id} onClick={() => restaurar(key, item.id)} className="gp-btn-ghost px-3 py-1.5 text-xs">Restaurar</button>
                <button disabled={busyId === item.id} onClick={() => setConfirmarBorrar({ key, id: item.id, label: labelFor(key, item) })} className="px-3 py-1.5 text-xs rounded" style={{ background: "var(--red)", color: "#fff" }}>Borrar definitivo</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {confirmarBorrar && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,.6)" }} onClick={() => setConfirmarBorrar(null)}>
          <div className="gp-panel w-full max-w-sm p-5" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle size={16} className="gp-text-red" />
              <h3 className="gp-serif text-lg">¿Borrar para siempre?</h3>
            </div>
            <p className="text-sm gp-text-muted mb-5">"{confirmarBorrar.label}" se va a borrar por completo. Esto ya no se puede deshacer, ni siquiera desde la papelera.</p>
            <div className="flex gap-2">
              <button onClick={() => setConfirmarBorrar(null)} className="gp-btn-ghost flex-1 py-2 text-sm">Cancelar</button>
              <button onClick={borrarDefinitivo} className="flex-1 py-2 text-sm rounded" style={{ background: "var(--red)", color: "#fff" }}>Borrar para siempre</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Dashboard({ data, setView, onAddSaldo }) {
  const [saldoModal, setSaldoModal] = useState(false);
  const saldo = calcularSaldo(data);
  const mesActual = todayISO().slice(0, 7);
  const ledgerMesActual = useMemo(() => buildMonthlyLedger(data.finanzas, [mesActual]), [data.finanzas, mesActual]);
  const ingresos = ledgerMesActual.filter((f) => f.tipo === "Ingreso").reduce((s, f) => s + f.monto, 0);
  const egresos = ledgerMesActual.filter((f) => f.tipo === "Egreso").reduce((s, f) => s + f.monto, 0);
  const deudasAtrasadas = data.deudas.filter((d) => daysUntil(d.fechaVencimiento) < 0);
  const deudasProximas = data.deudas.filter((d) => { const dd = daysUntil(d.fechaVencimiento); return dd >= 0 && dd <= 7; });
  const pendientesProximos = data.pendientes
    .filter((p) => p.estatus !== "Hecho" && p.fechaLimite && daysUntil(p.fechaLimite) <= 7)
    .sort((a, b) => new Date(a.fechaLimite) - new Date(b.fechaLimite));
  const activosVencidos = (data.activos || []).filter((a) => daysUntil(a.fechaVencimiento) < 0);
  const activosProximos = (data.activos || []).filter((a) => { const dd = daysUntil(a.fechaVencimiento); return dd >= 0 && dd <= 14; });
  const docsProximos = (data.documentos || []).filter((d) => d.fechaVencimiento && daysUntil(d.fechaVencimiento) <= 14);
  const activos = data.proyectos.filter((p) => p.estatus === "Activo").length;
  const ideas = data.proyectos.filter((p) => p.estatus === "Idea").length;
  const sinGithub = data.proyectos.filter((p) => !p.githubSubido);
  const cobrosPendientes = data.finanzas
    .filter((f) => f.tipo === "Ingreso" && f.estatus === "Pendiente")
    .sort((a, b) => (a.fechaVencimiento || "9999").localeCompare(b.fechaVencimiento || "9999"));
  const totalCobrosPendientes = cobrosPendientes.reduce((s, f) => s + (Number(f.monto) || 0), 0);

  const monthKeysAmplios = useMemo(() => lastNMonthKeys(120), []); // ventana amplia (10 años) para acumulados "de siempre"
  const ledgerAmplio = useMemo(() => buildMonthlyLedger(data.finanzas, monthKeysAmplios), [data.finanzas, monthKeysAmplios]);
  const gananciaPorProyecto = data.proyectos.map((p) => {
    const propios = ledgerAmplio.filter((f) => f.proyectoId === p.id);
    const ing = propios.filter((f) => f.tipo === "Ingreso").reduce((s, f) => s + f.monto, 0);
    const eg = propios.filter((f) => f.tipo === "Egreso").reduce((s, f) => s + f.monto, 0);
    return { nombre: p.nombre, neto: ing - eg };
  }).filter((p) => p.neto !== 0).sort((a, b) => b.neto - a.neto);

  // avance general: pendientes hechos + metas cumplidas, de todo el sistema
  const pendientesTotal = data.pendientes.length;
  const pendientesHechos = data.pendientes.filter((p) => p.estatus === "Hecho").length;
  const metasTotal = data.metas.length;
  const metasCumplidas = data.metas.filter((m) => m.estatus === "Cumplida").length;
  const pctPendientes = pendientesTotal ? Math.round((pendientesHechos / pendientesTotal) * 100) : 0;
  const pctMetas = metasTotal ? Math.round((metasCumplidas / metasTotal) * 100) : 0;

  // avance por proyecto: % de pendientes hechos, de los proyectos activos con al menos un pendiente
  const avancePorProyecto = data.proyectos
    .filter((p) => p.estatus === "Activo" || p.estatus === "En desarrollo")
    .map((p) => {
      const pends = data.pendientes.filter((t) => t.proyectoId === p.id);
      const hechos = pends.filter((t) => t.estatus === "Hecho").length;
      return { nombre: p.nombre, total: pends.length, hechos, pct: pends.length ? Math.round((hechos / pends.length) * 100) : null };
    })
    .filter((p) => p.total > 0)
    .sort((a, b) => b.pct - a.pct);

  return (
    <div>
      <h2 className="gp-serif text-2xl mb-1">Panorama general</h2>
      <p className="text-sm gp-text-muted mb-6">Lo que le da sentido a tus proyectos, en un vistazo.</p>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <Stat label="Proyectos activos" value={activos} />
        <Stat label="Ideas por validar" value={ideas} />
        <Stat label="Ingresos del mes" value={fmtMoney(ingresos)} tone="teal" />
        <Stat label="Egresos del mes" value={fmtMoney(egresos)} tone="red" />
      </div>

      <div className="gp-panel p-4 mb-6">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2"><Wallet size={14} className="gp-text-teal" /><h3 className="text-sm font-medium">Saldo actual</h3></div>
          <button onClick={() => setSaldoModal(true)} className="text-xs gp-text-gold">
            {saldo ? "Redefinir punto de partida" : "Definir saldo inicial"}
          </button>
        </div>
        {saldo ? (
          <>
            <div className="grid grid-cols-3 gap-3 mt-3">
              <div><p className="text-xs gp-text-muted">Efectivo</p><p className="gp-serif text-lg">{fmtMoney(saldo.efectivo)}</p></div>
              <div><p className="text-xs gp-text-muted">Cuenta</p><p className="gp-serif text-lg">{fmtMoney(saldo.cuenta)}</p></div>
              <div><p className="text-xs gp-text-muted">Total</p><p className="gp-serif text-lg gp-text-teal">{fmtMoney(saldo.total)}</p></div>
            </div>
            <p className="text-xs gp-text-muted mt-2">Calculado desde tu punto de partida del {saldo.fecha} más tus movimientos reales (no incluye cobros pendientes).</p>
          </>
        ) : (
          <p className="text-xs gp-text-muted mt-2">Define cuánto dinero tienes ahorita (efectivo y en cuenta) para que el sistema empiece a sumar y restar desde ahí, en vez de asumir que parte de cero.</p>
        )}
      </div>

      {saldoModal && (
        <Modal title="Punto de partida de saldo" onClose={() => setSaldoModal(false)}>
          <SaldoInicialForm ultimo={saldo} onSave={(v) => { onAddSaldo(v); setSaldoModal(false); }} />
        </Modal>
      )}

      {cobrosPendientes.length > 0 && (
        <div className="gp-panel p-4 mb-6">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2"><Wallet size={14} className="gp-text-gold" /><h3 className="text-sm font-medium">Cobros pendientes</h3></div>
            <span className="gp-serif text-lg gp-text-teal">{fmtMoney(totalCobrosPendientes)}</span>
          </div>
          <ul className="space-y-1.5 text-xs">
            {cobrosPendientes.slice(0, 5).map((f) => {
              const dd = f.fechaVencimiento ? daysUntil(f.fechaVencimiento) : null;
              return (
                <li key={f.id} className="flex justify-between">
                  <span>{f.concepto || f.categoria || "Cobro"}</span>
                  <span className="flex items-center gap-2">
                    <span className="gp-mono">{fmtMoney(f.monto)}</span>
                    {dd !== null && <Badge tone={dd < 0 ? "red" : dd <= 7 ? "gold" : "muted"}>{dd < 0 ? "vencido" : `${dd}d`}</Badge>}
                  </span>
                </li>
              );
            })}
          </ul>
          <button onClick={() => setView("finanzas")} className="text-xs gp-text-gold mt-3">Ver todos los cobros →</button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="gp-panel p-4">
          <div className="flex items-center gap-2 mb-3"><Bell size={14} className="gp-text-gold" /><h3 className="text-sm font-medium">Recordatorios</h3></div>
          {deudasAtrasadas.length === 0 && deudasProximas.length === 0 && pendientesProximos.length === 0 && activosVencidos.length === 0 && activosProximos.length === 0 && docsProximos.length === 0 ? (
            <p className="text-xs gp-text-muted">Nada urgente esta semana.</p>
          ) : (
            <ul className="space-y-2 text-xs">
              {deudasAtrasadas.map((d) => (
                <li key={d.id} className="flex justify-between"><span>Deuda atrasada — {d.acreedor}</span><Badge tone="red">{fmtMoney(d.monto)}</Badge></li>
              ))}
              {deudasProximas.map((d) => (
                <li key={d.id} className="flex justify-between"><span>Vence pronto — {d.acreedor}</span><Badge tone="gold">{daysUntil(d.fechaVencimiento)}d</Badge></li>
              ))}
              {pendientesProximos.slice(0, 5).map((p) => (
                <li key={p.id} className="flex justify-between"><span>{p.descripcion}</span><Badge tone={daysUntil(p.fechaLimite) < 0 ? "red" : "muted"}>{daysUntil(p.fechaLimite) < 0 ? "vencido" : `${daysUntil(p.fechaLimite)}d`}</Badge></li>
              ))}
              {activosVencidos.map((a) => (
                <li key={a.id} className="flex justify-between"><span>Vencido — {a.nombre}</span><Badge tone="red">renovar</Badge></li>
              ))}
              {activosProximos.map((a) => (
                <li key={a.id} className="flex justify-between"><span>Renovar — {a.nombre}</span><Badge tone="gold">{daysUntil(a.fechaVencimiento)}d</Badge></li>
              ))}
              {docsProximos.map((d) => (
                <li key={d.id} className="flex justify-between"><span>Documento — {d.nombre}</span><Badge tone={daysUntil(d.fechaVencimiento) < 0 ? "red" : "gold"}>{daysUntil(d.fechaVencimiento) < 0 ? "vencido" : `${daysUntil(d.fechaVencimiento)}d`}</Badge></li>
              ))}
            </ul>
          )}
          <button onClick={() => setView("pendientes")} className="text-xs gp-text-gold mt-3">Ver todos los pendientes →</button>
        </div>

        <div className="gp-panel p-4">
          <div className="flex items-center gap-2 mb-3"><Github size={14} className="gp-text-gold" /><h3 className="text-sm font-medium">Pendiente: subir proyectos a GitHub</h3></div>
          {sinGithub.length === 0 ? (
            <p className="text-xs gp-text-teal">Todos tus proyectos están marcados como subidos.</p>
          ) : (
            <ul className="space-y-1.5 text-xs gp-text-muted">
              {sinGithub.map((p) => <li key={p.id}>· {p.nombre}</li>)}
            </ul>
          )}
          <button onClick={() => setView("proyectos")} className="text-xs gp-text-gold mt-3">Ir a proyectos →</button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="gp-panel p-4">
          <h3 className="text-sm font-medium mb-3">Avance general</h3>
          <div className="mb-3">
            <div className="flex justify-between text-xs mb-1"><span className="gp-text-muted">Pendientes completados</span><span className="gp-mono">{pendientesHechos}/{pendientesTotal} · {pctPendientes}%</span></div>
            <div className="h-2 rounded" style={{ background: "var(--border)" }}><div className="h-2 rounded" style={{ width: `${pctPendientes}%`, background: "var(--teal)" }} /></div>
          </div>
          <div>
            <div className="flex justify-between text-xs mb-1"><span className="gp-text-muted">Metas cumplidas</span><span className="gp-mono">{metasCumplidas}/{metasTotal} · {pctMetas}%</span></div>
            <div className="h-2 rounded" style={{ background: "var(--border)" }}><div className="h-2 rounded" style={{ width: `${pctMetas}%`, background: "var(--gold)" }} /></div>
          </div>
        </div>

        <div className="gp-panel p-4">
          <h3 className="text-sm font-medium mb-3">Avance por proyecto</h3>
          {avancePorProyecto.length === 0 ? (
            <p className="text-xs gp-text-muted">Agrega pendientes a tus proyectos activos para ver su avance aquí.</p>
          ) : (
            <div className="space-y-2">
              {avancePorProyecto.map((p) => (
                <div key={p.nombre} className="flex items-center gap-3 text-xs">
                  <span className="w-28 truncate gp-text-muted">{p.nombre}</span>
                  <div className="flex-1 h-2 rounded" style={{ background: "var(--border)" }}>
                    <div className="h-2 rounded" style={{ width: `${p.pct}%`, background: "var(--teal)" }} />
                  </div>
                  <span className="gp-mono w-10 text-right">{p.pct}%</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="gp-panel p-4">
        <h3 className="text-sm font-medium mb-3">Ganancia neta por proyecto</h3>
        {gananciaPorProyecto.length === 0 ? (
          <p className="text-xs gp-text-muted">Registra movimientos en Finanzas para ver este reporte.</p>
        ) : (
          <div className="space-y-2">
            {gananciaPorProyecto.map((p) => (
              <div key={p.nombre} className="flex items-center gap-3 text-xs">
                <span className="w-40 truncate gp-text-muted">{p.nombre}</span>
                <div className="flex-1 h-2 rounded" style={{ background: "var(--border)" }}>
                  <div className="h-2 rounded" style={{ width: `${Math.min(100, Math.abs(p.neto) / 50)}%`, background: p.neto >= 0 ? "var(--teal)" : "var(--red)" }} />
                </div>
                <span className={`gp-mono w-24 text-right ${p.neto >= 0 ? "gp-text-teal" : "gp-text-red"}`}>{fmtMoney(p.neto)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function SaldoInicialForm({ ultimo, onSave }) {
  const [v, setV] = useState({ fecha: todayISO(), efectivo: "", cuenta: "", notas: "" });
  const [error, setError] = useState("");
  const checkpoints = ultimo?.checkpoints || [];

  return (
    <div>
      <p className="text-xs gp-text-muted mb-3">Cuánto dinero tienes ahorita, para que el sistema empiece a contar desde aquí (no borra tu historial, solo marca un punto de partida nuevo).</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="Efectivo"><MoneyInput className="gp-input" value={v.efectivo} onChange={(val) => setV({ ...v, efectivo: val })} /></Field>
        <Field label="En cuenta"><MoneyInput className="gp-input" value={v.cuenta} onChange={(val) => setV({ ...v, cuenta: val })} /></Field>
      </div>
      <Field label="A partir de qué fecha"><input type="date" className="gp-input" value={v.fecha} onChange={(e) => setV({ ...v, fecha: e.target.value })} /></Field>
      <Field label="Notas (opcional)"><input className="gp-input" placeholder="ej. corte después de viaje a Acapulco" value={v.notas} onChange={(e) => setV({ ...v, notas: e.target.value })} /></Field>
      {error && <p className="text-xs gp-text-red mb-2">{error}</p>}
      <button
        className="gp-btn w-full py-2 text-sm mt-2"
        onClick={() => {
          if (v.efectivo === "" && v.cuenta === "") { setError("Captura al menos uno: efectivo o cuenta."); return; }
          setError("");
          onSave(v);
        }}
      >
        Guardar punto de partida
      </button>

      {checkpoints.length > 0 && (
        <div className="mt-5 pt-4 border-t gp-border">
          <p className="text-xs font-medium mb-2 gp-text-muted">Puntos de partida anteriores</p>
          <div className="space-y-1.5 max-h-32 overflow-y-auto gp-scroll">
            {checkpoints.map((c) => (
              <div key={c.id} className="text-xs flex justify-between gp-text-muted">
                <span className="gp-mono">{c.fecha}</span>
                <span>{fmtMoney(c.efectivo)} efectivo · {fmtMoney(c.cuenta)} cuenta</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, tone }) {
  return (
    <div className="gp-panel p-4">
      <p className="text-xs gp-text-muted mb-1">{label}</p>
      <p className={`gp-serif text-2xl ${tone === "teal" ? "gp-text-teal" : tone === "red" ? "gp-text-red" : ""}`}>{value}</p>
    </div>
  );
}

/* ---------- Proyectos ---------- */
function Proyectos({ data, onAdd, onEdit, onRemove, onAddComentario, onRemoveComentario }) {
  const [modal, setModal] = useState(null);
  const [expanded, setExpanded] = useState(null);
  const [notaTexto, setNotaTexto] = useState("");
  const [orden, setOrden] = useState("default");

  const empty = { nombre: "", categoria: CATS[0], estatus: "Idea", modo: "Finito", monetizacion: MONETIZACION[0], descripcion: "", github: "", githubSubido: false, notas: [], prioridad: "Media", fechaRevision: "" };

  const camposOrden = {
    alfabetico: { get: (p) => p.nombre, tipo: "texto" },
    registro: { get: (p) => p.createdAt, tipo: "fecha" },
    prioridad: { get: (p) => p.prioridad, tipo: "prioridad" },
    revision: { get: (p) => p.fechaRevision, tipo: "fecha" },
  };
  const opcionesOrden = [
    { key: "alfabetico", label: "alfabético" },
    { key: "registro", label: "fecha de registro" },
    { key: "prioridad", label: "prioridad" },
    { key: "revision", label: "fecha de revisión" },
  ];

  const grouped = ESTATUS_PROYECTO.map((e) => ({ estatus: e, items: ordenarLista(data.proyectos.filter((p) => p.estatus === e), orden, camposOrden) }));

  const addNota = (proyecto) => {
    if (!notaTexto.trim()) return;
    onEdit(proyecto.id, { notas: [...(proyecto.notas || []), { id: uid(), fecha: todayISO(), texto: notaTexto }] });
    setNotaTexto("");
  };

  const rentabilidad = (proyectoId) => {
    const movs = data.finanzas.filter((f) => f.proyectoId === proyectoId && f.estatus === "Cobrado");
    const ingresos = movs.filter((f) => f.tipo === "Ingreso").reduce((s, f) => s + (Number(f.monto) || 0), 0);
    const egresos = movs.filter((f) => f.tipo === "Egreso").reduce((s, f) => s + (Number(f.monto) || 0), 0);
    const pagosColab = data.pendientes
      .filter((t) => t.proyectoId === proyectoId && t.responsableId && t.estatus === "Hecho")
      .reduce((s, t) => s + (Number(t.precio) || 0), 0);
    return { ingresos, egresos, pagosColab, neto: ingresos - egresos };
  };

  return (
    <div>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-1">
        <h2 className="gp-serif text-2xl">Proyectos e ideas</h2>
        <button onClick={() => setModal({ item: empty })} className="gp-btn flex items-center justify-center gap-1 px-3 py-1.5 text-sm w-full sm:w-auto"><Plus size={14} /> Nuevo</button>
      </div>
      <p className="text-sm gp-text-muted mb-3">De idea a proyecto activo — edita el estatus cuando avance.</p>
      <div className="mb-4"><OrdenSelector opciones={opcionesOrden} value={orden} onChange={setOrden} /></div>

      <div className="space-y-6">
        {grouped.filter((g) => g.items.length).map((g) => (
          <div key={g.estatus}>
            <div className="flex items-center gap-2 mb-2 text-xs gp-text-muted">
              {g.estatus === "Idea" ? <Lightbulb size={13} /> : <Rocket size={13} />} {g.estatus} · {g.items.length}
            </div>
            <div className="space-y-2">
              {g.items.map((p) => (
                <div key={p.id} className="gp-panel">
                  <div className="p-3 flex items-start gap-3 cursor-pointer" onClick={() => setExpanded(expanded === p.id ? null : p.id)}>
                    {expanded === p.id ? <ChevronDown size={15} className="mt-0.5 gp-text-muted" /> : <ChevronRight size={15} className="mt-0.5 gp-text-muted" />}
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium">{p.nombre}</span>
                        <Badge tone="muted">{p.categoria}</Badge>
                        <Badge tone={p.modo === "Continuo" ? "teal" : "muted"}>{p.modo || "Finito"}</Badge>
                        <Badge tone={p.monetizacion === "No genera dinero" ? "muted" : "gold"}>{p.monetizacion}</Badge>
                        {p.prioridad && <Badge tone={p.prioridad === "Alta" ? "red" : p.prioridad === "Media" ? "gold" : "muted"}>{p.prioridad}</Badge>}
                        {!p.githubSubido && <Badge tone="red">falta GitHub</Badge>}
                      </div>
                      <p className="text-xs gp-text-muted mt-1">{p.descripcion}</p>
                    </div>
                    <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                      <IconBtn onClick={() => setModal({ item: p })}><Pencil size={13} /></IconBtn>
                      <IconBtn onClick={() => onRemove(p.id)}><Trash2 size={13} /></IconBtn>
                    </div>
                  </div>
                  {expanded === p.id && (
                    <div className="px-4 pb-4 border-t gp-border pt-3">
                      {(() => {
                        const r = rentabilidad(p.id);
                        return (
                          <div className="gp-panel-hi p-3 mb-3 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                            <div><p className="gp-text-muted">Ingresos</p><p className="gp-mono gp-text-teal">{fmtMoney(r.ingresos)}</p></div>
                            <div><p className="gp-text-muted">Egresos</p><p className="gp-mono gp-text-red">{fmtMoney(r.egresos)}</p></div>
                            <div><p className="gp-text-muted">Neto</p><p className={`gp-mono ${r.neto >= 0 ? "gp-text-teal" : "gp-text-red"}`}>{fmtMoney(r.neto)}</p></div>
                            <div><p className="gp-text-muted">Pagado a colaboradores</p><p className="gp-mono gp-text-gold">{fmtMoney(r.pagosColab)}</p></div>
                          </div>
                        );
                      })()}
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs gp-text-muted mb-3">
                        <label className="flex items-center gap-1.5">
                          <input type="checkbox" checked={p.githubSubido} onChange={(e) => onEdit(p.id, { githubSubido: e.target.checked })} />
                          Subido a GitHub
                        </label>
                        <input placeholder="link del repo (opcional)" value={p.github || ""} onChange={(e) => onEdit(p.id, { github: e.target.value })} className="gp-input flex-1" style={{ minWidth: 160, maxWidth: 280 }} />
                      </div>
                      <p className="text-xs font-medium mb-2 gp-text-muted">Bitácora de avances (texto rápido)</p>
                      <div className="space-y-1.5 mb-2 max-h-40 overflow-y-auto gp-scroll">
                        {(p.notas || []).slice().reverse().map((n) => (
                          <div key={n.id} className="text-xs flex gap-2"><span className="gp-mono gp-text-muted shrink-0">{n.fecha}</span><span>{n.texto}</span></div>
                        ))}
                        {(!p.notas || p.notas.length === 0) && <p className="text-xs gp-text-muted">Sin comentarios todavía.</p>}
                      </div>
                      <div className="flex gap-2 mb-4">
                        <input className="gp-input" placeholder="Agregar avance o comentario…" value={expanded === p.id ? notaTexto : ""} onChange={(e) => setNotaTexto(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addNota(p)} />
                        <button className="gp-btn-ghost px-3 text-xs" onClick={() => addNota(p)}>Agregar</button>
                      </div>
                      <div className="border-t gp-border pt-3">
                        <Bitacora data={data} entidadTipo="proyectos" entidadId={p.id} onAdd={onAddComentario} onRemove={onRemoveComentario} />
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
        {data.proyectos.length === 0 && <p className="text-sm gp-text-muted">Aún no tienes proyectos o ideas registradas.</p>}
      </div>

      {modal && (
        <Modal title={modal.item.id ? "Editar proyecto" : "Nuevo proyecto / idea"} onClose={() => setModal(null)}>
          <ProyectoForm item={modal.item} onSave={(v) => { modal.item.id ? onEdit(modal.item.id, v) : onAdd(v); setModal(null); }} />
        </Modal>
      )}
    </div>
  );
}

function ProyectoForm({ item, onSave }) {
  const [v, setV] = useState(item);
  const [error, setError] = useState("");
  return (
    <div>
      <Field label="Nombre"><input className="gp-input" value={v.nombre} onChange={(e) => setV({ ...v, nombre: e.target.value })} /></Field>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="Categoría"><select className="gp-input" value={v.categoria} onChange={(e) => setV({ ...v, categoria: e.target.value })}>{CATS.map((c) => <option key={c}>{c}</option>)}</select></Field>
        <Field label="Estatus"><select className="gp-input" value={v.estatus} onChange={(e) => setV({ ...v, estatus: e.target.value })}>{ESTATUS_PROYECTO.map((c) => <option key={c}>{c}</option>)}</select></Field>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="Modo">
          <select className="gp-input" value={v.modo || "Finito"} onChange={(e) => setV({ ...v, modo: e.target.value })}>{MODO_PROYECTO.map((c) => <option key={c}>{c}</option>)}</select>
        </Field>
        <Field label="Cómo genera valor"><select className="gp-input" value={v.monetizacion} onChange={(e) => setV({ ...v, monetizacion: e.target.value })}>{MONETIZACION.map((c) => <option key={c}>{c}</option>)}</select></Field>
      </div>
      <p className="text-xs gp-text-muted -mt-2 mb-3">{v.modo === "Continuo" ? "Continuo: genera flujo de forma constante (ej. renta, agencia de servicios)." : "Finito: tiene un punto claro de terminado (ej. lanzar un sitio, un show específico)."}</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="Prioridad"><select className="gp-input" value={v.prioridad || "Media"} onChange={(e) => setV({ ...v, prioridad: e.target.value })}>{PRIORIDADES.map((c) => <option key={c}>{c}</option>)}</select></Field>
        <Field label="Fecha de revisión (cuándo revisar el avance)"><input type="date" className="gp-input" value={v.fechaRevision || ""} onChange={(e) => setV({ ...v, fechaRevision: e.target.value })} /></Field>
      </div>
      <Field label="Descripción"><textarea className="gp-input" rows={3} value={v.descripcion} onChange={(e) => setV({ ...v, descripcion: e.target.value })} /></Field>
      {error && <p className="text-xs gp-text-red mb-2">{error}</p>}

      <button className="gp-btn w-full py-2 text-sm mt-2" onClick={() => { if (!v.nombre?.toString().trim()) { setError("El nombre del proyecto es obligatorio."); return; } setError(""); onSave(v); }}>Guardar</button>
    </div>
  );
}

/* ---------- Pendientes ---------- */
// Arma el árbol de subtareas (sin límite de profundidad) a partir de la lista plana.
function buildTareaTree(items) {
  const byParent = {};
  for (const it of items) {
    const key = it.parentId || "_root";
    (byParent[key] = byParent[key] || []).push(it);
  }
  const attach = (key) => (byParent[key] || []).map((it) => ({ ...it, hijos: attach(it.id) }));
  return attach("_root");
}
// Aplana el árbol a una lista con nivel de profundidad, para renderizar con indentación.
function flattenTareas(tree, nivel = 0) {
  const out = [];
  for (const nodo of tree) {
    out.push({ item: nodo, nivel });
    out.push(...flattenTareas(nodo.hijos, nivel + 1));
  }
  return out;
}
// % de avance: si la tarea tiene subtareas, es el promedio del avance de sus hijos (recursivo);
// si es una tarea final (sin hijos), es binario según su estatus.
function calcAvanceTarea(nodo) {
  if (!nodo.hijos || nodo.hijos.length === 0) {
    return nodo.estatus === "Hecho" ? 100 : nodo.estatus === "En progreso" ? 50 : 0;
  }
  const suma = nodo.hijos.reduce((s, h) => s + calcAvanceTarea(h), 0);
  return suma / nodo.hijos.length;
}
// ids de todos los descendientes de una tarea (para no permitir que se vuelva subtarea de sí misma).
function descendientesDe(id, items) {
  const hijos = items.filter((t) => t.parentId === id);
  return hijos.reduce((acc, h) => [...acc, h.id, ...descendientesDe(h.id, items)], []);
}

function Pendientes({ data, onAdd, onEdit, onRemove, onAddComentario, onRemoveComentario }) {
  const [modal, setModal] = useState(null);
  const [comentariosDe, setComentariosDe] = useState(null);
  const [orden, setOrden] = useState("default");
  const empty = { proyectoId: "", parentId: "", descripcion: "", fechaLimite: todayISO(), fechaRevision: "", prioridad: "Media", estatus: "Pendiente", responsableId: "", contactoId: "", precio: "", tiempoEstimado: "", tiempoReal: "" };

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
  const base = orden === "default"
    ? [...data.pendientes].sort((a, b) => (a.fechaLimite || "").localeCompare(b.fechaLimite || ""))
    : ordenarLista(data.pendientes, orden, camposOrden);
  const arbol = buildTareaTree(base);
  const filas = flattenTareas(arbol);
  const nComentarios = (id) => (data.comentarios || []).filter((c) => c.entidadTipo === "pendientes" && c.entidadId === id).length;

  const nombreProyecto = (id) => data.proyectos.find((p) => p.id === id)?.nombre || "—";
  const nombreResp = (id) => data.equipo.find((e) => e.id === id)?.nombre || "Tú";
  const nombreCliente = (id) => data.contactos.find((c) => c.id === id)?.nombre || "—";

  return (
    <div>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-1">
        <h2 className="gp-serif text-2xl">Pendientes</h2>
        <button onClick={() => setModal({ item: empty })} className="gp-btn flex items-center justify-center gap-1 px-3 py-1.5 text-sm w-full sm:w-auto"><Plus size={14} /> Nuevo</button>
      </div>
      <p className="text-sm gp-text-muted mb-3">De todos tus proyectos, en un solo lugar. Puedes anidar subtareas sin límite con el ➕ de cada fila.</p>
      <div className="mb-4"><OrdenSelector opciones={opcionesOrden} value={orden} onChange={setOrden} /></div>

      <div className="gp-panel overflow-x-auto">
        <table className="gp-table">
          <thead><tr><th>Pendiente</th><th>Proyecto</th><th>Cliente</th><th>Responsable</th><th>Fecha</th><th>Prioridad</th><th>Avance</th><th>Precio</th><th>Horas</th><th></th></tr></thead>
          <tbody>
            {filas.map(({ item: p, nivel }) => {
              const vencido = p.estatus !== "Hecho" && p.fechaLimite && daysUntil(p.fechaLimite) < 0;
              const nc = nComentarios(p.id);
              const tieneHijos = p.hijos && p.hijos.length > 0;
              const avance = tieneHijos ? Math.round(calcAvanceTarea(p)) : null;
              return (
                <tr key={p.id}>
                  <td>
                    <span style={{ paddingLeft: nivel * 18 }} className="flex items-center gap-1">
                      {nivel > 0 && <span className="gp-text-muted">└</span>}
                      {p.descripcion}
                    </span>
                  </td>
                  <td className="gp-text-muted">{nombreProyecto(p.proyectoId)}</td>
                  <td className="gp-text-muted">{p.contactoId ? nombreCliente(p.contactoId) : "—"}</td>
                  <td className="gp-text-muted">{nombreResp(p.responsableId)}</td>
                  <td className="gp-mono" style={{ color: vencido ? "var(--red)" : undefined }}>{p.fechaLimite}</td>
                  <td><Badge tone={p.prioridad === "Alta" ? "red" : p.prioridad === "Media" ? "gold" : "muted"}>{p.prioridad}</Badge></td>
                  <td>
                    {tieneHijos ? (
                      <div className="flex items-center gap-1.5" style={{ minWidth: 70 }}>
                        <div className="h-1.5 rounded flex-1" style={{ background: "var(--border)" }}>
                          <div className="h-1.5 rounded" style={{ width: `${avance}%`, background: avance === 100 ? "var(--teal)" : "var(--gold)" }} />
                        </div>
                        <span className="gp-mono" style={{ fontSize: 10 }}>{avance}%</span>
                      </div>
                    ) : (
                      <select className="gp-input" style={{ padding: "2px 6px" }} value={p.estatus} onChange={(e) => onEdit(p.id, { estatus: e.target.value })}>
                        {ESTATUS_TAREA.map((s) => <option key={s}>{s}</option>)}
                      </select>
                    )}
                  </td>
                  <td className="gp-mono">{p.precio ? fmtMoney(p.precio) : "—"}</td>
                  <td className="gp-mono gp-text-muted">{p.tiempoEstimado ? `${p.tiempoEstimado}h` : "—"}{p.tiempoReal ? ` / ${p.tiempoReal}h` : ""}</td>
                  <td><div className="flex gap-1">
                    <IconBtn onClick={() => setModal({ item: { ...empty, proyectoId: p.proyectoId, parentId: p.id } })}><Plus size={13} /></IconBtn>
                    <IconBtn onClick={() => setComentariosDe(p)}><MessageCircle size={13} />{nc > 0 && <span className="gp-mono" style={{ fontSize: 9, marginLeft: 2 }}>{nc}</span>}</IconBtn>
                    <IconBtn onClick={() => setModal({ item: p })}><Pencil size={13} /></IconBtn><IconBtn onClick={() => onRemove(p.id)}><Trash2 size={13} /></IconBtn>
                  </div></td>
                </tr>
              );
            })}
            {filas.length === 0 && <tr><td colSpan={10} className="text-center gp-text-muted py-6">Sin pendientes registrados.</td></tr>}
          </tbody>
        </table>
      </div>

      {comentariosDe && (
        <Modal title={`Comentarios — ${comentariosDe.descripcion}`} onClose={() => setComentariosDe(null)}>
          <Bitacora data={data} entidadTipo="pendientes" entidadId={comentariosDe.id} onAdd={onAddComentario} onRemove={onRemoveComentario} />
        </Modal>
      )}

      {modal && (
        <Modal title={modal.item.id ? "Editar pendiente" : modal.item.parentId ? "Nueva subtarea" : "Nuevo pendiente"} onClose={() => setModal(null)}>
          <PendienteForm item={modal.item} proyectos={data.proyectos} equipo={data.equipo} contactos={data.contactos} pendientes={data.pendientes} onSave={(v) => { modal.item.id ? onEdit(modal.item.id, v) : onAdd(v); setModal(null); }} />
        </Modal>
      )}
    </div>
  );
}

function PendienteForm({ item, proyectos, equipo, contactos, pendientes, onSave }) {
  const [v, setV] = useState(item);
  const [error, setError] = useState("");
  const excluidos = item.id ? [item.id, ...descendientesDe(item.id, pendientes)] : [];
  const opcionesParent = pendientes.filter((t) => !excluidos.includes(t.id));
  return (
    <div>
      <Field label="Descripción"><input className="gp-input" value={v.descripcion} onChange={(e) => setV({ ...v, descripcion: e.target.value })} /></Field>
      <Field label="Es subtarea de (opcional)">
        <select className="gp-input" value={v.parentId || ""} onChange={(e) => setV({ ...v, parentId: e.target.value })}>
          <option value="">— tarea principal —</option>
          {opcionesParent.map((t) => <option key={t.id} value={t.id}>{t.descripcion}</option>)}
        </select>
      </Field>
      <Field label="Proyecto">
        <select className="gp-input" value={v.proyectoId} onChange={(e) => setV({ ...v, proyectoId: e.target.value })}>
          <option value="">— sin proyecto —</option>
          {proyectos.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
        </select>
      </Field>
      <Field label="Cliente (a quién se le entrega)">
        <select className="gp-input" value={v.contactoId || ""} onChange={(e) => setV({ ...v, contactoId: e.target.value })}>
          <option value="">— sin cliente —</option>
          {contactos.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
        </select>
      </Field>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="Fecha límite"><input type="date" className="gp-input" value={v.fechaLimite} onChange={(e) => setV({ ...v, fechaLimite: e.target.value })} /></Field>
        <Field label="Prioridad"><select className="gp-input" value={v.prioridad} onChange={(e) => setV({ ...v, prioridad: e.target.value })}>{PRIORIDADES.map((c) => <option key={c}>{c}</option>)}</select></Field>
      </div>
      <Field label="Fecha de revisión (opcional, cuándo revisar el avance)"><input type="date" className="gp-input" value={v.fechaRevision || ""} onChange={(e) => setV({ ...v, fechaRevision: e.target.value })} /></Field>
      <Field label="Responsable">
        <select className="gp-input" value={v.responsableId} onChange={(e) => setV({ ...v, responsableId: e.target.value })}>
          <option value="">Tú</option>
          {equipo.map((m) => <option key={m.id} value={m.id}>{m.nombre}</option>)}
        </select>
      </Field>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="Precio pactado (si es delegado)"><MoneyInput className="gp-input" value={v.precio} onChange={(val) => setV({ ...v, precio: val })} /></Field>
        <Field label="Tiempo estimado (horas)"><input type="number" className="gp-input" value={v.tiempoEstimado} onChange={(e) => setV({ ...v, tiempoEstimado: e.target.value })} /></Field>
      </div>
      <Field label="Tiempo real (horas, cuando termine)"><input type="number" className="gp-input" value={v.tiempoReal} onChange={(e) => setV({ ...v, tiempoReal: e.target.value })} /></Field>
      {error && <p className="text-xs gp-text-red mb-2">{error}</p>}

      <button className="gp-btn w-full py-2 text-sm mt-2" onClick={() => { if (!v.descripcion?.toString().trim()) { setError("La descripción del pendiente es obligatoria."); return; } setError(""); onSave(v); }}>Guardar</button>
    </div>
  );
}

/* ---------- Finanzas ---------- */
const CHART_COLORS = ["#c9a227", "#4fa88f", "#d1554a", "#5b8def", "#a67c52", "#8d92a3", "#8e6fce"];

function lastNMonthKeys(n) {
  const out = [];
  const now = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    out.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }
  return out;
}
const monthLabel = (key) => {
  const [y, m] = key.split("-");
  return new Date(Number(y), Number(m) - 1, 1).toLocaleDateString("es-MX", { month: "short", year: "2-digit" });
};

// "Despliega" cada movimiento en entradas virtuales por mes dentro del rango:
// los movimientos normales aportan solo en su mes; los recurrentes aportan en cada mes
// entre su fecha de inicio y su fecha de fin (o indefinidamente si no tiene fin).
function buildMonthlyLedger(finanzas, monthKeys) {
  const entries = [];
  for (const f of finanzas) {
    const monto = Number(f.monto || 0);
    if (!monto) continue;
    if (!f.esRecurrente) {
      const m = (f.fecha || "").slice(0, 7);
      if (monthKeys.includes(m)) entries.push({ mes: m, tipo: f.tipo, monto, categoria: f.categoria || "Sin categoría", proyectoId: f.proyectoId });
      continue;
    }
    const inicioM = (f.fecha || "").slice(0, 7);
    const finM = f.fechaFin ? f.fechaFin.slice(0, 7) : null;
    for (const m of monthKeys) {
      if (m < inicioM) continue;
      if (finM && m > finM) continue;
      if (f.frecuencia === "Anual" && m.slice(5, 7) !== inicioM.slice(5, 7)) continue;
      entries.push({ mes: m, tipo: f.tipo, monto, categoria: f.categoria || "Sin categoría", proyectoId: f.proyectoId });
    }
  }
  return entries;
}

// Cuenta cuántas veces ocurre un pago recurrente entre dos fechas (aproximado por frecuencia).
function contarOcurrenciasRecurrente(f, desde, hasta) {
  const inicio = new Date(Math.max(new Date(f.fecha), new Date(desde)));
  const fin = f.fechaFin ? new Date(Math.min(new Date(f.fechaFin), new Date(hasta))) : new Date(hasta);
  if (inicio > fin) return 0;
  const dias = Math.floor((fin - inicio) / 86400000) + 1;
  if (f.frecuencia === "Semanal") return Math.floor(dias / 7) + 1;
  if (f.frecuencia === "Quincenal") return Math.floor(dias / 15) + 1;
  if (f.frecuencia === "Anual") return Math.floor(dias / 365) + 1;
  return Math.floor(dias / 30.44) + 1; // Mensual (default)
}

// Calcula el saldo real (efectivo + cuenta) a partir del último "punto de partida" definido,
// sumando/restando los movimientos reales (Cobrado, no Pendiente) desde esa fecha.
function calcularSaldo(data) {
  const checkpoints = [...(data.saldoInicial || [])].sort((a, b) => (b.fecha || "").localeCompare(a.fecha || ""));
  const activo = checkpoints[0];
  if (!activo) return null;
  const hoy = todayISO();
  let efectivo = Number(activo.efectivo) || 0;
  let cuenta = Number(activo.cuenta) || 0;

  for (const f of data.finanzas) {
    if (f.estatus === "Pendiente") continue; // aún no es dinero real
    if (f.forma !== "Efectivo" && f.forma !== "Transferencia") continue; // Especie/Intercambio no mueven dinero real
    const signo = f.tipo === "Ingreso" ? 1 : -1;

    if (!f.esRecurrente) {
      if (!f.fecha || f.fecha < activo.fecha || f.fecha > hoy) continue;
      const monto = (Number(f.monto) || 0) * signo;
      if (f.forma === "Efectivo") efectivo += monto; else cuenta += monto;
    } else {
      const n = contarOcurrenciasRecurrente(f, activo.fecha, hoy);
      const monto = (Number(f.monto) || 0) * signo * n;
      if (f.forma === "Efectivo") efectivo += monto; else cuenta += monto;
    }
  }
  return { fecha: activo.fecha, efectivo, cuenta, total: efectivo + cuenta, checkpoints };
}

function Finanzas({ data, onAdd, onEdit, onRemove }) {
  const [modal, setModal] = useState(null);
  const [vista, setVista] = useState("todos");
  const [filtroTipoRecurrente, setFiltroTipoRecurrente] = useState("Todos");
  const [filtroVigencia, setFiltroVigencia] = useState("Vigentes");
  const [orden, setOrden] = useState("default");
  const [ordenDir, setOrdenDir] = useState("asc");
  const toggleOrden = (key) => { if (orden === key) setOrdenDir((d) => (d === "asc" ? "desc" : "asc")); else { setOrden(key); setOrdenDir("asc"); } };
  const empty = { concepto: "", tipo: "Ingreso", proyectoId: "", contactoId: "", fecha: todayISO(), fechaVencimiento: "", monto: "", categoria: "", forma: "Transferencia", estatus: "Cobrado", pautando: false, esRecurrente: false, frecuencia: "Mensual", fechaFin: "" };
  const nombreProyecto = (id) => data.proyectos.find((p) => p.id === id)?.nombre || "—";
  const nombreCliente = (id) => data.contactos.find((c) => c.id === id)?.nombre || "—";

  const cobrosPendientes = data.finanzas
    .filter((f) => f.tipo === "Ingreso" && f.estatus === "Pendiente")
    .sort((a, b) => (a.fechaVencimiento || "9999").localeCompare(b.fechaVencimiento || "9999"));
  const totalCobrosPendientes = cobrosPendientes.reduce((s, f) => s + (Number(f.monto) || 0), 0);

  const hoy = todayISO();
  const esVigente = (f) => !f.fechaFin || f.fechaFin >= hoy;
  let recurrentes = data.finanzas.filter((f) => f.esRecurrente);
  if (filtroTipoRecurrente !== "Todos") recurrentes = recurrentes.filter((f) => f.tipo === filtroTipoRecurrente);
  if (filtroVigencia !== "Todos") recurrentes = recurrentes.filter((f) => (filtroVigencia === "Vigentes" ? esVigente(f) : !esVigente(f)));
  const totalRecurrentes = recurrentes.reduce((s, f) => s + (Number(f.monto) || 0) * (f.tipo === "Ingreso" ? 1 : -1), 0);

  const camposOrden = {
    fecha: { get: (f) => f.fecha, tipo: "fecha" },
    registro: { get: (f) => f.createdAt, tipo: "fecha" },
    alfabetico: { get: (f) => f.concepto, tipo: "texto" },
    monto: { get: (f) => Number(f.monto) || 0, tipo: "numero" },
  };
  const opcionesOrden = [
    { key: "fecha", label: "fecha del movimiento" },
    { key: "registro", label: "fecha de registro" },
    { key: "alfabetico", label: "alfabético" },
    { key: "monto", label: "monto" },
  ];
  const base = vista === "cobros" ? cobrosPendientes : vista === "recurrentes" ? recurrentes : [...data.finanzas].sort((a, b) => (b.fecha || "").localeCompare(a.fecha || ""));
  const ordenados = vista === "cobros" ? base : ordenarLista(base, orden, camposOrden, ordenDir);

  return (
    <div>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-1">
        <h2 className="gp-serif text-2xl">Ingresos y egresos</h2>
        <button onClick={() => setModal({ item: empty })} className="gp-btn flex items-center justify-center gap-1 px-3 py-1.5 text-sm w-full sm:w-auto"><Plus size={14} /> Nuevo</button>
      </div>
      <p className="text-sm gp-text-muted mb-4">Incluye pagos recurrentes (luz, agua, compras a meses) con fecha de inicio y fin, o indefinidos.</p>

      <div className="flex flex-wrap items-center gap-2 mb-4">
        <button onClick={() => setVista("todos")} className={`text-xs px-3 py-1.5 rounded-full border ${vista === "todos" ? "gp-btn" : "gp-text-muted"}`}>Todos los movimientos</button>
        <button onClick={() => setVista("cobros")} className={`text-xs px-3 py-1.5 rounded-full border flex items-center gap-1 ${vista === "cobros" ? "gp-btn" : "gp-text-muted"}`}>
          Cobros pendientes {cobrosPendientes.length > 0 && <Badge tone="gold">{cobrosPendientes.length}</Badge>}
        </button>
        <button onClick={() => setVista("recurrentes")} className={`text-xs px-3 py-1.5 rounded-full border flex items-center gap-1 ${vista === "recurrentes" ? "gp-btn" : "gp-text-muted"}`}>
          Pagos recurrentes
        </button>
        {vista === "todos" && <OrdenSelector opciones={opcionesOrden} value={orden} onChange={setOrden} />}
        {vista === "recurrentes" && <OrdenSelector opciones={opcionesOrden} value={orden} onChange={setOrden} />}
      </div>

      {vista === "cobros" && (
        <div className="gp-panel p-4 mb-4 flex items-center justify-between">
          <div>
            <p className="text-xs gp-text-muted">Total por cobrar</p>
            <p className="gp-serif text-xl gp-text-teal">{fmtMoney(totalCobrosPendientes)}</p>
          </div>
          <p className="text-xs gp-text-muted text-right">Rentas, shows, sistemas, publicidad — ordenado por fecha de vencimiento, para saber con qué dinero cuentas y cuándo.</p>
        </div>
      )}

      {vista === "recurrentes" && (
        <>
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <div className="flex gap-1">
              {["Todos", "Ingreso", "Egreso"].map((t) => (
                <button key={t} onClick={() => setFiltroTipoRecurrente(t)} className={`text-xs px-2.5 py-1 rounded-full border ${filtroTipoRecurrente === t ? "gp-btn" : "gp-text-muted"}`}>{t === "Todos" ? "Todos" : t + "s"}</button>
              ))}
            </div>
            <div className="flex gap-1">
              {["Vigentes", "No vigentes", "Todos"].map((v) => (
                <button key={v} onClick={() => setFiltroVigencia(v)} className={`text-xs px-2.5 py-1 rounded-full border ${filtroVigencia === v ? "gp-btn" : "gp-text-muted"}`}>{v}</button>
              ))}
            </div>
          </div>
          <div className="gp-panel p-4 mb-4">
            <p className="text-xs gp-text-muted">Neto de esta vista ({recurrentes.length} pago{recurrentes.length === 1 ? "" : "s"})</p>
            <p className={`gp-serif text-xl ${totalRecurrentes >= 0 ? "gp-text-teal" : "gp-text-red"}`}>{fmtMoney(totalRecurrentes)}</p>
            <p className="text-xs gp-text-muted mt-1">Vigente = sin fecha de fin, o con fecha de fin en el futuro. No vigente = ya pasó su fecha de fin.</p>
          </div>
        </>
      )}

      <div className="gp-panel overflow-x-auto">
        <table className="gp-table">
          <thead><tr><Th label="Concepto" sortKey="alfabetico" orden={orden} ordenDir={ordenDir} onToggle={toggleOrden} /><Th label="Fecha" sortKey="fecha" orden={orden} ordenDir={ordenDir} onToggle={toggleOrden} /><th>Día de pago</th>{vista === "cobros" && <th>Vence</th>}{vista === "recurrentes" && <th>Vigencia</th>}<th>Tipo</th><th>Proyecto</th><th>Cliente</th><th>Categoría</th><th>Forma</th><th>Estatus</th><th>Recurrente</th><Th label="Monto" sortKey="monto" orden={orden} ordenDir={ordenDir} onToggle={toggleOrden} /><th></th></tr></thead>
          <tbody>
            {ordenados.map((f) => {
              const vencido = f.fechaVencimiento && daysUntil(f.fechaVencimiento) < 0;
              return (
              <tr key={f.id}>
                <td>{f.concepto || "—"}</td>
                <td className="gp-mono">{f.esRecurrente ? "—" : (f.fecha || "—")}</td>
                <td className="gp-mono">{f.esRecurrente && f.fecha ? Number(f.fecha.slice(8, 10)) : "—"}</td>
                {vista === "cobros" && (
                  <td className="gp-mono" style={{ color: vencido ? "var(--red)" : undefined }}>
                    {f.fechaVencimiento ? `${f.fechaVencimiento}${vencido ? " (vencido)" : ""}` : "—"}
                  </td>
                )}
                {vista === "recurrentes" && (
                  <td><Badge tone={esVigente(f) ? "teal" : "muted"}>{esVigente(f) ? "Vigente" : "No vigente"}</Badge></td>
                )}
                <td><Badge tone={f.tipo === "Ingreso" ? "teal" : "red"}>{f.tipo}</Badge></td>
                <td className="gp-text-muted">{nombreProyecto(f.proyectoId)}</td>
                <td className="gp-text-muted">{f.contactoId ? nombreCliente(f.contactoId) : "—"}</td>
                <td className="gp-text-muted">{f.categoria}</td>
                <td className="gp-text-muted">{f.forma}</td>
                <td><Badge tone={f.estatus === "Cobrado" ? "teal" : "gold"}>{f.estatus}</Badge></td>
                <td>
                  {f.esRecurrente ? (
                    <Badge tone="gold">{f.frecuencia || "Mensual"}{f.fechaFin ? ` · hasta ${f.fechaFin}` : " · indefinido"}</Badge>
                  ) : "—"}
                </td>
                <td className={`gp-mono ${f.tipo === "Ingreso" ? "gp-text-teal" : "gp-text-red"}`}>{f.monto ? fmtMoney(f.monto) : "—"}</td>
                <td><div className="flex gap-1"><IconBtn onClick={() => setModal({ item: f })}><Pencil size={13} /></IconBtn><IconBtn onClick={() => onRemove(f.id)}><Trash2 size={13} /></IconBtn></div></td>
              </tr>
            );})}
            {ordenados.length === 0 && <tr><td colSpan={vista === "cobros" ? 13 : 12} className="text-center gp-text-muted py-6">{vista === "cobros" ? "No tienes cobros pendientes." : vista === "recurrentes" ? "No hay pagos recurrentes con este filtro." : "Sin movimientos registrados."}</td></tr>}
          </tbody>
        </table>
      </div>

      {modal && (
        <Modal title={modal.item.id ? "Editar movimiento" : "Nuevo movimiento"} onClose={() => setModal(null)}>
          <FinanzaForm item={modal.item} proyectos={data.proyectos} contactos={data.contactos} onSave={(v) => { modal.item.id ? onEdit(modal.item.id, v) : onAdd(v); setModal(null); }} />
        </Modal>
      )}
    </div>
  );
}

function FinanzaForm({ item, proyectos, contactos, onSave }) {
  const [v, setV] = useState(item);
  const [error, setError] = useState("");
  return (
    <div>
      <Field label="Concepto"><input className="gp-input" placeholder="ej. Claude, PlanetFitness, Renta Xochinahuac" value={v.concepto || ""} onChange={(e) => setV({ ...v, concepto: e.target.value })} /></Field>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="Tipo"><select className="gp-input" value={v.tipo} onChange={(e) => setV({ ...v, tipo: e.target.value })}>{TIPO_FIN.map((c) => <option key={c}>{c}</option>)}</select></Field>
        {v.esRecurrente ? (
          <Field label="Día del mes en que se cobra">
            <input
              type="number" min="1" max="31" className="gp-input"
              value={v.fecha ? Number(v.fecha.slice(8, 10)) : ""}
              onChange={(e) => {
                const dia = Math.min(31, Math.max(1, Number(e.target.value) || 1));
                setV({ ...v, fecha: `${todayISO().slice(0, 7)}-${String(dia).padStart(2, "0")}` });
              }}
            />
          </Field>
        ) : (
          <Field label="Fecha"><input type="date" className="gp-input" value={v.fecha} onChange={(e) => setV({ ...v, fecha: e.target.value })} /></Field>
        )}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="Proyecto">
          <select className="gp-input" value={v.proyectoId} onChange={(e) => setV({ ...v, proyectoId: e.target.value })}>
            <option value="">— sin proyecto —</option>
            {proyectos.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
          </select>
        </Field>
        <Field label="Cliente (quién pagó)">
          <select className="gp-input" value={v.contactoId || ""} onChange={(e) => setV({ ...v, contactoId: e.target.value })}>
            <option value="">— sin cliente —</option>
            {contactos.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
          </select>
        </Field>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="Categoría"><input className="gp-input" value={v.categoria} onChange={(e) => setV({ ...v, categoria: e.target.value })} placeholder="ej. hosting, venta, renta" /></Field>
        <Field label="Monto"><MoneyInput className="gp-input" value={v.monto} onChange={(val) => setV({ ...v, monto: val })} /></Field>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="Forma"><select className="gp-input" value={v.forma} onChange={(e) => setV({ ...v, forma: e.target.value })}>{FORMA_PAGO.map((c) => <option key={c}>{c}</option>)}</select></Field>
        <Field label="Estatus"><select className="gp-input" value={v.estatus} onChange={(e) => setV({ ...v, estatus: e.target.value })}><option>Cobrado</option><option>Pendiente</option></select></Field>
      </div>
      {v.estatus === "Pendiente" && v.tipo === "Ingreso" && (
        <Field label="Fecha de vencimiento (cuándo esperas cobrarlo)"><input type="date" className="gp-input" value={v.fechaVencimiento || ""} onChange={(e) => setV({ ...v, fechaVencimiento: e.target.value })} /></Field>
      )}
      <label className="flex items-center gap-2 text-xs gp-text-muted mb-3">
        <input type="checkbox" checked={v.pautando} onChange={(e) => setV({ ...v, pautando: e.target.checked })} /> Este proyecto está pautando publicidad
      </label>

      <div className="gp-panel p-3 mb-3">
        <label className="flex items-center gap-2 text-xs mb-2">
          <input type="checkbox" checked={v.esRecurrente} onChange={(e) => setV({ ...v, esRecurrente: e.target.checked })} />
          Es un pago recurrente (luz, agua, compra a meses…)
        </label>
        {v.esRecurrente && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
            <Field label="Frecuencia"><select className="gp-input" value={v.frecuencia} onChange={(e) => setV({ ...v, frecuencia: e.target.value })}>{FRECUENCIA.map((c) => <option key={c}>{c}</option>)}</select></Field>
            <Field label="Fecha de fin (vacío = indefinido)"><input type="date" className="gp-input" value={v.fechaFin} onChange={(e) => setV({ ...v, fechaFin: e.target.value })} /></Field>
          </div>
        )}
      </div>

      {error && <p className="text-xs gp-text-red mb-2">{error}</p>}


      <button className="gp-btn w-full py-2 text-sm mt-1" onClick={() => { if (!v.concepto?.toString().trim()) { setError("El concepto es obligatorio."); return; } setError(""); onSave(v); }}>Guardar</button>
    </div>
  );
}

/* ---------- Facturas e IVA ---------- */
function Facturas({ data, onAdd, onEdit, onRemove, onAddComentario, onRemoveComentario }) {
  const [modal, setModal] = useState(null);
  const [comentariosDe, setComentariosDe] = useState(null);
  const [filtroTipo, setFiltroTipo] = useState("Todas");
  const [filtroMes, setFiltroMes] = useState(todayISO().slice(0, 7));
  const [orden, setOrden] = useState("default");
  const [ordenDir, setOrdenDir] = useState("asc");
  const toggleOrden = (key) => { if (orden === key) setOrdenDir((d) => (d === "asc" ? "desc" : "asc")); else { setOrden(key); setOrdenDir("asc"); } };
  const empty = { tipo: "Recibida", proyectoId: "", contactoId: "", folio: "", fecha: todayISO(), concepto: "", subtotal: "", iva: "", total: "", estatus: "Pendiente", notas: "" };

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
          <thead><tr><Th label="Folio" sortKey="alfabetico" orden={orden} ordenDir={ordenDir} onToggle={toggleOrden} /><th>Tipo</th><Th label="Fecha" sortKey="fecha" orden={orden} ordenDir={ordenDir} onToggle={toggleOrden} /><th>Proyecto</th><th>Contacto</th><th>Subtotal</th><th>IVA</th><Th label="Total" sortKey="total" orden={orden} ordenDir={ordenDir} onToggle={toggleOrden} /><th>Estatus</th><th></th></tr></thead>
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
                  <td><div className="flex gap-1">
                    <IconBtn onClick={() => setComentariosDe(f)}><MessageCircle size={13} />{nc > 0 && <span className="gp-mono" style={{ fontSize: 9, marginLeft: 2 }}>{nc}</span>}</IconBtn>
                    <IconBtn onClick={() => setModal({ item: f })}><Pencil size={13} /></IconBtn><IconBtn onClick={() => onRemove(f.id)}><Trash2 size={13} /></IconBtn>
                  </div></td>
                </tr>
              );
            })}
            {ordenadas.length === 0 && <tr><td colSpan={10} className="text-center gp-text-muted py-6">Sin facturas registradas con este filtro.</td></tr>}
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
          <FacturaForm item={modal.item} proyectos={data.proyectos} contactos={data.contactos} onSave={(v) => { modal.item.id ? onEdit(modal.item.id, v) : onAdd(v); setModal(null); }} />
        </Modal>
      )}
    </div>
  );
}

function FacturaForm({ item, proyectos, contactos, onSave }) {
  const [v, setV] = useState(item);
  const [error, setError] = useState("");

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
            {proyectos.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
          </select>
        </Field>
        <Field label="Contacto (cliente o proveedor)">
          <select className="gp-input" value={v.contactoId || ""} onChange={(e) => setV({ ...v, contactoId: e.target.value })}>
            <option value="">— sin contacto —</option>
            {contactos.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
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
      <p className="text-xs gp-text-muted mb-3">Esta información es de referencia para tu control interno — no sustituye a un contador ni a tu declaración fiscal real.</p>
      {error && <p className="text-xs gp-text-red mb-2">{error}</p>}

      <button className="gp-btn w-full py-2 text-sm mt-2" onClick={() => { if (!v.concepto?.toString().trim()) { setError("El concepto es obligatorio."); return; } setError(""); onSave(v); }}>Guardar</button>
    </div>
  );
}

/* ---------- Deudas ---------- */
function Deudas({ data, onAdd, onEdit, onRemove }) {
  const [modal, setModal] = useState(null);
  const [orden, setOrden] = useState("default");
  const [ordenDir, setOrdenDir] = useState("asc");
  const toggleOrden = (key) => { if (orden === key) setOrdenDir((d) => (d === "asc" ? "desc" : "asc")); else { setOrden(key); setOrdenDir("asc"); } };
  const empty = { acreedor: "", proyectoId: "", monto: "", fechaVencimiento: todayISO() };
  const camposOrden = {
    vencimiento: { get: (d) => d.fechaVencimiento, tipo: "fecha" },
    registro: { get: (d) => d.createdAt, tipo: "fecha" },
    alfabetico: { get: (d) => d.acreedor, tipo: "texto" },
    monto: { get: (d) => Number(d.monto) || 0, tipo: "numero" },
  };
  const opcionesOrden = [
    { key: "vencimiento", label: "fecha de vencimiento" },
    { key: "registro", label: "fecha de registro" },
    { key: "alfabetico", label: "alfabético" },
    { key: "monto", label: "monto" },
  ];
  const base = orden === "default" ? [...data.deudas].sort((a, b) => (a.fechaVencimiento || "").localeCompare(b.fechaVencimiento || "")) : data.deudas;
  const ordenados = ordenarLista(base, orden, camposOrden, ordenDir);
  const nombreProyecto = (id) => data.proyectos.find((p) => p.id === id)?.nombre || "—";

  return (
    <div>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-1">
        <h2 className="gp-serif text-2xl">Deudas</h2>
        <button onClick={() => setModal({ item: empty })} className="gp-btn flex items-center justify-center gap-1 px-3 py-1.5 text-sm w-full sm:w-auto"><Plus size={14} /> Nueva</button>
      </div>
      <p className="text-sm gp-text-muted mb-3">Atrasadas, próximas a vencer y al corriente, todo calculado por fecha.</p>
      <div className="mb-4"><OrdenSelector opciones={opcionesOrden} value={orden} onChange={setOrden} /></div>

      <div className="gp-panel overflow-x-auto">
        <table className="gp-table">
          <thead><tr><Th label="Acreedor" sortKey="alfabetico" orden={orden} ordenDir={ordenDir} onToggle={toggleOrden} /><th>Proyecto</th><Th label="Vence" sortKey="vencimiento" orden={orden} ordenDir={ordenDir} onToggle={toggleOrden} /><th>Estatus</th><Th label="Monto" sortKey="monto" orden={orden} ordenDir={ordenDir} onToggle={toggleOrden} /><th></th></tr></thead>
          <tbody>
            {ordenados.map((d) => {
              const dd = daysUntil(d.fechaVencimiento);
              const tone = dd < 0 ? "red" : dd <= 7 ? "gold" : "teal";
              const label = dd < 0 ? `Atrasada (${Math.abs(dd)}d)` : dd <= 7 ? `Vence en ${dd}d` : "Al corriente";
              return (
                <tr key={d.id}>
                  <td>{d.acreedor}</td>
                  <td className="gp-text-muted">{nombreProyecto(d.proyectoId)}</td>
                  <td className="gp-mono">{d.fechaVencimiento}</td>
                  <td><Badge tone={tone}>{label}</Badge></td>
                  <td className="gp-mono">{fmtMoney(d.monto)}</td>
                  <td><div className="flex gap-1"><IconBtn onClick={() => setModal({ item: d })}><Pencil size={13} /></IconBtn><IconBtn onClick={() => onRemove(d.id)}><Trash2 size={13} /></IconBtn></div></td>
                </tr>
              );
            })}
            {ordenados.length === 0 && <tr><td colSpan={6} className="text-center gp-text-muted py-6">Sin deudas registradas.</td></tr>}
          </tbody>
        </table>
      </div>

      {modal && (
        <Modal title={modal.item.id ? "Editar deuda" : "Nueva deuda"} onClose={() => setModal(null)}>
          <DeudaForm item={modal.item} proyectos={data.proyectos} onSave={(v) => { modal.item.id ? onEdit(modal.item.id, v) : onAdd(v); setModal(null); }} />
        </Modal>
      )}
    </div>
  );
}

function DeudaForm({ item, proyectos, onSave }) {
  const [v, setV] = useState(item);
  const [error, setError] = useState("");
  return (
    <div>
      <Field label="Acreedor"><input className="gp-input" value={v.acreedor} onChange={(e) => setV({ ...v, acreedor: e.target.value })} /></Field>
      <Field label="Proyecto relacionado">
        <select className="gp-input" value={v.proyectoId} onChange={(e) => setV({ ...v, proyectoId: e.target.value })}>
          <option value="">— personal / sin proyecto —</option>
          {proyectos.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
        </select>
      </Field>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="Monto"><MoneyInput className="gp-input" value={v.monto} onChange={(val) => setV({ ...v, monto: val })} /></Field>
        <Field label="Fecha de vencimiento"><input type="date" className="gp-input" value={v.fechaVencimiento} onChange={(e) => setV({ ...v, fechaVencimiento: e.target.value })} /></Field>
      </div>
      {error && <p className="text-xs gp-text-red mb-2">{error}</p>}

      <button className="gp-btn w-full py-2 text-sm mt-2" onClick={() => { if (!v.acreedor?.toString().trim()) { setError("El acreedor es obligatorio."); return; } setError(""); onSave(v); }}>Guardar</button>
    </div>
  );
}

/* ---------- Equipo ---------- */
function Equipo({ data, onAdd, onEdit, onRemove }) {
  const [modal, setModal] = useState(null);
  const [orden, setOrden] = useState("default");
  const empty = { nombre: "", whatsapp: "", correo: "", comentarios: "" };
  const tareasDe = (id) => data.pendientes.filter((p) => p.responsableId === id);
  const camposOrden = {
    registro: { get: (m) => m.createdAt, tipo: "fecha" },
    alfabetico: { get: (m) => m.nombre, tipo: "texto" },
  };
  const opcionesOrden = [
    { key: "registro", label: "fecha de registro" },
    { key: "alfabetico", label: "alfabético" },
  ];
  const listaEquipo = ordenarLista(data.equipo, orden, camposOrden);

  return (
    <div>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-1">
        <h2 className="gp-serif text-2xl">Equipo</h2>
        <button onClick={() => setModal({ item: empty })} className="gp-btn flex items-center justify-center gap-1 px-3 py-1.5 text-sm w-full sm:w-auto"><Plus size={14} /> Nuevo</button>
      </div>
      <p className="text-sm gp-text-muted mb-3">Colaboradores a los que delegas, con sus tareas y tu evaluación.</p>
      <div className="mb-4"><OrdenSelector opciones={opcionesOrden} value={orden} onChange={setOrden} /></div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {listaEquipo.map((m) => {
          const tareas = tareasDe(m.id);
          const totalPagado = tareas.reduce((s, t) => s + Number(t.precio || 0), 0);
          return (
            <div key={m.id} className="gp-panel p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium">{m.nombre}</p>
                  <div className="flex gap-3 mt-1 text-xs gp-text-muted">
                    {m.whatsapp && <span className="flex items-center gap-1"><MessageCircle size={12} /> {m.whatsapp}</span>}
                    {m.correo && <span className="flex items-center gap-1"><Mail size={12} /> {m.correo}</span>}
                  </div>
                </div>
                <div className="flex gap-1"><IconBtn onClick={() => setModal({ item: m })}><Pencil size={13} /></IconBtn><IconBtn onClick={() => onRemove(m.id)}><Trash2 size={13} /></IconBtn></div>
              </div>
              <p className="text-xs mt-2 gp-text-muted">{m.comentarios}</p>
              <div className="mt-3 pt-3 border-t gp-border text-xs">
                <span className="gp-text-muted">{tareas.length} tarea(s) asignadas · </span>
                <span className="gp-mono gp-text-gold">{fmtMoney(totalPagado)} pactado</span>
              </div>
            </div>
          );
        })}
        {data.equipo.length === 0 && <p className="text-sm gp-text-muted col-span-2">Aún no registras colaboradores.</p>}
      </div>

      {modal && (
        <Modal title={modal.item.id ? "Editar colaborador" : "Nuevo colaborador"} onClose={() => setModal(null)}>
          <EquipoForm item={modal.item} onSave={(v) => { modal.item.id ? onEdit(modal.item.id, v) : onAdd(v); setModal(null); }} />
        </Modal>
      )}
    </div>
  );
}

function EquipoForm({ item, onSave }) {
  const [v, setV] = useState(item);
  const [error, setError] = useState("");
  return (
    <div>
      <Field label="Nombre"><input className="gp-input" value={v.nombre} onChange={(e) => setV({ ...v, nombre: e.target.value })} /></Field>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="WhatsApp"><input className="gp-input" value={v.whatsapp} onChange={(e) => setV({ ...v, whatsapp: e.target.value })} /></Field>
        <Field label="Correo (opcional)"><input className="gp-input" value={v.correo} onChange={(e) => setV({ ...v, correo: e.target.value })} /></Field>
      </div>
      <Field label="Comentarios sobre esta persona"><textarea className="gp-input" rows={3} value={v.comentarios} onChange={(e) => setV({ ...v, comentarios: e.target.value })} /></Field>
      {error && <p className="text-xs gp-text-red mb-2">{error}</p>}

      <button className="gp-btn w-full py-2 text-sm mt-2" onClick={() => { if (!v.nombre?.toString().trim()) { setError("El nombre es obligatorio."); return; } setError(""); onSave(v); }}>Guardar</button>
    </div>
  );
}

/* ---------- Actividades ---------- */
function Actividades({ data, onAdd, onEdit, onRemove }) {
  const [modal, setModal] = useState(null);
  const [orden, setOrden] = useState("default");
  const [ordenDir, setOrdenDir] = useState("asc");
  const toggleOrden = (key) => { if (orden === key) setOrdenDir((d) => (d === "asc" ? "desc" : "asc")); else { setOrden(key); setOrdenDir("asc"); } };
  const empty = { tipo: "Gym", nombre: "", fecha: todayISO(), proyectoId: "", ganancia: "", notas: "" };
  const camposOrden = {
    fecha: { get: (a) => a.fecha, tipo: "fecha" },
    registro: { get: (a) => a.createdAt, tipo: "fecha" },
    alfabetico: { get: (a) => a.nombre, tipo: "texto" },
  };
  const opcionesOrden = [
    { key: "fecha", label: "fecha" },
    { key: "registro", label: "fecha de registro" },
    { key: "alfabetico", label: "alfabético" },
  ];
  const base = orden === "default" ? [...data.actividades].sort((a, b) => (b.fecha || "").localeCompare(a.fecha || "")) : data.actividades;
  const ordenados = ordenarLista(base, orden, camposOrden, ordenDir);
  const nombreProyecto = (id) => data.proyectos.find((p) => p.id === id)?.nombre || "—";

  return (
    <div>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-1">
        <h2 className="gp-serif text-2xl">Actividades y vida</h2>
        <button onClick={() => setModal({ item: empty })} className="gp-btn flex items-center justify-center gap-1 px-3 py-1.5 text-sm w-full sm:w-auto"><Plus size={14} /> Registrar</button>
      </div>
      <p className="text-sm gp-text-muted mb-3">Gym, eventos, capacitación (PLC's, Vibe Coding/SDD, inglés) — un registro rápido de todo lo que construye tu semana.</p>
      <div className="mb-4"><OrdenSelector opciones={opcionesOrden} value={orden} onChange={setOrden} /></div>

      <div className="gp-panel overflow-x-auto">
        <table className="gp-table">
          <thead><tr><Th label="Fecha" sortKey="fecha" orden={orden} ordenDir={ordenDir} onToggle={toggleOrden} /><th>Tipo</th><Th label="Actividad" sortKey="alfabetico" orden={orden} ordenDir={ordenDir} onToggle={toggleOrden} /><th>Proyecto</th><th>Ganancia</th><th>Notas</th><th></th></tr></thead>
          <tbody>
            {ordenados.map((a) => (
              <tr key={a.id}>
                <td className="gp-mono">{a.fecha}</td>
                <td><Badge tone="muted">{a.tipo}</Badge></td>
                <td>{a.nombre}</td>
                <td className="gp-text-muted">{nombreProyecto(a.proyectoId)}</td>
                <td className="gp-mono gp-text-teal">{a.ganancia ? fmtMoney(a.ganancia) : "—"}</td>
                <td className="gp-text-muted">{a.notas}</td>
                <td><div className="flex gap-1"><IconBtn onClick={() => setModal({ item: a })}><Pencil size={13} /></IconBtn><IconBtn onClick={() => onRemove(a.id)}><Trash2 size={13} /></IconBtn></div></td>
              </tr>
            ))}
            {ordenados.length === 0 && <tr><td colSpan={7} className="text-center gp-text-muted py-6">Sin actividades registradas.</td></tr>}
          </tbody>
        </table>
      </div>

      {modal && (
        <Modal title={modal.item.id ? "Editar actividad" : "Registrar actividad"} onClose={() => setModal(null)}>
          <ActividadForm item={modal.item} proyectos={data.proyectos} onSave={(v) => { modal.item.id ? onEdit(modal.item.id, v) : onAdd(v); setModal(null); }} />
        </Modal>
      )}
    </div>
  );
}

function ActividadForm({ item, proyectos, onSave }) {
  const [v, setV] = useState(item);
  const [error, setError] = useState("");
  return (
    <div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="Tipo"><select className="gp-input" value={v.tipo} onChange={(e) => setV({ ...v, tipo: e.target.value })}>{TIPO_ACTIVIDAD.map((c) => <option key={c}>{c}</option>)}</select></Field>
        <Field label="Fecha"><input type="date" className="gp-input" value={v.fecha} onChange={(e) => setV({ ...v, fecha: e.target.value })} /></Field>
      </div>
      <Field label="Actividad"><input className="gp-input" placeholder="ej. Rutina de pierna, Curso de PLC's, Evento X" value={v.nombre} onChange={(e) => setV({ ...v, nombre: e.target.value })} /></Field>
      <Field label="Proyecto relacionado (opcional)">
        <select className="gp-input" value={v.proyectoId} onChange={(e) => setV({ ...v, proyectoId: e.target.value })}>
          <option value="">— ninguno —</option>
          {proyectos.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
        </select>
      </Field>
      <Field label="Ganancia generada (si aplica)"><MoneyInput className="gp-input" value={v.ganancia} onChange={(val) => setV({ ...v, ganancia: val })} /></Field>
      <Field label="Notas"><textarea className="gp-input" rows={2} value={v.notas} onChange={(e) => setV({ ...v, notas: e.target.value })} /></Field>
      {error && <p className="text-xs gp-text-red mb-2">{error}</p>}

      <button className="gp-btn w-full py-2 text-sm mt-2" onClick={() => { if (!v.nombre?.toString().trim()) { setError("El nombre de la actividad es obligatorio."); return; } setError(""); onSave(v); }}>Guardar</button>
    </div>
  );
}

/* ---------- Activos digitales ---------- */
function ActivosDigitales({ data, onAdd, onEdit, onRemove }) {
  const [modal, setModal] = useState(null);
  const [orden, setOrden] = useState("default");
  const [ordenDir, setOrdenDir] = useState("asc");
  const toggleOrden = (key) => { if (orden === key) setOrdenDir((d) => (d === "asc" ? "desc" : "asc")); else { setOrden(key); setOrdenDir("asc"); } };
  const empty = { tipo: "Dominio", nombre: "", proyectoId: "", fechaVencimiento: todayISO(), costoRenovacion: "", notas: "" };
  const camposOrden = {
    vencimiento: { get: (a) => a.fechaVencimiento, tipo: "fecha" },
    registro: { get: (a) => a.createdAt, tipo: "fecha" },
    alfabetico: { get: (a) => a.nombre, tipo: "texto" },
  };
  const opcionesOrden = [
    { key: "vencimiento", label: "fecha de vencimiento" },
    { key: "registro", label: "fecha de registro" },
    { key: "alfabetico", label: "alfabético" },
  ];
  const base = orden === "default" ? [...(data.activos || [])].sort((a, b) => (a.fechaVencimiento || "").localeCompare(b.fechaVencimiento || "")) : (data.activos || []);
  const ordenados = ordenarLista(base, orden, camposOrden, ordenDir);
  const nombreProyecto = (id) => data.proyectos.find((p) => p.id === id)?.nombre || "—";

  return (
    <div>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-1">
        <h2 className="gp-serif text-2xl">Activos digitales</h2>
        <button onClick={() => setModal({ item: empty })} className="gp-btn flex items-center justify-center gap-1 px-3 py-1.5 text-sm w-full sm:w-auto"><Plus size={14} /> Nuevo</button>
      </div>
      <p className="text-sm gp-text-muted mb-3">Dominios, hosting, marcas ante IMPI y redes — para que ningún vencimiento te tome por sorpresa.</p>
      <div className="mb-4"><OrdenSelector opciones={opcionesOrden} value={orden} onChange={setOrden} /></div>

      <div className="gp-panel overflow-x-auto">
        <table className="gp-table">
          <thead><tr><Th label="Activo" sortKey="alfabetico" orden={orden} ordenDir={ordenDir} onToggle={toggleOrden} /><th>Tipo</th><th>Proyecto</th><Th label="Vence" sortKey="vencimiento" orden={orden} ordenDir={ordenDir} onToggle={toggleOrden} /><th>Estatus</th><th>Costo renovación</th><th></th></tr></thead>
          <tbody>
            {ordenados.map((a) => {
              const dd = daysUntil(a.fechaVencimiento);
              const tone = dd < 0 ? "red" : dd <= 14 ? "gold" : "teal";
              const label = dd < 0 ? `Vencido (${Math.abs(dd)}d)` : dd <= 14 ? `Renovar en ${dd}d` : "Vigente";
              return (
                <tr key={a.id}>
                  <td>{a.nombre}</td>
                  <td className="gp-text-muted">{a.tipo}</td>
                  <td className="gp-text-muted">{nombreProyecto(a.proyectoId)}</td>
                  <td className="gp-mono">{a.fechaVencimiento}</td>
                  <td><Badge tone={tone}>{label}</Badge></td>
                  <td className="gp-mono">{a.costoRenovacion ? fmtMoney(a.costoRenovacion) : "—"}</td>
                  <td><div className="flex gap-1"><IconBtn onClick={() => setModal({ item: a })}><Pencil size={13} /></IconBtn><IconBtn onClick={() => onRemove(a.id)}><Trash2 size={13} /></IconBtn></div></td>
                </tr>
              );
            })}
            {ordenados.length === 0 && <tr><td colSpan={7} className="text-center gp-text-muted py-6">Sin activos digitales registrados.</td></tr>}
          </tbody>
        </table>
      </div>

      {modal && (
        <Modal title={modal.item.id ? "Editar activo" : "Nuevo activo digital"} onClose={() => setModal(null)}>
          <ActivoForm item={modal.item} proyectos={data.proyectos} onSave={(v) => { modal.item.id ? onEdit(modal.item.id, v) : onAdd(v); setModal(null); }} />
        </Modal>
      )}
    </div>
  );
}

function ActivoForm({ item, proyectos, onSave }) {
  const [v, setV] = useState(item);
  const [error, setError] = useState("");
  return (
    <div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="Tipo"><select className="gp-input" value={v.tipo} onChange={(e) => setV({ ...v, tipo: e.target.value })}>{TIPO_ACTIVO.map((c) => <option key={c}>{c}</option>)}</select></Field>
        <Field label="Nombre"><input className="gp-input" placeholder="ej. armoniq.mx, marca ARKeyData" value={v.nombre} onChange={(e) => setV({ ...v, nombre: e.target.value })} /></Field>
      </div>
      <Field label="Proyecto relacionado">
        <select className="gp-input" value={v.proyectoId} onChange={(e) => setV({ ...v, proyectoId: e.target.value })}>
          <option value="">— ninguno —</option>
          {proyectos.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
        </select>
      </Field>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="Fecha de vencimiento"><input type="date" className="gp-input" value={v.fechaVencimiento} onChange={(e) => setV({ ...v, fechaVencimiento: e.target.value })} /></Field>
        <Field label="Costo de renovación"><MoneyInput className="gp-input" value={v.costoRenovacion} onChange={(val) => setV({ ...v, costoRenovacion: val })} /></Field>
      </div>
      <Field label="Notas"><textarea className="gp-input" rows={2} value={v.notas} onChange={(e) => setV({ ...v, notas: e.target.value })} /></Field>
      {error && <p className="text-xs gp-text-red mb-2">{error}</p>}

      <button className="gp-btn w-full py-2 text-sm mt-2" onClick={() => { if (!v.nombre?.toString().trim()) { setError("El nombre del activo es obligatorio."); return; } setError(""); onSave(v); }}>Guardar</button>
    </div>
  );
}

/* ---------- Metas por proyecto ---------- */
function Metas({ data, onAdd, onEdit, onRemove }) {
  const [modal, setModal] = useState(null);
  const [orden, setOrden] = useState("default");
  const [ordenDir, setOrdenDir] = useState("asc");
  const toggleOrden = (key) => { if (orden === key) setOrdenDir((d) => (d === "asc" ? "desc" : "asc")); else { setOrden(key); setOrdenDir("asc"); } };
  const empty = { proyectoId: "", descripcion: "", fechaObjetivo: todayISO(), fechaRevision: "", prioridad: "Media", estatus: "No iniciada" };
  const camposOrden = {
    objetivo: { get: (m) => m.fechaObjetivo, tipo: "fecha" },
    registro: { get: (m) => m.createdAt, tipo: "fecha" },
    revision: { get: (m) => m.fechaRevision, tipo: "fecha" },
    alfabetico: { get: (m) => m.descripcion, tipo: "texto" },
    prioridad: { get: (m) => m.prioridad, tipo: "prioridad" },
  };
  const opcionesOrden = [
    { key: "objetivo", label: "fecha objetivo" },
    { key: "registro", label: "fecha de registro" },
    { key: "revision", label: "fecha de revisión" },
    { key: "alfabetico", label: "alfabético" },
    { key: "prioridad", label: "prioridad" },
  ];
  const base = orden === "default" ? [...data.metas].sort((a, b) => (a.fechaObjetivo || "").localeCompare(b.fechaObjetivo || "")) : data.metas;
  const ordenados = ordenarLista(base, orden, camposOrden, ordenDir);
  const nombreProyecto = (id) => data.proyectos.find((p) => p.id === id)?.nombre || "—";

  return (
    <div>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-1">
        <h2 className="gp-serif text-2xl">Metas por proyecto</h2>
        <button onClick={() => setModal({ item: empty })} className="gp-btn flex items-center justify-center gap-1 px-3 py-1.5 text-sm w-full sm:w-auto"><Plus size={14} /> Nueva</button>
      </div>
      <p className="text-sm gp-text-muted mb-3">Qué define el éxito de cada proyecto, para que la bitácora tenga rumbo.</p>
      <div className="mb-4"><OrdenSelector opciones={opcionesOrden} value={orden} onChange={setOrden} /></div>

      <div className="gp-panel overflow-x-auto">
        <table className="gp-table">
          <thead><tr><Th label="Meta" sortKey="alfabetico" orden={orden} ordenDir={ordenDir} onToggle={toggleOrden} /><th>Proyecto</th><Th label="Prioridad" sortKey="prioridad" orden={orden} ordenDir={ordenDir} onToggle={toggleOrden} /><Th label="Fecha objetivo" sortKey="objetivo" orden={orden} ordenDir={ordenDir} onToggle={toggleOrden} /><th>Estatus</th><th></th></tr></thead>
          <tbody>
            {ordenados.map((m) => (
              <tr key={m.id}>
                <td>{m.descripcion}</td>
                <td className="gp-text-muted">{nombreProyecto(m.proyectoId)}</td>
                <td><Badge tone={m.prioridad === "Alta" ? "red" : m.prioridad === "Media" ? "gold" : "muted"}>{m.prioridad || "Media"}</Badge></td>
                <td className="gp-mono">{m.fechaObjetivo}</td>
                <td>
                  <select className="gp-input" style={{ padding: "2px 6px" }} value={m.estatus} onChange={(e) => onEdit(m.id, { estatus: e.target.value })}>
                    {ESTATUS_META.map((s) => <option key={s}>{s}</option>)}
                  </select>
                </td>
                <td><div className="flex gap-1"><IconBtn onClick={() => setModal({ item: m })}><Pencil size={13} /></IconBtn><IconBtn onClick={() => onRemove(m.id)}><Trash2 size={13} /></IconBtn></div></td>
              </tr>
            ))}
            {ordenados.length === 0 && <tr><td colSpan={6} className="text-center gp-text-muted py-6">Sin metas registradas.</td></tr>}
          </tbody>
        </table>
      </div>

      {modal && (
        <Modal title={modal.item.id ? "Editar meta" : "Nueva meta"} onClose={() => setModal(null)}>
          <MetaForm item={modal.item} proyectos={data.proyectos} onSave={(v) => { modal.item.id ? onEdit(modal.item.id, v) : onAdd(v); setModal(null); }} />
        </Modal>
      )}
    </div>
  );
}

function MetaForm({ item, proyectos, onSave }) {
  const [v, setV] = useState(item);
  const [error, setError] = useState("");
  return (
    <div>
      <Field label="Proyecto">
        <select className="gp-input" value={v.proyectoId} onChange={(e) => setV({ ...v, proyectoId: e.target.value })}>
          <option value="">— sin proyecto —</option>
          {proyectos.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
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

/* ---------- Contactos / networking ---------- */
function Contactos({ data, onAdd, onEdit, onRemove, onAddComentario, onRemoveComentario, onVerRegalos }) {
  const [modal, setModal] = useState(null);
  const [comentariosDe, setComentariosDe] = useState(null);
  const [filtroTipo, setFiltroTipo] = useState("Todos");
  const [orden, setOrden] = useState("default");
  const empty = { nombre: "", tipo: "Cliente", parentesco: "", fechaNacimiento: "", contexto: "", proyectoId: "", whatsapp: "", correo: "", notas: "" };
  const nombreProyecto = (id) => data.proyectos.find((p) => p.id === id)?.nombre || "—";
  const toneTipo = { Cliente: "teal", Proveedor: "gold", Colaborador: "red", Otro: "" };
  const camposOrden = {
    alfabetico: { get: (c) => c.nombre, tipo: "texto" },
    registro: { get: (c) => c.createdAt, tipo: "fecha" },
  };
  const opcionesOrden = [
    { key: "alfabetico", label: "alfabético" },
    { key: "registro", label: "fecha de registro" },
  ];
  const filtrados = filtroTipo === "Todos" ? data.contactos : data.contactos.filter((c) => (c.tipo || "Otro") === filtroTipo);
  const visibles = ordenarLista(filtrados, orden, camposOrden);

  return (
    <div>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-1">
        <h2 className="gp-serif text-2xl">Contactos</h2>
        <button onClick={() => setModal({ item: empty })} className="gp-btn flex items-center justify-center gap-1 px-3 py-1.5 text-sm w-full sm:w-auto"><Plus size={14} /> Nuevo</button>
      </div>
      <p className="text-sm gp-text-muted mb-4">Clientes, proveedores, colaboradores y gente que conoces en eventos — para que no se pierdan.</p>

      <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
        <div className="flex flex-wrap gap-1">
          {["Todos", "Cliente", "Proveedor", "Colaborador", "Otro"].map((t) => (
            <button key={t} onClick={() => setFiltroTipo(t)} className={`text-xs px-2.5 py-1 rounded-full border ${filtroTipo === t ? "gp-btn" : "gp-text-muted"}`}>{t}</button>
          ))}
        </div>
        <OrdenSelector opciones={opcionesOrden} value={orden} onChange={setOrden} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {visibles.map((c) => (
          <div key={c.id} className="gp-panel p-4">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium">{c.nombre}</p>
                  <Badge tone={toneTipo[c.tipo || "Otro"]}>{c.tipo || "Otro"}</Badge>
                  {c.parentesco && <Badge tone="muted">{c.parentesco}</Badge>}
                  {(() => {
                    const dc = diasParaCumple(c.fechaNacimiento);
                    if (dc === null || dc > 30) return null;
                    return <Badge tone="gold">🎂 {dc === 0 ? "¡hoy!" : `en ${dc}d`}</Badge>;
                  })()}
                </div>
                <p className="text-xs gp-text-muted mt-0.5">{c.contexto} {c.proyectoId ? `· ${nombreProyecto(c.proyectoId)}` : ""}</p>
                <div className="flex gap-3 mt-1 text-xs gp-text-muted">
                  {c.whatsapp && <span className="flex items-center gap-1"><MessageCircle size={12} /> {c.whatsapp}</span>}
                  {c.correo && <span className="flex items-center gap-1"><Mail size={12} /> {c.correo}</span>}
                </div>
              </div>
              <div className="flex gap-1">
                <IconBtn onClick={() => setComentariosDe(c)}><MessageCircle size={13} /></IconBtn>
                {onVerRegalos && <IconBtn onClick={() => onVerRegalos(c)}><Gift size={13} /></IconBtn>}
                <IconBtn onClick={() => setModal({ item: c })}><Pencil size={13} /></IconBtn><IconBtn onClick={() => onRemove(c.id)}><Trash2 size={13} /></IconBtn>
              </div>
            </div>
            {c.notas && <p className="text-xs mt-2 gp-text-muted">{c.notas}</p>}
          </div>
        ))}
        {visibles.length === 0 && <p className="text-sm gp-text-muted col-span-2">Aún no registras contactos {filtroTipo !== "Todos" ? `de tipo "${filtroTipo}"` : ""}.</p>}
      </div>

      {comentariosDe && (
        <Modal title={`Comentarios — ${comentariosDe.nombre}`} onClose={() => setComentariosDe(null)}>
          <Bitacora data={data} entidadTipo="contactos" entidadId={comentariosDe.id} onAdd={onAddComentario} onRemove={onRemoveComentario} />
        </Modal>
      )}

      {modal && (
        <Modal title={modal.item.id ? "Editar contacto" : "Nuevo contacto"} onClose={() => setModal(null)}>
          <ContactoForm item={modal.item} proyectos={data.proyectos} onSave={(v) => { modal.item.id ? onEdit(modal.item.id, v) : onAdd(v); setModal(null); }} />
        </Modal>
      )}
    </div>
  );
}

function ContactoForm({ item, proyectos, onSave }) {
  const [v, setV] = useState(item);
  const [error, setError] = useState("");
  const [otroParentesco, setOtroParentesco] = useState(() => !!item.parentesco && !PARENTESCOS.includes(item.parentesco));
  return (
    <div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="Nombre"><input className="gp-input" value={v.nombre} onChange={(e) => setV({ ...v, nombre: e.target.value })} /></Field>
        <Field label="Tipo">
          <select className="gp-input" value={v.tipo || "Otro"} onChange={(e) => setV({ ...v, tipo: e.target.value })}>
            <option>Cliente</option><option>Proveedor</option><option>Colaborador</option><option>Otro</option>
          </select>
        </Field>
      </div>
      <Field label="Parentesco (opcional)">
        <select
          className="gp-input"
          value={otroParentesco ? "Otro" : (v.parentesco || "")}
          onChange={(e) => {
            if (e.target.value === "Otro") { setOtroParentesco(true); setV({ ...v, parentesco: "" }); }
            else { setOtroParentesco(false); setV({ ...v, parentesco: e.target.value }); }
          }}
        >
          <option value="">— ninguno —</option>
          {PARENTESCOS.map((p) => <option key={p}>{p}</option>)}
          <option value="Otro">Otro…</option>
        </select>
        {otroParentesco && (
          <input className="gp-input mt-2" placeholder="Escribe el parentesco" value={v.parentesco || ""} onChange={(e) => setV({ ...v, parentesco: e.target.value })} />
        )}
      </Field>
      <Field label="Fecha de nacimiento (opcional, para recordar su cumpleaños)"><input type="date" className="gp-input" value={v.fechaNacimiento || ""} onChange={(e) => setV({ ...v, fechaNacimiento: e.target.value })} /></Field>
      <Field label="Dónde lo conociste"><input className="gp-input" placeholder="ej. Expo Acapulco 2026" value={v.contexto} onChange={(e) => setV({ ...v, contexto: e.target.value })} /></Field>
      <Field label="Proyecto relacionado">
        <select className="gp-input" value={v.proyectoId} onChange={(e) => setV({ ...v, proyectoId: e.target.value })}>
          <option value="">— ninguno —</option>
          {proyectos.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
        </select>
      </Field>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="WhatsApp"><input className="gp-input" value={v.whatsapp} onChange={(e) => setV({ ...v, whatsapp: e.target.value })} /></Field>
        <Field label="Correo (opcional)"><input className="gp-input" value={v.correo} onChange={(e) => setV({ ...v, correo: e.target.value })} /></Field>
      </div>
      <Field label="Notas"><textarea className="gp-input" rows={2} value={v.notas} onChange={(e) => setV({ ...v, notas: e.target.value })} /></Field>
      {error && <p className="text-xs gp-text-red mb-2">{error}</p>}

      <button className="gp-btn w-full py-2 text-sm mt-2" onClick={() => { if (!v.nombre?.toString().trim()) { setError("El nombre del contacto es obligatorio."); return; } setError(""); onSave(v); }}>Guardar</button>
    </div>
  );
}

/* ---------- Regalos (histórico de regalos/felicitaciones, incluye control de Navidad) ---------- */
function Regalos({ data, onAdd, onEdit, onRemove, filtroContactoInicial, onLimpiarFiltro }) {
  const [modal, setModal] = useState(null);
  const [filtroContacto, setFiltroContacto] = useState(filtroContactoInicial || "");
  const [filtroOcasion, setFiltroOcasion] = useState("Todos");
  const [filtroAnio, setFiltroAnio] = useState("Todos");
  const [orden, setOrden] = useState("default");
  const [ordenDir, setOrdenDir] = useState("asc");
  const toggleOrden = (key) => { if (orden === key) setOrdenDir((d) => (d === "asc" ? "desc" : "asc")); else { setOrden(key); setOrdenDir("asc"); } };
  const anioActual = new Date().getFullYear();
  const empty = { contactoId: filtroContactoInicial || "", ocasion: "Cumpleaños", anio: anioActual, fecha: "", descripcion: "", costo: "", estatus: "Por comprar", notas: "" };

  const nombreContacto = (id) => data.contactos.find((c) => c.id === id)?.nombre || "—";
  const anios = [...new Set(data.regalos.map((r) => r.anio).filter(Boolean))].sort((a, b) => b - a);

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
  const ordenados = ordenarLista(filtrados, orden, camposOrden, ordenDir);
  const totalGastado = ordenados.reduce((s, r) => s + (Number(r.costo) || 0), 0);

  const verNavidadEsteAnio = () => { setFiltroOcasion("Navidad"); setFiltroAnio(anioActual); setFiltroContacto(""); };

  return (
    <div>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-1">
        <h2 className="gp-serif text-2xl">Regalos</h2>
        <button onClick={() => setModal({ item: empty })} className="gp-btn flex items-center justify-center gap-1 px-3 py-1.5 text-sm w-full sm:w-auto"><Plus size={14} /> Nuevo</button>
      </div>
      <p className="text-sm gp-text-muted mb-3">Histórico de regalos y felicitaciones a tus contactos — incluye tu lista de Navidad por año.</p>

      <div className="flex flex-wrap items-center gap-2 mb-4">
        <button onClick={verNavidadEsteAnio} className="gp-btn flex items-center gap-1 px-3 py-1.5 text-xs"><Gift size={13} /> Ver Navidad {anioActual}</button>
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

      {totalGastado > 0 && (
        <p className="text-xs gp-text-muted mb-3">Total en esta vista: <span className="gp-mono gp-text-gold">{fmtMoney(totalGastado)}</span></p>
      )}

      <div className="gp-panel overflow-x-auto">
        <table className="gp-table">
          <thead><tr><Th label="Contacto" sortKey="alfabetico" orden={orden} ordenDir={ordenDir} onToggle={toggleOrden} /><th>Ocasión</th><th>Año</th><Th label="Fecha" sortKey="fecha" orden={orden} ordenDir={ordenDir} onToggle={toggleOrden} /><th>Regalo</th><Th label="Costo" sortKey="costo" orden={orden} ordenDir={ordenDir} onToggle={toggleOrden} /><th>Estatus</th><th></th></tr></thead>
          <tbody>
            {ordenados.map((r) => (
              <tr key={r.id}>
                <td>{nombreContacto(r.contactoId)}</td>
                <td><Badge tone="muted">{r.ocasion}</Badge></td>
                <td className="gp-mono">{r.anio || "—"}</td>
                <td className="gp-mono">{r.fecha || "—"}</td>
                <td className="gp-text-muted">{r.descripcion}</td>
                <td className="gp-mono">{r.costo ? fmtMoney(r.costo) : "—"}</td>
                <td>
                  <select className="gp-input" style={{ padding: "2px 6px" }} value={r.estatus || "Por comprar"} onChange={(e) => onEdit(r.id, { estatus: e.target.value })}>
                    {ESTATUS_REGALO.map((s) => <option key={s}>{s}</option>)}
                  </select>
                </td>
                <td><div className="flex gap-1"><IconBtn onClick={() => setModal({ item: r })}><Pencil size={13} /></IconBtn><IconBtn onClick={() => onRemove(r.id)}><Trash2 size={13} /></IconBtn></div></td>
              </tr>
            ))}
            {ordenados.length === 0 && <tr><td colSpan={8} className="text-center gp-text-muted py-6">Sin regalos registrados con este filtro.</td></tr>}
          </tbody>
        </table>
      </div>

      {modal && (
        <Modal title={modal.item.id ? "Editar regalo" : "Nuevo regalo"} onClose={() => setModal(null)}>
          <RegaloForm item={modal.item} contactos={data.contactos} onSave={(v) => { modal.item.id ? onEdit(modal.item.id, v) : onAdd(v); setModal(null); }} />
        </Modal>
      )}
    </div>
  );
}

function RegaloForm({ item, contactos, onSave }) {
  const [v, setV] = useState(item);
  const [error, setError] = useState("");
  return (
    <div>
      <Field label="Contacto">
        <select className="gp-input" value={v.contactoId || ""} onChange={(e) => setV({ ...v, contactoId: e.target.value })}>
          <option value="">— selecciona —</option>
          {contactos.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
        </select>
      </Field>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="Ocasión"><select className="gp-input" value={v.ocasion} onChange={(e) => setV({ ...v, ocasion: e.target.value })}>{OCASIONES_REGALO.map((o) => <option key={o}>{o}</option>)}</select></Field>
        <Field label="Año"><input type="number" className="gp-input" value={v.anio} onChange={(e) => setV({ ...v, anio: e.target.value })} /></Field>
      </div>
      <Field label="Fecha (opcional)"><input type="date" className="gp-input" value={v.fecha || ""} onChange={(e) => setV({ ...v, fecha: e.target.value })} /></Field>
      <Field label="Regalo o mensaje"><input className="gp-input" placeholder="ej. Perfume, tarjeta de felicitación, transferencia" value={v.descripcion} onChange={(e) => setV({ ...v, descripcion: e.target.value })} /></Field>
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


function RedesSociales({ data, onAdd, onEdit, onRemove }) {
  const [modal, setModal] = useState(null);
  const [orden, setOrden] = useState("default");
  const [ordenDir, setOrdenDir] = useState("asc");
  const toggleOrden = (key) => { if (orden === key) setOrdenDir((d) => (d === "asc" ? "desc" : "asc")); else { setOrden(key); setOrdenDir("asc"); } };
  const empty = { proyectoId: "", plataforma: PLATAFORMAS[0], fecha: todayISO(), seguidores: "", alcance: "" };
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
                <td><div className="flex gap-1"><IconBtn onClick={() => setModal({ item: r })}><Pencil size={13} /></IconBtn><IconBtn onClick={() => onRemove(r.id)}><Trash2 size={13} /></IconBtn></div></td>
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
          {proyectos.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
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

/* ---------- Marketing (calendario de campañas, presupuesto, métricas, retorno) ---------- */
function Marketing({ data, onAdd, onEdit, onRemove, onAddComentario, onRemoveComentario }) {
  const [modal, setModal] = useState(null);
  const [comentariosDe, setComentariosDe] = useState(null);
  const [filtroProyecto, setFiltroProyecto] = useState("Todos");
  const [filtroEstatus, setFiltroEstatus] = useState("Todas");
  const [orden, setOrden] = useState("default");
  const empty = { proyectoId: "", nombre: "", plataforma: "Meta", fechaInicio: todayISO(), fechaFin: "", presupuesto: "", gastado: "", alcance: "", clics: "", conversiones: "", ingresoGenerado: "", estatus: "Planeada", idExterno: "", notas: "" };

  const nombreProyecto = (id) => data.proyectos.find((p) => p.id === id)?.nombre || "—";
  const nComentarios = (id) => (data.comentarios || []).filter((c) => c.entidadTipo === "campanas" && c.entidadId === id).length;
  const retorno = (c) => {
    const gastado = Number(c.gastado) || 0;
    const ingreso = Number(c.ingresoGenerado) || 0;
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
  const base = orden === "default" ? [...filtradas].sort((a, b) => (a.fechaInicio || "9999").localeCompare(b.fechaInicio || "9999")) : filtradas;
  const ordenadas = ordenarLista(base, orden, camposOrden);

  const totalPresupuesto = ordenadas.reduce((s, c) => s + (Number(c.presupuesto) || 0), 0);
  const totalGastado = ordenadas.reduce((s, c) => s + (Number(c.gastado) || 0), 0);
  const totalIngreso = ordenadas.reduce((s, c) => s + (Number(c.ingresoGenerado) || 0), 0);

  return (
    <div>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-1">
        <h2 className="gp-serif text-2xl">Marketing</h2>
        <button onClick={() => setModal({ item: empty })} className="gp-btn flex items-center justify-center gap-1 px-3 py-1.5 text-sm w-full sm:w-auto"><Plus size={14} /> Nueva campaña</button>
      </div>
      <p className="text-sm gp-text-muted mb-3">Calendario de campañas por proyecto, con presupuesto, métricas y retorno. Listo para conectar a futuro con Meta, Google o Stripe.</p>

      <div className="gp-panel p-4 mb-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div><p className="text-xs gp-text-muted">Presupuesto (en esta vista)</p><p className="gp-serif text-lg">{fmtMoney(totalPresupuesto)}</p></div>
        <div><p className="text-xs gp-text-muted">Gastado</p><p className="gp-serif text-lg gp-text-red">{fmtMoney(totalGastado)}</p></div>
        <div><p className="text-xs gp-text-muted">Ingreso atribuido</p><p className="gp-serif text-lg gp-text-teal">{fmtMoney(totalIngreso)}</p></div>
      </div>

      <div className="flex flex-wrap items-center gap-2 mb-4">
        <select className="gp-input text-xs py-1.5" style={{ width: "auto" }} value={filtroProyecto} onChange={(e) => setFiltroProyecto(e.target.value)}>
          <option value="Todos">Todos los proyectos</option>
          {data.proyectos.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
        </select>
        <select className="gp-input text-xs py-1.5" style={{ width: "auto" }} value={filtroEstatus} onChange={(e) => setFiltroEstatus(e.target.value)}>
          <option value="Todas">Todos los estatus</option>
          {ESTATUS_CAMPANA.map((s) => <option key={s}>{s}</option>)}
        </select>
        <OrdenSelector opciones={opcionesOrden} value={orden} onChange={setOrden} />
      </div>

      <div className="space-y-2">
        {ordenadas.map((c) => {
          const r = retorno(c);
          const nc = nComentarios(c.id);
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
                  <IconBtn onClick={() => setComentariosDe(c)}><MessageCircle size={13} />{nc > 0 && <span className="gp-mono" style={{ fontSize: 9, marginLeft: 2 }}>{nc}</span>}</IconBtn>
                  <IconBtn onClick={() => setModal({ item: c })}><Pencil size={13} /></IconBtn><IconBtn onClick={() => onRemove(c.id)}><Trash2 size={13} /></IconBtn>
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mt-3 text-xs">
                <div><p className="gp-text-muted">Presupuesto</p><p className="gp-mono">{fmtMoney(c.presupuesto)}</p></div>
                <div><p className="gp-text-muted">Gastado</p><p className="gp-mono gp-text-red">{fmtMoney(c.gastado)}</p></div>
                <div><p className="gp-text-muted">Alcance</p><p className="gp-mono">{c.alcance || "—"}</p></div>
                <div><p className="gp-text-muted">Clics</p><p className="gp-mono">{c.clics || "—"}</p></div>
                <div><p className="gp-text-muted">Conversiones</p><p className="gp-mono">{c.conversiones || "—"}</p></div>
              </div>
              {c.notas && <p className="text-xs mt-2 gp-text-muted">{c.notas}</p>}
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
            {proyectos.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
          </select>
        </Field>
        <Field label="Plataforma"><select className="gp-input" value={v.plataforma} onChange={(e) => setV({ ...v, plataforma: e.target.value })}>{PLATAFORMAS_CAMPANA.map((c) => <option key={c}>{c}</option>)}</select></Field>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="Fecha de inicio"><input type="date" className="gp-input" value={v.fechaInicio} onChange={(e) => setV({ ...v, fechaInicio: e.target.value })} /></Field>
        <Field label="Fecha de fin (opcional)"><input type="date" className="gp-input" value={v.fechaFin || ""} onChange={(e) => setV({ ...v, fechaFin: e.target.value })} /></Field>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="Presupuesto"><MoneyInput className="gp-input" value={v.presupuesto} onChange={(val) => setV({ ...v, presupuesto: val })} /></Field>
        <Field label="Gastado hasta ahora"><MoneyInput className="gp-input" value={v.gastado} onChange={(val) => setV({ ...v, gastado: val })} /></Field>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Field label="Alcance"><input type="number" className="gp-input" value={v.alcance} onChange={(e) => setV({ ...v, alcance: e.target.value })} /></Field>
        <Field label="Clics"><input type="number" className="gp-input" value={v.clics} onChange={(e) => setV({ ...v, clics: e.target.value })} /></Field>
        <Field label="Conversiones"><input type="number" className="gp-input" value={v.conversiones} onChange={(e) => setV({ ...v, conversiones: e.target.value })} /></Field>
      </div>
      <Field label="Ingreso generado (para calcular retorno)"><MoneyInput className="gp-input" value={v.ingresoGenerado} onChange={(val) => setV({ ...v, ingresoGenerado: val })} /></Field>
      <Field label="Estatus"><select className="gp-input" value={v.estatus} onChange={(e) => setV({ ...v, estatus: e.target.value })}>{ESTATUS_CAMPANA.map((c) => <option key={c}>{c}</option>)}</select></Field>
      <Field label="ID externo (opcional, para cuando conectes Meta/Google/Stripe)"><input className="gp-input" value={v.idExterno || ""} onChange={(e) => setV({ ...v, idExterno: e.target.value })} /></Field>
      <Field label="Notas"><textarea className="gp-input" rows={2} value={v.notas} onChange={(e) => setV({ ...v, notas: e.target.value })} /></Field>
      {error && <p className="text-xs gp-text-red mb-2">{error}</p>}

      <button className="gp-btn w-full py-2 text-sm mt-2" onClick={() => { if (!v.nombre?.toString().trim()) { setError("El nombre de la campaña es obligatorio."); return; } setError(""); onSave(v); }}>Guardar</button>
    </div>
  );
}

/* ---------- Patrimonio (bienes con historial de valuaciones) ---------- */
function Patrimonio({ data, onAdd, onEdit, onRemove, onAddValuacion, onRemoveValuacion, onAddComentario, onRemoveComentario }) {
  const [modal, setModal] = useState(null);
  const [valuacionModal, setValuacionModal] = useState(null); // { bien }
  const [historialDe, setHistorialDe] = useState(null); // { bien }
  const [comentariosDe, setComentariosDe] = useState(null);
  const [filtroCategoria, setFiltroCategoria] = useState("Todas");
  const [orden, setOrden] = useState("default");
  const [ordenDir, setOrdenDir] = useState("asc");
  const toggleOrden = (key) => { if (orden === key) setOrdenDir((d) => (d === "asc" ? "desc" : "asc")); else { setOrden(key); setOrdenDir("asc"); } };
  const empty = { nombre: "", categoria: "Inmueble", fechaAdquisicion: todayISO(), valorAdquisicion: "", notas: "" };

  const valuacionesDe = (id) => (data.patrimonioValuaciones || []).filter((v) => v.patrimonioId === id).sort((a, b) => (b.fecha || "").localeCompare(a.fecha || ""));
  const valorActual = (bien) => {
    const vals = valuacionesDe(bien.id);
    return vals.length ? Number(vals[0].valor) : Number(bien.valorAdquisicion) || 0;
  };
  const nComentarios = (id) => (data.comentarios || []).filter((c) => c.entidadTipo === "patrimonio" && c.entidadId === id).length;

  const camposOrden = {
    alfabetico: { get: (b) => b.nombre, tipo: "texto" },
    registro: { get: (b) => b.createdAt, tipo: "fecha" },
    adquisicion: { get: (b) => b.fechaAdquisicion, tipo: "fecha" },
    valor: { get: (b) => valorActual(b), tipo: "numero" },
  };
  const opcionesOrden = [
    { key: "alfabetico", label: "alfabético" },
    { key: "registro", label: "fecha de registro" },
    { key: "adquisicion", label: "fecha de adquisición" },
    { key: "valor", label: "valor actual" },
  ];

  let bienes = data.patrimonio;
  if (filtroCategoria !== "Todas") bienes = bienes.filter((b) => b.categoria === filtroCategoria);
  const ordenados = ordenarLista(bienes, orden, camposOrden, ordenDir);
  const totalPatrimonio = ordenados.reduce((s, b) => s + valorActual(b), 0);
  const totalAdquisicion = ordenados.reduce((s, b) => s + (Number(b.valorAdquisicion) || 0), 0);

  return (
    <div>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-1">
        <h2 className="gp-serif text-2xl">Patrimonio</h2>
        <button onClick={() => setModal({ item: empty })} className="gp-btn flex items-center justify-center gap-1 px-3 py-1.5 text-sm w-full sm:w-auto"><Plus size={14} /> Nuevo bien</button>
      </div>
      <p className="text-sm gp-text-muted mb-3">Inmuebles, autos, joyería, equipo — con historial de valuaciones para registrar plusvalía o minusvalía a lo largo del tiempo.</p>

      <div className="gp-panel p-4 mb-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div><p className="text-xs gp-text-muted">Valor de adquisición (total)</p><p className="gp-serif text-lg">{fmtMoney(totalAdquisicion)}</p></div>
        <div><p className="text-xs gp-text-muted">Valor actual estimado</p><p className="gp-serif text-lg gp-text-teal">{fmtMoney(totalPatrimonio)}</p></div>
        <div>
          <p className="text-xs gp-text-muted">Plusvalía / minusvalía</p>
          <p className={`gp-serif text-lg ${totalPatrimonio - totalAdquisicion >= 0 ? "gp-text-teal" : "gp-text-red"}`}>{fmtMoney(totalPatrimonio - totalAdquisicion)}</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 mb-4">
        <select className="gp-input text-xs py-1.5" style={{ width: "auto" }} value={filtroCategoria} onChange={(e) => setFiltroCategoria(e.target.value)}>
          <option value="Todas">Todas las categorías</option>
          {CATEGORIAS_PATRIMONIO.map((c) => <option key={c}>{c}</option>)}
        </select>
        <OrdenSelector opciones={opcionesOrden} value={orden} onChange={setOrden} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {ordenados.map((b) => {
          const actual = valorActual(b);
          const adquisicion = Number(b.valorAdquisicion) || 0;
          const diferencia = actual - adquisicion;
          const pct = adquisicion ? (diferencia / adquisicion) * 100 : 0;
          const nc = nComentarios(b.id);
          return (
            <div key={b.id} className="gp-panel p-4">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-medium">{b.nombre}</p>
                    <Badge tone="muted">{b.categoria}</Badge>
                  </div>
                  <p className="text-xs gp-text-muted mt-0.5">Adquirido {b.fechaAdquisicion || "—"} por {fmtMoney(adquisicion)}</p>
                </div>
                <div className="flex gap-1">
                  <IconBtn onClick={() => setComentariosDe(b)}><MessageCircle size={13} />{nc > 0 && <span className="gp-mono" style={{ fontSize: 9, marginLeft: 2 }}>{nc}</span>}</IconBtn>
                  <IconBtn onClick={() => setModal({ item: b })}><Pencil size={13} /></IconBtn><IconBtn onClick={() => onRemove(b.id)}><Trash2 size={13} /></IconBtn>
                </div>
              </div>
              <div className="mt-3 flex items-end justify-between">
                <div>
                  <p className="text-xs gp-text-muted">Valor actual</p>
                  <p className="gp-serif text-lg">{fmtMoney(actual)}</p>
                </div>
                {adquisicion > 0 && (
                  <Badge tone={diferencia >= 0 ? "teal" : "red"}>{diferencia >= 0 ? "+" : ""}{fmtMoney(diferencia)} ({pct >= 0 ? "+" : ""}{pct.toFixed(0)}%)</Badge>
                )}
              </div>
              {b.notas && <p className="text-xs mt-2 gp-text-muted">{b.notas}</p>}
              <div className="flex gap-2 mt-3">
                <button onClick={() => setValuacionModal({ bien: b })} className="gp-btn-ghost flex-1 py-1.5 text-xs">Registrar valuación</button>
                <button onClick={() => setHistorialDe({ bien: b })} className="gp-btn-ghost flex-1 py-1.5 text-xs">Ver historial ({valuacionesDe(b.id).length})</button>
              </div>
            </div>
          );
        })}
        {ordenados.length === 0 && <p className="text-sm gp-text-muted col-span-2">Aún no registras bienes patrimoniales.</p>}
      </div>

      {comentariosDe && (
        <Modal title={`Comentarios — ${comentariosDe.nombre}`} onClose={() => setComentariosDe(null)}>
          <Bitacora data={data} entidadTipo="patrimonio" entidadId={comentariosDe.id} onAdd={onAddComentario} onRemove={onRemoveComentario} />
        </Modal>
      )}

      {valuacionModal && (
        <Modal title={`Registrar valuación — ${valuacionModal.bien.nombre}`} onClose={() => setValuacionModal(null)}>
          <ValuacionForm onSave={(v) => { onAddValuacion({ ...v, patrimonioId: valuacionModal.bien.id }); setValuacionModal(null); }} />
        </Modal>
      )}

      {historialDe && (
        <Modal title={`Historial de valuaciones — ${historialDe.bien.nombre}`} onClose={() => setHistorialDe(null)}>
          <div className="space-y-2">
            <p className="text-xs gp-text-muted mb-2">Valor de adquisición: {fmtMoney(historialDe.bien.valorAdquisicion)} ({historialDe.bien.fechaAdquisicion || "sin fecha"})</p>
            {valuacionesDe(historialDe.bien.id).map((v) => (
              <div key={v.id} className="gp-panel p-3 flex items-center justify-between text-sm">
                <div>
                  <p className="gp-mono">{v.fecha}</p>
                  {v.notas && <p className="text-xs gp-text-muted">{v.notas}</p>}
                </div>
                <div className="flex items-center gap-2">
                  <span className="gp-mono">{fmtMoney(v.valor)}</span>
                  <IconBtn onClick={() => onRemoveValuacion(v.id)}><Trash2 size={13} /></IconBtn>
                </div>
              </div>
            ))}
            {valuacionesDe(historialDe.bien.id).length === 0 && <p className="text-xs gp-text-muted">Sin valuaciones registradas todavía — el valor actual es el de adquisición.</p>}
          </div>
        </Modal>
      )}

      {modal && (
        <Modal title={modal.item.id ? "Editar bien" : "Nuevo bien"} onClose={() => setModal(null)}>
          <PatrimonioForm item={modal.item} onSave={(v) => { modal.item.id ? onEdit(modal.item.id, v) : onAdd(v); setModal(null); }} />
        </Modal>
      )}
    </div>
  );
}

function PatrimonioForm({ item, onSave }) {
  const [v, setV] = useState(item);
  const [error, setError] = useState("");
  return (
    <div>
      <Field label="Nombre"><input className="gp-input" placeholder="ej. Depa Subancuy, Honda Civic, Reloj X" value={v.nombre} onChange={(e) => setV({ ...v, nombre: e.target.value })} /></Field>
      <Field label="Categoría"><select className="gp-input" value={v.categoria} onChange={(e) => setV({ ...v, categoria: e.target.value })}>{CATEGORIAS_PATRIMONIO.map((c) => <option key={c}>{c}</option>)}</select></Field>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="Fecha de adquisición"><input type="date" className="gp-input" value={v.fechaAdquisicion || ""} onChange={(e) => setV({ ...v, fechaAdquisicion: e.target.value })} /></Field>
        <Field label="Valor de adquisición"><MoneyInput className="gp-input" value={v.valorAdquisicion} onChange={(val) => setV({ ...v, valorAdquisicion: val })} /></Field>
      </div>
      <Field label="Notas"><textarea className="gp-input" rows={2} value={v.notas} onChange={(e) => setV({ ...v, notas: e.target.value })} /></Field>
      {error && <p className="text-xs gp-text-red mb-2">{error}</p>}

      <button className="gp-btn w-full py-2 text-sm mt-2" onClick={() => { if (!v.nombre?.toString().trim()) { setError("El nombre es obligatorio."); return; } setError(""); onSave(v); }}>Guardar</button>
    </div>
  );
}

function ValuacionForm({ onSave }) {
  const [v, setV] = useState({ fecha: todayISO(), valor: "", notas: "" });
  const [error, setError] = useState("");
  return (
    <div>
      <Field label="Fecha de la valuación"><input type="date" className="gp-input" value={v.fecha} onChange={(e) => setV({ ...v, fecha: e.target.value })} /></Field>
      <Field label="Valor estimado"><MoneyInput className="gp-input" value={v.valor} onChange={(val) => setV({ ...v, valor: val })} /></Field>
      <Field label="Notas (opcional)"><input className="gp-input" placeholder="ej. avalúo bancario, cotización de agente" value={v.notas} onChange={(e) => setV({ ...v, notas: e.target.value })} /></Field>
      {error && <p className="text-xs gp-text-red mb-2">{error}</p>}
      <button className="gp-btn w-full py-2 text-sm mt-2" onClick={() => { if (!v.valor) { setError("Captura el valor estimado."); return; } setError(""); onSave(v); }}>Guardar valuación</button>
    </div>
  );
}

/* ---------- Legal y contratos ---------- */
function Documentos({ data, onAdd, onEdit, onRemove }) {
  const [modal, setModal] = useState(null);
  const [orden, setOrden] = useState("default");
  const [ordenDir, setOrdenDir] = useState("asc");
  const toggleOrden = (key) => { if (orden === key) setOrdenDir((d) => (d === "asc" ? "desc" : "asc")); else { setOrden(key); setOrdenDir("asc"); } };
  const empty = { tipo: "Contrato", nombre: "", proyectoId: "", fechaVencimiento: "", notas: "" };
  const camposOrden = {
    vencimiento: { get: (d) => d.fechaVencimiento, tipo: "fecha" },
    registro: { get: (d) => d.createdAt, tipo: "fecha" },
    alfabetico: { get: (d) => d.nombre, tipo: "texto" },
  };
  const opcionesOrden = [
    { key: "vencimiento", label: "fecha de vencimiento" },
    { key: "registro", label: "fecha de registro" },
    { key: "alfabetico", label: "alfabético" },
  ];
  const base = orden === "default" ? [...data.documentos].sort((a, b) => (a.fechaVencimiento || "").localeCompare(b.fechaVencimiento || "")) : data.documentos;
  const ordenados = ordenarLista(base, orden, camposOrden, ordenDir);
  const nombreProyecto = (id) => data.proyectos.find((p) => p.id === id)?.nombre || "—";

  return (
    <div>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-1">
        <h2 className="gp-serif text-2xl">Legal y contratos</h2>
        <button onClick={() => setModal({ item: empty })} className="gp-btn flex items-center justify-center gap-1 px-3 py-1.5 text-sm w-full sm:w-auto"><Plus size={14} /> Nuevo</button>
      </div>
      <p className="text-sm gp-text-muted mb-3">Contratos, registros de marca ante IMPI y demás documentos, por proyecto.</p>
      <div className="mb-4"><OrdenSelector opciones={opcionesOrden} value={orden} onChange={setOrden} /></div>

      <div className="gp-panel overflow-x-auto">
        <table className="gp-table">
          <thead><tr><Th label="Documento" sortKey="alfabetico" orden={orden} ordenDir={ordenDir} onToggle={toggleOrden} /><th>Tipo</th><th>Proyecto</th><Th label="Vencimiento" sortKey="vencimiento" orden={orden} ordenDir={ordenDir} onToggle={toggleOrden} /><th>Notas</th><th></th></tr></thead>
          <tbody>
            {ordenados.map((d) => (
              <tr key={d.id}>
                <td>{d.nombre}</td>
                <td className="gp-text-muted">{d.tipo}</td>
                <td className="gp-text-muted">{nombreProyecto(d.proyectoId)}</td>
                <td className="gp-mono">{d.fechaVencimiento || "—"}</td>
                <td className="gp-text-muted">{d.notas}</td>
                <td><div className="flex gap-1"><IconBtn onClick={() => setModal({ item: d })}><Pencil size={13} /></IconBtn><IconBtn onClick={() => onRemove(d.id)}><Trash2 size={13} /></IconBtn></div></td>
              </tr>
            ))}
            {ordenados.length === 0 && <tr><td colSpan={6} className="text-center gp-text-muted py-6">Sin documentos registrados.</td></tr>}
          </tbody>
        </table>
      </div>

      {modal && (
        <Modal title={modal.item.id ? "Editar documento" : "Nuevo documento"} onClose={() => setModal(null)}>
          <DocumentoForm item={modal.item} proyectos={data.proyectos} onSave={(v) => { modal.item.id ? onEdit(modal.item.id, v) : onAdd(v); setModal(null); }} />
        </Modal>
      )}
    </div>
  );
}

function DocumentoForm({ item, proyectos, onSave }) {
  const [v, setV] = useState(item);
  const [error, setError] = useState("");
  return (
    <div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="Tipo"><select className="gp-input" value={v.tipo} onChange={(e) => setV({ ...v, tipo: e.target.value })}>{TIPO_DOCUMENTO.map((c) => <option key={c}>{c}</option>)}</select></Field>
        <Field label="Nombre"><input className="gp-input" value={v.nombre} onChange={(e) => setV({ ...v, nombre: e.target.value })} /></Field>
      </div>
      <Field label="Proyecto relacionado">
        <select className="gp-input" value={v.proyectoId} onChange={(e) => setV({ ...v, proyectoId: e.target.value })}>
          <option value="">— ninguno —</option>
          {proyectos.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
        </select>
      </Field>
      <Field label="Fecha de vencimiento (si aplica)"><input type="date" className="gp-input" value={v.fechaVencimiento} onChange={(e) => setV({ ...v, fechaVencimiento: e.target.value })} /></Field>
      <Field label="Notas"><textarea className="gp-input" rows={2} value={v.notas} onChange={(e) => setV({ ...v, notas: e.target.value })} /></Field>
      {error && <p className="text-xs gp-text-red mb-2">{error}</p>}

      <button className="gp-btn w-full py-2 text-sm mt-2" onClick={() => { if (!v.nombre?.toString().trim()) { setError("El nombre del documento es obligatorio."); return; } setError(""); onSave(v); }}>Guardar</button>
    </div>
  );
}

/* ---------- Hábitos ---------- */
function Habitos({ data, onAdd, onEdit, onRemove }) {
  const [nuevo, setNuevo] = useState("");
  const [orden, setOrden] = useState("default");
  const hoy = todayISO();

  const toggleHoy = (h) => {
    const hecho = (h.fechas || []).includes(hoy);
    const fechas = hecho ? h.fechas.filter((f) => f !== hoy) : [...(h.fechas || []), hoy];
    onEdit(h.id, { fechas });
  };

  const racha = (h) => {
    let n = 0;
    let d = new Date(hoy);
    while ((h.fechas || []).includes(d.toISOString().slice(0, 10))) {
      n++; d.setDate(d.getDate() - 1);
    }
    return n;
  };

  const camposOrden = {
    alfabetico: { get: (h) => h.nombre, tipo: "texto" },
    registro: { get: (h) => h.createdAt, tipo: "fecha" },
    racha: { get: (h) => racha(h), tipo: "numero" },
  };
  const opcionesOrden = [
    { key: "alfabetico", label: "alfabético" },
    { key: "registro", label: "fecha de registro" },
    { key: "racha", label: "racha actual" },
  ];
  const listaHabitos = ordenarLista(data.habitos, orden, camposOrden);

  return (
    <div>
      <h2 className="gp-serif text-2xl mb-1">Hábitos</h2>
      <p className="text-sm gp-text-muted mb-3">Marca el día con un clic. La racha se calcula sola.</p>
      <div className="mb-5"><OrdenSelector opciones={opcionesOrden} value={orden} onChange={setOrden} /></div>

      <div className="flex flex-col sm:flex-row gap-2 mb-5">
        <input className="gp-input flex-1 sm:max-w-xs" placeholder="ej. Leer 20 min, Practicar inglés" value={nuevo} onChange={(e) => setNuevo(e.target.value)} onKeyDown={(e) => e.key === "Enter" && nuevo.trim() && (onAdd({ nombre: nuevo, fechas: [] }), setNuevo(""))} />
        <button className="gp-btn px-3 py-2 sm:py-0 text-sm" onClick={() => { if (nuevo.trim()) { onAdd({ nombre: nuevo, fechas: [] }); setNuevo(""); } }}>Agregar hábito</button>
      </div>

      <div className="space-y-2">
        {listaHabitos.map((h) => {
          const hechoHoy = (h.fechas || []).includes(hoy);
          return (
            <div key={h.id} className="gp-panel p-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button onClick={() => toggleHoy(h)}
                  className="w-7 h-7 rounded flex items-center justify-center"
                  style={{ background: hechoHoy ? "var(--teal)" : "transparent", border: "1px solid var(--border)" }}>
                  {hechoHoy && <Check size={14} color="#12141c" />}
                </button>
                <span className="text-sm">{h.nombre}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs gp-text-gold flex items-center gap-1"><Flame size={12} /> {racha(h)}d</span>
                <IconBtn onClick={() => onRemove(h.id)}><Trash2 size={13} /></IconBtn>
              </div>
            </div>
          );
        })}
        {data.habitos.length === 0 && <p className="text-sm gp-text-muted">Aún no tienes hábitos registrados.</p>}
      </div>
    </div>
  );
}

/* ---------- Salud ---------- */
function Salud({ data, onAdd, onEdit, onRemove, onUpdatePerfil }) {
  const [modal, setModal] = useState(null);
  const [altura, setAltura] = useState(data.perfilSalud?.alturaCm || "");
  const [orden, setOrden] = useState("default");
  const [ordenDir, setOrdenDir] = useState("asc");
  const toggleOrden = (key) => { if (orden === key) setOrdenDir((d) => (d === "asc" ? "desc" : "asc")); else { setOrden(key); setOrdenDir("asc"); } };
  const empty = { fecha: todayISO(), peso: "", glucosa: "", colesterol: "", trigliceridos: "", notas: "", estudio: null };
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
  const base = orden === "default" ? [...data.salud].sort((a, b) => (b.fecha || "").localeCompare(a.fecha || "")) : data.salud;
  const ordenados = ordenarLista(base, orden, camposOrden, ordenDir);
  const alturaCm = data.perfilSalud?.alturaCm;

  const toneCategoria = (cat) => (cat === "Normal" ? "teal" : cat === "Bajo peso" ? "gold" : cat === "Sobrepeso" ? "gold" : cat === "Obesidad" ? "red" : "muted");

  return (
    <div>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-1">
        <h2 className="gp-serif text-2xl">Salud</h2>
        <button onClick={() => setModal({ item: empty })} className="gp-btn flex items-center justify-center gap-1 px-3 py-1.5 text-sm w-full sm:w-auto"><Plus size={14} /> Registrar</button>
      </div>
      <p className="text-sm gp-text-muted mb-4">Peso, glucosa, colesterol, triglicéridos y tus estudios en PDF, todo en un mismo historial.</p>

      <div className="gp-panel p-3 mb-4 flex flex-wrap items-center gap-3">
        <span className="text-xs gp-text-muted">Tu estatura (para calcular IMC):</span>
        <input type="number" className="gp-input" style={{ maxWidth: 100 }} value={altura}
          onChange={(e) => setAltura(e.target.value)}
          onBlur={() => onUpdatePerfil({ alturaCm: altura })} />
        <span className="text-xs gp-text-muted">cm</span>
        {!alturaCm && <span className="text-xs gp-text-gold">Captúrala para ver tu categoría de peso.</span>}
      </div>
      <div className="mb-5"><OrdenSelector opciones={opcionesOrden} value={orden} onChange={setOrden} /></div>

      <div className="gp-panel overflow-x-auto">
        <table className="gp-table">
          <thead><tr><Th label="Fecha" sortKey="fecha" orden={orden} ordenDir={ordenDir} onToggle={toggleOrden} /><Th label="Peso (kg)" sortKey="peso" orden={orden} ordenDir={ordenDir} onToggle={toggleOrden} /><th>IMC</th><th>Categoría</th><th>Glucosa</th><th>Colesterol</th><th>Triglicéridos</th><th>Estudio</th><th>Notas</th><th></th></tr></thead>
          <tbody>
            {ordenados.map((s) => {
              const imc = calcIMC(s.peso, alturaCm);
              const cat = categoriaIMC(imc);
              return (
                <tr key={s.id}>
                  <td className="gp-mono">{s.fecha}</td>
                  <td className="gp-mono">{s.peso || "—"}</td>
                  <td className="gp-mono">{imc ? imc.toFixed(1) : "—"}</td>
                  <td>{cat ? <Badge tone={toneCategoria(cat)}>{cat}</Badge> : "—"}</td>
                  <td className="gp-mono">{s.glucosa || "—"}</td>
                  <td className="gp-mono">{s.colesterol || "—"}</td>
                  <td className="gp-mono">{s.trigliceridos || "—"}</td>
                  <td>
                    {s.estudio ? (
                      <a href={s.estudio.url} target="_blank" rel="noopener noreferrer" className="gp-text-gold text-xs flex items-center gap-1">
                        <FileText size={12} /> {s.estudio.nombre.length > 14 ? s.estudio.nombre.slice(0, 14) + "…" : s.estudio.nombre}
                      </a>
                    ) : "—"}
                  </td>
                  <td className="gp-text-muted">{s.notas}</td>
                  <td><div className="flex gap-1"><IconBtn onClick={() => setModal({ item: s })}><Pencil size={13} /></IconBtn><IconBtn onClick={() => onRemove(s.id)}><Trash2 size={13} /></IconBtn></div></td>
                </tr>
              );
            })}
            {ordenados.length === 0 && <tr><td colSpan={10} className="text-center gp-text-muted py-6">Sin registros de salud.</td></tr>}
          </tbody>
        </table>
      </div>

      {modal && (
        <Modal title={modal.item.id ? "Editar registro" : "Nuevo registro"} onClose={() => setModal(null)}>
          <SaludForm item={modal.item} onSave={(v) => { modal.item.id ? onEdit(modal.item.id, v) : onAdd(v); setModal(null); }} />
        </Modal>
      )}
    </div>
  );
}

function SaludForm({ item, onSave }) {
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

  return (
    <div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="Fecha"><input type="date" className="gp-input" value={v.fecha} onChange={(e) => setV({ ...v, fecha: e.target.value })} /></Field>
        <Field label="Peso (kg)"><input type="number" className="gp-input" value={v.peso} onChange={(e) => setV({ ...v, peso: e.target.value })} /></Field>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Field label="Glucosa (mg/dL)"><input type="number" className="gp-input" value={v.glucosa} onChange={(e) => setV({ ...v, glucosa: e.target.value })} /></Field>
        <Field label="Colesterol (mg/dL)"><input type="number" className="gp-input" value={v.colesterol} onChange={(e) => setV({ ...v, colesterol: e.target.value })} /></Field>
        <Field label="Triglicéridos (mg/dL)"><input type="number" className="gp-input" value={v.trigliceridos} onChange={(e) => setV({ ...v, trigliceridos: e.target.value })} /></Field>
      </div>
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

/* ---------- Reportes ---------- */
const RANGOS_REPORTE = [
  { label: "Últimos 3 meses", meses: 3 },
  { label: "Últimos 6 meses", meses: 6 },
  { label: "Últimos 12 meses", meses: 12 },
  { label: "Últimos 24 meses", meses: 24 },
];

function Reportes({ data }) {
  const [rangoMeses, setRangoMeses] = useState(6);
  const [proyectoFiltro, setProyectoFiltro] = useState("");

  const finanzasFiltradas = useMemo(
    () => (proyectoFiltro ? data.finanzas.filter((f) => f.proyectoId === proyectoFiltro) : data.finanzas),
    [data.finanzas, proyectoFiltro]
  );

  const monthKeys = useMemo(() => lastNMonthKeys(rangoMeses), [rangoMeses]);
  const ledger = useMemo(() => buildMonthlyLedger(finanzasFiltradas, monthKeys), [finanzasFiltradas, monthKeys]);

  const nombreProyecto = (id) => data.proyectos.find((p) => p.id === id)?.nombre || "Sin proyecto";

  // serie mensual: ingresos vs egresos
  const serieMensual = useMemo(() => monthKeys.map((m) => {
    const delMes = ledger.filter((e) => e.mes === m);
    const ingresos = delMes.filter((e) => e.tipo === "Ingreso").reduce((s, e) => s + e.monto, 0);
    const egresos = delMes.filter((e) => e.tipo === "Egreso").reduce((s, e) => s + e.monto, 0);
    return { mes: monthLabel(m), ingresos, egresos, neto: ingresos - egresos };
  }), [ledger, monthKeys]);

  // acumulado neto
  const serieAcumulada = useMemo(() => {
    let acc = 0;
    return serieMensual.map((p) => { acc += p.neto; return { mes: p.mes, acumulado: acc }; });
  }, [serieMensual]);

  // egresos por categoría (todo el rango)
  const porCategoria = useMemo(() => {
    const map = {};
    for (const e of ledger) {
      if (e.tipo !== "Egreso") continue;
      map[e.categoria] = (map[e.categoria] || 0) + e.monto;
    }
    return Object.entries(map).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 8);
  }, [ledger]);

  // por proyecto (neto, todo el rango)
  const porProyecto = useMemo(() => {
    const map = {};
    for (const e of ledger) {
      const key = e.proyectoId || "sin-proyecto";
      if (!map[key]) map[key] = { ingresos: 0, egresos: 0 };
      map[key][e.tipo === "Ingreso" ? "ingresos" : "egresos"] += e.monto;
    }
    return Object.entries(map)
      .map(([id, v]) => ({ nombre: id === "sin-proyecto" ? "Sin proyecto" : nombreProyecto(id), neto: v.ingresos - v.egresos }))
      .sort((a, b) => b.neto - a.neto);
  }, [ledger, data.proyectos]);

  const totalIngresos = serieMensual.reduce((s, m) => s + m.ingresos, 0);
  const totalEgresos = serieMensual.reduce((s, m) => s + m.egresos, 0);
  const gastoRecurrenteMensual = useMemo(() => {
    const hoy = todayISO().slice(0, 7);
    return finanzasFiltradas
      .filter((f) => f.esRecurrente && f.tipo === "Egreso" && f.frecuencia !== "Anual" && (!f.fechaFin || f.fechaFin.slice(0, 7) >= hoy) && (f.fecha || "").slice(0, 7) <= hoy)
      .reduce((s, f) => s + Number(f.monto || 0), 0);
  }, [finanzasFiltradas]);

  // ---- Punto 7: estimaciones basadas en histórico (sin IA, solo estadística) ----
  const estimaciones = useMemo(() => {
    // utilidad de eventos (con utilidad definida, sin importar el rango de fechas del filtro)
    const utilidadesEventos = data.eventos.map((e) => e.utilidad).filter((u) => u !== null && u !== undefined && u !== "").map(Number);
    const promedioEvento = utilidadesEventos.length ? utilidadesEventos.reduce((a, b) => a + b, 0) / utilidadesEventos.length : null;
    const ordenExtremos = [...utilidadesEventos].sort((a, b) => a - b);
    const medianaEvento = ordenExtremos.length ? ordenExtremos[Math.floor(ordenExtremos.length / 2)] : null;

    // utilidad de rentas (Escápate YA), identificadas por categoría
    const rentas = data.finanzas.filter((f) => f.categoria === "Renta Airbnb" && f.monto);
    const promedioRenta = rentas.length ? rentas.reduce((s, f) => s + Number(f.monto), 0) / rentas.length : null;

    // gasto mensual promedio por categoría (para presupuestar el próximo mes), en el rango filtrado
    const gastoPorCategoriaMeses = {};
    for (const e of ledger) {
      if (e.tipo !== "Egreso") continue;
      gastoPorCategoriaMeses[e.categoria] = (gastoPorCategoriaMeses[e.categoria] || 0) + e.monto;
    }
    const promedioMensualPorCategoria = Object.entries(gastoPorCategoriaMeses)
      .map(([cat, total]) => ({ categoria: cat, promedio: total / rangoMeses }))
      .sort((a, b) => b.promedio - a.promedio)
      .slice(0, 5);

    // precisión de estimación de tiempo en tareas (tiempoEstimado vs tiempoReal, cuando ambos existen)
    const tareasConAmbos = data.pendientes.filter((t) => t.tiempoEstimado && t.tiempoReal);
    let precisionTiempo = null;
    if (tareasConAmbos.length > 0) {
      const desviaciones = tareasConAmbos.map((t) => (Number(t.tiempoReal) - Number(t.tiempoEstimado)) / Number(t.tiempoEstimado));
      const promedioDesv = desviaciones.reduce((a, b) => a + b, 0) / desviaciones.length;
      precisionTiempo = { n: tareasConAmbos.length, sesgoPct: promedioDesv * 100 };
    }

    // proyección simple del próximo mes (promedio de los últimos meses del rango filtrado)
    const proyeccionIngreso = serieMensual.length ? serieMensual.reduce((s, m) => s + m.ingresos, 0) / serieMensual.length : 0;
    const proyeccionEgreso = serieMensual.length ? serieMensual.reduce((s, m) => s + m.egresos, 0) / serieMensual.length : 0;

    return { promedioEvento, medianaEvento, nEventos: utilidadesEventos.length, promedioRenta, nRentas: rentas.length, promedioMensualPorCategoria, precisionTiempo, proyeccionIngreso, proyeccionEgreso };
  }, [data.eventos, data.finanzas, data.pendientes, ledger, rangoMeses, serieMensual]);

  return (
    <div>
      <h2 className="gp-serif text-2xl mb-1">Reportes</h2>
      <p className="text-sm gp-text-muted mb-4">Ingresos, egresos y pagos recurrentes, todos mezclados en un mismo panorama.</p>

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <select className="gp-input sm:max-w-[200px]" value={rangoMeses} onChange={(e) => setRangoMeses(Number(e.target.value))}>
          {RANGOS_REPORTE.map((r) => <option key={r.meses} value={r.meses}>{r.label}</option>)}
        </select>
        <select className="gp-input sm:max-w-[220px]" value={proyectoFiltro} onChange={(e) => setProyectoFiltro(e.target.value)}>
          <option value="">Todos los proyectos</option>
          {data.proyectos.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
        </select>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <Stat label="Ingresos del periodo" value={fmtMoney(totalIngresos)} tone="teal" />
        <Stat label="Egresos del periodo" value={fmtMoney(totalEgresos)} tone="red" />
        <Stat label="Neto del periodo" value={fmtMoney(totalIngresos - totalEgresos)} />
        <Stat label="Recurrente mensual activo" value={fmtMoney(gastoRecurrenteMensual)} tone="gold" />
      </div>

      <div className="gp-panel p-4 mb-4">
        <h3 className="text-sm font-medium mb-3">Ingresos vs egresos por mes</h3>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={serieMensual} margin={{ left: -20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="mes" tick={{ fill: "var(--muted)", fontSize: 11 }} />
            <YAxis tick={{ fill: "var(--muted)", fontSize: 11 }} />
            <Tooltip contentStyle={{ background: "var(--panel)", border: "1px solid var(--border)", fontSize: 12 }} formatter={(v) => fmtMoney(v)} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Bar dataKey="ingresos" name="Ingresos" fill="var(--teal)" radius={[3, 3, 0, 0]} />
            <Bar dataKey="egresos" name="Egresos" fill="var(--red)" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div className="gp-panel p-4">
          <h3 className="text-sm font-medium mb-3">Ganancia neta acumulada</h3>
          <ResponsiveContainer width="100%" height={230}>
            <LineChart data={serieAcumulada} margin={{ left: -20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="mes" tick={{ fill: "var(--muted)", fontSize: 11 }} />
              <YAxis tick={{ fill: "var(--muted)", fontSize: 11 }} />
              <Tooltip contentStyle={{ background: "var(--panel)", border: "1px solid var(--border)", fontSize: 12 }} formatter={(v) => fmtMoney(v)} />
              <Line type="monotone" dataKey="acumulado" name="Neto acumulado" stroke="var(--gold)" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="gp-panel p-4">
          <h3 className="text-sm font-medium mb-3">Egresos por categoría</h3>
          {porCategoria.length === 0 ? (
            <p className="text-xs gp-text-muted">Sin egresos en este periodo.</p>
          ) : (
            <ResponsiveContainer width="100%" height={230}>
              <PieChart>
                <Pie data={porCategoria} dataKey="value" nameKey="name" innerRadius={45} outerRadius={80} paddingAngle={2}>
                  {porCategoria.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ background: "var(--panel)", border: "1px solid var(--border)", fontSize: 12 }} formatter={(v) => fmtMoney(v)} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className="gp-panel p-4">
        <h3 className="text-sm font-medium mb-3">Neto por proyecto</h3>
        {porProyecto.length === 0 ? (
          <p className="text-xs gp-text-muted">Sin movimientos en este periodo.</p>
        ) : (
          <ResponsiveContainer width="100%" height={Math.max(160, porProyecto.length * 40)}>
            <BarChart data={porProyecto} layout="vertical" margin={{ left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis type="number" tick={{ fill: "var(--muted)", fontSize: 11 }} />
              <YAxis type="category" dataKey="nombre" width={120} tick={{ fill: "var(--muted)", fontSize: 11 }} />
              <Tooltip contentStyle={{ background: "var(--panel)", border: "1px solid var(--border)", fontSize: 12 }} formatter={(v) => fmtMoney(v)} />
              <Bar dataKey="neto" radius={[0, 3, 3, 0]}>
                {porProyecto.map((p, i) => <Cell key={i} fill={p.neto >= 0 ? "var(--teal)" : "var(--red)"} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="gp-panel p-4 mt-4">
        <div className="flex items-center gap-2 mb-1">
          <Lightbulb size={15} className="gp-text-gold" />
          <h3 className="text-sm font-medium">Estimaciones basadas en tu histórico</h3>
        </div>
        <p className="text-xs gp-text-muted mb-4">Calculado con estadística simple sobre tus datos ya cargados — sin IA externa, sin costo. Entre más datos reales captures, más afinadas quedan estas cifras.</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <p className="text-xs gp-text-muted mb-1">Utilidad esperada por evento/show</p>
            {estimaciones.nEventos > 0 ? (
              <p className="text-sm">Promedio: <span className="gp-mono gp-text-teal">{fmtMoney(estimaciones.promedioEvento)}</span> · Mediana: <span className="gp-mono">{fmtMoney(estimaciones.medianaEvento)}</span> <span className="gp-text-muted">({estimaciones.nEventos} eventos con dato)</span></p>
            ) : <p className="text-xs gp-text-muted">Aún no hay suficientes eventos con utilidad capturada.</p>}
          </div>

          <div>
            <p className="text-xs gp-text-muted mb-1">Ingreso esperado por renta (Escápate YA)</p>
            {estimaciones.nRentas > 0 ? (
              <p className="text-sm">Promedio: <span className="gp-mono gp-text-teal">{fmtMoney(estimaciones.promedioRenta)}</span> <span className="gp-text-muted">({estimaciones.nRentas} rentas)</span></p>
            ) : <p className="text-xs gp-text-muted">Aún no hay rentas registradas.</p>}
          </div>

          <div>
            <p className="text-xs gp-text-muted mb-1">Proyección para el próximo mes (según el rango que ves arriba)</p>
            <p className="text-sm">Ingresos: <span className="gp-mono gp-text-teal">{fmtMoney(estimaciones.proyeccionIngreso)}</span> · Egresos: <span className="gp-mono gp-text-red">{fmtMoney(estimaciones.proyeccionEgreso)}</span></p>
          </div>

          <div>
            <p className="text-xs gp-text-muted mb-1">Precisión al estimar tiempos en tareas</p>
            {estimaciones.precisionTiempo ? (
              <p className="text-sm">
                En promedio tardas <span className={`gp-mono ${estimaciones.precisionTiempo.sesgoPct > 0 ? "gp-text-red" : "gp-text-teal"}`}>{estimaciones.precisionTiempo.sesgoPct > 0 ? "+" : ""}{estimaciones.precisionTiempo.sesgoPct.toFixed(0)}%</span> de lo que estimas <span className="gp-text-muted">({estimaciones.precisionTiempo.n} tareas con estimado y real)</span>
              </p>
            ) : <p className="text-xs gp-text-muted">Captura tiempo estimado y real en tus Pendientes para que esto se active.</p>}
          </div>
        </div>

        {estimaciones.promedioMensualPorCategoria.length > 0 && (
          <div className="mt-4 pt-4 border-t gp-border">
            <p className="text-xs gp-text-muted mb-2">Gasto mensual promedio por categoría (para presupuestar el mes que sigue)</p>
            <div className="space-y-1">
              {estimaciones.promedioMensualPorCategoria.map((c) => (
                <div key={c.categoria} className="flex justify-between text-xs">
                  <span className="gp-text-muted">{c.categoria}</span>
                  <span className="gp-mono">{fmtMoney(c.promedio)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ---------- Apartados / metas de ahorro ---------- */
function Apartados({ data, onAdd, onEdit, onRemove, onMoverFondos }) {
  const [modal, setModal] = useState(null);
  const [fondoModal, setFondoModal] = useState(null); // { apartado }
  const [moverModal, setMoverModal] = useState(null); // { apartado }
  const [orden, setOrden] = useState("default");
  const empty = { nombre: "", proyectoId: "", montoObjetivo: "", montoActual: "0", fechaObjetivo: "", notas: "" };
  const nombreProyecto = (id) => data.proyectos.find((p) => p.id === id)?.nombre || "—";
  const pctAvance = (a) => { const obj = Number(a.montoObjetivo) || 0; const act = Number(a.montoActual) || 0; return obj ? Math.min(100, (act / obj) * 100) : 0; };
  const camposOrden = {
    objetivo: { get: (a) => a.fechaObjetivo, tipo: "fecha" },
    registro: { get: (a) => a.createdAt, tipo: "fecha" },
    alfabetico: { get: (a) => a.nombre, tipo: "texto" },
    avance: { get: (a) => pctAvance(a), tipo: "numero" },
  };
  const opcionesOrden = [
    { key: "objetivo", label: "fecha objetivo" },
    { key: "registro", label: "fecha de registro" },
    { key: "alfabetico", label: "alfabético" },
    { key: "avance", label: "% de avance" },
  ];
  const listaApartados = ordenarLista(data.apartados, orden, camposOrden);

  return (
    <div>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-1">
        <h2 className="gp-serif text-2xl">Apartados</h2>
        <button onClick={() => setModal({ item: empty })} className="gp-btn flex items-center justify-center gap-1 px-3 py-1.5 text-sm w-full sm:w-auto"><Plus size={14} /> Nuevo</button>
      </div>
      <p className="text-sm gp-text-muted mb-3">Dinero apartado para un proyecto o una meta específica, como un viaje.</p>
      <div className="mb-4"><OrdenSelector opciones={opcionesOrden} value={orden} onChange={setOrden} /></div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {listaApartados.map((a) => {
          const objetivo = Number(a.montoObjetivo) || 0;
          const actual = Number(a.montoActual) || 0;
          const pct = objetivo ? Math.min(100, (actual / objetivo) * 100) : 0;
          const completo = objetivo > 0 && actual >= objetivo;
          return (
            <div key={a.id} className="gp-panel p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium">{a.nombre}</p>
                  <p className="text-xs gp-text-muted mt-0.5">{a.proyectoId ? nombreProyecto(a.proyectoId) : "Personal"} {a.fechaObjetivo ? `· para ${a.fechaObjetivo}` : ""}</p>
                </div>
                <div className="flex gap-1"><IconBtn onClick={() => setModal({ item: a })}><Pencil size={13} /></IconBtn><IconBtn onClick={() => onRemove(a.id)}><Trash2 size={13} /></IconBtn></div>
              </div>
              <div className="mt-3">
                <div className="flex justify-between text-xs mb-1">
                  <span className="gp-mono gp-text-gold">{fmtMoney(actual)}</span>
                  <span className="gp-text-muted">de {fmtMoney(objetivo)}</span>
                </div>
                <div className="h-2 rounded" style={{ background: "var(--border)" }}>
                  <div className="h-2 rounded" style={{ width: `${pct}%`, background: completo ? "var(--teal)" : "var(--gold)" }} />
                </div>
              </div>
              {a.notas && <p className="text-xs gp-text-muted mt-3">{a.notas}</p>}
              <div className="flex gap-2 mt-3">
                <button onClick={() => setFondoModal({ apartado: a })} className="gp-btn-ghost flex-1 py-1.5 text-xs">
                  {completo ? "Meta alcanzada — ajustar" : "Agregar fondos"}
                </button>
                <button onClick={() => setMoverModal({ apartado: a })} disabled={actual <= 0} className="gp-btn-ghost flex-1 py-1.5 text-xs disabled:opacity-40">
                  Mover a proyecto
                </button>
              </div>
            </div>
          );
        })}
        {data.apartados.length === 0 && <p className="text-sm gp-text-muted col-span-2">Aún no tienes apartados. Crea uno para tu próximo viaje o compra grande.</p>}
      </div>

      {modal && (
        <Modal title={modal.item.id ? "Editar apartado" : "Nuevo apartado"} onClose={() => setModal(null)}>
          <ApartadoForm item={modal.item} proyectos={data.proyectos} onSave={(v) => { modal.item.id ? onEdit(modal.item.id, v) : onAdd(v); setModal(null); }} />
        </Modal>
      )}
      {fondoModal && (
        <Modal title={`Agregar fondos — ${fondoModal.apartado.nombre}`} onClose={() => setFondoModal(null)}>
          <AgregarFondosForm
            apartado={fondoModal.apartado}
            onSave={(nuevoMonto) => { onEdit(fondoModal.apartado.id, { montoActual: nuevoMonto }); setFondoModal(null); }}
          />
        </Modal>
      )}
      {moverModal && (
        <Modal title={`Mover fondos — ${moverModal.apartado.nombre}`} onClose={() => setMoverModal(null)}>
          <MoverFondosForm
            apartado={moverModal.apartado}
            proyectos={data.proyectos}
            onSave={(payload) => { onMoverFondos(moverModal.apartado, payload); setMoverModal(null); }}
          />
        </Modal>
      )}
    </div>
  );
}

function ApartadoForm({ item, proyectos, onSave }) {
  const [v, setV] = useState(item);
  const [error, setError] = useState("");
  return (
    <div>
      <Field label="Nombre"><input className="gp-input" placeholder="ej. Viaje a Cancún, Laptop nueva" value={v.nombre} onChange={(e) => setV({ ...v, nombre: e.target.value })} /></Field>
      <Field label="Proyecto relacionado (opcional)">
        <select className="gp-input" value={v.proyectoId} onChange={(e) => setV({ ...v, proyectoId: e.target.value })}>
          <option value="">— personal —</option>
          {proyectos.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
        </select>
      </Field>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="Monto objetivo"><MoneyInput className="gp-input" value={v.montoObjetivo} onChange={(val) => setV({ ...v, montoObjetivo: val })} /></Field>
        <Field label="Ya tienes ahorrado"><MoneyInput className="gp-input" value={v.montoActual} onChange={(val) => setV({ ...v, montoActual: val })} /></Field>
      </div>
      <Field label="Fecha objetivo (opcional)"><input type="date" className="gp-input" value={v.fechaObjetivo} onChange={(e) => setV({ ...v, fechaObjetivo: e.target.value })} /></Field>
      <Field label="Notas"><textarea className="gp-input" rows={2} value={v.notas} onChange={(e) => setV({ ...v, notas: e.target.value })} /></Field>
      {error && <p className="text-xs gp-text-red mb-2">{error}</p>}

      <button className="gp-btn w-full py-2 text-sm mt-2" onClick={() => { if (!v.nombre?.toString().trim()) { setError("El nombre del apartado es obligatorio."); return; } setError(""); onSave(v); }}>Guardar</button>
    </div>
  );
}

function AgregarFondosForm({ apartado, onSave }) {
  const [monto, setMonto] = useState("");
  const actual = Number(apartado.montoActual) || 0;
  return (
    <div>
      <p className="text-xs gp-text-muted mb-3">Llevas {fmtMoney(actual)} de {fmtMoney(apartado.montoObjetivo)}.</p>
      <Field label="Cuánto vas a agregar"><MoneyInput autoFocus className="gp-input" value={monto} onChange={(val) => setMonto(val)} /></Field>
      <button className="gp-btn w-full py-2 text-sm mt-2" onClick={() => onSave(String(actual + (Number(monto) || 0)))}>Agregar</button>
    </div>
  );
}

function MoverFondosForm({ apartado, proyectos, onSave }) {
  const actual = Number(apartado.montoActual) || 0;
  const [monto, setMonto] = useState("");
  const [proyectoId, setProyectoId] = useState(apartado.proyectoId || "");
  const [concepto, setConcepto] = useState(`Fondos de "${apartado.nombre}"`);
  const montoNum = Number(monto) || 0;
  const excede = montoNum > actual;

  return (
    <div>
      <p className="text-xs gp-text-muted mb-3">Disponible en este apartado: <span className="gp-mono gp-text-gold">{fmtMoney(actual)}</span></p>
      <Field label="Cuánto vas a mover"><MoneyInput autoFocus className="gp-input" value={monto} onChange={(val) => setMonto(val)} /></Field>
      {excede && <p className="text-xs gp-text-red mb-2">Ese monto es mayor al disponible en el apartado.</p>}
      <Field label="Destino (proyecto o rubro)">
        <select className="gp-input" value={proyectoId} onChange={(e) => setProyectoId(e.target.value)}>
          <option value="">— sin proyecto (personal) —</option>
          {proyectos.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
        </select>
      </Field>
      <Field label="Concepto"><input className="gp-input" value={concepto} onChange={(e) => setConcepto(e.target.value)} /></Field>
      <p className="text-xs gp-text-muted mb-3">Esto resta el monto del apartado y lo registra como un ingreso en Finanzas, para que quede el rastro de a dónde fue el dinero.</p>
      <button
        className="gp-btn w-full py-2 text-sm mt-2 disabled:opacity-40"
        disabled={!montoNum || excede}
        onClick={() => onSave({ monto: montoNum, proyectoId, concepto, nuevoMontoActual: String(actual - montoNum) })}
      >
        Mover fondos
      </button>
    </div>
  );
}

/* ---------- Eventos (con fotos y videos) ---------- */
function Eventos({ data, onAdd, onEdit, onRemove, onAddComentario, onRemoveComentario }) {
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
                <IconBtn onClick={() => setModal({ item: e })}><Pencil size={13} /></IconBtn>
                <IconBtn onClick={() => onRemove(e.id)}><Trash2 size={13} /></IconBtn>
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
            {proyectos.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
          </select>
        </Field>
        <Field label="Cliente (opcional)">
          <select className="gp-input" value={v.contactoId || ""} onChange={(e) => setV({ ...v, contactoId: e.target.value })}>
            <option value="">— ninguno —</option>
            {contactos.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
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

