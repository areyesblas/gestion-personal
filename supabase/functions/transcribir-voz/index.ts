// Transcribe un audio grabado por el navegador a texto, usando OpenAI Whisper.
//
// Por que existe esta funcion separada de asistente-ia: Safari en iOS (incluida la PWA
// instalada) NO soporta el reconocimiento de voz nativo del navegador (SpeechRecognition/
// webkitSpeechRecognition) -- es una restriccion de WebKit, no de ARKEYONE. En Chrome/Android
// el frontend sigue usando el reconocimiento nativo del navegador (gratis, sin esta funcion).
// En iOS, el frontend graba el audio con MediaRecorder y lo manda aqui para transcribirlo.
//
// Ni Claude ni Supabase ofrecen speech-to-text, por eso se usa un proveedor aparte (OpenAI
// Whisper). Esta funcion solo transcribe -- no toca ningun dato de ARKEYONE ni llama al
// asistente; el texto resultante se manda despues a asistente-ia como si el usuario lo
// hubiera escrito.
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
function esAlucinacion(texto: string) {
  const t = normalizar(texto);
  if (!t) return true;
  // Créditos de subtítulos: aparezcan donde aparezcan, el turno no sirve.
  if (t.includes("amara") || t.includes("subtitulos realizados") || t.includes("subtitulado por")) return true;
  // Muletillas cortas: solo se descartan si son TODO lo que se transcribió.
  const sinPunto = t.replace(/\./g, "").trim();
  return ALUCINACIONES.includes(sinPunto);
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
    whisperForm.append("model", "whisper-1");
    whisperForm.append("language", "es");
    whisperForm.append("temperature", "0");
    // Contexto para Whisper: reduce las alucinaciones en audio con poco habla y le enseña a
    // escribir bien los nombres propios ("ARKEYONE", no "Arqui One").
    whisperForm.append("prompt", "Conversación en español de México con Arkey, el asistente de ARKEYONE, sobre tareas, finanzas, citas, contactos y proyectos.");

    const resp = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: { Authorization: `Bearer ${OPENAI_API_KEY}` },
      body: whisperForm,
    });

    if (!resp.ok) {
      const detalle = await resp.text();
      console.error("Error de OpenAI Whisper:", detalle);
      return new Response(JSON.stringify({ error: "No se pudo transcribir el audio. Intenta de nuevo." }), { status: 502, headers: headersJson });
    }

    const data = await resp.json();
    const texto = (data.text || "").trim();
    // Whisper "alucina" frases de créditos de video cuando el audio es ruido o silencio (las
    // aprendió de subtítulos de YouTube). Si la transcripción es solo eso, se descarta como si no
    // se hubiera dicho nada y el cliente vuelve a escuchar sin gastar una consulta del asistente.
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
