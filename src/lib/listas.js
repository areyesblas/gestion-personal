// src/lib/listas.js
//
// Orden y busqueda de listas. Salio de App.jsx en la Fase 0 del corte por modulos (5 oct 2026).
// Aqui viven las reglas transversales de listas del Documento Maestro: orden alfabetico, busqueda
// por contenido y el ordenamiento por columna de los grids.
//
// Regla de este archivo: funciones PURAS, sin React y sin Supabase.

/* Todo catalogo que se muestre en un combo va en orden alfabetico (pedido de Angel, 29 sept 2026).

   "Otro"/"Otros" queda SIEMPRE al final aunque alfabéticamente caiga en medio — es el cajón de
   sastre, no una opción más, y siempre se busca al último.

   NO se ordenan alfabéticamente las listas que ya tienen un orden propio con significado, porque
   alfabetizarlas las rompería: los estatus (que son un pipeline: Idea -> Validación -> ... ->
   Archivado), las prioridades (Alta/Media/Baja), las frecuencias y todo lo cronológico (horas,
   duraciones, rangos de reporte, tipos de comida). Ahí el orden ES la información. */
// `get` permite ordenar una lista de objetos por el texto que de verdad se ve en pantalla (la
// etiqueta), no por su id interno: si el id es "Proveedor" pero el combo dice "Proveedores", lo
// que tiene que quedar alfabético es lo segundo.
export const ordenAlfabetico = (lista, get = (x) => x) => {
  const esCajonDeSastre = (x) => /^otros?$/i.test(String(x).trim());
  return [...lista].sort((a, b) => {
    const ka = String(get(a)), kb = String(get(b));
    if (esCajonDeSastre(ka) !== esCajonDeSastre(kb)) return esCajonDeSastre(ka) ? 1 : -1;
    return ka.localeCompare(kb, "es");
  });
};

// Todo combo que liste registros de OTRA entidad (proyectos, contactos, colaboradores, tareas…)
// va en orden alfabético (pedido de Angel, 29 sept 2026: "revisar en todos los combos que traigan
// información de otras entidades"). Los catálogos fijos ya se ordenan en su propia definición con
// ordenAlfabetico(), y los pipelines —estatus de proyecto, de tarea— conservan su orden a
// propósito: ahí el orden ES información.
export const compararEs = (a, b) => (a || "").toString().localeCompare((b || "").toString(), "es", { sensitivity: "base" });
export const ordenadosPorNombre = (lista) => [...(lista || [])].sort((a, b) => compararEs(a.nombre, b.nombre));
export const ordenadosPor = (lista, get) => [...(lista || [])].sort((a, b) => compararEs(get(a), get(b)));

// Quita acentos y pasa a minúsculas, para que buscar "cancion" también encuentre "canción".
export const normalizarTexto = (s) => (s || "").toString().toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

// Búsqueda por contenido (contiene, no solo empieza-con) e insensible a acentos, para el
// estándar transversal de listas (Documento Maestro v1.2, secc. 23.5/38). `getters` es un
// arreglo de funciones (item) => texto; basta que la búsqueda coincida con cualquiera de ellas.
export const filtrarPorBusqueda = (lista, query, getters) => {
  const q = normalizarTexto(query).trim();
  if (!q) return lista;
  return lista.filter((item) => getters.some((get) => normalizarTexto(get(item)).includes(q)));
};

export const PRIORIDAD_ORDEN = { Alta: 0, Media: 1, Baja: 2 };

/* Ordena una lista según una clave de criterio ("campo:tipo"), con nulls siempre al final. */
export function ordenarLista(lista, criterio, campos, dir = "asc") {
  if (!criterio || criterio === "default" || !campos[criterio]) return lista;
  const { get, tipo } = campos[criterio];
  const copia = [...lista];
  copia.sort((a, b) => {
    const va = get(a);
    const vb = get(b);
    const aVacio = va === null || va === undefined || va === "";
    const bVacio = vb === null || vb === undefined || vb === "";
    if (aVacio && bVacio) return 0;
    if (aVacio) return 1;
    if (bVacio) return -1;
    let r;
    if (tipo === "texto") r = String(va).localeCompare(String(vb), "es");
    else if (tipo === "prioridad") r = (PRIORIDAD_ORDEN[va] ?? 9) - (PRIORIDAD_ORDEN[vb] ?? 9);
    else r = va < vb ? -1 : va > vb ? 1 : 0;
    return dir === "desc" ? -r : r;
  });
  return copia;
}
