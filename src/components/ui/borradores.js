// src/components/ui/borradores.js
//
// "Cambios sin guardar": el hook useBorrador y el registro global que lo acompaña.
//
// Salio de App.jsx el 5 oct 2026 al arreglar el bug que dejo Tareas, Atenciones y Movimientos en
// blanco. En la Fase 0c se movio SelectGuardable a components/ui/campos.jsx sin su dependencia
// useBorrador, que se quedo aqui: al renderizar el componente tronaba con ReferenceError y React
// desmontaba la pantalla completa.
//
// Los tres van JUNTOS en este archivo a proposito. borradoresPendientes es un registro global y
// tiene que ser UNO SOLO: si el hook viviera en un modulo y confirmarDescartarCambios en otro,
// cada uno tendria su propio Set y la advertencia de "cambios sin guardar" no veria los borradores
// que registra el hook. Los modulos de ES son instancias unicas, asi que teniendolos aqui los dos
// comparten el mismo Set por mas archivos que los importen.

import { useState, useEffect, useRef } from "react";

/* ---------- Cambios sin guardar ----------
   Hasta ahora varios controles escribían en la base en cuanto los movías —el avance de una
   tarea, el estado de un proyecto— y no había forma de arrepentirse. Angel pidió lo contrario:
   que cambiar un dato no guarde, que haya botón de Guardar, y que al salir con cambios
   pendientes la app pregunte antes de perderlos.

   El registro es global a propósito: quien quiera salir (cambiar de pantalla, cerrar el panel,
   cerrar la pestaña) solo necesita preguntar "¿hay algo sin guardar?", sin saber quién lo tiene
   ni dónde está. */
const borradoresPendientes = new Set();

export function confirmarDescartarCambios() {
  if (borradoresPendientes.size === 0) return true;
  return window.confirm("Tienes cambios sin guardar. ¿Quieres descartarlos y salir?");
}

// Avisa también al cerrar la pestaña o recargar. El navegador enseña su propio texto; lo único
// que podemos hacer es pedirle que pregunte.
if (typeof window !== "undefined") {
  window.addEventListener("beforeunload", (e) => {
    if (borradoresPendientes.size === 0) return;
    e.preventDefault();
    e.returnValue = "";
  });
}

// Borrador de un formulario en línea: mantiene una copia local de los campos, dice si hay algo
// distinto de lo guardado y se apunta en el registro mientras lo haya.
export function useBorrador(original) {
  const firma = JSON.stringify(original);
  const marcaRef = useRef({});
  // El borrador guarda JUNTO con los datos la firma del registro del que salieron. Así, cuando
  // se elige otro registro, el reinicio pasa durante el render y no en un efecto posterior.
  //
  // Antes el reinicio vivía en un useEffect y eso causaba un bug de verdad, no solo cosmético
  // (reportado el 4 oct 2026 en Notas, pero pasaba igual en la ficha de tarea y en la de
  // proyecto): al cambiar de registro quedaba un render con los datos del ANTERIOR y la firma
  // del NUEVO, así que la barra de "Guardar cambios" aparecía sola —el botón amarillo que se ve
  // y se va— y, si alguien alcanzaba a picarla, escribía el contenido del registro anterior
  // encima del que acababa de abrir.
  const [estado, setEstado] = useState({ firma, datos: original });
  if (estado.firma !== firma) setEstado({ firma, datos: original });
  const borrador = estado.firma === firma ? estado.datos : original;
  const setBorrador = (fn) => setEstado((prev) => ({ firma, datos: typeof fn === "function" ? fn(prev.datos) : fn }));

  const sucio = JSON.stringify(borrador) !== firma;
  useEffect(() => {
    const marca = marcaRef.current;
    if (sucio) borradoresPendientes.add(marca); else borradoresPendientes.delete(marca);
    return () => borradoresPendientes.delete(marca);
  }, [sucio]);

  const cambiar = (parche) => setBorrador((prev) => ({ ...prev, ...parche }));
  const descartar = () => setBorrador(original);
  return { borrador, cambiar, descartar, sucio };
}
