// Transcribe un audio grabado por el navegador a texto, usando OpenAI Whisper (whisper-1).
//
// Por que existe esta funcion separada de asistente-ia: en iOS el frontend graba el audio con
// MediaRecorder y lo manda aqui para transcribirlo (el reconocimiento nativo de Safari queda
// sordo despues de la primera respuesta en iOS 27). En Chrome/Android el frontend sigue usando
// el reconocimiento nativo del navegador (gratis, sin esta funcion).
//
// Esta funcion solo transcribe -- no toca ningun dato de ARKEYONE ni llama al asistente; el
// texto resultante se manda despues a asistente-ia como si el usuario lo hubiera escrito.
import { createClient } from "jsr:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const headersJson = { "Content-Type": "application/json", ...corsHeaders };

// Tamano maximo del audio aceptado (10 MB es generoso para un turno de conversacion hablado,
// incluso varios minutos -- evita que un error del cliente mande audio gigante sin querer).
const MAX_BYTES = 10 * 1024 * 1024;
// whisper-1: se probó gpt-4o-mini-transcribe el 22-oct-2026 y fue MÁS lento en frases medianas y
// largas (4.8-9.8 s contra 2.1-4.5 s de whisper-1 con audios parecidos); solo ganaba en frases muy
// cortas. Se deja el reintento por si algún día se vuelve a cambiar el modelo principal.
const MODELO = "whisper-1";

// Frases que Whisper inventa sobre ruido o silencio. Se compara sin acentos ni puntuación.
const ALUCINACIONES = [
  "amara.org", "amara org", "subtitulos realizados por", "subtitulos por la comunidad",
  "subtitulado por", "gracias por ver", "gracias por ver el video", "suscribete",
  "no olvides suscribirte", "dale like", "musica", "aplausos", "risas", "silencio",
  "hasta la proxima", "nos vemos en el proximo video",
  // "gracias" y "adiós" NO van aquí: son cosas que alguien sí le diría a Arkey.
];
function normalizar(s: string) {
  return s.toLowerCase().normalize("NFD").replace(/\p{M}/gu, "").replace(/[^\p{L}\p{N}. ]/gu, " ").replace(/\s+/g, " ").trim();
}
// Frases típicas de cierre de video que Whisper inventa sobre ruido, aunque vengan dentro de un
// texto más largo (22-oct-2026: "Gracias por ver el video, no olvides dejar tu comentario y
// suscribirte al canal" pasó porque solo se filtraba la frase corta exacta). Son expresiones que
// nadie le dice a un asistente personal.
const MARCAS_ALUCINACION = [
  "amara", "subtitulos realizados", "subtitulado por", "subtitulos por",
  "gracias por ver el video", "gracias por ver este video", "gracias por verlo",
  "suscribete", "suscribirte al canal", "suscribanse", "dale like", "deja tu like",
  "deja tu comentario", "dejar tu comentario", "dejen sus comentarios", "activa la campanita",
  "proximo video", "siguiente video", "nos vemos en el proximo",
];
// Whisper atorado en un bucle: el mismo fragmento de 3 palabras repetido 4+ veces. Una persona
// hablando con su asistente no hace eso.
function esBucle(t: string) {
  const p = t.replace(/\./g, " ").split(" ").filter(Boolean);
  if (p.length < 12) return false;
  const cuenta = new Map<string, number>();
  for (let i = 0; i + 2 < p.length; i++) {
    const k = `${p[i]} ${p[i + 1]} ${p[i + 2]}`;
    const n = (cuenta.get(k) || 0) + 1;
    if (n >= 4) return true;
    cuenta.set(k, n);
  }
  return false;
}
function esAlucinacion(texto: string) {
  const t = normalizar(texto);
  if (!t) return true;
  if (esBucle(t)) return true;
  if (MARCAS_ALUCINACION.some((m) => t.includes(m))) return true;
  // Muletillas cortas: solo se descartan si son TODO lo que se transcribió.
  const sinPunto = t.replace(/\./g, "").trim();
  return ALUCINACIONES.includes(sinPunto);
}

