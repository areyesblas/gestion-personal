import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const VAPID_PUBLIC_KEY = Deno.env.get("VAPID_PUBLIC_KEY") ?? "";
const VAPID_PRIVATE_KEY = Deno.env.get("VAPID_PRIVATE_KEY") ?? "";
const VAPID_SUBJECT = Deno.env.get("VAPID_SUBJECT") ?? "mailto:soporte@arkeyone.com";
const VENTANA_DIAS = 3;
const TOLERANCIA_MIN = 5; // debe cuadrar con la frecuencia del cron
const ANTICIPACION_CITA_MIN = 30; // avisar 30 minutos antes de la hora de la cita

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

// Mapeo de "tipo" concreto de notificación -> categoría configurable por el usuario en
// Configuración > Notificaciones > Preferencias de notificación. Debe reflejar exactamente
// CATEGORIA_POR_TIPO_NOTIF del frontend (src/App.jsx) — si se agrega un tipo nuevo ahí, agregarlo aquí también.
const CATEGORIA_POR_TIPO: Record<string, string> = {
  medicamento: "Salud", cita: "Agenda", deuda: "Finanzas", cobro_pendiente: "Finanzas",
  pago_recurrente: "Finanzas", pendiente: "Recordatorios", documento: "Legal",
  activo_digital: "Activos digitales", apartado: "Finanzas", revision_proyecto: "Proyectos",
  cumpleanos: "Recordatorios", regalo: "Recordatorios", evento: "Agenda", factura: "Finanzas",
  campana: "Proyectos", asignacion: "Colaboradores",
};

type Prefs = { tiposDesactivados: string[]; silencioActivo: boolean; silencioInicioMin: number; silencioFinMin: number };
const cachePrefs = new Map<string, Prefs>();
function minutosDeHora(h: string | null): number {
  if (!h) return 0;
  const [hh, mm] = h.split(":").map(Number);
  return hh * 60 + mm;
}
async function obtenerPrefs(userId: string): Promise<Prefs> {
  const cacheada = cachePrefs.get(userId);
  if (cacheada) return cacheada;
  const { data } = await admin.from("preferencias")
    .select("notif_tipos_desactivados, notif_silencio_activo, notif_silencio_inicio, notif_silencio_fin")
    .eq("user_id", userId).maybeSingle();
  const prefs: Prefs = {
    tiposDesactivados: data?.notif_tipos_desactivados || [],
    silencioActivo: !!data?.notif_silencio_activo,
    silencioInicioMin: minutosDeHora(data?.notif_silencio_inicio || "22:00"),
    silencioFinMin: minutosDeHora(data?.notif_silencio_fin || "07:00"),
  };
  cachePrefs.set(userId, prefs);
  return prefs;
}
function dentroDeSilencio(prefs: Prefs, ahoraMin: number): boolean {
  if (!prefs.silencioActivo) return false;
  const { silencioInicioMin: ini, silencioFinMin: fin } = prefs;
  if (ini === fin) return true; // rango de 24h
  if (ini < fin) return ahoraMin >= ini && ahoraMin < fin;
  return ahoraMin >= ini || ahoraMin < fin; // el rango cruza medianoche
}
// Decide si debe enviarse el PUSH (no afecta si se registra o no en el Centro de Notificaciones,
// que siempre se guarda — esto solo filtra la entrega inmediata, según lo definido en el documento
// maestro: "estas preferencias controlan la entrega, pero no eliminan los eventos del Centro de Notificaciones").
async function debeEnviarPush(userId: string, tipoNotif: string, ahoraMin: number): Promise<boolean> {
  const prefs = await obtenerPrefs(userId);
  const categoria = CATEGORIA_POR_TIPO[tipoNotif];
  if (categoria && prefs.tiposDesactivados.includes(categoria)) return false;
  if (dentroDeSilencio(prefs, ahoraMin)) return false;
  return true;
}

