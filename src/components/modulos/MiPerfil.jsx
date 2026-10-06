// src/components/modulos/MiPerfil.jsx
//
// Modulo perezoso (Fase 2). Salio de App.jsx el 5 oct 2026; se mudaron con el sus propias
// piezas (ninguna), que nadie mas usaba.

import { Field, IconBtn } from "../ui/basicos";
import { MapPin, Pencil, Trash2 } from "lucide-react";
import { useState } from "react";

/* ---------- Mi Perfil (bio, estudios, habilidades, redes — configuración personal, no una lista
   de registros; se guarda en preferencias, igual que nombre_mostrar/ciudad/avatar). No incluye
   generador de CV ni QR de invitación -- quedan para una ronda posterior (documento consolidado
   secc. 13), esto es solo la ficha editable. ---------- */
export default function MiPerfil({ nombreMostrar, avatarUrl, ciudad, bio, estudios, habilidades, redes, onGuardar }) {
  const [editando, setEditando] = useState(false);
  const [v, setV] = useState({ bio: bio || "", estudios: estudios || [], habilidades: habilidades || [], redes: redes || [] });
  const [habilidadNueva, setHabilidadNueva] = useState("");
  const [guardando, setGuardando] = useState(false);

  const empezarEdicion = () => { setV({ bio: bio || "", estudios: estudios || [], habilidades: habilidades || [], redes: redes || [] }); setEditando(true); };
  const guardar = async () => { setGuardando(true); await onGuardar(v); setGuardando(false); setEditando(false); };

  const agregarEstudio = () => setV({ ...v, estudios: [...v.estudios, { institucion: "", titulo: "", anio: "" }] });
  const editarEstudio = (i, patch) => setV({ ...v, estudios: v.estudios.map((e, idx) => (idx === i ? { ...e, ...patch } : e)) });
  const quitarEstudio = (i) => setV({ ...v, estudios: v.estudios.filter((_, idx) => idx !== i) });

  const agregarHabilidad = () => {
    const h = habilidadNueva.trim();
    if (h && !v.habilidades.includes(h)) setV({ ...v, habilidades: [...v.habilidades, h] });
    setHabilidadNueva("");
  };
  const quitarHabilidad = (h) => setV({ ...v, habilidades: v.habilidades.filter((x) => x !== h) });

  const agregarRed = () => setV({ ...v, redes: [...v.redes, { red: "", url: "" }] });
  const editarRed = (i, patch) => setV({ ...v, redes: v.redes.map((r, idx) => (idx === i ? { ...r, ...patch } : r)) });
  const quitarRed = (i) => setV({ ...v, redes: v.redes.filter((_, idx) => idx !== i) });

  return (
    <div>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-1">
        <h2 className="gp-serif text-2xl">Mi Perfil</h2>
        {!editando && <button onClick={empezarEdicion} className="gp-btn flex items-center justify-center gap-1 px-3 py-1.5 text-sm w-full sm:w-auto"><Pencil size={14} /> Editar</button>}
      </div>
      <p className="text-sm gp-text-muted mb-4">Tu ficha personal — estudios, habilidades y redes. Sirve como referencia rápida, dentro de ARKEYONE.</p>

      <div className="gp-panel p-5 mb-4 flex items-center gap-4">
        {avatarUrl ? (
          <img src={avatarUrl} alt="" className="w-16 h-16 rounded-full object-cover shrink-0" style={{ border: "1px solid var(--border)" }} />
        ) : (
          <span className="w-16 h-16 rounded-full flex items-center justify-center shrink-0 text-lg font-semibold" style={{ background: "var(--panel-hi)", color: "var(--gold)" }}>
            {(nombreMostrar || "").slice(0, 2).toUpperCase()}
          </span>
        )}
        <div>
          <p className="gp-serif text-lg">{nombreMostrar}</p>
          {ciudad && <p className="text-xs gp-text-muted flex items-center gap-1 mt-0.5"><MapPin size={11} /> {ciudad}</p>}
          <p className="text-[11px] gp-text-muted mt-1">La foto y la ciudad se cambian desde Configuración.</p>
        </div>
      </div>

      {editando ? (
        <div className="gp-panel p-5 space-y-5">
          <Field label="Sobre mí"><textarea className="gp-input" rows={3} value={v.bio} onChange={(e) => setV({ ...v, bio: e.target.value })} placeholder="Una breve descripción sobre ti…" /></Field>

          <div>
            <p className="text-sm font-medium mb-2">Estudios</p>
            <div className="space-y-2">
              {v.estudios.map((e, i) => (
                <div key={i} className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_100px_auto] gap-2 items-center">
                  <input className="gp-input" placeholder="Institución" value={e.institucion} onChange={(ev) => editarEstudio(i, { institucion: ev.target.value })} />
                  <input className="gp-input" placeholder="Título / grado" value={e.titulo} onChange={(ev) => editarEstudio(i, { titulo: ev.target.value })} />
                  <input className="gp-input" placeholder="Año" value={e.anio} onChange={(ev) => editarEstudio(i, { anio: ev.target.value })} />
                  <IconBtn title="Eliminar" onClick={() => quitarEstudio(i)}><Trash2 size={13} /></IconBtn>
                </div>
              ))}
            </div>
            <button onClick={agregarEstudio} className="gp-btn-ghost mt-2 py-1.5 px-3 text-xs">+ Agregar estudio</button>
          </div>

          <div>
            <p className="text-sm font-medium mb-2">Habilidades</p>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {v.habilidades.map((h) => (
                <span key={h} className="text-xs px-2.5 py-1 rounded-full border flex items-center gap-1">
                  {h}
                  <button onClick={() => quitarHabilidad(h)} className="gp-text-red">✕</button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <input className="gp-input flex-1" placeholder="ej. Piano, Excel, Cocina" value={habilidadNueva} onChange={(e) => setHabilidadNueva(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); agregarHabilidad(); } }} />
              <button onClick={agregarHabilidad} className="gp-btn-ghost px-3 text-xs">Agregar</button>
            </div>
          </div>

          <div>
            <p className="text-sm font-medium mb-2">Redes</p>
            <div className="space-y-2">
              {v.redes.map((r, i) => (
                <div key={i} className="grid grid-cols-1 sm:grid-cols-[140px_1fr_auto] gap-2 items-center">
                  <input className="gp-input" placeholder="Red (ej. LinkedIn)" value={r.red} onChange={(ev) => editarRed(i, { red: ev.target.value })} />
                  <input className="gp-input" placeholder="URL" value={r.url} onChange={(ev) => editarRed(i, { url: ev.target.value })} />
                  <IconBtn title="Eliminar" onClick={() => quitarRed(i)}><Trash2 size={13} /></IconBtn>
                </div>
              ))}
            </div>
            <button onClick={agregarRed} className="gp-btn-ghost mt-2 py-1.5 px-3 text-xs">+ Agregar red</button>
          </div>

          <div className="flex gap-2 pt-2">
            <button onClick={() => setEditando(false)} className="gp-btn-ghost flex-1 py-2 text-sm">Cancelar</button>
            <button onClick={guardar} disabled={guardando} className="gp-btn flex-1 py-2 text-sm disabled:opacity-70">{guardando ? "Guardando…" : "Guardar"}</button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="gp-panel p-5">
            <p className="text-sm font-medium mb-2">Sobre mí</p>
            <p className="text-sm gp-text-muted">{bio || "Aún no capturas una descripción."}</p>
          </div>

          <div className="gp-panel p-5">
            <p className="text-sm font-medium mb-2">Estudios</p>
            {(estudios || []).length === 0 ? (
              <p className="text-sm gp-text-muted">Aún no registras estudios.</p>
            ) : (
              <ul className="space-y-1.5 text-sm">
                {estudios.map((e, i) => (
                  <li key={i} className="flex items-center justify-between gap-2">
                    <span>{e.titulo || "—"} {e.institucion ? `· ${e.institucion}` : ""}</span>
                    {e.anio && <span className="text-xs gp-text-muted shrink-0">{e.anio}</span>}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="gp-panel p-5">
            <p className="text-sm font-medium mb-2">Habilidades</p>
            {(habilidades || []).length === 0 ? (
              <p className="text-sm gp-text-muted">Aún no registras habilidades.</p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {habilidades.map((h) => <span key={h} className="text-xs px-2.5 py-1 rounded-full border">{h}</span>)}
              </div>
            )}
          </div>

          <div className="gp-panel p-5">
            <p className="text-sm font-medium mb-2">Redes</p>
            {(redes || []).length === 0 ? (
              <p className="text-sm gp-text-muted">Aún no agregas redes.</p>
            ) : (
              <ul className="space-y-1.5 text-sm">
                {redes.map((r, i) => (
                  <li key={i}>
                    <a href={r.url} target="_blank" rel="noreferrer" className="gp-text-gold">{r.red || r.url}</a>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
