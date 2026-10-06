// src/components/modulos/MiCalendario.jsx
//
// Modulo perezoso (Fase 2). Salio de App.jsx el 5 oct 2026; se mudaron con el sus propias
// piezas (ninguna), que nadie mas usaba.

import { Badge } from "../ui/basicos";
import { daysUntil } from "../../lib/formato";
import { supabase } from "../../supabaseClient";
import { useEffect, useState } from "react";

// auth.uid()). No duplica Agenda del dueño — es mi propio resumen de lo que tengo que
// hacer, venga de donde venga.
export default function MiCalendario({ misId }) {
  const [tareas, setTareas] = useState(null);
  const [proyectosPorId, setProyectosPorId] = useState({});

  useEffect(() => {
    (async () => {
      const { data: rows } = await supabase.from("pendientes").select("*").eq("asignado_a", misId).is("deleted_at", null).neq("estatus", "Completada").neq("estatus", "Cancelada").order("fecha_limite", { ascending: true });
      setTareas(rows || []);
      const idsProyectos = [...new Set((rows || []).map((r) => r.proyecto_id).filter(Boolean))];
      if (idsProyectos.length) {
        const { data: proys } = await supabase.from("proyectos").select("id, nombre").in("id", idsProyectos);
        setProyectosPorId(Object.fromEntries((proys || []).map((p) => [p.id, p.nombre])));
      }
    })();
  }, [misId]);

  // Desde la separación de fechas (migración 20261002) una tarea puede estar programada un día
  // distinto al de su entrega: aquí manda el día en que se va a HACER, que es de lo que sirve un
  // calendario. Si no está programada, se agrupa por su fecha límite, como siempre.
  const diaDe = (t) => t.fecha_programada || t.fecha_limite;
  const conFecha = (tareas || []).filter((t) => diaDe(t));
  const sinFecha = (tareas || []).filter((t) => !diaDe(t));
  const grupos = {};
  for (const t of conFecha) { (grupos[diaDe(t)] = grupos[diaDe(t)] || []).push(t); }
  const fechasOrdenadas = Object.keys(grupos).sort();

  const etiquetaFecha = (f) => {
    const dias = daysUntil(f);
    if (dias < 0) return `Vencida · ${f}`;
    if (dias === 0) return "Hoy";
    if (dias === 1) return "Mañana";
    return f;
  };

  return (
    <div>
      <h2 className="gp-serif text-2xl mb-1">Mi calendario</h2>
      <p className="text-sm gp-text-muted mb-6">Lo que tienes por delante en todas las cuentas donde colaboras, agrupado por fecha.</p>

      {tareas === null && <p className="text-sm gp-text-muted">Cargando…</p>}
      {tareas && tareas.length === 0 && <p className="text-sm gp-text-muted">No tienes nada pendiente con fecha por ahora.</p>}

      {fechasOrdenadas.map((f) => {
        const vencido = daysUntil(f) < 0;
        return (
          <div key={f} className="mb-5">
            <p className="text-xs uppercase tracking-wide mb-2" style={{ color: vencido ? "var(--red)" : "var(--muted)" }}>{etiquetaFecha(f)}</p>
            <div className="space-y-1.5">
              {grupos[f].map((t) => (
                <div key={t.id} className="gp-panel p-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm">{t.descripcion}</p>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {proyectosPorId[t.proyecto_id] && <Badge tone="gold">{proyectosPorId[t.proyecto_id]}</Badge>}
                      {t.prioridad && <Badge tone={t.prioridad === "Alta" ? "red" : "muted"}>{t.prioridad}</Badge>}
                      {t.fecha_programada && t.fecha_limite && t.fecha_programada !== t.fecha_limite && (
                        <span className="text-[10px] gp-text-muted">Vence {t.fecha_limite}</span>
                      )}
                    </div>
                  </div>
                  {t.hora_inicio && <span className="gp-mono text-xs gp-text-muted shrink-0">{String(t.hora_inicio).slice(0, 5)}</span>}
                </div>
              ))}
            </div>
          </div>
        );
      })}

      {sinFecha.length > 0 && (
        <div>
          <p className="text-xs gp-text-muted uppercase tracking-wide mb-2">Sin fecha</p>
          <div className="space-y-1.5">
            {sinFecha.map((t) => (
              <div key={t.id} className="gp-panel p-3">
                <p className="text-sm">{t.descripcion}</p>
                {proyectosPorId[t.proyecto_id] && <Badge tone="gold">{proyectosPorId[t.proyecto_id]}</Badge>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
