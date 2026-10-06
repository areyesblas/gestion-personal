// src/components/modulos/Configuracion.jsx
//
// Modulo perezoso (Fase 2). Salio de App.jsx el 5 oct 2026; se mudaron con el sus propias
// piezas (CATEGORIAS_NOTIFICACION, FilaConfig, NombreMostrarForm, CiudadForm, PreferenciasNotifForm), que nadie mas usaba.

import AvatarForm from "../comunes/AvatarForm";
import { Bell, ChevronRight, Contact, Download, MapPin, Palette, Shield, Sliders, Sparkles, Trash2, Users } from "lucide-react";
import { Field } from "../ui/basicos";
import { Modal } from "../ui/Modal";
import { useState } from "react";

// Cada "tipo" concreto de notificación (medicamento, cita, deuda, etc.) pertenece a una de estas
// categorías; el usuario activa/desactiva por categoría, no por tipo individual (serían demasiados).
const CATEGORIAS_NOTIFICACION = ["Recordatorios", "Finanzas", "Salud", "Agenda", "Proyectos", "Colaboradores", "Activos digitales", "Documentos"];

// Fila reutilizable para la pantalla de Configuración: un renglón con ícono, texto y una acción
// a la derecha (puede ser una flecha para navegar, o un switch/estado para alternar algo aquí mismo).
function FilaConfig({ icon: Icon, label, sublabel, onClick, extra, chevron = true }) {
  return (
    <button onClick={onClick} className="gp-panel w-full flex items-center gap-3 p-3.5 text-left hover:opacity-90">
      <div className="gp-bloque p-2 rounded shrink-0"><Icon size={17} className="gp-text-gold" /></div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium">{label}</p>
        {sublabel && <p className="text-xs gp-text-muted mt-0.5">{sublabel}</p>}
      </div>
      {extra}
      {chevron && <ChevronRight size={16} className="gp-text-muted shrink-0" />}
    </button>
  );
}

