import ArchivosEntidad from "../comunes/ArchivosEntidad";
import AvatarForm from "../comunes/AvatarForm";
import { AvatarContacto, tiposDeContacto } from "../comunes/contactos";
import { Badge, Field, IconBtn } from "../ui/basicos";
import { BarChart3, CalendarClock, Contact, FileText, FolderKanban, Gift, Mail, Pencil, Phone, StickyNote, User, X } from "lucide-react";
import { CampoTelefonoPais, CumpleanosField, armarNombreContacto } from "../comunes/camposContacto";
import { ComboboxMultiBuscar } from "../ui/campos";
import { compararEs, ordenAlfabetico } from "../../lib/listas";
import { fmtFechaHora, localInputsAFechaHora } from "../../lib/fechaHora";
import { supabase } from "../../supabaseClient";
import { todayISO, uid } from "../../lib/formato";
import { useState } from "react";

// y "Familia" se agregaron el 24 sept 2026 con el rediseño de la pantalla, calcados del mockup de
// Angel — la columna `tipos` es text[], así que ampliar el catálogo no requiere migración.
export const TIPOS_CONTACTO = ordenAlfabetico(["Amistad", "Cliente", "Proveedor", "Colaborador", "Personal", "Familia", "Otro"]);

// Un color propio por rol, para distinguirlos de un vistazo en la lista (mockup 24 sept 2026).
export const COLOR_TIPO_CONTACTO = { Amistad: "#14B8A6", Cliente: "#087CF5", Proveedor: "#F59E0B", Colaborador: "#16A36A", Personal: "#8B5CF6", Familia: "#EC4899", Otro: "#64748B" };

// Catálogo abierto de etiquetas: se deduce de las que ya se usaron, igual que los tags de

export const etiquetasDeContactos = (contactos) =>
  [...new Set((contactos || []).flatMap((c) => c.etiquetas || []))].sort((a, b) => compararEs(a, b));

export const titulosDeContactos = (contactos) =>
  [...new Set([...TITULOS_CONTACTO, ...(contactos || []).map((c) => (c.titulo || "").trim()).filter(Boolean)])]
    .sort((a, b) => compararEs(a, b));

export const TITULOS_CONTACTO = ordenAlfabetico(["Arq.", "C.P.", "Dr.", "Dra.", "Ing.", "Lic.", "Mtro.", "Mtra.", "Profr.", "Sr.", "Sra."]);

export const PARENTESCOS = ordenAlfabetico(["Papá", "Mamá", "Hermano/a", "Hijo/a", "Esposo/a", "Abuelo/a", "Tío/a", "Primo/a", "Sobrino/a", "Cuñado/a", "Suegro/a", "Compadre/Comadre", "Amigo cercano", "Conocido"]);

// Días que faltan para el próximo cumpleaños (a partir de una fecha de nacimiento cualquiera).
export const diasParaCumple = (fechaNacimiento) => {
  if (!fechaNacimiento) return null;
  const hoy = new Date(todayISO());
  const nac = new Date(fechaNacimiento);
  let proximo = new Date(hoy.getFullYear(), nac.getMonth(), nac.getDate());
  if (proximo < hoy) proximo = new Date(hoy.getFullYear() + 1, nac.getMonth(), nac.getDate());
  return Math.round((proximo - hoy) / 86400000);
};

// Las etiquetas del contacto, en chips. Se ven en la lista y en la ficha: son justo el dato que
// sirve para encontrar a alguien ("¿quiénes son de Gobierno?").
export function ChipsEtiquetasContacto({ c, max = 3 }) {
  const lista = c.etiquetas || [];
  if (lista.length === 0) return null;
  return (
    <span className="inline-flex items-center gap-1 flex-wrap">
      {lista.slice(0, max).map((e) => (
        <span key={e} className="gp-badge" style={{ color: "var(--muted)", background: "var(--panel-2)" }}>{e}</span>
      ))}
      {lista.length > max && <span className="text-[10px] gp-text-muted">+{lista.length - max}</span>}
    </span>
  );
}

export function ChipsTiposContacto({ c }) {
  return (
    <div className="flex items-center gap-1 flex-wrap">
      {tiposDeContacto(c).map((t) => (
        <span key={t} className="gp-badge" style={{ color: COLOR_TIPO_CONTACTO[t] || "var(--muted)", background: `${COLOR_TIPO_CONTACTO[t] || "#64748B"}22` }}>{t}</span>
      ))}
      {c.parentesco && <Badge tone="muted">{c.parentesco}</Badge>}
    </div>
  );
}

export function BadgeCumpleContacto({ c }) {
  const dc = diasParaCumple(c.fechaNacimiento);
  if (dc === null || dc > 30) return null;
  return <Badge tone="gold">🎂 {dc === 0 ? "¡hoy!" : `en ${dc}d`}</Badge>;
}

// verde bandera para no confundirlo con el verde de WhatsApp, correo en el azul ARKEYONE y
// agendar en el mismo dorado del botón "Nuevo contacto".
export const VERDE_BANDERA = "#006847";

export const AZUL_CORREO = "#087CF5";

export const VERDE_WHATSAPP = "#25D366";

