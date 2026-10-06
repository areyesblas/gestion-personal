// src/lib/sesion.js
//
// Token de la sesion para llamar a las Edge Functions.
//
// POR QUE EXISTE (6 oct 2026). Habia diez sitios con este patron:
//
//     const { data: sesion } = await supabase.auth.getSession();
//     ... Authorization: `Bearer ${sesion.session.access_token}`
//
// `getSession()` devuelve `{ data: { session: null } }` cuando no hay sesion, asi que leer
// `.access_token` ahi lanza un TypeError ("Cannot read properties of null"). El usuario no se
// enteraba de nada util: segun el sitio, el error se iba a la consola, o salia un alert que
// hablaba de otra cosa, o el boton simplemente no hacia nada. Salio al probar los modulos de la
// Fase 2e sin sesion; el patron venia desde antes del corte por modulos.
//
// LO QUE ESTE HELPER NO HACE, a proposito: no cierra la sesion ni manda al login por su cuenta.
// Seria facil y se ve bien, pero el CLAUDE.md trae un bug conocido de logout automatico a los
// 30-60 seg cuya causa esta en el frontend, y meter otro camino que pueda sacar al usuario con
// un `getSession()` que falle un instante es justo lo que no conviene mientras eso siga abierto.
// Aqui solo se lanza un error con un mensaje que el usuario entiende, y cada pantalla lo maneja
// como ya lo hacia (unas lo muestran, otras lo registran).

import { supabase } from "../supabaseClient";

export async function tokenDeSesion() {
  const { data } = await supabase.auth.getSession();
  const token = data?.session?.access_token;
  if (!token) throw new Error("Tu sesión ya no está activa. Vuelve a entrar para continuar.");
  return token;
}
