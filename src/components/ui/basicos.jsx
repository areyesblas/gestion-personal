// src/components/ui/basicos.jsx
//
// Piezas de presentacion sin estado ni dependencias: se dibujan y ya.
// Salio de App.jsx en la Fase 0 del corte por modulos (5 oct 2026): movimiento puro, sin un
// solo cambio de comportamiento.

export function Badge({ children, tone = "muted" }) {
  const toneStyle = {
    muted: { color: "var(--muted)", background: "rgba(141,146,163,.12)" },
    gold: { color: "var(--gold)", background: "rgba(201,162,39,.14)" },
    teal: { color: "var(--teal)", background: "rgba(79,168,143,.14)" },
    red: { color: "var(--red)", background: "rgba(209,85,74,.14)" },
  }[tone];
  return <span className="gp-badge" style={toneStyle}>{children}</span>;
}

// Botón de solo ícono. `title` es obligatorio en la práctica: un ícono suelto no dice qué hace,
// así que se usa como tooltip y, de paso, como nombre accesible del botón.
export function IconBtn({ onClick, children, title }) {
  return (
    <button onClick={onClick} title={title} aria-label={title}
      className="p-1.5 rounded gp-btn-ghost" style={{ lineHeight: 0 }}>
      {children}
    </button>
  );
}

// OJO: esto es un <div>, no un <label>, y es a propósito. Cuando era <label>, el navegador
// reenviaba CUALQUIER clic dentro del campo al primer botón que hubiera adentro — así que tocar
// el texto de un chip (proyecto vinculado, tag, tipo de contacto) equivalía a picarle su "✕" y lo
// borraba (reportado por Angel el 24 sept 2026 y reproducido con Playwright). Se pierde el
// "clic en la etiqueta para enfocar el campo", que vale mucho menos que borrar datos sin querer.
export function Field({ label, children }) {
  return (
    <div className="block mb-3">
      <span className="block text-xs gp-text-muted mb-1">{label}</span>
      {children}
    </div>
  );
}

export function BloqueFicha({ titulo, icono, accion, children }) {
  return (
    <div className="gp-panel p-3.5 mb-3">
      <div className="flex items-center justify-between gap-2 mb-2">
        <p className="text-sm font-medium flex items-center gap-1.5">{icono} {titulo}</p>
        {accion}
      </div>
      {children}
    </div>
  );
}

// Tarjeta de cifra para los encabezados de Reportes y Estimaciones.
export function Stat({ label, value, tone }) {
  return (
    <div className="gp-panel p-4">
      <p className="text-xs gp-text-muted mb-1">{label}</p>
      <p className={`gp-serif text-2xl ${tone === "teal" ? "gp-text-teal" : tone === "red" ? "gp-text-red" : ""}`}>{value}</p>
    </div>
  );
}
