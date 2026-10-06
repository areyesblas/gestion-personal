// src/components/comunes/AvatarForm.jsx
//
// Elegir, recortar y subir la foto de avatar. La usan Configuracion, EmpresaForm, ProyectoForm y
// ContactoForm, por eso no vive dentro de ninguno. Salio de App.jsx en la Fase 2 (6 oct 2026).
//
// Se mudo con su recortador (AvatarCropper y sus constantes), que no usa nadie mas.

import { useState, useEffect, useRef } from "react";
import { Contact } from "lucide-react";

// Foto que se muestra en el avatar del Centro de mando — sube a Storage (bucket "adjuntos") y
// guarda la URL pública en preferencias.avatar_url (ver subirAvatar en AppLoggedIn).
export default function AvatarForm({ avatarUrl, subirAvatar, onSaved, helpText, forma = "circulo", iconoVacio, textoBoton }) {
  const [archivoElegido, setArchivoElegido] = useState(null); // File recién elegido, pendiente de recortar
  const [previa, setPrevia] = useState(avatarUrl || "");

  // La vista previa se inicializaba con la imagen y después vivía por su cuenta: si el formulario
  // de arriba borraba la imagen ("Quitar imagen"), aquí se seguía viendo la anterior y parecía que
  // el botón no hacía nada. Ahora sigue lo que diga el formulario. Durante una subida no estorba:
  // avatarUrl no cambia hasta que termina, y cuando cambia trae justo la imagen recién subida.
  useEffect(() => { setPrevia(avatarUrl || ""); }, [avatarUrl]);
  const [estado, setEstado] = useState("idle"); // idle | subiendo | listo
  const [error, setError] = useState("");

  const onArchivo = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { setError("La imagen pesa más de 5 MB — usa una más chica."); return; }
    setError("");
    setArchivoElegido(file);
    e.target.value = ""; // para poder elegir el mismo archivo otra vez si cancela y reintenta
  };

  const onRecortada = async (blob) => {
    setArchivoElegido(null);
    setPrevia(URL.createObjectURL(blob));
    setEstado("subiendo");
    const res = await subirAvatar(new File([blob], "avatar.jpg", { type: "image/jpeg" }));
    if (res.error) { setError(res.error); setEstado("idle"); return; }
    setEstado("listo");
    setTimeout(() => onSaved?.(), 900);
  };

  if (archivoElegido) {
    return <AvatarCropper file={archivoElegido} onCancel={() => setArchivoElegido(null)} onConfirm={onRecortada} />;
  }

  return (
    <div>
      <p className="text-xs gp-text-muted mb-3">{helpText || "Se muestra en el Centro de mando, junto al buscador. Si no subes una, se muestran tus iniciales."}</p>
      <div className="flex flex-col items-center gap-3">
        {previa ? (
          <img src={previa} alt="" className={`w-24 h-24 object-cover ${forma === "cuadro" ? "rounded-2xl" : "rounded-full"}`} style={{ border: "1px solid var(--border)" }} />
        ) : (
          <div className={`w-24 h-24 flex items-center justify-center ${forma === "cuadro" ? "rounded-2xl" : "rounded-full"}`} style={{ background: "var(--panel-hi)" }}>
            {iconoVacio || <Contact size={32} className="gp-text-muted" />}
          </div>
        )}
        <label className="gp-btn-ghost px-3 py-2 text-sm rounded cursor-pointer">
          {estado === "subiendo" ? "Subiendo…" : estado === "listo" ? "Guardado ✓" : (textoBoton || "Elegir foto…")}
          <input type="file" accept="image/*" className="hidden" onChange={onArchivo} disabled={estado === "subiendo"} />
        </label>
        {error && <p className="text-xs gp-text-red">{error}</p>}
      </div>
    </div>
  );
}

const AVATAR_CROPPER_VP = 260; // tamaño del visor circular en pantalla (px)
const AVATAR_CROPPER_OUT = 480; // resolución del archivo exportado (px, cuadrado)

// Mantiene el offset de arrastre siempre dentro de los límites de la imagen (que nunca deje
// huecos en blanco dentro del visor circular), dado el tamaño mostrado (w × h) de la imagen.
function clampOffsetAvatar(o, w, h) {
  const minX = Math.min(0, AVATAR_CROPPER_VP - w);
  const minY = Math.min(0, AVATAR_CROPPER_VP - h);
  return { x: Math.max(minX, Math.min(0, o.x)), y: Math.max(minY, Math.min(0, o.y)) };
}

