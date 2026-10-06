import { ComboboxMultiBuscar } from "../ui/campos";
import { fechaHoraALocalInputs, localInputsAFechaHora } from "../../lib/fechaHora";
import { Field } from "../ui/basicos";
import { useState } from "react";

export function CitaForm({ item, contactos, tagsExistentes, catalogoTags, onCrearContacto, onSave }) {
  const inicial = fechaHoraALocalInputs(item.fechaHora);
  const [titulo, setTitulo] = useState(item.titulo || "");
  const [fecha, setFecha] = useState(inicial.fecha);
  const [hora, setHora] = useState(inicial.hora);
  const [duracionHoras, setDuracionHoras] = useState(item.duracionHoras || 1);
  const [lugar, setLugar] = useState(item.lugar || "");
  const [contactoIds, setContactoIds] = useState(item.contactoIds && item.contactoIds.length ? item.contactoIds : (item.contactoId ? [item.contactoId] : []));
  const [tags, setTags] = useState(item.tags || []);
  const [notas, setNotas] = useState(item.notas || "");
  const [error, setError] = useState("");

  const contactosSeleccionados = contactoIds.map((id) => ({ id, label: contactos.find((c) => c.id === id)?.nombre || "—" }));
  const opcionesContactos = contactos.map((c) => ({ id: c.id, label: c.nombre }));
  const tagsSeleccionados = tags.map((t) => ({ id: t, label: t }));
  const opcionesTags = (tagsExistentes || []).map((t) => ({ id: t, label: t }));

  return (
    <div>
      <Field label="Título"><input className="gp-input" value={titulo} onChange={(e) => setTitulo(e.target.value)} /></Field>
      <div className="grid grid-cols-3 gap-3">
        <Field label="Fecha"><input type="date" className="gp-input" value={fecha} onChange={(e) => setFecha(e.target.value)} /></Field>
        <Field label="Hora"><input type="time" className="gp-input" value={hora} onChange={(e) => setHora(e.target.value)} /></Field>
        <Field label="Duración (h)"><input type="number" min="0.25" step="0.25" className="gp-input" value={duracionHoras} onChange={(e) => setDuracionHoras(Number(e.target.value) || 1)} /></Field>
      </div>
      <Field label="Lugar (opcional)"><input className="gp-input" value={lugar} onChange={(e) => setLugar(e.target.value)} /></Field>
      <Field label="Con quién (opcional)">
        <ComboboxMultiBuscar
          seleccionados={contactosSeleccionados}
          opciones={opcionesContactos}
          onAgregar={(o) => setContactoIds((ids) => [...ids, o.id])}
          onQuitar={(id) => setContactoIds((ids) => ids.filter((x) => x !== id))}
          onCrear={(nombre) => setContactoIds((ids) => [...ids, onCrearContacto(nombre)])}
          placeholder="Buscar o agregar contacto…"
          crearLabel={(texto) => `Crear contacto "${texto}"`}
        />
      </Field>
      <Field label="Tags (opcional)">
        <ComboboxMultiBuscar
          seleccionados={tagsSeleccionados}
          opciones={opcionesTags}
          onAgregar={(o) => setTags((ts) => [...ts, o.id])}
          onQuitar={(id) => setTags((ts) => ts.filter((x) => x !== id))}
          onCrear={(texto) => setTags((ts) => [...ts, texto])}
          onRenombrarOpcion={catalogoTags?.renombrar}
          onEliminarOpcion={catalogoTags?.eliminar}
          placeholder="Agregar tag…"
          crearLabel={(texto) => `Crear tag "${texto}"`}
        />
      </Field>
      <Field label="Notas (opcional)"><textarea className="gp-input" rows={2} value={notas} onChange={(e) => setNotas(e.target.value)} /></Field>
      {error && <p className="text-xs gp-text-red mb-2">{error}</p>}
      <button
        className="gp-btn w-full py-2 text-sm mt-1"
        onClick={() => {
          if (!titulo.trim()) { setError("Captura un título."); return; }
          if (!fecha) { setError("Elige una fecha."); return; }
          onSave({ titulo: titulo.trim(), fechaHora: localInputsAFechaHora(fecha, hora), duracionHoras: duracionHoras || 1, lugar: lugar.trim(), contactoIds, tags, notas: notas.trim() });
        }}
      >
        Guardar
      </button>
    </div>
  );
}
