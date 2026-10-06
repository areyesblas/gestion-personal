// src/components/modulos/FinanzasResumen.jsx
//
// Modulo perezoso (Fase 2). Salio de App.jsx el 5 oct 2026; se mudaron con el sus propias
// piezas (rangoAnterior, TituloBloque), que nadie mas usaba.

import { Activity, ArrowDownCircle, ArrowRight, ArrowUpCircle, Banknote, BarChart3, ChevronRight, HandCoins, PieChartIcon, Plus, Receipt, Sparkles, TrendingDown, TrendingUp, Wallet, Zap } from "lucide-react";
import { Badge } from "../ui/basicos";
import { Bar, CartesianGrid, Cell, ComposedChart, Legend, Line, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { COLORES_DESGLOSE } from "../../lib/catalogos";
import { CabeceraFinanzas, FinanzaForm, TarjetaResumenFin, cifrasFinanzas, rangoFechas, vencimientoDe } from "../comunes/pantallasFinanzas";
import { MONEDA_BASE, dateStr, fmtFechaCorta, fmtMoney, montoBaseDe, todayISO } from "../../lib/formato";
import { Modal } from "../ui/Modal";
import { useEffect, useState } from "react";

// El mismo rango, corrido un periodo hacia atrás: es contra lo que se compara cada tarjeta.
function rangoAnterior(id) {
  const hoy = new Date();
  const a = hoy.getFullYear(), m = hoy.getMonth();
  const iso = (d) => dateStr(d);
  const p = (y, mm) => new Date(y, mm, 1), u = (y, mm) => new Date(y, mm + 1, 0);
  if (id === "mes") return { desde: iso(p(a, m - 1)), hasta: iso(u(a, m - 1)) };
  if (id === "mesAnterior") return { desde: iso(p(a, m - 2)), hasta: iso(u(a, m - 2)) };
  if (id === "trimestre") return { desde: iso(p(a, m - 5)), hasta: iso(u(a, m - 3)) };
  if (id === "anio") return { desde: `${a - 1}-01-01`, hasta: `${a - 1}-12-31` };
  return { desde: "", hasta: "" };
}

// Encabezado de bloque: icono en su color + título. Todas las secciones de Movimientos lo usan,
// para que el ojo distinga una tarjeta de otra sin leer el texto.
function TituloBloque({ icono, color, children, derecha }) {
  return (
    <div className="flex items-center gap-2 mb-2">
      <span className="shrink-0 inline-flex" style={color ? { color } : undefined}>{icono}</span>
      <p className="text-xs font-medium flex-1 min-w-0 truncate">{children}</p>
      {derecha}
    </div>
  );
}

// se movieron, en qué se fue el dinero y qué falta cobrar o pagar. Sin tabla: para la lista están
// Movimientos y los demás hijos, y a cada uno se llega desde aquí.
export default function FinanzasResumen({ data, onAdd, onEdit, onVerMovimientos, crearAlEntrar, onConsumirCrearAlEntrar }) {
  const [modal, setModal] = useState(null);
  const [rango, setRango] = useState("mes");

  const empty = { concepto: "", tipo: "Ingreso", proyectoId: "", contactoId: "", fecha: todayISO(), fechaVencimiento: "", monto: "", moneda: MONEDA_BASE, tipoCambio: 1, montoBase: "", categoria: "", forma: "Transferencia", estatus: "Cobrado", pautando: false, esRecurrente: false, frecuencia: "Mensual", fechaFin: "" };
  useEffect(() => {
    if (crearAlEntrar) { setModal({ item: { ...empty, ...(crearAlEntrar.preset || {}) } }); onConsumirCrearAlEntrar(); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [crearAlEntrar]);

  const nombreContacto = (id) => data.contactos.find((c) => c.id === id)?.nombre || "—";
  const { desde, hasta } = rangoFechas(rango);
  const c = cifrasFinanzas(data.finanzas, desde, hasta);
  const anterior = rangoAnterior(rango);
  const previo = cifrasFinanzas(data.finanzas, anterior.desde, anterior.hasta);
  const variacion = (ahora, antes) => (antes > 0 ? Math.round(((ahora - antes) / antes) * 100) : null);

  // Gráfica: ingresos y egresos por día, con el saldo acumulado encima.
  const porDia = {};
  c.enRango.forEach((f) => {
    const d = (f.fecha || "").slice(0, 10);
    if (!d) return;
    if (!porDia[d]) porDia[d] = { dia: d, ingreso: 0, egreso: 0 };
    if (f.estatus !== "Cobrado") return;
    if (f.tipo === "Ingreso") porDia[d].ingreso += montoBaseDe(f); else porDia[d].egreso += montoBaseDe(f);
  });
  let acum = 0;
  const evolucion = Object.values(porDia).sort((a, b) => a.dia.localeCompare(b.dia)).map((d) => {
    acum += d.ingreso - d.egreso;
    return { ...d, saldo: acum, etiqueta: fmtFechaCorta(d.dia).slice(0, 6) };
  });

  const porCategoria = {};
  c.egresos.forEach((f) => {
    const k = (f.categoria || "").trim() || "Otros";
    porCategoria[k] = (porCategoria[k] || 0) + montoBaseDe(f);
  });
  const desglose = Object.entries(porCategoria)
    .map(([nombre, monto]) => ({ nombre, monto, pct: c.egresosTotal ? Math.round((monto / c.egresosTotal) * 100) : 0 }))
    .sort((a, b) => b.monto - a.monto);

  // Lo pendiente NO se filtra por periodo: un cobro de hace tres meses sigue pendiente hoy, y
  // esconderlo porque no cae en el mes elegido sería justo lo contrario de lo que sirve aquí.
  const cobrosPendientes = (data.finanzas || [])
    .filter((f) => f.tipo === "Ingreso" && f.estatus !== "Cobrado")
    .sort((a, b) => (a.fechaVencimiento || a.fecha || "9999").localeCompare(b.fechaVencimiento || b.fecha || "9999"));
  const pagosPendientes = (data.finanzas || [])
    .filter((f) => f.tipo === "Egreso" && f.estatus !== "Cobrado")
    .sort((a, b) => (a.fechaVencimiento || a.fecha || "9999").localeCompare(b.fechaVencimiento || b.fecha || "9999"));
  const totalPendiente = (lista) => lista.reduce((t, f) => t + montoBaseDe(f), 0);

  const nuevo = (preset) => setModal({ item: { ...empty, ...preset } });
  const ACCIONES = [
    { titulo: "Cobro del cliente", sub: "Registra un ingreso", icono: <Banknote size={16} className="gp-text-teal" />, tinte: "rgba(22,163,106,.14)", preset: { tipo: "Ingreso", categoria: "Proyectos", estatus: "Pendiente" } },
    { titulo: "Gasto del proyecto", sub: "Viáticos, materiales, servicios…", icono: <Receipt size={16} className="gp-text-red" />, tinte: "rgba(229,72,77,.14)", preset: { tipo: "Egreso", categoria: "Viáticos" } },
    { titulo: "Pago a colaborador", sub: "Registra un pago", icono: <HandCoins size={16} className="gp-text-gold" />, tinte: "rgba(212,175,55,.16)", preset: { tipo: "Egreso", categoria: "Pago a colaborador" } },
  ];

  return (
    <div>
      <CabeceraFinanzas
        seccion="Resumen" titulo="Resumen" icono={<BarChart3 size={20} className="gp-text-gold" />}
        subtitulo="Cómo vas en el periodo: lo que entró, lo que salió y lo que falta."
        rango={rango} onRango={setRango}
        acciones={<button onClick={() => nuevo({})} className="gp-btn px-3 py-1.5 text-sm rounded flex items-center gap-1.5"><Plus size={14} /> Nuevo movimiento</button>}
      />

      <div className="flex flex-col xl:flex-row gap-3 items-start">
        <div className="min-w-0 flex-1 w-full">
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-2.5 mb-3">
            <TarjetaResumenFin
              etiqueta="Ingresos totales" valor={c.ingresosTotal} color="var(--teal)" tinte="rgba(22,163,106,.14)" icono={<TrendingUp size={16} />}
              variacion={variacion(c.ingresosTotal, previo.ingresosTotal)}
              filas={[
                { label: "De clientes", valor: c.ingresosDeCliente },
                { label: "Otros ingresos", valor: c.ingresosTotal - c.ingresosDeCliente },
              ]}
            />
            <TarjetaResumenFin
              etiqueta="Egresos totales" valor={c.egresosTotal} color="var(--red)" tinte="rgba(229,72,77,.14)" icono={<TrendingDown size={16} />}
              variacion={variacion(c.egresosTotal, previo.egresosTotal)}
              filas={[
                { label: "Proyectos", valor: c.egresosProyecto },
                { label: "Colaboradores", valor: c.egresosColaboradores },
                { label: "Gastos generales", valor: c.egresosGenerales },
              ]}
            />
            <TarjetaResumenFin
              etiqueta="Saldo del periodo" valor={c.enCuentas} color={c.enCuentas >= 0 ? "#087CF5" : "var(--red)"}
              tinte={c.enCuentas >= 0 ? "rgba(8,124,245,.14)" : "rgba(229,72,77,.14)"} icono={<Wallet size={16} />}
              variacion={null}
              filas={[
                { label: "Ya liquidado", valor: c.enCuentas },
                { label: "Por cobrar", valor: c.porCobrar, color: "var(--teal)" },
                { label: "Por pagar", valor: c.porPagar, color: "var(--red)" },
              ]}
            />
            <TarjetaResumenFin
              destacada etiqueta="Resultado proyectado" valor={c.proyectado} color="var(--violeta, #8B5CF6)" tinte="rgba(139,92,246,.16)" icono={<Sparkles size={16} />}
              variacion={null}
              filas={[
                { label: "Saldo del periodo", valor: c.enCuentas },
                { label: "+ Por cobrar", valor: c.porCobrar, color: "var(--teal)" },
                { label: "− Por pagar", valor: c.porPagar, color: "var(--red)" },
              ]}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-2.5">
            {evolucion.length > 0 && (
              <div className="gp-panel p-3.5">
                <TituloBloque icono={<Activity size={15} />} color="#087CF5">Evolución de movimientos</TituloBloque>
                <div style={{ height: 180 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={evolucion} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                      <XAxis dataKey="etiqueta" tick={{ fontSize: 9, fill: "var(--muted)" }} />
                      <YAxis tick={{ fontSize: 9, fill: "var(--muted)" }} tickFormatter={(n) => `${Math.round(n / 1000)}k`} />
                      <Tooltip formatter={(v) => fmtMoney(v)} contentStyle={{ background: "var(--panel)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 11 }} />
                      <Legend wrapperStyle={{ fontSize: 10 }} />
                      <Bar dataKey="ingreso" name="Ingresos" fill="#16A36A" radius={[3, 3, 0, 0]} />
                      <Bar dataKey="egreso" name="Egresos" fill="#E5484D" radius={[3, 3, 0, 0]} />
                      <Line type="monotone" dataKey="saldo" name="Saldo acumulado" stroke="#087CF5" strokeWidth={2} dot={false} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {desglose.length > 0 && (
              <div className="gp-panel p-3.5">
                <TituloBloque
                  icono={<PieChartIcon size={15} />} color="var(--red)"
                  derecha={<button onClick={() => onVerMovimientos("egresos", "todos")} className="text-[10px] gp-text-gold shrink-0">Ver detalle</button>}
                >
                  Egresos por categoría
                </TituloBloque>
                <div className="flex items-center gap-3">
                  <div style={{ width: 120, height: 120 }} className="shrink-0 relative">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={desglose} dataKey="monto" nameKey="nombre" innerRadius={36} outerRadius={56} paddingAngle={2}>
                          {desglose.map((x, i) => <Cell key={x.nombre} fill={COLORES_DESGLOSE[i % COLORES_DESGLOSE.length]} />)}
                        </Pie>
                        <Tooltip formatter={(v) => fmtMoney(v)} contentStyle={{ background: "var(--panel)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 11 }} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                      <span className="gp-mono text-xs">{fmtMoney(c.egresosTotal)}</span>
                      <span className="text-[9px] gp-text-muted">Total</span>
                    </div>
                  </div>
                  <div className="flex-1 min-w-0 flex flex-col gap-1">
                    {desglose.slice(0, 6).map((x, i) => (
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

          {evolucion.length === 0 && desglose.length === 0 && (
            <div className="gp-panel p-8 text-center">
              <p className="text-sm gp-text-muted">No hay movimientos en este periodo.</p>
              <button onClick={() => nuevo({})} className="gp-btn px-3 py-1.5 text-sm rounded mt-3 inline-flex items-center gap-1.5"><Plus size={14} /> Registrar el primero</button>
            </div>
          )}
        </div>

        {/* Columna derecha: lo que hay que hacer. Cada bloque lleva a su propio hijo. */}
        <div className="w-full xl:w-[300px] shrink-0 flex flex-col gap-2.5">
          <div className="gp-panel p-3.5">
            <TituloBloque icono={<Zap size={15} />} color="var(--gold)">Acciones rápidas</TituloBloque>
            <div className="flex flex-col gap-1.5">
              {ACCIONES.map((a) => (
                <button key={a.titulo} onClick={() => nuevo(a.preset)} className="gp-bloque rounded-lg p-2.5 text-left flex items-center gap-2.5">
                  <span className="shrink-0 inline-flex items-center justify-center rounded-lg" style={{ background: a.tinte, width: 30, height: 30 }}>{a.icono}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-xs font-medium">{a.titulo}</span>
                    <span className="block text-[10px] gp-text-muted">{a.sub}</span>
                  </span>
                  <ChevronRight size={13} className="gp-text-muted shrink-0" />
                </button>
              ))}
            </div>
          </div>

          <div className="gp-panel p-3.5">
            <TituloBloque
              icono={<ArrowDownCircle size={15} />} color="var(--teal)"
              derecha={cobrosPendientes.length > 0 ? <Badge tone="teal">{cobrosPendientes.length}</Badge> : null}
            >
              Cobros pendientes
            </TituloBloque>
            {cobrosPendientes.length === 0
              ? <p className="text-[11px] gp-text-muted">Nada por cobrar.</p>
              : (
                <>
                  <p className="gp-serif text-lg gp-text-teal mb-1.5">{fmtMoney(totalPendiente(cobrosPendientes))}</p>
                  <div className="flex flex-col gap-1.5">
                    {cobrosPendientes.slice(0, 5).map((f) => {
                      const v = vencimientoDe(f);
                      return (
                        <button key={f.id} onClick={() => setModal({ item: f })} className="flex items-start justify-between gap-2 text-[11px] text-left">
                          <span className="min-w-0">
                            <span className="block truncate">{f.contactoId ? nombreContacto(f.contactoId) : f.concepto}</span>
                            <span className="block" style={{ color: v.vencido ? "var(--red)" : "var(--muted)" }}>{v.texto}</span>
                          </span>
                          <span className="gp-mono gp-text-teal shrink-0">{fmtMoney(montoBaseDe(f))}</span>
                        </button>
                      );
                    })}
                  </div>
                  <button onClick={() => onVerMovimientos("ingresos", "cobrar")} className="text-[10px] gp-text-gold mt-2 flex items-center gap-1">
                    Ver los {cobrosPendientes.length} <ArrowRight size={10} />
                  </button>
                </>
              )}
          </div>

          <div className="gp-panel p-3.5">
            <TituloBloque
              icono={<ArrowUpCircle size={15} />} color="var(--red)"
              derecha={pagosPendientes.length > 0 ? <Badge tone="red">{pagosPendientes.length}</Badge> : null}
            >
              Pagos pendientes
            </TituloBloque>
            {pagosPendientes.length === 0
              ? <p className="text-[11px] gp-text-muted">Nada por pagar.</p>
              : (
                <>
                  <p className="gp-serif text-lg gp-text-red mb-1.5">{fmtMoney(totalPendiente(pagosPendientes))}</p>
                  <div className="flex flex-col gap-1.5">
                    {pagosPendientes.slice(0, 5).map((f) => {
                      const v = vencimientoDe(f);
                      return (
                        <button key={f.id} onClick={() => setModal({ item: f })} className="flex items-start justify-between gap-2 text-[11px] text-left">
                          <span className="min-w-0">
                            <span className="block truncate">{f.contactoId ? nombreContacto(f.contactoId) : f.concepto}</span>
                            <span className="block" style={{ color: v.vencido ? "var(--red)" : "var(--muted)" }}>{v.texto}</span>
                          </span>
                          <span className="gp-mono gp-text-red shrink-0">{fmtMoney(montoBaseDe(f))}</span>
                        </button>
                      );
                    })}
                  </div>
                  <button onClick={() => onVerMovimientos("egresos", "pagar")} className="text-[10px] gp-text-gold mt-2 flex items-center gap-1">
                    Ver los {pagosPendientes.length} <ArrowRight size={10} />
                  </button>
                </>
              )}
          </div>
        </div>
      </div>

      {modal && (
        <Modal title={modal.item.id ? "Editar movimiento" : "Nuevo movimiento"} onClose={() => setModal(null)}>
          <FinanzaForm item={modal.item} proyectos={data.proyectos} contactos={data.contactos} onSave={(v) => { modal.item.id ? onEdit(modal.item.id, v) : onAdd(v); setModal(null); }} />
        </Modal>
      )}
    </div>
  );
}
