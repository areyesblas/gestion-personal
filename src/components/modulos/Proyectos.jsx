// src/components/modulos/Proyectos.jsx
//
// Modulo perezoso (Fase 2). Salio de App.jsx el 5 oct 2026; se mudaron con el sus propias
// piezas (CATS, ESTATUS_PROYECTO, CONTEXTOS_PROYECTO, ICONO_CATEGORIA_PROYECTO, COLOR_CATEGORIA_PROYECTO, MODO_PROYECTO, MONETIZACION, etiquetasDeProyectos, CATEGORIAS_GASTO_PROYECTO, finanzasProyecto, pagosPorColaborador, avanceProyecto, IconoProyecto, BadgeContextoProyecto, BarraProgresoProyecto, ResponsableProyecto, primerNombreYApellido, RangoFechasProyecto, MenuFilaProyecto, DatoFicha, VacioFicha, EtiquetasProyecto, MovimientoProyectoForm, PagoResponsableForm, NotaRapidaProyecto, PresupuestoProyectoForm, FichaProyecto, SeccionForm, ProyectoForm, preguntaCompletarProyecto), que nadie mas usaba.

import ArchivosEntidad from "../comunes/ArchivosEntidad";
import AvatarForm from "../comunes/AvatarForm";
import bannerMontanas from "../../assets/dashboard-banner-montanas-nevadas.jpg";
import { Archive, BarChart3, Bot, Building2, CalendarClock, Check, ChevronDown, ChevronLeft, ChevronRight, Code2, Contact, Copy, Download, ExternalLink, Eye, FileText, FolderKanban, Github, Globe, Heart, Home, Info, ListChecks, Megaphone, MessageSquare, MoreHorizontal, Music, Pencil, Plus, Rocket, StickyNote, Tag, Target, Trash2, Upload, User, Users, Wallet, X } from "lucide-react";
import { AvatarContacto, tiposDeContacto } from "../comunes/contactos";
import { Badge, BarraGuardar, BloqueFicha, Field, IconBtn } from "../ui/basicos";
import { BadgeEstatusProyecto } from "../comunes/proyectos";
import { Bar, CartesianGrid, Cell, ComposedChart, Line, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { BarraListaEstandar, OrdenSelector, Th } from "../ui/tablas";
import { BotonArbolTareas, CheckTareaHecha, ConfirmacionModal, ContadorRamaColapsada, ToggleArbolTarea, preguntaCompletarTarea } from "../comunes/arbolTareas";
import { CANDADO_SENSIBLE_ACTIVO, COLORES_DESGLOSE, COLOR_CONTEXTO_PROYECTO, COLOR_ESTATUS_PROYECTO, ESTATUS_TAREA_CERRADOS, FORMA_PAGO, PRIORIDADES, etiquetaEstatusProyecto, toneEstatusTarea } from "../../lib/catalogos";
import { CamposMoneda, ComprobantePago, MontoMovimiento } from "../comunes/finanzas";
import { ComboFiltroColor } from "../ui/ComboFiltroColor";
import { ComboboxMultiBuscar, MoneyInput } from "../ui/campos";
import { EtiquetaDiasEntrega } from "../comunes/EtiquetaDiasEntrega";
import { MONEDA_BASE, ahoraISO, daysUntil, fmtFechaCorta, fmtMoney, montoBaseDe, todayISO, uid } from "../../lib/formato";
import { Modal } from "../ui/Modal";
import { PendienteForm } from "../comunes/formularios";
import { Suspense, lazy, useEffect, useState } from "react";
import { buildTareaTree, calcAvanceTarea, flattenTareas, fmtFechaCompletado, idsRamasTareas, reabrirTarea } from "../../lib/tareas";
import { compararEs, filtrarPorBusqueda, ordenAlfabetico, ordenadosPorNombre, ordenarLista } from "../../lib/listas";
import { confirmarDescartarCambios, useBorrador } from "../ui/borradores";
import { exportarFilasExcel, exportarFilasPDF } from "../../lib/exportar";
import { paginasVisibles } from "../../lib/paginacion";
import { rentabilidadProyecto, repartoCostosProyecto } from "../../lib/proyectos";
import { supabase } from "../../supabaseClient";
import { usarCatalogoEditable } from "../ui/usarCatalogoEditable";
import { usePanelRedimensionable } from "../ui/usePanelRedimensionable";
// Perezoso dentro del módulo, igual que estaba en App.jsx: el modal de importar solo se abre
// de vez en cuando y no tiene por qué viajar en el trozo de Proyectos.
const ImportarExcelModal = lazy(() => import("../import/ImportarExcelModal"));

// etiqueta), no por su id interno: si el id es "Proveedor" pero el combo dice "Proveedores", lo
// que tiene que quedar alfabético es lo segundo.
const CATS = ordenAlfabetico(["Fundación", "Software", "Música", "Renta", "Marketing", "Chatbots", "Personal", "Otro"]);

const ESTATUS_PROYECTO = ["Idea", "En validación", "En desarrollo", "Activo", "Finalizado", "Pausado", "Archivado"];

// contexto: es una propiedad del proyecto, como la categoría, para poder separar lo personal de
// lo del negocio sin duplicar pantallas.
const CONTEXTOS_PROYECTO = ["Personal", "Profesional", "Empresarial"];

// Ícono y color del proyecto: se DERIVAN de su categoría, no se guardan como campo. Así cada
// proyecto se reconoce de un vistazo en la lista sin pedirle a nadie que elija un ícono.
const ICONO_CATEGORIA_PROYECTO = {
  "Fundación": Heart, "Software": Code2, "Música": Music, "Renta": Home,
  "Marketing": Megaphone, "Chatbots": Bot, "Personal": User, "Otro": FolderKanban,
};

const COLOR_CATEGORIA_PROYECTO = {
  "Fundación": "#EC4899", "Software": "#087CF5", "Música": "#8B5CF6", "Renta": "#16A36A",
  "Marketing": "#F59E0B", "Chatbots": "#06B6D4", "Personal": "#64748B", "Otro": "#64748B",
};

const MODO_PROYECTO = ["Finito", "Continuo"];

const MONETIZACION = ordenAlfabetico(["Dinero", "Especie", "Intercambio", "No genera dinero"]);

// Citas. No hay tabla que mantener ni opciones que puedan quedarse huérfanas.
// Mismo criterio para las etiquetas de proyectos: el catálogo son las que ya se usaron.
const etiquetasDeProyectos = (proyectos) =>
  [...new Set((proyectos || []).flatMap((p) => p.etiquetas || []))].sort((a, b) => compararEs(a, b));

// cerrada: Finanzas acepta cualquier categoría y el campo deja escribir una nueva.

const CATEGORIAS_GASTO_PROYECTO = ordenAlfabetico([
  "Viáticos", "Traslados", "Materiales", "Software", "Subcontratación", "Comidas de trabajo",
  "Papelería", "Permisos y trámites", "Otro",
]);

//   · cobrado / por cobrar  -> lo que entra del cliente (ingresos reales vs ingresos pendientes)
//   · comprometido / pagado -> lo que sale al equipo (precio pactado de tareas vs tareas ya hechas)
function finanzasProyecto(data, proyectoId) {
  const movs = (data.finanzas || []).filter((f) => f.proyectoId === proyectoId);
  const suma = (lista) => lista.reduce((t, f) => t + montoBaseDe(f), 0);

  const ingresos = movs.filter((f) => f.tipo === "Ingreso");
  const egresos = movs.filter((f) => f.tipo === "Egreso");
  const cobrado = suma(ingresos.filter((f) => f.estatus === "Cobrado"));
  const porCobrar = suma(ingresos.filter((f) => f.estatus !== "Cobrado"));
  const gastado = suma(egresos.filter((f) => f.estatus === "Cobrado"));
  const gastoPorPagar = suma(egresos.filter((f) => f.estatus !== "Cobrado"));
  // Dentro de los egresos conviene separar lo que se le paga a la gente de lo que se gasta en
  // operar (viáticos, materiales): son dos conversaciones distintas al revisar un proyecto.
  const pagosAPersonas = suma(egresos.filter((f) => f.categoria === "Pago a colaborador"));
  const gastosOperativos = (gastado + gastoPorPagar) - pagosAPersonas;

  const tareas = (data.pendientes || []).filter((t) => t.proyectoId === proyectoId && Number(t.precio) > 0);
  // Comprometido = todo lo pactado, se haya hecho o no. Devengado = lo de las tareas ya
  // terminadas, que es lo que de verdad hay que pagar hoy.
  const comprometidoEquipo = tareas.reduce((t, x) => t + (Number(x.precio) || 0), 0);
  const devengadoEquipo = tareas
    .filter((x) => x.estatus === "Completada")
    .reduce((t, x) => t + (Number(x.precio) || 0), 0);

  const ingresoTotal = cobrado + porCobrar;
  const costoTotal = comprometidoEquipo + gastado + gastoPorPagar;
  const margen = ingresoTotal - costoTotal;
  const margenPct = ingresoTotal > 0 ? Math.round((margen / ingresoTotal) * 100) : null;

  // Presupuesto de gasto del proyecto, si se fijó uno (tabla presupuestos, que ya traía
  // proyecto_id y nadie estaba usando).
  const presupuesto = (data.presupuestos || []).find((x) => x.proyectoId === proyectoId) || null;
  const topeGasto = presupuesto ? Number(presupuesto.monto) || 0 : null;
  const gastoReal = gastado + gastoPorPagar;
  const pctPresupuesto = topeGasto ? Math.round((gastoReal / topeGasto) * 100) : null;

  // Reparto del gasto por categoría, para la dona. "Otros" junta lo que no trae categoría.
  const porCategoria = {};
  egresos.forEach((f) => {
    const k = (f.categoria || "").trim() || "Otros";
    porCategoria[k] = (porCategoria[k] || 0) + montoBaseDe(f);
  });
  const desgloseGastos = Object.entries(porCategoria)
    .map(([nombre, monto]) => ({ nombre, monto, pct: gastoReal ? Math.round((monto / gastoReal) * 100) : 0 }))
    .sort((a, b) => b.monto - a.monto);

  // Evolución mes a mes. Dos líneas distintas a propósito:
  //   · la sólida es HISTORIA: solo lo que ya se cobró y ya se pagó.
  //   · la punteada es PROYECCIÓN: agrega lo pendiente en el mes en que se espera que pase.
  //
  // De qué fecha cuelga cada pendiente, en este orden:
  //   1. su propia fecha de cobro/pago (fecha_vencimiento). Es la mejor porque ya la capturaste
  //      tú al registrar el movimiento: es un compromiso, no una estimación mía.
  //   2. si no tiene, la fecha de entrega del proyecto, que es cuando normalmente se factura.
  //   3. si tampoco hay, el mes del propio movimiento, para que no desaparezca de la gráfica.
  const proyecto = (data.proyectos || []).find((x) => x.id === proyectoId);
  const mesDe = (f) => {
    if (f.estatus === "Cobrado") return (f.fecha || "").slice(0, 7);
    return ((f.fechaVencimiento || proyecto?.fechaFin || f.fecha || "")).slice(0, 7);
  };
  const porMes = {};
  const tocar = (mes) => { if (!porMes[mes]) porMes[mes] = { mes, ingreso: 0, gasto: 0, ingresoPend: 0, gastoPend: 0 }; };
  movs.forEach((f) => {
    const mes = mesDe(f);
    if (!mes) return;
    tocar(mes);
    const monto = montoBaseDe(f);
    if (f.estatus === "Cobrado") {
      if (f.tipo === "Ingreso") porMes[mes].ingreso += monto; else porMes[mes].gasto += monto;
    } else if (f.tipo === "Ingreso") porMes[mes].ingresoPend += monto;
    else porMes[mes].gastoPend += monto;
  });

  // Meses corridos entre el primero y el último, para que el eje no brinque huecos.
  const clavesMes = Object.keys(porMes).sort();
  if (clavesMes.length) {
    const [aIni, mIni] = clavesMes[0].split("-").map(Number);
    const [aFin, mFin] = clavesMes[clavesMes.length - 1].split("-").map(Number);
    for (let a = aIni, m = mIni; a < aFin || (a === aFin && m <= mFin); m === 12 ? (m = 1, a++) : m++) {
      tocar(`${a}-${String(m).padStart(2, "0")}`);
    }
  }

  const mesHoy = todayISO().slice(0, 7);
  // La punteada solo tiene sentido si queda algo por pasar; si no, duplicaría la sólida.
  const hayPendientes = porCobrar > 0 || gastoPorPagar > 0;
  let acumI = 0, acumG = 0, acumProy = 0;
  const evolucion = Object.values(porMes)
    .sort((a, b) => a.mes.localeCompare(b.mes))
    .map((m) => {
      acumI += m.ingreso; acumG += m.gasto;
      acumProy += m.ingreso - m.gasto + m.ingresoPend - m.gastoPend;
      const esPasado = m.mes <= mesHoy;
      return {
        ...m,
        acumuladoIngreso: acumI, acumuladoGasto: acumG,
        neto: esPasado ? acumI - acumG : null,
        // Arranca EN el mes actual, no después: ahí las dos valen lo mismo y las líneas se
        // tocan. Si empezara en el primer mes con pendientes, se verían como dos trazos sueltos.
        proyeccion: !hayPendientes || m.mes < mesHoy ? null : acumProy,
      };
    });
  const hayProyeccion = hayPendientes && evolucion.some((m) => m.proyeccion !== null);

  // Resultado: lo que hay hoy en la mano y lo que habrá cuando el cliente termine de pagar.
  const disponibleHoy = cobrado - gastado;
  const resultadoProyectado = disponibleHoy + porCobrar;

  return {
    movs, cobrado, porCobrar, ingresoTotal, gastado, gastoPorPagar, gastoReal,
    pagosAPersonas, gastosOperativos, desgloseGastos, evolucion, hayProyeccion,
    disponibleHoy, resultadoProyectado,
    comprometidoEquipo, devengadoEquipo, costoTotal, margen, margenPct,
    presupuesto, topeGasto, pctPresupuesto,
    pctCobrado: ingresoTotal ? Math.round((cobrado / ingresoTotal) * 100) : 0,
    pctPorCobrar: ingresoTotal ? Math.round((porCobrar / ingresoTotal) * 100) : 0,
    disponiblePresupuesto: topeGasto === null ? null : Math.max(0, topeGasto - gastoReal),
  };
}

//   por pagar    -> lo comprometido que todavía no se le entrega; si no hay tareas con precio,
//                   son los pagos ya registrados que siguen pendientes
function pagosPorColaborador(data, proyectoId) {
  const tareas = (data.pendientes || []).filter((t) => t.proyectoId === proyectoId && Number(t.precio) > 0 && t.colaboradorContactoId);
  const pagos = (data.finanzas || []).filter((f) => f.proyectoId === proyectoId && f.categoria === "Pago a colaborador" && f.contactoId);
  const ids = [...new Set([...tareas.map((t) => t.colaboradorContactoId), ...pagos.map((f) => f.contactoId)])];
  return ids.map((id) => {
    const suyas = tareas.filter((t) => t.colaboradorContactoId === id);
    const comprometido = suyas.reduce((s, t) => s + (Number(t.precio) || 0), 0);
    const pagado = pagos.filter((f) => f.contactoId === id && f.estatus === "Cobrado").reduce((s, f) => s + montoBaseDe(f), 0);
    const programado = pagos.filter((f) => f.contactoId === id && f.estatus !== "Cobrado").reduce((s, f) => s + montoBaseDe(f), 0);
    const porPagar = comprometido > 0 ? Math.max(0, comprometido - pagado) : programado;
    // La fecha más próxima entre lo que prometiste en las tareas y lo que dejaste programado.
    const fechas = [
      ...suyas.map((t) => t.fechaPagoAprox).filter(Boolean),
      ...pagos.filter((f) => f.contactoId === id && f.estatus !== "Cobrado").map((f) => f.fechaVencimiento).filter(Boolean),
    ].sort();
    return {
      id, nombre: (data.contactos || []).find((c) => c.id === id)?.nombre || "—",
      comprometido, pagado, porPagar, proximoPago: fechas[0] || "",
      estado: porPagar > 0 ? "Pendiente" : "Pagado",
    };
  }).sort((a, b) => b.porPagar - a.porPagar || compararEs(a.nombre, b.nombre));
}

// todavía no tiene tareas, para no dibujar un "0%" que parece atraso cuando en realidad no hay
// nada que medir.
function avanceProyecto(data, proyectoId) {
  const arbol = buildTareaTree((data.pendientes || []).filter((t) => t.proyectoId === proyectoId));
  if (arbol.length === 0) return null;
  return Math.round(arbol.reduce((s, n) => s + calcAvanceTarea(n), 0) / arbol.length);
}

// Imagen del proyecto si subiste una; si no, un ícono derivado de su categoría. Así ningún
// proyecto se queda sin identidad visual, pero el que la merece puede tener la suya.
function IconoProyecto({ p, size = 36 }) {
  if (p.imagenUrl) {
    return (
      <img
        src={p.imagenUrl} alt=""
        className="rounded-xl object-cover shrink-0"
        style={{ width: size, height: size, border: "1px solid var(--border)" }}
      />
    );
  }
  const Icono = ICONO_CATEGORIA_PROYECTO[p.categoria] || FolderKanban;
  const color = COLOR_CATEGORIA_PROYECTO[p.categoria] || "#64748B";
  return (
    <div
      className="rounded-xl flex items-center justify-center shrink-0"
      style={{ width: size, height: size, background: `${color}1F`, color }}
    >
      <Icono size={Math.round(size * 0.5)} />
    </div>
  );
}

function BadgeContextoProyecto({ contexto }) {
  if (!contexto) return <span className="gp-text-muted text-xs">—</span>;
  const color = COLOR_CONTEXTO_PROYECTO[contexto] || "#64748B";
  return <span className="gp-badge whitespace-nowrap" style={{ color, background: `${color}22` }}>{contexto}</span>;
}

// Barra compacta de progreso para comparar proyectos de un vistazo (secc. 10: nada de gráficas
// grandes dentro de la lista).
function BarraProgresoProyecto({ pct, ancho = 78 }) {
  if (pct === null || pct === undefined) return <span className="text-xs gp-text-muted">sin tareas</span>;
  const color = pct >= 100 ? "var(--teal)" : pct >= 50 ? "#087CF5" : "var(--gold)";
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 rounded-full" style={{ width: ancho, background: "var(--border)" }}>
        <div className="h-1.5 rounded-full" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="gp-mono text-xs shrink-0" style={{ color }}>{pct}%</span>
    </div>
  );
}

