// Asistente de IA de ARKEYONE. Recibe un mensaje del usuario, revisa su limite mensual de
// consultas, carga su historial reciente de conversacion, y llama a Claude con herramientas
// de lectura (todos los modulos, sin restriccion por decision explicita del usuario -- ver
// nota de seguridad abajo) y de escritura sobre sus propios datos. El modelo decide que hacer
// (buscar algo, dar un consejo, crear una nota, registrar un avance, etc.) y esta funcion
// ejecuta esas acciones directo en Supabase, siempre con el user_id verificado del token --
// nunca con un id que el modelo pudiera inventar o que venga del cliente.
//
// NOTA DE SEGURIDAD: esta funcion corre con SERVICE_ROLE_KEY (server-side), por lo que
// buscar_datos y obtener_panorama pueden leer modulos sensibles (Finanzas, Salud, Diario)
// aunque el usuario no los haya desbloqueado con su contrasena en la app en ese momento --
// es una decision explicita del propio usuario (Angel), priorizando utilidad sobre friccion,
// tomada el 10 de septiembre de 2026.
import { createClient } from "jsr:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY")!;
const MODELO = "claude-haiku-4-5-20251001";
const MENSAJES_HISTORIAL = 24; // cuantos mensajes previos (usuario+asistente) se recargan como contexto

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const headersJson = { "Content-Type": "application/json", ...corsHeaders };

const uid = () => crypto.randomUUID();

