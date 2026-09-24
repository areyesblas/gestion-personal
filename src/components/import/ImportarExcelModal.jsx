// src/components/import/ImportarExcelModal.jsx
//
// Importar Contactos o Movimientos de Finanzas desde un archivo Excel/CSV (pedido por Angel,
// 21 sept 2026 — solo estos dos módulos, no todo el sistema). Recibe `XLSX` como prop (App.jsx
// ya lo importa de forma estática para exportar) en vez de importarlo aquí también, para no
// dejar dos puntos de import de la misma librería sueltos en el código.
//
// OJO de bundle: aun así, usar XLSX.read()/sheet_to_json() por primera vez en la app (antes
// solo se usaba para escribir/exportar) hace que Rollup incluya código interno de `xlsx` que
// antes se eliminaba por tree-shaking (parseo de fechas/celdas, etc.) — y como el import de
// `xlsx` vive en App.jsx (no dentro de este archivo, que sí es perezoso), ese peso cae en el
// bundle principal, no en el chunk perezoso de este modal (~140kB / ~45kB gzip de más en el
// arranque de toda la app). Es el costo real de agregar "leer Excel" a una app que antes solo
// escribía — no hay forma de evitarlo sin también volver perezoso el import de `xlsx` en
// App.jsx, que se usa en ~10 pantallas para exportar y queda fuera del alcance de este cambio.
//
// Flujo: elegir archivo → detectar/ajustar qué columna del archivo corresponde a cada campo →
// vista previa con filas válidas/con error → confirmar → inserta una por una con addItem (sin
// camino de bulk-insert nuevo) mostrando progreso → resumen final.

import { useState } from 'react';
import { Upload, CheckCircle2, XCircle } from 'lucide-react';

// Mismo criterio que normalizarTexto en App.jsx (minúsculas, sin acentos) — se duplica aquí
// porque App.jsx no exporta nada; es un one-liner, no vale la pena crear una exportación solo
// por esto.
const norm = (s) => (s ?? '').toString().trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

