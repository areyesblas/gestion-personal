// src/components/modulos/Agenda.jsx
//
// Modulo perezoso (Fase 2). Salio de App.jsx el 5 oct 2026; se mudaron con el sus propias
// piezas (horaDecimalAHHMM, DIA_ISO_LABEL, ETIQUETA_ORIGEN, lunesDeSemana, sumarDias, hhmmADecimal, duracionDeTarea, colocarEnColumnas, buscarHueco, calcularBloquesAgenda, PendienteExistenteForm), que nadie mas usaba.

import TarjetaRapidaAgenda from "../agenda/TarjetaRapidaAgenda";
import ToastDeshacer from "../agenda/ToastDeshacer";
import { CalendarClock, Check, CheckSquare, ChevronLeft, ChevronRight, Plus, Settings, Trash2 } from "lucide-react";
import { CitaForm } from "../comunes/CitaForm";
import { Field } from "../ui/basicos";
import { Modal } from "../ui/Modal";
import { PRIORIDAD_ORDEN, ordenadosPor } from "../../lib/listas";
import { PendienteForm } from "../comunes/formularios";
import { camelToSnake, rowToJs, tagsUnicos } from "../../lib/datos";
import { dateStr, daysUntil, fmtFechaCorta, todayISO, uid } from "../../lib/formato";
import { fmtFechaHora, localInputsAFechaHora } from "../../lib/fechaHora";
import { supabase } from "../../supabaseClient";
import { usarCatalogoEditable } from "../ui/usarCatalogoEditable";
import { useEffect, useMemo, useRef, useState } from "react";

// Etapa 6 (Agenda interactiva): convierte una hora decimal (9.5) a "HH:MM" (09:30), redondeando
// al cuarto de hora más cercano — es el "snap" al soltar un bloque arrastrado.
function horaDecimalAHHMM(dec) {
  const totalMin = Math.round(dec * 60 / 15) * 15;
  const hh = Math.floor(totalMin / 60);
  const mm = totalMin % 60;
  return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
}

// pantalla sigue funcionando con el modelo viejo (la hora se ancla al día de la fecha límite), sin
// tronar y sin mandar columnas que no existen.
const DIA_ISO_LABEL = { 1: "Lun", 2: "Mar", 3: "Mié", 4: "Jue", 5: "Vie", 6: "Sáb", 7: "Dom" };

// De qué módulo puede venir una tarea creada desde otro lado (origenTabla), para el botón "Abrir
// registro origen" de la tarjeta rápida. El texto es el complemento de "Abrir …".
const ETIQUETA_ORIGEN = {
  finanzas: "el movimiento", facturas: "la factura", eventos: "el evento", medicamentos: "el medicamento",
  activos: "el activo digital", documentos: "el documento", proyectos: "el proyecto", apartados: "el apartado",
  patrimonio: "el bien", campanas: "la campaña", salud: "el registro de salud", contactos: "el contacto",
  regalos: "el regalo", metas: "la meta",
};

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

function hhmmADecimal(hhmm) {
  const [h, m] = String(hhmm || "").split(":").map(Number);
  if (Number.isNaN(h)) return null;
  return h + (m || 0) / 60;
}

// La duración del bloque de una tarea es su tiempo estimado — no se inventa un campo nuevo para
// no duplicar el mismo dato en dos lugares. Sin estimación, una hora.
function duracionDeTarea(t) {
  const n = Number(t.tiempoEstimado);
  return n > 0 ? n : 1;
}

// programada a la misma hora que una cita no quede escondida debajo. Los que no se encimen con
// nadie siguen ocupando todo el ancho.
function colocarEnColumnas(bloques) {
  const ordenados = [...bloques].sort((a, b) => a.inicio - b.inicio || b.duracion - a.duracion);
  const salida = [];
  let grupo = [];
  let finGrupo = -Infinity;
  const cerrarGrupo = () => {
    if (!grupo.length) return;
    const columnas = [];
    const conCol = grupo.map((b) => {
      let idx = columnas.findIndex((col) => col.fin <= b.inicio + 0.0001);
      if (idx === -1) { columnas.push({ fin: b.inicio + b.duracion }); idx = columnas.length - 1; }
      else columnas[idx].fin = b.inicio + b.duracion;
      return { ...b, col: idx };
    });
    conCol.forEach((b) => salida.push({ ...b, totalCols: columnas.length }));
    grupo = [];
    finGrupo = -Infinity;
  };
  for (const b of ordenados) {
    if (grupo.length && b.inicio >= finGrupo - 0.0001) cerrarGrupo();
    grupo.push(b);
    finGrupo = Math.max(finGrupo, b.inicio + b.duracion);
  }
  cerrarGrupo();
  return salida;
}

// Primer hueco libre de al menos `duracion` horas dentro de la jornada. null si ya no cabe.
function buscarHueco(ocupados, desde, hasta, duracion) {
  const orden = [...ocupados].sort((a, b) => a[0] - b[0]);
  let cursor = desde;
  for (const [ini, fin] of orden) {
    if (cursor + duracion <= ini) return cursor;
    cursor = Math.max(cursor, fin);
  }
  return cursor + duracion <= hasta ? cursor : null;
}

// tienen horario programado. Las tareas que solo tienen fecha límite no pasan por aquí — van a la
// franja de su día, que se calcula aparte.
function calcularBloquesAgenda({ dias, citas, tareasProgramadas, comida, diaProgramadoDe }) {
  const bloquesPorDia = {};
  dias.forEach((d) => (bloquesPorDia[dateStr(d)] = []));

  if (comida) {
    dias.forEach((d) => {
      bloquesPorDia[dateStr(d)].push({ tipo: "comida", inicio: comida.inicio, duracion: comida.duracion });
    });
  }

  citas.forEach((c) => {
    if (!c.fechaHora) return;
    const d = new Date(c.fechaHora);
    const key = dateStr(d);
    if (!bloquesPorDia[key]) return;
    const duracion = Number(c.duracionHoras) > 0 ? Number(c.duracionHoras) : 1;
    bloquesPorDia[key].push({ tipo: "cita", inicio: d.getHours() + d.getMinutes() / 60, duracion, item: c });
  });

  tareasProgramadas.forEach((t) => {
    const key = diaProgramadoDe(t);
    const inicio = hhmmADecimal(t.horaInicio);
    if (!key || inicio == null || !bloquesPorDia[key]) return;
    bloquesPorDia[key].push({ tipo: "tarea", inicio, duracion: duracionDeTarea(t), item: t });
  });

  Object.keys(bloquesPorDia).forEach((k) => {
    bloquesPorDia[k] = colocarEnColumnas(bloquesPorDia[k]).sort((a, b) => a.inicio - b.inicio);
  });
  return bloquesPorDia;
}

