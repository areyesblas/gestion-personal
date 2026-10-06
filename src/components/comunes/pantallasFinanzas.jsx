import { CamposMoneda } from "../comunes/finanzas";
import { FORMA_PAGO, FRECUENCIA , TIPO_FIN} from "../../lib/catalogos";
import { Field } from "../ui/basicos";
import { MONEDA_BASE, dateStr, daysUntil, fmtMoney, montoBaseDe, todayISO } from "../../lib/formato";
import { MoneyInput } from "../ui/campos";
import { ordenadosPorNombre } from "../../lib/listas";
import { useState } from "react";

// los demás hijos reusan las que les toquen en su propio encabezado. Cualquier cambio en cómo se
// calcula el dinero se hace aquí y los siete quedan consistentes.
export function cifrasFinanzas(finanzas, desde, hasta) {
  const dentro = (f) => (!desde || (f.fecha || "") >= desde) && (!hasta || (f.fecha || "") <= hasta);
  const enRango = (finanzas || []).filter(dentro);
  const suma = (lista) => lista.reduce((t, f) => t + montoBaseDe(f), 0);

  const ingresos = enRango.filter((f) => f.tipo === "Ingreso");
  const egresos = enRango.filter((f) => f.tipo === "Egreso");
  const ingresosTotal = suma(ingresos);
  const egresosTotal = suma(egresos);
  const egresosColaboradores = suma(egresos.filter((f) => f.categoria === "Pago a colaborador"));
  const egresosProyecto = suma(egresos.filter((f) => f.proyectoId && f.categoria !== "Pago a colaborador"));

  // El saldo son los movimientos ya liquidados; lo pendiente va aparte, en el proyectado.
  const enCuentas = suma(ingresos.filter((f) => f.estatus === "Cobrado")) - suma(egresos.filter((f) => f.estatus === "Cobrado"));
  const porCobrar = suma(ingresos.filter((f) => f.estatus !== "Cobrado"));
  const porPagar = suma(egresos.filter((f) => f.estatus !== "Cobrado"));

  return {
    enRango, ingresos, egresos, suma,
    ingresosTotal, egresosTotal,
    ingresosDeCliente: suma(ingresos.filter((f) => f.contactoId)),
    egresosColaboradores, egresosProyecto,
    egresosGenerales: egresosTotal - egresosColaboradores - egresosProyecto,
    enCuentas, porCobrar, porPagar,
    proyectado: enCuentas + porCobrar - porPagar,
  };
}

// de periodo y los botones de la derecha. Está aquí para que los siete se vean como el mismo
// módulo y no como siete pantallas que alguien pegó una junto a otra.
export function CabeceraFinanzas({ seccion, titulo, icono, subtitulo, rango, onRango, acciones }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
      <div className="min-w-0">
        <p className="text-[11px] gp-text-muted">Finanzas · {seccion}</p>
        <h2 className="gp-serif text-2xl flex items-center gap-2">{icono} {titulo}</h2>
        {subtitulo && <p className="text-sm gp-text-muted">{subtitulo}</p>}
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        {onRango && (
          <select className="gp-input text-xs py-1.5" style={{ width: "auto" }} value={rango} onChange={(e) => onRango(e.target.value)} aria-label="Periodo">
            {RANGOS_MOVIMIENTOS.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}
          </select>
        )}
        {acciones}
      </div>
    </div>
  );
}

// Días de atraso (positivo) o que faltan (negativo) para una fecha de vencimiento, con su texto
// ya resuelto. Lo usan Por cobrar y Por pagar, que son las dos pantallas donde el atraso importa.
export function vencimientoDe(f) {
  const fecha = f.fechaVencimiento || f.fecha || "";
  if (!fecha) return { fecha: "", dias: null, texto: "Sin fecha", vencido: false };
  const dias = -daysUntil(fecha);
  if (dias > 0) return { fecha, dias, texto: `${dias} día${dias === 1 ? "" : "s"} de atraso`, vencido: true };
  if (dias === 0) return { fecha, dias, texto: "Vence hoy", vencido: true };
  return { fecha, dias, texto: `Faltan ${-dias} día${dias === -1 ? "" : "s"}`, vencido: false };
}

