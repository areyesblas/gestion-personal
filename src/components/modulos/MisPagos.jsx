// src/components/modulos/MisPagos.jsx
//
// Modulo perezoso (Fase 2). Salio de App.jsx el 5 oct 2026; se mudaron con el sus propias
// piezas (FolioFacturaForm), que nadie mas usaba.

import { Badge } from "../ui/basicos";
import { fmtMoney } from "../../lib/formato";
import { supabase } from "../../supabaseClient";
import { useEffect, useState } from "react";

// facturas que me piden por esos pagos. Nunca duplica Finanzas/Facturas del dueño — solo
// lee, vía RLS, las filas que me corresponden a mí.
export default function MisPagos({ misId, miEmail, misColaboraciones }) {
  const [tab, setTab] = useState("pagos");
  const [tareas, setTareas] = useState(null);
  const [pagos, setPagos] = useState(null);
  const [facturas, setFacturas] = useState(null);
  const [editando, setEditando] = useState(null); // factura en edición de folio

  const cargar = async () => {
    const { data: t } = await supabase.from("pendientes").select("*").eq("asignado_a", misId).is("deleted_at", null);
    setTareas(t || []);
    const { data: p } = await supabase.from("finanzas").select("*").eq("categoria", "Pago a colaborador").order("fecha", { ascending: false });
    setPagos(p || []);
    const { data: f } = await supabase.from("facturas").select("*").is("deleted_at", null).order("fecha", { ascending: false });
    setFacturas(f || []);
  };
  useEffect(() => { cargar(); }, [misId]);

  const nombreDueno = (userId) => misColaboraciones.find((c) => c.propietarioId === userId)?.propietarioEmail || "—";
  const ganado = (tareas || []).filter((t) => t.estado_aceptacion === "aceptada" || t.aceptada_por_creador).reduce((s, t) => s + (Number(t.precio) || 0), 0);
  const pagadoTotal = (pagos || []).reduce((s, p) => s + (Number(p.monto) || 0), 0);
  const saldo = Math.max(0, ganado - pagadoTotal);

  const guardarFolio = async (id, folio) => {
    await supabase.from("facturas").update({ folio, estatus: "Pendiente", notas: "Factura entregada por el colaborador." }).eq("id", id);
    setEditando(null);
    cargar();
  };

  return (
    <div>
      <h2 className="gp-serif text-2xl mb-1">Mis pagos</h2>
      <p className="text-sm gp-text-muted mb-6">Lo que has ganado y lo que ya te pagaron por tu trabajo, en todas las cuentas donde colaboras.</p>

      <div className="grid grid-cols-3 gap-2 mb-6">
        <div className="gp-panel p-3 text-center"><p className="text-xs gp-text-muted">Ganado</p><p className="gp-serif text-lg">{fmtMoney(ganado)}</p></div>
        <div className="gp-panel p-3 text-center"><p className="text-xs gp-text-muted">Pagado</p><p className="gp-serif text-lg gp-text-teal">{fmtMoney(pagadoTotal)}</p></div>
        <div className="gp-panel p-3 text-center"><p className="text-xs gp-text-muted">Saldo</p><p className="gp-serif text-lg gp-text-gold">{fmtMoney(saldo)}</p></div>
      </div>

      <div className="flex gap-1 mb-4">
        {[{ key: "pagos", label: "Pagos recibidos" }, { key: "facturas", label: "Facturas solicitadas" }].map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)} className={`text-xs px-3 py-1.5 rounded-full border ${tab === t.key ? "gp-btn" : "gp-text-muted"}`}>{t.label}</button>
        ))}
      </div>

      {tab === "pagos" && (
        <div className="space-y-2">
          {pagos === null && <p className="text-sm gp-text-muted">Cargando…</p>}
          {pagos && pagos.length === 0 && <p className="text-sm gp-text-muted">Todavía no te han registrado ningún pago.</p>}
          {(pagos || []).map((p) => (
            <div key={p.id} className="gp-panel p-3 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm">{p.concepto}</p>
                <p className="text-xs gp-text-muted">{nombreDueno(p.user_id)} · {p.fecha}</p>
              </div>
              <span className="gp-mono text-sm gp-text-teal shrink-0">{fmtMoney(p.monto)}</span>
            </div>
          ))}
        </div>
      )}

      {tab === "facturas" && (
        <div className="space-y-2">
          {facturas === null && <p className="text-sm gp-text-muted">Cargando…</p>}
          {facturas && facturas.length === 0 && <p className="text-sm gp-text-muted">No te han solicitado ninguna factura por ahora.</p>}
          {(facturas || []).map((f) => (
            <div key={f.id} className="gp-panel p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm">{f.concepto}</p>
                  <p className="text-xs gp-text-muted">{nombreDueno(f.user_id)} · {f.fecha} · {fmtMoney(f.total)}</p>
                  {f.folio && <p className="text-xs gp-text-teal mt-1">Folio entregado: {f.folio}</p>}
                </div>
                <Badge tone={f.folio ? "teal" : "gold"}>{f.folio ? "Entregada" : "Pendiente"}</Badge>
              </div>
              {editando === f.id ? (
                <FolioFacturaForm inicial={f.folio || ""} onCancel={() => setEditando(null)} onGuardar={(folio) => guardarFolio(f.id, folio)} />
              ) : (
                <button onClick={() => setEditando(f.id)} className="text-xs gp-text-gold mt-2">{f.folio ? "Editar folio" : "Entregar folio de factura"}</button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function FolioFacturaForm({ inicial, onGuardar, onCancel }) {
  const [folio, setFolio] = useState(inicial);
  return (
    <div className="flex gap-2 mt-2">
      <input className="gp-input flex-1" placeholder="Folio fiscal / UUID" value={folio} onChange={(e) => setFolio(e.target.value)} />
      <button onClick={() => folio.trim() && onGuardar(folio.trim())} className="gp-btn px-3 py-1.5 text-xs">Guardar</button>
      <button onClick={onCancel} className="gp-btn-ghost px-3 py-1.5 text-xs">Cancelar</button>
    </div>
  );
}
