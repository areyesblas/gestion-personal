import { COLOR_ESTATUS_PROYECTO, etiquetaEstatusProyecto } from "../../lib/catalogos";

export function BadgeEstatusProyecto({ estatus }) {
  const color = COLOR_ESTATUS_PROYECTO[estatus] || "#64748B";
  return <span className="gp-badge whitespace-nowrap" style={{ color, background: `${color}22` }}>{etiquetaEstatusProyecto(estatus)}</span>;
}
