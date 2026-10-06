// src/components/comunes/PresupuestoMensualForm.jsx
//
// Capturar el presupuesto mensual. Lo abren el modulo Presupuesto y el Dashboard.
//
// Esta aqui y no dentro de modulos/Presupuesto.jsx justamente porque el Dashboard lo usa: si el
// Dashboard (que NO es perezoso, es la pantalla de entrada) importara del modulo perezoso,
// Rollup arrastraria el modulo completo al bundle principal y la pereza no serviria de nada.

import { useState } from "react";
import { Field } from "../ui/basicos";
import { MoneyInput } from "../ui/campos";

export default function PresupuestoMensualForm({ presupuestoMensual, onSave, onSaved }) {
  const [v, setV] = useState(presupuestoMensual != null ? String(presupuestoMensual) : "");
  const [error, setError] = useState("");
  const [estadoGuardado, setEstadoGuardado] = useState("idle");
  return (
    <div>
      <p className="text-xs gp-text-muted mb-3">Cuánto planeas gastar al mes — el widget "Tu progreso" compara tus gastos reales contra este número. Puedes redefinirlo cuando quieras.</p>
      <Field label="Presupuesto mensual"><MoneyInput className="gp-input" value={v} onChange={setV} /></Field>
      {error && <p className="text-xs gp-text-red mb-2">{error}</p>}
      <button
        className="gp-btn w-full py-2 text-sm disabled:opacity-70"
        disabled={estadoGuardado === "guardando"}
        onClick={async () => {
          const monto = Number(v);
          if (!v || isNaN(monto) || monto <= 0) { setError("Captura un monto mayor a cero."); return; }
          setError("");
          setEstadoGuardado("guardando");
          await onSave(monto);
          setEstadoGuardado("guardado");
          setTimeout(() => onSaved?.(), 900);
        }}
      >
        {estadoGuardado === "guardando" ? "Guardando…" : estadoGuardado === "guardado" ? "Guardado ✓" : "Guardar"}
      </button>
    </div>
  );
}
