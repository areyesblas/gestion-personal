import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const VAPID_PUBLIC_KEY = Deno.env.get("VAPID_PUBLIC_KEY") ?? "";
const VAPID_PRIVATE_KEY = Deno.env.get("VAPID_PRIVATE_KEY") ?? "";
const VAPID_SUBJECT = Deno.env.get("VAPID_SUBJECT") ?? "mailto:soporte@arkeyone.com";

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

// CORS: esta función se llama directo desde el navegador (arkeyone.com) — sin estos headers el
// navegador bloquea la petición antes de llegar aquí ("Failed to fetch", botón pegado sin resolver).
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const headersJson = { "Content-Type": "application/json", ...corsHeaders };

// "asignacion" cae en la categoría "Colaboradores" de Configuración > Preferencias de notificación.
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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Método no permitido" }), { status: 405, headers: headersJson });
  }

  try {
    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace("Bearer ", "");
    const supabaseAuth = createClient(SUPABASE_URL, ANON_KEY, { global: { headers: { Authorization: authHeader } } });
    const { data: userData, error: userErr } = await supabaseAuth.auth.getUser(token);
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: "No autorizado" }), { status: 401, headers: headersJson });
    }
    const quienAsigna = userData.user.id;

    const { pendienteId } = await req.json();
    if (!pendienteId) return new Response(JSON.stringify({ error: "Falta pendienteId" }), { status: 400, headers: headersJson });

    const { data: pendiente } = await admin.from("pendientes").select("id, descripcion, fecha_limite, proyecto_id, asignado_a, user_id").eq("id", pendienteId).maybeSingle();
    if (!pendiente) return new Response(JSON.stringify({ error: "Pendiente no encontrado" }), { status: 404, headers: headersJson });
    if (pendiente.user_id !== quienAsigna) {
      return new Response(JSON.stringify({ error: "Solo el dueño de la tarea puede asignarla" }), { status: 403, headers: headersJson });
    }
    if (!pendiente.asignado_a) {
      return new Response(JSON.stringify({ ok: true, aviso: "Sin colaborador asignado, no se notifica nada." }), { headers: headersJson });
    }

    const { data: colaboracion } = await admin.from("colaboradores").select("id")
      .eq("propietario_id", quienAsigna).eq("colaborador_user_id", pendiente.asignado_a).eq("estatus", "Activo").maybeSingle();
    if (!colaboracion) {
      return new Response(JSON.stringify({ error: "Esa persona no es tu colaborador activo" }), { status: 403, headers: headersJson });
    }

    const { data: proyecto } = pendiente.proyecto_id
      ? await admin.from("proyectos").select("nombre").eq("id", pendiente.proyecto_id).maybeSingle()
      : { data: null };

    const titulo = `Tienes una nueva actividad asignada: ${pendiente.descripcion}`;
    const mensaje = `${proyecto?.nombre ? proyecto.nombre + " — " : ""}${pendiente.fecha_limite ? `Fecha límite ${pendiente.fecha_limite}` : "Sin fecha límite"}`;

    // El evento SIEMPRE se guarda en el Centro de Notificaciones — las preferencias solo filtran
    // el envío inmediato del push, no el registro histórico.
    await admin.from("notifications").insert({
      user_id: pendiente.asignado_a, tipo: "asignacion", severidad: "aviso", titulo, mensaje,
      recurso_tabla: "mi-trabajo", recurso_id: pendiente.id,
    });

    if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY && (await debeEnviarPush(pendiente.asignado_a))) {
      const { data: subs } = await admin.from("push_subscriptions").select("*").eq("user_id", pendiente.asignado_a).eq("activo", true);
      for (const sub of subs || []) {
        try {
          await webpush.sendNotification(
            { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
            JSON.stringify({ titulo: `🗂️ ${titulo}`, mensaje, url: "/?modulo=mi-trabajo", tag: `asignacion-${pendiente.id}` })
          );
        } catch (err) {
          const status = (err as { statusCode?: number })?.statusCode;
          if (status === 404 || status === 410) await admin.from("push_subscriptions").update({ activo: false }).eq("id", sub.id);
        }
      }
    }

    return new Response(JSON.stringify({ ok: true }), { headers: headersJson });
  } catch (err) {
    console.error("Error en notificar-asignacion:", err);
    return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: headersJson });
  }
});