// y administración si aplica) — así el menú lateral queda limpio y esto se siente como una
// verdadera pantalla de ajustes, no una lista de botones sueltos.
export default function Configuracion({
  tema, onAbrirTema, onAbrirExportar, onAbrirMfa,
  alertasCorreoActivas, cambiarAlertasCorreo,
  pushEstado, activarPush, desactivarPush,
  esPropia, irAColaboradores, irAPapelera,
  esAdmin, irAAdmin, miEmail,
  notifTiposDesactivados, notifSilencioActivo, notifSilencioInicio, notifSilencioFin, notifAnticipacionCitasMin, guardarPreferenciasNotif,
  nombreMostrar, guardarNombreMostrar, avatarUrl, subirAvatar,
  ciudad, guardarCiudad,
  contextos, actividadProfesional, onAbrirContextos,
}) {
  const [prefsAbierto, setPrefsAbierto] = useState(false);
  const [nombreModalAbierto, setNombreModalAbierto] = useState(false);
  const [avatarModalAbierto, setAvatarModalAbierto] = useState(false);
  const [ciudadModalAbierto, setCiudadModalAbierto] = useState(false);
  const [confirmarNotif, setConfirmarNotif] = useState(null); // { tipo: 'correo' | 'push', activar: bool }
  const cantidadActivas = CATEGORIAS_NOTIFICACION.length - notifTiposDesactivados.length;
  return (
    <div className="max-w-xl">
      <h1 className="text-2xl font-bold mb-1">Configuración</h1>
      <p className="text-sm gp-text-muted mb-5">{miEmail}</p>

      <p className="text-xs gp-text-muted uppercase tracking-wide mb-2">Perfil</p>
      <div className="space-y-2 mb-5">
        <FilaConfig
          icon={Contact}
          label="Foto de perfil"
          sublabel={avatarUrl ? "Toca para cambiarla" : "Sin foto — se muestran tus iniciales"}
          onClick={() => setAvatarModalAbierto(true)}
          extra={avatarUrl ? <img src={avatarUrl} alt="" className="w-9 h-9 rounded-full object-cover shrink-0" style={{ border: "1px solid var(--border)" }} /> : null}
        />
        <FilaConfig icon={Contact} label="Nombre para mostrar" sublabel={nombreMostrar ? `Te llamamos "${nombreMostrar}"` : "Usando tu correo — toca para elegir un nombre"} onClick={() => setNombreModalAbierto(true)} />
        <FilaConfig icon={MapPin} label="Ciudad" sublabel={ciudad ? `${ciudad} — para el clima del Centro de mando` : "Sin configurar — toca para elegir tu ciudad"} onClick={() => setCiudadModalAbierto(true)} />
      </div>

      <p className="text-xs gp-text-muted uppercase tracking-wide mb-2">Cómo usas ARKEYONE</p>
      <div className="space-y-2 mb-5">
        <FilaConfig
          icon={Sparkles}
          label="Contextos y personalización"
          sublabel={(contextos || []).length
            ? `${contextos.join(" · ")}${actividadProfesional ? ` — ${actividadProfesional}` : ""}`
            : "Sin configurar — elige si usas ARKEYONE para lo personal, lo profesional o tus empresas"}
          onClick={onAbrirContextos}
        />
      </div>

      <p className="text-xs gp-text-muted uppercase tracking-wide mb-2">Apariencia</p>
      <div className="space-y-2 mb-5">
        <FilaConfig icon={Palette} label="Tema" sublabel={tema === "azul-claro" ? "Claro" : "Oscuro"} onClick={onAbrirTema} />
      </div>

      <p className="text-xs gp-text-muted uppercase tracking-wide mb-2">Notificaciones</p>
      <div className="space-y-2 mb-5">
        <FilaConfig icon={Bell} label="Alertas por correo" sublabel={alertasCorreoActivas ? "Activadas" : "Desactivadas"}
          onClick={() => setConfirmarNotif({ tipo: "correo", activar: !alertasCorreoActivas })} chevron={false}
          extra={<span className="text-xs gp-text-gold shrink-0">{alertasCorreoActivas ? "Desactivar" : "Activar"}</span>} />
        {pushEstado !== "sin-soporte" && (
          <FilaConfig icon={Bell} label="Notificaciones push"
            sublabel={pushEstado === "activo" ? "Activadas en este dispositivo" : pushEstado === "denegado" ? "Bloqueadas — revisa los permisos del navegador" : pushEstado === "activando" ? "Activando…" : "Desactivadas en este dispositivo"}
            onClick={() => { if (pushEstado !== "activando") setConfirmarNotif({ tipo: "push", activar: pushEstado !== "activo" }); }}
            chevron={false}
            extra={<span className="text-xs gp-text-gold shrink-0">{pushEstado === "activo" ? "Desactivar" : pushEstado === "activando" ? "" : "Activar"}</span>}
          />
        )}
        <FilaConfig icon={Sliders} label="Preferencias de notificación"
          sublabel={`${cantidadActivas} de ${CATEGORIAS_NOTIFICACION.length} categorías activas · Citas: ${notifAnticipacionCitasMin} min antes${notifSilencioActivo ? ` · Silencio ${notifSilencioInicio}–${notifSilencioFin}` : ""}`}
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

      {confirmarNotif && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,.6)" }} onClick={() => setConfirmarNotif(null)}>
          <div className="gp-panel w-full max-w-sm p-5" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-2 mb-2">
              <Bell size={16} className="gp-text-gold" />
              <h3 className="gp-serif text-lg">
                {confirmarNotif.tipo === "correo"
                  ? (confirmarNotif.activar ? "¿Activar alertas por correo?" : "¿Desactivar alertas por correo?")
                  : (confirmarNotif.activar ? "¿Activar notificaciones push?" : "¿Desactivar notificaciones push?")}
              </h3>
            </div>
            <p className="text-sm gp-text-muted mb-5">
              {confirmarNotif.tipo === "correo"
                ? (confirmarNotif.activar ? "Recibirás un resumen diario por correo con tus pendientes y avisos." : "Dejarás de recibir el resumen diario por correo. Podrás reactivarlo cuando quieras.")
                : (confirmarNotif.activar ? "Este dispositivo pedirá permiso y empezará a recibir avisos push." : "Este dispositivo dejará de recibir avisos push. Podrás reactivarlos cuando quieras.")}
            </p>
            <div className="flex gap-2">
              <button onClick={() => setConfirmarNotif(null)} className="gp-btn-ghost flex-1 py-2 text-sm">Cancelar</button>
              <button
                onClick={() => {
                  if (confirmarNotif.tipo === "correo") cambiarAlertasCorreo(confirmarNotif.activar);
                  else (confirmarNotif.activar ? activarPush() : desactivarPush());
                  setConfirmarNotif(null);
                }}
                className="gp-btn flex-1 py-2 text-sm"
              >
                {confirmarNotif.activar ? "Activar" : "Desactivar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {prefsAbierto && (
        <Modal title="Preferencias de notificación" onClose={() => setPrefsAbierto(false)}>
          <PreferenciasNotifForm
            tiposDesactivados={notifTiposDesactivados}
            silencioActivo={notifSilencioActivo}
            silencioInicio={notifSilencioInicio}
            silencioFin={notifSilencioFin}
            anticipacionCitasMin={notifAnticipacionCitasMin}
            onSave={async (v) => { await guardarPreferenciasNotif(v); }}
            onSaved={() => setPrefsAbierto(false)}
          />
        </Modal>
      )}

      {nombreModalAbierto && (
        <Modal title="Nombre para mostrar" onClose={() => setNombreModalAbierto(false)}>
          <NombreMostrarForm
            nombreMostrar={nombreMostrar}
            onSave={async (v) => { await guardarNombreMostrar(v); }}
            onSaved={() => setNombreModalAbierto(false)}
          />
        </Modal>
      )}

      {avatarModalAbierto && (
        <Modal title="Foto de perfil" onClose={() => setAvatarModalAbierto(false)}>
          <AvatarForm avatarUrl={avatarUrl} subirAvatar={subirAvatar} onSaved={() => setAvatarModalAbierto(false)} />
        </Modal>
      )}

      {ciudadModalAbierto && (
        <Modal title="Ciudad" onClose={() => setCiudadModalAbierto(false)}>
          <CiudadForm
            ciudad={ciudad}
            onSave={async (v) => { await guardarCiudad(v); }}
            onSaved={() => setCiudadModalAbierto(false)}
          />
        </Modal>
      )}
    </div>
  );
}

