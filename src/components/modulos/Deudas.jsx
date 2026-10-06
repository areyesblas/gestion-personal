// src/components/modulos/Deudas.jsx
//
// Modulo perezoso (Fase 2). Salio de App.jsx el 5 oct 2026; se mudaron con el sus propias
// piezas (CUBETAS_ANTIGUEDAD, DeudaForm), que nadie mas usaba.

import PromptTareaRelacionada from "../comunes/PromptTareaRelacionada";
import { AlertTriangle, ArrowUpCircle, ChevronDown, ChevronRight, Clock, Download, Pencil, Plus, Search, Trash2, Users } from "lucide-react";
import { Badge, Field, IconBtn } from "../ui/basicos";
import { CabeceraFinanzas, PagoDeudaForm, TarjetaResumenFin, vencimientoDe } from "../comunes/pantallasFinanzas";
import { ComprobantePago } from "../comunes/finanzas";
import { Fragment, useState } from "react";
import { Modal } from "../ui/Modal";
import { MoneyInput } from "../ui/campos";
import { Th } from "../ui/tablas";
import { exportarFilasExcel, exportarFilasPDF } from "../../lib/exportar";
import { filtrarPorBusqueda, ordenadosPorNombre, ordenarLista } from "../../lib/listas";
import { fmtFechaCorta, fmtMoney, montoBaseDe, todayISO, uid } from "../../lib/formato";

// vencimientoDe() — si no, la tarjeta de "Vencido" y el chip de "Vencido" darían números
// distintos por lo que vence hoy, que es un caso que cae justo en la frontera.
const CUBETAS_ANTIGUEDAD = [
  { id: "vencido", label: "Vencido", test: (v) => v.vencido },
  { id: "semana", label: "Esta semana", test: (v) => !v.vencido && v.dias !== null && v.dias >= -7 },
  { id: "mes", label: "Este mes", test: (v) => !v.vencido && v.dias !== null && v.dias < -7 && v.dias >= -30 },
  { id: "despues", label: "Más adelante", test: (v) => v.dias === null || (!v.vencido && v.dias < -30) },
];

