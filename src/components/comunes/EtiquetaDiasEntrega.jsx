import { daysUntil } from "../../lib/formato";

// cabeza (pedido de Angel, 29 sept 2026). Un proyecto ya cerrado no cuenta días: no le falta nada.
// Devuelve null cuando no hay nada que decir, para que quien lo use no dibuje un hueco.
export function diasParaEntrega(p) {
  if (!p.fechaFin) return null;
  if (p.estatus === "Finalizado" || p.estatus === "Archivado") return null;
  const d = daysUntil(p.fechaFin);
  if (d < 0) return { dias: d, texto: `Vencido por ${Math.abs(d)} día${Math.abs(d) === 1 ? "" : "s"}`, color: "var(--red)" };
  if (d === 0) return { dias: 0, texto: "Se entrega hoy", color: "var(--gold)" };
  if (d === 1) return { dias: 1, texto: "Falta 1 día", color: "var(--gold)" };
  return { dias: d, texto: `Faltan ${d} días`, color: d <= 7 ? "var(--gold)" : "var(--muted)" };
}

export function EtiquetaDiasEntrega({ p, className = "" }) {
  const info = diasParaEntrega(p);
  if (!info) return null;
  return <span className={`text-[11px] whitespace-nowrap ${className}`} style={{ color: info.color }}>{info.texto}</span>;
}
