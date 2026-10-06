// src/lib/habitos.js
//
// Reglas de frecuencia de los habitos. Salio de App.jsx en la Fase 2 (6 oct 2026) porque lo
// comparten el modulo Habitos (perezoso) y el Dashboard (que no lo es).

export // ¿Este hábito "aplica" hoy según su frecuencia? (para el resumen del día — días específicos que no
// tocan hoy no cuentan como pendientes; diario y X veces por semana siempre se consideran vigentes).
const aplicaHoy = (h, hoyISO) => {
  if (h.frecuenciaTipo === "dias_semana") {
    const diaHoy = new Date(hoyISO + "T00:00:00").getDay();
    return (h.frecuenciaDiasSemana || []).includes(diaHoy);
  }
  return true;
};