// Normaliza texto para comparar sin importar acentos, mayusculas o espacios de sobra --
// "Café con Ana" y "cafe con ana" deben detectarse como el mismo texto.
function normalizarTexto(s: string | null | undefined) {
  return (s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}

// Revision generica anti-duplicados: antes de crear una entidad por nombre/descripcion
// (tareas, notas, proyectos, contactos, habitos, etc.), busca entre los registros no
// eliminados del usuario en esa tabla si ya existe algo muy parecido (coincidencia exacta
// normalizada, o uno contiene al otro). Si encuentra algo, devuelve ese registro para que
// quien llama decida si pregunta al usuario antes de insertar. No aplica a registros que
// se esperan repetidos por naturaleza (movimientos de finanzas, mediciones de salud, citas).
async function buscarPosibleDuplicado(tabla: string, campo: string, valor: string | undefined | null, userId: string, filtroExtra?: Record<string, any>) {
  const norm = normalizarTexto(valor);
  if (norm.length < 3) return null; // texto muy corto no es confiable para comparar
  let query = admin.from(tabla).select(`id, ${campo}`).eq("user_id", userId).is("deleted_at", null).limit(50);
  if (filtroExtra) {
    for (const [k, v] of Object.entries(filtroExtra)) {
      if (v !== undefined && v !== null) query = query.eq(k, v);
    }
  }
  const { data } = await query;
  if (!data) return null;
  for (const row of data as any[]) {
    const rowNorm = normalizarTexto(row[campo]);
    if (rowNorm && (rowNorm === norm || rowNorm.includes(norm) || norm.includes(rowNorm))) {
      return row;
    }
  }
  return null;
}

// La IA no sabe que dia es "hoy" por si sola -- si no se le dice explicitamente, puede inventar
// cualquier fecha al resolver referencias relativas ("manana", "el proximo lunes"). Esto calcula
// la fecha/hora real en horario de Mexico (no UTC, para evitar que cerca de medianoche calcule
// el dia equivocado) y se inyecta en el system prompt de cada mensaje, sin depender de que el
// modelo decida llamar obtener_panorama primero.
function fechaHoraActualMexico() {
  const ahora = new Date();
  const partesISO = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Mexico_City", year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(ahora);
  const iso = `${partesISO.find((p) => p.type === "year")!.value}-${partesISO.find((p) => p.type === "month")!.value}-${partesISO.find((p) => p.type === "day")!.value}`;
  const legible = new Intl.DateTimeFormat("es-MX", {
    timeZone: "America/Mexico_City", weekday: "long", year: "numeric", month: "long", day: "numeric",
  }).format(ahora);
  const hora = new Intl.DateTimeFormat("es-MX", {
    timeZone: "America/Mexico_City", hour: "2-digit", minute: "2-digit", hour12: false,
  }).format(ahora);
  return { iso, legible, hora };
}

const MODULOS_DISPONIBLES = [
  "proyectos", "pendientes", "notas", "finanzas", "citas", "contactos",
  "salud", "medicamentos", "habitos", "actividades", "documentos", "patrimonio",
  "activos", "apartados", "eventos", "campanas", "regalos", "metas", "facturas",
  "rutinas_ejercicio", "recetas", "equipo",
];

// --- CRUD genérico para módulos que no tienen (o no necesitan) una herramienta propia -------
// En vez de una herramienta "crear_X/actualizar_X/eliminar_X" por cada una de las ~34 tablas
// (eso serían ~70-90 herramientas — con un modelo rápido como Haiku, cuantas más herramientas
// se le mandan en cada llamada, más riesgo de que elija mal cuál usar, y más tokens/latencia en
// cada mensaje), se usan 3 herramientas genéricas dirigidas por esta configuración: qué tabla
// real corresponde a cada "modulo", qué campos se pueden tocar, y qué campo sirve de etiqueta
// legible en los mensajes de confirmación. Los módulos que YA tienen una herramienta dedicada
// con lógica propia (duplicados, confirmación por monto, etc.) se excluyen de crear/actualizar
// genérico para no abrir un segundo camino que se salte esa lógica -- eliminar_registro sí es
// universal porque siempre confirma antes de borrar, así que no hay nada que "saltarse".
const REGISTRO_CONFIG: Record<string, { tabla: string; campos: string[]; etiquetaCampo: string; checarDuplicado?: boolean }> = {
  proyectos: { tabla: "proyectos", campos: ["nombre", "categoria", "estatus", "modo", "monetizacion", "prioridad", "descripcion"], etiquetaCampo: "nombre" },
  pendientes: { tabla: "pendientes", campos: ["descripcion", "proyecto_id", "fecha_limite", "prioridad", "estatus"], etiquetaCampo: "descripcion" },
  equipo: { tabla: "equipo", campos: ["nombre", "whatsapp", "correo", "comentarios"], etiquetaCampo: "nombre", checarDuplicado: true },
  finanzas: { tabla: "finanzas", campos: ["tipo", "concepto", "monto", "fecha", "categoria", "estatus"], etiquetaCampo: "concepto" },
  actividades: { tabla: "actividades", campos: ["nombre", "notas", "fecha", "proyecto_id"], etiquetaCampo: "nombre" },
  activos: { tabla: "activos", campos: ["tipo", "nombre", "proyecto_id", "fecha_vencimiento", "costo_renovacion", "notas", "proveedor", "renovacion_automatica", "frecuencia_renovacion"], etiquetaCampo: "nombre", checarDuplicado: true },
  metas: { tabla: "metas", campos: ["descripcion", "proyecto_id", "fecha_objetivo", "fecha_revision", "prioridad", "estatus"], etiquetaCampo: "descripcion" },
  contactos: { tabla: "contactos", campos: ["nombre", "whatsapp", "correo", "tipos", "notas"], etiquetaCampo: "nombre" },
  redes_metricas: { tabla: "redes_metricas", campos: ["proyecto_id", "plataforma", "fecha", "seguidores", "alcance"], etiquetaCampo: "plataforma" },
  documentos: { tabla: "documentos", campos: ["tipo", "nombre", "proyecto_id", "fecha_vencimiento", "notas"], etiquetaCampo: "nombre" },
  habitos: { tabla: "habitos", campos: ["nombre", "frecuencia_tipo", "frecuencia_dias_semana", "frecuencia_veces_semana"], etiquetaCampo: "nombre" },
  salud: { tabla: "salud", campos: ["peso", "glucosa", "sistolica", "diastolica", "colesterol", "trigliceridos", "notas", "fecha", "contacto_id"], etiquetaCampo: "fecha" },
  apartados: { tabla: "apartados", campos: ["nombre", "monto_objetivo", "fecha_objetivo", "proyecto_id", "notas"], etiquetaCampo: "nombre" },
  eventos: { tabla: "eventos", campos: ["nombre", "fecha", "lugar", "horario", "contacto_id", "proyecto_id", "comentarios", "costo", "gastos"], etiquetaCampo: "nombre" },
  comentarios: { tabla: "comentarios", campos: ["texto"], etiquetaCampo: "texto" },
  regalos: { tabla: "regalos", campos: ["contacto_id", "tipo", "ocasion", "descripcion", "fecha", "costo", "estatus"], etiquetaCampo: "descripcion" },
  facturas: { tabla: "facturas", campos: ["tipo", "proyecto_id", "contacto_id", "folio", "fecha", "concepto", "subtotal", "iva", "total", "estatus", "notas"], etiquetaCampo: "concepto" },
  campanas: { tabla: "campanas", campos: ["proyecto_id", "nombre", "plataforma", "fecha_inicio", "fecha_fin", "presupuesto", "estatus", "notas"], etiquetaCampo: "nombre", checarDuplicado: true },
  campana_actividades: { tabla: "campana_actividades", campos: ["campana_id", "proyecto_id", "fecha", "hora", "canal", "tipo_contenido", "accion", "responsable_contacto_id", "prioridad", "tiempo_estimado_horas", "tiempo_real_horas", "estado", "notas"], etiquetaCampo: "accion" },
  patrimonio: { tabla: "patrimonio", campos: ["nombre", "categoria", "fecha_adquisicion", "valor_adquisicion", "notas"], etiquetaCampo: "nombre" },
  medicamentos: { tabla: "medicamentos", campos: ["nombre", "dosis", "contacto_id", "horarios", "dias_semana", "fecha_inicio", "fecha_fin", "instrucciones", "motivo", "medico", "via_administracion", "observaciones"], etiquetaCampo: "nombre" },
  citas: { tabla: "citas", campos: ["titulo", "fecha_hora", "lugar"], etiquetaCampo: "titulo" },
  notas: { tabla: "notas", campos: ["titulo", "contenido"], etiquetaCampo: "titulo" },
  rutinas_ejercicio: { tabla: "rutinas_ejercicio", campos: ["nombre", "fecha_inicio", "fecha_fin", "notas"], etiquetaCampo: "nombre" },
  rutina_ejercicio_items: { tabla: "rutina_ejercicio_items", campos: ["ejercicio", "tipo", "peso", "series", "repeticiones", "duracion_segundos", "descanso_segundos", "orden"], etiquetaCampo: "ejercicio" },
  sesiones_ejercicio: { tabla: "sesiones_ejercicio", campos: ["fecha", "hora", "notas"], etiquetaCampo: "fecha" },
  sesion_ejercicio_items: { tabla: "sesion_ejercicio_items", campos: ["ejercicio", "tipo", "peso", "series", "repeticiones", "duracion_segundos", "descanso_segundos", "hecho", "orden"], etiquetaCampo: "ejercicio" },
  medidas_corporales: { tabla: "medidas_corporales", campos: ["fecha", "cintura_cm", "cadera_cm", "pecho_cm", "biceps_cm", "muslo_cm", "pantorrilla_cm", "cuello_cm", "notas", "contacto_id"], etiquetaCampo: "fecha" },
  recetas: { tabla: "recetas", campos: ["nombre", "categoria", "porciones", "ingredientes", "instrucciones", "notas"], etiquetaCampo: "nombre", checarDuplicado: true },
  dieta_dias: { tabla: "dieta_dias", campos: ["fecha", "tipo_comida", "receta_id", "descripcion", "notas", "contacto_id"], etiquetaCampo: "tipo_comida" },
};
// Módulos SIN herramienta de creación propia -- solo estos usan crear_registro.
const SOLO_CREAR_GENERICO = new Set(["equipo", "redes_metricas", "activos", "campanas", "campana_actividades"]);
// Módulos con herramienta de actualizar propia y lógica especial (confirmación por monto en
// finanzas, etc.) -- se excluyen de actualizar_registro para no abrir un segundo camino sin esa
// validación.
const EXCLUIDOS_ACTUALIZAR_GENERICO = new Set(["finanzas", "pendientes", "proyectos", "citas"]);
const MODULOS_CREAR_GENERICO = [...SOLO_CREAR_GENERICO];
const MODULOS_ACTUALIZAR_GENERICO = Object.keys(REGISTRO_CONFIG).filter((m) => !EXCLUIDOS_ACTUALIZAR_GENERICO.has(m));
const MODULOS_ELIMINAR_GENERICO = Object.keys(REGISTRO_CONFIG);
function describirCampos(modulos: string[]) {
  return modulos.map((m) => `${m}: ${REGISTRO_CONFIG[m].campos.join(", ")}`).join(" | ");
}

const TOOLS = [
  {
    name: "buscar_datos",
    description: `Busca o LISTA informacion real y actual del usuario en cualquier modulo de ARKEYONE (${MODULOS_DISPONIBLES.join(", ")}). Usala en tres casos: (1) ANTES de crear o actualizar algo ligado a un registro existente, para obtener el id correcto -- nunca inventes un id; (2) cuando el usuario pregunte por el estado de algo que ya existe o crees haber creado (por ejemplo "por que no veo mi cita", "que tengo pendiente", "ya se guardo eso", "cuanto llevo ahorrado", "que hice ayer en mi diario") -- en ese caso SIEMPRE usa esta herramienta para revisar los datos reales antes de responder, en vez de decir que no puedes consultarlo; (3) cuando necesites contexto de un modulo especifico para dar un consejo puntual (ej. revisar habitos antes de sugerir uno nuevo). La busqueda de 'texto' ignora acentos/mayusculas y encuentra coincidencias aunque las palabras esten en otro orden (ej. 'reyes angel' encuentra 'Angel Reyes'). Si dejas 'texto' vacio, devuelve los registros mas recientes de ese modulo (para listar todo). "actividades" es el Diario personal (no confundir con tareas, que es "pendientes").`,
    input_schema: {
      type: "object",
      properties: {
        modulo: { type: "string", enum: MODULOS_DISPONIBLES },
        texto: { type: "string", description: "Texto a buscar en el campo principal del modulo (busqueda parcial, sin acentos, por palabras sueltas en cualquier orden). Dejalo vacio para listar los registros mas recientes de ese modulo sin filtrar." },
      },
      required: ["modulo"],
    },
  },
  {
    name: "obtener_panorama",
    description: "Trae un resumen cruzado y numerico del estado actual de la cuenta del usuario: tareas vencidas y proximas, saldo de finanzas del mes y deudas pendientes, habitos y su cumplimiento de hoy, ultima medicion de salud registrada, proyectos activos, y vencimientos proximos (documentos/activos/apartados/campanas) en los siguientes 7 dias. USA ESTA HERRAMIENTA cuando el usuario pida un consejo general, un resumen de como va, o cualquier pregunta abierta tipo 'como voy', 'dame un consejo', 'que deberia hacer hoy', 'como esta mi situacion' -- para responder con datos reales en vez de generalidades. No requiere parametros.",
    input_schema: { type: "object", properties: {} },
  },
  {
    name: "crear_nota",
    description: "Crea una nota libre en el modulo Notas. Si ya existe una nota muy parecida (mismo titulo/contenido), NO la crea: devuelve posible_duplicado=true. Solo si el usuario confirma que la quiere crear de todas formas, vuelve a llamarla con confirmado=true.",
    input_schema: {
      type: "object",
      properties: { titulo: { type: "string" }, contenido: { type: "string" }, confirmado: { type: "boolean" } },
      required: ["contenido"],
    },
  },
  {
    name: "crear_idea_proyecto",
    description: "Crea un nuevo proyecto con estatus 'Idea' en Proyectos e ideas. Si ya existe un proyecto con nombre muy parecido, NO lo crea: devuelve posible_duplicado=true. Solo si el usuario confirma, vuelve a llamarla con confirmado=true.",
    input_schema: {
      type: "object",
      properties: { nombre: { type: "string" }, descripcion: { type: "string" }, confirmado: { type: "boolean" } },
      required: ["nombre"],
    },
  },
  {
    name: "crear_pendiente",
    description: "Crea una tarea/pendiente, opcionalmente ligada a un proyecto (usa buscar_datos primero para obtener el proyecto_id exacto). Si ya existe una tarea con descripcion muy parecida, NO la crea: devuelve posible_duplicado=true. Solo si el usuario confirma, vuelve a llamarla con confirmado=true.",
    input_schema: {
      type: "object",
      properties: {
        descripcion: { type: "string" },
        proyecto_id: { type: "string" },
        fecha_limite: { type: "string", description: "Formato YYYY-MM-DD" },
        confirmado: { type: "boolean" },
      },
      required: ["descripcion"],
    },
  },
  {
    name: "registrar_avance_proyecto",
    description: "Registra una nota de avance en la bitacora de un proyecto existente (por ejemplo 'avance de 10%'). Usa buscar_datos primero para obtener el proyecto_id exacto.",
    input_schema: {
      type: "object",
      properties: {
        proyecto_id: { type: "string" },
        avance_porcentaje: { type: "number" },
        comentario: { type: "string" },
      },
      required: ["proyecto_id", "avance_porcentaje"],
    },
  },
  {
    name: "crear_movimiento",
    description: "Registra un ingreso o egreso en Finanzas.",
    input_schema: {
      type: "object",
      properties: {
        tipo: { type: "string", enum: ["Ingreso", "Egreso"] },
        concepto: { type: "string" },
        monto: { type: "number" },
        fecha: { type: "string", description: "Formato YYYY-MM-DD, si no se da se usa hoy." },
      },
      required: ["tipo", "concepto", "monto"],
    },
  },
  {
    name: "crear_cita",
    description: "Agenda una cita.",
    input_schema: {
      type: "object",
      properties: {
        titulo: { type: "string" },
        fecha_hora: { type: "string", description: "ISO 8601, ej. 2026-09-10T15:00:00" },
        lugar: { type: "string" },
      },
      required: ["titulo", "fecha_hora"],
    },
  },
  {
    name: "actualizar_pendiente",
    description: "Actualiza una tarea/pendiente existente: descripcion, fecha_limite, prioridad o estatus (incluye completar y cancelar). Usa buscar_datos primero para obtener el id exacto. Accion reversible, no requiere confirmacion.",
    input_schema: {
      type: "object",
      properties: {
        id: { type: "string" },
        descripcion: { type: "string" },
        fecha_limite: { type: "string", description: "YYYY-MM-DD" },
        prioridad: { type: "string", enum: ["Baja", "Media", "Alta"] },
        estatus: { type: "string", enum: ["Borrador", "No iniciada", "Pendiente", "En proceso", "En espera", "Completada", "Cancelada"] },
      },
      required: ["id"],
    },
  },
  {
    name: "eliminar_pendiente",
    description: "Elimina una tarea/pendiente (borrado logico, recuperable desde Papelera). ACCION QUE REQUIERE CONFIRMACION DEL USUARIO: llamala primero SIN 'confirmado' (o con confirmado=false) -- el sistema no borrara nada y te devolvera un mensaje de confirmacion que debes decirle al usuario tal cual, en texto, SIN llamar la herramienta de nuevo en ese mismo turno. Solo cuando el usuario responda que si en su siguiente mensaje, vuelve a llamar esta herramienta con confirmado=true.",
    input_schema: {
      type: "object",
      properties: { id: { type: "string" }, confirmado: { type: "boolean" } },
      required: ["id"],
    },
  },
  {
    name: "actualizar_movimiento",
    description: "Actualiza un movimiento de Finanzas (concepto, monto, fecha, categoria o estatus). Cambiar el monto o poner estatus=Cancelado es sensible y REQUIERE CONFIRMACION: llamala primero sin 'confirmado' -- el sistema no aplicara el cambio y te devolvera un mensaje para confirmar con el usuario en texto; solo despues de su 'si' vuelve a llamarla con confirmado=true. Cambios que NO tocan monto ni cancelan (ej. corregir el concepto o la fecha) se aplican directo sin pedir confirmado.",
    input_schema: {
      type: "object",
      properties: {
        id: { type: "string" }, concepto: { type: "string" }, monto: { type: "number" },
        fecha: { type: "string" }, categoria: { type: "string" }, estatus: { type: "string" },
        confirmado: { type: "boolean" },
      },
      required: ["id"],
    },
  },
  {
    name: "eliminar_movimiento",
    description: "Elimina un movimiento de Finanzas (borrado logico). ACCION DE IMPACTO ECONOMICO QUE REQUIERE CONFIRMACION: misma mecanica que eliminar_pendiente -- primero sin confirmado=true, repite el mensaje de confirmacion al usuario en texto, y solo tras su 'si' la vuelves a llamar con confirmado=true.",
    input_schema: {
      type: "object",
      properties: { id: { type: "string" }, confirmado: { type: "boolean" } },
      required: ["id"],
    },
  },
  {
    name: "actualizar_proyecto",
    description: "Actualiza un proyecto existente: nombre, estatus, categoria, prioridad o descripcion. Usa buscar_datos primero para el id. No requiere confirmacion.",
    input_schema: {
      type: "object",
      properties: {
        id: { type: "string" }, nombre: { type: "string" }, estatus: { type: "string" },
        categoria: { type: "string" }, prioridad: { type: "string" }, descripcion: { type: "string" },
      },
      required: ["id"],
    },
  },
  {
    name: "crear_contacto",
    description: "Crea un nuevo contacto. Si ya existe un contacto con nombre muy parecido, NO lo crea: devuelve posible_duplicado=true. Solo si el usuario confirma, vuelve a llamarla con confirmado=true.",
    input_schema: {
      type: "object",
      properties: {
        nombre: { type: "string" },
        whatsapp: { type: "string" },
        correo: { type: "string" },
        tipos: { type: "array", items: { type: "string" }, description: "Ej. ['Cliente'], ['Colaborador'], ['Familiar']. Si no se especifica se deja ['Otro']." },
        notas: { type: "string" },
        confirmado: { type: "boolean" },
      },
      required: ["nombre"],
    },
  },
  {
    name: "crear_atencion",
    description: "Registra una atencion (regalo, felicitacion, condolencia, agradecimiento) ligada a un contacto. Usa buscar_datos con modulo=contactos primero para obtener el contacto_id correcto.",
    input_schema: {
      type: "object",
      properties: {
        contacto_id: { type: "string" },
        tipo: { type: "string", enum: ["Regalo", "Felicitacion", "Condolencia", "Agradecimiento", "Otro"] },
        ocasion: { type: "string" },
        descripcion: { type: "string" },
        fecha: { type: "string", description: "YYYY-MM-DD" },
        costo: { type: "number" },
      },
      required: ["contacto_id", "descripcion"],
    },
  },
  {
    name: "crear_actividad",
    description: "Crea una entrada en el Diario personal del usuario (modulo 'actividades'): contar el dia, registrar que paso, que se hizo, o guardar un recuerdo. No confundir con tareas/pendientes. No requiere confirmacion.",
    input_schema: {
      type: "object",
      properties: {
        nombre: { type: "string", description: "Titulo breve de la entrada del diario." },
        notas: { type: "string", description: "El texto libre de la entrada: que paso, que se hizo, como se sintio." },
        fecha: { type: "string", description: "YYYY-MM-DD, si no se da se usa hoy." },
        proyecto_id: { type: "string", description: "Opcional, solo si la entrada esta ligada a un proyecto existente (usa buscar_datos primero)." },
      },
      required: ["nombre"],
    },
  },
  {
    name: "crear_medicion_salud",
    description: "Registra una medicion de salud (peso, glucosa, presion arterial, colesterol, trigliceridos) para el usuario o para una persona vinculada. Usa buscar_datos con modulo=contactos primero si la medicion es de un tercero. No requiere confirmacion.",
    input_schema: {
      type: "object",
      properties: {
        peso: { type: "number" },
        glucosa: { type: "number" },
        sistolica: { type: "number" },
        diastolica: { type: "number" },
        colesterol: { type: "number" },
        trigliceridos: { type: "number" },
        notas: { type: "string" },
        fecha: { type: "string", description: "YYYY-MM-DD, si no se da se usa hoy." },
        contacto_id: { type: "string", description: "Opcional, solo si es una persona vinculada (no el propio usuario)." },
      },
    },
  },
  {
    name: "crear_medicamento",
    description: "Registra un medicamento con su dosis, horarios y dias de toma, para el usuario o para una persona vinculada. Usa buscar_datos con modulo=contactos primero si es un tercero. Si esa persona ya tiene un medicamento con nombre muy parecido, NO lo crea: devuelve posible_duplicado=true. Solo si el usuario confirma, vuelve a llamarla con confirmado=true.",
    input_schema: {
      type: "object",
      properties: {
        nombre: { type: "string" },
        dosis: { type: "string" },
        contacto_id: { type: "string", description: "Opcional. Si no se da, el medicamento es para el propio usuario." },
        horarios: { type: "array", items: { type: "string" }, description: "Horas de toma en formato HH:MM, ej. ['08:00', '20:00']." },
        dias_semana: { type: "array", items: { type: "number" }, description: "Dias de la semana en que se toma, 0=domingo a 6=sabado. Si no se da, se asume todos los dias." },
        fecha_inicio: { type: "string", description: "YYYY-MM-DD, si no se da se usa hoy." },
        fecha_fin: { type: "string", description: "YYYY-MM-DD, opcional para tratamientos indefinidos." },
        instrucciones: { type: "string" },
        motivo: { type: "string" },
        medico: { type: "string" },
        via_administracion: { type: "string" },
        observaciones: { type: "string" },
        confirmado: { type: "boolean" },
      },
      required: ["nombre"],
    },
  },
  {
    name: "crear_habito",
    description: "Crea un nuevo habito con su frecuencia. Si ya existe un habito con nombre muy parecido, NO lo crea: devuelve posible_duplicado=true. Solo si el usuario confirma, vuelve a llamarla con confirmado=true.",
    input_schema: {
      type: "object",
      properties: {
        nombre: { type: "string" },
        frecuencia_tipo: { type: "string", enum: ["diario", "dias_semana", "veces_semana"], description: "Por defecto 'diario' (todos los dias)." },
        frecuencia_dias_semana: { type: "array", items: { type: "number" }, description: "Solo si frecuencia_tipo='dias_semana': dias 0=domingo a 6=sabado." },
        frecuencia_veces_semana: { type: "number", description: "Solo si frecuencia_tipo='veces_semana'." },
        confirmado: { type: "boolean" },
      },
      required: ["nombre"],
    },
  },
  {
    name: "marcar_habito_cumplido",
    description: "Marca (o desmarca) un habito como cumplido en una fecha, por defecto hoy. Usa buscar_datos con modulo=habitos primero para obtener el id exacto. No requiere confirmacion.",
    input_schema: {
      type: "object",
      properties: {
        id: { type: "string" },
        cumplido: { type: "boolean", description: "true para marcar cumplido (default), false para desmarcar." },
        fecha: { type: "string", description: "YYYY-MM-DD, si no se da se usa hoy." },
      },
      required: ["id"],
    },
  },
  {
    name: "crear_evento",
    description: "Crea un evento/show (expediente operativo: fecha, lugar, contacto, comentarios). Los montos (costo, ingreso, ganancia) NO se capturan aqui -- van en Finanzas y se relacionan por separado. Usa buscar_datos con modulo=contactos primero si aplica. Si ya existe un evento con nombre muy parecido, NO lo crea: devuelve posible_duplicado=true. Solo si el usuario confirma, vuelve a llamarla con confirmado=true.",
    input_schema: {
      type: "object",
      properties: {
        nombre: { type: "string" },
        fecha: { type: "string", description: "YYYY-MM-DD" },
        lugar: { type: "string" },
        horario: { type: "string" },
        contacto_id: { type: "string" },
        proyecto_id: { type: "string" },
        comentarios: { type: "string" },
        confirmado: { type: "boolean" },
      },
      required: ["nombre"],
    },
  },
  {
    name: "crear_patrimonio",
    description: "Registra un bien patrimonial (nombre, categoria, fecha y valor de adquisicion). El valor actual se calcula despues con valuaciones, no se captura aqui. Si ya existe un bien con nombre muy parecido, NO lo crea: devuelve posible_duplicado=true. Solo si el usuario confirma, vuelve a llamarla con confirmado=true.",
    input_schema: {
      type: "object",
      properties: {
        nombre: { type: "string" },
        categoria: { type: "string" },
        fecha_adquisicion: { type: "string", description: "YYYY-MM-DD" },
        valor_adquisicion: { type: "number" },
        notas: { type: "string" },
        confirmado: { type: "boolean" },
      },
      required: ["nombre"],
    },
  },
  {
    name: "crear_apartado",
    description: "Crea un apartado (meta de ahorro): nombre, monto objetivo, fecha objetivo. El monto ya ahorrado se calcula despues con transferencias, no se captura aqui. Si ya existe un apartado con nombre muy parecido, NO lo crea: devuelve posible_duplicado=true. Solo si el usuario confirma, vuelve a llamarla con confirmado=true.",
    input_schema: {
      type: "object",
      properties: {
        nombre: { type: "string" },
        monto_objetivo: { type: "number" },
        fecha_objetivo: { type: "string", description: "YYYY-MM-DD" },
        proyecto_id: { type: "string" },
        notas: { type: "string" },
        confirmado: { type: "boolean" },
      },
      required: ["nombre"],
    },
  },
  {
    name: "crear_meta",
    description: "Crea una meta (objetivo a lograr), opcionalmente ligada a un proyecto. Usa buscar_datos con modulo=proyectos primero si aplica. Si ya existe una meta con descripcion muy parecida, NO la crea: devuelve posible_duplicado=true. Solo si el usuario confirma, vuelve a llamarla con confirmado=true.",
    input_schema: {
      type: "object",
      properties: {
        descripcion: { type: "string" },
        proyecto_id: { type: "string" },
        fecha_objetivo: { type: "string", description: "YYYY-MM-DD" },
        fecha_revision: { type: "string", description: "YYYY-MM-DD" },
        prioridad: { type: "string", enum: ["Baja", "Media", "Alta"] },
        confirmado: { type: "boolean" },
      },
      required: ["descripcion"],
    },
  },
  {
    name: "actualizar_cita",
    description: "Reprograma o modifica una cita existente (titulo, fecha_hora, lugar). Usa buscar_datos primero para el id. No requiere confirmacion.",
    input_schema: {
      type: "object",
      properties: { id: { type: "string" }, titulo: { type: "string" }, fecha_hora: { type: "string" }, lugar: { type: "string" } },
      required: ["id"],
    },
  },
  {
    name: "cancelar_cita",
    description: "Cancela (elimina) una cita. ACCION QUE REQUIERE CONFIRMACION: misma mecanica que eliminar_pendiente -- primero sin confirmado=true, repite el mensaje de confirmacion al usuario en texto, y solo tras su 'si' la vuelves a llamar con confirmado=true.",
    input_schema: {
      type: "object",
      properties: { id: { type: "string" }, confirmado: { type: "boolean" } },
      required: ["id"],
    },
  },
  {
    name: "obtener_entrenamiento_hoy",
    description: "Trae de un vistazo el dia de hoy en Ejercicio y Nutricion: la rutina vigente (si hay una configurada para hoy, con su lista de ejercicios), la sesion de entrenamiento de hoy si ya se inicio (con cada ejercicio, su id, y si ya esta marcado como hecho -- esos ids se usan despues con marcar_ejercicio_hecho), y las comidas que ya se registraron para hoy. USA ESTA HERRAMIENTA para preguntas como 'que rutina tengo hoy', 'ya empece a entrenar', 'que ejercicios me faltan', 'que tengo de comer hoy'. No requiere parametros.",
    input_schema: { type: "object", properties: {} },
  },
  {
    name: "progreso_ejercicio",
    description: "Trae el historial de peso cargado de un ejercicio especifico (solo de sesiones donde ya quedo marcado como hecho), ordenado por fecha -- para responder 'como voy en press banca', 'cuanto le subi a la sentadilla', etc. Si el nombre no coincide exacto, intenta con el mas parecido de los que existan.",
    input_schema: {
      type: "object",
      properties: { nombre_ejercicio: { type: "string" } },
      required: ["nombre_ejercicio"],
    },
  },
  {
    name: "iniciar_sesion_ejercicio",
    description: "Inicia (o retoma si ya existe) la sesion de entrenamiento de HOY. Si se da nombre_rutina, busca esa rutina vigente del usuario (usa buscar_datos con modulo=rutinas_ejercicio primero si no estas seguro del nombre exacto) y precarga sus ejercicios; si no se da, es entrenamiento libre y empieza vacia. Si ya existe una sesion de hoy, la reutiliza en vez de crear otra -- nunca duplica. Devuelve los ejercicios de la sesion con sus ids.",
    input_schema: {
      type: "object",
      properties: { nombre_rutina: { type: "string", description: "Opcional -- nombre de una rutina vigente ya configurada. Si se omite, es entrenamiento libre." } },
    },
  },
  {
    name: "agregar_ejercicio_a_sesion_hoy",
    description: "Agrega un ejercicio a la sesion de entrenamiento de HOY (la crea si todavia no existe, como entrenamiento libre). Usa tipo='series' para peso/series/repeticiones (lo normal) o tipo='tiempo' para circuitos de trabajo/descanso en segundos (ej. 'un minuto de burpees, 30 segundos de descanso', tipico de circuitos estilo Planet Fitness). No requiere confirmacion.",
    input_schema: {
      type: "object",
      properties: {
        ejercicio: { type: "string" },
        tipo: { type: "string", enum: ["series", "tiempo"], description: "Por defecto 'series'." },
        peso: { type: "number", description: "Kg, aplica a ambos tipos." },
        series: { type: "number" },
        repeticiones: { type: "number" },
        duracion_segundos: { type: "number", description: "Solo si tipo='tiempo': segundos de trabajo." },
        descanso_segundos: { type: "number", description: "Solo si tipo='tiempo': segundos de descanso." },
      },
      required: ["ejercicio"],
    },
  },
  {
    name: "marcar_ejercicio_hecho",
    description: "Marca (o desmarca) como hecho un ejercicio de la sesion de hoy, y de paso puede actualizar lo realmente cargado ese dia (peso/series/repeticiones), por si fue distinto al plan. Usa obtener_entrenamiento_hoy o iniciar_sesion_ejercicio primero para obtener el id exacto del ejercicio dentro de la sesion -- nunca inventes un id. No requiere confirmacion.",
    input_schema: {
      type: "object",
      properties: {
        id: { type: "string", description: "Id del ejercicio DENTRO de la sesion de hoy (no el id de la rutina ni del ejercicio en general)." },
        hecho: { type: "boolean", description: "true para marcar hecho (default), false para desmarcar." },
        peso: { type: "number" },
        series: { type: "number" },
        repeticiones: { type: "number" },
      },
      required: ["id"],
    },
  },
  {
    name: "crear_rutina_ejercicio",
    description: "Crea una rutina de ejercicio completa con su lista de ejercicios (cada uno 'series' o 'tiempo', igual que en agregar_ejercicio_a_sesion_hoy). Si ya existe una rutina con nombre muy parecido, NO la crea: devuelve posible_duplicado=true. Solo si el usuario confirma, vuelve a llamarla con confirmado=true.",
    input_schema: {
      type: "object",
      properties: {
        nombre: { type: "string" },
        fecha_inicio: { type: "string", description: "YYYY-MM-DD, si no se da se usa hoy." },
        fecha_fin: { type: "string", description: "YYYY-MM-DD, opcional -- sin fecha de fin si se omite." },
        notas: { type: "string" },
        ejercicios: {
          type: "array",
          description: "Lista de ejercicios de la rutina, en el orden en que se hacen.",
          items: {
            type: "object",
            properties: {
              ejercicio: { type: "string" },
              tipo: { type: "string", enum: ["series", "tiempo"] },
              peso: { type: "number" },
              series: { type: "number" },
              repeticiones: { type: "number" },
              duracion_segundos: { type: "number" },
              descanso_segundos: { type: "number" },
            },
            required: ["ejercicio"],
          },
        },
        confirmado: { type: "boolean" },
      },
      required: ["nombre"],
    },
  },
  {
    name: "registrar_medida_corporal",
    description: "Registra medidas corporales (cintura, cadera, pecho, biceps, muslo, pantorrilla, cuello, en cm) para el usuario o una persona vinculada. Distinto de crear_medicion_salud, que es peso/glucosa/presion/colesterol/trigliceridos. Usa buscar_datos con modulo=contactos primero si es de un tercero. No requiere confirmacion.",
    input_schema: {
      type: "object",
      properties: {
        cintura_cm: { type: "number" },
        cadera_cm: { type: "number" },
        pecho_cm: { type: "number" },
        biceps_cm: { type: "number" },
        muslo_cm: { type: "number" },
        pantorrilla_cm: { type: "number" },
        cuello_cm: { type: "number" },
        notas: { type: "string" },
        fecha: { type: "string", description: "YYYY-MM-DD, si no se da se usa hoy." },
        contacto_id: { type: "string", description: "Opcional, solo si es una persona vinculada (no el propio usuario)." },
      },
    },
  },
  {
    name: "crear_receta",
    description: "Crea una receta en el recetario (compartido para toda la cuenta, no por persona): nombre, categoria (Desayuno/Comida/Cena/Snack), porciones, ingredientes e instrucciones de preparacion. Si ya existe una receta con nombre muy parecido, NO la crea: devuelve posible_duplicado=true. Solo si el usuario confirma, vuelve a llamarla con confirmado=true.",
    input_schema: {
      type: "object",
      properties: {
        nombre: { type: "string" },
        categoria: { type: "string", enum: ["Desayuno", "Comida", "Cena", "Snack"] },
        porciones: { type: "number" },
        ingredientes: {
          type: "array",
          items: {
            type: "object",
            properties: { nombre: { type: "string" }, cantidad: { type: "string" }, unidad: { type: "string" } },
            required: ["nombre"],
          },
        },
        instrucciones: { type: "string", description: "Pasos de preparacion." },
        notas: { type: "string" },
        confirmado: { type: "boolean" },
      },
      required: ["nombre"],
    },
  },
  {
    name: "registrar_comida",
    description: "Anota una comida del dia (Desayuno/Comida/Cena/Snack) para el usuario o una persona vinculada. Si nombre_receta coincide con una receta ya guardada, la vincula; si no, se guarda como texto libre en descripcion (ej. 'ensalada de atun' sin receta formal). No requiere confirmacion.",
    input_schema: {
      type: "object",
      properties: {
        tipo_comida: { type: "string", enum: ["Desayuno", "Comida", "Cena", "Snack"] },
        nombre_receta: { type: "string", description: "Opcional -- nombre de una receta ya guardada en el recetario." },
        descripcion: { type: "string", description: "Que se comio, si no viene de una receta guardada." },
        notas: { type: "string" },
        fecha: { type: "string", description: "YYYY-MM-DD, si no se da se usa hoy." },
        contacto_id: { type: "string", description: "Opcional, solo si es para una persona vinculada." },
      },
      required: ["tipo_comida"],
    },
  },
  {
    name: "crear_registro",
    description: `Crea un registro nuevo en un modulo que NO tiene herramienta propia de creacion (para los que si la tienen -- proyectos, tareas, finanzas, notas, contactos, citas, habitos, eventos, patrimonio, apartados, metas, medicamentos, regalos (via crear_atencion), rutinas de ejercicio, medidas corporales, recetas, comidas -- usa esa herramienta especifica en vez de esta, tienen validaciones propias). Campos disponibles por modulo: ${describirCampos(MODULOS_CREAR_GENERICO)}. Los campos que no mandes quedan vacios. equipo, activos y campanas revisan duplicados por nombre primero (mismo mecanismo que las demas herramientas crear_*): si devuelve posible_duplicado=true, no la repitas en el mismo turno.`,
    input_schema: {
      type: "object",
      properties: {
        modulo: { type: "string", enum: MODULOS_CREAR_GENERICO },
        campos: { type: "object", description: "Pares campo:valor a guardar -- solo los campos listados en la descripcion para ese modulo." },
        confirmado: { type: "boolean", description: "Solo relevante si ya se devolvio posible_duplicado=true antes." },
      },
      required: ["modulo", "campos"],
    },
  },
  {
    name: "actualizar_registro",
    description: `Actualiza campos de un registro existente por su id, en cualquier modulo SALVO finanzas/tareas/proyectos/citas (esos usan su propia herramienta: actualizar_movimiento, actualizar_pendiente, actualizar_proyecto, actualizar_cita -- tienen validaciones propias, como la confirmacion al cambiar un monto). Usa buscar_datos (o la herramienta de lectura correspondiente, ej. obtener_entrenamiento_hoy) primero para obtener el id exacto -- nunca inventes un id. Campos disponibles por modulo: ${describirCampos(MODULOS_ACTUALIZAR_GENERICO)}. No requiere confirmacion.`,
    input_schema: {
      type: "object",
      properties: {
        modulo: { type: "string", enum: MODULOS_ACTUALIZAR_GENERICO },
        id: { type: "string" },
        campos: { type: "object", description: "Pares campo:valor a cambiar -- solo los campos listados en la descripcion para ese modulo." },
      },
      required: ["modulo", "id", "campos"],
    },
  },
  {
    name: "eliminar_registro",
    description: `Elimina (borrado logico, recuperable desde Papelera) un registro por su id, en CUALQUIER modulo -- incluidos los que ya tienen su propia herramienta de eliminar (eliminar_pendiente, eliminar_movimiento, cancelar_cita funcionan igual de bien para esos, cualquiera de las dos formas sirve). ACCION QUE REQUIERE CONFIRMACION: llamala primero sin 'confirmado' -- no borrara nada y te regresara el mensaje de confirmacion para decirle al usuario tal cual, en texto, sin volver a llamar la herramienta en ese mismo turno; solo tras su 'si' en el siguiente mensaje, vuelve a llamarla con confirmado=true. Modulos validos: ${MODULOS_ELIMINAR_GENERICO.join(", ")}.`,
    input_schema: {
      type: "object",
      properties: {
        modulo: { type: "string", enum: MODULOS_ELIMINAR_GENERICO },
        id: { type: "string" },
        confirmado: { type: "boolean" },
      },
      required: ["modulo", "id"],
    },
  },
  {
    name: "aportar_apartado",
    description: "Aparta (transfiere) dinero hacia un Apartado (meta de ahorro) -- no es un gasto, es mover dinero a una 'bolsa' aparte, no toca Finanzas. Usa buscar_datos con modulo=apartados primero para obtener el id exacto. No requiere confirmacion.",
    input_schema: {
      type: "object",
      properties: { apartado_id: { type: "string" }, monto: { type: "number" } },
      required: ["apartado_id", "monto"],
    },
  },
  {
    name: "retirar_apartado",
    description: "Retira dinero de un Apartado. Si el dinero se libera hacia un proyecto o gasto concreto, tambien se refleja como Ingreso en Finanzas para dejar el rastro de a donde fue (regla maestra de dinero). Usa buscar_datos con modulo=apartados primero para el id. No requiere confirmacion.",
    input_schema: {
      type: "object",
      properties: {
        apartado_id: { type: "string" },
        monto: { type: "number" },
        concepto: { type: "string", description: "A donde fue el dinero, ej. 'gasto de renta'." },
        proyecto_id: { type: "string", description: "Opcional, si el retiro esta ligado a un proyecto." },
      },
      required: ["apartado_id", "monto", "concepto"],
    },
  },
  {
    name: "agregar_ejercicio_a_rutina",
    description: "Agrega un ejercicio a una rutina YA EXISTENTE -- a diferencia de crear_rutina_ejercicio, que arma una rutina completa de una vez. Usa buscar_datos con modulo=rutinas_ejercicio primero para el id de la rutina. No requiere confirmacion.",
    input_schema: {
      type: "object",
      properties: {
        rutina_id: { type: "string" },
        ejercicio: { type: "string" },
        tipo: { type: "string", enum: ["series", "tiempo"], description: "Por defecto 'series'." },
        peso: { type: "number" },
        series: { type: "number" },
        repeticiones: { type: "number" },
        duracion_segundos: { type: "number" },
        descanso_segundos: { type: "number" },
      },
      required: ["rutina_id", "ejercicio"],
    },
  },
  {
    name: "crear_comentario",
    description: "Agrega un comentario/nota de bitacora a cualquier entidad (proyecto, tarea, contacto, evento, etc.) -- distinto de registrar_avance_proyecto, que es especifico para bitacora de avance de proyectos. Usa buscar_datos primero para obtener el id exacto de la entidad. No requiere confirmacion.",
    input_schema: {
      type: "object",
      properties: {
        entidad_tipo: { type: "string", description: "Modulo de la entidad, ej. 'proyectos', 'pendientes', 'contactos', 'eventos'." },
        entidad_id: { type: "string" },
        texto: { type: "string" },
      },
      required: ["entidad_tipo", "entidad_id", "texto"],
    },
  },
  {
    name: "obtener_comentarios",
    description: "Trae los comentarios/bitacora guardados sobre una entidad especifica (proyecto, tarea, contacto, etc.), mas recientes primero.",
    input_schema: {
      type: "object",
      properties: { entidad_tipo: { type: "string" }, entidad_id: { type: "string" } },
      required: ["entidad_tipo", "entidad_id"],
    },
  },
  {
    name: "actualizar_estatura",
    description: "Guarda o actualiza la estatura (cm) del usuario o de una persona vinculada, usada para calcular el IMC en Salud. Usa buscar_datos con modulo=contactos primero si es de un tercero. No requiere confirmacion.",
    input_schema: {
      type: "object",
      properties: {
        altura_cm: { type: "number" },
        contacto_id: { type: "string", description: "Opcional, solo si es una persona vinculada." },
      },
      required: ["altura_cm"],
    },
  },
  {
    name: "obtener_medidas_corporales",
    description: "Trae el historial de medidas corporales (cintura, cadera, pecho, biceps, muslo, pantorrilla, cuello) del usuario o de una persona vinculada, mas recientes primero.",
    input_schema: {
      type: "object",
      properties: { contacto_id: { type: "string", description: "Opcional, solo si es de una persona vinculada." } },
    },
  },
  {
    name: "obtener_comidas",
    description: "Trae las comidas registradas en un rango de fechas (por defecto los ultimos 7 dias) para el usuario o una persona vinculada -- para preguntas como 'que comi el fin de semana' o 'que tengo planeado esta semana'. Para HOY especificamente, obtener_entrenamiento_hoy ya lo incluye.",
    input_schema: {
      type: "object",
      properties: {
        desde: { type: "string", description: "YYYY-MM-DD, por defecto hace 7 dias." },
        hasta: { type: "string", description: "YYYY-MM-DD, por defecto hoy." },
        contacto_id: { type: "string" },
      },
    },
  },
];

const SELECT_POR_MODULO: Record<string, string> = {
  proyectos: "id, nombre, estatus, categoria",
  pendientes: "id, descripcion, estatus, proyecto_id, fecha_limite",
  notas: "id, titulo, contenido",
  finanzas: "id, concepto, tipo, monto, fecha, estatus, categoria",
  citas: "id, titulo, fecha_hora, lugar",
  contactos: "id, nombre, whatsapp, correo, tipos",
  salud: "id, fecha, hora, peso, glucosa, sistolica, diastolica, colesterol, trigliceridos, notas",
  medicamentos: "id, nombre, dosis, activo, horarios, fecha_inicio, fecha_fin",
  habitos: "id, nombre, frecuencia_tipo",
  actividades: "id, nombre, fecha, notas", // Diario personal
  documentos: "id, nombre, tipo, fecha_vencimiento",
  patrimonio: "id, nombre, categoria, valor_adquisicion",
  activos: "id, nombre, tipo, fecha_vencimiento, costo_renovacion",
  apartados: "id, nombre, monto_objetivo, monto_actual, fecha_objetivo",
  eventos: "id, nombre, fecha, lugar, utilidad",
  campanas: "id, nombre, plataforma, estatus, fecha_inicio, fecha_fin",
  regalos: "id, descripcion, ocasion, fecha, estatus",
  metas: "id, descripcion, estatus, fecha_objetivo",
  facturas: "id, concepto, total, fecha, estatus",
  rutinas_ejercicio: "id, nombre, fecha_inicio, fecha_fin, notas",
  recetas: "id, nombre, categoria, porciones, instrucciones",
  equipo: "id, nombre, whatsapp, correo, comentarios",
};
const CAMPO_BUSQUEDA: Record<string, string> = {
  proyectos: "nombre", pendientes: "descripcion", notas: "titulo", finanzas: "concepto", citas: "titulo", contactos: "nombre",
  salud: "notas", medicamentos: "nombre", habitos: "nombre", actividades: "nombre", documentos: "nombre",
  patrimonio: "nombre", activos: "nombre", apartados: "nombre", eventos: "nombre", campanas: "nombre",
  regalos: "descripcion", metas: "descripcion", facturas: "concepto",
  rutinas_ejercicio: "nombre", recetas: "nombre", equipo: "nombre",
};

async function ejecutarHerramienta(nombre: string, input: any, userId: string) {
  switch (nombre) {
    case "buscar_datos": {
      const campo = CAMPO_BUSQUEDA[input.modulo];
      const cols = SELECT_POR_MODULO[input.modulo];
      if (!campo || !cols) return { error: "Modulo no valido." };
      const texto = (input.texto ?? "").trim();
      // Busqueda inteligente (RPC arkeyone_buscar_modulo): ignora acentos/mayusculas y hace match
      // si TODAS las palabras dichas aparecen en cualquier orden (antes usaba ilike '%texto%' tal
      // cual, que fallaba si faltaba un acento o si las palabras venian en otro orden). Con texto
      // vacio, la funcion SQL no filtra nada (equivalente a listar sin filtro).
      const { data, error } = await admin.rpc("arkeyone_buscar_modulo", {
        p_tabla: input.modulo, p_columna: campo, p_user_id: userId, p_texto: texto, p_limite: 10,
      });
      if (error) return { error: error.message };
      // La RPC regresa la fila completa (jsonb); se recorta aqui a las mismas columnas que antes
      // exponia SELECT_POR_MODULO, para no filtrar de mas al modelo.
      const columnasPermitidas = cols.split(",").map((c: string) => c.trim());
      const resultados = (data || []).map((fila: any) =>
        Object.fromEntries(columnasPermitidas.map((c: string) => [c, fila[c]]))
      );
      return { resultados };
    }
    case "obtener_panorama": {
      const hoy = fechaHoraActualMexico().iso;
      const en7dias = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);
      const inicioMes = hoy.slice(0, 7) + "-01";

      const [tareasVencidas, tareasProximas, mesFinanzas, deudas, habitos, ultimaSalud, proyectosActivos, vencDocumentos, vencActivos, vencApartados, ultimoDiario] = await Promise.all([
        admin.from("pendientes").select("id, descripcion, fecha_limite").eq("user_id", userId).is("deleted_at", null).neq("estatus", "Completada").neq("estatus", "Cancelada").lt("fecha_limite", hoy),
        admin.from("pendientes").select("id, descripcion, fecha_limite").eq("user_id", userId).is("deleted_at", null).neq("estatus", "Completada").neq("estatus", "Cancelada").gte("fecha_limite", hoy).lte("fecha_limite", en7dias),
        admin.from("finanzas").select("tipo, monto").eq("user_id", userId).is("deleted_at", null).gte("fecha", inicioMes).lte("fecha", hoy).neq("estatus", "Cancelado"),
        admin.from("finanzas").select("concepto, monto, fecha_vencimiento").eq("user_id", userId).is("deleted_at", null).eq("tipo", "Egreso").eq("es_recurrente", false).in("estatus", ["Pendiente", "Parcial"]),
        admin.from("habitos").select("id, nombre, fechas").eq("user_id", userId).is("deleted_at", null),
        admin.from("salud").select("fecha, peso, glucosa, sistolica, diastolica").eq("user_id", userId).is("deleted_at", null).order("fecha", { ascending: false }).limit(1),
        admin.from("proyectos").select("id", { count: "exact", head: true }).eq("user_id", userId).is("deleted_at", null).in("estatus", ["Activo", "En desarrollo"]),
        admin.from("documentos").select("nombre, fecha_vencimiento").eq("user_id", userId).is("deleted_at", null).gte("fecha_vencimiento", hoy).lte("fecha_vencimiento", en7dias),
        admin.from("activos").select("nombre, fecha_vencimiento").eq("user_id", userId).is("deleted_at", null).gte("fecha_vencimiento", hoy).lte("fecha_vencimiento", en7dias),
        admin.from("apartados").select("nombre, fecha_objetivo").eq("user_id", userId).is("deleted_at", null).gte("fecha_objetivo", hoy).lte("fecha_objetivo", en7dias),
        admin.from("actividades").select("fecha, nombre").eq("user_id", userId).is("deleted_at", null).order("fecha", { ascending: false }).limit(1),
      ]);

      const ingresosMes = (mesFinanzas.data || []).filter((f: any) => f.tipo === "Ingreso").reduce((s: number, f: any) => s + (Number(f.monto) || 0), 0);
      const egresosMes = (mesFinanzas.data || []).filter((f: any) => f.tipo === "Egreso").reduce((s: number, f: any) => s + (Number(f.monto) || 0), 0);
      const totalDeudas = (deudas.data || []).reduce((s: number, d: any) => s + (Number(d.monto) || 0), 0);

      const hoyIdx = new Date().getDay(); // 0=domingo
      const habitosResumen = (habitos.data || []).map((h: any) => ({ nombre: h.nombre, cumplido_hoy: Array.isArray(h.fechas) && h.fechas.includes(hoy) }));

      return {
        fecha_hoy: hoy,
        tareas_vencidas: (tareasVencidas.data || []).map((t: any) => ({ descripcion: t.descripcion, fecha_limite: t.fecha_limite })),
        tareas_proximos_7_dias: (tareasProximas.data || []).map((t: any) => ({ descripcion: t.descripcion, fecha_limite: t.fecha_limite })),
        finanzas_mes_actual: { ingresos: ingresosMes, egresos: egresosMes, balance: ingresosMes - egresosMes },
        deudas_pendientes: { total: totalDeudas, detalle: (deudas.data || []).slice(0, 5) },
        habitos_hoy: habitosResumen,
        ultima_medicion_salud: ultimaSalud.data?.[0] || null,
        proyectos_activos: proyectosActivos.count ?? 0,
        vencimientos_proximos_7_dias: {
          documentos: (vencDocumentos.data || []).map((d: any) => d.nombre),
          activos_digitales: (vencActivos.data || []).map((a: any) => a.nombre),
          apartados: (vencApartados.data || []).map((a: any) => a.nombre),
        },
        ultima_entrada_diario: ultimoDiario.data?.[0] || null,
      };
    }
    case "crear_nota": {
      const campoComparar = input.titulo ? "titulo" : "contenido";
      if (input.confirmado !== true) {
        const dup = await buscarPosibleDuplicado("notas", campoComparar, input[campoComparar], userId);
        if (dup) return { posible_duplicado: true, existente: dup, mensaje_para_usuario: `Ya tienes una nota parecida: "${dup[campoComparar]}". ¿La creo de todas formas o prefieres usar esa?` };
      }
      const row = { id: uid(), user_id: userId, titulo: input.titulo || null, contenido: input.contenido };
      const { error } = await admin.from("notas").insert(row);
      return error ? { error: error.message } : { ok: true, id: row.id };
    }
    case "crear_idea_proyecto": {
      if (input.confirmado !== true) {
        const dup = await buscarPosibleDuplicado("proyectos", "nombre", input.nombre, userId);
        if (dup) return { posible_duplicado: true, existente: dup, mensaje_para_usuario: `Ya tienes un proyecto llamado "${dup.nombre}". ¿Creo uno nuevo de todas formas o te refieres a ese?` };
      }
      const row = {
        id: uid(), user_id: userId, nombre: input.nombre, categoria: "Software", estatus: "Idea",
        modo: "Finito", monetizacion: "Dinero", prioridad: "Media", descripcion: input.descripcion || null,
        github_subido: false,
      };
      const { error } = await admin.from("proyectos").insert(row);
      return error ? { error: error.message } : { ok: true, id: row.id };
    }
    case "crear_pendiente": {
      if (input.confirmado !== true) {
        const dup = await buscarPosibleDuplicado("pendientes", "descripcion", input.descripcion, userId);
        if (dup) return { posible_duplicado: true, existente: dup, mensaje_para_usuario: `Ya tienes una tarea parecida: "${dup.descripcion}". ¿La creo de todas formas o te refieres a esa?` };
      }
      const row = {
        id: uid(), user_id: userId, descripcion: input.descripcion, proyecto_id: input.proyecto_id || null,
        fecha_limite: input.fecha_limite || null, estatus: "Pendiente", prioridad: "Media",
      };
      const { error } = await admin.from("pendientes").insert(row);
      return error ? { error: error.message } : { ok: true, id: row.id };
    }
    case "registrar_avance_proyecto": {
      const { data: proyecto } = await admin.from("proyectos").select("id").eq("id", input.proyecto_id).eq("user_id", userId).maybeSingle();
      if (!proyecto) return { error: "No se encontro ese proyecto (o no te pertenece). Usa buscar_datos primero." };
      const texto = `Avance: ${input.avance_porcentaje}%${input.comentario ? " \u2014 " + input.comentario : ""}`;
      const row = { id: uid(), user_id: userId, entidad_tipo: "proyecto", entidad_id: input.proyecto_id, texto };
      const { error } = await admin.from("comentarios").insert(row);
      return error ? { error: error.message } : { ok: true };
    }
    case "crear_movimiento": {
      const row = {
        id: uid(), user_id: userId, tipo: input.tipo, concepto: input.concepto, monto: input.monto,
        fecha: input.fecha || fechaHoraActualMexico().iso, estatus: "Cobrado",
      };
      const { error } = await admin.from("finanzas").insert(row);
      return error ? { error: error.message } : { ok: true, id: row.id };
    }
    case "crear_cita": {
      const row = { id: uid(), user_id: userId, titulo: input.titulo, fecha_hora: input.fecha_hora, lugar: input.lugar || null };
      const { error } = await admin.from("citas").insert(row);
      return error ? { error: error.message } : { ok: true, id: row.id };
    }
    case "actualizar_pendiente": {
      const { data: existente } = await admin.from("pendientes").select("id, descripcion").eq("id", input.id).eq("user_id", userId).maybeSingle();
      if (!existente) return { error: "No se encontro esa tarea (o no te pertenece). Usa buscar_datos primero." };
      const cambios: any = {};
      for (const campo of ["descripcion", "fecha_limite", "prioridad", "estatus"]) {
        if (input[campo] !== undefined) cambios[campo] = input[campo];
      }
      const { error } = await admin.from("pendientes").update(cambios).eq("id", input.id).eq("user_id", userId);
      return error ? { error: error.message } : { ok: true };
    }
    case "eliminar_pendiente": {
      const { data: existente } = await admin.from("pendientes").select("id, descripcion").eq("id", input.id).eq("user_id", userId).is("deleted_at", null).maybeSingle();
      if (!existente) return { error: "No se encontro esa tarea (o no te pertenece, o ya estaba eliminada)." };
      if (input.confirmado !== true) {
        return { requiere_confirmacion: true, mensaje_para_usuario: `¿Confirmas eliminar la tarea "${existente.descripcion}"?` };
      }
      const { error } = await admin.from("pendientes").update({ deleted_at: new Date().toISOString() }).eq("id", input.id).eq("user_id", userId);
      return error ? { error: error.message } : { ok: true };
    }
    case "actualizar_movimiento": {
      const { data: existente } = await admin.from("finanzas").select("id, concepto, monto, tipo").eq("id", input.id).eq("user_id", userId).maybeSingle();
      if (!existente) return { error: "No se encontro ese movimiento (o no te pertenece). Usa buscar_datos primero." };
      const tocaMonto = input.monto !== undefined && Number(input.monto) !== Number(existente.monto);
      const tocaCancelacion = input.estatus === "Cancelado";
      if ((tocaMonto || tocaCancelacion) && input.confirmado !== true) {
        const detalle = tocaMonto ? `cambiar el monto de "${existente.concepto}" de $${existente.monto} a $${input.monto}` : `cancelar el movimiento "${existente.concepto}" de $${existente.monto}`;
        return { requiere_confirmacion: true, mensaje_para_usuario: `¿Confirmas ${detalle}?` };
      }
      const cambios: any = {};
      for (const campo of ["concepto", "monto", "fecha", "categoria", "estatus"]) {
        if (input[campo] !== undefined) cambios[campo] = input[campo];
      }
      const { error } = await admin.from("finanzas").update(cambios).eq("id", input.id).eq("user_id", userId);
      return error ? { error: error.message } : { ok: true };
    }
    case "eliminar_movimiento": {
      const { data: existente } = await admin.from("finanzas").select("id, concepto, monto").eq("id", input.id).eq("user_id", userId).is("deleted_at", null).maybeSingle();
      if (!existente) return { error: "No se encontro ese movimiento (o no te pertenece, o ya estaba eliminado)." };
      if (input.confirmado !== true) {
        return { requiere_confirmacion: true, mensaje_para_usuario: `¿Confirmas eliminar el movimiento "${existente.concepto}" de $${existente.monto}?` };
      }
      const { error } = await admin.from("finanzas").update({ deleted_at: new Date().toISOString() }).eq("id", input.id).eq("user_id", userId);
      return error ? { error: error.message } : { ok: true };
    }
    case "actualizar_proyecto": {
      const { data: existente } = await admin.from("proyectos").select("id").eq("id", input.id).eq("user_id", userId).maybeSingle();
      if (!existente) return { error: "No se encontro ese proyecto (o no te pertenece). Usa buscar_datos primero." };
      const cambios: any = {};
      for (const campo of ["nombre", "estatus", "categoria", "prioridad", "descripcion"]) {
        if (input[campo] !== undefined) cambios[campo] = input[campo];
      }
      const { error } = await admin.from("proyectos").update(cambios).eq("id", input.id).eq("user_id", userId);
      return error ? { error: error.message } : { ok: true };
    }
    case "crear_contacto": {
      if (input.confirmado !== true) {
        const dup = await buscarPosibleDuplicado("contactos", "nombre", input.nombre, userId);
        if (dup) return { posible_duplicado: true, existente: dup, mensaje_para_usuario: `Ya tienes un contacto llamado "${dup.nombre}". ¿Creo uno nuevo de todas formas o te refieres a ese?` };
      }
      const row = {
        id: uid(), user_id: userId, nombre: input.nombre, whatsapp: input.whatsapp || null,
        correo: input.correo || null, tipos: input.tipos?.length ? input.tipos : ["Otro"], notas: input.notas || null,
      };
      const { error } = await admin.from("contactos").insert(row);
      return error ? { error: error.message } : { ok: true, id: row.id };
    }
    case "crear_atencion": {
      const { data: contacto } = await admin.from("contactos").select("id").eq("id", input.contacto_id).eq("user_id", userId).maybeSingle();
      if (!contacto) return { error: "No se encontro ese contacto (o no te pertenece). Usa buscar_datos con modulo=contactos primero." };
      const row = {
        id: uid(), user_id: userId, contacto_id: input.contacto_id, tipo: input.tipo || "Regalo",
        ocasion: input.ocasion || "Otro", descripcion: input.descripcion,
        fecha: input.fecha || fechaHoraActualMexico().iso, costo: input.costo ?? null,
      };
      const { error } = await admin.from("regalos").insert(row);
      return error ? { error: error.message } : { ok: true, id: row.id };
    }
    case "crear_actividad": {
      const row = {
        id: uid(), user_id: userId, nombre: input.nombre, notas: input.notas || null,
        fecha: input.fecha || fechaHoraActualMexico().iso, proyecto_id: input.proyecto_id || null,
      };
      const { error } = await admin.from("actividades").insert(row);
      return error ? { error: error.message } : { ok: true, id: row.id };
    }
    case "crear_medicion_salud": {
      const row: any = {
        id: uid(), user_id: userId, fecha: input.fecha || fechaHoraActualMexico().iso,
        hora: fechaHoraActualMexico().hora, origen: "rapido",
        peso: input.peso ?? null, glucosa: input.glucosa ?? null,
        sistolica: input.sistolica ?? null, diastolica: input.diastolica ?? null,
        colesterol: input.colesterol ?? null, trigliceridos: input.trigliceridos ?? null,
        notas: input.notas || null, contacto_id: input.contacto_id || null,
      };
      const { error } = await admin.from("salud").insert(row);
      return error ? { error: error.message } : { ok: true, id: row.id };
    }
    case "crear_medicamento": {
      if (input.confirmado !== true) {
        const dup = await buscarPosibleDuplicado("medicamentos", "nombre", input.nombre, userId, { contacto_id: input.contacto_id ?? null });
        if (dup) return { posible_duplicado: true, existente: dup, mensaje_para_usuario: `Ya existe un medicamento parecido registrado: "${dup.nombre}". ¿Lo creo de todas formas o te refieres a ese?` };
      }
      const row: any = { id: uid(), user_id: userId, nombre: input.nombre };
      if (input.dosis !== undefined) row.dosis = input.dosis;
      if (input.contacto_id !== undefined) row.contacto_id = input.contacto_id;
      if (input.horarios !== undefined) row.horarios = input.horarios;
      if (input.dias_semana !== undefined) row.dias_semana = input.dias_semana;
      if (input.fecha_inicio !== undefined) row.fecha_inicio = input.fecha_inicio;
      if (input.fecha_fin !== undefined) row.fecha_fin = input.fecha_fin;
      if (input.instrucciones !== undefined) row.instrucciones = input.instrucciones;
      if (input.motivo !== undefined) row.motivo = input.motivo;
      if (input.medico !== undefined) row.medico = input.medico;
      if (input.via_administracion !== undefined) row.via_administracion = input.via_administracion;
      if (input.observaciones !== undefined) row.observaciones = input.observaciones;
      const { error } = await admin.from("medicamentos").insert(row);
      return error ? { error: error.message } : { ok: true, id: row.id };
    }
    case "crear_habito": {
      if (input.confirmado !== true) {
        const dup = await buscarPosibleDuplicado("habitos", "nombre", input.nombre, userId);
        if (dup) return { posible_duplicado: true, existente: dup, mensaje_para_usuario: `Ya tienes un habito parecido: "${dup.nombre}". ¿Creo uno nuevo de todas formas o te refieres a ese?` };
      }
      const row: any = { id: uid(), user_id: userId, nombre: input.nombre, fechas: [], frecuencia_tipo: input.frecuencia_tipo || "diario" };
      if (input.frecuencia_dias_semana !== undefined) row.frecuencia_dias_semana = input.frecuencia_dias_semana;
      if (input.frecuencia_veces_semana !== undefined) row.frecuencia_veces_semana = input.frecuencia_veces_semana;
      const { error } = await admin.from("habitos").insert(row);
      return error ? { error: error.message } : { ok: true, id: row.id };
    }
    case "marcar_habito_cumplido": {
      const { data: habito } = await admin.from("habitos").select("id, fechas").eq("id", input.id).eq("user_id", userId).maybeSingle();
      if (!habito) return { error: "No se encontro ese habito (o no te pertenece). Usa buscar_datos primero." };
      const fecha = input.fecha || fechaHoraActualMexico().iso;
      const actuales: string[] = habito.fechas || [];
      const marcarCumplido = input.cumplido !== false;
      const nuevas = marcarCumplido
        ? (actuales.includes(fecha) ? actuales : [...actuales, fecha])
        : actuales.filter((f) => f !== fecha);
      const { error } = await admin.from("habitos").update({ fechas: nuevas }).eq("id", input.id).eq("user_id", userId);
      return error ? { error: error.message } : { ok: true };
    }
    case "crear_evento": {
      if (input.confirmado !== true) {
        const dup = await buscarPosibleDuplicado("eventos", "nombre", input.nombre, userId);
        if (dup) return { posible_duplicado: true, existente: dup, mensaje_para_usuario: `Ya tienes un evento parecido: "${dup.nombre}". ¿Creo uno nuevo de todas formas o te refieres a ese?` };
      }
      const row = {
        id: uid(), user_id: userId, nombre: input.nombre, fecha: input.fecha || null,
        lugar: input.lugar || null, horario: input.horario || null,
        contacto_id: input.contacto_id || null, proyecto_id: input.proyecto_id || null,
        comentarios: input.comentarios || null,
      };
      const { error } = await admin.from("eventos").insert(row);
      return error ? { error: error.message } : { ok: true, id: row.id };
    }
    case "crear_patrimonio": {
      if (input.confirmado !== true) {
        const dup = await buscarPosibleDuplicado("patrimonio", "nombre", input.nombre, userId);
        if (dup) return { posible_duplicado: true, existente: dup, mensaje_para_usuario: `Ya tienes un bien registrado parecido: "${dup.nombre}". ¿Lo creo de todas formas o te refieres a ese?` };
      }
      const row = {
        id: uid(), user_id: userId, nombre: input.nombre, categoria: input.categoria || "Otro",
        fecha_adquisicion: input.fecha_adquisicion || null, valor_adquisicion: input.valor_adquisicion ?? 0,
        notas: input.notas || null,
      };
      const { error } = await admin.from("patrimonio").insert(row);
      return error ? { error: error.message } : { ok: true, id: row.id };
    }
    case "crear_apartado": {
      if (input.confirmado !== true) {
        const dup = await buscarPosibleDuplicado("apartados", "nombre", input.nombre, userId);
        if (dup) return { posible_duplicado: true, existente: dup, mensaje_para_usuario: `Ya tienes un apartado parecido: "${dup.nombre}". ¿Creo uno nuevo de todas formas o te refieres a ese?` };
      }
      const row = {
        id: uid(), user_id: userId, nombre: input.nombre, monto_objetivo: input.monto_objetivo ?? null,
        fecha_objetivo: input.fecha_objetivo || null, proyecto_id: input.proyecto_id || null,
        notas: input.notas || null,
      };
      const { error } = await admin.from("apartados").insert(row);
      return error ? { error: error.message } : { ok: true, id: row.id };
    }
    case "crear_meta": {
      if (input.confirmado !== true) {
        const dup = await buscarPosibleDuplicado("metas", "descripcion", input.descripcion, userId);
        if (dup) return { posible_duplicado: true, existente: dup, mensaje_para_usuario: `Ya tienes una meta parecida: "${dup.descripcion}". ¿Creo una nueva de todas formas o te refieres a esa?` };
      }
      const row = {
        id: uid(), user_id: userId, descripcion: input.descripcion, proyecto_id: input.proyecto_id || null,
        fecha_objetivo: input.fecha_objetivo || null, fecha_revision: input.fecha_revision || null,
        prioridad: input.prioridad || "Media", estatus: "No iniciada",
      };
      const { error } = await admin.from("metas").insert(row);
      return error ? { error: error.message } : { ok: true, id: row.id };
    }
    case "actualizar_cita": {
      const { data: existente } = await admin.from("citas").select("id").eq("id", input.id).eq("user_id", userId).maybeSingle();
      if (!existente) return { error: "No se encontro esa cita (o no te pertenece). Usa buscar_datos primero." };
      const cambios: any = {};
      for (const campo of ["titulo", "fecha_hora", "lugar"]) {
        if (input[campo] !== undefined) cambios[campo] = input[campo];
      }
      const { error } = await admin.from("citas").update(cambios).eq("id", input.id).eq("user_id", userId);
      return error ? { error: error.message } : { ok: true };
    }
    case "cancelar_cita": {
      const { data: existente } = await admin.from("citas").select("id, titulo, fecha_hora").eq("id", input.id).eq("user_id", userId).is("deleted_at", null).maybeSingle();
      if (!existente) return { error: "No se encontro esa cita (o no te pertenece, o ya estaba cancelada)." };
      if (input.confirmado !== true) {
        return { requiere_confirmacion: true, mensaje_para_usuario: `¿Confirmas cancelar la cita "${existente.titulo}"?` };
      }
      const { error } = await admin.from("citas").update({ deleted_at: new Date().toISOString() }).eq("id", input.id).eq("user_id", userId);
      return error ? { error: error.message } : { ok: true };
    }
    case "obtener_entrenamiento_hoy": {
      const hoy = fechaHoraActualMexico().iso;
      const [rutinasResp, sesionResp, comidasResp, recetasResp] = await Promise.all([
        admin.from("rutinas_ejercicio").select("id, nombre, fecha_inicio, fecha_fin").eq("user_id", userId).is("deleted_at", null).is("contacto_id", null).lte("fecha_inicio", hoy),
        admin.from("sesiones_ejercicio").select("id, hora").eq("user_id", userId).is("deleted_at", null).is("contacto_id", null).eq("fecha", hoy).limit(1),
        admin.from("dieta_dias").select("tipo_comida, receta_id, descripcion").eq("user_id", userId).is("deleted_at", null).is("contacto_id", null).eq("fecha", hoy),
        admin.from("recetas").select("id, nombre").eq("user_id", userId).is("deleted_at", null),
      ]);
      const rutinaVigente = (rutinasResp.data || []).find((r: any) => !r.fecha_fin || r.fecha_fin >= hoy) || null;
      let ejerciciosRutina: any[] = [];
      if (rutinaVigente) {
        const { data } = await admin.from("rutina_ejercicio_items").select("ejercicio, tipo, peso, series, repeticiones, duracion_segundos, descanso_segundos").eq("rutina_id", rutinaVigente.id).is("deleted_at", null).order("orden");
        ejerciciosRutina = data || [];
      }
      const sesionHoy = (sesionResp.data || [])[0] || null;
      let ejerciciosSesion: any[] = [];
      if (sesionHoy) {
        const { data } = await admin.from("sesion_ejercicio_items").select("id, ejercicio, tipo, peso, series, repeticiones, duracion_segundos, descanso_segundos, hecho").eq("sesion_id", sesionHoy.id).is("deleted_at", null).order("orden");
        ejerciciosSesion = data || [];
      }
      const recetasPorId = Object.fromEntries((recetasResp.data || []).map((r: any) => [r.id, r.nombre]));
      const comidasHoy = (comidasResp.data || []).map((c: any) => ({
        tipo_comida: c.tipo_comida,
        que: c.receta_id ? (recetasPorId[c.receta_id] || "(receta)") : c.descripcion || null,
      }));
      return {
        rutina_vigente: rutinaVigente ? { nombre: rutinaVigente.nombre, ejercicios: ejerciciosRutina } : null,
        sesion_hoy: sesionHoy ? { hora: sesionHoy.hora, ejercicios: ejerciciosSesion } : null,
        comidas_hoy: comidasHoy,
      };
    }
    case "progreso_ejercicio": {
      const nombreBuscado = normalizarTexto(input.nombre_ejercicio);
      const { data: sesiones } = await admin.from("sesiones_ejercicio").select("id, fecha").eq("user_id", userId).is("deleted_at", null).is("contacto_id", null);
      const sesionesPorId = Object.fromEntries((sesiones || []).map((s: any) => [s.id, s.fecha]));
      const { data: items } = await admin.from("sesion_ejercicio_items").select("sesion_id, ejercicio, peso, hecho").eq("user_id", userId).is("deleted_at", null).eq("hecho", true);
      const coincidencias = (items || []).filter((it: any) => sesionesPorId[it.sesion_id] && normalizarTexto(it.ejercicio).includes(nombreBuscado));
      if (coincidencias.length === 0) return { historial: [], mensaje: "No hay ejercicios marcados como hechos con ese nombre." };
      const historial = coincidencias
        .map((it: any) => ({ fecha: sesionesPorId[it.sesion_id], ejercicio: it.ejercicio, peso: it.peso }))
        .sort((a: any, b: any) => String(a.fecha).localeCompare(String(b.fecha)));
      return { historial };
    }
    case "iniciar_sesion_ejercicio": {
      const hoy = fechaHoraActualMexico().iso;
      let rutina: any = null;
      if (input.nombre_rutina) {
        const nombreBuscado = normalizarTexto(input.nombre_rutina);
        const { data: rutinas } = await admin.from("rutinas_ejercicio").select("id, nombre, fecha_inicio, fecha_fin").eq("user_id", userId).is("deleted_at", null).is("contacto_id", null).lte("fecha_inicio", hoy);
        rutina = (rutinas || []).find((r: any) => (!r.fecha_fin || r.fecha_fin >= hoy) && normalizarTexto(r.nombre).includes(nombreBuscado)) || null;
        if (!rutina) return { error: `No se encontro una rutina vigente parecida a "${input.nombre_rutina}". Usa buscar_datos con modulo=rutinas_ejercicio para revisar los nombres exactos.` };
      }
      const { data: existentes } = await admin.from("sesiones_ejercicio").select("id").eq("user_id", userId).is("deleted_at", null).is("contacto_id", null).eq("fecha", hoy).limit(1);
      let sesionId = existentes?.[0]?.id;
      if (!sesionId) {
        sesionId = uid();
        const { error } = await admin.from("sesiones_ejercicio").insert({ id: sesionId, user_id: userId, contacto_id: null, rutina_id: rutina?.id || null, fecha: hoy, hora: fechaHoraActualMexico().hora });
        if (error) return { error: error.message };
        if (rutina) {
          const { data: itemsRutina } = await admin.from("rutina_ejercicio_items").select("*").eq("rutina_id", rutina.id).is("deleted_at", null).order("orden");
          for (const it of itemsRutina || []) {
            await admin.from("sesion_ejercicio_items").insert({
              id: uid(), user_id: userId, sesion_id: sesionId, rutina_item_id: it.id, ejercicio: it.ejercicio,
              tipo: it.tipo || "series", peso: it.peso, series: it.series, repeticiones: it.repeticiones,
              duracion_segundos: it.duracion_segundos, descanso_segundos: it.descanso_segundos, hecho: false, orden: it.orden,
            });
          }
        }
      }
      const { data: itemsSesion } = await admin.from("sesion_ejercicio_items").select("id, ejercicio, tipo, peso, series, repeticiones, duracion_segundos, descanso_segundos, hecho").eq("sesion_id", sesionId).is("deleted_at", null).order("orden");
      return { ok: true, sesion_id: sesionId, rutina: rutina?.nombre || null, ejercicios: itemsSesion || [] };
    }
    case "agregar_ejercicio_a_sesion_hoy": {
      const hoy = fechaHoraActualMexico().iso;
      const { data: existentes } = await admin.from("sesiones_ejercicio").select("id").eq("user_id", userId).is("deleted_at", null).is("contacto_id", null).eq("fecha", hoy).limit(1);
      let sesionId = existentes?.[0]?.id;
      if (!sesionId) {
        sesionId = uid();
        const { error } = await admin.from("sesiones_ejercicio").insert({ id: sesionId, user_id: userId, contacto_id: null, rutina_id: null, fecha: hoy, hora: fechaHoraActualMexico().hora });
        if (error) return { error: error.message };
      }
      const { count } = await admin.from("sesion_ejercicio_items").select("id", { count: "exact", head: true }).eq("sesion_id", sesionId).is("deleted_at", null);
      const row = {
        id: uid(), user_id: userId, sesion_id: sesionId, rutina_item_id: null, ejercicio: input.ejercicio,
        tipo: input.tipo || "series", peso: input.peso ?? null, series: input.series ?? null, repeticiones: input.repeticiones ?? null,
        duracion_segundos: input.duracion_segundos ?? null, descanso_segundos: input.descanso_segundos ?? null,
        hecho: false, orden: count || 0,
      };
      const { error } = await admin.from("sesion_ejercicio_items").insert(row);
      return error ? { error: error.message } : { ok: true, id: row.id, sesion_id: sesionId };
    }
    case "marcar_ejercicio_hecho": {
      const { data: existente } = await admin.from("sesion_ejercicio_items").select("id, ejercicio, sesion_id").eq("id", input.id).eq("user_id", userId).maybeSingle();
      if (!existente) return { error: "No se encontro ese ejercicio en ninguna sesion (o no te pertenece). Usa obtener_entrenamiento_hoy primero para conseguir el id correcto." };
      const cambios: any = { hecho: input.hecho !== false };
      for (const campo of ["peso", "series", "repeticiones"]) {
        if (input[campo] !== undefined) cambios[campo] = input[campo];
      }
      const { error } = await admin.from("sesion_ejercicio_items").update(cambios).eq("id", input.id).eq("user_id", userId);
      return error ? { error: error.message } : { ok: true };
    }
    case "crear_rutina_ejercicio": {
      if (input.confirmado !== true) {
        const dup = await buscarPosibleDuplicado("rutinas_ejercicio", "nombre", input.nombre, userId, { contacto_id: null });
        if (dup) return { posible_duplicado: true, existente: dup, mensaje_para_usuario: `Ya tienes una rutina parecida: "${dup.nombre}". ¿Creo una nueva de todas formas o te refieres a esa?` };
      }
      const rutinaId = uid();
      const row = {
        id: rutinaId, user_id: userId, contacto_id: null, nombre: input.nombre,
        fecha_inicio: input.fecha_inicio || fechaHoraActualMexico().iso, fecha_fin: input.fecha_fin || null, notas: input.notas || null,
      };
      const { error } = await admin.from("rutinas_ejercicio").insert(row);
      if (error) return { error: error.message };
      const ejercicios = Array.isArray(input.ejercicios) ? input.ejercicios : [];
      for (let i = 0; i < ejercicios.length; i++) {
        const ej = ejercicios[i];
        await admin.from("rutina_ejercicio_items").insert({
          id: uid(), user_id: userId, rutina_id: rutinaId, ejercicio: ej.ejercicio, tipo: ej.tipo || "series",
          peso: ej.peso ?? null, series: ej.series ?? null, repeticiones: ej.repeticiones ?? null,
          duracion_segundos: ej.duracion_segundos ?? null, descanso_segundos: ej.descanso_segundos ?? null, orden: i,
        });
      }
      return { ok: true, id: rutinaId, ejercicios_agregados: ejercicios.length };
    }
    case "registrar_medida_corporal": {
      const row: any = {
        id: uid(), user_id: userId, fecha: input.fecha || fechaHoraActualMexico().iso, contacto_id: input.contacto_id || null,
        cintura_cm: input.cintura_cm ?? null, cadera_cm: input.cadera_cm ?? null, pecho_cm: input.pecho_cm ?? null,
        biceps_cm: input.biceps_cm ?? null, muslo_cm: input.muslo_cm ?? null, pantorrilla_cm: input.pantorrilla_cm ?? null,
        cuello_cm: input.cuello_cm ?? null, notas: input.notas || null,
      };
      const { error } = await admin.from("medidas_corporales").insert(row);
      return error ? { error: error.message } : { ok: true, id: row.id };
    }
    case "crear_receta": {
      if (input.confirmado !== true) {
        const dup = await buscarPosibleDuplicado("recetas", "nombre", input.nombre, userId);
        if (dup) return { posible_duplicado: true, existente: dup, mensaje_para_usuario: `Ya tienes una receta parecida: "${dup.nombre}". ¿Creo una nueva de todas formas o te refieres a esa?` };
      }
      const row = {
        id: uid(), user_id: userId, nombre: input.nombre, categoria: input.categoria || null,
        porciones: input.porciones ?? null, ingredientes: Array.isArray(input.ingredientes) ? input.ingredientes : [],
        instrucciones: input.instrucciones || null, notas: input.notas || null,
      };
      const { error } = await admin.from("recetas").insert(row);
      return error ? { error: error.message } : { ok: true, id: row.id };
    }
    case "registrar_comida": {
      let recetaId: string | null = null;
      if (input.nombre_receta) {
        const nombreBuscado = normalizarTexto(input.nombre_receta);
        const { data: recetas } = await admin.from("recetas").select("id, nombre").eq("user_id", userId).is("deleted_at", null);
        const match = (recetas || []).find((r: any) => normalizarTexto(r.nombre) === nombreBuscado)
          || (recetas || []).find((r: any) => normalizarTexto(r.nombre).includes(nombreBuscado) || nombreBuscado.includes(normalizarTexto(r.nombre)));
        recetaId = match?.id || null;
      }
      const row = {
        id: uid(), user_id: userId, contacto_id: input.contacto_id || null,
        fecha: input.fecha || fechaHoraActualMexico().iso, tipo_comida: input.tipo_comida,
        receta_id: recetaId, descripcion: recetaId ? null : (input.descripcion || input.nombre_receta || null),
        notas: input.notas || null,
      };
      const { error } = await admin.from("dieta_dias").insert(row);
      return error ? { error: error.message } : { ok: true, id: row.id, receta_vinculada: !!recetaId };
    }
    case "crear_registro": {
      const cfg = REGISTRO_CONFIG[input.modulo];
      if (!cfg || !SOLO_CREAR_GENERICO.has(input.modulo)) return { error: "Modulo no valido para crear_registro -- usa la herramienta especifica de ese modulo, o este modulo no admite creacion por aqui." };
      if (cfg.checarDuplicado && input.confirmado !== true) {
        const dup = await buscarPosibleDuplicado(cfg.tabla, cfg.etiquetaCampo, input.campos?.[cfg.etiquetaCampo], userId);
        if (dup) return { posible_duplicado: true, existente: dup, mensaje_para_usuario: `Ya existe algo parecido en ${input.modulo}: "${dup[cfg.etiquetaCampo]}". ¿Lo creo de todas formas o te refieres a ese?` };
      }
      const row: any = { id: uid(), user_id: userId };
      for (const campo of cfg.campos) {
        if (input.campos && input.campos[campo] !== undefined) row[campo] = input.campos[campo];
      }
      const { error } = await admin.from(cfg.tabla).insert(row);
      return error ? { error: error.message } : { ok: true, id: row.id };
    }
    case "actualizar_registro": {
      const cfg = REGISTRO_CONFIG[input.modulo];
      if (!cfg || EXCLUIDOS_ACTUALIZAR_GENERICO.has(input.modulo)) return { error: "Modulo no valido para actualizar_registro -- usa la herramienta especifica de ese modulo (actualizar_movimiento, actualizar_pendiente, actualizar_proyecto o actualizar_cita)." };
      const { data: existente } = await admin.from(cfg.tabla).select("id").eq("id", input.id).eq("user_id", userId).maybeSingle();
      if (!existente) return { error: "No se encontro ese registro (o no te pertenece). Usa buscar_datos primero." };
      const cambios: any = {};
      for (const campo of cfg.campos) {
        if (input.campos && input.campos[campo] !== undefined) cambios[campo] = input.campos[campo];
      }
      if (Object.keys(cambios).length === 0) return { error: "No se especificaron campos validos para actualizar en ese modulo." };
      const { error } = await admin.from(cfg.tabla).update(cambios).eq("id", input.id).eq("user_id", userId);
      return error ? { error: error.message } : { ok: true };
    }
    case "eliminar_registro": {
      const cfg = REGISTRO_CONFIG[input.modulo];
      if (!cfg) return { error: "Modulo no valido para eliminar_registro." };
      const { data: existente } = await admin.from(cfg.tabla).select(`id, ${cfg.etiquetaCampo}`).eq("id", input.id).eq("user_id", userId).is("deleted_at", null).maybeSingle();
      if (!existente) return { error: "No se encontro ese registro (o no te pertenece, o ya estaba eliminado)." };
      if (input.confirmado !== true) {
        const etiqueta = (existente as any)[cfg.etiquetaCampo] || input.id;
        return { requiere_confirmacion: true, mensaje_para_usuario: `¿Confirmas eliminar "${etiqueta}" de ${input.modulo}?` };
      }
      const { error } = await admin.from(cfg.tabla).update({ deleted_at: new Date().toISOString() }).eq("id", input.id).eq("user_id", userId);
      return error ? { error: error.message } : { ok: true };
    }
    case "aportar_apartado": {
      const { data: apartado } = await admin.from("apartados").select("id, nombre, monto_actual").eq("id", input.apartado_id).eq("user_id", userId).is("deleted_at", null).maybeSingle();
      if (!apartado) return { error: "No se encontro ese apartado (o no te pertenece). Usa buscar_datos primero." };
      const nuevoMontoActual = (Number(apartado.monto_actual) || 0) + Number(input.monto);
      const { error: e1 } = await admin.from("apartados_movimientos").insert({
        id: uid(), user_id: userId, apartado_id: apartado.id, tipo: "aporte", monto: input.monto,
        fecha: fechaHoraActualMexico().iso, concepto: `Aporte a "${apartado.nombre}"`,
      });
      if (e1) return { error: e1.message };
      const { error: e2 } = await admin.from("apartados").update({ monto_actual: nuevoMontoActual }).eq("id", apartado.id).eq("user_id", userId);
      return e2 ? { error: e2.message } : { ok: true, monto_actual: nuevoMontoActual };
    }
    case "retirar_apartado": {
      const { data: apartado } = await admin.from("apartados").select("id, nombre, monto_actual").eq("id", input.apartado_id).eq("user_id", userId).is("deleted_at", null).maybeSingle();
      if (!apartado) return { error: "No se encontro ese apartado (o no te pertenece). Usa buscar_datos primero." };
      const nuevoMontoActual = (Number(apartado.monto_actual) || 0) - Number(input.monto);
      const hoy = fechaHoraActualMexico().iso;
      const { error: e1 } = await admin.from("apartados_movimientos").insert({
        id: uid(), user_id: userId, apartado_id: apartado.id, tipo: "retiro", monto: input.monto,
        fecha: hoy, concepto: input.concepto, proyecto_id: input.proyecto_id || null,
      });
      if (e1) return { error: e1.message };
      const { error: e2 } = await admin.from("apartados").update({ monto_actual: nuevoMontoActual }).eq("id", apartado.id).eq("user_id", userId);
      if (e2) return { error: e2.message };
      const { error: e3 } = await admin.from("finanzas").insert({
        id: uid(), user_id: userId, tipo: "Ingreso", concepto: input.concepto,
        monto: input.monto, fecha: hoy, estatus: "Cobrado",
      });
      return e3 ? { error: e3.message } : { ok: true, monto_actual: nuevoMontoActual };
    }
    case "agregar_ejercicio_a_rutina": {
      const { data: rutina } = await admin.from("rutinas_ejercicio").select("id").eq("id", input.rutina_id).eq("user_id", userId).is("deleted_at", null).maybeSingle();
      if (!rutina) return { error: "No se encontro esa rutina (o no te pertenece). Usa buscar_datos primero." };
      const { count } = await admin.from("rutina_ejercicio_items").select("id", { count: "exact", head: true }).eq("rutina_id", rutina.id).is("deleted_at", null);
      const row = {
        id: uid(), user_id: userId, rutina_id: rutina.id, ejercicio: input.ejercicio, tipo: input.tipo || "series",
        peso: input.peso ?? null, series: input.series ?? null, repeticiones: input.repeticiones ?? null,
        duracion_segundos: input.duracion_segundos ?? null, descanso_segundos: input.descanso_segundos ?? null, orden: count || 0,
      };
      const { error } = await admin.from("rutina_ejercicio_items").insert(row);
      return error ? { error: error.message } : { ok: true, id: row.id };
    }
    case "crear_comentario": {
      const row = { id: uid(), user_id: userId, entidad_tipo: input.entidad_tipo, entidad_id: input.entidad_id, texto: input.texto };
      const { error } = await admin.from("comentarios").insert(row);
      return error ? { error: error.message } : { ok: true, id: row.id };
    }
    case "obtener_comentarios": {
      const { data, error } = await admin.from("comentarios").select("id, texto, created_at")
        .eq("user_id", userId).eq("entidad_tipo", input.entidad_tipo).eq("entidad_id", input.entidad_id).is("deleted_at", null)
        .order("created_at", { ascending: false });
      return error ? { error: error.message } : { comentarios: data || [] };
    }
    case "actualizar_estatura": {
      const row = { user_id: userId, contacto_id: input.contacto_id || null, altura_cm: input.altura_cm };
      const { error } = await admin.from("perfil_salud").upsert(row, { onConflict: input.contacto_id ? "user_id,contacto_id" : "user_id" });
      return error ? { error: error.message } : { ok: true };
    }
    case "obtener_medidas_corporales": {
      let query = admin.from("medidas_corporales").select("fecha, cintura_cm, cadera_cm, pecho_cm, biceps_cm, muslo_cm, pantorrilla_cm, cuello_cm, notas")
        .eq("user_id", userId).is("deleted_at", null);
      query = input.contacto_id ? query.eq("contacto_id", input.contacto_id) : query.is("contacto_id", null);
      const { data, error } = await query.order("fecha", { ascending: false }).limit(20);
      return error ? { error: error.message } : { medidas: data || [] };
    }
    case "obtener_comidas": {
      const hoy = fechaHoraActualMexico().iso;
      const desde = input.desde || new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);
      const hasta = input.hasta || hoy;
      let query = admin.from("dieta_dias").select("fecha, tipo_comida, receta_id, descripcion")
        .eq("user_id", userId).is("deleted_at", null).gte("fecha", desde).lte("fecha", hasta);
      query = input.contacto_id ? query.eq("contacto_id", input.contacto_id) : query.is("contacto_id", null);
      const { data: comidas, error } = await query.order("fecha");
      if (error) return { error: error.message };
      const { data: recetas } = await admin.from("recetas").select("id, nombre").eq("user_id", userId).is("deleted_at", null);
      const recetasPorId = Object.fromEntries((recetas || []).map((r: any) => [r.id, r.nombre]));
      return { comidas: (comidas || []).map((c: any) => ({ fecha: c.fecha, tipo_comida: c.tipo_comida, que: c.receta_id ? (recetasPorId[c.receta_id] || "(receta)") : c.descripcion })) };
    }
    default:
      return { error: "Herramienta desconocida." };
  }
}