function ahoraMexico() {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Mexico_City", year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hour12: false, weekday: "short",
  });
  const parts = Object.fromEntries(fmt.formatToParts(new Date()).map((p) => [p.type, p.value])) as Record<string, string>;
  const diaMap: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  return {
    fecha: `${parts.year}-${parts.month}-${parts.day}`,
    horaMin: Number(parts.hour) * 60 + Number(parts.minute),
    diaSemana: diaMap[parts.weekday],
  };
}
function sumarDias(fechaISO: string, dias: number) {
  const d = new Date(fechaISO + "T00:00:00Z"); d.setUTCDate(d.getUTCDate() + dias); return d.toISOString().slice(0, 10);
}
function fmtMoney(n: number | null | undefined) { return (Number(n) || 0).toLocaleString("es-MX", { style: "currency", currency: "MXN" }); }
function fmtFecha(fechaISO: string) {
  const [y, m, d] = fechaISO.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("es-MX", { day: "numeric", month: "short", timeZone: "UTC" });
}
function fmtHoraCorta(iso: string) {
  return new Date(iso).toLocaleString("es-MX", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit", hour12: true, timeZone: "America/Mexico_City" });
}

async function enviarPushAUsuario(userId: string, payload: Record<string, unknown>) {
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) return;
  const { data: subs } = await admin.from("push_subscriptions").select("*").eq("user_id", userId).eq("activo", true);
  for (const sub of subs || []) {
    try {
      await webpush.sendNotification({ endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } }, JSON.stringify(payload));
    } catch (err) {
      const status = (err as { statusCode?: number })?.statusCode;
      if (status === 404 || status === 410) {
        await admin.from("push_subscriptions").update({ activo: false }).eq("id", sub.id);
      } else {
        console.error("Error enviando push a", sub.id, err);
      }
    }
  }
}

