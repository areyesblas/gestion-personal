// src/components/modulos/Colaboradores.jsx
//
// Modulo perezoso (Fase 2). Salio de App.jsx el 5 oct 2026; se mudaron con el sus propias
// piezas (InvitarForm), que nadie mas usaba.

import { AlertTriangle, Plus, Trash2, X } from "lucide-react";
import { Badge, Field, IconBtn } from "../ui/basicos";
import { ETIQUETA_TABLA, TABLES, tableName } from "../../lib/datos";
import { Modal } from "../ui/Modal";
import { supabase } from "../../supabaseClient";
import { tokenDeSesion } from "../../lib/sesion";
import { useEffect, useState } from "react";

export default function Colaboradores({ misId, miEmail, contactos }) {
  const [lista, setLista] = useState(null);
  const [modal, setModal] = useState(false);
  const [busy, setBusy] = useState(null);
  const [revocarConfirm, setRevocarConfirm] = useState(null);
  const [eliminarConfirm, setEliminarConfirm] = useState(null);
  const [avisoCorreo, setAvisoCorreo] = useState(null); // { id, ok, mensaje }
  const [cuidadoModal, setCuidadoModal] = useState(null); // colaborador para el que se gestionan dependientes

  const cargar = async () => {
    setLista(null);
    const { data, error } = await supabase.from("colaboradores").select("*, colaborador_dependientes(id, contacto_id)").eq("propietario_id", misId).order("created_at", { ascending: false });
    if (error) { console.error("Error al cargar colaboradores:", error); setLista([]); return; }
    setLista(data);
  };
  useEffect(() => { cargar(); }, []);

  const nombreContacto = (id) => (contactos || []).find((c) => c.id === id)?.nombre || "—";

  const agregarDependiente = async (colaboradorId, contactoId) => {
    const { error } = await supabase.from("colaborador_dependientes").insert({ colaborador_id: colaboradorId, propietario_id: misId, contacto_id: contactoId });
    if (error) { alert("No se pudo agregar: " + error.message); return; }
    cargar();
  };
  const quitarDependiente = async (dependienteId) => {
    const { error } = await supabase.from("colaborador_dependientes").delete().eq("id", dependienteId);
    if (error) { alert("No se pudo quitar: " + error.message); return; }
    cargar();
  };

  // Llama a la Edge Function que manda el correo de invitación por Resend.
  // Blindado con try/catch: si falla la red o el fetch se cae (ej. CORS, sin conexión),
  // nunca debe dejar el botón pegado en "Invitando…" — siempre regresa un resultado.
  const enviarCorreoInvitacion = async (colaboradorId) => {
    try {
      const token = await tokenDeSesion();
      const resp = await fetch(`${supabase.supabaseUrl}/functions/v1/invitar-colaborador`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ colaboradorId }),
      });
      const json = await resp.json().catch(() => ({}));
      return { ok: resp.ok, json };
    } catch (err) {
      console.error("Error al enviar correo de invitación:", err);
      return { ok: false, json: { error: String(err) } };
    }
  };

  const invitar = async ({ nombre, correo, modulos }) => {
    setBusy("nuevo");
    const modulosSnake = modulos.map((k) => tableName(k));
    // "comentarios" siempre viene incluido si se dio acceso a cualquier módulo, para que vean la bitácora.
    if (modulosSnake.length && !modulosSnake.includes("comentarios")) modulosSnake.push("comentarios");
    // las valuaciones de patrimonio van junto con el módulo de patrimonio.
    if (modulos.includes("patrimonio") && !modulosSnake.includes("patrimonio_valuaciones")) modulosSnake.push("patrimonio_valuaciones");
    const { data: fila, error } = await supabase.from("colaboradores").insert({
      propietario_id: misId, propietario_email: miEmail,
      colaborador_email: correo.trim().toLowerCase(), colaborador_nombre: nombre || null, modulos: modulosSnake, estatus: "Pendiente",
    }).select().single();
    if (error) { setBusy(null); alert("No se pudo invitar: " + error.message); return; }
    const { ok } = await enviarCorreoInvitacion(fila.id);
    setBusy(null);
    setModal(false);
    setAvisoCorreo({ id: fila.id, ok, mensaje: ok ? `Se envió el correo de invitación a ${fila.colaborador_email}.` : `Se guardó la invitación, pero no se pudo enviar el correo a ${fila.colaborador_email}. Puedes reenviarlo desde el botón "Reenviar correo".` });
    cargar();
  };

  const reenviarInvitacion = async (c) => {
    setBusy(c.id);
    const { ok } = await enviarCorreoInvitacion(c.id);
    setBusy(null);
    setAvisoCorreo({ id: c.id, ok, mensaje: ok ? `Se reenvió el correo de invitación a ${c.colaborador_email}.` : `No se pudo enviar el correo a ${c.colaborador_email}. Inténtalo de nuevo en un momento.` });
  };

  const revocar = async (id) => {
    setBusy(id);
    const { error } = await supabase.from("colaboradores").update({ estatus: "Revocado" }).eq("id", id);
    setBusy(null);
    if (error) { alert("No se pudo revocar."); return; }
    setRevocarConfirm(null);
    cargar();
  };

  const reactivar = async (id) => {
    setBusy(id);
    const { error } = await supabase.from("colaboradores").update({ estatus: "Activo" }).eq("id", id);
    setBusy(null);
    if (error) { alert("No se pudo reactivar."); return; }
    cargar();
  };

  const eliminar = async (id) => {
    setBusy(id);
    const { error } = await supabase.from("colaboradores").delete().eq("id", id);
    setBusy(null);
    if (error) { alert("No se pudo eliminar: " + error.message); return; }
    setEliminarConfirm(null);
    cargar();
  };

  const toneEstatus = { Activo: "teal", Pendiente: "gold", Revocado: "red" };

  return (
    <div>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-1">
        <h2 className="gp-serif text-2xl">Colaboradores</h2>
        <button onClick={() => setModal(true)} className="gp-btn flex items-center justify-center gap-1 px-3 py-1.5 text-sm w-full sm:w-auto"><Plus size={14} /> Invitar</button>
      </div>
      <p className="text-sm gp-text-muted mb-6">Invita por correo a alguien (tu contador, un asistente) y elige exactamente qué módulos puede ver y editar dentro de tu cuenta.</p>

      {avisoCorreo && (
        <div className="gp-panel-hi p-3 mb-4 text-xs flex items-start justify-between gap-3" style={{ borderLeft: `3px solid ${avisoCorreo.ok ? "var(--teal)" : "var(--red)"}` }}>
          <span>{avisoCorreo.mensaje}</span>
          <button onClick={() => setAvisoCorreo(null)} className="gp-text-muted shrink-0"><X size={14} /></button>
        </div>
      )}

      {lista === null && <p className="text-sm gp-text-muted">Cargando…</p>}
      {lista !== null && lista.length === 0 && <p className="text-sm gp-text-muted">Aún no has invitado a nadie.</p>}

      {lista !== null && lista.length > 0 && (
        <div className="space-y-2">
          {lista.map((c) => (
            <div key={c.id} className="gp-panel p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    {c.colaborador_nombre ? (
                      <>
                        <span className="text-sm font-medium truncate">{c.colaborador_nombre}</span>
                        <span className="text-xs gp-text-muted truncate">{c.colaborador_email}</span>
                      </>
                    ) : (
                      <span className="text-sm font-medium truncate">{c.colaborador_email}</span>
                    )}
                    <Badge tone={toneEstatus[c.estatus]}>{c.estatus}</Badge>
                  </div>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {(c.modulos || []).filter((m) => m !== "comentarios").map((m) => {
                      const key = Object.keys(ETIQUETA_TABLA).find((k) => tableName(k) === m);
                      return <Badge key={m} tone="muted">{key ? ETIQUETA_TABLA[key] : m}</Badge>;
                    })}
                    {(c.colaborador_dependientes || []).map((d) => (
                      <Badge key={d.id} tone="teal">Cuidador de {nombreContacto(d.contacto_id)}</Badge>
                    ))}
                  </div>
                </div>
                <div className="flex gap-1 shrink-0">
                  {c.estatus === "Pendiente" && (
                    <button disabled={busy === c.id} onClick={() => reenviarInvitacion(c)} className="gp-btn-ghost px-3 py-1.5 text-xs whitespace-nowrap">
                      {busy === c.id ? "Enviando…" : "Reenviar correo"}
                    </button>
                  )}
                  {c.estatus === "Revocado" ? (
                    <button disabled={busy === c.id} onClick={() => reactivar(c.id)} className="gp-btn-ghost px-3 py-1.5 text-xs">Reactivar</button>
                  ) : (
                    <button disabled={busy === c.id} onClick={() => setRevocarConfirm(c)} className="px-3 py-1.5 text-xs rounded" style={{ background: "var(--red)", color: "#fff" }}>Revocar</button>
                  )}
                  <IconBtn onClick={() => setEliminarConfirm(c)} title="Eliminar colaborador"><Trash2 size={13} /></IconBtn>
                </div>
              </div>
              {c.estatus === "Pendiente" && <p className="text-xs gp-text-muted mt-2">Ya le mandamos un correo de invitación. Se activa solo en cuanto esa persona cree su cuenta o inicie sesión con ese correo.</p>}
              {c.estatus !== "Revocado" && (
                <button onClick={() => setCuidadoModal(c)} className="text-xs gp-text-gold mt-2">Gestionar personas a cargo (Cuidador)</button>
              )}
            </div>
          ))}
        </div>
      )}

      {revocarConfirm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,.6)" }} onClick={() => setRevocarConfirm(null)}>
          <div className="gp-panel w-full max-w-sm p-5" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-2 mb-2"><AlertTriangle size={16} className="gp-text-red" /><h3 className="gp-serif text-lg">¿Revocar acceso?</h3></div>
            <p className="text-sm gp-text-muted mb-5">{revocarConfirm.colaborador_email} ya no va a poder ver ni editar nada de tu cuenta. Puedes reactivarlo después si quieres.</p>
            <div className="flex gap-2">
              <button onClick={() => setRevocarConfirm(null)} className="gp-btn-ghost flex-1 py-2 text-sm">Cancelar</button>
              <button onClick={() => revocar(revocarConfirm.id)} className="flex-1 py-2 text-sm rounded" style={{ background: "var(--red)", color: "#fff" }}>Revocar</button>
            </div>
          </div>
        </div>
      )}

      {eliminarConfirm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,.6)" }} onClick={() => setEliminarConfirm(null)}>
          <div className="gp-panel w-full max-w-sm p-5" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-2 mb-2"><Trash2 size={16} className="gp-text-red" /><h3 className="gp-serif text-lg">¿Eliminar colaborador?</h3></div>
            <p className="text-sm gp-text-muted mb-5">Se borra por completo el registro de {eliminarConfirm.colaborador_nombre || eliminarConfirm.colaborador_email} de tu lista de colaboradores. Esto no borra ninguna tarea que ya le hayas asignado, pero si quieres volver a darle acceso vas a tener que invitarlo de nuevo.</p>
            <div className="flex gap-2">
              <button onClick={() => setEliminarConfirm(null)} className="gp-btn-ghost flex-1 py-2 text-sm">Cancelar</button>
              <button disabled={busy === eliminarConfirm.id} onClick={() => eliminar(eliminarConfirm.id)} className="flex-1 py-2 text-sm rounded" style={{ background: "var(--red)", color: "#fff" }}>Eliminar</button>
            </div>
          </div>
        </div>
      )}

      {modal && (
        <Modal title="Invitar colaborador" onClose={() => setModal(false)}>
          <InvitarForm busy={busy === "nuevo"} onSave={invitar} />
        </Modal>
      )}

      {cuidadoModal && (
        <Modal title={`Personas a cargo de ${cuidadoModal.colaborador_nombre || cuidadoModal.colaborador_email}`} onClose={() => setCuidadoModal(null)}>
          <p className="text-xs gp-text-muted mb-3">
            Marca los contactos que esta persona puede acompañar como Cuidador: va a poder ver y registrar Salud y Medicamentos solo de quienes marques aquí, sin acceso al resto de tu cuenta — aunque no le hayas dado el módulo completo de Salud.
          </p>
          {(contactos || []).length === 0 ? (
            <p className="text-sm gp-text-muted">No tienes contactos todavía. Crea uno primero desde Contactos.</p>
          ) : (
            <div className="flex flex-col gap-1 max-h-72 overflow-y-auto gp-scroll">
              {(contactos || []).map((ct) => {
                const dep = (lista.find((c) => c.id === cuidadoModal.id)?.colaborador_dependientes || []).find((d) => d.contacto_id === ct.id);
                return (
                  <label key={ct.id} className="flex items-center gap-2 text-sm py-1.5">
                    <input
                      type="checkbox"
                      checked={!!dep}
                      onChange={() => (dep ? quitarDependiente(dep.id) : agregarDependiente(cuidadoModal.id, ct.id))}
                    />
                    {ct.nombre}
                  </label>
                );
              })}
            </div>
          )}
          <button onClick={() => setCuidadoModal(null)} className="gp-btn w-full py-2 text-sm mt-4">Listo</button>
        </Modal>
      )}
    </div>
  );
}

