// src/components/comunes/ArchivosEntidad.jsx
//
// Archivos adjuntos de una entidad (ficha de proyecto, ficha de contacto, Notas). Salio de
// App.jsx en la Fase 2 (5 oct 2026). Como Bitacora, habla con Supabase Storage, por eso va en
// comunes/ y no en ui/.

import { useState } from "react";
import { Camera, FileText, Film, Mic, Upload } from "lucide-react";
import { supabase } from "../../supabaseClient";

export default function ArchivosEntidad({ entidadTipo, entidadId, carpeta, data, onAddComentario, vacioTexto }) {
  const [subiendo, setSubiendo] = useState(false);
  const [error, setError] = useState("");

  const archivos = (data.comentarios || [])
    .filter((x) => x.entidadTipo === entidadTipo && x.entidadId === entidadId)
    .flatMap((x) => (x.adjuntos || []).map((a) => ({ ...a, comentarioId: x.id, fecha: x.createdAt })))
    .sort((a, b) => (b.fecha || "").localeCompare(a.fecha || ""));

  const iconoTipo = (t) => t === "video" ? <Film size={13} /> : t === "audio" ? <Mic size={13} /> : t === "imagen" ? <Camera size={13} /> : <FileText size={13} />;

  const subir = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    setError("");
    setSubiendo(true);
    const nuevos = [];
    for (const file of files) {
      if (file.size > 25 * 1024 * 1024) { setError(`"${file.name}" pesa más de 25 MB, se omitió.`); continue; }
      const path = `${carpeta}/${entidadId}/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
      const { error: upErr } = await supabase.storage.from("adjuntos").upload(path, file);
      if (upErr) { setError(`No se pudo subir "${file.name}": ${upErr.message}`); continue; }
      const { data: pub } = supabase.storage.from("adjuntos").getPublicUrl(path);
      const tipo = file.type.startsWith("image/") ? "imagen" : file.type.startsWith("video/") ? "video" : file.type.startsWith("audio/") ? "audio" : "documento";
      nuevos.push({ tipo, nombre: file.name, url: pub.publicUrl });
    }
    if (nuevos.length > 0) onAddComentario({ entidadTipo, entidadId, texto: "", adjuntos: nuevos });
    setSubiendo(false);
    e.target.value = "";
  };

  return (
    <>
      {archivos.length === 0
        ? <p className="text-xs gp-text-muted py-2">{vacioTexto || "Sin archivos todavía."}</p>
        : (
          <div className="flex flex-col gap-1.5 mb-3">
            {archivos.map((a, i) => (
              <a key={`${a.comentarioId}-${i}`} href={a.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-xs py-1.5 px-2 rounded gp-panel-hi">
                <span className="gp-text-gold shrink-0">{iconoTipo(a.tipo)}</span>
                <span className="truncate flex-1">{a.nombre}</span>
                <span className="gp-mono gp-text-muted shrink-0" style={{ fontSize: 10 }}>{(a.fecha || "").slice(0, 10)}</span>
              </a>
            ))}
          </div>
        )}
      <label className="gp-btn-ghost px-3 py-2 text-xs rounded cursor-pointer inline-flex items-center gap-1.5">
        <Upload size={13} /> {subiendo ? "Subiendo…" : "Subir archivo"}
        <input type="file" multiple className="hidden" onChange={subir} disabled={subiendo} />
      </label>
      {error && <p className="text-xs gp-text-red mt-1">{error}</p>}
    </>
  );
}
