// src/components/modulos/Habitos.jsx
//
// Modulo perezoso (Fase 2). Salio de App.jsx el 5 oct 2026; se mudaron con el sus propias
// piezas (DIAS_SEMANA_LARGO, DIAS_SEMANA_CORTO, rachaHabito, mejorRachaHabito, textoFrecuencia, porcentajeCumplimiento, HabitoDetalle), que nadie mas usaba.

import { BarraListaEstandar, OrdenSelector } from "../ui/tablas";
import { Check, Flame, Trash2 } from "lucide-react";
import { Field, IconBtn } from "../ui/basicos";
import { Modal } from "../ui/Modal";
import { aplicaHoy } from "../../lib/habitos";
import { exportarFilasExcel, exportarFilasPDF } from "../../lib/exportar";
import { filtrarPorBusqueda, ordenarLista } from "../../lib/listas";
import { todayISO } from "../../lib/formato";
import { useState } from "react";

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

export default function Habitos({ data, onAdd, onEdit, onRemove }) {
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
                <IconBtn title="Eliminar" onClick={() => onRemove(h.id)}><Trash2 size={13} /></IconBtn>
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
