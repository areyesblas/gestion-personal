// src/components/modulos/MisEmpresas.jsx
//
// Modulo perezoso (Fase 2). Salio de App.jsx el 5 oct 2026; se mudaron con el sus propias
// piezas (EmpresaForm), que nadie mas usaba.

import AvatarForm from "../comunes/AvatarForm";
import { BadgeEstatusProyecto } from "../comunes/proyectos";
import { BarraListaEstandar } from "../ui/tablas";
import { Building2, Pencil, Plus, Trash2 } from "lucide-react";
import { ESTATUS_TAREA_CERRADOS } from "../../lib/catalogos";
import { Field, IconBtn } from "../ui/basicos";
import { LogoEmpresa } from "../comunes/LogoEmpresa";
import { Modal } from "../ui/Modal";
import { exportarFilasExcel, exportarFilasPDF } from "../../lib/exportar";
import { filtrarPorBusqueda, ordenarLista } from "../../lib/listas";
import { supabase } from "../../supabaseClient";
import { uid } from "../../lib/formato";
import { useState } from "react";

// solo viven la empresa y su identidad. Sus proyectos, tareas, dinero, contactos y documentos

export default function MisEmpresas({ data, onAdd, onEdit, onRemove, onVerProyecto, onIrAVista }) {
  const [modal, setModal] = useState(null);
  const [busqueda, setBusqueda] = useState("");
  const empresas = data.empresas || [];

  const proyectosDe = (empresaId) => (data.proyectos || []).filter((p) => p.empresaId === empresaId);
  const tareasAbiertasDe = (empresaId) => {
    const ids = new Set(proyectosDe(empresaId).map((p) => p.id));
    return (data.pendientes || []).filter((t) => ids.has(t.proyectoId) && !ESTATUS_TAREA_CERRADOS.includes(t.estatus)).length;
  };

  const visibles = ordenarLista(
    filtrarPorBusqueda(empresas, busqueda, [(e) => e.nombre, (e) => e.descripcion]),
    "alfabetico", { alfabetico: { get: (e) => e.nombre, tipo: "texto" } }
  );
  const columnasExport = [
    { label: "Nombre", get: (e) => e.nombre },
    { label: "Descripción", get: (e) => e.descripcion || "" },
    { label: "Proyectos", get: (e) => proyectosDe(e.id).length },
  ];

  return (
    <div>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-1">
        <h2 className="gp-serif text-2xl">Mis empresas</h2>
        <button onClick={() => setModal({ item: { nombre: "", descripcion: "", logoUrl: "" } })} className="gp-btn flex items-center justify-center gap-1 px-3 py-1.5 text-sm w-full sm:w-auto"><Plus size={14} /> Nueva empresa</button>
      </div>
      <p className="text-sm gp-text-muted mb-3">
        Las empresas que administras. Sus proyectos, tareas y dinero viven en sus módulos de siempre — aquí se relacionan, no se duplican.
      </p>

      <BarraListaEstandar busqueda={busqueda} onBusqueda={setBusqueda} placeholder="Buscar empresa por nombre o descripción…"
        onExportExcel={() => exportarFilasExcel(visibles, columnasExport, "empresas")}
        onExportPDF={() => exportarFilasPDF(visibles, columnasExport, "empresas", "Mis empresas", busqueda ? `búsqueda: "${busqueda}"` : "")} />

      {visibles.length === 0 ? (
        <div className="gp-panel p-8 text-center">
          <Building2 size={28} className="gp-text-muted mx-auto mb-3" />
          <p className="text-sm gp-text-muted">
            {empresas.length === 0
              ? "Todavía no registras ninguna empresa. Agrega la primera para poder ligarle proyectos."
              : "Ninguna empresa coincide con la búsqueda."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {visibles.map((e) => {
            const proys = proyectosDe(e.id);
            const abiertas = tareasAbiertasDe(e.id);
            return (
              <div key={e.id} className="gp-panel p-4">
                <div className="flex items-start gap-3">
                  <LogoEmpresa e={e} size={44} />
                  <div className="min-w-0 flex-1">
                    <p className="font-medium truncate">{e.nombre}</p>
                    {e.descripcion && <p className="text-xs gp-text-muted line-clamp-2 mt-0.5">{e.descripcion}</p>}
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <IconBtn title="Editar" onClick={() => setModal({ item: e })}><Pencil size={13} /></IconBtn>
                    <IconBtn title="Eliminar" onClick={() => onRemove(e.id)}><Trash2 size={13} /></IconBtn>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 mt-3">
                  <div className="gp-bloque rounded-lg p-2.5">
                    <p className="text-[10px] gp-text-muted">Proyectos</p>
                    <p className="gp-serif text-lg">{proys.length}</p>
                  </div>
                  <div className="gp-bloque rounded-lg p-2.5">
                    <p className="text-[10px] gp-text-muted">Tareas abiertas</p>
                    <p className="gp-serif text-lg">{abiertas}</p>
                  </div>
                </div>

                {proys.length > 0 && (
                  <div className="mt-3 pt-3 border-t gp-border flex flex-col gap-1.5">
                    {proys.slice(0, 3).map((p) => (
                      <button key={p.id} onClick={() => onVerProyecto(p.id)} className="flex items-center justify-between gap-2 w-full text-left">
                        <span className="text-xs truncate">{p.nombre}</span>
                        <BadgeEstatusProyecto estatus={p.estatus} />
                      </button>
                    ))}
                    {proys.length > 3 && (
                      <button onClick={() => onIrAVista("proyectos")} className="text-xs gp-text-gold text-left">Ver los {proys.length} proyectos →</button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {modal && (
        <Modal title={modal.item.id ? "Editar empresa" : "Nueva empresa"} onClose={() => setModal(null)}>
          <EmpresaForm item={modal.item} onSave={(v) => { modal.item.id ? onEdit(modal.item.id, v) : onAdd(v); setModal(null); }} />
        </Modal>
      )}
    </div>
  );
}

function EmpresaForm({ item, onSave }) {
  const [empresaId] = useState(() => item.id || uid());
  const [v, setV] = useState({ ...item, nombre: item.nombre || "", descripcion: item.descripcion || "", logoUrl: item.logoUrl || "" });
  const [error, setError] = useState("");
  return (
    <div>
      <div className="flex flex-col items-center mb-3">
        <AvatarForm
          avatarUrl={v.logoUrl}
          forma="cuadro"
          textoBoton="Elegir logo…"
          iconoVacio={<Building2 size={32} className="gp-text-muted" />}
          helpText="Logo de la empresa (opcional)."
          subirAvatar={async (file) => {
            const path = `empresas/${empresaId}/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
            const { error: upErr } = await supabase.storage.from("adjuntos").upload(path, file);
            if (upErr) return { error: upErr.message };
            const { data: pub } = supabase.storage.from("adjuntos").getPublicUrl(path);
            setV((prev) => ({ ...prev, logoUrl: pub.publicUrl }));
            return { url: pub.publicUrl };
          }}
        />
        {v.logoUrl && (
          <button type="button" onClick={() => setV({ ...v, logoUrl: "" })} className="text-xs gp-text-muted mt-2">Quitar logo</button>
        )}
      </div>
      <Field label="Nombre de la empresa"><input className="gp-input" autoFocus value={v.nombre} onChange={(e) => setV({ ...v, nombre: e.target.value })} /></Field>
      <Field label="Descripción (opcional)"><textarea className="gp-input" rows={2} value={v.descripcion} onChange={(e) => setV({ ...v, descripcion: e.target.value })} /></Field>
      {error && <p className="text-xs gp-text-red mb-2">{error}</p>}
      <button
        className="gp-btn w-full py-2 text-sm mt-2"
        onClick={() => {
          if (!v.nombre.trim()) { setError("El nombre de la empresa es obligatorio."); return; }
          setError("");
          onSave({ ...v, id: empresaId, nombre: v.nombre.trim() });
        }}
      >Guardar</button>
    </div>
  );
}
