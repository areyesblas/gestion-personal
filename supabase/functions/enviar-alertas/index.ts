// Función de ArkeyOne: revisa 13 tipos de cosas por vencer/próximas para cada usuario,
// y si hay algo, manda UN SOLO correo diario con todo agrupado (no uno por cada tipo).
// Corre automáticamente todos los días vía un cron job de Supabase (pg_cron).
import { createClient } from "jsr:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;
const FROM_EMAIL = "ArkeyOne <alertas@arkeyone.com>";
const VENTANA_DIAS = 3; // avisa desde hoy hasta 3 días antes de que algo venza

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

function hoyISO() {
  return new Date().toISOString().slice(0, 10);
}
function sumarDias(fechaISO: string, dias: number) {
  const d = new Date(fechaISO + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
}
function fmtMoney(n: number | null | undefined) {
  return (Number(n) || 0).toLocaleString("es-MX", { style: "currency", currency: "MXN" });
}
function fmtFecha(fechaISO: string) {
  const [y, m, d] = fechaISO.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("es-MX", { day: "numeric", month: "short", timeZone: "UTC" });
}

type Item = { tipo: string; entidadId: string; fechaRelevante: string; texto: string };

// Próximo cumpleaños de una fecha de nacimiento (solo importa mes/día), como fecha ISO de este año o el que sigue.
function proximoCumple(fechaNacimientoISO: string, desde: string) {
  const [, m, d] = fechaNacimientoISO.split("-").map(Number);
  const anioDesde = Number(desde.slice(0, 4));
  let candidato = `${anioDesde}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  if (candidato < desde) candidato = `${anioDesde + 1}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  return candidato;
}

Deno.serve(async (_req) => {
  const hoy = hoyISO();
  const limite = sumarDias(hoy, VENTANA_DIAS);

  // Solo usuarios que quieren recibir el correo (por default sí, a menos que hayan desactivado la preferencia).
  const { data: usuarios, error: errUsuarios } = await admin.auth.admin.listUsers({ perPage: 1000 });
  if (errUsuarios) return new Response(JSON.stringify({ error: errUsuarios.message }), { status: 500 });

  const { data: prefs } = await admin.from("preferencias").select("user_id, alertas_correo_activas");
  const prefsPorUsuario = new Map((prefs || []).map((p) => [p.user_id, p.alertas_correo_activas]));

  const resultados: Record<string, number> = {};

  for (const usuario of usuarios.users) {
    if (!usuario.email) continue;
    const activo = prefsPorUsuario.has(usuario.id) ? prefsPorUsuario.get(usuario.id) : true;
    if (!activo) continue;

    const uid = usuario.id;
    const items: Item[] = [];

    // Mapa de proyectos del usuario, para dar contexto ("del proyecto X") sin tener que unir tablas.
    const { data: proyectosUsr } = await admin.from("proyectos").select("id, nombre").eq("user_id", uid).is("deleted_at", null);
    const nombreProyecto = (id: string | null) => proyectosUsr?.find((p) => p.id === id)?.nombre;

    const { data: contactosUsr } = await admin.from("contactos").select("id, nombre").eq("user_id", uid).is("deleted_at", null);
    const nombreContacto = (id: string | null) => contactosUsr?.find((c) => c.id === id)?.nombre || "—";

    // 1. Deudas por vencer (Documento Maestro v1.2, secc. 23.11/40: Deudas ya no es tabla propia,
    //    es una vista de egresos no recurrentes con saldo pendiente dentro de Finanzas).
    {
      const { data } = await admin.from("finanzas").select("id, concepto, monto, fecha_vencimiento, proyecto_id").eq("user_id", uid).is("deleted_at", null)
        .eq("tipo", "Egreso").eq("es_recurrente", false).in("estatus", ["Pendiente", "Parcial"])
        .gte("fecha_vencimiento", hoy).lte("fecha_vencimiento", limite);
      (data || []).forEach((r) => items.push({ tipo: "deudas", entidadId: r.id, fechaRelevante: r.fecha_vencimiento,
        texto: `${r.concepto} — ${fmtMoney(r.monto)}, vence ${fmtFecha(r.fecha_vencimiento)}${nombreProyecto(r.proyecto_id) ? ` (${nombreProyecto(r.proyecto_id)})` : ""}` }));
    }
    // 2. Cobros pendientes (ingresos marcados como Pendiente)
    {
      const { data } = await admin.from("finanzas").select("id, concepto, monto, fecha, fecha_vencimiento, contacto_id").eq("user_id", uid).is("deleted_at", null)
        .eq("tipo", "Ingreso").eq("estatus", "Pendiente");
      (data || []).filter((r) => {
        const f = r.fecha_vencimiento || r.fecha;
        return f && f >= hoy && f <= limite;
      }).forEach((r) => {
        const f = r.fecha_vencimiento || r.fecha;
        items.push({ tipo: "cobros", entidadId: r.id, fechaRelevante: f, texto: `${r.concepto || "Cobro"} — ${fmtMoney(r.monto)}, de ${nombreContacto(r.contacto_id)}, ${fmtFecha(f)}` });
      });
    }
    // 3. Pagos recurrentes próximos
    {
      const { data } = await admin.from("finanzas").select("id, concepto, monto, fecha_vencimiento").eq("user_id", uid).is("deleted_at", null)
        .eq("es_recurrente", true).eq("tipo", "Egreso").gte("fecha_vencimiento", hoy).lte("fecha_vencimiento", limite);
      (data || []).forEach((r) => items.push({ tipo: "pagos_recurrentes", entidadId: r.id, fechaRelevante: r.fecha_vencimiento,
        texto: `${r.concepto || "Pago recurrente"} — ${fmtMoney(r.monto)}, vence ${fmtFecha(r.fecha_vencimiento)}` }));
    }
    // 4. Pendientes por vencer
    {
      const { data } = await admin.from("pendientes").select("id, descripcion, fecha_limite, proyecto_id").eq("user_id", uid).is("deleted_at", null)
        .neq("estatus", "Hecho").gte("fecha_limite", hoy).lte("fecha_limite", limite);
      (data || []).forEach((r) => items.push({ tipo: "pendientes", entidadId: r.id, fechaRelevante: r.fecha_limite,
        texto: `${r.descripcion} — vence ${fmtFecha(r.fecha_limite)}${nombreProyecto(r.proyecto_id) ? ` (${nombreProyecto(r.proyecto_id)})` : ""}` }));
    }
    // 5. Documentos por vencer
    {
      const { data } = await admin.from("documentos").select("id, nombre, fecha_vencimiento").eq("user_id", uid).is("deleted_at", null)
        .gte("fecha_vencimiento", hoy).lte("fecha_vencimiento", limite);
      (data || []).forEach((r) => items.push({ tipo: "documentos", entidadId: r.id, fechaRelevante: r.fecha_vencimiento,
        texto: `${r.nombre} — vence ${fmtFecha(r.fecha_vencimiento)}` }));
    }
    // 6. Activos digitales por renovar
    {
      const { data } = await admin.from("activos").select("id, nombre, costo_renovacion, fecha_vencimiento").eq("user_id", uid).is("deleted_at", null)
        .gte("fecha_vencimiento", hoy).lte("fecha_vencimiento", limite);
      (data || []).forEach((r) => items.push({ tipo: "activos", entidadId: r.id, fechaRelevante: r.fecha_vencimiento,
        texto: `${r.nombre} — renovación ${fmtFecha(r.fecha_vencimiento)}${r.costo_renovacion ? `, ${fmtMoney(r.costo_renovacion)}` : ""}` }));
    }
    // 7. Apartados con fecha objetivo próxima
    {
      const { data } = await admin.from("apartados").select("id, nombre, monto_objetivo, monto_actual, fecha_objetivo").eq("user_id", uid).is("deleted_at", null)
        .gte("fecha_objetivo", hoy).lte("fecha_objetivo", limite);
      (data || []).forEach((r) => items.push({ tipo: "apartados", entidadId: r.id, fechaRelevante: r.fecha_objetivo,
        texto: `${r.nombre} — meta ${fmtFecha(r.fecha_objetivo)}, llevas ${fmtMoney(r.monto_actual)} de ${fmtMoney(r.monto_objetivo)}` }));
    }
    // 8. Proyectos por revisar
    {
      const { data } = await admin.from("proyectos").select("id, nombre, fecha_revision, estatus").eq("user_id", uid).is("deleted_at", null)
        .not("estatus", "in", "(Finalizado,Archivado)").gte("fecha_revision", hoy).lte("fecha_revision", limite);
      (data || []).forEach((r) => items.push({ tipo: "proyectos", entidadId: r.id, fechaRelevante: r.fecha_revision,
        texto: `${r.nombre} — revisión ${fmtFecha(r.fecha_revision)}` }));
    }
    // 9. Cumpleaños próximos
    {
      const { data } = await admin.from("contactos").select("id, nombre, fecha_nacimiento").eq("user_id", uid).is("deleted_at", null)
        .not("fecha_nacimiento", "is", null);
      (data || []).forEach((r) => {
        const prox = proximoCumple(r.fecha_nacimiento, hoy);
        if (prox >= hoy && prox <= limite) items.push({ tipo: "cumpleanos", entidadId: r.id, fechaRelevante: prox, texto: `${r.nombre} — ${fmtFecha(prox)}` });
      });
    }
    // 10. Regalos pendientes
    {
      const { data } = await admin.from("regalos").select("id, ocasion, descripcion, contacto_id, fecha, estatus").eq("user_id", uid).is("deleted_at", null)
        .neq("estatus", "Entregado").gte("fecha", hoy).lte("fecha", limite);
      (data || []).forEach((r) => items.push({ tipo: "regalos", entidadId: r.id, fechaRelevante: r.fecha,
        texto: `${r.descripcion || r.ocasion} para ${nombreContacto(r.contacto_id)} — ${fmtFecha(r.fecha)} (${r.estatus})` }));
    }
    // 11. Eventos próximos
    {
      const { data } = await admin.from("eventos").select("id, nombre, fecha").eq("user_id", uid).is("deleted_at", null)
        .gte("fecha", hoy).lte("fecha", limite);
      (data || []).forEach((r) => items.push({ tipo: "eventos", entidadId: r.id, fechaRelevante: r.fecha,
        texto: `${r.nombre} — ${fmtFecha(r.fecha)}` }));
    }
    // 12. Facturas pendientes
    {
      const { data } = await admin.from("facturas").select("id, concepto, total, fecha, contacto_id, estatus").eq("user_id", uid).is("deleted_at", null)
        .eq("estatus", "Pendiente").gte("fecha", hoy).lte("fecha", limite);
      (data || []).forEach((r) => items.push({ tipo: "facturas", entidadId: r.id, fechaRelevante: r.fecha,
        texto: `${r.concepto || "Factura"} — ${fmtMoney(r.total)}, ${nombreContacto(r.contacto_id)}, ${fmtFecha(r.fecha)}` }));
    }
    // 13. Campañas (inician o terminan pronto)
    {
      const { data: porIniciar } = await admin.from("campanas").select("id, nombre, plataforma, fecha_inicio").eq("user_id", uid).is("deleted_at", null)
        .eq("estatus", "Planeada").gte("fecha_inicio", hoy).lte("fecha_inicio", limite);
      (porIniciar || []).forEach((r) => items.push({ tipo: "campanas", entidadId: r.id, fechaRelevante: r.fecha_inicio,
        texto: `${r.nombre} (${r.plataforma}) — inicia ${fmtFecha(r.fecha_inicio)}` }));
      const { data: porTerminar } = await admin.from("campanas").select("id, nombre, plataforma, fecha_fin").eq("user_id", uid).is("deleted_at", null)
        .eq("estatus", "Activa").gte("fecha_fin", hoy).lte("fecha_fin", limite);
      (porTerminar || []).forEach((r) => items.push({ tipo: "campanas", entidadId: r.id, fechaRelevante: r.fecha_fin,
        texto: `${r.nombre} (${r.plataforma}) — termina ${fmtFecha(r.fecha_fin)}` }));
    }
    // 14. Actividades de campaña (qué publicar/hacer y cuándo, sección 9 y 10 del documento)
    {
      const { data } = await admin.from("campana_actividades").select("id, accion, canal, fecha, campana_id").eq("user_id", uid).is("deleted_at", null)
        .in("estado", ["Pendiente", "En proceso"]).gte("fecha", hoy).lte("fecha", limite);
      (data || []).forEach((r) => items.push({ tipo: "campana_actividades", entidadId: r.id, fechaRelevante: r.fecha,
        texto: `${r.accion}${r.canal ? ` (${r.canal})` : ""} — ${fmtFecha(r.fecha)}` }));
    }

    if (items.length === 0) continue;

    // Filtra lo que ya se avisó antes para esta misma fecha (evita mandar el mismo aviso día tras día).
    const { data: yaEnviadas } = await admin.from("alertas_enviadas").select("tipo, entidad_id, fecha_relevante")
      .eq("user_id", uid).gte("fecha_relevante", hoy);
    const yaEnviadasSet = new Set((yaEnviadas || []).map((e) => `${e.tipo}|${e.entidad_id}|${e.fecha_relevante}`));
    const nuevos = items.filter((it) => !yaEnviadasSet.has(`${it.tipo}|${it.entidadId}|${it.fechaRelevante}`));
    if (nuevos.length === 0) continue;

    const TITULOS: Record<string, string> = {
      deudas: "💳 Deudas por vencer", cobros: "💰 Cobros pendientes", pagos_recurrentes: "🔁 Pagos recurrentes próximos",
      pendientes: "✅ Pendientes por vencer", documentos: "📄 Documentos por vencer", activos: "🌐 Activos digitales por renovar",
      apartados: "🐷 Apartados con fecha próxima", proyectos: "📁 Proyectos por revisar", cumpleanos: "🎂 Cumpleaños próximos",
      regalos: "🎁 Regalos pendientes", eventos: "📅 Eventos próximos", facturas: "🧾 Facturas pendientes", campanas: "📣 Campañas",
      campana_actividades: "📣 Actividades de campaña",
    };
    const grupos: Record<string, Item[]> = {};
    nuevos.forEach((it) => { (grupos[it.tipo] = grupos[it.tipo] || []).push(it); });

    const seccionesHtml = Object.entries(grupos).map(([tipo, lista]) => `
      <tr><td style="padding:18px 0 6px 0;">
        <p style="margin:0;font-size:14px;font-weight:600;color:#0B2341;">${TITULOS[tipo] || tipo}</p>
        <ul style="margin:6px 0 0 0;padding-left:18px;">
          ${lista.map((it) => `<li style="font-size:13px;color:#333;line-height:1.5;">${it.texto}</li>`).join("")}
        </ul>
      </td></tr>`).join("");

    const html = `
      <div style="font-family:'Segoe UI',Arial,sans-serif;max-width:520px;margin:0 auto;">
        <div style="background:#0B2341;padding:22px 24px;border-radius:10px 10px 0 0;">
          <p style="margin:0;color:#F59E0B;font-size:18px;font-weight:700;">ArkeyOne</p>
          <p style="margin:4px 0 0 0;color:#9fb0c9;font-size:13px;">Tu resumen de pendientes de hoy</p>
        </div>
        <div style="background:#fff;padding:6px 24px 24px 24px;border:1px solid #e5e5e5;border-top:none;border-radius:0 0 10px 10px;">
          <table width="100%" cellpadding="0" cellspacing="0"><tbody>${seccionesHtml}</tbody></table>
          <p style="margin-top:22px;font-size:11px;color:#999;">Recibes esto porque tienes activas las alertas de ArkeyOne. Puedes desactivarlas desde tu cuenta.</p>
        </div>
      </div>`;

    const resp = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Authorization": `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: FROM_EMAIL, to: usuario.email, subject: `ArkeyOne — ${nuevos.length} pendiente${nuevos.length > 1 ? "s" : ""} por revisar`, html }),
    });

    if (resp.ok) {
      await admin.from("alertas_enviadas").upsert(
        nuevos.map((it) => ({ user_id: uid, tipo: it.tipo, entidad_id: it.entidadId, fecha_relevante: it.fechaRelevante })),
        { onConflict: "user_id,tipo,entidad_id,fecha_relevante" }
      );
      resultados[usuario.email] = nuevos.length;
    } else {
      resultados[usuario.email] = -1; // marca de error, no se guarda como enviado para reintentar mañana
    }
  }

  return new Response(JSON.stringify({ ok: true, hoy, resultados }), { headers: { "Content-Type": "application/json" } });
});