// avatar en vez de un hueco. Reutiliza AvatarContacto para no tener dos formas de pintar una
// persona en la app.
function ResponsableProyecto({ p, data, miNombre, miAvatarUrl, size = 24 }) {
  const c = p.responsableContactoId ? (data.contactos || []).find((x) => x.id === p.responsableContactoId) : null;
  const persona = c || { nombre: miNombre || "Tú", fotoUrl: miAvatarUrl || "" };
  return (
    <div className="flex items-center gap-2 min-w-0">
      <AvatarContacto c={persona} size={size} />
      <span className="text-xs truncate">{primerNombreYApellido(persona.nombre)}</span>
    </div>
  );
}

// "Angel Reyes Blas" -> "Angel Reyes": nombre corto para que la columna Responsable no empuje al
// resto de la tabla (secc. 14).
const primerNombreYApellido = (nombre) => (nombre || "").trim().split(/\s+/).slice(0, 2).join(" ") || "—";

// Rango de fechas del proyecto, en dos renglones como el mockup, más los días que faltan para la
// entrega debajo.
function RangoFechasProyecto({ p }) {
  if (!p.fechaInicio && !p.fechaFin) return <span className="gp-text-muted text-xs">—</span>;
  const vencido = p.fechaFin && p.estatus !== "Finalizado" && p.estatus !== "Archivado" && daysUntil(p.fechaFin) < 0;
  return (
    <div className="gp-mono text-xs leading-snug">
      <div className="gp-text-muted">{fmtFechaCorta(p.fechaInicio) || "—"}</div>
      <div style={{ color: vencido ? "var(--red)" : "var(--muted)" }}>{fmtFechaCorta(p.fechaFin) || "—"}</div>
      <EtiquetaDiasEntrega p={p} className="gp-serif" />
    </div>
  );
}

// Menú "···" de cada proyecto. Igual que en Contactos, el estado de cuál está abierto vive en la
// lista (uno solo para toda la tabla), no uno por fila.
function MenuFilaProyecto({ p, abierto, onToggle, onCerrar, onAbrir, onEditar, onDuplicar, onArchivar, onEliminar }) {
  const archivado = p.estatus === "Archivado";
  return (
    <div className="relative">
      <IconBtn title="Acciones" onClick={onToggle}><MoreHorizontal size={15} /></IconBtn>
      {abierto && (
        <>
          <div className="fixed inset-0 z-10" onClick={onCerrar} />
          <div className="absolute right-0 top-8 z-20 gp-panel py-1 text-sm" style={{ minWidth: 190 }}>
            <button onClick={() => { onCerrar(); onAbrir(p); }} className="w-full text-left px-3 py-2 gp-panel-hi flex items-center gap-2"><Eye size={13} /> Abrir</button>
            <button onClick={() => { onCerrar(); onEditar(p); }} className="w-full text-left px-3 py-2 gp-panel-hi flex items-center gap-2"><Pencil size={13} /> Editar</button>
            <button onClick={() => { onCerrar(); onDuplicar(p); }} className="w-full text-left px-3 py-2 gp-panel-hi flex items-center gap-2"><Copy size={13} /> Duplicar</button>
            <button onClick={() => { onCerrar(); onArchivar(p); }} className="w-full text-left px-3 py-2 gp-panel-hi flex items-center gap-2"><Archive size={13} /> {archivado ? "Desarchivar" : "Archivar"}</button>
            <button onClick={() => { onCerrar(); onEliminar(p.id); }} className="w-full text-left px-3 py-2 gp-panel-hi flex items-center gap-2 gp-text-red"><Trash2 size={13} /> Eliminar</button>
          </div>
        </>
      )}
    </div>
  );
}

