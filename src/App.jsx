import React, { useState, useEffect, useMemo } from "react";
import { supabase } from "./supabaseClient";
import {
  LayoutDashboard, FolderKanban, CheckSquare, Wallet, AlertTriangle,
  Users, Activity, Plus, X, Trash2, Pencil, Github, ChevronDown,
  ChevronRight, Bell, Lightbulb, Rocket, MessageCircle, Mail, Globe,
  Target, Contact, BarChart3, FileText, Flame, HeartPulse, Check,
} from "lucide-react";

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
const TABLES = ["proyectos", "pendientes", "equipo", "finanzas", "deudas", "actividades", "activos", "metas", "contactos", "redesMetricas", "documentos", "habitos", "salud"];
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
  const [modal, setModal] = useState(null); // { type, item }

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
  const updatePerfilSalud = async (patch) => {
    const { error } = await supabase.from("perfil_salud").upsert({ id: "main", altura_cm: patch.alturaCm || null });
    if (error) { console.error("Error al guardar tu estatura:", error); return; }
    setData((prev) => ({ ...prev, perfilSalud: { ...(prev.perfilSalud || {}), ...patch } }));
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
      { id: "deudas", label: "Deudas", icon: AlertTriangle },
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
      { id: "habitos", label: "Hábitos", icon: Flame },
      { id: "salud", label: "Salud", icon: HeartPulse },
    ]},
  ];

  return (
    <div className="gp-root overflow-hidden" style={{ minHeight: "100vh" }}>
      <Tokens />
      <div className="flex" style={{ minHeight: "100vh" }}>
        {/* rail lateral */}
        <div className="w-56 shrink-0 border-r gp-border p-4 flex flex-col gap-4 overflow-y-auto gp-scroll" style={{ maxHeight: "100vh" }}>
          <div className="px-2 flex items-start justify-between">
            <div>
              <p className="gp-serif text-lg leading-tight">Centro de mando</p>
              <p className="text-xs gp-text-muted">Angel Rey</p>
            </div>
            <button onClick={() => supabase.auth.signOut()} title="Cerrar sesión" className="text-xs gp-text-muted gp-btn-ghost px-2 py-1 rounded">Salir</button>
          </div>
          {navGroups.map((g) => (
            <div key={g.label}>
              <p className="text-xs gp-text-muted px-3 mb-1">{g.label}</p>
              <div className="flex flex-col gap-0.5">
                {g.items.map((n) => (
                  <button key={n.id} onClick={() => setView(n.id)}
                    className={`gp-navitem flex items-center gap-2 px-3 py-2 text-sm text-left ${view === n.id ? "gp-navitem-active" : ""}`}>
                    <n.icon size={15} /> {n.label}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* contenido */}
        <div className="flex-1 p-6 overflow-y-auto gp-scroll" style={{ maxHeight: "100vh" }}>
          {view === "dashboard" && <Dashboard data={data} setView={setView} />}
          {view === "proyectos" && (
            <Proyectos data={data} onAdd={(i) => addItem("proyectos", i)} onEdit={(id, p) => editItem("proyectos", id, p)} onRemove={(id) => removeItem("proyectos", id)} />
          )}
          {view === "metas" && (
            <Metas data={data} onAdd={(i) => addItem("metas", i)} onEdit={(id, p) => editItem("metas", id, p)} onRemove={(id) => removeItem("metas", id)} />
          )}
          {view === "pendientes" && (
            <Pendientes data={data} onAdd={(i) => addItem("pendientes", i)} onEdit={(id, p) => editItem("pendientes", id, p)} onRemove={(id) => removeItem("pendientes", id)} />
          )}
          {view === "finanzas" && (
            <Finanzas data={data} onAdd={(i) => addItem("finanzas", i)} onEdit={(id, p) => editItem("finanzas", id, p)} onRemove={(id) => removeItem("finanzas", id)} />
          )}
          {view === "deudas" && (
            <Deudas data={data} onAdd={(i) => addItem("deudas", i)} onEdit={(id, p) => editItem("deudas", id, p)} onRemove={(id) => removeItem("deudas", id)} />
          )}
          {view === "documentos" && (
            <Documentos data={data} onAdd={(i) => addItem("documentos", i)} onEdit={(id, p) => editItem("documentos", id, p)} onRemove={(id) => removeItem("documentos", id)} />
          )}
          {view === "equipo" && (
            <Equipo data={data} onAdd={(i) => addItem("equipo", i)} onEdit={(id, p) => editItem("equipo", id, p)} onRemove={(id) => removeItem("equipo", id)} />
          )}
          {view === "contactos" && (
            <Contactos data={data} onAdd={(i) => addItem("contactos", i)} onEdit={(id, p) => editItem("contactos", id, p)} onRemove={(id) => removeItem("contactos", id)} />
          )}
          {view === "redes" && (
            <RedesSociales data={data} onAdd={(i) => addItem("redesMetricas", i)} onEdit={(id, p) => editItem("redesMetricas", id, p)} onRemove={(id) => removeItem("redesMetricas", id)} />
          )}
          {view === "actividades" && (
            <Actividades data={data} onAdd={(i) => addItem("actividades", i)} onEdit={(id, p) => editItem("actividades", id, p)} onRemove={(id) => removeItem("actividades", id)} />
          )}
          {view === "habitos" && (
            <Habitos data={data} onAdd={(i) => addItem("habitos", i)} onEdit={(id, p) => editItem("habitos", id, p)} onRemove={(id) => removeItem("habitos", id)} />
          )}
          {view === "salud" && (
            <Salud data={data} onAdd={(i) => addItem("salud", i)} onEdit={(id, p) => editItem("salud", id, p)} onRemove={(id) => removeItem("salud", id)} onUpdatePerfil={updatePerfilSalud} />
          )}
          {view === "activos" && (
            <ActivosDigitales data={data} onAdd={(i) => addItem("activos", i)} onEdit={(id, p) => editItem("activos", id, p)} onRemove={(id) => removeItem("activos", id)} />
          )}
        </div>
      </div>
    </div>
  );
}

/* ---------- Dashboard ---------- */
function Dashboard({ data, setView }) {
  const mesActual = todayISO().slice(0, 7);
  const finMes = data.finanzas.filter((f) => f.fecha?.startsWith(mesActual));
  const ingresos = finMes.filter((f) => f.tipo === "Ingreso").reduce((s, f) => s + Number(f.monto || 0), 0);
  const egresos = finMes.filter((f) => f.tipo === "Egreso").reduce((s, f) => s + Number(f.monto || 0), 0);
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

  const gananciaPorProyecto = data.proyectos.map((p) => {
    const propios = data.finanzas.filter((f) => f.proyectoId === p.id);
    const ing = propios.filter((f) => f.tipo === "Ingreso").reduce((s, f) => s + Number(f.monto || 0), 0);
    const eg = propios.filter((f) => f.tipo === "Egreso").reduce((s, f) => s + Number(f.monto || 0), 0);
    return { nombre: p.nombre, neto: ing - eg };
  }).filter((p) => p.neto !== 0).sort((a, b) => b.neto - a.neto);

  return (
    <div>
      <h2 className="gp-serif text-2xl mb-1">Panorama general</h2>
      <p className="text-sm gp-text-muted mb-6">Lo que le da sentido a tus proyectos, en un vistazo.</p>

      <div className="grid grid-cols-4 gap-3 mb-6">
        <Stat label="Proyectos activos" value={activos} />
        <Stat label="Ideas por validar" value={ideas} />
        <Stat label="Ingresos del mes" value={fmtMoney(ingresos)} tone="teal" />
        <Stat label="Egresos del mes" value={fmtMoney(egresos)} tone="red" />
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
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
      <div className="flex items-center justify-between mb-1">
        <h2 className="gp-serif text-2xl">Proyectos e ideas</h2>
        <button onClick={() => setModal({ item: empty })} className="gp-btn flex items-center gap-1 px-3 py-1.5 text-sm"><Plus size={14} /> Nuevo</button>
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
                      <div className="flex items-center gap-4 text-xs gp-text-muted mb-3">
                        <label className="flex items-center gap-1.5">
                          <input type="checkbox" checked={p.githubSubido} onChange={(e) => onEdit(p.id, { githubSubido: e.target.checked })} />
                          Subido a GitHub
                        </label>
                        <input placeholder="link del repo (opcional)" value={p.github || ""} onChange={(e) => onEdit(p.id, { github: e.target.value })} className="gp-input" style={{ maxWidth: 240 }} />
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
  return (
    <div>
      <Field label="Nombre"><input className="gp-input" value={v.nombre} onChange={(e) => setV({ ...v, nombre: e.target.value })} /></Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Categoría"><select className="gp-input" value={v.categoria} onChange={(e) => setV({ ...v, categoria: e.target.value })}>{CATS.map((c) => <option key={c}>{c}</option>)}</select></Field>
        <Field label="Estatus"><select className="gp-input" value={v.estatus} onChange={(e) => setV({ ...v, estatus: e.target.value })}>{ESTATUS_PROYECTO.map((c) => <option key={c}>{c}</option>)}</select></Field>
      </div>
      <Field label="Cómo genera valor"><select className="gp-input" value={v.monetizacion} onChange={(e) => setV({ ...v, monetizacion: e.target.value })}>{MONETIZACION.map((c) => <option key={c}>{c}</option>)}</select></Field>
      <Field label="Descripción"><textarea className="gp-input" rows={3} value={v.descripcion} onChange={(e) => setV({ ...v, descripcion: e.target.value })} /></Field>
      <button className="gp-btn w-full py-2 text-sm mt-2" onClick={() => onSave(v)}>Guardar</button>
    </div>
  );
}

/* ---------- Pendientes ---------- */
function Pendientes({ data, onAdd, onEdit, onRemove }) {
  const [modal, setModal] = useState(null);
  const empty = { proyectoId: "", descripcion: "", fechaLimite: todayISO(), prioridad: "Media", estatus: "Pendiente", responsableId: "", precio: "" };
  const ordenados = [...data.pendientes].sort((a, b) => (a.fechaLimite || "").localeCompare(b.fechaLimite || ""));

  const nombreProyecto = (id) => data.proyectos.find((p) => p.id === id)?.nombre || "—";
  const nombreResp = (id) => data.equipo.find((e) => e.id === id)?.nombre || "Tú";

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <h2 className="gp-serif text-2xl">Pendientes</h2>
        <button onClick={() => setModal({ item: empty })} className="gp-btn flex items-center gap-1 px-3 py-1.5 text-sm"><Plus size={14} /> Nuevo</button>
      </div>
      <p className="text-sm gp-text-muted mb-6">De todos tus proyectos, en un solo lugar.</p>

      <div className="gp-panel overflow-x-auto">
        <table className="gp-table">
          <thead><tr><th>Pendiente</th><th>Proyecto</th><th>Responsable</th><th>Fecha</th><th>Prioridad</th><th>Estatus</th><th>Precio</th><th></th></tr></thead>
          <tbody>
            {ordenados.map((p) => {
              const vencido = p.estatus !== "Hecho" && p.fechaLimite && daysUntil(p.fechaLimite) < 0;
              return (
                <tr key={p.id}>
                  <td>{p.descripcion}</td>
                  <td className="gp-text-muted">{nombreProyecto(p.proyectoId)}</td>
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
            {ordenados.length === 0 && <tr><td colSpan={8} className="text-center gp-text-muted py-6">Sin pendientes registrados.</td></tr>}
          </tbody>
        </table>
      </div>

      {modal && (
        <Modal title={modal.item.id ? "Editar pendiente" : "Nuevo pendiente"} onClose={() => setModal(null)}>
          <PendienteForm item={modal.item} proyectos={data.proyectos} equipo={data.equipo} onSave={(v) => { modal.item.id ? onEdit(modal.item.id, v) : onAdd(v); setModal(null); }} />
        </Modal>
      )}
    </div>
  );
}

function PendienteForm({ item, proyectos, equipo, onSave }) {
  const [v, setV] = useState(item);
  return (
    <div>
      <Field label="Descripción"><input className="gp-input" value={v.descripcion} onChange={(e) => setV({ ...v, descripcion: e.target.value })} /></Field>
      <Field label="Proyecto">
        <select className="gp-input" value={v.proyectoId} onChange={(e) => setV({ ...v, proyectoId: e.target.value })}>
          <option value="">— sin proyecto —</option>
          {proyectos.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
        </select>
      </Field>
      <div className="grid grid-cols-2 gap-3">
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
      <button className="gp-btn w-full py-2 text-sm mt-2" onClick={() => onSave(v)}>Guardar</button>
    </div>
  );
}

/* ---------- Finanzas ---------- */
function Finanzas({ data, onAdd, onEdit, onRemove }) {
  const [modal, setModal] = useState(null);
  const empty = { tipo: "Ingreso", proyectoId: "", fecha: todayISO(), monto: "", categoria: "", forma: "Transferencia", estatus: "Cobrado", pautando: false };
  const ordenados = [...data.finanzas].sort((a, b) => (b.fecha || "").localeCompare(a.fecha || ""));
  const nombreProyecto = (id) => data.proyectos.find((p) => p.id === id)?.nombre || "—";

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <h2 className="gp-serif text-2xl">Ingresos y egresos</h2>
        <button onClick={() => setModal({ item: empty })} className="gp-btn flex items-center gap-1 px-3 py-1.5 text-sm"><Plus size={14} /> Nuevo</button>
      </div>
      <p className="text-sm gp-text-muted mb-6">Incluye si el proyecto está pautando publicidad activamente.</p>

      <div className="gp-panel overflow-x-auto">
        <table className="gp-table">
          <thead><tr><th>Fecha</th><th>Tipo</th><th>Proyecto</th><th>Categoría</th><th>Forma</th><th>Estatus</th><th>Pautando</th><th>Monto</th><th></th></tr></thead>
          <tbody>
            {ordenados.map((f) => (
              <tr key={f.id}>
                <td className="gp-mono">{f.fecha}</td>
                <td><Badge tone={f.tipo === "Ingreso" ? "teal" : "red"}>{f.tipo}</Badge></td>
                <td className="gp-text-muted">{nombreProyecto(f.proyectoId)}</td>
                <td className="gp-text-muted">{f.categoria}</td>
                <td className="gp-text-muted">{f.forma}</td>
                <td><Badge tone={f.estatus === "Cobrado" ? "teal" : "gold"}>{f.estatus}</Badge></td>
                <td>{f.pautando ? "Sí" : "—"}</td>
                <td className={`gp-mono ${f.tipo === "Ingreso" ? "gp-text-teal" : "gp-text-red"}`}>{fmtMoney(f.monto)}</td>
                <td><div className="flex gap-1"><IconBtn onClick={() => setModal({ item: f })}><Pencil size={13} /></IconBtn><IconBtn onClick={() => onRemove(f.id)}><Trash2 size={13} /></IconBtn></div></td>
              </tr>
            ))}
            {ordenados.length === 0 && <tr><td colSpan={9} className="text-center gp-text-muted py-6">Sin movimientos registrados.</td></tr>}
          </tbody>
        </table>
      </div>

      {modal && (
        <Modal title={modal.item.id ? "Editar movimiento" : "Nuevo movimiento"} onClose={() => setModal(null)}>
          <FinanzaForm item={modal.item} proyectos={data.proyectos} onSave={(v) => { modal.item.id ? onEdit(modal.item.id, v) : onAdd(v); setModal(null); }} />
        </Modal>
      )}
    </div>
  );
}

function FinanzaForm({ item, proyectos, onSave }) {
  const [v, setV] = useState(item);
  return (
    <div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Tipo"><select className="gp-input" value={v.tipo} onChange={(e) => setV({ ...v, tipo: e.target.value })}>{TIPO_FIN.map((c) => <option key={c}>{c}</option>)}</select></Field>
        <Field label="Fecha"><input type="date" className="gp-input" value={v.fecha} onChange={(e) => setV({ ...v, fecha: e.target.value })} /></Field>
      </div>
      <Field label="Proyecto">
        <select className="gp-input" value={v.proyectoId} onChange={(e) => setV({ ...v, proyectoId: e.target.value })}>
          <option value="">— sin proyecto —</option>
          {proyectos.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
        </select>
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Categoría"><input className="gp-input" value={v.categoria} onChange={(e) => setV({ ...v, categoria: e.target.value })} placeholder="ej. hosting, venta, renta" /></Field>
        <Field label="Monto"><input type="number" className="gp-input" value={v.monto} onChange={(e) => setV({ ...v, monto: e.target.value })} /></Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Forma"><select className="gp-input" value={v.forma} onChange={(e) => setV({ ...v, forma: e.target.value })}>{FORMA_PAGO.map((c) => <option key={c}>{c}</option>)}</select></Field>
        <Field label="Estatus"><select className="gp-input" value={v.estatus} onChange={(e) => setV({ ...v, estatus: e.target.value })}><option>Cobrado</option><option>Pendiente</option></select></Field>
      </div>
      <label className="flex items-center gap-2 text-xs gp-text-muted mb-3">
        <input type="checkbox" checked={v.pautando} onChange={(e) => setV({ ...v, pautando: e.target.checked })} /> Este proyecto está pautando publicidad
      </label>
      <button className="gp-btn w-full py-2 text-sm mt-1" onClick={() => onSave(v)}>Guardar</button>
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
      <div className="flex items-center justify-between mb-1">
        <h2 className="gp-serif text-2xl">Deudas</h2>
        <button onClick={() => setModal({ item: empty })} className="gp-btn flex items-center gap-1 px-3 py-1.5 text-sm"><Plus size={14} /> Nueva</button>
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
  return (
    <div>
      <Field label="Acreedor"><input className="gp-input" value={v.acreedor} onChange={(e) => setV({ ...v, acreedor: e.target.value })} /></Field>
      <Field label="Proyecto relacionado">
        <select className="gp-input" value={v.proyectoId} onChange={(e) => setV({ ...v, proyectoId: e.target.value })}>
          <option value="">— personal / sin proyecto —</option>
          {proyectos.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
        </select>
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Monto"><input type="number" className="gp-input" value={v.monto} onChange={(e) => setV({ ...v, monto: e.target.value })} /></Field>
        <Field label="Fecha de vencimiento"><input type="date" className="gp-input" value={v.fechaVencimiento} onChange={(e) => setV({ ...v, fechaVencimiento: e.target.value })} /></Field>
      </div>
      <button className="gp-btn w-full py-2 text-sm mt-2" onClick={() => onSave(v)}>Guardar</button>
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
      <div className="flex items-center justify-between mb-1">
        <h2 className="gp-serif text-2xl">Equipo</h2>
        <button onClick={() => setModal({ item: empty })} className="gp-btn flex items-center gap-1 px-3 py-1.5 text-sm"><Plus size={14} /> Nuevo</button>
      </div>
      <p className="text-sm gp-text-muted mb-6">Colaboradores a los que delegas, con sus tareas y tu evaluación.</p>

      <div className="grid grid-cols-2 gap-3">
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
  return (
    <div>
      <Field label="Nombre"><input className="gp-input" value={v.nombre} onChange={(e) => setV({ ...v, nombre: e.target.value })} /></Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="WhatsApp"><input className="gp-input" value={v.whatsapp} onChange={(e) => setV({ ...v, whatsapp: e.target.value })} /></Field>
        <Field label="Correo (opcional)"><input className="gp-input" value={v.correo} onChange={(e) => setV({ ...v, correo: e.target.value })} /></Field>
      </div>
      <Field label="Comentarios sobre esta persona"><textarea className="gp-input" rows={3} value={v.comentarios} onChange={(e) => setV({ ...v, comentarios: e.target.value })} /></Field>
      <button className="gp-btn w-full py-2 text-sm mt-2" onClick={() => onSave(v)}>Guardar</button>
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
      <div className="flex items-center justify-between mb-1">
        <h2 className="gp-serif text-2xl">Actividades y vida</h2>
        <button onClick={() => setModal({ item: empty })} className="gp-btn flex items-center gap-1 px-3 py-1.5 text-sm"><Plus size={14} /> Registrar</button>
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
  return (
    <div>
      <div className="grid grid-cols-2 gap-3">
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
      <button className="gp-btn w-full py-2 text-sm mt-2" onClick={() => onSave(v)}>Guardar</button>
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
      <div className="flex items-center justify-between mb-1">
        <h2 className="gp-serif text-2xl">Activos digitales</h2>
        <button onClick={() => setModal({ item: empty })} className="gp-btn flex items-center gap-1 px-3 py-1.5 text-sm"><Plus size={14} /> Nuevo</button>
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
  return (
    <div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Tipo"><select className="gp-input" value={v.tipo} onChange={(e) => setV({ ...v, tipo: e.target.value })}>{TIPO_ACTIVO.map((c) => <option key={c}>{c}</option>)}</select></Field>
        <Field label="Nombre"><input className="gp-input" placeholder="ej. armoniq.mx, marca ARKeyData" value={v.nombre} onChange={(e) => setV({ ...v, nombre: e.target.value })} /></Field>
      </div>
      <Field label="Proyecto relacionado">
        <select className="gp-input" value={v.proyectoId} onChange={(e) => setV({ ...v, proyectoId: e.target.value })}>
          <option value="">— ninguno —</option>
          {proyectos.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
        </select>
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Fecha de vencimiento"><input type="date" className="gp-input" value={v.fechaVencimiento} onChange={(e) => setV({ ...v, fechaVencimiento: e.target.value })} /></Field>
        <Field label="Costo de renovación"><input type="number" className="gp-input" value={v.costoRenovacion} onChange={(e) => setV({ ...v, costoRenovacion: e.target.value })} /></Field>
      </div>
      <Field label="Notas"><textarea className="gp-input" rows={2} value={v.notas} onChange={(e) => setV({ ...v, notas: e.target.value })} /></Field>
      <button className="gp-btn w-full py-2 text-sm mt-2" onClick={() => onSave(v)}>Guardar</button>
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
      <div className="flex items-center justify-between mb-1">
        <h2 className="gp-serif text-2xl">Metas por proyecto</h2>
        <button onClick={() => setModal({ item: empty })} className="gp-btn flex items-center gap-1 px-3 py-1.5 text-sm"><Plus size={14} /> Nueva</button>
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
  return (
    <div>
      <Field label="Proyecto">
        <select className="gp-input" value={v.proyectoId} onChange={(e) => setV({ ...v, proyectoId: e.target.value })}>
          <option value="">— sin proyecto —</option>
          {proyectos.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
        </select>
      </Field>
      <Field label="Meta"><input className="gp-input" placeholder="ej. Llegar a 1000 seguidores, cerrar 3 clientes" value={v.descripcion} onChange={(e) => setV({ ...v, descripcion: e.target.value })} /></Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Fecha objetivo"><input type="date" className="gp-input" value={v.fechaObjetivo} onChange={(e) => setV({ ...v, fechaObjetivo: e.target.value })} /></Field>
        <Field label="Estatus"><select className="gp-input" value={v.estatus} onChange={(e) => setV({ ...v, estatus: e.target.value })}>{ESTATUS_META.map((c) => <option key={c}>{c}</option>)}</select></Field>
      </div>
      <button className="gp-btn w-full py-2 text-sm mt-2" onClick={() => onSave(v)}>Guardar</button>
    </div>
  );
}

/* ---------- Contactos / networking ---------- */
function Contactos({ data, onAdd, onEdit, onRemove }) {
  const [modal, setModal] = useState(null);
  const empty = { nombre: "", contexto: "", proyectoId: "", whatsapp: "", correo: "", notas: "" };
  const nombreProyecto = (id) => data.proyectos.find((p) => p.id === id)?.nombre || "—";

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <h2 className="gp-serif text-2xl">Contactos</h2>
        <button onClick={() => setModal({ item: empty })} className="gp-btn flex items-center gap-1 px-3 py-1.5 text-sm"><Plus size={14} /> Nuevo</button>
      </div>
      <p className="text-sm gp-text-muted mb-6">Gente que conoces en eventos y clientes potenciales — para que no se pierdan.</p>

      <div className="grid grid-cols-2 gap-3">
        {data.contactos.map((c) => (
          <div key={c.id} className="gp-panel p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium">{c.nombre}</p>
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
        {data.contactos.length === 0 && <p className="text-sm gp-text-muted col-span-2">Aún no registras contactos.</p>}
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
  return (
    <div>
      <Field label="Nombre"><input className="gp-input" value={v.nombre} onChange={(e) => setV({ ...v, nombre: e.target.value })} /></Field>
      <Field label="Dónde lo conociste"><input className="gp-input" placeholder="ej. Expo Acapulco 2026" value={v.contexto} onChange={(e) => setV({ ...v, contexto: e.target.value })} /></Field>
      <Field label="Proyecto relacionado">
        <select className="gp-input" value={v.proyectoId} onChange={(e) => setV({ ...v, proyectoId: e.target.value })}>
          <option value="">— ninguno —</option>
          {proyectos.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
        </select>
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="WhatsApp"><input className="gp-input" value={v.whatsapp} onChange={(e) => setV({ ...v, whatsapp: e.target.value })} /></Field>
        <Field label="Correo (opcional)"><input className="gp-input" value={v.correo} onChange={(e) => setV({ ...v, correo: e.target.value })} /></Field>
      </div>
      <Field label="Notas"><textarea className="gp-input" rows={2} value={v.notas} onChange={(e) => setV({ ...v, notas: e.target.value })} /></Field>
      <button className="gp-btn w-full py-2 text-sm mt-2" onClick={() => onSave(v)}>Guardar</button>
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
      <div className="flex items-center justify-between mb-1">
        <h2 className="gp-serif text-2xl">Redes sociales</h2>
        <button onClick={() => setModal({ item: empty })} className="gp-btn flex items-center gap-1 px-3 py-1.5 text-sm"><Plus size={14} /> Registrar</button>
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
      <div className="grid grid-cols-2 gap-3">
        <Field label="Plataforma"><select className="gp-input" value={v.plataforma} onChange={(e) => setV({ ...v, plataforma: e.target.value })}>{PLATAFORMAS.map((c) => <option key={c}>{c}</option>)}</select></Field>
        <Field label="Fecha"><input type="date" className="gp-input" value={v.fecha} onChange={(e) => setV({ ...v, fecha: e.target.value })} /></Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
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
      <div className="flex items-center justify-between mb-1">
        <h2 className="gp-serif text-2xl">Legal y contratos</h2>
        <button onClick={() => setModal({ item: empty })} className="gp-btn flex items-center gap-1 px-3 py-1.5 text-sm"><Plus size={14} /> Nuevo</button>
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
  return (
    <div>
      <div className="grid grid-cols-2 gap-3">
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
      <button className="gp-btn w-full py-2 text-sm mt-2" onClick={() => onSave(v)}>Guardar</button>
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

      <div className="flex gap-2 mb-5">
        <input className="gp-input" placeholder="ej. Leer 20 min, Practicar inglés" value={nuevo} onChange={(e) => setNuevo(e.target.value)} onKeyDown={(e) => e.key === "Enter" && nuevo.trim() && (onAdd({ nombre: nuevo, fechas: [] }), setNuevo(""))} style={{ maxWidth: 320 }} />
        <button className="gp-btn px-3 text-sm" onClick={() => { if (nuevo.trim()) { onAdd({ nombre: nuevo, fechas: [] }); setNuevo(""); } }}>Agregar hábito</button>
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
      <div className="flex items-center justify-between mb-1">
        <h2 className="gp-serif text-2xl">Salud</h2>
        <button onClick={() => setModal({ item: empty })} className="gp-btn flex items-center gap-1 px-3 py-1.5 text-sm"><Plus size={14} /> Registrar</button>
      </div>
      <p className="text-sm gp-text-muted mb-4">Peso, glucosa, colesterol, triglicéridos y tus estudios en PDF, todo en un mismo historial.</p>

      <div className="gp-panel p-3 mb-5 flex items-center gap-3">
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
      <div className="grid grid-cols-2 gap-3">
        <Field label="Fecha"><input type="date" className="gp-input" value={v.fecha} onChange={(e) => setV({ ...v, fecha: e.target.value })} /></Field>
        <Field label="Peso (kg)"><input type="number" className="gp-input" value={v.peso} onChange={(e) => setV({ ...v, peso: e.target.value })} /></Field>
      </div>
      <div className="grid grid-cols-3 gap-3">
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