// Whisper dice, por cada tramo, qué tan probable es que NO haya voz (no_speech_prob) y qué tan
// seguro está del texto (avg_logprob). Regla clásica de Whisper para silencio: no_speech_prob > 0.6
// Y avg_logprob < -1. Si TODOS los tramos cumplen, lo "transcrito" es inventado. Se usan las dos
// condiciones juntas para no tirar frases reales cortas (p. ej. "Finanzas, por favor").
type Tramo = { no_speech_prob?: number; avg_logprob?: number };
function sinVozSegunWhisper(segmentos: Tramo[]) {
  if (!Array.isArray(segmentos) || segmentos.length === 0) return false;
  return segmentos.every((sg) => (sg.no_speech_prob ?? 0) > 0.6 && (sg.avg_logprob ?? 0) < -1);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return new Response(JSON.stringify({ error: "Metodo no permitido" }), { status: 405, headers: headersJson });

  try {
    if (!OPENAI_API_KEY) {
      return new Response(JSON.stringify({ error: "El transcriptor de voz todavia no esta configurado (falta OPENAI_API_KEY)." }), { status: 503, headers: headersJson });
    }

    // Misma validacion de identidad que el resto de ARKEYONE: se exige un usuario real
    // autenticado antes de gastar cuota de OpenAI, aunque esta funcion no toque la base de datos.
    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace("Bearer ", "");
    const supabaseAuth = createClient(SUPABASE_URL, ANON_KEY, { global: { headers: { Authorization: authHeader } } });
    const { data: userData, error: userErr } = await supabaseAuth.auth.getUser(token);
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: "No autorizado" }), { status: 401, headers: headersJson });
    }

    const formData = await req.formData();
    const archivo = formData.get("audio");
    if (!archivo || !(archivo instanceof File)) {
      return new Response(JSON.stringify({ error: "Falta el archivo de audio." }), { status: 400, headers: headersJson });
    }
    if (archivo.size > MAX_BYTES) {
      return new Response(JSON.stringify({ error: "El audio es demasiado largo para transcribir de un solo turno." }), { status: 413, headers: headersJson });
    }
    if (archivo.size === 0) {
      return new Response(JSON.stringify({ texto: "" }), { headers: headersJson });
    }

    const whisperForm = new FormData();
    whisperForm.append("file", archivo, archivo.name || "audio.webm");
    whisperForm.append("model", MODELO);
    whisperForm.append("language", "es");
    whisperForm.append("temperature", "0");
    // verbose_json trae no_speech_prob por tramo (ver sinVozSegunWhisper). Solo whisper-1 lo da.
    whisperForm.append("response_format", MODELO === "whisper-1" ? "verbose_json" : "json");
    // SIN "prompt" a propósito (22-oct-2026): con audio sin voz, Whisper repetía en bucle la frase
    // de contexto ("ARKEYONE, el asistente de ARKEYONE, el asistente de..."), y ese texto le llegaba
    // a Arkey como si el usuario lo hubiera dicho.

    const t0 = Date.now();
    let resp = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: { Authorization: `Bearer ${OPENAI_API_KEY}` },
      body: whisperForm,
    });
    if (!resp.ok && MODELO !== "whisper-1") {
      console.error("Fallo", MODELO, resp.status, await resp.text().catch(() => ""), "-- reintento con whisper-1");
      whisperForm.set("model", "whisper-1");
      resp = await fetch("https://api.openai.com/v1/audio/transcriptions", {
        method: "POST",
        headers: { Authorization: `Bearer ${OPENAI_API_KEY}` },
        body: whisperForm,
      });
    }

    if (!resp.ok) {
      const detalle = await resp.text();
      console.error("Error de OpenAI al transcribir:", detalle);
      return new Response(JSON.stringify({ error: "No se pudo transcribir el audio. Intenta de nuevo." }), { status: 502, headers: headersJson });
    }

    const data = await resp.json();
    const texto = (data.text || "").trim();
    console.log(`transcripcion ${Date.now() - t0} ms`);
    // El transcriptor "alucina" frases de créditos de video cuando el audio es ruido o silencio
    // (las aprendió de subtítulos de YouTube). Si la transcripción es solo eso, se descarta como si
    // no se hubiera dicho nada y el cliente vuelve a escuchar sin gastar una consulta del asistente.
    const tramos = (data.segments || []).map((sg: Tramo) => [Math.round((sg.no_speech_prob ?? 0) * 100) / 100, Math.round((sg.avg_logprob ?? 0) * 100) / 100]);
    console.log("tramos [no_speech_prob, avg_logprob]:", JSON.stringify(tramos)); // sin el texto: es lo que dijo el usuario
    if (texto && sinVozSegunWhisper(data.segments)) {
      console.log("Sin voz segun Whisper, descartado:", texto);
      return new Response(JSON.stringify({ texto: "", descartado: true }), { headers: headersJson });
    }
    if (esAlucinacion(texto)) {
      console.log("Alucinacion de Whisper descartada:", texto);
      return new Response(JSON.stringify({ texto: "", descartado: true }), { headers: headersJson });
    }
    return new Response(JSON.stringify({ texto }), { headers: headersJson });
  } catch (err) {
    console.error("Error en transcribir-voz:", err);
    return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: headersJson });
  }
});
