import { Field } from "../ui/basicos";
import { MESES_LARGO } from "../../lib/formato";
import { useState } from "react";

// quiere compartir el año. Internamente se sigue guardando como fecha (columna "date" en Supabase),
// pero con un año ficticio (2000) que diasParaCumple() ignora por completo: solo usa mes/día.
export const diaMesDeFecha = (fechaNacimiento) => {
  if (!fechaNacimiento) return { dia: "", mes: "" };
  const d = new Date(fechaNacimiento + "T00:00:00");
  if (isNaN(d.getTime())) return { dia: "", mes: "" };
  return { dia: String(d.getDate()), mes: String(d.getMonth() + 1) };
};

export const construirFechaCumple = (dia, mes) => (dia && mes ? `2000-${String(mes).padStart(2, "0")}-${String(dia).padStart(2, "0")}` : "");

export const armarNombreContacto = (nombres, apellidoPaterno, apellidoMaterno) =>
  [nombres, apellidoPaterno, apellidoMaterno].map((s) => (s || "").toString().trim()).filter(Boolean).join(" ");

export function CumpleanosField({ value, onChange }) {
  const inicial = diaMesDeFecha(value);
  const [dia, setDia] = useState(inicial.dia);
  const [mes, setMes] = useState(inicial.mes);
  const actualizar = (d, m) => { setDia(d); setMes(m); onChange(construirFechaCumple(d, m)); };
  return (
    <Field label="Cumpleaños — día y mes (opcional)">
      <div className="grid grid-cols-2 gap-2">
        <select className="gp-input" value={dia} onChange={(e) => actualizar(e.target.value, mes)}>
          <option value="">Día</option>
          {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => <option key={d} value={d}>{d}</option>)}
        </select>
        <select className="gp-input" value={mes} onChange={(e) => actualizar(dia, e.target.value)}>
          <option value="">Mes</option>
          {MESES_LARGO.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
        </select>
      </div>
    </Field>
  );
}

// Las banderas son emoji: en Mac, iPhone y Android se dibujan; en Windows se ven como dos letras
// (WIN no trae glifos de bandera), y por eso la lada siempre va escrita al lado y no solo el icono.
export const PAISES_LADA = [
  { iso: "MX", nombre: "México", lada: "+52", bandera: "🇲🇽" },
  { iso: "US", nombre: "Estados Unidos", lada: "+1", bandera: "🇺🇸" },
  { iso: "CA", nombre: "Canadá", lada: "+1", bandera: "🇨🇦" },
  { iso: "AR", nombre: "Argentina", lada: "+54", bandera: "🇦🇷" },
  { iso: "BO", nombre: "Bolivia", lada: "+591", bandera: "🇧🇴" },
  { iso: "BR", nombre: "Brasil", lada: "+55", bandera: "🇧🇷" },
  { iso: "CL", nombre: "Chile", lada: "+56", bandera: "🇨🇱" },
  { iso: "CO", nombre: "Colombia", lada: "+57", bandera: "🇨🇴" },
  { iso: "CR", nombre: "Costa Rica", lada: "+506", bandera: "🇨🇷" },
  { iso: "CU", nombre: "Cuba", lada: "+53", bandera: "🇨🇺" },
  { iso: "EC", nombre: "Ecuador", lada: "+593", bandera: "🇪🇨" },
  { iso: "SV", nombre: "El Salvador", lada: "+503", bandera: "🇸🇻" },
  { iso: "ES", nombre: "España", lada: "+34", bandera: "🇪🇸" },
  { iso: "GT", nombre: "Guatemala", lada: "+502", bandera: "🇬🇹" },
  { iso: "HN", nombre: "Honduras", lada: "+504", bandera: "🇭🇳" },
  { iso: "NI", nombre: "Nicaragua", lada: "+505", bandera: "🇳🇮" },
  { iso: "PA", nombre: "Panamá", lada: "+507", bandera: "🇵🇦" },
  { iso: "PY", nombre: "Paraguay", lada: "+595", bandera: "🇵🇾" },
  { iso: "PE", nombre: "Perú", lada: "+51", bandera: "🇵🇪" },
  { iso: "PR", nombre: "Puerto Rico", lada: "+1", bandera: "🇵🇷" },
  { iso: "DO", nombre: "República Dominicana", lada: "+1", bandera: "🇩🇴" },
  { iso: "UY", nombre: "Uruguay", lada: "+598", bandera: "🇺🇾" },
  { iso: "VE", nombre: "Venezuela", lada: "+58", bandera: "🇻🇪" },
];

// sin lada, se quedan tal cual en el campo de número y con el país en blanco: no se les inventa
// un país, porque adivinarlo mal rompería el enlace de WhatsApp.
export function partirTelefono(valor) {
  const txt = (valor || "").trim();
  if (!txt.startsWith("+")) return { iso: "", numero: txt };
  const candidatos = [...PAISES_LADA].sort((a, b) => b.lada.length - a.lada.length);
  const p = candidatos.find((x) => txt.startsWith(x.lada));
  if (!p) return { iso: "", numero: txt };
  return { iso: p.iso, numero: txt.slice(p.lada.length).trim() };
}

// enlaces de wa.me y tel: ya limpian lo que no sea dígito, así que el "+" y los espacios no
// estorban y sí hacen el número legible.
export function CampoTelefonoPais({ valor, onChange, placeholderNumero }) {
  const { iso, numero } = partirTelefono(valor);
  const pais = PAISES_LADA.find((p) => p.iso === iso) || null;
  const emitir = (nuevoIso, nuevoNumero) => {
    const p = PAISES_LADA.find((x) => x.iso === nuevoIso);
    const n = (nuevoNumero || "").trim();
    if (!p) { onChange(n); return; }
    onChange(n ? `${p.lada} ${n}` : p.lada);
  };
  return (
    <div className="flex gap-2">
      <select
        className="gp-input shrink-0" style={{ width: 132 }}
        value={iso}
        onChange={(e) => emitir(e.target.value, numero)}
        aria-label="Código de país"
      >
        <option value="">Sin lada</option>
        {PAISES_LADA.map((p) => (
          <option key={p.iso} value={p.iso}>{p.bandera} {p.lada} {p.iso}</option>
        ))}
      </select>
      <input
        className="gp-input" inputMode="tel"
        placeholder={placeholderNumero}
        value={numero}
        onChange={(e) => emitir(iso, e.target.value)}
      />
    </div>
  );
}