// Rangos de fecha del encabezado de Movimientos. "Este mes" es el de siempre; los demás están
// para revisar un periodo cerrado sin tener que filtrar a mano.
export const RANGOS_MOVIMIENTOS = [
  { id: "mes", label: "Este mes" },
  { id: "mesAnterior", label: "Mes anterior" },
  { id: "trimestre", label: "Últimos 3 meses" },
  { id: "anio", label: "Este año" },
  { id: "todo", label: "Todo" },
];

export function rangoFechas(id) {
  const hoy = new Date();
  const iso = (d) => dateStr(d);
  const primeroDeMes = (a, m) => new Date(a, m, 1);
  const ultimoDeMes = (a, m) => new Date(a, m + 1, 0);
  const a = hoy.getFullYear(), m = hoy.getMonth();
  if (id === "mesAnterior") return { desde: iso(primeroDeMes(a, m - 1)), hasta: iso(ultimoDeMes(a, m - 1)) };
  if (id === "trimestre") return { desde: iso(primeroDeMes(a, m - 2)), hasta: iso(ultimoDeMes(a, m)) };
  if (id === "anio") return { desde: `${a}-01-01`, hasta: `${a}-12-31` };
  if (id === "todo") return { desde: "", hasta: "" };
  return { desde: iso(primeroDeMes(a, m)), hasta: iso(ultimoDeMes(a, m)) };
}

