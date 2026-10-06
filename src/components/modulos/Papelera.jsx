// src/components/modulos/Papelera.jsx
//
// Modulo perezoso (Fase 2). Salio de App.jsx el 5 oct 2026; se mudaron con el sus propias
// piezas (fetchPapelera), que nadie mas usaba.

import { AlertTriangle } from "lucide-react";
import { Badge } from "../ui/basicos";
import { ETIQUETA_TABLA, TABLES, fromRow, labelFor, tableName } from "../../lib/datos";
import { supabase } from "../../supabaseClient";
import { useEffect, useState } from "react";

async function fetchPapelera(ownerId) {
  const entries = await Promise.all(TABLES.map(async (key) => {
    const { data, error } = await supabase.from(tableName(key)).select("*").eq("user_id", ownerId).not("deleted_at", "is", null).order("deleted_at", { ascending: false });
    if (error) { console.error(`Error al leer papelera de ${tableName(key)}:`, error); return [key, []]; }
    return [key, data.map((row) => fromRow(key, row))];
  }));
  return Object.fromEntries(entries);
}

export default function Papelera({ onRestore, onPermanentDelete, ownerId }) {
  const [items, setItems] = useState(null); // null = cargando
  const [busyId, setBusyId] = useState(null);
  const [confirmarBorrar, setConfirmarBorrar] = useState(null); // { key, id, label }

  const cargar = async () => {
    setItems(null);
    const resultado = await fetchPapelera(ownerId);
    const plano = [];
    for (const key of TABLES) {
      for (const item of resultado[key] || []) {
        plano.push({ key, item });
      }
    }
    plano.sort((a, b) => (b.item.deletedAt || "").localeCompare(a.item.deletedAt || ""));
    setItems(plano);
  };

  useEffect(() => { cargar(); }, []);

  const restaurar = async (key, id) => {
    setBusyId(id);
    const ok = await onRestore(key, id);
    if (ok) setItems((prev) => prev.filter((x) => x.item.id !== id));
    setBusyId(null);
  };

  const borrarDefinitivo = async () => {
    const { key, id } = confirmarBorrar;
    setBusyId(id);
    const ok = await onPermanentDelete(key, id);
    if (ok) setItems((prev) => prev.filter((x) => x.item.id !== id));
    setBusyId(null);
    setConfirmarBorrar(null);
  };

  return (
    <div>
      <h2 className="gp-serif text-2xl mb-1">Papelera</h2>
      <p className="text-sm gp-text-muted mb-6">Todo lo que has eliminado, de cualquier módulo. Puedes recuperarlo o borrarlo definitivamente.</p>

      {items === null && <p className="text-sm gp-text-muted">Cargando…</p>}

      {items !== null && items.length === 0 && (
        <p className="text-sm gp-text-muted">La papelera está vacía.</p>
      )}

      {items !== null && items.length > 0 && (
        <div className="space-y-2">
          {items.map(({ key, item }) => (
            <div key={`${key}-${item.id}`} className="gp-panel p-3 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge tone="muted">{ETIQUETA_TABLA[key] || key}</Badge>
                  <span className="text-sm truncate">{labelFor(key, item)}</span>
                </div>
                <p className="text-xs gp-text-muted mt-1">Eliminado el {item.deletedAt ? new Date(item.deletedAt).toLocaleString("es-MX") : "—"}</p>
              </div>
              <div className="flex gap-2 shrink-0">
                <button disabled={busyId === item.id} onClick={() => restaurar(key, item.id)} className="gp-btn-ghost px-3 py-1.5 text-xs">Restaurar</button>
                <button disabled={busyId === item.id} onClick={() => setConfirmarBorrar({ key, id: item.id, label: labelFor(key, item) })} className="px-3 py-1.5 text-xs rounded" style={{ background: "var(--red)", color: "#fff" }}>Borrar definitivo</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {confirmarBorrar && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,.6)" }} onClick={() => setConfirmarBorrar(null)}>
          <div className="gp-panel w-full max-w-sm p-5" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle size={16} className="gp-text-red" />
              <h3 className="gp-serif text-lg">¿Borrar para siempre?</h3>
            </div>
            <p className="text-sm gp-text-muted mb-5">"{confirmarBorrar.label}" se va a borrar por completo. Esto ya no se puede deshacer, ni siquiera desde la papelera.</p>
            <div className="flex gap-2">
              <button onClick={() => setConfirmarBorrar(null)} className="gp-btn-ghost flex-1 py-2 text-sm">Cancelar</button>
              <button onClick={borrarDefinitivo} className="flex-1 py-2 text-sm rounded" style={{ background: "var(--red)", color: "#fff" }}>Borrar para siempre</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
