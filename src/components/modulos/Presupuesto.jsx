// src/components/modulos/Presupuesto.jsx
//
// Modulo perezoso (Fase 2). Salio de App.jsx el 5 oct 2026; se mudaron con el sus propias
// piezas (PresupuestoForm), que nadie mas usaba.

import PresupuestoMensualForm from "../comunes/PresupuestoMensualForm";
import { Badge, Field, IconBtn } from "../ui/basicos";
import { BarraListaEstandar, OrdenSelector } from "../ui/tablas";
import { Modal } from "../ui/Modal";
import { MoneyInput } from "../ui/campos";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { buildMonthlyLedger } from "../../lib/finanzas";
import { exportarFilasExcel, exportarFilasPDF } from "../../lib/exportar";
import { filtrarPorBusqueda, ordenadosPorNombre, ordenarLista } from "../../lib/listas";
import { fmtMoney, todayISO } from "../../lib/formato";
import { useMemo, useState } from "react";

/* ---------- Presupuesto (metas de gasto por categoría/proyecto, comparadas contra Finanzas) ----------
   El presupuesto GENERAL mensual (un número) ya existía y sigue viviendo en preferencias/el widget
   "Tu progreso" -- aquí solo se muestra arriba con acceso directo a redefinirlo, para no duplicarlo.
   Lo nuevo es el nivel granular: metas por categoría o por proyecto, mensuales o anuales, comparadas
   contra el histórico real de Finanzas (misma lógica que Reportes: buildMonthlyLedger). ---------- */
