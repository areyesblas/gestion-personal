import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;
const FROM_EMAIL = "ArkeyOne <alertas@arkeyone.com>";
const APP_URL = "https://arkeyone.com";

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

// CORS: esta función se llama directo desde el navegador (arkeyone.com) — sin estos headers el
// navegador bloquea la petición antes de llegar aquí.
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const headersJson = { "Content-Type": "application/json", ...corsHeaders };

function fmtMoney(n: number | null): string {
  if (n === null || n === undefined || Number.isNaN(Number(n))) return "—";
  return new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(Number(n));
}
function fmtFecha(f: string | null): string {
  if (!f) return null as unknown as string;
  const [y, m, d] = f.split("-");
  const meses = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
  return `${d} ${meses[Number(m) - 1]} ${y}`;
}

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
    const quienEnvia = userData.user.id;

    const { tareaId } = await req.json();
    if (!tareaId) return new Response(JSON.stringify({ error: "Falta tareaId" }), { status: 400, headers: headersJson });

    const { data: tarea } = await admin.from("pendientes")
      .select("id, descripcion, fecha_limite, fecha_pago_aprox, precio, proyecto_id, colaborador_contacto_id, estado_aceptacion, user_id")
      .eq("id", tareaId).maybeSingle();
    if (!tarea) return new Response(JSON.stringify({ error: "Tarea no encontrada" }), { status: 404, headers: headersJson });
    if (tarea.user_id !== quienEnvia) {
      return new Response(JSON.stringify({ error: "Solo quien creó la tarea puede enviar esta invitación" }), { status: 403, headers: headersJson });
    }
    if (!tarea.colaborador_contacto_id) {
      return new Response(JSON.stringify({ error: "Esta tarea no tiene un colaborador asignado" }), { status: 400, headers: headersJson });
    }

    const { data: colaborador } = await admin.from("contactos").select("id, nombre, correo").eq("id", tarea.colaborador_contacto_id).maybeSingle();
    if (!colaborador?.correo) {
      return new Response(JSON.stringify({ error: "El colaborador no tiene correo registrado" }), { status: 400, headers: headersJson });
    }

    let nombreProyecto = "— sin proyecto —";
    if (tarea.proyecto_id) {
      const { data: proyecto } = await admin.from("proyectos").select("nombre").eq("id", tarea.proyecto_id).maybeSingle();
      if (proyecto) nombreProyecto = proyecto.nombre;
    }

    const { data: creadorUser } = await admin.auth.admin.getUserById(quienEnvia);
    const nombreCreador = creadorUser?.user?.user_metadata?.full_name || creadorUser?.user?.email || "Alguien en ARKEYONE";

    const fechaPagoTxt = tarea.fecha_pago_aprox ? fmtFecha(tarea.fecha_pago_aprox) : "por definir (te avisaremos en cuanto se confirme)";
    const fechaLimiteTxt = tarea.fecha_limite ? fmtFecha(tarea.fecha_limite) : null;
    const esReenvio = !!tarea.invitacion_enviada_en;

    const html = `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;">
        <h2 style="color:#0B2341;">ARKEYONE</h2>
        <p>Hola ${colaborador.nombre},</p>
        <p>${nombreCreador} te ${esReenvio ? "actualizó" : "asignó"} una tarea${nombreProyecto !== "— sin proyecto —" ? ` del proyecto <strong>${nombreProyecto}</strong>` : ""}:</p>
        <p style="background:#f5f5f5;border-radius:8px;padding:12px 16px;font-size:15px;"><strong>${tarea.descripcion}</strong></p>
        <table style="font-size:14px;color:#333;">
          <tr><td style="padding:4px 12px 4px 0;color:#777;">Se pagará</td><td><strong>${fmtMoney(tarea.precio)}</strong></td></tr>
          <tr><td style="padding:4px 12px 4px 0;color:#777;">Fecha aprox. de pago</td><td>${fechaPagoTxt}</td></tr>
          ${fechaLimiteTxt ? `<tr><td style="padding:4px 12px 4px 0;color:#777;">Fecha límite de entrega</td><td>${fechaLimiteTxt}</td></tr>` : ""}
        </table>
        <p style="margin-top:20px;">Para aceptar o rechazar esta tarea, entra a ARKEYONE con este mismo correo (${colaborador.correo}):</p>
        <p><a href="${APP_URL}" style="display:inline-block;background:#c9a227;color:#161822;padding:10px 20px;border-radius:6px;text-decoration:none;font-weight:bold;">Entrar a ARKEYONE</a></p>
        <p style="font-size:13px;color:#777;">Si todavía no tienes cuenta, regístrate con este mismo correo para que la tarea aparezca ligada a ti. Si no respondes en los próximos 2 días, se marcará como no aceptada.</p>
      </div>`;

    const resp = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Authorization": `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: FROM_EMAIL, to: colaborador.correo, subject: `ARKEYONE — Tienes una tarea por confirmar: ${tarea.descripcion}`, html }),
    });
    if (!resp.ok) {
      const errTxt = await resp.text();
      return new Response(JSON.stringify({ error: `Resend falló: ${errTxt}` }), { status: 502, headers: headersJson });
    }

    const update: Record<string, unknown> = { invitacion_enviada_en: new Date().toISOString() };
    if (!tarea.estado_aceptacion) update.estado_aceptacion = "pendiente";
    await admin.from("pendientes").update(update).eq("id", tareaId);

    return new Response(JSON.stringify({ ok: true }), { headers: headersJson });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: headersJson });
  }
});
