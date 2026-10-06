// src/components/modulos/Contactos.jsx
//
// Modulo perezoso (Fase 2). Salio de App.jsx el 5 oct 2026; se mudaron con el sus propias
// piezas (FILTRO_PLURAL, claveOrdenContacto, AccionesContactoRapidas, ChipsProyectosContacto, MenuFilaContacto), que nadie mas usaba.

import Bitacora from "../comunes/Bitacora";
import bannerMontanas from "../../assets/dashboard-banner-montanas-nevadas.jpg";
import { AvatarContacto } from "../comunes/contactos";
import { BadgeCumpleContacto, COLOR_TIPO_CONTACTO, ChipsEtiquetasContacto, ChipsTiposContacto, ContactoForm, FichaContacto, IconoWhatsApp, TIPOS_CONTACTO, VERDE_BANDERA, etiquetasDeContactos, titulosDeContactos } from "../comunes/fichaContacto";
import { BarraListaEstandar, OrdenSelector, Th } from "../ui/tablas";
import { ChevronLeft, ChevronRight, FolderKanban, Gift, Mail, MessageSquare, MoreHorizontal, Pencil, Phone, Plus, Sliders, Trash2, Upload } from "lucide-react";
import { ComboFiltroColor } from "../ui/ComboFiltroColor";
import { IconBtn } from "../ui/basicos";
import { Modal } from "../ui/Modal";
import { Suspense, useState, lazy } from "react";
import { exportarFilasExcel, exportarFilasPDF } from "../../lib/exportar";
import { filtrarPorBusqueda, ordenAlfabetico, ordenarLista } from "../../lib/listas";
import { paginasVisibles } from "../../lib/paginacion";
import { usarCatalogoEditable } from "../ui/usarCatalogoEditable";
import { usePanelRedimensionable } from "../ui/usePanelRedimensionable";
// Perezoso dentro del módulo, igual que estaba en App.jsx: el modal de importar se abre de vez
// en cuando y no tiene por qué viajar en el trozo de Contactos.
const ImportarExcelModal = lazy(() => import("../import/ImportarExcelModal"));

// Roles de un contacto. Un contacto puede tener varios a la vez (anexo de arquitectura). "Personal"
// Cómo se nombra cada rol en las pastillas de filtro (en plural, como el mockup).
const FILTRO_PLURAL = { Amistad: "Amistades", Cliente: "Clientes", Proveedor: "Proveedores", Colaborador: "Colaboradores", Personal: "Personal", Familia: "Familia", Otro: "Otros" };

// Orden alfabético de contactos: nombre(s), luego apellido paterno y materno — así lo pidió
// Angel el 24 sept 2026 (antes ordenaba por apellido primero, estilo directorio telefónico).
const claveOrdenContacto = (c) =>
  `${c.nombres || c.nombre || ""} ${c.apellidoPaterno || ""} ${c.apellidoMaterno || ""}`.trim();

// Ícono de WhatsApp: el de la marca (teléfono dentro del globo), no el bocadillo genérico de

