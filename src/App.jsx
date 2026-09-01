import React, { useState, useEffect, useMemo } from "react";
import { supabase } from "./supabaseClient";
import {
  LayoutDashboard, FolderKanban, CheckSquare, Wallet, AlertTriangle,
  Users, Activity, Plus, X, Trash2, Pencil, Github, ChevronDown,
  ChevronRight, Bell, Lightbulb, Rocket, MessageCircle, Mail, Globe,
  Target, Contact, BarChart3, FileText, Flame, HeartPulse, Check, Menu, PieChart as PieChartIcon,
  PiggyBank, Camera, Film, Upload, MapPin, Clock,
} from "lucide-react";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  PieChart, Pie, Cell, LineChart, Line,
} from "recharts";

/* ---------- estilos y tokens ---------- */
const Tokens = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600&family=IBM+Plex+Sans:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap');
    .gp-root{ --bg:#12141c; --panel:#1a1d27; --panel-hi:#20232f; --border:#2b2f3d;
      --text:#e7e8ed; --muted:#8d92a3; --gold:#c9a227; --teal:#4fa88f; --red:#d1554a;
      background:var(--bg); color:var(--text); font-family:'IBM Plex Sans',sans-serif; }
    .gp-serif{ font-family:'Fraunces',serif; }
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

/* ---------- datos base ---------- */
const CATS = ["Fundación", "Software", "Música", "Renta", "Marketing", "Chatbots", "Personal", "Otro"];
const ESTATUS_PROYECTO = ["Idea", "En validación", "En desarrollo", "Activo", "Pausado", "Archivado"];
const MONETIZACION = ["Dinero", "Especie", "Intercambio", "No genera dinero"];
const PRIORIDADES = ["Alta", "Media", "Baja"];
const ESTATUS_TAREA = ["Pendiente", "En progreso", "Hecho"];
const TIPO_FIN = ["Ingreso", "Egreso"];
const FORMA_PAGO = ["Efectivo", "Transferencia", "Especie", "Intercambio"];
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

const uid = () => Math.random().toString(36).slice(2, 10);
const fmtMoney = (n) => (Number(n) || 0).toLocaleString("es-MX", { style: "currency", currency: "MXN" });
const todayISO = () => new Date().toISOString().slice(0, 10);
const daysUntil = (dateStr) => Math.ceil((new Date(dateStr) - new Date(todayISO())) / 86400000);
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
const TABLES = ["proyectos", "pendientes", "equipo", "finanzas", "deudas", "actividades", "activos", "metas", "contactos", "redesMetricas", "documentos", "habitos", "salud", "pagosRecurrentes", "apartados", "eventos"];
const OLD_STORAGE_KEY = "gestion_personal_data"; // localStorage, versión muy vieja
const OLD_BLOB_TABLE = "gestion_data"; // tabla única jsonb, versión anterior a este modelo relacional

const camelToSnake = (s) => s.replace(/[A-Z]/g, (c) => "_" + c.toLowerCase());
const snakeToCamel = (s) => s.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
const tableName = (key) => camelToSnake(key);

function rowToJs(row) {
  const out = {};
  for (const [k, v] of Object.entries(row)) {
    if (k === "created_at") continue;
    out[snakeToCamel(k)] = v;
  }
  return out;
}
function jsToRow(obj) {
  const out = {};
  for (const [k, v] of Object.entries(obj)) out[camelToSnake(k)] = v;
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

async function fetchTable(key) {
  const { data, error } = await supabase.from(tableName(key)).select("*").order("created_at", { ascending: true });
  if (error) { console.error(`Error al leer ${tableName(key)}:`, error); return []; }
  return data.map((row) => fromRow(key, row));
}

async function loadAllTables() {
  const entries = await Promise.all(TABLES.map(async (key) => [key, await fetchTable(key)]));
  const result = Object.fromEntries(entries);
  const { data: perfilRow } = await supabase.from("perfil_salud").select("*").eq("id", "main").maybeSingle();
  result.perfilSalud = { alturaCm: perfilRow?.altura_cm ?? "" };
  return result;
}

// migración única desde la versión anterior (un solo blob jsonb), solo si las tablas nuevas están vacías
async function migrateFromOldBlobIfNeeded(current) {
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
      await supabase.from("perfil_salud").upsert({ id: "main", altura_cm: blob.perfilSalud.alturaCm });
    }
    return await loadAllTables();
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

function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,.55)" }} onClick={onClose}>
      <div className="gp-panel w-full max-w-lg max-h-[85vh] overflow-y-auto gp-scroll p-5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="gp-serif text-lg">{title}</h3>
          <IconBtn onClick={onClose}><X size={16} /></IconBtn>
        </div>
        {children}
      </div>
    </div>
  );
}

/* ---------- login ---------- */
function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) setError("Correo o contraseña incorrectos.");
  };

  return (
    <div className="gp-root flex items-center justify-center" style={{ minHeight: "100vh" }}>
      <Tokens />
      <form onSubmit={handleSubmit} className="gp-panel p-6 w-full max-w-sm">
        <p className="gp-serif text-xl mb-1">Centro de mando</p>
        <p className="text-xs gp-text-muted mb-5">Inicia sesión para entrar a tu sistema.</p>
        <Field label="Correo"><input type="email" required className="gp-input" value={email} onChange={(e) => setEmail(e.target.value)} /></Field>
        <Field label="Contraseña"><input type="password" required className="gp-input" value={password} onChange={(e) => setPassword(e.target.value)} /></Field>
        {error && <p className="text-xs gp-text-red mb-3">{error}</p>}
        <button type="submit" disabled={loading} className="gp-btn w-full py-2 text-sm mt-1">{loading ? "Entrando…" : "Entrar"}</button>
      </form>
    </div>
  );
}

