import { montoBaseDe } from "../lib/formato";

export function rentabilidadProyecto(data, proyectoId) {
  const movs = data.finanzas.filter((f) => f.proyectoId === proyectoId && f.estatus === "Cobrado");
  const ingresos = movs.filter((f) => f.tipo === "Ingreso").reduce((s, f) => s + montoBaseDe(f), 0);
  const egresos = movs.filter((f) => f.tipo === "Egreso").reduce((s, f) => s + montoBaseDe(f), 0);
  const tareasProyecto = data.pendientes.filter((t) => t.proyectoId === proyectoId);
  const pagosColab = tareasProyecto
    .filter((t) => t.colaboradorContactoId && t.estatus === "Completada")
    .reduce((s, t) => s + (Number(t.precio) || 0), 0);
  // Cuánto costaría en total hacer el proyecto si se pagara TODO lo pactado en el precio de cada
  // tarea (sin importar si ya está hecha o quién la haga) — un estimado, no un movimiento real.
  const costoEstimadoTotal = tareasProyecto.reduce((s, t) => s + (Number(t.precio) || 0), 0);
  return { ingresos, egresos, pagosColab, neto: ingresos - egresos, costoEstimadoTotal };
}

// a un colaborador con Responsable asignado, o a ti mismo cuando la tarea no tiene responsable
// (si la haces tú, ese dinero es ingreso potencial tuyo, no un costo a pagarle a alguien más).
export function repartoCostosProyecto(data, proyectoId) {
  const tareas = data.pendientes.filter((t) => t.proyectoId === proyectoId && Number(t.precio) > 0);
  const grupos = {};
  for (const t of tareas) {
    const key = t.colaboradorContactoId || "_yo";
    if (!grupos[key]) {
      grupos[key] = {
        key,
        nombre: t.colaboradorContactoId ? (data.contactos.find((c) => c.id === t.colaboradorContactoId)?.nombre || "—") : "Tú",
        esYo: !t.colaboradorContactoId,
        tareas: 0, total: 0, generado: 0, pendiente: 0,
      };
    }
    const precio = Number(t.precio) || 0;
    grupos[key].tareas += 1;
    grupos[key].total += precio;
    if (t.estatus === "Completada") grupos[key].generado += precio; else grupos[key].pendiente += precio;
  }
  return Object.values(grupos).sort((a, b) => (a.esYo ? -1 : b.esYo ? 1 : a.nombre.localeCompare(b.nombre)));
}
