// src/components/modulos/Apartados.jsx
//
// Modulo perezoso (Fase 2). Salio de App.jsx el 5 oct 2026; se mudaron con el sus propias
// piezas (AportarFondosForm, RetirarFondosForm, ApartadoForm), que nadie mas usaba.

import { Badge, Field, IconBtn } from "../ui/basicos";
import { BarraListaEstandar, OrdenSelector } from "../ui/tablas";
import { Modal } from "../ui/Modal";
import { MoneyInput } from "../ui/campos";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { exportarFilasExcel, exportarFilasPDF } from "../../lib/exportar";
import { filtrarPorBusqueda, ordenadosPorNombre, ordenarLista } from "../../lib/listas";
import { fmtMoney } from "../../lib/formato";
import { useState } from "react";

/* ---------- Apartados / metas de ahorro ---------- */
export default function Apartados({ data, onAdd, onEdit, onRemove, onAportar, onRetirar }) {
  const [modal, setModal] = useState(null);
  const [aportarModal, setAportarModal] = useState(null); // { apartado }
  const [retirarModal, setRetirarModal] = useState(null); // { apartado }
  const [historialDe, setHistorialDe] = useState(null); // { apartado }
  const [orden, setOrden] = useState("default");
  const [busqueda, setBusqueda] = useState("");
  const empty = { nombre: "", proyectoId: "", montoObjetivo: "", montoActual: "0", fechaObjetivo: "", notas: "" };
  const nombreProyecto = (id) => data.proyectos.find((p) => p.id === id)?.nombre || "—";
  const pctAvance = (a) => { const obj = Number(a.montoObjetivo) || 0; const act = Number(a.montoActual) || 0; return obj ? Math.min(100, (act / obj) * 100) : 0; };
  const movimientosDe = (id) => (data.apartadosMovimientos || []).filter((m) => m.apartadoId === id).sort((a, b) => (b.fecha || "").localeCompare(a.fecha || ""));
  const camposOrden = {
    objetivo: { get: (a) => a.fechaObjetivo, tipo: "fecha" },
    registro: { get: (a) => a.createdAt, tipo: "fecha" },
    alfabetico: { get: (a) => a.nombre, tipo: "texto" },
    avance: { get: (a) => pctAvance(a), tipo: "numero" },
  };
  const opcionesOrden = [
    { key: "objetivo", label: "fecha objetivo" },
    { key: "registro", label: "fecha de registro" },
    { key: "alfabetico", label: "alfabético" },
    { key: "avance", label: "% de avance" },
  ];
  const buscados = filtrarPorBusqueda(data.apartados, busqueda, [(a) => a.nombre, (a) => a.notas, (a) => nombreProyecto(a.proyectoId)]);
  const listaApartados = ordenarLista(buscados, orden, camposOrden);
  const columnasExport = [
    { label: "Nombre", get: (a) => a.nombre }, { label: "Proyecto", get: (a) => nombreProyecto(a.proyectoId) },
    { label: "Monto objetivo", get: (a) => a.montoObjetivo }, { label: "Ahorrado", get: (a) => a.montoActual },
    { label: "% de avance", get: (a) => Math.round(pctAvance(a)) }, { label: "Fecha objetivo", get: (a) => a.fechaObjetivo },
    { label: "Notas", get: (a) => a.notas },
  ];

  return (
    <div>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-1">
        <h2 className="gp-serif text-2xl">Apartados</h2>
        <button onClick={() => setModal({ item: empty })} className="gp-btn flex items-center justify-center gap-1 px-3 py-1.5 text-sm w-full sm:w-auto"><Plus size={14} /> Nuevo</button>
      </div>
      <p className="text-sm gp-text-muted mb-3">Dinero apartado para un proyecto o una meta específica, como un viaje. Lo ahorrado se calcula solo, a partir de tus aportes y retiros.</p>
      <div className="mb-2"><OrdenSelector opciones={opcionesOrden} value={orden} onChange={setOrden} /></div>
      <BarraListaEstandar busqueda={busqueda} onBusqueda={setBusqueda} placeholder="Buscar por nombre, proyecto o notas…"
        onExportExcel={() => exportarFilasExcel(listaApartados, columnasExport, "apartados")}
        onExportPDF={() => exportarFilasPDF(listaApartados, columnasExport, "apartados", "Apartados", busqueda ? `búsqueda: "${busqueda}"` : "")} />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {listaApartados.map((a) => {
          const objetivo = Number(a.montoObjetivo) || 0;
          const actual = Number(a.montoActual) || 0;
          const pct = objetivo ? Math.min(100, (actual / objetivo) * 100) : 0;
          const completo = objetivo > 0 && actual >= objetivo;
          const faltante = Math.max(0, objetivo - actual);
          return (
            <div key={a.id} className="gp-panel p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium">{a.nombre}</p>
                  <p className="text-xs gp-text-muted mt-0.5">{a.proyectoId ? nombreProyecto(a.proyectoId) : "Personal"} {a.fechaObjetivo ? `· para ${a.fechaObjetivo}` : ""}</p>
                </div>
                <div className="flex gap-1"><IconBtn title="Editar" onClick={() => setModal({ item: a })}><Pencil size={13} /></IconBtn><IconBtn title="Eliminar" onClick={() => onRemove(a.id)}><Trash2 size={13} /></IconBtn></div>
              </div>
              <div className="mt-3">
                <div className="flex justify-between text-xs mb-1">
                  <span className="gp-mono gp-text-gold">{fmtMoney(actual)}</span>
                  <span className="gp-text-muted">de {fmtMoney(objetivo)}</span>
                </div>
                <div className="h-2 rounded" style={{ background: "var(--border)" }}>
                  <div className="h-2 rounded" style={{ width: `${pct}%`, background: completo ? "var(--teal)" : "var(--gold)" }} />
                </div>
                <p className="text-xs gp-text-muted mt-1">{completo ? "Meta alcanzada 🎉" : `Faltan ${fmtMoney(faltante)} · ${Math.round(pct)}%`}</p>
              </div>
              {a.notas && <p className="text-xs gp-text-muted mt-3">{a.notas}</p>}
              <div className="flex gap-2 mt-3">
                <button onClick={() => setAportarModal({ apartado: a })} className="gp-btn-ghost flex-1 py-1.5 text-xs">Apartar dinero</button>
                <button onClick={() => setRetirarModal({ apartado: a })} disabled={actual <= 0} className="gp-btn-ghost flex-1 py-1.5 text-xs disabled:opacity-40">Retirar dinero</button>
              </div>
              {movimientosDe(a.id).length > 0 && (
                <button onClick={() => setHistorialDe({ apartado: a })} className="text-xs gp-text-gold mt-2">Ver historial ({movimientosDe(a.id).length})</button>
              )}
            </div>
          );
        })}
        {data.apartados.length === 0 && <p className="text-sm gp-text-muted col-span-2">Aún no tienes apartados. Crea uno para tu próximo viaje o compra grande.</p>}
      </div>

      {modal && (
        <Modal title={modal.item.id ? "Editar apartado" : "Nuevo apartado"} onClose={() => setModal(null)}>
          <ApartadoForm item={modal.item} proyectos={data.proyectos} onSave={(v) => { modal.item.id ? onEdit(modal.item.id, v) : onAdd(v); setModal(null); }} />
        </Modal>
      )}
      {aportarModal && (
        <Modal title={`Apartar dinero — ${aportarModal.apartado.nombre}`} onClose={() => setAportarModal(null)}>
          <AportarFondosForm
            apartado={aportarModal.apartado}
            onSave={(monto) => { onAportar(aportarModal.apartado, { monto }); setAportarModal(null); }}
          />
        </Modal>
      )}
      {retirarModal && (
        <Modal title={`Retirar dinero — ${retirarModal.apartado.nombre}`} onClose={() => setRetirarModal(null)}>
          <RetirarFondosForm
            apartado={retirarModal.apartado}
            proyectos={data.proyectos}
            onSave={(payload) => { onRetirar(retirarModal.apartado, payload); setRetirarModal(null); }}
          />
        </Modal>
      )}
      {historialDe && (
        <Modal title={`Historial — ${historialDe.apartado.nombre}`} onClose={() => setHistorialDe(null)}>
          <div className="space-y-2">
            {movimientosDe(historialDe.apartado.id).map((m) => (
              <div key={m.id} className="flex items-center justify-between text-sm gp-panel p-2.5">
                <div>
                  <Badge tone={m.tipo === "retiro" ? "red" : "teal"}>{m.tipo === "retiro" ? "Retiro" : "Aporte"}</Badge>
                  <span className="ml-2 gp-text-muted text-xs">{m.fecha}</span>
                  {m.concepto && <p className="text-xs gp-text-muted mt-1">{m.concepto}</p>}
                </div>
                <span className={`gp-mono ${m.tipo === "retiro" ? "gp-text-red" : "gp-text-teal"}`}>{m.tipo === "retiro" ? "−" : "+"}{fmtMoney(m.monto)}</span>
              </div>
            ))}
          </div>
        </Modal>
      )}
    </div>
  );
}