function AccionesContactoRapidas({ c }) {
  const sinNada = !c.whatsapp && !c.correo && !c.telefono;
  return (
    <div className="flex items-center gap-1">
      {c.whatsapp && <a href={`https://wa.me/${(c.whatsapp || "").replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer" title="WhatsApp" className="p-1.5 rounded gp-btn-ghost" style={{ lineHeight: 0, color: "#25D366" }}><IconoWhatsApp size={14} /></a>}
      {c.correo && <a href={`mailto:${c.correo}`} title="Correo" className="p-1.5 rounded gp-btn-ghost" style={{ lineHeight: 0, color: "#087CF5" }}><Mail size={14} /></a>}
      {(c.telefono || c.whatsapp) && <a href={`tel:${c.telefono || c.whatsapp}`} title="Llamar por teléfono" className="p-1.5 rounded gp-btn-ghost" style={{ lineHeight: 0, color: VERDE_BANDERA }}><Phone size={14} /></a>}
      {sinNada && <span className="gp-text-muted text-xs">—</span>}
    </div>
  );
}

function ChipsProyectosContacto({ lista }) {
  if (lista.length === 0) return <span className="gp-text-muted text-xs">—</span>;
  return (
    <div className="flex items-center gap-1">
      <span className="gp-badge inline-flex items-center gap-1" style={{ color: "var(--gold)", background: "rgba(245,158,11,.14)" }}>
        <FolderKanban size={11} /> {lista[0].nombre}
      </span>
      {lista.length > 1 && <span className="text-xs gp-text-muted">+{lista.length - 1}</span>}
    </div>
  );
}

// Menú "···" de cada fila. El estado de cuál está abierto vive en la lista (uno solo para toda
// la tabla), no uno por fila.
function MenuFilaContacto({ c, abierto, onToggle, onCerrar, onEditar, onComentarios, onAtenciones, onEliminar }) {
  return (
    <div className="relative">
      <IconBtn title="Acciones" onClick={onToggle}><MoreHorizontal size={15} /></IconBtn>
      {abierto && (
        <>
          <div className="fixed inset-0 z-10" onClick={onCerrar} />
          <div className="absolute right-0 top-8 z-20 gp-panel py-1 text-sm" style={{ minWidth: 190 }}>
            <button onClick={() => { onCerrar(); onEditar(c); }} className="w-full text-left px-3 py-2 gp-panel-hi flex items-center gap-2"><Pencil size={13} /> Editar</button>
            <button onClick={() => { onCerrar(); onComentarios(c); }} className="w-full text-left px-3 py-2 gp-panel-hi flex items-center gap-2"><MessageSquare size={13} /> Comentarios</button>
            {onAtenciones && <button onClick={() => { onCerrar(); onAtenciones(c); }} className="w-full text-left px-3 py-2 gp-panel-hi flex items-center gap-2"><Gift size={13} /> Atenciones</button>}
            <button onClick={() => { onCerrar(); onEliminar(c.id); }} className="w-full text-left px-3 py-2 gp-panel-hi flex items-center gap-2 gp-text-red"><Trash2 size={13} /> Eliminar</button>
          </div>
        </>
      )}
    </div>
  );
}

// navegadores —Safari e iOS sobre todo— ignoran el estilo de <option>, así que no hay forma de

export default function Contactos({ data, onAdd, onEdit, onRemove, onAddComentario, onRemoveComentario, onVerRegalos, onVincularProyecto, onDesvincularProyecto, onAddNota, onAddCita, onAddEvento, onIrAVista, onVerProyecto, contactoSel, onSeleccionar, fichaTab, onFichaTab }) {
  // Ancho de la ficha de la derecha, arrastrable y recordado por pantalla.
  const { contenedorRef, divisor, estiloPanel } = usePanelRedimensionable("contactos");
  const [modal, setModal] = useState(null);
  const [importarAbierto, setImportarAbierto] = useState(false);
  const [comentariosDe, setComentariosDe] = useState(null);
  const [filtroTipo, setFiltroTipoState] = useState("Todos");
  const [orden, setOrden] = useState("alfabetico");
  const [ordenDir, setOrdenDir] = useState("asc");
  const [busqueda, setBusquedaState] = useState("");
  const [filtrosAbiertos, setFiltrosAbiertos] = useState(false);
  const [filtroEtiqueta, setFiltroEtiqueta] = useState("Todas");
  // Administrar el catálogo = tocar las fichas, porque el catálogo ES lo que está capturado.
  const catalogoEtiquetasContactos = usarCatalogoEditable({
    registros: data.contactos, campo: "etiquetas", esLista: true, onEditar: onEdit, nombreSingular: "la etiqueta",
  });
  const catalogoTitulosContactos = usarCatalogoEditable({
    registros: data.contactos, campo: "titulo", esLista: false, onEditar: onEdit, nombreSingular: "el título",
  });
  const [menuAcciones, setMenuAcciones] = useState(null); // id del contacto con su menú "···" abierto
  const [pagina, setPagina] = useState(1);
  const [porPagina, setPorPagina] = useState(100);
  // Cambiar filtro o búsqueda siempre regresa a la página 1 — si no, se queda en una página que
  // ya no existe con el nuevo resultado y la lista se ve vacía sin razón aparente.
  const setFiltroTipo = (t) => { setFiltroTipoState(t); setPagina(1); };
  const setBusqueda = (q) => { setBusquedaState(q); setPagina(1); };
  const toggleOrden = (key) => { if (orden === key) setOrdenDir((d) => (d === "asc" ? "desc" : "asc")); else { setOrden(key); setOrdenDir("asc"); } };

  const empty = { nombre: "", nombres: "", apellidoPaterno: "", apellidoMaterno: "", tipos: ["Cliente"], titulo: "", etiquetas: [], parentesco: "", fechaNacimiento: "", contexto: "", fotoUrl: "", empresa: "", puesto: "", whatsapp: "", telefono: "", correo: "", direccion: "", notas: "" };
  const tiposDe = (c) => (c.tipos && c.tipos.length ? c.tipos : [c.tipo || "Otro"]);
  const proyectosDe = (contactoId) => (data.contactoProyectos || [])
    .filter((v) => v.contactoId === contactoId)
    .map((v) => data.proyectos.find((p) => p.id === v.proyectoId))
    .filter(Boolean);
  const ultimaAtencionDe = (contactoId) => (data.regalos || [])
    .filter((r) => r.contactoId === contactoId)
    .sort((a, b) => (b.fecha || b.createdAt || "").localeCompare(a.fecha || a.createdAt || ""))[0];

  const camposOrden = {
    alfabetico: { get: (c) => claveOrdenContacto(c), tipo: "texto" },
    empresa: { get: (c) => c.empresa || "", tipo: "texto" },
    ultimaAtencion: { get: (c) => ultimaAtencionDe(c.id)?.fecha || "", tipo: "fecha" },
    registro: { get: (c) => c.createdAt, tipo: "fecha" },
  };
  const opcionesOrden = [
    { key: "alfabetico", label: "alfabético" },
    { key: "empresa", label: "empresa" },
    { key: "ultimaAtencion", label: "última atención" },
    { key: "registro", label: "fecha de registro" },
  ];

  const FILTROS = ["Todos", ...TIPOS_CONTACTO];
  const contarFiltro = (t) => (t === "Todos" ? data.contactos.length : data.contactos.filter((c) => tiposDe(c).includes(t)).length);
  // "Todos" no es un tipo de contacto, así que no está en COLOR_TIPO_CONTACTO: lleva el ámbar de
  // ARKEYONE en hex (y no var(--gold)) porque el color se usa también para armar el tinte suave
  // de las opciones no seleccionadas, y sobre una variable CSS no se puede concatenar el alfa.
  // "Todos" va fijo hasta arriba: no es una categoría, es "sin filtro". El resto va alfabético
  // por la etiqueta que se lee, y "Otros" se va al final (ver ordenAlfabetico).
  const opcionesFiltroContacto = [
    { id: "Todos", label: "Todos", color: "#F59E0B", n: contarFiltro("Todos") },
    ...ordenAlfabetico(
      TIPOS_CONTACTO.map((t) => ({ id: t, label: FILTRO_PLURAL[t] || t, color: COLOR_TIPO_CONTACTO[t], n: contarFiltro(t) })),
      (o) => o.label,
    ),
  ];

  const porTipo = filtroTipo === "Todos" ? data.contactos : data.contactos.filter((c) => tiposDe(c).includes(filtroTipo));
  // La etiqueta es un filtro aparte del tipo, porque son ejes distintos: se puede querer "los
  // clientes que además son de Gobierno" y eso solo sale combinándolos.
  const filtrados = filtroEtiqueta === "Todas" ? porTipo : porTipo.filter((c) => (c.etiquetas || []).includes(filtroEtiqueta));
  const buscados = filtrarPorBusqueda(filtrados, busqueda, [(c) => c.nombre, (c) => c.titulo, (c) => (c.etiquetas || []).join(" "), (c) => c.empresa, (c) => c.puesto, (c) => c.contexto, (c) => c.whatsapp, (c) => c.telefono, (c) => c.correo, (c) => c.parentesco, (c) => c.notas]);
  const visibles = ordenarLista(buscados, orden, camposOrden, ordenDir);

  // Paginación: `pagina` puede quedar fuera de rango si se borran contactos, así que se acota
  // aquí en vez de confiar en que siempre se reinicie.
  const totalPaginas = Math.max(1, Math.ceil(visibles.length / porPagina));
  const paginaActual = Math.min(pagina, totalPaginas);
  const desde = (paginaActual - 1) * porPagina;
  const enPagina = visibles.slice(desde, desde + porPagina);
  const columnasExport = [
    { label: "Nombre completo", get: (c) => c.nombre }, { label: "Nombre(s)", get: (c) => c.nombres || "" },
    { label: "Apellido paterno", get: (c) => c.apellidoPaterno || "" }, { label: "Apellido materno", get: (c) => c.apellidoMaterno || "" },
    { label: "Tipo", get: (c) => tiposDe(c).join(", ") },
    { label: "Título", get: (c) => c.titulo || "" },
    { label: "Etiquetas", get: (c) => (c.etiquetas || []).join(", ") },
    { label: "Empresa/Organización", get: (c) => c.empresa || "" }, { label: "Puesto", get: (c) => c.puesto || "" },
    { label: "Parentesco", get: (c) => c.parentesco }, { label: "WhatsApp", get: (c) => c.whatsapp }, { label: "Teléfono", get: (c) => c.telefono || "" },
    { label: "Correo", get: (c) => c.correo }, { label: "Proyectos", get: (c) => proyectosDe(c.id).map((p) => p.nombre).join(", ") },
    { label: "Notas", get: (c) => c.notas },
  ];

  // Props que comparten todas las filas para su menú "···".
  const propsMenu = (c) => ({
    c,
    abierto: menuAcciones === c.id,
    onToggle: () => setMenuAcciones(menuAcciones === c.id ? null : c.id),
    onCerrar: () => setMenuAcciones(null),
    onEditar: (x) => setModal({ item: x }),
    onComentarios: setComentariosDe,
    onAtenciones: onVerRegalos,
    onEliminar: onRemove,
  });

  const seleccionado = data.contactos.find((c) => c.id === contactoSel) || null;

  return (
    <div ref={contenedorRef} className="flex flex-col lg:flex-row gap-4 items-start">
      {/* Columna de la lista. En celular se esconde cuando hay una ficha abierta (no caben lado
          a lado), en escritorio se angosta y la ficha se pone a la derecha, como el mockup. */}
      <div className={`min-w-0 flex-1 w-full ${seleccionado ? "hidden lg:block" : ""}`}>
      {/* Banner de la pantalla (mockup de Angel, 24 sept 2026): foto + título + bajada, con un
          degradado direccional para que el texto se lea sin apagar toda la foto. */}
      <div className="relative overflow-hidden rounded-2xl mb-4">
        <img src={bannerMontanas} alt="" className="absolute inset-0 w-full h-full object-cover" style={{ objectPosition: "50% 45%" }} />
        <div className="absolute inset-0" style={{ background: "linear-gradient(100deg, rgba(11,35,72,.88) 0%, rgba(11,35,72,.6) 45%, rgba(11,35,72,.12) 80%, rgba(11,35,72,0) 100%)" }} />
        <div className="relative z-10 p-5 md:px-8 md:py-7">
          <h2 className="gp-serif text-white text-2xl md:text-4xl font-extrabold" style={{ textShadow: "0 2px 8px rgba(0,0,0,.45)" }}>Contactos</h2>
          <p className="text-white text-xs md:text-sm mt-1 font-medium" style={{ textShadow: "0 1px 5px rgba(0,0,0,.5)" }}>
            Conecta, colabora y mantén cerca a las personas importantes en tu vida.
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 mb-3">
        <div className="flex-1 min-w-0">
          <ComboFiltroColor opciones={opcionesFiltroContacto} valor={filtroTipo} onCambiar={setFiltroTipo} />
        </div>
        <div className="flex gap-2 shrink-0">
          <button onClick={() => setImportarAbierto(true)} className="gp-btn-ghost flex items-center justify-center gap-1 px-3 py-1.5 text-sm"><Upload size={14} /> Importar</button>
          <button onClick={() => setModal({ item: empty })} className="gp-btn flex items-center justify-center gap-1 px-3 py-1.5 text-sm"><Plus size={14} /> Nuevo contacto</button>
        </div>
      </div>

      <BarraListaEstandar busqueda={busqueda} onBusqueda={setBusqueda} placeholder="Buscar contactos por nombre, empresa, teléfono, correo…"
        extra={
          <button onClick={() => setFiltrosAbiertos((v) => !v)} className="text-xs px-2.5 py-1.5 rounded gp-btn-ghost flex items-center gap-1">
            <Sliders size={12} /> Filtros
          </button>
        }
        onExportExcel={() => exportarFilasExcel(visibles, columnasExport, "contactos")}
        onExportPDF={() => exportarFilasPDF(visibles, columnasExport, "contactos", "Contactos", `filtro: ${filtroTipo}${busqueda ? ` · búsqueda: "${busqueda}"` : ""}`)} />

      {filtrosAbiertos && (
        <div className="gp-panel p-3 mb-3 flex flex-wrap items-center gap-3">
          <OrdenSelector opciones={opcionesOrden} value={orden} onChange={(v) => { setOrden(v); setOrdenDir("asc"); }} />
          <label className="flex items-center gap-1.5 text-xs">
            <span className="gp-text-muted">Etiqueta</span>
            <select className="gp-input text-xs py-1.5" style={{ width: "auto" }} value={filtroEtiqueta} onChange={(e) => setFiltroEtiqueta(e.target.value)}>
              <option value="Todas">Todas</option>
              {etiquetasDeContactos(data.contactos).map((e) => <option key={e} value={e}>{e}</option>)}
            </select>
          </label>
          <button onClick={() => { setFiltroTipo("Todos"); setFiltroEtiqueta("Todas"); setBusqueda(""); setOrden("alfabetico"); setOrdenDir("asc"); }} className="text-xs gp-text-gold">Limpiar filtros</button>
        </div>
      )}

      {/* Escritorio: tabla. Celular: tarjetas (el documento pide explícitamente no comprimir la
          tabla en móvil). */}
      <div className="gp-panel overflow-x-auto hidden md:block">
        <table className="gp-table">
          <thead>
            <tr>
              <Th label="Nombre" sortKey="alfabetico" orden={orden} ordenDir={ordenDir} onToggle={toggleOrden} />
              <th>Tipos</th>
              <Th label="Empresa / Organización" sortKey="empresa" orden={orden} ordenDir={ordenDir} onToggle={toggleOrden} />
              <th>Proyectos</th>
              <Th label="Última atención" sortKey="ultimaAtencion" orden={orden} ordenDir={ordenDir} onToggle={toggleOrden} />
              <th>Comunicación</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {enPagina.map((c) => {
              const ultima = ultimaAtencionDe(c.id);
              const esSel = contactoSel === c.id;
              return (
                // Clic en la fila abre la ficha a la derecha. Los controles de adentro (iconos de
                // contacto, menú "···") paran la propagación para no abrirla sin querer.
                <tr
                  key={c.id}
                  onClick={() => onSeleccionar(c.id)}
                  style={{ cursor: "pointer", background: esSel ? "var(--panel-hi)" : undefined }}
                >
                  <td>
                    <div className="flex items-center gap-2.5">
                      <AvatarContacto c={c} />
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {/* El título (Dr., Arq., M en C) NO va pegado al nombre: aquí solo el
                              nombre y los apellidos. Se consulta en la ficha, y sigue entrando en
                              la búsqueda y en las exportaciones. */}
                          <span className="font-medium">{c.nombre}</span>
                          <BadgeCumpleContacto c={c} />
                          <ChipsEtiquetasContacto c={c} max={2} />
                        </div>
                        {c.puesto && <div className="text-xs gp-text-muted">{c.puesto}</div>}
                      </div>
                    </div>
                  </td>
                  <td><ChipsTiposContacto c={c} /></td>
                  <td className="gp-text-muted">{c.empresa || "—"}</td>
                  <td><ChipsProyectosContacto lista={proyectosDe(c.id)} /></td>
                  <td className="gp-mono gp-text-muted">{ultima?.fecha || "—"}</td>
                  <td onClick={(e) => e.stopPropagation()}><AccionesContactoRapidas c={c} /></td>
                  <td onClick={(e) => e.stopPropagation()}><MenuFilaContacto {...propsMenu(c)} /></td>
                </tr>
              );
            })}
            {enPagina.length === 0 && (
              <tr><td colSpan={7} className="text-center gp-text-muted py-8">
                {data.contactos.length === 0 ? "Aún no registras contactos." : "Ningún contacto coincide con la búsqueda o el filtro."}
              </td></tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="md:hidden flex flex-col gap-2">
        {enPagina.map((c) => (
          <div key={c.id} className="gp-panel p-3" onClick={() => onSeleccionar(c.id)} style={{ cursor: "pointer" }}>
            <div className="flex items-start gap-3">
              <AvatarContacto c={c} size={40} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <p className="text-sm font-medium truncate">{c.nombre}</p>
                  <BadgeCumpleContacto c={c} />
                </div>
                <div className="mt-1"><ChipsTiposContacto c={c} /></div>
                {(c.empresa || c.puesto) && <p className="text-xs gp-text-muted mt-1 truncate">{[c.puesto, c.empresa].filter(Boolean).join(" · ")}</p>}
                <div className="mt-1"><ChipsProyectosContacto lista={proyectosDe(c.id)} /></div>
              </div>
              <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                <MenuFilaContacto {...propsMenu(c)} />
                <ChevronRight size={16} className="gp-text-muted" />
              </div>
            </div>
            <div className="flex items-center justify-between mt-2 pt-2 border-t gp-border" onClick={(e) => e.stopPropagation()}>
              <AccionesContactoRapidas c={c} />
              <span className="text-xs gp-text-muted">{ultimaAtencionDe(c.id)?.fecha || ""}</span>
            </div>
          </div>
        ))}
        {enPagina.length === 0 && (
          <p className="text-sm gp-text-muted text-center py-6">
            {data.contactos.length === 0 ? "Aún no registras contactos." : "Ningún contacto coincide con la búsqueda o el filtro."}
          </p>
        )}
      </div>

      {visibles.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 mt-3 text-xs gp-text-muted">
          <span>Mostrando {desde + 1}–{Math.min(desde + porPagina, visibles.length)} de {visibles.length} contacto{visibles.length === 1 ? "" : "s"}</span>
          {totalPaginas > 1 && (
            <div className="flex items-center gap-1">
              <button onClick={() => setPagina(Math.max(1, paginaActual - 1))} disabled={paginaActual === 1} className="px-2 py-1 rounded gp-btn-ghost disabled:opacity-40" aria-label="Página anterior"><ChevronLeft size={13} /></button>
              {paginasVisibles(paginaActual, totalPaginas).map((p, i) => (
                p === "…"
                  ? <span key={`sep-${i}`} className="px-1">…</span>
                  : <button key={p} onClick={() => setPagina(p)} className={`px-2.5 py-1 rounded ${p === paginaActual ? "gp-btn" : "gp-btn-ghost"}`}>{p}</button>
              ))}
              <button onClick={() => setPagina(Math.min(totalPaginas, paginaActual + 1))} disabled={paginaActual === totalPaginas} className="px-2 py-1 rounded gp-btn-ghost disabled:opacity-40" aria-label="Página siguiente"><ChevronRight size={13} /></button>
            </div>
          )}
          <label className="flex items-center gap-1.5">
            Mostrar
            <select className="gp-input text-xs py-1" style={{ width: "auto" }} value={porPagina} onChange={(e) => { setPorPagina(Number(e.target.value)); setPagina(1); }}>
              {[12, 24, 50, 100, 250].map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
            por página
          </label>
        </div>
      )}
      </div>

      {/* Ficha del contacto: panel a la derecha en escritorio (pegado arriba mientras se baja la
          lista), y pantalla completa en celular — lado a lado no cabe en un teléfono. */}
      {seleccionado && divisor}
      {seleccionado && (
        <div className="w-full shrink-0 lg:sticky lg:top-4" style={estiloPanel}>
          <FichaContacto
            c={seleccionado}
            data={data}
            proyectosVinculados={proyectosDe(seleccionado.id)}
            onCerrar={() => onSeleccionar(null)}
            onEditar={() => setModal({ item: seleccionado })}
            onVerAtenciones={onVerRegalos}
            onIrAVista={onIrAVista}
            onAddNota={onAddNota}
            onAddCita={onAddCita}
            onAddEvento={onAddEvento}
            onAddComentario={onAddComentario}
            tab={fichaTab} onTab={onFichaTab}
            onVerProyecto={onVerProyecto}
          />
        </div>
      )}

      {comentariosDe && (
        <Modal title={`Comentarios — ${comentariosDe.nombre}`} onClose={() => setComentariosDe(null)}>
          <Bitacora data={data} entidadTipo="contactos" entidadId={comentariosDe.id} onAdd={onAddComentario} onRemove={onRemoveComentario} />
        </Modal>
      )}

      {modal && (
        <Modal title={modal.item.id ? "Editar contacto" : "Nuevo contacto"} onClose={() => setModal(null)}>
          <ContactoForm
            item={modal.item}
            proyectos={data.proyectos}
            vinculos={(data.contactoProyectos || []).filter((v) => v.contactoId === modal.item.id)}
            etiquetasExistentes={etiquetasDeContactos(data.contactos)}
            titulosExistentes={titulosDeContactos(data.contactos)}
            catalogoEtiquetas={catalogoEtiquetasContactos}
            catalogoTitulos={catalogoTitulosContactos}
            onVincularProyecto={onVincularProyecto}
            onDesvincularProyecto={onDesvincularProyecto}
            onSave={(v) => { modal.item.id ? onEdit(modal.item.id, v) : onAdd(v); setModal(null); }}
          />
        </Modal>
      )}

      {importarAbierto && (
        <Modal title="Importar contactos" onClose={() => setImportarAbierto(false)}>
          {/* La sincronización con Google/Apple/Microsoft es la dirección del anexo de
              arquitectura, pero todavía NO existe — se anuncia aquí sin fingir que ya funciona
              (el propio documento lo pide así), en vez de poner un botón que no hace nada. */}
          <p className="text-xs gp-text-muted mb-3" style={{ borderLeft: "2px solid var(--gold)", paddingLeft: 8 }}>
            Muy pronto vas a poder sincronizar directo con Google, Apple o Microsoft, con detección
            de duplicados. Por ahora se importa desde Excel.
          </p>
          <Suspense fallback={<p className="text-sm gp-text-muted">Cargando…</p>}>
            <ImportarExcelModal tipo="contactos" onImportarFila={(item) => onAdd(item)} onCerrar={() => setImportarAbierto(false)} />
          </Suspense>
        </Modal>
      )}
    </div>
  );
}