// Deja acomodar la foto (arrastrar para mover, deslizador para acercar) antes de fijarla como
// avatar, en vez de subirla tal cual — pedido de Angel (21 sept 2026). Se exporta a un canvas
// del mismo recorte que se ve en el visor, así "lo que ves es lo que se guarda".
function AvatarCropper({ file, onCancel, onConfirm }) {
  const [img, setImg] = useState(null); // HTMLImageElement ya cargado
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const arrastreRef = useRef(null); // { startX, startY, offsetX, offsetY } mientras se arrastra
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    const url = URL.createObjectURL(file);
    const el = new Image();
    el.onload = () => setImg(el);
    el.src = url;
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const baseScale = img ? Math.max(AVATAR_CROPPER_VP / img.width, AVATAR_CROPPER_VP / img.height) : 1;
  const scale = baseScale * zoom;
  const dispW = img ? img.width * scale : 0;
  const dispH = img ? img.height * scale : 0;

  useEffect(() => {
    if (!img) return;
    setOffset((prev) => clampOffsetAvatar(prev, dispW, dispH));
    // Solo debe re-centrar/acotar cuando cambia la imagen o el zoom, no en cada pixel de arrastre.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [img, zoom]);

  const iniciarArrastre = (clientX, clientY) => { arrastreRef.current = { startX: clientX, startY: clientY, offsetX: offset.x, offsetY: offset.y }; };
  const moverArrastre = (clientX, clientY) => {
    if (!arrastreRef.current) return;
    const dx = clientX - arrastreRef.current.startX;
    const dy = clientY - arrastreRef.current.startY;
    setOffset(clampOffsetAvatar({ x: arrastreRef.current.offsetX + dx, y: arrastreRef.current.offsetY + dy }, dispW, dispH));
  };
  const terminarArrastre = () => { arrastreRef.current = null; };

  const confirmar = () => {
    if (!img) return;
    setGuardando(true);
    const k = AVATAR_CROPPER_OUT / AVATAR_CROPPER_VP;
    const canvas = document.createElement("canvas");
    canvas.width = AVATAR_CROPPER_OUT;
    canvas.height = AVATAR_CROPPER_OUT;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(img, offset.x * k, offset.y * k, dispW * k, dispH * k);
    canvas.toBlob((blob) => { setGuardando(false); if (blob) onConfirm(blob); }, "image/jpeg", 0.92);
  };

  return (
    <div>
      <p className="text-xs gp-text-muted mb-3">Arrastra la foto para acomodarla y usa el deslizador para acercar, antes de fijarla.</p>
      <div className="flex flex-col items-center gap-3">
        <div
          className="rounded-full overflow-hidden relative"
          style={{ width: AVATAR_CROPPER_VP, height: AVATAR_CROPPER_VP, background: "var(--panel-hi)", border: "1px solid var(--border)", cursor: img ? "grab" : "default", touchAction: "none" }}
          onMouseDown={(e) => iniciarArrastre(e.clientX, e.clientY)}
          onMouseMove={(e) => { if (arrastreRef.current) moverArrastre(e.clientX, e.clientY); }}
          onMouseUp={terminarArrastre}
          onMouseLeave={terminarArrastre}
          onTouchStart={(e) => iniciarArrastre(e.touches[0].clientX, e.touches[0].clientY)}
          onTouchMove={(e) => moverArrastre(e.touches[0].clientX, e.touches[0].clientY)}
          onTouchEnd={terminarArrastre}
        >
          {img && (
            <img
              src={img.src}
              alt=""
              draggable={false}
              style={{ position: "absolute", left: offset.x, top: offset.y, width: dispW, height: dispH, maxWidth: "none", userSelect: "none" }}
            />
          )}
        </div>
        <div className="flex items-center gap-2 w-full max-w-[260px]">
          <span className="text-xs gp-text-muted shrink-0">Zoom</span>
          <input type="range" min="1" max="3" step="0.05" value={zoom} onChange={(e) => setZoom(Number(e.target.value))} className="flex-1" />
        </div>
        <div className="flex gap-2 w-full max-w-[260px]">
          <button onClick={onCancel} className="gp-btn-ghost flex-1 py-2 text-sm rounded">Cancelar</button>
          <button onClick={confirmar} disabled={!img || guardando} className="gp-btn flex-1 py-2 text-sm rounded disabled:opacity-70">{guardando ? "…" : "Usar esta foto"}</button>
        </div>
      </div>
    </div>
  );
}