// lucide, que no trae íconos de marca. Va como SVG inline y relleno (no trazo) para que se vea
// igual que el original. Verde oficial #25D366.
export function IconoWhatsApp({ size = 14, color = "currentColor" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color} aria-hidden="true" focusable="false">
      <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.46 1.32 4.96L2 22l5.25-1.38a9.87 9.87 0 0 0 4.79 1.22h.01c5.46 0 9.91-4.45 9.91-9.91C21.96 6.45 17.5 2 12.04 2zm0 18.15h-.01a8.2 8.2 0 0 1-4.18-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.19 8.19 0 0 1-1.26-4.38c0-4.54 3.7-8.23 8.24-8.23 2.2 0 4.27.86 5.82 2.42a8.18 8.18 0 0 1 2.41 5.82c0 4.54-3.69 8.23-8.23 8.23z"/>
      <path d="M16.6 14.22c-.25-.13-1.47-.72-1.7-.8-.23-.09-.4-.13-.56.12-.17.25-.64.8-.79.97-.14.16-.29.18-.54.06-.25-.13-1.05-.39-2-1.23-.74-.66-1.24-1.47-1.38-1.72-.15-.25-.02-.39.11-.51.11-.11.25-.29.37-.44.13-.15.17-.25.25-.41.08-.17.04-.31-.02-.44-.06-.12-.56-1.35-.77-1.85-.2-.48-.4-.42-.56-.43h-.47c-.17 0-.44.06-.67.31-.23.25-.87.85-.87 2.07 0 1.22.89 2.4 1.02 2.57.12.16 1.76 2.68 4.25 3.76.6.26 1.06.41 1.42.53.6.19 1.14.16 1.57.1.48-.07 1.47-.6 1.68-1.18.21-.58.21-1.08.15-1.18-.06-.11-.23-.17-.48-.29z"/>
    </svg>
  );
}

// Nota rápida ligada al contacto: se guarda en el módulo de Notas con su contacto_id, no en una
// copia aparte — por eso también aparece en la pantalla de Notas.
export function NuevaNotaContacto({ c, onAddNota }) {
  const [abierto, setAbierto] = useState(false);
  const [titulo, setTitulo] = useState("");
  const [contenido, setContenido] = useState("");
  if (!abierto) {
    return <button onClick={() => setAbierto(true)} className="text-xs gp-text-gold">+ Nueva nota</button>;
  }
  return (
    <div className="mt-2 pt-2 border-t gp-border">
      <input className="gp-input text-xs mb-2" autoFocus placeholder="Título" value={titulo} onChange={(e) => setTitulo(e.target.value)} />
      <textarea className="gp-input text-xs" rows={3} placeholder="Escribe la nota…" value={contenido} onChange={(e) => setContenido(e.target.value)} />
      <div className="flex gap-2 mt-2">
        <button onClick={() => { setAbierto(false); setTitulo(""); setContenido(""); }} className="gp-btn-ghost flex-1 py-1.5 text-xs">Cancelar</button>
        <button
          className="gp-btn flex-1 py-1.5 text-xs"
          onClick={() => {
            if (!titulo.trim() && !contenido.trim()) return;
            onAddNota({ titulo: titulo.trim() || `Nota de ${c.nombre}`, contenido: contenido.trim(), contactoId: c.id });
            setAbierto(false); setTitulo(""); setContenido("");
          }}
        >Guardar</button>
      </div>
    </div>
  );
}

// El evento se guarda en el módulo Eventos con su contacto_id — no se duplica nada aquí, la ficha
// solo lo consulta. Los detalles (costos, media, proyecto) se completan después en Eventos.
export function NuevoEventoContacto({ c, onAddEvento }) {
  const [abierto, setAbierto] = useState(false);
  const [nombre, setNombre] = useState("");
  const [fecha, setFecha] = useState(todayISO());
  const [lugar, setLugar] = useState("");
  const limpiar = () => { setAbierto(false); setNombre(""); setFecha(todayISO()); setLugar(""); };
  if (!abierto) {
    return <button onClick={() => setAbierto(true)} className="text-xs gp-text-gold">+ Nuevo evento</button>;
  }
  return (
    <div className="mt-2 pt-2 border-t gp-border">
      <input className="gp-input text-xs mb-2" autoFocus placeholder="Nombre del evento" value={nombre} onChange={(e) => setNombre(e.target.value)} />
      <div className="grid grid-cols-2 gap-2">
        <input type="date" className="gp-input text-xs" value={fecha} onChange={(e) => setFecha(e.target.value)} />
        <input className="gp-input text-xs" placeholder="Lugar (opcional)" value={lugar} onChange={(e) => setLugar(e.target.value)} />
      </div>
      <div className="flex gap-2 mt-2">
        <button onClick={limpiar} className="gp-btn-ghost flex-1 py-1.5 text-xs">Cancelar</button>
        <button
          className="gp-btn flex-1 py-1.5 text-xs"
          onClick={() => {
            if (!nombre.trim()) return;
            onAddEvento({ nombre: nombre.trim(), fecha, lugar: lugar.trim(), contactoId: c.id });
            limpiar();
          }}
        >Guardar</button>
      </div>
    </div>
  );
}

// Horarios y duraciones en bloques de media hora (pedido de Angel, 24 sept 2026): agendar a las
// 9, 9:30, 10… y poder apartar más de una hora para una reunión, sin teclear la hora a mano.
export const HORAS_MEDIA_HORA = Array.from({ length: 48 }, (_, i) =>
  `${String(Math.floor(i / 2)).padStart(2, "0")}:${i % 2 === 0 ? "00" : "30"}`);

export const DURACIONES_MEDIA_HORA = Array.from({ length: 16 }, (_, i) => (i + 1) * 0.5); // 0.5 h a 8 h

