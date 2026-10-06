// src/components/comunes/PromptTareaRelacionada.jsx
//
// Prompt reutilizable: "¿Deseas crear una acción relacionada?" — tras guardar una Cita, Deuda,
// Documento o Activo digital, ofrece crear una Tarea real ligada a ese origen (origenTabla/origenId),
// sin obligar a hacerlo. Como pide el documento maestro v0.1: una Cita/Deuda/Documento/Activo no ES
// una Tarea, pero puede GENERAR una.
//
// Salio de App.jsx en la Fase 2 (6 oct 2026): lo comparten Deudas, Documentos y Activos digitales.

import { useState } from "react";
import { Field } from "../ui/basicos";
import { todayISO } from "../../lib/formato";

export default function PromptTareaRelacionada({ origenTabla, origenId, proyectoId, descripcionSugerida, fechaSugerida, onCrear, onOmitir }) {
  const [descripcion, setDescripcion] = useState(descripcionSugerida || "");
  const [fechaLimite, setFechaLimite] = useState(fechaSugerida || todayISO());
  return (
    <div>
      <p className="text-sm gp-text-muted mb-3">¿Deseas crear una tarea relacionada con esto? Quedará ligada aquí para que puedas encontrarla desde ambos lados.</p>
      <Field label="Descripción de la tarea"><input className="gp-input" value={descripcion} onChange={(e) => setDescripcion(e.target.value)} /></Field>
      <Field label="Fecha límite"><input type="date" className="gp-input" value={fechaLimite} onChange={(e) => setFechaLimite(e.target.value)} /></Field>
      <div className="flex gap-2 mt-3">
        <button className="gp-btn-ghost flex-1 py-2 text-sm" onClick={onOmitir}>Omitir</button>
        <button
          className="gp-btn flex-1 py-2 text-sm"
          onClick={() => { if (descripcion.trim()) onCrear({ descripcion: descripcion.trim(), fechaLimite, proyectoId: proyectoId || "", origenTabla, origenId, estatus: "Pendiente" }); }}
        >
          Crear tarea
        </button>
      </div>
    </div>
  );
}