function InvitarForm({ onSave, busy }) {
  const [nombre, setNombre] = useState("");
  const [correo, setCorreo] = useState("");
  const [modulos, setModulos] = useState([]);
  const [error, setError] = useState("");

  const toggle = (key) => setModulos((prev) => prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]);

  return (
    <div>
      <Field label="Nombre (opcional)"><input className="gp-input" placeholder="ej. Mi contador, Juan asistente" value={nombre} onChange={(e) => setNombre(e.target.value)} /></Field>
      <Field label="Correo de la persona"><input type="email" className="gp-input" value={correo} onChange={(e) => setCorreo(e.target.value)} /></Field>
      <p className="text-xs gp-text-muted mb-2">¿Qué puede ver y editar?</p>
      <div className="grid grid-cols-2 gap-1.5 mb-4 max-h-56 overflow-y-auto gp-scroll">
        {TABLES.filter((k) => k !== "comentarios" && k !== "patrimonioValuaciones" && k !== "campanaActividades").map((k) => (
          <label key={k} className="flex items-center gap-1.5 text-xs">
            <input type="checkbox" checked={modulos.includes(k)} onChange={() => toggle(k)} />
            {ETIQUETA_TABLA[k] || k}
          </label>
        ))}
      </div>
      {error && <p className="text-xs gp-text-red mb-2">{error}</p>}
      <button
        className="gp-btn w-full py-2 text-sm mt-1 disabled:opacity-50"
        disabled={busy}
        onClick={() => {
          if (!correo.trim() || !correo.includes("@")) { setError("Captura un correo válido."); return; }
          if (modulos.length === 0) { setError("Elige al menos un módulo."); return; }
          setError("");
          onSave({ nombre: nombre.trim(), correo, modulos });
        }}
      >
        {busy ? "Invitando…" : "Invitar"}
      </button>
    </div>
  );
}
