

// Catálogo abierto de tags de Citas (Grupo C): junta los tags ya usados en todas las citas para
// sugerirlos en el combobox, sin imponer una lista fija — cualquiera puede escribir uno nuevo.
export const tagsUnicos = (citas) => [...new Set((citas || []).flatMap((c) => c.tags || []))].sort((a, b) => a.localeCompare(b));

import { fmtMoney } from "./formato";

export const camelToSnake = (s) => s.replace(/[A-Z]/g, (c) => "_" + c.toLowerCase());

export const snakeToCamel = (s) => s.replace(/_([a-z])/g, (_, c) => c.toUpperCase());

export function rowToJs(row) {
  const out = {};
  for (const [k, v] of Object.entries(row)) {
    out[snakeToCamel(k)] = v;
  }
  return out;
}

/* ---------- persistencia relacional ---------- */
export const TABLES = ["empresas", "proyectos", "pendientes", "equipo", "finanzas", "actividades", "activos", "metas", "contactos", "redesMetricas", "documentos", "habitos", "salud", "apartados", "apartadosMovimientos", "eventos", "comentarios", "saldoInicial", "regalos", "facturas", "campanas", "campanaActividades", "patrimonio", "patrimonioValuaciones", "medicamentos", "citas", "notas", "pagosFinanzas", "rutinasEjercicio", "rutinaEjercicioItems", "sesionesEjercicio", "sesionEjercicioItems", "medidasCorporales", "recetas", "dietaDias", "presupuestos"];

export const tableName = (key) => camelToSnake(key);

export const ETIQUETA_TABLA = {
  empresas: "Empresa", proyectos: "Proyecto", pendientes: "Pendiente", equipo: "Equipo", finanzas: "Movimiento financiero",
  actividades: "Actividad", activos: "Activo digital", metas: "Meta",
  contactos: "Contacto", redesMetricas: "Métrica de red social", documentos: "Documento",
  habitos: "Hábito", salud: "Registro de salud", apartados: "Apartado", apartadosMovimientos: "Movimiento de apartado", eventos: "Evento",
  comentarios: "Comentario", saldoInicial: "Saldo inicial", regalos: "Regalo",
  facturas: "Factura", campanas: "Campaña", campanaActividades: "Actividad de campaña", patrimonio: "Bien patrimonial",
  patrimonioValuaciones: "Valuación de patrimonio", medicamentos: "Medicamento", citas: "Cita", notas: "Nota",
  pagosFinanzas: "Pago registrado", presupuestos: "Presupuesto",
};

export function labelFor(key, item) {
  switch (key) {
    case "empresas":
    case "proyectos": case "equipo": case "actividades": case "activos": case "contactos":
    case "documentos": case "apartados": case "eventos": case "campanas": case "patrimonio":
    case "habitos":
      return item.nombre || "(sin nombre)";
    case "pendientes": case "metas": case "regalos":
      return item.descripcion || "(sin descripción)";
    case "finanzas":
      return item.concepto || item.categoria || "(sin concepto)";
    case "citas":
      return item.titulo || "(sin título)";
    case "notas":
      return item.titulo || (item.contenido ? item.contenido.slice(0, 40) : "(nota vacía)");
    case "redesMetricas":
      return item.plataforma || "(sin plataforma)";
    case "salud":
      return `Registro del ${item.fecha || "—"}`;
    case "comentarios":
      return (item.texto || "Adjunto").slice(0, 60);
    case "saldoInicial":
      return `Punto de partida del ${item.fecha || "—"}`;
    case "facturas":
      return item.folio || item.concepto || "(sin folio)";
    case "patrimonioValuaciones":
      return `Valuación del ${item.fecha || "—"}`;
    case "apartadosMovimientos":
      return `${item.tipo === "retiro" ? "Retiro" : "Aporte"} del ${item.fecha || "—"}`;
    case "pagosFinanzas":
      return `Pago del ${item.fecha || "—"} · ${fmtMoney(item.monto)}`;
    case "rutinasEjercicio": case "recetas":
      return item.nombre || "(sin nombre)";
    case "rutinaEjercicioItems": case "sesionEjercicioItems":
      return item.ejercicio || "(sin nombre)";
    case "sesionesEjercicio":
      return `Sesión del ${item.fecha || "—"}`;
    case "medidasCorporales":
      return `Medidas del ${item.fecha || "—"}`;
    case "dietaDias":
      return `${item.tipoComida || "Comida"} del ${item.fecha || "—"}`;
    case "presupuestos":
      return item.categoria || "Presupuesto de proyecto";
    default:
      return item.id;
  }
}

export function rowToSalud(row) {
  const { estudioNombre, estudioUrl, ...rest } = rowToJs(row);
  return { ...rest, estudio: estudioNombre ? { nombre: estudioNombre, url: estudioUrl } : null };
}

export const fromRow = (key, row) => (key === "salud" ? rowToSalud(row) : rowToJs(row));
