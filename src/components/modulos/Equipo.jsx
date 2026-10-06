// src/components/modulos/Equipo.jsx
//
// Modulo perezoso (Fase 2). Salio de App.jsx el 5 oct 2026; se mudaron con el sus propias
// piezas (PagoColaboradorForm), que nadie mas usaba.

import { ContactoForm, etiquetasDeContactos, titulosDeContactos } from "../comunes/fichaContacto";
import { Field, IconBtn } from "../ui/basicos";
import { Mail, MessageCircle, Pencil, Plus } from "lucide-react";
import { Modal } from "../ui/Modal";
import { MoneyInput } from "../ui/campos";
import { OrdenSelector } from "../ui/tablas";
import { fmtMoney, montoBaseDe, todayISO, uid } from "../../lib/formato";
import { normalizarTexto, ordenadosPorNombre, ordenarLista } from "../../lib/listas";
import { usarCatalogoEditable } from "../ui/usarCatalogoEditable";
import { useState } from "react";

// por cada colaborador, sus tareas asignadas, lo ganado (tareas aceptadas, aunque sigan en proceso),
// lo ya pagado (egresos reales en Finanzas) y el saldo pendiente — sin duplicar el dinero real.
export default function Equipo({ data, onAddContacto, onEditContacto, onAddFinanzas, onAddFactura, onVincularProyecto, onDesvincularProyecto }) {
  // Mismos catálogos que en Contactos: es la misma gente y las mismas etiquetas, solo que
  // editadas desde otra pantalla. Aquí el editor de contactos se llama onEditContacto.
  const catalogoEtiquetasContactos = usarCatalogoEditable({
    registros: data.contactos, campo: "etiquetas", esLista: true, onEditar: onEditContacto, nombreSingular: "la etiqueta",
  });
  const catalogoTitulosContactos = usarCatalogoEditable({
    registros: data.contactos, campo: "titulo", esLista: false, onEditar: onEditContacto, nombreSingular: "el título",
  });
  const [modal, setModal] = useState(null); // {item} alta/edición contacto | {colaborador, paso:"pagar"}
  const [orden, setOrden] = useState("alfabetico");
  const [busqueda, setBusqueda] = useState("");
  const emptyContacto = { nombre: "", nombres: "", apellidoPaterno: "", apellidoMaterno: "", tipos: ["Colaborador"], titulo: "", etiquetas: [], whatsapp: "", correo: "", direccion: "", notas: "", contexto: "", parentesco: "", fechaNacimiento: "" };

  const colaboradores = data.contactos.filter((c) => (c.tipos && c.tipos.length ? c.tipos : [c.tipo || "Otro"]).includes("Colaborador"));
  const tareasDe = (id) => data.pendientes.filter((p) => p.colaboradorContactoId === id);
  const ganadoDe = (id) => tareasDe(id).filter((p) => p.estadoAceptacion === "aceptada" || p.aceptadaPorCreador).reduce((s, p) => s + (Number(p.precio) || 0), 0);
  const pagadoDe = (id) => data.finanzas.filter((f) => f.categoria === "Pago a colaborador" && f.contactoId === id && f.estatus !== "Cancelado").reduce((s, f) => s + montoBaseDe(f), 0);
  const nombreProyecto = (pid) => data.proyectos.find((p) => p.id === pid)?.nombre || "—";

  const camposOrden = {
    registro: { get: (m) => m.createdAt, tipo: "fecha" },
    alfabetico: { get: (m) => m.nombre, tipo: "texto" },
    saldo: { get: (m) => ganadoDe(m.id) - pagadoDe(m.id), tipo: "numero" },
  };
  const opcionesOrden = [
    { key: "registro", label: "fecha de registro" },
    { key: "alfabetico", label: "alfabético" },
    { key: "saldo", label: "saldo pendiente" },
  ];
  const qn = normalizarTexto(busqueda);
  const filtrados = !qn
    ? colaboradores
    : colaboradores.filter((m) => [m.nombre, m.whatsapp, m.correo, m.notas].some((v) => normalizarTexto(v).includes(qn)));
  const listaEquipo = ordenarLista(filtrados, orden, camposOrden);

  return (
    <div>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-1">
        <h2 className="gp-serif text-2xl">Colaboradores</h2>
        <button onClick={() => setModal({ item: emptyContacto })} className="gp-btn flex items-center justify-center gap-1 px-3 py-1.5 text-sm w-full sm:w-auto"><Plus size={14} /> Nuevo</button>
      </div>
      <p className="text-sm gp-text-muted mb-3">Colaboradores a los que delegas tareas y les pagas por su trabajo. Un colaborador es un Contacto — puede ser también tu cliente o proveedor a la vez.</p>
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <input className="gp-input text-sm flex-1 sm:max-w-xs" placeholder="Buscar en Colaboradores…" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
        <OrdenSelector opciones={opcionesOrden} value={orden} onChange={setOrden} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {listaEquipo.map((m) => {
          const tareas = tareasDe(m.id);
          const ganado = ganadoDe(m.id);
          const pagado = pagadoDe(m.id);
          const saldo = Math.max(0, ganado - pagado);
          return (
            <div key={m.id} className="gp-panel p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium">{m.nombre}</p>
                  <div className="flex gap-3 mt-1 text-xs gp-text-muted flex-wrap">
                    {m.whatsapp && <span className="flex items-center gap-1"><MessageCircle size={12} /> {m.whatsapp}</span>}
                    {m.correo && <span className="flex items-center gap-1"><Mail size={12} /> {m.correo}</span>}
                  </div>
                </div>
                <IconBtn title="Editar" onClick={() => setModal({ item: m })}><Pencil size={13} /></IconBtn>
              </div>
              {m.notas && <p className="text-xs mt-2 gp-text-muted">{m.notas}</p>}
              <div className="mt-3 pt-3 border-t gp-border text-xs space-y-1">
                <div className="flex justify-between"><span className="gp-text-muted">{tareas.length} tarea(s) asignadas</span><span className="gp-mono">{fmtMoney(ganado)} ganado</span></div>
                <div className="flex justify-between"><span className="gp-text-muted">Pagado</span><span className="gp-mono gp-text-teal">{fmtMoney(pagado)}</span></div>
                <div className="flex justify-between items-center">
                  <span className="gp-text-muted">Saldo pendiente</span>
                  <span className="gp-mono gp-text-gold font-medium">{fmtMoney(saldo)}</span>
                </div>
              </div>
              {saldo > 0 && (
                <button onClick={() => setModal({ colaborador: m, paso: "pagar" })} className="gp-btn-ghost w-full mt-3 py-1.5 text-xs rounded">Registrar pago</button>
              )}
            </div>
          );
        })}
        {listaEquipo.length === 0 && (
          <p className="text-sm gp-text-muted col-span-2">
            {colaboradores.length === 0 ? "Aún no tienes contactos marcados como Colaborador. Márcalos desde Contactos, o crea uno aquí." : "Ningún colaborador coincide con tu búsqueda."}
          </p>
        )}
      </div>

      {modal && modal.item && (
        <Modal title={modal.item.id ? "Editar colaborador" : "Nuevo colaborador"} onClose={() => setModal(null)}>
          <ContactoForm
            item={modal.item} proyectos={data.proyectos}
            vinculos={(data.contactoProyectos || []).filter((v) => v.contactoId === modal.item.id)}
            etiquetasExistentes={etiquetasDeContactos(data.contactos)}
            titulosExistentes={titulosDeContactos(data.contactos)}
            catalogoEtiquetas={catalogoEtiquetasContactos}
            catalogoTitulos={catalogoTitulosContactos}
            onVincularProyecto={onVincularProyecto} onDesvincularProyecto={onDesvincularProyecto}
            onSave={(v) => {
              const vConTipo = { ...v, tipos: v.tipos.includes("Colaborador") ? v.tipos : [...v.tipos, "Colaborador"] };
              if (modal.item.id) onEditContacto(modal.item.id, vConTipo); else onAddContacto(vConTipo);
              setModal(null);
            }}
          />
        </Modal>
      )}
      {modal && modal.paso === "pagar" && (
        <Modal title={`Registrar pago — ${modal.colaborador.nombre}`} onClose={() => setModal(null)}>
          <PagoColaboradorForm
            saldoPendiente={ganadoDe(modal.colaborador.id) - pagadoDe(modal.colaborador.id)}
            proyectos={data.proyectos}
            onPagar={({ monto, fecha, proyectoId, solicitarFactura }) => {
              const finanzasId = uid();
              onAddFinanzas({
                id: finanzasId, tipo: "Egreso", categoria: "Pago a colaborador", forma: "Transferencia", estatus: "Cobrado",
                esRecurrente: false, fecha, proyectoId: proyectoId || "", contactoId: modal.colaborador.id,
                concepto: `Pago a ${modal.colaborador.nombre}`, monto,
              });
              if (solicitarFactura) {
                onAddFactura({
                  id: uid(), tipo: "Recibida", proyectoId: proyectoId || "", contactoId: modal.colaborador.id,
                  folio: "", fecha, concepto: `Pago a ${modal.colaborador.nombre}`, subtotal: monto, iva: 0, total: monto,
                  estatus: "Pendiente", notas: "Factura solicitada al colaborador por este pago.", finanzasId,
                });
              }
              setModal(null);
            }}
          />
        </Modal>
      )}
    </div>
  );
}