// rojo del egreso): el tinte se pasa explícito en lugar de calcularlo con color-mix, que no todos
// los navegadores del iPhone soportan todavía.
export function TarjetaResumenFin({ etiqueta, valor, color, tinte, icono, variacion, filas, destacada }) {
  return (
    <div className={destacada ? "gp-bloque rounded-xl p-3.5" : "gp-panel p-3.5"} style={destacada ? { borderLeft: "3px solid var(--violeta, #8B5CF6)" } : undefined}>
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-medium">{etiqueta}</p>
        <span
          className="shrink-0 inline-flex items-center justify-center rounded-lg"
          style={{ color, background: tinte || "var(--panel-2)", width: 30, height: 30 }}
        >
          {icono}
        </span>
      </div>
      <p className="gp-serif text-2xl mt-1" style={{ color }}>{fmtMoney(valor)}</p>
      {variacion !== null && variacion !== undefined && (
        <p className="text-[11px] mt-0.5" style={{ color: variacion >= 0 ? "var(--teal)" : "var(--red)" }}>
          {variacion >= 0 ? "↑" : "↓"} {Math.abs(variacion)}% vs. periodo anterior
        </p>
      )}
      {filas?.length > 0 && (
        <div className="flex flex-col gap-0.5 mt-2.5 pt-2.5 border-t gp-border">
          {filas.map((f) => (
            <div key={f.label} className="flex items-center justify-between gap-2 text-[11px]">
              <span className="gp-text-muted truncate">{f.label}</span>
              <span className="gp-mono shrink-0" style={f.color ? { color: f.color } : undefined}>{fmtMoney(f.valor)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function FinanzaForm({ item, proyectos, contactos, onSave }) {
  const [v, setV] = useState(item);
  const [error, setError] = useState("");
  return (
    <div>
      <Field label="Concepto"><input className="gp-input" placeholder="ej. Claude, PlanetFitness, Renta Xochinahuac" value={v.concepto || ""} onChange={(e) => setV({ ...v, concepto: e.target.value })} /></Field>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="Tipo"><select className="gp-input" value={v.tipo} onChange={(e) => setV({ ...v, tipo: e.target.value })}>{TIPO_FIN.map((c) => <option key={c}>{c}</option>)}</select></Field>
        {v.esRecurrente ? (
          <Field label="Día del mes en que se cobra">
            <input
              type="number" min="1" max="31" className="gp-input"
              value={v.fecha ? Number(v.fecha.slice(8, 10)) : ""}
              onChange={(e) => {
                const dia = Math.min(31, Math.max(1, Number(e.target.value) || 1));
                setV({ ...v, fecha: `${todayISO().slice(0, 7)}-${String(dia).padStart(2, "0")}` });
              }}
            />
          </Field>
        ) : (
          <Field label="Fecha"><input type="date" className="gp-input" value={v.fecha} onChange={(e) => setV({ ...v, fecha: e.target.value })} /></Field>
        )}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="Proyecto">
          <select className="gp-input" value={v.proyectoId} onChange={(e) => setV({ ...v, proyectoId: e.target.value })}>
            <option value="">— sin proyecto —</option>
            {ordenadosPorNombre(proyectos).map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
          </select>
        </Field>
        <Field label="Cliente (quién pagó)">
          <select className="gp-input" value={v.contactoId || ""} onChange={(e) => setV({ ...v, contactoId: e.target.value })}>
            <option value="">— sin cliente —</option>
            {ordenadosPorNombre(contactos).map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
          </select>
        </Field>
      </div>
      <Field label="Categoría"><input className="gp-input" value={v.categoria} onChange={(e) => setV({ ...v, categoria: e.target.value })} placeholder="ej. hosting, venta, renta" /></Field>
      <CamposMoneda
        monto={v.monto} moneda={v.moneda || MONEDA_BASE} tipoCambio={v.tipoCambio ?? 1} fecha={v.fecha}
        onCambiar={(parche) => setV((prev) => ({ ...prev, ...parche }))}
      />
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


      <button className="gp-btn w-full py-2 text-sm mt-1" onClick={() => {
        if (!v.concepto?.toString().trim()) { setError("El concepto es obligatorio."); return; }
        setError("");
        // El monto base se congela al guardar: monto × tipo de cambio de ese día. Es el número
        // con el que suma toda la app, y no se vuelve a recalcular aunque el tipo cambie.
        const tc = Number(v.tipoCambio) || 1;
        onSave({ ...v, moneda: v.moneda || MONEDA_BASE, tipoCambio: tc, montoBase: (Number(v.monto) || 0) * tc });
      }}>Guardar</button>
    </div>
  );
}

// Sirve para los dos lados del dinero: registrar un pago en Por pagar y registrar un cobro en Por
// cobrar. Solo cambian los textos, porque el mecanismo es el mismo (un abono en pagos_finanzas).
export function PagoDeudaForm({ saldoPendiente, onPagar, textoSaldado = "Con este pago la deuda queda saldada.", etiquetaBoton = "Registrar pago" }) {
  const [monto, setMonto] = useState(saldoPendiente);
  const [fecha, setFecha] = useState(todayISO());
  const [error, setError] = useState("");
  const montoNum = Number(monto) || 0;
  const saldoRestante = Math.max(0, (saldoPendiente || 0) - montoNum);
  return (
    <div>
      <p className="text-xs gp-text-muted mb-3">Saldo pendiente actual: <span className="gp-mono">{fmtMoney(saldoPendiente)}</span></p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="Monto pagado"><MoneyInput className="gp-input" value={monto} onChange={setMonto} /></Field>
        <Field label="Fecha del pago"><input type="date" className="gp-input" value={fecha} onChange={(e) => setFecha(e.target.value)} /></Field>
      </div>
      <p className="text-xs gp-text-muted mb-3">
        {montoNum > 0 && (saldoRestante <= 0 ? textoSaldado : `Saldo pendiente después de este pago: ${fmtMoney(saldoRestante)}`)}
      </p>
      {error && <p className="text-xs gp-text-red mb-2">{error}</p>}
      <button className="gp-btn w-full py-2 text-sm mt-1" onClick={() => {
        if (!montoNum || montoNum <= 0) { setError("Captura un monto válido."); return; }
        onPagar({ monto: montoNum, fecha });
      }}>
        {etiquetaBoton}
      </button>
    </div>
  );
}
