import { Building2 } from "lucide-react";

// siguen en sus módulos de siempre, relacionados con la empresa — nunca duplicados por empresa.

export function LogoEmpresa({ e, size = 40 }) {
  if (e.logoUrl) {
    return <img src={e.logoUrl} alt="" className="rounded-xl object-cover shrink-0" style={{ width: size, height: size, border: "1px solid var(--border)" }} />;
  }
  return (
    <div className="rounded-xl flex items-center justify-center shrink-0" style={{ width: size, height: size, background: "rgba(22,163,106,.16)", color: "#16A36A" }}>
      <Building2 size={Math.round(size * 0.5)} />
    </div>
  );
}
