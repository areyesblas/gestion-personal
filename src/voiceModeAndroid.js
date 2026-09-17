import { useRef } from "react";

// Motor de voz del camino nativo del navegador (Chrome/Edge de escritorio, Android, o cualquier
// navegador con SpeechRecognition que no sea iOS Safari -- ver "usaSTTNativo" en VoiceMode.jsx,
// que decide cuál de los dos motores usar). Vive en su propio archivo a propósito: este es el
// camino que más bugs específicos de Android dio, así que separarlo permite seguir ajustándolo
// sin arriesgar tocar el camino de iOS (MediaRecorder + VAD + Whisper), que vive intacto dentro
// de VoiceMode.jsx.
//
// Bugs de Android encontrados y arreglados aquí (sesión del 15-16 sep 2026):
//  - "Solo saluda y no llega a escuchar": al terminar de hablar se arrancaba un SpeechRecognition
//    nuevo sin cerrar el que quedó corriendo durante el saludo -- Android solo permite una sesión
//    activa a la vez. Fix: iniciarEscucha() cierra cualquier reconocedor anterior antes de crear
//    uno nuevo.
//  - "No escucha" (root cause del anterior): además del propio reconocedor, se abría un
//    getUserMedia paralelo solo para un medidor visual que nunca se llegó a renderizar --
//    dos sesiones de micrófono compitiendo. Fix: se quitó ese medidor por completo.
//  - "Escucha todo y se vuelve loco": se dejaba el micrófono activo mientras Arkey hablaba para
//    detectar interrupciones por voz; sin audífonos, Arkey se escuchaba a sí mismo y se
//    auto-interrumpía en bucle. Fix: VoiceMode.jsx ya no llama a iniciarEscucha() mientras habla
//    (ver hablar() en App.jsx) -- este motor no necesita saber de eso, solo no se le pide.
//  - "Repite lo que escuchabas": cuando Android corta el reconocimiento a medio dictado, el
//    reinicio automático reusaba el mismo objeto SpeechRecognition, que a veces no reinicia de
//    verdad su lista interna de resultados -- el texto se duplicaba y crecía sin parar. Fix: cada
//    reinicio crea un objeto nuevo (vía iniciarEscucha(), no r.start() sobre el mismo objeto), y
//    el texto acumulado del turno vive en finalBufferRef (fuera del objeto) para sobrevivir a
//    esos reinicios sin duplicarse.
export function useMotorVozNativo({
  SpeechRecognitionCtor,
  micMutedRef,
  sinCreditosRef,
  estadoRef,
  abiertoRef,
  cambiarEstado,
  setErrorMsg,
  enviarTurno,
}) {
  const recognitionRef = useRef(null);
  const timerSilencioRef = useRef(null); // temporizador de 700ms que decide cuándo mandar lo que se dijo
  const finalBufferRef = useRef(""); // texto final acumulado del turno actual; vive fuera del reconocedor porque cada reinicio crea uno nuevo, y debe sobrevivir a esos reinicios sin duplicarse

  function iniciarEscucha() {
    if (micMutedRef.current) return; // el micrófono está muteado a propósito: no arrancamos hasta que se reactive
    if (sinCreditosRef.current) return; // sin consultas disponibles este mes: Arkey se queda dormido, no escucha
    // Si ya había un reconocedor corriendo hay que cerrarlo primero: Android solo permite una
    // sesión activa a la vez, y si se arranca una nueva sin cerrar la anterior, ninguna de las
    // dos termina escuchando bien (y de paso suenan los tonos de inicio/fin de Android en
    // conflicto uno con otro).
    const anterior = recognitionRef.current;
    if (anterior) {
      try { anterior.onresult = null; anterior.onerror = null; anterior.onend = null; anterior.onstart = null; } catch {}
      try { anterior.abort(); } catch {}
    }
    const r = new SpeechRecognitionCtor();
    r.lang = "es-MX";
    r.continuous = true;
    r.interimResults = true;
    // Marcador propio de hasta dónde ya se agregó a finalBufferRef, en vez de confiar a ciegas en
    // e.resultIndex (no es confiable en Android en modo continuo). Como esta sesión es un objeto
    // SpeechRecognition recién creado, e.results empieza vacío de verdad y arrancar en 0 es correcto.
    let indiceProcesado = 0;

    r.onresult = (e) => {
      if (estadoRef.current !== "escuchando") return;
      let huboCambio = false;
      for (let i = Math.max(e.resultIndex, indiceProcesado); i < e.results.length; i++) {
        if (!e.results[i].isFinal) continue;
        indiceProcesado = i + 1;
        const nuevo = (e.results[i][0].transcript || "").trim();
        if (!nuevo) continue;
        huboCambio = true;
        const actual = finalBufferRef.current;
        if (!actual) {
          finalBufferRef.current = nuevo;
          continue;
        }
        const actualMin = actual.toLowerCase();
        const nuevoMin = nuevo.toLowerCase();
        if (nuevoMin.includes(actualMin)) {
          // En modo continuo, Android a veces no segmenta limpio: en vez de mandar solo la
          // palabra nueva, re-finaliza el mismo tramo completo (con ligeras correcciones) como
          // un resultado "nuevo" -- si lo concatenáramos tal cual, el texto se repite y crece sin
          // parar (bug reportado: "hola hola hola me estas esuchando escuchando" de un solo
          // "hola me estás escuchando"). Si el resultado nuevo ya incluye completo lo que
          // teníamos, es una revisión más larga del mismo tramo: se reemplaza, no se concatena.
          finalBufferRef.current = nuevo;
        } else if (actualMin.includes(nuevoMin)) {
          // No aporta nada que no tuviéramos ya -- se ignora.
        } else {
          finalBufferRef.current = `${actual} ${nuevo}`;
        }
      }
      if (huboCambio && finalBufferRef.current.trim()) {
        if (timerSilencioRef.current) clearTimeout(timerSilencioRef.current);
        // Pequeña pausa antes de mandar, para no cortar al usuario si sigue hablando. Se guarda
        // en un ref (no en una variable local) para que detener() -- llamado al cerrar el panel
        // -- pueda cancelarlo; si no, este envío se dispara igual aunque el panel ya esté
        // cerrado, y al terminar de responder reactiva el micrófono solo.
        timerSilencioRef.current = setTimeout(() => {
          timerSilencioRef.current = null;
          const texto = finalBufferRef.current.trim();
          finalBufferRef.current = "";
          if (texto) {
            try { r.stop(); } catch {}
            enviarTurno(texto);
          }
        }, 700);
      }
    };
    r.onerror = (e) => {
      if (e.error === "no-speech" || e.error === "aborted") return;
      if (e.error === "not-allowed" || e.error === "service-not-allowed") {
        cambiarEstado("permiso");
        setErrorMsg("ARKEYONE necesita permiso de micrófono para el Modo Conversación.");
        return;
      }
      // Cualquier otro error (ej. "audio-capture", "network"): antes se ignoraba en silencio y
      // el panel se quedaba mostrando "Escuchando…" sin que nada funcionara de verdad. Mejor
      // avisar y dejar que r.onend intente reiniciar solo si seguimos en modo escucha.
      setErrorMsg(`Mic: ${e.error || "error desconocido"}`);
    };
    r.onend = () => {
      // Si seguimos abiertos y en modo escucha, se reinicia solo (el navegador a veces corta
      // el reconocimiento tras una pausa aunque continuous=true). Si el usuario muteó el mic a
      // propósito, no se reinicia hasta que él mismo lo reactive.
      // IMPORTANTE: se reinicia con un objeto SpeechRecognition NUEVO (iniciarEscucha), no
      // llamando r.start() sobre este mismo objeto -- en Android, reusar el mismo objeto a veces
      // no reinicia de verdad su lista interna de resultados, duplicando el texto acumulado.
      if (abiertoRef.current && estadoRef.current === "escuchando" && !micMutedRef.current) {
        iniciarEscucha();
      }
    };
    recognitionRef.current = r;
    try { r.start(); } catch { cambiarEstado("error"); setErrorMsg("No se pudo iniciar el micrófono."); }
  }

  // Corta ya lo que esté escuchando -- usado por el botón de mutear y por el respaldo manual de
  // "forzar fin de turno".
  function detenerEscuchaActual() {
    try { recognitionRef.current?.stop(); } catch {}
  }

  // Libera todo -- llamado al cerrar el panel del Modo Conversación.
  function detener() {
    // Desconectamos los handlers ANTES de abortar: si no, el propio r.onend puede disparar un
    // r.start() de auto-reinicio por una condición de carrera entre el evento asíncrono del
    // navegador y el cierre del panel.
    try {
      const r = recognitionRef.current;
      if (r) {
        r.onresult = null; r.onerror = null; r.onend = null; r.onstart = null; r.onspeechend = null; r.onaudioend = null;
        r.abort(); // abort() corta ya, sin esperar un resultado final como sí hace stop()
      }
    } catch {}
    recognitionRef.current = null;
    if (timerSilencioRef.current) { clearTimeout(timerSilencioRef.current); timerSilencioRef.current = null; }
    finalBufferRef.current = ""; // no dejar texto de un turno a medias colgado para la próxima vez que se abra el panel
  }

  return { iniciarEscucha, detenerEscuchaActual, detener };
}
