

/* Números de página a dibujar, con "…" cuando hay muchas (1 2 3 4 5 … 11), para no llenar la
   barra de paginación de botones. Devuelve números y la cadena "…" como separador. */
export function paginasVisibles(actual, total) {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  if (actual <= 4) return [1, 2, 3, 4, 5, "…", total];
  if (actual >= total - 3) return [1, "…", total - 4, total - 3, total - 2, total - 1, total];
  return [1, "…", actual - 1, actual, actual + 1, "…", total];
}
