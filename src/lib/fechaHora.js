import { todayISO } from "../lib/formato";

/* ---------- Eventos (con fotos y videos) ---------- */
/* ---------- Citas (agenda ligera con hora y recordatorio push — distinta de Eventos/Actividades) ---------- */
export function fechaHoraALocalInputs(iso) {
  if (!iso) return { fecha: todayISO(), hora: "09:00" };
  const d = new Date(iso);
  const pad = (n) => String(n).padStart(2, "0");
  return { fecha: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`, hora: `${pad(d.getHours())}:${pad(d.getMinutes())}` };
}

export function localInputsAFechaHora(fecha, hora) {
  if (!fecha) return "";
  return new Date(`${fecha}T${hora || "09:00"}:00`).toISOString();
}

export function fmtFechaHora(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("es-MX", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit", hour12: true });
}
