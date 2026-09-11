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
];

const TOOLS = [
  {
    name: "buscar_datos",
    description: `Busca o LISTA informacion real y actual del usuario en cualquier modulo de ARKEYONE (${MODULOS_DISPONIBLES.join(", ")}). Usala en tres casos: (1) ANTES de crear o actualizar algo ligado a un registro existente, para obtener el id correcto -- nunca inventes un id; (2) cuando el usuario pregunte por el estado de algo que ya existe o crees haber creado (por ejemplo "por que no veo mi cita", "que tengo pendiente", "ya se guardo eso", "cuanto llevo ahorrado", "que hice ayer en mi diario") -- en ese caso SIEMPRE usa esta herramienta para revisar los datos reales antes de responder, en vez de decir que no puedes consultarlo; (3) cuando necesites contexto de un modulo especifico para dar un consejo puntual (ej. revisar habitos antes de sugerir uno nuevo). Si dejas 'texto' vacio, devuelve los registros mas recientes de ese modulo (para listar todo). "actividades" es el Diario personal (no confundir con tareas, que es "pendientes").`,
    input_schema: {
      type: "object",
      properties: {
        modulo: { type: "string", enum: MODULOS_DISPONIBLES },
        texto: { type: "string", description: "Texto a buscar en el campo principal del modulo (busqueda parcial). Dejalo vacio para listar los registros mas recientes de ese modulo sin filtrar." },
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
    description: "Crea una nota libre en el modulo Notas.",
    input_schema: {
      type: "object",
      properties: { titulo: { type: "string" }, contenido: { type: "string" } },
      required: ["contenido"],
    },
  },
  {
    name: "crear_idea_proyecto",
    description: "Crea un nuevo proyecto con estatus 'Idea' en Proyectos e ideas.",
    input_schema: {
      type: "object",
      properties: { nombre: { type: "string" }, descripcion: { type: "string" } },
      required: ["nombre"],
    },
  },
  {
    name: "crear_pendiente",
    description: "Crea una tarea/pendiente, opcionalmente ligada a un proyecto (usa buscar_datos primero para obtener el proyecto_id exacto).",
    input_schema: {
      type: "object",
      properties: {
        descripcion: { type: "string" },
        proyecto_id: { type: "string" },
        fecha_limite: { type: "string", description: "Formato YYYY-MM-DD" },
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
    description: "Crea un nuevo contacto. No requiere confirmacion.",
    input_schema: {
      type: "object",
      properties: {
        nombre: { type: "string" },
        whatsapp: { type: "string" },
        correo: { type: "string" },
        tipos: { type: "array", items: { type: "string" }, description: "Ej. ['Cliente'], ['Colaborador'], ['Familiar']. Si no se especifica se deja ['Otro']." },
        notas: { type: "string" },
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
};
const CAMPO_BUSQUEDA: Record<string, string> = {
  proyectos: "nombre", pendientes: "descripcion", notas: "titulo", finanzas: "concepto", citas: "titulo", contactos: "nombre",
  salud: "notas", medicamentos: "nombre", habitos: "nombre", actividades: "nombre", documentos: "nombre",
  patrimonio: "nombre", activos: "nombre", apartados: "nombre", eventos: "nombre", campanas: "nombre",
  regalos: "descripcion", metas: "descripcion", facturas: "concepto",
};

async function ejecutarHerramienta(nombre: string, input: any, userId: string) {
  switch (nombre) {
    case "buscar_datos": {
      const campo = CAMPO_BUSQUEDA[input.modulo];
      const cols = SELECT_POR_MODULO[input.modulo];
      if (!campo || !cols) return { error: "Modulo no valido." };
      const texto = input.texto ?? "";
      const { data, error } = await admin.from(input.modulo).select(cols)
        .eq("user_id", userId).is("deleted_at", null)
        .ilike(campo, `%${texto}%`)
        .order("created_at", { ascending: false })
        .limit(10);
      if (error) return { error: error.message };
      return { resultados: data };
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
      const row = { id: uid(), user_id: userId, titulo: input.titulo || null, contenido: input.contenido };
      const { error } = await admin.from("notas").insert(row);
      return error ? { error: error.message } : { ok: true, id: row.id };
    }
    case "crear_idea_proyecto": {
      const row = {
        id: uid(), user_id: userId, nombre: input.nombre, categoria: "Software", estatus: "Idea",
        modo: "Finito", monetizacion: "Dinero", prioridad: "Media", descripcion: input.descripcion || null,
        github_subido: false,
      };
      const { error } = await admin.from("proyectos").insert(row);
      return error ? { error: error.message } : { ok: true, id: row.id };
    }
    case "crear_pendiente": {
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
    default:
      return { error: "Herramienta desconocida." };
  }
}

const SYSTEM_PROMPT = `Eres el asistente dentro de ARKEYONE, un sistema operativo personal para proyectos, finanzas, salud, habitos, contactos, diario y mas. Hablas espanol de Mexico, tono cercano, natural y directo -- como platicar con alguien de confianza que ademas conoce a detalle toda tu informacion, no como un menu de comandos.

Tienes memoria de la conversacion: los mensajes anteriores de esta misma charla ya vienen incluidos, asi que puedes referirte a lo que se dijo antes sin pedir que te lo repitan.

Puedes leer CUALQUIER modulo real del usuario con buscar_datos (proyectos, tareas, finanzas, salud, habitos, diario, contactos, citas, documentos, patrimonio, activos digitales, apartados, eventos, campanas, regalos, metas, facturas) y tambien crear informacion en varios de ellos. Antes de crear algo ligado a un proyecto existente o registrar un avance, usa buscar_datos para encontrar el id correcto -- nunca inventes un id.

SI PUEDES CONSULTAR los datos reales del usuario -- no es cierto que solo puedas crear cosas. Cuando el usuario pregunte por el estado de algo ("por que no veo mi cita", "ya se guardo eso", "que tengo pendiente", "como va mi diario", "cuanto he gastado"), SIEMPRE usa buscar_datos primero para revisar la informacion real antes de responder. Nunca respondas "no tengo herramientas para consultar eso" sin haber intentado buscar_datos primero -- casi siempre si puedes.

Cuando el usuario pida un consejo, un resumen general, o haga una pregunta abierta ("como voy", "dame un consejo", "que deberia priorizar hoy", "como esta mi situacion"), usa obtener_panorama para traer numeros reales (tareas vencidas, balance del mes, deudas, habitos de hoy, ultima medicion de salud, vencimientos proximos) y da un consejo concreto basado en esos datos -- no generalidades ni frases motivacionales vacias. Se honesto: si algo se ve mal (deudas altas, tareas vencidas acumuladas, muchos dias sin registrar habitos), dilo con tacto pero sin suavizarlo de mas.

Si el usuario pide algo ambiguo (por ejemplo, no queda claro a cual proyecto se refiere porque hay varias coincidencias, o no encuentras ninguna), pregunta antes de actuar en vez de adivinar. Para el resto de las acciones -- crear, actualizar montos que no cambian el monto ni cancelan nada, agendar, etc. -- ejecutalas directo sin pedir confirmacion de mas, el usuario ya te lo pidio.

CONFIRMACION PARA ACCIONES SENSIBLES: eliminar_pendiente, eliminar_movimiento, cancelar_cita, y actualizar_movimiento cuando cambia el monto o cancela, tienen un candado real en el servidor: si las llamas sin confirmado=true, NO se ejecutan y te regresan { requiere_confirmacion: true, mensaje_para_usuario: "..." }. Cuando eso pase, responde en ese mismo turno SOLO con ese mensaje de confirmacion en texto (puedes ajustar el tono pero conserva la pregunta) y NO vuelvas a llamar la herramienta todavia. Espera el siguiente mensaje del usuario: si dice que si / confirma / adelante, entonces llama la misma herramienta otra vez con los mismos datos mas confirmado=true. Si dice que no o cambia de opinion, no la llames y confirma que no se hizo nada.

CONTEXTO DE PANTALLA: si el mensaje del usuario viene acompañado de contexto de pantalla (modulo y entidad en la que esta parado dentro de ARKEYONE), usalo para resolver referencias como "este proyecto", "esta tarea", "cuanto llevamos aqui" sin pedirle que lo repita -- pero si el usuario nombra explicitamente otra cosa, prioriza lo que dice sobre el contexto de pantalla.

Responde de forma conversacional y con la extension que amerite la pregunta: un par de lineas para algo simple, mas espacio si estas dando un consejo o un resumen con varios puntos. No repitas mecanicamente toda la informacion cruda de las herramientas -- interpretala y comunicala como lo haria una persona. Si estas en modo voz (te lo indica el contexto), manten las respuestas un poco mas breves y naturales para escuchar -- evita listas largas con viñetas, mejor dilo como lo dirias hablando.`;

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

    // Memoria de conversacion: recarga los ultimos mensajes de esta cuenta como contexto,
    // para que el asistente se sienta como un chat continuo y no como turnos sueltos.
    const { data: historialRows } = await admin.from("asistente_mensajes").select("rol, contenido")
      .eq("user_id", userId).order("created_at", { ascending: false }).limit(MENSAJES_HISTORIAL);
    const historial = (historialRows || []).reverse();

    await admin.from("asistente_mensajes").insert({
      id: uid(), user_id: userId, rol: "usuario", contenido: mensaje,
      contexto_pantalla: contexto_pantalla || null, modo: modoConversacion,
    });

    let systemPrompt = SYSTEM_PROMPT;
    const { iso: hoyISO, legible: hoyLegible, hora: horaActual } = fechaHoraActualMexico();
    systemPrompt += `\n\nFECHA Y HORA ACTUAL: hoy es ${hoyLegible} (${hoyISO}), son las ${horaActual} hora de Mexico (CDMX). Usa esto SIEMPRE para resolver fechas relativas como "hoy", "manana", "el proximo lunes", "en dos semanas", etc. al crear o buscar citas, tareas, movimientos u otros registros con fecha -- nunca inventes ni asumas una fecha distinta a esta.`;
    if (contexto_pantalla && typeof contexto_pantalla === "object") {
      systemPrompt += `\n\nCONTEXTO DE PANTALLA ACTUAL DEL USUARIO: ${JSON.stringify(contexto_pantalla)}`;
    }
    if (modoConversacion === "voz") {
      systemPrompt += `\n\nEsta conversacion es por VOZ (Modo Conversacion): el usuario te esta hablando y tu respuesta se leera en voz alta. Se breve y natural, como platicando, sin listas con viñetas ni formato de texto.`;
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