export default function Presupuesto({ data, onAdd, onEdit, onRemove, presupuestoMensual, onGuardarPresupuestoMensual }) {
  const [modal, setModal] = useState(null);
  const [presupuestoGeneralModal, setPresupuestoGeneralModal] = useState(false);
  const [orden, setOrden] = useState("default");
  const [ordenDir, setOrdenDir] = useState("asc");
  const [busqueda, setBusqueda] = useState("");
  const toggleOrden = (key) => { if (orden === key) setOrdenDir((d) => (d === "asc" ? "desc" : "asc")); else { setOrden(key); setOrdenDir("asc"); } };
  const empty = { tipo: "categoria", categoria: "", proyectoId: "", periodo: "mensual", monto: "", notas: "" };

  const nombreProyecto = (id) => data.proyectos.find((p) => p.id === id)?.nombre || "—";
  const etiqueta = (p) => (p.tipo === "proyecto" ? nombreProyecto(p.proyectoId) : (p.categoria || "Sin categoría"));
  const categoriasFinanzas = [...new Set((data.finanzas || []).map((f) => f.categoria).filter(Boolean))].sort();

  const hoy = todayISO();
  const mesActual = hoy.slice(0, 7);
  const anioActual = hoy.slice(0, 4);
  const monthKeysAnio = useMemo(() => Array.from({ length: 12 }, (_, i) => `${anioActual}-${String(i + 1).padStart(2, "0")}`), [anioActual]);
  const ledgerAnio = useMemo(() => buildMonthlyLedger(data.finanzas, monthKeysAnio), [data.finanzas, monthKeysAnio]);
  const gastoMesActual = ledgerAnio.filter((e) => e.mes === mesActual && e.tipo === "Egreso").reduce((s, e) => s + e.monto, 0);

  const gastoReal = (p) => {
    const movimientos = p.periodo === "anual" ? ledgerAnio : ledgerAnio.filter((e) => e.mes === mesActual);
    const propios = p.tipo === "proyecto"
      ? movimientos.filter((e) => e.proyectoId === p.proyectoId)
      : movimientos.filter((e) => (e.categoria || "Sin categoría") === (p.categoria || "Sin categoría"));
    return propios.filter((e) => e.tipo === "Egreso").reduce((s, e) => s + e.monto, 0);
  };

  const camposOrden = {
    alfabetico: { get: (p) => etiqueta(p), tipo: "texto" },
    registro: { get: (p) => p.createdAt, tipo: "fecha" },
    monto: { get: (p) => Number(p.monto) || 0, tipo: "numero" },
  };
  const opcionesOrden = [
    { key: "alfabetico", label: "alfabético" },
    { key: "registro", label: "fecha de registro" },
    { key: "monto", label: "monto" },
  ];

  const filtrados = filtrarPorBusqueda(data.presupuestos || [], busqueda, [(p) => etiqueta(p), (p) => p.notas]);
  const ordenados = ordenarLista(filtrados, orden, camposOrden, ordenDir);
  const columnasExport = [
    { label: "Tipo", get: (p) => (p.tipo === "proyecto" ? "Proyecto" : "Categoría") },
    { label: "Nombre", get: (p) => etiqueta(p) }, { label: "Periodo", get: (p) => p.periodo },
    { label: "Presupuestado", get: (p) => p.monto }, { label: "Gastado", get: (p) => gastoReal(p) },
    { label: "Notas", get: (p) => p.notas },
  ];

  return (
    <div>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-1">
        <h2 className="gp-serif text-2xl">Presupuesto</h2>
        <button onClick={() => setModal({ item: empty })} className="gp-btn flex items-center justify-center gap-1 px-3 py-1.5 text-sm w-full sm:w-auto"><Plus size={14} /> Nueva meta</button>
      </div>
      <p className="text-sm gp-text-muted mb-3">Cuánto planeas gastar por categoría o por proyecto, comparado contra lo que realmente gastaste en Finanzas.</p>

      <div className="gp-panel p-4 mb-4">
        <div className="flex items-center justify-between mb-1">
          <p className="text-sm font-medium">Presupuesto general mensual</p>
          <button onClick={() => setPresupuestoGeneralModal(true)} className="text-xs gp-text-gold">{presupuestoMensual ? "Redefinir" : "Definir"}</button>
        </div>
        {presupuestoMensual ? (
          <>
            <p className="text-xs gp-text-muted mb-2">{fmtMoney(gastoMesActual)} de {fmtMoney(presupuestoMensual)} este mes</p>
            <div className="h-2 rounded" style={{ background: "var(--border)" }}>
              <div className="h-2 rounded" style={{ width: `${Math.min(100, Math.round((gastoMesActual / presupuestoMensual) * 100))}%`, background: gastoMesActual > presupuestoMensual ? "var(--red)" : "var(--teal)" }} />
            </div>
          </>
        ) : (
          <p className="text-xs gp-text-muted">Aún no defines cuánto planeas gastar al mes en total — el widget "Tu progreso" del Centro de mando lo usa.</p>
        )}
      </div>

      <div className="mb-2"><OrdenSelector opciones={opcionesOrden} value={orden} onChange={setOrden} /></div>
      <BarraListaEstandar busqueda={busqueda} onBusqueda={setBusqueda} placeholder="Buscar por categoría, proyecto o notas…"
        onExportExcel={() => exportarFilasExcel(ordenados, columnasExport, "presupuesto")}
        onExportPDF={() => exportarFilasPDF(ordenados, columnasExport, "presupuesto", "Presupuesto", busqueda ? `búsqueda: "${busqueda}"` : "")} />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {ordenados.map((p) => {
          const gastado = gastoReal(p);
          const monto = Number(p.monto) || 0;
          const pct = monto ? Math.min(100, Math.round((gastado / monto) * 100)) : 0;
          const sobrepasado = monto > 0 && gastado > monto;
          return (
            <div key={p.id} className="gp-panel p-4">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-medium">{etiqueta(p)}</p>
                    <Badge tone="muted">{p.tipo === "proyecto" ? "Proyecto" : "Categoría"}</Badge>
                    <Badge tone="muted">{p.periodo === "anual" ? "Anual" : "Mensual"}</Badge>
                  </div>
                  {p.notas && <p className="text-xs gp-text-muted mt-0.5">{p.notas}</p>}
                </div>
                <div className="flex gap-1">
                  <IconBtn title="Editar" onClick={() => setModal({ item: p })}><Pencil size={13} /></IconBtn>
                  <IconBtn title="Eliminar" onClick={() => onRemove(p.id)}><Trash2 size={13} /></IconBtn>
                </div>
              </div>
              <div className="mt-3">
                <div className="flex items-end justify-between mb-1">
                  <p className="gp-serif text-lg">{fmtMoney(gastado)}</p>
                  <p className="text-xs gp-text-muted">de {fmtMoney(monto)}</p>
                </div>
                <div className="h-2 rounded" style={{ background: "var(--border)" }}>
                  <div className="h-2 rounded" style={{ width: `${pct}%`, background: sobrepasado ? "var(--red)" : "var(--teal)" }} />
                </div>
                {sobrepasado && <p className="text-xs gp-text-red mt-1">Te pasaste por {fmtMoney(gastado - monto)}</p>}
              </div>
            </div>
          );
        })}
        {ordenados.length === 0 && <p className="text-sm gp-text-muted col-span-2">Aún no registras metas de presupuesto por categoría o proyecto.</p>}
      </div>

      {presupuestoGeneralModal && (
        <Modal title="Presupuesto mensual general" onClose={() => setPresupuestoGeneralModal(false)}>
          <PresupuestoMensualForm presupuestoMensual={presupuestoMensual} onSave={async (v) => { await onGuardarPresupuestoMensual(v); }} onSaved={() => setPresupuestoGeneralModal(false)} />
        </Modal>
      )}

      {modal && (
        <Modal title={modal.item.id ? "Editar meta de presupuesto" : "Nueva meta de presupuesto"} onClose={() => setModal(null)}>
          <PresupuestoForm item={modal.item} proyectos={data.proyectos} categoriasFinanzas={categoriasFinanzas}
            onSave={(v) => { modal.item.id ? onEdit(modal.item.id, v) : onAdd(v); setModal(null); }} />
        </Modal>
      )}
    </div>
  );
}