function AportarFondosForm({ apartado, onSave }) {
  const [monto, setMonto] = useState("");
  const actual = Number(apartado.montoActual) || 0;
  const montoNum = Number(monto) || 0;
  return (
    <div>
      <p className="text-xs gp-text-muted mb-3">Llevas {fmtMoney(actual)} de {fmtMoney(apartado.montoObjetivo)}.</p>
      <Field label="Cuánto vas a apartar"><MoneyInput autoFocus className="gp-input" value={monto} onChange={(val) => setMonto(val)} /></Field>
      <p className="text-xs gp-text-muted mb-3">Esto no se registra como gasto en Finanzas — es solo una transferencia interna hacia esta meta.</p>
      <button className="gp-btn w-full py-2 text-sm mt-2 disabled:opacity-40" disabled={!montoNum} onClick={() => onSave(montoNum)}>Apartar</button>
    </div>
  );
}

function RetirarFondosForm({ apartado, proyectos, onSave }) {
  const actual = Number(apartado.montoActual) || 0;
  const [monto, setMonto] = useState("");
  const [proyectoId, setProyectoId] = useState(apartado.proyectoId || "");
  const [concepto, setConcepto] = useState(`Fondos de "${apartado.nombre}"`);
  const montoNum = Number(monto) || 0;
  const excede = montoNum > actual;

  return (
    <div>
      <p className="text-xs gp-text-muted mb-3">Disponible en este apartado: <span className="gp-mono gp-text-gold">{fmtMoney(actual)}</span></p>
      <Field label="Cuánto vas a retirar"><MoneyInput autoFocus className="gp-input" value={monto} onChange={(val) => setMonto(val)} /></Field>
      {excede && <p className="text-xs gp-text-red mb-2">Ese monto es mayor al disponible en el apartado.</p>}
      <Field label="Destino (proyecto o rubro)">
        <select className="gp-input" value={proyectoId} onChange={(e) => setProyectoId(e.target.value)}>
          <option value="">— sin proyecto (personal) —</option>
          {ordenadosPorNombre(proyectos).map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
        </select>
      </Field>
      <Field label="Concepto"><input className="gp-input" value={concepto} onChange={(e) => setConcepto(e.target.value)} /></Field>
      <p className="text-xs gp-text-muted mb-3">Esto resta el monto del apartado y lo registra como un ingreso en Finanzas, para que quede el rastro de a dónde fue el dinero.</p>
      <button
        className="gp-btn w-full py-2 text-sm mt-2 disabled:opacity-40"
        disabled={!montoNum || excede}
        onClick={() => onSave({ monto: montoNum, proyectoId, concepto })}
      >
        Retirar fondos
      </button>
    </div>
  );
}

function ApartadoForm({ item, proyectos, onSave }) {
  const [v, setV] = useState(item);
  const [error, setError] = useState("");
  return (
    <div>
      <Field label="Nombre"><input className="gp-input" placeholder="ej. Viaje a Cancún, Laptop nueva" value={v.nombre} onChange={(e) => setV({ ...v, nombre: e.target.value })} /></Field>
      <Field label="Proyecto relacionado (opcional)">
        <select className="gp-input" value={v.proyectoId} onChange={(e) => setV({ ...v, proyectoId: e.target.value })}>
          <option value="">— personal —</option>
          {ordenadosPorNombre(proyectos).map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
        </select>
      </Field>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="Monto objetivo"><MoneyInput className="gp-input" value={v.montoObjetivo} onChange={(val) => setV({ ...v, montoObjetivo: val })} /></Field>
        <Field label="Ya tienes ahorrado"><MoneyInput className="gp-input" value={v.montoActual} onChange={(val) => setV({ ...v, montoActual: val })} /></Field>
      </div>
      <Field label="Fecha objetivo (opcional)"><input type="date" className="gp-input" value={v.fechaObjetivo} onChange={(e) => setV({ ...v, fechaObjetivo: e.target.value })} /></Field>
      <Field label="Notas"><textarea className="gp-input" rows={2} value={v.notas} onChange={(e) => setV({ ...v, notas: e.target.value })} /></Field>
      {error && <p className="text-xs gp-text-red mb-2">{error}</p>}

      <button className="gp-btn w-full py-2 text-sm mt-2" onClick={() => { if (!v.nombre?.toString().trim()) { setError("El nombre del apartado es obligatorio."); return; } setError(""); onSave(v); }}>Guardar</button>
    </div>
  );
}
