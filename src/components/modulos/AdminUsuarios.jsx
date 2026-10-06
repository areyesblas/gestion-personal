// src/components/modulos/AdminUsuarios.jsx
//
// Modulo perezoso (Fase 2). Salio de App.jsx el 5 oct 2026; se mudaron con el sus propias
// piezas (ninguna), que nadie mas usaba.

import { AlertTriangle } from "lucide-react";
import { Badge } from "../ui/basicos";
import { CampoPassword } from "../ui/campos";
import { supabase } from "../../supabaseClient";
import { tokenDeSesion } from "../../lib/sesion";
import { useEffect, useState } from "react";

export default function AdminUsuarios({ adminUid, adminEmail }) {
  const [usuarios, setUsuarios] = useState(null); // null = cargando
  const [error, setError] = useState("");
  const [accionEnCurso, setAccionEnCurso] = useState(null); // id del usuario sobre el que se está actuando
  const [confirmar, setConfirmar] = useState(null); // { usuario, tipo: "bloquear" | "reactivar" | "eliminar" }
  const [confirmarPassword, setConfirmarPassword] = useState("");
  const [confirmarError, setConfirmarError] = useState("");

  const llamar = async (action, userId) => {
    const token = await tokenDeSesion();
    const resp = await fetch(`${supabase.supabaseUrl}/functions/v1/admin-usuarios`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ action, userId }),
    });
    return resp.json();
  };

  const cargar = async () => {
    setError("");
    const resultado = await llamar("listar");
    if (resultado.error) { setError(resultado.error); setUsuarios([]); return; }
    setUsuarios(resultado.usuarios.sort((a, b) => new Date(b.creado) - new Date(a.creado)));
  };
  useEffect(() => { cargar(); }, []);

  const ejecutarAccion = async (usuario, tipo) => {
    if (tipo === "eliminar") {
      if (!confirmarPassword) { setConfirmarError("Escribe tu contraseña para confirmar."); return; }
      setAccionEnCurso(usuario.id);
      // Reautenticación obligatoria antes de un borrado irreversible de cuenta y todos sus datos.
      const { error: errAuth } = await supabase.auth.signInWithPassword({ email: adminEmail, password: confirmarPassword });
      if (errAuth) { setAccionEnCurso(null); setConfirmarError("Contraseña incorrecta."); return; }
    } else {
      setAccionEnCurso(usuario.id);
    }
    const resultado = await llamar(tipo, usuario.id);
    setAccionEnCurso(null);
    setConfirmar(null);
    setConfirmarPassword("");
    setConfirmarError("");
    if (resultado.error) { alert(resultado.error); return; }
    cargar();
  };

  return (
    <div>
      <h2 className="gp-serif text-xl mb-1">Administración — Usuarios</h2>
      <p className="text-sm gp-text-muted mb-4">Todas las cuentas registradas en ArkeyOne. Esta pantalla solo tú la puedes ver.</p>

      {usuarios === null && <p className="text-sm gp-text-muted">Cargando…</p>}
      {error && <p className="text-sm gp-text-red mb-3">{error}</p>}

      {usuarios && usuarios.length > 0 && (
        <div className="gp-panel overflow-x-auto">
          <table className="gp-table">
            <thead><tr>
              <th className="text-left">Correo</th>
              <th className="text-left">Registrado</th>
              <th className="text-left">Último acceso</th>
              <th className="text-left">Estado</th>
              <th></th>
            </tr></thead>
            <tbody>
              {usuarios.map((u) => (
                <tr key={u.id}>
                  <td>{u.email}{u.id === adminUid && <Badge tone="gold">tú</Badge>}</td>
                  <td className="text-xs gp-text-muted">{u.creado ? new Date(u.creado).toLocaleDateString("es-MX") : "—"}</td>
                  <td className="text-xs gp-text-muted">{u.ultimoAcceso ? new Date(u.ultimoAcceso).toLocaleDateString("es-MX") : "Nunca"}</td>
                  <td>{u.bloqueado ? <Badge tone="red">Bloqueado</Badge> : <Badge tone="teal">Activo</Badge>}</td>
                  <td className="text-right">
                    {u.id !== adminUid && (
                      <div className="flex gap-1 justify-end">
                        {u.bloqueado ? (
                          <button disabled={accionEnCurso === u.id} onClick={() => setConfirmar({ usuario: u, tipo: "reactivar" })} className="text-xs gp-text-teal">Reactivar</button>
                        ) : (
                          <button disabled={accionEnCurso === u.id} onClick={() => setConfirmar({ usuario: u, tipo: "bloquear" })} className="text-xs gp-text-gold">Bloquear</button>
                        )}
                        <button disabled={accionEnCurso === u.id} onClick={() => { setConfirmar({ usuario: u, tipo: "eliminar" }); setConfirmarPassword(""); setConfirmarError(""); }} className="text-xs gp-text-red">Eliminar</button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {confirmar && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,.6)" }} onClick={() => setConfirmar(null)}>
          <div className="gp-panel w-full max-w-sm p-5" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle size={16} className="gp-text-red" />
              <h3 className="gp-serif text-lg">
                {confirmar.tipo === "bloquear" && "¿Bloquear esta cuenta?"}
                {confirmar.tipo === "reactivar" && "¿Reactivar esta cuenta?"}
                {confirmar.tipo === "eliminar" && "¿Eliminar esta cuenta por completo?"}
              </h3>
            </div>
            <p className="text-sm gp-text-muted mb-5">
              {confirmar.tipo === "bloquear" && `${confirmar.usuario.email} no va a poder iniciar sesión, pero su información se conserva por si la reactivas.`}
              {confirmar.tipo === "reactivar" && `${confirmar.usuario.email} va a poder volver a entrar normalmente.`}
              {confirmar.tipo === "eliminar" && `Se borra la cuenta de ${confirmar.usuario.email} y absolutamente toda su información (proyectos, finanzas, todo). Esto NO se puede deshacer.`}
            </p>
            {confirmar.tipo === "eliminar" && (
              <div className="mb-4">
                <p className="text-xs gp-text-muted mb-1">Por seguridad, escribe tu contraseña para confirmar:</p>
                <CampoPassword
                  autoFocus
                  value={confirmarPassword}
                  onChange={(e) => { setConfirmarPassword(e.target.value); setConfirmarError(""); }}
                  onKeyDown={(e) => { if (e.key === "Enter") ejecutarAccion(confirmar.usuario, confirmar.tipo); }}
                  placeholder="Tu contraseña"
                  className="gp-input w-full"
                />
                {confirmarError && <p className="text-xs text-red-400 mt-1">{confirmarError}</p>}
              </div>
            )}
            <div className="flex gap-2">
              <button onClick={() => { setConfirmar(null); setConfirmarPassword(""); setConfirmarError(""); }} className="gp-btn-ghost flex-1 py-2 text-sm">Cancelar</button>
              <button
                onClick={() => ejecutarAccion(confirmar.usuario, confirmar.tipo)}
                disabled={accionEnCurso === confirmar.usuario.id}
                className="flex-1 py-2 text-sm rounded disabled:opacity-50"
                style={{ background: confirmar.tipo === "eliminar" ? "var(--red)" : "var(--gold)", color: confirmar.tipo === "eliminar" ? "#fff" : "#161822" }}
              >
                {accionEnCurso === confirmar.usuario.id ? "Verificando…" : <>
                  {confirmar.tipo === "bloquear" && "Bloquear"}
                  {confirmar.tipo === "reactivar" && "Reactivar"}
                  {confirmar.tipo === "eliminar" && "Eliminar todo"}
                </>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