// costos, tabla de tareas, GitHub y bitácora dentro de la propia lista, y la lista dejaba de
// servir como lista). Todo eso vive ahora en la ficha de la derecha o en su módulo fuente.
export default function Proyectos({
  data, onAdd, onEdit, onRemove, onAddComentario, onRemoveComentario,
  onVerDetalle, onVincularContacto, onDesvincularContacto,
  onAddTarea, onEditTarea, onIrAVista, onVerTareasDeProyecto, onVerContacto,
  onAddFinanzas, onAddPresupuesto, onEditPresupuesto,
  onCrearContacto, onEnviarInvitacion, onAceptarEnNombre,
  sensibleDesbloqueadoHasta, onDesbloquear, miNombre, miAvatarUrl,
  proyectoSel, onSeleccionar, fichaTab, onFichaTab,
  crearAlEntrar, onConsumirCrearAlEntrar,
}) {
  // Ancho de la ficha de la derecha, arrastrable y recordado por pantalla.
  const { contenedorRef, divisor, estiloPanel } = usePanelRedimensionable("proyectos");
  const [modal, setModal] = useState(null);
  const [importarAbierto, setImportarAbierto] = useState(false);
  const [filtroEstatus, setFiltroEstatusState] = useState("Todos");
  const [filtroContexto, setFiltroContextoState] = useState("Todos");
  const [filtroCategoria, setFiltroCategoriaState] = useState("Todas");
  const [orden, setOrden] = useState("default");
  const [ordenDir, setOrdenDir] = useState("asc");
  const [busqueda, setBusquedaState] = useState("");
  const [menuAcciones, setMenuAcciones] = useState(null);
  const [pagina, setPagina] = useState(1);
  // 100 por página (Angel, 2 oct 2026): con el encabezado fijo ya no estorba una lista larga, y
  // paginar de 8 en 8 obligaba a andar brincando páginas para encontrar algo.
  const [porPagina, setPorPagina] = useState(100);
  // Cualquier cambio de filtro o búsqueda regresa a la página 1 — si no, se queda en una página
  // que ya no existe con el nuevo resultado y la lista se ve vacía sin razón aparente.
  const setFiltroEstatus = (t) => { setFiltroEstatusState(t); setPagina(1); };
  const setFiltroContexto = (t) => { setFiltroContextoState(t); setPagina(1); };
  const setFiltroCategoria = (t) => { setFiltroCategoriaState(t); setPagina(1); };
  const setBusqueda = (q) => { setBusquedaState(q); setPagina(1); };
  const toggleOrden = (key) => { if (orden === key) setOrdenDir((d) => (d === "asc" ? "desc" : "asc")); else { setOrden(key); setOrdenDir("asc"); } };

  const empty = {
    nombre: "", descripcion: "", estatus: "Idea", contexto: "Personal", categoria: "Otro",
    responsableContactoId: "", fechaInicio: "", fechaFin: "", etiquetas: [], imagenUrl: "",
    modo: "Finito", monetizacion: "Dinero", prioridad: "Media", fechaRevision: "",
    github: "", githubSubido: false, notas: [],
  };

  // Accesos rápidos del Centro de mando: si se navegó aquí pidiendo crear directo, abre el
  // formulario solo (ver irACrear en AppLoggedIn) y limpia la señal para no reabrirlo después.
  useEffect(() => {
    if (crearAlEntrar) { setModal({ item: { ...empty, ...(crearAlEntrar.preset || {}) } }); onConsumirCrearAlEntrar(); }
  }, [crearAlEntrar]);

  const contactosDe = (proyectoId) => (data.contactoProyectos || [])
    .filter((v) => v.proyectoId === proyectoId)
    .map((v) => ({ vinculoId: v.id, contacto: (data.contactos || []).find((c) => c.id === v.contactoId) }))
    .filter((x) => x.contacto);

  const camposOrden = {
    alfabetico: { get: (p) => p.nombre, tipo: "texto" },
    estatus: { get: (p) => ESTATUS_PROYECTO.indexOf(p.estatus), tipo: "numero" },
    progreso: { get: (p) => avanceProyecto(data, p.id), tipo: "numero" },
    inicio: { get: (p) => p.fechaInicio, tipo: "fecha" },
    fin: { get: (p) => p.fechaFin, tipo: "fecha" },
    // createdAt lo pone el servidor: un proyecto recién creado todavía no lo tiene en memoria. Se
    // trata como "lo más nuevo que hay" para que aparezca hasta arriba al crearlo y no hasta el
    // final, que es donde lo mandaría un valor vacío.
    registro: { get: (p) => p.createdAt || "9999", tipo: "fecha" },
    prioridad: { get: (p) => p.prioridad, tipo: "prioridad" },
  };
  const opcionesOrden = [
    { key: "alfabetico", label: "alfabético" },
    { key: "estatus", label: "estado" },
    { key: "progreso", label: "progreso" },
    { key: "inicio", label: "fecha de inicio" },
    { key: "fin", label: "fecha de fin" },
    { key: "registro", label: "fecha de registro" },
    { key: "prioridad", label: "prioridad" },
  ];

  const FILTROS = ["Todos", ...ESTATUS_PROYECTO];
  // Corregir o quitar una etiqueta la cambia en todos los proyectos que la traen: el catálogo
  // son las etiquetas ya capturadas, no una tabla aparte.
  const catalogoEtiquetasProyectos = usarCatalogoEditable({
    registros: data.proyectos, campo: "etiquetas", esLista: true, onEditar: onEdit, nombreSingular: "la etiqueta",
  });
  const contarFiltro = (t) => (t === "Todos" ? data.proyectos.length : data.proyectos.filter((p) => p.estatus === t).length);
  // Opciones del combo de etapa: id, etiqueta corta, color y cuántos proyectos hay en cada una.
  const opcionesFiltroEstatus = FILTROS.map((t) => ({
    id: t,
    label: t === "Todos" ? "Todas las etapas" : etiquetaEstatusProyecto(t),
    color: t === "Todos" ? "var(--gold)" : COLOR_ESTATUS_PROYECTO[t],
    n: contarFiltro(t),
  }));

  const porEstatus = filtroEstatus === "Todos" ? data.proyectos : data.proyectos.filter((p) => p.estatus === filtroEstatus);
  const porContexto = filtroContexto === "Todos" ? porEstatus : porEstatus.filter((p) => (p.contexto || "") === filtroContexto);
  const porCategoria = filtroCategoria === "Todas" ? porContexto : porContexto.filter((p) => p.categoria === filtroCategoria);
  // Búsqueda por contenido sobre lo que el proyecto realmente tiene: nombre, descripción,
  // categoría, contexto y etiquetas (secc. 8 — nada de criterios inventados).
  const buscados = filtrarPorBusqueda(porCategoria, busqueda, [
    (p) => p.nombre, (p) => p.descripcion, (p) => p.categoria, (p) => p.contexto,
    (p) => (p.etiquetas || []).join(" "),
  ]);
  // Sin criterio elegido, "Orden: más reciente" tiene que ser justo eso: el último proyecto que
  // registraste hasta arriba (ordenarLista respeta el orden de llegada, que es el más viejo
  // primero, así que aquí se invierte a propósito).
  const visibles = orden === "default"
    ? ordenarLista(buscados, "registro", camposOrden, "desc")
    : ordenarLista(buscados, orden, camposOrden, ordenDir);

  const totalPaginas = Math.max(1, Math.ceil(visibles.length / porPagina));
  const paginaActual = Math.min(pagina, totalPaginas);
  const desde = (paginaActual - 1) * porPagina;
  const enPagina = visibles.slice(desde, desde + porPagina);

  const columnasExport = [
    { label: "Nombre", get: (p) => p.nombre },
    { label: "Descripción", get: (p) => p.descripcion || "" },
    { label: "Estado", get: (p) => p.estatus },
    { label: "Contexto", get: (p) => p.contexto || "" },
    { label: "Categoría", get: (p) => p.categoria || "" },
    { label: "Responsable", get: (p) => (p.responsableContactoId ? (data.contactos.find((c) => c.id === p.responsableContactoId)?.nombre || "—") : (miNombre || "Tú")) },
    { label: "Progreso", get: (p) => { const a = avanceProyecto(data, p.id); return a === null ? "" : `${a}%`; } },
    { label: "Inicio", get: (p) => p.fechaInicio || "" },
    { label: "Fin", get: (p) => p.fechaFin || "" },
    { label: "Etiquetas", get: (p) => (p.etiquetas || []).join(", ") },
    { label: "Prioridad", get: (p) => p.prioridad || "" },
  ];

  // Duplicar: copia la definición del proyecto (lo que ES el proyecto), nunca su historia. Las
  // tareas, movimientos, contactos vinculados y comentarios pertenecen al original — copiarlos
  // sería duplicar datos de otros módulos, justo lo que la regla prohíbe.
  const duplicar = (p) => {
    const { id, createdAt, userId, ...definicion } = p;
    onAdd({ ...definicion, nombre: `${p.nombre} (copia)`, estatus: "Idea", notas: [] });
  };
  const archivar = (p) => onEdit(p.id, { estatus: p.estatus === "Archivado" ? "Activo" : "Archivado" });

  const propsMenu = (p) => ({
    p,
    abierto: menuAcciones === p.id,
    onToggle: () => setMenuAcciones(menuAcciones === p.id ? null : p.id),
    onCerrar: () => setMenuAcciones(null),
    onAbrir: (x) => onSeleccionar(x.id),
    onEditar: (x) => setModal({ item: x }),
    onDuplicar: duplicar,
    onArchivar: archivar,
    onEliminar: onRemove,
  });

  const seleccionado = data.proyectos.find((p) => p.id === proyectoSel) || null;
  const limpiarFiltros = () => { setFiltroEstatus("Todos"); setFiltroContexto("Todos"); setFiltroCategoria("Todas"); setBusqueda(""); setOrden("default"); setOrdenDir("asc"); };

  return (
    <div ref={contenedorRef} className="flex flex-col lg:flex-row gap-4 items-start">
      {/* Columna de la lista. En celular se esconde cuando hay una ficha abierta (no caben lado a
          lado); en escritorio se angosta y la ficha se pone a la derecha, igual que Contactos. */}
      <div className={`min-w-0 flex-1 w-full ${seleccionado ? "hidden lg:block" : ""}`}>
        <div className="relative overflow-hidden rounded-2xl mb-4">
          <img src={bannerMontanas} alt="" className="absolute inset-0 w-full h-full object-cover" style={{ objectPosition: "50% 30%" }} />
          <div className="absolute inset-0" style={{ background: "linear-gradient(100deg, rgba(11,35,72,.88) 0%, rgba(11,35,72,.6) 45%, rgba(11,35,72,.12) 80%, rgba(11,35,72,0) 100%)" }} />
          <div className="relative z-10 p-5 md:px-8 md:py-7">
            <h2 className="gp-serif text-white text-2xl md:text-4xl font-extrabold" style={{ textShadow: "0 2px 8px rgba(0,0,0,.45)" }}>Proyectos e ideas</h2>
            <p className="text-white text-xs md:text-sm mt-1 font-medium" style={{ textShadow: "0 1px 5px rgba(0,0,0,.5)" }}>
              De idea a proyecto activo — organiza, da seguimiento y avanza.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 mb-3">
          {/* Antes era una fila de siete chips que en celular ocupaba media pantalla. Ahora es el
              mismo combo con color que ya usa Contactos (pedido de Angel, 29 sept 2026): las
              etapas conservan su color y su conteo, y el orden sigue siendo el del pipeline
              (Idea → Validación → …), no alfabético. */}
          <div className="flex-1 min-w-0">
            <ComboFiltroColor opciones={opcionesFiltroEstatus} valor={filtroEstatus} onCambiar={setFiltroEstatus} />
          </div>
          <div className="flex gap-2 shrink-0">
            <button onClick={() => setImportarAbierto(true)} className="gp-btn-ghost flex items-center justify-center gap-1 px-3 py-1.5 text-sm"><Upload size={14} /> Importar</button>
            <button onClick={() => setModal({ item: empty })} className="gp-btn flex items-center justify-center gap-1 px-3 py-1.5 text-sm"><Plus size={14} /> Nuevo proyecto</button>
          </div>
        </div>

        <BarraListaEstandar
          busqueda={busqueda} onBusqueda={setBusqueda}
          placeholder="Buscar proyectos por nombre, descripción, categoría o etiqueta…"
          extra={
            <>
              <select className="gp-input text-xs py-1.5" style={{ width: "auto" }} value={filtroContexto} onChange={(e) => setFiltroContexto(e.target.value)} aria-label="Filtrar por contexto">
                <option value="Todos">Contexto: Todos</option>
                {CONTEXTOS_PROYECTO.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
              <select className="gp-input text-xs py-1.5" style={{ width: "auto" }} value={filtroCategoria} onChange={(e) => setFiltroCategoria(e.target.value)} aria-label="Filtrar por categoría">
                <option value="Todas">Categoría: Todas</option>
                {CATS.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
              <OrdenSelector opciones={opcionesOrden} value={orden} onChange={(v) => { setOrden(v); setOrdenDir("asc"); }} />
            </>
          }
          onExportExcel={() => exportarFilasExcel(visibles, columnasExport, "proyectos")}
          onExportPDF={() => exportarFilasPDF(visibles, columnasExport, "proyectos", "Proyectos e ideas", `estado: ${filtroEstatus} · contexto: ${filtroContexto} · categoría: ${filtroCategoria}${busqueda ? ` · búsqueda: "${busqueda}"` : ""}`)}
        />

        {/* Escritorio: tabla. Celular: tarjetas — el documento pide explícitamente no comprimir la
            tabla en móvil. */}
        <div className="gp-panel overflow-x-auto hidden md:block">
          <table className="gp-table">
            <thead>
              <tr>
                <Th label="Nombre" sortKey="alfabetico" orden={orden} ordenDir={ordenDir} onToggle={toggleOrden} />
                <Th label="Estado" sortKey="estatus" orden={orden} ordenDir={ordenDir} onToggle={toggleOrden} />
                <th>Contexto</th>
                <th>Categoría</th>
                <th>Responsable</th>
                <Th label="Progreso" sortKey="progreso" orden={orden} ordenDir={ordenDir} onToggle={toggleOrden} />
                <Th label="Inicio / Fin" sortKey="inicio" orden={orden} ordenDir={ordenDir} onToggle={toggleOrden} />
                <th></th>
              </tr>
            </thead>
            <tbody>
              {enPagina.map((p) => {
                const esSel = proyectoSel === p.id;
                return (
                  <tr key={p.id} onClick={() => onSeleccionar(p.id)} style={{ cursor: "pointer", background: esSel ? "var(--panel-hi)" : undefined }}>
                    <td>
                      <div className="flex items-center gap-2.5">
                        <IconoProyecto p={p} size={32} />
                        <div className="min-w-0">
                          <div className="font-medium truncate" style={{ maxWidth: 240 }}>{p.nombre}</div>
                          {p.descripcion && <div className="text-xs gp-text-muted truncate" style={{ maxWidth: 240 }}>{p.descripcion}</div>}
                        </div>
                      </div>
                    </td>
                    <td><BadgeEstatusProyecto estatus={p.estatus} /></td>
                    <td><BadgeContextoProyecto contexto={p.contexto} /></td>
                    <td className="gp-text-muted">{p.categoria || "—"}</td>
                    <td><ResponsableProyecto p={p} data={data} miNombre={miNombre} miAvatarUrl={miAvatarUrl} /></td>
                    <td><BarraProgresoProyecto pct={avanceProyecto(data, p.id)} /></td>
                    <td><RangoFechasProyecto p={p} /></td>
                    <td onClick={(e) => e.stopPropagation()}><MenuFilaProyecto {...propsMenu(p)} /></td>
                  </tr>
                );
              })}
              {enPagina.length === 0 && (
                <tr><td colSpan={8} className="text-center gp-text-muted py-8">
                  {data.proyectos.length === 0 ? "Aún no tienes proyectos o ideas registradas." : "Ningún proyecto coincide con la búsqueda o los filtros."}
                </td></tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="md:hidden flex flex-col gap-2">
          {enPagina.map((p) => (
            <div key={p.id} className="gp-panel p-3" onClick={() => onSeleccionar(p.id)} style={{ cursor: "pointer" }}>
              <div className="flex items-start gap-3">
                <IconoProyecto p={p} size={40} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{p.nombre}</p>
                  {p.descripcion && <p className="text-xs gp-text-muted truncate">{p.descripcion}</p>}
                  <div className="flex items-center gap-1.5 flex-wrap mt-1.5">
                    <BadgeEstatusProyecto estatus={p.estatus} />
                    {p.contexto && <BadgeContextoProyecto contexto={p.contexto} />}
                    {p.categoria && <Badge tone="muted">{p.categoria}</Badge>}
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                  <MenuFilaProyecto {...propsMenu(p)} />
                  <ChevronRight size={16} className="gp-text-muted" />
                </div>
              </div>
              <div className="flex items-center justify-between gap-3 mt-2 pt-2 border-t gp-border">
                <BarraProgresoProyecto pct={avanceProyecto(data, p.id)} ancho={70} />
                <div className="text-right">
                  <span className="gp-mono text-xs gp-text-muted block">
                    {p.fechaInicio || p.fechaFin ? `${fmtFechaCorta(p.fechaInicio) || "—"} — ${fmtFechaCorta(p.fechaFin) || "—"}` : ""}
                  </span>
                  <EtiquetaDiasEntrega p={p} />
                </div>
              </div>
            </div>
          ))}
          {enPagina.length === 0 && (
            <p className="text-sm gp-text-muted text-center py-6">
              {data.proyectos.length === 0 ? "Aún no tienes proyectos o ideas registradas." : "Ningún proyecto coincide con la búsqueda o los filtros."}
            </p>
          )}
        </div>

        {visibles.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3 mt-3 text-xs gp-text-muted">
            <span>Mostrando {desde + 1}–{Math.min(desde + porPagina, visibles.length)} de {visibles.length} proyecto{visibles.length === 1 ? "" : "s"}</span>
            {totalPaginas > 1 && (
              <div className="flex items-center gap-1">
                <button onClick={() => setPagina(Math.max(1, paginaActual - 1))} disabled={paginaActual === 1} className="px-2 py-1 rounded gp-btn-ghost disabled:opacity-40" aria-label="Página anterior"><ChevronLeft size={13} /></button>
                {paginasVisibles(paginaActual, totalPaginas).map((n, i) => (
                  n === "…"
                    ? <span key={`sep-${i}`} className="px-1">…</span>
                    : <button key={n} onClick={() => setPagina(n)} className={`px-2.5 py-1 rounded ${n === paginaActual ? "gp-btn" : "gp-btn-ghost"}`}>{n}</button>
                ))}
                <button onClick={() => setPagina(Math.min(totalPaginas, paginaActual + 1))} disabled={paginaActual === totalPaginas} className="px-2 py-1 rounded gp-btn-ghost disabled:opacity-40" aria-label="Página siguiente"><ChevronRight size={13} /></button>
              </div>
            )}
            <label className="flex items-center gap-1.5">
              Mostrar
              <select className="gp-input text-xs py-1" style={{ width: "auto" }} value={porPagina} onChange={(e) => { setPorPagina(Number(e.target.value)); setPagina(1); }}>
                {[12, 24, 50, 100, 250].map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
              por página
            </label>
          </div>
        )}
        {visibles.length === 0 && data.proyectos.length > 0 && (
          <button onClick={limpiarFiltros} className="text-xs gp-text-gold mt-3">Limpiar filtros</button>
        )}
      </div>

      {/* Ficha del proyecto: panel a la derecha en escritorio (pegado arriba mientras se baja la
          lista) y pantalla completa en celular. */}
      {seleccionado && divisor}
      {seleccionado && (
        <div className="w-full shrink-0 lg:sticky lg:top-4" style={estiloPanel}>
          <FichaProyecto
            p={seleccionado}
            data={data}
            contactosVinculados={contactosDe(seleccionado.id)}
            miNombre={miNombre} miAvatarUrl={miAvatarUrl}
            tab={fichaTab} onTab={onFichaTab}
            onCerrar={() => onSeleccionar(null)}
            onEditar={() => setModal({ item: seleccionado })}
            onEdit={onEdit}
            onEditTarea={onEditTarea}
            onAddComentario={onAddComentario}
            onVincularContacto={onVincularContacto}
            onDesvincularContacto={onDesvincularContacto}
            onVerContacto={onVerContacto}
            onVerDetalle={onVerDetalle}
            onVerTareas={onVerTareasDeProyecto}
            onIrAVista={onIrAVista}
            onNuevaTarea={() => setModal({ tarea: true, proyectoId: seleccionado.id })}
            onAddFinanzas={onAddFinanzas}
            onAddTarea={onAddTarea}
            onGuardarPresupuesto={(actual, monto) => {
              // Un solo tope por proyecto: si ya había uno se edita, si no se crea. El periodo
              // va vacío a propósito — este presupuesto es del proyecto completo, no mensual.
              // OJO: presupuestos tiene CHECK (tipo IN ('categoria','proyecto')) y
              // CHECK (periodo IN ('mensual','anual')), los dos en minúsculas. Mandar "Proyecto"
              // con mayúscula reventaba el insert y solo se veía "No se pudo guardar".
              // El periodo va nulo a propósito: este tope es del proyecto completo, no de un mes.
              if (actual) onEditPresupuesto(actual.id, { monto });
              else onAddPresupuesto({ id: uid(), tipo: "proyecto", proyectoId: seleccionado.id, monto, notas: "" });
            }}
            sensibleDesbloqueadoHasta={sensibleDesbloqueadoHasta}
            onDesbloquear={onDesbloquear}
          />
        </div>
      )}

      {modal?.tarea && (
        <Modal title="Nueva tarea" onClose={() => setModal(null)}>
          <PendienteForm
            item={{ proyectoId: modal.proyectoId, parentId: "", descripcion: "", fechaLimite: todayISO(), fechaRevision: "", prioridad: "Media", estatus: "Pendiente", colaboradorContactoId: null, contactoId: "", precio: "", fechaPagoAprox: "", tiempoEstimado: "", tiempoReal: "", asignadoA: "", avance: "" }}
            proyectos={data.proyectos} contactos={data.contactos} pendientes={data.pendientes} colaboradores={[]}
            proyectoFijoId={modal.proyectoId}
            onCrearContacto={(nombre, tipos) => onCrearContacto(nombre, tipos || ["Colaborador"])}
            onEnviarInvitacion={onEnviarInvitacion}
            onAceptarEnNombre={onAceptarEnNombre}
            onSave={(v, enviarCorreo) => {
              const nuevoId = uid();
              onAddTarea({ ...v, id: nuevoId });
              if (enviarCorreo) onEnviarInvitacion(nuevoId);
              setModal(null);
            }}
          />
        </Modal>
      )}

      {modal && !modal.tarea && (
        <Modal title={modal.item.id ? "Editar proyecto" : "Nuevo proyecto"} onClose={() => setModal(null)}>
          <ProyectoForm
            item={modal.item}
            contactos={data.contactos}
            empresas={data.empresas || []}
            vinculos={(data.contactoProyectos || []).filter((v) => v.proyectoId === modal.item.id)}
            etiquetasExistentes={etiquetasDeProyectos(data.proyectos)}
            catalogoEtiquetas={catalogoEtiquetasProyectos}
            onVincularContacto={onVincularContacto}
            onDesvincularContacto={onDesvincularContacto}
            onSave={(v) => { modal.item.id ? onEdit(modal.item.id, v) : onAdd(v); setModal(null); }}
          />
        </Modal>
      )}

      {importarAbierto && (
        <Modal title="Importar proyectos" onClose={() => setImportarAbierto(false)}>
          <Suspense fallback={<p className="text-sm gp-text-muted">Cargando…</p>}>
            <ImportarExcelModal tipo="proyectos" onImportarFila={(item) => onAdd(item)} onCerrar={() => setImportarAbierto(false)} />
          </Suspense>
        </Modal>
      )}
    </div>
  );
}

/* Piezas de presentación de la ficha del proyecto. Viven FUERA del componente a propósito: si se
   declararan adentro, React las trataría como un tipo de componente nuevo en cada render y
   desmontaría su contenido — un input de adentro perdería el foco en cada tecla. */
function DatoFicha({ label, valor, icono }) {
  return (
    <div className="flex items-start justify-between gap-3 py-1.5">
      <span className="text-xs gp-text-muted shrink-0 flex items-center gap-1.5">{icono} {label}</span>
      <span className="text-xs text-right min-w-0">{valor || <span className="gp-text-muted">—</span>}</span>
    </div>
  );
}

function VacioFicha({ children }) {
  return <p className="text-xs gp-text-muted py-2">{children}</p>;
}

// Etiquetas del proyecto. Componente aparte para que escribir una etiqueta solo vuelva a dibujar
// esta caja y no la ficha entera (que es lo que hacía perder el foco al teclear).
function EtiquetasProyecto({ p, onEdit }) {
  const [texto, setTexto] = useState("");
  const [agregando, setAgregando] = useState(false);
  const etiquetas = p.etiquetas || [];
  const guardar = () => {
    const t = texto.trim();
    if (t && !etiquetas.some((e) => e.toLowerCase() === t.toLowerCase())) onEdit(p.id, { etiquetas: [...etiquetas, t] });
    setTexto("");
    setAgregando(false);
  };
  return (
    <BloqueFicha
      titulo="Etiquetas" icono={<Tag size={14} className="gp-text-gold" />}
      accion={<button onClick={() => setAgregando(true)} className="text-xs gp-text-gold flex items-center gap-1"><Plus size={12} /> Agregar</button>}
    >
      {etiquetas.length === 0 && !agregando && <VacioFicha>Sin etiquetas. Sirven para agrupar proyectos que no comparten categoría.</VacioFicha>}
      {etiquetas.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {etiquetas.map((e) => (
            <span key={e} className="gp-bloque text-xs pl-2.5 pr-1.5 py-1 rounded-full flex items-center gap-1">
              {e}
              <button onClick={() => onEdit(p.id, { etiquetas: etiquetas.filter((x) => x !== e) })} className="gp-text-muted" title="Quitar etiqueta"><X size={11} /></button>
            </span>
          ))}
        </div>
      )}
      {agregando && (
        <input
          className="gp-input text-xs mt-2" autoFocus placeholder="Escribe la etiqueta y Enter"
          value={texto} onChange={(e) => setTexto(e.target.value)}
          onBlur={guardar}
          onKeyDown={(e) => { if (e.key === "Enter") guardar(); if (e.key === "Escape") { setTexto(""); setAgregando(false); } }}
        />
      )}
    </BloqueFicha>
  );
}

// Alta rápida de un movimiento del proyecto. Sirve para los dos casos: cobrarle al cliente
// (Ingreso) y registrar un gasto —viáticos, traslados, materiales— (Egreso).
function MovimientoProyectoForm({ tipo, proyecto, contactos, categoriasUsadas, estatusInicial, onGuardar, onCancelar }) {
  const esIngreso = tipo === "Ingreso";
  const [concepto, setConcepto] = useState(esIngreso ? `Cobro — ${proyecto.nombre}` : "");
  const [monto, setMonto] = useState("");
  const [moneda, setMoneda] = useState(MONEDA_BASE);
  const [tipoCambio, setTipoCambio] = useState(1);
  const [fecha, setFecha] = useState(todayISO());
  const [fechaVencimiento, setFechaVencimiento] = useState("");
  const [categoria, setCategoria] = useState(esIngreso ? "Proyectos" : "Viáticos");
  const [forma, setForma] = useState("Transferencia");
  // El estatus lo decide el cuadrito desde el que se abrió: tocar "Ya cobrado" tiene que
  // registrar algo ya cobrado. Antes los dos cuadritos abrían el formulario igual, en
  // "Pendiente", y el dinero se iba a "Por cobrar" aunque hubieras entrado por el otro.
  const [estatus, setEstatus] = useState(estatusInicial || (esIngreso ? "Pendiente" : "Cobrado"));
  const [contactoId, setContactoId] = useState(esIngreso ? (proyecto.responsableContactoId || "") : "");
  const [error, setError] = useState("");

  const sugerencias = esIngreso
    ? [...new Set(["Proyectos", ...(categoriasUsadas || [])])]
    : [...new Set([...CATEGORIAS_GASTO_PROYECTO, ...(categoriasUsadas || [])])];

  return (
    <div>
      <p className="text-sm gp-text-muted mb-4">
        {esIngreso
          ? "Lo que vas a cobrar por este proyecto. Déjalo en Pendiente y con fecha de cobro: así cuenta como \u201cpor cobrar\u201d y el motor de recordatorios te avisa cuando se acerque."
          : "Un gasto del proyecto: traslados, viáticos, materiales, lo que sea. Se guarda en Finanzas ligado a este proyecto."}
      </p>
      <Field label="Concepto"><input className="gp-input" autoFocus value={concepto} onChange={(e) => setConcepto(e.target.value)} /></Field>
      <Field label="Fecha"><input type="date" className="gp-input" value={fecha} onChange={(e) => setFecha(e.target.value)} /></Field>
      <CamposMoneda
        monto={monto} moneda={moneda} tipoCambio={tipoCambio} fecha={fecha}
        onCambiar={(parche) => {
          if (parche.monto !== undefined) setMonto(parche.monto);
          if (parche.moneda !== undefined) setMoneda(parche.moneda);
          if (parche.tipoCambio !== undefined) setTipoCambio(parche.tipoCambio);
        }}
      />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="Categoría">
          <input className="gp-input" list="cats-mov-proyecto" value={categoria} onChange={(e) => setCategoria(e.target.value)} />
          <datalist id="cats-mov-proyecto">{sugerencias.map((c) => <option key={c} value={c} />)}</datalist>
        </Field>
        <Field label="Forma de pago">
          <select className="gp-input" value={forma} onChange={(e) => setForma(e.target.value)}>{FORMA_PAGO.map((f) => <option key={f}>{f}</option>)}</select>
        </Field>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="Estatus">
          <select className="gp-input" value={estatus} onChange={(e) => setEstatus(e.target.value)}>
            <option value="Cobrado">{esIngreso ? "Ya cobrado" : "Ya pagado"}</option>
            <option value="Pendiente">{esIngreso ? "Por cobrar" : "Por pagar"}</option>
            <option value="Parcial">Parcial (anticipo)</option>
          </select>
        </Field>
        <Field label={esIngreso ? "Fecha de cobro (opcional)" : "Fecha de pago (opcional)"}>
          <input type="date" className="gp-input" value={fechaVencimiento} onChange={(e) => setFechaVencimiento(e.target.value)} disabled={estatus === "Cobrado"} />
        </Field>
      </div>
      <Field label={esIngreso ? "Cliente (opcional)" : "A quién se le paga (opcional)"}>
        <select className="gp-input" value={contactoId} onChange={(e) => setContactoId(e.target.value)}>
          <option value="">— ninguno —</option>
          {ordenadosPorNombre(contactos).map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
        </select>
      </Field>
      {error && <p className="text-xs gp-text-red mb-2">{error}</p>}
      <div className="flex gap-2 mt-1">
        <button onClick={onCancelar} className="gp-btn-ghost flex-1 py-2 text-sm">Cancelar</button>
        <button
          className="gp-btn flex-1 py-2 text-sm"
          onClick={() => {
            if (!concepto.trim()) { setError("Captura un concepto."); return; }
            if (!(Number(monto) > 0)) { setError("El monto tiene que ser mayor a cero."); return; }
            onGuardar({
              id: uid(), tipo, concepto: concepto.trim(), monto: Number(monto), fecha,
              // El monto base se congela aquí: es el número con el que suma toda la app.
              moneda, tipoCambio: Number(tipoCambio) || 1, montoBase: Number(monto) * (Number(tipoCambio) || 1),
              fechaVencimiento: estatus === "Cobrado" ? "" : fechaVencimiento,
              categoria: categoria.trim() || (esIngreso ? "Proyectos" : "Otro"),
              forma, estatus, proyectoId: proyecto.id, contactoId: contactoId || "",
              pautando: false, esRecurrente: false, frecuencia: "Mensual", fechaFin: "",
            });
          }}
        >Guardar</button>
      </div>
    </div>
  );
}

// pagos del colaborador, en los gastos del proyecto y en el histórico de Finanzas, y pueden
// registrarse varios sin que ninguno estorbe en las tareas.
function PagoResponsableForm({ proyecto, contactos, onGuardar, onCancelar }) {
  const [contactoId, setContactoId] = useState(proyecto.responsableContactoId || "");
  const [monto, setMonto] = useState("");
  const [concepto, setConcepto] = useState(`Liderazgo del proyecto — ${proyecto.nombre}`);
  const [fecha, setFecha] = useState(todayISO());
  const [estatus, setEstatus] = useState("Pendiente");
  const [error, setError] = useState("");
  const [guardando, setGuardando] = useState(false);
  const nombreDe = (id) => (contactos || []).find((c) => c.id === id)?.nombre || "";
  return (
    <div>
      <p className="text-sm gp-text-muted mb-4">
        Un pago por dirigir el proyecto, aparte de las tareas que ejecute. Se registra como un
        egreso de Finanzas en la categoría "Pago a colaborador", igual que cualquier otro pago:
        aparece en los pagos de esa persona y en los gastos del proyecto, no en sus tareas.
      </p>
      <Field label="A quién se le paga">
        <select className="gp-input" value={contactoId} onChange={(e) => setContactoId(e.target.value)}>
          <option value="">— elige a la persona —</option>
          {ordenadosPorNombre(contactos).map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
        </select>
      </Field>
      <Field label="Concepto"><input className="gp-input" value={concepto} onChange={(e) => setConcepto(e.target.value)} /></Field>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="Monto"><MoneyInput value={monto} onChange={setMonto} /></Field>
        <Field label="Fecha"><input type="date" className="gp-input" value={fecha} onChange={(e) => setFecha(e.target.value)} /></Field>
      </div>
      <Field label="Estatus">
        <select className="gp-input" value={estatus} onChange={(e) => setEstatus(e.target.value)}>
          <option value="Pendiente">Por pagar</option>
          <option value="Cobrado">Ya pagado</option>
        </select>
      </Field>
      {error && <p className="text-xs gp-text-red mb-2">{error}</p>}
      <div className="flex gap-2 mt-1">
        <button onClick={onCancelar} className="gp-btn-ghost flex-1 py-2 text-sm">Cancelar</button>
        <button
          className="gp-btn flex-1 py-2 text-sm"
          disabled={guardando}
          style={guardando ? { opacity: 0.6 } : undefined}
          onClick={() => {
            if (!contactoId) { setError("Elige a quién se le paga."); return; }
            if (!(Number(monto) > 0)) { setError("El monto tiene que ser mayor a cero."); return; }
            // Bloquear al primer clic: sin esto, dos toques seguidos creaban dos pagos.
            setGuardando(true);
            onGuardar({
              id: uid(), tipo: "Egreso", categoria: "Pago a colaborador", forma: "Transferencia",
              estatus, esRecurrente: false, fecha, proyectoId: proyecto.id, contactoId,
              concepto: concepto.trim() || `Liderazgo — ${nombreDe(contactoId)}`,
              monto: Number(monto), moneda: MONEDA_BASE, tipoCambio: 1, montoBase: Number(monto),
            });
          }}
        >Registrar pago</button>
      </div>
    </div>
  );
}

// `notas`, un arreglo de {id, fecha, texto}), no en una tabla aparte: son de ese proyecto y no
// se consultan desde ningún otro lado.
function NotaRapidaProyecto({ p, onEdit }) {
  const [texto, setTexto] = useState("");
  return (
    <div>
      <textarea className="gp-input text-xs" rows={2} placeholder="Escribe una nota de este proyecto…"
        value={texto} onChange={(e) => setTexto(e.target.value)} />
      <button
        className="gp-btn px-3 py-1.5 text-xs rounded mt-1.5"
        disabled={!texto.trim()}
        style={!texto.trim() ? { opacity: 0.5 } : undefined}
        onClick={() => {
          onEdit(p.id, { notas: [...(p.notas || []), { id: uid(), fecha: todayISO(), texto: texto.trim() }] });
          setTexto("");
        }}
      >Agregar nota</button>
    </div>
  );
}

// Tope de gasto del proyecto. Usa la tabla `presupuestos`, que ya tenía proyecto_id.
function PresupuestoProyectoForm({ proyecto, actual, onGuardar, onCancelar }) {
  const [monto, setMonto] = useState(actual ? String(actual.monto ?? "") : "");
  const [error, setError] = useState("");
  return (
    <div>
      <p className="text-sm gp-text-muted mb-4">
        Cuánto estás dispuesto a gastar en este proyecto. No bloquea nada: sirve para ver en la
        barra cuánto llevas consumido y que no te agarre de sorpresa.
      </p>
      <Field label="Tope de gasto"><MoneyInput value={monto} onChange={setMonto} autoFocus /></Field>
      {error && <p className="text-xs gp-text-red mb-2">{error}</p>}
      <div className="flex gap-2 mt-1">
        <button onClick={onCancelar} className="gp-btn-ghost flex-1 py-2 text-sm">Cancelar</button>
        <button className="gp-btn flex-1 py-2 text-sm" onClick={() => {
          if (!(Number(monto) > 0)) { setError("Captura un monto mayor a cero."); return; }
          onGuardar(Number(monto));
        }}>Guardar</button>
      </div>
    </div>
  );
}

function FichaProyecto({
  p, data, contactosVinculados, miNombre, miAvatarUrl, tab, onTab,
  onCerrar, onEditar, onEdit, onEditTarea, onAddComentario,
  onVincularContacto, onDesvincularContacto, onVerContacto,
  onVerDetalle, onVerTareas, onIrAVista, onNuevaTarea,
  onAddFinanzas, onAddTarea, onGuardarPresupuesto,
  sensibleDesbloqueadoHasta, onDesbloquear,
}) {
  const setTab = onTab;
  // Pestaña Finanzas: qué formulario está abierto y los números del proyecto.
  const [modalFin, setModalFin] = useState(null); // null | ingreso | egreso | responsable | presupuesto
  const fin = finanzasProyecto(data, p.id);
  const reparto = repartoCostosProyecto(data, p.id);
  const categoriasUsadas = [...new Set((data.finanzas || []).map((f) => f.categoria).filter(Boolean))].sort();
  const pagosColaboradores = fin.movs
    .filter((f) => f.categoria === "Pago a colaborador")
    .sort((a, b) => (b.fecha || "").localeCompare(a.fecha || ""));
  const nombreContactoFicha = (id) => (data.contactos || []).find((c) => c.id === id)?.nombre || "";
  const movimientosRecientes = [...fin.movs]
    .sort((a, b) => (b.fecha || "").localeCompare(a.fecha || ""))
    .slice(0, 5);
  const pagosColab = pagosPorColaborador(data, p.id);
  // Los pagos ya registrados de una persona, para colgarles su comprobante.
  const pagosDeColaborador = (contactoId) => fin.movs
    .filter((f) => f.categoria === "Pago a colaborador" && f.contactoId === contactoId)
    .sort((a, b) => (b.fecha || "").localeCompare(a.fecha || ""));
  // Ramas cerradas del árbol de tareas de la pestaña "Tareas" de esta ficha.
  const [colapsadasTareas, setColapsadasTareas] = useState(() => new Set());
  const [confirmacion, setConfirmacion] = useState(null);
  // La ventana de 15 min de los módulos sensibles se vence sola, sin que nada más vuelva a
  // dibujar la pantalla. Este latido hace que el resumen financiero se vuelva a tapar cuando
  // caduca, igual que en el centro de proyecto.
  const [, forceTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => forceTick((t) => t + 1), 15000);
    return () => clearInterval(id);
  }, []);
  const sensibleDesbloqueado = !CANDADO_SENSIBLE_ACTIVO || Date.now() < (sensibleDesbloqueadoHasta || 0);

  const tareas = (data.pendientes || []).filter((t) => t.proyectoId === p.id);
  const tareasAbiertas = tareas.filter((t) => !ESTATUS_TAREA_CERRADOS.includes(t.estatus));
  // El resumen de tareas también respeta la jerarquía padre/hija: una lista plana escondería que
  // media docena de renglones son en realidad subtareas de uno solo.
  const arbolTareas = buildTareaTree(tareas);
  const filasTareas = flattenTareas(arbolTareas, 0, colapsadasTareas);
  const ramasTareas = idsRamasTareas(arbolTareas);
  const toggleRamaFicha = (id) => setColapsadasTareas((prev) => { const st = new Set(prev); st.has(id) ? st.delete(id) : st.add(id); return st; });
  const pedirCompletarTarea = (t) => setConfirmacion(preguntaCompletarTarea({
    tarea: t, data, onEditTarea, onEditProyecto: onEdit, onAviso: (m) => alert(m),
  }));
  // Cambiar el estado del proyecto pasa SIEMPRE por aquí, venga del check o del selector: así
  // completar por cualquiera de los dos caminos registra la fecha, y salir de "Finalizado" la
  // borra (si no, quedaría una fecha de cierre en un proyecto abierto).
  // El estado vive en un borrador y se escribe al dar Guardar. Completar sigue pasando por su
  // confirmación de siempre (fecha, tareas abiertas), así que se delega a cambiarEstatusProyecto.
  const borradorProyecto = useBorrador({ estatus: p.estatus });
  const cambiarEstatusProyecto = (nuevo) => {
    if (nuevo === p.estatus) return;
    if (nuevo === "Finalizado") { setConfirmacion(preguntaCompletarProyecto({ proyecto: p, data, onEditProyecto: onEdit })); return; }
    onEdit(p.id, p.estatus === "Finalizado" ? { estatus: nuevo, completadoEn: null } : { estatus: nuevo });
  };
  const proximas = [...tareasAbiertas]
    .sort((a, b) => (a.fechaLimite || "9999").localeCompare(b.fechaLimite || "9999"))
    .slice(0, 5);
  const avance = avanceProyecto(data, p.id);
  const r = rentabilidadProyecto(data, p.id);
  const archivos = (data.comentarios || [])
    .filter((x) => x.entidadTipo === "proyectos" && x.entidadId === p.id)
    .reduce((n, x) => n + (x.adjuntos || []).length, 0);
  // Actividad = bitácora universal del proyecto (comentarios con texto) + las notas rápidas de
  // avance que ya existían en el campo `notas` del proyecto. Un solo hilo cronológico, no un chat.
  const actividad = [
    ...(data.comentarios || [])
      .filter((x) => x.entidadTipo === "proyectos" && x.entidadId === p.id && (x.texto || "").trim())
      .map((x) => ({ id: x.id, fecha: (x.createdAt || "").slice(0, 10), texto: x.texto })),
    ...(p.notas || []).map((n) => ({ id: n.id, fecha: n.fecha, texto: n.texto })),
  ].sort((a, b) => (b.fecha || "").localeCompare(a.fecha || ""));

  const TABS = [
    { key: "resumen", label: "Resumen" },
    { key: "tareas", label: "Tareas", n: tareas.length },
    { key: "finanzas", label: "Finanzas" },
    { key: "contactos", label: "Contactos", n: contactosVinculados.length },
    { key: "archivos", label: "Archivos", n: archivos },
    { key: "notas", label: "Notas", n: (p.notas || []).length },
  ];

  const responsable = p.responsableContactoId ? (data.contactos || []).find((c) => c.id === p.responsableContactoId) : null;
  const completado = p.estatus === "Finalizado";

  return (
    <div className="gp-panel p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-3 min-w-0">
          <IconoProyecto p={p} size={56} />
          <div className="min-w-0">
            <p className="gp-serif text-lg leading-tight">{p.nombre}</p>
            {p.descripcion && <p className="text-xs gp-text-muted mt-0.5 line-clamp-2">{p.descripcion}</p>}
            <div className="flex items-center gap-1.5 flex-wrap mt-1.5">
              <BadgeEstatusProyecto estatus={p.estatus} />
              {p.contexto && <BadgeContextoProyecto contexto={p.contexto} />}
              {p.categoria && <Badge tone="muted">{p.categoria}</Badge>}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button onClick={onEditar} className="gp-btn-ghost px-2.5 py-1.5 text-xs rounded flex items-center gap-1"><Pencil size={12} /> Editar</button>
          <IconBtn title="Cerrar" onClick={() => { if (confirmarDescartarCambios()) onCerrar(); }}><X size={15} /></IconBtn>
        </div>
      </div>

      {/* Cambiar el estado es la acción más frecuente sobre un proyecto (el pipeline entero vive
          de eso), por eso está aquí arriba y no escondida dentro del formulario. Ya no se guarda
          al soltar el combo: queda en borrador hasta que se da Guardar, y si intentas salir con
          el cambio pendiente la app pregunta antes de perderlo. */}
      <div className="grid grid-cols-2 gap-2 mt-3">
        <select
          className="gp-input text-xs" value={borradorProyecto.borrador.estatus}
          onChange={(e) => borradorProyecto.cambiar({ estatus: e.target.value })}
          aria-label="Cambiar estado del proyecto"
        >
          {ESTATUS_PROYECTO.map((e) => <option key={e} value={e}>{e}</option>)}
        </select>
        <button onClick={() => onVerDetalle(p.id)} className="gp-btn-ghost px-2.5 py-1.5 text-xs rounded flex items-center justify-center gap-1.5">
          <ExternalLink size={12} /> Centro de proyecto
        </button>
      </div>

      <BarraGuardar
        sucio={borradorProyecto.sucio}
        onDescartar={borradorProyecto.descartar}
        onGuardar={() => { cambiarEstatusProyecto(borradorProyecto.borrador.estatus); }}
        etiqueta="Guardar estado"
      />

      {/* Un proyecto se puede dar por terminado aunque le queden tareas abiertas — la confirmación
          avisa cuántas faltan. Y no necesita fecha de fin: los proyectos continuos no la tienen y
          aun así se cierran. Lo que sí queda registrado siempre es CUÁNDO se completó. */}
      <label
        className="flex items-center gap-2 mt-2 px-2.5 py-2 rounded cursor-pointer"
        style={completado ? { background: "var(--hecho-bg)", boxShadow: "inset 4px 0 0 var(--hecho-borde)" } : { background: "var(--panel-2)", boxShadow: "inset 0 0 0 1px var(--border)" }}
      >
        <input
          type="checkbox" checked={completado}
          onChange={(e) => cambiarEstatusProyecto(e.target.checked ? "Finalizado" : "Activo")}
          style={{ width: 16, height: 16, accentColor: "var(--teal)", cursor: "pointer" }}
        />
        <span className="text-xs">
          {completado
            ? <>Proyecto completado{p.completadoEn ? <span className="gp-text-muted"> · {fmtFechaCompletado(p.completadoEn)}</span> : null}</>
            : "Marcar proyecto como completado"}
        </span>
      </label>

      <div className="flex flex-wrap gap-1 mt-4 mb-3">
        {TABS.map((t) => (
          <button
            key={t.key} onClick={() => setTab(t.key)}
            className="text-xs px-2.5 py-1.5 rounded-full whitespace-nowrap shrink-0"
            style={tab === t.key ? { background: "var(--panel-hi)", color: "var(--text)", fontWeight: 600 } : { color: "var(--muted)" }}
          >
            {t.label}{t.n === undefined ? "" : ` ${t.n}`}
          </button>
        ))}
      </div>

      {tab === "resumen" && (
        <>
          <BloqueFicha titulo="Información general" icono={<Info size={14} className="gp-text-gold" />} accion={<button onClick={onEditar} className="text-xs gp-text-gold">Editar</button>}>
            <DatoFicha label="Contexto" icono={<Globe size={12} />} valor={p.contexto ? <BadgeContextoProyecto contexto={p.contexto} /> : null} />
            <DatoFicha label="Categoría" icono={<Tag size={12} />} valor={p.categoria} />
            {p.contexto === "Empresarial" && (
              <DatoFicha
                label="Empresa" icono={<Building2 size={12} />}
                valor={(data.empresas || []).find((e) => e.id === p.empresaId)?.nombre}
              />
            )}
            <DatoFicha label="Estado" icono={<Rocket size={12} />} valor={<BadgeEstatusProyecto estatus={p.estatus} />} />
            <DatoFicha label="Inicio" icono={<CalendarClock size={12} />} valor={fmtFechaCorta(p.fechaInicio)} />
            <DatoFicha
              label="Fin" icono={<CalendarClock size={12} />}
              valor={p.fechaFin
                ? fmtFechaCorta(p.fechaFin)
                : (p.modo === "Continuo" ? <span className="gp-text-muted">Sin fecha (continuo)</span> : null)}
            />
            {completado && (
              <DatoFicha
                label="Completado" icono={<Check size={12} />}
                valor={p.completadoEn
                  ? <span className="gp-text-teal">{fmtFechaCompletado(p.completadoEn)}</span>
                  : <span className="gp-text-muted">sin fecha registrada</span>}
              />
            )}
            <DatoFicha
              label="Responsable" icono={<User size={12} />}
              valor={<span className="inline-flex items-center gap-1.5"><AvatarContacto c={responsable || { nombre: miNombre || "Tú", fotoUrl: miAvatarUrl || "" }} size={20} />{responsable ? responsable.nombre : (miNombre || "Tú")}</span>}
            />
            {p.descripcion && (
              <div className="pt-2 mt-1 border-t gp-border">
                <p className="text-[10px] uppercase tracking-wide gp-text-muted mb-1">Descripción</p>
                <p className="text-xs">{p.descripcion}</p>
              </div>
            )}
          </BloqueFicha>

          <BloqueFicha
            titulo="Progreso del proyecto" icono={<BarChart3 size={14} className="gp-text-gold" />}
            accion={tareas.length > 0 && <button onClick={() => onVerTareas(p.id)} className="text-xs gp-text-gold">Ver todas</button>}
          >
            {avance === null
              ? <VacioFicha>Sin tareas todavía — el progreso se calcula solo cuando el proyecto tiene tareas en el módulo Tareas.</VacioFicha>
              : (
                <>
                  <div className="flex items-center gap-2 mb-3">
                    <div className="h-2 rounded-full flex-1" style={{ background: "var(--border)" }}>
                      <div className="h-2 rounded-full" style={{ width: `${avance}%`, background: avance >= 100 ? "var(--teal)" : avance >= 50 ? "#087CF5" : "var(--gold)" }} />
                    </div>
                    <span className="gp-mono text-sm shrink-0">{avance}%</span>
                  </div>
                  {proximas.length === 0
                    ? <p className="text-xs gp-text-muted">Sin pendientes abiertos — todo lo registrado está cerrado.</p>
                    : (
                      <div className="flex flex-col gap-1.5">
                        <p className="text-[10px] uppercase tracking-wide gp-text-muted">Próximos pendientes</p>
                        {proximas.map((t) => {
                          const vencida = t.fechaLimite && daysUntil(t.fechaLimite) < 0;
                          return (
                            <div key={t.id} className="flex items-center justify-between gap-2">
                              <span className="text-xs truncate">{t.descripcion}</span>
                              <span className="gp-mono text-[10px] shrink-0" style={{ color: vencida ? "var(--red)" : "var(--muted)" }}>{t.fechaLimite || "—"}</span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                </>
              )}
          </BloqueFicha>

          <BloqueFicha
            titulo="Contactos relacionados" icono={<Contact size={14} className="gp-text-gold" />}
            accion={contactosVinculados.length > 0 && <button onClick={() => setTab("contactos")} className="text-xs gp-text-gold">Ver todos ({contactosVinculados.length})</button>}
          >
            {contactosVinculados.length === 0
              ? <VacioFicha>Sin contactos vinculados. Ve a la pestaña Contactos para relacionar personas con este proyecto.</VacioFicha>
              : (
                <div className="flex flex-col gap-2">
                  {contactosVinculados.slice(0, 3).map(({ contacto: c }) => (
                    <button key={c.id} onClick={() => onVerContacto?.(c.id)} className="flex items-center gap-2.5 w-full text-left">
                      <AvatarContacto c={c} size={28} />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium truncate">{c.nombre}</p>
                        <p className="text-[10px] gp-text-muted truncate">{tiposDeContacto(c).join(" · ")}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
          </BloqueFicha>

          <EtiquetasProyecto p={p} onEdit={onEdit} />

          {/* GitHub ya existe como funcionalidad (campos github/githubSubido), así que se muestra
              aquí dentro del detalle y NUNCA en cada fila de la lista (secc. 24). */}
          <BloqueFicha titulo="Repositorio" icono={<Github size={14} className="gp-text-gold" />} accion={<button onClick={onEditar} className="text-xs gp-text-gold">{p.github ? "Cambiar" : "Agregar"}</button>}>
            {p.github
              ? (
                <a href={p.github} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-xs py-1.5 px-2 rounded gp-panel-hi">
                  <Github size={13} className="shrink-0" />
                  <span className="truncate flex-1">{p.github.replace(/^https?:\/\//, "")}</span>
                  <ExternalLink size={12} className="gp-text-muted shrink-0" />
                </a>
              )
              : <VacioFicha>Sin repositorio ligado a este proyecto.</VacioFicha>}
          </BloqueFicha>

          <BloqueFicha titulo="Actividad" icono={<MessageSquare size={14} className="gp-text-gold" />}>
            {actividad.length === 0
              ? <VacioFicha>Sin actividad registrada. Los comentarios y avances que escribas en el centro de proyecto aparecen aquí.</VacioFicha>
              : (
                <div className="flex flex-col gap-2">
                  {actividad.slice(0, 6).map((a) => (
                    <div key={a.id} className="flex gap-2.5">
                      <span className="gp-mono text-[10px] gp-text-muted shrink-0" style={{ width: 62 }}>{fmtFechaCorta(a.fecha) || "—"}</span>
                      <span className="text-xs min-w-0">{a.texto}</span>
                    </div>
                  ))}
                  {actividad.length > 6 && (
                    <button onClick={() => onVerDetalle(p.id)} className="text-xs gp-text-gold text-left">Ver toda la actividad →</button>
                  )}
                </div>
              )}
          </BloqueFicha>
        </>
      )}

      {tab === "tareas" && (
        <BloqueFicha
          titulo="Tareas del proyecto" icono={<ListChecks size={14} className="gp-text-gold" />}
          accion={<button onClick={onNuevaTarea} className="text-xs gp-text-gold flex items-center gap-1"><Plus size={12} /> Agregar tarea</button>}
        >
          <div className="flex items-center justify-between gap-2 mb-2">
            <p className="text-xs gp-text-muted">
              {tareasAbiertas.length} pendiente{tareasAbiertas.length === 1 ? "" : "s"} de {tareas.length} tarea{tareas.length === 1 ? "" : "s"}.
            </p>
            <BotonArbolTareas idsRamas={ramasTareas} colapsadas={colapsadasTareas} onCambiar={setColapsadasTareas} />
          </div>
          {tareas.length === 0
            ? <VacioFicha>Sin tareas todavía. Las tareas viven en el módulo Tareas — aquí solo se resumen las de este proyecto.</VacioFicha>
            : (
              <div className="flex flex-col gap-2">
                {filasTareas.slice(0, 12).map(({ item: t, nivel }) => {
                  const cerrada = ESTATUS_TAREA_CERRADOS.includes(t.estatus);
                  const vencida = !cerrada && t.fechaLimite && daysUntil(t.fechaLimite) < 0;
                  const colapsada = colapsadasTareas.has(t.id);
                  return (
                    <div
                      key={t.id} className="flex items-start justify-between gap-2 rounded-lg"
                      style={cerrada
                        ? { paddingLeft: nivel * 14 + 8, paddingRight: 8, paddingTop: 5, paddingBottom: 5, background: "var(--hecho-bg)", boxShadow: "inset 4px 0 0 var(--hecho-borde)" }
                        : { paddingLeft: nivel * 14 }}
                    >
                      <span className="flex items-start gap-1.5 min-w-0">
                        <CheckTareaHecha tarea={t} size={14} onCompletar={pedirCompletarTarea} onReabrir={(x) => reabrirTarea(x, onEditTarea)} />
                        {nivel > 0 && <span className="gp-text-muted shrink-0 text-xs">└</span>}
                        <ToggleArbolTarea nodo={t} colapsada={colapsada} onToggle={toggleRamaFicha} />
                        <span className={`text-xs min-w-0 ${cerrada ? "gp-texto-hecho" : ""}`} style={cerrada ? { textDecoration: "line-through" } : undefined}>{t.descripcion}</span>
                        <ContadorRamaColapsada nodo={t} colapsada={colapsada} />
                      </span>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {Number(t.precio) > 0 && <span className="gp-mono text-[10px] gp-text-gold">{fmtMoney(t.precio)}</span>}
                        <Badge tone={toneEstatusTarea(t.estatus)}>{t.estatus}</Badge>
                        <span className="gp-mono text-[10px]" style={{ color: vencida ? "var(--red)" : "var(--muted)" }}>{t.fechaLimite || ""}</span>
                      </div>
                    </div>
                  );
                })}
                {filasTareas.length > 12 && <p className="text-[10px] gp-text-muted">y {filasTareas.length - 12} más.</p>}
              </div>
            )}
          <button onClick={() => onVerTareas(p.id)} className="text-xs gp-text-gold mt-3 flex items-center gap-1">Ver todas las tareas <ChevronRight size={12} /></button>
        </BloqueFicha>
      )}

      {tab === "finanzas" && (
        <div>
          <div className="flex items-start justify-between gap-2 mb-3">
            <div className="min-w-0">
              <p className="gp-serif text-base flex items-center gap-1.5"><Wallet size={15} className="gp-text-gold" /> Dinero del proyecto</p>
              <p className="text-[11px] gp-text-muted">Control de ingresos, gastos y pagos del proyecto.</p>
            </div>
            <button onClick={() => setModalFin("elegir")} className="gp-btn px-3 py-1.5 text-xs rounded flex items-center gap-1.5 shrink-0">
              <Plus size={13} /> Agregar movimiento
            </button>
          </div>

          {/* Las dos caras del dinero, cada una con su barra: lo que entra del cliente y lo que
              sale contra el presupuesto. La barra es lo que deja ver de un golpe qué tan avanzado
              va cada lado sin tener que dividir de cabeza. */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3">
            <div className="gp-bloque rounded-xl p-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-xs font-medium">Ingresos del cliente</p>
                  <p className="text-[10px] gp-text-muted">Total del proyecto</p>
                </div>
                <IconBtn title="Registrar un cobro" onClick={() => setModalFin({ tipo: "ingreso", estatus: "Pendiente" })}><Plus size={13} /></IconBtn>
              </div>
              <p className="gp-serif text-xl mt-1.5">{fmtMoney(fin.ingresoTotal)}</p>
              <div className="h-2 rounded-full my-2" style={{ background: "var(--border)" }}>
                <div className="h-2 rounded-full" style={{ width: `${fin.pctCobrado}%`, background: "var(--teal)" }} />
              </div>
              <div className="flex items-start justify-between gap-2 text-[10px]">
                <span className="gp-text-muted">Ya cobrado<br /><span className="gp-mono gp-text-teal text-[11px]">{fmtMoney(fin.cobrado)} ({fin.pctCobrado}%)</span></span>
                <span className="gp-text-muted text-right">Por cobrar<br /><span className="gp-mono text-[11px]">{fmtMoney(fin.porCobrar)} ({fin.pctPorCobrar}%)</span></span>
              </div>
            </div>

            <div className="gp-bloque rounded-xl p-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-xs font-medium">Gastos del proyecto</p>
                  <p className="text-[10px] gp-text-muted">{fin.topeGasto === null ? "Sin presupuesto fijado" : "Presupuesto total"}</p>
                </div>
                <span className="flex items-center shrink-0">
                  <IconBtn title="Registrar un gasto" onClick={() => setModalFin({ tipo: "egreso", estatus: "Cobrado" })}><Plus size={13} /></IconBtn>
                  <IconBtn title={fin.topeGasto === null ? "Poner un tope de gasto" : "Cambiar el tope"} onClick={() => setModalFin("presupuesto")}><Target size={13} /></IconBtn>
                </span>
              </div>
              <p className="gp-serif text-xl mt-1.5">{fin.topeGasto === null ? fmtMoney(fin.gastoReal) : fmtMoney(fin.topeGasto)}</p>
              <div className="h-2 rounded-full my-2" style={{ background: "var(--border)" }}>
                <div className="h-2 rounded-full" style={{
                  width: `${Math.min(100, fin.topeGasto ? Math.round((fin.gastoReal / fin.topeGasto) * 100) : (fin.gastoReal ? 100 : 0))}%`,
                  background: fin.pctPresupuesto > 100 ? "var(--red)" : "var(--red)",
                }} />
              </div>
              <div className="flex items-start justify-between gap-2 text-[10px]">
                <span className="gp-text-muted">Gastado<br /><span className="gp-mono gp-text-red text-[11px]">{fmtMoney(fin.gastoReal)}{fin.pctPresupuesto !== null ? ` (${fin.pctPresupuesto}%)` : ""}</span></span>
                {fin.disponiblePresupuesto !== null && (
                  <span className="gp-text-muted text-right">Disponible<br /><span className="gp-mono text-[11px]">{fmtMoney(fin.disponiblePresupuesto)} ({100 - Math.min(100, fin.pctPresupuesto)}%)</span></span>
                )}
              </div>
            </div>
          </div>

          {/* Resultado: lo que HAY hoy y lo que habrá cuando el cliente termine de pagar. Son dos
              números distintos y mezclarlos es el error clásico — por eso van separados, con la
              suma explícita en medio. */}
          <div className="gp-bloque rounded-xl p-3 mb-3">
            <p className="text-xs font-medium mb-2.5 flex items-center gap-1.5"><BarChart3 size={14} className="gp-text-gold" /> Resultado del proyecto</p>
            <div className="flex flex-col sm:flex-row items-stretch gap-2">
              <div className="flex-1 min-w-0">
                <p className="gp-serif text-xl" style={{ color: fin.disponibleHoy >= 0 ? "var(--teal)" : "var(--red)" }}>{fmtMoney(fin.disponibleHoy)}</p>
                <p className="text-[10px] gp-text-muted mb-1.5">Disponible actualmente</p>
                <div className="flex items-center justify-between text-[11px]"><span className="gp-text-muted">Ingresos cobrados</span><span className="gp-mono gp-text-teal">{fmtMoney(fin.cobrado)}</span></div>
                <div className="flex items-center justify-between text-[11px]"><span className="gp-text-muted">Gastos realizados</span><span className="gp-mono gp-text-red">−{fmtMoney(fin.gastado)}</span></div>
                <div className="flex items-center justify-between text-[11px] pt-1 mt-1 border-t gp-border"><span>= Disponible hoy</span><span className="gp-mono">{fmtMoney(fin.disponibleHoy)}</span></div>
              </div>
              <div className="flex items-center justify-center gp-text-muted px-1"><Plus size={16} /></div>
              <div className="flex-1 min-w-0 text-center rounded-lg p-2" style={{ background: "var(--panel-2)" }}>
                <p className="gp-serif text-lg" style={{ color: "var(--violeta, #8B5CF6)" }}>{fmtMoney(fin.porCobrar)}</p>
                <p className="text-[10px] gp-text-muted">Por cobrar del cliente</p>
                <p className="gp-serif text-xl mt-1.5">{fmtMoney(fin.resultadoProyectado)}</p>
                <p className="text-[10px] gp-text-muted">Resultado proyectado<br />al recibir el pago completo</p>
              </div>
            </div>
          </div>

          {/* Evolución y desglose. Solo se dibujan si hay con qué: una gráfica vacía es ruido. */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-2 mb-3">
            {fin.evolucion.length > 0 && (
              <div className="gp-bloque rounded-xl p-3">
                <p className="text-xs font-medium mb-2">Evolución financiera</p>
                <div style={{ height: 150 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={fin.evolucion} margin={{ top: 4, right: 4, left: -18, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                      <XAxis dataKey="mes" tick={{ fontSize: 9, fill: "var(--muted)" }} tickFormatter={(m) => (m || "").slice(5)} />
                      <YAxis tick={{ fontSize: 9, fill: "var(--muted)" }} tickFormatter={(n) => `${Math.round(n / 1000)}k`} />
                      <Tooltip formatter={(v) => fmtMoney(v)} contentStyle={{ background: "var(--panel)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 11 }} />
                      <Bar dataKey="ingreso" name="Cobrado" fill="#16A36A" radius={[3, 3, 0, 0]} />
                      <Bar dataKey="gasto" name="Gastado" fill="#E5484D" radius={[3, 3, 0, 0]} />
                      <Line type="monotone" dataKey="neto" name="Neto acumulado" stroke="#087CF5" strokeWidth={2} dot={false} connectNulls={false} />
                      {/* Punteada = lo que falta por pasar, colocado en la fecha de cobro o pago
                          que capturaste en cada movimiento pendiente. */}
                      {fin.hayProyeccion && (
                        <Line type="monotone" dataKey="proyeccion" name="Proyección" stroke="#8B5CF6" strokeWidth={2} strokeDasharray="5 4" dot={false} connectNulls />
                      )}
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
                {fin.hayProyeccion && (
                  <p className="text-[9px] gp-text-muted mt-1">
                    La línea punteada es lo que falta por pasar, puesto en la fecha de cobro o de
                    pago que capturaste en cada movimiento pendiente.
                  </p>
                )}
              </div>
            )}

            {fin.desgloseGastos.length > 0 && (
              <div className="gp-bloque rounded-xl p-3">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <p className="text-xs font-medium">Desglose de gastos</p>
                  <button onClick={() => onIrAVista("finanzas")} className="text-[10px] gp-text-gold">Ver detalle</button>
                </div>
                <div className="flex items-center gap-3">
                  <div style={{ width: 96, height: 96 }} className="shrink-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={fin.desgloseGastos} dataKey="monto" nameKey="nombre" innerRadius={28} outerRadius={46} paddingAngle={2}>
                          {fin.desgloseGastos.map((x, i) => <Cell key={x.nombre} fill={COLORES_DESGLOSE[i % COLORES_DESGLOSE.length]} />)}
                        </Pie>
                        <Tooltip formatter={(v) => fmtMoney(v)} contentStyle={{ background: "var(--panel)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 11 }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex-1 min-w-0 flex flex-col gap-1">
                    {fin.desgloseGastos.slice(0, 5).map((x, i) => (
                      <div key={x.nombre} className="flex items-center gap-1.5 text-[11px]">
                        <span className="rounded-full shrink-0" style={{ width: 8, height: 8, background: COLORES_DESGLOSE[i % COLORES_DESGLOSE.length] }} />
                        <span className="truncate flex-1">{x.nombre}</span>
                        <span className="gp-mono shrink-0">{fmtMoney(x.monto)}</span>
                        <span className="gp-text-muted shrink-0" style={{ width: 30, textAlign: "right" }}>{x.pct}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Últimos movimientos y pagos a colaboradores, uno al lado del otro. */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
            <div className="gp-bloque rounded-xl p-3">
              <div className="flex items-center justify-between gap-2 mb-2">
                <p className="text-xs font-medium flex items-center gap-1.5"><ListChecks size={13} className="gp-text-gold" /> Últimos movimientos</p>
                <button onClick={() => onIrAVista("finanzas")} className="text-[10px] gp-text-gold">Ver todos</button>
              </div>
              {movimientosRecientes.length === 0
                ? <p className="text-[11px] gp-text-muted">Todavía no hay movimientos de este proyecto.</p>
                : (
                  <div className="flex flex-col gap-1.5">
                    {movimientosRecientes.map((f) => (
                      <div key={f.id} className="flex items-center justify-between gap-2 text-[11px]">
                        <span className="min-w-0">
                          <span className="block truncate">{f.concepto}</span>
                          <span className="block gp-text-muted">{fmtFechaCorta(f.fecha) || "sin fecha"} · {f.categoria || "sin categoría"}</span>
                        </span>
                        <MontoMovimiento f={f} className="shrink-0" />
                      </div>
                    ))}
                  </div>
                )}
            </div>

            <div className="gp-bloque rounded-xl p-3">
              <div className="flex items-center justify-between gap-2 mb-2">
                <p className="text-xs font-medium flex items-center gap-1.5"><Users size={13} className="gp-text-gold" /> Pagos a colaboradores</p>
                <button onClick={() => setModalFin("responsable")} className="text-[10px] gp-text-gold">Registrar pago</button>
              </div>
              {pagosColab.length === 0
                ? <p className="text-[11px] gp-text-muted">Nadie tiene pagos ni tareas con precio en este proyecto.</p>
                : (
                  <div className="flex flex-col gap-2">
                    {pagosColab.map((x) => (
                      <div key={x.id}>
                        <div className="flex items-center justify-between gap-2 text-[11px]">
                          <span className="truncate flex-1">{x.nombre}</span>
                          <span className="gp-mono gp-text-teal shrink-0">{fmtMoney(x.pagado)}</span>
                          <span className="gp-mono shrink-0" style={{ color: x.porPagar > 0 ? "var(--gold)" : "var(--muted)" }}>{fmtMoney(x.porPagar)}</span>
                          <Badge tone={x.estado === "Pagado" ? "teal" : "gold"}>{x.estado}</Badge>
                        </div>
                        <div className="flex items-center justify-between gap-2 text-[9px] gp-text-muted">
                          <span>pagado · por pagar</span>
                          {x.proximoPago && <span>próximo: {fmtFechaCorta(x.proximoPago)}</span>}
                        </div>
                        {/* El comprobante de cada pago se sube desde aquí: foto de la
                            transferencia o del depósito, con la cámara o desde la galería. */}
                        {(pagosDeColaborador(x.id) || []).map((f) => (
                          <ComprobantePago key={f.id} movimiento={f} data={data} onAddComentario={onAddComentario} />
                        ))}
                      </div>
                    ))}
                  </div>
                )}
            </div>
          </div>

          <div className="flex items-center justify-between gap-2 mt-3">
            <button onClick={() => onIrAVista("finanzas")} className="text-xs gp-text-gold flex items-center gap-1">Ver en Finanzas <ChevronRight size={12} /></button>
            <button
              onClick={() => exportarFilasPDF(
                [...fin.movs].sort((a, b) => (a.fecha || "").localeCompare(b.fecha || "")),
                [
                  { label: "Fecha", get: (f) => f.fecha },
                  { label: "Concepto", get: (f) => f.concepto },
                  { label: "Tipo", get: (f) => f.tipo },
                  { label: "Categoría", get: (f) => f.categoria },
                  { label: "Estatus", get: (f) => f.estatus },
                  { label: "Monto", get: (f) => fmtMoney(montoBaseDe(f)) },
                ],
                `proyecto_${p.nombre}`,
                `Estado financiero — ${p.nombre}`,
                `Total ${fmtMoney(fin.ingresoTotal)} · Cobrado ${fmtMoney(fin.cobrado)} · Gastado ${fmtMoney(fin.gastoReal)} · Disponible hoy ${fmtMoney(fin.disponibleHoy)}`
              )}
              className="text-xs gp-text-muted flex items-center gap-1"
            >
              <Download size={12} /> PDF
            </button>
          </div>

          <p className="text-[10px] gp-text-muted mt-2">
            Todo sale de Finanzas y del precio pactado de las tareas. Lo que capturas aquí se guarda
            allá, ligado a este proyecto: este módulo no almacena ni un importe propio.
          </p>
        </div>
      )}

      {/* Los modales del dinero. Van aquí, hermanos de las pestañas y no dentro de la de
          Finanzas, para que sigan montados aunque se cambie de pestaña con uno abierto. */}
      {modalFin === "elegir" && (
        <Modal title="¿Qué vas a registrar?" onClose={() => setModalFin(null)}>
          <div className="flex flex-col gap-2">
            {[
              { id: { tipo: "ingreso", estatus: "Pendiente" }, icono: <Plus size={15} className="gp-text-teal" />, titulo: "Cobro al cliente", sub: "Lo que te van a pagar por el proyecto, cobrado o por cobrar." },
              { id: { tipo: "egreso", estatus: "Cobrado" }, icono: <Plus size={15} className="gp-text-red" />, titulo: "Gasto del proyecto", sub: "Viáticos, traslados, materiales, software…" },
              { id: "responsable", icono: <Users size={15} className="gp-text-gold" />, titulo: "Pago a un colaborador", sub: "Lo que le entregas a alguien del equipo." },
            ].map((o) => (
              <button key={o.titulo} onClick={() => setModalFin(o.id)}
                className="gp-bloque rounded-lg p-3 text-left flex items-start gap-2.5">
                <span className="mt-0.5 shrink-0">{o.icono}</span>
                <span className="min-w-0">
                  <span className="block text-sm font-medium">{o.titulo}</span>
                  <span className="block text-xs gp-text-muted">{o.sub}</span>
                </span>
              </button>
            ))}
          </div>
        </Modal>
      )}

      {modalFin?.tipo === "ingreso" && (
        <Modal title={modalFin.estatus === "Cobrado" ? "Cobro ya recibido" : "Cobro por recibir"} onClose={() => setModalFin(null)}>
          <MovimientoProyectoForm tipo="Ingreso" proyecto={p} contactos={data.contactos} categoriasUsadas={categoriasUsadas}
            estatusInicial={modalFin.estatus}
            onCancelar={() => setModalFin(null)}
            onGuardar={(mov) => { onAddFinanzas(mov); setModalFin(null); }} />
        </Modal>
      )}
      {modalFin?.tipo === "egreso" && (
        <Modal title="Gasto del proyecto" onClose={() => setModalFin(null)}>
          <MovimientoProyectoForm tipo="Egreso" proyecto={p} contactos={data.contactos} categoriasUsadas={categoriasUsadas}
            estatusInicial={modalFin.estatus}
            onCancelar={() => setModalFin(null)}
            onGuardar={(mov) => { onAddFinanzas(mov); setModalFin(null); }} />
        </Modal>
      )}
      {modalFin === "responsable" && (
        <Modal title="Pago a un colaborador" onClose={() => setModalFin(null)}>
          <PagoResponsableForm proyecto={p} contactos={data.contactos}
            onCancelar={() => setModalFin(null)}
            onGuardar={(mov) => { onAddFinanzas(mov); setModalFin(null); }} />
        </Modal>
      )}
      {modalFin === "presupuesto" && (
        <Modal title="Tope de gasto del proyecto" onClose={() => setModalFin(null)}>
          <PresupuestoProyectoForm proyecto={p} actual={fin.presupuesto}
            onCancelar={() => setModalFin(null)}
            onGuardar={(monto) => { onGuardarPresupuesto(fin.presupuesto, monto); setModalFin(null); }} />
        </Modal>
      )}

      {tab === "notas" && (
        <BloqueFicha titulo="Notas del proyecto" icono={<StickyNote size={14} className="gp-text-gold" />}>
          {/* Las notas ya vivían en el proyecto (campo `notas`) pero solo se veían dentro del
              centro de proyecto, mezcladas con los comentarios. Aquí están en su propia pestaña,
              que es como las pidió el mockup. */}
          <NotaRapidaProyecto p={p} onEdit={onEdit} />
          {(p.notas || []).length === 0
            ? <VacioFicha>Sin notas todavía. Escribe arriba lo que quieras recordar de este proyecto.</VacioFicha>
            : (
              <div className="flex flex-col gap-2 mt-3">
                {[...(p.notas || [])].sort((a, b) => (b.fecha || "").localeCompare(a.fecha || "")).map((n) => (
                  <div key={n.id} className="pb-2 border-b gp-border last:border-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-xs flex-1 min-w-0" style={{ whiteSpace: "pre-line" }}>{n.texto}</p>
                      <IconBtn title="Eliminar" onClick={() => onEdit(p.id, { notas: (p.notas || []).filter((x) => x.id !== n.id) })}><Trash2 size={12} /></IconBtn>
                    </div>
                    <p className="text-[10px] gp-text-muted">{fmtFechaCorta(n.fecha) || ""}</p>
                  </div>
                ))}
              </div>
            )}
        </BloqueFicha>
      )}

      {tab === "contactos" && (
        <BloqueFicha titulo="Contactos relacionados" icono={<Contact size={14} className="gp-text-gold" />}>
          {/* Contacto ↔ Proyecto es muchos-a-muchos (tabla puente contacto_proyectos): el mismo
              contacto puede estar en varios proyectos y el proyecto en varios contactos. Aquí solo
              se crea o se quita el vínculo — la ficha de la persona vive en Contactos. */}
          {contactosVinculados.length === 0
            ? <VacioFicha>Sin contactos vinculados todavía.</VacioFicha>
            : (
              <div className="flex flex-col gap-2 mb-3">
                {contactosVinculados.map(({ contacto: c, vinculoId }) => (
                  <div key={c.id} className="flex items-center gap-2.5">
                    <AvatarContacto c={c} size={30} />
                    <button onClick={() => onVerContacto?.(c.id)} className="min-w-0 flex-1 text-left">
                      <p className="text-xs font-medium truncate">{c.nombre}</p>
                      <p className="text-[10px] gp-text-muted truncate">{tiposDeContacto(c).join(" · ")}{c.empresa ? ` · ${c.empresa}` : ""}</p>
                    </button>
                    <IconBtn title="Quitar del proyecto" onClick={() => onDesvincularContacto(vinculoId)}><X size={13} /></IconBtn>
                  </div>
                ))}
              </div>
            )}
          <p className="text-[10px] uppercase tracking-wide gp-text-muted mb-1.5">Vincular contacto</p>
          <ComboboxMultiBuscar
            seleccionados={[]}
            opciones={(data.contactos || [])
              .filter((c) => !contactosVinculados.some((x) => x.contacto.id === c.id))
              .map((c) => ({ id: c.id, label: c.nombre }))}
            onAgregar={(o) => onVincularContacto(o.id, p.id)}
            onQuitar={() => {}}
            placeholder="Busca a la persona por su nombre…"
          />
        </BloqueFicha>
      )}

      <ConfirmacionModal pregunta={confirmacion} onCerrar={() => setConfirmacion(null)} />

      {tab === "archivos" && (
        <BloqueFicha titulo="Archivos" icono={<FileText size={14} className="gp-text-gold" />}>
          <ArchivosEntidad
            entidadTipo="proyectos" entidadId={p.id} carpeta="proyectos"
            data={data} onAddComentario={onAddComentario}
            vacioTexto="Sin archivos todavía. Sube propuestas, contratos, manuales o lo que necesites tener a la mano de este proyecto."
          />
        </BloqueFicha>
      )}
    </div>
  );
}

// que React lo tratara como un tipo nuevo en cada render y desmontara los campos — el input
// perdería el foco a cada tecla.
function SeccionForm({ titulo, children }) {
  return (
    <div className="mb-4">
      <p className="text-[10px] uppercase tracking-wide gp-text-muted mb-2">{titulo}</p>
      {children}
    </div>
  );
}

// datos secundarios detrás de "Información adicional" para que dar de alta un proyecto no sea un
// formulario gigantesco.
function ProyectoForm({ item, contactos, empresas = [], vinculos, etiquetasExistentes = [], catalogoEtiquetas, onVincularContacto, onDesvincularContacto, onSave }) {
  // El id se decide desde ahora (no al guardar) para poder vincular contactos antes de que el
  // proyecto exista como fila — mismo truco que ya usa ContactoForm.
  const [proyectoId] = useState(() => item.id || uid());
  const [v, setV] = useState({
    ...item,
    contexto: item.contexto || "Personal",
    categoria: item.categoria || "Otro",
    estatus: item.estatus || "Idea",
    responsableContactoId: item.responsableContactoId || "",
    fechaInicio: item.fechaInicio || "",
    fechaFin: item.fechaFin || "",
    etiquetas: item.etiquetas || [],
    imagenUrl: item.imagenUrl || "",
    empresaId: item.empresaId || "",
  });
  const [error, setError] = useState("");
  const [adicionalAbierto, setAdicionalAbierto] = useState(false);

  // Igual que en ContactoForm: si el proyecto YA existe, vincular/desvincular se guarda al
  // momento (esperar al botón Guardar hacía que se perdieran al cerrar con la X); si es nuevo, se
  // acumulan en memoria y se crean al guardar, porque la llave foránea rechazaría una fila que
  // todavía no existe.
  const esNuevo = !item.id;
  const [contactosSeleccionados, setContactosSeleccionados] = useState(() =>
    (vinculos || []).map((vinc) => ({ id: vinc.contactoId, label: contactos.find((c) => c.id === vinc.contactoId)?.nombre || "—" }))
  );
  const agregarContacto = (o) => {
    setContactosSeleccionados((prev) => (prev.some((c) => c.id === o.id) ? prev : [...prev, o]));
    if (!esNuevo) onVincularContacto?.(o.id, proyectoId);
  };
  const quitarContacto = (contactoId) => {
    setContactosSeleccionados((prev) => prev.filter((c) => c.id !== contactoId));
    if (!esNuevo) {
      const vinculo = (vinculos || []).find((vv) => vv.contactoId === contactoId);
      if (vinculo) onDesvincularContacto?.(vinculo.id);
    }
  };


  const guardar = () => {
    if (!v.nombre?.toString().trim()) { setError("El nombre del proyecto es obligatorio."); return; }
    if (v.fechaInicio && v.fechaFin && v.fechaFin < v.fechaInicio) { setError("La fecha de fin no puede ser anterior a la de inicio."); return; }
    setError("");
    onSave({ ...v, id: proyectoId, nombre: v.nombre.trim() });
    if (esNuevo) {
      for (const c of contactosSeleccionados) onVincularContacto?.(c.id, proyectoId);
    }
  };

  return (
    <div>
      <div className="flex flex-col items-center mb-3">
        <AvatarForm
          avatarUrl={v.imagenUrl}
          forma="cuadro"
          textoBoton="Elegir imagen…"
          iconoVacio={<FolderKanban size={32} className="gp-text-muted" />}
          helpText="Imagen del proyecto (opcional). Si no subes una, se dibuja un ícono según su categoría."
          subirAvatar={async (file) => {
            const path = `proyectos/${proyectoId}/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
            const { error: upErr } = await supabase.storage.from("adjuntos").upload(path, file);
            if (upErr) return { error: upErr.message };
            const { data: pub } = supabase.storage.from("adjuntos").getPublicUrl(path);
            setV((prev) => ({ ...prev, imagenUrl: pub.publicUrl }));
            return { url: pub.publicUrl };
          }}
        />
        {v.imagenUrl && (
          <button type="button" onClick={() => setV({ ...v, imagenUrl: "" })} className="text-xs gp-text-muted mt-2">
            Quitar imagen
          </button>
        )}
      </div>
      <SeccionForm titulo="Información básica">
        <Field label="Nombre"><input className="gp-input" autoFocus value={v.nombre || ""} onChange={(e) => setV({ ...v, nombre: e.target.value })} /></Field>
        <Field label="Descripción"><textarea className="gp-input" rows={2} placeholder="En una línea: de qué se trata." value={v.descripcion || ""} onChange={(e) => setV({ ...v, descripcion: e.target.value })} /></Field>
        {/* Un proyecto tiene UN estado, así que va en combo y no en una fila de siete pastillas
            que parecían de selección múltiple (Angel, 1 oct 2026). Es el mismo combo con color
            del filtro de la lista, sin el conteo: aquí no hay nada que contar. El orden sigue
            siendo el del pipeline (Idea → Validación → …), no alfabético. */}
        <Field label="Estado">
          <ComboFiltroColor
            opciones={ESTATUS_PROYECTO.map((e) => ({ id: e, label: etiquetaEstatusProyecto(e), color: COLOR_ESTATUS_PROYECTO[e] }))}
            valor={v.estatus}
            onCambiar={(e) => setV({ ...v, estatus: e })}
          />
        </Field>
        <Field label="Contexto">
          <div className="flex flex-wrap gap-1.5">
            {CONTEXTOS_PROYECTO.map((c) => {
              const color = COLOR_CONTEXTO_PROYECTO[c];
              return (
                <button
                  key={c} type="button" onClick={() => setV({ ...v, contexto: c, empresaId: c === "Empresarial" ? v.empresaId : "" })}
                  className="text-xs px-2.5 py-1 rounded-full border"
                  style={v.contexto === c
                    ? { background: color, color: "#0B2341", borderColor: color, fontWeight: 600 }
                    : { borderColor: "var(--border)", color: "var(--muted)" }}
                >
                  {c}
                </button>
              );
            })}
          </div>
        </Field>
        {/* La empresa solo aplica al contexto Empresarial: un proyecto personal no es de nadie
            más que tuyo, y dejar el campo visible invitaría a llenarlo sin sentido. */}
        {v.contexto === "Empresarial" && (
          <Field label={empresas.length ? "Empresa" : "Empresa"}>
            {empresas.length === 0
              ? <p className="text-xs gp-text-muted">Todavía no registras empresas. Créalas en "Mis empresas" y podrás ligar este proyecto a una.</p>
              : (
                <select className="gp-input" value={v.empresaId || ""} onChange={(e) => setV({ ...v, empresaId: e.target.value })}>
                  <option value="">— sin asignar —</option>
                  {[...empresas].sort((a, b) => (a.nombre || "").localeCompare(b.nombre || "", "es")).map((emp) => <option key={emp.id} value={emp.id}>{emp.nombre}</option>)}
                </select>
              )}
          </Field>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Categoría">
            <select className="gp-input" value={v.categoria} onChange={(e) => setV({ ...v, categoria: e.target.value })}>{CATS.map((c) => <option key={c}>{c}</option>)}</select>
          </Field>
          <Field label="Responsable">
            {/* El responsable es un Contacto real: no se escribe un nombre suelto, se apunta a la
                ficha que ya existe en Contactos. */}
            <select className="gp-input" value={v.responsableContactoId || ""} onChange={(e) => setV({ ...v, responsableContactoId: e.target.value })}>
              <option value="">Tú</option>
              {ordenadosPorNombre(contactos).map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
            </select>
          </Field>
        </div>
      </SeccionForm>

      <SeccionForm titulo="Fechas">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Las tres fechas del proyecto, con el nombre con el que Angel las usa (29 sept 2026).
              Son las columnas que ya existían: fecha_inicio, fecha_revision y fecha_fin — no se
              crean campos nuevos, solo se nombran bien y la de revisión se deja de esconder. */}
          <Field label="Fecha de arranque"><input type="date" className="gp-input" value={v.fechaInicio || ""} onChange={(e) => setV({ ...v, fechaInicio: e.target.value })} /></Field>
          <Field label="Fecha de revisión"><input type="date" className="gp-input" value={v.fechaRevision || ""} onChange={(e) => setV({ ...v, fechaRevision: e.target.value })} /></Field>
          <Field label="Fecha de entrega"><input type="date" className="gp-input" value={v.fechaFin || ""} onChange={(e) => setV({ ...v, fechaFin: e.target.value })} /></Field>
        </div>
      </SeccionForm>

      <SeccionForm titulo="Relaciones">
        <Field label="Contactos relacionados (puede ser varios)">
          <ComboboxMultiBuscar
            seleccionados={contactosSeleccionados}
            opciones={contactos.map((c) => ({ id: c.id, label: c.nombre }))}
            onAgregar={agregarContacto}
            onQuitar={quitarContacto}
            placeholder="Busca a la persona por su nombre…"
          />
        </Field>
      </SeccionForm>

      <button
        type="button" onClick={() => setAdicionalAbierto((x) => !x)}
        className="text-xs gp-text-gold flex items-center gap-1 mb-3"
      >
        {adicionalAbierto ? <ChevronDown size={12} /> : <ChevronRight size={12} />} Información adicional (opcional)
      </button>

      {adicionalAbierto && (
        <SeccionForm titulo="Opcional">
          {/* Mismo combobox que las etiquetas de contactos y los tags de citas: sugiere las ya
              usadas, deja crear una nueva y permite corregirla o quitarla de todos los proyectos.
              Antes era un input suelto que solo respondía a Enter y no sugería nada. */}
          <Field label="Etiquetas">
            <ComboboxMultiBuscar
              seleccionados={(v.etiquetas || []).map((e) => ({ id: e, label: e }))}
              opciones={(etiquetasExistentes || []).map((e) => ({ id: e, label: e }))}
              onAgregar={(o) => setV({ ...v, etiquetas: [...(v.etiquetas || []), o.id] })}
              onQuitar={(id) => setV({ ...v, etiquetas: (v.etiquetas || []).filter((x) => x !== id) })}
              onCrear={(texto) => setV({ ...v, etiquetas: [...(v.etiquetas || []), texto] })}
              onRenombrarOpcion={catalogoEtiquetas?.renombrar}
              onEliminarOpcion={catalogoEtiquetas?.eliminar}
              placeholder="Escribe una etiqueta…"
              crearLabel={(t) => `Crear etiqueta "${t}"`}
            />
          </Field>
          <Field label="Repositorio (opcional)">
            <input className="gp-input" placeholder="https://github.com/…" value={v.github || ""} onChange={(e) => setV({ ...v, github: e.target.value })} />
          </Field>
          <label className="flex items-center gap-2 text-xs gp-text-muted mb-3">
            <input type="checkbox" checked={!!v.githubSubido} onChange={(e) => setV({ ...v, githubSubido: e.target.checked })} />
            Ya está subido a GitHub
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Prioridad">
              <select className="gp-input" value={v.prioridad || "Media"} onChange={(e) => setV({ ...v, prioridad: e.target.value })}>{PRIORIDADES.map((c) => <option key={c}>{c}</option>)}</select>
            </Field>
            <Field label="Fecha de revisión">
              <input type="date" className="gp-input" value={v.fechaRevision || ""} onChange={(e) => setV({ ...v, fechaRevision: e.target.value })} />
            </Field>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Modo">
              <select className="gp-input" value={v.modo || "Finito"} onChange={(e) => setV({ ...v, modo: e.target.value })}>{MODO_PROYECTO.map((c) => <option key={c}>{c}</option>)}</select>
            </Field>
            <Field label="Cómo genera valor">
              <select className="gp-input" value={v.monetizacion || "Dinero"} onChange={(e) => setV({ ...v, monetizacion: e.target.value })}>{MONETIZACION.map((c) => <option key={c}>{c}</option>)}</select>
            </Field>
          </div>
          <p className="text-xs gp-text-muted -mt-2 mb-1">
            {v.modo === "Continuo" ? "Continuo: genera flujo de forma constante (ej. renta, agencia de servicios)." : "Finito: tiene un punto claro de terminado (ej. lanzar un sitio, un show específico)."}
          </p>
        </SeccionForm>
      )}

      {error && <p className="text-xs gp-text-red mb-2">{error}</p>}
      <button className="gp-btn w-full py-2 text-sm mt-2" onClick={guardar}>Guardar</button>
    </div>
  );
}

// con tareas abiertas (a veces se cierra algo dejando pendientes que ya no se van a hacer), pero
// el aviso tiene que decir cuántas quedan para que sea una decisión, no un descuido.
function preguntaCompletarProyecto({ proyecto, data, onEditProyecto }) {
  const abiertas = (data.pendientes || []).filter((t) => t.proyectoId === proyecto.id && !ESTATUS_TAREA_CERRADOS.includes(t.estatus));
  const n = abiertas.length;
  return {
    titulo: "Completar proyecto",
    mensaje: n > 0
      ? `"${proyecto.nombre}" todavía tiene ${n} tarea${n === 1 ? "" : "s"} sin completar.\n\n¿Aun así quieres marcar el proyecto como completado? Las tareas se quedan como están; solo se cierra el proyecto.`
      : `Se va a marcar "${proyecto.nombre}" como completado y se va a guardar la fecha de hoy.`,
    etiqueta: n > 0 ? "Sí, completar de todos modos" : "Sí, completar",
    onConfirmar: () => onEditProyecto(proyecto.id, { estatus: "Finalizado", completadoEn: ahoraISO() }),
  };
}
