// Convierte una respuesta de Arkey en audio con voz natural (OpenAI gpt-4o-mini-tts).
//
// Por qué existe: la voz del sistema (speechSynthesis) suena robótica y en iOS 27 además
// silencia el micrófono mientras habla y obedece el interruptor de silencio del iPhone. Esta
// función devuelve un WAV que el navegador reproduce como audio normal de la página.
// WAV y no MP3 (22-oct-2026): Safari calcula mal la duración de algunos MP3 y deja de sonar antes
// del final -- Angel no oyó "Eso es todo." al final de una respuesta. WAV pesa más (~48 KB por
// segundo) pero su duración es exacta.
//
// Costo aproximado: ~0.015 USD por minuto de voz. Usa la misma OPENAI_API_KEY que transcribir-voz.
// Para volver a limitarla (p. ej. por costo), poner UUIDs en USUARIOS_PERMITIDOS y la misma
// condición en App.jsx (prop vozHumana de VoiceMode).
import { createClient } from "jsr:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY")!;

// Abierta a todos desde el 22-oct-2026 (antes solo la cuenta de Angel, en prueba).
const USUARIOS_PERMITIDOS: string[] = []; // vacío = todos

const VOZ = "coral";
const INSTRUCCIONES =
  "Hablas español de México con acento mexicano neutro. Tono cálido, cercano y seguro, como un " +
  "asistente personal de confianza. Ritmo ágil y natural, sin sonar a locutor. Las cantidades de " +
  "dinero dilas en pesos de forma natural.";
const MAX_LETRAS = 3000; // una respuesta de Arkey ronda 40-700; esto evita abusos o errores del cliente

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const headersJson = { "Content-Type": "application/json", ...corsHeaders };

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return new Response(JSON.stringify({ error: "Metodo no permitido" }), { status: 405, headers: headersJson });

  try {
    if (!OPENAI_API_KEY) {
      return new Response(JSON.stringify({ error: "Falta OPENAI_API_KEY" }), { status: 503, headers: headersJson });
    }
    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace("Bearer ", "");
    const supabaseAuth = createClient(SUPABASE_URL, ANON_KEY, { global: { headers: { Authorization: authHeader } } });
    const { data: userData, error: userErr } = await supabaseAuth.auth.getUser(token);
    const uid = userData?.user?.id;
    if (userErr || !uid) {
      return new Response(JSON.stringify({ error: "No autorizado" }), { status: 401, headers: headersJson });
    }
    if (USUARIOS_PERMITIDOS.length > 0 && !USUARIOS_PERMITIDOS.includes(uid)) {
      return new Response(JSON.stringify({ error: "Voz natural todavía en prueba" }), { status: 403, headers: headersJson });
    }

    const body = await req.json().catch(() => ({}));
    const texto = String(body?.texto || "").trim().slice(0, MAX_LETRAS);
    if (!texto) return new Response(JSON.stringify({ error: "Falta el texto" }), { status: 400, headers: headersJson });

    const resp = await fetch("https://api.openai.com/v1/audio/speech", {
      method: "POST",
      headers: { Authorization: `Bearer ${OPENAI_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: "gpt-4o-mini-tts", voice: VOZ, input: texto, instructions: INSTRUCCIONES, response_format: "wav" }),
    });
    if (!resp.ok || !resp.body) {
      console.error("Error de OpenAI TTS:", resp.status, await resp.text().catch(() => ""));
      return new Response(JSON.stringify({ error: "No se pudo generar la voz" }), { status: 502, headers: headersJson });
    }
    // Se pasa el audio tal cual va llegando, sin esperar a tenerlo completo.
    return new Response(resp.body, { headers: { "Content-Type": "audio/wav", "Cache-Control": "no-store", ...corsHeaders } });
  } catch (err) {
    console.error("Error en voz-arkey:", err);
    return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: headersJson });
  }
});