/* ---------- app (portero de sesión) ---------- */
export default function App() {
  const [session, setSession] = useState(undefined); // undefined = cargando, null = sin sesión

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => setSession(newSession));
    return () => listener.subscription.unsubscribe();
  }, []);

  if (session === undefined) {
    return (
      <div className="gp-root min-h-[500px] flex items-center justify-center rounded-lg">
        <Tokens />
        <p className="gp-text-muted text-sm">Cargando…</p>
      </div>
    );
  }
  if (!session) return <LoginScreen />;
  return <AppLoggedIn />;
}

function AppLoggedIn() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState("dashboard");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null); // { key, id, label }

  useEffect(() => {
    (async () => {
      let result = await loadAllTables();
      result = await migrateFromOldBlobIfNeeded(result);
      const allEmpty = TABLES.every((k) => result[k].length === 0);
      if (allEmpty) {
        // instalación nueva: siembra los proyectos conocidos
        for (const p of seed().proyectos) {
          const { error } = await supabase.from("proyectos").insert(jsToRow(p));
          if (error) console.error("Error al sembrar proyecto:", error);
        }
        result = await loadAllTables();
      }
      setData(result);
      setLoading(false);
    })();
  }, []);

  const addItem = async (key, item) => {
    const newItem = { ...item, id: uid() };
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
    const { error } = await supabase.from(tableName(key)).delete().eq("id", id);
    if (error) { console.error(`Error al borrar en ${tableName(key)}:`, error); alert("No se pudo borrar."); return; }
    setData((prev) => ({ ...prev, [key]: prev[key].filter((i) => i.id !== id) }));
  };
  const askDelete = (key, id) => setConfirmDelete({ key, id });
  const updatePerfilSalud = async (patch) => {
    const { error } = await supabase.from("perfil_salud").upsert({ id: "main", altura_cm: patch.alturaCm || null });
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
      <div className="gp-root min-h-[500px] flex items-center justify-center rounded-lg">
        <Tokens />
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
      { id: "reportes", label: "Reportes", icon: PieChartIcon },
      { id: "deudas", label: "Deudas", icon: AlertTriangle },
      { id: "apartados", label: "Apartados", icon: PiggyBank },
      { id: "activos", label: "Activos digitales", icon: Globe },
      { id: "documentos", label: "Legal y contratos", icon: FileText },
    ]},
    { label: "Gente", items: [
      { id: "equipo", label: "Equipo", icon: Users },
      { id: "contactos", label: "Contactos", icon: Contact },
    ]},
    { label: "Presencia", items: [
      { id: "redes", label: "Redes sociales", icon: BarChart3 },
    ]},
    { label: "Vida", items: [
      { id: "actividades", label: "Actividades y vida", icon: Activity },
      { id: "eventos", label: "Eventos", icon: Camera },
      { id: "habitos", label: "Hábitos", icon: Flame },
      { id: "salud", label: "Salud", icon: HeartPulse },
    ]},
  ];

  return (
    <div className="gp-root overflow-hidden" style={{ minHeight: "100vh" }}>
      <Tokens />
      <div className="flex relative" style={{ minHeight: "100vh" }}>
        {/* barra superior solo en móvil */}
        <div className="md:hidden fixed top-0 left-0 right-0 z-30 flex items-center justify-between px-4 py-3 border-b gp-border" style={{ background: "var(--bg)" }}>
          <button onClick={() => setMobileNavOpen(true)} className="p-2 -ml-2 gp-btn-ghost rounded" aria-label="Abrir menú">
            <Menu size={20} />
          </button>
          <p className="gp-serif text-base">Centro de mando</p>
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
              <p className="gp-serif text-lg leading-tight">Centro de mando</p>
              <p className="text-xs gp-text-muted">Angel Rey</p>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => supabase.auth.signOut()} title="Cerrar sesión" className="text-xs gp-text-muted gp-btn-ghost px-2 py-1 rounded hidden md:inline-block">Salir</button>
              <button onClick={() => setMobileNavOpen(false)} className="md:hidden p-1 gp-btn-ghost rounded" aria-label="Cerrar menú"><X size={16} /></button>
            </div>
          </div>
          {navGroups.map((g) => (
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
        </div>

        {/* contenido */}
        <div className="flex-1 p-4 pt-16 md:p-6 md:pt-6 overflow-y-auto gp-scroll w-full" style={{ maxHeight: "100vh" }}>
          {view === "dashboard" && <Dashboard data={data} setView={setView} />}
          {view === "proyectos" && (
            <Proyectos data={data} onAdd={(i) => addItem("proyectos", i)} onEdit={(id, p) => editItem("proyectos", id, p)} onRemove={(id) => askDelete("proyectos", id)} />
          )}
          {view === "metas" && (
            <Metas data={data} onAdd={(i) => addItem("metas", i)} onEdit={(id, p) => editItem("metas", id, p)} onRemove={(id) => askDelete("metas", id)} />
          )}
          {view === "pendientes" && (
            <Pendientes data={data} onAdd={(i) => addItem("pendientes", i)} onEdit={(id, p) => editItem("pendientes", id, p)} onRemove={(id) => askDelete("pendientes", id)} />
          )}
          {view === "finanzas" && (
            <Finanzas data={data} onAdd={(i) => addItem("finanzas", i)} onEdit={(id, p) => editItem("finanzas", id, p)} onRemove={(id) => askDelete("finanzas", id)} />
          )}
          {view === "reportes" && <Reportes data={data} />}
          {view === "deudas" && (
            <Deudas data={data} onAdd={(i) => addItem("deudas", i)} onEdit={(id, p) => editItem("deudas", id, p)} onRemove={(id) => askDelete("deudas", id)} />
          )}
          {view === "apartados" && (
            <Apartados data={data} onAdd={(i) => addItem("apartados", i)} onEdit={(id, p) => editItem("apartados", id, p)} onRemove={(id) => askDelete("apartados", id)} onMoverFondos={moverFondosApartado} />
          )}
          {view === "documentos" && (
            <Documentos data={data} onAdd={(i) => addItem("documentos", i)} onEdit={(id, p) => editItem("documentos", id, p)} onRemove={(id) => askDelete("documentos", id)} />
          )}
          {view === "equipo" && (
            <Equipo data={data} onAdd={(i) => addItem("equipo", i)} onEdit={(id, p) => editItem("equipo", id, p)} onRemove={(id) => askDelete("equipo", id)} />
          )}
          {view === "contactos" && (
            <Contactos data={data} onAdd={(i) => addItem("contactos", i)} onEdit={(id, p) => editItem("contactos", id, p)} onRemove={(id) => askDelete("contactos", id)} />
          )}
          {view === "redes" && (
            <RedesSociales data={data} onAdd={(i) => addItem("redesMetricas", i)} onEdit={(id, p) => editItem("redesMetricas", id, p)} onRemove={(id) => askDelete("redesMetricas", id)} />
          )}
          {view === "actividades" && (
            <Actividades data={data} onAdd={(i) => addItem("actividades", i)} onEdit={(id, p) => editItem("actividades", id, p)} onRemove={(id) => askDelete("actividades", id)} />
          )}
          {view === "eventos" && (
            <Eventos data={data} onAdd={(i) => addItem("eventos", i)} onEdit={(id, p) => editItem("eventos", id, p)} onRemove={(id) => askDelete("eventos", id)} />
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
function Dashboard({ data, setView }) {
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

function Stat({ label, value, tone }) {
  return (
    <div className="gp-panel p-4">
      <p className="text-xs gp-text-muted mb-1">{label}</p>
      <p className={`gp-serif text-2xl ${tone === "teal" ? "gp-text-teal" : tone === "red" ? "gp-text-red" : ""}`}>{value}</p>
    </div>
  );
}

/* ---------- Proyectos ---------- */
function Proyectos({ data, onAdd, onEdit, onRemove }) {
  const [modal, setModal] = useState(null);
  const [expanded, setExpanded] = useState(null);
  const [notaTexto, setNotaTexto] = useState("");

  const empty = { nombre: "", categoria: CATS[0], estatus: "Idea", monetizacion: MONETIZACION[0], descripcion: "", github: "", githubSubido: false, notas: [] };

  const grouped = ESTATUS_PROYECTO.map((e) => ({ estatus: e, items: data.proyectos.filter((p) => p.estatus === e) }));

  const addNota = (proyecto) => {
    if (!notaTexto.trim()) return;
    onEdit(proyecto.id, { notas: [...(proyecto.notas || []), { id: uid(), fecha: todayISO(), texto: notaTexto }] });
    setNotaTexto("");
  };

  return (
    <div>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-1">
        <h2 className="gp-serif text-2xl">Proyectos e ideas</h2>
        <button onClick={() => setModal({ item: empty })} className="gp-btn flex items-center justify-center gap-1 px-3 py-1.5 text-sm w-full sm:w-auto"><Plus size={14} /> Nuevo</button>
      </div>
      <p className="text-sm gp-text-muted mb-6">De idea a proyecto activo — edita el estatus cuando avance.</p>

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
                        <Badge tone={p.monetizacion === "No genera dinero" ? "muted" : "gold"}>{p.monetizacion}</Badge>
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
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs gp-text-muted mb-3">
                        <label className="flex items-center gap-1.5">
                          <input type="checkbox" checked={p.githubSubido} onChange={(e) => onEdit(p.id, { githubSubido: e.target.checked })} />
                          Subido a GitHub
                        </label>
                        <input placeholder="link del repo (opcional)" value={p.github || ""} onChange={(e) => onEdit(p.id, { github: e.target.value })} className="gp-input flex-1" style={{ minWidth: 160, maxWidth: 280 }} />
                      </div>
                      <p className="text-xs font-medium mb-2 gp-text-muted">Bitácora de avances</p>
                      <div className="space-y-1.5 mb-2 max-h-40 overflow-y-auto gp-scroll">
                        {(p.notas || []).slice().reverse().map((n) => (
                          <div key={n.id} className="text-xs flex gap-2"><span className="gp-mono gp-text-muted shrink-0">{n.fecha}</span><span>{n.texto}</span></div>
                        ))}
                        {(!p.notas || p.notas.length === 0) && <p className="text-xs gp-text-muted">Sin comentarios todavía.</p>}
                      </div>
                      <div className="flex gap-2">
                        <input className="gp-input" placeholder="Agregar avance o comentario…" value={expanded === p.id ? notaTexto : ""} onChange={(e) => setNotaTexto(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addNota(p)} />
                        <button className="gp-btn-ghost px-3 text-xs" onClick={() => addNota(p)}>Agregar</button>
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
      <Field label="Cómo genera valor"><select className="gp-input" value={v.monetizacion} onChange={(e) => setV({ ...v, monetizacion: e.target.value })}>{MONETIZACION.map((c) => <option key={c}>{c}</option>)}</select></Field>
      <Field label="Descripción"><textarea className="gp-input" rows={3} value={v.descripcion} onChange={(e) => setV({ ...v, descripcion: e.target.value })} /></Field>
      {error && <p className="text-xs gp-text-red mb-2">{error}</p>}

      <button className="gp-btn w-full py-2 text-sm mt-2" onClick={() => { if (!v.nombre?.toString().trim()) { setError("El nombre del proyecto es obligatorio."); return; } setError(""); onSave(v); }}>Guardar</button>
    </div>
  );
}

/* ---------- Pendientes ---------- */
function Pendientes({ data, onAdd, onEdit, onRemove }) {
  const [modal, setModal] = useState(null);
  const empty = { proyectoId: "", descripcion: "", fechaLimite: todayISO(), prioridad: "Media", estatus: "Pendiente", responsableId: "", contactoId: "", precio: "" };
  const ordenados = [...data.pendientes].sort((a, b) => (a.fechaLimite || "").localeCompare(b.fechaLimite || ""));

  const nombreProyecto = (id) => data.proyectos.find((p) => p.id === id)?.nombre || "—";
  const nombreResp = (id) => data.equipo.find((e) => e.id === id)?.nombre || "Tú";
  const nombreCliente = (id) => data.contactos.find((c) => c.id === id)?.nombre || "—";

  return (
    <div>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-1">
        <h2 className="gp-serif text-2xl">Pendientes</h2>
        <button onClick={() => setModal({ item: empty })} className="gp-btn flex items-center justify-center gap-1 px-3 py-1.5 text-sm w-full sm:w-auto"><Plus size={14} /> Nuevo</button>
      </div>
      <p className="text-sm gp-text-muted mb-6">De todos tus proyectos, en un solo lugar.</p>

      <div className="gp-panel overflow-x-auto">
        <table className="gp-table">
          <thead><tr><th>Pendiente</th><th>Proyecto</th><th>Cliente</th><th>Responsable</th><th>Fecha</th><th>Prioridad</th><th>Estatus</th><th>Precio</th><th></th></tr></thead>
          <tbody>
            {ordenados.map((p) => {
              const vencido = p.estatus !== "Hecho" && p.fechaLimite && daysUntil(p.fechaLimite) < 0;
              return (
                <tr key={p.id}>
                  <td>{p.descripcion}</td>
                  <td className="gp-text-muted">{nombreProyecto(p.proyectoId)}</td>
                  <td className="gp-text-muted">{p.contactoId ? nombreCliente(p.contactoId) : "—"}</td>
                  <td className="gp-text-muted">{nombreResp(p.responsableId)}</td>
                  <td className="gp-mono" style={{ color: vencido ? "var(--red)" : undefined }}>{p.fechaLimite}</td>
                  <td><Badge tone={p.prioridad === "Alta" ? "red" : p.prioridad === "Media" ? "gold" : "muted"}>{p.prioridad}</Badge></td>
                  <td>
                    <select className="gp-input" style={{ padding: "2px 6px" }} value={p.estatus} onChange={(e) => onEdit(p.id, { estatus: e.target.value })}>
                      {ESTATUS_TAREA.map((s) => <option key={s}>{s}</option>)}
                    </select>
                  </td>
                  <td className="gp-mono">{p.precio ? fmtMoney(p.precio) : "—"}</td>
                  <td><div className="flex gap-1"><IconBtn onClick={() => setModal({ item: p })}><Pencil size={13} /></IconBtn><IconBtn onClick={() => onRemove(p.id)}><Trash2 size={13} /></IconBtn></div></td>
                </tr>
              );
            })}
            {ordenados.length === 0 && <tr><td colSpan={9} className="text-center gp-text-muted py-6">Sin pendientes registrados.</td></tr>}
          </tbody>
        </table>
      </div>

      {modal && (
        <Modal title={modal.item.id ? "Editar pendiente" : "Nuevo pendiente"} onClose={() => setModal(null)}>
          <PendienteForm item={modal.item} proyectos={data.proyectos} equipo={data.equipo} contactos={data.contactos} onSave={(v) => { modal.item.id ? onEdit(modal.item.id, v) : onAdd(v); setModal(null); }} />
        </Modal>
      )}
    </div>
  );
}

function PendienteForm({ item, proyectos, equipo, contactos, onSave }) {
  const [v, setV] = useState(item);
  const [error, setError] = useState("");
  return (
    <div>
      <Field label="Descripción"><input className="gp-input" value={v.descripcion} onChange={(e) => setV({ ...v, descripcion: e.target.value })} /></Field>
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
      <Field label="Responsable">
        <select className="gp-input" value={v.responsableId} onChange={(e) => setV({ ...v, responsableId: e.target.value })}>
          <option value="">Tú</option>
          {equipo.map((m) => <option key={m.id} value={m.id}>{m.nombre}</option>)}
        </select>
      </Field>
      <Field label="Precio pactado (si es delegado)"><input type="number" className="gp-input" value={v.precio} onChange={(e) => setV({ ...v, precio: e.target.value })} /></Field>
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

function Finanzas({ data, onAdd, onEdit, onRemove }) {
  const [modal, setModal] = useState(null);
  const [vista, setVista] = useState("todos");
  const empty = { concepto: "", tipo: "Ingreso", proyectoId: "", contactoId: "", fecha: todayISO(), fechaVencimiento: "", monto: "", categoria: "", forma: "Transferencia", estatus: "Cobrado", pautando: false, esRecurrente: false, frecuencia: "Mensual", fechaFin: "" };
  const nombreProyecto = (id) => data.proyectos.find((p) => p.id === id)?.nombre || "—";
  const nombreCliente = (id) => data.contactos.find((c) => c.id === id)?.nombre || "—";

  const cobrosPendientes = data.finanzas
    .filter((f) => f.tipo === "Ingreso" && f.estatus === "Pendiente")
    .sort((a, b) => (a.fechaVencimiento || "9999").localeCompare(b.fechaVencimiento || "9999"));
  const totalCobrosPendientes = cobrosPendientes.reduce((s, f) => s + (Number(f.monto) || 0), 0);

  const ordenados = vista === "cobros"
    ? cobrosPendientes
    : [...data.finanzas].sort((a, b) => (b.fecha || "").localeCompare(a.fecha || ""));

  return (
    <div>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-1">
        <h2 className="gp-serif text-2xl">Ingresos y egresos</h2>
        <button onClick={() => setModal({ item: empty })} className="gp-btn flex items-center justify-center gap-1 px-3 py-1.5 text-sm w-full sm:w-auto"><Plus size={14} /> Nuevo</button>
      </div>
      <p className="text-sm gp-text-muted mb-4">Incluye pagos recurrentes (luz, agua, compras a meses) con fecha de inicio y fin, o indefinidos.</p>

      <div className="flex gap-1 mb-4">
        <button onClick={() => setVista("todos")} className={`text-xs px-3 py-1.5 rounded-full border ${vista === "todos" ? "gp-btn" : "gp-text-muted"}`}>Todos los movimientos</button>
        <button onClick={() => setVista("cobros")} className={`text-xs px-3 py-1.5 rounded-full border flex items-center gap-1 ${vista === "cobros" ? "gp-btn" : "gp-text-muted"}`}>
          Cobros pendientes {cobrosPendientes.length > 0 && <Badge tone="gold">{cobrosPendientes.length}</Badge>}
        </button>
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

      <div className="gp-panel overflow-x-auto">
        <table className="gp-table">
          <thead><tr><th>Concepto</th><th>Fecha</th>{vista === "cobros" && <th>Vence</th>}<th>Tipo</th><th>Proyecto</th><th>Cliente</th><th>Categoría</th><th>Forma</th><th>Estatus</th><th>Recurrente</th><th>Monto</th><th></th></tr></thead>
          <tbody>
            {ordenados.map((f) => {
              const vencido = f.fechaVencimiento && daysUntil(f.fechaVencimiento) < 0;
              return (
              <tr key={f.id}>
                <td>{f.concepto || "—"}</td>
                <td className="gp-mono">{f.fecha || "—"}</td>
                {vista === "cobros" && (
                  <td className="gp-mono" style={{ color: vencido ? "var(--red)" : undefined }}>
                    {f.fechaVencimiento ? `${f.fechaVencimiento}${vencido ? " (vencido)" : ""}` : "—"}
                  </td>
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
            {ordenados.length === 0 && <tr><td colSpan={vista === "cobros" ? 12 : 11} className="text-center gp-text-muted py-6">{vista === "cobros" ? "No tienes cobros pendientes." : "Sin movimientos registrados."}</td></tr>}
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
        <Field label={v.esRecurrente ? "Fecha de inicio" : "Fecha"}><input type="date" className="gp-input" value={v.fecha} onChange={(e) => setV({ ...v, fecha: e.target.value })} /></Field>
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
        <Field label="Monto"><input type="number" className="gp-input" value={v.monto} onChange={(e) => setV({ ...v, monto: e.target.value })} /></Field>
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

/* ---------- Deudas ---------- */
function Deudas({ data, onAdd, onEdit, onRemove }) {
  const [modal, setModal] = useState(null);
  const empty = { acreedor: "", proyectoId: "", monto: "", fechaVencimiento: todayISO() };
  const ordenados = [...data.deudas].sort((a, b) => (a.fechaVencimiento || "").localeCompare(b.fechaVencimiento || ""));
  const nombreProyecto = (id) => data.proyectos.find((p) => p.id === id)?.nombre || "—";

  return (
    <div>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-1">
        <h2 className="gp-serif text-2xl">Deudas</h2>
        <button onClick={() => setModal({ item: empty })} className="gp-btn flex items-center justify-center gap-1 px-3 py-1.5 text-sm w-full sm:w-auto"><Plus size={14} /> Nueva</button>
      </div>
      <p className="text-sm gp-text-muted mb-6">Atrasadas, próximas a vencer y al corriente, todo calculado por fecha.</p>

      <div className="gp-panel overflow-x-auto">
        <table className="gp-table">
          <thead><tr><th>Acreedor</th><th>Proyecto</th><th>Vence</th><th>Estatus</th><th>Monto</th><th></th></tr></thead>
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
        <Field label="Monto"><input type="number" className="gp-input" value={v.monto} onChange={(e) => setV({ ...v, monto: e.target.value })} /></Field>
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
  const empty = { nombre: "", whatsapp: "", correo: "", comentarios: "" };
  const tareasDe = (id) => data.pendientes.filter((p) => p.responsableId === id);

  return (
    <div>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-1">
        <h2 className="gp-serif text-2xl">Equipo</h2>
        <button onClick={() => setModal({ item: empty })} className="gp-btn flex items-center justify-center gap-1 px-3 py-1.5 text-sm w-full sm:w-auto"><Plus size={14} /> Nuevo</button>
      </div>
      <p className="text-sm gp-text-muted mb-6">Colaboradores a los que delegas, con sus tareas y tu evaluación.</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {data.equipo.map((m) => {
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
  const empty = { tipo: "Gym", nombre: "", fecha: todayISO(), proyectoId: "", ganancia: "", notas: "" };
  const ordenados = [...data.actividades].sort((a, b) => (b.fecha || "").localeCompare(a.fecha || ""));
  const nombreProyecto = (id) => data.proyectos.find((p) => p.id === id)?.nombre || "—";

  return (
    <div>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-1">
        <h2 className="gp-serif text-2xl">Actividades y vida</h2>
        <button onClick={() => setModal({ item: empty })} className="gp-btn flex items-center justify-center gap-1 px-3 py-1.5 text-sm w-full sm:w-auto"><Plus size={14} /> Registrar</button>
      </div>
      <p className="text-sm gp-text-muted mb-6">Gym, eventos, capacitación (PLC's, Vibe Coding/SDD, inglés) — un registro rápido de todo lo que construye tu semana.</p>

      <div className="gp-panel overflow-x-auto">
        <table className="gp-table">
          <thead><tr><th>Fecha</th><th>Tipo</th><th>Actividad</th><th>Proyecto</th><th>Ganancia</th><th>Notas</th><th></th></tr></thead>
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
      <Field label="Ganancia generada (si aplica)"><input type="number" className="gp-input" value={v.ganancia} onChange={(e) => setV({ ...v, ganancia: e.target.value })} /></Field>
      <Field label="Notas"><textarea className="gp-input" rows={2} value={v.notas} onChange={(e) => setV({ ...v, notas: e.target.value })} /></Field>
      {error && <p className="text-xs gp-text-red mb-2">{error}</p>}

      <button className="gp-btn w-full py-2 text-sm mt-2" onClick={() => { if (!v.nombre?.toString().trim()) { setError("El nombre de la actividad es obligatorio."); return; } setError(""); onSave(v); }}>Guardar</button>
    </div>
  );
}

/* ---------- Activos digitales ---------- */
function ActivosDigitales({ data, onAdd, onEdit, onRemove }) {
  const [modal, setModal] = useState(null);
  const empty = { tipo: "Dominio", nombre: "", proyectoId: "", fechaVencimiento: todayISO(), costoRenovacion: "", notas: "" };
  const ordenados = [...(data.activos || [])].sort((a, b) => (a.fechaVencimiento || "").localeCompare(b.fechaVencimiento || ""));
  const nombreProyecto = (id) => data.proyectos.find((p) => p.id === id)?.nombre || "—";

  return (
    <div>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-1">
        <h2 className="gp-serif text-2xl">Activos digitales</h2>
        <button onClick={() => setModal({ item: empty })} className="gp-btn flex items-center justify-center gap-1 px-3 py-1.5 text-sm w-full sm:w-auto"><Plus size={14} /> Nuevo</button>
      </div>
      <p className="text-sm gp-text-muted mb-6">Dominios, hosting, marcas ante IMPI y redes — para que ningún vencimiento te tome por sorpresa.</p>

      <div className="gp-panel overflow-x-auto">
        <table className="gp-table">
          <thead><tr><th>Activo</th><th>Tipo</th><th>Proyecto</th><th>Vence</th><th>Estatus</th><th>Costo renovación</th><th></th></tr></thead>
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
        <Field label="Costo de renovación"><input type="number" className="gp-input" value={v.costoRenovacion} onChange={(e) => setV({ ...v, costoRenovacion: e.target.value })} /></Field>
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
  const empty = { proyectoId: "", descripcion: "", fechaObjetivo: todayISO(), estatus: "No iniciada" };
  const ordenados = [...data.metas].sort((a, b) => (a.fechaObjetivo || "").localeCompare(b.fechaObjetivo || ""));
  const nombreProyecto = (id) => data.proyectos.find((p) => p.id === id)?.nombre || "—";

  return (
    <div>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-1">
        <h2 className="gp-serif text-2xl">Metas por proyecto</h2>
        <button onClick={() => setModal({ item: empty })} className="gp-btn flex items-center justify-center gap-1 px-3 py-1.5 text-sm w-full sm:w-auto"><Plus size={14} /> Nueva</button>
      </div>
      <p className="text-sm gp-text-muted mb-6">Qué define el éxito de cada proyecto, para que la bitácora tenga rumbo.</p>

      <div className="gp-panel overflow-x-auto">
        <table className="gp-table">
          <thead><tr><th>Meta</th><th>Proyecto</th><th>Fecha objetivo</th><th>Estatus</th><th></th></tr></thead>
          <tbody>
            {ordenados.map((m) => (
              <tr key={m.id}>
                <td>{m.descripcion}</td>
                <td className="gp-text-muted">{nombreProyecto(m.proyectoId)}</td>
                <td className="gp-mono">{m.fechaObjetivo}</td>
                <td>
                  <select className="gp-input" style={{ padding: "2px 6px" }} value={m.estatus} onChange={(e) => onEdit(m.id, { estatus: e.target.value })}>
                    {ESTATUS_META.map((s) => <option key={s}>{s}</option>)}
                  </select>
                </td>
                <td><div className="flex gap-1"><IconBtn onClick={() => setModal({ item: m })}><Pencil size={13} /></IconBtn><IconBtn onClick={() => onRemove(m.id)}><Trash2 size={13} /></IconBtn></div></td>
              </tr>
            ))}
            {ordenados.length === 0 && <tr><td colSpan={5} className="text-center gp-text-muted py-6">Sin metas registradas.</td></tr>}
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
      {error && <p className="text-xs gp-text-red mb-2">{error}</p>}

      <button className="gp-btn w-full py-2 text-sm mt-2" onClick={() => { if (!v.descripcion?.toString().trim()) { setError("La meta es obligatoria."); return; } setError(""); onSave(v); }}>Guardar</button>
    </div>
  );
}

/* ---------- Contactos / networking ---------- */
function Contactos({ data, onAdd, onEdit, onRemove }) {
  const [modal, setModal] = useState(null);
  const [filtroTipo, setFiltroTipo] = useState("Todos");
  const empty = { nombre: "", tipo: "Cliente", contexto: "", proyectoId: "", whatsapp: "", correo: "", notas: "" };
  const nombreProyecto = (id) => data.proyectos.find((p) => p.id === id)?.nombre || "—";
  const toneTipo = { Cliente: "teal", Proveedor: "gold", Colaborador: "red", Otro: "" };
  const visibles = filtroTipo === "Todos" ? data.contactos : data.contactos.filter((c) => (c.tipo || "Otro") === filtroTipo);

  return (
    <div>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-1">
        <h2 className="gp-serif text-2xl">Contactos</h2>
        <button onClick={() => setModal({ item: empty })} className="gp-btn flex items-center justify-center gap-1 px-3 py-1.5 text-sm w-full sm:w-auto"><Plus size={14} /> Nuevo</button>
      </div>
      <p className="text-sm gp-text-muted mb-4">Clientes, proveedores, colaboradores y gente que conoces en eventos — para que no se pierdan.</p>

      <div className="flex flex-wrap gap-1 mb-4">
        {["Todos", "Cliente", "Proveedor", "Colaborador", "Otro"].map((t) => (
          <button key={t} onClick={() => setFiltroTipo(t)} className={`text-xs px-2.5 py-1 rounded-full border ${filtroTipo === t ? "gp-btn" : "gp-text-muted"}`}>{t}</button>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {visibles.map((c) => (
          <div key={c.id} className="gp-panel p-4">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium">{c.nombre}</p>
                  <Badge tone={toneTipo[c.tipo || "Otro"]}>{c.tipo || "Otro"}</Badge>
                </div>
                <p className="text-xs gp-text-muted mt-0.5">{c.contexto} {c.proyectoId ? `· ${nombreProyecto(c.proyectoId)}` : ""}</p>
                <div className="flex gap-3 mt-1 text-xs gp-text-muted">
                  {c.whatsapp && <span className="flex items-center gap-1"><MessageCircle size={12} /> {c.whatsapp}</span>}
                  {c.correo && <span className="flex items-center gap-1"><Mail size={12} /> {c.correo}</span>}
                </div>
              </div>
              <div className="flex gap-1"><IconBtn onClick={() => setModal({ item: c })}><Pencil size={13} /></IconBtn><IconBtn onClick={() => onRemove(c.id)}><Trash2 size={13} /></IconBtn></div>
            </div>
            {c.notas && <p className="text-xs mt-2 gp-text-muted">{c.notas}</p>}
          </div>
        ))}
        {visibles.length === 0 && <p className="text-sm gp-text-muted col-span-2">Aún no registras contactos {filtroTipo !== "Todos" ? `de tipo "${filtroTipo}"` : ""}.</p>}
      </div>

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

/* ---------- Redes sociales (métricas) ---------- */
function RedesSociales({ data, onAdd, onEdit, onRemove }) {
  const [modal, setModal] = useState(null);
  const empty = { proyectoId: "", plataforma: PLATAFORMAS[0], fecha: todayISO(), seguidores: "", alcance: "" };
  const ordenados = [...data.redesMetricas].sort((a, b) => (b.fecha || "").localeCompare(a.fecha || ""));
  const nombreProyecto = (id) => data.proyectos.find((p) => p.id === id)?.nombre || "—";

  return (
    <div>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-1">
        <h2 className="gp-serif text-2xl">Redes sociales</h2>
        <button onClick={() => setModal({ item: empty })} className="gp-btn flex items-center justify-center gap-1 px-3 py-1.5 text-sm w-full sm:w-auto"><Plus size={14} /> Registrar</button>
      </div>
      <p className="text-sm gp-text-muted mb-6">Seguidores y alcance por proyecto y plataforma, para cruzarlo con ingresos.</p>

      <div className="gp-panel overflow-x-auto">
        <table className="gp-table">
          <thead><tr><th>Fecha</th><th>Proyecto</th><th>Plataforma</th><th>Seguidores</th><th>Alcance</th><th></th></tr></thead>
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

/* ---------- Legal y contratos ---------- */
function Documentos({ data, onAdd, onEdit, onRemove }) {
  const [modal, setModal] = useState(null);
  const empty = { tipo: "Contrato", nombre: "", proyectoId: "", fechaVencimiento: "", notas: "" };
  const ordenados = [...data.documentos].sort((a, b) => (a.fechaVencimiento || "").localeCompare(b.fechaVencimiento || ""));
  const nombreProyecto = (id) => data.proyectos.find((p) => p.id === id)?.nombre || "—";

  return (
    <div>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-1">
        <h2 className="gp-serif text-2xl">Legal y contratos</h2>
        <button onClick={() => setModal({ item: empty })} className="gp-btn flex items-center justify-center gap-1 px-3 py-1.5 text-sm w-full sm:w-auto"><Plus size={14} /> Nuevo</button>
      </div>
      <p className="text-sm gp-text-muted mb-6">Contratos, registros de marca ante IMPI y demás documentos, por proyecto.</p>

      <div className="gp-panel overflow-x-auto">
        <table className="gp-table">
          <thead><tr><th>Documento</th><th>Tipo</th><th>Proyecto</th><th>Vencimiento</th><th>Notas</th><th></th></tr></thead>
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

  return (
    <div>
      <h2 className="gp-serif text-2xl mb-1">Hábitos</h2>
      <p className="text-sm gp-text-muted mb-6">Marca el día con un clic. La racha se calcula sola.</p>

      <div className="flex flex-col sm:flex-row gap-2 mb-5">
        <input className="gp-input flex-1 sm:max-w-xs" placeholder="ej. Leer 20 min, Practicar inglés" value={nuevo} onChange={(e) => setNuevo(e.target.value)} onKeyDown={(e) => e.key === "Enter" && nuevo.trim() && (onAdd({ nombre: nuevo, fechas: [] }), setNuevo(""))} />
        <button className="gp-btn px-3 py-2 sm:py-0 text-sm" onClick={() => { if (nuevo.trim()) { onAdd({ nombre: nuevo, fechas: [] }); setNuevo(""); } }}>Agregar hábito</button>
      </div>

      <div className="space-y-2">
        {data.habitos.map((h) => {
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
  const empty = { fecha: todayISO(), peso: "", glucosa: "", colesterol: "", trigliceridos: "", notas: "", estudio: null };
  const ordenados = [...data.salud].sort((a, b) => (b.fecha || "").localeCompare(a.fecha || ""));
  const alturaCm = data.perfilSalud?.alturaCm;

  const toneCategoria = (cat) => (cat === "Normal" ? "teal" : cat === "Bajo peso" ? "gold" : cat === "Sobrepeso" ? "gold" : cat === "Obesidad" ? "red" : "muted");

  return (
    <div>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-1">
        <h2 className="gp-serif text-2xl">Salud</h2>
        <button onClick={() => setModal({ item: empty })} className="gp-btn flex items-center justify-center gap-1 px-3 py-1.5 text-sm w-full sm:w-auto"><Plus size={14} /> Registrar</button>
      </div>
      <p className="text-sm gp-text-muted mb-4">Peso, glucosa, colesterol, triglicéridos y tus estudios en PDF, todo en un mismo historial.</p>

      <div className="gp-panel p-3 mb-5 flex flex-wrap items-center gap-3">
        <span className="text-xs gp-text-muted">Tu estatura (para calcular IMC):</span>
        <input type="number" className="gp-input" style={{ maxWidth: 100 }} value={altura}
          onChange={(e) => setAltura(e.target.value)}
          onBlur={() => onUpdatePerfil({ alturaCm: altura })} />
        <span className="text-xs gp-text-muted">cm</span>
        {!alturaCm && <span className="text-xs gp-text-gold">Captúrala para ver tu categoría de peso.</span>}
      </div>

      <div className="gp-panel overflow-x-auto">
        <table className="gp-table">
          <thead><tr><th>Fecha</th><th>Peso (kg)</th><th>IMC</th><th>Categoría</th><th>Glucosa</th><th>Colesterol</th><th>Triglicéridos</th><th>Estudio</th><th>Notas</th><th></th></tr></thead>
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
    </div>
  );
}

/* ---------- Apartados / metas de ahorro ---------- */
function Apartados({ data, onAdd, onEdit, onRemove, onMoverFondos }) {
  const [modal, setModal] = useState(null);
  const [fondoModal, setFondoModal] = useState(null); // { apartado }
  const [moverModal, setMoverModal] = useState(null); // { apartado }
  const empty = { nombre: "", proyectoId: "", montoObjetivo: "", montoActual: "0", fechaObjetivo: "", notas: "" };
  const nombreProyecto = (id) => data.proyectos.find((p) => p.id === id)?.nombre || "—";

  return (
    <div>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-1">
        <h2 className="gp-serif text-2xl">Apartados</h2>
        <button onClick={() => setModal({ item: empty })} className="gp-btn flex items-center justify-center gap-1 px-3 py-1.5 text-sm w-full sm:w-auto"><Plus size={14} /> Nuevo</button>
      </div>
      <p className="text-sm gp-text-muted mb-6">Dinero apartado para un proyecto o una meta específica, como un viaje.</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {data.apartados.map((a) => {
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
        <Field label="Monto objetivo"><input type="number" className="gp-input" value={v.montoObjetivo} onChange={(e) => setV({ ...v, montoObjetivo: e.target.value })} /></Field>
        <Field label="Ya tienes ahorrado"><input type="number" className="gp-input" value={v.montoActual} onChange={(e) => setV({ ...v, montoActual: e.target.value })} /></Field>
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
      <Field label="Cuánto vas a agregar"><input type="number" autoFocus className="gp-input" value={monto} onChange={(e) => setMonto(e.target.value)} /></Field>
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
      <Field label="Cuánto vas a mover"><input type="number" autoFocus className="gp-input" value={monto} onChange={(e) => setMonto(e.target.value)} /></Field>
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
function Eventos({ data, onAdd, onEdit, onRemove }) {
  const [modal, setModal] = useState(null);
  const [expanded, setExpanded] = useState(null);
  const empty = { nombre: "", fecha: todayISO(), proyectoId: "", contactoId: "", lugar: "", horario: "", costo: "", gastos: "", utilidad: "", comentarios: "", media: [] };
  const ordenados = [...data.eventos].sort((a, b) => (b.fecha || "").localeCompare(a.fecha || ""));
  const nombreProyecto = (id) => data.proyectos.find((p) => p.id === id)?.nombre || "—";
  const nombreCliente = (id) => data.contactos.find((c) => c.id === id)?.nombre || "—";

  return (
    <div>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-1">
        <h2 className="gp-serif text-2xl">Eventos</h2>
        <button onClick={() => setModal({ item: empty })} className="gp-btn flex items-center justify-center gap-1 px-3 py-1.5 text-sm w-full sm:w-auto"><Plus size={14} /> Nuevo</button>
      </div>
      <p className="text-sm gp-text-muted mb-6">Shows y eventos, con lugar, horario, costo/gastos, utilidad, fotos y comentarios.</p>

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
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
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
        <Field label="Costo"><input type="number" className="gp-input" value={v.costo} onChange={(e) => setCostoGastos("costo", e.target.value)} /></Field>
        <Field label="Gastos (staff, extras)"><input type="number" className="gp-input" value={v.gastos} onChange={(e) => setCostoGastos("gastos", e.target.value)} /></Field>
        <Field label="Utilidad"><input type="number" className="gp-input" value={v.utilidad} onChange={(e) => setV({ ...v, utilidad: e.target.value })} /></Field>
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