export default function Agenda({
  data, misId, onEditPendiente, onAddCita, onEditCita, onRemoveCita, onRemovePendiente,
  onCrearContacto, onCrearProyecto, onAsignar, onEnviarInvitacion, onAceptarEnNombre, onAbrirOrigen,
  onAddPendiente,
}) {
  const [vista, setVista] = useState("semana"); // "dia" | "semana"
  const [base, setBase] = useState(() => new Date());
  const [config, setConfig] = useState({
    horasLaboralesDiarias: 8, horaInicioLaboral: "09:00", diasLaborales: [1, 2, 3, 4, 5],
    horaInicioComida: "", duracionComidaMin: 60, mostrarTareas: true,
  });
  const [configAbierta, setConfigAbierta] = useState(false);
  const [cargando, setCargando] = useState(true);
  const [modalAgregar, setModalAgregar] = useState(null); // null | "nueva" | "existente"
  // Clic en un hueco de la cuadrícula: menú para crear ahí mismo, con el día y la hora que se
  // tocaron ya puestos (pedido de Angel, 29 sept 2026).
  // Catálogo de tags de citas: igual que las etiquetas de contactos, se puede corregir o quitar
  // un tag en todas las citas que lo traen.
  const catalogoTagsCitas = usarCatalogoEditable({
    registros: data.citas, campo: "tags", esLista: true,
    onEditar: (id, patch) => onEditCita(id, patch), nombreSingular: "el tag",
  });
  const [menuHueco, setMenuHueco] = useState(null);   // { x, y, dia, hora }
  const [nuevaCitaEn, setNuevaCitaEn] = useState(null); // { dia, hora }
  const [nuevaTareaEn, setNuevaTareaEn] = useState(null); // { dia, hora }
  const [edicion, setEdicion] = useState(null);           // { tipo:"cita"|"tarea", item }
  const [tarjeta, setTarjeta] = useState(null);           // { tipo, item, rect }
  const [toast, setToast] = useState(null);               // { clave, texto, deshacer }
  // Columnas nuevas de la migración 20261002. null = todavía no se sabe (se está probando).
  const [soportaProgramacion, setSoportaProgramacion] = useState(null);
  const [soportaPrefTareas, setSoportaPrefTareas] = useState(true);
  const [soportaRealizada, setSoportaRealizada] = useState(true);
  // Tareas que me asignaron desde OTRAS cuentas (misma consulta que "Mi trabajo"): no vienen en
  // `data`, que solo trae la cuenta activa.
  const [tareasAsignadas, setTareasAsignadas] = useState([]);

  // Pantalla chica o dedo: decide hoja inferior vs popover y el tamaño de los objetivos táctiles.
  // Detección real de viewport con matchMedia, no una bandera compartida con el escritorio.
  const [esMovil, setEsMovil] = useState(() =>
    typeof window !== "undefined" && (window.matchMedia("(max-width: 767px)").matches || window.matchMedia("(pointer: coarse)").matches));
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px), (pointer: coarse)");
    const alCambiar = (e) => setEsMovil(e.matches);
    mq.addEventListener("change", alCambiar);
    return () => mq.removeEventListener("change", alCambiar);
  }, []);

  const PX_POR_HORA = 56;
  const SNAP_HORAS = 0.25; // 15 minutos
  const ALTO_MIN_BLOQUE = esMovil ? 44 : 22; // 44 px es el mínimo táctil de iPhone
  const ALTO_FRANJA = 66;
  const colRefs = useRef([]);
  const gestoRef = useRef(null);
  const [drag, setDrag] = useState(null); // espejo del gesto activo, solo para dibujar el fantasma

  useEffect(() => {
    (async () => {
      const columnas = "horas_laborales_diarias, hora_inicio_laboral, dias_laborales, hora_inicio_comida, duracion_comida_min";
      let { data: pref, error } = await supabase.from("preferencias")
        .select(`${columnas}, agenda_mostrar_tareas`).eq("user_id", misId).maybeSingle();
      if (error) {
        setSoportaPrefTareas(false);
        ({ data: pref } = await supabase.from("preferencias").select(columnas).eq("user_id", misId).maybeSingle());
      }
      if (pref) {
        setConfig({
          horasLaboralesDiarias: Number(pref.horas_laborales_diarias) || 8,
          horaInicioLaboral: (pref.hora_inicio_laboral || "09:00").slice(0, 5),
          diasLaborales: pref.dias_laborales?.length ? pref.dias_laborales : [1, 2, 3, 4, 5],
          horaInicioComida: pref.hora_inicio_comida ? pref.hora_inicio_comida.slice(0, 5) : "",
          duracionComidaMin: pref.duracion_comida_min || 60,
          mostrarTareas: pref.agenda_mostrar_tareas ?? true,
        });
      }
      // ¿Ya existen las columnas nuevas? Si la migración no se ha aplicado, la Agenda sigue
      // funcionando con el modelo viejo en vez de romperse.
      const prog = await supabase.from("pendientes").select("fecha_programada").limit(1);
      setSoportaProgramacion(!prog.error);
      const real = await supabase.from("citas").select("realizada_en").limit(1);
      setSoportaRealizada(!real.error);
      setCargando(false);
    })();
  }, [misId]);

  // Lo que me asignaron desde otras cuentas. RLS ya permite leerlas y actualizarlas al ejecutor
  // (política "ejecutor ve y actualiza sus tareas asignadas"), no se debilita nada.
  useEffect(() => {
    (async () => {
      const { data: filas } = await supabase.from("pendientes").select("*")
        .eq("asignado_a", misId).is("deleted_at", null);
      setTareasAsignadas((filas || []).map(rowToJs));
    })();
  }, [misId]);

  const guardarConfig = async (nuevo) => {
    setConfig(nuevo);
    const fila = {
      user_id: misId,
      horas_laborales_diarias: nuevo.horasLaboralesDiarias,
      hora_inicio_laboral: nuevo.horaInicioLaboral,
      dias_laborales: nuevo.diasLaborales,
      hora_inicio_comida: nuevo.horaInicioComida || null,
      duracion_comida_min: nuevo.duracionComidaMin || null,
    };
    if (soportaPrefTareas) fila.agenda_mostrar_tareas = nuevo.mostrarTareas;
    await supabase.from("preferencias").upsert(fila, { onConflict: "user_id" });
  };

  const lunes = lunesDeSemana(base);
  const diasVisibles = useMemo(() => {
    if (vista === "dia") return [new Date(base)];
    return [0, 1, 2, 3, 4, 5, 6].map((i) => sumarDias(lunes, i)).filter((d) => {
      const iso = d.getDay() === 0 ? 7 : d.getDay();
      return config.diasLaborales.includes(iso);
    });
  }, [vista, base, lunes, config.diasLaborales]);

  const horaInicioDec = useMemo(() => hhmmADecimal(config.horaInicioLaboral) ?? 9, [config.horaInicioLaboral]);
  const jornadaFin = horaInicioDec + config.horasLaboralesDiarias;

  const comidaDec = useMemo(() => {
    if (!config.horaInicioComida) return null;
    const inicio = hhmmADecimal(config.horaInicioComida);
    return inicio == null ? null : { inicio, duracion: (config.duracionComidaMin || 60) / 60 };
  }, [config.horaInicioComida, config.duracionComidaMin]);

  // Qué día está programada una tarea. Con las columnas nuevas es fechaProgramada; sin ellas
  // (migración pendiente) se conserva el comportamiento viejo: si tiene hora, va en su fecha límite.
  const diaProgramadoDe = (t) =>
    (soportaProgramacion ? t.fechaProgramada : (t.horaInicio ? t.fechaLimite : null)) || null;
  const patchProgramar = (dia, hora) =>
    soportaProgramacion ? { fechaProgramada: dia, horaInicio: hora } : { fechaLimite: dia, horaInicio: hora };

  const rango = {
    desde: dateStr(diasVisibles[0]),
    hasta: dateStr(diasVisibles[diasVisibles.length - 1]),
  };
  const enRango = (iso) => !!iso && iso >= rango.desde && iso <= rango.hasta;

  const citasEnRango = useMemo(
    () => (data.citas || []).filter((c) => c.fechaHora && enRango(dateStr(new Date(c.fechaHora)))),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [data.citas, rango.desde, rango.hasta]);

  // Regla 6: lo que delegué a alguien más no es mío (no se dibuja); lo que me asignaron sí, aunque
  // viva en la cuenta de quien me lo asignó.
  const tareasVisibles = useMemo(() => {
    const propias = (data.pendientes || []).filter((p) => !p.asignadoA || p.asignadoA === misId);
    const ajenas = tareasAsignadas.filter((t) => !propias.some((p) => p.id === t.id));
    return [...propias, ...ajenas].filter((t) => t.estatus !== "Cancelada");
  }, [data.pendientes, tareasAsignadas, misId]);

  const tareasProgramadas = useMemo(
    () => (config.mostrarTareas ? tareasVisibles.filter((t) => t.horaInicio && enRango(diaProgramadoDe(t))) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tareasVisibles, config.mostrarTareas, rango.desde, rango.hasta, soportaProgramacion]);

  // Franja "Tareas del día": lo que tiene fecha pero todavía no tiene hora. Se agrupa por el día
  // programado si ya lo tiene, y si no por su fecha límite.
  const tareasPorFranja = useMemo(() => {
    const porDia = {};
    diasVisibles.forEach((d) => (porDia[dateStr(d)] = []));
    if (!config.mostrarTareas) return porDia;
    tareasVisibles.forEach((t) => {
      if (t.horaInicio) return;
      const dia = diaProgramadoDe(t) || t.fechaLimite;
      if (!enRango(dia) || !porDia[dia]) return;
      porDia[dia].push(t);
    });
    Object.values(porDia).forEach((arr) => arr.sort((a, b) =>
      (PRIORIDAD_ORDEN[a.prioridad] ?? 1) - (PRIORIDAD_ORDEN[b.prioridad] ?? 1) ||
      (a.descripcion || "").localeCompare(b.descripcion || "")));
    return porDia;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tareasVisibles, diasVisibles, config.mostrarTareas, soportaProgramacion]);

  const bloques = useMemo(() => calcularBloquesAgenda({
    dias: diasVisibles, citas: citasEnRango, tareasProgramadas, comida: comidaDec, diaProgramadoDe,
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [diasVisibles, citasEnRango, tareasProgramadas, comidaDec, soportaProgramacion]);

  const hayEnFranja = Object.values(tareasPorFranja).some((a) => a.length > 0);

  /* ---------- escrituras ---------- */

  // Una tarea que me asignaron desde otra cuenta no vive en `data`: se actualiza directo contra
  // Supabase (RLS del ejecutor) y se refleja en el estado local de esta pantalla.
  const esTareaAjena = (t) => !(data.pendientes || []).some((p) => p.id === t.id);

  const limpiarRecordatorio = async (tabla, id) => {
    try {
      await supabase.from("recordatorios").delete().eq("tabla_origen", tabla).eq("registro_origen_id", id);
    } catch (err) {
      console.error("No se pudo limpiar el recordatorio:", err);
    }
  };

  const editarTarea = async (t, patch, reprogramada = false) => {
    if (esTareaAjena(t)) {
      const fila = Object.fromEntries(Object.entries(patch)
        .filter(([k]) => k !== "createdAt") // lo controla el servidor, nunca se reescribe desde aquí
        .map(([k, v]) => [camelToSnake(k), v === "" ? null : v]));
      await supabase.from("pendientes").update(fila).eq("id", t.id);
      setTareasAsignadas((prev) => prev.map((x) => (x.id === t.id ? { ...x, ...patch } : x)));
    } else {
      await onEditPendiente(t.id, patch);
    }
    // "Al mover una tarea deben actualizarse los recordatorios relacionados": se borra el
    // recordatorio ya generado para que el motor lo vuelva a crear con el horario nuevo.
    if (reprogramada) await limpiarRecordatorio("pendientes", t.id);
  };

  const editarCita = async (c, patch, reprogramada = false) => {
    await onEditCita(c.id, patch);
    if (reprogramada) await limpiarRecordatorio("citas", c.id);
  };

  const completar = (tipo, item) => {
    if (tipo === "tarea") {
      const estatusPrevio = item.estatus || "Pendiente";
      const yaHecha = item.estatus === "Completada";
      editarTarea(item, yaHecha
        ? { estatus: "Pendiente", completadaEn: null }
        : { estatus: "Completada", completadaEn: new Date().toISOString() });
      setToast({
        clave: `${item.id}-${Date.now()}`,
        texto: yaHecha ? `"${item.descripcion}" vuelve a pendiente` : `"${item.descripcion}" marcada como realizada`,
        deshacer: () => {
          editarTarea(item, yaHecha
            ? { estatus: estatusPrevio, completadaEn: item.completadaEn || new Date().toISOString() }
            : { estatus: estatusPrevio, completadaEn: null });
          setToast(null);
        },
      });
    } else {
      if (!soportaRealizada) return;
      const previo = item.realizadaEn || null;
      editarCita(item, { realizadaEn: previo ? null : new Date().toISOString() });
      setToast({
        clave: `${item.id}-${Date.now()}`,
        texto: previo ? `"${item.titulo}" vuelve a pendiente` : `"${item.titulo}" marcada como realizada`,
        deshacer: () => { editarCita(item, { realizadaEn: previo }); setToast(null); },
      });
    }
  };

  /* ---------- gestos: mover, redimensionar y programar desde la franja ---------- */

  const ajustar = (v) => Math.round(v / SNAP_HORAS) * SNAP_HORAS;

  // Qué día y qué hora hay bajo el dedo/cursor. Se usa al arrastrar desde la franja, donde el
  // arrastre empieza FUERA de la cuadrícula y no sirve calcular por desplazamiento.
  const posicionDesdePuntero = (clientX, clientY) => {
    for (let i = 0; i < diasVisibles.length; i++) {
      const el = colRefs.current[i];
      if (!el) continue;
      const r = el.getBoundingClientRect();
      if (clientX >= r.left && clientX <= r.right) {
        const cruda = (clientY - r.top) / PX_POR_HORA + horaInicioDec;
        return { diaIdx: i, inicio: Math.max(horaInicioDec, Math.min(ajustar(cruda), jornadaFin - SNAP_HORAS)) };
      }
    }
    return null;
  };

  const espejo = (g) => setDrag({
    tipo: g.tipo, id: g.item.id, modo: g.modo,
    curInicio: g.curInicio, curDuracion: g.curDuracion, curDiaIdx: g.curDiaIdx, valido: g.valido,
  });

  const activarGesto = (g) => {
    g.activo = true;
    if (navigator.vibrate) { try { navigator.vibrate(8); } catch { /* no todos los navegadores */ } }
    espejo(g);
  };

  // En celular el arrastre se activa manteniendo presionado (350 ms): así un toque sigue abriendo
  // la tarjeta rápida y el dedo puede desplazar la pantalla sin mover bloques por accidente.
  const LARGO_MS = 350;
  const iniciarGesto = (e, { tipo, item, modo, inicio, duracion, diaIdx }) => {
    if (e.button != null && e.button !== 0) return;
    e.stopPropagation();
    e.preventDefault(); // sin esto el mouse arrastra el texto del bloque en vez del bloque
    const tactil = e.pointerType !== "mouse";
    const g = {
      tipo, item, modo, tactil, diaIdxOrig: diaIdx, inicioOrig: inicio, duracionOrig: duracion,
      curInicio: inicio, curDuracion: duracion, curDiaIdx: diaIdx, valido: modo !== "programar",
      startX: e.clientX, startY: e.clientY, activo: false, timer: null,
      rect: e.currentTarget.getBoundingClientRect(),
    };
    gestoRef.current = g;
    // El borde de redimensionar se agarra a propósito: arranca de inmediato en cualquier aparato.
    // Con el dedo, mover y programar esperan a que se mantenga presionado, para que un toque siga
    // abriendo la tarjeta y para no pelearse con el desplazamiento de la pantalla. Con mouse no
    // hay espera pero sí umbral: el gesto se activa hasta que el cursor se mueve (ver alMover),
    // así un clic sin mover sigue siendo un clic.
    if (modo === "redimensionar") activarGesto(g);
    else if (tactil) g.timer = setTimeout(() => { g.timer = null; activarGesto(g); }, LARGO_MS);
  };

  const abrirTarjeta = (g) => setTarjeta({ tipo: g.tipo, item: g.item, rect: g.rect });

  const aplicarGesto = async (g) => {
    const dia = diasVisibles[g.curDiaIdx];
    if (!dia) return;
    const nuevoDia = dateStr(dia);
    const cambioHorario = g.curInicio !== g.inicioOrig || g.curDiaIdx !== g.diaIdxOrig || g.modo === "programar";
    const cambioDuracion = g.curDuracion !== g.duracionOrig;
    if (!cambioHorario && !cambioDuracion) return;

    if (g.tipo === "cita") {
      if (g.modo === "redimensionar") await editarCita(g.item, { duracionHoras: g.curDuracion });
      else await editarCita(g.item, { fechaHora: localInputsAFechaHora(nuevoDia, horaDecimalAHHMM(g.curInicio)) }, true);
    } else {
      if (g.modo === "redimensionar") await editarTarea(g.item, { tiempoEstimado: g.curDuracion });
      else await editarTarea(g.item, patchProgramar(nuevoDia, horaDecimalAHHMM(g.curInicio)), true);
    }
  };

  useEffect(() => {
    const alMover = (e) => {
      const g = gestoRef.current;
      if (!g) return;
      const dx = e.clientX - g.startX;
      const dy = e.clientY - g.startY;
      if (!g.activo) {
        // Esperando el "mantén presionado": si el dedo se desplaza, era scroll, no un arrastre.
        if (g.timer) {
          if (Math.abs(dx) > 10 || Math.abs(dy) > 10) { clearTimeout(g.timer); gestoRef.current = null; }
          return;
        }
        if (!g.tactil && (Math.abs(dx) > 4 || Math.abs(dy) > 4)) activarGesto(g);
        else return;
      }
      if (g.modo === "redimensionar") {
        const cruda = g.duracionOrig + dy / PX_POR_HORA;
        g.curDuracion = Math.max(SNAP_HORAS, Math.min(ajustar(cruda), jornadaFin - g.inicioOrig));
      } else if (g.modo === "programar") {
        const pos = posicionDesdePuntero(e.clientX, e.clientY);
        if (pos) {
          g.curDiaIdx = pos.diaIdx;
          g.curInicio = Math.min(pos.inicio, Math.max(horaInicioDec, jornadaFin - g.duracionOrig));
          g.valido = true;
        } else g.valido = false;
      } else {
        const cruda = g.inicioOrig + dy / PX_POR_HORA;
        g.curInicio = Math.max(horaInicioDec, Math.min(ajustar(cruda), jornadaFin - g.duracionOrig));
        const ancho = colRefs.current[0]?.getBoundingClientRect().width || 1;
        const saltos = vista === "semana" ? Math.round(dx / ancho) : 0;
        g.curDiaIdx = Math.max(0, Math.min(diasVisibles.length - 1, g.diaIdxOrig + saltos));
      }
      espejo(g);
    };
    const alSoltar = () => {
      const g = gestoRef.current;
      if (!g) return;
      gestoRef.current = null;
      if (g.timer) { clearTimeout(g.timer); abrirTarjeta(g); return; } // fue un toque, no un arrastre
      if (!g.activo) { abrirTarjeta(g); return; }                     // clic con mouse sin mover
      setDrag(null);
      if (g.valido) aplicarGesto(g);
    };
    window.addEventListener("pointermove", alMover);
    window.addEventListener("pointerup", alSoltar);
    window.addEventListener("pointercancel", alSoltar);
    return () => {
      window.removeEventListener("pointermove", alMover);
      window.removeEventListener("pointerup", alSoltar);
      window.removeEventListener("pointercancel", alSoltar);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [diasVisibles, horaInicioDec, jornadaFin, vista, soportaProgramacion, data.pendientes]);

  /* ---------- acciones ---------- */

  // Programa en huecos libres las tareas que hoy solo tienen fecha límite. A diferencia del
  // acomodo viejo (que solo las dibujaba y se perdía al recargar), esto SÍ les guarda su horario.
  const acomodarEnHuecos = async () => {
    const ocupado = {};
    diasVisibles.forEach((d) => {
      const k = dateStr(d);
      ocupado[k] = (bloques[k] || []).map((b) => [b.inicio, b.inicio + b.duracion]);
    });
    const claves = diasVisibles.map(dateStr);
    for (const k of claves) {
      for (const t of tareasPorFranja[k] || []) {
        if (t.estatus === "Completada") continue;
        const dur = duracionDeTarea(t);
        const candidatos = [k, ...claves.filter((x) => x !== k)];
        for (const dia of candidatos) {
          const hueco = buscarHueco(ocupado[dia], horaInicioDec, jornadaFin, dur);
          if (hueco == null) continue;
          ocupado[dia].push([hueco, hueco + dur]);
          await editarTarea(t, patchProgramar(dia, horaDecimalAHHMM(hueco)), true);
          break;
        }
      }
    }
  };

  const reprogramar = async (tipo, item, opcion) => {
    const baseFecha = () => {
      if (tipo === "cita") return new Date(item.fechaHora);
      const dia = diaProgramadoDe(item) || item.fechaLimite || todayISO();
      return new Date(`${dia}T${item.horaInicio || config.horaInicioLaboral}:00`);
    };
    let destino;
    if (opcion.tipo === "mas1h") { destino = baseFecha(); destino.setHours(destino.getHours() + 1); }
    else if (opcion.tipo === "manana") { destino = baseFecha(); destino.setDate(destino.getDate() + 1); }
    else destino = new Date(`${opcion.fecha}T${opcion.hora || "09:00"}:00`);

    const dia = dateStr(destino);
    const hora = `${String(destino.getHours()).padStart(2, "0")}:${String(destino.getMinutes()).padStart(2, "0")}`;
    if (tipo === "cita") await editarCita(item, { fechaHora: destino.toISOString() }, true);
    else await editarTarea(item, patchProgramar(dia, hora), true);
    setTarjeta(null);
  };

  // Quita el horario programado y devuelve la tarea a la franja de "Tareas del día", sin tocar su
  // fecha límite.
  const quitarHorario = async (t) => {
    await editarTarea(t, soportaProgramacion ? { fechaProgramada: null, horaInicio: null } : { horaInicio: null }, true);
    setTarjeta(null);
  };

  const asignarPendienteExistente = (id, fecha, hora) => {
    const t = (data.pendientes || []).find((p) => p.id === id);
    if (!t) return;
    editarTarea(t, hora ? patchProgramar(fecha, hora) : (soportaProgramacion ? { fechaProgramada: fecha } : { fechaLimite: fecha }), true);
    setModalAgregar(null);
  };

  /* ---------- datos para la tarjeta rápida ---------- */

  const nombreProyectoDe = (id) => (data.proyectos || []).find((p) => p.id === id)?.nombre || "";
  const nombreContactoDe = (id) => (data.contactos || []).find((c) => c.id === id)?.nombre || "";
  const nombreResponsableDe = (t) => {
    if (t.asignadoA && t.asignadoA === misId) return "Yo";
    if (t.colaboradorContactoId) return nombreContactoDe(t.colaboradorContactoId);
    if (t.responsableId) return (data.equipo || []).find((e) => e.id === t.responsableId)?.nombre || "";
    return "";
  };

  const horas = Array.from({ length: Math.ceil(config.horasLaboralesDiarias) + 1 }, (_, i) => horaInicioDec + i);

  if (cargando) return <p className="text-sm gp-text-muted">Cargando tu agenda…</p>;

  const altoCuadricula = PX_POR_HORA * config.horasLaboralesDiarias;

  return (
    <div>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <h1 className="text-2xl font-bold">Agenda</h1>
        <div className="flex items-center gap-2 flex-wrap">
          <label className="flex items-center gap-1.5 text-xs cursor-pointer select-none" style={{ minHeight: esMovil ? 44 : undefined }}>
            <input type="checkbox" checked={config.mostrarTareas}
              onChange={(e) => guardarConfig({ ...config, mostrarTareas: e.target.checked })}
              style={{ width: 16, height: 16, accentColor: "var(--gold)", cursor: "pointer" }} />
            Mostrar tareas
          </label>
          <button className="gp-btn flex items-center gap-1 px-2.5 py-1.5 text-xs" onClick={() => setModalAgregar("nueva")}>
            <Plus size={14} /> Agregar
          </button>
          <button className="gp-btn-ghost px-2 py-1 text-xs rounded" onClick={() => setVista((v) => (v === "dia" ? "semana" : "dia"))}>
            {vista === "dia" ? "Ver semana" : "Ver día"}
          </button>
          <button className="gp-btn-ghost p-1.5 rounded" onClick={() => setBase((b) => sumarDias(b, vista === "dia" ? -1 : -7))} aria-label="Anterior"><ChevronLeft size={16} /></button>
          <button className="gp-btn-ghost px-2 py-1 text-xs rounded" onClick={() => setBase(new Date())}>Hoy</button>
          <button className="gp-btn-ghost p-1.5 rounded" onClick={() => setBase((b) => sumarDias(b, vista === "dia" ? 1 : 7))} aria-label="Siguiente"><ChevronRight size={16} /></button>
          <button className="gp-btn-ghost p-1.5 rounded" onClick={() => setConfigAbierta(true)} title="Configurar jornada"><Settings size={16} /></button>
        </div>
      </div>

      {soportaProgramacion === false && (
        <div className="gp-panel-hi p-3 mb-4 text-xs" style={{ borderLeft: "3px solid var(--gold)" }}>
          La base de datos todavía no tiene la columna <span className="gp-mono">fecha_programada</span>. La Agenda
          funciona con el modelo anterior: mover una tarea cambia su fecha límite. Al aplicar la migración
          20261002 se separan los dos conceptos, sin perder nada de lo que ya está capturado.
        </div>
      )}

      {config.mostrarTareas && hayEnFranja && (
        <div className="flex items-center justify-between gap-3 flex-wrap mb-3 text-xs gp-text-muted">
          <span>Las tareas de la franja de arriba solo tienen fecha límite. Arrástralas a una hora para programarlas.</span>
          <button className="gp-btn-ghost px-2.5 py-1.5 rounded shrink-0" onClick={acomodarEnHuecos}>Acomodar en huecos libres</button>
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
            <CitaForm item={{ titulo: "", fechaHora: localInputsAFechaHora(todayISO(), "09:00"), lugar: "", contactoIds: [], tags: [], notas: "" }} contactos={data.contactos}
              tagsExistentes={tagsUnicos(data.citas)} catalogoTags={catalogoTagsCitas} onCrearContacto={onCrearContacto}
              onSave={(v) => { onAddCita({ ...v, id: uid() }); setModalAgregar(null); }} />
          )}
          {modalAgregar === "existente" && (
            <PendienteExistenteForm
              pendientes={(data.pendientes || []).filter((p) => p.estatus !== "Completada" && !p.horaInicio)}
              horaSugerida={config.horaInicioLaboral}
              onAsignar={asignarPendienteExistente} />
          )}
        </Modal>
      )}

      {edicion && (
        <Modal title={edicion.tipo === "cita" ? "Editar cita" : "Editar tarea"} onClose={() => setEdicion(null)}>
          {edicion.tipo === "cita" ? (
            <>
              <CitaForm item={edicion.item} contactos={data.contactos} tagsExistentes={tagsUnicos(data.citas)} catalogoTags={catalogoTagsCitas}
                onCrearContacto={onCrearContacto}
                onSave={(v) => { editarCita(edicion.item, v, true); setEdicion(null); }} />
              <button className="w-full mt-3 py-2 text-sm rounded gp-btn-ghost gp-text-red flex items-center justify-center gap-2"
                style={{ minHeight: esMovil ? 44 : undefined }}
                onClick={() => { onRemoveCita(edicion.item.id); setEdicion(null); }}>
                <Trash2 size={15} /> Eliminar cita
              </button>
            </>
          ) : (
            <>
              <PendienteForm item={edicion.item} proyectos={data.proyectos} contactos={data.contactos}
                pendientes={data.pendientes} colaboradores={[]}
                onCrearContacto={(nombre, tipos) => onCrearContacto(nombre, tipos)}
                onCrearProyecto={onCrearProyecto}
                onEnviarInvitacion={onEnviarInvitacion}
                onAceptarEnNombre={onAceptarEnNombre}
                onSave={(v) => {
                  editarTarea(edicion.item, v, true);
                  if (v.asignadoA && v.asignadoA !== edicion.item.asignadoA && onAsignar) onAsignar(edicion.item.id);
                  setEdicion(null);
                }} />
              {!esTareaAjena(edicion.item) && (
                <button className="w-full mt-3 py-2 text-sm rounded gp-btn-ghost gp-text-red flex items-center justify-center gap-2"
                  style={{ minHeight: esMovil ? 44 : undefined }}
                  onClick={() => { onRemovePendiente(edicion.item.id); setEdicion(null); }}>
                  <Trash2 size={15} /> Eliminar tarea
                </button>
              )}
            </>
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
            {config.mostrarTareas && <div style={{ height: ALTO_FRANJA }} className="text-[9px] gp-text-muted pr-1 text-right pt-1">Del día</div>}
            {horas.map((h) => (
              <div key={h} style={{ height: PX_POR_HORA }} className="text-[10px] gp-text-muted text-right pr-1 -mt-2">
                {String(Math.floor(h)).padStart(2, "0")}:{h % 1 ? "30" : "00"}
              </div>
            ))}
          </div>
          {diasVisibles.map((d, di) => {
            const key = dateStr(d);
            const esHoy = key === todayISO();
            return (
              <div key={key} className="flex-1" style={{ minWidth: vista === "semana" ? 96 : 280 }}>
                <div className="text-center text-xs mb-1 pb-1" style={{ height: 28, fontWeight: esHoy ? 700 : 400, color: esHoy ? "var(--gold)" : undefined }}>
                  {DIA_ISO_LABEL[d.getDay() === 0 ? 7 : d.getDay()]} {d.getDate()}
                </div>

                {/* Franja "Tareas del día": lo que tiene fecha límite pero todavía no tiene hora. */}
                {config.mostrarTareas && (
                  <div className="gp-scroll" style={{
                    height: ALTO_FRANJA, overflowY: "auto", borderLeft: "1px solid var(--border)",
                    borderBottom: "1px solid var(--border)", padding: 2, display: "flex", flexDirection: "column", gap: 2,
                  }}>
                    {(tareasPorFranja[key] || []).map((t) => {
                      const hecha = t.estatus === "Completada";
                      const vencida = !hecha && t.fechaLimite && daysUntil(t.fechaLimite) < 0;
                      return (
                        <div key={t.id}
                          role="button" tabIndex={0}
                          onKeyDown={(e) => { if (e.key === "Enter") setTarjeta({ tipo: "tarea", item: t, rect: e.currentTarget.getBoundingClientRect() }); }}
                          onPointerDown={(e) => iniciarGesto(e, { tipo: "tarea", item: t, modo: "programar", inicio: horaInicioDec, duracion: duracionDeTarea(t), diaIdx: di })}
                          title={`${t.descripcion} — mantén presionado y arrastra a una hora para programarla`}
                          className="rounded flex items-center gap-1.5 px-1.5"
                          style={{
                            minHeight: esMovil ? 34 : 22, fontSize: 10.5, cursor: "grab", touchAction: "none",
                            background: "var(--panel-2)", border: `1px dashed ${vencida ? "var(--red)" : "var(--border)"}`,
                            opacity: hecha ? 0.65 : 1, textDecoration: hecha ? "line-through" : "none",
                          }}>
                          <button
                            onPointerDown={(e) => e.stopPropagation()}
                            onClick={(e) => { e.stopPropagation(); completar("tarea", t); }}
                            aria-label={hecha ? "Marcar como pendiente" : "Marcar como realizada"}
                            className="flex items-center justify-center shrink-0 rounded"
                            style={{ width: esMovil ? 30 : 16, height: esMovil ? 30 : 16, border: "1px solid var(--border)", background: hecha ? "var(--teal)" : "transparent" }}>
                            {hecha && <Check size={11} color="#0B2341" />}
                          </button>
                          <span className="truncate">{t.descripcion}</span>
                        </div>
                      );
                    })}
                  </div>
                )}

                <div ref={(el) => (colRefs.current[di] = el)} className="relative"
                  style={{ height: altoCuadricula, borderLeft: "1px solid var(--border)" }}
                  title="Toca un hueco para agendar algo a esa hora"
                  onClick={(e) => {
                    // Solo los huecos: los clics que vienen de un bloque ya los corta el bloque.
                    const r = e.currentTarget.getBoundingClientRect();
                    const cruda = (e.clientY - r.top) / PX_POR_HORA + horaInicioDec;
                    const hora = Math.max(horaInicioDec, Math.min(ajustar(cruda), jornadaFin - SNAP_HORAS));
                    setMenuHueco({ x: e.clientX, y: e.clientY, dia: key, hora: horaDecimalAHHMM(hora) });
                  }}>
                  {horas.slice(0, -1).map((h) => (
                    <div key={h} style={{ position: "absolute", top: (h - horaInicioDec) * PX_POR_HORA, left: 0, right: 0, borderTop: "1px solid var(--border)" }} />
                  ))}
                  {(bloques[key] || []).map((b, i) => {
                    const esCita = b.tipo === "cita";
                    const esTarea = b.tipo === "tarea";
                    const hecho = (esTarea && b.item.estatus === "Completada") || (esCita && !!b.item.realizadaEn);
                    const arrastrable = esCita || esTarea;
                    const enMovimiento = !!(drag && b.item && drag.tipo === b.tipo && drag.id === b.item.id);
                    const alto = Math.max(b.duracion * PX_POR_HORA - 2, ALTO_MIN_BLOQUE);
                    const total = b.totalCols || 1;
                    const ancho = 100 / total;
                    const titulo = esCita ? b.item.titulo : esTarea ? b.item.descripcion : "Comida";
                    return (
                      <div key={`${b.tipo}-${b.item?.id || i}`}
                        role={arrastrable ? "button" : undefined}
                        tabIndex={arrastrable ? 0 : undefined}
                        onKeyDown={(e) => { if (arrastrable && e.key === "Enter") setTarjeta({ tipo: b.tipo, item: b.item, rect: e.currentTarget.getBoundingClientRect() }); }}
                        className="absolute rounded px-1 py-0.5 text-[11px] overflow-hidden flex items-start gap-1"
                        style={{
                          top: (b.inicio - horaInicioDec) * PX_POR_HORA + 1,
                          height: alto,
                          left: `calc(${b.col * ancho}% + 2px)`,
                          width: `calc(${ancho}% - 4px)`,
                          // Una cita es un compromiso con alguien más: va sólida y en dorado. Una
                          // tarea programada es plan propio: más tenue y con borde punteado.
                          background: esCita ? "var(--gold)" : b.tipo === "comida" ? "var(--border)" : hecho ? "var(--teal-tint)" : "var(--panel-2)",
                          color: esCita ? "#0B2341" : hecho && esTarea ? "var(--teal-text)" : "inherit",
                          border: esTarea ? `1px dashed ${hecho ? "var(--teal)" : "var(--border)"}` : "none",
                          textDecoration: hecho ? "line-through" : "none",
                          opacity: enMovimiento ? 0.3 : b.tipo === "comida" ? 0.7 : esTarea && !hecho ? 0.92 : 1,
                          cursor: arrastrable ? "grab" : "default",
                          touchAction: arrastrable ? "none" : undefined,
                        }}
                        title={arrastrable
                          ? `${titulo} — toca para ver opciones, mantén presionado para mover, jala el borde inferior para cambiar la duración`
                          : "Comida"}
                        onClick={(e) => e.stopPropagation()}
                        onPointerDown={(e) => arrastrable && iniciarGesto(e, { tipo: b.tipo, item: b.item, modo: "mover", inicio: b.inicio, duracion: b.duracion, diaIdx: di })}
                      >
                        {arrastrable && alto >= 26 && (esTarea || soportaRealizada) && (
                          <button
                            onPointerDown={(e) => e.stopPropagation()}
                            onClick={(e) => { e.stopPropagation(); completar(b.tipo, b.item); }}
                            aria-label={hecho ? "Marcar como pendiente" : "Marcar como realizada"}
                            className="flex items-center justify-center shrink-0 rounded mt-0.5"
                            style={{
                              width: esMovil ? 26 : 15, height: esMovil ? 26 : 15,
                              border: `1px solid ${esCita ? "rgba(11,35,65,.5)" : "var(--border)"}`,
                              background: hecho ? "var(--teal)" : "transparent",
                            }}>
                            {hecho && <Check size={11} color="#0B2341" />}
                          </button>
                        )}
                        <span className="font-medium min-w-0 break-words" style={{ lineHeight: 1.15 }}>{titulo}</span>
                        {arrastrable && (
                          <div
                            onPointerDown={(e) => iniciarGesto(e, { tipo: b.tipo, item: b.item, modo: "redimensionar", inicio: b.inicio, duracion: b.duracion, diaIdx: di })}
                            style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: esMovil ? 12 : 6, cursor: "ns-resize", touchAction: "none" }}
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {drag && drag.valido && (() => {
        const colEl = colRefs.current[drag.curDiaIdx];
        if (!colEl) return null;
        const rect = colEl.getBoundingClientRect();
        const item = drag.tipo === "cita"
          ? (data.citas || []).find((c) => c.id === drag.id)
          : tareasVisibles.find((p) => p.id === drag.id);
        const diaGhost = diasVisibles[drag.curDiaIdx];
        const etiquetaDia = diaGhost ? `${DIA_ISO_LABEL[diaGhost.getDay() === 0 ? 7 : diaGhost.getDay()]} ${diaGhost.getDate()}` : "";
        return (
          <div style={{
            position: "fixed", left: rect.left + 2, width: Math.max(rect.width - 4, 40),
            top: rect.top + (drag.curInicio - horaInicioDec) * PX_POR_HORA,
            height: Math.max(drag.curDuracion * PX_POR_HORA - 2, 22),
            background: drag.tipo === "cita" ? "var(--gold)" : "var(--panel-2)",
            color: drag.tipo === "cita" ? "#0B2341" : "inherit",
            border: "2px dashed var(--teal)", borderRadius: 4, zIndex: 90, pointerEvents: "none",
            padding: "2px 6px", fontSize: 11, overflow: "hidden", boxShadow: "0 4px 12px rgba(0,0,0,.25)",
          }}>
            <span className="font-medium">{item?.titulo || item?.descripcion || "…"}</span>
            <div className="text-[10px] opacity-80">
              {drag.modo === "redimensionar" ? `${drag.curDuracion}h` : `${etiquetaDia} · ${horaDecimalAHHMM(drag.curInicio)}`}
            </div>
          </div>
        );
      })()}

      {tarjeta && (() => {
        const esCita = tarjeta.tipo === "cita";
        const t = tarjeta.item;
        const diaProg = esCita ? null : diaProgramadoDe(t);
        const cuando = esCita
          ? fmtFechaHora(t.fechaHora)
          : [diaProg ? `Programada ${diaProg}${t.horaInicio ? ` ${t.horaInicio}` : ""}` : null,
             t.fechaLimite ? `Vence ${t.fechaLimite}` : null].filter(Boolean).join(" · ") || "Sin fecha";
        const origen = !esCita && t.origenTabla && t.origenId ? t.origenTabla : null;
        return (
          <TarjetaRapidaAgenda
            tipo={tarjeta.tipo}
            titulo={esCita ? t.titulo : t.descripcion}
            cuando={cuando}
            proyecto={esCita ? "" : nombreProyectoDe(t.proyectoId)}
            contacto={esCita ? (t.contactoIds || []).map(nombreContactoDe).filter(Boolean).join(", ") : nombreContactoDe(t.contactoId)}
            responsable={esCita ? "" : nombreResponsableDe(t)}
            completada={esCita ? !!t.realizadaEn : t.estatus === "Completada"}
            esMovil={esMovil}
            rect={tarjeta.rect}
            onCerrar={() => setTarjeta(null)}
            onRealizada={() => { completar(tarjeta.tipo, t); setTarjeta(null); }}
            onEditar={() => { setEdicion({ tipo: tarjeta.tipo, item: t }); setTarjeta(null); }}
            onReprogramar={(opcion) => reprogramar(tarjeta.tipo, t, opcion)}
            onAbrirOrigen={origen ? () => { setTarjeta(null); onAbrirOrigen(t.origenTabla, t.origenId); } : null}
            etiquetaOrigen={origen ? ETIQUETA_ORIGEN[origen] : null}
          />
        );
      })()}

      {menuHueco && (
        <div className="fixed inset-0 z-[75]" onClick={() => setMenuHueco(null)}>
          <div
            className="gp-panel py-1 text-sm absolute"
            style={{
              minWidth: 190,
              left: Math.min(menuHueco.x, window.innerWidth - 210),
              top: Math.min(menuHueco.y, window.innerHeight - 160),
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <p className="px-3 py-1.5 text-[11px] gp-text-muted border-b gp-border">
              {fmtFechaCorta(menuHueco.dia)} · {menuHueco.hora}
            </p>
            <button
              className="w-full text-left px-3 gp-panel-hi flex items-center gap-2"
              style={{ minHeight: esMovil ? 44 : 36 }}
              onClick={() => { setNuevaCitaEn({ dia: menuHueco.dia, hora: menuHueco.hora }); setMenuHueco(null); }}
            >
              <CalendarClock size={14} className="gp-text-gold" /> Agregar cita
            </button>
            <button
              className="w-full text-left px-3 gp-panel-hi flex items-center gap-2"
              style={{ minHeight: esMovil ? 44 : 36 }}
              onClick={() => { setNuevaTareaEn({ dia: menuHueco.dia, hora: menuHueco.hora }); setMenuHueco(null); }}
            >
              <CheckSquare size={14} className="gp-text-teal" /> Agregar tarea
            </button>
          </div>
        </div>
      )}

      {nuevaCitaEn && (
        <Modal title={`Nueva cita — ${fmtFechaCorta(nuevaCitaEn.dia)} ${nuevaCitaEn.hora}`} onClose={() => setNuevaCitaEn(null)}>
          <CitaForm
            item={{ titulo: "", fechaHora: localInputsAFechaHora(nuevaCitaEn.dia, nuevaCitaEn.hora), lugar: "", contactoIds: [], tags: [], notas: "" }}
            contactos={data.contactos} tagsExistentes={tagsUnicos(data.citas)} catalogoTags={catalogoTagsCitas} onCrearContacto={onCrearContacto}
            onSave={(v) => { onAddCita({ ...v, id: uid() }); setNuevaCitaEn(null); }} />
        </Modal>
      )}

      {nuevaTareaEn && (
        <Modal title={`Nueva tarea — ${fmtFechaCorta(nuevaTareaEn.dia)} ${nuevaTareaEn.hora}`} onClose={() => setNuevaTareaEn(null)}>
          {/* Nace programada justo en el hueco que se tocó. La fecha límite arranca igual al día
              elegido, pero son campos distintos: cambiar una no mueve la otra. */}
          <PendienteForm
            item={{
              proyectoId: "", parentId: "", descripcion: "", fechaLimite: nuevaTareaEn.dia, fechaRevision: "",
              prioridad: "Media", estatus: "Pendiente", colaboradorContactoId: null, contactoId: "",
              precio: "", fechaPagoAprox: "", tiempoEstimado: 1, tiempoReal: "", asignadoA: "", avance: "",
              ...(soportaProgramacion ? { fechaProgramada: nuevaTareaEn.dia } : {}), horaInicio: nuevaTareaEn.hora,
            }}
            proyectos={data.proyectos} contactos={data.contactos} pendientes={data.pendientes} colaboradores={[]}
            onCrearContacto={(nombre, tipos) => onCrearContacto(nombre, tipos)}
            onCrearProyecto={onCrearProyecto}
            onEnviarInvitacion={onEnviarInvitacion}
            onAceptarEnNombre={onAceptarEnNombre}
            onSave={(v) => {
              const nuevoId = uid();
              onAddPendiente({ ...v, id: nuevoId });
              if (v.asignadoA && onAsignar) onAsignar(nuevoId);
              setNuevaTareaEn(null);
            }} />
        </Modal>
      )}

      {toast && (
        <ToastDeshacer clave={toast.clave} texto={toast.texto} onDeshacer={toast.deshacer} onCerrar={() => setToast(null)} />
      )}

      <p className="text-xs gp-text-muted mt-2">
        Toca una cita o tarea para ver sus opciones; su checkbox la marca como realizada de un toque.
        Mantén presionado para moverla de día u hora, y jala el borde inferior para cambiar cuánto dura.
        Mover un bloque cambia cuándo lo vas a hacer, nunca su fecha límite.
      </p>
    </div>
  );
}

// Elegir una tarea que ya existe y programarla sin salir de la Agenda. Guarda el horario (día +
// hora); si no se pone hora, la tarea se queda en la franja "Tareas del día" de ese día.
function PendienteExistenteForm({ pendientes, horaSugerida, onAsignar }) {
  const [pendienteId, setPendienteId] = useState("");
  const [fecha, setFecha] = useState(todayISO());
  const [hora, setHora] = useState(horaSugerida || "09:00");
  const [conHora, setConHora] = useState(true);
  return (
    <div>
      <Field label="Tarea guardada">
        <select className="gp-input" value={pendienteId} onChange={(e) => setPendienteId(e.target.value)}>
          <option value="">— elige una —</option>
          {ordenadosPor(pendientes, (p) => p.descripcion).map((p) => <option key={p.id} value={p.id}>{p.descripcion}{p.fechaLimite ? ` (vence: ${p.fechaLimite})` : ""}</option>)}
        </select>
      </Field>
      {pendientes.length === 0 && <p className="text-xs gp-text-muted mb-2">No tienes tareas guardadas sin programar.</p>}
      <div className="grid grid-cols-2 gap-3">
        <Field label="Día en que la harás"><input type="date" className="gp-input" value={fecha} onChange={(e) => setFecha(e.target.value)} /></Field>
        <Field label="Hora de inicio"><input type="time" className="gp-input" value={hora} onChange={(e) => setHora(e.target.value)} disabled={!conHora} /></Field>
      </div>
      <label className="flex items-center gap-2 text-xs mb-2 cursor-pointer">
        <input type="checkbox" checked={conHora} onChange={(e) => setConHora(e.target.checked)}
          style={{ width: 15, height: 15, accentColor: "var(--gold)" }} />
        Ponerle hora (si no, se queda en “Tareas del día”)
      </label>
      <p className="text-xs gp-text-muted mb-3">Esto define cuándo la vas a hacer. Su fecha límite no se toca.</p>
      <button className="gp-btn w-full py-2 mt-1 text-sm" disabled={!pendienteId} onClick={() => onAsignar(pendienteId, fecha, conHora ? hora : null)}>
        Programar en la Agenda
      </button>
    </div>
  );
}