// Nombre con el que el saludo del Centro de mando y Arkey (asistente de voz) te llaman, en vez
// de derivarlo del correo. Vacío = se sigue usando el correo (ver guardarNombreMostrar).
function NombreMostrarForm({ nombreMostrar, onSave, onSaved }) {
  const [v, setV] = useState(nombreMostrar || "");
  const [estadoGuardado, setEstadoGuardado] = useState("idle"); // idle | guardando | guardado
  return (
    <div>
      <p className="text-xs gp-text-muted mb-3">Así te va a llamar ARKEYONE y Arkey en la conversación. Si lo dejas vacío, se usa tu correo.</p>
      <Field label="Nombre"><input className="gp-input" autoFocus placeholder="ej. Angel" value={v} onChange={(e) => setV(e.target.value)} /></Field>
      <button
        className="gp-btn w-full py-2 text-sm disabled:opacity-70"
        disabled={estadoGuardado === "guardando"}
        onClick={async () => {
          setEstadoGuardado("guardando");
          await onSave(v.trim());
          setEstadoGuardado("guardado");
          setTimeout(() => onSaved?.(), 900);
        }}
      >
        {estadoGuardado === "guardando" ? "Guardando…" : estadoGuardado === "guardado" ? "Guardado ✓" : "Guardar"}
      </button>
    </div>
  );
}

