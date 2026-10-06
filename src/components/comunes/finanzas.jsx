import { Camera, FileText, Upload } from "lucide-react";
import { Field } from "../ui/basicos";
import { MONEDAS, MONEDA_BASE, fmtMonedaOriginal, fmtMoney, montoBaseDe, todayISO } from "../../lib/formato";
import { MoneyInput } from "../ui/campos";
import { supabase } from "../../supabaseClient";
import { useEffect, useRef, useState } from "react";

// devuelve null y el formulario deja capturarlo a mano, que es lo que hay que hacer de todos
// modos cuando el banco te cobró a otro tipo.
export const cacheTipoCambio = new Map();

async function tipoCambioDelDia(moneda, fecha) {
  if (!moneda || moneda === MONEDA_BASE) return 1;
  const dia = (fecha || todayISO()).slice(0, 10);
  const clave = `${moneda}|${dia}`;
  if (cacheTipoCambio.has(clave)) return cacheTipoCambio.get(clave);
  try {
    const hoy = todayISO();
    const ruta = dia >= hoy ? "latest" : dia;
    const resp = await fetch(`https://api.frankfurter.dev/v1/${ruta}?base=${moneda}&symbols=${MONEDA_BASE}`);
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const json = await resp.json();
    const valor = Number(json?.rates?.[MONEDA_BASE]);
    const bueno = Number.isFinite(valor) && valor > 0 ? valor : null;
    cacheTipoCambio.set(clave, bueno);
    return bueno;
  } catch (err) {
    console.error("No se pudo consultar el tipo de cambio:", err);
    return null;
  }
}

// compara todo; si el movimiento fue en otra moneda, debajo va lo que realmente se pagó y el
// tipo de cambio al que quedó congelado, que es el dato que hace cuadrar el histórico.
export function MontoMovimiento({ f, className = "" }) {
  const signo = f.tipo === "Ingreso" ? "+" : "−";
  const color = f.tipo === "Ingreso" ? "var(--teal)" : "var(--red)";
  const otraMoneda = f.moneda && f.moneda !== MONEDA_BASE;
  return (
    <span className={`inline-flex flex-col items-end ${className}`}>
      <span className="gp-mono" style={{ color }}>{f.monto ? `${signo}${fmtMoney(montoBaseDe(f))}` : "—"}</span>
      {otraMoneda && (
        <span className="gp-mono gp-text-muted" style={{ fontSize: 10 }}>
          {fmtMonedaOriginal(f.monto, f.moneda)} @ {Number(f.tipoCambio) || 1}
        </span>
      )}
    </span>
  );
}

export function CamposMoneda({ monto, moneda, tipoCambio, fecha, onCambiar }) {
  const [buscando, setBuscando] = useState(false);
  const [aviso, setAviso] = useState("");
  // onCambiar cambia de identidad en cada render del padre; guardarlo en un ref evita que el
  // efecto se vuelva a disparar solo por eso y se cicle.
  const cbRef = useRef(onCambiar);
  cbRef.current = onCambiar;

  const consultar = async (cual, cuando) => {
    if (!cual || cual === MONEDA_BASE) { cbRef.current({ tipoCambio: 1 }); setAviso(""); return; }
    setBuscando(true); setAviso("");
    const valor = await tipoCambioDelDia(cual, cuando);
    setBuscando(false);
    if (valor == null) setAviso("No se pudo consultar ese día. Captura el tipo de cambio a mano.");
    else cbRef.current({ tipoCambio: valor });
  };

  useEffect(() => { consultar(moneda, fecha); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [moneda, fecha]);

  const esBase = !moneda || moneda === MONEDA_BASE;
  const equivalente = (Number(monto) || 0) * (Number(tipoCambio) || 0);

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="Monto">
          <MoneyInput value={monto} moneda={moneda || MONEDA_BASE} onChange={(val) => onCambiar({ monto: val })} />
        </Field>
        <Field label="Moneda">
          <select className="gp-input" value={moneda || MONEDA_BASE} onChange={(e) => onCambiar({ moneda: e.target.value })}>
            {MONEDAS.map((m) => <option key={m.codigo} value={m.codigo}>{m.codigo} — {m.nombre}</option>)}
          </select>
        </Field>
      </div>
      {!esBase && (
        <div className="gp-bloque rounded-lg p-3 mb-3">
          <div className="flex items-end gap-2">
            <Field label={`Tipo de cambio del ${fecha || "día"}`}>
              <input
                type="number" step="0.0001" min="0" className="gp-input" inputMode="decimal"
                value={tipoCambio ?? ""} onChange={(e) => onCambiar({ tipoCambio: e.target.value })}
              />
            </Field>
            <button
              type="button" onClick={() => consultar(moneda, fecha)} disabled={buscando}
              className="gp-btn-ghost px-3 rounded text-xs shrink-0"
              style={{ height: 34, marginBottom: 12, opacity: buscando ? 0.6 : 1 }}
            >
              {buscando ? "Consultando…" : "Actualizar"}
            </button>
          </div>
          <p className="text-xs" style={{ color: aviso ? "var(--red)" : "var(--muted)" }}>
            {aviso || `Equivale a ${fmtMoney(equivalente)} ${MONEDA_BASE}. Este número se guarda congelado: si el tipo de cambio se mueve después, este movimiento no cambia.`}
          </p>
        </div>
      )}
    </>
  );
}

