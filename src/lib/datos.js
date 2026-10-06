

// Catálogo abierto de tags de Citas (Grupo C): junta los tags ya usados en todas las citas para
// sugerirlos en el combobox, sin imponer una lista fija — cualquiera puede escribir uno nuevo.
export const tagsUnicos = (citas) => [...new Set((citas || []).flatMap((c) => c.tags || []))].sort((a, b) => a.localeCompare(b));


export const camelToSnake = (s) => s.replace(/[A-Z]/g, (c) => "_" + c.toLowerCase());

export const snakeToCamel = (s) => s.replace(/_([a-z])/g, (_, c) => c.toUpperCase());

export function rowToJs(row) {
  const out = {};
  for (const [k, v] of Object.entries(row)) {
    out[snakeToCamel(k)] = v;
  }
  return out;
}