// Lo que NO cambió: el saldo sigue saliendo de pagos_finanzas, así que los pagos parciales ya
// registrados valen igual que antes.
export default function Deudas({ data, onAddFinanzas, onEditFinanzas, onRemoveFinanzas, onAddPago, onCrearTarea, onAddComentario }) {
  const [modal, setModal] = useState(null); // {item} en captura/edición | {item, paso:"tarea", origenId} tras crear | {item, paso:"pagar"}
  const [orden, setOrden] = useState("vencimiento");
  const [ordenDir, setOrdenDir] = useState("asc");
  const [busqueda, setBusqueda] = useState("");
  const [cubeta, setCubeta] = useState("todas");
  const [incluirRecurrentes, setIncluirRecurrentes] = useState(true);
  const [abierto, setAbierto] = useState(null);
  const toggleOrden = (key) => { if (orden === key) setOrdenDir((d) => (d === "asc" ? "desc" : "asc")); else { setOrden(key); setOrdenDir("asc"); } };
  const empty = { concepto: "", proyectoId: "", monto: "", fechaVencimiento: todayISO(), notas: "" };
  const nombreProyecto = (id) => data.proyectos.find((p) => p.id === id)?.nombre || "—";
  const nombreContacto = (id) => data.contactos.find((c) => c.id === id)?.nombre || "";

  const totalPagado = (finanzasId) => (data.pagosFinanzas || []).filter((p) => p.finanzasId === finanzasId).reduce((s, p) => s + (Number(p.monto) || 0), 0);
  const saldoPendiente = (d) => Math.max(0, montoBaseDe(d) - totalPagado(d.id));
  const pagosDe = (id) => (data.pagosFinanzas || []).filter((p) => p.finanzasId === id).sort((a, b) => (b.fecha || "").localeCompare(a.fecha || ""));

  const pendientes = (data.finanzas || [])
    .filter((f) => f.tipo === "Egreso" && (f.estatus === "Pendiente" || f.estatus === "Parcial"))
    .filter((f) => incluirRecurrentes || !f.esRecurrente);
  const conVencimiento = pendientes.map((f) => ({ f, v: vencimientoDe(f), saldo: saldoPendiente(f) }));

  const totalPorPagar = conVencimiento.reduce((t, x) => t + x.saldo, 0);
  const vencido = conVencimiento.filter((x) => x.v.vencido).reduce((t, x) => t + x.saldo, 0);
  const porVencer = conVencimiento.filter((x) => !x.v.vencido && x.v.dias !== null && x.v.dias >= -30).reduce((t, x) => t + x.saldo, 0);
  const aQuienes = new Set(pendientes.map((f) => f.contactoId || f.concepto || "")).size;

  const cubetas = CUBETAS_ANTIGUEDAD.map((cu) => ({
    ...cu,
    n: conVencimiento.filter((x) => cu.test(x.v)).length,
    monto: conVencimiento.filter((x) => cu.test(x.v)).reduce((t, x) => t + x.saldo, 0),
  }));
  const enCubeta = cubeta === "todas"
    ? conVencimiento
    : conVencimiento.filter((x) => CUBETAS_ANTIGUEDAD.find((cu) => cu.id === cubeta)?.test(x.v));
  const buscados = filtrarPorBusqueda(enCubeta, busqueda, [
    (x) => x.f.concepto, (x) => nombreContacto(x.f.contactoId), (x) => nombreProyecto(x.f.proyectoId), (x) => x.f.categoria,
  ]);
  const camposOrden = {
    vencimiento: { get: (x) => x.v.fecha || "9999-12-31", tipo: "fecha" },
    alfabetico: { get: (x) => x.f.concepto, tipo: "texto" },
    monto: { get: (x) => x.saldo, tipo: "numero" },
  };
  const ordenados = ordenarLista(buscados, orden, camposOrden, ordenDir);

  const columnasExport = [
    { label: "A quién", get: (x) => x.f.concepto },
    { label: "Contacto", get: (x) => nombreContacto(x.f.contactoId) },
    { label: "Proyecto", get: (x) => (x.f.proyectoId ? nombreProyecto(x.f.proyectoId) : "") },
    { label: "Categoría", get: (x) => x.f.categoria },
    { label: "Vence", get: (x) => x.v.fecha },
    { label: "Antigüedad", get: (x) => x.v.texto },
    { label: "Monto", get: (x) => montoBaseDe(x.f) },
    { label: "Saldo pendiente", get: (x) => x.saldo },
  ];

  // Registra un pago (total o parcial) en pagos_finanzas y recalcula el estatus del movimiento:
  // si el saldo llega a 0, queda Cobrado; si queda algo pendiente, Parcial.
  const registrarPago = async (d, { monto, fecha }) => {
    await onAddPago({ id: uid(), finanzasId: d.id, fecha, monto, comentario: "" });
    const restante = saldoPendiente(d) - monto;
    onEditFinanzas(d.id, { estatus: restante <= 0 ? "Cobrado" : "Parcial" });
    setModal(null);
  };

  return (
    <div>
      <CabeceraFinanzas
        seccion="Deudas" titulo="Deudas" icono={<AlertTriangle size={20} className="gp-text-red" />}
        subtitulo="A quién le debes, desde cuándo y cuánto. Al llegar el saldo a cero sale solo de esta lista."
        acciones={<>
          <button onClick={() => exportarFilasExcel(ordenados, columnasExport, "por-pagar")} className="gp-btn-ghost px-3 py-1.5 text-xs rounded flex items-center gap-1.5"><Download size={13} /> Excel</button>
          <button onClick={() => exportarFilasPDF(ordenados, columnasExport, "por-pagar", "Por pagar", `Al ${fmtFechaCorta(todayISO())}`)} className="gp-btn-ghost px-3 py-1.5 text-xs rounded flex items-center gap-1.5"><Download size={13} /> PDF</button>
          <button onClick={() => setModal({ item: empty })} className="gp-btn px-3 py-1.5 text-sm rounded flex items-center gap-1.5"><Plus size={14} /> Nueva deuda</button>
        </>}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-2.5 mb-3">
        <TarjetaResumenFin etiqueta="Total que debes" valor={totalPorPagar} color="var(--red)" tinte="rgba(229,72,77,.14)" icono={<ArrowUpCircle size={16} />} />
        <TarjetaResumenFin etiqueta="Atrasado" valor={vencido} color="var(--red)" tinte="rgba(229,72,77,.14)" icono={<AlertTriangle size={16} />} />
        <TarjetaResumenFin etiqueta="Vence en 30 días" valor={porVencer} color="var(--gold)" tinte="rgba(212,175,55,.16)" icono={<Clock size={16} />} />
        <div className="gp-panel p-3.5">
          <div className="flex items-start justify-between gap-2">
            <p className="text-xs font-medium">Cuentas abiertas</p>
            <span className="shrink-0 inline-flex items-center justify-center rounded-lg" style={{ color: "#087CF5", background: "rgba(8,124,245,.14)", width: 30, height: 30 }}><Users size={16} /></span>
          </div>
          <p className="gp-serif text-2xl mt-1" style={{ color: "#087CF5" }}>{aQuienes}</p>
          <p className="text-[11px] gp-text-muted mt-0.5">{pendientes.length} pago{pendientes.length === 1 ? "" : "s"} pendiente{pendientes.length === 1 ? "" : "s"}</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 mb-2">
        <div className="relative flex-1" style={{ minWidth: 180, maxWidth: 300 }}>
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 gp-text-muted" style={{ pointerEvents: "none" }} />
          <input className="gp-input gp-buscador text-sm" style={{ paddingLeft: 32 }} placeholder="Buscar acreedor, proyecto o categoría…" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
        </div>
        <button onClick={() => setCubeta("todas")} className={`text-[11px] px-2.5 py-1 rounded-full border ${cubeta === "todas" ? "gp-btn" : "gp-btn-ghost"}`}>
          Todas <span className="gp-mono">{conVencimiento.length}</span>
        </button>
        {cubetas.map((cu) => (
          <button key={cu.id} onClick={() => setCubeta(cu.id)} className={`text-[11px] px-2.5 py-1 rounded-full border inline-flex items-center gap-1.5 ${cubeta === cu.id ? "gp-btn" : "gp-btn-ghost"}`}>
            {cu.label} <span className="gp-mono">{cu.n}</span>
            {cu.monto > 0 && <span className="gp-text-muted">{fmtMoney(cu.monto)}</span>}
          </button>
        ))}
        <label className="flex items-center gap-1.5 text-[11px] gp-text-muted cursor-pointer">
          <input type="checkbox" checked={incluirRecurrentes} onChange={(e) => setIncluirRecurrentes(e.target.checked)} />
          Incluir recurrentes
        </label>
      </div>

      <div className="gp-panel overflow-x-auto">
        <table className="gp-table">
          <thead>
            <tr>
              <th style={{ width: 28 }}></th>
              <Th label="A quién" sortKey="alfabetico" orden={orden} ordenDir={ordenDir} onToggle={toggleOrden} />
              <th className="hidden md:table-cell">Proyecto</th>
              <th className="hidden lg:table-cell">Categoría</th>
              <Th label="Vence" sortKey="vencimiento" orden={orden} ordenDir={ordenDir} onToggle={toggleOrden} />
              <th>Antigüedad</th>
              <Th label="Saldo pendiente" sortKey="monto" orden={orden} ordenDir={ordenDir} onToggle={toggleOrden} />
              <th></th>
            </tr>
          </thead>
          <tbody>
            {ordenados.map(({ f, v, saldo }) => {
              const pagado = totalPagado(f.id);
              const pagos = pagosDe(f.id);
              return (
                <Fragment key={f.id}>
                  <tr>
                    <td onClick={() => setAbierto(abierto === f.id ? null : f.id)} style={{ cursor: "pointer" }}>
                      {abierto === f.id ? <ChevronDown size={14} className="gp-text-muted" /> : <ChevronRight size={14} className="gp-text-muted" />}
                    </td>
                    <td>
                      <span className="block">{f.concepto}</span>
                      {f.contactoId && <span className="block text-[10px] gp-text-muted">{nombreContacto(f.contactoId)}</span>}
                      {f.esRecurrente && <Badge tone="muted">{f.frecuencia || "Recurrente"}</Badge>}
                    </td>
                    <td className="hidden md:table-cell gp-text-gold">{f.proyectoId ? nombreProyecto(f.proyectoId) : "—"}</td>
                    <td className="hidden lg:table-cell gp-text-muted">{f.categoria || "—"}</td>
                    <td className="gp-mono">{v.fecha ? fmtFechaCorta(v.fecha) : "—"}</td>
                    <td><span className="text-xs" style={{ color: v.vencido ? "var(--red)" : "var(--muted)" }}>{v.texto}</span></td>
                    <td>
                      <span className="gp-mono gp-text-red">{fmtMoney(saldo)}</span>
                      {pagado > 0 && <span className="block text-[10px] gp-text-muted">pagado {fmtMoney(pagado)} de {fmtMoney(montoBaseDe(f))}</span>}
                    </td>
                    <td>
                      <div className="flex gap-1">
                        <button title="Registrar un pago" onClick={() => setModal({ item: f, paso: "pagar" })} className="text-xs px-2 py-1 rounded gp-btn-ghost gp-text-teal">Pagar</button>
                        <IconBtn title="Editar" onClick={() => setModal({ item: f })}><Pencil size={13} /></IconBtn>
                        <IconBtn title="Eliminar" onClick={() => onRemoveFinanzas(f.id)}><Trash2 size={13} /></IconBtn>
                      </div>
                    </td>
                  </tr>
                  {abierto === f.id && (
                    <tr>
                      <td colSpan={8} style={{ padding: 0 }}>
                        <div className="gp-bloque p-2.5">
                          <p className="text-[11px] font-medium mb-1">Pagos registrados</p>
                          {pagos.length === 0
                            ? <p className="text-[11px] gp-text-muted">Todavía no hay abonos a esta cuenta.</p>
                            : (
                              <div className="flex flex-col gap-0.5">
                                {pagos.map((p) => (
                                  <div key={p.id} className="flex items-center justify-between gap-2 text-[11px]">
                                    <span className="gp-mono gp-text-muted">{fmtFechaCorta(p.fecha)}</span>
                                    <span className="flex-1 min-w-0 truncate gp-text-muted">{p.comentario || "Abono"}</span>
                                    <span className="gp-mono gp-text-teal">{fmtMoney(p.monto)}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          {/* El comprobante de la transferencia o el depósito: desde la galería o
                              tomándole foto ahí mismo, que es como se hace en el celular. */}
                          {onAddComentario && <ComprobantePago movimiento={f} data={data} onAddComentario={onAddComentario} />}
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
            {ordenados.length === 0 && (
              <tr><td colSpan={8} className="text-center gp-text-muted py-8">
                {pendientes.length === 0 ? "No debes nada. " : "Sin resultados con estos filtros."}
              </td></tr>
            )}
          </tbody>
        </table>
      </div>

      {modal && !modal.paso && (
        <Modal title={modal.item.id ? "Editar deuda" : "Nueva deuda"} onClose={() => setModal(null)}>
          <DeudaForm
            item={modal.item} proyectos={data.proyectos}
            saldoPendiente={modal.item.id ? saldoPendiente(modal.item) : null}
            onAbrirPago={() => setModal({ item: modal.item, paso: "pagar" })}
            onSave={(v) => {
              if (modal.item.id) { onEditFinanzas(modal.item.id, v); setModal(null); return; }
              const nuevoId = uid();
              onAddFinanzas({
                id: nuevoId, tipo: "Egreso", categoria: "Deuda", forma: "Transferencia", estatus: "Pendiente",
                esRecurrente: false, fecha: todayISO(), contactoId: "",
                concepto: v.concepto, proyectoId: v.proyectoId, monto: v.monto, fechaVencimiento: v.fechaVencimiento, notas: v.notas,
              });
              setModal({ item: v, paso: "tarea", origenId: nuevoId });
            }}
          />
        </Modal>
      )}
      {modal && modal.paso === "pagar" && (
        <Modal title={`Registrar pago — ${modal.item.concepto}`} onClose={() => setModal(null)}>
          <PagoDeudaForm saldoPendiente={saldoPendiente(modal.item)} onPagar={(p) => registrarPago(modal.item, p)} />
        </Modal>
      )}
      {modal && modal.paso === "tarea" && (
        <Modal title="Tarea relacionada" onClose={() => setModal(null)}>
          <PromptTareaRelacionada
            origenTabla="finanzas" origenId={modal.origenId} proyectoId={modal.item.proyectoId}
            descripcionSugerida={`Pagar a ${modal.item.concepto}`}
            fechaSugerida={modal.item.fechaVencimiento}
            onCrear={(t) => { onCrearTarea(t); setModal(null); }}
            onOmitir={() => setModal(null)}
          />
        </Modal>
      )}
    </div>
  );
}

function DeudaForm({ item, proyectos, saldoPendiente, onAbrirPago, onSave }) {
  const [v, setV] = useState(item);
  const [error, setError] = useState("");
  return (
    <div>
      <Field label="Acreedor"><input className="gp-input" value={v.concepto} onChange={(e) => setV({ ...v, concepto: e.target.value })} /></Field>
      <Field label="Proyecto relacionado">
        <select className="gp-input" value={v.proyectoId} onChange={(e) => setV({ ...v, proyectoId: e.target.value })}>
          <option value="">— personal / sin proyecto —</option>
          {ordenadosPorNombre(proyectos).map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
        </select>
      </Field>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="Monto"><MoneyInput className="gp-input" value={v.monto} onChange={(val) => setV({ ...v, monto: val })} /></Field>
        <Field label="Fecha de vencimiento"><input type="date" className="gp-input" value={v.fechaVencimiento} onChange={(e) => setV({ ...v, fechaVencimiento: e.target.value })} /></Field>
      </div>
      <Field label="Nota (opcional)"><textarea className="gp-input" rows={2} value={v.notas || ""} onChange={(e) => setV({ ...v, notas: e.target.value })} /></Field>
      {item.id && (
        <div className="gp-panel-hi p-3 mb-3 flex items-center justify-between gap-2" style={{ border: "1px solid var(--border)", borderRadius: 6 }}>
          <div>
            <p className="text-xs gp-text-muted">Saldo pendiente</p>
            <p className="gp-serif text-lg">{fmtMoney(saldoPendiente)}</p>
          </div>
          <button type="button" className="gp-btn-ghost px-3 py-1.5 text-xs rounded" onClick={onAbrirPago}>Registrar pago</button>
        </div>
      )}
      {error && <p className="text-xs gp-text-red mb-2">{error}</p>}

      <button className="gp-btn w-full py-2 text-sm mt-2" onClick={() => { if (!v.concepto?.toString().trim()) { setError("El acreedor es obligatorio."); return; } setError(""); onSave(v); }}>Guardar</button>
    </div>
  );
}