// "Tomar foto" abre la cámara directo — eso lo hace el atributo capture, que en iPhone y
// Android manda a la cámara trasera sin pasar por el carrete.
export function ComprobantePago({ movimiento, data, onAddComentario }) {
  const [subiendo, setSubiendo] = useState(false);
  const [error, setError] = useState("");
  const adjuntos = (data.comentarios || [])
    .filter((c) => c.entidadTipo === "finanzas" && c.entidadId === movimiento.id)
    .flatMap((c) => c.adjuntos || []);

  const subir = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (file.size > 25 * 1024 * 1024) { setError("La imagen pesa más de 25 MB."); return; }
    setError("");
    setSubiendo(true);
    try {
      const path = `finanzas/${movimiento.id}/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
      const { error: upErr } = await supabase.storage.from("adjuntos").upload(path, file);
      if (upErr) { setError(`No se pudo subir: ${upErr.message}`); return; }
      const { data: pub } = supabase.storage.from("adjuntos").getPublicUrl(path);
      const tipo = file.type.startsWith("image/") ? "imagen" : "documento";
      await onAddComentario({
        entidadTipo: "finanzas", entidadId: movimiento.id, texto: "Comprobante de pago",
        adjuntos: [{ tipo, nombre: file.name || "comprobante", url: pub.publicUrl }],
      });
    } finally {
      setSubiendo(false);
    }
  };

  const claseBoton = "gp-btn-ghost rounded text-[10px] px-2 py-1 flex items-center gap-1 cursor-pointer";
  return (
    <div className="mt-2 pt-2 border-t gp-border">
      {adjuntos.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-1.5">
          {adjuntos.map((a, i) => (
            <a key={i} href={a.url} target="_blank" rel="noopener noreferrer"
              className="text-[10px] gp-text-gold flex items-center gap-1">
              <FileText size={11} /> {a.nombre || `Comprobante ${i + 1}`}
            </a>
          ))}
        </div>
      )}
      <div className="flex items-center gap-1.5 flex-wrap">
        <label className={claseBoton}>
          <Upload size={11} /> {adjuntos.length > 0 ? "Otro comprobante" : "Subir comprobante"}
          <input type="file" accept="image/*,application/pdf" className="hidden" onChange={subir} disabled={subiendo} />
        </label>
        <label className={claseBoton}>
          <Camera size={11} /> Tomar foto
          <input type="file" accept="image/*" capture="environment" className="hidden" onChange={subir} disabled={subiendo} />
        </label>
        {subiendo && <span className="text-[10px] gp-text-muted">Subiendo…</span>}
      </div>
      {error && <p className="text-[10px] gp-text-red mt-1">{error}</p>}
    </div>
  );
}