export const etiquetaDuracion = (h) => {
  const horas = Math.floor(h);
  const media = h % 1 !== 0;
  if (horas === 0) return "30 min";
  return `${horas}${media ? " ½" : ""} h`;
};

// Lo que tienes agendado con esta persona: citas del módulo Agenda ligadas a su contacto_id, más
// la opción de agendar una nueva sin salir de la ficha (queda en Agenda, no en una copia).
export function AgendaContacto({ c, data, onAddCita, onIrAVista }) {
  const [abierto, setAbierto] = useState(false);
  const [titulo, setTitulo] = useState("");
  const [fecha, setFecha] = useState(todayISO());
  const [hora, setHora] = useState("09:00");
  const [duracionHoras, setDuracionHoras] = useState(1);
  const [lugar, setLugar] = useState("");

  const ahora = new Date().toISOString();
  // Una cita puede tener VARIOS contactos (citas.contacto_ids). Se revisa ese arreglo y también
  // el contacto_id suelto, que es como quedaron las citas viejas de antes de que fuera multi.
  const citas = (data.citas || [])
    .filter((x) => (x.contactoIds || []).includes(c.id) || x.contactoId === c.id)
    .sort((a, b) => (a.fechaHora || "").localeCompare(b.fechaHora || ""));
  const proximas = citas.filter((x) => (x.fechaHora || "") >= ahora);
  const pasadas = citas.filter((x) => (x.fechaHora || "") < ahora).reverse();

  const Linea = ({ x, tenue }) => (
    <div className="flex items-start justify-between gap-2 py-1.5" style={tenue ? { opacity: 0.6 } : undefined}>
      <div className="min-w-0">
        <p className="text-xs font-medium truncate">{x.titulo}</p>
        <p className="text-[10px] gp-text-muted truncate">
          {[x.lugar, `${Number(x.duracionHoras) > 0 ? Number(x.duracionHoras) : 1} h`].filter(Boolean).join(" · ")}
        </p>
      </div>
      <span className="text-[10px] gp-mono gp-text-muted shrink-0">{fmtFechaHora(x.fechaHora)}</span>
    </div>
  );

  return (
    <>
      {proximas.length === 0 && pasadas.length === 0 && (
        <p className="text-xs gp-text-muted py-2">No tienes nada agendado con {c.nombre.split(" ")[0]}. Agenda algo aquí abajo.</p>
      )}
      {proximas.length > 0 && (
        <div className="mb-2">
          <p className="text-[10px] uppercase tracking-wide gp-text-muted mb-1">Próximas</p>
          {proximas.map((x) => <Linea key={x.id} x={x} />)}
        </div>
      )}
      {pasadas.length > 0 && (
        <div className="mb-2">
          <p className="text-[10px] uppercase tracking-wide gp-text-muted mb-1">Ya pasaron</p>
          {pasadas.slice(0, 5).map((x) => <Linea key={x.id} x={x} tenue />)}
        </div>
      )}

      {!abierto ? (
        <div className="flex items-center gap-3 mt-1">
          <button onClick={() => { setAbierto(true); setTitulo(`Cita con ${c.nombre}`); }} className="gp-btn px-3 py-1.5 text-xs rounded flex items-center gap-1.5">
            <CalendarClock size={13} /> Agendar cita
          </button>
          <button onClick={() => onIrAVista?.("agenda")} className="text-xs gp-text-gold">Ver Agenda →</button>
        </div>
      ) : (
        <div className="mt-2 pt-2 border-t gp-border">
          <input className="gp-input text-xs mb-2" autoFocus placeholder="¿De qué es la cita?" value={titulo} onChange={(e) => setTitulo(e.target.value)} />
          <div className="grid grid-cols-3 gap-2 mb-2">
            <input type="date" className="gp-input text-xs" value={fecha} onChange={(e) => setFecha(e.target.value)} />
            <select className="gp-input text-xs" value={hora} onChange={(e) => setHora(e.target.value)} aria-label="Hora de inicio">
              {HORAS_MEDIA_HORA.map((h) => <option key={h} value={h}>{h}</option>)}
            </select>
            <select className="gp-input text-xs" value={duracionHoras} onChange={(e) => setDuracionHoras(Number(e.target.value))} aria-label="Duración">
              {DURACIONES_MEDIA_HORA.map((d) => <option key={d} value={d}>{etiquetaDuracion(d)}</option>)}
            </select>
          </div>
          <input className="gp-input text-xs" placeholder="Lugar (opcional)" value={lugar} onChange={(e) => setLugar(e.target.value)} />
          <div className="flex gap-2 mt-2">
            <button onClick={() => setAbierto(false)} className="gp-btn-ghost flex-1 py-1.5 text-xs">Cancelar</button>
            <button
              className="gp-btn flex-1 py-1.5 text-xs"
              onClick={() => {
                if (!titulo.trim() || !fecha) return;
                // contactoIds (arreglo) es como guarda la Agenda: así esta cita también sale bien
                // en el calendario y admite sumarle más personas después.
                onAddCita({
                  titulo: titulo.trim(), fechaHora: localInputsAFechaHora(fecha, hora),
                  duracionHoras, lugar: lugar.trim(), contactoIds: [c.id], tags: [], notas: "",
                });
                setAbierto(false); setLugar("");
              }}
            >Guardar cita</button>
          </div>
        </div>
      )}
    </>
  );
}

