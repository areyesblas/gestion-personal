// src/components/comunes/Bitacora.jsx
//
// Bitacora universal: comentarios y adjuntos para CUALQUIER entidad. La usan el centro de
// proyecto, Tareas, Facturas, Contactos, Marketing, Eventos y Patrimonio.
//
// Salio de App.jsx en la Fase 2 (5 oct 2026). Vive en comunes/ y no en ui/ porque no es una
// primitiva de presentacion: habla con Supabase (sube archivos al bucket "adjuntos").

import { useState } from "react";
import { Camera, FileText, Film, Mic } from "lucide-react";
import { supabase } from "../../supabaseClient";

export default function Bitacora({ data, entidadTipo, entidadId, onAdd, onRemove }) {
  const [texto, setTexto] = useState("");
  const [subiendo, setSubiendo] = useState(false);
  const [adjuntosNuevos, setAdjuntosNuevos] = useState([]);
  const [error, setError] = useState("");

  const comentarios = (data.comentarios || [])
    .filter((c) => c.entidadTipo === entidadTipo && c.entidadId === entidadId)
    .sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));

  const iconoTipo = (t) => t === "video" ? <Film size={11} /> : t === "audio" ? <Mic size={11} /> : t === "imagen" ? <Camera size={11} /> : <FileText size={11} />;

  const handleFiles = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    setError("");
    setSubiendo(true);
    const nuevos = [];
    for (const file of files) {
      if (file.size > 25 * 1024 * 1024) { setError(`"${file.name}" pesa más de 25 MB, se omitió.`); continue; }
      const path = `${entidadTipo}/${entidadId}/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
      const { error: upErr } = await supabase.storage.from("adjuntos").upload(path, file);
      if (upErr) { setError(`No se pudo subir "${file.name}": ${upErr.message}`); continue; }
      const { data: pub } = supabase.storage.from("adjuntos").getPublicUrl(path);
      const tipo = file.type.startsWith("image/") ? "imagen" : file.type.startsWith("video/") ? "video" : file.type.startsWith("audio/") ? "audio" : "documento";
      nuevos.push({ tipo, nombre: file.name, url: pub.publicUrl });
    }
    setAdjuntosNuevos((prev) => [...prev, ...nuevos]);
    setSubiendo(false);
  };

  const enviar = () => {
    if (!texto.trim() && adjuntosNuevos.length === 0) return;
    onAdd({ entidadTipo, entidadId, texto: texto.trim(), adjuntos: adjuntosNuevos });
    setTexto("");
    setAdjuntosNuevos([]);
  };

  return (
    <div>
      <p className="text-xs font-medium mb-2 gp-text-muted">Comentarios y adjuntos</p>
      <div className="space-y-1.5 mb-2 max-h-56 overflow-y-auto gp-scroll">
        {comentarios.map((c) => (
          <div key={c.id} className="text-xs gp-panel p-2">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1">
                {c.texto && <p>{c.texto}</p>}
                {c.adjuntos?.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-1">
                    {c.adjuntos.map((a, i) => (
                      <a key={i} href={a.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 gp-text-gold">
                        {iconoTipo(a.tipo)} {a.nombre.length > 16 ? a.nombre.slice(0, 16) + "…" : a.nombre}
                      </a>
                    ))}
                  </div>
                )}
                <p className="gp-mono gp-text-muted mt-1" style={{ fontSize: "10px" }}>{c.createdAt ? new Date(c.createdAt).toLocaleString("es-MX") : ""}</p>
              </div>
              <button onClick={() => onRemove(c.id)} className="gp-text-red shrink-0">✕</button>
            </div>
          </div>
        ))}
        {comentarios.length === 0 && <p className="text-xs gp-text-muted">Sin comentarios todavía.</p>}
      </div>
      <textarea className="gp-input" rows={2} placeholder="Escribe un comentario…" value={texto} onChange={(e) => setTexto(e.target.value)} />
      <div className="flex items-center justify-between mt-2 gap-2 flex-wrap">
        <input type="file" accept="image/*,video/*,audio/*,.pdf,.doc,.docx" multiple onChange={handleFiles} className="text-xs gp-text-muted" disabled={subiendo} style={{ maxWidth: 190 }} />
        <button className="gp-btn-ghost px-3 py-1.5 text-xs" disabled={subiendo} onClick={enviar}>Agregar</button>
      </div>
      {subiendo && <p className="text-xs gp-text-muted mt-1">Subiendo…</p>}
      {error && <p className="text-xs gp-text-red mt-1">{error}</p>}
      {adjuntosNuevos.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {adjuntosNuevos.map((a, i) => (
            <span key={i} className="text-xs gp-text-teal flex items-center gap-1 gp-panel px-2 py-1">
              {iconoTipo(a.tipo)} {a.nombre.length > 16 ? a.nombre.slice(0, 16) + "…" : a.nombre}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
