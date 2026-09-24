// src/components/onboarding/OnboardingContextos.jsx
//
// Lo primero que ve alguien después de registrarse: "¿Cómo quieres usar ARKEYONE?".
//
// Qué NO es: no es una tercera forma de configurar la app ni tres aplicaciones distintas. Lo que
// se elige aquí termina escribiéndose en `preferencias` (la misma fila donde ya viven el tema, el
// nombre y el orden de los widgets) y, en el caso de las empresas, en la tabla `empresas`. El
// menú lateral nunca pierde módulos: esto decide con qué arranca el Centro de Mando, no qué
// existe.
//
// El flujo tiene 2 o 3 pasos según lo que se elija — si alguien solo usa ARKEYONE para su vida
// personal no hay nada opcional que preguntarle, y pedirle un paso vacío sería tratarlo como si
// estuviera llenando un trámite.

import { useState } from "react";
import { supabase } from "../../supabaseClient";
import { Plus, X, Check, ChevronLeft, ArrowRight, Upload, Sparkles, Building2 } from "lucide-react";

const uid = () => (crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2, 10) + Date.now().toString(36));

export default function OnboardingContextos({
  catalogo,              // CONTEXTOS_USO: [{ id, icono, descripcion }]
  colorPorContexto,      // { Personal: "#8B5CF6", ... }
  widgetsPorContexto,    // { Personal: ["miDia", ...], ... }
  etiquetaWidget,        // (id) => "Mi día"
  valorInicial,          // { contextos: [], actividadProfesional: "", empresas: [] }
  yaConfigurado,         // true cuando se entra desde Configuración, no desde el registro
  onTerminar,            // ({ contextos, actividadProfesional, empresas }) => void
  onSaltar,              // () => void
}) {
  const [paso, setPaso] = useState(1);
  const [contextos, setContextos] = useState(valorInicial?.contextos || []);
  const [actividadProfesional, setActividadProfesional] = useState(valorInicial?.actividadProfesional || "");
  const [empresas, setEmpresas] = useState(valorInicial?.empresas || []);
  const [cuantasEmpresas, setCuantasEmpresas] = useState(valorInicial?.empresas?.length ? "varias" : null);
  const [ayudaAbierta, setAyudaAbierta] = useState(false);
  const [guardando, setGuardando] = useState(false);

  const tieneEmpresarial = contextos.includes("Empresarial");
  const tieneProfesional = contextos.includes("Profesional");
  // El paso opcional solo existe si hay algo opcional que preguntar.
  const hayPasoOpcional = tieneEmpresarial || tieneProfesional;
  const totalPasos = hayPasoOpcional ? 3 : 2;
  const pasoMostrado = paso === 3 && !hayPasoOpcional ? 2 : paso;

  const toggleContexto = (id) =>
    setContextos((prev) => (prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]));

  const irAdelante = () => {
    if (paso === 1) { setPaso(hayPasoOpcional ? 2 : 3); return; }
    setPaso(3);
  };
  const irAtras = () => {
    if (paso === 3) { setPaso(hayPasoOpcional ? 2 : 1); return; }
    setPaso(1);
  };

  const terminar = () => {
    setGuardando(true);
    onTerminar({
      contextos,
      actividadProfesional: actividadProfesional.trim(),
      // Una empresa sin nombre no es una empresa: se descartan en vez de crear filas vacías.
      empresas: empresas.filter((e) => (e.nombre || "").trim()),
    });
  };

  const widgetsPrevia = [...new Set(contextos.flatMap((c) => widgetsPorContexto[c] || []))];

  return (
    <div className="min-h-screen w-full flex flex-col" style={{ background: "var(--bg)", color: "var(--text)" }}>
      {/* Cabecera con el progreso. "Configurar después" está siempre a la vista: nunca se bloquea
          la entrada a ARKEYONE por no terminar esto (secc. 21). */}
      <div className="w-full border-b gp-border">
        <div className="max-w-3xl mx-auto px-5 py-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            {paso > 1 && (
              <button onClick={irAtras} className="gp-btn-ghost p-1.5 rounded shrink-0" aria-label="Paso anterior">
                <ChevronLeft size={16} />
              </button>
            )}
            <span className="text-xs gp-text-muted">Paso {pasoMostrado} de {totalPasos}</span>
          </div>
          <button onClick={onSaltar} className="text-xs gp-text-muted hover:underline shrink-0">
            {yaConfigurado ? "Cancelar" : "Configurar después"}
          </button>
        </div>
        <div className="h-0.5" style={{ background: "var(--border)" }}>
          <div className="h-0.5" style={{ width: `${(pasoMostrado / totalPasos) * 100}%`, background: "var(--gold)", transition: "width .25s ease" }} />
        </div>
      </div>

      <div className="flex-1 w-full max-w-3xl mx-auto px-5 py-8 md:py-12">
        {paso === 1 && (
          <>
            <h1 className="gp-serif text-2xl md:text-4xl mb-2">¿Cómo quieres usar ARKEYONE?</h1>
            <p className="text-sm gp-text-muted mb-6">Puedes elegir una o varias opciones. Podrás cambiarlas después.</p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {catalogo.map(({ id, icono: Icono, descripcion }) => {
                const activo = contextos.includes(id);
                const color = colorPorContexto[id];
                return (
                  <button
                    key={id}
                    onClick={() => toggleContexto(id)}
                    aria-pressed={activo}
                    className="gp-panel p-4 text-left relative transition-transform"
                    style={activo
                      ? { borderColor: color, boxShadow: `0 0 0 1px ${color}`, background: `${color}14` }
                      : undefined}
                  >
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div className="rounded-xl flex items-center justify-center" style={{ width: 40, height: 40, background: `${color}22`, color }}>
                        <Icono size={20} />
                      </div>
                      <span
                        className="rounded-full flex items-center justify-center shrink-0"
                        style={{
                          width: 20, height: 20,
                          border: `1.5px solid ${activo ? color : "var(--border)"}`,
                          background: activo ? color : "transparent",
                        }}
                      >
                        {activo && <Check size={13} color="#0B2341" strokeWidth={3} />}
                      </span>
                    </div>
                    <p className="font-medium mb-1">{id}</p>
                    <p className="text-xs gp-text-muted leading-relaxed">{descripcion}</p>
                  </button>
                );
              })}
            </div>

            {/* ARKI explica, no elige por ti (secc. 24). */}
            <div className="mt-5">
              <button onClick={() => setAyudaAbierta((v) => !v)} className="text-xs gp-text-gold flex items-center gap-1.5">
                <Sparkles size={13} /> ¿No estás seguro cuál elegir?
              </button>
              {ayudaAbierta && (
                <div className="gp-panel p-3.5 mt-2 text-xs gp-text-muted leading-relaxed" style={{ borderLeft: "2px solid var(--gold)" }}>
                  Elige <strong style={{ color: "var(--text)" }}>Personal</strong> si quieres organizar principalmente tu vida:
                  agenda, hábitos, salud, tus finanzas y tus proyectos.<br /><br />
                  Agrega <strong style={{ color: "var(--text)" }}>Profesional</strong> si además trabajas por tu cuenta —
                  no necesitas tener una empresa constituida.<br /><br />
                  Agrega <strong style={{ color: "var(--text)" }}>Empresarial</strong> si administras una o varias empresas.<br /><br />
                  Puedes marcar varias, y cambiarlo cuando quieras desde Configuración.
                </div>
              )}
            </div>

            <div className="flex justify-end mt-8">
              <button
                onClick={irAdelante} disabled={contextos.length === 0}
                className="gp-btn px-5 py-2.5 text-sm flex items-center gap-1.5 disabled:opacity-40"
              >
                Continuar <ArrowRight size={15} />
              </button>
            </div>
          </>
        )}

        {paso === 2 && (
          <>
            <h1 className="gp-serif text-2xl md:text-3xl mb-2">Configuración opcional</h1>
            <p className="text-sm gp-text-muted mb-6">
              Nada de esto es obligatorio. Puedes dejarlo en blanco y completarlo cuando quieras.
            </p>

            {tieneProfesional && (
              <div className="gp-panel p-4 mb-3">
                <p className="text-sm font-medium mb-1">¿A qué actividad profesional te dedicas?</p>
                <p className="text-xs gp-text-muted mb-3">
                  Solo para entender a qué te dedicas. No crea ninguna empresa.
                </p>
                <input
                  className="gp-input"
                  placeholder="Músico, consultor, ingeniero, diseñador…"
                  value={actividadProfesional}
                  onChange={(e) => setActividadProfesional(e.target.value)}
                />
              </div>
            )}

            {tieneEmpresarial && (
              <div className="gp-panel p-4">
                <p className="text-sm font-medium mb-3">¿Administras una o varias empresas?</p>
                <div className="flex flex-col sm:flex-row gap-2 mb-1">
                  {[
                    { id: "una", label: "Una empresa" },
                    { id: "varias", label: "Varias empresas" },
                    { id: "despues", label: "Aún no quiero configurarlas" },
                  ].map((o) => {
                    const activo = cuantasEmpresas === o.id;
                    return (
                      <button
                        key={o.id}
                        onClick={() => {
                          setCuantasEmpresas(o.id);
                          if (o.id === "despues") setEmpresas([]);
                          else if (empresas.length === 0) setEmpresas([{ id: uid(), nombre: "", descripcion: "", logoUrl: "" }]);
                          else if (o.id === "una") setEmpresas((prev) => prev.slice(0, 1));
                        }}
                        className="text-xs px-3 py-2 rounded-lg border flex-1 text-left sm:text-center"
                        style={activo
                          ? { borderColor: "var(--gold)", background: "rgba(245,158,11,.12)", color: "var(--text)", fontWeight: 600 }
                          : { borderColor: "var(--border)", color: "var(--muted)" }}
                      >
                        {o.label}
                      </button>
                    );
                  })}
                </div>

                {(cuantasEmpresas === "una" || cuantasEmpresas === "varias") && (
                  <div className="mt-4 pt-4 border-t gp-border">
                    <p className="text-sm font-medium mb-3">Agrega tus empresas</p>
                    <div className="flex flex-col gap-3">
                      {empresas.map((emp, i) => (
                        <FilaEmpresa
                          key={emp.id}
                          empresa={emp}
                          puedeQuitar={empresas.length > 1}
                          onCambiar={(patch) => setEmpresas((prev) => prev.map((x, j) => (j === i ? { ...x, ...patch } : x)))}
                          onQuitar={() => setEmpresas((prev) => prev.filter((_, j) => j !== i))}
                        />
                      ))}
                    </div>
                    {cuantasEmpresas === "varias" && (
                      <button
                        onClick={() => setEmpresas((prev) => [...prev, { id: uid(), nombre: "", descripcion: "", logoUrl: "" }])}
                        className="text-xs gp-text-gold flex items-center gap-1 mt-3"
                      >
                        <Plus size={13} /> Agregar otra empresa
                      </button>
                    )}
                    <p className="text-xs gp-text-muted mt-3">
                      Con el nombre basta para empezar. El resto lo completas después en Mis empresas.
                    </p>
                  </div>
                )}
              </div>
            )}

            <div className="flex justify-end mt-8">
              <button onClick={irAdelante} className="gp-btn px-5 py-2.5 text-sm flex items-center gap-1.5">
                Continuar <ArrowRight size={15} />
              </button>
            </div>
          </>
        )}

        {paso === 3 && (
          <>
            <h1 className="gp-serif text-2xl md:text-3xl mb-2">Así se verá tu ARKEYONE</h1>
            <p className="text-sm gp-text-muted mb-6">
              Tu Centro de Mando arranca con esto. Nada queda fuera del sistema: todos los módulos
              siguen en el menú, y puedes prender o apagar bloques cuando quieras.
            </p>

            <div className="flex flex-wrap gap-1.5 mb-5">
              {contextos.map((c) => (
                <span key={c} className="gp-badge" style={{ color: colorPorContexto[c], background: `${colorPorContexto[c]}22` }}>{c}</span>
              ))}
              {actividadProfesional.trim() && <span className="gp-badge" style={{ color: "var(--muted)", background: "var(--panel-2)" }}>{actividadProfesional.trim()}</span>}
            </div>

            <div className="gp-panel p-4 mb-3">
              <p className="text-xs uppercase tracking-wide gp-text-muted mb-3">Tu Centro de Mando</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {widgetsPrevia.map((w) => (
                  <div key={w} className="rounded-lg px-3 py-2.5 text-xs flex items-center gap-2" style={{ background: "var(--panel-2)" }}>
                    <Check size={12} className="gp-text-teal shrink-0" />
                    <span className="truncate">{etiquetaWidget(w)}</span>
                  </div>
                ))}
              </div>
            </div>

            {empresas.filter((e) => (e.nombre || "").trim()).length > 0 && (
              <div className="gp-panel p-4">
                <p className="text-xs uppercase tracking-wide gp-text-muted mb-3">Tus empresas</p>
                <div className="flex flex-col gap-2">
                  {empresas.filter((e) => (e.nombre || "").trim()).map((e) => (
                    <div key={e.id} className="flex items-center gap-2.5">
                      {e.logoUrl
                        ? <img src={e.logoUrl} alt="" className="rounded-lg object-cover shrink-0" style={{ width: 28, height: 28, border: "1px solid var(--border)" }} />
                        : <div className="rounded-lg flex items-center justify-center shrink-0" style={{ width: 28, height: 28, background: "rgba(22,163,106,.16)", color: "#16A36A" }}><Building2 size={14} /></div>}
                      <span className="text-sm truncate">{e.nombre}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end mt-8">
              <button onClick={terminar} disabled={guardando} className="gp-btn px-5 py-2.5 text-sm flex items-center gap-1.5 disabled:opacity-60">
                {guardando ? "Guardando…" : yaConfigurado ? "Guardar cambios" : "Entrar a ARKEYONE"}
                {!guardando && <ArrowRight size={15} />}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// Una empresa del paso opcional. El logo se sube a Storage con el id que ya tiene la empresa en
// memoria, así la ruta del archivo es la definitiva aunque la fila todavía no exista en la base.
function FilaEmpresa({ empresa, puedeQuitar, onCambiar, onQuitar }) {
  const [subiendo, setSubiendo] = useState(false);
  const [error, setError] = useState("");

  const subirLogo = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { setError("El logo pesa más de 5 MB — usa uno más chico."); return; }
    setError("");
    setSubiendo(true);
    const path = `empresas/${empresa.id}/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
    const { error: upErr } = await supabase.storage.from("adjuntos").upload(path, file);
    setSubiendo(false);
    if (upErr) { setError(`No se pudo subir el logo: ${upErr.message}`); return; }
    const { data: pub } = supabase.storage.from("adjuntos").getPublicUrl(path);
    onCambiar({ logoUrl: pub.publicUrl });
  };

  return (
    <div className="rounded-xl p-3" style={{ background: "var(--panel-2)" }}>
      <div className="flex items-start gap-3">
        <label className="shrink-0 cursor-pointer" title="Logo (opcional)">
          {empresa.logoUrl
            ? <img src={empresa.logoUrl} alt="" className="rounded-lg object-cover" style={{ width: 44, height: 44, border: "1px solid var(--border)" }} />
            : (
              <div className="rounded-lg flex flex-col items-center justify-center gp-text-muted" style={{ width: 44, height: 44, border: "1px dashed var(--border)" }}>
                {subiendo ? <span style={{ fontSize: 9 }}>…</span> : <Upload size={14} />}
              </div>
            )}
          <input type="file" accept="image/*" className="hidden" onChange={subirLogo} disabled={subiendo} />
        </label>
        <div className="flex-1 min-w-0">
          <input
            className="gp-input mb-2" placeholder="Nombre de la empresa"
            value={empresa.nombre} onChange={(e) => onCambiar({ nombre: e.target.value })}
          />
          <input
            className="gp-input" placeholder="Descripción (opcional)"
            value={empresa.descripcion} onChange={(e) => onCambiar({ descripcion: e.target.value })}
          />
        </div>
        {puedeQuitar && (
          <button onClick={onQuitar} className="gp-text-muted shrink-0 p-1" aria-label="Quitar empresa"><X size={14} /></button>
        )}
      </div>
      {error && <p className="text-xs gp-text-red mt-2">{error}</p>}
    </div>
  );
}
