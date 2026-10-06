// src/components/modulos/FinanzasMovimientos.jsx
//
// Modulo perezoso (Fase 2). Salio de App.jsx el 5 oct 2026; se mudaron con el sus propias
// piezas (GRUPOS_MOVIMIENTOS, TotalesSeleccion, montoMensualizado, proximoCargoRecurrente), que nadie mas usaba.

import { ArrowDownCircle, ArrowRight, ArrowUpCircle, ChevronLeft, ChevronRight, Download, ListChecks, Pencil, Plus, Search, Trash2, Upload } from "lucide-react";
import { Badge, IconBtn } from "../ui/basicos";
import { CabeceraFinanzas, FinanzaForm, PagoDeudaForm, cifrasFinanzas, rangoFechas, vencimientoDe } from "../comunes/pantallasFinanzas";
import { MONEDA_BASE, dateStr, fmtFechaCorta, fmtMoney, montoBaseDe, todayISO, uid } from "../../lib/formato";
import { Modal } from "../ui/Modal";
import { MontoMovimiento } from "../comunes/finanzas";
import { SelectGuardable } from "../ui/campos";
import { Suspense, useEffect, useState, lazy } from "react";
import { Th } from "../ui/tablas";
import { compararEs, filtrarPorBusqueda, ordenadosPorNombre, ordenarLista } from "../../lib/listas";
import { exportarFilasExcel, exportarFilasPDF } from "../../lib/exportar";
import { paginasVisibles } from "../../lib/paginacion";
// Perezoso dentro del módulo, como en Proyectos y Contactos.
const ImportarExcelModal = lazy(() => import("../import/ImportarExcelModal"));

// direcciones del dinero. En un ingreso se lee "Cobrado" y en un egreso "Pagado" — misma fila en
// la tabla, palabra distinta en la pantalla.
const GRUPOS_MOVIMIENTOS = [
  {
    id: "ingresos",
    label: "Ingresos",
    ayuda: "Dinero que entra",
    icono: ArrowDownCircle,
    color: "var(--teal)",
    tinte: "rgba(22,163,106,.14)",
    base: (f) => f.tipo === "Ingreso",
    etiquetasEstado: { Cobrado: "Cobrado", Pendiente: "Por cobrar", Parcial: "Parcial" },
    subs: [
      { id: "todos", label: "Todos", test: () => true },
      { id: "cobrados", label: "Ya cobrados", test: (f) => f.estatus === "Cobrado" },
      { id: "cobrar", label: "Por cobrar", test: (f) => f.estatus !== "Cobrado", pendiente: true },
    ],
  },
  {
    id: "egresos",
    label: "Egresos",
    ayuda: "Dinero que sale",
    icono: ArrowUpCircle,
    color: "var(--red)",
    tinte: "rgba(229,72,77,.14)",
    base: (f) => f.tipo === "Egreso",
    etiquetasEstado: { Cobrado: "Pagado", Pendiente: "Por pagar", Parcial: "Parcial" },
    subs: [
      { id: "todos", label: "Todos", test: () => true },
      { id: "pagados", label: "Ya pagados", test: (f) => f.estatus === "Cobrado" },
      { id: "pagar", label: "Por pagar", test: (f) => f.estatus !== "Cobrado", pendiente: true },
      // Las deudas son egresos con categoría "Deuda" — las crea así el módulo Deudas. No es otra
      // tabla ni otro concepto: es por dónde entraron.
      { id: "deudas", label: "Deudas", test: (f) => f.categoria === "Deuda" },
    ],
  },
  {
    id: "todos",
    label: "Todos",
    ayuda: "Entra y sale, junto",
    icono: ListChecks,
    color: "var(--gold)",
    tinte: "rgba(212,175,55,.16)",
    base: () => true,
    etiquetasEstado: { Cobrado: "Liquidado", Pendiente: "Pendiente", Parcial: "Parcial" },
    subs: [
      { id: "todos", label: "Todos", test: () => true },
      { id: "liquidados", label: "Ya liquidados", test: (f) => f.estatus === "Cobrado" },
      { id: "pendientes", label: "Pendientes", test: (f) => f.estatus !== "Cobrado", pendiente: true },
    ],
  },
];