const SYSTEM_PROMPT = `Eres Arkey, el asistente dentro de ARKEYONE, un sistema operativo personal para proyectos, finanzas, salud, ejercicio, nutricion, habitos, contactos, diario y mas. Hablas espanol de Mexico, tono cercano, natural y directo -- como platicar con alguien de confianza que ademas conoce a detalle toda tu informacion, no como un menu de comandos.

No eres solo un buscador de datos: eres un acompañante conversacional. Si el usuario te cuenta algo de su dia, te pregunta tu opinion sobre un tema que no tiene nada que ver con ARKEYONE, o simplemente quiere platicar, respondele como lo haria un amigo con criterio propio -- con interes genuino, opiniones cuando las pidan, humor cuando venga al caso -- sin forzar la conversacion de regreso a "tus datos" ni actuar como si solo pudieras hablar de la app. Usa tus herramientas SOLO cuando la conversacion realmente lo pida.

Tienes memoria de la conversacion: los mensajes anteriores de esta misma charla ya vienen incluidos, asi que puedes referirte a lo que se dijo antes sin pedir que te lo repitan.

Puedes leer CUALQUIER modulo real del usuario con buscar_datos (proyectos, tareas, finanzas, salud, habitos, diario, contactos, citas, documentos, patrimonio, activos digitales, apartados, eventos, campanas, regalos, metas, facturas, rutinas de ejercicio, recetas, equipo) y tambien crear informacion en varios de ellos. Antes de crear algo ligado a un proyecto existente o registrar un avance, usa buscar_datos para encontrar el id correcto -- nunca inventes un id.

TIENES ACCESO COMPLETO (crear, leer, actualizar, eliminar) A PRACTICAMENTE TODO EN ARKEYONE -- no es cierto que solo puedas crear o consultar. Ademas de las herramientas especificas de cada modulo (crear_pendiente, actualizar_movimiento, etc.), tienes 3 herramientas genericas que cubren el resto: crear_registro, actualizar_registro y eliminar_registro, cada una con un parametro 'modulo' (ej. 'equipo', 'contactos', 'notas', 'redes_metricas', 'medicamentos', 'documentos', 'facturas'...) y sus campos validos listados en la descripcion de cada herramienta -- usalas con confianza para editar o borrar cualquier registro que el usuario te pida, no asumas que "eso no se puede". Para modulos con logica especial (finanzas, tareas, proyectos, citas) sigue usando su herramienta dedicada, que ya trae esa logica (confirmacion por monto, etc.) -- estas 3 genericas lo indican en su descripcion.

EJERCICIO Y NUTRICION: para el dia de hoy (que rutina toca, si ya empezo a entrenar, que ejercicios lleva marcados como hechos, que tiene de comer), usa obtener_entrenamiento_hoy -- es mas directo que buscar_datos porque ya junta rutina+sesion+comidas de hoy en un solo lugar, incluyendo los ids de cada ejercicio de la sesion que necesitas para marcar_ejercicio_hecho. Para preguntas de progreso ("como voy en press banca", "cuanto le subi a la sentadilla") usa progreso_ejercicio; para medidas corporales usa obtener_medidas_corporales; para comidas de otros dias (no hoy) usa obtener_comidas. Para registrar un entrenamiento: iniciar_sesion_ejercicio arranca (o retoma) la sesion de hoy, opcionalmente desde una rutina existente; agregar_ejercicio_a_sesion_hoy suma un ejercicio suelto a la sesion de hoy (crea la sesion si hace falta); agregar_ejercicio_a_rutina suma un ejercicio a una rutina YA EXISTENTE (distinto de crear_rutina_ejercicio, que arma una rutina nueva completa); marcar_ejercicio_hecho marca un ejercicio de la sesion de hoy como hecho (y de paso puede ajustar el peso/series/repeticiones realmente hechas ese dia, por si fue distinto al plan). Los ejercicios "por tiempo" (tipo='tiempo', circuitos de trabajo/descanso en segundos, tipo Planet Fitness) y "por series" (tipo='series', peso/series/repeticiones) se manejan igual en todas estas herramientas -- el usuario decide cual aplica segun como describa el ejercicio. Para nutricion: registrar_comida anota una comida del dia (vinculada a una receta guardada si el nombre coincide, o como texto libre si no); crear_receta guarda una receta nueva con sus ingredientes e instrucciones. actualizar_estatura guarda la estatura para el calculo de IMC en Salud.

APARTADOS: aportar_apartado mueve dinero HACIA un apartado (ahorro) y retirar_apartado lo saca de ahi -- ninguno de los dos es un gasto/ingreso normal de Finanzas (es mover dinero entre "bolsas"), asi que no uses crear_movimiento para esto; solo retirar_apartado, cuando el dinero se libera hacia algo concreto, si refleja un Ingreso en Finanzas automaticamente para dejar el rastro.

COMENTARIOS/BITACORA: crear_comentario y obtener_comentarios funcionan sobre cualquier entidad (proyecto, tarea, contacto, evento...) dando su modulo (entidad_tipo) e id (entidad_id) -- para avances de proyecto especificamente, sigue usando registrar_avance_proyecto, que ya da el formato correcto.

SI PUEDES CONSULTAR los datos reales del usuario -- no es cierto que solo puedas crear cosas. Cuando el usuario pregunte por el estado de algo ("por que no veo mi cita", "ya se guardo eso", "que tengo pendiente", "como va mi diario", "cuanto he gastado"), SIEMPRE usa buscar_datos primero para revisar la informacion real antes de responder. Nunca respondas "no tengo herramientas para consultar eso" sin haber intentado buscar_datos primero -- casi siempre si puedes.

La busqueda de buscar_datos ('texto') ignora acentos y mayusculas, y hace match aunque las palabras esten en otro orden al de como fueron guardadas (ej. buscar 'reyes angel' encuentra 'Angel Reyes'). No necesitas pedirle al usuario que repita el nombre exacto con acentos.

Cuando el usuario pida un consejo, un resumen general, o haga una pregunta abierta ("como voy", "dame un consejo", "que deberia priorizar hoy", "como esta mi situacion"), usa obtener_panorama para traer numeros reales (tareas vencidas, balance del mes, deudas, habitos de hoy, ultima medicion de salud, vencimientos proximos) y da un consejo concreto basado en esos datos -- no generalidades ni frases motivacionales vacias. Se honesto: si algo se ve mal (deudas altas, tareas vencidas acumuladas, muchos dias sin registrar habitos), dilo con tacto pero sin suavizarlo de mas.

Si el usuario pide algo ambiguo (por ejemplo, no queda claro a cual proyecto se refiere porque hay varias coincidencias, o no encuentras ninguna), pregunta antes de actuar en vez de adivinar. Para el resto de las acciones -- crear, actualizar montos que no cambian el monto ni cancelan nada, agendar, etc. -- ejecutalas directo sin pedir confirmacion de mas, el usuario ya te lo pidio.

PREVENCION DE DUPLICADOS: crear_nota, crear_idea_proyecto, crear_pendiente, crear_contacto, crear_habito, crear_patrimonio, crear_apartado, crear_meta, crear_evento, crear_medicamento, crear_rutina_ejercicio, crear_receta, y crear_registro cuando modulo es equipo/activos/campanas, revisan primero si ya existe algo muy parecido antes de crear. Si la herramienta te devuelve { posible_duplicado: true, existente: {...}, mensaje_para_usuario: "..." }, NO la vuelvas a llamar en ese mismo turno: responde solo con ese mensaje de confirmacion (puedes ajustar el tono) y espera la respuesta del usuario en su siguiente mensaje. Si el usuario confirma que quiere crear uno nuevo de todas formas, llama la misma herramienta otra vez con los mismos datos mas confirmado=true. Si dice que se refiere al que ya existe, usa ese registro (buscar_datos si necesitas mas detalle) en vez de crear uno nuevo. Esto NO aplica a registrar movimientos de finanzas, mediciones de salud/medidas corporales, comidas, avances de ejercicio (marcar_ejercicio_hecho, agregar_ejercicio_a_sesion_hoy), citas, ni a redes_metricas/campana_actividades (via crear_registro) -- ahi repetir es normal y esperado, no se revisa duplicado.

CONFIRMACION PARA ACCIONES SENSIBLES: eliminar_pendiente, eliminar_movimiento, cancelar_cita, eliminar_registro (para CUALQUIER modulo), y actualizar_movimiento cuando cambia el monto o cancela, tienen un candado real en el servidor: si las llamas sin confirmado=true, NO se ejecutan y te regresan { requiere_confirmacion: true, mensaje_para_usuario: "..." }. Cuando eso pase, responde en ese mismo turno SOLO con ese mensaje de confirmacion en texto (puedes ajustar el tono pero conserva la pregunta) y NO vuelvas a llamar la herramienta todavia. Espera el siguiente mensaje del usuario: si dice que si / confirma / adelante, entonces llama la misma herramienta otra vez con los mismos datos mas confirmado=true. Si dice que no o cambia de opinion, no la llames y confirma que no se hizo nada.

CONTEXTO DE PANTALLA: si el mensaje del usuario viene acompañado de contexto de pantalla (modulo y entidad en la que esta parado dentro de ARKEYONE), usalo para resolver referencias como "este proyecto", "esta tarea", "cuanto llevamos aqui" sin pedirle que lo repita -- pero si el usuario nombra explicitamente otra cosa, prioriza lo que dice sobre el contexto de pantalla.

FIDELIDAD AL CONTENIDO REAL: cuando el usuario pida que le digas, leas, repitas o recuerdes que dice literalmente una nota, tarea, entrada de diario u otro texto guardado ("dime que dice", "leeme la nota", "que dice ahi"), tu respuesta debe basarse UNICAMENTE en el campo de contenido que te devolvio buscar_datos -- nunca completes, resumas de mas, ni inventes puntos que no esten ahi, aunque el texto sea largo o tenga muchos puntos. Si el modo voz te pide ser breve, puedes reorganizar o leerlo en tramos, pero cada dato que menciones tiene que existir textualmente en el contenido real; jamas generes una lista de pendientes, tareas o puntos genericos que no vengan del texto guardado. Si no encuentras el registro con buscar_datos, dilo -- no lo sustituyas por contenido inventado que "suene" plausible.

Responde de forma conversacional y con la extension que amerite la pregunta: un par de lineas para algo simple, mas espacio si estas dando un consejo o un resumen con varios puntos. No repitas mecanicamente toda la informacion cruda de las herramientas -- interpretala y comunicala como lo haria una persona, salvo cuando aplique la regla de FIDELIDAD AL CONTENIDO REAL de arriba. Si estas en modo voz (te lo indica el contexto), manten las respuestas un poco mas breves y naturales para escuchar -- evita listas largas con viñetas, mejor dilo como lo dirias hablando -- pero la brevedad nunca justifica inventar o sustituir contenido real por generico.`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return new Response(JSON.stringify({ error: "Metodo no permitido" }), { status: 405, headers: headersJson });

  try {
    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace("Bearer ", "");
    const supabaseAuth = createClient(SUPABASE_URL, ANON_KEY, { global: { headers: { Authorization: authHeader } } });
    const { data: userData, error: userErr } = await supabaseAuth.auth.getUser(token);
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: "No autorizado" }), { status: 401, headers: headersJson });
    }
    const userId = userData.user.id;

    const { mensaje, contexto_pantalla, modo } = await req.json();
    if (!mensaje || typeof mensaje !== "string" || !mensaje.trim()) {
      return new Response(JSON.stringify({ error: "Falta el mensaje." }), { status: 400, headers: headersJson });
    }
    const modoConversacion = modo === "voz" ? "voz" : "texto";

    const mes = new Date().toISOString().slice(0, 7);

    // Antes esto corria en serie (cuota -> insertar mensaje del usuario -> historial), sumando
    // 3 viajes de red seguidos antes de siquiera llamar a Claude. La cuota si debe ir primero
    // (si ya no hay, ni vale la pena seguir), pero guardar el mensaje del usuario y leer el
    // historial no dependen uno del otro -- se lanzan juntos para recortar esa latencia.
    let { data: uso } = await admin.from("asistente_uso").select("id, consultas_usadas, limite_mes").eq("user_id", userId).eq("mes", mes).maybeSingle();
    if (!uso) {
      const nuevo = { id: uid(), user_id: userId, mes, consultas_usadas: 0, limite_mes: 100 };
      await admin.from("asistente_uso").insert(nuevo);
      uso = nuevo;
    }
    if (uso.consultas_usadas >= uso.limite_mes) {
      return new Response(JSON.stringify({
        limite_alcanzado: true,
        respuesta: `Llegaste a tu limite de ${uso.limite_mes} consultas este mes. Se renueva el dia 1.`,
      }), { headers: headersJson });
    }

    const [historialResp] = await Promise.all([
      admin.from("asistente_mensajes").select("rol, contenido")
        .eq("user_id", userId).order("created_at", { ascending: false }).limit(MENSAJES_HISTORIAL),
      admin.from("asistente_mensajes").insert({
        id: uid(), user_id: userId, rol: "usuario", contenido: mensaje,
        contexto_pantalla: contexto_pantalla || null, modo: modoConversacion,
      }),
    ]);
    const historial = (historialResp.data || []).reverse();

    let systemPrompt = SYSTEM_PROMPT;
    const { iso: hoyISO, legible: hoyLegible, hora: horaActual } = fechaHoraActualMexico();
    systemPrompt += `\n\nFECHA Y HORA ACTUAL: hoy es ${hoyLegible} (${hoyISO}), son las ${horaActual} hora de Mexico (CDMX). Usa esto SIEMPRE para resolver fechas relativas como "hoy", "manana", "el proximo lunes", "en dos semanas", etc. al crear o buscar citas, tareas, movimientos u otros registros con fecha -- nunca inventes ni asumas una fecha distinta a esta.`;
    if (contexto_pantalla && typeof contexto_pantalla === "object") {
      systemPrompt += `\n\nCONTEXTO DE PANTALLA ACTUAL DEL USUARIO: ${JSON.stringify(contexto_pantalla)}`;
    }
    if (modoConversacion === "voz") {
      systemPrompt += `\n\nEsta conversacion es por VOZ (Modo Conversacion): el usuario te esta hablando y tu respuesta se leera en voz alta con un sintetizador de voz. Se breve y natural, como platicando, sin listas con viñetas ni formato de texto (nada de asteriscos, numeros de lista, ni markdown). Evita interjecciones cortas o poco comunes que un sintetizador de voz suele leer mal deletreandolas en vez de pronunciarlas (por ejemplo "Ey", "Ok", abreviaturas) -- prefiere palabras completas y naturales como "Oye", "Mira", "Va", "Claro", "A ver". Escribe como si fueras a decirlo en voz alta tal cual, no como si fueras a que alguien lo lea.`;
    }

    const mensajes: any[] = [
      ...historial.map((h: any) => ({ role: h.rol === "usuario" ? "user" : "assistant", content: h.contenido })),
      { role: "user", content: mensaje },
    ];
    const accionesRealizadas: any[] = [];
    let respuestaFinal = "";
    const MAX_VUELTAS = 6;

    for (let vuelta = 0; vuelta < MAX_VUELTAS; vuelta++) {
      const resp = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": ANTHROPIC_API_KEY,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({ model: MODELO, max_tokens: 1536, system: systemPrompt, tools: TOOLS, messages: mensajes }),
      });

      if (!resp.ok) {
        const detalle = await resp.text();
        console.error("Error de Anthropic:", detalle);
        return new Response(JSON.stringify({ error: "El asistente no respondio. Intenta de nuevo en un momento." }), { status: 502, headers: headersJson });
      }

      const data = await resp.json();
      mensajes.push({ role: "assistant", content: data.content });

      const bloquesHerramienta = data.content.filter((b: any) => b.type === "tool_use");
      const bloquesTexto = data.content.filter((b: any) => b.type === "text").map((b: any) => b.text).join("\n");

      if (bloquesHerramienta.length === 0) {
        respuestaFinal = bloquesTexto || "Listo.";
        break;
      }

      const resultados = [];
      for (const bloque of bloquesHerramienta) {
        const resultado = await ejecutarHerramienta(bloque.name, bloque.input, userId);
        accionesRealizadas.push({ herramienta: bloque.name, input: bloque.input, resultado });
        resultados.push({ type: "tool_result", tool_use_id: bloque.id, content: JSON.stringify(resultado) });
      }
      mensajes.push({ role: "user", content: resultados });

      if (vuelta === MAX_VUELTAS - 1) {
        respuestaFinal = bloquesTexto || "Hice varios pasos pero no pude terminar de responder -- revisa que se guardo en tu cuenta.";
      }
    }

    await admin.from("asistente_uso").update({ consultas_usadas: uso.consultas_usadas + 1 }).eq("id", uso.id);
    await admin.from("asistente_mensajes").insert({ id: uid(), user_id: userId, rol: "asistente", contenido: respuestaFinal, acciones: accionesRealizadas, modo: modoConversacion });

    return new Response(JSON.stringify({
      respuesta: respuestaFinal,
      acciones: accionesRealizadas,
      consultas_usadas: uso.consultas_usadas + 1,
      limite_mes: uso.limite_mes,
    }), { headers: headersJson });
  } catch (err) {
    console.error("Error en asistente-ia:", err);
    return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: headersJson });
  }
});
