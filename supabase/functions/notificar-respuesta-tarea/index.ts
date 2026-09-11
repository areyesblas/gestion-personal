import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

// Cuando un colaborador (asignado_a) acepta, rechaza o termina una tarea que le delegaron,
// el CREADOR de esa tarea (pendientes.user_id) necesita enterarse por push — pero ese creador
// es una cuenta distinta a la del colaborador, y enviar-push solo permite auto-notificarse.
// Esta función corre con service_role para poder mandarle el push a otra cuenta.

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const VAPID_PUBLIC_KEY = Deno.env.get("VAPID_PUBLIC_KEY") ?? "";
const VAPID_PRIVATE_KEY = Deno.env.get("VAPID_PRIVATE_KEY") ?? "";
const VAPID_SUBJECT = Deno.env.get("VAPID_SUBJECT") ?? "mailto:soporte@arkeyone.com";

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

// Respeta la categoría "Colaboradores" y el horario de silencio de Configuración > Notificaciones
// (el registro en Notifications siempre se guarda; esto solo decide si además se manda el push).
function minutosDeHora(h: string | null): number {
  if (!h) return 0;
  const [hh, mm] = h.split(":").map(Number);
  return hh * 60 + mm;
}
function minutosAhoraMexico(): number {
  const fmt = new Intl.DateTimeFormat("en-US", { timeZone: "America/Mexico_City", hour: "2-digit", minute: "2-digit", hour12: false });
  const parts = Object.fromEntries(fmt.formatToParts(new Date()).map((p) => [p.type, p.value])) as Record<string, string>;
  return Number(parts.hour) * 60 + Number(parts.minute);
}
async function debeEnviarPush(userId: string): Promise<boolean> {
  const { data } = await admin.from("preferencias")
    .select("notif_tipos_desactivados, notif_silencio_activo, notif_silencio_inicio, notif_silencio_fin")
    .eq("user_id", userId).maybeSingle();
  if ((data?.notif_tipos_desactivados || []).includes("Colaboradores")) return false;
  if (data?.notif_silencio_activo) {
    const ini = minutosDeHora(data.notif_silencio_inicio || "22:00");
    const fin = minutosDeHora(data.notif_silencio_fin || "07:00");
    const ahora = minutosAhoraMexico();
    const dentro = ini === fin ? true : ini < fin ? (ahora >= ini && ahora < fin) : (ahora >= ini || ahora < fin);
    if (dentro) return false;
  }
  return true;
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const headersJson = { "Content-Type": "application/json", ...corsHeaders };

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return new Response(JSON.stringify({ error: "Método no permitido" }), { status: 405, headers: headersJson });

  try {
    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace("Bearer ", "");
    const supabaseAuth = createClient(SUPABASE_URL, ANON_KEY, { global: { headers: { Authorization: authHeader } } });
    const { data: userData, error: userErr } = await supabaseAuth.auth.getUser(token);
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: "No autorizado" }), { status: 401, headers: headersJson });
    }
    const quienResponde = userData.user.id;

    const { tareaId, tipo } = await req.json(); // tipo: "aceptada" | "rechazada" | "completada"
    if (!tareaId || !["aceptada", "rechazada", "completada"].includes(tipo)) {
      return new Response(JSON.stringify({ error: "Faltan datos (tareaId, tipo)" }), { status: 400, headers: headersJson });
    }

    const { data: tarea } = await admin.from("pendientes")
      .select("id, descripcion, proyecto_id, user_id, asignado_a, colaborador_contacto_id")
      .eq("id", tareaId).maybeSingle();
    if (!tarea) return new Response(JSON.stringify({ error: "Tarea no encontrada" }), { status: 404, headers: headersJson });
    if (tarea.asignado_a !== quienResponde) {
      return new Response(JSON.stringify({ error: "Solo la persona asignada puede reportar esto" }), { status: 403, headers: headersJson });
    }
    if (!tarea.user_id || tarea.user_id === quienResponde) {
      // Se la asignó a sí mismo — no hay a quién avisar.
      return new Response(JSON.stringify({ ok: true, aviso: "Sin creador distinto, no se notifica nada." }), { headers: headersJson });
    }

    let nombreColaborador = "Tu colaborador";
    if (tarea.colaborador_contacto_id) {
      const { data: c } = await admin.from("contactos").select("nombre").eq("id", tarea.colaborador_contacto_id).maybeSingle();
      if (c?.nombre) nombreColaborador = c.nombre;
    }
    let nombreProyecto = "";
    if (tarea.proyecto_id) {
      const { data: p } = await admin.from("proyectos").select("nombre").eq("id", tarea.proyecto_id).maybeSingle();
      if (p?.nombre) nombreProyecto = ` del proyecto ${p.nombre}`;
    }

    const textos: Record<string, { titulo: string; mensaje: string }> = {
      aceptada: { titulo: "Tarea aceptada", mensaje: `${nombreColaborador} aceptó la tarea "${tarea.descripcion}"${nombreProyecto}.` },
      rechazada: { titulo: "Tarea no aceptada", mensaje: `${nombreColaborador} no aceptó la tarea "${tarea.descripcion}"${nombreProyecto}.` },
      completada: { titulo: "Tarea terminada", mensaje: `La tarea "${tarea.descripcion}"${nombreProyecto} ha sido terminada por ${nombreColaborador}.` },
    };
    const { titulo, mensaje } = textos[tipo];

    await admin.from("notifications").insert({
      user_id: tarea.user_id, tipo: "colaboradores", severidad: "info", titulo, mensaje,
      recurso_tabla: "pendientes", recurso_id: tareaId,
    });

    if (!(await debeEnviarPush(tarea.user_id))) {
      return new Response(JSON.stringify({ ok: true, enviados: 0, aviso: "Silenciado por preferencias del creador." }), { headers: headersJson });
    }

    const { data: subs } = await admin.from("push_subscriptions").select("*").eq("user_id", tarea.user_id).eq("activo", true);
    let enviados = 0;
    for (const sub of subs || []) {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          JSON.stringify({ titulo, mensaje, url: "/?modulo=pendientes", tag: "colaboradores", recursoTabla: "pendientes", recursoId: tareaId })
        );
        enviados++;
      } catch (err) {
        const status = (err as { statusCode?: number })?.statusCode;
        if (status === 404 || status === 410) await admin.from("push_subscriptions").update({ activo: false }).eq("id", sub.id);
      }
    }

    return new Response(JSON.stringify({ ok: true, enviados }), { headers: headersJson });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: headersJson });
  }
});