// de Open-Meteo (gratis, sin API key) y deja elegir entre los resultados para evitar ambigüedad
// (ej. "Guadalajara" existe en México y en España) — se guarda ya con lat/lon resueltos.
function CiudadForm({ ciudad, onSave, onSaved }) {
  const [texto, setTexto] = useState(ciudad || "");
  const [buscando, setBuscando] = useState(false);
  const [resultados, setResultados] = useState([]);
  const [error, setError] = useState("");
  const [guardando, setGuardando] = useState(false);

  const buscar = async () => {
    if (!texto.trim()) return;
    setBuscando(true);
    setError("");
    setResultados([]);
    try {
      const res = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(texto.trim())}&count=5&language=es&format=json`);
      const json = await res.json();
      if (!json.results?.length) { setError("No se encontró esa ciudad. Intenta con otro nombre."); return; }
      setResultados(json.results);
    } catch {
      setError("No se pudo buscar — revisa tu conexión.");
    } finally {
      setBuscando(false);
    }
  };

  const elegir = async (r) => {
    const nombre = [r.name, r.admin1, r.country].filter(Boolean).join(", ");
    setGuardando(true);
    await onSave({ ciudad: nombre, lat: r.latitude, lon: r.longitude });
    setTimeout(() => onSaved?.(), 700);
  };

  return (
    <div>
      <p className="text-xs gp-text-muted mb-3">Se usa para mostrar el clima junto al buscador del Centro de mando.</p>
      <div className="flex gap-2 mb-3">
        <input
          className="gp-input flex-1"
          autoFocus
          placeholder="ej. Ciudad de México"
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") buscar(); }}
        />
        <button className="gp-btn px-3 py-2 text-sm disabled:opacity-70" disabled={buscando || !texto.trim()} onClick={buscar}>
          {buscando ? "Buscando…" : "Buscar"}
        </button>
      </div>
      {error && <p className="text-xs gp-text-red mb-2">{error}</p>}
      {resultados.length > 0 && (
        <div className="flex flex-col gap-1">
          {resultados.map((r, i) => (
            <button
              key={i}
              disabled={guardando}
              onClick={() => elegir(r)}
              className="gp-btn-ghost text-left px-3 py-2 rounded text-sm disabled:opacity-70"
            >
              {[r.name, r.admin1, r.country].filter(Boolean).join(", ")}
            </button>
          ))}
        </div>
      )}
      {guardando && <p className="text-xs gp-text-gold mt-2">Guardado ✓</p>}
    </div>
  );
}

// que no se envían — sin borrar los eventos, que siguen quedando disponibles en el Centro de
// Notificaciones para revisar cuando el usuario quiera.
function PreferenciasNotifForm({ tiposDesactivados, silencioActivo, silencioInicio, silencioFin, anticipacionCitasMin, onSave, onSaved }) {
  const [desactivados, setDesactivados] = useState(tiposDesactivados);
  const [silencio, setSilencio] = useState(silencioActivo);
  const [inicio, setInicio] = useState(silencioInicio);
  const [fin, setFin] = useState(silencioFin);
  const [anticipacionCitas, setAnticipacionCitas] = useState(anticipacionCitasMin ?? 30);
  const [estadoGuardado, setEstadoGuardado] = useState("idle"); // idle | guardando | guardado
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

      <div className="gp-panel p-2.5 mb-4">
        <Field label="Avisar citas con cuánta anticipación">
          <div className="flex items-center gap-2">
            <input
              type="number" min={5} max={120} step={5} className="gp-input w-24"
              value={anticipacionCitas}
              onChange={(e) => setAnticipacionCitas(e.target.value === "" ? "" : Number(e.target.value))}
            />
            <span className="text-sm gp-text-muted">minutos antes</span>
          </div>
        </Field>
        <p className="text-xs gp-text-muted mt-1">Aplica a todas tus citas. Entre 5 y 120 minutos. Por defecto: 30.</p>
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

      <button
        className="gp-btn w-full py-2 text-sm disabled:opacity-70"
        disabled={estadoGuardado === "guardando"}
        onClick={async () => {
          const minutos = Math.min(120, Math.max(5, Number(anticipacionCitas) || 30));
          setEstadoGuardado("guardando");
          await onSave({ tipos: desactivados, silencioActivo: silencio, silencioInicio: inicio, silencioFin: fin, anticipacionCitasMin: minutos });
          setAnticipacionCitas(minutos);
          setEstadoGuardado("guardado");
          setTimeout(() => onSaved?.(), 900);
        }}
      >
        {estadoGuardado === "guardando" ? "Guardando…" : estadoGuardado === "guardado" ? "Guardado ✓" : "Guardar"}
      </button>
    </div>
  );
}