// Botón de acción de la ficha. Mantiene su color siempre; si el dato que necesita no está
// capturado, en vez de quedar muerto lleva a capturarlo. `color` vacío = botón neutro (ghost).
export function BotonAccionFicha({ color, colorTexto, icono, label, href, nuevaPestana, onClick, onFalta, faltaTitulo }) {
  const estilo = color ? { background: color, color: colorTexto || "#fff" } : undefined;
  const clases = `py-2 text-xs rounded flex items-center justify-center gap-1.5 font-medium ${color ? "" : "gp-btn-ghost"}`;
  if (href) {
    return (
      <a href={href} className={clases} style={estilo} {...(nuevaPestana ? { target: "_blank", rel: "noopener noreferrer" } : {})}>
        {icono} {label}
      </a>
    );
  }
  return (
    <button onClick={onClick || onFalta} title={onClick ? undefined : faltaTitulo} className={clases} style={estilo}>
      {icono} {label}
    </button>
  );
}

// Atenciones del módulo Regalos/Atenciones, Eventos del módulo Eventos y Notas del módulo Notas
// — cada bloque solo consulta y deja abrir el módulo fuente, como pide el documento maestro.
export function FichaContacto({ c, data, proyectosVinculados, onCerrar, onEditar, onVerAtenciones, onIrAVista, onAddNota, onAddCita, onAddEvento, onAddComentario, tab, onTab, onVerProyecto }) {
  const setTab = onTab;
  const citas = (data.citas || []).filter((x) => x.contactoId === c.id);
  const archivos = (data.comentarios || [])
    .filter((x) => x.entidadTipo === "contactos" && x.entidadId === c.id)
    .reduce((n, x) => n + (x.adjuntos || []).length, 0);
  const atenciones = (data.regalos || [])
    .filter((r) => r.contactoId === c.id)
    .sort((a, b) => (b.fecha || "").localeCompare(a.fecha || ""));
  const eventos = (data.eventos || [])
    .filter((e) => e.contactoId === c.id)
    .sort((a, b) => (b.fecha || "").localeCompare(a.fecha || ""));
  const notas = (data.notas || []).filter((n) => n.contactoId === c.id);
  const ultimaAtencion = atenciones[0];

  const TABS = [
    { key: "informacion", label: "Información" },
    { key: "proyectos", label: "Proyectos", n: proyectosVinculados.length },
    { key: "agenda", label: "Agenda", n: citas.length },
    { key: "notas", label: "Notas", n: notas.length },
    { key: "eventos", label: "Eventos", n: eventos.length },
    { key: "atenciones", label: "Atenciones", n: atenciones.length },
    { key: "archivos", label: "Archivos", n: archivos },
  ];

  const Dato = ({ label, valor }) => (
    valor ? (
      <div className="flex items-start justify-between gap-3 py-1.5">
        <span className="text-xs gp-text-muted shrink-0">{label}</span>
        <span className="text-xs text-right">{valor}</span>
      </div>
    ) : null
  );

  const Bloque = ({ titulo, icono, accion, children }) => (
    <div className="gp-panel p-3.5 mb-3">
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm font-medium flex items-center gap-1.5">{icono} {titulo}</p>
        {accion}
      </div>
      {children}
    </div>
  );

  const Vacio = ({ children }) => <p className="text-xs gp-text-muted py-2">{children}</p>;

  return (
    <div className="gp-panel p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-3 min-w-0">
          <AvatarContacto c={c} size={64} />
          <div className="min-w-0">
            {/* Solo nombre y apellidos. El título va como dato, más abajo. */}
            <p className="gp-serif text-lg leading-tight">{c.nombre}</p>
            <div className="mt-1 flex flex-wrap items-center gap-1"><ChipsTiposContacto c={c} /><ChipsEtiquetasContacto c={c} /></div>
            {c.puesto && <p className="text-xs gp-text-muted mt-1">{c.puesto}</p>}
            {c.empresa && <p className="text-xs gp-text-muted">{c.empresa}</p>}
            <div className="mt-1"><BadgeCumpleContacto c={c} /></div>
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button onClick={onEditar} className="gp-btn-ghost px-2.5 py-1.5 text-xs rounded flex items-center gap-1"><Pencil size={12} /> Editar</button>
          <IconBtn title="Cerrar" onClick={onCerrar}><X size={15} /></IconBtn>
        </div>
      </div>

      {/* Los botones SIEMPRE conservan su color (verde WhatsApp, azul correo), aunque el contacto
          todavía no tenga ese dato — apagarlos hacía que la ficha se viera rota estando bien
          (pedido de Angel, 24 sept 2026). Si falta el dato, el botón no lleva a un enlace roto:
          abre el formulario para capturarlo. */}
      <div className="grid grid-cols-2 gap-2 mt-3">
        <BotonAccionFicha
          color={VERDE_WHATSAPP} colorTexto="#0B2341" icono={<IconoWhatsApp size={14} color="#0B2341" />} label="WhatsApp"
          href={c.whatsapp ? `https://wa.me/${(c.whatsapp || "").replace(/\D/g, "")}` : null}
          nuevaPestana onFalta={onEditar} faltaTitulo="Agrega su WhatsApp"
        />
        <BotonAccionFicha
          color={AZUL_CORREO} icono={<Mail size={13} />} label="Enviar correo"
          href={c.correo ? `mailto:${c.correo}` : null}
          onFalta={onEditar} faltaTitulo="Agrega su correo"
        />
        {/* Llamada telefónica normal (tel:), no WhatsApp — por eso va en verde bandera y con el
            ícono de teléfono, para que no se confunda con el botón de arriba. */}
        <BotonAccionFicha
          color={VERDE_BANDERA} icono={<Phone size={13} />} label="Llamar"
          href={(c.telefono || c.whatsapp) ? `tel:${c.telefono || c.whatsapp}` : null}
          onFalta={onEditar} faltaTitulo="Agrega su teléfono"
        />
        <BotonAccionFicha
          color="var(--gold)" colorTexto="#0B2341" icono={<CalendarClock size={13} />} label="Agendar"
          onClick={() => setTab("agenda")}
        />
      </div>

      <div className="flex flex-wrap gap-1 mt-4 mb-3">
        {TABS.map((t) => (
          <button
            key={t.key} onClick={() => setTab(t.key)}
            className="text-xs px-2.5 py-1.5 rounded-full whitespace-nowrap shrink-0"
            style={tab === t.key
              ? { background: "var(--panel-hi)", color: "var(--text)", fontWeight: 600 }
              : { color: "var(--muted)" }}
          >
            {t.label}{t.n === undefined ? "" : ` ${t.n}`}
          </button>
        ))}
      </div>

      {tab === "informacion" && (
        <>
          <Bloque titulo="Información personal" icono={<User size={14} className="gp-text-gold" />}>
            <Dato label="Nombre(s)" valor={c.nombres} />
            <Dato label="Apellido paterno" valor={c.apellidoPaterno} />
            <Dato label="Apellido materno" valor={c.apellidoMaterno} />
            {/* El título vive aquí desde que salió del nombre: se captura para dirigirse a la
                persona ("Estimado M en C Quintana"), no para identificarla en una lista. */}
            <Dato label="Título" valor={c.titulo} />
            <Dato label="Cumpleaños" valor={c.fechaNacimiento} />
            <Dato label="Parentesco" valor={c.parentesco} />
            <Dato label="Dónde lo conociste" valor={c.contexto} />
            {/* La nota del contacto ya NO se muestra aquí: vive en su propia pestaña de Notas,
                para no tener dos lugares distintos donde escribir sobre la misma persona
                (pedido de Angel, 24 sept 2026). */}
            {!c.nombres && !c.fechaNacimiento && !c.contexto && <Vacio>Sin datos personales capturados todavía.</Vacio>}
          </Bloque>

          <Bloque titulo="Comunicación" icono={<Contact size={14} className="gp-text-gold" />}>
            <Dato label="WhatsApp" valor={c.whatsapp} />
            <Dato label="Teléfono" valor={c.telefono} />
            <Dato label="Correo" valor={c.correo} />
            <Dato label="Dirección" valor={c.direccion} />
            {!c.whatsapp && !c.telefono && !c.correo && !c.direccion && <Vacio>Sin datos de contacto todavía.</Vacio>}
          </Bloque>

          <Bloque titulo="Resumen" icono={<BarChart3 size={14} className="gp-text-gold" />}>
            <div className="grid grid-cols-4 gap-2">
              {[
                { n: proyectosVinculados.length, label: "Proyectos", color: "#F59E0B" },
                { n: atenciones.length, label: "Atenciones", color: "#EC4899" },
                { n: eventos.length, label: "Eventos", color: "#087CF5" },
                { n: notas.length, label: "Notas", color: "#8B5CF6" },
              ].map((x) => (
                <div key={x.label} className="rounded-lg p-2 text-center" style={{ background: `${x.color}17` }}>
                  <p className="gp-serif text-lg" style={{ color: x.color }}>{x.n}</p>
                  <p className="text-[10px] gp-text-muted">{x.label}</p>
                </div>
              ))}
            </div>
            {ultimaAtencion && (
              <div className="flex items-center justify-between gap-2 mt-3 pt-2.5 border-t gp-border">
                <span className="text-xs gp-text-muted">Última atención: <span className="gp-mono">{ultimaAtencion.fecha || "—"}</span> · {ultimaAtencion.tipo}</span>
                {onVerAtenciones && <button onClick={() => onVerAtenciones(c)} className="text-xs gp-text-gold shrink-0">Ver todas →</button>}
              </div>
            )}
          </Bloque>

          <Bloque
            titulo="Proyectos relacionados"
            icono={<FolderKanban size={14} className="gp-text-gold" />}
            accion={proyectosVinculados.length > 0 && <button onClick={() => setTab("proyectos")} className="text-xs gp-text-gold">Ver todos ({proyectosVinculados.length})</button>}
          >
            {proyectosVinculados.length === 0
              ? <Vacio>Sin proyectos vinculados. Se vinculan al editar el contacto.</Vacio>
              : (
                <div className="flex flex-col gap-1.5">
                  {proyectosVinculados.slice(0, 3).map((p) => (
                    <button key={p.id} onClick={() => onVerProyecto?.(p.id)} className="flex items-center justify-between gap-2 w-full text-left">
                      <div className="min-w-0">
                        <p className="text-xs font-medium truncate">{p.nombre}</p>
                        <p className="text-[10px] gp-text-muted">{p.categoria}</p>
                      </div>
                      <Badge tone={p.estatus === "Activo" ? "teal" : "muted"}>{p.estatus}</Badge>
                    </button>
                  ))}
                </div>
              )}
          </Bloque>
        </>
      )}

      {tab === "proyectos" && (
        <Bloque titulo="Proyectos relacionados" icono={<FolderKanban size={14} className="gp-text-gold" />} accion={<button onClick={onEditar} className="text-xs gp-text-gold">Vincular</button>}>
          {proyectosVinculados.length === 0
            ? <Vacio>Sin proyectos vinculados. Dale a "Vincular" para relacionarlo con uno o varios.</Vacio>
            : (
              <div className="flex flex-col gap-2">
                {proyectosVinculados.map((p) => (
                  <div key={p.id} className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-xs font-medium truncate">{p.nombre}</p>
                      <p className="text-[10px] gp-text-muted">{p.categoria}</p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <Badge tone={p.estatus === "Activo" ? "teal" : "muted"}>{p.estatus}</Badge>
                      <button onClick={() => onVerProyecto?.(p.id)} className="text-xs gp-text-gold">Abrir</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
        </Bloque>
      )}

      {tab === "agenda" && (
        <Bloque titulo="Agenda con este contacto" icono={<CalendarClock size={14} className="gp-text-gold" />}>
          <AgendaContacto c={c} data={data} onAddCita={onAddCita} onIrAVista={onIrAVista} />
        </Bloque>
      )}

      {tab === "notas" && (
        <Bloque titulo="Notas" icono={<StickyNote size={14} className="gp-text-gold" />}>
          {/* La nota corta que se captura en la ficha del contacto (campo `notas`), que antes
              salía perdida dentro de Información general. */}
          {c.notas && (
            <div className="mb-3 pb-2.5 border-b gp-border">
              <p className="text-[10px] uppercase tracking-wide gp-text-muted mb-1">Nota del contacto</p>
              <p className="text-xs">{c.notas}</p>
            </div>
          )}
          {notas.length === 0
            ? <Vacio>Sin notas ligadas a este contacto. Las que crees aquí quedan también en el módulo de Notas.</Vacio>
            : (
              <div className="flex flex-col gap-2">
                {notas.map((n) => (
                  <div key={n.id} className="pb-2 border-b gp-border last:border-0">
                    <p className="text-xs font-medium">{n.titulo || "(sin título)"}</p>
                    {n.contenido && <p className="text-[11px] gp-text-muted line-clamp-2">{n.contenido}</p>}
                  </div>
                ))}
                <button onClick={() => onIrAVista?.("notas")} className="text-xs gp-text-gold text-left">Ver en Notas →</button>
              </div>
            )}
          {onAddNota && <NuevaNotaContacto c={c} onAddNota={onAddNota} />}
        </Bloque>
      )}

      {tab === "eventos" && (
        <Bloque
          titulo="Eventos"
          icono={<CalendarClock size={14} className="gp-text-gold" />}
          accion={eventos.length > 0 && <button onClick={() => onIrAVista?.("eventos")} className="text-xs gp-text-gold">Ver en Eventos</button>}
        >
          {eventos.length === 0
            ? <Vacio>Sin eventos relacionados con este contacto. Crea uno aquí abajo y queda en el módulo de Eventos.</Vacio>
            : (
              <div className="flex flex-col gap-2">
                {/* Cada renglón entra al módulo Eventos: la ficha consulta, no duplica. */}
                {eventos.map((e) => (
                  <button key={e.id} onClick={() => onIrAVista?.("eventos")} className="flex items-center justify-between gap-2 w-full text-left gp-panel-hi rounded px-1.5 py-1">
                    <div className="min-w-0">
                      <p className="text-xs font-medium truncate">{e.nombre}</p>
                      {e.lugar && <p className="text-[10px] gp-text-muted truncate">{e.lugar}</p>}
                    </div>
                    <span className="text-[10px] gp-mono gp-text-muted shrink-0">{e.fecha}</span>
                  </button>
                ))}
              </div>
            )}
          {onAddEvento && <div className="mt-2"><NuevoEventoContacto c={c} onAddEvento={onAddEvento} /></div>}
        </Bloque>
      )}

      {tab === "atenciones" && (
        <Bloque
          titulo="Atenciones"
          icono={<Gift size={14} className="gp-text-gold" />}
          accion={onVerAtenciones && <button onClick={() => onVerAtenciones(c)} className="text-xs gp-text-gold">Ver todas</button>}
        >
          {atenciones.length === 0
            ? <Vacio>Sin atenciones registradas: regalos, felicitaciones, llamadas, visitas…</Vacio>
            : (
              <div className="flex flex-col gap-2">
                {atenciones.map((a) => (
                  <div key={a.id} className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-xs font-medium">{a.tipo}{a.ocasion ? ` · ${a.ocasion}` : ""}</p>
                      {a.descripcion && <p className="text-[10px] gp-text-muted truncate">{a.descripcion}</p>}
                    </div>
                    <span className="text-[10px] gp-mono gp-text-muted shrink-0">{a.fecha || a.anio || ""}</span>
                  </div>
                ))}
              </div>
            )}
        </Bloque>
      )}

      {tab === "archivos" && (
        <Bloque titulo="Archivos" icono={<FileText size={14} className="gp-text-gold" />}>
          <ArchivosEntidad
            entidadTipo="contactos" entidadId={c.id} carpeta="contactos"
            data={data} onAddComentario={onAddComentario}
            vacioTexto="Sin archivos todavía. Sube contratos, identificaciones, cotizaciones o lo que necesites tener a la mano de esta persona."
          />
        </Bloque>
      )}
    </div>
  );
}

// columna de siempre: no se parte en dos columnas, porque el número es un dato, no dos. Los

export function ContactoForm({ item, proyectos, vinculos, etiquetasExistentes = [], titulosExistentes = TITULOS_CONTACTO, catalogoEtiquetas, catalogoTitulos, onVincularProyecto, onDesvincularProyecto, onSave }) {
  // El id se decide desde ahora (no al guardar) para poder subir la foto y armar la ruta de
  // Storage antes de que el contacto exista como fila — mismo truco que ya usa ContactoRapidoForm.
  const [contactoId] = useState(() => item.id || uid());
  const [v, setV] = useState({
    ...item,
    nombres: item.nombres ?? item.nombre ?? "",
    apellidoPaterno: item.apellidoPaterno || "",
    apellidoMaterno: item.apellidoMaterno || "",
    tipos: item.tipos && item.tipos.length ? item.tipos : (item.tipo ? [item.tipo] : ["Cliente"]),
    fotoUrl: item.fotoUrl || "",
    empresa: item.empresa || "",
    puesto: item.puesto || "",
    telefono: item.telefono || "",
  });
  const [error, setError] = useState("");
  const [otroParentesco, setOtroParentesco] = useState(() => !!item.parentesco && !PARENTESCOS.includes(item.parentesco));
  // Proyectos vinculados. Si el contacto YA existe, vincular/desvincular se guarda al momento:
  // esperar al botón Guardar hacía que se perdieran si el formulario se cerraba de cualquier otra
  // forma (la X, un clic fuera, "descartar cambios") — que es justo lo que reportó Angel el 24
  // sept 2026. Para un contacto NUEVO no se puede guardar todavía (la fila no existe y la llave
  // foránea lo rechazaría), así que ahí sí se acumulan en memoria y se crean al guardar.
  const esNuevo = !item.id;
  const [proyectosSeleccionados, setProyectosSeleccionados] = useState(() =>
    (vinculos || []).map((vinc) => ({ id: vinc.proyectoId, label: proyectos.find((p) => p.id === vinc.proyectoId)?.nombre || "—" }))
  );
  const agregarProyecto = (o) => {
    setProyectosSeleccionados((prev) => (prev.some((p) => p.id === o.id) ? prev : [...prev, o]));
    if (!esNuevo) onVincularProyecto?.(contactoId, o.id);
  };
  const quitarProyecto = (proyectoId) => {
    setProyectosSeleccionados((prev) => prev.filter((p) => p.id !== proyectoId));
    if (!esNuevo) {
      const vinculo = (vinculos || []).find((vv) => vv.proyectoId === proyectoId);
      if (vinculo) onDesvincularProyecto?.(vinculo.id);
    }
  };
  const toggleTipo = (t) => setV((prev) => ({ ...prev, tipos: prev.tipos.includes(t) ? prev.tipos.filter((x) => x !== t) : [...prev.tipos, t] }));

  const guardar = () => {
    if (!v.nombres?.toString().trim()) { setError("El nombre del contacto es obligatorio."); return; }
    if (v.tipos.length === 0) { setError("Elige al menos un tipo."); return; }
    setError("");
    const nombres = v.nombres.trim();
    const apellidoPaterno = (v.apellidoPaterno || "").trim();
    const apellidoMaterno = (v.apellidoMaterno || "").trim();
    // proyectoId ya no es una columna de contactos (ahora es tabla puente contacto_proyectos) —
    // se descarta explícitamente por si el navegador todavía trae un contacto en memoria desde
    // antes de la migración, para no mandar una columna que Supabase ya no tiene.
    const { proyectoId: _proyectoIdViejo, ...vLimpio } = v;
    onSave({ ...vLimpio, id: contactoId, nombres, apellidoPaterno, apellidoMaterno, nombre: armarNombreContacto(nombres, apellidoPaterno, apellidoMaterno) });
    // Solo el contacto nuevo trae vínculos pendientes; al editar ya se guardaron al momento.
    if (esNuevo) {
      for (const p of proyectosSeleccionados) onVincularProyecto?.(contactoId, p.id);
    }
  };

  return (
    <div>
      <div className="flex justify-center mb-3">
        <AvatarForm
          avatarUrl={v.fotoUrl}
          helpText="Foto del contacto (opcional). Si no subes una, se muestran sus iniciales."
          subirAvatar={async (file) => {
            const path = `contactos/${contactoId}/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
            const { error: upErr } = await supabase.storage.from("adjuntos").upload(path, file);
            if (upErr) return { error: upErr.message };
            const { data: pub } = supabase.storage.from("adjuntos").getPublicUrl(path);
            setV((prev) => ({ ...prev, fotoUrl: pub.publicUrl }));
            return { url: pub.publicUrl };
          }}
        />
      </div>
      <Field label="Nombre(s)"><input className="gp-input" autoFocus value={v.nombres} onChange={(e) => setV({ ...v, nombres: e.target.value })} /></Field>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="Apellido paterno"><input className="gp-input" value={v.apellidoPaterno} onChange={(e) => setV({ ...v, apellidoPaterno: e.target.value })} /></Field>
        <Field label="Apellido materno"><input className="gp-input" value={v.apellidoMaterno} onChange={(e) => setV({ ...v, apellidoMaterno: e.target.value })} /></Field>
      </div>
      <Field label="Tipo de contacto (puede ser varios)">
        <div className="flex flex-wrap gap-1.5">
          {TIPOS_CONTACTO.map((t) => {
            const color = COLOR_TIPO_CONTACTO[t];
            return (
              <button
                key={t} type="button" onClick={() => toggleTipo(t)}
                className="text-xs px-2.5 py-1 rounded-full border"
                style={v.tipos.includes(t)
                  ? { background: color, color: "#0B2341", borderColor: color, fontWeight: 600 }
                  : { borderColor: "var(--border)", color: "var(--muted)" }}
              >
                {t}
              </button>
            );
          })}
        </div>
      </Field>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="Empresa/Organización (opcional)"><input className="gp-input" value={v.empresa} onChange={(e) => setV({ ...v, empresa: e.target.value })} /></Field>
        <Field label="Puesto/Cargo (opcional)"><input className="gp-input" value={v.puesto} onChange={(e) => setV({ ...v, puesto: e.target.value })} /></Field>
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
      <Field label="Proyectos relacionados (puede ser varios)">
        <ComboboxMultiBuscar
          seleccionados={proyectosSeleccionados}
          opciones={proyectos.map((p) => ({ id: p.id, label: p.nombre }))}
          onAgregar={agregarProyecto}
          onQuitar={quitarProyecto}
          placeholder="Buscar proyecto…"
        />
        {!esNuevo && <p className="text-[10px] gp-text-muted -mt-2 mb-2">Los proyectos se guardan al momento, no hace falta dar Guardar.</p>}
      </Field>
      {/* El país va aparte para que nadie tenga que acordarse de teclear "+1" o "+52": se elige y
          ya. Con la lada puesta, el botón de WhatsApp funciona con contactos de cualquier país
          (antes, un número de EU sin lada abría un chat inexistente). */}
      <Field label="WhatsApp">
        <CampoTelefonoPais valor={v.whatsapp} onChange={(x) => setV({ ...v, whatsapp: x })} placeholderNumero="55 1234 5678" />
      </Field>
      <Field label="Teléfono (opcional)">
        <CampoTelefonoPais valor={v.telefono} onChange={(x) => setV({ ...v, telefono: x })} placeholderNumero="55 1234 5678" />
      </Field>
      <Field label="Correo (opcional)"><input className="gp-input" value={v.correo} onChange={(e) => setV({ ...v, correo: e.target.value })} /></Field>

      {/* Dos ejes distintos, a propósito en dos campos. El título es cómo le hablas a la persona
          (un solo valor). Las etiquetas son a qué mundo pertenece —Médicos, Gobierno,
          ExGobierno— y por eso admiten varias: alguien puede ser médico Y de gobierno, y
          "ExGobierno" es justo el caso donde un campo único te obligaría a elegir entre lo que
          es hoy y lo que fue. Ninguna sustituye al Tipo de contacto, que es TU relación con esa
          persona: si "Médico" se metiera ahí, el filtro de Clientes dejaría de servir. */}
      {/* Mismo buscador que las etiquetas, con una diferencia a propósito: max=1, porque una
          persona tiene UN título. Se busca entre los ya usados y si no está sale "Crear…",
          igual que en etiquetas, en vez del datalist que parecía una lista cerrada. */}
      <Field label="Título (opcional)">
        <ComboboxMultiBuscar
          max={1}
          seleccionados={v.titulo ? [{ id: v.titulo, label: v.titulo }] : []}
          opciones={titulosExistentes.map((t) => ({ id: t, label: t }))}
          onAgregar={(o) => setV({ ...v, titulo: o.id })}
          onQuitar={() => setV({ ...v, titulo: "" })}
          onCrear={(texto) => setV({ ...v, titulo: texto })}
          onRenombrarOpcion={catalogoTitulos?.renombrar}
          onEliminarOpcion={catalogoTitulos?.eliminar}
          placeholder="Buscar o escribir un título… (Arq., Dr., Lic.)"
          crearLabel={(t) => `Crear título "${t}"`}
        />
      </Field>
      <Field label="Etiquetas (opcional — para agrupar y buscar: Médicos, Gobierno, ExGobierno…)">
        <ComboboxMultiBuscar
          seleccionados={(v.etiquetas || []).map((e) => ({ id: e, label: e }))}
          opciones={etiquetasExistentes.map((e) => ({ id: e, label: e }))}
          onAgregar={(o) => setV({ ...v, etiquetas: [...(v.etiquetas || []), o.id] })}
          onQuitar={(id) => setV({ ...v, etiquetas: (v.etiquetas || []).filter((x) => x !== id) })}
          onCrear={(texto) => setV({ ...v, etiquetas: [...(v.etiquetas || []), texto] })}
          onRenombrarOpcion={catalogoEtiquetas?.renombrar}
          onEliminarOpcion={catalogoEtiquetas?.eliminar}
          placeholder="Escribe una etiqueta…"
          crearLabel={(t) => `Crear etiqueta "${t}"`}
        />
      </Field>
      <Field label="Dirección (opcional)"><textarea className="gp-input" rows={2} placeholder="Calle, número, colonia, ciudad…" value={v.direccion || ""} onChange={(e) => setV({ ...v, direccion: e.target.value })} /></Field>
      <Field label="Notas"><textarea className="gp-input" rows={2} value={v.notas} onChange={(e) => setV({ ...v, notas: e.target.value })} /></Field>
      {error && <p className="text-xs gp-text-red mb-2">{error}</p>}

      <button className="gp-btn w-full py-2 text-sm mt-2" onClick={guardar}>
        Guardar
      </button>
    </div>
  );
}