Deno.serve(async (_req) => {
  const { fecha: hoy, horaMin, diaSemana } = ahoraMexico();
  const limite = sumarDias(hoy, VENTANA_DIAS);
  const resultado = { medicamentos: 0, generales: 0, pospuestos: 0, citas: 0 };

  const { data: medicamentos } = await admin.from("medicamentos").select("*")
    .is("deleted_at", null).eq("activo", true).lte("fecha_inicio", hoy);

  for (const med of medicamentos || []) {
    if (med.fecha_fin && med.fecha_fin < hoy) continue;
    if (!(med.dias_semana || []).includes(diaSemana)) continue;

    for (const horario of med.horarios || []) {
      const [hh, mm] = String(horario).split(":").map(Number);
      const horarioMin = hh * 60 + mm;
      if (horarioMin < horaMin - 1 || horarioMin > horaMin + TOLERANCIA_MIN) continue;

      const fechaHora = `${hoy}T${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}:00-06:00`;

      const { data: existente } = await admin.from("recordatorios").select("id").eq("user_id", med.user_id)
        .eq("tipo", "medicamento").eq("tabla_origen", "medicamentos").eq("registro_origen_id", med.id).eq("fecha_hora", fechaHora).maybeSingle();
      if (existente) continue;

      const titulo = `\u{1F48A} ${med.nombre}`;
      const mensaje = `${med.dosis ? med.dosis + " \u2014 " : ""}${med.para_quien}${med.instrucciones ? " \u00b7 " + med.instrucciones : ""}`;

      const { data: nuevo } = await admin.from("recordatorios").insert({
        user_id: med.user_id, tipo: "medicamento", tabla_origen: "medicamentos", registro_origen_id: med.id,
        titulo, mensaje, fecha_hora: fechaHora, recurrencia: "diaria", prioridad: "alta",
        estado: "notificado", notificado_en: new Date().toISOString(),
      }).select("id").single();

      await admin.from("notifications").insert({
        user_id: med.user_id, tipo: "medicamento", severidad: "aviso", titulo, mensaje,
        recurso_tabla: "medicamentos", recurso_id: med.id, recordatorio_id: nuevo?.id,
      });

      if (await debeEnviarPush(med.user_id, "medicamento", horaMin)) {
        await enviarPushAUsuario(med.user_id, {
          titulo, mensaje, url: "/?modulo=medicamentos", tag: `medicamento-${med.id}`, recordatorioId: nuevo?.id,
          actions: [{ action: "tomado", title: "Tomado" }, { action: "posponer30", title: "+30 min" }],
        });
      }
      resultado.medicamentos++;
    }
  }

  // Citas: avisar ANTICIPACION_CITA_MIN minutos antes de la hora exacta de la cita. Dispara cuando
  // el "punto de aviso" (hora de la cita menos la anticipación) cae dentro de esta pasada del cron:
  // eso equivale a que la hora de la cita misma caiga entre (ahora + anticipación) y
  // (ahora + anticipación + tolerancia). fecha_hora es un instante absoluto, no hace falta zona horaria.
  {
    const ahoraMs = Date.now();
    const disparoDesde = new Date(ahoraMs + ANTICIPACION_CITA_MIN * 60000).toISOString();
    const disparoHasta = new Date(ahoraMs + (ANTICIPACION_CITA_MIN + TOLERANCIA_MIN) * 60000).toISOString();
    const { data: citasProximas } = await admin.from("citas").select("*").is("deleted_at", null)
      .gte("fecha_hora", disparoDesde).lt("fecha_hora", disparoHasta);

    for (const cita of citasProximas || []) {
      const { data: existente } = await admin.from("recordatorios").select("id").eq("user_id", cita.user_id)
        .eq("tipo", "cita").eq("tabla_origen", "citas").eq("registro_origen_id", cita.id).maybeSingle();
      if (existente) continue;

      const titulo = `\u{1F4C5} ${cita.titulo}`;
      const mensaje = `${fmtHoraCorta(cita.fecha_hora)}${cita.lugar ? " \u00b7 " + cita.lugar : ""}`;

      const { data: nuevo } = await admin.from("recordatorios").insert({
        user_id: cita.user_id, tipo: "cita", tabla_origen: "citas", registro_origen_id: cita.id,
        titulo, mensaje, fecha_hora: cita.fecha_hora, recurrencia: "ninguna", prioridad: "media",
        estado: "notificado", notificado_en: new Date().toISOString(),
      }).select("id").single();

      await admin.from("notifications").insert({
        user_id: cita.user_id, tipo: "cita", severidad: "aviso", titulo, mensaje,
        recurso_tabla: "citas", recurso_id: cita.id, recordatorio_id: nuevo?.id,
      });

      if (await debeEnviarPush(cita.user_id, "cita", horaMin)) {
        await enviarPushAUsuario(cita.user_id, { titulo, mensaje, url: "/?modulo=citas", tag: `cita-${cita.id}` });
      }
      resultado.citas++;
    }
  }

  const { data: pospuestos } = await admin.from("recordatorios").select("*").eq("estado", "pospuesto").lte("pospuesto_hasta", new Date().toISOString());
  for (const r of pospuestos || []) {
    await admin.from("recordatorios").update({ estado: "notificado", notificado_en: new Date().toISOString(), pospuesto_hasta: null }).eq("id", r.id);
    await admin.from("notifications").insert({
      user_id: r.user_id, tipo: "medicamento", severidad: "aviso", titulo: r.titulo, mensaje: r.mensaje,
      recurso_tabla: r.tabla_origen, recurso_id: r.registro_origen_id, recordatorio_id: r.id,
    });
    if (await debeEnviarPush(r.user_id, "medicamento", horaMin)) {
      await enviarPushAUsuario(r.user_id, {
        titulo: r.titulo, mensaje: r.mensaje, url: "/?modulo=medicamentos", tag: `medicamento-${r.registro_origen_id}`, recordatorioId: r.id,
        actions: [{ action: "tomado", title: "Tomado" }, { action: "posponer30", title: "+30 min" }],
      });
    }
    resultado.pospuestos++;
  }

  if (horaMin >= 9 * 60 && horaMin < 9 * 60 + TOLERANCIA_MIN) {
    const { data: usuarios } = await admin.auth.admin.listUsers({ perPage: 1000 });
    for (const usuario of usuarios?.users || []) {
      const uid = usuario.id;
      type Item = { tipo: string; tabla: string; id: string; texto: string };
      const items: Item[] = [];

      const { data: contactosUsr } = await admin.from("contactos").select("id, nombre").eq("user_id", uid).is("deleted_at", null);
      const nombreContacto = (id: string | null) => contactosUsr?.find((c) => c.id === id)?.nombre || "\u2014";

      { const { data } = await admin.from("deudas").select("id, acreedor, monto, fecha_vencimiento").eq("user_id", uid).is("deleted_at", null).gte("fecha_vencimiento", hoy).lte("fecha_vencimiento", limite);
        (data || []).forEach((r) => items.push({ tipo: "deuda", tabla: "deudas", id: r.id, texto: `${r.acreedor} \u2014 ${fmtMoney(r.monto)}, vence ${fmtFecha(r.fecha_vencimiento)}` })); }
      { const { data } = await admin.from("finanzas").select("id, concepto, monto, fecha, fecha_vencimiento, contacto_id, es_recurrente, tipo, estatus").eq("user_id", uid).is("deleted_at", null);
        (data || []).forEach((r) => {
          if (r.tipo === "Ingreso" && r.estatus === "Pendiente") {
            const f = r.fecha_vencimiento || r.fecha;
            if (f && f >= hoy && f <= limite) items.push({ tipo: "cobro_pendiente", tabla: "finanzas", id: r.id, texto: `${r.concepto || "Cobro"} \u2014 ${fmtMoney(r.monto)}, de ${nombreContacto(r.contacto_id)}` });
          }
          if (r.es_recurrente && r.tipo === "Egreso" && r.fecha_vencimiento >= hoy && r.fecha_vencimiento <= limite) {
            items.push({ tipo: "pago_recurrente", tabla: "finanzas", id: r.id, texto: `${r.concepto || "Pago recurrente"} \u2014 ${fmtMoney(r.monto)}, vence ${fmtFecha(r.fecha_vencimiento)}` });
          }
        }); }
      { const { data } = await admin.from("pendientes").select("id, descripcion, fecha_limite").eq("user_id", uid).is("deleted_at", null).not("estatus", "in", "(Completada,Cancelada)").gte("fecha_limite", hoy).lte("fecha_limite", limite);
        (data || []).forEach((r) => items.push({ tipo: "pendiente", tabla: "pendientes", id: r.id, texto: `${r.descripcion} \u2014 vence ${fmtFecha(r.fecha_limite)}` })); }
      { const { data } = await admin.from("documentos").select("id, nombre, fecha_vencimiento").eq("user_id", uid).is("deleted_at", null).gte("fecha_vencimiento", hoy).lte("fecha_vencimiento", limite);
        (data || []).forEach((r) => items.push({ tipo: "documento", tabla: "documentos", id: r.id, texto: `${r.nombre} \u2014 vence ${fmtFecha(r.fecha_vencimiento)}` })); }
      { const { data } = await admin.from("activos").select("id, nombre, fecha_vencimiento").eq("user_id", uid).is("deleted_at", null).gte("fecha_vencimiento", hoy).lte("fecha_vencimiento", limite);
        (data || []).forEach((r) => items.push({ tipo: "activo_digital", tabla: "activos", id: r.id, texto: `${r.nombre} \u2014 renovaci\u00f3n ${fmtFecha(r.fecha_vencimiento)}` })); }
      { const { data } = await admin.from("apartados").select("id, nombre, fecha_objetivo").eq("user_id", uid).is("deleted_at", null).gte("fecha_objetivo", hoy).lte("fecha_objetivo", limite);
        (data || []).forEach((r) => items.push({ tipo: "apartado", tabla: "apartados", id: r.id, texto: `${r.nombre} \u2014 meta ${fmtFecha(r.fecha_objetivo)}` })); }
      { const { data } = await admin.from("proyectos").select("id, nombre, fecha_revision, estatus").eq("user_id", uid).is("deleted_at", null).not("estatus", "in", "(Finalizado,Archivado)").gte("fecha_revision", hoy).lte("fecha_revision", limite);
        (data || []).forEach((r) => items.push({ tipo: "revision_proyecto", tabla: "proyectos", id: r.id, texto: `${r.nombre} \u2014 revisi\u00f3n ${fmtFecha(r.fecha_revision)}` })); }
      { const { data } = await admin.from("contactos").select("id, nombre, fecha_nacimiento").eq("user_id", uid).is("deleted_at", null).not("fecha_nacimiento", "is", null);
        (data || []).forEach((r) => {
          const [, m, d] = r.fecha_nacimiento.split("-").map(Number);
          const anio = Number(hoy.slice(0, 4));
          let prox = `${anio}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
          if (prox < hoy) prox = `${anio + 1}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
          if (prox >= hoy && prox <= limite) items.push({ tipo: "cumpleanos", tabla: "contactos", id: r.id, texto: `${r.nombre} \u2014 ${fmtFecha(prox)}` });
        }); }
      { const { data } = await admin.from("regalos").select("id, ocasion, descripcion, contacto_id, fecha, estatus").eq("user_id", uid).is("deleted_at", null).neq("estatus", "Entregado").gte("fecha", hoy).lte("fecha", limite);
        (data || []).forEach((r) => items.push({ tipo: "regalo", tabla: "regalos", id: r.id, texto: `${r.descripcion || r.ocasion} para ${nombreContacto(r.contacto_id)}` })); }
      { const { data } = await admin.from("eventos").select("id, nombre, fecha").eq("user_id", uid).is("deleted_at", null).gte("fecha", hoy).lte("fecha", limite);
        (data || []).forEach((r) => items.push({ tipo: "evento", tabla: "eventos", id: r.id, texto: `${r.nombre} \u2014 ${fmtFecha(r.fecha)}` })); }
      { const { data } = await admin.from("facturas").select("id, concepto, total, fecha, estatus").eq("user_id", uid).is("deleted_at", null).eq("estatus", "Pendiente").gte("fecha", hoy).lte("fecha", limite);
        (data || []).forEach((r) => items.push({ tipo: "factura", tabla: "facturas", id: r.id, texto: `${r.concepto || "Factura"} \u2014 ${fmtMoney(r.total)}` })); }
      { const { data } = await admin.from("campanas").select("id, nombre, plataforma, fecha_inicio, fecha_fin, estatus").eq("user_id", uid).is("deleted_at", null);
        (data || []).forEach((r) => {
          if (r.estatus === "Planeada" && r.fecha_inicio >= hoy && r.fecha_inicio <= limite) items.push({ tipo: "campana", tabla: "campanas", id: r.id, texto: `${r.nombre} \u2014 inicia ${fmtFecha(r.fecha_inicio)}` });
          if (r.estatus === "Activa" && r.fecha_fin >= hoy && r.fecha_fin <= limite) items.push({ tipo: "campana", tabla: "campanas", id: r.id, texto: `${r.nombre} \u2014 termina ${fmtFecha(r.fecha_fin)}` });
        }); }

      if (items.length === 0) continue;

      const fechaHoraDia = `${hoy}T09:00:00-06:00`;
      const nuevos: Item[] = [];
      for (const it of items) {
        const { data: existente } = await admin.from("recordatorios").select("id").eq("user_id", uid).eq("tipo", it.tipo).eq("tabla_origen", it.tabla).eq("registro_origen_id", it.id).eq("fecha_hora", fechaHoraDia).maybeSingle();
        if (!existente) nuevos.push(it);
      }
      if (nuevos.length === 0) continue;

      await admin.from("recordatorios").insert(nuevos.map((it) => ({
        user_id: uid, tipo: it.tipo, tabla_origen: it.tabla, registro_origen_id: it.id,
        titulo: it.texto, fecha_hora: fechaHoraDia, recurrencia: "ninguna", estado: "notificado", notificado_en: new Date().toISOString(),
      })));
      await admin.from("notifications").insert(nuevos.map((it) => ({
        user_id: uid, tipo: it.tipo, severidad: "info", titulo: it.texto, recurso_tabla: it.tabla, recurso_id: it.id,
      })));

      // El resumen diario mezcla varias categorías (deudas, salud, agenda, etc.) en un solo push.
      // Filtramos por categoría solo los ítems permitidos para el push; los que queden fuera del
      // horario de silencio o la categoría desactivada ya quedaron guardados en Notifications de
      // todas formas — solo no entran a este empujón inmediato.
      const permitidosParaPush: Item[] = [];
      for (const it of nuevos) {
        if (await debeEnviarPush(uid, it.tipo, horaMin)) permitidosParaPush.push(it);
      }
      if (permitidosParaPush.length > 0) {
        const titulo = permitidosParaPush.length === 1 ? permitidosParaPush[0].texto : `Tienes ${permitidosParaPush.length} recordatorios nuevos`;
        const mensaje = permitidosParaPush.length === 1 ? "" : permitidosParaPush.slice(0, 3).map((n) => n.texto).join(" \u00b7 ");
        await enviarPushAUsuario(uid, { titulo: `\u{1F514} ${titulo}`, mensaje, url: "/", tag: "recordatorios-diarios" });
      }
      resultado.generales += nuevos.length;
    }
  }

  return new Response(JSON.stringify({ ok: true, hoy, horaMin, ...resultado }), { headers: { "Content-Type": "application/json" } });
});