function PagoColaboradorForm({ saldoPendiente, proyectos, onPagar }) {
  const [monto, setMonto] = useState(saldoPendiente);
  const [fecha, setFecha] = useState(todayISO());
  const [proyectoId, setProyectoId] = useState("");
  const [solicitarFactura, setSolicitarFactura] = useState(false);
  const [error, setError] = useState("");
  return (
    <div>
      <p className="text-xs gp-text-muted mb-3">Saldo pendiente actual: <span className="gp-mono">{fmtMoney(saldoPendiente)}</span></p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="Monto a pagar"><MoneyInput className="gp-input" value={monto} onChange={setMonto} /></Field>
        <Field label="Fecha del pago"><input type="date" className="gp-input" value={fecha} onChange={(e) => setFecha(e.target.value)} /></Field>
      </div>
      <Field label="Proyecto relacionado (opcional)">
        <select className="gp-input" value={proyectoId} onChange={(e) => setProyectoId(e.target.value)}>
          <option value="">— sin proyecto —</option>
          {ordenadosPorNombre(proyectos).map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
        </select>
      </Field>
      <label className="flex items-center gap-2 mb-3 text-sm cursor-pointer">
        <input type="checkbox" checked={solicitarFactura} onChange={(e) => setSolicitarFactura(e.target.checked)} />
        Solicitar factura al colaborador por este pago
      </label>
      <p className="text-xs gp-text-muted mb-3">Este pago se registra como un Egreso real en Finanzas (categoría "Pago a colaborador"), ligado a este contacto.</p>
      {error && <p className="text-xs gp-text-red mb-2">{error}</p>}
      <button className="gp-btn w-full py-2 text-sm mt-1" onClick={() => {
        const montoNum = Number(monto);
        if (!montoNum || montoNum <= 0) { setError("Captura un monto válido."); return; }
        onPagar({ monto: montoNum, fecha, proyectoId, solicitarFactura });
      }}>
        Registrar pago
      </button>
    </div>
  );
}
