

// un campo de varios valores (etiquetas) de uno solo (título). Devuelve cuántos cambió.
// Pasar `nuevo = null` borra.
async function editarValorCatalogo({ registros, campo, esLista, viejo, nuevo, onEditar }) {
  const afectados = (registros || []).filter((r) => (esLista ? (r[campo] || []).includes(viejo) : (r[campo] || "") === viejo));
  for (const r of afectados) {
    const valor = esLista
      ? (nuevo
          ? [...new Set((r[campo] || []).map((x) => (x === viejo ? nuevo : x)))]
          : (r[campo] || []).filter((x) => x !== viejo))
      : (nuevo || "");
    await onEditar(r.id, { [campo]: valor });
  }
  return afectados.length;
}

// Pregunta y ejecuta. Se usa igual en Contactos, Proyectos y Citas, para que administrar un
// catálogo se sienta igual en toda la app.
export function usarCatalogoEditable({ registros, campo, esLista, onEditar, nombreSingular }) {
  const cuantos = (viejo) => (registros || []).filter((r) => (esLista ? (r[campo] || []).includes(viejo) : (r[campo] || "") === viejo)).length;
  return {
    renombrar: async (viejo) => {
      const nuevo = window.prompt(`Renombrar "${viejo}". Se cambia en ${cuantos(viejo)} ficha(s).`, viejo);
      if (nuevo === null) return;
      const limpio = nuevo.trim();
      if (!limpio || limpio === viejo) return;
      await editarValorCatalogo({ registros, campo, esLista, viejo, nuevo: limpio, onEditar });
    },
    eliminar: async (viejo) => {
      const n = cuantos(viejo);
      if (!window.confirm(`Quitar ${nombreSingular} "${viejo}" de ${n} ficha(s). Esto no borra las fichas, solo les quita ese valor. ¿Continuar?`)) return;
      await editarValorCatalogo({ registros, campo, esLista, viejo, nuevo: null, onEditar });
    },
  };
}