function PresupuestoForm({ item, proyectos, categoriasFinanzas, onSave }) {
  const [v, setV] = useState(item);
  const [error, setError] = useState("");
  return (
    <div>
      <Field label="Aplica a">
        <select className="gp-input" value={v.tipo} onChange={(e) => setV({ ...v, tipo: e.target.value })}>
          <option value="categoria">Categoría</option>
          <option value="proyecto">Proyecto</option>
        </select>
      </Field>
      {v.tipo === "proyecto" ? (
        <Field label="Proyecto">
          <select className="gp-input" value={v.proyectoId} onChange={(e) => setV({ ...v, proyectoId: e.target.value })}>
            <option value="">— elige un proyecto —</option>
            {ordenadosPorNombre(proyectos).map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
          </select>
        </Field>
      ) : (
        <Field label="Categoría">
          <input className="gp-input" list="presupuesto-categorias" value={v.categoria || ""} onChange={(e) => setV({ ...v, categoria: e.target.value })} placeholder="ej. hosting, renta, comida" />
          <datalist id="presupuesto-categorias">{categoriasFinanzas.map((c) => <option key={c} value={c} />)}</datalist>
        </Field>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="Periodo">
          <select className="gp-input" value={v.periodo} onChange={(e) => setV({ ...v, periodo: e.target.value })}>
            <option value="mensual">Mensual</option>
            <option value="anual">Anual</option>
          </select>
        </Field>
        <Field label="Monto"><MoneyInput className="gp-input" value={v.monto} onChange={(val) => setV({ ...v, monto: val })} /></Field>
      </div>
      <Field label="Notas"><textarea className="gp-input" rows={2} value={v.notas || ""} onChange={(e) => setV({ ...v, notas: e.target.value })} /></Field>
      {error && <p className="text-xs gp-text-red mb-2">{error}</p>}
      <button
        className="gp-btn w-full py-2 text-sm mt-2"
        onClick={() => {
          if (v.tipo === "proyecto" && !v.proyectoId) { setError("Elige un proyecto."); return; }
          if (v.tipo === "categoria" && !v.categoria?.toString().trim()) { setError("Captura una categoría."); return; }
          if (!v.monto || Number(v.monto) <= 0) { setError("Captura un monto mayor a cero."); return; }
          setError("");
          onSave(v);
        }}
      >
        Guardar
      </button>
    </div>
  );
}
