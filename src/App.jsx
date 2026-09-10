import React, { useState, useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { supabase } from "./supabaseClient";
import * as XLSX from "xlsx";
import {
  LayoutDashboard, FolderKanban, CheckSquare, Wallet, AlertTriangle,
  Users, Activity, Plus, X, Trash2, Pencil, Github, ChevronDown,
  ChevronRight, Bell, Lightbulb, Rocket, MessageCircle, Mail, Globe,
  Target, Contact, BarChart3, FileText, Flame, HeartPulse, Check, Menu, PieChart as PieChartIcon,
  PiggyBank, Camera, Film, Upload, MapPin, Clock, Mic, Gift, Receipt, Megaphone, ChevronUp, Gem, Download, Sun, Moon, Shield, LogOut, ChevronLeft, Lock, Pill, CalendarClock, Zap, StickyNote, Search, Sparkles, Send, Bot, Volume2, VolumeX, Square, Settings, CalendarRange, Palette, Eye, EyeOff, Sliders,
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
      --text:#EAF1FA; --muted:#93A7C4; --gold:#F59E0B; --teal:#5FBF8B; --teal-tint:#DCF5E6; --teal-text:#1D6B42; --panel-2:rgba(255,255,255,.12); --red:#EF4444;
      background:var(--bg); color:var(--text); font-family:'IBM Plex Sans',sans-serif; }
    /* Temas oscuros. */
    .gp-root.tema-negro{ --bg:#0A0A0A; --panel:#1A1A1A; --panel-hi:#262626; --border:#333333; --text:#F2F2F2; --muted:#9A9A9A; }
    .gp-root.tema-oliva{ --bg:#232A1C; --panel:#333D28; --panel-hi:#414D34; --border:#4A5639; --text:#F0F3EA; --muted:#A8B49B; }
    .gp-root.tema-rojo{ --bg:#2A0F0F; --panel:#3D1717; --panel-hi:#4D1F1F; --border:#5C2828; --text:#F5E9E9; --muted:#C79B9B; }
    .gp-root.tema-naranja{ --bg:#2A1607; --panel:#3D200D; --panel-hi:#4D2A14; --border:#5C3A1E; --text:#F5EBDF; --muted:#C2A183; }
    /* Temas claros: versión pálida de cada uno de los 5 de arriba. --panel-2 se redefine con un
       tinte OSCURO (no blanco) en estos, porque el de arriba (blanco a 12%) es invisible sobre
       fondo claro. El logo y el menú lateral NUNCA usan estos colores — ver .gp-sidebar-area
       más abajo, así el logo queda a salvo pase lo que pase. */
    .gp-root.tema-azul-claro{ --bg:#E8F1FB; --panel:#F7FBFF; --panel-hi:#DCEAFA; --border:#C3D9EE; --text:#0B2341; --muted:#5B7A9E; --panel-2:rgba(11,35,65,.06); }
    .gp-root.tema-gris-claro{ --bg:#F2F2F2; --panel:#FAFAFA; --panel-hi:#E8E8E8; --border:#D6D6D6; --text:#1A1A1A; --muted:#6B6B6B; --panel-2:rgba(0,0,0,.06); }
    .gp-root.tema-verde-claro{ --bg:#EEF3E7; --panel:#F7FAF2; --panel-hi:#E3ECD8; --border:#CDDBBC; --text:#2B3620; --muted:#6B7C57; --panel-2:rgba(43,54,32,.06); }
    .gp-root.tema-rojo-claro{ --bg:#FBEAEA; --panel:#FFF5F5; --panel-hi:#F7DCDC; --border:#EFC2C2; --text:#4A1414; --muted:#9C6B6B; --panel-2:rgba(74,20,20,.06); }
    .gp-root.tema-naranja-claro{ --bg:#FBEEE1; --panel:#FFF7EF; --panel-hi:#F7E2CB; --border:#EFCBA3; --text:#4A2A0F; --muted:#9C7A55; --panel-2:rgba(74,42,15,.06); }
    .gp-serif{ font-family:'Poppins',sans-serif; font-weight:600; }
    .gp-mono{ font-family:'IBM Plex Mono',monospace; }
    .gp-panel{ background:var(--panel); border:1px solid var(--border); border-radius:6px; }
    .gp-panel-hi:hover{ background:var(--panel-hi); }
    .gp-border{ border-color:var(--border); }
    .gp-input{ background:var(--bg); border:1px solid var(--border); color:var(--text);
      border-radius:4px; padding:6px 10px; font-size:13px; width:100%; }
    .gp-input:focus{ outline:1px solid var(--gold); border-color:var(--gold); }
    /* En celular, un input con letra menor a 16px hace que iOS/Android le hagan zoom
       automático al enfocarlo (y a veces no regresa bien al tamaño normal al desenfocar).
       Por eso en pantallas chicas los inputs usan 16px; en escritorio se quedan en 13px. */
    @media (max-width: 767px) {
      .gp-input{ font-size:16px; }
    }
    .gp-btn{ background:var(--gold); color:#161822; font-weight:600; border-radius:4px; }
    .gp-btn:hover{ opacity:.9; }
    .gp-btn-ghost{ background:transparent; border:1px solid var(--border); color:var(--text); border-radius:4px; }
    .gp-btn-ghost:hover{ background:var(--panel-hi); }
    .gp-navitem{ color:var(--muted); border-radius:4px; }
    .gp-navitem:hover{ background:var(--panel-hi); color:var(--text); }
    .gp-navitem-active{ background:var(--panel-hi); color:var(--text); border-left:2px solid var(--gold); }
    .gp-navitem-drop{ box-shadow: inset 0 2px 0 var(--gold); }
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
    /* El logo y el menú lateral (además de login/splash, que usan esta misma clase) SIEMPRE
       usan este azul oscuro fijo, sin importar qué tema esté activo en el resto de la app —
       incluidos los 5 temas claros nuevos. Esto es justo lo que evita que el logo pierda
       contraste otra vez, sin tener que renunciar a tener temas claros. */
    .gp-sidebar-area{ --bg:#0B2341; --panel:#12304F; --panel-hi:#1A3D63; --border:#234A70; --text:#EAF1FA; --muted:#93A7C4; }
    /* Fondo "blanco hueso" para paneles puntuales (chat del Asistente, calendario de Agenda)
       que deben verse claros aunque el resto de la app esté en un tema oscuro. Redefine las
       variables de color solo dentro de este panel, así todo lo de adentro (texto, badges,
       bloques) se ajusta automáticamente sin tocar el resto de la app. */
    .gp-hueso{ --panel:#F7F3EA; --panel-2:#E9E1CC; --border:#DDD3BA; --text:#3A2F22; --muted:#8A7E68;
      background:var(--panel); color:var(--text); }
  `}</style>
);

// Recuerda tu tema entre visitas, guardado en este navegador y, una vez que inicias sesión,
// también en tu cuenta (para que te siga en otros dispositivos, vía cambiarTema/preferencias).
const TEMAS_VALIDOS = ["actual", "negro", "oliva", "rojo", "naranja", "azul-claro", "gris-claro", "verde-claro", "rojo-claro", "naranja-claro", "personalizado"];
function useTema() {
  const [tema, setTemaState] = useState(() => {
    try {
      const guardado = localStorage.getItem("arkeyone_tema");
      return TEMAS_VALIDOS.includes(guardado) ? guardado : "actual";
    } catch { return "actual"; }
  });
  const setTema = (nuevo) => {
    if (!TEMAS_VALIDOS.includes(nuevo)) return;
    setTemaState(nuevo);
    try { localStorage.setItem("arkeyone_tema", nuevo); } catch {}
  };
  const toggleTema = () => {}; // ya no aplica con varios temas — se deja por compatibilidad de firma
  return [tema, toggleTema, setTema];
}
// "actual" es el tema base (mismos valores que .gp-root, sin clase extra); "personalizado" tampoco
// usa clase (sus colores se calculan al vuelo con generarPaletaPersonalizada, ver abajo); los
// demás agregan su propia clase .tema-XXX que sobreescribe las variables de color.
const claseTema = (tema) => (tema && tema !== "actual" && tema !== "personalizado" ? `tema-${tema}` : "");

// --- Tema personalizado: a partir de UN solo color elegido por el usuario, genera una paleta
// completa (fondo, panel, panel resaltado, borde, texto y "muted") que siempre es legible —
// nunca deja que el usuario termine con texto ilegible sobre su propio fondo, porque el color
// del texto se decide automáticamente según qué tan clara u oscura sea su elección. ---
function hexARgb(hex) {
  const limpio = hex.replace("#", "");
  const partes = limpio.match(/.{1,2}/g);
  return partes.map((x) => parseInt(x, 16));
}
function rgbAHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h, s;
  const l = (max + min) / 2;
  if (max === min) { h = s = 0; }
  else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      default: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }
  return { h: h * 360, s: s * 100, l: l * 100 };
}
function hslAHex(h, s, l) {
  s /= 100; l /= 100;
  const k = (n) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  const aHex = (x) => Math.round(255 * x).toString(16).padStart(2, "0");
  return `#${aHex(f(0))}${aHex(f(8))}${aHex(f(4))}`;
}
function generarPaletaPersonalizada(hexBase, forzarOscuro = false) {
  let h, s, l;
  try {
    const [r, g, b] = hexARgb(hexBase);
    if ([r, g, b].some((v) => Number.isNaN(v))) return null;
    ({ h, s, l } = rgbAHsl(r, g, b));
  } catch { return null; }
  // Si el color elegido ya es claro, genera una familia clara (fondo pálido, texto oscuro);
  // si es oscuro, genera una familia oscura (fondo oscuro, texto claro) — igual que los 10
  // temas fijos, solo que aquí el matiz (hue) sale del color que eligió el usuario.
  // forzarOscuro se usa para el menú lateral: el logo es claro, así que ahí SIEMPRE se genera
  // la variante oscura (con el mismo matiz elegido) sin importar qué tan claro sea el color base.
  const esClaro = forzarOscuro ? false : l >= 55;
  return esClaro ? {
    "--bg": hslAHex(h, Math.min(s, 35), 93),
    "--panel": hslAHex(h, Math.min(s, 28), 98),
    "--panel-hi": hslAHex(h, Math.min(s, 32), 89),
    "--border": hslAHex(h, Math.min(s, 30), 78),
    "--text": hslAHex(h, Math.min(s, 35), 15),
    "--muted": hslAHex(h, Math.min(s, 25), 38),
    "--panel-2": `hsla(${Math.round(h)}, ${Math.min(Math.round(s), 40)}%, 15%, .06)`,
  } : {
    "--bg": hslAHex(h, Math.min(s, 55), 13),
    "--panel": hslAHex(h, Math.min(s, 50), 19),
    "--panel-hi": hslAHex(h, Math.min(s, 45), 25),
    "--border": hslAHex(h, Math.min(s, 40), 33),
    "--text": hslAHex(h, Math.min(s, 12), 94),
    "--muted": hslAHex(h, Math.min(s, 20), 66),
    "--panel-2": "hsla(0, 0%, 100%, .12)",
  };
}


/* ---------- datos base ---------- */
const CATS = ["Fundación", "Software", "Música", "Renta", "Marketing", "Chatbots", "Personal", "Otro"];
const ESTATUS_PROYECTO = ["Idea", "En validación", "En desarrollo", "Activo", "Finalizado", "Pausado", "Archivado"];
const MODO_PROYECTO = ["Finito", "Continuo"];
const MONETIZACION = ["Dinero", "Especie", "Intercambio", "No genera dinero"];
const PRIORIDADES = ["Alta", "Media", "Baja"];
// 7 estados según el documento maestro v0.1 (antes eran solo 3: Pendiente/En progreso/Hecho).
const ESTATUS_TAREA = ["Borrador", "No iniciada", "Pendiente", "En proceso", "En espera", "Completada", "Cancelada"];
// Estados que cuentan como "ya no requiere trabajo activo" (para filtros de "abiertas" vs archivadas).
const ESTATUS_TAREA_CERRADOS = ["Completada", "Cancelada"];
const tareaAbierta = (estatus) => !ESTATUS_TAREA_CERRADOS.includes(estatus);
const toneEstatusTarea = (estatus) => (
  estatus === "Completada" ? "teal" :
  estatus === "Cancelada" ? "muted" :
  estatus === "En proceso" ? "gold" :
  estatus === "En espera" ? "red" :
  "muted" // Borrador, No iniciada, Pendiente
);
const TIPO_FIN = ["Ingreso", "Egreso"];
const FORMA_PAGO = ["Efectivo", "Transferencia", "Especie", "Intercambio"];
const OCASIONES_REGALO = ["Cumpleaños", "Navidad", "Aniversario", "Felicitación", "Otro"];
const ESTATUS_REGALO = ["Por comprar", "Comprado", "Envuelto", "Entregado"];
// Tipo de atención: distinto de la ocasión (Cumpleaños/Navidad/…). La ocasión es CUÁNDO/POR QUÉ;
// el tipo es QUÉ clase de atención se dio o se dará.
const TIPOS_ATENCION = ["Regalo", "Felicitación", "Condolencia", "Agradecimiento", "Otro"];

// Categorías de notificación configurables por el usuario (Configuración > Notificaciones).
// Cada "tipo" concreto de notificación (medicamento, cita, deuda, etc.) pertenece a una de estas
// categorías; el usuario activa/desactiva por categoría, no por tipo individual (serían demasiados).
const CATEGORIAS_NOTIFICACION = ["Recordatorios", "Finanzas", "Salud", "Agenda", "Proyectos", "Colaboradores", "Activos digitales", "Legal"];
const CATEGORIA_POR_TIPO_NOTIF = {
  medicamento: "Salud", cita: "Agenda", deuda: "Finanzas", cobro_pendiente: "Finanzas",
  pago_recurrente: "Finanzas", pendiente: "Recordatorios", documento: "Legal",
  activo_digital: "Activos digitales", apartado: "Finanzas", revision_proyecto: "Proyectos",
  cumpleanos: "Recordatorios", regalo: "Recordatorios", evento: "Agenda", factura: "Finanzas",
  campana: "Proyectos", asignacion: "Colaboradores",
};
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
  actividades: [],
  activos: [],
  metas: [],
  contactos: [],
  redesMetricas: [],
  documentos: [],
  habitos: [],
  salud: [],
  perfilSalud: {},
});

const uid = () => (crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2, 10) + Date.now().toString(36));
const fmtMoney = (n) => (Number(n) || 0).toLocaleString("es-MX", { style: "currency", currency: "MXN" });
const todayISO = () => new Date().toISOString().slice(0, 10);
const horaActualHHMM = () => { const d = new Date(); return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`; };
const daysUntil = (dateStr) => Math.ceil((new Date(dateStr) - new Date(todayISO())) / 86400000);
// Días que faltan para el próximo cumpleaños (a partir de una fecha de nacimiento cualquiera).
const MESES_LARGO = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
// ARKEYONE solo pide Día y Mes de cumpleaños (no la fecha de nacimiento completa) — mucha gente no
// quiere compartir el año. Internamente se sigue guardando como fecha (columna "date" en Supabase),
// pero con un año ficticio (2000) que diasParaCumple() ignora por completo: solo usa mes/día.
const diaMesDeFecha = (fechaNacimiento) => {
  if (!fechaNacimiento) return { dia: "", mes: "" };
  const d = new Date(fechaNacimiento + "T00:00:00");
  if (isNaN(d.getTime())) return { dia: "", mes: "" };
  return { dia: String(d.getDate()), mes: String(d.getMonth() + 1) };
};
const construirFechaCumple = (dia, mes) => (dia && mes ? `2000-${String(mes).padStart(2, "0")}-${String(dia).padStart(2, "0")}` : "");
function CumpleanosField({ value, onChange }) {
  const inicial = diaMesDeFecha(value);
  const [dia, setDia] = useState(inicial.dia);
  const [mes, setMes] = useState(inicial.mes);
  const actualizar = (d, m) => { setDia(d); setMes(m); onChange(construirFechaCumple(d, m)); };
  return (
    <Field label="Cumpleaños — día y mes (opcional)">
      <div className="grid grid-cols-2 gap-2">
        <select className="gp-input" value={dia} onChange={(e) => actualizar(e.target.value, mes)}>
          <option value="">Día</option>
          {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => <option key={d} value={d}>{d}</option>)}
        </select>
        <select className="gp-input" value={mes} onChange={(e) => actualizar(dia, e.target.value)}>
          <option value="">Mes</option>
          {MESES_LARGO.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
        </select>
      </div>
    </Field>
  );
}
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
const TABLES = ["proyectos", "pendientes", "equipo", "finanzas", "actividades", "activos", "metas", "contactos", "redesMetricas", "documentos", "habitos", "salud", "apartados", "apartadosMovimientos", "eventos", "comentarios", "saldoInicial", "regalos", "facturas", "campanas", "patrimonio", "patrimonioValuaciones", "medicamentos", "citas", "notas"];
// Deudas ya NO es una tabla propia (Documento Maestro v1.2, secc. 23.11/40): es una vista
// calculada sobre Finanzas (egresos no recurrentes con saldo pendiente). Esta función se usa
// en cualquier lugar que antes leía `data.deudas`.
const deudasDeFinanzas = (finanzas) => (finanzas || []).filter((f) => f.tipo === "Egreso" && !f.esRecurrente && (f.estatus === "Pendiente" || f.estatus === "Parcial"));
const OLD_STORAGE_KEY = "gestion_personal_data"; // localStorage, versión muy vieja
const OLD_BLOB_TABLE = "gestion_data"; // tabla única jsonb, versión anterior a este modelo relacional

const camelToSnake = (s) => s.replace(/[A-Z]/g, (c) => "_" + c.toLowerCase());
const snakeToCamel = (s) => s.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
const tableName = (key) => camelToSnake(key);
// Quita acentos y pasa a minúsculas, para que buscar "cancion" también encuentre "canción".
const normalizarTexto = (s) => (s || "").toString().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

// Búsqueda por contenido (contiene, no solo empieza-con) e insensible a acentos, para el
// estándar transversal de listas (Documento Maestro v1.2, secc. 23.5/38). `getters` es un
// arreglo de funciones (item) => texto; basta que la búsqueda coincida con cualquiera de ellas.
const filtrarPorBusqueda = (lista, query, getters) => {
  const q = normalizarTexto(query).trim();
  if (!q) return lista;
  return lista.filter((item) => getters.some((get) => normalizarTexto(get(item)).includes(q)));
};

// Exporta una lista YA filtrada/ordenada tal como el usuario la está viendo (secc. 23.5: la
// exportación debe respetar exactamente los filtros, búsqueda y orden actuales).
function exportarFilasExcel(filas, columnas, nombreArchivo) {
  if (filas.length === 0) { alert("No hay filas para exportar con los filtros actuales."); return; }
  const limpias = filas.map((item) => Object.fromEntries(columnas.map((c) => [c.label, c.get(item) ?? ""])));
  const hoja = XLSX.utils.json_to_sheet(limpias);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, hoja, "Datos".slice(0, 31));
  XLSX.writeFile(wb, `arkeyone_${nombreArchivo}_${todayISO()}.xlsx`);
}

// Mismo criterio que exportarFilasExcel, pero a PDF (tabla con jspdf-autotable), incluyendo
// fecha de generación y el resumen de filtros aplicados, como pide la secc. 23.5.
async function exportarFilasPDF(filas, columnas, nombreArchivo, titulo, resumenFiltros) {
  if (filas.length === 0) { alert("No hay filas para exportar con los filtros actuales."); return; }
  const { jsPDF } = await import("jspdf");
  const autoTable = (await import("jspdf-autotable")).default;
  const doc = new jsPDF({ orientation: columnas.length > 5 ? "landscape" : "portrait" });
  doc.setFontSize(14);
  doc.text(titulo, 14, 15);
  doc.setFontSize(9);
  doc.setTextColor(120);
  doc.text(`Generado el ${new Date().toLocaleString("es-MX")}${resumenFiltros ? ` · ${resumenFiltros}` : ""}`, 14, 21);
  autoTable(doc, {
    startY: 26,
    head: [columnas.map((c) => c.label)],
    body: filas.map((item) => columnas.map((c) => String(c.get(item) ?? ""))),
    styles: { fontSize: 8 },
    headStyles: { fillColor: [11, 35, 65] },
  });
  doc.save(`arkeyone_${nombreArchivo}_${todayISO()}.pdf`);
}

// Barra reutilizable: campo de búsqueda por contenido (independiente del buscador global) +
// botones de exportar Excel/PDF, para el estándar transversal de listas.
function BarraListaEstandar({ busqueda, onBusqueda, placeholder, onExportExcel, onExportPDF }) {
  return (
    <div className="flex flex-wrap items-center gap-2 mb-4">
      <div className="relative flex-1" style={{ minWidth: 180, maxWidth: 320 }}>
        <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 gp-text-muted" />
        <input className="gp-input pl-8 text-sm" placeholder={placeholder || "Buscar en esta lista…"} value={busqueda} onChange={(e) => onBusqueda(e.target.value)} />
      </div>
      <button onClick={onExportExcel} className="text-xs px-2.5 py-1.5 rounded gp-btn-ghost flex items-center gap-1"><Download size={12} /> Excel</button>
      <button onClick={onExportPDF} className="text-xs px-2.5 py-1.5 rounded gp-btn-ghost flex items-center gap-1"><Download size={12} /> PDF</button>
    </div>
  );
}


const ETIQUETA_TABLA = {
  proyectos: "Proyecto", pendientes: "Pendiente", equipo: "Equipo", finanzas: "Movimiento financiero",
  actividades: "Actividad", activos: "Activo digital", metas: "Meta",
  contactos: "Contacto", redesMetricas: "Métrica de red social", documentos: "Documento",
  habitos: "Hábito", salud: "Registro de salud", apartados: "Apartado", apartadosMovimientos: "Movimiento de apartado", eventos: "Evento",
  comentarios: "Comentario", saldoInicial: "Saldo inicial", regalos: "Regalo",
  facturas: "Factura", campanas: "Campaña", patrimonio: "Bien patrimonial",
  patrimonioValuaciones: "Valuación de patrimonio", medicamentos: "Medicamento", citas: "Cita", notas: "Nota",
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
    case "citas":
      return item.titulo || "(sin título)";
    case "notas":
      return item.titulo || (item.contenido ? item.contenido.slice(0, 40) : "(nota vacía)");
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
    case "apartadosMovimientos":
      return `${item.tipo === "retiro" ? "Retiro" : "Aporte"} del ${item.fecha || "—"}`;
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
// Distingue un error de red real (sin respuesta del servidor: sí aplica "revisa tu conexión") de un
// error que el servidor sí respondió pero rechazó (dato inválido, columna que no existe, etc. — ahí
// decir "revisa tu conexión" es engañoso y no ayuda a nadie a resolverlo).
function mensajeErrorGuardado(error) {
  const esErrorDeRed = !error?.code && /fetch|network/i.test(error?.message || "");
  return esErrorDeRed
    ? "No se pudo guardar. Revisa tu conexión a internet."
    : "No se pudo guardar. Hubo un problema con los datos — si se repite, cuéntame qué campos llenaste.";
}
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
  const { data: perfilRows } = await supabase.from("perfil_salud").select("*").eq("user_id", ownerId);
  result.perfilSalud = Object.fromEntries((perfilRows || []).map((r) => [r.contacto_id || "yo", { alturaCm: r.altura_cm ?? "" }]));
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

// Input de contraseña con botón de ojo para mostrar/ocultar — se usa en todos los campos de
// contraseña de la app (registro, cambio de contraseña, reautenticación, login de colaborador).
function CampoPassword({ value, onChange, required, className = "gp-input", autoFocus, autoComplete, placeholder, onKeyDown }) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative">
      <input
        type={visible ? "text" : "password"}
        required={required}
        className={className}
        style={{ paddingRight: 34 }}
        value={value}
        onChange={onChange}
        onKeyDown={onKeyDown}
        autoFocus={autoFocus}
        autoComplete={autoComplete}
        placeholder={placeholder}
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        tabIndex={-1}
        className="absolute top-1/2 -translate-y-1/2 gp-text-muted"
        style={{ right: 8 }}
        title={visible ? "Ocultar contraseña" : "Mostrar contraseña"}
      >
        {visible ? <EyeOff size={15} /> : <Eye size={15} />}
      </button>
    </div>
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

// Prompt reutilizable: "¿Deseas crear una acción relacionada?" — tras guardar una Cita, Deuda,
// Documento o Activo digital, ofrece crear una Tarea real ligada a ese origen (origenTabla/origenId),
// sin obligar a hacerlo. Como pide el documento maestro v0.1: una Cita/Deuda/Documento/Activo no ES
// una Tarea, pero puede GENERAR una.
function PromptTareaRelacionada({ origenTabla, origenId, proyectoId, descripcionSugerida, fechaSugerida, onCrear, onOmitir }) {
  const [descripcion, setDescripcion] = useState(descripcionSugerida || "");
  const [fechaLimite, setFechaLimite] = useState(fechaSugerida || todayISO());
  return (
    <div>
      <p className="text-sm gp-text-muted mb-3">¿Deseas crear una tarea relacionada con esto? Quedará ligada aquí para que puedas encontrarla desde ambos lados.</p>
      <Field label="Descripción de la tarea"><input className="gp-input" value={descripcion} onChange={(e) => setDescripcion(e.target.value)} /></Field>
      <Field label="Fecha límite"><input type="date" className="gp-input" value={fechaLimite} onChange={(e) => setFechaLimite(e.target.value)} /></Field>
      <div className="flex gap-2 mt-3">
        <button className="gp-btn-ghost flex-1 py-2 text-sm" onClick={onOmitir}>Omitir</button>
        <button
          className="gp-btn flex-1 py-2 text-sm"
          onClick={() => { if (descripcion.trim()) onCrear({ descripcion: descripcion.trim(), fechaLimite, proyectoId: proyectoId || "", origenTabla, origenId, estatus: "Pendiente" }); }}
        >
          Crear tarea
        </button>
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
    <div className={`gp-root ${claseTema(tema)}`} style={{ minHeight: "100vh" }}>
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
    <div className={`gp-root gp-sidebar-area flex items-center justify-center ${claseTema(tema)}`} style={{ minHeight: "100vh" }}>
      <Tokens tema={tema} />
      <form onSubmit={handleSubmit} className="gp-panel p-6 w-full max-w-sm relative">
        <div className="flex flex-col items-center text-center mb-4">
          <img src="/logo-arkeyone.png" alt="ArkeyOne" style={{ height: 108 }} className="mb-2" />
          <p className="text-xs gp-text-gold tracking-wide mb-3">La llave que alinea tu mundo</p>
          <p className="text-xs gp-text-muted">
            {modo === "entrar" ? "Inicia sesión para entrar a tu sistema." : modo === "crear" ? "Crea tu cuenta." : "Te mandamos un enlace para poner una contraseña nueva."}
          </p>
        </div>

        {modo !== "recuperar" && (
          <div className="flex gap-1 mb-4 w-full">
            <button type="button" onClick={() => { setModo("entrar"); setError(""); setAvisoRegistro(""); }} className={`text-xs px-3 py-1.5 rounded-full border flex-1 ${modo === "entrar" ? "gp-btn" : "gp-text-muted"}`}>Iniciar sesión</button>
            <button type="button" onClick={() => { setModo("crear"); setError(""); setAvisoRegistro(""); }} className={`text-xs px-3 py-1.5 rounded-full border flex-1 ${modo === "crear" ? "gp-btn" : "gp-text-muted"}`}>Crear cuenta</button>
          </div>
        )}

        <Field label="Correo"><input type="email" required className="gp-input" value={email} onChange={(e) => setEmail(e.target.value)} /></Field>
        {modo !== "recuperar" && (
          <Field label="Contraseña"><CampoPassword required value={password} onChange={(e) => setPassword(e.target.value)} /></Field>
        )}
        {modo === "crear" && <MedidorPassword password={password} />}
        {modo === "crear" && (
          <Field label="Confirmar contraseña"><CampoPassword required value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} /></Field>
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
    if (!error) {
      // Por seguridad: al cambiar la contraseña, cierra la sesión en cualquier otro dispositivo/navegador
      // donde hayas quedado conectado (solo deja activa la sesión desde la que acabas de cambiarla).
      await supabase.auth.signOut({ scope: "others" });
    }
    setLoading(false);
    if (error) { setError("No se pudo actualizar la contraseña. Intenta de nuevo."); return; }
    setListo(true);
  };

  return (
    <div className={`gp-root gp-sidebar-area flex items-center justify-center ${claseTema(tema)}`} style={{ minHeight: "100vh" }}>
      <Tokens tema={tema} />
      <div className="gp-panel p-6 w-full max-w-sm">
        <img src="/logo-arkeyone.png" alt="ArkeyOne" style={{ height: 108 }} className="mb-3" />
        {listo ? (
          <>
            <p className="text-sm mb-4">Tu contraseña ya se actualizó. Ya puedes seguir usando tu cuenta con la nueva.</p>
            <button onClick={onListo} className="gp-btn w-full py-2 text-sm">Continuar</button>
          </>
        ) : (
          <form onSubmit={handleSubmit}>
            <p className="text-xs gp-text-muted mb-4">Pon tu contraseña nueva.</p>
            <Field label="Contraseña nueva"><CampoPassword required value={password} onChange={(e) => setPassword(e.target.value)} /></Field>
            <MedidorPassword password={password} />
            <Field label="Confirmar contraseña"><CampoPassword required value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} /></Field>
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
      className={`gp-root gp-sidebar-area fixed inset-0 z-[100] flex items-center justify-center ${claseTema(tema)}`}
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
        <img src="/logo-arkeyone.png" alt="ArkeyOne" className="splash-logo" style={{ height: 200 }} />
        <p className="splash-tagline text-xs gp-text-muted mt-3 tracking-wide">La llave que alinea tu mundo</p>
        <div className="splash-bar-track"><div className="splash-bar-fill" /></div>
      </div>
    </div>
  );
}

// Pantalla que pide el código de 6 dígitos cuando el usuario ya tiene activada la verificación en dos pasos.
function MfaChallengeScreen({ factorId, onVerificado, tema }) {
  const [codigo, setCodigo] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const verificar = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    const { data: challenge, error: errChallenge } = await supabase.auth.mfa.challenge({ factorId });
    if (errChallenge) { setError("No se pudo iniciar la verificación. Intenta de nuevo."); setLoading(false); return; }
    const { error: errVerify } = await supabase.auth.mfa.verify({ factorId, challengeId: challenge.id, code: codigo });
    setLoading(false);
    if (errVerify) { setError("Código incorrecto. Revisa tu app de autenticación."); return; }
    onVerificado();
  };

  return (
    <div className={`gp-root gp-sidebar-area flex items-center justify-center ${claseTema(tema)}`} style={{ minHeight: "100vh" }}>
      <Tokens tema={tema} />
      <div className="gp-panel p-6 w-full max-w-sm">
        <img src="/logo-arkeyone.png" alt="ArkeyOne" style={{ height: 92 }} className="mb-4" />
        <h2 className="gp-serif text-lg mb-1">Verificación en dos pasos</h2>
        <p className="text-sm gp-text-muted mb-4">Abre tu app de autenticación (Google Authenticator, Authy, etc.) e ingresa el código de 6 dígitos.</p>
        <form onSubmit={verificar}>
          <input
            className="gp-input text-center text-lg mb-3" style={{ letterSpacing: "0.4em" }}
            maxLength={6} inputMode="numeric" autoFocus
            value={codigo} onChange={(e) => setCodigo(e.target.value.replace(/\D/g, "").slice(0, 6))}
            placeholder="000000"
          />
          {error && <p className="text-xs gp-text-red mb-3">{error}</p>}
          <button type="submit" disabled={loading || codigo.length !== 6} className="gp-btn w-full py-2 text-sm">
            {loading ? "Verificando…" : "Verificar"}
          </button>
        </form>
      </div>
    </div>
  );
}

// Indicador de conexión (app "Online-First"): si se pierde internet, se avisa claro arriba
// de la pantalla; al recuperarla, avisa brevemente y el usuario sabe que ya puede confiar
// en que lo que ve está actualizado otra vez.
function IndicadorConexion() {
  const [enLinea, setEnLinea] = useState(navigator.onLine);
  const [mostrarRecuperado, setMostrarRecuperado] = useState(false);

  useEffect(() => {
    const alConectar = () => { setEnLinea(true); setMostrarRecuperado(true); setTimeout(() => setMostrarRecuperado(false), 3000); };
    const alDesconectar = () => setEnLinea(false);
    window.addEventListener("online", alConectar);
    window.addEventListener("offline", alDesconectar);
    return () => {
      window.removeEventListener("online", alConectar);
      window.removeEventListener("offline", alDesconectar);
    };
  }, []);

  if (enLinea && !mostrarRecuperado) return null;
  return (
    <div
      className="fixed top-0 left-0 right-0 z-[100] text-center text-xs px-3"
      style={{ background: enLinea ? "#1a7a4c" : "#8a2f2f", color: "#fff", paddingTop: "calc(env(safe-area-inset-top) + 6px)", paddingBottom: "6px" }}
    >
      {enLinea ? "Conexión recuperada — la información ya está actualizada." : "Sin conexión a internet. Lo que ves puede no estar actualizado; reconéctate para seguir trabajando."}
    </div>
  );
}

// Botón flotante para instalar ARKEYONE como app (PWA). Chrome/Edge/Android disparan el
// evento beforeinstallprompt cuando el sitio cumple los requisitos (manifest + service
// worker); lo capturamos para ofrecer un botón propio en vez de depender del navegador.
// iOS Safari no dispara este evento (Apple no lo soporta) — ahí se instala manualmente
// desde "Compartir → Agregar a pantalla de inicio", por eso mostramos una pista distinta.
function AvisoInstalarPWA() {
  const [promptEvent, setPromptEvent] = useState(null);
  const [instalado, setInstalado] = useState(
    () => window.matchMedia?.("(display-mode: standalone)").matches || window.navigator.standalone === true
  );
  const [cerrado, setCerrado] = useState(() => localStorage.getItem("arkeyone_pwa_aviso_cerrado") === "1");

  useEffect(() => {
    const capturar = (e) => { e.preventDefault(); setPromptEvent(e); };
    const alInstalar = () => setInstalado(true);
    window.addEventListener("beforeinstallprompt", capturar);
    window.addEventListener("appinstalled", alInstalar);
    return () => {
      window.removeEventListener("beforeinstallprompt", capturar);
      window.removeEventListener("appinstalled", alInstalar);
    };
  }, []);

  const cerrar = () => { setCerrado(true); localStorage.setItem("arkeyone_pwa_aviso_cerrado", "1"); };

  if (instalado || cerrado || !promptEvent) return null;

  return (
    <div className="fixed left-1/2 -translate-x-1/2 z-[100] flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg" style={{ background: "#132a4a", border: "1px solid #2a4a72", maxWidth: "92vw", bottom: "calc(env(safe-area-inset-bottom) + 16px)" }}>
      <img src="/icons/icon-192.png" alt="" style={{ width: 32, height: 32, borderRadius: 8 }} />
      <div className="text-xs text-white">
        <p className="font-medium">Instala ARKEYONE</p>
        <p className="opacity-70">Ábrelo como app, más rápido y sin la barra del navegador.</p>
      </div>
      <button
        onClick={async () => { promptEvent.prompt(); await promptEvent.userChoice; setPromptEvent(null); }}
        className="text-xs px-3 py-1.5 whitespace-nowrap font-semibold rounded"
        style={{ background: "#2a4a72", color: "#FFFFFF" }}
      >
        Instalar
      </button>
      <button onClick={cerrar} className="text-white opacity-60 hover:opacity-100" aria-label="Cerrar"><X size={16} /></button>
    </div>
  );
}

export default function App() {
  const [session, setSession] = useState(undefined); // undefined = cargando, null = sin sesión
  const [recuperando, setRecuperando] = useState(false);
  const [tema, toggleTema, setTema] = useTema();
  const [showSplash, setShowSplash] = useState(() => {
    // Después de cerrar sesión forzamos un reload para dejar todo limpio, pero eso no debe
    // implicar ver la animación de bienvenida otra vez — se salta una sola vez con esta bandera.
    try {
      if (sessionStorage.getItem("arkeyone_skip_splash") === "1") {
        sessionStorage.removeItem("arkeyone_skip_splash");
        return false;
      }
    } catch {}
    return true;
  });
  const [splashFadingOut, setSplashFadingOut] = useState(false);
  // Verificación en dos pasos (MFA): null = todavía sin revisar, { pendiente, factorId }
  const [mfaEstado, setMfaEstado] = useState(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      // Máximo absoluto de sesión: 8 horas desde que iniciaste sesión, aunque sigas activo.
      if (data.session && !localStorage.getItem("arkeyone_login_at")) {
        localStorage.setItem("arkeyone_login_at", String(Date.now()));
      }
    });
    const { data: listener } = supabase.auth.onAuthStateChange((event, newSession) => {
      if (event === "PASSWORD_RECOVERY") setRecuperando(true);
      if (event === "SIGNED_IN") localStorage.setItem("arkeyone_login_at", String(Date.now()));
      if (event === "SIGNED_OUT") localStorage.removeItem("arkeyone_login_at");
      setSession(newSession);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  // Máximo absoluto de sesión: revisa cada minuto si ya pasaron 8 horas desde el login, y si es así, cierra sesión.
  useEffect(() => {
    const SESION_MAX_MS = 8 * 60 * 60 * 1000;
    const chequear = () => {
      const inicio = Number(localStorage.getItem("arkeyone_login_at"));
      if (inicio && Date.now() - inicio > SESION_MAX_MS) supabase.auth.signOut();
    };
    const id = setInterval(chequear, 60 * 1000);
    return () => clearInterval(id);
  }, []);

  // Si el usuario tiene verificación en dos pasos activada, hay que pedirle el código antes de dejarlo pasar.
  useEffect(() => {
    if (!session) { setMfaEstado(null); return; }
    (async () => {
      const { data, error } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      if (error || !data) { setMfaEstado({ pendiente: false }); return; }
      if (data.nextLevel === "aal2" && data.currentLevel !== "aal2") {
        const { data: factoresData } = await supabase.auth.mfa.listFactors();
        const verificado = factoresData?.totp?.find((f) => f.status === "verified");
        setMfaEstado({ pendiente: true, factorId: verificado?.id });
      } else {
        setMfaEstado({ pendiente: false });
      }
    })();
  }, [session]);

  // El splash dura ~5 seg fijos, sin importar qué tan rápido cargue la sesión (que corre en paralelo arriba).
  useEffect(() => {
    const fadeTimer = setTimeout(() => setSplashFadingOut(true), 4600);
    const hideTimer = setTimeout(() => setShowSplash(false), 5000);
    return () => { clearTimeout(fadeTimer); clearTimeout(hideTimer); };
  }, []);

  if (showSplash) {
    return <SplashScreen tema={tema} fadingOut={splashFadingOut} />;
  }

  let pantalla;
  if (session === undefined) {
    pantalla = (
      <div className={`gp-root min-h-screen flex items-center justify-center ${claseTema(tema)}`}>
        <Tokens tema={tema} />
        <p className="gp-text-muted text-sm">Cargando…</p>
      </div>
    );
  } else if (recuperando) {
    pantalla = <NuevaPasswordScreen onListo={() => setRecuperando(false)} tema={tema} toggleTema={toggleTema} />;
  } else if (!session) {
    pantalla = <LoginScreen tema={tema} toggleTema={toggleTema} />;
  } else if (mfaEstado === null) {
    pantalla = (
      <div className={`gp-root min-h-screen flex items-center justify-center ${claseTema(tema)}`}>
        <Tokens tema={tema} />
        <p className="gp-text-muted text-sm">Cargando…</p>
      </div>
    );
  } else if (mfaEstado.pendiente) {
    pantalla = <MfaChallengeScreen factorId={mfaEstado.factorId} onVerificado={() => setMfaEstado({ pendiente: false })} tema={tema} />;
  } else {
    pantalla = <AppLoggedIn session={session} tema={tema} toggleTema={toggleTema} setTema={setTema} />;
  }

  return (
    <>
      <IndicadorConexion />
      <AvisoInstalarPWA />
      {pantalla}
    </>
  );
}

const VIEW_TO_MODULO = {
  proyectos: "proyectos", metas: "metas", pendientes: "pendientes",
  finanzas: "finanzas", facturas: "facturas", deudas: "deudas", apartados: "apartados",
  patrimonio: "patrimonio", activos: "activos", documentos: "documentos",
  equipo: "equipo", contactos: "contactos", regalos: "regalos",
  redes: "redes_metricas", marketing: "campanas",
  actividades: "actividades", eventos: "eventos", habitos: "habitos", salud: "salud",
  medicamentos: "medicamentos", citas: "citas", notas: "notas",
};
// Mapeo inverso: de nombre de tabla/módulo a id de vista, para los deep links de Push
// (una notificación de una deuda trae recurso_tabla="deudas" y con esto sabemos a qué
// pantalla mandar al usuario).
const MODULO_TO_VIEW = Object.fromEntries(Object.entries(VIEW_TO_MODULO).map(([view, modulo]) => [modulo, view]));
MODULO_TO_VIEW["mi-trabajo"] = "mi-trabajo";

// Convierte la llave pública VAPID (base64url, como la da el navegador/servidor) al formato
// binario que pide pushManager.subscribe(). Es texto de configuración, siempre igual.
function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

// Modal para activar/desactivar la verificación en dos pasos (MFA) de la cuenta.
function SeguridadMfaModal({ onClose }) {
  const [factores, setFactores] = useState(null); // null = cargando
  const [enrolando, setEnrolando] = useState(null); // { id, qr, secret }
  const [codigo, setCodigo] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const cargar = async () => {
    const { data } = await supabase.auth.mfa.listFactors();
    setFactores((data?.totp || []).filter((f) => f.status === "verified"));
  };
  useEffect(() => { cargar(); }, []);

  const activar = async () => {
    setError(""); setLoading(true);
    const { data, error } = await supabase.auth.mfa.enroll({ factorType: "totp" });
    setLoading(false);
    if (error) { setError("No se pudo iniciar. Intenta de nuevo."); return; }
    setEnrolando({ id: data.id, qr: data.totp.qr_code, secret: data.totp.secret });
  };

  const confirmar = async (e) => {
    e.preventDefault();
    setError(""); setLoading(true);
    const { data: challenge, error: errCh } = await supabase.auth.mfa.challenge({ factorId: enrolando.id });
    if (errCh) { setError("No se pudo verificar. Intenta de nuevo."); setLoading(false); return; }
    const { error: errVer } = await supabase.auth.mfa.verify({ factorId: enrolando.id, challengeId: challenge.id, code: codigo });
    setLoading(false);
    if (errVer) { setError("Código incorrecto. Revisa tu app de autenticación."); return; }
    setEnrolando(null); setCodigo("");
    cargar();
  };

  const desactivar = async (factorId) => {
    setLoading(true);
    await supabase.auth.mfa.unenroll({ factorId });
    setLoading(false);
    cargar();
  };

  return (
    <Modal title="Verificación en dos pasos" onClose={onClose}>
      {factores === null ? (
        <p className="text-sm gp-text-muted">Cargando…</p>
      ) : enrolando ? (
        <form onSubmit={confirmar}>
          <p className="text-sm gp-text-muted mb-3">Escanea este código con tu app de autenticación (Google Authenticator, Authy, etc.):</p>
          <div className="flex justify-center mb-3" style={{ background: "#fff", borderRadius: 8, padding: 12 }}>
            <img src={enrolando.qr} alt="Código QR" style={{ width: 180, height: 180 }} />
          </div>
          <p className="text-xs gp-text-muted mb-3">¿No puedes escanear? Ingresa esta clave manualmente: <span className="gp-mono">{enrolando.secret}</span></p>
          <Field label="Código de 6 dígitos">
            <input className="gp-input text-center" style={{ letterSpacing: "0.4em" }} maxLength={6} inputMode="numeric"
              value={codigo} onChange={(e) => setCodigo(e.target.value.replace(/\D/g, "").slice(0, 6))} autoFocus />
          </Field>
          {error && <p className="text-xs gp-text-red mb-3">{error}</p>}
          <div className="flex gap-2">
            <button type="button" onClick={() => { setEnrolando(null); setCodigo(""); }} className="gp-btn-ghost flex-1 py-2 text-sm">Cancelar</button>
            <button type="submit" disabled={loading || codigo.length !== 6} className="gp-btn flex-1 py-2 text-sm">Activar</button>
          </div>
        </form>
      ) : factores.length > 0 ? (
        <div>
          <div className="flex items-center gap-2 mb-4 text-sm gp-text-teal"><Check size={16} /> Verificación en dos pasos activada</div>
          {factores.map((f) => (
            <div key={f.id} className="flex items-center justify-between p-3 rounded mb-2" style={{ background: "var(--panel-hi)" }}>
              <span className="text-sm">App de autenticación</span>
              <button onClick={() => desactivar(f.id)} disabled={loading} className="text-xs gp-text-red">Desactivar</button>
            </div>
          ))}
        </div>
      ) : (
        <div>
          <p className="text-sm gp-text-muted mb-4">Agrega una capa extra de seguridad: además de tu contraseña, vas a necesitar un código de tu teléfono para entrar. Muy recomendado si administras información sensible como la tuya.</p>
          {error && <p className="text-xs gp-text-red mb-3">{error}</p>}
          <button onClick={activar} disabled={loading} className="gp-btn w-full py-2 text-sm">
            {loading ? "Un momento…" : "Activar verificación en dos pasos"}
          </button>
        </div>
      )}
    </Modal>
  );
}

function AppLoggedIn({ session, tema, toggleTema, setTema }) {
  const misId = session.user.id;
  const miEmail = session.user.email;
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState("dashboard");
  const [regalosFiltroContacto, setRegalosFiltroContacto] = useState("");
  const [proyectoDetalleId, setProyectoDetalleId] = useState(null);
  const irADetalleProyecto = (proyectoId) => { setProyectoDetalleId(proyectoId); irAVista("proyecto-detalle"); };
  const [busquedaAbierta, setBusquedaAbierta] = useState(false);
  const buscarNavegarA = (key, item) => {
    setBusquedaAbierta(false);
    if (key === "proyectos") { irADetalleProyecto(item.id); return; }
    irAVista(KEY_TO_VIEW_BUSQUEDA[key] || "dashboard");
  };
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  // El menú lateral se puede colapsar a solo íconos en escritorio; queda "fijo" como lo dejes (se recuerda en este navegador).
  const [sidebarColapsado, setSidebarColapsado] = useState(() => localStorage.getItem("arkeyone_sidebar_colapsado") === "1");
  const toggleSidebarColapsado = () => {
    setSidebarColapsado((prev) => {
      const next = !prev;
      localStorage.setItem("arkeyone_sidebar_colapsado", next ? "1" : "0");
      return next;
    });
  };
  // El modo "solo íconos" (sidebarColapsado) es una preferencia de ESCRITORIO. Como se guarda en
  // localStorage sin distinguir viewport, si el usuario la activó alguna vez en escritorio, en
  // móvil quedaba forzando mostrarItems=true (ver más abajo) e impedía que las secciones del
  // menú se colapsaran al tocarlas. Este flag detecta si estamos en viewport de escritorio (≥768px,
  // el breakpoint "md" de Tailwind) para que esa preferencia solo aplique ahí.
  const [esEscritorio, setEsEscritorio] = useState(() => window.matchMedia?.("(min-width: 768px)").matches ?? true);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    const actualizar = (e) => setEsEscritorio(e.matches);
    mq.addEventListener("change", actualizar);
    return () => mq.removeEventListener("change", actualizar);
  }, []);
  // Qué grupos del menú lateral están cerrados (colapsados). Por default arrancan TODOS cerrados;
  // si el usuario abre alguno, se recuerda esa preferencia en este navegador.
  const [gruposCerrados, setGruposCerrados] = useState(() => {
    try { return JSON.parse(localStorage.getItem("arkeyone_nav_grupos_cerrados") || "{}"); } catch { return {}; }
  });
  const grupoEstaCerrado = (label) => (Object.prototype.hasOwnProperty.call(gruposCerrados, label) ? gruposCerrados[label] : true);
  const toggleGrupo = (label) => {
    setGruposCerrados((prev) => {
      const next = { ...prev, [label]: !grupoEstaCerrado(label) };
      localStorage.setItem("arkeyone_nav_grupos_cerrados", JSON.stringify(next));
      return next;
    });
  };
  const [confirmDelete, setConfirmDelete] = useState(null); // { key, id, label }

  // Orden personalizado de los ítems dentro de cada grupo del menú lateral (arrastrar para reordenar).
  // Los grupos (encabezados) y la sección fija de abajo NO se reordenan, solo los ítems hijos de cada grupo.
  // Se guarda por usuario (clave incluye el UID) en este navegador.
  const ORDEN_NAV_KEY = `arkeyone_nav_orden_${misId}`;
  const [ordenNav, setOrdenNav] = useState(() => {
    try { return JSON.parse(localStorage.getItem(ORDEN_NAV_KEY) || "{}"); } catch { return {}; }
  });
  const [dragNav, setDragNav] = useState(null); // { grupo, id }
  const [dragNavSobre, setDragNavSobre] = useState(null); // id sobre el que está pasando el arrastre
  const ordenarItemsGrupo = (grupoLabel, items) => {
    const ordenGuardado = ordenNav[grupoLabel];
    if (!ordenGuardado || !ordenGuardado.length) return items;
    const porId = Object.fromEntries(items.map((it) => [it.id, it]));
    const enOrden = ordenGuardado.map((id) => porId[id]).filter(Boolean);
    const faltantes = items.filter((it) => !ordenGuardado.includes(it.id));
    return [...enOrden, ...faltantes];
  };
  const guardarOrdenGrupo = (grupoLabel, idsEnOrden) => {
    setOrdenNav((prev) => {
      const next = { ...prev, [grupoLabel]: idsEnOrden };
      localStorage.setItem(ORDEN_NAV_KEY, JSON.stringify(next));
      return next;
    });
  };
  const moverItemNav = (grupoLabel, itemsOrdenados, idArrastrado, idDestino) => {
    if (idArrastrado === idDestino) return;
    const ids = itemsOrdenados.map((it) => it.id);
    const desde = ids.indexOf(idArrastrado);
    const hasta = ids.indexOf(idDestino);
    if (desde === -1 || hasta === -1) return;
    ids.splice(desde, 1);
    ids.splice(hasta, 0, idArrastrado);
    guardarOrdenGrupo(grupoLabel, ids);
  };

  // Cierre de sesión automático por inactividad (hay datos sensibles: dinero, salud, documentos).
  // 30 min sin actividad = cierra sesión sola; avisa 2 min antes por si el usuario sigue ahí.
  const INACTIVIDAD_AVISO_MS = 28 * 60 * 1000;
  const INACTIVIDAD_CIERRE_MS = 30 * 60 * 1000;
  const [avisoInactividad, setAvisoInactividad] = useState(false);
  useEffect(() => {
    let timerAviso, timerCierre;
    const reiniciarTimers = () => {
      clearTimeout(timerAviso);
      clearTimeout(timerCierre);
      setAvisoInactividad(false);
      timerAviso = setTimeout(() => setAvisoInactividad(true), INACTIVIDAD_AVISO_MS);
      timerCierre = setTimeout(() => { supabase.auth.signOut(); }, INACTIVIDAD_CIERRE_MS);
    };
    const eventos = ["mousemove", "keydown", "mousedown", "click", "scroll", "touchstart"];
    eventos.forEach((ev) => window.addEventListener(ev, reiniciarTimers));
    reiniciarTimers();
    return () => {
      clearTimeout(timerAviso);
      clearTimeout(timerCierre);
      eventos.forEach((ev) => window.removeEventListener(ev, reiniciarTimers));
    };
  }, []);

  // Sesión corta para módulos sensibles (dinero, salud, documentos): 15 min desde la última
  // reautenticación o actividad. Si se cumple el plazo, se pide contraseña de nuevo antes de
  // entrar/seguir en el módulo — independiente del cierre general de sesión a los 30 min.
  const SENSIBLE_MS = 15 * 60 * 1000;
  const VISTAS_SENSIBLES = ["finanzas", "facturas", "reportes", "deudas", "apartados", "patrimonio", "activos", "documentos", "salud", "medicamentos"];
  const [sensibleDesbloqueadoHasta, setSensibleDesbloqueadoHasta] = useState(0);
  // Diario (secc. 24.5) usa la misma idea pero con una ventana propia de 10 min, independiente
  // de la de Dinero/Salud — se maneja aparte para no tocar ese flujo ya probado.
  const DIARIO_MS = 10 * 60 * 1000;
  const VISTAS_SENSIBLES_DIARIO = ["actividades"];
  const [diarioDesbloqueadoHasta, setDiarioDesbloqueadoHasta] = useState(0);
  const [reauthPendiente, setReauthPendiente] = useState(null); // id de la vista esperando reautenticación
  const [reauthPassword, setReauthPassword] = useState("");
  const [reauthError, setReauthError] = useState("");
  const [reauthCargando, setReauthCargando] = useState(false);

  const irAVista = (id) => {
    if (VISTAS_SENSIBLES.includes(id) && Date.now() > sensibleDesbloqueadoHasta) {
      setReauthPendiente(id);
      setReauthPassword("");
      setReauthError("");
      return;
    }
    if (VISTAS_SENSIBLES_DIARIO.includes(id) && Date.now() > diarioDesbloqueadoHasta) {
      setReauthPendiente(id);
      setReauthPassword("");
      setReauthError("");
      return;
    }
    if (VISTAS_SENSIBLES.includes(id)) setSensibleDesbloqueadoHasta(Date.now() + SENSIBLE_MS);
    if (VISTAS_SENSIBLES_DIARIO.includes(id)) setDiarioDesbloqueadoHasta(Date.now() + DIARIO_MS);
    setView(id);
  };

  // Cerrar sesión "a prueba de fallos": antes solo llamábamos a signOut() sin esperar su
  // resultado ni manejar errores — si esa llamada fallaba en silencio (por ejemplo con mala
  // conexión), la app se quedaba con la sesión vieja y el botón parecía no hacer nada. Ahora
  // esperamos la respuesta, y pase lo que pase (funcione o falle) forzamos que la app quede
  // en estado "sin sesión" limpiando lo local y recargando, para que siempre se sienta el
  // cierre de sesión como algo que sí ocurrió.
  const [cerrandoSesion, setCerrandoSesion] = useState(false);
  const cerrarSesion = async () => {
    if (cerrandoSesion) return;
    setCerrandoSesion(true);
    try {
      const { error } = await supabase.auth.signOut();
      if (error) console.error("Error al cerrar sesión:", error);
    } catch (err) {
      console.error("Error al cerrar sesión:", err);
    } finally {
      try {
        localStorage.removeItem("arkeyone_login_at");
        sessionStorage.setItem("arkeyone_skip_splash", "1");
      } catch {}
      window.location.reload();
    }
  };

  // Mientras se sigue navegando/interactuando dentro de un módulo sensible, se extiende el
  // desbloqueo de 15 min (igual que el temporizador general de inactividad).
  useEffect(() => {
    if (!VISTAS_SENSIBLES.includes(view)) return;
    const extender = () => setSensibleDesbloqueadoHasta(Date.now() + SENSIBLE_MS);
    const eventos = ["mousemove", "keydown", "mousedown", "click", "scroll", "touchstart"];
    eventos.forEach((ev) => window.addEventListener(ev, extender));
    const interval = setInterval(() => {
      if (Date.now() > sensibleDesbloqueadoHasta) {
        setReauthPendiente(view);
        setReauthPassword("");
        setReauthError("");
      }
    }, 15000);
    return () => {
      eventos.forEach((ev) => window.removeEventListener(ev, extender));
      clearInterval(interval);
    };
  }, [view, sensibleDesbloqueadoHasta]);

  // Mismo mecanismo para Diario, con su propia ventana de 10 min (secc. 24.5): "si sale y
  // vuelve antes de vencer, no pide clave y reinicia los 10 minutos desde la nueva consulta".
  useEffect(() => {
    if (!VISTAS_SENSIBLES_DIARIO.includes(view)) return;
    const extender = () => setDiarioDesbloqueadoHasta(Date.now() + DIARIO_MS);
    const eventos = ["mousemove", "keydown", "mousedown", "click", "scroll", "touchstart"];
    eventos.forEach((ev) => window.addEventListener(ev, extender));
    const interval = setInterval(() => {
      if (Date.now() > diarioDesbloqueadoHasta) {
        setReauthPendiente(view);
        setReauthPassword("");
        setReauthError("");
      }
    }, 15000);
    return () => {
      eventos.forEach((ev) => window.removeEventListener(ev, extender));
      clearInterval(interval);
    };
  }, [view, diarioDesbloqueadoHasta]);

  const confirmarReauth = async () => {
    if (!reauthPassword) { setReauthError("Escribe tu contraseña."); return; }
    setReauthCargando(true);
    setReauthError("");
    const { error } = await supabase.auth.signInWithPassword({ email: miEmail, password: reauthPassword });
    setReauthCargando(false);
    if (error) { setReauthError("Contraseña incorrecta."); return; }
    if (VISTAS_SENSIBLES_DIARIO.includes(reauthPendiente)) setDiarioDesbloqueadoHasta(Date.now() + DIARIO_MS);
    else setSensibleDesbloqueadoHasta(Date.now() + SENSIBLE_MS);
    setView(reauthPendiente);
    setReauthPendiente(null);
    setReauthPassword("");
  };

  const [activeOwnerId, setActiveOwnerId] = useState(misId);
  const [activeOwnerEmail, setActiveOwnerEmail] = useState(miEmail);
  const [modulosPermitidos, setModulosPermitidos] = useState(null); // null = soy el dueño, acceso total
  const [misColaboraciones, setMisColaboraciones] = useState([]);

  useEffect(() => {
    (async () => {
      await supabase.rpc("vincular_invitaciones");
      const { data: colabs } = await supabase.from("colaboradores").select("*").eq("colaborador_user_id", misId).eq("estatus", "Activo");
      setMisColaboraciones((colabs || []).map((c) => ({ propietarioId: c.propietario_id, propietarioEmail: c.propietario_email, modulos: c.modulos })));

      const { data: pref } = await supabase.from("preferencias").select("tema, alertas_correo_activas, color_personalizado, notif_tipos_desactivados, notif_silencio_activo, notif_silencio_inicio, notif_silencio_fin").eq("user_id", misId).maybeSingle();
      const temaGuardado = pref?.tema === "claro" || pref?.tema === "oscuro" ? "actual" : pref?.tema;
      if (temaGuardado && temaGuardado !== tema) setTema(temaGuardado);
      if (pref?.color_personalizado) setColorPersonalizado(pref.color_personalizado);
      if (pref && pref.alertas_correo_activas === false) setAlertasCorreoActivas(false);
      if (pref?.notif_tipos_desactivados) setNotifTiposDesactivados(pref.notif_tipos_desactivados);
      if (pref?.notif_silencio_activo) setNotifSilencioActivo(true);
      if (pref?.notif_silencio_inicio) setNotifSilencioInicio(pref.notif_silencio_inicio.slice(0, 5));
      if (pref?.notif_silencio_fin) setNotifSilencioFin(pref.notif_silencio_fin.slice(0, 5));

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

  const [colorPersonalizado, setColorPersonalizado] = useState("#F59E0B");
  const cambiarTema = async (nuevoValor) => {
    setTema(nuevoValor);
    await supabase.from("preferencias").upsert({ user_id: misId, tema: nuevoValor }, { onConflict: "user_id" });
  };
  const cambiarColorPersonalizado = async (nuevoColor) => {
    setColorPersonalizado(nuevoColor);
    setTema("personalizado");
    await supabase.from("preferencias").upsert({ user_id: misId, tema: "personalizado", color_personalizado: nuevoColor }, { onConflict: "user_id" });
  };
  // El logo necesita fondo oscuro para verse bien, así que el menú lateral y la barra superior
  // usan esta variante SIEMPRE oscura del mismo color elegido (no un azul fijo genérico) —
  // el matiz sí es el que el usuario escogió, solo la claridad se fuerza oscura ahí.
  const paletaSidebarPersonalizada = tema === "personalizado" ? generarPaletaPersonalizada(colorPersonalizado || "#12304F", true) : null;

  const [alertasCorreoActivas, setAlertasCorreoActivas] = useState(true);
  const cambiarAlertasCorreo = async (nuevoValor) => {
    setAlertasCorreoActivas(nuevoValor);
    await supabase.from("preferencias").upsert({ user_id: misId, alertas_correo_activas: nuevoValor }, { onConflict: "user_id" });
  };

  // --- Preferencias de notificación: qué categorías recibir y horario de silencio ------------
  // Se guarda la lista de categorías DESACTIVADAS (no las activadas), para que las categorías
  // nuevas que se agreguen después lleguen activadas por default sin necesitar migrar nada.
  const [notifTiposDesactivados, setNotifTiposDesactivados] = useState([]);
  const [notifSilencioActivo, setNotifSilencioActivo] = useState(false);
  const [notifSilencioInicio, setNotifSilencioInicio] = useState("22:00");
  const [notifSilencioFin, setNotifSilencioFin] = useState("07:00");
  const guardarPreferenciasNotif = async ({ tipos, silencioActivo, silencioInicio, silencioFin }) => {
    setNotifTiposDesactivados(tipos); setNotifSilencioActivo(silencioActivo); setNotifSilencioInicio(silencioInicio); setNotifSilencioFin(silencioFin);
    await supabase.from("preferencias").upsert({
      user_id: misId, notif_tipos_desactivados: tipos, notif_silencio_activo: silencioActivo,
      notif_silencio_inicio: silencioInicio, notif_silencio_fin: silencioFin,
    }, { onConflict: "user_id" });
  };

  // --- Notificaciones Push -------------------------------------------------
  // "sin-soporte" (navegador no puede), "sin-activar", "activando", "activo", "denegado".
  const [pushEstado, setPushEstado] = useState("sin-soporte");
  const [notifPanelAbierto, setNotifPanelAbierto] = useState(false);
  const [enviandoPrueba, setEnviandoPrueba] = useState(false);
  const [notificaciones, setNotificaciones] = useState([]);
  const notifNoLeidas = notificaciones.filter((n) => !n.leido).length;

  const cargarNotificaciones = async () => {
    const { data } = await supabase.from("notifications").select("*").eq("user_id", misId).order("created_at", { ascending: false }).limit(30);
    setNotificaciones(data || []);
  };

  useEffect(() => {
    cargarNotificaciones();
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) { setPushEstado("sin-soporte"); return; }
    if (Notification.permission === "denied") { setPushEstado("denegado"); return; }
    navigator.serviceWorker.ready.then(async (reg) => {
      const sub = await reg.pushManager.getSubscription();
      setPushEstado(sub ? "activo" : "sin-activar");
    }).catch(() => setPushEstado("sin-soporte"));
  }, []);

  const activarPush = async () => {
    setPushEstado("activando");
    try {
      const permiso = await Notification.requestPermission();
      if (permiso !== "granted") { setPushEstado(permiso === "denied" ? "denegado" : "sin-activar"); return; }
      const reg = await navigator.serviceWorker.ready;
      const vapidKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;
      if (!vapidKey) { alert("Falta configurar la llave pública de Push (VITE_VAPID_PUBLIC_KEY)."); setPushEstado("sin-activar"); return; }
      const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(vapidKey) });
      const json = sub.toJSON();
      const plataforma = /iphone|ipad|ipod/i.test(navigator.userAgent) ? "ios" : /android/i.test(navigator.userAgent) ? "android" : "desktop";
      await supabase.from("push_subscriptions").upsert({
        user_id: misId, endpoint: sub.endpoint, p256dh: json.keys.p256dh, auth: json.keys.auth,
        user_agent: navigator.userAgent, plataforma, activo: true,
      }, { onConflict: "user_id,endpoint" });
      setPushEstado("activo");
    } catch (err) {
      console.error("Error activando push:", err);
      setPushEstado("sin-activar");
    }
  };

  const desactivarPush = async () => {
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await supabase.from("push_subscriptions").update({ activo: false }).eq("user_id", misId).eq("endpoint", sub.endpoint);
        await sub.unsubscribe();
      }
      setPushEstado("sin-activar");
    } catch (err) {
      console.error("Error desactivando push:", err);
    }
  };

  const irADeepLink = (recursoTabla) => {
    const destino = recursoTabla && MODULO_TO_VIEW[recursoTabla];
    if (destino) irAVista(destino);
    setNotifPanelAbierto(false);
  };

  const marcarNotificacionLeida = async (n) => {
    if (!n.leido) {
      setNotificaciones((prev) => prev.map((x) => (x.id === n.id ? { ...x, leido: true } : x)));
      await supabase.from("notifications").update({ leido: true }).eq("id", n.id);
    }
    irADeepLink(n.recurso_tabla);
  };

  const marcarTodasLeidas = async () => {
    setNotificaciones((prev) => prev.map((n) => ({ ...n, leido: true })));
    await supabase.from("notifications").update({ leido: true }).eq("user_id", misId).eq("leido", false);
  };

  const eliminarNotificacion = async (id) => {
    setNotificaciones((prev) => prev.filter((n) => n.id !== id));
    const { error } = await supabase.from("notifications").delete().eq("id", id);
    if (error) console.error("Error al eliminar notificación:", error);
  };

  // Procesa el botón de acción rápida de una notificación de medicamento (Tomado / Posponer).
  const ACCION_MINUTOS = { posponer10: 10, posponer30: 30, posponer60: 60 };
  const procesarAccionRecordatorio = async (accion, recordatorioId) => {
    if (accion === "tomado") {
      await supabase.from("recordatorios").update({ estado: "completado" }).eq("id", recordatorioId).eq("user_id", misId);
    } else if (ACCION_MINUTOS[accion]) {
      const pospuestoHasta = new Date(Date.now() + ACCION_MINUTOS[accion] * 60000).toISOString();
      await supabase.from("recordatorios").update({ estado: "pospuesto", pospuesto_hasta: pospuestoHasta }).eq("id", recordatorioId).eq("user_id", misId);
    }
    irAVista("medicamentos");
    cargarNotificaciones();
  };

  // Igual que arriba, pero desde un botón inline en el panel de notificaciones (no navega a
  // ningún lado, solo marca la acción y refresca la lista) — la vía principal para iPhone.
  const marcarAccionDesdeNotif = async (n, accion) => {
    if (accion === "tomado") {
      await supabase.from("recordatorios").update({ estado: "completado" }).eq("id", n.recordatorio_id).eq("user_id", misId);
    } else if (ACCION_MINUTOS[accion]) {
      const pospuestoHasta = new Date(Date.now() + ACCION_MINUTOS[accion] * 60000).toISOString();
      await supabase.from("recordatorios").update({ estado: "pospuesto", pospuesto_hasta: pospuestoHasta }).eq("id", n.recordatorio_id).eq("user_id", misId);
    }
    await supabase.from("notifications").update({ leido: true }).eq("id", n.id);
    setNotificaciones((prev) => prev.map((x) => (x.id === n.id ? { ...x, leido: true } : x)));
  };

  // Deep links: si llegan de un push tocado con la app cerrada (abre /?modulo=deudas), o de
  // un push tocado con la app ya abierta (el Service Worker manda el mensaje a esta pestaña).
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const modulo = params.get("modulo");
    const accion = params.get("accion");
    const recordatorioId = params.get("recordatorio");
    if (accion && recordatorioId) {
      procesarAccionRecordatorio(accion, recordatorioId);
      window.history.replaceState({}, "", window.location.pathname);
    } else if (modulo) {
      irADeepLink(modulo);
      window.history.replaceState({}, "", window.location.pathname);
    }
    const alMensaje = (event) => {
      if (event.data?.tipo === "arkeyone-deep-link") {
        try {
          const url = new URL(event.data.url, window.location.origin);
          const a = url.searchParams.get("accion");
          const rid = url.searchParams.get("recordatorio");
          const m = url.searchParams.get("modulo");
          if (a && rid) procesarAccionRecordatorio(a, rid);
          else if (m) irADeepLink(m);
        } catch {}
      }
    };
    navigator.serviceWorker?.addEventListener?.("message", alMensaje);
    return () => navigator.serviceWorker?.removeEventListener?.("message", alMensaje);
  }, []);

  const [exportPaso, setExportPaso] = useState(null); // null | "confirmar" | "listo"
  const [mfaModalAbierto, setMfaModalAbierto] = useState(false);
  const [temaModalAbierto, setTemaModalAbierto] = useState(false);
  const confirmarExportar = () => {
    exportarExcel(data, activeOwnerId === misId ? "mi-cuenta" : activeOwnerEmail?.split("@")[0]);
    setExportPaso("listo");
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

  // El Asistente guarda directo en Supabase desde el servidor, así que el navegador no se
  // entera solo. Esto vuelve a leer nada más las tablas que el Asistente tocó (no toda la
  // cuenta) y actualiza `data`, para que lo que acaba de crear se vea de inmediato en el
  // resto de la app sin tener que recargar la página a mano.
  const recargarModulos = async (keys) => {
    const unicos = [...new Set(keys)];
    const entries = await Promise.all(unicos.map(async (k) => [k, await fetchTable(k, activeOwnerId)]));
    setData((prev) => ({ ...prev, ...Object.fromEntries(entries) }));
  };

  // "Pull to refresh": deslizar hacia abajo desde arriba del todo en el contenido para volver
  // a traer todo de la base de datos (por si se hizo un cambio desde otro dispositivo, o desde
  // el Asistente en otra pestaña). Solo se activa si el scroll ya está hasta arriba.
  const [pullDist, setPullDist] = useState(0);
  const [refrescando, setRefrescando] = useState(false);
  const pullRef = useRef({ activo: false, startY: 0 });
  const contenidoRef = useRef(null);

  const refrescarTodo = async () => {
    setRefrescando(true);
    try {
      const result = await loadAllTables(activeOwnerId);
      setData(result);
    } finally {
      setRefrescando(false);
      setPullDist(0);
    }
  };
  const onTouchStartContenido = (e) => {
    if ((contenidoRef.current?.scrollTop || 0) > 0 || refrescando) { pullRef.current.activo = false; return; }
    pullRef.current = { activo: true, startY: e.touches[0].clientY };
  };
  const onTouchMoveContenido = (e) => {
    if (!pullRef.current.activo || refrescando) return;
    const dy = e.touches[0].clientY - pullRef.current.startY;
    if (dy > 0 && (contenidoRef.current?.scrollTop || 0) <= 0) {
      setPullDist(Math.min(dy * 0.5, 90));
    } else {
      pullRef.current.activo = false;
      setPullDist(0);
    }
  };
  const onTouchEndContenido = () => {
    if (!pullRef.current.activo) return;
    pullRef.current.activo = false;
    if (pullDist > 60) refrescarTodo(); else setPullDist(0);
  };

  const addItem = async (key, item) => {
    const newItem = { ...item, id: item.id || uid(), userId: activeOwnerId };
    const { error } = await supabase.from(tableName(key)).insert(toRow(key, newItem));
    if (error) { console.error(`Error al guardar en ${tableName(key)}:`, error); alert(mensajeErrorGuardado(error)); return; }
    setData((prev) => ({ ...prev, [key]: [...prev[key], newItem] }));
  };
  const editItem = async (key, id, patch) => {
    const { error } = await supabase.from(tableName(key)).update(toRow(key, patch)).eq("id", id);
    if (error) { console.error(`Error al actualizar ${tableName(key)}:`, error); alert("No se pudo guardar el cambio."); return; }
    setData((prev) => ({ ...prev, [key]: prev[key].map((i) => (i.id === id ? { ...i, ...patch } : i)) }));
  };
  const removeItem = async (key, id, extraIds = []) => {
    const idsTodos = [id, ...extraIds];
    const { error } = await supabase.from(tableName(key)).update({ deleted_at: new Date().toISOString() }).in("id", idsTodos);
    if (error) { console.error(`Error al borrar en ${tableName(key)}:`, error); alert("No se pudo borrar."); return; }
    setData((prev) => ({ ...prev, [key]: prev[key].filter((i) => !idsTodos.includes(i.id)) }));
  };
  const restoreItem = async (key, id) => {
    const { error } = await supabase.from(tableName(key)).update({ deleted_at: null }).eq("id", id);
    if (error) { console.error(`Error al restaurar en ${tableName(key)}:`, error); alert("No se pudo restaurar."); return false; }
    const fresh = await fetchTable(key, activeOwnerId);
    setData((prev) => ({ ...prev, [key]: fresh }));
    return true;
  };

  // Cada Evento tiene su propia estructura (lugar, horario, costos, fotos) que no tiene sentido
  // meter en Finanzas — pero su utilidad SÍ debe contar como ingreso real en Panorama/Reportes/
  // Finanzas. En vez de fusionar las tablas, se mantiene un movimiento "espejo" en Finanzas
  // (Ingreso, categoría "Eventos", ligado por evento_id) que se crea/actualiza/borra solo cada
  // vez que se guarda o borra un evento — así los lugares que ya suman "Ingreso" en Finanzas no
  // necesitan tocarse, simplemente ven este movimiento como uno más.
  const sincronizarFinanzasDeEvento = async (evento) => {
    const monto = evento.utilidad !== null && evento.utilidad !== undefined && evento.utilidad !== ""
      ? Number(evento.utilidad)
      : (evento.ganancia !== null && evento.ganancia !== undefined && evento.ganancia !== "" ? Number(evento.ganancia) : null);
    const existente = data.finanzas.find((f) => f.eventoId === evento.id);
    if (!monto || monto <= 0) {
      if (existente) await removeItem("finanzas", existente.id);
      return;
    }
    const campos = { tipo: "Ingreso", categoria: "Eventos", monto, concepto: evento.nombre, fecha: evento.fecha, estatus: "Cobrado", eventoId: evento.id };
    if (existente) await editItem("finanzas", existente.id, campos);
    else await addItem("finanzas", campos);
  };

  const permanentDelete = async (key, id) => {
    const { error } = await supabase.from(tableName(key)).delete().eq("id", id);
    if (error) { console.error(`Error al borrar definitivamente en ${tableName(key)}:`, error); alert("No se pudo borrar definitivamente."); return false; }
    return true;
  };
  // opts puede traer { extraIds: [...ids de subtareas que también se van a borrar], mensaje: "texto de advertencia" }
  const askDelete = (key, id, opts = {}) => setConfirmDelete({ key, id, ...opts });
  const updatePerfilSalud = async (contactoId, patch) => {
    const row = { user_id: activeOwnerId, contacto_id: contactoId || null, altura_cm: patch.alturaCm || null };
    const { error } = await supabase.from("perfil_salud").upsert(row, { onConflict: contactoId ? "user_id,contacto_id" : "user_id" });
    if (error) { console.error("Error al guardar la estatura:", error); return; }
    setData((prev) => ({ ...prev, perfilSalud: { ...(prev.perfilSalud || {}), [contactoId || "yo"]: { ...(prev.perfilSalud?.[contactoId || "yo"] || {}), ...patch } } }));
  };
  // Apartar dinero: registra el aporte en el historial de movimientos del apartado y actualiza
  // el caché de "ahorrado" — nunca se captura el monto ahorrado directamente. No toca Finanzas:
  // apartar no es un egreso, es una transferencia interna entre "bolsas" (secc. 23.13).
  const aportarApartado = async (apartado, { monto }) => {
    const nuevoMontoActual = String((Number(apartado.montoActual) || 0) + Number(monto));
    await addItem("apartadosMovimientos", { apartadoId: apartado.id, tipo: "aporte", monto: String(monto), fecha: todayISO(), concepto: `Aporte a "${apartado.nombre}"` });
    await editItem("apartados", apartado.id, { montoActual: nuevoMontoActual });
  };

  // Retirar dinero: se registra como retiro en el historial del apartado (reduce el caché de
  // "ahorrado") y, cuando el dinero se libera hacia un proyecto o gasto concreto, también se
  // refleja como Ingreso en Finanzas para dejar el rastro de a dónde fue.
  const retirarApartado = async (apartado, { monto, proyectoId, concepto }) => {
    const nuevoMontoActual = String((Number(apartado.montoActual) || 0) - Number(monto));
    await addItem("apartadosMovimientos", { apartadoId: apartado.id, tipo: "retiro", monto: String(monto), fecha: todayISO(), concepto, proyectoId: proyectoId || "" });
    await editItem("apartados", apartado.id, { montoActual: nuevoMontoActual });
    await addItem("finanzas", {
      concepto, tipo: "Ingreso", proyectoId: proyectoId || "", contactoId: "",
      fecha: todayISO(), monto: String(monto), categoria: "Movimiento de apartado",
      forma: "Transferencia", estatus: "Cobrado", pautando: false, esRecurrente: false, frecuencia: "Mensual", fechaFin: "",
    });
  };

  // Recordatorio manual creado desde el botón de acciones rápidas (⚡). No pasa por addItem()
  // porque `recordatorios` no es una tabla que se cargue completa al estado `data` (se consume
  // vía notificaciones/push, no tiene una vista propia de lista todavía) — así que es una
  // inserción directa. El motor-recordatorios (cron cada 5 min) lo recoge solo.
  const onCrearRecordatorio = async ({ titulo, fechaHora }) => {
    const { error } = await supabase.from("recordatorios").insert({
      user_id: activeOwnerId, tipo: "manual", titulo, fecha_hora: fechaHora, recurrencia: "ninguna", prioridad: "normal", estado: "pendiente",
    });
    if (error) { console.error("Error al crear recordatorio:", error); alert("No se pudo guardar el recordatorio."); }
  };

  if (loading || !data) {
    return (
      <div className={`gp-root min-h-screen flex items-center justify-center ${claseTema(tema)}`}>
        <Tokens tema={tema} />
        <p className="gp-text-muted text-sm">Cargando tu sistema…</p>
      </div>
    );
  }

  const navGroups = [
    { label: "Inicio", items: [
      { id: "dashboard", label: "Centro de mando", icon: LayoutDashboard },
      { id: "agenda", label: "Agenda", icon: CalendarRange },
      { id: "citas", label: "Citas", icon: CalendarClock },
      { id: "notas", label: "Notas", icon: StickyNote },
    ]},
    { label: "Trabajo", items: [
      { id: "proyectos", label: "Proyectos e ideas", icon: FolderKanban },
      { id: "pendientes", label: "Tareas", icon: CheckSquare },
      { id: "mi-trabajo", label: "Mi trabajo", icon: CheckSquare },
      { id: "equipo", label: "Colaboradores", icon: Users },
    ]},
    { label: "Dinero", items: [
      { id: "finanzas", label: "Finanzas", icon: Wallet },
      { id: "deudas", label: "Deudas", icon: AlertTriangle },
      { id: "apartados", label: "Apartados", icon: PiggyBank },
      { id: "patrimonio", label: "Patrimonio", icon: Gem },
      { id: "activos", label: "Activos digitales", icon: Globe },
      { id: "reportes", label: "Reportes", icon: PieChartIcon },
    ]},
    { label: "Negocio", items: [
      { id: "marketing", label: "Marketing", icon: Megaphone },
      { id: "documentos", label: "Legal y contratos", icon: FileText },
    ]},
    { label: "Personal", items: [
      { id: "contactos", label: "Contactos", icon: Contact },
      { id: "regalos", label: "Atenciones", icon: Gift },
      { id: "actividades", label: "Diario", icon: Activity },
      { id: "eventos", label: "Eventos", icon: Camera },
      { id: "habitos", label: "Hábitos", icon: Flame },
      { id: "salud", label: "Salud", icon: HeartPulse },
      { id: "medicamentos", label: "Medicamentos", icon: Pill },
    ]},
  ];

  const ADMIN_UID = "eca7e776-6c96-44eb-b4e0-b03c85fa5bb8";
  const esAdmin = misId === ADMIN_UID && activeOwnerId === misId;

  const navGroupsFiltrados = modulosPermitidos === null
    ? navGroups
    : navGroups
        .map((g) => ({ ...g, items: g.items.filter((it) => it.id === "mi-trabajo" || (VIEW_TO_MODULO[it.id] && modulosPermitidos.includes(VIEW_TO_MODULO[it.id]))) }))
        .filter((g) => g.items.length > 0);

  return (
    <div className={`gp-root overflow-hidden ${claseTema(tema)}`} style={{ minHeight: "100vh", ...(tema === "personalizado" ? generarPaletaPersonalizada(colorPersonalizado || "#F59E0B") : null) }}>
      <Tokens tema={tema} />
      <div className="flex relative" style={{ minHeight: "100vh" }}>
        {/* barra superior solo en móvil — padding extra arriba/lados para no quedar tapada
            por el notch/isla dinámica ni el reloj cuando la app corre "standalone" (instalada) */}
        <div
          className="gp-sidebar-area md:hidden fixed top-0 left-0 right-0 z-30 grid items-center px-4 pb-3 border-b gp-border"
          style={{
            background: "var(--bg)",
            gridTemplateColumns: "1fr auto 1fr",
            paddingTop: "calc(env(safe-area-inset-top) + 12px)",
            paddingLeft: "calc(env(safe-area-inset-left) + 16px)",
            paddingRight: "calc(env(safe-area-inset-right) + 16px)",
            ...paletaSidebarPersonalizada,
          }}
        >
          <button onClick={() => setMobileNavOpen(true)} className="p-2 -ml-2 gp-btn-ghost rounded justify-self-start" aria-label="Abrir menú">
            <Menu size={20} />
          </button>
          {/* El icono siempre queda centrado en la columna del medio (1fr auto 1fr), sin
              importar cuántos controles haya a los lados ni qué tan anchos sean. */}
          <img src="/icono-arkeyone.png" alt="ArkeyOne" style={{ height: 36 }} className="justify-self-center" />
          <div className="flex items-center gap-1 justify-self-end">
            <button onClick={() => setBusquedaAbierta(true)} className="p-2 gp-btn-ghost rounded" aria-label="Buscar">
              <Search size={18} />
            </button>
            <button onClick={() => irAVista("asistente")} className="p-2 gp-btn-ghost rounded" aria-label="Asistente">
              <Bot size={18} />
            </button>
          </div>
        </div>

        {/* fondo oscuro al abrir el cajón en móvil */}
        {mobileNavOpen && (
          <div className="md:hidden fixed inset-0 z-40" style={{ background: "rgba(0,0,0,.6)" }} onClick={() => setMobileNavOpen(false)} />
        )}

        {/* rail lateral / cajón */}
        <div
          className={`gp-sidebar-area w-64 ${sidebarColapsado ? "md:w-20" : "md:w-56"} shrink-0 border-r gp-border p-4 flex flex-col gap-4 overflow-y-auto gp-scroll fixed md:static inset-y-0 left-0 z-50 md:z-auto transition-all duration-200 ${mobileNavOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}`}
          style={{ maxHeight: "100vh", background: "var(--bg)", ...paletaSidebarPersonalizada }}
        >
          <div className="px-2 flex flex-col items-center text-center gap-1 relative" style={{ paddingTop: "calc(env(safe-area-inset-top) + 4px)" }}>
            <button onClick={() => setMobileNavOpen(false)} className="md:hidden absolute right-0 p-1 gp-btn-ghost rounded" style={{ top: "calc(env(safe-area-inset-top) + 4px)" }} aria-label="Cerrar menú"><X size={16} /></button>
            <button
              onClick={toggleSidebarColapsado}
              title={sidebarColapsado ? "Fijar menú abierto" : "Colapsar menú"}
              className="hidden md:inline-flex absolute -right-2 top-0 p-1 gp-btn-ghost rounded"
            >
              {sidebarColapsado ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
            </button>
            <img src="/icono-arkeyone.png" alt="ArkeyOne" style={{ height: 34 }} />
            <span className={`gp-serif text-lg font-semibold ${sidebarColapsado ? "md:hidden" : ""}`} style={{ letterSpacing: "0.3px" }}>ARKEYONE</span>
            <p className={`text-xs gp-text-muted truncate ${sidebarColapsado ? "md:hidden" : ""}`} style={{ maxWidth: 160 }}>
              {activeOwnerId === misId ? miEmail : `Viendo: ${activeOwnerEmail}`}
            </p>
          </div>

          <div className={`hidden md:flex gap-1 ${sidebarColapsado ? "md:flex-col" : ""}`}>
            <button
              onClick={() => setBusquedaAbierta(true)}
              title="Buscar en todo ARKEYONE"
              className={`gp-input flex items-center justify-center px-3 py-2 ${sidebarColapsado ? "md:px-0" : ""}`}
            >
              <Search size={16} />
            </button>
            <button
              onClick={() => irAVista("asistente")}
              title="Asistente"
              className={`gp-input flex items-center justify-center px-3 py-2 ${sidebarColapsado ? "md:px-0" : ""}`}
            >
              <Bot size={16} />
            </button>
          </div>

          {misColaboraciones.length > 0 && (
            <div className={`px-2 ${sidebarColapsado ? "md:hidden" : ""}`}>
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

          {navGroupsFiltrados.map((g) => {
            const cerrado = grupoEstaCerrado(g.label);
            const mostrarItems = (sidebarColapsado && esEscritorio) || !cerrado;
            const itemsOrdenados = ordenarItemsGrupo(g.label, g.items);
            return (
              <div key={g.label}>
                <button
                  onClick={() => toggleGrupo(g.label)}
                  className={`w-full flex items-center justify-between px-3 mb-1 text-xs gp-text-muted gp-btn-ghost rounded py-1 ${sidebarColapsado ? "md:hidden" : ""}`}
                >
                  <span>{g.label}</span>
                  {!cerrado ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                </button>
                {mostrarItems && (
                  <div className="flex flex-col gap-0.5">
                    {itemsOrdenados.map((n) => (
                      <button
                        key={n.id}
                        onClick={() => { irAVista(n.id); setMobileNavOpen(false); }}
                        title={n.label}
                        draggable={!sidebarColapsado && itemsOrdenados.length > 1}
                        onDragStart={(e) => { e.dataTransfer.effectAllowed = "move"; setDragNav({ grupo: g.label, id: n.id }); }}
                        onDragEnter={() => { if (dragNav && dragNav.grupo === g.label) setDragNavSobre(n.id); }}
                        onDragOver={(e) => { if (dragNav && dragNav.grupo === g.label) e.preventDefault(); }}
                        onDrop={(e) => {
                          e.preventDefault();
                          if (dragNav && dragNav.grupo === g.label) moverItemNav(g.label, itemsOrdenados, dragNav.id, n.id);
                          setDragNav(null); setDragNavSobre(null);
                        }}
                        onDragEnd={() => { setDragNav(null); setDragNavSobre(null); }}
                        className={`gp-navitem flex items-center gap-2 px-3 py-2.5 md:py-2 text-sm text-left ${sidebarColapsado ? "md:justify-center md:px-2" : ""} ${view === n.id ? "gp-navitem-active" : ""} ${dragNav && dragNav.id === n.id ? "opacity-40" : ""} ${dragNavSobre === n.id && dragNav && dragNav.id !== n.id ? "gp-navitem-drop" : ""}`}
                      >
                        <n.icon size={15} /> <span className={sidebarColapsado ? "md:hidden" : ""}>{n.label}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
          <div className="mt-auto pt-2 border-t gp-border flex flex-col gap-0.5">
            <button onClick={() => { setNotifPanelAbierto(true); setMobileNavOpen(false); }} title="Notificaciones"
              className={`gp-navitem flex items-center gap-2 px-3 py-2.5 md:py-2 text-sm text-left w-full relative ${sidebarColapsado ? "md:justify-center md:px-2" : ""}`}>
              <Bell size={15} />
              <span className={sidebarColapsado ? "md:hidden" : ""}>Notificaciones{notifNoLeidas > 0 ? ` (${notifNoLeidas})` : ""}</span>
              {notifNoLeidas > 0 && <span className="w-2 h-2 rounded-full absolute" style={{ background: "var(--red)", top: 8, left: sidebarColapsado ? 24 : 14 }} />}
            </button>
            <button onClick={() => { irAVista("configuracion"); setMobileNavOpen(false); }} title="Configuración"
              className={`gp-navitem flex items-center gap-2 px-3 py-2.5 md:py-2 text-sm text-left w-full ${sidebarColapsado ? "md:justify-center md:px-2" : ""} ${view === "configuracion" ? "gp-navitem-active" : ""}`}>
              <Settings size={15} /> <span className={sidebarColapsado ? "md:hidden" : ""}>Configuración</span>
            </button>
            <button onClick={cerrarSesion} disabled={cerrandoSesion} title="Cerrar sesión"
              className={`gp-navitem flex items-center gap-2 px-3 py-2.5 md:py-2 text-sm text-left w-full ${sidebarColapsado ? "md:justify-center md:px-2" : ""}`}
              style={cerrandoSesion ? { opacity: 0.6 } : undefined}>
              <LogOut size={15} /> <span className={sidebarColapsado ? "md:hidden" : ""}>{cerrandoSesion ? "Cerrando sesión…" : "Cerrar sesión"}</span>
            </button>
          </div>
        </div>

        {/* contenido */}
        <div
          ref={contenidoRef}
          onTouchStart={onTouchStartContenido}
          onTouchMove={onTouchMoveContenido}
          onTouchEnd={onTouchEndContenido}
          className="flex-1 p-4 pt-[calc(env(safe-area-inset-top)+4rem)] md:p-6 md:pt-6 overflow-y-auto gp-scroll w-full"
          style={{ maxHeight: "100vh" }}
        >
          {(pullDist > 0 || refrescando) && (
            <div
              className="flex items-center justify-center text-xs gp-text-muted"
              style={{ height: refrescando ? 32 : pullDist, overflow: "hidden", transition: refrescando ? "height .15s" : "none" }}
            >
              {refrescando ? "Actualizando…" : pullDist > 60 ? "Suelta para actualizar ↓" : "Desliza hacia abajo para actualizar…"}
            </div>
          )}
          {view === "dashboard" && <Dashboard data={data} setView={irAVista} onAddSaldo={(i) => addItem("saldoInicial", i)} onVerProyecto={irADetalleProyecto} onEditPendiente={(id, p) => editItem("pendientes", id, p)} />}
          {view === "papelera" && <Papelera onRestore={restoreItem} onPermanentDelete={permanentDelete} ownerId={activeOwnerId} />}
          {view === "colaboradores" && <Colaboradores misId={misId} miEmail={miEmail} />}
          {view === "admin" && <AdminUsuarios adminUid={ADMIN_UID} adminEmail={miEmail} />}
          {view === "configuracion" && (
            <Configuracion
              tema={tema}
              onAbrirTema={() => setTemaModalAbierto(true)}
              onAbrirExportar={() => setExportPaso("confirmar")}
              onAbrirMfa={() => setMfaModalAbierto(true)}
              alertasCorreoActivas={alertasCorreoActivas}
              cambiarAlertasCorreo={cambiarAlertasCorreo}
              pushEstado={pushEstado}
              activarPush={activarPush}
              desactivarPush={desactivarPush}
              esPropia={activeOwnerId === misId}
              irAColaboradores={() => irAVista("colaboradores")}
              irAPapelera={() => irAVista("papelera")}
              esAdmin={esAdmin}
              irAAdmin={() => irAVista("admin")}
              miEmail={miEmail}
              notifTiposDesactivados={notifTiposDesactivados}
              notifSilencioActivo={notifSilencioActivo}
              notifSilencioInicio={notifSilencioInicio}
              notifSilencioFin={notifSilencioFin}
              guardarPreferenciasNotif={guardarPreferenciasNotif}
            />
          )}
          {view === "proyectos" && (
            <Proyectos data={data} onAdd={(i) => addItem("proyectos", i)} onEdit={(id, p) => editItem("proyectos", id, p)} onRemove={(id) => askDelete("proyectos", id)} onAddComentario={(i) => addItem("comentarios", i)} onRemoveComentario={(id) => askDelete("comentarios", id)} onVerDetalle={irADetalleProyecto} />
          )}
          {view === "proyecto-detalle" && (
            <ProyectoDetalle
              data={data}
              proyectoId={proyectoDetalleId}
              onVolver={() => irAVista("proyectos")}
              onAddTarea={(i) => addItem("pendientes", i)}
              onEditTarea={(id, p) => editItem("pendientes", id, p)}
              onRemoveTarea={(id, extraIds, mensaje) => askDelete("pendientes", id, { extraIds, mensaje })}
              onAddComentario={(i) => addItem("comentarios", i)}
              onRemoveComentario={(id) => askDelete("comentarios", id)}
              onAddMeta={(i) => addItem("metas", i)}
              onEditMeta={(id, p) => editItem("metas", id, p)}
              onRemoveMeta={(id) => askDelete("metas", id)}
            />
          )}
          {view === "pendientes" && (
            <Pendientes data={data} activeOwnerId={activeOwnerId} onAdd={(i) => addItem("pendientes", i)} onEdit={(id, p) => editItem("pendientes", id, p)} onRemove={(id, extraIds, mensaje) => askDelete("pendientes", id, { extraIds, mensaje })} onAddComentario={(i) => addItem("comentarios", i)} onRemoveComentario={(id) => askDelete("comentarios", id)}
              onAsignar={async (pendienteId) => {
                try {
                  const { data: sesion } = await supabase.auth.getSession();
                  await fetch(`${supabase.supabaseUrl}/functions/v1/notificar-asignacion`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json", Authorization: `Bearer ${sesion.session.access_token}` },
                    body: JSON.stringify({ pendienteId }),
                  });
                } catch (err) {
                  console.error("Error al notificar la asignación:", err);
                }
              }}
            />
          )}
          {(view === "finanzas" || view === "facturas") && (
            <FinanzasYFacturas
              key={view}
              data={data}
              tabInicial={view === "facturas" ? "facturas" : "movimientos"}
              finanzasProps={{ onAdd: (i) => addItem("finanzas", i), onEdit: (id, p) => editItem("finanzas", id, p), onRemove: (id) => askDelete("finanzas", id) }}
              facturasProps={{ onAdd: (i) => addItem("facturas", i), onEdit: (id, p) => editItem("facturas", id, p), onRemove: (id) => askDelete("facturas", id), onAddComentario: (i) => addItem("comentarios", i), onRemoveComentario: (id) => askDelete("comentarios", id), onAddFinanzas: (i) => addItem("finanzas", i) }}
            />
          )}
          {view === "reportes" && <Reportes data={data} />}
          {view === "deudas" && (
            <Deudas data={data} onAddFinanzas={(i) => addItem("finanzas", i)} onEditFinanzas={(id, p) => editItem("finanzas", id, p)} onRemoveFinanzas={(id) => askDelete("finanzas", id)} onCrearTarea={(t) => addItem("pendientes", t)} />
          )}
          {view === "apartados" && (
            <Apartados data={data} onAdd={(i) => addItem("apartados", i)} onEdit={(id, p) => editItem("apartados", id, p)} onRemove={(id) => askDelete("apartados", id)} onAportar={aportarApartado} onRetirar={retirarApartado} />
          )}
          {view === "patrimonio" && (
            <Patrimonio data={data} onAdd={(i) => addItem("patrimonio", i)} onEdit={(id, p) => editItem("patrimonio", id, p)} onRemove={(id) => askDelete("patrimonio", id)} onAddValuacion={(i) => addItem("patrimonioValuaciones", i)} onRemoveValuacion={(id) => askDelete("patrimonioValuaciones", id)} onAddComentario={(i) => addItem("comentarios", i)} onRemoveComentario={(id) => askDelete("comentarios", id)} />
          )}
          {view === "documentos" && (
            <Documentos data={data} onAdd={(i) => addItem("documentos", i)} onEdit={(id, p) => editItem("documentos", id, p)} onRemove={(id) => askDelete("documentos", id)} onCrearTarea={(t) => addItem("pendientes", t)} />
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
          {(view === "marketing" || view === "redes") && (
            <MarketingYRedes
              key={view}
              data={data}
              tabInicial={view === "redes" ? "redes" : "campanas"}
              marketingProps={{ onAdd: (i) => addItem("campanas", i), onEdit: (id, p) => editItem("campanas", id, p), onRemove: (id) => askDelete("campanas", id), onAddComentario: (i) => addItem("comentarios", i), onRemoveComentario: (id) => askDelete("comentarios", id) }}
              redesProps={{ onAdd: (i) => addItem("redesMetricas", i), onEdit: (id, p) => editItem("redesMetricas", id, p), onRemove: (id) => askDelete("redesMetricas", id) }}
            />
          )}
          {view === "actividades" && (
            <Actividades data={data} onAdd={(i) => addItem("actividades", i)} onEdit={(id, p) => editItem("actividades", id, p)} onRemove={(id) => askDelete("actividades", id)} />
          )}
          {view === "eventos" && (
            <Eventos data={data}
              onAdd={async (i) => { const id = i.id || uid(); await addItem("eventos", { ...i, id }); await sincronizarFinanzasDeEvento({ ...i, id }); }}
              onEdit={async (id, p) => { await editItem("eventos", id, p); const actual = data.eventos.find((e) => e.id === id); await sincronizarFinanzasDeEvento({ ...actual, ...p, id }); }}
              onRemove={(id) => askDelete("eventos", id)}
              onAddComentario={(i) => addItem("comentarios", i)} onRemoveComentario={(id) => askDelete("comentarios", id)} />
          )}
          {view === "habitos" && (
            <Habitos data={data} onAdd={(i) => addItem("habitos", i)} onEdit={(id, p) => editItem("habitos", id, p)} onRemove={(id) => askDelete("habitos", id)} />
          )}
          {view === "salud" && (
            <Salud data={data} onAdd={(i) => addItem("salud", i)} onEdit={(id, p) => editItem("salud", id, p)} onRemove={(id) => askDelete("salud", id)} onUpdatePerfil={updatePerfilSalud} />
          )}
          {view === "mi-trabajo" && <MiTrabajo misId={misId} />}
          {view === "medicamentos" && (
            <Medicamentos data={data} onAdd={(i) => addItem("medicamentos", i)} onEdit={(id, p) => editItem("medicamentos", id, p)} onRemove={(id) => askDelete("medicamentos", id)} />
          )}
          {view === "activos" && (
            <ActivosDigitales data={data} onAdd={(i) => addItem("activos", i)} onEdit={(id, p) => editItem("activos", id, p)} onRemove={(id) => askDelete("activos", id)} onCrearTarea={(t) => addItem("pendientes", t)} />
          )}
          {view === "asistente" && <Asistente onDatosCreados={recargarModulos} />}
          {view === "agenda" && <Agenda data={data} misId={misId} onEditPendiente={(id, p) => editItem("pendientes", id, p)} onAddCita={(c) => addItem("citas", c)} />}
          {view === "citas" && (
            <Citas data={data} onAdd={(i) => addItem("citas", i)} onEdit={(id, p) => editItem("citas", id, p)} onRemove={(id) => askDelete("citas", id)} onCrearTarea={(t) => addItem("pendientes", t)} />
          )}
          {view === "notas" && (
            <Notas data={data} onAdd={(i) => addItem("notas", i)} onEdit={(id, p) => editItem("notas", id, p)} onRemove={(id) => askDelete("notas", id)} />
          )}
        </div>
      </div>

      <QuickCapture data={data} onAdd={addItem} onCrearRecordatorio={onCrearRecordatorio} irAVista={irAVista} />
      {busquedaAbierta && <BusquedaGlobal data={data} onNavigate={buscarNavegarA} onClose={() => setBusquedaAbierta(false)} />}

      {confirmDelete && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,.6)" }} onClick={() => setConfirmDelete(null)}>
          <div className="gp-panel w-full max-w-sm p-5" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle size={16} className="gp-text-red" />
              <h3 className="gp-serif text-lg">¿Eliminar esto?</h3>
            </div>
            <p className="text-sm gp-text-muted mb-5">{confirmDelete.mensaje || "Esta acción no se puede deshacer."}</p>
            <div className="flex gap-2">
              <button onClick={() => setConfirmDelete(null)} className="gp-btn-ghost flex-1 py-2 text-sm">Cancelar</button>
              <button
                onClick={() => {
                  if (confirmDelete.key === "eventos") {
                    const espejo = data.finanzas.find((f) => f.eventoId === confirmDelete.id);
                    if (espejo) removeItem("finanzas", espejo.id);
                  }
                  removeItem(confirmDelete.key, confirmDelete.id, confirmDelete.extraIds || []);
                  setConfirmDelete(null);
                }}
                className="flex-1 py-2 text-sm rounded"
                style={{ background: "var(--red)", color: "#fff" }}
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
      {exportPaso === "confirmar" && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,.6)" }} onClick={() => setExportPaso(null)}>
          <div className="gp-panel w-full max-w-sm p-5" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-2 mb-2">
              <Download size={16} className="gp-text-gold" />
              <h3 className="gp-serif text-lg">¿Exportar tus datos?</h3>
            </div>
            <p className="text-sm gp-text-muted mb-5">Se va a descargar un archivo de Excel (.xlsx) con toda la información de {activeOwnerId === misId ? "tu cuenta" : `la cuenta de ${activeOwnerEmail}`}.</p>
            <div className="flex gap-2">
              <button onClick={() => setExportPaso(null)} className="gp-btn-ghost flex-1 py-2 text-sm">Cancelar</button>
              <button onClick={confirmarExportar} className="gp-btn flex-1 py-2 text-sm">Exportar</button>
            </div>
          </div>
        </div>
      )}

      {exportPaso === "listo" && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,.6)" }} onClick={() => setExportPaso(null)}>
          <div className="gp-panel w-full max-w-sm p-5" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-2 mb-2">
              <Check size={16} className="gp-text-teal" />
              <h3 className="gp-serif text-lg">Exportación completa</h3>
            </div>
            <p className="text-sm gp-text-muted mb-5">Tu archivo se descargó correctamente. Revisa la carpeta de Descargas de tu navegador.</p>
            <button onClick={() => setExportPaso(null)} className="gp-btn w-full py-2 text-sm">Entendido</button>
          </div>
        </div>
      )}

      {avisoInactividad && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,.65)" }}>
          <div className="gp-panel w-full max-w-sm p-5 text-center">
            <AlertTriangle size={22} className="gp-text-gold mx-auto mb-2" />
            <h3 className="gp-serif text-lg mb-2">¿Sigues ahí?</h3>
            <p className="text-sm gp-text-muted mb-5">Por seguridad, como tu información es sensible, la sesión se va a cerrar en 2 minutos por inactividad.</p>
            <button onClick={() => setAvisoInactividad(false)} className="gp-btn w-full py-2 text-sm">Seguir conectado</button>
          </div>
        </div>
      )}

      {reauthPendiente && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,.65)" }}>
          <div className="gp-panel w-full max-w-sm p-5">
            <div className="text-center mb-3">
              <Lock size={22} className="gp-text-gold mx-auto mb-2" />
              <h3 className="gp-serif text-lg mb-1">Confirma que eres tú</h3>
              <p className="text-sm gp-text-muted">Este módulo tiene información sensible. Escribe tu contraseña para continuar.</p>
            </div>
            <CampoPassword
              autoFocus
              value={reauthPassword}
              onChange={(e) => setReauthPassword(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") confirmarReauth(); }}
              placeholder="Tu contraseña"
              className="gp-input w-full mb-2"
            />
            {reauthError && <p className="text-sm text-red-400 mb-2">{reauthError}</p>}
            <div className="flex gap-2 mt-3">
              <button onClick={() => { setReauthPendiente(null); setReauthPassword(""); setReauthError(""); }} className="gp-btn-ghost flex-1 py-2 text-sm">Cancelar</button>
              <button onClick={confirmarReauth} disabled={reauthCargando} className="gp-btn flex-1 py-2 text-sm">{reauthCargando ? "Verificando…" : "Continuar"}</button>
            </div>
          </div>
        </div>
      )}

      {mfaModalAbierto && <SeguridadMfaModal onClose={() => setMfaModalAbierto(false)} />}
      {temaModalAbierto && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,.6)" }} onClick={() => setTemaModalAbierto(false)}>
          <div className="gp-panel p-4 max-w-sm w-full" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-semibold mb-3">Elige tu color</h3>
            <label
              className="flex items-center gap-3 p-3 rounded text-sm cursor-pointer"
              style={{ border: "2px solid var(--gold)", background: "var(--panel-2)" }}
            >
              <input
                type="color"
                value={colorPersonalizado}
                onChange={(e) => cambiarColorPersonalizado(e.target.value)}
                className="shrink-0"
                style={{ width: 32, height: 32, padding: 0, border: "1px solid var(--border)", borderRadius: 6, background: "none", cursor: "pointer" }}
              />
              <span>Toca para elegir cualquier color</span>
              {tema === "personalizado" && <Check size={14} className="ml-auto gp-text-gold shrink-0" />}
            </label>
            <p className="text-xs gp-text-muted mt-2">El resto (fondo, paneles, menú lateral, texto) se genera solo a partir de ese color, para que siempre se vea bien.</p>
            <button className="gp-btn-ghost w-full px-3 py-2 text-sm rounded mt-3" onClick={() => setTemaModalAbierto(false)}>Cerrar</button>
          </div>
        </div>
      )}

      {notifPanelAbierto && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,.65)" }} onClick={() => setNotifPanelAbierto(false)}>
          <div className="gp-panel w-full max-w-md p-5 max-h-[80vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="gp-serif text-lg">Notificaciones</h3>
              <button onClick={() => setNotifPanelAbierto(false)} className="gp-btn-ghost p-1 rounded"><X size={16} /></button>
            </div>

            {pushEstado === "activo" && esAdmin && (
              <button
                onClick={async () => {
                  setEnviandoPrueba(true);
                  try {
                    const { data: sesion } = await supabase.auth.getSession();
                    await fetch(`${supabase.supabaseUrl}/functions/v1/enviar-push`, {
                      method: "POST",
                      headers: { "Content-Type": "application/json", Authorization: `Bearer ${sesion.session.access_token}` },
                      body: JSON.stringify({ titulo: "ARKEYONE", mensaje: "Esta es una notificación de prueba. Si la ves, el Push ya está funcionando 🎉", tipo: "prueba", url: "/" }),
                    });
                    setTimeout(cargarNotificaciones, 1000);
                  } finally {
                    setEnviandoPrueba(false);
                  }
                }}
                disabled={enviandoPrueba}
                className="text-xs gp-text-gold text-left mb-3 disabled:opacity-50"
              >
                {enviandoPrueba ? "Enviando…" : "Enviar notificación de prueba →"}
              </button>
            )}

            {notificaciones.length > 0 && (
              <button onClick={marcarTodasLeidas} className="text-xs gp-text-muted text-left mb-2">Marcar todas como leídas</button>
            )}

            <div className="overflow-y-auto gp-scroll flex-1 -mx-1 px-1">
              {notificaciones.length === 0 && <p className="text-sm gp-text-muted">Aún no tienes notificaciones.</p>}
              {notificaciones.map((n) => (
                <div
                  key={n.id}
                  onClick={() => marcarNotificacionLeida(n)}
                  className="w-full text-left p-3 rounded mb-1.5 gp-panel-hi cursor-pointer"
                  style={{ background: n.leido ? "transparent" : "var(--panel-hi)", border: "1px solid var(--border)" }}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className={`text-sm ${n.leido ? "gp-text-muted" : ""}`}>{n.titulo}</p>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {!n.leido && <span className="w-2 h-2 rounded-full" style={{ background: "var(--gold)" }} />}
                      <button
                        onClick={(e) => { e.stopPropagation(); eliminarNotificacion(n.id); }}
                        className="gp-btn-ghost p-1 rounded"
                        title="Eliminar notificación"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                  {n.mensaje && <p className="text-xs gp-text-muted mt-0.5">{n.mensaje}</p>}
                  <p className="text-xs gp-text-muted mt-1 opacity-70">{new Date(n.created_at).toLocaleString("es-MX")}</p>
                  {/* Botones manuales para marcar medicamentos — imprescindibles en iPhone, donde
                      los botones de la notificación del sistema no existen (limitación de Apple). */}
                  {n.tipo === "medicamento" && n.recordatorio_id && !n.leido && (
                    <div className="flex gap-2 mt-2" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => marcarAccionDesdeNotif(n, "tomado")}
                        className="text-xs px-2.5 py-1 rounded"
                        style={{ background: "var(--teal)", color: "#12141c" }}
                      >Tomado</button>
                      <button
                        onClick={() => marcarAccionDesdeNotif(n, "posponer30")}
                        className="text-xs px-2.5 py-1 rounded gp-btn-ghost"
                      >+30 min</button>
                    </div>
                  )}
                </div>
              ))}
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
// Panel de administración: lista todos los usuarios registrados en ArkeyOne y permite
// bloquearlos (les impide entrar, pero conserva su información) o eliminarlos por completo
// (borra su cuenta y todos sus datos, sin poder deshacerse). Solo tú puedes ver esta pantalla.
// Fila reutilizable para la pantalla de Configuración: un renglón con ícono, texto y una acción
// a la derecha (puede ser una flecha para navegar, o un switch/estado para alternar algo aquí mismo).
function FilaConfig({ icon: Icon, label, sublabel, onClick, extra, chevron = true }) {
  return (
    <button onClick={onClick} className="gp-panel w-full flex items-center gap-3 p-3.5 text-left hover:opacity-90">
      <div className="p-2 rounded shrink-0" style={{ background: "var(--panel-2)" }}><Icon size={17} className="gp-text-gold" /></div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium">{label}</p>
        {sublabel && <p className="text-xs gp-text-muted mt-0.5">{sublabel}</p>}
      </div>
      {extra}
      {chevron && <ChevronRight size={16} className="gp-text-muted shrink-0" />}
    </button>
  );
}

// Configuración: junta en un solo lugar todo lo que antes estaba suelto como botones apilados
// al fondo del menú lateral (tema, exportar datos, seguridad, alertas, colaboradores, papelera,
// y administración si aplica) — así el menú lateral queda limpio y esto se siente como una
// verdadera pantalla de ajustes, no una lista de botones sueltos.
function Configuracion({
  tema, onAbrirTema, onAbrirExportar, onAbrirMfa,
  alertasCorreoActivas, cambiarAlertasCorreo,
  pushEstado, activarPush, desactivarPush,
  esPropia, irAColaboradores, irAPapelera,
  esAdmin, irAAdmin, miEmail,
  notifTiposDesactivados, notifSilencioActivo, notifSilencioInicio, notifSilencioFin, guardarPreferenciasNotif,
}) {
  const [prefsAbierto, setPrefsAbierto] = useState(false);
  const cantidadActivas = CATEGORIAS_NOTIFICACION.length - notifTiposDesactivados.length;
  return (
    <div className="max-w-xl">
      <h1 className="text-2xl font-bold mb-1">Configuración</h1>
      <p className="text-sm gp-text-muted mb-5">{miEmail}</p>

      <p className="text-xs gp-text-muted uppercase tracking-wide mb-2">Apariencia</p>
      <div className="space-y-2 mb-5">
        <FilaConfig icon={Palette} label={tema === "personalizado" ? "Tema: Personalizado" : "Personalizar color"} sublabel="Elige un color y el resto de la app se adapta solo" onClick={onAbrirTema} />
      </div>

      <p className="text-xs gp-text-muted uppercase tracking-wide mb-2">Notificaciones</p>
      <div className="space-y-2 mb-5">
        <FilaConfig icon={Bell} label="Alertas por correo" sublabel={alertasCorreoActivas ? "Activadas" : "Desactivadas"} onClick={() => cambiarAlertasCorreo(!alertasCorreoActivas)} chevron={false}
          extra={<span className="text-xs gp-text-gold shrink-0">{alertasCorreoActivas ? "Desactivar" : "Activar"}</span>} />
        {pushEstado !== "sin-soporte" && (
          <FilaConfig icon={Bell} label="Notificaciones push"
            sublabel={pushEstado === "activo" ? "Activadas en este dispositivo" : pushEstado === "denegado" ? "Bloqueadas — revisa los permisos del navegador" : pushEstado === "activando" ? "Activando…" : "Desactivadas en este dispositivo"}
            onClick={() => (pushEstado === "activo" ? desactivarPush() : activarPush())}
            chevron={false}
            extra={<span className="text-xs gp-text-gold shrink-0">{pushEstado === "activo" ? "Desactivar" : pushEstado === "activando" ? "" : "Activar"}</span>}
          />
        )}
        <FilaConfig icon={Sliders} label="Preferencias de notificación"
          sublabel={`${cantidadActivas} de ${CATEGORIAS_NOTIFICACION.length} categorías activas${notifSilencioActivo ? ` · Silencio ${notifSilencioInicio}–${notifSilencioFin}` : ""}`}
          onClick={() => setPrefsAbierto(true)} />
      </div>

      <p className="text-xs gp-text-muted uppercase tracking-wide mb-2">Seguridad y datos</p>
      <div className="space-y-2 mb-5">
        <FilaConfig icon={Shield} label="Verificación en dos pasos" sublabel="Protege tu cuenta con un código además de tu contraseña" onClick={onAbrirMfa} />
        <FilaConfig icon={Download} label="Exportar mis datos" sublabel="Descarga toda tu información en Excel" onClick={onAbrirExportar} />
      </div>

      {esPropia && (
        <>
          <p className="text-xs gp-text-muted uppercase tracking-wide mb-2">Cuenta</p>
          <div className="space-y-2 mb-5">
            <FilaConfig icon={Users} label="Colaboradores" sublabel="Invita a alguien a trabajar en tu cuenta" onClick={irAColaboradores} />
            <FilaConfig icon={Trash2} label="Papelera" sublabel="Restaura o borra definitivamente lo que eliminaste" onClick={irAPapelera} />
          </div>
        </>
      )}

      {esAdmin && (
        <>
          <p className="text-xs gp-text-muted uppercase tracking-wide mb-2">Administración</p>
          <div className="space-y-2 mb-5">
            <FilaConfig icon={Shield} label="Usuarios" sublabel="Panel de administración de ARKEYONE" onClick={irAAdmin} />
          </div>
        </>
      )}

      {prefsAbierto && (
        <Modal title="Preferencias de notificación" onClose={() => setPrefsAbierto(false)}>
          <PreferenciasNotifForm
            tiposDesactivados={notifTiposDesactivados}
            silencioActivo={notifSilencioActivo}
            silencioInicio={notifSilencioInicio}
            silencioFin={notifSilencioFin}
            onSave={async (v) => { await guardarPreferenciasNotif(v); setPrefsAbierto(false); }}
          />
        </Modal>
      )}
    </div>
  );
}

// Elegir qué categorías de notificación llegan (push y correo) y un horario de silencio en el
// que no se envían — sin borrar los eventos, que siguen quedando disponibles en el Centro de
// Notificaciones para revisar cuando el usuario quiera.
function PreferenciasNotifForm({ tiposDesactivados, silencioActivo, silencioInicio, silencioFin, onSave }) {
  const [desactivados, setDesactivados] = useState(tiposDesactivados);
  const [silencio, setSilencio] = useState(silencioActivo);
  const [inicio, setInicio] = useState(silencioInicio);
  const [fin, setFin] = useState(silencioFin);
  const toggle = (cat) => setDesactivados((prev) => (prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]));

  return (
    <div>
      <p className="text-xs gp-text-muted mb-2">Elige qué tipo de avisos quieres recibir. Esto controla la entrega — los eventos siguen disponibles en tu Centro de Notificaciones aunque los desactives aquí.</p>
      <div className="space-y-1.5 mb-4">
        {CATEGORIAS_NOTIFICACION.map((cat) => {
          const activa = !desactivados.includes(cat);
          return (
            <label key={cat} className="gp-panel flex items-center justify-between p-2.5 text-sm cursor-pointer">
              <span>{cat}</span>
              <input type="checkbox" checked={activa} onChange={() => toggle(cat)} className="w-4 h-4" />
            </label>
          );
        })}
      </div>

      <label className="gp-panel flex items-center justify-between p-2.5 text-sm cursor-pointer mb-2">
        <span>Horario de silencio</span>
        <input type="checkbox" checked={silencio} onChange={(e) => setSilencio(e.target.checked)} className="w-4 h-4" />
      </label>
      {silencio && (
        <div className="grid grid-cols-2 gap-2 mb-3">
          <Field label="Desde"><input type="time" className="gp-input" value={inicio} onChange={(e) => setInicio(e.target.value)} /></Field>
          <Field label="Hasta"><input type="time" className="gp-input" value={fin} onChange={(e) => setFin(e.target.value)} /></Field>
        </div>
      )}
      <p className="text-xs gp-text-muted mb-3">{silencio ? "No se enviarán avisos entre esas horas; si el rango cruza medianoche, se aplica igual." : "El horario de silencio está desactivado — los avisos llegan a cualquier hora."}</p>

      <button className="gp-btn w-full py-2 text-sm" onClick={() => onSave({ tipos: desactivados, silencioActivo: silencio, silencioInicio: inicio, silencioFin: fin })}>Guardar</button>
    </div>
  );
}

function AdminUsuarios({ adminUid, adminEmail }) {
  const [usuarios, setUsuarios] = useState(null); // null = cargando
  const [error, setError] = useState("");
  const [accionEnCurso, setAccionEnCurso] = useState(null); // id del usuario sobre el que se está actuando
  const [confirmar, setConfirmar] = useState(null); // { usuario, tipo: "bloquear" | "reactivar" | "eliminar" }
  const [confirmarPassword, setConfirmarPassword] = useState("");
  const [confirmarError, setConfirmarError] = useState("");

  const llamar = async (action, userId) => {
    const { data: sesion } = await supabase.auth.getSession();
    const resp = await fetch(`${supabase.supabaseUrl}/functions/v1/admin-usuarios`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${sesion.session.access_token}` },
      body: JSON.stringify({ action, userId }),
    });
    return resp.json();
  };

  const cargar = async () => {
    setError("");
    const resultado = await llamar("listar");
    if (resultado.error) { setError(resultado.error); setUsuarios([]); return; }
    setUsuarios(resultado.usuarios.sort((a, b) => new Date(b.creado) - new Date(a.creado)));
  };
  useEffect(() => { cargar(); }, []);

  const ejecutarAccion = async (usuario, tipo) => {
    if (tipo === "eliminar") {
      if (!confirmarPassword) { setConfirmarError("Escribe tu contraseña para confirmar."); return; }
      setAccionEnCurso(usuario.id);
      // Reautenticación obligatoria antes de un borrado irreversible de cuenta y todos sus datos.
      const { error: errAuth } = await supabase.auth.signInWithPassword({ email: adminEmail, password: confirmarPassword });
      if (errAuth) { setAccionEnCurso(null); setConfirmarError("Contraseña incorrecta."); return; }
    } else {
      setAccionEnCurso(usuario.id);
    }
    const resultado = await llamar(tipo, usuario.id);
    setAccionEnCurso(null);
    setConfirmar(null);
    setConfirmarPassword("");
    setConfirmarError("");
    if (resultado.error) { alert(resultado.error); return; }
    cargar();
  };

  return (
    <div>
      <h2 className="gp-serif text-xl mb-1">Administración — Usuarios</h2>
      <p className="text-sm gp-text-muted mb-4">Todas las cuentas registradas en ArkeyOne. Esta pantalla solo tú la puedes ver.</p>

      {usuarios === null && <p className="text-sm gp-text-muted">Cargando…</p>}
      {error && <p className="text-sm gp-text-red mb-3">{error}</p>}

      {usuarios && usuarios.length > 0 && (
        <div className="gp-panel overflow-x-auto">
          <table className="gp-table">
            <thead><tr>
              <th className="text-left">Correo</th>
              <th className="text-left">Registrado</th>
              <th className="text-left">Último acceso</th>
              <th className="text-left">Estado</th>
              <th></th>
            </tr></thead>
            <tbody>
              {usuarios.map((u) => (
                <tr key={u.id}>
                  <td>{u.email}{u.id === adminUid && <Badge tone="gold">tú</Badge>}</td>
                  <td className="text-xs gp-text-muted">{u.creado ? new Date(u.creado).toLocaleDateString("es-MX") : "—"}</td>
                  <td className="text-xs gp-text-muted">{u.ultimoAcceso ? new Date(u.ultimoAcceso).toLocaleDateString("es-MX") : "Nunca"}</td>
                  <td>{u.bloqueado ? <Badge tone="red">Bloqueado</Badge> : <Badge tone="teal">Activo</Badge>}</td>
                  <td className="text-right">
                    {u.id !== adminUid && (
                      <div className="flex gap-1 justify-end">
                        {u.bloqueado ? (
                          <button disabled={accionEnCurso === u.id} onClick={() => setConfirmar({ usuario: u, tipo: "reactivar" })} className="text-xs gp-text-teal">Reactivar</button>
                        ) : (
                          <button disabled={accionEnCurso === u.id} onClick={() => setConfirmar({ usuario: u, tipo: "bloquear" })} className="text-xs gp-text-gold">Bloquear</button>
                        )}
                        <button disabled={accionEnCurso === u.id} onClick={() => { setConfirmar({ usuario: u, tipo: "eliminar" }); setConfirmarPassword(""); setConfirmarError(""); }} className="text-xs gp-text-red">Eliminar</button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {confirmar && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,.6)" }} onClick={() => setConfirmar(null)}>
          <div className="gp-panel w-full max-w-sm p-5" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle size={16} className="gp-text-red" />
              <h3 className="gp-serif text-lg">
                {confirmar.tipo === "bloquear" && "¿Bloquear esta cuenta?"}
                {confirmar.tipo === "reactivar" && "¿Reactivar esta cuenta?"}
                {confirmar.tipo === "eliminar" && "¿Eliminar esta cuenta por completo?"}
              </h3>
            </div>
            <p className="text-sm gp-text-muted mb-5">
              {confirmar.tipo === "bloquear" && `${confirmar.usuario.email} no va a poder iniciar sesión, pero su información se conserva por si la reactivas.`}
              {confirmar.tipo === "reactivar" && `${confirmar.usuario.email} va a poder volver a entrar normalmente.`}
              {confirmar.tipo === "eliminar" && `Se borra la cuenta de ${confirmar.usuario.email} y absolutamente toda su información (proyectos, finanzas, todo). Esto NO se puede deshacer.`}
            </p>
            {confirmar.tipo === "eliminar" && (
              <div className="mb-4">
                <p className="text-xs gp-text-muted mb-1">Por seguridad, escribe tu contraseña para confirmar:</p>
                <CampoPassword
                  autoFocus
                  value={confirmarPassword}
                  onChange={(e) => { setConfirmarPassword(e.target.value); setConfirmarError(""); }}
                  onKeyDown={(e) => { if (e.key === "Enter") ejecutarAccion(confirmar.usuario, confirmar.tipo); }}
                  placeholder="Tu contraseña"
                  className="gp-input w-full"
                />
                {confirmarError && <p className="text-xs text-red-400 mt-1">{confirmarError}</p>}
              </div>
            )}
            <div className="flex gap-2">
              <button onClick={() => { setConfirmar(null); setConfirmarPassword(""); setConfirmarError(""); }} className="gp-btn-ghost flex-1 py-2 text-sm">Cancelar</button>
              <button
                onClick={() => ejecutarAccion(confirmar.usuario, confirmar.tipo)}
                disabled={accionEnCurso === confirmar.usuario.id}
                className="flex-1 py-2 text-sm rounded disabled:opacity-50"
                style={{ background: confirmar.tipo === "eliminar" ? "var(--red)" : "var(--gold)", color: confirmar.tipo === "eliminar" ? "#fff" : "#161822" }}
              >
                {accionEnCurso === confirmar.usuario.id ? "Verificando…" : <>
                  {confirmar.tipo === "bloquear" && "Bloquear"}
                  {confirmar.tipo === "reactivar" && "Reactivar"}
                  {confirmar.tipo === "eliminar" && "Eliminar todo"}
                </>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Colaboradores({ misId, miEmail }) {
  const [lista, setLista] = useState(null);
  const [modal, setModal] = useState(false);
  const [busy, setBusy] = useState(null);
  const [revocarConfirm, setRevocarConfirm] = useState(null);
  const [eliminarConfirm, setEliminarConfirm] = useState(null);
  const [avisoCorreo, setAvisoCorreo] = useState(null); // { id, ok, mensaje }

  const cargar = async () => {
    setLista(null);
    const { data, error } = await supabase.from("colaboradores").select("*").eq("propietario_id", misId).order("created_at", { ascending: false });
    if (error) { console.error("Error al cargar colaboradores:", error); setLista([]); return; }
    setLista(data);
  };
  useEffect(() => { cargar(); }, []);

  // Llama a la Edge Function que manda el correo de invitación por Resend.
  // Blindado con try/catch: si falla la red o el fetch se cae (ej. CORS, sin conexión),
  // nunca debe dejar el botón pegado en "Invitando…" — siempre regresa un resultado.
  const enviarCorreoInvitacion = async (colaboradorId) => {
    try {
      const { data: sesion } = await supabase.auth.getSession();
      const resp = await fetch(`${supabase.supabaseUrl}/functions/v1/invitar-colaborador`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${sesion.session.access_token}` },
        body: JSON.stringify({ colaboradorId }),
      });
      const json = await resp.json().catch(() => ({}));
      return { ok: resp.ok, json };
    } catch (err) {
      console.error("Error al enviar correo de invitación:", err);
      return { ok: false, json: { error: String(err) } };
    }
  };

  const invitar = async ({ nombre, correo, modulos }) => {
    setBusy("nuevo");
    const modulosSnake = modulos.map((k) => tableName(k));
    // "comentarios" siempre viene incluido si se dio acceso a cualquier módulo, para que vean la bitácora.
    if (modulosSnake.length && !modulosSnake.includes("comentarios")) modulosSnake.push("comentarios");
    // las valuaciones de patrimonio van junto con el módulo de patrimonio.
    if (modulos.includes("patrimonio") && !modulosSnake.includes("patrimonio_valuaciones")) modulosSnake.push("patrimonio_valuaciones");
    const { data: fila, error } = await supabase.from("colaboradores").insert({
      propietario_id: misId, propietario_email: miEmail,
      colaborador_email: correo.trim().toLowerCase(), colaborador_nombre: nombre || null, modulos: modulosSnake, estatus: "Pendiente",
    }).select().single();
    if (error) { setBusy(null); alert("No se pudo invitar: " + error.message); return; }
    const { ok } = await enviarCorreoInvitacion(fila.id);
    setBusy(null);
    setModal(false);
    setAvisoCorreo({ id: fila.id, ok, mensaje: ok ? `Se envió el correo de invitación a ${fila.colaborador_email}.` : `Se guardó la invitación, pero no se pudo enviar el correo a ${fila.colaborador_email}. Puedes reenviarlo desde el botón "Reenviar correo".` });
    cargar();
  };

  const reenviarInvitacion = async (c) => {
    setBusy(c.id);
    const { ok } = await enviarCorreoInvitacion(c.id);
    setBusy(null);
    setAvisoCorreo({ id: c.id, ok, mensaje: ok ? `Se reenvió el correo de invitación a ${c.colaborador_email}.` : `No se pudo enviar el correo a ${c.colaborador_email}. Inténtalo de nuevo en un momento.` });
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

  const eliminar = async (id) => {
    setBusy(id);
    const { error } = await supabase.from("colaboradores").delete().eq("id", id);
    setBusy(null);
    if (error) { alert("No se pudo eliminar: " + error.message); return; }
    setEliminarConfirm(null);
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

      {avisoCorreo && (
        <div className="gp-panel-hi p-3 mb-4 text-xs flex items-start justify-between gap-3" style={{ borderLeft: `3px solid ${avisoCorreo.ok ? "var(--teal)" : "var(--red)"}` }}>
          <span>{avisoCorreo.mensaje}</span>
          <button onClick={() => setAvisoCorreo(null)} className="gp-text-muted shrink-0"><X size={14} /></button>
        </div>
      )}

      {lista === null && <p className="text-sm gp-text-muted">Cargando…</p>}
      {lista !== null && lista.length === 0 && <p className="text-sm gp-text-muted">Aún no has invitado a nadie.</p>}

      {lista !== null && lista.length > 0 && (
        <div className="space-y-2">
          {lista.map((c) => (
            <div key={c.id} className="gp-panel p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    {c.colaborador_nombre ? (
                      <>
                        <span className="text-sm font-medium truncate">{c.colaborador_nombre}</span>
                        <span className="text-xs gp-text-muted truncate">{c.colaborador_email}</span>
                      </>
                    ) : (
                      <span className="text-sm font-medium truncate">{c.colaborador_email}</span>
                    )}
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
                  {c.estatus === "Pendiente" && (
                    <button disabled={busy === c.id} onClick={() => reenviarInvitacion(c)} className="gp-btn-ghost px-3 py-1.5 text-xs whitespace-nowrap">
                      {busy === c.id ? "Enviando…" : "Reenviar correo"}
                    </button>
                  )}
                  {c.estatus === "Revocado" ? (
                    <button disabled={busy === c.id} onClick={() => reactivar(c.id)} className="gp-btn-ghost px-3 py-1.5 text-xs">Reactivar</button>
                  ) : (
                    <button disabled={busy === c.id} onClick={() => setRevocarConfirm(c)} className="px-3 py-1.5 text-xs rounded" style={{ background: "var(--red)", color: "#fff" }}>Revocar</button>
                  )}
                  <IconBtn onClick={() => setEliminarConfirm(c)} title="Eliminar colaborador"><Trash2 size={13} /></IconBtn>
                </div>
              </div>
              {c.estatus === "Pendiente" && <p className="text-xs gp-text-muted mt-2">Ya le mandamos un correo de invitación. Se activa solo en cuanto esa persona cree su cuenta o inicie sesión con ese correo.</p>}
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

      {eliminarConfirm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,.6)" }} onClick={() => setEliminarConfirm(null)}>
          <div className="gp-panel w-full max-w-sm p-5" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-2 mb-2"><Trash2 size={16} className="gp-text-red" /><h3 className="gp-serif text-lg">¿Eliminar colaborador?</h3></div>
            <p className="text-sm gp-text-muted mb-5">Se borra por completo el registro de {eliminarConfirm.colaborador_nombre || eliminarConfirm.colaborador_email} de tu lista de colaboradores. Esto no borra ninguna tarea que ya le hayas asignado, pero si quieres volver a darle acceso vas a tener que invitarlo de nuevo.</p>
            <div className="flex gap-2">
              <button onClick={() => setEliminarConfirm(null)} className="gp-btn-ghost flex-1 py-2 text-sm">Cancelar</button>
              <button disabled={busy === eliminarConfirm.id} onClick={() => eliminar(eliminarConfirm.id)} className="flex-1 py-2 text-sm rounded" style={{ background: "var(--red)", color: "#fff" }}>Eliminar</button>
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
  const [nombre, setNombre] = useState("");
  const [correo, setCorreo] = useState("");
  const [modulos, setModulos] = useState([]);
  const [error, setError] = useState("");

  const toggle = (key) => setModulos((prev) => prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]);

  return (
    <div>
      <Field label="Nombre (opcional)"><input className="gp-input" placeholder="ej. Mi contador, Juan asistente" value={nombre} onChange={(e) => setNombre(e.target.value)} /></Field>
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
          onSave({ nombre: nombre.trim(), correo, modulos });
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

function Dashboard({ data, setView, onAddSaldo, onVerProyecto, onEditPendiente }) {
  const [saldoModal, setSaldoModal] = useState(false);
  const saldo = calcularSaldo(data);
  const hoy = todayISO();
  const mesActual = hoy.slice(0, 7);
  const ledgerMesActual = useMemo(() => buildMonthlyLedger(data.finanzas, [mesActual]), [data.finanzas, mesActual]);
  const ingresos = ledgerMesActual.filter((f) => f.tipo === "Ingreso").reduce((s, f) => s + f.monto, 0);
  const egresos = ledgerMesActual.filter((f) => f.tipo === "Egreso").reduce((s, f) => s + f.monto, 0);
  const activos = data.proyectos.filter((p) => p.estatus === "Activo").length;
  const ideas = data.proyectos.filter((p) => p.estatus === "Idea").length;
  const sinGithub = data.proyectos.filter((p) => !p.githubSubido);

  const saludo = (() => {
    const h = new Date().getHours();
    return h < 12 ? "Buenos días" : h < 19 ? "Buenas tardes" : "Buenas noches";
  })();

  const nombreProyecto = (id) => data.proyectos.find((p) => p.id === id)?.nombre || "";

  // --- Unificación de "Acciones": sin importar el módulo de origen, si requiere que el usuario
  // haga algo hoy o en los próximos días, se junta aquí en una sola vista. No es una entidad nueva
  // ni una tabla nueva — solo lee de las entidades reales (Pendientes, Citas, Finanzas).
  const acciones = [];
  data.pendientes.forEach((p) => {
    if (p.estatus === "Completada") return;
    if (p.fechaLimite) {
      const dd = daysUntil(p.fechaLimite);
      if (dd <= 7) acciones.push({ id: `pend-${p.id}`, origen: "Tarea", tipo: "pendiente", texto: p.descripcion, sub: nombreProyecto(p.proyectoId), dd, irA: () => setView("pendientes"), pendienteId: p.id });
    }
    if (p.fechaRevision) {
      const dd = daysUntil(p.fechaRevision);
      if (dd <= 7 && (!p.fechaLimite || p.fechaRevision !== p.fechaLimite)) acciones.push({ id: `segu-${p.id}`, origen: "Seguimiento", tipo: "seguimiento", texto: p.descripcion, sub: nombreProyecto(p.proyectoId), dd, irA: () => setView("pendientes") });
    }
  });
  data.citas.forEach((c) => {
    const dd = Math.round((new Date(c.fechaHora).setHours(0, 0, 0, 0) - new Date(hoy + "T00:00:00").getTime()) / 86400000);
    if (dd === 0) acciones.push({ id: `cita-${c.id}`, origen: "Cita", tipo: "cita", texto: c.titulo, sub: fmtFechaHora(c.fechaHora), dd, irA: () => setView("citas") });
  });
  data.finanzas.forEach((f) => {
    if (f.tipo === "Ingreso" && f.estatus === "Pendiente" && f.fechaVencimiento) {
      const dd = daysUntil(f.fechaVencimiento);
      if (dd <= 7) acciones.push({ id: `cobro-${f.id}`, origen: "Cobro pendiente", tipo: "finanzas", texto: f.concepto || "Cobro", sub: fmtMoney(f.monto), dd, irA: () => setView("finanzas") });
    }
  });
  deudasDeFinanzas(data.finanzas).forEach((d) => {
    if (!d.fechaVencimiento) return;
    const dd = daysUntil(d.fechaVencimiento);
    if (dd <= 7) acciones.push({ id: `deuda-${d.id}`, origen: "Pago por hacer", tipo: "finanzas", texto: d.concepto, sub: fmtMoney(d.monto), dd, irA: () => setView("deudas") });
  });

  const accionesHoy = acciones.filter((a) => a.dd <= 0).sort((a, b) => a.dd - b.dd);
  const accionesProximas = acciones.filter((a) => a.dd > 0 && a.dd <= 7).sort((a, b) => a.dd - b.dd);
  const resumenHoy = (() => {
    const partes = [];
    const nPend = accionesHoy.filter((a) => a.tipo === "pendiente").length;
    const nSegu = accionesHoy.filter((a) => a.tipo === "seguimiento").length;
    const nFin = accionesHoy.filter((a) => a.tipo === "finanzas").length;
    const nCita = accionesHoy.filter((a) => a.tipo === "cita").length;
    if (nPend) partes.push(`${nPend} tarea${nPend === 1 ? "" : "s"}`);
    if (nSegu) partes.push(`${nSegu} seguimiento${nSegu === 1 ? "" : "s"}`);
    if (nCita) partes.push(`${nCita} cita${nCita === 1 ? "" : "s"}`);
    if (nFin) partes.push(`${nFin} pago${nFin === 1 ? "" : "s"} por revisar`);
    return partes.join(" · ");
  })();

  // Próximas citas: agenda de los próximos 7 días (incluye hoy, para tener el vistazo completo aquí).
  const proximasCitas = data.citas
    .filter((c) => { const dd = Math.round((new Date(c.fechaHora).setHours(0, 0, 0, 0) - new Date(hoy + "T00:00:00").getTime()) / 86400000); return dd >= 0 && dd <= 7; })
    .sort((a, b) => new Date(a.fechaHora) - new Date(b.fechaHora));

  // Alertas importantes: vencimientos/renovaciones que no son "tareas" en sí — documentos, activos
  // digitales y facturas. Ventana un poco más amplia (14 días) porque son avisos tempranos, no
  // acciones inmediatas del día.
  const documentosProximos = (data.documentos || []).filter((d) => d.fechaVencimiento && daysUntil(d.fechaVencimiento) <= 14);
  const activosProximos = (data.activos || []).filter((a) => a.fechaVencimiento && daysUntil(a.fechaVencimiento) <= 14);
  const facturasPendientes = (data.facturas || []).filter((f) => f.estatus === "Pendiente");
  const totalAlertas = documentosProximos.length + activosProximos.length + facturasPendientes.length;

  // Proyectos que requieren atención: revisión vencida/próxima, o con pendientes vencidos.
  const proyectosAtencion = data.proyectos
    .filter((p) => p.estatus === "Activo" || p.estatus === "En desarrollo")
    .map((p) => {
      const revisionDd = p.fechaRevision ? daysUntil(p.fechaRevision) : null;
      const pendVencidos = data.pendientes.filter((t) => t.proyectoId === p.id && t.estatus !== "Completada" && t.fechaLimite && daysUntil(t.fechaLimite) < 0).length;
      const motivo = revisionDd !== null && revisionDd <= 7 ? (revisionDd < 0 ? "Revisión vencida" : revisionDd === 0 ? "Revisión hoy" : `Revisión en ${revisionDd}d`) : pendVencidos > 0 ? `${pendVencidos} pendiente${pendVencidos === 1 ? "" : "s"} vencido${pendVencidos === 1 ? "" : "s"}` : null;
      return { ...p, motivo };
    })
    .filter((p) => p.motivo);

  // --- A partir de aquí: los mismos cálculos de "resumen" que ya existían (avance, ganancia por
  // proyecto, etc.), ahora como contexto al final de la pantalla, no como protagonista.
  const monthKeysAmplios = useMemo(() => lastNMonthKeys(120), []);
  const ledgerAmplio = useMemo(() => buildMonthlyLedger(data.finanzas, monthKeysAmplios), [data.finanzas, monthKeysAmplios]);
  const gananciaPorProyecto = data.proyectos.map((p) => {
    const propios = ledgerAmplio.filter((f) => f.proyectoId === p.id);
    const ing = propios.filter((f) => f.tipo === "Ingreso").reduce((s, f) => s + f.monto, 0);
    const eg = propios.filter((f) => f.tipo === "Egreso").reduce((s, f) => s + f.monto, 0);
    return { nombre: p.nombre, neto: ing - eg };
  }).filter((p) => p.neto !== 0).sort((a, b) => b.neto - a.neto);

  const pendientesTotal = data.pendientes.length;
  const pendientesHechos = data.pendientes.filter((p) => p.estatus === "Completada").length;
  const metasTotal = data.metas.length;
  const metasCumplidas = data.metas.filter((m) => m.estatus === "Cumplida").length;
  const pctPendientes = pendientesTotal ? Math.round((pendientesHechos / pendientesTotal) * 100) : 0;
  const pctMetas = metasTotal ? Math.round((metasCumplidas / metasTotal) * 100) : 0;

  const avancePorProyecto = data.proyectos
    .filter((p) => p.estatus === "Activo" || p.estatus === "En desarrollo")
    .map((p) => {
      const pends = data.pendientes.filter((t) => t.proyectoId === p.id);
      const hechos = pends.filter((t) => t.estatus === "Completada").length;
      return { nombre: p.nombre, total: pends.length, hechos, pct: pends.length ? Math.round((hechos / pends.length) * 100) : null };
    })
    .filter((p) => p.total > 0)
    .sort((a, b) => b.pct - a.pct);

  const badgeDia = (dd) => (dd < 0 ? <Badge tone="red">vencido</Badge> : dd === 0 ? <Badge tone="gold">Hoy</Badge> : <Badge tone="muted">{dd === 1 ? "Mañana" : `${dd}d`}</Badge>);

  return (
    <div>
      <h2 className="gp-serif text-2xl mb-1">Centro de mando</h2>
      <p className="text-sm gp-text-muted mb-6">{saludo}. Esto es lo que requiere tu atención.</p>

      {/* 1. ACCIONES PARA HOY — protagonista de la pantalla */}
      <div className="gp-panel p-4 mb-5" style={{ borderColor: accionesHoy.length ? "var(--gold)" : undefined }}>
        <div className="flex items-center gap-2 mb-1"><Zap size={15} className="gp-text-gold" /><h3 className="text-base font-medium">Acciones para hoy</h3></div>
        {accionesHoy.length === 0 ? (
          <p className="text-xs gp-text-muted mt-1">No tienes nada urgente hoy — buen momento para revisar lo que viene.</p>
        ) : (
          <>
            <p className="text-xs gp-text-muted mb-3">{resumenHoy}</p>
            <ul className="space-y-1.5">
              {accionesHoy.map((a) => (
                <li key={a.id} className="flex items-center gap-2">
                  {a.pendienteId ? (
                    <button onClick={() => onEditPendiente(a.pendienteId, { estatus: "Completada" })} title="Marcar como hecho"
                      className="w-5 h-5 rounded flex items-center justify-center shrink-0" style={{ border: "1px solid var(--border)" }}>
                    </button>
                  ) : <span className="w-5 shrink-0" />}
                  <button onClick={a.irA} className="flex-1 text-left flex items-center justify-between gap-2 min-w-0 py-0.5">
                    <span className="text-sm truncate">{a.texto || a.origen}{a.sub ? <span className="gp-text-muted"> — {a.sub}</span> : ""}</span>
                    {badgeDia(a.dd)}
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>

      {/* 2. PRÓXIMAS ACCIONES */}
      {accionesProximas.length > 0 && (
        <div className="gp-panel p-4 mb-5">
          <div className="flex items-center gap-2 mb-2"><CalendarClock size={14} className="gp-text-gold" /><h3 className="text-sm font-medium">Próximas acciones</h3></div>
          <ul className="space-y-1.5">
            {accionesProximas.slice(0, 8).map((a) => (
              <li key={a.id}>
                <button onClick={a.irA} className="w-full text-left flex items-center justify-between gap-2 text-sm">
                  <span className="truncate">{a.texto || a.origen}{a.sub ? <span className="gp-text-muted text-xs"> — {a.sub}</span> : ""}</span>
                  {badgeDia(a.dd)}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* 3. PRÓXIMAS CITAS */}
      {proximasCitas.length > 0 && (
        <div className="gp-panel p-4 mb-5">
          <div className="flex items-center gap-2 mb-2"><CalendarClock size={14} className="gp-text-teal" /><h3 className="text-sm font-medium">Próximas citas</h3></div>
          <ul className="space-y-1.5">
            {proximasCitas.slice(0, 6).map((c) => (
              <li key={c.id} className="flex items-center justify-between gap-2 text-sm">
                <span className="truncate">{c.titulo}{c.lugar ? <span className="gp-text-muted text-xs"> — {c.lugar}</span> : ""}</span>
                <span className="text-xs gp-text-muted shrink-0">{fmtFechaHora(c.fechaHora)}</span>
              </li>
            ))}
          </ul>
          <button onClick={() => setView("citas")} className="text-xs gp-text-gold mt-3">Ver toda tu agenda →</button>
        </div>
      )}

      {/* 4. ALERTAS IMPORTANTES */}
      {totalAlertas > 0 && (
        <div className="gp-panel p-4 mb-5">
          <div className="flex items-center gap-2 mb-2"><AlertTriangle size={14} className="gp-text-red" /><h3 className="text-sm font-medium">Alertas importantes</h3></div>
          <ul className="space-y-1.5 text-sm">
            {documentosProximos.map((d) => (
              <li key={d.id}>
                <button onClick={() => setView("documentos")} className="w-full text-left flex items-center justify-between gap-2">
                  <span className="truncate">Documento — {d.nombre}</span>{badgeDia(daysUntil(d.fechaVencimiento))}
                </button>
              </li>
            ))}
            {activosProximos.map((a) => (
              <li key={a.id}>
                <button onClick={() => setView("activos")} className="w-full text-left flex items-center justify-between gap-2">
                  <span className="truncate">Renovación — {a.nombre}</span>{badgeDia(daysUntil(a.fechaVencimiento))}
                </button>
              </li>
            ))}
            {facturasPendientes.map((f) => (
              <li key={f.id}>
                <button onClick={() => setView("finanzas")} className="w-full text-left flex items-center justify-between gap-2">
                  <span className="truncate">Factura pendiente — {f.concepto || f.folio || "sin folio"}</span><Badge tone="gold">{fmtMoney(f.total)}</Badge>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* 5. PROYECTOS QUE REQUIEREN ATENCIÓN */}
      {proyectosAtencion.length > 0 && (
        <div className="gp-panel p-4 mb-6">
          <div className="flex items-center gap-2 mb-2"><FolderKanban size={14} className="gp-text-gold" /><h3 className="text-sm font-medium">Proyectos que requieren atención</h3></div>
          <ul className="space-y-1.5">
            {proyectosAtencion.map((p) => (
              <li key={p.id}>
                <button onClick={() => onVerProyecto(p.id)} className="w-full text-left flex items-center justify-between gap-2 text-sm">
                  <span className="truncate">{p.nombre}</span>
                  <Badge tone={p.motivo.includes("vencid") ? "red" : "gold"}>{p.motivo}</Badge>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* 6. TU RESUMEN — indicadores y gráficas, como contexto al final, no como protagonista */}
      <p className="text-xs gp-text-muted uppercase tracking-wide mb-2">Tu resumen</p>

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

      {sinGithub.length > 0 && (
        <div className="gp-panel p-4 mb-6">
          <div className="flex items-center gap-2 mb-3"><Github size={14} className="gp-text-gold" /><h3 className="text-sm font-medium">Pendiente: subir proyectos a GitHub</h3></div>
          <ul className="space-y-1.5 text-xs gp-text-muted">
            {sinGithub.map((p) => <li key={p.id}>· {p.nombre}</li>)}
          </ul>
          <button onClick={() => setView("proyectos")} className="text-xs gp-text-gold mt-3">Ir a proyectos →</button>
        </div>
      )}

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
// Ingresos/egresos cobrados y pagos a colaboradores relacionados con un proyecto (se usa en la
// lista de Proyectos y en la pantalla de detalle, por eso vive fuera de ambos componentes).
function rentabilidadProyecto(data, proyectoId) {
  const movs = data.finanzas.filter((f) => f.proyectoId === proyectoId && f.estatus === "Cobrado");
  const ingresos = movs.filter((f) => f.tipo === "Ingreso").reduce((s, f) => s + (Number(f.monto) || 0), 0);
  const egresos = movs.filter((f) => f.tipo === "Egreso").reduce((s, f) => s + (Number(f.monto) || 0), 0);
  const tareasProyecto = data.pendientes.filter((t) => t.proyectoId === proyectoId);
  const pagosColab = tareasProyecto
    .filter((t) => t.responsableId && t.estatus === "Completada")
    .reduce((s, t) => s + (Number(t.precio) || 0), 0);
  // Cuánto costaría en total hacer el proyecto si se pagara TODO lo pactado en el precio de cada
  // tarea (sin importar si ya está hecha o quién la haga) — un estimado, no un movimiento real.
  const costoEstimadoTotal = tareasProyecto.reduce((s, t) => s + (Number(t.precio) || 0), 0);
  return { ingresos, egresos, pagosColab, neto: ingresos - egresos, costoEstimadoTotal };
}

// Cuánto dinero (según el precio pactado de cada tarea) le corresponde a cada quien en el proyecto:
// a un colaborador con Responsable asignado, o a ti mismo cuando la tarea no tiene responsable
// (si la haces tú, ese dinero es ingreso potencial tuyo, no un costo a pagarle a alguien más).
function repartoCostosProyecto(data, proyectoId) {
  const tareas = data.pendientes.filter((t) => t.proyectoId === proyectoId && Number(t.precio) > 0);
  const grupos = {};
  for (const t of tareas) {
    const key = t.responsableId || "_yo";
    if (!grupos[key]) {
      grupos[key] = {
        key,
        nombre: t.responsableId ? (data.equipo.find((e) => e.id === t.responsableId)?.nombre || "—") : "Tú",
        esYo: !t.responsableId,
        tareas: 0, total: 0, generado: 0, pendiente: 0,
      };
    }
    const precio = Number(t.precio) || 0;
    grupos[key].tareas += 1;
    grupos[key].total += precio;
    if (t.estatus === "Completada") grupos[key].generado += precio; else grupos[key].pendiente += precio;
  }
  return Object.values(grupos).sort((a, b) => (a.esYo ? -1 : b.esYo ? 1 : a.nombre.localeCompare(b.nombre)));
}

function Proyectos({ data, onAdd, onEdit, onRemove, onAddComentario, onRemoveComentario, onVerDetalle }) {
  const [modal, setModal] = useState(null);
  const [expanded, setExpanded] = useState(null);
  const [notaTexto, setNotaTexto] = useState("");
  const [orden, setOrden] = useState("default");
  const [busqueda, setBusqueda] = useState("");

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

  const proyectosFiltrados = filtrarPorBusqueda(data.proyectos, busqueda, [(p) => p.nombre, (p) => p.categoria, (p) => p.descripcion]);
  const grouped = ESTATUS_PROYECTO.map((e) => ({ estatus: e, items: ordenarLista(proyectosFiltrados.filter((p) => p.estatus === e), orden, camposOrden) }));
  const columnasExport = [
    { label: "Nombre", get: (p) => p.nombre }, { label: "Categoría", get: (p) => p.categoria },
    { label: "Estatus", get: (p) => p.estatus }, { label: "Prioridad", get: (p) => p.prioridad },
    { label: "Fecha de revisión", get: (p) => p.fechaRevision }, { label: "Descripción", get: (p) => p.descripcion },
  ];
  const todosVisibles = grouped.flatMap((g) => g.items);

  const addNota = (proyecto) => {
    if (!notaTexto.trim()) return;
    onEdit(proyecto.id, { notas: [...(proyecto.notas || []), { id: uid(), fecha: todayISO(), texto: notaTexto }] });
    setNotaTexto("");
  };

  const rentabilidad = (proyectoId) => rentabilidadProyecto(data, proyectoId);

  return (
    <div>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-1">
        <h2 className="gp-serif text-2xl">Proyectos e ideas</h2>
        <button onClick={() => setModal({ item: empty })} className="gp-btn flex items-center justify-center gap-1 px-3 py-1.5 text-sm w-full sm:w-auto"><Plus size={14} /> Nuevo</button>
      </div>
      <p className="text-sm gp-text-muted mb-3">De idea a proyecto activo — edita el estatus cuando avance.</p>
      <div className="mb-2"><OrdenSelector opciones={opcionesOrden} value={orden} onChange={setOrden} /></div>
      <BarraListaEstandar busqueda={busqueda} onBusqueda={setBusqueda} placeholder="Buscar por nombre, categoría o descripción…"
        onExportExcel={() => exportarFilasExcel(todosVisibles, columnasExport, "proyectos")}
        onExportPDF={() => exportarFilasPDF(todosVisibles, columnasExport, "proyectos", "Proyectos e ideas", busqueda ? `búsqueda: "${busqueda}"` : "")} />

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
                          <div className="gp-panel-hi p-3 mb-3 grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
                            <div><p className="gp-text-muted">Ingresos</p><p className="gp-mono gp-text-teal">{fmtMoney(r.ingresos)}</p></div>
                            <div><p className="gp-text-muted">Egresos</p><p className="gp-mono gp-text-red">{fmtMoney(r.egresos)}</p></div>
                            <div><p className="gp-text-muted">Neto</p><p className={`gp-mono ${r.neto >= 0 ? "gp-text-teal" : "gp-text-red"}`}>{fmtMoney(r.neto)}</p></div>
                            <div><p className="gp-text-muted">Pagado a colaboradores</p><p className="gp-mono gp-text-gold">{fmtMoney(r.pagosColab)}</p></div>
                            <div><p className="gp-text-muted">Costo estimado total</p><p className="gp-mono">{fmtMoney(r.costoEstimadoTotal)}</p></div>
                          </div>
                        );
                      })()}
                      {(() => {
                        const reparto = repartoCostosProyecto(data, p.id);
                        if (reparto.length === 0) return null;
                        return (
                          <div className="mb-4">
                            <p className="text-xs font-medium gp-text-muted mb-2">Reparto de costos por participante</p>
                            <div className="gp-panel-hi overflow-x-auto">
                              <table className="gp-table" style={{ fontSize: 12 }}>
                                <thead><tr><th>Participante</th><th>Tareas</th><th>Ya generado</th><th>Por hacer</th><th>Total pactado</th></tr></thead>
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
                            <p className="text-xs gp-text-muted mt-1">Es un estimado según el precio pactado en cada tarea. Lo tuyo ("Tú") es ingreso potencial y no se suma solo a Ingresos y egresos; para eso registra el movimiento ahí cuando lo cobres.</p>
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

                      {(() => {
                        const tareasProyecto = data.pendientes.filter((t) => t.proyectoId === p.id);
                        const arbolP = buildTareaTree(tareasProyecto);
                        const filasP = flattenTareas(arbolP);
                        return (
                          <div className="mb-4">
                            <div className="flex items-center justify-between mb-2">
                              <p className="text-xs font-medium gp-text-muted">Pendientes de este proyecto · {tareasProyecto.length}</p>
                              <button onClick={(e) => { e.stopPropagation(); onVerDetalle(p.id); }} className="text-xs gp-text-gold flex items-center gap-1">
                                Ver detalle completo <ChevronRight size={12} />
                              </button>
                            </div>
                            {filasP.length === 0 && <p className="text-xs gp-text-muted">Sin tareas registradas todavía.</p>}
                            {filasP.length > 0 && (
                              <div className="gp-panel-hi overflow-x-auto">
                                <table className="gp-table" style={{ fontSize: 12 }}>
                                  <thead><tr><th>Pendiente</th><th>Precio</th><th>Estatus</th></tr></thead>
                                  <tbody>
                                    {filasP.slice(0, 8).map(({ item: t, nivel }) => (
                                      <tr key={t.id}>
                                        <td>
                                          <span style={{ paddingLeft: nivel * 16 }} className="flex items-center gap-1">
                                            {nivel > 0 && <span className="gp-text-muted">└</span>}
                                            <span className={t.estatus === "Completada" ? "gp-text-muted" : ""} style={t.estatus === "Completada" ? { textDecoration: "line-through" } : undefined}>{t.descripcion}</span>
                                          </span>
                                        </td>
                                        <td className="gp-mono">{t.precio ? fmtMoney(t.precio) : "—"}</td>
                                        <td><Badge tone={toneEstatusTarea(t.estatus)}>{t.estatus}</Badge></td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            )}
                            {filasP.length > 8 && <p className="text-xs gp-text-muted mt-1">y {filasP.length - 8} más — ve al detalle completo para verlas todas.</p>}
                          </div>
                        );
                      })()}

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
        <Field label="Fecha de revisión"><input type="date" className="gp-input" value={v.fechaRevision || ""} onChange={(e) => setV({ ...v, fechaRevision: e.target.value })} /></Field>
      </div>
      <Field label="Descripción"><textarea className="gp-input" rows={3} value={v.descripcion} onChange={(e) => setV({ ...v, descripcion: e.target.value })} /></Field>
      {error && <p className="text-xs gp-text-red mb-2">{error}</p>}

      <button className="gp-btn w-full py-2 text-sm mt-2" onClick={() => { if (!v.nombre?.toString().trim()) { setError("El nombre del proyecto es obligatorio."); return; } setError(""); onSave(v); }}>Guardar</button>
    </div>
  );
}

/* ---------- Detalle de proyecto (Fase: navegación con breadcrumb) ---------- */
// Pantalla completa de un solo proyecto: todos sus pendientes con subtareas anidadas,
// porcentaje de avance (manual en tareas finales, calculado en tareas con hijos), y comentarios.
function ProyectoDetalle({ data, proyectoId, onVolver, onAddTarea, onEditTarea, onRemoveTarea, onAddComentario, onRemoveComentario, onAddMeta, onEditMeta, onRemoveMeta }) {
  const proyecto = data.proyectos.find((p) => p.id === proyectoId);
  const [modal, setModal] = useState(null);
  const [modalMeta, setModalMeta] = useState(null);
  const [comentariosDe, setComentariosDe] = useState(null);

  if (!proyecto) {
    return (
      <div>
        <button onClick={onVolver} className="text-xs gp-text-muted flex items-center gap-1 mb-4"><ChevronRight size={12} style={{ transform: "rotate(180deg)" }} /> Proyectos e ideas</button>
        <p className="text-sm gp-text-muted">Este proyecto ya no existe o no tienes acceso a él.</p>
      </div>
    );
  }

  const empty = { proyectoId, parentId: "", descripcion: "", fechaLimite: todayISO(), fechaRevision: "", prioridad: "Media", estatus: "Pendiente", responsableId: "", contactoId: "", precio: "", tiempoEstimado: "", tiempoReal: "", asignadoA: "", avance: "" };
  const tareasProyecto = data.pendientes.filter((t) => t.proyectoId === proyectoId);
  const arbol = buildTareaTree(tareasProyecto);
  const filas = flattenTareas(arbol);
  const avanceGeneral = arbol.length ? Math.round(arbol.reduce((s, n) => s + calcAvanceTarea(n), 0) / arbol.length) : 0;
  const r = rentabilidadProyecto(data, proyectoId);
  const metasProyecto = (data.metas || []).filter((m) => m.proyectoId === proyectoId);
  const nComentarios = (id) => (data.comentarios || []).filter((c) => c.entidadTipo === "pendientes" && c.entidadId === id).length;
  const nombreResp = (id) => data.equipo.find((e) => e.id === id)?.nombre || "Tú";
  const nombreCliente = (id) => data.contactos.find((c) => c.id === id)?.nombre || "—";
  const paraEditar = (t) => { const { hijos, ...limpio } = t; return limpio; };
  const confirmarBorrado = (item) => {
    const hijosIds = descendientesDe(item.id, data.pendientes);
    if (hijosIds.length > 0) {
      onRemoveTarea(item.id, hijosIds, `Esta tarea tiene ${hijosIds.length} subtarea${hijosIds.length > 1 ? "s" : ""} debajo. Si la eliminas, también se eliminan todas sus subtareas.`);
    } else {
      onRemoveTarea(item.id);
    }
  };

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
          </div>
        </div>
        <button onClick={() => setModal({ item: empty })} className="gp-btn flex items-center justify-center gap-1 px-3 py-1.5 text-sm w-full sm:w-auto"><Plus size={14} /> Nueva tarea</button>
      </div>
      {proyecto.descripcion && <p className="text-sm gp-text-muted mb-4">{proyecto.descripcion}</p>}

      <div className="gp-panel-hi p-3 mb-4 grid grid-cols-2 sm:grid-cols-6 gap-2 text-xs">
        <div><p className="gp-text-muted">Avance general</p><p className="gp-mono gp-text-gold">{avanceGeneral}%</p></div>
        <div><p className="gp-text-muted">Ingresos</p><p className="gp-mono gp-text-teal">{fmtMoney(r.ingresos)}</p></div>
        <div><p className="gp-text-muted">Egresos</p><p className="gp-mono gp-text-red">{fmtMoney(r.egresos)}</p></div>
        <div><p className="gp-text-muted">Neto</p><p className={`gp-mono ${r.neto >= 0 ? "gp-text-teal" : "gp-text-red"}`}>{fmtMoney(r.neto)}</p></div>
        <div><p className="gp-text-muted">Pagado a colaboradores</p><p className="gp-mono gp-text-gold">{fmtMoney(r.pagosColab)}</p></div>
        <div><p className="gp-text-muted">Costo estimado total</p><p className="gp-mono">{fmtMoney(r.costoEstimadoTotal)}</p></div>
      </div>

      {(() => {
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
                  <IconBtn onClick={() => setModalMeta({ item: m })}><Pencil size={12} /></IconBtn>
                  <IconBtn onClick={() => onRemoveMeta(m.id)}><Trash2 size={12} /></IconBtn>
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

      <div className="gp-panel overflow-x-auto">
        <table className="gp-table">
          <thead><tr><th>Pendiente</th><th>Cliente</th><th>Responsable</th><th>Fecha</th><th>Prioridad</th><th>Avance</th><th>Precio</th><th></th></tr></thead>
          <tbody>
            {filas.map(({ item: p, nivel }) => {
              const vencido = p.estatus !== "Completada" && p.fechaLimite && daysUntil(p.fechaLimite) < 0;
              const nc = nComentarios(p.id);
              const tieneHijos = p.hijos && p.hijos.length > 0;
              const avance = Math.round(calcAvanceTarea(p));
              return (
                <tr key={p.id}>
                  <td>
                    <span style={{ paddingLeft: nivel * 18 }} className="flex items-center gap-1">
                      {nivel > 0 && <span className="gp-text-muted">└</span>}
                      {p.descripcion}
                    </span>
                  </td>
                  <td className="gp-text-muted">{p.contactoId ? nombreCliente(p.contactoId) : "—"}</td>
                  <td className="gp-text-muted">{nombreResp(p.responsableId)}</td>
                  <td className="gp-mono" style={{ color: vencido ? "var(--red)" : undefined }}>{p.fechaLimite}</td>
                  <td><Badge tone={p.prioridad === "Alta" ? "red" : p.prioridad === "Media" ? "gold" : "muted"}>{p.prioridad}</Badge></td>
                  <td>
                    <div className="flex items-center gap-1.5" style={{ minWidth: 130 }}>
                      <div className="h-1.5 rounded flex-1" style={{ background: "var(--border)" }}>
                        <div className="h-1.5 rounded" style={{ width: `${avance}%`, background: avance === 100 ? "var(--teal)" : "var(--gold)" }} />
                      </div>
                      {tieneHijos ? (
                        <span className="gp-mono" style={{ fontSize: 10 }}>{avance}%</span>
                      ) : (
                        <input
                          type="number" min={0} max={100} value={p.avance ?? ""} placeholder={String(avance)}
                          onChange={(e) => {
                            const val = e.target.value === "" ? null : Math.max(0, Math.min(100, Number(e.target.value)));
                            onEditTarea(p.id, { avance: val });
                          }}
                          className="gp-input gp-mono" style={{ width: 48, padding: "1px 4px", fontSize: 10 }}
                        />
                      )}
                      {!tieneHijos && (
                        <select className="gp-input" style={{ padding: "1px 4px", fontSize: 10, width: 88 }} value={p.estatus} onChange={(e) => onEditTarea(p.id, { estatus: e.target.value })}>
                          {ESTATUS_TAREA.map((s) => <option key={s}>{s}</option>)}
                        </select>
                      )}
                    </div>
                  </td>
                  <td className="gp-mono">{p.precio ? fmtMoney(p.precio) : "—"}</td>
                  <td><div className="flex gap-1">
                    <IconBtn onClick={() => setModal({ item: { ...empty, parentId: p.id } })}><Plus size={13} /></IconBtn>
                    <IconBtn onClick={() => setComentariosDe(p)}><MessageCircle size={13} />{nc > 0 && <span className="gp-mono" style={{ fontSize: 9, marginLeft: 2 }}>{nc}</span>}</IconBtn>
                    <IconBtn onClick={() => setModal({ item: paraEditar(p) })}><Pencil size={13} /></IconBtn>
                    <IconBtn onClick={() => confirmarBorrado(p)}><Trash2 size={13} /></IconBtn>
                  </div></td>
                </tr>
              );
            })}
            {filas.length === 0 && <tr><td colSpan={8} className="text-center gp-text-muted py-6">Sin tareas registradas en este proyecto todavía.</td></tr>}
          </tbody>
        </table>
      </div>

      <div className="border-t gp-border pt-4 mt-6">
        <p className="text-sm font-medium mb-2">Comentarios del proyecto</p>
        <Bitacora data={data} entidadTipo="proyectos" entidadId={proyecto.id} onAdd={onAddComentario} onRemove={onRemoveComentario} />
      </div>

      {comentariosDe && (
        <Modal title={`Comentarios — ${comentariosDe.descripcion}`} onClose={() => setComentariosDe(null)}>
          <Bitacora data={data} entidadTipo="pendientes" entidadId={comentariosDe.id} onAdd={onAddComentario} onRemove={onRemoveComentario} />
        </Modal>
      )}

      {modal && (
        <Modal title={modal.item.id ? "Editar tarea" : modal.item.parentId ? "Nueva subtarea" : "Nueva tarea"} onClose={() => setModal(null)}>
          <PendienteForm item={modal.item} proyectos={data.proyectos} equipo={data.equipo} contactos={data.contactos} pendientes={data.pendientes} colaboradores={[]} proyectoFijoId={proyectoId}
            onSave={(v) => {
              if (modal.item.id) {
                onEditTarea(modal.item.id, v);
                if (v.proyectoId !== modal.item.proyectoId) {
                  const hijosIds = descendientesDe(modal.item.id, data.pendientes);
                  hijosIds.forEach((hid) => onEditTarea(hid, { proyectoId: v.proyectoId }));
                }
              } else {
                onAddTarea({ ...v, id: uid() });
              }
              setModal(null);
            }}
          />
        </Modal>
      )}
    </div>
  );
}

/* ---------- Mi trabajo (workspace de colaborador — Fase 5) ---------- */
// A diferencia del resto de la app (que muestra los datos de UNA cuenta a la vez, la propia
// o una a la que cambiaste con el selector de cuentas), esta vista cruza TODAS las cuentas
// donde te hayan asignado algo — por eso consulta Supabase directo en vez de usar `data`.
function MiTrabajo({ misId }) {
  const [tareas, setTareas] = useState(null); // null = cargando
  const [proyectosPorId, setProyectosPorId] = useState({});

  const cargar = async () => {
    const { data: rows } = await supabase.from("pendientes").select("*").eq("asignado_a", misId).is("deleted_at", null).order("fecha_limite", { ascending: true });
    setTareas(rows || []);
    const idsProyectos = [...new Set((rows || []).map((r) => r.proyecto_id).filter(Boolean))];
    if (idsProyectos.length) {
      const { data: proys } = await supabase.from("proyectos").select("id, nombre").in("id", idsProyectos);
      setProyectosPorId(Object.fromEntries((proys || []).map((p) => [p.id, p.nombre])));
    }
  };
  useEffect(() => { cargar(); }, [misId]);

  const marcarEstatus = async (id, estatus) => {
    await supabase.from("pendientes").update({ estatus }).eq("id", id);
    setTareas((prev) => prev.map((t) => (t.id === id ? { ...t, estatus } : t)));
  };

  return (
    <div>
      <h2 className="gp-serif text-2xl mb-1">Mi trabajo</h2>
      <p className="text-sm gp-text-muted mb-6">Lo que te han asignado, sin importar de qué cuenta venga — aquí solo ves tus tareas, no el resto de la información de quien te las asignó.</p>

      {tareas === null && <p className="text-sm gp-text-muted">Cargando…</p>}
      {tareas && tareas.length === 0 && <p className="text-sm gp-text-muted">Nadie te ha asignado tareas todavía.</p>}

      <div className="space-y-2">
        {(tareas || []).map((t) => {
          const vencido = t.estatus !== "Completada" && t.fecha_limite && daysUntil(t.fecha_limite) < 0;
          return (
            <div key={t.id} className="gp-panel p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium">{t.descripcion}</p>
                  <div className="flex flex-wrap gap-2 mt-1.5">
                    {proyectosPorId[t.proyecto_id] && <Badge tone="gold">{proyectosPorId[t.proyecto_id]}</Badge>}
                    {t.prioridad && <Badge tone={t.prioridad === "Alta" ? "red" : "muted"}>{t.prioridad}</Badge>}
                    {t.fecha_limite && <span className="gp-mono text-xs" style={{ color: vencido ? "var(--red)" : "var(--muted)" }}>{t.fecha_limite}</span>}
                  </div>
                </div>
                <select className="gp-input shrink-0" style={{ width: 120, padding: "4px 8px" }} value={t.estatus} onChange={(e) => marcarEstatus(t.id, e.target.value)}>
                  {ESTATUS_TAREA.map((s) => <option key={s}>{s}</option>)}
                </select>
              </div>
            </div>
          );
        })}
      </div>
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
    if (nodo.avance !== null && nodo.avance !== undefined && nodo.avance !== "") return Number(nodo.avance);
    return nodo.estatus === "Completada" ? 100 : nodo.estatus === "En proceso" ? 50 : 0;
  }
  const suma = nodo.hijos.reduce((s, h) => s + calcAvanceTarea(h), 0);
  return suma / nodo.hijos.length;
}
// ids de todos los descendientes de una tarea (para no permitir que se vuelva subtarea de sí misma).
function descendientesDe(id, items) {
  const hijos = items.filter((t) => t.parentId === id);
  return hijos.reduce((acc, h) => [...acc, h.id, ...descendientesDe(h.id, items)], []);
}

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

function Pendientes({ data, activeOwnerId, onAdd, onEdit, onRemove, onAddComentario, onRemoveComentario, onAsignar }) {
  const [modal, setModal] = useState(null);
  const [comentariosDe, setComentariosDe] = useState(null);
  const [orden, setOrden] = useState("default");
  const [vista, setVista] = useState("lista"); // "lista" | "mindmap"
  const [proyectoMindMap, setProyectoMindMap] = useState("");
  const [filtroProyecto, setFiltroProyecto] = useState(""); // "" = todos los proyectos, en la vista de lista
  const [colaboradores, setColaboradores] = useState([]);
  const empty = { proyectoId: "", parentId: "", descripcion: "", fechaLimite: todayISO(), fechaRevision: "", prioridad: "Media", estatus: "Pendiente", responsableId: "", contactoId: "", precio: "", tiempoEstimado: "", tiempoReal: "", asignadoA: "" };

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
  const pendientesFiltrados = filtroProyecto ? data.pendientes.filter((t) => t.proyectoId === filtroProyecto) : data.pendientes;
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
  const filas = flattenTareas(arbol);
  const nComentarios = (id) => (data.comentarios || []).filter((c) => c.entidadTipo === "pendientes" && c.entidadId === id).length;

  const nombreProyecto = (id) => data.proyectos.find((p) => p.id === id)?.nombre || "—";
  const nombreResp = (id) => data.equipo.find((e) => e.id === id)?.nombre || "Tú";
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

  return (
    <div>
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
              <option value="">Todos los proyectos</option>
              {[...data.proyectos].sort((a, b) => a.nombre.localeCompare(b.nombre, "es")).map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
            </select>
            <OrdenSelector opciones={opcionesOrden} value={orden} onChange={setOrden} />
          </div>
        )}
        {vista === "mindmap" && (
          <select className="gp-input" style={{ maxWidth: 260 }} value={proyectoMindMap} onChange={(e) => setProyectoMindMap(e.target.value)}>
            <option value="">— elige un proyecto —</option>
            {data.proyectos.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
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
        <table className="gp-table">
          <thead>
            <tr>
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
              const avance = tieneHijos ? Math.round(calcAvanceTarea(p)) : null;
              return (
                <tr
                  key={p.id}
                  onClick={() => setModal({ item: paraEditar(p) })}
                  className="cursor-pointer"
                  style={p.estatus === "Completada" ? { background: "var(--teal-tint)", color: "var(--teal-text)", "--muted": "#3F8562" } : undefined}
                >
                  <td style={{ maxWidth: 220 }}>
                    <span style={{ paddingLeft: nivel * 18 }} className="flex items-start gap-1">
                      {nivel > 0 && <span className="gp-text-muted shrink-0">└</span>}
                      <span className="line-clamp-2 md:line-clamp-none">{p.descripcion}</span>
                    </span>
                  </td>
                  <td className="gp-text-muted hidden md:table-cell">{nombreProyecto(p.proyectoId)}</td>
                  <td className="gp-text-muted hidden md:table-cell">{p.contactoId ? nombreCliente(p.contactoId) : "—"}</td>
                  <td className="gp-text-muted hidden md:table-cell">{nombreResp(p.responsableId)}</td>
                  <td className="gp-mono hidden md:table-cell" style={{ color: vencido ? "var(--red)" : undefined }}>{p.fechaLimite}</td>
                  <td className="hidden md:table-cell"><Badge tone={p.prioridad === "Alta" ? "red" : p.prioridad === "Media" ? "gold" : "muted"}>{p.prioridad}</Badge></td>
                  <td onClick={(e) => e.stopPropagation()}>
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
                  <td className="gp-mono hidden md:table-cell">{p.precio ? fmtMoney(p.precio) : "—"}</td>
                  <td className="gp-mono gp-text-muted hidden md:table-cell">{p.tiempoEstimado ? `${p.tiempoEstimado}h` : "—"}{p.tiempoReal ? ` / ${p.tiempoReal}h` : ""}</td>
                  <td onClick={(e) => e.stopPropagation()}><div className="flex gap-1">
                    <IconBtn onClick={() => setModal({ item: { ...empty, proyectoId: p.proyectoId, parentId: p.id } })}><Plus size={13} /></IconBtn>
                    <IconBtn onClick={() => setComentariosDe(p)}><MessageCircle size={13} />{nc > 0 && <span className="gp-mono" style={{ fontSize: 9, marginLeft: 2 }}>{nc}</span>}</IconBtn>
                    <IconBtn onClick={() => setModal({ item: paraEditar(p) })}><Pencil size={13} /></IconBtn><IconBtn onClick={() => confirmarBorrado(p)}><Trash2 size={13} /></IconBtn>
                  </div></td>
                </tr>
              );
            })}
            {filas.length === 0 && <tr><td colSpan={10} className="text-center gp-text-muted py-6">Sin tareas registradas.</td></tr>}
          </tbody>
        </table>
      </div>
      )}

      {comentariosDe && (
        <Modal title={`Comentarios — ${comentariosDe.descripcion}`} onClose={() => setComentariosDe(null)}>
          <Bitacora data={data} entidadTipo="pendientes" entidadId={comentariosDe.id} onAdd={onAddComentario} onRemove={onRemoveComentario} />
        </Modal>
      )}

      {modal && (
        <Modal title={modal.item.id ? "Editar tarea" : modal.item.parentId ? "Nueva subtarea" : "Nueva tarea"} onClose={() => setModal(null)}>
          <PendienteForm item={modal.item} proyectos={data.proyectos} equipo={data.equipo} contactos={data.contactos} pendientes={data.pendientes} colaboradores={colaboradores}
            onSave={(v) => {
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
              }
              setModal(null);
            }}
          />
        </Modal>
      )}
    </div>
  );
}

function PendienteForm({ item, proyectos, equipo, contactos, pendientes, colaboradores, onSave, proyectoFijoId }) {
  const [v, setV] = useState(item);
  const [error, setError] = useState("");
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
          <select className="gp-input" value={v.proyectoId} onChange={(e) => setV({ ...v, proyectoId: e.target.value })}>
            <option value="">— sin proyecto —</option>
            {proyectos.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
          </select>
        )}
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
      <Field label="Fecha de revisión (opcional)"><input type="date" className="gp-input" value={v.fechaRevision || ""} onChange={(e) => setV({ ...v, fechaRevision: e.target.value })} /></Field>
      <Field label="Responsable">
        <select className="gp-input" value={v.responsableId} onChange={(e) => setV({ ...v, responsableId: e.target.value })}>
          <option value="">Tú</option>
          {equipo.map((m) => <option key={m.id} value={m.id}>{m.nombre}</option>)}
        </select>
      </Field>
      {colaboradores && colaboradores.length > 0 && (
        <Field label="Asignar a colaborador ARKEYONE (opcional — le llega notificación push)">
          <select className="gp-input" value={v.asignadoA || ""} onChange={(e) => setV({ ...v, asignadoA: e.target.value })}>
            <option value="">— sin asignar —</option>
            {colaboradores.map((c) => <option key={c.colaborador_user_id} value={c.colaborador_user_id}>{c.colaborador_email}</option>)}
          </select>
        </Field>
      )}
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

// Agrupa movimientos NO recurrentes por mes (YYYY-MM) para la vista tipo "estado de cuenta".
// Los recurrentes no se agrupan aquí — viven en su propia pestaña porque no tienen "un mes", se repiten.
function agruparFinanzasPorMes(movs) {
  const grupos = {};
  for (const f of movs) {
    const mes = (f.fecha || "").slice(0, 7) || "sin-fecha";
    if (!grupos[mes]) grupos[mes] = [];
    grupos[mes].push(f);
  }
  return Object.entries(grupos).sort((a, b) => b[0].localeCompare(a[0]));
}
function fmtMesLabel(mes) {
  if (mes === "sin-fecha") return "Sin fecha";
  const [y, m] = mes.split("-").map(Number);
  const txt = new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString("es-MX", { month: "long", year: "numeric", timeZone: "UTC" });
  return txt.charAt(0).toUpperCase() + txt.slice(1);
}

// Envoltura de pestañas: Movimientos (Finanzas) y Facturas e IVA viven en la misma pantalla
// ahora, porque son la misma cosa vista desde dos ángulos (dinero que entra/sale, y el papeleo
// fiscal de ese dinero). No se tocó nada de la lógica interna de cada una, solo se agruparon.
function FinanzasYFacturas({ data, tabInicial, finanzasProps, facturasProps }) {
  const [tab, setTab] = useState(tabInicial || "movimientos");
  return (
    <div>
      <div className="flex gap-1 mb-4">
        <button onClick={() => setTab("movimientos")} className={`text-sm px-3 py-1.5 rounded-full border ${tab === "movimientos" ? "gp-btn" : "gp-btn-ghost"}`}>Movimientos</button>
        <button onClick={() => setTab("facturas")} className={`text-sm px-3 py-1.5 rounded-full border ${tab === "facturas" ? "gp-btn" : "gp-btn-ghost"}`}>Facturas e IVA</button>
      </div>
      {tab === "movimientos" ? <Finanzas data={data} {...finanzasProps} /> : <Facturas data={data} {...facturasProps} />}
    </div>
  );
}
function Finanzas({ data, onAdd, onEdit, onRemove }) {
  const [modal, setModal] = useState(null);
  const [vista, setVista] = useState("todos");
  const [filtroTipoRecurrente, setFiltroTipoRecurrente] = useState("Todos");
  const [filtroVigencia, setFiltroVigencia] = useState("Vigentes");
  const [orden, setOrden] = useState("default");
  const [ordenDir, setOrdenDir] = useState("asc");
  const [busqueda, setBusqueda] = useState("");
  const toggleOrden = (key) => { if (orden === key) setOrdenDir((d) => (d === "asc" ? "desc" : "asc")); else { setOrden(key); setOrdenDir("asc"); } };
  const empty = { concepto: "", tipo: "Ingreso", proyectoId: "", contactoId: "", fecha: todayISO(), fechaVencimiento: "", monto: "", categoria: "", forma: "Transferencia", estatus: "Cobrado", pautando: false, esRecurrente: false, frecuencia: "Mensual", fechaFin: "" };
  const nombreProyecto = (id) => data.proyectos.find((p) => p.id === id)?.nombre || "—";
  const nombreCliente = (id) => data.contactos.find((c) => c.id === id)?.nombre || "—";
  const hoy = todayISO();
  const mesActual = hoy.slice(0, 7);
  const esVigente = (f) => !f.fechaFin || f.fechaFin >= hoy;

  // La búsqueda por contenido filtra las listas de abajo; los KPIs de arriba (ingresos/egresos/
  // neto del mes) se quedan globales para no confundir con un resumen "recortado".
  const finanzasFiltradas = filtrarPorBusqueda(data.finanzas, busqueda,
    [(f) => f.concepto, (f) => f.categoria, (f) => f.forma, (f) => nombreProyecto(f.proyectoId), (f) => nombreCliente(f.contactoId)]);

  const cobrosPendientes = finanzasFiltradas
    .filter((f) => f.tipo === "Ingreso" && f.estatus === "Pendiente")
    .sort((a, b) => (a.fechaVencimiento || "9999").localeCompare(b.fechaVencimiento || "9999"));
  const totalCobrosPendientes = cobrosPendientes.reduce((s, f) => s + (Number(f.monto) || 0), 0);

  let recurrentes = finanzasFiltradas.filter((f) => f.esRecurrente);
  if (filtroTipoRecurrente !== "Todos") recurrentes = recurrentes.filter((f) => f.tipo === filtroTipoRecurrente);
  if (filtroVigencia !== "Todos") recurrentes = recurrentes.filter((f) => (filtroVigencia === "Vigentes" ? esVigente(f) : !esVigente(f)));
  const totalRecurrentes = recurrentes.reduce((s, f) => s + (Number(f.monto) || 0) * (f.tipo === "Ingreso" ? 1 : -1), 0);

  // Resumen del mes: movimientos puntuales de este mes ya cobrados, más los recurrentes vigentes
  // (esos ocurren cada mes, incluido este, sin importar en qué mes se hayan dado de alta).
  const movsDelMes = data.finanzas.filter((f) => {
    if (f.estatus !== "Cobrado") return false;
    if (f.esRecurrente) return esVigente(f);
    return (f.fecha || "").startsWith(mesActual);
  });
  const ingresosMes = movsDelMes.filter((f) => f.tipo === "Ingreso").reduce((s, f) => s + (Number(f.monto) || 0), 0);
  const egresosMes = movsDelMes.filter((f) => f.tipo === "Egreso").reduce((s, f) => s + (Number(f.monto) || 0), 0);
  const netoMes = ingresosMes - egresosMes;

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
  const movsPuntuales = finanzasFiltradas.filter((f) => !f.esRecurrente);
  const gruposMes = agruparFinanzasPorMes(movsPuntuales);
  const [mesesAbiertos, setMesesAbiertos] = useState(() => new Set([mesActual]));
  const toggleMes = (mes) => setMesesAbiertos((prev) => { const next = new Set(prev); next.has(mes) ? next.delete(mes) : next.add(mes); return next; });
  const [expandido, setExpandido] = useState(null);

  const recurrentesOrdenados = ordenarLista(recurrentes, orden, camposOrden, ordenDir);

  const columnasExport = [
    { label: "Concepto", get: (f) => f.concepto }, { label: "Tipo", get: (f) => f.tipo },
    { label: "Fecha", get: (f) => f.fecha }, { label: "Monto", get: (f) => f.monto },
    { label: "Categoría", get: (f) => f.categoria }, { label: "Forma", get: (f) => f.forma },
    { label: "Estatus", get: (f) => f.estatus }, { label: "Proyecto", get: (f) => nombreProyecto(f.proyectoId) },
    { label: "Contacto", get: (f) => nombreCliente(f.contactoId) },
  ];
  const filasVisiblesExport = vista === "cobros" ? cobrosPendientes : vista === "recurrentes" ? recurrentesOrdenados : gruposMes.flatMap(([, movs]) => movs);
  const nombreVista = vista === "cobros" ? "cobros_pendientes" : vista === "recurrentes" ? "pagos_recurrentes" : "movimientos";
  const tituloVista = vista === "cobros" ? "Cobros pendientes" : vista === "recurrentes" ? "Pagos recurrentes" : "Movimientos financieros";

  return (
    <div>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-1">
        <h2 className="gp-serif text-2xl">Movimientos</h2>
        <button onClick={() => setModal({ item: empty })} className="gp-btn flex items-center justify-center gap-1 px-3 py-1.5 text-sm w-full sm:w-auto"><Plus size={14} /> Nuevo</button>
      </div>
      <p className="text-sm gp-text-muted mb-4">Incluye pagos recurrentes (luz, agua, compras a meses) con fecha de inicio y fin, o indefinidos.</p>

      {/* Resumen arriba: lo primero que ves, antes de cualquier tabla o filtro. */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
        <div className="gp-panel-hi p-3">
          <p className="text-xs gp-text-muted">Ingresos de {fmtMesLabel(mesActual)}</p>
          <p className="gp-serif text-xl gp-text-teal">{fmtMoney(ingresosMes)}</p>
        </div>
        <div className="gp-panel-hi p-3">
          <p className="text-xs gp-text-muted">Egresos de {fmtMesLabel(mesActual)}</p>
          <p className="gp-serif text-xl gp-text-red">{fmtMoney(egresosMes)}</p>
        </div>
        <div className="gp-panel-hi p-3">
          <p className="text-xs gp-text-muted">Neto de {fmtMesLabel(mesActual)}</p>
          <p className={`gp-serif text-xl ${netoMes >= 0 ? "gp-text-teal" : "gp-text-red"}`}>{fmtMoney(netoMes)}</p>
        </div>
        <div className="gp-panel-hi p-3">
          <p className="text-xs gp-text-muted">Por cobrar</p>
          <p className="gp-serif text-xl gp-text-gold">{fmtMoney(totalCobrosPendientes)}</p>
        </div>
      </div>

      <BarraListaEstandar busqueda={busqueda} onBusqueda={setBusqueda} placeholder="Buscar por concepto, categoría, proyecto o contacto…"
        onExportExcel={() => exportarFilasExcel(filasVisiblesExport, columnasExport, nombreVista)}
        onExportPDF={() => exportarFilasPDF(filasVisiblesExport, columnasExport, nombreVista, tituloVista, busqueda ? `búsqueda: "${busqueda}"` : "")} />

      <div className="flex flex-wrap items-center gap-2 mb-4">
        <button onClick={() => setVista("todos")} className={`text-xs px-3 py-1.5 rounded-full border ${vista === "todos" ? "gp-btn" : "gp-text-muted"}`}>Todos los movimientos</button>
        <button onClick={() => setVista("cobros")} className={`text-xs px-3 py-1.5 rounded-full border flex items-center gap-1 ${vista === "cobros" ? "gp-btn" : "gp-text-muted"}`}>
          Cobros pendientes {cobrosPendientes.length > 0 && <Badge tone="gold">{cobrosPendientes.length}</Badge>}
        </button>
        <button onClick={() => setVista("recurrentes")} className={`text-xs px-3 py-1.5 rounded-full border flex items-center gap-1 ${vista === "recurrentes" ? "gp-btn" : "gp-text-muted"}`}>
          Pagos recurrentes
        </button>
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

      {/* Fila compacta reutilizada tanto en "Todos" (agrupado por mes) como en cobros/recurrentes */}
      {(() => {
        const Fila = (f) => {
          const vencido = f.fechaVencimiento && daysUntil(f.fechaVencimiento) < 0;
          const abierta = expandido === f.id;
          return (
            <div key={f.id} className="gp-panel p-3">
              <div className="flex items-center gap-2 cursor-pointer" onClick={() => setExpandido(abierta ? null : f.id)}>
                {abierta ? <ChevronDown size={13} className="gp-text-muted shrink-0" /> : <ChevronRight size={13} className="gp-text-muted shrink-0" />}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium truncate">{f.concepto || "—"}</span>
                    <Badge tone={f.estatus === "Cobrado" ? "teal" : "gold"}>{f.estatus}</Badge>
                    {f.esRecurrente && <Badge tone="gold">{f.frecuencia || "Mensual"}{f.fechaFin ? ` · hasta ${f.fechaFin}` : " · indefinido"}</Badge>}
                    {f.eventoId && <Badge tone="muted">🔗 Desde Eventos</Badge>}
                  </div>
                  <p className="text-xs gp-text-muted mt-0.5">
                    {f.esRecurrente ? `Día de pago: ${f.fecha ? Number(f.fecha.slice(8, 10)) : "—"}` : (f.fecha || "—")}
                    {vista === "cobros" && f.fechaVencimiento && <span style={{ color: vencido ? "var(--red)" : undefined }}> · vence {f.fechaVencimiento}{vencido ? " (vencido)" : ""}</span>}
                  </p>
                </div>
                <span className={`gp-mono text-sm shrink-0 ${f.tipo === "Ingreso" ? "gp-text-teal" : "gp-text-red"}`}>{f.tipo === "Ingreso" ? "+" : "−"}{f.monto ? fmtMoney(f.monto) : "—"}</span>
              </div>
              {abierta && (
                <div className="mt-2.5 pt-2.5 border-t gp-border pl-5">
                  {f.eventoId && <p className="text-xs gp-text-gold mb-2">Este movimiento se generó solo desde un Evento — para cambiarlo, edita el evento en el módulo Eventos (si lo cambias aquí, se sobrescribe la próxima vez que se guarde ese evento).</p>}
                  <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs gp-text-muted mb-3">
                    <div>Proyecto: <span className="gp-text-teal">{nombreProyecto(f.proyectoId)}</span></div>
                    <div>Cliente: <span className="gp-text-teal">{f.contactoId ? nombreCliente(f.contactoId) : "—"}</span></div>
                    <div>Categoría: {f.categoria || "—"}</div>
                    <div>Forma: {f.forma || "—"}</div>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={(e) => { e.stopPropagation(); setModal({ item: f }); }} className="gp-btn-ghost px-3 py-1 text-xs flex items-center gap-1"><Pencil size={12} /> Editar</button>
                    <button onClick={(e) => { e.stopPropagation(); onRemove(f.id); }} className="gp-btn-ghost px-3 py-1 text-xs flex items-center gap-1"><Trash2 size={12} /> Eliminar</button>
                  </div>
                </div>
              )}
            </div>
          );
        };

        if (vista === "cobros") {
          return <div className="space-y-2">{cobrosPendientes.map(Fila)}{cobrosPendientes.length === 0 && <p className="text-center gp-text-muted py-6 text-sm">No tienes cobros pendientes.</p>}</div>;
        }
        if (vista === "recurrentes") {
          return <div className="space-y-2">{recurrentesOrdenados.map(Fila)}{recurrentesOrdenados.length === 0 && <p className="text-center gp-text-muted py-6 text-sm">No hay pagos recurrentes con este filtro.</p>}</div>;
        }
        // "todos": agrupado por mes, como un estado de cuenta — el mes actual abierto por default.
        return (
          <div className="space-y-3">
            {gruposMes.map(([mes, movs]) => {
              const ingMes = movs.filter((f) => f.tipo === "Ingreso").reduce((s, f) => s + (Number(f.monto) || 0), 0);
              const egMes = movs.filter((f) => f.tipo === "Egreso").reduce((s, f) => s + (Number(f.monto) || 0), 0);
              const abierto = mesesAbiertos.has(mes);
              return (
                <div key={mes}>
                  <button onClick={() => toggleMes(mes)} className="w-full gp-panel-hi p-3 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      {abierto ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                      <span className="text-sm font-medium">{fmtMesLabel(mes)}</span>
                      <span className="text-xs gp-text-muted">({movs.length})</span>
                    </div>
                    <div className="flex items-center gap-3 text-xs gp-mono">
                      <span className="gp-text-teal">+{fmtMoney(ingMes)}</span>
                      <span className="gp-text-red">−{fmtMoney(egMes)}</span>
                      <span className={ingMes - egMes >= 0 ? "gp-text-teal" : "gp-text-red"}>{fmtMoney(ingMes - egMes)}</span>
                    </div>
                  </button>
                  {abierto && <div className="space-y-2 mt-2 pl-2">{movs.map(Fila)}</div>}
                </div>
              );
            })}
            {gruposMes.length === 0 && <p className="text-center gp-text-muted py-6 text-sm">Sin movimientos registrados.</p>}
          </div>
        );
      })()}

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
function Facturas({ data, onAdd, onEdit, onRemove, onAddComentario, onRemoveComentario, onAddFinanzas }) {
  const [modal, setModal] = useState(null);
  const [comentariosDe, setComentariosDe] = useState(null);
  const [filtroTipo, setFiltroTipo] = useState("Todas");
  const [filtroMes, setFiltroMes] = useState(todayISO().slice(0, 7));
  const [orden, setOrden] = useState("default");
  const [ordenDir, setOrdenDir] = useState("asc");
  const toggleOrden = (key) => { if (orden === key) setOrdenDir((d) => (d === "asc" ? "desc" : "asc")); else { setOrden(key); setOrdenDir("asc"); } };
  const empty = { tipo: "Recibida", proyectoId: "", contactoId: "", folio: "", fecha: todayISO(), concepto: "", subtotal: "", iva: "", total: "", estatus: "Pendiente", notas: "", finanzasId: "" };

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
          <thead><tr><Th label="Folio" sortKey="alfabetico" orden={orden} ordenDir={ordenDir} onToggle={toggleOrden} /><th>Tipo</th><Th label="Fecha" sortKey="fecha" orden={orden} ordenDir={ordenDir} onToggle={toggleOrden} /><th>Proyecto</th><th>Contacto</th><th>Subtotal</th><th>IVA</th><Th label="Total" sortKey="total" orden={orden} ordenDir={ordenDir} onToggle={toggleOrden} /><th>Estatus</th><th>Movimiento</th><th></th></tr></thead>
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
                  <td>{f.finanzasId ? <Badge tone="teal">🔗 Vinculada</Badge> : <Badge tone="muted">Sin vincular</Badge>}</td>
                  <td><div className="flex gap-1">
                    <IconBtn onClick={() => setComentariosDe(f)}><MessageCircle size={13} />{nc > 0 && <span className="gp-mono" style={{ fontSize: 9, marginLeft: 2 }}>{nc}</span>}</IconBtn>
                    <IconBtn onClick={() => setModal({ item: f })}><Pencil size={13} /></IconBtn><IconBtn onClick={() => onRemove(f.id)}><Trash2 size={13} /></IconBtn>
                  </div></td>
                </tr>
              );
            })}
            {ordenadas.length === 0 && <tr><td colSpan={11} className="text-center gp-text-muted py-6">Sin facturas registradas con este filtro.</td></tr>}
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
          <FacturaForm item={modal.item} proyectos={data.proyectos} contactos={data.contactos} finanzas={data.finanzas} onAddFinanzas={onAddFinanzas} onSave={(v) => { modal.item.id ? onEdit(modal.item.id, v) : onAdd(v); setModal(null); }} />
        </Modal>
      )}
    </div>
  );
}

function FacturaForm({ item, proyectos, contactos, finanzas, onAddFinanzas, onSave }) {
  const [v, setV] = useState(item);
  const [error, setError] = useState("");
  const [creandoMov, setCreandoMov] = useState(false);

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

      <div className="gp-panel p-3 mb-3">
        <p className="text-xs font-medium mb-2">Movimiento en Finanzas relacionado</p>
        <p className="text-xs gp-text-muted mb-2">El importe real vive en Finanzas; esta factura solo es su información fiscal relacionada (secc. 23.10).</p>
        <Field label={`Vincular a un ${v.tipo === "Emitida" ? "ingreso" : "egreso"} existente`}>
          <select className="gp-input" value={v.finanzasId || ""} onChange={(e) => setV({ ...v, finanzasId: e.target.value })}>
            <option value="">— sin vincular —</option>
            {(finanzas || []).filter((f) => f.tipo === (v.tipo === "Emitida" ? "Ingreso" : "Egreso"))
              .sort((a, b) => (b.fecha || "").localeCompare(a.fecha || ""))
              .map((f) => <option key={f.id} value={f.id}>{f.concepto || f.categoria || "(sin concepto)"} · {f.fecha} · {fmtMoney(f.monto)}</option>)}
          </select>
        </Field>
        {v.finanzasId ? (
          <p className="text-xs gp-text-teal mt-1">🔗 Vinculada a un movimiento de Finanzas.</p>
        ) : (
          <button type="button" disabled={creandoMov} className="text-xs px-2.5 py-1.5 rounded gp-btn-ghost mt-1"
            onClick={async () => {
              if (!onAddFinanzas) return;
              setCreandoMov(true);
              const nuevoId = uid();
              await onAddFinanzas({
                id: nuevoId, tipo: v.tipo === "Emitida" ? "Ingreso" : "Egreso", categoria: "Factura",
                concepto: v.concepto || v.folio || "Factura", monto: v.total || 0, fecha: v.fecha,
                proyectoId: v.proyectoId, contactoId: v.contactoId, forma: "Transferencia",
                estatus: v.estatus === "Pagada" ? "Cobrado" : "Pendiente", esRecurrente: false,
              });
              setCreandoMov(false);
              setV((prev) => ({ ...prev, finanzasId: nuevoId }));
            }}>{creandoMov ? "Creando…" : "＋ Crear movimiento en Finanzas con estos datos"}</button>
        )}
      </div>

      <p className="text-xs gp-text-muted mb-3">Esta información es de referencia para tu control interno — no sustituye a un contador ni a tu declaración fiscal real.</p>
      {error && <p className="text-xs gp-text-red mb-2">{error}</p>}

      <button className="gp-btn w-full py-2 text-sm mt-2" onClick={() => { if (!v.concepto?.toString().trim()) { setError("El concepto es obligatorio."); return; } setError(""); onSave(v); }}>Guardar</button>
    </div>
  );
}

/* ---------- Deudas ---------- */
// Deudas ya no es su propia tabla (Documento Maestro v1.2, secc. 23.11/40): es una vista
// especializada de Finanzas, filtrando egresos no recurrentes con saldo pendiente. Crear,
// editar, marcar como pagada o borrar una "deuda" aquí en realidad opera sobre `finanzas`
// (categoria="Deuda"), para que el movimiento real viva en un solo lugar.
function Deudas({ data, onAddFinanzas, onEditFinanzas, onRemoveFinanzas, onCrearTarea }) {
  const [modal, setModal] = useState(null); // {item} en captura/edición | {item, paso:"tarea", origenId} tras crear
  const [orden, setOrden] = useState("default");
  const [ordenDir, setOrdenDir] = useState("asc");
  const [busqueda, setBusqueda] = useState("");
  const toggleOrden = (key) => { if (orden === key) setOrdenDir((d) => (d === "asc" ? "desc" : "asc")); else { setOrden(key); setOrdenDir("asc"); } };
  const empty = { concepto: "", proyectoId: "", monto: "", fechaVencimiento: todayISO() };
  const nombreProyecto = (id) => data.proyectos.find((p) => p.id === id)?.nombre || "—";
  const deudas = filtrarPorBusqueda(deudasDeFinanzas(data.finanzas), busqueda, [(d) => d.concepto, (d) => nombreProyecto(d.proyectoId)]);
  const camposOrden = {
    vencimiento: { get: (d) => d.fechaVencimiento, tipo: "fecha" },
    registro: { get: (d) => d.createdAt, tipo: "fecha" },
    alfabetico: { get: (d) => d.concepto, tipo: "texto" },
    monto: { get: (d) => Number(d.monto) || 0, tipo: "numero" },
  };
  const opcionesOrden = [
    { key: "vencimiento", label: "fecha de vencimiento" },
    { key: "registro", label: "fecha de registro" },
    { key: "alfabetico", label: "alfabético" },
    { key: "monto", label: "monto" },
  ];
  const base = orden === "default" ? [...deudas].sort((a, b) => (a.fechaVencimiento || "").localeCompare(b.fechaVencimiento || "")) : deudas;
  const ordenados = ordenarLista(base, orden, camposOrden, ordenDir);
  const columnasExport = [
    { label: "Acreedor", get: (d) => d.concepto }, { label: "Proyecto", get: (d) => nombreProyecto(d.proyectoId) },
    { label: "Vence", get: (d) => d.fechaVencimiento }, { label: "Monto", get: (d) => d.monto },
  ];

  return (
    <div>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-1">
        <h2 className="gp-serif text-2xl">Deudas</h2>
        <button onClick={() => setModal({ item: empty })} className="gp-btn flex items-center justify-center gap-1 px-3 py-1.5 text-sm w-full sm:w-auto"><Plus size={14} /> Nueva</button>
      </div>
      <p className="text-sm gp-text-muted mb-3">Atrasadas, próximas a vencer y al corriente, todo calculado por fecha. Al marcarse como pagada, el movimiento sigue en Finanzas y desaparece de aquí.</p>
      <div className="mb-2"><OrdenSelector opciones={opcionesOrden} value={orden} onChange={setOrden} /></div>
      <BarraListaEstandar busqueda={busqueda} onBusqueda={setBusqueda} placeholder="Buscar por acreedor o proyecto…"
        onExportExcel={() => exportarFilasExcel(ordenados, columnasExport, "deudas")}
        onExportPDF={() => exportarFilasPDF(ordenados, columnasExport, "deudas", "Deudas", busqueda ? `búsqueda: "${busqueda}"` : "")} />

      <div className="gp-panel overflow-x-auto">
        <table className="gp-table">
          <thead><tr><Th label="Acreedor" sortKey="alfabetico" orden={orden} ordenDir={ordenDir} onToggle={toggleOrden} /><th>Proyecto</th><Th label="Vence" sortKey="vencimiento" orden={orden} ordenDir={ordenDir} onToggle={toggleOrden} /><th>Estatus</th><Th label="Monto" sortKey="monto" orden={orden} ordenDir={ordenDir} onToggle={toggleOrden} /><th></th></tr></thead>
          <tbody>
            {ordenados.map((d) => {
              const dd = daysUntil(d.fechaVencimiento);
              const tone = !d.fechaVencimiento ? "muted" : dd < 0 ? "red" : dd <= 7 ? "gold" : "teal";
              const label = !d.fechaVencimiento ? "Sin fecha" : dd < 0 ? `Atrasada (${Math.abs(dd)}d)` : dd <= 7 ? `Vence en ${dd}d` : "Al corriente";
              return (
                <tr key={d.id}>
                  <td>{d.concepto}</td>
                  <td className="gp-text-muted">{nombreProyecto(d.proyectoId)}</td>
                  <td className="gp-mono">{d.fechaVencimiento || "—"}</td>
                  <td><Badge tone={tone}>{label}</Badge></td>
                  <td className="gp-mono">{fmtMoney(d.monto)}</td>
                  <td><div className="flex gap-1">
                    <button title="Marcar como pagada" onClick={() => onEditFinanzas(d.id, { estatus: "Cobrado", fecha: todayISO() })} className="text-xs px-2 py-1 rounded gp-btn-ghost gp-text-teal">Pagada</button>
                    <IconBtn onClick={() => setModal({ item: d })}><Pencil size={13} /></IconBtn><IconBtn onClick={() => onRemoveFinanzas(d.id)}><Trash2 size={13} /></IconBtn>
                  </div></td>
                </tr>
              );
            })}
            {ordenados.length === 0 && <tr><td colSpan={6} className="text-center gp-text-muted py-6">Sin deudas registradas.</td></tr>}
          </tbody>
        </table>
      </div>

      {modal && !modal.paso && (
        <Modal title={modal.item.id ? "Editar deuda" : "Nueva deuda"} onClose={() => setModal(null)}>
          <DeudaForm item={modal.item} proyectos={data.proyectos} onSave={(v) => {
            if (modal.item.id) { onEditFinanzas(modal.item.id, v); setModal(null); return; }
            const nuevoId = uid();
            onAddFinanzas({
              id: nuevoId, tipo: "Egreso", categoria: "Deuda", forma: "Transferencia", estatus: "Pendiente",
              esRecurrente: false, fecha: todayISO(), contactoId: "",
              concepto: v.concepto, proyectoId: v.proyectoId, monto: v.monto, fechaVencimiento: v.fechaVencimiento,
            });
            setModal({ item: v, paso: "tarea", origenId: nuevoId });
          }} />
        </Modal>
      )}
      {modal && modal.paso === "tarea" && (
        <Modal title="Acción relacionada" onClose={() => setModal(null)}>
          <PromptTareaRelacionada
            origenTabla="finanzas" origenId={modal.origenId} proyectoId={modal.item.proyectoId}
            descripcionSugerida={`Pagar a ${modal.item.concepto}`}
            fechaSugerida={modal.item.fechaVencimiento}
            onCrear={(t) => { onCrearTarea(t); setModal(null); }}
            onOmitir={() => setModal(null)}
          />
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
      <Field label="Acreedor"><input className="gp-input" value={v.concepto} onChange={(e) => setV({ ...v, concepto: e.target.value })} /></Field>
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

      <button className="gp-btn w-full py-2 text-sm mt-2" onClick={() => { if (!v.concepto?.toString().trim()) { setError("El acreedor es obligatorio."); return; } setError(""); onSave(v); }}>Guardar</button>
    </div>
  );
}

/* ---------- Equipo ---------- */
function Equipo({ data, onAdd, onEdit, onRemove }) {
  const [modal, setModal] = useState(null);
  const [orden, setOrden] = useState("alfabetico");
  const [busqueda, setBusqueda] = useState("");
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
  // Buscador propio de esta lista (independiente del buscador global de ARKEYONE): filtra por
  // contenido en cualquier parte del texto, no solo por inicio, e ignora acentos/mayúsculas.
  const qn = normalizarTexto(busqueda);
  const filtrados = !qn
    ? data.equipo
    : data.equipo.filter((m) => [m.nombre, m.whatsapp, m.correo, m.comentarios].some((v) => normalizarTexto(v).includes(qn)));
  const listaEquipo = ordenarLista(filtrados, orden, camposOrden);

  return (
    <div>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-1">
        <h2 className="gp-serif text-2xl">Colaboradores</h2>
        <button onClick={() => setModal({ item: empty })} className="gp-btn flex items-center justify-center gap-1 px-3 py-1.5 text-sm w-full sm:w-auto"><Plus size={14} /> Nuevo</button>
      </div>
      <p className="text-sm gp-text-muted mb-3">Colaboradores a los que delegas, con sus tareas y tu evaluación.</p>
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <input className="gp-input text-sm flex-1 sm:max-w-xs" placeholder="Buscar en Colaboradores…" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
        <OrdenSelector opciones={opcionesOrden} value={orden} onChange={setOrden} />
      </div>

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
        {listaEquipo.length === 0 && (
          <p className="text-sm gp-text-muted col-span-2">
            {data.equipo.length === 0 ? "Aún no registras colaboradores." : "Ningún colaborador coincide con tu búsqueda."}
          </p>
        )}
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
        <h2 className="gp-serif text-2xl">Diario</h2>
        <button onClick={() => setModal({ item: empty })} className="gp-btn flex items-center justify-center gap-1 px-3 py-1.5 text-sm w-full sm:w-auto"><Plus size={14} /> Registrar</button>
      </div>
      <p className="text-sm gp-text-muted mb-3">Tu diario: escribe aquí tu día a día por fecha — gym, eventos, capacitación (PLC's, Vibe Coding/SDD, inglés), o cualquier cosa que valga la pena recordar de ese día.</p>
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
            {ordenados.length === 0 && <tr><td colSpan={7} className="text-center gp-text-muted py-6">Aún no has escrito nada en tu diario.</td></tr>}
          </tbody>
        </table>
      </div>

      {modal && (
        <Modal title={modal.item.id ? "Editar entrada del diario" : "Nueva entrada del diario"} onClose={() => setModal(null)}>
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
function ActivosDigitales({ data, onAdd, onEdit, onRemove, onCrearTarea }) {
  const [modal, setModal] = useState(null);
  const [orden, setOrden] = useState("default");
  const [ordenDir, setOrdenDir] = useState("asc");
  const [busqueda, setBusqueda] = useState("");
  const toggleOrden = (key) => { if (orden === key) setOrdenDir((d) => (d === "asc" ? "desc" : "asc")); else { setOrden(key); setOrdenDir("asc"); } };
  const empty = { tipo: "Dominio", nombre: "", proyectoId: "", fechaVencimiento: todayISO(), costoRenovacion: "", notas: "", proveedor: "", urlIdentificador: "", cuentaPropietaria: "", renovacionAutomatica: false };
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
  const nombreProyecto = (id) => data.proyectos.find((p) => p.id === id)?.nombre || "—";
  const buscados = filtrarPorBusqueda(data.activos || [], busqueda, [(a) => a.nombre, (a) => a.tipo, (a) => a.notas, (a) => nombreProyecto(a.proyectoId), (a) => a.proveedor, (a) => a.cuentaPropietaria]);
  const base = orden === "default" ? [...buscados].sort((a, b) => (a.fechaVencimiento || "").localeCompare(b.fechaVencimiento || "")) : buscados;
  const ordenados = ordenarLista(base, orden, camposOrden, ordenDir);
  const columnasExport = [
    { label: "Activo", get: (a) => a.nombre }, { label: "Tipo", get: (a) => a.tipo },
    { label: "Proyecto", get: (a) => nombreProyecto(a.proyectoId) }, { label: "Vence", get: (a) => a.fechaVencimiento },
    { label: "Costo renovación", get: (a) => a.costoRenovacion },
    { label: "Proveedor", get: (a) => a.proveedor }, { label: "URL/identificador", get: (a) => a.urlIdentificador },
    { label: "Cuenta propietaria", get: (a) => a.cuentaPropietaria },
    { label: "Renovación automática", get: (a) => (a.renovacionAutomatica ? "Sí" : "No") },
    { label: "Notas", get: (a) => a.notas },
  ];

  return (
    <div>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-1">
        <h2 className="gp-serif text-2xl">Activos digitales</h2>
        <button onClick={() => setModal({ item: empty })} className="gp-btn flex items-center justify-center gap-1 px-3 py-1.5 text-sm w-full sm:w-auto"><Plus size={14} /> Nuevo</button>
      </div>
      <p className="text-sm gp-text-muted mb-3">Dominios, hosting, marcas ante IMPI y redes — para que ningún vencimiento te tome por sorpresa.</p>
      <div className="mb-2"><OrdenSelector opciones={opcionesOrden} value={orden} onChange={setOrden} /></div>
      <BarraListaEstandar busqueda={busqueda} onBusqueda={setBusqueda} placeholder="Buscar por nombre, tipo, proyecto o notas…"
        onExportExcel={() => exportarFilasExcel(ordenados, columnasExport, "activos_digitales")}
        onExportPDF={() => exportarFilasPDF(ordenados, columnasExport, "activos_digitales", "Activos digitales", busqueda ? `búsqueda: "${busqueda}"` : "")} />

      <div className="gp-panel overflow-x-auto">
        <table className="gp-table">
          <thead><tr><Th label="Activo" sortKey="alfabetico" orden={orden} ordenDir={ordenDir} onToggle={toggleOrden} /><th>Tipo</th><th>Proyecto</th><Th label="Vence" sortKey="vencimiento" orden={orden} ordenDir={ordenDir} onToggle={toggleOrden} /><th>Estatus</th><th>Costo renovación</th><th>Auto</th><th></th></tr></thead>
          <tbody>
            {ordenados.map((a) => {
              const dd = daysUntil(a.fechaVencimiento);
              const tone = dd < 0 ? "red" : dd <= 14 ? "gold" : "teal";
              const label = dd < 0 ? `Vencido (${Math.abs(dd)}d)` : dd <= 14 ? `Renovar en ${dd}d` : "Vigente";
              return (
                <tr key={a.id}>
                  <td>
                    {a.nombre}
                    {(a.proveedor || a.cuentaPropietaria) && (
                      <div className="text-xs gp-text-muted">{[a.proveedor, a.cuentaPropietaria].filter(Boolean).join(" · ")}</div>
                    )}
                  </td>
                  <td className="gp-text-muted">{a.tipo}</td>
                  <td className="gp-text-muted">{nombreProyecto(a.proyectoId)}</td>
                  <td className="gp-mono">{a.fechaVencimiento}</td>
                  <td><Badge tone={tone}>{label}</Badge></td>
                  <td className="gp-mono">{a.costoRenovacion ? fmtMoney(a.costoRenovacion) : "—"}</td>
                  <td>{a.renovacionAutomatica ? <Badge tone="teal">Sí</Badge> : <span className="gp-text-muted text-xs">No</span>}</td>
                  <td><div className="flex gap-1"><IconBtn onClick={() => setModal({ item: a })}><Pencil size={13} /></IconBtn><IconBtn onClick={() => onRemove(a.id)}><Trash2 size={13} /></IconBtn></div></td>
                </tr>
              );
            })}
            {ordenados.length === 0 && <tr><td colSpan={8} className="text-center gp-text-muted py-6">Sin activos digitales registrados.</td></tr>}
          </tbody>
        </table>
      </div>

      {modal && !modal.paso && (
        <Modal title={modal.item.id ? "Editar activo" : "Nuevo activo digital"} onClose={() => setModal(null)}>
          <ActivoForm item={modal.item} proyectos={data.proyectos} onSave={(v) => {
            if (modal.item.id) { onEdit(modal.item.id, v); setModal(null); return; }
            const nuevoId = uid();
            onAdd({ ...v, id: nuevoId });
            setModal({ item: v, paso: "tarea", origenId: nuevoId });
          }} />
        </Modal>
      )}
      {modal && modal.paso === "tarea" && (
        <Modal title="Acción relacionada" onClose={() => setModal(null)}>
          <PromptTareaRelacionada
            origenTabla="activos" origenId={modal.origenId} proyectoId={modal.item.proyectoId}
            descripcionSugerida={`Renovar ${modal.item.nombre}`}
            fechaSugerida={modal.item.fechaVencimiento}
            onCrear={(t) => { onCrearTarea(t); setModal(null); }}
            onOmitir={() => setModal(null)}
          />
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
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="Proveedor"><input className="gp-input" placeholder="ej. AKKY, GoDaddy, IMPI" value={v.proveedor || ""} onChange={(e) => setV({ ...v, proveedor: e.target.value })} /></Field>
        <Field label="Cuenta propietaria"><input className="gp-input" placeholder="ej. cuenta principal, cuenta ARKEYMEDIA" value={v.cuentaPropietaria || ""} onChange={(e) => setV({ ...v, cuentaPropietaria: e.target.value })} /></Field>
      </div>
      <Field label="URL o identificador"><input className="gp-input" placeholder="ej. https://... o número de expediente" value={v.urlIdentificador || ""} onChange={(e) => setV({ ...v, urlIdentificador: e.target.value })} /></Field>
      <label className="flex items-center gap-2 mb-3 text-sm cursor-pointer select-none">
        <input type="checkbox" checked={!!v.renovacionAutomatica} onChange={(e) => setV({ ...v, renovacionAutomatica: e.target.checked })} style={{ width: 16, height: 16, accentColor: "var(--gold)" }} />
        Renovación automática
      </label>
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
          <thead><tr><th style={{ width: 36 }}></th><Th label="Meta" sortKey="alfabetico" orden={orden} ordenDir={ordenDir} onToggle={toggleOrden} /><th>Proyecto</th><Th label="Prioridad" sortKey="prioridad" orden={orden} ordenDir={ordenDir} onToggle={toggleOrden} /><Th label="Fecha objetivo" sortKey="objetivo" orden={orden} ordenDir={ordenDir} onToggle={toggleOrden} /><th>Estatus</th><th></th></tr></thead>
          <tbody>
            {ordenados.map((m) => {
              const cumplida = m.estatus === "Cumplida";
              return (
                <tr key={m.id} style={cumplida ? { background: "rgba(34,197,94,0.14)" } : undefined}>
                  <td>
                    <input
                      type="checkbox"
                      checked={cumplida}
                      title="Marcar como cumplida"
                      onChange={(e) => onEdit(m.id, { estatus: e.target.checked ? "Cumplida" : "En progreso" })}
                      style={{ width: 16, height: 16, accentColor: "var(--gold)", cursor: "pointer" }}
                    />
                  </td>
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
              );
            })}
            {ordenados.length === 0 && <tr><td colSpan={7} className="text-center gp-text-muted py-6">Sin metas registradas.</td></tr>}
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
  const [busqueda, setBusqueda] = useState("");
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
  const buscados = filtrarPorBusqueda(filtrados, busqueda, [(c) => c.nombre, (c) => c.contexto, (c) => c.whatsapp, (c) => c.correo, (c) => c.parentesco, (c) => c.notas]);
  const visibles = ordenarLista(buscados, orden, camposOrden);
  const columnasExport = [
    { label: "Nombre", get: (c) => c.nombre }, { label: "Tipo", get: (c) => c.tipo },
    { label: "Parentesco", get: (c) => c.parentesco }, { label: "WhatsApp", get: (c) => c.whatsapp },
    { label: "Correo", get: (c) => c.correo }, { label: "Proyecto", get: (c) => nombreProyecto(c.proyectoId) },
    { label: "Notas", get: (c) => c.notas },
  ];

  return (
    <div>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-1">
        <h2 className="gp-serif text-2xl">Contactos</h2>
        <button onClick={() => setModal({ item: empty })} className="gp-btn flex items-center justify-center gap-1 px-3 py-1.5 text-sm w-full sm:w-auto"><Plus size={14} /> Nuevo</button>
      </div>
      <p className="text-sm gp-text-muted mb-4">Clientes, proveedores, colaboradores y gente que conoces en eventos — para que no se pierdan.</p>

      <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
        <div className="flex flex-wrap gap-1">
          {["Todos", "Cliente", "Proveedor", "Colaborador", "Otro"].map((t) => (
            <button key={t} onClick={() => setFiltroTipo(t)} className={`text-xs px-2.5 py-1 rounded-full border ${filtroTipo === t ? "gp-btn" : "gp-text-muted"}`}>{t}</button>
          ))}
        </div>
        <OrdenSelector opciones={opcionesOrden} value={orden} onChange={setOrden} />
      </div>
      <BarraListaEstandar busqueda={busqueda} onBusqueda={setBusqueda} placeholder="Buscar por nombre, contexto, WhatsApp, correo…"
        onExportExcel={() => exportarFilasExcel(visibles, columnasExport, "contactos")}
        onExportPDF={() => exportarFilasPDF(visibles, columnasExport, "contactos", "Contactos", `filtro: ${filtroTipo}${busqueda ? ` · búsqueda: "${busqueda}"` : ""}`)} />

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
      <CumpleanosField value={v.fechaNacimiento} onChange={(f) => setV({ ...v, fechaNacimiento: f })} />
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
  const [busqueda, setBusqueda] = useState("");
  const toggleOrden = (key) => { if (orden === key) setOrdenDir((d) => (d === "asc" ? "desc" : "asc")); else { setOrden(key); setOrdenDir("asc"); } };
  const anioActual = new Date().getFullYear();
  const empty = { contactoId: filtroContactoInicial || "", tipo: "Regalo", ocasion: "Cumpleaños", anio: anioActual, fecha: "", descripcion: "", costo: "", estatus: "Por comprar", notas: "" };

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
  filtrados = filtrarPorBusqueda(filtrados, busqueda, [(r) => r.descripcion, (r) => r.ocasion, (r) => r.notas, (r) => nombreContacto(r.contactoId)]);
  const ordenados = ordenarLista(filtrados, orden, camposOrden, ordenDir);
  const totalGastado = ordenados.reduce((s, r) => s + (Number(r.costo) || 0), 0);
  const columnasExport = [
    { label: "Contacto", get: (r) => nombreContacto(r.contactoId) }, { label: "Tipo", get: (r) => r.tipo },
    { label: "Ocasión", get: (r) => r.ocasion }, { label: "Año", get: (r) => r.anio },
    { label: "Fecha", get: (r) => r.fecha }, { label: "Descripción", get: (r) => r.descripcion },
    { label: "Costo", get: (r) => r.costo }, { label: "Estatus", get: (r) => r.estatus },
  ];

  const verNavidadEsteAnio = () => { setFiltroOcasion("Navidad"); setFiltroAnio(anioActual); setFiltroContacto(""); };

  return (
    <div>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-1">
        <h2 className="gp-serif text-2xl">Atenciones</h2>
        <button onClick={() => setModal({ item: empty })} className="gp-btn flex items-center justify-center gap-1 px-3 py-1.5 text-sm w-full sm:w-auto"><Plus size={14} /> Nuevo</button>
      </div>
      <p className="text-sm gp-text-muted mb-3">Regalos, felicitaciones, condolencias y agradecimientos a tus contactos — incluye tu lista de Navidad por año.</p>

      <div className="flex flex-wrap items-center gap-2 mb-2">
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
              <tr key={r.id}>
                <td>{nombreContacto(r.contactoId)}</td>
                <td><Badge tone="gold">{r.tipo || "Regalo"}</Badge></td>
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
            {ordenados.length === 0 && <tr><td colSpan={9} className="text-center gp-text-muted py-6">Sin atenciones registradas con este filtro.</td></tr>}
          </tbody>
        </table>
      </div>

      {modal && (
        <Modal title={modal.item.id ? "Editar atención" : "Nueva atención"} onClose={() => setModal(null)}>
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
        <Field label="Tipo de atención"><select className="gp-input" value={v.tipo || "Regalo"} onChange={(e) => setV({ ...v, tipo: e.target.value })}>{TIPOS_ATENCION.map((t) => <option key={t}>{t}</option>)}</select></Field>
        <Field label="Ocasión"><select className="gp-input" value={v.ocasion} onChange={(e) => setV({ ...v, ocasion: e.target.value })}>{OCASIONES_REGALO.map((o) => <option key={o}>{o}</option>)}</select></Field>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
// Igual que Finanzas+Facturas: Marketing y Redes sociales se agrupan en pestañas de una misma
// pantalla porque las redes alimentan las campañas — sin tocar la lógica interna de ninguna.
function MarketingYRedes({ data, tabInicial, marketingProps, redesProps }) {
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
function Marketing({ data, onAdd, onEdit, onRemove, onAddComentario, onRemoveComentario }) {
  const [modal, setModal] = useState(null);
  const [comentariosDe, setComentariosDe] = useState(null);
  const [filtroProyecto, setFiltroProyecto] = useState("Todos");
  const [filtroEstatus, setFiltroEstatus] = useState("Todas");
  const [orden, setOrden] = useState("default");
  const [busqueda, setBusqueda] = useState("");
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
  filtradas = filtrarPorBusqueda(filtradas, busqueda, [(c) => c.nombre, (c) => c.plataforma, (c) => c.notas, (c) => nombreProyecto(c.proyectoId)]);
  const base = orden === "default" ? [...filtradas].sort((a, b) => (a.fechaInicio || "9999").localeCompare(b.fechaInicio || "9999")) : filtradas;
  const ordenadas = ordenarLista(base, orden, camposOrden);

  const totalPresupuesto = ordenadas.reduce((s, c) => s + (Number(c.presupuesto) || 0), 0);
  const totalGastado = ordenadas.reduce((s, c) => s + (Number(c.gastado) || 0), 0);
  const totalIngreso = ordenadas.reduce((s, c) => s + (Number(c.ingresoGenerado) || 0), 0);
  const columnasExport = [
    { label: "Nombre", get: (c) => c.nombre }, { label: "Proyecto", get: (c) => nombreProyecto(c.proyectoId) },
    { label: "Plataforma", get: (c) => c.plataforma }, { label: "Estatus", get: (c) => c.estatus },
    { label: "Inicio", get: (c) => c.fechaInicio }, { label: "Fin", get: (c) => c.fechaFin },
    { label: "Presupuesto", get: (c) => c.presupuesto }, { label: "Gastado", get: (c) => c.gastado },
    { label: "Ingreso atribuido", get: (c) => c.ingresoGenerado }, { label: "ROI %", get: (c) => { const r = retorno(c); return r === null ? "" : Math.round(r); } },
  ];

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

      <div className="flex flex-wrap items-center gap-2 mb-2">
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
      <BarraListaEstandar busqueda={busqueda} onBusqueda={setBusqueda} placeholder="Buscar por nombre, plataforma o proyecto…"
        onExportExcel={() => exportarFilasExcel(ordenadas, columnasExport, "campanas")}
        onExportPDF={() => exportarFilasPDF(ordenadas, columnasExport, "campañas de marketing", `proyecto: ${filtroProyecto === "Todos" ? "todos" : nombreProyecto(filtroProyecto)} · estatus: ${filtroEstatus}${busqueda ? ` · búsqueda: "${busqueda}"` : ""}`)} />

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
  const [busqueda, setBusqueda] = useState("");
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
  bienes = filtrarPorBusqueda(bienes, busqueda, [(b) => b.nombre, (b) => b.categoria, (b) => b.notas]);
  const ordenados = ordenarLista(bienes, orden, camposOrden, ordenDir);
  const totalPatrimonio = ordenados.reduce((s, b) => s + valorActual(b), 0);
  const totalAdquisicion = ordenados.reduce((s, b) => s + (Number(b.valorAdquisicion) || 0), 0);
  const columnasExport = [
    { label: "Nombre", get: (b) => b.nombre }, { label: "Categoría", get: (b) => b.categoria },
    { label: "Fecha de adquisición", get: (b) => b.fechaAdquisicion }, { label: "Valor de adquisición", get: (b) => b.valorAdquisicion },
    { label: "Valor actual", get: (b) => valorActual(b) }, { label: "Notas", get: (b) => b.notas },
  ];

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

      <div className="flex flex-wrap items-center gap-2 mb-2">
        <select className="gp-input text-xs py-1.5" style={{ width: "auto" }} value={filtroCategoria} onChange={(e) => setFiltroCategoria(e.target.value)}>
          <option value="Todas">Todas las categorías</option>
          {CATEGORIAS_PATRIMONIO.map((c) => <option key={c}>{c}</option>)}
        </select>
        <OrdenSelector opciones={opcionesOrden} value={orden} onChange={setOrden} />
      </div>
      <BarraListaEstandar busqueda={busqueda} onBusqueda={setBusqueda} placeholder="Buscar por nombre, categoría o notas…"
        onExportExcel={() => exportarFilasExcel(ordenados, columnasExport, "patrimonio")}
        onExportPDF={() => exportarFilasPDF(ordenados, columnasExport, "patrimonio", "Patrimonio", `categoría: ${filtroCategoria}${busqueda ? ` · búsqueda: "${busqueda}"` : ""}`)} />

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
function Documentos({ data, onAdd, onEdit, onRemove, onCrearTarea }) {
  const [modal, setModal] = useState(null);
  const [orden, setOrden] = useState("default");
  const [ordenDir, setOrdenDir] = useState("asc");
  const [busqueda, setBusqueda] = useState("");
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
  const nombreProyecto = (id) => data.proyectos.find((p) => p.id === id)?.nombre || "—";
  const buscados = filtrarPorBusqueda(data.documentos, busqueda, [(d) => d.nombre, (d) => d.tipo, (d) => d.notas, (d) => nombreProyecto(d.proyectoId)]);
  const base = orden === "default" ? [...buscados].sort((a, b) => (a.fechaVencimiento || "").localeCompare(b.fechaVencimiento || "")) : buscados;
  const ordenados = ordenarLista(base, orden, camposOrden, ordenDir);
  const columnasExport = [
    { label: "Documento", get: (d) => d.nombre }, { label: "Tipo", get: (d) => d.tipo },
    { label: "Proyecto", get: (d) => nombreProyecto(d.proyectoId) }, { label: "Vencimiento", get: (d) => d.fechaVencimiento },
    { label: "Notas", get: (d) => d.notas },
  ];

  return (
    <div>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-1">
        <h2 className="gp-serif text-2xl">Legal y contratos</h2>
        <button onClick={() => setModal({ item: empty })} className="gp-btn flex items-center justify-center gap-1 px-3 py-1.5 text-sm w-full sm:w-auto"><Plus size={14} /> Nuevo</button>
      </div>
      <p className="text-sm gp-text-muted mb-3">Contratos, registros de marca ante IMPI y demás documentos, por proyecto.</p>
      <div className="mb-2"><OrdenSelector opciones={opcionesOrden} value={orden} onChange={setOrden} /></div>
      <BarraListaEstandar busqueda={busqueda} onBusqueda={setBusqueda} placeholder="Buscar por nombre, tipo, proyecto o notas…"
        onExportExcel={() => exportarFilasExcel(ordenados, columnasExport, "legal_y_contratos")}
        onExportPDF={() => exportarFilasPDF(ordenados, columnasExport, "legal_y_contratos", "Legal y contratos", busqueda ? `búsqueda: "${busqueda}"` : "")} />

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

      {modal && !modal.paso && (
        <Modal title={modal.item.id ? "Editar documento" : "Nuevo documento"} onClose={() => setModal(null)}>
          <DocumentoForm item={modal.item} proyectos={data.proyectos} onSave={(v) => {
            if (modal.item.id) { onEdit(modal.item.id, v); setModal(null); return; }
            const nuevoId = uid();
            onAdd({ ...v, id: nuevoId });
            setModal({ item: v, paso: "tarea", origenId: nuevoId });
          }} />
        </Modal>
      )}
      {modal && modal.paso === "tarea" && (
        <Modal title="Acción relacionada" onClose={() => setModal(null)}>
          <PromptTareaRelacionada
            origenTabla="documentos" origenId={modal.origenId} proyectoId={modal.item.proyectoId}
            descripcionSugerida={`Dar seguimiento a ${modal.item.nombre}`}
            fechaSugerida={modal.item.fechaVencimiento}
            onCrear={(t) => { onCrearTarea(t); setModal(null); }}
            onOmitir={() => setModal(null)}
          />
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
const DIAS_SEMANA_LARGO = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
const DIAS_SEMANA_CORTO = ["D", "L", "M", "M", "J", "V", "S"];

// Racha actual: días consecutivos cumplidos contando hacia atrás desde hoy (se rompe apenas falta uno).
const rachaHabito = (h, hoyISO) => {
  let n = 0;
  let d = new Date(hoyISO + "T00:00:00");
  while ((h.fechas || []).includes(d.toISOString().slice(0, 10))) { n++; d.setDate(d.getDate() - 1); }
  return n;
};
// Mejor racha histórica: la corrida consecutiva más larga que haya existido, no solo la vigente.
const mejorRachaHabito = (h) => {
  const fechas = [...new Set(h.fechas || [])].sort();
  if (!fechas.length) return 0;
  let mejor = 1, actual = 1;
  for (let i = 1; i < fechas.length; i++) {
    const diff = Math.round((new Date(fechas[i] + "T00:00:00") - new Date(fechas[i - 1] + "T00:00:00")) / 86400000);
    if (diff === 1) { actual++; mejor = Math.max(mejor, actual); } else actual = 1;
  }
  return Math.max(mejor, actual);
};
// Texto legible de la racha — nunca abreviaturas como "0d"/"1d".
const textoRacha = (n) => (n === 0 ? "Sin racha" : `Racha: ${n} día${n === 1 ? "" : "s"}`);
// Texto de la frecuencia configurada, para mostrar en la tarjeta sin entrar al detalle.
const textoFrecuencia = (h) => {
  if (h.frecuenciaTipo === "dias_semana") {
    const dias = h.frecuenciaDiasSemana || [];
    if (!dias.length) return "Días específicos";
    return dias.slice().sort().map((d) => DIAS_SEMANA_CORTO[d]).join(" ");
  }
  if (h.frecuenciaTipo === "veces_semana") return `${h.frecuenciaVecesSemana || 1}x por semana`;
  return "Todos los días";
};
// ¿Este hábito "aplica" hoy según su frecuencia? (para el resumen del día — días específicos que no
// tocan hoy no cuentan como pendientes; diario y X veces por semana siempre se consideran vigentes).
const aplicaHoy = (h, hoyISO) => {
  if (h.frecuenciaTipo === "dias_semana") {
    const diaHoy = new Date(hoyISO + "T00:00:00").getDay();
    return (h.frecuenciaDiasSemana || []).includes(diaHoy);
  }
  return true;
};
// % de cumplimiento en una ventana de N días, comparando lo registrado contra lo esperado según frecuencia.
const porcentajeCumplimiento = (h, dias = 30) => {
  const hoy = new Date(todayISO() + "T00:00:00");
  const fechasEnVentana = new Set((h.fechas || []).filter((f) => {
    const diff = Math.round((hoy - new Date(f + "T00:00:00")) / 86400000);
    return diff >= 0 && diff < dias;
  }));
  let esperado = dias;
  if (h.frecuenciaTipo === "dias_semana" && (h.frecuenciaDiasSemana || []).length) {
    esperado = 0;
    for (let i = 0; i < dias; i++) {
      const d = new Date(hoy); d.setDate(d.getDate() - i);
      if (h.frecuenciaDiasSemana.includes(d.getDay())) esperado++;
    }
  } else if (h.frecuenciaTipo === "veces_semana") {
    esperado = Math.max(1, Math.round((dias / 7) * (h.frecuenciaVecesSemana || 1)));
  }
  if (!esperado) return 0;
  return Math.min(100, Math.round((fechasEnVentana.size / esperado) * 100));
};

function Habitos({ data, onAdd, onEdit, onRemove }) {
  const [nuevo, setNuevo] = useState("");
  const [orden, setOrden] = useState("default");
  const [busqueda, setBusqueda] = useState("");
  const [detalleDe, setDetalleDe] = useState(null); // hábito abierto en el modal de detalle
  const hoy = todayISO();

  const toggleHoy = (h) => {
    const hecho = (h.fechas || []).includes(hoy);
    const fechas = hecho ? h.fechas.filter((f) => f !== hoy) : [...(h.fechas || []), hoy];
    onEdit(h.id, { fechas });
  };

  const camposOrden = {
    alfabetico: { get: (h) => h.nombre, tipo: "texto" },
    registro: { get: (h) => h.createdAt, tipo: "fecha" },
    racha: { get: (h) => rachaHabito(h, hoy), tipo: "numero" },
  };
  const opcionesOrden = [
    { key: "alfabetico", label: "alfabético" },
    { key: "registro", label: "fecha de registro" },
    { key: "racha", label: "racha actual" },
  ];
  const buscados = filtrarPorBusqueda(data.habitos, busqueda, [(h) => h.nombre]);
  const listaHabitos = ordenarLista(buscados, orden, camposOrden);
  const columnasExport = [
    { label: "Nombre", get: (h) => h.nombre }, { label: "Frecuencia", get: (h) => textoFrecuencia(h) },
    { label: "Racha actual", get: (h) => rachaHabito(h, hoy) }, { label: "Mejor racha", get: (h) => mejorRachaHabito(h) },
    { label: "% cumplimiento (30d)", get: (h) => porcentajeCumplimiento(h, 30) },
  ];

  // Resumen del día: cuenta solo los hábitos que aplican hoy según su frecuencia.
  const habitosHoy = data.habitos.filter((h) => aplicaHoy(h, hoy));
  const completadosHoy = habitosHoy.filter((h) => (h.fechas || []).includes(hoy)).length;
  const porcentajeHoy = habitosHoy.length ? Math.round((completadosHoy / habitosHoy.length) * 100) : 0;

  return (
    <div>
      <h2 className="gp-serif text-2xl mb-1">Hábitos</h2>
      <p className="text-sm gp-text-muted mb-3">Marca el día con un clic. La racha se calcula sola.</p>

      {habitosHoy.length > 0 && (
        <div className="gp-panel p-3 mb-4">
          <p className="text-sm mb-1.5">{completadosHoy} de {habitosHoy.length} hábito{habitosHoy.length === 1 ? "" : "s"} completado{completadosHoy === 1 ? "" : "s"} · {porcentajeHoy}%</p>
          <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: "var(--border)" }}>
            <div className="h-full rounded-full" style={{ width: `${porcentajeHoy}%`, background: "var(--teal)", transition: "width .2s" }} />
          </div>
        </div>
      )}

      <div className="mb-2"><OrdenSelector opciones={opcionesOrden} value={orden} onChange={setOrden} /></div>
      <BarraListaEstandar busqueda={busqueda} onBusqueda={setBusqueda} placeholder="Buscar hábito por nombre…"
        onExportExcel={() => exportarFilasExcel(listaHabitos, columnasExport, "habitos")}
        onExportPDF={() => exportarFilasPDF(listaHabitos, columnasExport, "habitos", "Hábitos", busqueda ? `búsqueda: "${busqueda}"` : "")} />

      <div className="flex flex-col sm:flex-row gap-2 mb-5">
        <input className="gp-input flex-1 sm:max-w-xs" placeholder="ej. Leer 20 min, Practicar inglés" value={nuevo} onChange={(e) => setNuevo(e.target.value)} onKeyDown={(e) => e.key === "Enter" && nuevo.trim() && (onAdd({ nombre: nuevo, fechas: [], frecuenciaTipo: "diario" }), setNuevo(""))} />
        <button className="gp-btn px-3 py-2 sm:py-0 text-sm" onClick={() => { if (nuevo.trim()) { onAdd({ nombre: nuevo, fechas: [], frecuenciaTipo: "diario" }); setNuevo(""); } }}>Agregar hábito</button>
      </div>

      <div className="space-y-2">
        {listaHabitos.map((h) => {
          const hechoHoy = (h.fechas || []).includes(hoy);
          const racha = rachaHabito(h, hoy);
          return (
            <div key={h.id} className="gp-panel p-3 flex items-center justify-between">
              <button onClick={() => toggleHoy(h)}
                className="w-7 h-7 rounded flex items-center justify-center shrink-0"
                style={{ background: hechoHoy ? "var(--teal)" : "transparent", border: "1px solid var(--border)" }}>
                {hechoHoy && <Check size={14} color="#12141c" />}
              </button>
              <button onClick={() => setDetalleDe(h)} className="flex-1 text-left px-3">
                <p className="text-sm">{h.nombre}</p>
                <p className="text-xs gp-text-muted">{textoFrecuencia(h)}</p>
              </button>
              <div className="flex items-center gap-3 shrink-0">
                <span className="text-xs gp-text-gold flex items-center gap-1"><Flame size={12} /> {racha === 0 ? "Sin racha" : `${racha} día${racha === 1 ? "" : "s"}`}</span>
                <IconBtn onClick={() => onRemove(h.id)}><Trash2 size={13} /></IconBtn>
              </div>
            </div>
          );
        })}
        {listaHabitos.length === 0 && <p className="text-sm gp-text-muted">{busqueda ? "Sin hábitos que coincidan con la búsqueda." : "Aún no tienes hábitos registrados."}</p>}
      </div>

      {detalleDe && (
        <Modal title={detalleDe.nombre} onClose={() => setDetalleDe(null)}>
          <HabitoDetalle
            habito={data.habitos.find((h) => h.id === detalleDe.id) || detalleDe}
            hoy={hoy}
            onToggleDia={(fecha) => {
              const h = data.habitos.find((x) => x.id === detalleDe.id);
              const hecho = (h.fechas || []).includes(fecha);
              const fechas = hecho ? h.fechas.filter((f) => f !== fecha) : [...(h.fechas || []), fecha];
              onEdit(h.id, { fechas });
            }}
            onSave={(cambios) => onEdit(detalleDe.id, cambios)}
          />
        </Modal>
      )}
    </div>
  );
}

// Detalle de un hábito: racha actual/mejor, % de cumplimiento, mini-calendario de los últimos 35
// días (tocable para corregir un día pasado) y edición de nombre/frecuencia.
function HabitoDetalle({ habito: h, hoy, onToggleDia, onSave }) {
  const [nombre, setNombre] = useState(h.nombre);
  const [frecuenciaTipo, setFrecuenciaTipo] = useState(h.frecuenciaTipo || "diario");
  const [diasSemana, setDiasSemana] = useState(h.frecuenciaDiasSemana || []);
  const [vecesSemana, setVecesSemana] = useState(h.frecuenciaVecesSemana || 3);

  const racha = rachaHabito(h, hoy);
  const mejor = mejorRachaHabito(h);
  const pct = porcentajeCumplimiento(h, 30);

  const dias35 = Array.from({ length: 35 }, (_, i) => {
    const d = new Date(hoy + "T00:00:00"); d.setDate(d.getDate() - (34 - i));
    return d.toISOString().slice(0, 10);
  });

  const toggleDiaSemana = (d) => setDiasSemana((prev) => (prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d].sort()));

  const guardarConfig = () => {
    const cambios = { nombre, frecuenciaTipo };
    if (frecuenciaTipo === "dias_semana") cambios.frecuenciaDiasSemana = diasSemana;
    if (frecuenciaTipo === "veces_semana") cambios.frecuenciaVecesSemana = Number(vecesSemana) || 1;
    onSave(cambios);
  };

  return (
    <div>
      <div className="grid grid-cols-3 gap-2 mb-4 text-center">
        <div className="gp-panel p-2"><p className="text-lg gp-mono gp-text-gold">{racha}</p><p className="text-xs gp-text-muted">{racha === 1 ? "día (racha actual)" : "días (racha actual)"}</p></div>
        <div className="gp-panel p-2"><p className="text-lg gp-mono">{mejor}</p><p className="text-xs gp-text-muted">mejor racha</p></div>
        <div className="gp-panel p-2"><p className="text-lg gp-mono">{pct}%</p><p className="text-xs gp-text-muted">cumplimiento (30d)</p></div>
      </div>

      <p className="text-xs gp-text-muted mb-1">Historial (últimos 35 días) — toca un día para corregirlo</p>
      <div className="grid grid-cols-7 gap-1 mb-4">
        {dias35.map((f) => {
          const hecho = (h.fechas || []).includes(f);
          const esHoy = f === hoy;
          return (
            <button key={f} onClick={() => onToggleDia(f)} title={f}
              className="aspect-square rounded flex items-center justify-center text-[10px]"
              style={{ background: hecho ? "var(--teal)" : "transparent", border: esHoy ? "1.5px solid var(--gold)" : "1px solid var(--border)", color: hecho ? "#12141c" : "var(--muted)" }}>
              {new Date(f + "T00:00:00").getDate()}
            </button>
          );
        })}
      </div>

      <div className="pt-3 border-t gp-border">
        <Field label="Nombre"><input className="gp-input" value={nombre} onChange={(e) => setNombre(e.target.value)} /></Field>
        <Field label="Frecuencia">
          <select className="gp-input" value={frecuenciaTipo} onChange={(e) => setFrecuenciaTipo(e.target.value)}>
            <option value="diario">Todos los días</option>
            <option value="dias_semana">Días específicos de la semana</option>
            <option value="veces_semana">X veces por semana</option>
          </select>
        </Field>
        {frecuenciaTipo === "dias_semana" && (
          <div className="flex gap-1.5 mb-3">
            {DIAS_SEMANA_CORTO.map((label, d) => (
              <button key={d} type="button" onClick={() => toggleDiaSemana(d)} title={DIAS_SEMANA_LARGO[d]}
                className="w-8 h-8 rounded-full text-xs"
                style={{ background: diasSemana.includes(d) ? "var(--gold)" : "transparent", color: diasSemana.includes(d) ? "#161822" : "var(--muted)", border: "1px solid var(--border)" }}>
                {label}
              </button>
            ))}
          </div>
        )}
        {frecuenciaTipo === "veces_semana" && (
          <Field label="Veces por semana"><input type="number" min="1" max="7" className="gp-input" value={vecesSemana} onChange={(e) => setVecesSemana(e.target.value)} /></Field>
        )}
        <button className="gp-btn w-full py-2 text-sm mt-1" onClick={guardarConfig}>Guardar cambios</button>
      </div>
    </div>
  );
}

/* ---------- Medicamentos ---------- */
const DIAS_SEMANA_LABELS = ["D", "L", "M", "M", "J", "V", "S"]; // 0=domingo … 6=sábado

function MedicamentoForm({ inicial, contactos, onSave, onCancel }) {
  const [form, setForm] = useState(inicial || {
    nombre: "", dosis: "", contactoId: null, horarios: ["08:00"], diasSemana: [0, 1, 2, 3, 4, 5, 6],
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
          <option value="">Yo</option>
          {(contactos || []).map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
        </select>
      </Field>

      <p className="text-xs gp-text-muted mb-1">Horarios de toma</p>
      <div className="space-y-1.5 mb-3">
        {form.horarios.map((h, i) => (
          <div key={i} className="flex items-center gap-2">
            <input type="time" className="gp-input" style={{ width: 140 }} value={h} onChange={(e) => cambiarHorario(i, e.target.value)} />
            {form.horarios.length > 1 && <IconBtn onClick={() => quitarHorario(i)}><Trash2 size={13} /></IconBtn>}
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

function Medicamentos({ data, onAdd, onEdit, onRemove }) {
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
            onCancel={() => setModal(null)}
            onSave={(vals) => { modal === "nuevo" ? onAdd(vals) : onEdit(modal.id, vals); setModal(null); }}
          />
        </Modal>
      )}
    </div>
  );
}

/* ---------- Salud ---------- */
function Salud({ data, onAdd, onEdit, onRemove, onUpdatePerfil }) {
  const [modal, setModal] = useState(null);
  const [tab, setTab] = useState("historial"); // "historial" | "tendencias"
  const [personaId, setPersonaId] = useState(null); // null = "Yo"; si no, id de un Contacto
  const [agregandoPersona, setAgregandoPersona] = useState(false);
  const [orden, setOrden] = useState("default");
  const [ordenDir, setOrdenDir] = useState("asc");
  const toggleOrden = (key) => { if (orden === key) setOrdenDir((d) => (d === "asc" ? "desc" : "asc")); else { setOrden(key); setOrdenDir("asc"); } };

  // Personas con seguimiento de Salud: "Yo" + cualquier Contacto que ya tenga al menos un
  // registro de Salud o un medicamento — nunca una ficha duplicada, siempre viene de Contactos.
  const idsConSeguimiento = [...new Set([
    ...data.salud.map((s) => s.contactoId).filter(Boolean),
    ...(data.medicamentos || []).map((m) => m.contactoId).filter(Boolean),
  ])];
  const nombreContacto = (id) => data.contactos.find((c) => c.id === id)?.nombre || "—";
  const personas = [{ id: null, nombre: "Yo" }, ...idsConSeguimiento.map((id) => ({ id, nombre: nombreContacto(id) }))];
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

  const toneCategoria = (cat) => (cat === "Normal" ? "teal" : cat === "Bajo peso" ? "gold" : cat === "Sobrepeso" ? "gold" : cat === "Obesidad" ? "red" : "muted");

  return (
    <div>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-1">
        <h2 className="gp-serif text-2xl">Salud</h2>
        <button onClick={() => setModal({ item: empty })} className="gp-btn flex items-center justify-center gap-1 px-3 py-1.5 text-sm w-full sm:w-auto"><Plus size={14} /> Registrar</button>
      </div>
      <p className="text-sm gp-text-muted mb-4">Peso, glucosa, presión arterial, colesterol, triglicéridos y tus estudios en PDF, todo en un mismo historial.</p>

      <div className="flex flex-wrap items-center gap-1 mb-4">
        {personas.map((p) => (
          <button key={p.id || "yo"} onClick={() => setPersonaId(p.id)} className={`text-xs px-3 py-1.5 rounded-full border ${personaId === p.id ? "gp-btn" : "gp-text-muted"}`}>{p.nombre}</button>
        ))}
        <button onClick={() => setAgregandoPersona(true)} className="text-xs px-3 py-1.5 rounded-full border gp-text-muted flex items-center gap-1"><Plus size={12} /> Otra persona</button>
      </div>
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

      <div className="flex gap-1 mb-4">
        {[{ key: "historial", label: "Historial" }, { key: "tendencias", label: "Tendencias" }].map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)} className={`text-xs px-3 py-1.5 rounded-full border ${tab === t.key ? "gp-btn" : "gp-text-muted"}`}>{t.label}</button>
        ))}
      </div>

      {tab === "tendencias" ? (
        <SaludTendencias salud={saludPersona} />
      ) : (
      <>
      <div className="gp-panel p-3 mb-4 flex flex-wrap items-center gap-3">
        <span className="text-xs gp-text-muted">Tu estatura (para calcular IMC):</span>
        <input type="number" className="gp-input" style={{ maxWidth: 100 }} value={altura}
          onChange={(e) => setAltura(e.target.value)}
          onBlur={() => onUpdatePerfil(personaId, { alturaCm: altura })} />
        <span className="text-xs gp-text-muted">cm</span>
        {!alturaCm && <span className="text-xs gp-text-gold">Captúrala para ver tu categoría de peso.</span>}
      </div>
      <div className="mb-5"><OrdenSelector opciones={opcionesOrden} value={orden} onChange={setOrden} /></div>

      <div className="gp-panel overflow-x-auto">
        <table className="gp-table">
          <thead><tr><Th label="Fecha" sortKey="fecha" orden={orden} ordenDir={ordenDir} onToggle={toggleOrden} /><Th label="Peso (kg)" sortKey="peso" orden={orden} ordenDir={ordenDir} onToggle={toggleOrden} /><th>IMC</th><th>Categoría</th><th>Glucosa</th><th>Presión</th><th>Colesterol</th><th>Triglicéridos</th><th>Estudio</th><th>Notas</th><th></th></tr></thead>
          <tbody>
            {ordenados.map((s) => {
              const imc = calcIMC(s.peso, alturaCm);
              const cat = categoriaIMC(imc);
              return (
                <tr key={s.id}>
                  <td className="gp-mono">{s.fecha}{s.hora ? <span className="gp-text-muted"> {s.hora.slice(0, 5)}</span> : ""}</td>
                  <td className="gp-mono">{s.peso || "—"}</td>
                  <td className="gp-mono">{imc ? imc.toFixed(1) : "—"}</td>
                  <td>{cat ? <Badge tone={toneCategoria(cat)}>{cat}</Badge> : "—"}</td>
                  <td className="gp-mono">{s.glucosa || "—"}</td>
                  <td className="gp-mono">{s.sistolica && s.diastolica ? `${s.sistolica}/${s.diastolica}` : "—"}</td>
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
            {ordenados.length === 0 && <tr><td colSpan={11} className="text-center gp-text-muted py-6">Sin registros de salud.</td></tr>}
          </tbody>
        </table>
      </div>
      </>
      )}

      {modal && (
        <Modal title={modal.item.id ? "Editar registro" : "Nuevo registro"} onClose={() => setModal(null)}>
          <SaludForm item={modal.item} onSave={(v) => { modal.item.id ? onEdit(modal.item.id, v) : onAdd(v); setModal(null); }} />
        </Modal>
      )}
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

// Una gráfica de línea para un indicador de Salud. Solo usa registros que SÍ tienen ese valor
// capturado (nunca interpola ni inventa puntos para rellenar huecos, tal como pide la secc. 27).
function GraficaSalud({ titulo, unidad, puntos, series }) {
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
            {series.map((s) => (
              <Line key={s.key} type="monotone" dataKey={s.key} name={s.label} stroke={s.color} strokeWidth={2} dot={{ r: 3 }} connectNulls={false} />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function SaludTendencias({ salud }) {
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

  return (
    <div>
      <div className="flex flex-wrap gap-1 mb-4">
        {PERIODOS_TENDENCIA.map((p) => (
          <button key={p.key} onClick={() => setPeriodo(p.key)} className={`text-xs px-2.5 py-1 rounded-full border ${periodo === p.key ? "gp-btn" : "gp-text-muted"}`}>{p.label}</button>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <GraficaSalud titulo="Peso" unidad="kg" puntos={puntosDe("peso")} series={[{ key: "peso", label: "Peso", color: "var(--teal)" }]} />
        <GraficaSalud titulo="Glucosa" unidad="mg/dL" puntos={puntosDe("glucosa")} series={[{ key: "glucosa", label: "Glucosa", color: "var(--gold)" }]} />
        <GraficaSalud titulo="Presión arterial" unidad="mmHg" puntos={puntosPresion}
          series={[{ key: "sistolica", label: "Sistólica", color: "var(--red)" }, { key: "diastolica", label: "Diastólica", color: "var(--teal)" }]} />
        <GraficaSalud titulo="Colesterol" unidad="mg/dL" puntos={puntosDe("colesterol")} series={[{ key: "colesterol", label: "Colesterol", color: "var(--gold)" }]} />
        <GraficaSalud titulo="Triglicéridos" unidad="mg/dL" puntos={puntosDe("trigliceridos")} series={[{ key: "trigliceridos", label: "Triglicéridos", color: "var(--red)" }]} />
      </div>
      <p className="text-xs gp-text-muted mt-3">Solo se muestran las mediciones que realmente capturaste — no se inventan ni interpolan valores para rellenar huecos.</p>
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
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Field label="Fecha"><input type="date" className="gp-input" value={v.fecha} onChange={(e) => setV({ ...v, fecha: e.target.value })} /></Field>
        <Field label="Hora"><input type="time" className="gp-input" value={v.hora || ""} onChange={(e) => setV({ ...v, hora: e.target.value })} /></Field>
        <Field label="Peso (kg)"><input type="number" className="gp-input" value={v.peso} onChange={(e) => setV({ ...v, peso: e.target.value })} /></Field>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="Glucosa (mg/dL)"><input type="number" className="gp-input" value={v.glucosa} onChange={(e) => setV({ ...v, glucosa: e.target.value })} /></Field>
        <Field label="Presión arterial (sistólica/diastólica)">
          <div className="flex items-center gap-2">
            <input type="number" placeholder="120" className="gp-input" value={v.sistolica || ""} onChange={(e) => setV({ ...v, sistolica: e.target.value })} />
            <span className="gp-text-muted">/</span>
            <input type="number" placeholder="80" className="gp-input" value={v.diastolica || ""} onChange={(e) => setV({ ...v, diastolica: e.target.value })} />
            <span className="text-xs gp-text-muted">mmHg</span>
          </div>
        </Field>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
function Apartados({ data, onAdd, onEdit, onRemove, onAportar, onRetirar }) {
  const [modal, setModal] = useState(null);
  const [aportarModal, setAportarModal] = useState(null); // { apartado }
  const [retirarModal, setRetirarModal] = useState(null); // { apartado }
  const [historialDe, setHistorialDe] = useState(null); // { apartado }
  const [orden, setOrden] = useState("default");
  const [busqueda, setBusqueda] = useState("");
  const empty = { nombre: "", proyectoId: "", montoObjetivo: "", montoActual: "0", fechaObjetivo: "", notas: "" };
  const nombreProyecto = (id) => data.proyectos.find((p) => p.id === id)?.nombre || "—";
  const pctAvance = (a) => { const obj = Number(a.montoObjetivo) || 0; const act = Number(a.montoActual) || 0; return obj ? Math.min(100, (act / obj) * 100) : 0; };
  const movimientosDe = (id) => (data.apartadosMovimientos || []).filter((m) => m.apartadoId === id).sort((a, b) => (b.fecha || "").localeCompare(a.fecha || ""));
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
  const buscados = filtrarPorBusqueda(data.apartados, busqueda, [(a) => a.nombre, (a) => a.notas, (a) => nombreProyecto(a.proyectoId)]);
  const listaApartados = ordenarLista(buscados, orden, camposOrden);
  const columnasExport = [
    { label: "Nombre", get: (a) => a.nombre }, { label: "Proyecto", get: (a) => nombreProyecto(a.proyectoId) },
    { label: "Monto objetivo", get: (a) => a.montoObjetivo }, { label: "Ahorrado", get: (a) => a.montoActual },
    { label: "% de avance", get: (a) => Math.round(pctAvance(a)) }, { label: "Fecha objetivo", get: (a) => a.fechaObjetivo },
    { label: "Notas", get: (a) => a.notas },
  ];

  return (
    <div>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-1">
        <h2 className="gp-serif text-2xl">Apartados</h2>
        <button onClick={() => setModal({ item: empty })} className="gp-btn flex items-center justify-center gap-1 px-3 py-1.5 text-sm w-full sm:w-auto"><Plus size={14} /> Nuevo</button>
      </div>
      <p className="text-sm gp-text-muted mb-3">Dinero apartado para un proyecto o una meta específica, como un viaje. Lo ahorrado se calcula solo, a partir de tus aportes y retiros.</p>
      <div className="mb-2"><OrdenSelector opciones={opcionesOrden} value={orden} onChange={setOrden} /></div>
      <BarraListaEstandar busqueda={busqueda} onBusqueda={setBusqueda} placeholder="Buscar por nombre, proyecto o notas…"
        onExportExcel={() => exportarFilasExcel(listaApartados, columnasExport, "apartados")}
        onExportPDF={() => exportarFilasPDF(listaApartados, columnasExport, "apartados", "Apartados", busqueda ? `búsqueda: "${busqueda}"` : "")} />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {listaApartados.map((a) => {
          const objetivo = Number(a.montoObjetivo) || 0;
          const actual = Number(a.montoActual) || 0;
          const pct = objetivo ? Math.min(100, (actual / objetivo) * 100) : 0;
          const completo = objetivo > 0 && actual >= objetivo;
          const faltante = Math.max(0, objetivo - actual);
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
                <p className="text-xs gp-text-muted mt-1">{completo ? "Meta alcanzada 🎉" : `Faltan ${fmtMoney(faltante)} · ${Math.round(pct)}%`}</p>
              </div>
              {a.notas && <p className="text-xs gp-text-muted mt-3">{a.notas}</p>}
              <div className="flex gap-2 mt-3">
                <button onClick={() => setAportarModal({ apartado: a })} className="gp-btn-ghost flex-1 py-1.5 text-xs">Apartar dinero</button>
                <button onClick={() => setRetirarModal({ apartado: a })} disabled={actual <= 0} className="gp-btn-ghost flex-1 py-1.5 text-xs disabled:opacity-40">Retirar dinero</button>
              </div>
              {movimientosDe(a.id).length > 0 && (
                <button onClick={() => setHistorialDe({ apartado: a })} className="text-xs gp-text-gold mt-2">Ver historial ({movimientosDe(a.id).length})</button>
              )}
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
      {aportarModal && (
        <Modal title={`Apartar dinero — ${aportarModal.apartado.nombre}`} onClose={() => setAportarModal(null)}>
          <AportarFondosForm
            apartado={aportarModal.apartado}
            onSave={(monto) => { onAportar(aportarModal.apartado, { monto }); setAportarModal(null); }}
          />
        </Modal>
      )}
      {retirarModal && (
        <Modal title={`Retirar dinero — ${retirarModal.apartado.nombre}`} onClose={() => setRetirarModal(null)}>
          <RetirarFondosForm
            apartado={retirarModal.apartado}
            proyectos={data.proyectos}
            onSave={(payload) => { onRetirar(retirarModal.apartado, payload); setRetirarModal(null); }}
          />
        </Modal>
      )}
      {historialDe && (
        <Modal title={`Historial — ${historialDe.apartado.nombre}`} onClose={() => setHistorialDe(null)}>
          <div className="space-y-2">
            {movimientosDe(historialDe.apartado.id).map((m) => (
              <div key={m.id} className="flex items-center justify-between text-sm gp-panel p-2.5">
                <div>
                  <Badge tone={m.tipo === "retiro" ? "red" : "teal"}>{m.tipo === "retiro" ? "Retiro" : "Aporte"}</Badge>
                  <span className="ml-2 gp-text-muted text-xs">{m.fecha}</span>
                  {m.concepto && <p className="text-xs gp-text-muted mt-1">{m.concepto}</p>}
                </div>
                <span className={`gp-mono ${m.tipo === "retiro" ? "gp-text-red" : "gp-text-teal"}`}>{m.tipo === "retiro" ? "−" : "+"}{fmtMoney(m.monto)}</span>
              </div>
            ))}
          </div>
        </Modal>
      )}
    </div>
  );
}

function AportarFondosForm({ apartado, onSave }) {
  const [monto, setMonto] = useState("");
  const actual = Number(apartado.montoActual) || 0;
  const montoNum = Number(monto) || 0;
  return (
    <div>
      <p className="text-xs gp-text-muted mb-3">Llevas {fmtMoney(actual)} de {fmtMoney(apartado.montoObjetivo)}.</p>
      <Field label="Cuánto vas a apartar"><MoneyInput autoFocus className="gp-input" value={monto} onChange={(val) => setMonto(val)} /></Field>
      <p className="text-xs gp-text-muted mb-3">Esto no se registra como gasto en Finanzas — es solo una transferencia interna hacia esta meta.</p>
      <button className="gp-btn w-full py-2 text-sm mt-2 disabled:opacity-40" disabled={!montoNum} onClick={() => onSave(montoNum)}>Apartar</button>
    </div>
  );
}

function RetirarFondosForm({ apartado, proyectos, onSave }) {
  const actual = Number(apartado.montoActual) || 0;
  const [monto, setMonto] = useState("");
  const [proyectoId, setProyectoId] = useState(apartado.proyectoId || "");
  const [concepto, setConcepto] = useState(`Fondos de "${apartado.nombre}"`);
  const montoNum = Number(monto) || 0;
  const excede = montoNum > actual;

  return (
    <div>
      <p className="text-xs gp-text-muted mb-3">Disponible en este apartado: <span className="gp-mono gp-text-gold">{fmtMoney(actual)}</span></p>
      <Field label="Cuánto vas a retirar"><MoneyInput autoFocus className="gp-input" value={monto} onChange={(val) => setMonto(val)} /></Field>
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
        onClick={() => onSave({ monto: montoNum, proyectoId, concepto })}
      >
        Retirar fondos
      </button>
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

/* ---------- Eventos (con fotos y videos) ---------- */
/* ---------- Citas (agenda ligera con hora y recordatorio push — distinta de Eventos/Actividades) ---------- */
function fechaHoraALocalInputs(iso) {
  if (!iso) return { fecha: todayISO(), hora: "09:00" };
  const d = new Date(iso);
  const pad = (n) => String(n).padStart(2, "0");
  return { fecha: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`, hora: `${pad(d.getHours())}:${pad(d.getMinutes())}` };
}
function localInputsAFechaHora(fecha, hora) {
  if (!fecha) return "";
  return new Date(`${fecha}T${hora || "09:00"}:00`).toISOString();
}
function fmtFechaHora(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("es-MX", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit", hour12: true });
}

// --- Agenda visual (día/semana) ---------------------------------------------------------------
// Muestra en una cuadrícula de horario las citas (bloques fijos, a su hora) y los pendientes con
// fecha límite en el rango visible (auto-acomodados en los huecos libres del día, respetando la
// jornada laboral configurable). No mueve ni cambia nada en Citas/Pendientes — solo los organiza
// visualmente aquí; si algo no cupo en el horario visible, se omite del dibujo pero sigue
// existiendo normal en su módulo.
const DIA_ISO_LABEL = { 1: "Lun", 2: "Mar", 3: "Mié", 4: "Jue", 5: "Vie", 6: "Sáb", 7: "Dom" };

function lunesDeSemana(fecha) {
  const d = new Date(fecha);
  const diaIso = d.getDay() === 0 ? 7 : d.getDay(); // 1=lunes..7=domingo
  d.setDate(d.getDate() - (diaIso - 1));
  d.setHours(0, 0, 0, 0);
  return d;
}
function sumarDias(fecha, n) {
  const d = new Date(fecha);
  d.setDate(d.getDate() + n);
  return d;
}
function dateStr(d) { return d.toISOString().slice(0, 10); }

function calcularBloquesAgenda({ dias, citas, pendientes, horaInicio, horasDiarias, comida }) {
  const bloquesPorDia = {};
  dias.forEach((d) => (bloquesPorDia[dateStr(d)] = []));

  // La comida se agrega primero como un bloque más (ocupado), así los pendientes automáticos
  // ya no se acomodan encima — se trata igual que una cita fija todos los días visibles.
  if (comida) {
    dias.forEach((d) => {
      const key = dateStr(d);
      bloquesPorDia[key].push({ tipo: "comida", inicio: comida.inicio, duracion: comida.duracion });
    });
  }

  citas.forEach((c) => {
    if (!c.fechaHora) return;
    const d = new Date(c.fechaHora);
    const key = dateStr(d);
    if (!bloquesPorDia[key]) return;
    const horaDecimal = d.getHours() + d.getMinutes() / 60;
    bloquesPorDia[key].push({ tipo: "cita", inicio: horaDecimal, duracion: 1, item: c });
  });

  const pendientesOrdenados = [...pendientes].sort((a, b) =>
    (PRIORIDAD_ORDEN[a.prioridad] ?? 1) - (PRIORIDAD_ORDEN[b.prioridad] ?? 1) ||
    (a.fechaLimite || "").localeCompare(b.fechaLimite || "")
  );
  const clavesDias = dias.map(dateStr);

  pendientesOrdenados.forEach((p) => {
    const duracion = Number(p.tiempoEstimado) > 0 ? Number(p.tiempoEstimado) : 1;
    let candidatos = clavesDias;
    if (p.fechaLimite && clavesDias.includes(p.fechaLimite)) {
      candidatos = [p.fechaLimite, ...clavesDias.filter((k) => k !== p.fechaLimite)];
    } else if (!p.fechaLimite) {
      return; // sin fecha límite: no se agenda automáticamente, sigue viviendo en Pendientes
    } else {
      return; // fecha límite fuera del rango visible
    }
    for (const key of candidatos) {
      const ocupados = bloquesPorDia[key].map((b) => [b.inicio, b.inicio + b.duracion]).sort((a, b) => a[0] - b[0]);
      let cursor = horaInicio;
      let cabe = false;
      for (const [ini, fin] of ocupados) {
        if (cursor + duracion <= ini) { cabe = true; break; }
        cursor = Math.max(cursor, fin);
      }
      if (!cabe && cursor + duracion <= horaInicio + horasDiarias) cabe = true;
      if (cabe) {
        bloquesPorDia[key].push({ tipo: "pendiente", inicio: cursor, duracion, item: p });
        bloquesPorDia[key].sort((a, b) => a.inicio - b.inicio);
        break;
      }
    }
  });

  return bloquesPorDia;
}

function Agenda({ data, onEditPendiente, onAddCita, misId }) {
  const [vista, setVista] = useState("semana"); // "dia" | "semana"
  const [base, setBase] = useState(() => new Date());
  const [config, setConfig] = useState({
    horasLaboralesDiarias: 8, horaInicioLaboral: "09:00", diasLaborales: [1, 2, 3, 4, 5],
    horaInicioComida: "", duracionComidaMin: 60,
  });
  const [configAbierta, setConfigAbierta] = useState(false);
  const [cargando, setCargando] = useState(true);
  const [modalAgregar, setModalAgregar] = useState(null); // null | "nueva" | "existente"
  // El acomodo automático de pendientes no corre solo — hay que confirmarlo con este botón cada
  // vez que se entra a la Agenda. Los que el usuario asigna a mano desde el "+" (pestaña "Desde
  // lo guardado") se muestran de inmediato sin esperar esa confirmación, porque elegirlos a mano
  // YA es la confirmación.
  const [acomodoConfirmado, setAcomodoConfirmado] = useState(false);
  const [idsManualesSesion, setIdsManualesSesion] = useState(() => new Set());

  useEffect(() => {
    (async () => {
      const { data: pref } = await supabase.from("preferencias")
        .select("horas_laborales_diarias, hora_inicio_laboral, dias_laborales, hora_inicio_comida, duracion_comida_min").eq("user_id", misId).maybeSingle();
      if (pref) {
        setConfig({
          horasLaboralesDiarias: Number(pref.horas_laborales_diarias) || 8,
          horaInicioLaboral: (pref.hora_inicio_laboral || "09:00").slice(0, 5),
          diasLaborales: pref.dias_laborales?.length ? pref.dias_laborales : [1, 2, 3, 4, 5],
          horaInicioComida: pref.hora_inicio_comida ? pref.hora_inicio_comida.slice(0, 5) : "",
          duracionComidaMin: pref.duracion_comida_min || 60,
        });
      }
      setCargando(false);
    })();
  }, [misId]);

  const guardarConfig = async (nuevo) => {
    setConfig(nuevo);
    await supabase.from("preferencias").upsert({
      user_id: misId,
      horas_laborales_diarias: nuevo.horasLaboralesDiarias,
      hora_inicio_laboral: nuevo.horaInicioLaboral,
      dias_laborales: nuevo.diasLaborales,
      hora_inicio_comida: nuevo.horaInicioComida || null,
      duracion_comida_min: nuevo.duracionComidaMin || null,
    }, { onConflict: "user_id" });
  };

  const lunes = lunesDeSemana(base);
  const diasVisibles = useMemo(() => {
    if (vista === "dia") return [new Date(base)];
    return [0, 1, 2, 3, 4, 5, 6].map((i) => sumarDias(lunes, i)).filter((d) => {
      const iso = d.getDay() === 0 ? 7 : d.getDay();
      return config.diasLaborales.includes(iso);
    });
  }, [vista, base, lunes, config.diasLaborales]);

  const horaInicioDec = useMemo(() => {
    const [h, m] = config.horaInicioLaboral.split(":").map(Number);
    return h + (m || 0) / 60;
  }, [config.horaInicioLaboral]);

  const comidaDec = useMemo(() => {
    if (!config.horaInicioComida) return null;
    const [h, m] = config.horaInicioComida.split(":").map(Number);
    return { inicio: h + (m || 0) / 60, duracion: (config.duracionComidaMin || 60) / 60 };
  }, [config.horaInicioComida, config.duracionComidaMin]);

  const rangoStr = { desde: dateStr(diasVisibles[0]), hasta: dateStr(diasVisibles[diasVisibles.length - 1]) };
  const citasEnRango = (data.citas || []).filter((c) => c.fechaHora && dateStr(new Date(c.fechaHora)) >= rangoStr.desde && dateStr(new Date(c.fechaHora)) <= rangoStr.hasta);
  const pendientesEnRango = (data.pendientes || []).filter((p) => p.fechaLimite && p.fechaLimite >= rangoStr.desde && p.fechaLimite <= rangoStr.hasta);
  const pendientesHechos = pendientesEnRango.filter((p) => p.estatus === "Completada");
  const pendientesPendientesDeAcomodo = pendientesEnRango.filter((p) => p.estatus !== "Completada" && !idsManualesSesion.has(p.id));
  const pendientesManuales = pendientesEnRango.filter((p) => p.estatus !== "Completada" && idsManualesSesion.has(p.id));
  // Lo que sí se manda a acomodar en el horario: los ya hechos (se quedan visibles siempre), los
  // que el usuario agregó a mano, y el resto SOLO si ya se confirmó el acomodo automático.
  const pendientesParaBloques = [
    ...pendientesHechos,
    ...pendientesManuales,
    ...(acomodoConfirmado ? pendientesPendientesDeAcomodo : []),
  ];

  const bloques = useMemo(() => calcularBloquesAgenda({
    dias: diasVisibles, citas: citasEnRango, pendientes: pendientesParaBloques,
    horaInicio: horaInicioDec, horasDiarias: config.horasLaboralesDiarias, comida: comidaDec,
  }), [diasVisibles, citasEnRango, pendientesParaBloques, horaInicioDec, config.horasLaboralesDiarias, comidaDec]);

  const alternarHecho = (p) => onEditPendiente(p.id, { estatus: p.estatus === "Completada" ? "Pendiente" : "Completada" });

  const asignarPendienteExistente = (id, fechaLimite) => {
    onEditPendiente(id, { fechaLimite });
    setIdsManualesSesion((prev) => new Set(prev).add(id));
    setModalAgregar(null);
  };

  const PX_POR_HORA = 56;
  const horas = Array.from({ length: Math.ceil(config.horasLaboralesDiarias) + 1 }, (_, i) => horaInicioDec + i);

  if (cargando) return <p className="text-sm gp-text-muted">Cargando tu agenda…</p>;

  return (
    <div>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <h1 className="text-2xl font-bold">Agenda</h1>
        <div className="flex items-center gap-2">
          <button className="gp-btn flex items-center gap-1 px-2.5 py-1.5 text-xs" onClick={() => setModalAgregar("nueva")}>
            <Plus size={14} /> Agregar
          </button>
          <button className="gp-btn-ghost px-2 py-1 text-xs rounded" onClick={() => setVista((v) => (v === "dia" ? "semana" : "dia"))}>
            {vista === "dia" ? "Ver semana" : "Ver día"}
          </button>
          <button className="gp-btn-ghost p-1.5 rounded" onClick={() => setBase((b) => sumarDias(b, vista === "dia" ? -1 : -7))}><ChevronLeft size={16} /></button>
          <button className="gp-btn-ghost px-2 py-1 text-xs rounded" onClick={() => setBase(new Date())}>Hoy</button>
          <button className="gp-btn-ghost p-1.5 rounded" onClick={() => setBase((b) => sumarDias(b, vista === "dia" ? 1 : 7))}><ChevronRight size={16} /></button>
          <button className="gp-btn-ghost p-1.5 rounded" onClick={() => setConfigAbierta(true)} title="Configurar jornada"><Settings size={16} /></button>
        </div>
      </div>

      {/* Barra de confirmación del acomodo automático — no se acomoda nada hasta que se presiona. */}
      {!acomodoConfirmado && pendientesPendientesDeAcomodo.length > 0 && (
        <div className="gp-panel-hi p-3 mb-4 text-sm flex items-center justify-between gap-3 flex-wrap">
          <span>Tienes {pendientesPendientesDeAcomodo.length} pendiente{pendientesPendientesDeAcomodo.length === 1 ? "" : "s"} con fecha en este rango que no se ha{pendientesPendientesDeAcomodo.length === 1 ? "" : "n"} acomodado en el horario todavía.</span>
          <button className="gp-btn px-3 py-1.5 text-xs shrink-0" onClick={() => setAcomodoConfirmado(true)}>Acomodar en huecos libres</button>
        </div>
      )}
      {acomodoConfirmado && (
        <div className="p-2 mb-4 text-xs gp-text-muted flex items-center justify-between gap-3 flex-wrap">
          <span>Los pendientes con fecha se están acomodando solos en los huecos libres.</span>
          <button className="gp-btn-ghost px-2 py-1 rounded" onClick={() => setAcomodoConfirmado(false)}>Quitar acomodo automático</button>
        </div>
      )}

      {modalAgregar && (
        <Modal title="Agregar a la Agenda" onClose={() => setModalAgregar(null)}>
          <div className="flex gap-1 mb-4">
            <button onClick={() => setModalAgregar("nueva")} className="flex-1 px-3 py-2 text-sm rounded"
              style={{ background: modalAgregar === "nueva" ? "var(--gold)" : "var(--panel-2)", color: modalAgregar === "nueva" ? "#0B2341" : "inherit" }}>
              Actividad nueva
            </button>
            <button onClick={() => setModalAgregar("existente")} className="flex-1 px-3 py-2 text-sm rounded"
              style={{ background: modalAgregar === "existente" ? "var(--gold)" : "var(--panel-2)", color: modalAgregar === "existente" ? "#0B2341" : "inherit" }}>
              Desde lo guardado
            </button>
          </div>
          {modalAgregar === "nueva" && (
            <CitaForm item={{ titulo: "", fechaHora: localInputsAFechaHora(todayISO(), "09:00"), lugar: "", contactoId: "", notas: "" }} contactos={data.contactos}
              onSave={(v) => { onAddCita({ ...v, id: uid() }); setModalAgregar(null); }} />
          )}
          {modalAgregar === "existente" && (
            <PendienteExistenteForm pendientes={(data.pendientes || []).filter((p) => p.estatus !== "Completada")} onAsignar={asignarPendienteExistente} />
          )}
        </Modal>
      )}

      {configAbierta && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,.6)" }} onClick={() => setConfigAbierta(false)}>
          <div className="gp-panel p-4 max-w-sm w-full" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-semibold mb-3">Configurar tu jornada</h3>
            <Field label="Horas laborales por día">
              <input type="number" min="1" max="16" step="0.5" className="gp-input" value={config.horasLaboralesDiarias}
                onChange={(e) => setConfig((c) => ({ ...c, horasLaboralesDiarias: Number(e.target.value) || 1 }))} />
            </Field>
            <Field label="Hora de inicio">
              <input type="time" className="gp-input" value={config.horaInicioLaboral}
                onChange={(e) => setConfig((c) => ({ ...c, horaInicioLaboral: e.target.value }))} />
            </Field>
            <Field label="Días laborales">
              <div className="flex gap-1 flex-wrap">
                {[1, 2, 3, 4, 5, 6, 7].map((iso) => (
                  <button key={iso} type="button"
                    onClick={() => setConfig((c) => ({ ...c, diasLaborales: c.diasLaborales.includes(iso) ? c.diasLaborales.filter((d) => d !== iso) : [...c.diasLaborales, iso].sort() }))}
                    className="px-2 py-1 rounded text-xs"
                    style={{ background: config.diasLaborales.includes(iso) ? "var(--gold)" : "var(--panel-2, rgba(255,255,255,.08))", color: config.diasLaborales.includes(iso) ? "#0B2341" : "inherit" }}>
                    {DIA_ISO_LABEL[iso]}
                  </button>
                ))}
              </div>
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Hora de comida (opcional)">
                <input type="time" className="gp-input" value={config.horaInicioComida}
                  onChange={(e) => setConfig((c) => ({ ...c, horaInicioComida: e.target.value }))} />
              </Field>
              <Field label="Duración (min)">
                <input type="number" min="15" step="15" className="gp-input" value={config.duracionComidaMin}
                  onChange={(e) => setConfig((c) => ({ ...c, duracionComidaMin: Number(e.target.value) || 60 }))} disabled={!config.horaInicioComida} />
              </Field>
            </div>
            {config.horaInicioComida && (
              <button type="button" className="text-xs gp-text-red mb-2" onClick={() => setConfig((c) => ({ ...c, horaInicioComida: "" }))}>Quitar horario de comida</button>
            )}
            <div className="flex gap-2 justify-end mt-2">
              <button className="gp-btn-ghost px-3 py-2 text-sm rounded" onClick={() => setConfigAbierta(false)}>Cancelar</button>
              <button className="gp-btn px-3 py-2 text-sm" onClick={() => { guardarConfig(config); setConfigAbierta(false); }}>Guardar</button>
            </div>
          </div>
        </div>
      )}

      <div className="gp-panel gp-hueso p-3 overflow-x-auto">
        <div className="flex" style={{ minWidth: vista === "semana" ? 720 : 320 }}>
          <div style={{ width: 44 }}>
            <div style={{ height: 28 }} />
            {horas.map((h) => (
              <div key={h} style={{ height: PX_POR_HORA }} className="text-[10px] gp-text-muted text-right pr-1 -mt-2">
                {String(Math.floor(h)).padStart(2, "0")}:{h % 1 ? "30" : "00"}
              </div>
            ))}
          </div>
          {diasVisibles.map((d) => {
            const key = dateStr(d);
            const esHoy = key === todayISO();
            return (
              <div key={key} className="flex-1" style={{ minWidth: vista === "semana" ? 96 : 280 }}>
                <div className="text-center text-xs mb-1 pb-1" style={{ height: 28, fontWeight: esHoy ? 700 : 400, color: esHoy ? "var(--gold)" : undefined }}>
                  {DIA_ISO_LABEL[d.getDay() === 0 ? 7 : d.getDay()]} {d.getDate()}
                </div>
                <div className="relative" style={{ height: PX_POR_HORA * config.horasLaboralesDiarias, borderLeft: "1px solid var(--border)" }}>
                  {horas.slice(0, -1).map((h) => (
                    <div key={h} style={{ position: "absolute", top: (h - horaInicioDec) * PX_POR_HORA, left: 0, right: 0, borderTop: "1px solid var(--border)" }} />
                  ))}
                  {(bloques[key] || []).map((b, i) => {
                    const hecho = b.tipo === "pendiente" && b.item.estatus === "Completada";
                    return (
                      <div key={i}
                        className="absolute rounded px-1.5 py-0.5 text-[11px] overflow-hidden"
                        style={{
                          top: (b.inicio - horaInicioDec) * PX_POR_HORA + 1,
                          height: Math.max(b.duracion * PX_POR_HORA - 2, 18),
                          left: 2, right: 2,
                          background: b.tipo === "cita" ? "var(--gold)" : b.tipo === "comida" ? "var(--border)" : hecho ? "var(--teal-tint)" : "var(--panel-2)",
                          color: b.tipo === "cita" ? "#0B2341" : hecho ? "var(--teal-text)" : "inherit",
                          border: b.tipo === "pendiente" ? `1px solid ${hecho ? "var(--teal)" : "var(--border)"}` : "none",
                          textDecoration: hecho ? "line-through" : "none",
                          opacity: b.tipo === "comida" ? 0.7 : 1,
                          cursor: b.tipo === "pendiente" ? "pointer" : "default",
                        }}
                        title={b.tipo === "cita" ? b.item.titulo : b.tipo === "comida" ? "Comida" : b.item.descripcion}
                        onClick={() => { if (b.tipo === "pendiente") alternarHecho(b.item); }}
                      >
                        <span className="font-medium">{b.tipo === "cita" ? b.item.titulo : b.tipo === "comida" ? "Comida" : b.item.descripcion}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <p className="text-xs gp-text-muted mt-2">Toca una tarea para marcarla hecha (se queda en verde) o para regresarla a pendiente. Lo que no cupo sigue en Tareas normal.</p>
    </div>
  );
}

// Elegir un pendiente que ya existe (guardado en el sistema) y asignarle cuándo va, sin salir
// de la Agenda ni tener que ir al módulo de Tareas.
function PendienteExistenteForm({ pendientes, onAsignar }) {
  const [pendienteId, setPendienteId] = useState("");
  const [fecha, setFecha] = useState(todayISO());
  return (
    <div>
      <Field label="Tarea guardada">
        <select className="gp-input" value={pendienteId} onChange={(e) => setPendienteId(e.target.value)}>
          <option value="">— elige una —</option>
          {pendientes.map((p) => <option key={p.id} value={p.id}>{p.descripcion}{p.fechaLimite ? ` (actual: ${p.fechaLimite})` : ""}</option>)}
        </select>
      </Field>
      {pendientes.length === 0 && <p className="text-xs gp-text-muted mb-2">No tienes tareas guardadas sin marcar como hechas.</p>}
      <Field label="Fecha en la que va">
        <input type="date" className="gp-input" value={fecha} onChange={(e) => setFecha(e.target.value)} />
      </Field>
      <button className="gp-btn w-full py-2 mt-2 text-sm" disabled={!pendienteId} onClick={() => onAsignar(pendienteId, fecha)}>
        Agregar a la Agenda
      </button>
    </div>
  );
}

function Citas({ data, onAdd, onEdit, onRemove, onCrearTarea }) {
  const [modal, setModal] = useState(null);
  const [busqueda, setBusqueda] = useState("");
  const empty = { titulo: "", fechaHora: localInputsAFechaHora(todayISO(), "09:00"), lugar: "", contactoId: "", notas: "" };
  const nombreContacto = (id) => data.contactos.find((c) => c.id === id)?.nombre || "—";
  const ahora = new Date();
  const citasBuscadas = filtrarPorBusqueda(data.citas, busqueda, [(c) => c.titulo, (c) => c.lugar, (c) => c.notas, (c) => nombreContacto(c.contactoId)]);
  const ordenadas = [...citasBuscadas].sort((a, b) => (a.fechaHora || "").localeCompare(b.fechaHora || ""));
  const proximas = ordenadas.filter((c) => new Date(c.fechaHora) >= ahora);
  const pasadas = ordenadas.filter((c) => new Date(c.fechaHora) < ahora).reverse();
  const [mostrarPasadas, setMostrarPasadas] = useState(false);
  const columnasExport = [
    { label: "Título", get: (c) => c.titulo }, { label: "Fecha y hora", get: (c) => fmtFechaHora(c.fechaHora) },
    { label: "Lugar", get: (c) => c.lugar }, { label: "Contacto", get: (c) => nombreContacto(c.contactoId) },
    { label: "Notas", get: (c) => c.notas },
  ];

  const Fila = (c) => {
    const esHoy = new Date(c.fechaHora).toDateString() === ahora.toDateString();
    return (
      <div key={c.id} className="gp-panel p-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium truncate">{c.titulo}</span>
            {esHoy && <Badge tone="gold">Hoy</Badge>}
          </div>
          <div className="flex items-center gap-3 flex-wrap mt-1 text-xs gp-text-muted">
            <span className="flex items-center gap-1"><Clock size={11} /> {fmtFechaHora(c.fechaHora)}</span>
            {c.lugar && <span className="flex items-center gap-1"><MapPin size={11} /> {c.lugar}</span>}
            {c.contactoId && <span>{nombreContacto(c.contactoId)}</span>}
          </div>
          {c.notas && <p className="text-xs gp-text-muted mt-1">{c.notas}</p>}
        </div>
        <div className="flex gap-1 shrink-0">
          <IconBtn onClick={() => setModal({ item: c })}><Pencil size={13} /></IconBtn>
          <IconBtn onClick={() => onRemove(c.id)}><Trash2 size={13} /></IconBtn>
        </div>
      </div>
    );
  };

  return (
    <div>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-1">
        <h2 className="gp-serif text-2xl">Citas</h2>
        <button onClick={() => setModal({ item: empty })} className="gp-btn flex items-center justify-center gap-1 px-3 py-1.5 text-sm w-full sm:w-auto"><Plus size={14} /> Nueva</button>
      </div>
      <p className="text-sm gp-text-muted mb-4">Agenda con hora y recordatorio push antes de la hora. Para shows de tu negocio usa Eventos; para bitácora personal, Actividades.</p>

      <BarraListaEstandar busqueda={busqueda} onBusqueda={setBusqueda} placeholder="Buscar por título, lugar o contacto…"
        onExportExcel={() => exportarFilasExcel(ordenadas, columnasExport, "citas")}
        onExportPDF={() => exportarFilasPDF(ordenadas, columnasExport, "citas", "Citas", busqueda ? `búsqueda: "${busqueda}"` : "")} />

      {proximas.length === 0 && <p className="text-sm gp-text-muted mb-4">No tienes citas próximas.</p>}
      <div className="space-y-2 mb-4">{proximas.map(Fila)}</div>

      {pasadas.length > 0 && (
        <div>
          <button onClick={() => setMostrarPasadas((v) => !v)} className="text-xs gp-text-muted flex items-center gap-1 mb-2">
            {mostrarPasadas ? <ChevronDown size={13} /> : <ChevronRight size={13} />} Citas pasadas ({pasadas.length})
          </button>
          {mostrarPasadas && <div className="space-y-2 opacity-60">{pasadas.map(Fila)}</div>}
        </div>
      )}

      {modal && !modal.paso && (
        <Modal title={modal.item.id ? "Editar cita" : "Nueva cita"} onClose={() => setModal(null)}>
          <CitaForm item={modal.item} contactos={data.contactos} onSave={(v) => {
            if (modal.item.id) { onEdit(modal.item.id, v); setModal(null); return; }
            const nuevoId = uid();
            onAdd({ ...v, id: nuevoId });
            setModal({ item: v, paso: "tarea", origenId: nuevoId });
          }} />
        </Modal>
      )}
      {modal && modal.paso === "tarea" && (
        <Modal title="Acción relacionada" onClose={() => setModal(null)}>
          <PromptTareaRelacionada
            origenTabla="citas" origenId={modal.origenId} proyectoId=""
            descripcionSugerida={`Preparar para: ${modal.item.titulo}`}
            fechaSugerida={modal.item.fechaHora ? modal.item.fechaHora.slice(0, 10) : ""}
            onCrear={(t) => { onCrearTarea(t); setModal(null); }}
            onOmitir={() => setModal(null)}
          />
        </Modal>
      )}
    </div>
  );
}

function CitaForm({ item, contactos, onSave }) {
  const inicial = fechaHoraALocalInputs(item.fechaHora);
  const [titulo, setTitulo] = useState(item.titulo || "");
  const [fecha, setFecha] = useState(inicial.fecha);
  const [hora, setHora] = useState(inicial.hora);
  const [lugar, setLugar] = useState(item.lugar || "");
  const [contactoId, setContactoId] = useState(item.contactoId || "");
  const [notas, setNotas] = useState(item.notas || "");
  const [error, setError] = useState("");

  return (
    <div>
      <Field label="Título"><input className="gp-input" value={titulo} onChange={(e) => setTitulo(e.target.value)} /></Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Fecha"><input type="date" className="gp-input" value={fecha} onChange={(e) => setFecha(e.target.value)} /></Field>
        <Field label="Hora"><input type="time" className="gp-input" value={hora} onChange={(e) => setHora(e.target.value)} /></Field>
      </div>
      <Field label="Lugar (opcional)"><input className="gp-input" value={lugar} onChange={(e) => setLugar(e.target.value)} /></Field>
      <Field label="Con quién (opcional)">
        <select className="gp-input" value={contactoId} onChange={(e) => setContactoId(e.target.value)}>
          <option value="">— sin contacto —</option>
          {contactos.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
        </select>
      </Field>
      <Field label="Notas (opcional)"><textarea className="gp-input" rows={2} value={notas} onChange={(e) => setNotas(e.target.value)} /></Field>
      {error && <p className="text-xs gp-text-red mb-2">{error}</p>}
      <button
        className="gp-btn w-full py-2 text-sm mt-1"
        onClick={() => {
          if (!titulo.trim()) { setError("Captura un título."); return; }
          if (!fecha) { setError("Elige una fecha."); return; }
          onSave({ titulo: titulo.trim(), fechaHora: localInputsAFechaHora(fecha, hora), lugar: lugar.trim(), contactoId, notas: notas.trim() });
        }}
      >
        Guardar
      </button>
    </div>
  );
}

// Config de la búsqueda global: qué ícono mostrar y a qué vista mandar al usuario por cada módulo.
// Deliberadamente NO incluye "comentarios", "saldoInicial" ni "patrimonioValuaciones": no tienen
// pantalla propia a la que navegar, así que un resultado ahí no le serviría de nada al usuario.
const ICONO_MODULO_BUSQUEDA = {
  proyectos: FolderKanban, pendientes: CheckSquare, equipo: Users, finanzas: Wallet,
  actividades: Activity, activos: Globe, metas: Target, contactos: Contact, redesMetricas: BarChart3,
  documentos: FileText, habitos: Flame, salud: HeartPulse, apartados: PiggyBank, eventos: Camera,
  regalos: Gift, facturas: Receipt, campanas: Megaphone, patrimonio: Gem, medicamentos: Pill,
  citas: CalendarClock, notas: StickyNote,
};
const KEY_TO_VIEW_BUSQUEDA = {
  proyectos: "proyectos", pendientes: "pendientes", equipo: "equipo", finanzas: "finanzas",
  actividades: "actividades", activos: "activos", metas: "metas", contactos: "contactos", redesMetricas: "redes",
  documentos: "documentos", habitos: "habitos", salud: "salud", apartados: "apartados", eventos: "eventos",
  regalos: "regalos", facturas: "facturas", campanas: "marketing", patrimonio: "patrimonio", medicamentos: "medicamentos",
  citas: "citas", notas: "notas",
};
function subtituloResultadoBusqueda(key, item) {
  switch (key) {
    case "finanzas": return `${item.tipo || ""} · ${item.monto ? fmtMoney(item.monto) : ""}`;
    case "citas": return fmtFechaHora(item.fechaHora);
    case "pendientes": return item.fechaLimite ? `Vence ${item.fechaLimite}` : "";
    case "contactos": return item.correo || item.telefono || "";
    case "notas": return (item.contenido || "").slice(0, 90);
    case "proyectos": return item.categoria || "";
    default: return "";
  }
}

// Búsqueda global: recorre TODO lo que ya está cargado en memoria (data) para la cuenta activa —
// no hace falta ir a la base de datos porque el usuario ya tiene todos sus módulos en el cliente.
function BusquedaGlobal({ data, onNavigate, onClose }) {
  const [q, setQ] = useState("");
  const qn = normalizarTexto(q);
  const resultados = useMemo(() => {
    if (!qn) return [];
    const out = [];
    for (const key of Object.keys(KEY_TO_VIEW_BUSQUEDA)) {
      for (const item of data[key] || []) {
        const coincide = Object.values(item).some((v) => typeof v === "string" && normalizarTexto(v).includes(qn));
        if (coincide) out.push({ key, item });
      }
      if (out.length > 80) break;
    }
    return out.slice(0, 60);
  }, [qn, data]);

  return (
    <div className="fixed inset-0 z-[90] flex items-start justify-center p-4" style={{ background: "rgba(0,0,0,.7)", paddingTop: "8vh" }} onClick={onClose}>
      <div className="gp-panel w-full max-w-xl p-4 flex flex-col" style={{ maxHeight: "78vh" }} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-2 mb-3 shrink-0">
          <Search size={16} className="gp-text-muted" />
          <input autoFocus className="gp-input flex-1" placeholder="Buscar en todo ARKEYONE… (proyectos, pendientes, notas, contactos, movimientos…)" value={q} onChange={(e) => setQ(e.target.value)} />
          <button onClick={onClose} className="gp-btn-ghost p-1.5 rounded shrink-0"><X size={16} /></button>
        </div>
        <div className="overflow-y-auto gp-scroll flex-1 space-y-1">
          {!qn && <p className="text-sm gp-text-muted text-center py-8">Busca en todos tus módulos a la vez, incluyendo Notas.</p>}
          {qn && resultados.length === 0 && <p className="text-sm gp-text-muted text-center py-8">Sin resultados para "{q}".</p>}
          {resultados.map(({ key, item }) => {
            const Icono = ICONO_MODULO_BUSQUEDA[key] || FileText;
            const sub = subtituloResultadoBusqueda(key, item);
            return (
              <button key={key + item.id} onClick={() => onNavigate(key, item)} className="w-full flex items-center gap-3 p-2.5 rounded gp-btn-ghost text-left">
                <Icono size={15} className="gp-text-muted shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm truncate">{labelFor(key, item)}</span>
                    <Badge tone="muted">{ETIQUETA_TABLA[key]}</Badge>
                  </div>
                  {sub && <p className="text-xs gp-text-muted truncate">{sub}</p>}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}


function Notas({ data, onAdd, onEdit, onRemove }) {
  const [modal, setModal] = useState(null);
  const [busqueda, setBusqueda] = useState("");
  const empty = { titulo: "", contenido: "" };

  const filtradas = filtrarPorBusqueda(data.notas, busqueda, [(n) => n.titulo, (n) => n.contenido])
    .slice()
    .sort((a, b) => (b.updatedAt || b.createdAt || "").localeCompare(a.updatedAt || a.createdAt || ""));

  const fmtFechaCorta = (iso) => iso ? new Date(iso).toLocaleDateString("es-MX", { day: "numeric", month: "short" }) : "";
  const columnasExport = [
    { label: "Título", get: (n) => n.titulo }, { label: "Contenido", get: (n) => n.contenido },
    { label: "Última edición", get: (n) => n.updatedAt || n.createdAt },
  ];

  return (
    <div>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-1">
        <h2 className="gp-serif text-2xl">Notas</h2>
        <button onClick={() => setModal({ item: empty })} className="gp-btn flex items-center justify-center gap-1 px-3 py-1.5 text-sm w-full sm:w-auto"><Plus size={14} /> Nueva</button>
      </div>
      <p className="text-sm gp-text-muted mb-4">Texto libre, sin ligar a ningún proyecto, tarea ni nada — para anotar cualquier cosa rápido.</p>

      <BarraListaEstandar busqueda={busqueda} onBusqueda={setBusqueda} placeholder="Buscar en tus notas…"
        onExportExcel={() => exportarFilasExcel(filtradas, columnasExport, "notas")}
        onExportPDF={() => exportarFilasPDF(filtradas, columnasExport, "notas", "Notas", busqueda ? `búsqueda: "${busqueda}"` : "")} />

      {filtradas.length === 0 && <p className="text-sm gp-text-muted text-center py-6">{busqueda ? "Sin resultados." : "Aún no tienes notas."}</p>}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {filtradas.map((n) => (
          <div key={n.id} onClick={() => setModal({ item: n })} className="gp-panel p-4 cursor-pointer flex flex-col" style={{ minHeight: 120 }}>
            <div className="flex items-start justify-between gap-2 mb-1">
              <span className="text-sm font-medium truncate">{n.titulo || "Sin título"}</span>
              <IconBtn onClick={(e) => { e.stopPropagation(); onRemove(n.id); }}><Trash2 size={13} /></IconBtn>
            </div>
            <p className="text-xs gp-text-muted flex-1" style={{ display: "-webkit-box", WebkitLineClamp: 5, WebkitBoxOrient: "vertical", overflow: "hidden", whiteSpace: "pre-wrap" }}>{n.contenido}</p>
            <p className="text-xs gp-text-muted mt-2" style={{ opacity: 0.7 }}>{fmtFechaCorta(n.updatedAt || n.createdAt)}</p>
          </div>
        ))}
      </div>

      {modal && (
        <Modal title={modal.item.id ? "Editar nota" : "Nueva nota"} onClose={() => setModal(null)}>
          <NotaForm item={modal.item} onSave={(v) => { modal.item.id ? onEdit(modal.item.id, v) : onAdd({ ...v, id: uid() }); setModal(null); }} />
        </Modal>
      )}
    </div>
  );
}

function NotaForm({ item, onSave }) {
  const [titulo, setTitulo] = useState(item.titulo || "");
  const [contenido, setContenido] = useState(item.contenido || "");
  return (
    <div>
      <Field label="Título (opcional)"><input className="gp-input" value={titulo} onChange={(e) => setTitulo(e.target.value)} /></Field>
      <Field label="Escribe lo que sea"><textarea className="gp-input" rows={8} value={contenido} onChange={(e) => setContenido(e.target.value)} autoFocus /></Field>
      <button className="gp-btn w-full py-2 text-sm mt-1" onClick={() => onSave({ titulo: titulo.trim(), contenido })}>
        Guardar
      </button>
    </div>
  );
}


// Etiquetas legibles de las herramientas que puede ejecutar el asistente, para mostrar un
// resumen corto de qué hizo (en vez del nombre técnico de la función).
const ETIQUETA_ACCION_ASISTENTE = {
  buscar_datos: "Buscó información",
  crear_nota: "Creó una nota",
  crear_idea_proyecto: "Creó una idea nueva",
  crear_pendiente: "Creó un pendiente",
  registrar_avance_proyecto: "Registró un avance",
  crear_movimiento: "Registró un movimiento",
  crear_cita: "Agendó una cita",
};
// A qué módulo de `data` (el estado local ya cargado en el navegador) pertenece cada
// herramienta de escritura del Asistente. Como el Asistente guarda directo en Supabase desde
// el servidor (Edge Function), el navegador no se entera solo — sin este mapeo, lo que crea
// el Asistente no aparecía en el resto de la app (Agenda, Pendientes, etc.) hasta recargar
// la página a mano.
const MODULO_POR_HERRAMIENTA_ASISTENTE = {
  crear_nota: "notas",
  crear_idea_proyecto: "proyectos",
  crear_pendiente: "pendientes",
  registrar_avance_proyecto: "comentarios",
  crear_movimiento: "finanzas",
  crear_cita: "citas",
};

function Asistente({ onDatosCreados }) {
  const [mensajes, setMensajes] = useState([]); // [{rol: "usuario"|"asistente", texto, acciones}]
  const [texto, setTexto] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [uso, setUso] = useState(null); // {consultas_usadas, limite_mes}
  const [error, setError] = useState("");
  const [escuchando, setEscuchando] = useState(false);
  const [lecturaAuto, setLecturaAuto] = useState(() => {
    try { return localStorage.getItem("arkeyone_asistente_voz") === "1"; } catch { return false; }
  });
  const [hablando, setHablando] = useState(false);
  const [cargandoHistorial, setCargandoHistorial] = useState(true);
  const [confirmarBorrado, setConfirmarBorrado] = useState(false);
  const finRef = useRef(null);
  const reconocimientoRef = useRef(null);

  // Carga el historial ya guardado (asistente_mensajes) al entrar a la pantalla — antes se
  // guardaba en la base pero nunca se volvía a mostrar, así que cada vez se veía vacío.
  useEffect(() => {
    (async () => {
      const { data: sesion } = await supabase.auth.getSession();
      const userId = sesion?.session?.user?.id;
      if (!userId) { setCargandoHistorial(false); return; }
      const { data, error } = await supabase.from("asistente_mensajes")
        .select("rol, contenido, acciones, created_at")
        .eq("user_id", userId).order("created_at", { ascending: true }).limit(200);
      if (!error && data) {
        setMensajes(data.map((m) => ({ rol: m.rol, texto: m.contenido, acciones: m.acciones || [] })));
      }
      setCargandoHistorial(false);
    })();
  }, []);

  const borrarConversacion = async () => {
    const { data: sesion } = await supabase.auth.getSession();
    const userId = sesion?.session?.user?.id;
    if (userId) await supabase.from("asistente_mensajes").delete().eq("user_id", userId);
    setMensajes([]);
    setConfirmarBorrado(false);
  };

  useEffect(() => { finRef.current?.scrollIntoView({ behavior: "smooth" }); }, [mensajes, enviando]);
  // Se detiene la voz si sales de la pantalla del Asistente a media lectura.
  useEffect(() => () => { try { window.speechSynthesis?.cancel(); } catch {} }, []);

  // Lectura en voz alta de las respuestas: usa la síntesis de voz del navegador (speechSynthesis),
  // que a diferencia del dictado SÍ funciona en Safari de iPhone, además de escritorio y Android.
  const VozDisponible = typeof window !== "undefined" && "speechSynthesis" in window;
  const hablar = (texto) => {
    if (!VozDisponible || !texto) return;
    try {
      window.speechSynthesis.cancel(); // corta cualquier lectura anterior antes de empezar una nueva
      const u = new SpeechSynthesisUtterance(texto);
      u.lang = "es-MX";
      u.onstart = () => setHablando(true);
      u.onend = () => setHablando(false);
      u.onerror = () => setHablando(false);
      window.speechSynthesis.speak(u);
    } catch { setHablando(false); }
  };
  const detenerVoz = () => { try { window.speechSynthesis?.cancel(); } catch {} setHablando(false); };
  const alternarLecturaAuto = () => {
    setLecturaAuto((v) => {
      const nuevo = !v;
      try { localStorage.setItem("arkeyone_asistente_voz", nuevo ? "1" : "0"); } catch {}
      if (!nuevo) detenerVoz();
      return nuevo;
    });
  };

  // Dictado por voz: usa el reconocimiento de voz del navegador (Web Speech API). Chrome/Edge
  // de escritorio y Android lo soportan bien; Safari de iOS NO lo soporta todavía (ni en la app
  // instalada ni en el navegador) — por eso el botón solo aparece si el navegador lo tiene. En
  // iPhone, el micrófono del teclado del sistema (junto a la barra espaciadora) sigue funcionando
  // igual para dictar en este mismo campo de texto.
  const ReconocimientoVoz = typeof window !== "undefined" && (window.SpeechRecognition || window.webkitSpeechRecognition);

  const alternarDictado = () => {
    if (!ReconocimientoVoz) return;
    if (escuchando) {
      reconocimientoRef.current?.stop();
      return;
    }
    const r = new ReconocimientoVoz();
    r.lang = "es-MX";
    r.interimResults = false;
    r.continuous = false;
    r.onresult = (e) => {
      const dicho = Array.from(e.results).map((res) => res[0].transcript).join(" ");
      setTexto((prev) => (prev ? prev.trim() + " " : "") + dicho.trim());
    };
    r.onerror = () => setEscuchando(false);
    r.onend = () => setEscuchando(false);
    reconocimientoRef.current = r;
    setEscuchando(true);
    r.start();
  };

  const enviar = async () => {
    const contenido = texto.trim();
    if (!contenido || enviando) return;
    setTexto("");
    setError("");
    setMensajes((prev) => [...prev, { rol: "usuario", texto: contenido }]);
    setEnviando(true);
    try {
      const { data: sesion } = await supabase.auth.getSession();
      const resp = await fetch(`${supabase.supabaseUrl}/functions/v1/asistente-ia`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${sesion.session.access_token}` },
        body: JSON.stringify({ mensaje: contenido }),
      });
      const json = await resp.json().catch(() => ({}));
      if (!resp.ok || json.error) {
        setError(json.error || "No se pudo contactar al asistente. Intenta de nuevo.");
        setMensajes((prev) => prev.slice(0, -1)); // quita el mensaje del usuario si ni siquiera se proceso
        return;
      }
      setMensajes((prev) => [...prev, { rol: "asistente", texto: json.respuesta, acciones: json.acciones || [] }]);
      if (lecturaAuto) hablar(json.respuesta);
      if (json.consultas_usadas != null) setUso({ consultas_usadas: json.consultas_usadas, limite_mes: json.limite_mes });
      // Si el Asistente creó o modificó algo (sin error), refrescamos esos módulos del lado
      // del cliente para que se vea de inmediato en Agenda/Pendientes/etc., sin recargar.
      const modulosTocados = [...new Set(
        (json.acciones || [])
          .filter((a) => !a.resultado?.error && MODULO_POR_HERRAMIENTA_ASISTENTE[a.herramienta])
          .map((a) => MODULO_POR_HERRAMIENTA_ASISTENTE[a.herramienta])
      )];
      if (modulosTocados.length > 0) onDatosCreados?.(modulosTocados);
    } catch (err) {
      console.error("Error al hablar con el asistente:", err);
      setError("No se pudo contactar al asistente. Revisa tu conexión.");
      setMensajes((prev) => prev.slice(0, -1));
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="flex flex-col" style={{ height: "calc(100vh - 160px)" }}>
      <div className="flex items-center justify-between mb-3">
        <h1 className="text-2xl font-bold flex items-center gap-2"><Sparkles size={22} className="gp-text-gold" /> Asistente</h1>
        <div className="flex items-center gap-3">
          {uso && (
            <span className="text-xs gp-text-muted">{uso.limite_mes - uso.consultas_usadas} de {uso.limite_mes} consultas restantes este mes</span>
          )}
          {VozDisponible && (
            <button
              onClick={alternarLecturaAuto}
              title={lecturaAuto ? "Dejar de leer las respuestas en voz alta" : "Leer las respuestas en voz alta"}
              className="gp-btn-ghost p-2 rounded"
              style={lecturaAuto ? { color: "var(--gold)" } : undefined}
            >
              {lecturaAuto ? <Volume2 size={18} /> : <VolumeX size={18} />}
            </button>
          )}
          {mensajes.length > 0 && (
            <button onClick={() => setConfirmarBorrado(true)} title="Borrar conversación" className="gp-btn-ghost p-2 rounded">
              <Trash2 size={18} />
            </button>
          )}
        </div>
      </div>

      {confirmarBorrado && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,.6)" }} onClick={() => setConfirmarBorrado(false)}>
          <div className="gp-panel p-4 max-w-sm w-full" onClick={(e) => e.stopPropagation()}>
            <p className="text-sm mb-4">¿Borrar toda la conversación con el Asistente? No se puede deshacer.</p>
            <div className="flex gap-2 justify-end">
              <button className="gp-btn-ghost px-3 py-2 text-sm rounded" onClick={() => setConfirmarBorrado(false)}>Cancelar</button>
              <button className="gp-btn px-3 py-2 text-sm" style={{ background: "#ef4444", color: "#fff" }} onClick={borrarConversacion}>Borrar</button>
            </div>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto gp-panel gp-hueso p-4 mb-3" style={{ minHeight: 0 }}>
        {cargandoHistorial && <p className="text-sm gp-text-muted">Cargando conversación…</p>}
        {!cargandoHistorial && mensajes.length === 0 && (
          <p className="text-sm gp-text-muted">
            Pregúntame lo que quieras sobre tus datos en ARKEYONE, o pídeme que guarde algo por ti — por ejemplo
            "guárdame una nota de que hoy quedamos en...", "crea una idea de...", o "agrégale un avance de 10% a ARKEYDATA".
          </p>
        )}
        {mensajes.map((m, i) => (
          <div key={i} className={`mb-3 flex ${m.rol === "usuario" ? "justify-end" : "justify-start"}`}>
            <div className="max-w-[85%] rounded-lg px-3 py-2 text-sm" style={{
              background: m.rol === "usuario" ? "var(--gold)" : "var(--panel-2, rgba(255,255,255,.06))",
              color: m.rol === "usuario" ? "#0B2341" : "inherit",
            }}>
              <div className="flex items-start gap-2">
                <p className="flex-1" style={{ whiteSpace: "pre-wrap" }}>{m.texto}</p>
                {m.rol === "asistente" && VozDisponible && (
                  <button
                    onClick={() => (hablando ? detenerVoz() : hablar(m.texto))}
                    title={hablando ? "Detener" : "Escuchar"}
                    className="shrink-0 opacity-60 hover:opacity-100"
                  >
                    {hablando ? <Square size={13} /> : <Volume2 size={13} />}
                  </button>
                )}
              </div>
              {m.acciones?.length > 0 && (
                <div className="mt-2 pt-2 flex flex-col gap-1" style={{ borderTop: "1px solid rgba(0,0,0,.15)" }}>
                  {m.acciones.map((a, j) => (
                    <span key={j} className="text-xs flex items-center gap-1 opacity-80">
                      <Check size={12} /> {ETIQUETA_ACCION_ASISTENTE[a.herramienta] || a.herramienta}
                      {a.resultado?.error ? ` — no se pudo (${a.resultado.error})` : ""}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
        {enviando && <p className="text-xs gp-text-muted">Pensando…</p>}
        {error && <p className="text-xs gp-text-red">{error}</p>}
        <div ref={finRef} />
      </div>

      <div className="flex gap-2">
        {ReconocimientoVoz && (
          <button
            className="gp-btn-ghost px-3 rounded"
            onClick={alternarDictado}
            title={escuchando ? "Detener dictado" : "Dictar por voz"}
            style={escuchando ? { color: "#ef4444" } : undefined}
          >
            <Mic size={18} className={escuchando ? "animate-pulse" : ""} />
          </button>
        )}
        <input
          className="gp-input flex-1"
          placeholder={escuchando ? "Escuchando…" : "Escribe tu mensaje…"}
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); enviar(); } }}
          disabled={enviando}
        />
        <button className="gp-btn px-4" onClick={enviar} disabled={enviando || !texto.trim()}>
          <Send size={16} />
        </button>
      </div>
    </div>
  );
}

function QuickCapture({ data, onAdd, onCrearRecordatorio, irAVista }) {
  const [abierto, setAbierto] = useState(false);
  const [tipo, setTipo] = useState(null); // "cita" | "contacto" | "idea" | "ingreso" | "egreso"

  // Posición libre: por default va abajo a la derecha, pero el usuario puede arrastrarlo a
  // donde quiera (ej. en el Asistente se encimaba con el botón de enviar del chat). Se guarda
  // en localStorage por dispositivo — cada quien lo deja donde le acomode.
  const [pos, setPos] = useState(() => {
    try {
      const guardada = localStorage.getItem("arkeyone_qc_pos");
      return guardada ? JSON.parse(guardada) : null; // null = posición default
    } catch { return null; }
  });
  const btnRef = useRef(null);
  const arrastreRef = useRef({ activo: false, movido: false, startX: 0, startY: 0, offsetX: 0, offsetY: 0 });

  const clamp = (x, y) => {
    const w = 52, h = 52, margen = 8;
    const maxX = window.innerWidth - w - margen;
    const maxY = window.innerHeight - h - margen;
    return { x: Math.min(Math.max(x, margen), maxX), y: Math.min(Math.max(y, margen), maxY) };
  };

  const onPointerDown = (e) => {
    const rect = btnRef.current.getBoundingClientRect();
    arrastreRef.current = {
      activo: true, movido: false, startX: e.clientX, startY: e.clientY,
      offsetX: e.clientX - rect.left, offsetY: e.clientY - rect.top,
    };
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch {}
  };
  const onPointerMove = (e) => {
    const a = arrastreRef.current;
    if (!a.activo) return;
    if (!a.movido && (Math.abs(e.clientX - a.startX) > 6 || Math.abs(e.clientY - a.startY) > 6)) a.movido = true;
    if (!a.movido) return;
    setPos(clamp(e.clientX - a.offsetX, e.clientY - a.offsetY));
  };
  const onPointerUp = () => {
    const a = arrastreRef.current;
    if (a.movido) {
      setPos((p) => {
        if (p) { try { localStorage.setItem("arkeyone_qc_pos", JSON.stringify(p)); } catch {} }
        return p;
      });
    } else {
      setAbierto((v) => !v); // fue un toque, no un arrastre: abre/cierra el menú como siempre
    }
    arrastreRef.current = { activo: false, movido: false, startX: 0, startY: 0, offsetX: 0, offsetY: 0 };
  };
  // Doble toque: regresa el botón a su posición default (abajo a la derecha), por si se pierde de vista.
  const alDobleToque = () => {
    setPos(null);
    try { localStorage.removeItem("arkeyone_qc_pos"); } catch {}
  };

  const OPCIONES = [
    { key: "glucosa", label: "Glucosa", icon: HeartPulse },
    { key: "presion", label: "Presión arterial", icon: HeartPulse },
    { key: "tarea", label: "Tarea", icon: CheckSquare },
    { key: "cita", label: "Cita", icon: CalendarClock },
    { key: "recordatorio", label: "Recordatorio", icon: Clock },
    { key: "nota", label: "Nota", icon: StickyNote },
    { key: "diario", label: "Diario", icon: Activity },
    { key: "contacto", label: "Contacto", icon: Contact },
    { key: "idea", label: "Idea", icon: Lightbulb },
    { key: "ingreso", label: "Ingreso", icon: Wallet },
    { key: "egreso", label: "Egreso", icon: Receipt },
  ];

  const cerrar = () => { setAbierto(false); setTipo(null); };

  const estiloContenedor = pos
    ? { position: "fixed", left: pos.x, top: pos.y, zIndex: 55 }
    : { position: "fixed", right: 20, bottom: "calc(env(safe-area-inset-bottom) + 20px)", zIndex: 55 };

  // El panel de opciones ya no depende de si el botón está a la izquierda/derecha/arriba/abajo
  // por CSS (eso era lo que lo hacía "perderse" en las esquinas). En vez de eso, cuando se abre
  // medimos la posición real del botón en pantalla (getBoundingClientRect) y calculamos dónde
  // poner el panel para que siempre quede completo dentro del área visible, sin importar en qué
  // esquina esté el rayo. Se recalcula también si cambia el tamaño de la ventana.
  const [panelEstilo, setPanelEstilo] = useState(null);
  useLayoutEffect(() => {
    if (!abierto) { setPanelEstilo(null); return; }
    const calcular = () => {
      const rect = btnRef.current?.getBoundingClientRect();
      if (!rect) return;
      const ANCHO_PANEL = 180, MARGEN = 8, HUECO = 8;
      let left = rect.right - ANCHO_PANEL; // alineado al borde derecho del botón por default
      left = Math.min(Math.max(left, MARGEN), window.innerWidth - ANCHO_PANEL - MARGEN);

      const espacioArriba = rect.top - MARGEN;
      const espacioAbajo = window.innerHeight - rect.bottom - MARGEN;
      const abrirAbajo = espacioAbajo >= espacioArriba;
      const alturaMax = Math.max(abrirAbajo ? espacioAbajo : espacioArriba, 120) - HUECO;

      setPanelEstilo({
        left,
        top: abrirAbajo ? rect.bottom + HUECO : undefined,
        bottom: abrirAbajo ? undefined : window.innerHeight - rect.top + HUECO,
        maxHeight: alturaMax,
      });
    };
    calcular();
    window.addEventListener("resize", calcular);
    return () => window.removeEventListener("resize", calcular);
  }, [abierto, pos]);

  const panel = abierto && panelEstilo && (
    <div
      className="p-2 flex flex-col gap-1 overflow-y-auto rounded-lg shadow-lg"
      style={{
        position: "fixed", left: panelEstilo.left, top: panelEstilo.top, bottom: panelEstilo.bottom,
        maxHeight: panelEstilo.maxHeight, width: 180, zIndex: 56,
        background: "var(--panel-hi)", border: "1.5px solid var(--gold)",
      }}
    >
      {OPCIONES.map((o) => (
        <button key={o.key} onClick={() => { setTipo(o.key); setAbierto(false); }} className="gp-btn-ghost flex items-center gap-2 px-3 py-2 text-sm rounded text-left">
          <o.icon size={15} /> {o.label}
        </button>
      ))}
    </div>
  );

  return (
    <>
      {/* Fondo invisible: al tocar cualquier otro lado de la pantalla con el menú abierto,
          se cierra solo (sin mover el botón de su lugar) y el ícono regresa al rayo normal. */}
      {abierto && (
        <div className="fixed inset-0" style={{ zIndex: 54 }} onClick={() => setAbierto(false)} />
      )}
      {panel}
      <div style={estiloContenedor}>
        <button
          ref={btnRef}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onDoubleClick={alDobleToque}
          title="Captura rápida — mantén presionado para moverlo, doble toque para regresarlo a su lugar"
          className="rounded-full flex items-center justify-center shadow-lg"
          style={{ width: 52, height: 52, background: "var(--gold)", color: "#0B2341", touchAction: "none" }}
        >
          {abierto ? <X size={22} /> : <Zap size={22} />}
        </button>
      </div>

      {tipo === "cita" && (
        <Modal title="Nueva cita" onClose={cerrar}>
          <CitaForm item={{ titulo: "", fechaHora: localInputsAFechaHora(todayISO(), "09:00"), lugar: "", contactoId: "", notas: "" }} contactos={data.contactos}
            onSave={(v) => { onAdd("citas", { ...v, id: uid() }); cerrar(); irAVista("citas"); }} />
        </Modal>
      )}
      {tipo === "nota" && (
        <Modal title="Nueva nota" onClose={cerrar}>
          <NotaForm item={{ titulo: "", contenido: "" }} onSave={(v) => { onAdd("notas", { ...v, id: uid() }); cerrar(); irAVista("notas"); }} />
        </Modal>
      )}
      {tipo === "contacto" && (
        <Modal title="Nuevo contacto" onClose={cerrar}>
          <ContactoRapidoForm onSave={(v) => { onAdd("contactos", { ...v, id: uid() }); cerrar(); irAVista("contactos"); }} />
        </Modal>
      )}
      {tipo === "idea" && (
        <Modal title="Nueva idea" onClose={cerrar}>
          <IdeaRapidaForm onSave={(v) => { onAdd("proyectos", { ...v, id: uid() }); cerrar(); irAVista("proyectos"); }} />
        </Modal>
      )}
      {(tipo === "ingreso" || tipo === "egreso") && (
        <Modal title={tipo === "ingreso" ? "Nuevo ingreso" : "Nuevo egreso"} onClose={cerrar}>
          <MovimientoRapidoForm tipoInicial={tipo === "ingreso" ? "Ingreso" : "Egreso"}
            onSave={(v) => { onAdd("finanzas", { ...v, id: uid() }); cerrar(); irAVista("finanzas"); }} />
        </Modal>
      )}
      {tipo === "glucosa" && (
        <Modal title="Registrar glucosa" onClose={cerrar}>
          <GlucosaRapidaForm onSave={(v) => { onAdd("salud", { ...v, id: uid() }); cerrar(); irAVista("salud"); }} />
        </Modal>
      )}
      {tipo === "presion" && (
        <Modal title="Registrar presión arterial" onClose={cerrar}>
          <PresionRapidaForm onSave={(v) => { onAdd("salud", { ...v, id: uid() }); cerrar(); irAVista("salud"); }} />
        </Modal>
      )}
      {tipo === "tarea" && (
        <Modal title="Nueva tarea" onClose={cerrar}>
          <TareaRapidaForm onSave={(v) => { onAdd("pendientes", { ...v, id: uid() }); cerrar(); irAVista("pendientes"); }} />
        </Modal>
      )}
      {tipo === "recordatorio" && (
        <Modal title="Nuevo recordatorio" onClose={cerrar}>
          <RecordatorioRapidoForm onSave={(v) => { onCrearRecordatorio(v); cerrar(); }} />
        </Modal>
      )}
      {tipo === "diario" && (
        <Modal title="Nueva entrada del diario" onClose={cerrar}>
          <DiarioRapidoForm onSave={(v) => { onAdd("actividades", { ...v, id: uid() }); cerrar(); irAVista("actividades"); }} />
        </Modal>
      )}
    </>
  );
}

function ContactoRapidoForm({ onSave }) {
  const [nombre, setNombre] = useState("");
  const [fechaNacimiento, setFechaNacimiento] = useState("");
  const [telefono, setTelefono] = useState("");
  const [error, setError] = useState("");
  return (
    <div>
      <Field label="Nombre"><input className="gp-input" value={nombre} onChange={(e) => setNombre(e.target.value)} /></Field>
      <Field label="Teléfono (opcional)"><input className="gp-input" value={telefono} onChange={(e) => setTelefono(e.target.value)} /></Field>
      <CumpleanosField value={fechaNacimiento} onChange={setFechaNacimiento} />
      {error && <p className="text-xs gp-text-red mb-2">{error}</p>}
      <button className="gp-btn w-full py-2 text-sm mt-1" onClick={() => {
        if (!nombre.trim()) { setError("Captura un nombre."); return; }
        onSave({ nombre: nombre.trim(), telefono: telefono.trim(), correo: "", empresa: "", categoria: "General", notas: "", fechaNacimiento });
      }}>
        Guardar (puedes agregar más datos después desde Contactos)
      </button>
    </div>
  );
}

function IdeaRapidaForm({ onSave }) {
  const [nombre, setNombre] = useState("");
  const [error, setError] = useState("");
  return (
    <div>
      <Field label="Nombre de la idea"><input className="gp-input" value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="ej. App para..." /></Field>
      {error && <p className="text-xs gp-text-red mb-2">{error}</p>}
      <button className="gp-btn w-full py-2 text-sm mt-1" onClick={() => {
        if (!nombre.trim()) { setError("Captura un nombre."); return; }
        onSave({
          nombre: nombre.trim(), categoria: "Software", estatus: "Idea", modo: "Finito", monetizacion: "Dinero",
          prioridad: "Media", fechaRevision: "", descripcion: "", githubSubido: false, github: "",
        });
      }}>
        Guardar (puedes completar los detalles después desde Proyectos e ideas)
      </button>
    </div>
  );
}

function MovimientoRapidoForm({ tipoInicial, onSave }) {
  const [concepto, setConcepto] = useState("");
  const [monto, setMonto] = useState("");
  const [tipo, setTipo] = useState(tipoInicial);
  const [error, setError] = useState("");
  return (
    <div>
      <Field label="Concepto"><input className="gp-input" value={concepto} onChange={(e) => setConcepto(e.target.value)} /></Field>
      <Field label="Monto"><input type="number" step="0.01" className="gp-input" value={monto} onChange={(e) => setMonto(e.target.value)} /></Field>
      <Field label="Tipo">
        <div className="flex gap-1">
          {["Ingreso", "Egreso"].map((t) => (
            <button key={t} onClick={() => setTipo(t)} className={`text-xs px-3 py-1.5 rounded-full border ${tipo === t ? "gp-btn" : "gp-text-muted"}`}>{t}</button>
          ))}
        </div>
      </Field>
      {error && <p className="text-xs gp-text-red mb-2">{error}</p>}
      <button className="gp-btn w-full py-2 text-sm mt-1" onClick={() => {
        if (!concepto.trim()) { setError("Captura un concepto."); return; }
        if (!monto || Number(monto) <= 0) { setError("Captura un monto válido."); return; }
        onSave({
          concepto: concepto.trim(), tipo, proyectoId: "", contactoId: "", fecha: todayISO(), fechaVencimiento: "",
          monto, categoria: "", forma: "Transferencia", estatus: "Cobrado", pautando: false, esRecurrente: false, frecuencia: "Mensual", fechaFin: "",
        });
      }}>
        Guardar (puedes agregar proyecto, categoría, etc. después desde Ingresos y egresos)
      </button>
    </div>
  );
}

function GlucosaRapidaForm({ onSave }) {
  const [valor, setValor] = useState("");
  const [fecha, setFecha] = useState(todayISO());
  const [hora, setHora] = useState(horaActualHHMM());
  const [error, setError] = useState("");
  return (
    <div>
      <Field label="Glucosa (mg/dL)"><input type="number" autoFocus className="gp-input" value={valor} onChange={(e) => setValor(e.target.value)} /></Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Fecha"><input type="date" className="gp-input" value={fecha} onChange={(e) => setFecha(e.target.value)} /></Field>
        <Field label="Hora"><input type="time" className="gp-input" value={hora} onChange={(e) => setHora(e.target.value)} /></Field>
      </div>
      {error && <p className="text-xs gp-text-red mb-2">{error}</p>}
      <button className="gp-btn w-full py-2 text-sm mt-1" onClick={() => {
        if (!valor) { setError("Captura el valor de glucosa."); return; }
        onSave({ fecha, hora, glucosa: valor, origen: "rapido" });
      }}>
        Guardar (queda en tu historial de Salud)
      </button>
    </div>
  );
}

function PresionRapidaForm({ onSave }) {
  const [sistolica, setSistolica] = useState("");
  const [diastolica, setDiastolica] = useState("");
  const [fecha, setFecha] = useState(todayISO());
  const [hora, setHora] = useState(horaActualHHMM());
  const [error, setError] = useState("");
  return (
    <div>
      <Field label="Presión arterial (mmHg)">
        <div className="flex items-center gap-2">
          <input type="number" autoFocus placeholder="Sistólica" className="gp-input" value={sistolica} onChange={(e) => setSistolica(e.target.value)} />
          <span className="gp-text-muted">/</span>
          <input type="number" placeholder="Diastólica" className="gp-input" value={diastolica} onChange={(e) => setDiastolica(e.target.value)} />
        </div>
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Fecha"><input type="date" className="gp-input" value={fecha} onChange={(e) => setFecha(e.target.value)} /></Field>
        <Field label="Hora"><input type="time" className="gp-input" value={hora} onChange={(e) => setHora(e.target.value)} /></Field>
      </div>
      {error && <p className="text-xs gp-text-red mb-2">{error}</p>}
      <button className="gp-btn w-full py-2 text-sm mt-1" onClick={() => {
        if (!sistolica || !diastolica) { setError("Captura ambos valores."); return; }
        onSave({ fecha, hora, sistolica, diastolica, origen: "rapido" });
      }}>
        Guardar (queda en tu historial de Salud)
      </button>
    </div>
  );
}

function TareaRapidaForm({ onSave }) {
  const [descripcion, setDescripcion] = useState("");
  const [fechaLimite, setFechaLimite] = useState(todayISO());
  const [error, setError] = useState("");
  return (
    <div>
      <Field label="Descripción"><input autoFocus className="gp-input" value={descripcion} onChange={(e) => setDescripcion(e.target.value)} /></Field>
      <Field label="Fecha límite"><input type="date" className="gp-input" value={fechaLimite} onChange={(e) => setFechaLimite(e.target.value)} /></Field>
      {error && <p className="text-xs gp-text-red mb-2">{error}</p>}
      <button className="gp-btn w-full py-2 text-sm mt-1" onClick={() => {
        if (!descripcion.trim()) { setError("Captura una descripción."); return; }
        onSave({ descripcion: descripcion.trim(), fechaLimite, estatus: "Pendiente", prioridad: "Media", proyectoId: "", responsableId: "", contactoId: "" });
      }}>
        Guardar (puedes agregar proyecto, prioridad, etc. después desde Tareas)
      </button>
    </div>
  );
}

function RecordatorioRapidoForm({ onSave }) {
  const [titulo, setTitulo] = useState("");
  const [fecha, setFecha] = useState(todayISO());
  const [hora, setHora] = useState(horaActualHHMM());
  const [error, setError] = useState("");
  return (
    <div>
      <Field label="¿Qué quieres recordar?"><input autoFocus className="gp-input" value={titulo} onChange={(e) => setTitulo(e.target.value)} /></Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Fecha"><input type="date" className="gp-input" value={fecha} onChange={(e) => setFecha(e.target.value)} /></Field>
        <Field label="Hora"><input type="time" className="gp-input" value={hora} onChange={(e) => setHora(e.target.value)} /></Field>
      </div>
      {error && <p className="text-xs gp-text-red mb-2">{error}</p>}
      <button className="gp-btn w-full py-2 text-sm mt-1" onClick={() => {
        if (!titulo.trim()) { setError("Captura qué quieres recordar."); return; }
        onSave({ titulo: titulo.trim(), fechaHora: localInputsAFechaHora(fecha, hora) });
      }}>
        Guardar recordatorio
      </button>
    </div>
  );
}

function DiarioRapidoForm({ onSave }) {
  const [nombre, setNombre] = useState("");
  const [fecha, setFecha] = useState(todayISO());
  const [error, setError] = useState("");
  return (
    <div>
      <Field label="¿Qué pasó hoy?"><textarea autoFocus rows={3} className="gp-input" value={nombre} onChange={(e) => setNombre(e.target.value)} /></Field>
      <Field label="Fecha"><input type="date" className="gp-input" value={fecha} onChange={(e) => setFecha(e.target.value)} /></Field>
      {error && <p className="text-xs gp-text-red mb-2">{error}</p>}
      <button className="gp-btn w-full py-2 text-sm mt-1" onClick={() => {
        if (!nombre.trim()) { setError("Escribe algo primero."); return; }
        onSave({ tipo: "Diario", nombre: nombre.trim(), fecha, proyectoId: "", ganancia: "", notas: "" });
      }}>
        Guardar (puedes editarlo después desde Diario)
      </button>
    </div>
  );
}

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

