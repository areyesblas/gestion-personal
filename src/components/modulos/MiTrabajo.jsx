// src/components/modulos/MiTrabajo.jsx
//
// Modulo perezoso (Fase 2). Salio de App.jsx el 5 oct 2026; se mudaron con el sus propias
// piezas (ninguna), que nadie mas usaba.

import { Badge } from "../ui/basicos";
import { ESTATUS_TAREA } from "../../lib/catalogos";
import { daysUntil, fmtMoney } from "../../lib/formato";
import { supabase } from "../../supabaseClient";
import { tokenDeSesion } from "../../lib/sesion";
import { useEffect, useState } from "react";

// o una a la que cambiaste con el selector de cuentas), esta vista cruza TODAS las cuentas
// donde te hayan asignado algo — por eso consulta Supabase directo en vez de usar `data`.
export default function MiTrabajo({ misId }) {
  const [tareas, setTareas] = useState(null); // null = cargando
  const [proyectosPorId, setProyectosPorId] = useState({});
  const [enviando, setEnviando] = useState(null); // id de la tarea en la que se está procesando algo

  const cargar = async () => {
    const { data: rows } = await supabase.from("pendientes").select("*").eq("asignado_a", misId).is("deleted_at", null).order("fecha_limite", { ascending: true });
    setTareas(rows || []);
    const idsProyectos = [...new Set((rows || []).map((r) => r.proyecto_id).filter(Boolean))];
    if (idsProyectos.length) {
      const { data: proys } = await supabase.from("proyectos").select("id, nombre").in("id", idsProyectos);
      setProyectosPorId(Object.fromEntries((proys || []).map((p) => [p.id, p.nombre])));
    }
  };
  useEffect(() => { cargar(); }, [misId]);

  // Avisa por push al creador de la tarea (cuenta distinta a la mía) — no truena la UI si falla.
  const avisarCreador = async (tareaId, tipo) => {
    try {
      const token = await tokenDeSesion();
      await fetch(`${supabase.supabaseUrl}/functions/v1/notificar-respuesta-tarea`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ tareaId, tipo }),
      });
    } catch (err) {
      console.error("Error al avisar al creador:", err);
    }
  };

  const marcarEstatus = async (id, estatus) => {
    await supabase.from("pendientes").update({ estatus }).eq("id", id);
    setTareas((prev) => prev.map((t) => (t.id === id ? { ...t, estatus } : t)));
    const tarea = tareas.find((t) => t.id === id);
    if (estatus === "Completada" && tarea?.colaborador_contacto_id) avisarCreador(id, "completada");
  };

  const responder = async (id, respuesta) => {
    setEnviando(id);
    await supabase.from("pendientes").update({ estado_aceptacion: respuesta, respondida_en: new Date().toISOString() }).eq("id", id);
    setTareas((prev) => prev.map((t) => (t.id === id ? { ...t, estado_aceptacion: respuesta, respondida_en: new Date().toISOString() } : t)));
    await avisarCreador(id, respuesta);
    setEnviando(null);
  };

  const porConfirmar = (tareas || []).filter((t) => t.estado_aceptacion === "pendiente");
  const resto = (tareas || []).filter((t) => t.estado_aceptacion !== "pendiente");

  return (
    <div>
      <h2 className="gp-serif text-2xl mb-1">Mi trabajo</h2>
      <p className="text-sm gp-text-muted mb-6">Lo que te han asignado, sin importar de qué cuenta venga — aquí solo ves tus tareas, no el resto de la información de quien te las asignó.</p>

      {tareas === null && <p className="text-sm gp-text-muted">Cargando…</p>}
      {tareas && tareas.length === 0 && <p className="text-sm gp-text-muted">Nadie te ha asignado tareas todavía.</p>}

      {porConfirmar.length > 0 && (
        <div className="mb-6">
          <p className="text-xs gp-text-muted uppercase tracking-wide mb-2">Tareas por confirmar ({porConfirmar.length})</p>
          <div className="space-y-2">
            {porConfirmar.map((t) => (
              <div key={t.id} className="gp-panel p-4" style={{ borderColor: "var(--gold)" }}>
                <p className="text-sm font-medium">{t.descripcion}</p>
                <div className="flex flex-wrap gap-2 mt-1.5 mb-3">
                  {proyectosPorId[t.proyecto_id] && <Badge tone="gold">{proyectosPorId[t.proyecto_id]}</Badge>}
                  {Number(t.precio) > 0 && <span className="text-xs gp-mono gp-text-teal">{fmtMoney(t.precio)}</span>}
                  {t.fecha_pago_aprox && <span className="text-xs gp-text-muted">Pago aprox: {t.fecha_pago_aprox}</span>}
                </div>
                <div className="flex gap-2">
                  <button disabled={enviando === t.id} onClick={() => responder(t.id, "aceptada")} className="gp-btn flex-1 py-1.5 text-xs">Aceptar</button>
                  <button disabled={enviando === t.id} onClick={() => responder(t.id, "rechazada")} className="gp-btn-ghost flex-1 py-1.5 text-xs rounded">Rechazar</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-2">
        {resto.map((t) => {
          const vencido = t.estatus !== "Completada" && t.fecha_limite && daysUntil(t.fecha_limite) < 0;
          return (
            <div key={t.id} className="gp-panel p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium">{t.descripcion}</p>
                  <div className="flex flex-wrap gap-2 mt-1.5">
                    {proyectosPorId[t.proyecto_id] && <Badge tone="gold">{proyectosPorId[t.proyecto_id]}</Badge>}
                    {t.prioridad && <Badge tone={t.prioridad === "Alta" ? "red" : "muted"}>{t.prioridad}</Badge>}
                    {t.estado_aceptacion === "rechazada" && <Badge tone="red">Rechazada por ti</Badge>}
                    {t.fecha_limite && <span className="gp-mono text-xs" style={{ color: vencido ? "var(--red)" : "var(--muted)" }}>{t.fecha_limite}</span>}
                  </div>
                </div>
                <select className="gp-input shrink-0" style={{ width: 120, padding: "4px 8px" }} value={t.estatus} onChange={(e) => marcarEstatus(t.id, e.target.value)}>
                  {ESTATUS_TAREA.map((s) => <option key={s}>{s}</option>)}
                </select>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