// Va pegado arriba de la tabla porque la pregunta "¿y de esto cuánto ya cobré?" aparece justo al
// cambiar de pestaña, no al entrar a la pantalla.
function TotalesSeleccion({ titulo, total, liquidado, pendiente, etiquetaLiquidado, extra }) {
  const pct = total > 0 ? Math.round((liquidado / total) * 100) : 0;
  return (
    <div className="gp-bloque rounded-xl p-3 mb-2 flex flex-wrap items-center gap-x-6 gap-y-2">
      <div>
        <p className="text-[10px] gp-text-muted uppercase" style={{ letterSpacing: ".05em" }}>{titulo}</p>
        <p className="gp-serif text-xl">{fmtMoney(total)}</p>
      </div>
      <div>
        <p className="text-[10px] gp-text-muted uppercase" style={{ letterSpacing: ".05em" }}>{etiquetaLiquidado}</p>
        <p className="gp-serif text-xl gp-text-teal">{fmtMoney(liquidado)}</p>
      </div>
      <div>
        <p className="text-[10px] gp-text-muted uppercase" style={{ letterSpacing: ".05em" }}>Falta</p>
        <p className="gp-serif text-xl" style={{ color: pendiente > 0 ? "var(--gold)" : "var(--muted)" }}>{fmtMoney(pendiente)}</p>
      </div>
      {extra}
      <div className="flex-1 min-w-[140px]">
        <div className="rounded-full overflow-hidden" style={{ height: 6, background: "var(--panel)" }}>
          <div style={{ width: `${pct}%`, height: "100%", background: "var(--teal)" }} />
        </div>
        <p className="text-[10px] gp-text-muted mt-1">{pct}% de lo que estás viendo ya se liquidó</p>
      </div>
    </div>
  );
}

