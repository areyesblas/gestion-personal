

// declaran dentro de Contactos, React las trata como un tipo de componente nuevo en cada render
// y vuelve a montar todas las filas (pierde estado y parpadea).
export const tiposDeContacto = (c) => (c.tipos && c.tipos.length ? c.tipos : [c.tipo || "Otro"]);

export function AvatarContacto({ c, size = 32 }) {
  if (c.fotoUrl) {
    return <img src={c.fotoUrl} alt="" className="rounded-full object-cover shrink-0" style={{ width: size, height: size, border: "1px solid var(--border)" }} />;
  }
  return (
    <div className="rounded-full flex items-center justify-center shrink-0 font-semibold" style={{ width: size, height: size, fontSize: Math.round(size / 2.8), background: "var(--panel-hi)", color: "var(--gold)" }}>
      {(c.nombre || "").slice(0, 2).toUpperCase()}
    </div>
  );
}
