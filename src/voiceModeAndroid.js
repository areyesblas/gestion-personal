import { useRef } from "react";

// Motor de voz del camino nativo del navegador (Chrome/Edge de escritorio, Android, o cualquier
// navegador con SpeechRecognition que no sea iOS Safari -- ver "usaSTTNativo" en VoiceMode.jsx,
// que decide cuál de los dos motores usar). Vive en su propio archivo a propósito: este es el
// camino que más bugs específicos de Android dio (repetía texto, a veces no escuchaba, se
// auto-interrumpía en bucle), así que separarlo permite seguir ajustándolo sin arriesgar tocar
// el camino de iOS (MediaRecorder + VAD + Whisper), que vive intacto dentro de VoiceMode.jsx.
//
// Devuelve un puñado de funciones que VoiceMode.jsx llama en los mismos puntos donde antes
// llamaba directo a iniciarEscuchaNativa()/iniciarMedidorNivelNativo() -- el comportamiento no
// cambió con esta extracción, solo dónde vive el código.
export function useMotorVozNativo({
  SpeechRecognitionCtor,
  micMutedRef,
  sinCreditosRef,
  estadoRef,
  abiertoRef,
  cambiarEstado,
  setErrorMsg,
  enviarTurno,
  nivelAnalyserRef,
}) {
  const recognitionRef = useRef(null);
  const timerSilencioRef = useRef(null); // temporizador de 700ms que decide cuándo mandar lo que se dijo
  const medidorStreamRef = useRef(null); // stream propio solo para medir nivel, ya que SpeechRecognition no expone el audio crudo
  const medidorCtxRef = useRef(null);
  const medidorAnalyserRef = useRef(null);

  // SpeechRecognition no expone el audio crudo del micrófono, así que para poder mostrar el
  // nivel (y mutear de verdad lo que se manda a transcribir) abrimos un stream propio en
  // paralelo, solo para medir y para el track.enabled.
  async function iniciarMedidorNivel() {
    if (medidorStreamRef.current || !navigator.mediaDevices?.getUserMedia) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      medidorStreamRef.current = stream;
      stream.getAudioTracks().forEach((t) => { t.enabled = !micMutedRef.current; });
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      const ctx = new AudioCtx();
      medidorCtxRef.current = ctx;
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 1024;
      source.connect(analyser);
      medidorAnalyserRef.current = analyser;
      nivelAnalyserRef.current = analyser;
    } catch {} // si falla, el reconocimiento sigue funcionando normal, solo no hay medidor visual
  }

  function iniciarEscucha() {
    if (micMutedRef.current) return; // el micrófono está muteado a propósito: no arrancamos hasta que se reactive
    if (sinCreditosRef.current) return; // sin consultas disponibles este mes: Arkey se queda dormido, no escucha
    const r = new SpeechRecognitionCtor();
    r.lang = "es-MX";
    r.continuous = true;
    r.interimResults = true;
    let finalBuffer = "";

    r.onresult = (e) => {
      // Si la IA está hablando y detectamos cualquier voz, es una interrupción (barge-in):
      // corta la lectura y pasa a escuchar de verdad lo que está diciendo el usuario.
      if (estadoRef.current === "hablando") {
        try { window.speechSynthesis.cancel(); } catch {}
        cambiarEstado("escuchando");
        return;
      }
      if (estadoRef.current !== "escuchando") return;
      let final = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) final += e.results[i][0].transcript;
      }
      if (final.trim()) {
        finalBuffer += (finalBuffer ? " " : "") + final.trim();
        if (timerSilencioRef.current) clearTimeout(timerSilencioRef.current);
        // Pequeña pausa antes de mandar, para no cortar al usuario si sigue hablando. Se guarda
        // en un ref (no en una variable local) para que detener() -- llamado al cerrar el panel
        // -- pueda cancelarlo; si no, este envío se dispara igual aunque el panel ya esté
        // cerrado, y al terminar de responder reactiva el micrófono solo.
        timerSilencioRef.current = setTimeout(() => {
          timerSilencioRef.current = null;
          const texto = finalBuffer.trim();
          finalBuffer = "";
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
      }
    };
    r.onend = () => {
      // Si seguimos abiertos y en modo escucha, se reinicia solo (el navegador a veces corta
      // el reconocimiento tras una pausa aunque continuous=true). Si el usuario muteó el mic a
      // propósito, no se reinicia hasta que él mismo lo reactive.
      if (abiertoRef.current && estadoRef.current === "escuchando" && !micMutedRef.current) {
        try { r.start(); } catch {}
      }
    };
    recognitionRef.current = r;
    try { r.start(); } catch { cambiarEstado("error"); setErrorMsg("No se pudo iniciar el micrófono."); }
  }

  // Corta ya lo que esté escuchando (turno normal o barge-in) -- usado por el botón de mutear y
  // por el respaldo manual de "forzar fin de turno".
  function detenerEscuchaActual() {
    try { recognitionRef.current?.stop(); } catch {}
  }

  function mutearMedidor(mut) {
    try { medidorStreamRef.current?.getAudioTracks().forEach((t) => { t.enabled = !mut; }); } catch {}
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
    try { medidorStreamRef.current?.getTracks().forEach((t) => t.stop()); } catch {}
    medidorStreamRef.current = null;
    try { medidorCtxRef.current?.close(); } catch {}
    medidorCtxRef.current = null;
    medidorAnalyserRef.current = null;
  }

  return { iniciarMedidorNivel, iniciarEscucha, detenerEscuchaActual, mutearMedidor, detener };
}