// Desde cualquier renglón pendiente se registra el pago o el cobro, parcial o total, con el mismo
// mecanismo de pagos_finanzas que usa Deudas: un abono hecho aquí es el mismo que se ve allá.
export default function FinanzasMovimientos({ data, onAdd, onEdit, onRemove, onAddPago, foco, onConsumirFoco, onIrAVista, crearAlEntrar, onConsumirCrearAlEntrar }) {
  const [modal, setModal] = useState(null); // { item } | { item, paso: "pagar" }
  const [importarAbierto, setImportarAbierto] = useState(false);
  const [grupoId, setGrupoId] = useState(foco?.grupo || "ingresos");
  const [subId, setSubId] = useState(foco?.sub || "todos");
  // Al entrar directo a lo pendiente el periodo arranca en "Todo": un adeudo de hace tres meses
  // sigue pendiente hoy, y recortarlo por mes lo esconde justo cuando se iba a ver.
  const [rango, setRango] = useState(foco?.sub === "cobrar" || foco?.sub === "pagar" ? "todo" : "mes");
  const [soloRecurrentes, setSoloRecurrentes] = useState(false);
  const [busqueda, setBusqueda] = useState("");
  const [filtroProyecto, setFiltroProyecto] = useState("Todos");
  const [filtroCategoria, setFiltroCategoria] = useState("Todas");
  const [orden, setOrden] = useState("fecha");
  const [ordenDir, setOrdenDir] = useState("desc");
  const [pagina, setPagina] = useState(1);
  const [porPagina, setPorPagina] = useState(100);

  const empty = { concepto: "", tipo: "Ingreso", proyectoId: "", contactoId: "", fecha: todayISO(), fechaVencimiento: "", monto: "", moneda: MONEDA_BASE, tipoCambio: 1, montoBase: "", categoria: "", forma: "Transferencia", estatus: "Cobrado", pautando: false, esRecurrente: false, frecuencia: "Mensual", fechaFin: "" };

  useEffect(() => {
    if (crearAlEntrar) { setModal({ item: { ...empty, ...(crearAlEntrar.preset || {}) } }); onConsumirCrearAlEntrar(); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [crearAlEntrar]);
  // El foco (de dónde venía el usuario) se consume una sola vez: ya quedó en el estado inicial.
  useEffect(() => { if (foco) onConsumirFoco?.(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  const nombreProyecto = (id) => data.proyectos.find((p) => p.id === id)?.nombre || "—";
  const nombreContacto = (id) => data.contactos.find((c) => c.id === id)?.nombre || "—";

  // Saldo real de un movimiento: su monto menos los abonos que ya tiene registrados.
  const yaAbonado = (id) => (data.pagosFinanzas || []).filter((p) => p.finanzasId === id).reduce((s, p) => s + (Number(p.monto) || 0), 0);
  const saldoDe = (f) => Math.max(0, montoBaseDe(f) - yaAbonado(f.id));

  const grupo = GRUPOS_MOVIMIENTOS.find((g) => g.id === grupoId) || GRUPOS_MOVIMIENTOS[0];
  const sub = grupo.subs.find((x) => x.id === subId) || grupo.subs[0];

  const { desde, hasta } = rangoFechas(rango);
  const { enRango } = cifrasFinanzas(data.finanzas, desde, hasta);
  const suma = (lista) => lista.reduce((t, f) => t + montoBaseDe(f), 0);

  // Al cambiar de mundo (ingresos <-> egresos) el estado vuelve a "Todos": "Deudas" no existe en
  // Ingresos, y dejar seleccionado un sub que el grupo nuevo no tiene mostraría una lista vacía
  // sin explicar por qué.
  const elegirGrupo = (g) => { setGrupoId(g.id); setSubId("todos"); setPagina(1); };
  const elegirSub = (x) => {
    setSubId(x.id);
    setPagina(1);
    if (x.pendiente) setRango("todo");
  };

  const delGrupo = enRango.filter(grupo.base);
  const filtrados = delGrupo
    .filter(sub.test)
    .filter((f) => !soloRecurrentes || f.esRecurrente)
    .filter((f) => filtroProyecto === "Todos" || f.proyectoId === filtroProyecto)
    .filter((f) => filtroCategoria === "Todas" || f.categoria === filtroCategoria);
  const buscados = filtrarPorBusqueda(filtrados, busqueda, [
    (f) => f.concepto, (f) => f.categoria, (f) => nombreProyecto(f.proyectoId),
    (f) => nombreContacto(f.contactoId), (f) => f.forma,
  ]);
  const camposOrden = {
    fecha: { get: (f) => f.fecha, tipo: "fecha" },
    vencimiento: { get: (f) => f.fechaVencimiento || f.fecha || "9999-12-31", tipo: "fecha" },
    monto: { get: (f) => montoBaseDe(f), tipo: "numero" },
    concepto: { get: (f) => f.concepto, tipo: "texto" },
  };
  const ordenados = ordenarLista(buscados, orden, camposOrden, ordenDir);
  const totalPaginas = Math.max(1, Math.ceil(ordenados.length / porPagina));
  const paginaActual = Math.min(pagina, totalPaginas);
  const inicio = (paginaActual - 1) * porPagina;
  const enPagina = ordenados.slice(inicio, inicio + porPagina);
  const toggleOrden = (key) => { if (orden === key) setOrdenDir((d) => (d === "asc" ? "desc" : "asc")); else { setOrden(key); setOrdenDir(key === "concepto" || key === "vencimiento" ? "asc" : "desc"); } };

  // --- Totales de lo que está a la vista ---
  const totalSel = suma(buscados);
  // Lo liquidado cuenta los abonos parciales, no solo los movimientos marcados como liquidados: un
  // movimiento de 10,000 con 4,000 abonados aporta 4,000, no 0 ni 10,000.
  const liquidadoSel = buscados.reduce((t, f) => t + (f.estatus === "Cobrado" ? montoBaseDe(f) : yaAbonado(f.id)), 0);
  const etiquetaLiquidado = grupo.id === "ingresos" ? "Ya cobrado" : grupo.id === "egresos" ? "Ya pagado" : "Ya liquidado";
  const mensualSel = soloRecurrentes
    ? buscados.reduce((t, f) => t + montoMensualizado(f) * (f.tipo === "Ingreso" ? 1 : -1), 0)
    : null;

  const verVencimiento = !!sub.pendiente || sub.id === "deudas";
  const verTipo = grupo.id === "todos";
  const categorias = [...new Set(delGrupo.map((f) => f.categoria).filter(Boolean))].sort((a, b) => compararEs(a, b));

  const columnasExport = [
    { label: "Fecha", get: (f) => f.fecha },
    { label: "Tipo", get: (f) => f.tipo },
    { label: "Descripción", get: (f) => f.concepto },
    { label: "Proyecto", get: (f) => (f.proyectoId ? nombreProyecto(f.proyectoId) : "") },
    { label: "Categoría", get: (f) => f.categoria },
    { label: "Cliente / Colaborador", get: (f) => (f.contactoId ? nombreContacto(f.contactoId) : "") },
    { label: "Forma de pago", get: (f) => f.forma },
    { label: "Vence", get: (f) => f.fechaVencimiento || "" },
    { label: "Moneda", get: (f) => f.moneda || MONEDA_BASE },
    { label: "Monto", get: (f) => f.monto },
    { label: `Monto en ${MONEDA_BASE}`, get: (f) => montoBaseDe(f) },
    { label: "Abonado", get: (f) => yaAbonado(f.id) },
    { label: "Falta", get: (f) => saldoDe(f) },
    { label: "Estado", get: (f) => grupo.etiquetasEstado[f.estatus] || f.estatus },
    { label: "Recurrente", get: (f) => (f.esRecurrente ? (f.frecuencia || "Sí") : "") },
    { label: "Próximo cargo", get: (f) => (f.esRecurrente ? (proximoCargoRecurrente(f) || "terminado") : "") },
  ];

  // Un movimiento nuevo arranca del lado en que está parado el usuario: en Egresos no tiene
  // sentido que el formulario abra en Ingreso.
  const nuevo = (preset) => setModal({ item: { ...empty, tipo: grupo.id === "egresos" ? "Egreso" : "Ingreso", ...preset } });

  // Registra un abono (parcial o total) y recalcula el estado: si el saldo llega a cero el
  // movimiento queda liquidado, si queda algo queda Parcial.
  const registrarAbono = async (f, { monto, fecha }) => {
    await onAddPago({ id: uid(), finanzasId: f.id, fecha, monto, comentario: "" });
    const restante = saldoDe(f) - monto;
    onEdit(f.id, { estatus: restante <= 0 ? "Cobrado" : "Parcial" });
    setModal(null);
  };

  return (
    <div>
      <CabeceraFinanzas
        seccion="Movimientos" titulo="Movimientos" icono={<ListChecks size={20} className="gp-text-gold" />}
        subtitulo="Todo el dinero que entra y sale. Elige un lado y, dentro, qué estado quieres ver."
        rango={rango} onRango={(v) => { setRango(v); setPagina(1); }}
        acciones={<>
          <button onClick={() => setImportarAbierto(true)} className="gp-btn-ghost px-3 py-1.5 text-xs rounded flex items-center gap-1.5"><Upload size={13} /> Importar</button>
          <button onClick={() => exportarFilasExcel(ordenados, columnasExport, "movimientos")} className="gp-btn-ghost px-3 py-1.5 text-xs rounded flex items-center gap-1.5"><Download size={13} /> Excel</button>
          <button onClick={() => exportarFilasPDF(ordenados, columnasExport, "movimientos", `${grupo.label} · ${sub.label}`, `${desde || "inicio"} a ${hasta || "hoy"}`)} className="gp-btn-ghost px-3 py-1.5 text-xs rounded flex items-center gap-1.5"><Download size={13} /> PDF</button>
          <button onClick={() => nuevo({})} className="gp-btn px-3 py-1.5 text-sm rounded flex items-center gap-1.5"><Plus size={14} /> Nuevo</button>
        </>}
      />

      {/* NIVEL 1 — de qué lado del dinero estamos */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 mb-2.5">
        {GRUPOS_MOVIMIENTOS.map((g) => {
          const propios = enRango.filter(g.base);
          const activo = g.id === grupoId;
          const Icono = g.icono;
          return (
            <button
              key={g.id} onClick={() => elegirGrupo(g)} aria-pressed={activo}
              className="gp-panel p-3 text-left flex items-center gap-3"
              style={activo
                ? { borderColor: g.color, boxShadow: `inset 0 0 0 1px ${g.color}`, background: g.tinte }
                : undefined}
            >
              <span className="shrink-0 inline-flex items-center justify-center rounded-lg"
                style={{ color: g.color, background: activo ? "var(--panel)" : g.tinte, width: 34, height: 34 }}>
                <Icono size={18} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium">{g.label}</span>
                <span className="block gp-serif text-xl" style={{ color: g.color }}>{fmtMoney(suma(propios))}</span>
                <span className="block text-[10px] gp-text-muted">{g.ayuda} · {propios.length} movimiento{propios.length === 1 ? "" : "s"}</span>
              </span>
            </button>
          );
        })}
      </div>

      {/* NIVEL 2 — qué estado, dentro del lado elegido */}
      <div className="flex items-center gap-1.5 flex-wrap mb-2.5">
        <span className="text-[11px] gp-text-muted mr-0.5">{grupo.label}:</span>
        {grupo.subs.map((x) => {
          const propios = delGrupo.filter(x.test);
          return (
            <button key={x.id} onClick={() => elegirSub(x)}
              title={x.pendiente ? `${x.label} — se muestra sin recortar por periodo` : x.label}
              className={`text-xs px-3 py-1.5 rounded-full border inline-flex items-center gap-1.5 ${subId === x.id ? "gp-btn" : "gp-btn-ghost"}`}>
              {x.label} <span className="gp-mono">{propios.length}</span>
              {propios.length > 0 && <span className="gp-text-muted">{fmtMoney(suma(propios))}</span>}
            </button>
          );
        })}
        {sub.id === "deudas" && (
          <button onClick={() => onIrAVista("deudas")} className="text-[11px] gp-text-gold flex items-center gap-1 ml-1">
            Ver con su historial de abonos <ArrowRight size={11} />
          </button>
        )}
      </div>

      {/* Filtros. No hay filtro de "estado": eso lo decide el renglón de arriba, y tenerlo dos
          veces hacía que una elección contradijera a la otra. */}
      <div className="flex flex-wrap items-center gap-2 mb-2">
        <div className="relative flex-1" style={{ minWidth: 180, maxWidth: 300 }}>
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 gp-text-muted" style={{ pointerEvents: "none" }} />
          <input className="gp-input gp-buscador text-sm" style={{ paddingLeft: 32 }} placeholder="Buscar movimientos…"
            value={busqueda} onChange={(e) => { setBusqueda(e.target.value); setPagina(1); }} />
        </div>
        <select className="gp-input text-xs py-1.5" style={{ width: "auto" }} value={filtroProyecto} onChange={(e) => { setFiltroProyecto(e.target.value); setPagina(1); }} aria-label="Proyecto">
          <option value="Todos">Proyecto: Todos</option>
          {ordenadosPorNombre(data.proyectos).map((pr) => <option key={pr.id} value={pr.id}>{pr.nombre}</option>)}
        </select>
        <select className="gp-input text-xs py-1.5" style={{ width: "auto" }} value={filtroCategoria} onChange={(e) => { setFiltroCategoria(e.target.value); setPagina(1); }} aria-label="Categoría">
          <option value="Todas">Categoría: Todas</option>
          {categorias.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <label className="flex items-center gap-1.5 text-[11px] gp-text-muted cursor-pointer" title="Solo lo que se repite solo: renta, suscripciones, renovaciones">
          <input type="checkbox" checked={soloRecurrentes} onChange={(e) => { setSoloRecurrentes(e.target.checked); setPagina(1); }} />
          Solo recurrentes
        </label>
      </div>

      <TotalesSeleccion
        titulo={`${grupo.label} · ${sub.label} · ${buscados.length} movimiento${buscados.length === 1 ? "" : "s"}`}
        total={totalSel} liquidado={liquidadoSel} pendiente={Math.max(0, totalSel - liquidadoSel)}
        etiquetaLiquidado={etiquetaLiquidado}
        extra={mensualSel !== null ? (
          <div>
            <p className="text-[10px] gp-text-muted uppercase" style={{ letterSpacing: ".05em" }}>Equivale al mes</p>
            <p className="gp-serif text-xl" style={{ color: mensualSel >= 0 ? "var(--teal)" : "var(--red)" }}>{fmtMoney(Math.round(mensualSel))}</p>
          </div>
        ) : null}
      />

      {/* Tabla */}
      <div className="gp-panel overflow-x-auto">
        <table className="gp-table">
          <thead>
            <tr>
              <Th label="Fecha" sortKey="fecha" orden={orden} ordenDir={ordenDir} onToggle={toggleOrden} />
              {verTipo && <th>Tipo</th>}
              <Th label="Descripción" sortKey="concepto" orden={orden} ordenDir={ordenDir} onToggle={toggleOrden} />
              <th className="hidden md:table-cell">Proyecto</th>
              <th className="hidden md:table-cell">Categoría</th>
              <th className="hidden lg:table-cell">{grupo.id === "ingresos" ? "Cliente" : grupo.id === "egresos" ? "A quién" : "Cliente / A quién"}</th>
              {verVencimiento && <Th label="Vence" sortKey="vencimiento" orden={orden} ordenDir={ordenDir} onToggle={toggleOrden} />}
              {verVencimiento && <th>Antigüedad</th>}
              {soloRecurrentes && <th>Frecuencia</th>}
              {soloRecurrentes && <th>Al mes</th>}
              {soloRecurrentes && <th>Próximo</th>}
              {!verVencimiento && !soloRecurrentes && <th className="hidden lg:table-cell">Forma de pago</th>}
              <Th label="Monto" sortKey="monto" orden={orden} ordenDir={ordenDir} onToggle={toggleOrden} />
              <th>Estado</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {enPagina.map((f) => {
              const abonado = yaAbonado(f.id);
              const saldo = saldoDe(f);
              const pendiente = f.estatus !== "Cobrado";
              const v = vencimientoDe(f);
              const esIngreso = f.tipo === "Ingreso";
              return (
                <tr key={f.id}>
                  <td className="gp-mono">{fmtFechaCorta(f.fecha)}</td>
                  {verTipo && (
                    <td>
                      <Badge tone={esIngreso ? "teal" : "red"}>{esIngreso ? "Ingreso" : "Egreso"}</Badge>
                    </td>
                  )}
                  <td style={{ maxWidth: 260 }}><span className="truncate block">{f.concepto}</span></td>
                  <td className="hidden md:table-cell gp-text-gold">{f.proyectoId ? nombreProyecto(f.proyectoId) : "—"}</td>
                  <td className="hidden md:table-cell gp-text-muted">{f.categoria || "—"}</td>
                  <td className="hidden lg:table-cell gp-text-muted">{f.contactoId ? nombreContacto(f.contactoId) : "—"}</td>
                  {verVencimiento && <td className="gp-mono">{v.fecha ? fmtFechaCorta(v.fecha) : "—"}</td>}
                  {verVencimiento && <td><span className="text-xs" style={{ color: v.vencido ? "var(--red)" : "var(--muted)" }}>{v.texto}</span></td>}
                  {soloRecurrentes && <td className="gp-text-muted">{f.frecuencia || "Mensual"}</td>}
                  {soloRecurrentes && <td className="gp-mono" style={{ color: esIngreso ? "var(--teal)" : "var(--red)" }}>{fmtMoney(Math.round(montoMensualizado(f)))}</td>}
                  {soloRecurrentes && (
                    <td className="gp-mono">
                      {proximoCargoRecurrente(f) ? fmtFechaCorta(proximoCargoRecurrente(f)) : <span className="gp-text-muted">terminado</span>}
                    </td>
                  )}
                  {!verVencimiento && !soloRecurrentes && <td className="hidden lg:table-cell gp-text-muted">{f.forma || "—"}</td>}
                  <td>
                    <MontoMovimiento f={f} />
                    {abonado > 0 && pendiente && (
                      <span className="block text-[10px] gp-text-muted">abonado {fmtMoney(abonado)} · falta {fmtMoney(saldo)}</span>
                    )}
                  </td>
                  <td>
                    <SelectGuardable
                      valor={f.estatus || "Pendiente"} opciones={["Cobrado", "Pendiente", "Parcial"]}
                      etiquetas={esIngreso
                        ? { Cobrado: "Cobrado", Pendiente: "Por cobrar", Parcial: "Parcial" }
                        : { Cobrado: "Pagado", Pendiente: "Por pagar", Parcial: "Parcial" }}
                      ariaLabel="Estado del movimiento" onGuardar={(nuevoEstado) => onEdit(f.id, { estatus: nuevoEstado })}
                    />
                  </td>
                  <td>
                    <div className="flex gap-1 items-center">
                      {/* Pago o cobro, parcial o total, sin salir del grid. */}
                      {pendiente && (
                        <button
                          onClick={() => setModal({ item: f, paso: "pagar" })}
                          title={esIngreso ? "Registrar un cobro (parcial o total)" : "Registrar un pago (parcial o total)"}
                          className={`text-xs px-2 py-1 rounded gp-btn-ghost ${esIngreso ? "gp-text-teal" : "gp-text-gold"}`}
                        >
                          {esIngreso ? "Cobrar" : "Pagar"}
                        </button>
                      )}
                      <IconBtn title="Editar" onClick={() => setModal({ item: f })}><Pencil size={13} /></IconBtn>
                      <IconBtn title="Eliminar" onClick={() => onRemove(f.id)}><Trash2 size={13} /></IconBtn>
                    </div>
                  </td>
                </tr>
              );
            })}
            {enPagina.length === 0 && (
              <tr><td colSpan={13} className="text-center gp-text-muted py-8">
                {busqueda || filtroProyecto !== "Todos" || filtroCategoria !== "Todas" || soloRecurrentes
                  ? "Sin resultados con estos filtros."
                  : sub.id === "cobrar" ? "No hay nada por cobrar. "
                  : sub.id === "pagar" ? "No hay nada por pagar. "
                  : sub.id === "deudas" ? "No tienes deudas registradas."
                  : `No hay ${grupo.label.toLowerCase()} en este periodo.`}
              </td></tr>
            )}
          </tbody>
        </table>
      </div>

      {ordenados.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 mt-3 text-xs gp-text-muted">
          <span>Mostrando {inicio + 1}–{Math.min(inicio + porPagina, ordenados.length)} de {ordenados.length} movimiento{ordenados.length === 1 ? "" : "s"}</span>
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-1.5">
              Filas por página
              <select className="gp-input text-xs py-1" style={{ width: "auto" }} value={porPagina} onChange={(e) => { setPorPagina(Number(e.target.value)); setPagina(1); }}>
                {[12, 24, 50, 100, 250].map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
            </label>
            {totalPaginas > 1 && (
              <div className="flex items-center gap-1">
                <button onClick={() => setPagina(Math.max(1, paginaActual - 1))} disabled={paginaActual === 1} className="px-2 py-1 rounded gp-btn-ghost disabled:opacity-40" aria-label="Página anterior"><ChevronLeft size={13} /></button>
                {paginasVisibles(paginaActual, totalPaginas).map((x, i) => (
                  x === "…" ? <span key={`s-${i}`} className="px-1">…</span>
                    : <button key={x} onClick={() => setPagina(x)} className={`px-2.5 py-1 rounded ${x === paginaActual ? "gp-btn" : "gp-btn-ghost"}`}>{x}</button>
                ))}
                <button onClick={() => setPagina(Math.min(totalPaginas, paginaActual + 1))} disabled={paginaActual === totalPaginas} className="px-2 py-1 rounded gp-btn-ghost disabled:opacity-40" aria-label="Página siguiente"><ChevronRight size={13} /></button>
              </div>
            )}
          </div>
        </div>
      )}

      {modal && !modal.paso && (
        <Modal title={modal.item.id ? "Editar movimiento" : "Nuevo movimiento"} onClose={() => setModal(null)}>
          <FinanzaForm item={modal.item} proyectos={data.proyectos} contactos={data.contactos} onSave={(v) => { modal.item.id ? onEdit(modal.item.id, v) : onAdd(v); setModal(null); }} />
        </Modal>
      )}

      {modal && modal.paso === "pagar" && (
        <Modal
          title={`${modal.item.tipo === "Ingreso" ? "Registrar cobro" : "Registrar pago"} — ${modal.item.concepto || ""}`}
          onClose={() => setModal(null)}
        >
          <PagoDeudaForm
            saldoPendiente={saldoDe(modal.item)}
            textoSaldado={modal.item.tipo === "Ingreso" ? "Con este cobro la cuenta queda liquidada." : "Con este pago la cuenta queda liquidada."}
            etiquetaBoton={modal.item.tipo === "Ingreso" ? "Registrar cobro" : "Registrar pago"}
            onPagar={(p) => registrarAbono(modal.item, p)}
          />
        </Modal>
      )}

      {importarAbierto && (
        <Modal title="Importar movimientos desde Excel" onClose={() => setImportarAbierto(false)}>
          <Suspense fallback={<p className="text-sm gp-text-muted">Cargando…</p>}>
            <ImportarExcelModal tipo="finanzas" proyectos={data.proyectos} onImportarFila={(item) => onAdd(item)} onCerrar={() => setImportarAbierto(false)} />
          </Suspense>
        </Modal>
      )}
    </div>
  );
}

// semanas por mes (52/12): sin eso, un pago semanal se vería como si costara cuatro veces al mes
// en los meses de cuatro semanas y cinco en los de cinco.
function montoMensualizado(f) {
  const m = montoBaseDe(f);
  if (f.frecuencia === "Semanal") return m * 4.345;
  if (f.frecuencia === "Quincenal") return m * 2;
  if (f.frecuencia === "Anual") return m / 12;
  return m; // Mensual
}

// Próxima fecha en que toca, avanzando desde la fecha de arranque según la frecuencia. Devuelve
// null si el recurrente ya terminó (tiene fecha fin y quedó atrás).
function proximoCargoRecurrente(f) {
  if (!f.fecha) return null;
  // El "T00:00:00" no es decoración: sin él el navegador lee "2026-01-05" como medianoche UTC,
  // que en México son las 18:00 del día 4, y como setMonth/getDate trabajan en hora local la
  // fecha calculada salía un día ANTES. Se detectó con una prueba de las fechas, no en pantalla.
  const hoy = new Date(todayISO() + "T00:00:00");
  const fin = f.fechaFin ? new Date(String(f.fechaFin).slice(0, 10) + "T00:00:00") : null;
  const d = new Date(String(f.fecha).slice(0, 10) + "T00:00:00");
  let guarda = 0;
  while (d < hoy && guarda < 600) {
    if (f.frecuencia === "Semanal") d.setDate(d.getDate() + 7);
    else if (f.frecuencia === "Quincenal") d.setDate(d.getDate() + 15);
    else if (f.frecuencia === "Anual") d.setFullYear(d.getFullYear() + 1);
    else d.setMonth(d.getMonth() + 1);
    guarda++;
  }
  if (fin && d > fin) return null;
  return dateStr(d);
}