function parseFecha(v) {
  if (v instanceof Date && !isNaN(v)) {
    const y = v.getFullYear(), m = String(v.getMonth() + 1).padStart(2, '0'), d = String(v.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  const s = (v ?? '').toString().trim();
  if (!s) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  // DD/MM/YYYY o DD-MM-YYYY (convención en español, día primero) — evitamos adivinar MM/DD para
  // no invertir día y mes silenciosamente; si no calza con esto, se marca como error.
  const m1 = s.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (m1) {
    const [, d, m, y] = m1;
    const dd = Number(d), mm = Number(m);
    if (mm >= 1 && mm <= 12 && dd >= 1 && dd <= 31) return `${y}-${String(mm).padStart(2, '0')}-${String(dd).padStart(2, '0')}`;
  }
  return null;
}

function parseMonto(v) {
  if (typeof v === 'number' && !isNaN(v)) return v;
  const s = (v ?? '').toString().trim().replace(/\$/g, '').replace(/,/g, '');
  if (!s) return null;
  const n = Number(s);
  return isNaN(n) ? null : n;
}

const CONFIGS = {
  contactos: {
    etiqueta: 'contactos',
    columnas: [
      { campo: 'nombres', etiqueta: 'Nombre(s)', alias: ['nombre(s)', 'nombres', 'nombre'], requerido: true },
      { campo: 'apellidoPaterno', etiqueta: 'Apellido paterno', alias: ['apellido paterno'], requerido: false },
      { campo: 'apellidoMaterno', etiqueta: 'Apellido materno', alias: ['apellido materno'], requerido: false },
      { campo: 'tipo', etiqueta: 'Tipo', alias: ['tipo'], requerido: false },
      { campo: 'whatsapp', etiqueta: 'WhatsApp', alias: ['whatsapp', 'telefono', 'teléfono'], requerido: false },
      { campo: 'correo', etiqueta: 'Correo', alias: ['correo', 'email', 'correo electronico'], requerido: false },
      { campo: 'notas', etiqueta: 'Notas', alias: ['notas'], requerido: false },
    ],
    validar: (m) => {
      const nombres = (m.nombres || '').toString().trim();
      if (!nombres) return { ok: false, motivo: 'Falta Nombre(s)' };
      const apellidoPaterno = (m.apellidoPaterno || '').toString().trim();
      const apellidoMaterno = (m.apellidoMaterno || '').toString().trim();
      const nombre = [nombres, apellidoPaterno, apellidoMaterno].filter(Boolean).join(' ');
      const tiposValidos = { cliente: 'Cliente', proveedor: 'Proveedor', colaborador: 'Colaborador', otro: 'Otro' };
      const tipo = tiposValidos[norm(m.tipo)] || 'Otro';
      return {
        ok: true,
        item: {
          nombres, apellidoPaterno, apellidoMaterno, nombre, tipos: [tipo],
          whatsapp: (m.whatsapp || '').toString().trim(), correo: (m.correo || '').toString().trim(),
          notas: (m.notas || '').toString().trim(), contexto: '', parentesco: '', fechaNacimiento: '', direccion: '',
        },
      };
    },
    resumenFila: (item) => item.nombre,
  },
  // Proyectos e ideas (rediseño del 24 sept 2026). Los estados y contextos válidos se repiten
  // aquí a propósito: App.jsx no exporta sus constantes y este archivo se carga de forma perezosa.
  // Si cambian allá, hay que cambiarlos aquí — cualquier valor que no calce cae en el default en
  // vez de guardar un estado inventado.
  proyectos: {
    etiqueta: 'proyectos',
    columnas: [
      { campo: 'nombre', etiqueta: 'Nombre', alias: ['nombre', 'proyecto'], requerido: true },
      { campo: 'descripcion', etiqueta: 'Descripción', alias: ['descripcion', 'descripción'], requerido: false },
      { campo: 'estatus', etiqueta: 'Estado', alias: ['estado', 'estatus'], requerido: false },
      { campo: 'contexto', etiqueta: 'Contexto', alias: ['contexto'], requerido: false },
      { campo: 'categoria', etiqueta: 'Categoría', alias: ['categoria', 'categoría'], requerido: false },
      { campo: 'fechaInicio', etiqueta: 'Inicio', alias: ['inicio', 'fecha de inicio', 'fecha inicio'], requerido: false },
      { campo: 'fechaFin', etiqueta: 'Fin', alias: ['fin', 'fecha de fin', 'fecha fin'], requerido: false },
      { campo: 'etiquetas', etiqueta: 'Etiquetas', alias: ['etiquetas', 'tags'], requerido: false },
    ],
    validar: (m) => {
      const nombre = (m.nombre || '').toString().trim();
      if (!nombre) return { ok: false, motivo: 'Falta Nombre' };
      // Se acepta tanto el valor guardado ("En validación") como la etiqueta corta que se ve en
      // pantalla ("Validación"), porque el usuario exporta lo que ve.
      const estados = {
        'idea': 'Idea',
        'validacion': 'En validación', 'en validacion': 'En validación',
        'desarrollo': 'En desarrollo', 'en desarrollo': 'En desarrollo',
        'activo': 'Activo', 'finalizado': 'Finalizado',
        'pausado': 'Pausado', 'en pausa': 'Pausado',
        'archivado': 'Archivado',
      };
      const contextos = { personal: 'Personal', profesional: 'Profesional', empresarial: 'Empresarial' };
      const categorias = ['Fundación', 'Software', 'Música', 'Renta', 'Marketing', 'Chatbots', 'Personal', 'Otro'];
      const categoria = categorias.find((c) => norm(c) === norm(m.categoria)) || 'Otro';
      const etiquetas = (m.etiquetas || '').toString().split(/[,;]/).map((t) => t.trim()).filter(Boolean);
      return {
        ok: true,
        item: {
          nombre,
          descripcion: (m.descripcion || '').toString().trim(),
          estatus: estados[norm(m.estatus)] || 'Idea',
          contexto: contextos[norm(m.contexto)] || 'Personal',
          categoria,
          fechaInicio: parseFecha(m.fechaInicio) || '',
          fechaFin: parseFecha(m.fechaFin) || '',
          etiquetas,
          responsableContactoId: '', modo: 'Finito', monetizacion: 'Dinero',
          prioridad: 'Media', fechaRevision: '', github: '', githubSubido: false, notas: [],
        },
      };
    },
    resumenFila: (item) => `${item.nombre} — ${item.estatus}`,
  },
  finanzas: {
    etiqueta: 'movimientos de Finanzas',
    columnas: [
      { campo: 'concepto', etiqueta: 'Concepto', alias: ['concepto'], requerido: true },
      { campo: 'tipo', etiqueta: 'Tipo', alias: ['tipo'], requerido: true },
      { campo: 'fecha', etiqueta: 'Fecha', alias: ['fecha'], requerido: true },
      { campo: 'monto', etiqueta: 'Monto', alias: ['monto'], requerido: true },
      { campo: 'categoria', etiqueta: 'Categoría', alias: ['categoria', 'categoría'], requerido: false },
      { campo: 'forma', etiqueta: 'Forma', alias: ['forma'], requerido: false },
      { campo: 'estatus', etiqueta: 'Estatus', alias: ['estatus'], requerido: false },
      { campo: 'proyecto', etiqueta: 'Proyecto', alias: ['proyecto'], requerido: false },
    ],
    validar: (m, ctx) => {
      const concepto = (m.concepto || '').toString().trim();
      if (!concepto) return { ok: false, motivo: 'Falta Concepto' };
      const tipoRaw = norm(m.tipo);
      const tipo = tipoRaw === 'ingreso' ? 'Ingreso' : tipoRaw === 'egreso' ? 'Egreso' : null;
      if (!tipo) return { ok: false, motivo: 'Tipo debe ser "Ingreso" o "Egreso"' };
      const fecha = parseFecha(m.fecha);
      if (!fecha) return { ok: false, motivo: 'Fecha no reconocida' };
      const monto = parseMonto(m.monto);
      if (monto === null) return { ok: false, motivo: 'Monto no reconocido' };
      const proyectoNombre = norm(m.proyecto);
      const proyecto = proyectoNombre ? (ctx?.proyectos || []).find((p) => norm(p.nombre) === proyectoNombre) : null;
      return {
        ok: true,
        item: {
          concepto, tipo, proyectoId: proyecto?.id || '', contactoId: '', fecha, fechaVencimiento: '',
          monto, categoria: (m.categoria || '').toString().trim(), forma: (m.forma || '').toString().trim() || 'Transferencia',
          estatus: (m.estatus || '').toString().trim() || 'Cobrado', pautando: false, esRecurrente: false, frecuencia: 'Mensual', fechaFin: '',
        },
      };
    },
    resumenFila: (item) => `${item.concepto} — ${item.tipo} ${item.monto}`,
  },
};

export default function ImportarExcelModal({ tipo, proyectos, XLSX, onImportarFila, onCerrar }) {
  const config = CONFIGS[tipo];
  const [paso, setPaso] = useState('elegir'); // elegir | revisar | importando | listo
  const [error, setError] = useState('');
  const [encabezados, setEncabezados] = useState([]);
  const [filasCrudas, setFilasCrudas] = useState([]);
  const [mapeo, setMapeo] = useState({}); // campo -> encabezado del archivo (o "" = no usar)
  const [progreso, setProgreso] = useState({ hechas: 0, total: 0, errores: 0 });

  const onArchivo = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError('');
    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: 'array', cellDates: true });
      const hoja = wb.Sheets[wb.SheetNames[0]];
      const filas = XLSX.utils.sheet_to_json(hoja, { defval: '' });
      if (filas.length === 0) { setError('El archivo no tiene filas de datos.'); return; }
      const encs = Object.keys(filas[0]);
      // Auto-mapeo: por cada campo esperado, busca un encabezado del archivo cuyo texto
      // normalizado coincida con alguno de sus alias.
      const mapeoInicial = {};
      config.columnas.forEach((c) => {
        const encontrado = encs.find((enc) => c.alias.includes(norm(enc)));
        mapeoInicial[c.campo] = encontrado || '';
      });
      setEncabezados(encs);
      setFilasCrudas(filas);
      setMapeo(mapeoInicial);
      setPaso('revisar');
    } catch (err) {
      setError('No pude leer ese archivo — confirma que sea un .xlsx, .xls o .csv válido.');
    }
  };

  const filasProcesadas = paso === 'revisar' || paso === 'importando' || paso === 'listo'
    ? filasCrudas.map((fila) => {
        const mapeada = {};
        config.columnas.forEach((c) => { mapeada[c.campo] = mapeo[c.campo] ? fila[mapeo[c.campo]] : ''; });
        const resultado = config.validar(mapeada, { proyectos });
        return { ...resultado, original: fila };
      })
    : [];
  const validas = filasProcesadas.filter((f) => f.ok);
  const conError = filasProcesadas.filter((f) => !f.ok);
  const faltaRequerido = config.columnas.some((c) => c.requerido && !mapeo[c.campo]);

  const confirmarImportacion = async () => {
    setPaso('importando');
    setProgreso({ hechas: 0, total: validas.length, errores: 0 });
    let hechas = 0, fallidas = 0;
    for (const f of validas) {
      try {
        await onImportarFila(f.item);
        hechas += 1;
      } catch {
        fallidas += 1;
      }
      setProgreso({ hechas: hechas + fallidas, total: validas.length, errores: fallidas });
    }
    setPaso('listo');
  };

  if (paso === 'elegir') {
    return (
      <div>
        <p className="text-sm gp-text-muted mb-4">
          Sube un archivo Excel (.xlsx) o CSV con tus {config.etiqueta}. En el siguiente paso vas a poder revisar qué columna de tu archivo corresponde a cada dato antes de importar nada.
        </p>
        <label className="gp-panel p-6 flex flex-col items-center gap-2 text-center cursor-pointer" style={{ borderStyle: 'dashed' }}>
          <Upload size={24} className="gp-text-gold" />
          <span className="text-sm font-medium">Elegir archivo…</span>
          <span className="text-xs gp-text-muted">.xlsx, .xls o .csv</span>
          <input type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={onArchivo} />
        </label>
        {error && <p className="text-xs gp-text-red mt-3">{error}</p>}
      </div>
    );
  }

  if (paso === 'revisar') {
    return (
      <div>
        <p className="text-xs font-medium mb-2 gp-text-muted uppercase tracking-wide">Qué columna de tu archivo usar</p>
        <div className="space-y-2 mb-4">
          {config.columnas.map((c) => (
            <div key={c.campo} className="flex items-center gap-2 text-sm">
              <span className="w-36 shrink-0 truncate">{c.etiqueta}{c.requerido && <span className="gp-text-red"> *</span>}</span>
              <select
                className="gp-input flex-1"
                value={mapeo[c.campo] || ''}
                onChange={(e) => setMapeo({ ...mapeo, [c.campo]: e.target.value })}
              >
                <option value="">— no usar —</option>
                {encabezados.map((enc) => <option key={enc} value={enc}>{enc}</option>)}
              </select>
            </div>
          ))}
        </div>
        {faltaRequerido && <p className="text-xs gp-text-red mb-3">Faltan columnas obligatorias (*) por asignar.</p>}

        <p className="text-xs font-medium mb-2 gp-text-muted uppercase tracking-wide">
          Vista previa — {validas.length} válida{validas.length === 1 ? '' : 's'}{conError.length > 0 ? `, ${conError.length} con error` : ''}
        </p>
        <div className="max-h-56 overflow-y-auto gp-scroll space-y-1.5 mb-4">
          {filasProcesadas.slice(0, 12).map((f, i) => (
            <div key={i} className="flex items-center gap-2 text-xs gp-panel p-2">
              {f.ok ? <CheckCircle2 size={14} className="gp-text-teal shrink-0" /> : <XCircle size={14} className="gp-text-red shrink-0" />}
              <span className="truncate flex-1">{f.ok ? config.resumenFila(f.item) : (Object.values(f.original)[0] || `Fila ${i + 2}`)}</span>
              {!f.ok && <span className="gp-text-red shrink-0">{f.motivo}</span>}
            </div>
          ))}
          {filasProcesadas.length > 12 && <p className="text-xs gp-text-muted text-center">…y {filasProcesadas.length - 12} más</p>}
        </div>

        {error && <p className="text-xs gp-text-red mb-3">{error}</p>}
        <div className="flex gap-2">
          <button onClick={onCerrar} className="gp-btn-ghost flex-1 py-2 text-sm">Cancelar</button>
          <button
            onClick={confirmarImportacion}
            disabled={faltaRequerido || validas.length === 0}
            className="gp-btn flex-1 py-2 text-sm disabled:opacity-50"
          >
            Importar {validas.length} {config.etiqueta}
          </button>
        </div>
      </div>
    );
  }

  if (paso === 'importando') {
    return (
      <div className="text-center py-6">
        <p className="text-sm gp-text-muted mb-3">Importando {progreso.hechas} de {progreso.total}…</p>
        <div className="h-2 rounded" style={{ background: 'var(--border)' }}>
          <div className="h-2 rounded transition-all" style={{ width: `${progreso.total ? (progreso.hechas / progreso.total) * 100 : 0}%`, background: 'var(--gold)' }} />
        </div>
      </div>
    );
  }

  // listo
  return (
    <div>
      <p className="text-sm mb-1">
        <CheckCircle2 size={16} className="gp-text-teal inline mr-1.5" />
        {progreso.hechas - progreso.errores} de {progreso.total} se importaron correctamente.
      </p>
      {progreso.errores > 0 && <p className="text-xs gp-text-red mb-3">{progreso.errores} fallaron al guardar (revisa tu conexión e inténtalo de nuevo con esas filas).</p>}
      {conError.length > 0 && (
        <p className="text-xs gp-text-muted mb-3">{conError.length} fila(s) no se intentaron por tener datos incompletos — corrígelas en tu archivo y vuelve a importar solo esas.</p>
      )}
      <button onClick={onCerrar} className="gp-btn w-full py-2 text-sm mt-2">Listo</button>
    </div>
  );
}
