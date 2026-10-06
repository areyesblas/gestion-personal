import React, { useState, useEffect, useLayoutEffect, useMemo, useRef, Suspense, lazy, Fragment } from "react";
import { supabase } from "./supabaseClient";
import LoginScreenNuevo from "./components/auth/LoginScreen";
import AuthCard, { AuthField, AuthPasswordField, AuthButton, AuthBanner, AuthBackLink } from "./components/auth/AuthCard";
import DashboardHeader from "./components/CentroMando/DashboardHeader";
import DashboardSaludo from "./components/CentroMando/DashboardSaludo";
import ResumenCards from "./components/CentroMando/ResumenCards";
import MiDia from "./components/CentroMando/MiDia";
import RequiereAtencion from "./components/CentroMando/RequiereAtencion";
import CalendarioWidget from "./components/CentroMando/CalendarioWidget";
import ProgresoWidget from "./components/CentroMando/ProgresoWidget";
import ProyectosMiniWidget from "./components/CentroMando/ProyectosMiniWidget";
import NotasRapidasWidget from "./components/CentroMando/NotasRapidasWidget";
import AccesosRapidosWidget from "./components/CentroMando/AccesosRapidosWidget";
import HabitosHoyWidget from "./components/CentroMando/HabitosHoyWidget";
import MotivationalCard from "./components/CentroMando/MotivationalCard";
import ArkiWidget from "./components/CentroMando/ArkiWidget";
import TarjetaRapidaAgenda from "./components/agenda/TarjetaRapidaAgenda";
import ToastDeshacer from "./components/agenda/ToastDeshacer";
import BottomNav from "./components/nav/BottomNav";
import BotonRegresar from "./components/nav/BotonRegresar";
// Mismo banner para Contactos y Proyectos e ideas (cada pantalla lo recorta distinto) hasta que
// haya una foto propia para cada una.
import bannerMontanas from "./assets/dashboard-banner-montanas-nevadas.jpg";
// Helpers compartidos que salieron de este archivo en la Fase 0 del corte por módulos. Mientras
// vivían aquí no se podía extraer ningún módulo sin arrastrar el archivo completo.
import {
  uid, fmtMoney, todayISO, horaActualHHMM, daysUntil, MESES_LARGO, fmtFechaCorta, dateStr, ahoraISO,
  MONEDA_BASE, MONEDAS, montoBaseDe, fmtMonedaOriginal,
} from "./lib/formato";
import {
  ordenAlfabetico, compararEs, ordenadosPorNombre, ordenadosPor,
  normalizarTexto, filtrarPorBusqueda, PRIORIDAD_ORDEN, ordenarLista,
} from "./lib/listas";
import { cargarXLSX, exportarFilasExcel, exportarFilasPDF } from "./lib/exportar";
// Primitivas de UI compartidas por todas las pantallas. Field tenía 393 usos y Modal 181 cuando
// vivían aquí: eran la razón principal por la que no se podía extraer un módulo solo.
import { Badge, IconBtn, Field, BloqueFicha, BarraGuardar } from "./components/ui/basicos";
import { Modal } from "./components/ui/Modal";
import { MoneyInput, SelectGuardable, ComboboxMultiBuscar, CampoPassword } from "./components/ui/campos";
import { Th, OrdenSelector, BarraListaEstandar } from "./components/ui/tablas";
import { useBorrador, confirmarDescartarCambios } from "./components/ui/borradores";
// Analítica de Finanzas. El Dashboard y Presupuesto también la usan y NO son perezosos, por eso
// vive en lib/ y no dentro de los módulos de Reportes/Estimaciones.
import { buildMonthlyLedger, lastNMonthKeys, monthLabel, calcularSaldo } from "./lib/finanzas";
import { leerPendientesOffline, quitarPendientesOffline, agregarPendienteOffline } from "./lib/offline";
import { usePanelRedimensionable } from "./components/ui/usePanelRedimensionable";
// Piezas compartidas que hablan con Supabase, por eso no están en ui/.
import Bitacora from "./components/comunes/Bitacora";
import ArchivosEntidad from "./components/comunes/ArchivosEntidad";
import PresupuestoMensualForm from "./components/comunes/PresupuestoMensualForm";
import AvatarForm from "./components/comunes/AvatarForm";
import PromptTareaRelacionada from "./components/comunes/PromptTareaRelacionada";
import {
  ESTATUS_TAREA, FRECUENCIA, PRIORIDADES, ESTATUS_TAREA_CERRADOS, toneEstatusTarea,
  ESTATUS_META, FORMA_PAGO, COLORES_DESGLOSE, CANDADO_SENSIBLE_ACTIVO,
  etiquetaEstatusProyecto, COLOR_ESTATUS_PROYECTO, COLOR_CONTEXTO_PROYECTO, TIPO_FIN,
} from "./lib/catalogos";
import { aplicaHoy } from "./lib/habitos";
import { tokenDeSesion } from "./lib/sesion";
// Núcleo que destraba el nudo de Proyectos/Tareas: lo comparten módulos perezosos con pantallas
// que se quedan aquí (Dashboard, AppLoggedIn, Agenda, Contactos, Finanzas).
import { buildTareaTree, flattenTareas, idsRamasTareas, calcAvanceTarea, descendientesDe, fmtFechaCompletado, reabrirTarea } from "./lib/tareas";
import { paginasVisibles } from "./lib/paginacion";
import { usarCatalogoEditable } from "./components/ui/usarCatalogoEditable";
import { ComboFiltroColor } from "./components/ui/ComboFiltroColor";
import { MontoMovimiento, CamposMoneda, ComprobantePago } from "./components/comunes/finanzas";
import { AvatarContacto, tiposDeContacto } from "./components/comunes/contactos";
import { BadgeEstatusProyecto } from "./components/comunes/proyectos";
import { PendienteForm, MetaForm } from "./components/comunes/formularios";
// Piezas que Proyectos, su centro y Tareas comparten ENTRE ELLOS: sin sacarlas, los tres
// tendrían que vivir en un solo archivo de ~3,000 líneas.
import { ToggleArbolTarea, ContadorRamaColapsada, BotonArbolTareas, CheckTareaHecha, ConfirmacionModal, subtareasAbiertas, preguntaCompletarTarea } from "./components/comunes/arbolTareas";
import { EtiquetaDiasEntrega, diasParaEntrega } from "./components/comunes/EtiquetaDiasEntrega";
import { rentabilidadProyecto, repartoCostosProyecto } from "./lib/proyectos";
// Núcleo del lote de Contactos y Agenda. rowToJs y camelToSnake son la capa de datos: los siguen
// usando loadAllTables y AppLoggedIn, que se quedan aquí.
import {
  camelToSnake, snakeToCamel, rowToJs, tagsUnicos,
  TABLES, ETIQUETA_TABLA, tableName, labelFor, fromRow, rowToSalud,
} from "./lib/datos";
import { fechaHoraALocalInputs, localInputsAFechaHora, fmtFechaHora } from "./lib/fechaHora";
import { armarNombreContacto, CumpleanosField, CampoTelefonoPais } from "./components/comunes/camposContacto";
import { CitaForm } from "./components/comunes/CitaForm";
import { LogoEmpresa } from "./components/comunes/LogoEmpresa";
// Piezas que comparten las tres pantallas de Finanzas (Resumen, Movimientos y Deudas).
import { cifrasFinanzas, CabeceraFinanzas, vencimientoDe, rangoFechas, TarjetaResumenFin, FinanzaForm, PagoDeudaForm } from "./components/comunes/pantallasFinanzas";
// La ficha de contacto y su formulario: los comparten Contactos, Regalos (Atenciones) y Equipo,
// más el buscador global y las acciones rápidas que se quedan en este archivo.
import {
  COLOR_TIPO_CONTACTO, TIPOS_CONTACTO, TITULOS_CONTACTO, PARENTESCOS,
  etiquetasDeContactos, titulosDeContactos, diasParaCumple,
  VERDE_BANDERA, VERDE_WHATSAPP, AZUL_CORREO, IconoWhatsApp, BotonAccionFicha,
  ChipsEtiquetasContacto, ChipsTiposContacto, BadgeCumpleContacto,
  FichaContacto, ContactoForm,
} from "./components/comunes/fichaContacto";
// Perezosos (Fase 1): Reportes y Estimaciones son capa analítica — se entra a ellas de vez en
// cuando, no tienen por qué pesar en el arranque de todos los días.
const Reportes = lazy(() => import("./components/modulos/Reportes"));
const Estimaciones = lazy(() => import("./components/modulos/Estimaciones"));
// Fase 2: cada módulo viaja en su propio trozo y se baja la primera vez que se entra a él.
// La frontera <Suspense> de más abajo cubre a todos, así que sumar uno cuesta solo esta línea.
const Notas = lazy(() => import("./components/modulos/Notas"));
const Patrimonio = lazy(() => import("./components/modulos/Patrimonio"));
const Apartados = lazy(() => import("./components/modulos/Apartados"));
const Presupuesto = lazy(() => import("./components/modulos/Presupuesto"));
const MarketingYRedes = lazy(() => import("./components/modulos/MarketingYRedes"));
const Facturas = lazy(() => import("./components/modulos/Facturas"));
const Eventos = lazy(() => import("./components/modulos/Eventos"));
const MiPerfil = lazy(() => import("./components/modulos/MiPerfil"));
const Medicamentos = lazy(() => import("./components/modulos/Medicamentos"));
const MisPagos = lazy(() => import("./components/modulos/MisPagos"));
const MiCalendario = lazy(() => import("./components/modulos/MiCalendario"));
const Actividades = lazy(() => import("./components/modulos/Actividades"));
const Configuracion = lazy(() => import("./components/modulos/Configuracion"));
const Habitos = lazy(() => import("./components/modulos/Habitos"));
const Documentos = lazy(() => import("./components/modulos/Documentos"));
const AdminUsuarios = lazy(() => import("./components/modulos/AdminUsuarios"));
const MiTrabajo = lazy(() => import("./components/modulos/MiTrabajo"));
const ActivosDigitales = lazy(() => import("./components/modulos/ActivosDigitales"));
// Salud dibuja <Medicamentos> adentro, así que lo importa como hermano (ver Salud.jsx).
const Salud = lazy(() => import("./components/modulos/Salud"));
// El nudo: los tres más grandes y entrelazados. Pudieron salir por separado gracias al núcleo
// de la Fase 2f y al de arbolTareas.jsx, que es lo que compartían entre ellos.
const Proyectos = lazy(() => import("./components/modulos/Proyectos"));
const ProyectoDetalle = lazy(() => import("./components/modulos/ProyectoDetalle"));
const Pendientes = lazy(() => import("./components/modulos/Pendientes"));
// Lote de Contactos: los cuatro comparten la ficha y el formulario, que viven en comunes/.
const Contactos = lazy(() => import("./components/modulos/Contactos"));
const Equipo = lazy(() => import("./components/modulos/Equipo"));
const Regalos = lazy(() => import("./components/modulos/Regalos"));
const Agenda = lazy(() => import("./components/modulos/Agenda"));
// Grupo de Finanzas: las tres pantallas comparten su cabecera, cifras y formularios (comunes/).
const FinanzasResumen = lazy(() => import("./components/modulos/FinanzasResumen"));
const FinanzasMovimientos = lazy(() => import("./components/modulos/FinanzasMovimientos"));
const Deudas = lazy(() => import("./components/modulos/Deudas"));
const Colaboradores = lazy(() => import("./components/modulos/Colaboradores"));
const MisEmpresas = lazy(() => import("./components/modulos/MisEmpresas"));
const Papelera = lazy(() => import("./components/modulos/Papelera"));
// Fase 3: la ÚNICA gráfica que quedaba en el bundle principal. Sacarla de aquí es lo que deja
// que recharts (160 KB gzip) salga del arranque — ver el comentario largo en ese archivo.
const GraficaResumenFinanciero = lazy(() => import("./components/CentroMando/GraficaResumenFinanciero"));
import {
  FolderKanban, CheckSquare, Wallet, AlertTriangle,
  Users, Activity, Plus, X, Trash2, Pencil, Github, ChevronDown,
  ChevronRight, Bell, Lightbulb, Rocket, MessageCircle, Mail, Globe,
  Target, Contact, BarChart3, FileText, Flame, HeartPulse, Check, Menu, PieChart as PieChartIcon, User, Home,
  PiggyBank, Camera, Film, Upload, MapPin, Clock, Mic, Gift, Receipt, Megaphone, Gem, Download, Sun, Moon, Shield, LogOut, ChevronLeft, Lock, Pill, CalendarClock, Zap, StickyNote, Search, Sparkles, Send, Bot, Square, Settings, CalendarRange, Palette, Eye, EyeOff, Sliders, Volume2, VolumeX, Play, Copy, Phone, MessageSquare, MoreHorizontal,
  Heart, Code2, Music, Tag, Archive, ExternalLink, ListChecks, Info, TrendingDown,
  ChevronsDownUp, ChevronsUpDown, Briefcase, Building2, ArrowRight,
  TrendingUp, ArrowDownCircle, ArrowUpCircle, Banknote, HandCoins,
} from "lucide-react";
// Perezoso: solo trae @dnd-kit (arrastrar y soltar) cuando el usuario realmente abre "Personalizar panel".
const PersonalizarPanelModal = lazy(() => import("./components/CentroMando/PersonalizarPanelModal"));
// Perezoso: solo trae la UI de importar (mapeo de columnas/vista previa) cuando el usuario abre
// "Importar desde Excel" en Contactos o Finanzas. El modal importa `xlsx` por su cuenta (ya no lo
// recibe como prop), así que la librería viaja en su propio trozo y no en el arranque de la app.
const ImportarExcelModal = lazy(() => import("./components/import/ImportarExcelModal"));
// Perezoso: el onboarding se ve una sola vez por cuenta — no tiene por qué pesar en el arranque
// de todos los días.
const OnboardingContextos = lazy(() => import("./components/onboarding/OnboardingContextos"));

/* ---------- estilos y tokens ---------- */
// OJO: todo lo de adentro del <style> vive en un template literal, así que NO se pueden usar
// backticks aquí, ni siquiera dentro de un comentario CSS: el primero que aparezca cierra la
// cadena a media hoja y rompe el build entero (pasó el 1 oct 2026).
const Tokens = ({ tema = "oscuro" }) => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@500;600;700&family=IBM+Plex+Sans:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap');
    /* --panel-2 es el fondo de los BLOQUES INTERNOS: lo que va DENTRO de una tarjeta .gp-panel
       (sub-bloques de dato, filas de lista, chips). 28 sept 2026, decisión de Angel después de
       comparar niveles: se aclara y se tiñe de azul en vez de blanco. Subirle al blanco
       transparente aclara pero lava el color hacia el gris; este azul claro aclara lo mismo sin
       salirse de la identidad. Se queda como alpha y no como hex fijo para que un bloque apoyado
       sobre algo que no es --panel (el fondo de la app, el menú lateral) siga siendo
       proporcionalmente sutil, igual que antes. Sobre --panel el color efectivo es ~#2B5076. */
    .gp-root{ --bg:#0B2341; --panel:#12304F; --panel-hi:#1A3D63; --border:#234A70;
      --text:#EAF1FA; --muted:#93A7C4; --gold:#F59E0B; --teal:#5FBF8B; --teal-tint:#DCF5E6; --teal-text:#1D6B42; --panel-2:rgba(130,195,255,.22); --muted-bloque:#B3C5DC; --red:#EF4444;
      /* Encabezado de los grids: un azul más claro que el panel, para que la fila de títulos se
         lea como una barra aparte y no como el primer registro. */
      --grid-head-bg:#27527E; --grid-head-text:#FFFFFF;
      /* El menú lateral tiene su propio fondo y su propio filo. En oscuro se queda como estaba
         (mismo azul que el lienzo: ahí todo es oscuro y el borde basta). El tema claro los
         redefine, ver más abajo. */
      --sidebar-bg:#0B2341; --sidebar-borde:#234A70;
      /* Fila de una tarea ya completada. Sobre el azul oscuro hace falta un verde con bastante
         luz propia para que se lea como "hecho" de un vistazo; el tema claro lo redefine abajo. */
      --hecho-bg:rgba(95,191,139,.28); --hecho-bg-hi:rgba(95,191,139,.38); --hecho-borde:#5FBF8B;
      --hecho-texto:#C6EFD9; --hecho-muted:#AECFC6;
      background:var(--bg); color:var(--text); font-family:'IBM Plex Sans',sans-serif; }
    /* Tema Claro — el único claro que queda (ARKEYONE es solo Oscuro/Claro, sin color
       personalizado ni temas adicionales). --panel-2 se redefine porque el de arriba está pensado
       para fondo oscuro y sobre blanco no se ve. Era un gris neutro al 6%; el 28 sept 2026 se
       aclaró y se pasó al azul ARKEYONE muy diluido, junto con el del tema oscuro — sobre la
       tarjeta blanca da ~#F3F9FF, un bloque limpio en vez de gris sucio, y de paso el texto gris
       encima gana contraste (4.4:1 → 4.7:1). El menú lateral SÍ seguía
       este tema desde acá (ver .gp-sidebar-area más abajo — esa clase se quedó solo para las
       pantallas de login/verificación, que sí se quedan siempre oscuras a propósito). */
    /* 24 sept 2026: los valores se alinearon a la paleta oficial del documento de diseño de
       ARKEYONE (superficie BLANCA, borde #DDE3EC, texto #14213D, secundario #667085) — antes era
       un azulado propio que no coincidía con los mockups. El id interno "azul-claro" se queda
       igual para no migrar la preferencia guardada de nadie.
       1 oct 2026: el lienzo deja de ser el #F5F7FB del documento y pasa a #D7EAFD, elegido por
       Angel de una escala de azules ("azul 6, marcado"). No es un gris: es el azul ARKEYONE
       #087CF5 rebajado al 16 % sobre blanco, así que el fondo es de la marca y no un neutro.
       La superficie sigue blanca, con lo que la tarjeta despega del lienzo (1.23:1) sin tocar el
       contraste del texto que vive dentro de ella, que se mide contra el blanco.
       Lo que SÍ hubo que mover es --muted: el texto secundario que va directo sobre el lienzo
       (los subtítulos de cada pantalla) caía a 4.05:1 con el gris de antes, debajo del mínimo
       legible. Con #5A6880 queda en 4.58:1 sobre el lienzo, 5.64:1 sobre blanco y 5.31:1 sobre
       un bloque interno — medido en los tres fondos donde aparece.
       El borde #DDE3EC se queda: es más oscuro que el lienzo nuevo, así que sigue leyéndose como
       el filo de la tarjeta y no como un halo. */
    .gp-root.tema-azul-claro{ --bg:#D7EAFD; --panel:#FFFFFF; --panel-hi:#EDF1F7; --border:#DDE3EC; --text:#14213D; --muted:#5A6880; --muted-bloque:#5A6880; --panel-2:rgba(8,124,245,.05);
      /* En claro el encabezado va en el navy de la marca con texto blanco: sobre tarjetas
         blancas es lo que de verdad resalta, y es el color que pide el documento de diseño
         para las barras de títulos. */
      --grid-head-bg:#102B55; --grid-head-text:#FFFFFF;
      /* 1 oct 2026: con el lienzo azul, el menú quedaba del MISMO color que el contenido y la
         división se perdía (reportado por Angel). Se le da superficie propia —blanca, como las
         tarjetas— y un filo más marcado que el borde normal, para que se lea como una columna
         aparte y no como parte del fondo. */
      --sidebar-bg:#FFFFFF; --sidebar-borde:#C3D3E6;
      /* Sobre blanco el mismo verde se ve lavado: aquí se usa el verde sólido de ARKEYONE con
         más cuerpo, que sí contrasta contra #FFFFFF sin tapar el texto. */
      --hecho-bg:rgba(22,163,106,.20); --hecho-bg-hi:rgba(22,163,106,.30); --hecho-borde:#16A36A;
      --hecho-texto:#0F5F3D; --hecho-muted:#455C52; }
    .gp-serif{ font-family:'Poppins',sans-serif; font-weight:600; }
    .gp-mono{ font-family:'IBM Plex Mono',monospace; }
    .gp-panel{ background:var(--panel); border:1px solid var(--border); border-radius:14px; }
    .gp-panel-hi:hover{ background:var(--panel-hi); }
    /* Bloque interno: el sub-contenedor que vive DENTRO de una tarjeta (.gp-panel). Además del
       fondo --panel-2 lleva un borde fino que lo despega de la tarjeta sin tener que ensuciarlo
       con más color. El borde va como box-shadow inset, no como border, para no cambiar el tamaño
       de la caja ni desajustar el padding ya calibrado de cada uso. No se aplica a superficies que
       cambian de color según su estado (botones activos/inactivos, burbujas del chat, bloques de
       la agenda): esas ya manejan su propio borde y su propio color. */
    .gp-bloque{ background:var(--panel-2); box-shadow:inset 0 0 0 1px var(--border); }
    /* Mismo problema que la fila de tarea completada, misma solución: al aclarar el bloque, el
       texto secundario gris queda por debajo del contraste mínimo encima de él (en oscuro ya
       estaba en 3.8:1 antes de este cambio, y aclarar lo deja en 3.3:1). En vez de renunciar al
       bloque claro, se le sube al texto SOLO dentro del bloque — 4.7:1 medido. En el tema claro el
       bloque es casi blanco y el gris de siempre ya cumple, así que ahí --muted-bloque = --muted. */
    .gp-bloque .gp-text-muted{ color:var(--muted-bloque); }
    .gp-border{ border-color:var(--border); }
    .gp-input{ background:var(--bg); border:1px solid var(--border); color:var(--text);
      border-radius:4px; padding:6px 10px; font-size:13px; width:100%; box-sizing:border-box; }
    /* input/select comparten una altura fija para que en filas de grid (p.ej. Fecha/Hora/Duración)
       todos los campos queden alineados — los inputs nativos de fecha/hora traen su propio
       ícono interno que si no se fija la altura, los hace ver más altos/bajos que sus vecinos. */
    input.gp-input, select.gp-input{ height:34px; }
    /* Las cajas de texto se pueden estirar, pero solo hacia abajo y como mucho 2.5 veces su alto
       original (Angel, 1 oct 2026). Sin tope, al jalar una caja se empujaban el resto de los
       campos y el botón de Guardar fuera de la pantalla, y había que buscarlos a ciegas dentro
       del modal. El tope se calcula con los renglones de cada caja —alto = renglones ×
       interlineado + padding + borde— y en celular se ajusta solo, porque va en em y ahí la
       letra del campo es de 16 px en vez de 13. Arrastrar a lo ancho queda deshabilitado: eso
       rompía la rejilla de dos columnas de los formularios. */
    textarea.gp-input{ resize:vertical; max-height:calc(2.5 * (2 * 1.2em + 14px)); }
    textarea.gp-input[rows="3"]{ max-height:calc(2.5 * (3 * 1.2em + 14px)); }
    textarea.gp-input[rows="4"]{ max-height:calc(2.5 * (4 * 1.2em + 14px)); }
    textarea.gp-input[rows="8"]{ max-height:calc(2.5 * (8 * 1.2em + 14px)); }
    /* Excepción: la caja de Notas rápidas del Centro de mando no es un campo de formulario, es
       el contenido del widget y crece para llenarlo. Ponerle tope la dejaría flotando con un
       hueco debajo. */
    textarea.gp-sin-tope{ max-height:none; }
    .gp-input:focus{ outline:1px solid var(--gold); border-color:var(--gold); }
    /* Campo de búsqueda: contorno grueso en el dorado de la marca, igual que el buscador del
       Centro de mando (Angel, 1 oct 2026: "que todos los textboxes de buscar sean como ese").
       Buscar es la acción que más se usa y con un borde de 1 px se perdía contra el fondo. */
    .gp-buscador{ border:2px solid var(--gold) !important; border-radius:10px !important; background:var(--panel) !important; }
    .gp-buscador:focus{ outline:none; box-shadow:0 0 0 3px rgba(245,158,11,.25); }
    /* Barra de avance: una sola, que a la vez muestra y edita. Antes había dos —la de progreso
       y el deslizador— y parecían dos cosas distintas. El relleno se pinta con un degradado
       inline (lo calcula quien la usa) para que cambie de color con el porcentaje. */
    input[type="range"].gp-rango{ -webkit-appearance:none; appearance:none; width:100%; height:10px;
      border-radius:999px; outline:none; cursor:pointer; }
    input[type="range"].gp-rango::-webkit-slider-thumb{ -webkit-appearance:none; appearance:none;
      width:20px; height:20px; border-radius:50%; background:#FFFFFF; border:3px solid currentColor;
      cursor:pointer; box-shadow:0 1px 3px rgba(0,0,0,.3); }
    input[type="range"].gp-rango::-moz-range-thumb{ width:20px; height:20px; border-radius:50%;
      background:#FFFFFF; border:3px solid currentColor; cursor:pointer; }
    input[type="range"].gp-rango:focus-visible{ box-shadow:0 0 0 3px rgba(245,158,11,.3); }
    /* En celular, un input con letra menor a 16px hace que iOS/Android le hagan zoom
       automático al enfocarlo (y a veces no regresa bien al tamaño normal al desenfocar).
       Por eso en pantallas chicas los inputs usan 16px; en escritorio se quedan en 13px. */
    @media (max-width: 767px) {
      .gp-input{ font-size:16px; }
    }
    .gp-btn{ background:var(--gold); color:#161822; font-weight:600; border-radius:4px; }
    .gp-btn:hover{ opacity:.9; }
    .gp-btn-ghost{ background:transparent; border:1px solid var(--border); color:var(--text); border-radius:4px; }
    .gp-btn-ghost:hover{ background:var(--panel-hi); }
    .gp-navitem{ color:var(--muted); border-radius:4px; font-weight:500; }
    .gp-navitem:hover{ background:var(--panel-hi); color:var(--text); }
    /* La sección abierta tiene que gritar cuál es (pedido de Angel, 29 sept 2026): antes solo
       cambiaba a un azul apenas más claro y se perdía entre las demás. Ahora lleva el dorado de
       la marca —fondo teñido, barra gruesa a la izquierda, texto en negritas y el ícono en
       dorado—, sin llenarla de sólido para que el texto siga siendo lo que más se lee. */
    .gp-navitem-active{ background:rgba(245,158,11,.16); color:var(--text); font-weight:600;
      border-left:4px solid var(--gold); box-shadow:inset 0 0 0 1px rgba(245,158,11,.25); }
    .gp-navitem-active svg{ color:var(--gold); }
    .gp-navitem-active:hover{ background:rgba(245,158,11,.22); }
    .gp-navitem-drop{ box-shadow: inset 0 2px 0 var(--gold); }
    /* Los grupos del menú se separan con aire, no con línea (Angel, 1 oct 2026: las líneas arriba
       de Dinero, Patrimonio, Módulos y Personal cargaban de más la columna). Lo que ordena el
       menú es el título de cada sección en negritas; la única línea que queda es la de "Sistema",
       porque ahí sí cambia la naturaleza de lo que viene abajo. */
    .gp-nav-grupo + .gp-nav-grupo{ margin-top:10px; }
    .gp-nav-separador{ border-top:1px solid var(--sidebar-borde); }
    /* Divisor entre la lista y la ficha. Se ve una línea de 3 px de alto completo —lo bastante
       para que se note que ahí hay algo, sin convertirse en una pared— y al pasar el mouse
       engorda y se pone dorada, que es lo que termina de decir "esto se jala". */
    .gp-divisor{ cursor:col-resize; }
    .gp-divisor-linea{ width:3px; border-radius:999px; background:var(--border);
      transition:background .15s ease, width .15s ease; }
    .gp-divisor:hover .gp-divisor-linea{ background:var(--gold); width:5px; }
    .gp-divisor:active .gp-divisor-linea{ background:var(--gold); width:5px; }
    /* Placa del logo: blanca siempre, porque el logotipo está hecho para fondo claro. Sobre el
       menú blanco del tema claro es invisible (blanco sobre blanco) y no estorba. */
    .gp-placa-logo{ background:#FFFFFF; border-radius:12px; padding:6px 9px; }
    /* El título de cada sección también se lee más: es el rótulo que ordena todo el menú. */
    .gp-nav-titulo{ font-weight:600; letter-spacing:.06em; }
    .gp-dot-teal{ background:var(--teal); } .gp-dot-red{ background:var(--red); } .gp-dot-gold{ background:var(--gold); }
    .gp-text-muted{ color:var(--muted); }
    .gp-text-gold{ color:var(--gold); } .gp-text-teal{ color:var(--teal); } .gp-text-red{ color:var(--red); }
    table.gp-table{ border-collapse:collapse; width:100%; font-size:13px; }
    /* Encabezados de TODOS los grids. Centrados, en mayúsculas, con su propio color de fondo
       —uno por tema, ver --grid-head-bg— y una línea dorada abajo. El peso va en NORMAL (400) a
       prueba, 2 oct 2026: con el fondo propio, las mayúsculas y el espaciado entre letras el
       encabezado ya resalta sin negritas. Si se ve flojo, subirlo a 600 es cambiar este número.
       Se quedan PEGADOS arriba al recorrer la lista (position:sticky), que es lo que permite
       mostrar 100 registros sin perder de vista qué columna es cuál. */
    table.gp-table th{ position:sticky; top:0; z-index:2;
      text-align:center; color:var(--grid-head-text); font-weight:400; padding:12px 10px;
      border-bottom:2px solid var(--gold); font-size:13px; letter-spacing:.05em;
      text-transform:uppercase; background:var(--grid-head-bg); white-space:nowrap; }
    table.gp-table th:first-child{ border-top-left-radius:10px; }
    table.gp-table th:last-child{ border-top-right-radius:10px; }
    /* Para que el sticky tenga contra qué pegarse, el contenedor del grid tiene que ser su propia
       caja con scroll: si quien se desplaza es la página, el encabezado se va con ella. Se aplica
       a cualquier div con una tabla directamente adentro, sin tocar las veinte pantallas que las
       dibujan. En navegadores sin :has() simplemente no se pega, que es como estaba antes. */
    div:has(> table.gp-table){ max-height:72vh; overflow:auto; }
    /* Sin barra de desplazamiento a la vista en los grids (pedido de Angel, 5 oct 2026). La barra
       sigue EXISTIENDO —se recorre igual con rueda, trackpad, dedo, teclado y arrastrando— solo
       deja de dibujarse: scrollbar-width para Firefox, ::-webkit-scrollbar para Safari y Chrome.
       Se aplica SOLO al contenedor del grid, nunca al documento: la barra de la página se queda.
       Lo que se pierde es el aviso visual de que hay más columnas a la derecha. */
    div:has(> table.gp-table){ scrollbar-width:none; -ms-overflow-style:none; }
    div:has(> table.gp-table)::-webkit-scrollbar{ width:0; height:0; }
    table.gp-table td{ padding:8px 10px; border-bottom:1px solid var(--border); vertical-align:top; }
    table.gp-table tr:hover td{ background:var(--panel-hi); }
    /* Tareas (pedido de Angel, 29 sept 2026): nada de tinte al pasar el mouse — solo la manita,
       porque el clic ya hace algo (abre la ficha de la derecha) y el tinte se peleaba con el
       verde de las filas completadas. Lo que sí se tiñe es la fila seleccionada. */
    table.gp-table.gp-tabla-tareas tbody tr{ cursor:pointer; }
    table.gp-table.gp-tabla-tareas tbody tr:hover td{ background:transparent; }
    table.gp-table.gp-tabla-tareas tbody tr.gp-fila-hecha:hover td{ background:var(--hecho-bg); }
    table.gp-table.gp-tabla-tareas tbody tr.gp-fila-sel td{ background:var(--panel-hi); }
    table.gp-table.gp-tabla-tareas tbody tr.gp-fila-sel.gp-fila-hecha td{ background:var(--hecho-bg-hi); }
    /* Tarea completada: la fila entera se tiñe de verde y lleva una barra a la izquierda, para
       distinguirla de las pendientes de un vistazo en los dos temas. Va DESPUÉS de la regla de
       :hover para que también se note al pasar el mouse encima. */
    /* Solo el fondo: si además se tiñera todo el texto de la fila, lo ya hecho gritaría más que
       lo pendiente y se invertiría la jerarquía. El verde va en la descripción (.gp-texto-hecho),
       que es lo que identifica la tarea. */
    table.gp-table tr.gp-fila-hecha td{ background:var(--hecho-bg); }
    table.gp-table tr.gp-fila-hecha:hover td{ background:var(--hecho-bg-hi); }
    table.gp-table tr.gp-fila-hecha td:first-child{ box-shadow: inset 4px 0 0 var(--hecho-borde); }
    /* La descripción de una tarea hecha NO debe ir en gris apagado: sobre el verde se ve sucia.
       Este es su color, y sirve igual dentro y fuera de una tabla (la ficha del proyecto no usa
       tabla y necesita el mismo tratamiento). */
    .gp-texto-hecho{ color:var(--hecho-texto); }
    /* El tinte verde aclara la fila y dejaría el texto secundario (proyecto, cliente,
       responsable) por debajo del contraste mínimo. En vez de bajarle al verde, se le sube a ese
       texto: así la fila se nota más Y se sigue leyendo. Medido en los dos temas. */
    table.gp-table tr.gp-fila-hecha .gp-text-muted{ color:var(--hecho-muted); }
    .gp-badge{ display:inline-block; padding:2px 8px; border-radius:3px; font-size:11px; font-weight:500; }
    .gp-scroll::-webkit-scrollbar{ width:6px; height:6px; }
    .gp-scroll::-webkit-scrollbar-thumb{ background:var(--border); border-radius:3px; }
    /* El logo y el menú lateral (además de login, que usa esta misma clase) SIEMPRE
       usan este azul oscuro fijo, sin importar qué tema esté activo en el resto de la app —
       incluidos los 5 temas claros nuevos. Esto es justo lo que evita que el logo pierda
       contraste otra vez, sin tener que renunciar a tener temas claros. */
    /* --muted más claro que el resto de la app (22 sept 2026, pedido de Angel: "letra de color
       más fuerte") -- el menú lateral necesita más contraste que un texto secundario normal
       porque ES la navegación principal, no un dato de apoyo. */
    .gp-sidebar-area{ --bg:#0B2341; --panel:#12304F; --panel-hi:#1A3D63; --border:#234A70; --text:#EAF1FA; --muted:#C3D6EE; --muted-bloque:#C3D6EE; }
    /* Fondo "blanco hueso" para paneles puntuales (chat del Asistente, calendario de Agenda)
       que deben verse claros aunque el resto de la app esté en un tema oscuro. Redefine las
       variables de color solo dentro de este panel, así todo lo de adentro (texto, badges,
       bloques) se ajusta automáticamente sin tocar el resto de la app. */
    .gp-hueso{ --panel:#F7F3EA; --panel-2:#E9E1CC; --border:#DDD3BA; --text:#3A2F22; --muted:#8A7E68; --muted-bloque:#8A7E68;
      background:var(--panel); color:var(--text); }
  `}</style>
);

// ARKEYONE solo tiene dos temas: Oscuro y Claro (sin color personalizado ni temas adicionales
// — decisión de producto de Angel, 21 sept 2026). Los ids internos se quedan como estaban
// ("actual" = Oscuro, "azul-claro" = Claro) para no requerir ninguna migración de datos en
// Supabase; normalizarTema() absorbe cualquier valor viejo guardado (de cuando existían 11
// temas + color personalizado) y lo resuelve a uno de estos dos, sin dejar a nadie en un
// estado roto.
const TEMAS_VALIDOS = ["actual", "azul-claro"];
const TEMAS_CLAROS_LEGADO = ["azul-claro", "gris-claro", "verde-claro", "rojo-claro", "naranja-claro", "claro"];
const normalizarTema = (valor) => (TEMAS_CLAROS_LEGADO.includes(valor) ? "azul-claro" : "actual");
function useTema() {
  const [tema, setTemaState] = useState(() => {
    try { return normalizarTema(localStorage.getItem("arkeyone_tema")); } catch { return "actual"; }
  });
  const setTema = (nuevo) => {
    if (!TEMAS_VALIDOS.includes(nuevo)) return;
    setTemaState(nuevo);
    try { localStorage.setItem("arkeyone_tema", nuevo); } catch {}
  };
  const toggleTema = () => {}; // ya no aplica con varios temas — se deja por compatibilidad de firma
  return [tema, toggleTema, setTema];
}
// "actual" es el tema base (mismos valores que .gp-root, sin clase extra); "azul-claro" agrega
// su propia clase .tema-azul-claro que sobreescribe las variables de color.
const claseTema = (tema) => (tema && tema !== "actual" ? `tema-${tema}` : "");


/* ---------- datos base ---------- */
/* ---------- Orden de los catálogos ----------
   Regla transversal (pedido de Angel, 28 sept 2026): los combos se ordenan alfabéticamente, para
   no tener que recordar en qué renglón quedó cada opción. Se aplica aquí, en la definición del
   catálogo, y no en cada <select>: así vale para todos los lugares donde se use la lista.

   "Otro"/"Otros" queda SIEMPRE al final aunque alfabéticamente caiga en medio — es el cajón de
   sastre, no una opción más, y siempre se busca al último.

   NO se ordenan alfabéticamente las listas que ya tienen un orden propio con significado, porque
   alfabetizarlas las rompería: los estatus (que son un pipeline: Idea -> Validación -> ... ->
   Archivado), las prioridades (Alta/Media/Baja), las frecuencias y todo lo cronológico (horas,
   duraciones, rangos de reporte, tipos de comida). Ahí el orden ES la información. */
// `get` permite ordenar una lista de objetos por el texto que de verdad se ve en pantalla (la
// Etiqueta corta SOLO para dibujar (chips de filtro, badges): el valor guardado en Supabase sigue
// siendo el de ESTATUS_PROYECTO. No son estados nuevos — es el mismo estado escrito más corto para
// que la fila de filtros no se convierta en una barra gigantesca (secc. 7 del rediseño).
// Contexto de vida del proyecto (secc. 12 del rediseño, 24 sept 2026). NO es un módulo por
// Los mismos tres contextos, con la cara que se les pone en el onboarding y en Configuración.
// Se reutilizan los colores de arriba a propósito: el chip "Empresarial" de un proyecto y la
// tarjeta "Empresarial" del onboarding tienen que ser el mismo verde, o parecen cosas distintas.
const CONTEXTOS_USO = [
  {
    id: "Personal", icono: Heart,
    descripcion: "Organiza tu vida personal: hábitos, salud, agenda, finanzas y proyectos.",
  },
  {
    id: "Profesional", icono: Briefcase,
    descripcion: "Organiza tu actividad profesional: clientes, proyectos, tareas, agenda y relaciones.",
  },
  {
    id: "Empresarial", icono: Building2,
    descripcion: "Administra una o varias empresas: proyectos, finanzas, clientes, equipo y operación.",
  },
];
// Qué widgets del Centro de Mando se encienden para cada contexto. Esto NO quita módulos del
// sistema (secc. 10 del documento): el menú lateral sigue completo y el usuario puede prender
// cualquier widget después desde "Personalizar panel". Solo define con qué arranca.
const WIDGETS_POR_CONTEXTO = {
  Personal: ["miDia", "requiereAtencion", "calendario", "progreso", "proyectos", "tareas", "finanzas", "resumenFinanciero", "habitos", "salud", "notasRapidas", "accesosRapidos", "arki"],
  Profesional: ["miDia", "requiereAtencion", "calendario", "progreso", "proyectos", "tareas", "finanzas", "resumenFinanciero", "notasRapidas", "accesosRapidos", "arki"],
  Empresarial: ["miDia", "requiereAtencion", "calendario", "progreso", "empresas", "proyectos", "tareas", "finanzas", "resumenFinanciero", "notasRapidas", "accesosRapidos", "arki"],
};
// Traduce los contextos elegidos al formato que ya usa preferencias.dashboard_widgets (el mismo
// que escribe "Personalizar panel"), en vez de inventar una segunda forma de guardar lo mismo.
const widgetsParaContextos = (contextos) => {
  if (!contextos || contextos.length === 0) return null;
  const encendidos = new Set(contextos.flatMap((c) => WIDGETS_POR_CONTEXTO[c] || []));
  return DASHBOARD_WIDGETS_CATALOGO.map((w) => ({ id: w.id, visible: encendidos.has(w.id) }));
};
const tareaAbierta = (estatus) => !ESTATUS_TAREA_CERRADOS.includes(estatus);

/* ---------- Divisas ----------
   MONEDA_BASE, MONEDAS, montoBaseDe y fmtMonedaOriginal viven en src/lib/formato.js, con la nota
   de por qué el monto base se congela al capturar. Aquí se queda solo lo que necesita red. */



// Títulos de trato más comunes. Es una sugerencia, no una lista cerrada: el campo deja escribir
// cualquier otro. Sirve para dirigirse a la persona ("Estimado Arq. Quintana"), NO para filtrar
// —para eso están las etiquetas, que sí admiten varias por contacto.

// Los títulos funcionan igual: la lista fija es solo el arranque, y todo título que se escriba
// una vez queda sugerido para los siguientes contactos. Así no hay que pedirle a nadie que
// agregue "Mtro. en Arquitectura" a una lista del código para poder usarlo.
// Renombra o quita un valor de catálogo en todos los registros que lo usan. `esLista` distingue




// Categorías de notificación configurables por el usuario (Configuración > Notificaciones).
const CATEGORIA_POR_TIPO_NOTIF = {
  medicamento: "Salud", cita: "Agenda", deuda: "Finanzas", cobro_pendiente: "Finanzas",
  pago_recurrente: "Finanzas", pendiente: "Recordatorios", documento: "Documentos",
  activo_digital: "Activos digitales", apartado: "Finanzas", revision_proyecto: "Proyectos",
  cumpleanos: "Recordatorios", regalo: "Recordatorios", evento: "Agenda", factura: "Finanzas",
  campana: "Proyectos", asignacion: "Colaboradores",
};

const seed = () => ({
  proyectos: [
    { id: "p1", nombre: "Fundación María Roberta Blas Martínez", categoria: "Fundación", estatus: "Activo", monetizacion: "No genera dinero", descripcion: "Iniciativa de apoyo social/comunitario.", github: "", githubSubido: false, notas: [] },
    { id: "p2", nombre: "ARKeyData", categoria: "Software", estatus: "En desarrollo", monetizacion: "Dinero", descripcion: "Plataforma de control y automatización de software.", github: "", githubSubido: false, notas: [] },
    { id: "p3", nombre: "Armoniq", categoria: "Música", estatus: "En desarrollo", monetizacion: "Dinero", descripcion: "Canciones personalizadas generadas con IA (Suno).", github: "", githubSubido: false, notas: [] },
    { id: "p4", nombre: "Angel Rey (proyecto musical)", categoria: "Música", estatus: "Activo", monetizacion: "Dinero", descripcion: "Proyecto musical personal, artista de música regional mexicana.", github: "", githubSubido: false, notas: [] },
    { id: "p5", nombre: "Escápate YA", categoria: "Renta", estatus: "Activo", monetizacion: "Dinero", descripcion: "Renta a corto plazo de departamento en Acapulco.", github: "", githubSubido: false, notas: [] },
    { id: "p6", nombre: "AI Marketing Agency", categoria: "Marketing", estatus: "En desarrollo", monetizacion: "Dinero", descripcion: "Agencia de servicios de marketing con IA.", github: "", githubSubido: false, notas: [] },
    { id: "p7", nombre: "ChatBot creation service", categoria: "Chatbots", estatus: "En desarrollo", monetizacion: "Dinero", descripcion: "Servicio de desarrollo de chatbots.", github: "", githubSubido: false, notas: [] },
  ],
  pendientes: [],
  equipo: [],
  finanzas: [],
  actividades: [],
  activos: [],
  metas: [],
  contactos: [],
  redesMetricas: [],
  documentos: [],
  habitos: [],
  salud: [],
  perfilSalud: {},
  contactoProyectos: [],
});

// ARKEYONE solo pide Día y Mes de cumpleaños (no la fecha de nacimiento completa) — mucha gente no

// Catálogo de widgets configurables del Centro de mando — rediseño 21 sept 2026 (brief de
// Angel): 9 bloques agrupados en vez de los 17 granulares que había antes (orden aquí = orden
// por default). El header, el saludo y las tarjetas de resumen quedan fijos — no son "contenido"
// que tenga sentido ocultar, y las tarjetas de resumen son las que abren este modal.
const DASHBOARD_WIDGETS_CATALOGO = [
  { id: "miDia", label: "Mi día" },
  { id: "requiereAtencion", label: "Requiere tu atención" },
  { id: "calendario", label: "Calendario" },
  { id: "progreso", label: "Tu progreso" },
  { id: "empresas", label: "Mis empresas" },
  { id: "proyectos", label: "Proyectos" },
  { id: "tareas", label: "Tareas" },
  { id: "finanzas", label: "Finanzas" },
  { id: "resumenFinanciero", label: "Resumen financiero" },
  { id: "habitos", label: "Hábitos" },
  { id: "salud", label: "Salud" },
  { id: "notasRapidas", label: "Notas rápidas" },
  { id: "accesosRapidos", label: "Acciones rápidas" },
  { id: "arki", label: "ARKI" },
];
// Reconcilia el orden guardado del usuario (preferencias.dashboard_widgets) con el catálogo
// actual: widgets guardados van en su orden; widgets del catálogo que aún no existían cuando
// el usuario guardó (o que nunca ha personalizado) se agregan al final, visibles por default.
// Filtra los datos del Centro de Mando al contexto activo ("todos" | "ctx:<Contexto>" |
// "emp:<id>"). Es una VISTA: no oculta módulos ni borra nada, y el dato sigue existiendo una sola
// vez en su módulo.
//
// Solo se filtra lo que de verdad lleva contexto: Proyectos (tiene la columna) y Tareas (heredan
// el de su proyecto). Finanzas todavía NO distingue contexto por sí misma — un movimiento sin
// proyecto no sabe a qué ámbito pertenece — así que el dinero se muestra completo y el widget lo
// dice, en vez de enseñar un número recortado que parecería el total.
function filtrarDatosPorContexto(data, activo) {
  if (!data || !activo || activo === "todos") return data;
  const esEmpresa = activo.startsWith("emp:");
  const valor = activo.slice(4);
  const proyectos = (data.proyectos || []).filter((p) => (esEmpresa ? p.empresaId === valor : (p.contexto || "") === valor));
  const idsProyectos = new Set(proyectos.map((p) => p.id));
  // Una tarea suelta (sin proyecto) no tiene contexto propio, y se cuenta como Personal: en un
  // "sistema operativo personal" lo que anotas suelto es de tu vida, no de una empresa. Sin esta
  // regla, filtrar por Personal dejaría la pantalla casi vacía y parecería que algo se rompió.
  const sueltasSonDeEsteContexto = !esEmpresa && valor === "Personal";
  return {
    ...data,
    proyectos,
    pendientes: (data.pendientes || []).filter((t) => (t.proyectoId ? idsProyectos.has(t.proyectoId) : sueltasSonDeEsteContexto)),
  };
}

// Qué widgets tienen sentido en cada contexto. Hábitos y Salud son de la vida personal; Mis
// empresas solo existe si administras alguna. El resto aplica siempre.
const CONTEXTO_DE_WIDGET = { habitos: ["Personal"], salud: ["Personal"], empresas: ["Empresarial"] };

const resolverOrdenWidgets = (guardado) => {
  const porId = Object.fromEntries(DASHBOARD_WIDGETS_CATALOGO.map((w) => [w.id, w]));
  const enOrden = (guardado || []).filter((g) => porId[g.id]).map((g) => ({ ...porId[g.id], visible: g.visible !== false }));
  const idsGuardados = new Set(enOrden.map((w) => w.id));
  const faltantes = DASHBOARD_WIDGETS_CATALOGO.filter((w) => !idsGuardados.has(w.id)).map((w) => ({ ...w, visible: true }));
  return [...enOrden, ...faltantes];
};






// Deudas ya NO es una tabla propia (Documento Maestro v1.2, secc. 23.11/40): es una vista
// calculada sobre Finanzas (egresos no recurrentes con saldo pendiente). Esta función se usa
// en cualquier lugar que antes leía `data.deudas`.
const deudasDeFinanzas = (finanzas) => (finanzas || []).filter((f) => f.tipo === "Egreso" && !f.esRecurrente && (f.estatus === "Pendiente" || f.estatus === "Parcial"));




// Exporta toda la información visible del usuario a un archivo Excel, un módulo por hoja.
// Respeta lo que cada quien puede ver: si eres colaborador con acceso limitado, `data` ya
// viene filtrado por la base de datos, así que el archivo solo trae lo que sí te toca ver.
//
// Se queda en este archivo (y no en src/lib/exportar.js, donde está el resto de la maquinaria de
// exportar) porque depende de TABLES y ETIQUETA_TABLA, que son el modelo de datos: llevárselas
// allá habría creado un import circular. Lo que sí usa de allá es cargarXLSX.
async function exportarExcel(data, nombreCuenta) {
  // Igual que en exportarFilasExcel: se revisa que haya algo que exportar antes de bajar `xlsx`.
  if (!TABLES.some((key) => (data[key] || []).length > 0)) {
    alert("Todavía no tienes datos para exportar.");
    return;
  }
  const XLSX = await cargarXLSX();
  const wb = XLSX.utils.book_new();
  const camposInternos = ["id", "userId", "deletedAt"];

  for (const key of TABLES) {
    const filas = data[key] || [];
    if (filas.length === 0) continue;
    const limpias = filas.map((item) => {
      const out = {};
      for (const [k, v] of Object.entries(item)) {
        if (camposInternos.includes(k)) continue;
        out[k] = typeof v === "object" && v !== null ? JSON.stringify(v) : v;
      }
      return out;
    });
    const hoja = XLSX.utils.json_to_sheet(limpias);
    const nombreHoja = (ETIQUETA_TABLA[key] || key).slice(0, 31);
    XLSX.utils.book_append_sheet(wb, hoja, nombreHoja);
  }

  if (wb.SheetNames.length === 0) {
    alert("Todavía no tienes datos para exportar.");
    return;
  }
  const fecha = todayISO();
  XLSX.writeFile(wb, `arkeyone_${nombreCuenta || "mis-datos"}_${fecha}.xlsx`);
}




function jsToRow(obj) {
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    if (k === "createdAt") continue; // el servidor lo controla (default now()), nunca se reescribe desde el cliente
    // "" no es un valor válido para columnas numéricas/fecha en Postgres — se manda null en su lugar.
    out[camelToSnake(k)] = v === "" ? null : v;
  }
  return out;
}
// la tabla "salud" guarda el PDF adjunto como dos columnas planas en vez de un objeto anidado
function saludToRow(s) {
  const { estudio, ...rest } = s;
  const row = jsToRow(rest);
  row.estudio_nombre = estudio?.nombre || null;
  row.estudio_url = estudio?.url || null;
  return row;
}
const toRow = (key, obj) => (key === "salud" ? saludToRow(obj) : jsToRow(obj));
// Distingue un error de red real (sin respuesta del servidor: sí aplica "revisa tu conexión") de un
// error que el servidor sí respondió pero rechazó (dato inválido, columna que no existe, etc. — ahí
// decir "revisa tu conexión" es engañoso y no ayuda a nadie a resolverlo).
function mensajeErrorGuardado(error) {
  const esErrorDeRed = !error?.code && /fetch|network/i.test(error?.message || "");
  return esErrorDeRed
    ? "No se pudo guardar. Revisa tu conexión a internet."
    : "No se pudo guardar. Hubo un problema con los datos — si se repite, cuéntame qué campos llenaste.";
}
// --- Cola de pendientes offline ---------------------------------------------
// Sin internet la app queda de solo lectura: en vez de intentar escribir en Supabase
// (fallaría), cada intento de guardar/editar/borrar se guarda aquí, en el propio
// navegador, marcado como "pendiente de subir", hasta que vuelva la conexión y el
// usuario decida qué hacer (ver AvisoPendientesOffline).

// TTS simple y sin estado, para avisos puntuales fuera del panel del Asistente (que trae su
// propia máquina de estados de escucha/habla). Solo habla; no toca el micrófono.
function hablarSimple(texto, onFin) {
  try {
    if (!("speechSynthesis" in window)) { onFin?.(); return; }
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(texto);
    const voces = window.speechSynthesis.getVoices();
    const candidatasEs = voces.filter((v) => v.lang?.toLowerCase().startsWith("es"));
    const vozEs = candidatasEs.find((v) => v.lang?.toLowerCase() === "es-mx") || candidatasEs[0];
    if (vozEs) { u.voice = vozEs; u.lang = vozEs.lang; } else { u.lang = "es-MX"; }
    if (onFin) u.onend = onFin;
    window.speechSynthesis.speak(u);
  } catch { onFin?.(); }
}


async function fetchTable(key, ownerId) {
  const { data, error } = await supabase.from(tableName(key)).select("*").eq("user_id", ownerId).is("deleted_at", null).order("created_at", { ascending: true });
  if (error) { console.error(`Error al leer ${tableName(key)}:`, error); return []; }
  return data.map((row) => fromRow(key, row));
}

async function loadAllTables(ownerId) {
  const entries = await Promise.all(TABLES.map(async (key) => [key, await fetchTable(key, ownerId)]));
  const result = Object.fromEntries(entries);
  const { data: perfilRows } = await supabase.from("perfil_salud").select("*").eq("user_id", ownerId);
  result.perfilSalud = Object.fromEntries((perfilRows || []).map((r) => [r.contacto_id || "yo", { alturaCm: r.altura_cm ?? "", metasSalud: r.metas_salud || {} }]));
  // Vínculos Contacto–Proyecto (muchos-a-muchos, tabla puente contacto_proyectos — no es una
  // entidad con papelera propia, por eso no vive en TABLES, igual que colaborador_dependientes).
  const { data: vinculosRows } = await supabase.from("contacto_proyectos").select("*").eq("user_id", ownerId);
  result.contactoProyectos = (vinculosRows || []).map(rowToJs);
  return result;
}







// Monto en cualquier moneda, con su tipo de cambio del día. Lo usa el formulario de Finanzas y
// el de movimientos del proyecto, para que capturar en dólares se haga igual en los dos lados.
//
// El tipo de cambio se pide a la API con la FECHA del movimiento, no con la de hoy: así un gasto
// capturado hoy pero fechado el mes pasado se congela al tipo que había ese día. Y siempre queda
// editable, porque el tipo que te cobró el banco casi nunca es el oficial.
// Muestra el importe de un movimiento. Siempre en pesos, porque es la moneda con la que se





/* ---------- Paneles redimensionables ----------
   Las pantallas de lista + ficha (Contactos, Proyectos, Tareas, Atenciones) tenían el ancho de
   la ficha clavado en el código. Con tablas de muchas columnas eso dejaba la lista apretada, y
   en pantallas grandes desperdiciaba espacio. Ahora hay un divisor que se arrastra y el ancho
   se recuerda por pantalla, porque no es el mismo el que conviene en Contactos que en Tareas.

   Solo aplica en escritorio: en celular los dos bloques van apilados y no hay nada que repartir. */





/* ---------- login ---------- */
// Evalúa la fortaleza de una contraseña (0 a 4) y qué requisitos le faltan.
function evaluarPassword(pw) {
  const criterios = {
    largo: pw.length >= 8,
    mayuscula: /[A-Z]/.test(pw),
    minuscula: /[a-z]/.test(pw),
    numero: /[0-9]/.test(pw),
    especial: /[^A-Za-z0-9]/.test(pw),
  };
  const cumplidos = Object.values(criterios).filter(Boolean).length;
  const cumpleMinimo = criterios.largo && criterios.mayuscula && criterios.minuscula && criterios.numero;
  return { criterios, cumplidos, cumpleMinimo };
}

function MedidorPassword({ password }) {
  const { criterios, cumplidos } = evaluarPassword(password);
  if (!password) return null;
  const nivel = cumplidos <= 2 ? "Débil" : cumplidos <= 4 ? "Media" : "Fuerte";
  const color = cumplidos <= 2 ? "#EF4444" : cumplidos <= 4 ? "#D97706" : "#16A34A";
  return (
    <div className="mb-3.5">
      <div className="flex gap-1 mb-1">
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="h-1 rounded flex-1" style={{ background: i < cumplidos ? color : "#E1E8F7" }} />
        ))}
      </div>
      <p className="text-xs font-semibold" style={{ color }}>{nivel}</p>
      <p className="text-xs text-[#6B7280] mt-1">
        Mínimo 8 caracteres, con mayúscula, minúscula y número
        {criterios.especial ? " (y un carácter especial — bien)" : ""}.
      </p>
    </div>
  );
}

const AVISO_PRIVACIDAD = `
**Última actualización:** ${todayISO()}

**Responsable:** ArkeyOne (operado por ARKeyData) es responsable del tratamiento de tus datos personales conforme a la Ley Federal de Protección de Datos Personales en Posesión de los Particulares (México).

**Contacto:** privacidad@arkeyone.com

**1. Datos que recabamos**
Recabamos los datos que tú mismo capturas al usar el sistema: información de proyectos, finanzas, contactos, salud, y demás módulos que decidas utilizar. También recabamos tu correo electrónico y contraseña (encriptada) para tu cuenta, y datos técnicos básicos (fecha de registro, último acceso).

**2. Para qué usamos tus datos**
- Darte acceso a tu cuenta y a la información que tú mismo capturaste.
- Enviarte correos operativos (confirmación de cuenta, recuperación de contraseña, alertas que actives).
- Mejorar el funcionamiento del sistema.
No vendemos ni compartimos tu información con terceros para fines de publicidad.

**3. Aislamiento y confidencialidad**
Tu información está técnicamente aislada de la de cualquier otro usuario mediante reglas de seguridad a nivel de base de datos (Row Level Security). Ni otros usuarios, ni — salvo causa justificada de soporte técnico, con tu conocimiento — el equipo de ArkeyOne, acceden de forma rutinaria a tu información de negocio (finanzas, contactos, salud, etc.).

**4. Terceros que nos ayudan a operar**
Usamos los siguientes proveedores para operar el servicio, cada uno con sus propias políticas de privacidad:
- **Supabase** (base de datos y autenticación)
- **Resend** (envío de correos)
- **Netlify** (hospedaje del sitio)

**5. Tus derechos (ARCO)**
Tienes derecho a Acceder, Rectificar, Cancelar y Oponerte al tratamiento de tus datos personales. Puedes exportar toda tu información en cualquier momento desde el botón "Exportar mis datos" dentro del sistema, o solicitar la eliminación completa de tu cuenta escribiendo a privacidad@arkeyone.com.

**6. Menores de edad**
Este servicio no está dirigido a menores de 18 años.

**7. Cambios a este aviso**
Podemos actualizar este aviso de privacidad. Te notificaremos cambios importantes por correo o dentro del sistema.
`.trim();

const TERMINOS_CONDICIONES = `
**Última actualización:** ${todayISO()}

**1. Aceptación**
Al crear una cuenta en ArkeyOne, aceptas estos Términos y Condiciones y el Aviso de Privacidad.

**2. Qué es ArkeyOne**
ArkeyOne es un sistema de gestión personal y de negocio (proyectos, finanzas, contactos, salud, y más) que organiza tu información en un solo lugar.

**3. Tu cuenta**
Eres responsable de la confidencialidad de tu contraseña y de toda actividad realizada desde tu cuenta. Debes proporcionar información veraz al registrarte.

**4. Uso permitido**
No debes usar ArkeyOne para actividades ilegales, para almacenar contenido que viole derechos de terceros, ni para intentar vulnerar la seguridad del sistema.

**5. Tu información**
La información que capturas es tuya. Puedes exportarla en cualquier momento (botón "Exportar mis datos") y solicitar la eliminación de tu cuenta cuando quieras.

**6. Colaboradores**
Si invitas a otras personas a tu cuenta con permisos específicos, eres responsable de las acciones que realicen dentro de los módulos a los que les diste acceso.

**7. Disponibilidad del servicio**
Hacemos nuestro mejor esfuerzo por mantener el servicio disponible, pero no garantizamos disponibilidad ininterrumpida. No somos responsables por pérdidas derivadas de interrupciones del servicio ajenas a nuestro control (fallas de terceros, caso fortuito, fuerza mayor).

**8. Planes y pagos**
Actualmente ArkeyOne se ofrece de forma gratuita durante su etapa de prueba. Si en el futuro se introducen planes de pago, se te notificará con anticipación y podrás decidir si continuar.

**9. Cancelación**
Puedes cancelar tu cuenta en cualquier momento. Nos reservamos el derecho de suspender cuentas que violen estos términos.

**10. Limitación de responsabilidad**
ArkeyOne se ofrece "tal cual". No somos responsables por decisiones de negocio, financieras o de salud que tomes con base en la información capturada en el sistema — el sistema es una herramienta de organización, no un sustituto de asesoría profesional (contable, legal, médica o financiera).

**11. Ley aplicable**
Estos términos se rigen por las leyes de los Estados Unidos Mexicanos.

**12. Contacto**
Dudas o solicitudes: contacto@arkeyone.com
`.trim();

// Convierte el texto en negritas **así** a <strong>, y separa párrafos — sin dependencias externas.
function renderLegalText(texto) {
  return texto.split("\n\n").map((parrafo, i) => {
    const partes = parrafo.split(/(\*\*[^*]+\*\*)/g);
    return (
      <p key={i} className="text-sm mb-4 leading-relaxed">
        {partes.map((parte, j) =>
          parte.startsWith("**") && parte.endsWith("**")
            ? <strong key={j}>{parte.slice(2, -2)}</strong>
            : parte
        )}
      </p>
    );
  });
}

function DocumentoLegal({ titulo, texto, onVolver, tema }) {
  return (
    <div className={`gp-root ${claseTema(tema)}`} style={{ minHeight: "100vh" }}>
      <Tokens tema={tema} />
      <div className="max-w-2xl mx-auto p-6">
        <button onClick={onVolver} className="text-xs gp-text-gold mb-4">← Regresar</button>
        <h1 className="gp-serif text-2xl mb-6">{titulo}</h1>
        {renderLegalText(texto)}
      </div>
    </div>
  );
}


// Crear cuenta y recuperar contraseña vivían como "modos" dentro del Login viejo.
// Se extraen aquí, sin cambiar su lógica/copys, para que el nuevo LoginScreen
// (src/components/auth/) los abra vía onCreateAccount/onForgotPassword.
function CrearCuentaScreen({ onVolver }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [aviso, setAviso] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return; // evita doble envío (doble clic / Enter) que dispara rate limit del backend
    setError("");
    setAviso("");
    setLoading(true);

    const { cumpleMinimo } = evaluarPassword(password);
    if (!cumpleMinimo) {
      setLoading(false);
      setError("La contraseña necesita mínimo 8 caracteres, con mayúscula, minúscula y número.");
      return;
    }
    if (password !== confirmPassword) {
      setLoading(false);
      setError("Las contraseñas no coinciden.");
      return;
    }
    const { data, error } = await supabase.auth.signUp({ email, password });
    setLoading(false);
    if (error) {
      if (error.status === 429 || error.code === "over_email_send_rate_limit" || error.code === "over_request_rate_limit") {
        setError("Ya se envió un correo de confirmación hace unos segundos. Espera un momento antes de volver a intentar (revisa también spam).");
      } else {
        setError(error.message === "User already registered" ? "Ese correo ya tiene una cuenta." : "No se pudo crear la cuenta.");
      }
      return;
    }
    if (data.session) return; // quedó logueado directo (confirmación de correo desactivada)
    if (data.user && data.user.identities && data.user.identities.length === 0) {
      // Supabase no manda error explícito para no revelar qué correos existen — esta es la señal real.
      setError("Ese correo ya tiene una cuenta. Intenta iniciar sesión.");
      return;
    }
    setAviso("Cuenta creada. Revisa tu correo para confirmarla antes de entrar.");
    setEmail("");
    setPassword("");
    setConfirmPassword("");
  };

  return (
    <AuthCard>
      <h1 className="text-[22px] font-bold text-[#0A2D6B] text-center mb-1">Crea tu cuenta</h1>
      <p className="text-[13.5px] text-[#6B7280] text-center mb-6">Empieza a ordenar tu mundo.</p>

      {error && <AuthBanner type="error">{error}</AuthBanner>}
      {aviso && <AuthBanner type="success">{aviso}</AuthBanner>}

      <form onSubmit={handleSubmit}>
        <AuthField
          icon={<Mail size={18} className="text-[#8CA0C6] shrink-0" />}
          label="Correo electrónico"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
        />
        <AuthPasswordField
          label="Contraseña"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="new-password"
        />
        <MedidorPassword password={password} />
        <AuthPasswordField
          label="Confirmar contraseña"
          required
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          autoComplete="new-password"
        />
        <AuthButton type="submit" disabled={loading}>
          {loading ? <span className="w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin" /> : "Crear cuenta"}
        </AuthButton>
      </form>
      <AuthBackLink onClick={onVolver}>← Regresar a iniciar sesión</AuthBackLink>
    </AuthCard>
  );
}

function RecuperarPasswordScreen({ onVolver }) {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [aviso, setAviso] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;
    setError("");
    setAviso("");
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin });
    setLoading(false);
    if (error) { setError("No se pudo enviar el correo. Intenta de nuevo."); return; }
    setAviso("Si ese correo tiene una cuenta, te acabamos de mandar un enlace para restablecer tu contraseña. Revisa tu bandeja (y spam).");
  };

  return (
    <AuthCard>
      <h1 className="text-[22px] font-bold text-[#0A2D6B] text-center mb-1">¿Olvidaste tu contraseña?</h1>
      <p className="text-[13.5px] text-[#6B7280] text-center mb-6">Te enviaremos un enlace para poner una contraseña nueva.</p>

      {error && <AuthBanner type="error">{error}</AuthBanner>}
      {aviso && <AuthBanner type="success">{aviso}</AuthBanner>}

      <form onSubmit={handleSubmit}>
        <AuthField
          icon={<Mail size={18} className="text-[#8CA0C6] shrink-0" />}
          label="Correo electrónico"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
        />
        <AuthButton type="submit" disabled={loading}>
          {loading ? <span className="w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin" /> : "Enviar enlace de recuperación"}
        </AuthButton>
      </form>
      <AuthBackLink onClick={onVolver}>← Regresar a iniciar sesión</AuthBackLink>
    </AuthCard>
  );
}

function NuevaPasswordScreen({ onListo }) {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [listo, setListo] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    const { cumpleMinimo } = evaluarPassword(password);
    if (!cumpleMinimo) { setError("La contraseña necesita mínimo 8 caracteres, con mayúscula, minúscula y número."); return; }
    if (password !== confirmPassword) { setError("Las contraseñas no coinciden."); return; }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    if (!error) {
      // Por seguridad: al cambiar la contraseña, cierra la sesión en cualquier otro dispositivo/navegador
      // donde hayas quedado conectado (solo deja activa la sesión desde la que acabas de cambiarla).
      await supabase.auth.signOut({ scope: "others" });
    }
    setLoading(false);
    if (error) { setError("No se pudo actualizar la contraseña. Intenta de nuevo."); return; }
    setListo(true);
  };

  return (
    <AuthCard>
      {listo ? (
        <>
          <h1 className="text-[22px] font-bold text-[#0A2D6B] text-center mb-1">¡Listo!</h1>
          <p className="text-[13.5px] text-[#6B7280] text-center mb-6">
            Tu contraseña ya se actualizó. Ya puedes seguir usando tu cuenta con la nueva.
          </p>
          <AuthButton onClick={onListo}>Continuar</AuthButton>
        </>
      ) : (
        <>
          <h1 className="text-[22px] font-bold text-[#0A2D6B] text-center mb-1">Pon tu contraseña nueva</h1>
          <p className="text-[13.5px] text-[#6B7280] text-center mb-6">Elige una contraseña que no hayas usado antes.</p>
          {error && <AuthBanner type="error">{error}</AuthBanner>}
          <form onSubmit={handleSubmit}>
            <AuthPasswordField
              label="Contraseña nueva"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
            />
            <MedidorPassword password={password} />
            <AuthPasswordField
              label="Confirmar contraseña"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              autoComplete="new-password"
            />
            <AuthButton type="submit" disabled={loading}>
              {loading ? <span className="w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin" /> : "Guardar contraseña nueva"}
            </AuthButton>
          </form>
        </>
      )}
    </AuthCard>
  );
}

/* ---------- app (portero de sesión) ---------- */

// Pantalla que pide el código de 6 dígitos cuando el usuario ya tiene activada la verificación en dos pasos.
function MfaChallengeScreen({ factorId, onVerificado, tema }) {
  const [codigo, setCodigo] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const verificar = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    const { data: challenge, error: errChallenge } = await supabase.auth.mfa.challenge({ factorId });
    if (errChallenge) { setError("No se pudo iniciar la verificación. Intenta de nuevo."); setLoading(false); return; }
    const { error: errVerify } = await supabase.auth.mfa.verify({ factorId, challengeId: challenge.id, code: codigo });
    setLoading(false);
    if (errVerify) { setError("Código incorrecto. Revisa tu app de autenticación."); return; }
    onVerificado();
  };

  return (
    <div className={`gp-root gp-sidebar-area flex items-center justify-center ${claseTema(tema)}`} style={{ minHeight: "100vh" }}>
      <Tokens tema={tema} />
      <div className="gp-panel p-6 w-full max-w-sm">
        <img src="/logo-arkeyone.png" alt="ArkeyOne" style={{ height: 92 }} className="mb-4" />
        <h2 className="gp-serif text-lg mb-1">Verificación en dos pasos</h2>
        <p className="text-sm gp-text-muted mb-4">Abre tu app de autenticación (Google Authenticator, Authy, etc.) e ingresa el código de 6 dígitos.</p>
        <form onSubmit={verificar}>
          <input
            className="gp-input text-center text-lg mb-3" style={{ letterSpacing: "0.4em" }}
            maxLength={6} inputMode="numeric" autoFocus
            value={codigo} onChange={(e) => setCodigo(e.target.value.replace(/\D/g, "").slice(0, 6))}
            placeholder="000000"
          />
          {error && <p className="text-xs gp-text-red mb-3">{error}</p>}
          <button type="submit" disabled={loading || codigo.length !== 6} className="gp-btn w-full py-2 text-sm">
            {loading ? "Verificando…" : "Verificar"}
          </button>
        </form>
      </div>
    </div>
  );
}

// Indicador de conexión (app "Online-First"): si se pierde internet, se avisa claro arriba
// de la pantalla; al recuperarla, avisa brevemente y el usuario sabe que ya puede confiar
// en que lo que ve está actualizado otra vez.
function IndicadorConexion() {
  const [enLinea, setEnLinea] = useState(navigator.onLine);
  const [mostrarRecuperado, setMostrarRecuperado] = useState(false);

  useEffect(() => {
    // Al recuperar conexión, avisamos aquí (banner) y además avisamos al resto de la app
    // con un evento global: AppLoggedIn lo escucha para volver a traer los datos reales de
    // Supabase. Sin esto el banner decía "ya está actualizada" sin que fuera cierto.
    const alConectar = () => {
      setEnLinea(true);
      setMostrarRecuperado(true);
      setTimeout(() => setMostrarRecuperado(false), 3000);
      window.dispatchEvent(new Event("arkeyone-reconectado"));
    };
    const alDesconectar = () => setEnLinea(false);
    window.addEventListener("online", alConectar);
    window.addEventListener("offline", alDesconectar);
    return () => {
      window.removeEventListener("online", alConectar);
      window.removeEventListener("offline", alDesconectar);
    };
  }, []);

  if (enLinea && !mostrarRecuperado) return null;
  return (
    <div
      className="fixed top-0 left-0 right-0 z-[100] text-center text-xs px-3"
      style={{ background: enLinea ? "#1a7a4c" : "#8a2f2f", color: "#fff", paddingTop: "calc(env(safe-area-inset-top) + 6px)", paddingBottom: "6px" }}
    >
      {enLinea ? "Conexión recuperada — la información ya está actualizada." : "Sin conexión a internet. Lo que ves puede no estar actualizado; reconéctate para seguir trabajando."}
    </div>
  );
}

// Al reconectar con pendientes offline en la cola: intenta preguntar por voz usando el
// Asistente de IA real (gasta cuota de asistente_uso); si no hay cuota, el navegador no
// soporta voz, o algo falla en el camino, cae a un modal de texto con las mismas 3 opciones.
// Solo hace UNA consulta al Asistente (para interpretar la respuesta hablada) — no negocia
// por turnos, para no gastar cuota de más.
function AvisoPendientesOffline({ pendientes, onActualizar, onGuardarComoNotas, onEliminar, onCerrar }) {
  const [fase, setFase] = useState("iniciando"); // iniciando | escuchando | procesando | modal

  useEffect(() => {
    let cancelado = false;
    (async () => {
      let hayCuota = false;
      try {
        const { data: sesion } = await supabase.auth.getSession();
        const uid = sesion?.session?.user?.id;
        const mes = new Date().toISOString().slice(0, 7);
        const { data: uso } = await supabase.from("asistente_uso").select("consultas_usadas, limite_mes").eq("user_id", uid).eq("mes", mes).maybeSingle();
        const usadas = uso?.consultas_usadas ?? 0;
        const limite = uso?.limite_mes ?? 100;
        hayCuota = usadas < limite;
      } catch { hayCuota = false; }

      const RecClass = window.SpeechRecognition || window.webkitSpeechRecognition;
      const soportaVoz = "speechSynthesis" in window && !!RecClass;

      if (cancelado) return;
      if (!hayCuota || !soportaVoz) { setFase("modal"); return; }

      const n = pendientes.length;
      const pregunta = `Tienes ${n} ${n === 1 ? "cambio pendiente" : "cambios pendientes"} de cuando estabas sin conexión. ¿Quieres que los actualice, que los deje guardados como notas ya en línea, o que los elimine?`;
      hablarSimple(pregunta, () => { if (!cancelado) escuchar(RecClass); });
    })();
    return () => { cancelado = true; try { window.speechSynthesis?.cancel(); } catch {} };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function escuchar(RecClass) {
    setFase("escuchando");
    try {
      const r = new RecClass();
      r.lang = "es-MX";
      r.interimResults = false;
      r.maxAlternatives = 1;
      let seResolvio = false;
      r.onresult = (e) => { seResolvio = true; interpretar(e.results[0][0].transcript); };
      r.onerror = () => { if (!seResolvio) setFase("modal"); };
      r.onend = () => { if (!seResolvio) setFase((f) => (f === "escuchando" ? "modal" : f)); };
      r.start();
    } catch { setFase("modal"); }
  }

  async function interpretar(texto) {
    setFase("procesando");
    try {
      const token = await tokenDeSesion();
      const resp = await fetch(`${supabase.supabaseUrl}/functions/v1/asistente-ia`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          mensaje: `El usuario acaba de responder esto sobre qué hacer con sus cambios pendientes guardados offline: "${texto}". Responde ÚNICAMENTE con una de estas tres palabras en mayúsculas, sin nada más alrededor: ACTUALIZAR, NOTAS o ELIMINAR.`,
          modo: "voz",
        }),
      });
      const json = await resp.json().catch(() => ({}));
      const r = (json.respuesta || "").toUpperCase();
      if (r.includes("ACTUALIZAR")) { hablarSimple("Listo, actualizando tus pendientes."); onActualizar(); }
      else if (r.includes("NOTAS")) { hablarSimple("Listo, los dejo guardados como notas."); onGuardarComoNotas(); }
      else if (r.includes("ELIMINAR")) { hablarSimple("Listo, los elimino."); onEliminar(); }
      else setFase("modal");
    } catch { setFase("modal"); }
  }

  if (fase !== "modal") return null; // mientras habla/escucha no bloquea la pantalla con nada visual

  const n = pendientes.length;
  return (
    <Modal title="Tienes cambios pendientes" onClose={onCerrar}>
      <p className="text-sm gp-text-muted mb-3">
        Hiciste {n} {n === 1 ? "cambio" : "cambios"} sin conexión, guardados en Notas. ¿Qué quieres hacer?
      </p>
      <div className="flex flex-col gap-2">
        <button className="gp-btn py-2 text-sm" onClick={onActualizar}>Actualizarlos ahora</button>
        <button className="gp-btn py-2 text-sm" onClick={onGuardarComoNotas}>Dejarlos como notas (en línea)</button>
        <button className="gp-btn py-2 text-sm" style={{ background: "#8a2f2f" }} onClick={onEliminar}>Eliminarlos</button>
      </div>
    </Modal>
  );
}

// Botón flotante para instalar ARKEYONE como app (PWA). Chrome/Edge/Android disparan el
// evento beforeinstallprompt cuando el sitio cumple los requisitos (manifest + service
// worker); lo capturamos para ofrecer un botón propio en vez de depender del navegador.
// iOS Safari no dispara este evento (Apple no lo soporta) — ahí se instala manualmente
// desde "Compartir → Agregar a pantalla de inicio", por eso mostramos una pista distinta.
function AvisoInstalarPWA() {
  const [promptEvent, setPromptEvent] = useState(null);
  const [instalado, setInstalado] = useState(
    () => window.matchMedia?.("(display-mode: standalone)").matches || window.navigator.standalone === true
  );
  const [cerrado, setCerrado] = useState(() => localStorage.getItem("arkeyone_pwa_aviso_cerrado") === "1");

  useEffect(() => {
    const capturar = (e) => { e.preventDefault(); setPromptEvent(e); };
    const alInstalar = () => setInstalado(true);
    window.addEventListener("beforeinstallprompt", capturar);
    window.addEventListener("appinstalled", alInstalar);
    return () => {
      window.removeEventListener("beforeinstallprompt", capturar);
      window.removeEventListener("appinstalled", alInstalar);
    };
  }, []);

  const cerrar = () => { setCerrado(true); localStorage.setItem("arkeyone_pwa_aviso_cerrado", "1"); };

  if (instalado || cerrado || !promptEvent) return null;

  return (
    <div className="fixed left-1/2 -translate-x-1/2 z-[100] flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg" style={{ background: "#132a4a", border: "1px solid #2a4a72", maxWidth: "92vw", bottom: "calc(env(safe-area-inset-bottom) + 16px)" }}>
      <img src="/icons/icon-192.png" alt="" style={{ width: 32, height: 32, borderRadius: 8 }} />
      <div className="text-xs text-white">
        <p className="font-medium">Instala ARKEYONE</p>
        <p className="opacity-70">Ábrelo como app, más rápido y sin la barra del navegador.</p>
      </div>
      <button
        onClick={async () => { promptEvent.prompt(); await promptEvent.userChoice; setPromptEvent(null); }}
        className="text-xs px-3 py-1.5 whitespace-nowrap font-semibold rounded"
        style={{ background: "#2a4a72", color: "#FFFFFF" }}
      >
        Instalar
      </button>
      <button onClick={cerrar} className="text-white opacity-60 hover:opacity-100" aria-label="Cerrar"><X size={16} /></button>
    </div>
  );
}

// Al cerrar el asistente Arkey en iOS se recarga la página completa, para forzar a iOS a soltar
// el micrófono de verdad (ver VoiceMode.cerrar -- bug de WebKit que no se resuelve solo con JS).
// Esta función lee la pantalla que se guardó justo antes de esa recarga, para no hacer sentir al
// usuario que "perdió su lugar". Es de un solo uso: se borra de localStorage al leerla.
// Por seguridad, las pantallas sensibles (Finanzas, Salud, etc.) NO se restauran automáticamente
// -- tras una recarga, vuelven a pedir la contraseña de reautenticación como cualquier otra vez
// que expira la sesión corta, así que se manda a "dashboard" en esos casos.

const VISTAS_SENSIBLES_NO_RESTAURAR = ["finanzas", "movimientos", "facturas", "reportes", "estimaciones", "deudas", "apartados", "patrimonio", "activos", "documentos", "salud", "medicamentos", "actividades", "presupuesto"];
function leerVistaGuardadaTrasReload() {
  try {
    const cruda = localStorage.getItem("arkeyone_reload_vista");
    if (!cruda) return null;
    localStorage.removeItem("arkeyone_reload_vista");
    const ctx = JSON.parse(cruda);
    if (!ctx?.modulo || VISTAS_SENSIBLES_NO_RESTAURAR.includes(ctx.modulo)) return null;
    return ctx;
  } catch { return null; }
}

export default function App() {
  const [session, setSession] = useState(undefined); // undefined = cargando, null = sin sesión
  const [recuperando, setRecuperando] = useState(false);
  // Qué pantalla mostrar dentro del área sin sesión: login (nuevo diseño), crear cuenta o recuperar contraseña.
  const [vistaAuth, setVistaAuth] = useState("login");
  const [tema, toggleTema, setTema] = useTema();
  // Verificación en dos pasos (MFA): null = todavía sin revisar, { pendiente, factorId }
  const [mfaEstado, setMfaEstado] = useState(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: listener } = supabase.auth.onAuthStateChange((event, newSession) => {
      if (event === "PASSWORD_RECOVERY") setRecuperando(true);
      setSession(newSession);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  // Máximo absoluto de sesión: 8 horas desde el último login real, aunque sigas activo. Se usa
  // session.user.last_sign_in_at (dato del propio servidor de Supabase) en vez de guardar la
  // hora de login en localStorage: ese localStorage solo se llenaba en el evento SIGNED_IN, pero
  // al reabrir la PWA con una sesión ya persistida Supabase dispara TOKEN_REFRESHED/INITIAL_SESSION
  // (no SIGNED_IN), así que el valor guardado nunca se actualizaba — se quedaba pegado en la fecha
  // del primer login de ese dispositivo. Pasadas las primeras 8h, CADA reapertura de la app caía
  // ya "vencida" y este chequeo (cada minuto) la cerraba a los pocos segundos, como si el login
  // recién hecho se cerrara solo. Revisa también al montar/cambiar de sesión, no solo cada minuto,
  // para no dar la falsa impresión de "se cerró después de iniciar sesión" con el intervalo.
  useEffect(() => {
    if (!session?.user?.last_sign_in_at) return;
    const SESION_MAX_MS = 8 * 60 * 60 * 1000;
    const inicio = new Date(session.user.last_sign_in_at).getTime();
    const chequear = () => {
      if (Date.now() - inicio > SESION_MAX_MS) supabase.auth.signOut();
    };
    chequear();
    const id = setInterval(chequear, 60 * 1000);
    return () => clearInterval(id);
  }, [session?.user?.id, session?.user?.last_sign_in_at]);

  // Si el usuario tiene verificación en dos pasos activada, hay que pedirle el código antes de dejarlo pasar.
  useEffect(() => {
    if (!session) { setMfaEstado(null); return; }
    (async () => {
      const { data, error } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      if (error || !data) { setMfaEstado({ pendiente: false }); return; }
      if (data.nextLevel === "aal2" && data.currentLevel !== "aal2") {
        const { data: factoresData } = await supabase.auth.mfa.listFactors();
        const verificado = factoresData?.totp?.find((f) => f.status === "verified");
        setMfaEstado({ pendiente: true, factorId: verificado?.id });
      } else {
        setMfaEstado({ pendiente: false });
      }
    })();
  }, [session]);

  let pantalla;
  if (session === undefined) {
    pantalla = (
      <div className={`gp-root min-h-screen flex items-center justify-center ${claseTema(tema)}`}>
        <Tokens tema={tema} />
        <p className="gp-text-muted text-sm">Cargando…</p>
      </div>
    );
  } else if (recuperando) {
    pantalla = <NuevaPasswordScreen onListo={() => setRecuperando(false)} />;
  } else if (!session) {
    pantalla =
      vistaAuth === "crear" ? (
        <CrearCuentaScreen onVolver={() => setVistaAuth("login")} />
      ) : vistaAuth === "recuperar" ? (
        <RecuperarPasswordScreen onVolver={() => setVistaAuth("login")} />
      ) : (
        <LoginScreenNuevo
          onCreateAccount={() => setVistaAuth("crear")}
          onForgotPassword={() => setVistaAuth("recuperar")}
        />
      );
  } else if (mfaEstado === null) {
    pantalla = (
      <div className={`gp-root min-h-screen flex items-center justify-center ${claseTema(tema)}`}>
        <Tokens tema={tema} />
        <p className="gp-text-muted text-sm">Cargando…</p>
      </div>
    );
  } else if (mfaEstado.pendiente) {
    pantalla = <MfaChallengeScreen factorId={mfaEstado.factorId} onVerificado={() => setMfaEstado({ pendiente: false })} tema={tema} />;
  } else {
    pantalla = <AppLoggedIn session={session} tema={tema} toggleTema={toggleTema} setTema={setTema} />;
  }

  return (
    <>
      <IndicadorConexion />
      <AvisoInstalarPWA />
      {pantalla}
    </>
  );
}

const VIEW_TO_MODULO = {
  empresas: "empresas", proyectos: "proyectos", metas: "metas", pendientes: "pendientes",
  finanzas: "finanzas", facturas: "facturas", deudas: "deudas", apartados: "apartados",
  presupuesto: "presupuestos", movimientos: "finanzas",
  patrimonio: "patrimonio", activos: "activos", documentos: "documentos",
  equipo: "equipo", contactos: "contactos", regalos: "regalos",
  redes: "redes_metricas", marketing: "campanas",
  actividades: "actividades", eventos: "eventos", habitos: "habitos", salud: "salud",
  medicamentos: "medicamentos", notas: "notas",
};
// Mapeo inverso: de nombre de tabla/módulo a id de vista, para los deep links de Push
// (una notificación de una deuda trae recurso_tabla="deudas" y con esto sabemos a qué
// pantalla mandar al usuario).
const MODULO_TO_VIEW = Object.fromEntries(Object.entries(VIEW_TO_MODULO).map(([view, modulo]) => [modulo, view]));
MODULO_TO_VIEW["mi-trabajo"] = "mi-trabajo";
MODULO_TO_VIEW["mi-calendario"] = "mi-calendario";
MODULO_TO_VIEW["mis-pagos"] = "mis-pagos";
// Citas ya no es pantalla aparte (rediseño de navegación, 22 sept 2026) — un recordatorio push
// de una cita debe seguir llevando a algún lado real, así que se manda a Agenda en vez de a una
// vista que ya no existe.
MODULO_TO_VIEW["citas"] = "agenda";

// Convierte la llave pública VAPID (base64url, como la da el navegador/servidor) al formato
// binario que pide pushManager.subscribe(). Es texto de configuración, siempre igual.
function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

// Modal para activar/desactivar la verificación en dos pasos (MFA) de la cuenta.
function SeguridadMfaModal({ onClose }) {
  const [factores, setFactores] = useState(null); // null = cargando
  const [enrolando, setEnrolando] = useState(null); // { id, qr, secret }
  const [codigo, setCodigo] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const cargar = async () => {
    const { data } = await supabase.auth.mfa.listFactors();
    setFactores((data?.totp || []).filter((f) => f.status === "verified"));
  };
  useEffect(() => { cargar(); }, []);

  const activar = async () => {
    setError(""); setLoading(true);
    const { data, error } = await supabase.auth.mfa.enroll({ factorType: "totp" });
    setLoading(false);
    if (error) { setError("No se pudo iniciar. Intenta de nuevo."); return; }
    setEnrolando({ id: data.id, qr: data.totp.qr_code, secret: data.totp.secret });
  };

  const confirmar = async (e) => {
    e.preventDefault();
    setError(""); setLoading(true);
    const { data: challenge, error: errCh } = await supabase.auth.mfa.challenge({ factorId: enrolando.id });
    if (errCh) { setError("No se pudo verificar. Intenta de nuevo."); setLoading(false); return; }
    const { error: errVer } = await supabase.auth.mfa.verify({ factorId: enrolando.id, challengeId: challenge.id, code: codigo });
    setLoading(false);
    if (errVer) { setError("Código incorrecto. Revisa tu app de autenticación."); return; }
    setEnrolando(null); setCodigo("");
    cargar();
  };

  const desactivar = async (factorId) => {
    setLoading(true);
    await supabase.auth.mfa.unenroll({ factorId });
    setLoading(false);
    cargar();
  };

  return (
    <Modal title="Verificación en dos pasos" onClose={onClose}>
      {factores === null ? (
        <p className="text-sm gp-text-muted">Cargando…</p>
      ) : enrolando ? (
        <form onSubmit={confirmar}>
          <p className="text-sm gp-text-muted mb-3">Escanea este código con tu app de autenticación (Google Authenticator, Authy, etc.):</p>
          <div className="flex justify-center mb-3" style={{ background: "#fff", borderRadius: 8, padding: 12 }}>
            <img src={enrolando.qr} alt="Código QR" style={{ width: 180, height: 180 }} />
          </div>
          <p className="text-xs gp-text-muted mb-3">¿No puedes escanear? Ingresa esta clave manualmente: <span className="gp-mono">{enrolando.secret}</span></p>
          <Field label="Código de 6 dígitos">
            <input className="gp-input text-center" style={{ letterSpacing: "0.4em" }} maxLength={6} inputMode="numeric"
              value={codigo} onChange={(e) => setCodigo(e.target.value.replace(/\D/g, "").slice(0, 6))} autoFocus />
          </Field>
          {error && <p className="text-xs gp-text-red mb-3">{error}</p>}
          <div className="flex gap-2">
            <button type="button" onClick={() => { setEnrolando(null); setCodigo(""); }} className="gp-btn-ghost flex-1 py-2 text-sm">Cancelar</button>
            <button type="submit" disabled={loading || codigo.length !== 6} className="gp-btn flex-1 py-2 text-sm">Activar</button>
          </div>
        </form>
      ) : factores.length > 0 ? (
        <div>
          <div className="flex items-center gap-2 mb-4 text-sm gp-text-teal"><Check size={16} /> Verificación en dos pasos activada</div>
          {factores.map((f) => (
            <div key={f.id} className="flex items-center justify-between p-3 rounded mb-2" style={{ background: "var(--panel-hi)" }}>
              <span className="text-sm">App de autenticación</span>
              <button onClick={() => desactivar(f.id)} disabled={loading} className="text-xs gp-text-red">Desactivar</button>
            </div>
          ))}
        </div>
      ) : (
        <div>
          <p className="text-sm gp-text-muted mb-4">Agrega una capa extra de seguridad: además de tu contraseña, vas a necesitar un código de tu teléfono para entrar. Muy recomendado si administras información sensible como la tuya.</p>
          {error && <p className="text-xs gp-text-red mb-3">{error}</p>}
          <button onClick={activar} disabled={loading} className="gp-btn w-full py-2 text-sm">
            {loading ? "Un momento…" : "Activar verificación en dos pasos"}
          </button>
        </div>
      )}
    </Modal>
  );
}

function AppLoggedIn({ session, tema, toggleTema, setTema }) {
  const misId = session.user.id;
  const miEmail = session.user.email;
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [vistaRestauradaTrasReload] = useState(() => leerVistaGuardadaTrasReload());
  const [view, setView] = useState(() => {
    if (!vistaRestauradaTrasReload) return "dashboard";
    // contextoPantalla usa {modulo:"proyectos", entidad_id} cuando estabas viendo UN proyecto.
    // Desde el rediseño del 24 sept 2026 eso se restaura como la lista con su ficha abierta (ver
    // proyectoSelId más abajo), que es donde vive el detalle — ya no como una pantalla aparte.
    return vistaRestauradaTrasReload.modulo || "dashboard";
  });
  const [regalosFiltroContacto, setRegalosFiltroContacto] = useState("");
  const [proyectoDetalleId, setProyectoDetalleId] = useState(() => vistaRestauradaTrasReload?.entidad_id || null);
  // El contacto seleccionado (su ficha a la derecha) vive aquí arriba, no dentro de Contactos:
  // así, si sales a Agenda o a Notas y le das "Regresar", vuelves al mismo renglón con su ficha
  // abierta en vez de a la lista en blanco (pedido de Angel, 24 sept 2026).
  const [contactoSelId, setContactoSelId] = useState(null);
  // También la pestaña activa de esa ficha: si te vas a Agenda desde "Ver Agenda →" y regresas,
  // vuelves a la pestaña de Agenda del contacto, no al principio de la ficha.
  const [contactoSelTab, setContactoSelTab] = useState("informacion");
  // Lo mismo para Proyectos e ideas, que desde el rediseño del 24 sept 2026 usa el mismo patrón
  // lista + ficha: el proyecto seleccionado y la pestaña de su ficha viven aquí para sobrevivir a
  // una salida a Finanzas/Tareas/Contactos y al "Regresar".
  const [proyectoSelId, setProyectoSelId] = useState(() => vistaRestauradaTrasReload?.entidad_id || null);
  const [proyectoSelTab, setProyectoSelTab] = useState("resumen");
  // Filtro inicial del módulo Tareas cuando se entra desde la ficha de un proyecto ("Ver todas
  // las tareas"): las tareas se gestionan en SU módulo, no en un sistema paralelo dentro de
  // Proyectos.
  const [pendientesFiltroProyecto, setPendientesFiltroProyecto] = useState("");
  // "Ver el proyecto" desde cualquier lado (ficha de un contacto, buscador) abre la lista de
  // Proyectos con su ficha abierta — ese ES el detalle. El centro de proyecto (pantalla completa
  // con el árbol de tareas, metas, marketing y documentos) es un paso más adentro.
  const irADetalleProyecto = (proyectoId) => { setProyectoSelId(proyectoId); setProyectoSelTab("resumen"); irAVista("proyectos"); };
  const irACentroProyecto = (proyectoId) => { setProyectoDetalleId(proyectoId); irAVista("proyecto-detalle"); };
  const irAFichaContacto = (contactoId) => { setContactoSelId(contactoId); setContactoSelTab("informacion"); irAVista("contactos"); };
  const irATareasDeProyecto = (proyectoId) => { setPendientesFiltroProyecto(proyectoId); irAVista("pendientes"); };

  // --- Breadcrumb / "volver" a una vista anterior --------------------------------------------
  // El historial se arma pasivamente observando cambios de `view` (cubre tanto irAVista como los
  // `setView` directos que ya existían sueltos en el archivo, ej. onVerRegalos) en vez de
  // instrumentar cada punto de navegación uno por uno. volverA()/irAInicioDesdeBreadcrumb() usan
  // volviendoRef para que ese mismo efecto no vuelva a empujar el paso del que nos venimos yendo.
  const MAX_HISTORIAL_VISTAS = 8;
  const [historialVistas, setHistorialVistas] = useState([]); // pasos anteriores, sin incluir el actual
  const vistaAnteriorRef = useRef(null);
  const volviendoRef = useRef(false);
  useEffect(() => {
    const anterior = vistaAnteriorRef.current;
    const actual = { view, proyectoDetalleId };
    if (anterior && anterior.view !== actual.view) {
      if (volviendoRef.current) {
        volviendoRef.current = false;
      } else {
        setHistorialVistas((prev) => {
          const next = [...prev, anterior];
          return next.length > MAX_HISTORIAL_VISTAS ? next.slice(next.length - MAX_HISTORIAL_VISTAS) : next;
        });
      }
    }
    vistaAnteriorRef.current = actual;
  }, [view, proyectoDetalleId]);
  const volverA = (indice) => {
    const destino = historialVistas[indice];
    if (!destino) return;
    volviendoRef.current = true;
    setHistorialVistas((prev) => prev.slice(0, indice));
    setProyectoDetalleId(destino.view === "proyecto-detalle" ? destino.proyectoDetalleId : null);
    setView(destino.view);
  };
  const irAInicioDesdeBreadcrumb = () => {
    volviendoRef.current = true;
    setHistorialVistas([]);
    setProyectoDetalleId(null);
    setView("dashboard");
  };

  const [busquedaAbierta, setBusquedaAbierta] = useState(false);
  const buscarNavegarA = (key, item) => {
    setBusquedaAbierta(false);
    if (key === "proyectos") { irADetalleProyecto(item.id); return; }
    irAVista(KEY_TO_VIEW_BUSQUEDA[key] || "dashboard");
  };
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  // El menú lateral se puede colapsar a solo íconos en escritorio; queda "fijo" como lo dejes (se recuerda en este navegador).
  const [sidebarColapsado, setSidebarColapsado] = useState(() => localStorage.getItem("arkeyone_sidebar_colapsado") === "1");
  const toggleSidebarColapsado = () => {
    setSidebarColapsado((prev) => {
      const next = !prev;
      localStorage.setItem("arkeyone_sidebar_colapsado", next ? "1" : "0");
      return next;
    });
  };
  // El modo "solo íconos" (sidebarColapsado) es una preferencia de ESCRITORIO. Como se guarda en
  // localStorage sin distinguir viewport, si el usuario la activó alguna vez en escritorio, en
  // móvil quedaba forzando mostrarItems=true (ver más abajo) e impedía que las secciones del
  // menú se colapsaran al tocarlas. Este flag detecta si estamos en viewport de escritorio (≥768px,
  // el breakpoint "md" de Tailwind) para que esa preferencia solo aplique ahí.
  const [esEscritorio, setEsEscritorio] = useState(() => window.matchMedia?.("(min-width: 768px)").matches ?? true);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    const actualizar = (e) => setEsEscritorio(e.matches);
    mq.addEventListener("change", actualizar);
    return () => mq.removeEventListener("change", actualizar);
  }, []);
  // Qué grupos del menú lateral están cerrados (colapsados). Por default arrancan TODOS cerrados;
  // si el usuario abre alguno, se recuerda esa preferencia en este navegador.
  const [gruposCerrados, setGruposCerrados] = useState(() => {
    try { return JSON.parse(localStorage.getItem("arkeyone_nav_grupos_cerrados") || "{}"); } catch { return {}; }
  });
  const grupoEstaCerrado = (label) => (Object.prototype.hasOwnProperty.call(gruposCerrados, label) ? gruposCerrados[label] : true);
  const toggleGrupo = (label) => {
    setGruposCerrados((prev) => {
      const next = { ...prev, [label]: !grupoEstaCerrado(label) };
      localStorage.setItem("arkeyone_nav_grupos_cerrados", JSON.stringify(next));
      return next;
    });
  };
  const [confirmDelete, setConfirmDelete] = useState(null); // { key, id, label }
  // Con qué lado y qué estado abrir Movimientos cuando se llega desde un bloque del Resumen
  // ("Ver los 7" de cobros pendientes abre Ingresos > Por cobrar, no la lista completa).
  // Mismo patrón que regalosFiltroContacto: se pone antes de navegar y la pantalla lo consume.
  const [movimientosFoco, setMovimientosFoco] = useState(null); // { grupo, sub } | null

  // Orden personalizado de los ítems dentro de cada grupo del menú lateral (arrastrar para reordenar).
  // Los grupos (encabezados) y la sección fija de abajo NO se reordenan, solo los ítems hijos de cada grupo.
  // Se guarda por usuario (clave incluye el UID) en este navegador.
  const ORDEN_NAV_KEY = `arkeyone_nav_orden_${misId}`;
  const [ordenNav, setOrdenNav] = useState(() => {
    try { return JSON.parse(localStorage.getItem(ORDEN_NAV_KEY) || "{}"); } catch { return {}; }
  });
  const [dragNav, setDragNav] = useState(null); // { grupo, id }
  const [dragNavSobre, setDragNavSobre] = useState(null); // id sobre el que está pasando el arrastre
  const ordenarItemsGrupo = (grupoLabel, items) => {
    const ordenGuardado = ordenNav[grupoLabel];
    if (!ordenGuardado || !ordenGuardado.length) return items;
    const porId = Object.fromEntries(items.map((it) => [it.id, it]));
    const enOrden = ordenGuardado.map((id) => porId[id]).filter(Boolean);
    const faltantes = items.filter((it) => !ordenGuardado.includes(it.id));
    return [...enOrden, ...faltantes];
  };
  const guardarOrdenGrupo = (grupoLabel, idsEnOrden) => {
    setOrdenNav((prev) => {
      const next = { ...prev, [grupoLabel]: idsEnOrden };
      localStorage.setItem(ORDEN_NAV_KEY, JSON.stringify(next));
      return next;
    });
  };
  const moverItemNav = (grupoLabel, itemsOrdenados, idArrastrado, idDestino) => {
    if (idArrastrado === idDestino) return;
    const ids = itemsOrdenados.map((it) => it.id);
    const desde = ids.indexOf(idArrastrado);
    const hasta = ids.indexOf(idDestino);
    if (desde === -1 || hasta === -1) return;
    ids.splice(desde, 1);
    ids.splice(hasta, 0, idArrastrado);
    guardarOrdenGrupo(grupoLabel, ids);
  };

  // Cierre de sesión automático por inactividad (hay datos sensibles: dinero, salud, documentos).
  // 30 min sin actividad = cierra sesión sola; avisa 2 min antes por si el usuario sigue ahí.
  const INACTIVIDAD_AVISO_MS = 28 * 60 * 1000;
  const INACTIVIDAD_CIERRE_MS = 30 * 60 * 1000;
  const [avisoInactividad, setAvisoInactividad] = useState(false);
  useEffect(() => {
    let timerAviso, timerCierre;
    const reiniciarTimers = () => {
      clearTimeout(timerAviso);
      clearTimeout(timerCierre);
      setAvisoInactividad(false);
      timerAviso = setTimeout(() => setAvisoInactividad(true), INACTIVIDAD_AVISO_MS);
      timerCierre = setTimeout(() => { supabase.auth.signOut(); }, INACTIVIDAD_CIERRE_MS);
    };
    const eventos = ["mousemove", "keydown", "mousedown", "click", "scroll", "touchstart"];
    eventos.forEach((ev) => window.addEventListener(ev, reiniciarTimers));
    reiniciarTimers();
    return () => {
      clearTimeout(timerAviso);
      clearTimeout(timerCierre);
      eventos.forEach((ev) => window.removeEventListener(ev, reiniciarTimers));
    };
  }, []);

  // Sesión corta para módulos sensibles (dinero, salud, documentos): 15 min desde la última
  // reautenticación o actividad. Si se cumple el plazo, se pide contraseña de nuevo antes de
  // entrar/seguir en el módulo — independiente del cierre general de sesión a los 30 min.
  const SENSIBLE_MS = 15 * 60 * 1000;
  const VISTAS_SENSIBLES = ["finanzas", "movimientos", "facturas", "reportes", "estimaciones", "deudas", "apartados", "patrimonio", "activos", "documentos", "salud", "medicamentos", "presupuesto"];
  // Sentinel para "solo desbloquear, sin navegar a ningún lado" — se usa cuando el candado
  // aparece dentro de otra pantalla (Centro de Mando, pestañas de un proyecto) para revelar
  // información ya enmascarada ahí mismo, en vez de mandar al usuario al módulo completo.
  const SOLO_DESBLOQUEAR = "__solo_desbloquear__";
  const [sensibleDesbloqueadoHasta, setSensibleDesbloqueadoHasta] = useState(0);
  // Diario (secc. 24.5) usa la misma idea pero con una ventana propia de 10 min, independiente
  // de la de Dinero/Salud — se maneja aparte para no tocar ese flujo ya probado.
  const DIARIO_MS = 10 * 60 * 1000;
  const VISTAS_SENSIBLES_DIARIO = ["actividades"];
  const [diarioDesbloqueadoHasta, setDiarioDesbloqueadoHasta] = useState(0);
  const [reauthPendiente, setReauthPendiente] = useState(null); // id de la vista esperando reautenticación
  const [reauthPassword, setReauthPassword] = useState("");
  const [reauthError, setReauthError] = useState("");
  const [reauthCargando, setReauthCargando] = useState(false);

  const irAVista = (id) => {
    if (!confirmarDescartarCambios()) return;
    if (CANDADO_SENSIBLE_ACTIVO && VISTAS_SENSIBLES.includes(id) && Date.now() > sensibleDesbloqueadoHasta) {
      setReauthPendiente(id);
      setReauthPassword("");
      setReauthError("");
      return;
    }
    if (CANDADO_SENSIBLE_ACTIVO && VISTAS_SENSIBLES_DIARIO.includes(id) && Date.now() > diarioDesbloqueadoHasta) {
      setReauthPendiente(id);
      setReauthPassword("");
      setReauthError("");
      return;
    }
    if (VISTAS_SENSIBLES.includes(id)) setSensibleDesbloqueadoHasta(Date.now() + SENSIBLE_MS);
    if (VISTAS_SENSIBLES_DIARIO.includes(id)) setDiarioDesbloqueadoHasta(Date.now() + DIARIO_MS);
    setView(id);
  };

  // Para los candados que aparecen DENTRO de otra pantalla (Centro de Mando, pestañas de un
  // proyecto) y que solo deben revelar la info ahí mismo, sin mandar a nadie al módulo completo.
  const desbloquearSensibleAqui = () => {
    if (Date.now() < sensibleDesbloqueadoHasta) return; // ya desbloqueado, no hace falta pedir nada
    setReauthPendiente(SOLO_DESBLOQUEAR);
    setReauthPassword("");
    setReauthError("");
  };

  // Accesos rápidos del Centro de mando ("Nueva tarea"/"Nueva cita"/"Nuevo proyecto"/"Nuevo
  // gasto"): guarda qué se quiere crear y en qué módulo, navega ahí (respetando el candado de
  // VISTAS_SENSIBLES si aplica), y la pantalla destino abre su propio formulario de "Nuevo" sola
  // (ver el useEffect de `crearAlEntrar` en Proyectos/Pendientes/Finanzas/Citas).
  const [accionRapidaCrear, setAccionRapidaCrear] = useState(null);
  const irACrear = (modulo, preset = {}) => {
    setAccionRapidaCrear({ modulo, preset });
    irAVista(modulo);
  };
  const consumirAccionRapidaCrear = () => setAccionRapidaCrear(null);

  // Crea un contacto solo con el nombre, sin salir del formulario que lo pidió (mismo patrón que
  // ya usan Citas y la captura rápida de Salud). tipos por default: el que se le pida (p.ej.
  // "Colaborador" al asignarlo desde una tarea, "Otro" en los demás casos).
  // Crear un contacto desde fuera de la pantalla de Contactos (una tarea, una cita, un
  // formulario de salud). Se crea de inmediato para poder devolver su id y dejarlo seleccionado
  // donde se pidió —los combos lo necesitan en el momento—, y acto seguido se abre un formulario
  // corto para completar apellidos, correo y WhatsApp sin tener que ir hasta Contactos
  // (pedido de Angel, 29 sept 2026). Si se cancela, el contacto se queda solo con el nombre,
  // que es exactamente lo que pasaba antes.
  const [contactoRapido, setContactoRapido] = useState(null); // { id, nombre }
  const crearContactoRapido = (nombre, tipos = ["Otro"]) => {
    const nid = uid();
    addItem("contactos", { id: nid, nombre, tipos });
    setContactoRapido({ id: nid, nombre });
    return nid;
  };

  // Crear un proyecto sin salir de donde estás (por ahora, desde el formulario de tarea). Nace
  // como Idea con los mismos valores por omisión que "Nuevo proyecto"; los detalles se completan
  // después en Proyectos e ideas. Devuelve el id para dejarlo ya seleccionado.
  const crearProyectoRapido = (nombre) => {
    const nid = uid();
    addItem("proyectos", {
      id: nid, nombre, descripcion: "", estatus: "Idea", contexto: "Personal", categoria: "Otro",
      responsableContactoId: "", fechaInicio: "", fechaFin: "", etiquetas: [], imagenUrl: "",
      modo: "Finito", monetizacion: "Dinero", prioridad: "Media", fechaRevision: "",
      github: "", githubSubido: false, notas: [],
    });
    return nid;
  };

  // Avisa por push a quien acaba de quedar asignado a una tarea. Antes vivía suelta dentro de
  // las props de Pendientes; ahora la comparten Pendientes y la Agenda (que también puede
  // reasignar desde su formulario de edición), así que es una sola función.
  const notificarAsignacionTarea = async (pendienteId) => {
    try {
      const token = await tokenDeSesion();
      await fetch(`${supabase.supabaseUrl}/functions/v1/notificar-asignacion`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ pendienteId }),
      });
    } catch (err) {
      console.error("Error al notificar la asignación:", err);
    }
  };

  // Envía (o reenvía) el correo de invitación de una tarea a su colaborador asignado — Edge
  // Function notificar-tarea-asignada, que además marca estado_aceptacion="pendiente" e
  // invitacion_enviada_en si es el primer envío.
  const enviarInvitacionTarea = async (tareaId) => {
    try {
      const token = await tokenDeSesion();
      const resp = await fetch(`${supabase.supabaseUrl}/functions/v1/notificar-tarea-asignada`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ tareaId }),
      });
      if (!resp.ok) {
        const j = await resp.json().catch(() => ({}));
        alert(j.error || "No se pudo enviar el correo. Intenta de nuevo.");
        return;
      }
      // Refresca la tarea para reflejar estado_aceptacion/invitacion_enviada_en actualizados.
      const fresh = await fetchTable("pendientes", activeOwnerId);
      setData((prev) => ({ ...prev, pendientes: fresh }));
    } catch (err) {
      console.error("Error al enviar la invitación:", err);
      alert("No se pudo enviar el correo. Revisa tu conexión e intenta de nuevo.");
    }
  };

  // El creador acepta la tarea en nombre del colaborador (no tiene forma de hacerlo él mismo).
  const aceptarTareaEnNombre = (tareaId) => {
    editItem("pendientes", tareaId, { estadoAceptacion: "aceptada", aceptadaPorCreador: true, respondidaEn: new Date().toISOString() });
  };

  // Cerrar sesión "a prueba de fallos": antes solo llamábamos a signOut() sin esperar su
  // resultado ni manejar errores — si esa llamada fallaba en silencio (por ejemplo con mala
  // conexión), la app se quedaba con la sesión vieja y el botón parecía no hacer nada. Ahora
  // esperamos la respuesta, y pase lo que pase (funcione o falle) forzamos que la app quede
  // en estado "sin sesión" limpiando lo local y recargando, para que siempre se sienta el
  // cierre de sesión como algo que sí ocurrió.
  const [cerrandoSesion, setCerrandoSesion] = useState(false);
  const cerrarSesion = async () => {
    if (cerrandoSesion) return;
    setCerrandoSesion(true);
    try {
      const { error } = await supabase.auth.signOut();
      if (error) console.error("Error al cerrar sesión:", error);
    } catch (err) {
      console.error("Error al cerrar sesión:", err);
    } finally {
      window.location.reload();
    }
  };

  // Mientras se sigue navegando/interactuando dentro de un módulo sensible, se extiende el
  // desbloqueo de 15 min (igual que el temporizador general de inactividad).
  useEffect(() => {
    if (!VISTAS_SENSIBLES.includes(view)) return;
    const extender = () => setSensibleDesbloqueadoHasta(Date.now() + SENSIBLE_MS);
    const eventos = ["mousemove", "keydown", "mousedown", "click", "scroll", "touchstart"];
    eventos.forEach((ev) => window.addEventListener(ev, extender));
    const interval = setInterval(() => {
      if (Date.now() > sensibleDesbloqueadoHasta) {
        setReauthPendiente(view);
        setReauthPassword("");
        setReauthError("");
      }
    }, 15000);
    return () => {
      eventos.forEach((ev) => window.removeEventListener(ev, extender));
      clearInterval(interval);
    };
  }, [view, sensibleDesbloqueadoHasta]);

  // Mismo mecanismo para Diario, con su propia ventana de 10 min (secc. 24.5): "si sale y
  // vuelve antes de vencer, no pide clave y reinicia los 10 minutos desde la nueva consulta".
  useEffect(() => {
    if (!CANDADO_SENSIBLE_ACTIVO) return; // candados apagados: el Diario no se vuelve a cerrar solo
    if (!VISTAS_SENSIBLES_DIARIO.includes(view)) return;
    const extender = () => setDiarioDesbloqueadoHasta(Date.now() + DIARIO_MS);
    const eventos = ["mousemove", "keydown", "mousedown", "click", "scroll", "touchstart"];
    eventos.forEach((ev) => window.addEventListener(ev, extender));
    const interval = setInterval(() => {
      if (Date.now() > diarioDesbloqueadoHasta) {
        setReauthPendiente(view);
        setReauthPassword("");
        setReauthError("");
      }
    }, 15000);
    return () => {
      eventos.forEach((ev) => window.removeEventListener(ev, extender));
      clearInterval(interval);
    };
  }, [view, diarioDesbloqueadoHasta]);

  const confirmarReauth = async () => {
    if (!reauthPassword) { setReauthError("Escribe tu contraseña."); return; }
    setReauthCargando(true);
    setReauthError("");
    const { error } = await supabase.auth.signInWithPassword({ email: miEmail, password: reauthPassword });
    setReauthCargando(false);
    if (error) { setReauthError("Contraseña incorrecta."); return; }
    if (VISTAS_SENSIBLES_DIARIO.includes(reauthPendiente)) setDiarioDesbloqueadoHasta(Date.now() + DIARIO_MS);
    else setSensibleDesbloqueadoHasta(Date.now() + SENSIBLE_MS);
    // Si el candado se abrió solo para revelar información en el mismo lugar (Centro de Mando,
    // pestañas de un proyecto), no navegamos — la info ya enmascarada se muestra ahí mismo.
    if (reauthPendiente !== SOLO_DESBLOQUEAR) setView(reauthPendiente);
    setReauthPendiente(null);
    setReauthPassword("");
  };

  const [activeOwnerId, setActiveOwnerId] = useState(misId);
  const [activeOwnerEmail, setActiveOwnerEmail] = useState(miEmail);
  const [modulosPermitidos, setModulosPermitidos] = useState(null); // null = soy el dueño, acceso total
  const [dependientesCuidado, setDependientesCuidado] = useState([]); // ids de Contactos de los que soy Cuidador (sin módulo completo de Salud)
  const [misColaboraciones, setMisColaboraciones] = useState([]);

  useEffect(() => {
    (async () => {
      await supabase.rpc("vincular_invitaciones");
      const { data: colabs } = await supabase.from("colaboradores").select("*, colaborador_dependientes(contacto_id)").eq("colaborador_user_id", misId).eq("estatus", "Activo");
      setMisColaboraciones((colabs || []).map((c) => ({ propietarioId: c.propietario_id, propietarioEmail: c.propietario_email, modulos: c.modulos, dependientes: (c.colaborador_dependientes || []).map((d) => d.contacto_id) })));

      const { data: pref } = await supabase.from("preferencias").select("tema, alertas_correo_activas, notif_tipos_desactivados, notif_silencio_activo, notif_silencio_inicio, notif_silencio_fin, notif_anticipacion_citas_min, dashboard_widgets, nombre_mostrar, avatar_url, presupuesto_mensual, ciudad, clima_lat, clima_lon, perfil_bio, perfil_estudios, perfil_habilidades, perfil_redes, contextos, actividad_profesional, onboarding_completado").eq("user_id", misId).maybeSingle();
      const temaGuardado = normalizarTema(pref?.tema);
      if (temaGuardado !== tema) setTema(temaGuardado);
      if (pref && pref.alertas_correo_activas === false) setAlertasCorreoActivas(false);
      if (pref?.notif_tipos_desactivados) setNotifTiposDesactivados(pref.notif_tipos_desactivados);
      if (pref?.notif_silencio_activo) setNotifSilencioActivo(true);
      if (pref?.notif_silencio_inicio) setNotifSilencioInicio(pref.notif_silencio_inicio.slice(0, 5));
      if (pref?.notif_silencio_fin) setNotifSilencioFin(pref.notif_silencio_fin.slice(0, 5));
      if (pref?.notif_anticipacion_citas_min != null) setNotifAnticipacionCitasMin(pref.notif_anticipacion_citas_min);
      if (pref?.dashboard_widgets) setOrdenWidgetsDashboard(pref.dashboard_widgets);
      if (pref?.nombre_mostrar) setNombreMostrar(pref.nombre_mostrar);
      if (pref?.avatar_url) setAvatarUrl(pref.avatar_url);
      if (pref?.presupuesto_mensual != null) setPresupuestoMensual(pref.presupuesto_mensual);
      if (pref?.ciudad) setCiudad(pref.ciudad);
      if (pref?.clima_lat != null) setClimaLat(pref.clima_lat);
      if (pref?.clima_lon != null) setClimaLon(pref.clima_lon);
      if (pref?.perfil_bio) setPerfilBio(pref.perfil_bio);
      if (pref?.perfil_estudios) setPerfilEstudios(pref.perfil_estudios);
      if (pref?.perfil_habilidades) setPerfilHabilidades(pref.perfil_habilidades);
      if (pref?.perfil_redes) setPerfilRedes(pref.perfil_redes);
      if (pref?.contextos) setContextos(pref.contextos);
      if (pref?.actividad_profesional) setActividadProfesional(pref.actividad_profesional);
      setOnboardingCompletado(!!pref?.onboarding_completado);

      const result = await loadAllTables(misId);
      // Nota: ya no se siembran proyectos de ejemplo en cuentas nuevas — esto era correcto
      // cuando la app era solo para Angel, pero con registro abierto (SaaS) sembrarle a un
      // desconocido los proyectos personales de Angel no tiene sentido, y además los ids
      // fijos ("p1".."p7") chocarían con los que ya existen en la cuenta de Angel.
      setData(result);
      setLoading(false);
    })();
  }, []);

  const cambiarTema = async (nuevoValor) => {
    setTema(nuevoValor);
    await supabase.from("preferencias").upsert({ user_id: misId, tema: nuevoValor }, { onConflict: "user_id" });
  };

  const [alertasCorreoActivas, setAlertasCorreoActivas] = useState(true);
  const cambiarAlertasCorreo = async (nuevoValor) => {
    setAlertasCorreoActivas(nuevoValor);
    await supabase.from("preferencias").upsert({ user_id: misId, alertas_correo_activas: nuevoValor }, { onConflict: "user_id" });
  };

  // --- Preferencias de notificación: qué categorías recibir y horario de silencio ------------
  // Se guarda la lista de categorías DESACTIVADAS (no las activadas), para que las categorías
  // nuevas que se agreguen después lleguen activadas por default sin necesitar migrar nada.
  const [notifTiposDesactivados, setNotifTiposDesactivados] = useState([]);
  const [notifSilencioActivo, setNotifSilencioActivo] = useState(false);
  const [notifSilencioInicio, setNotifSilencioInicio] = useState("22:00");
  const [notifSilencioFin, setNotifSilencioFin] = useState("07:00");
  // Minutos de anticipación con los que se avisa una cita (push/notificación); el motor de
  // recordatorios (Edge Function motor-recordatorios) lee este mismo valor por usuario. Default 30.
  const [notifAnticipacionCitasMin, setNotifAnticipacionCitasMin] = useState(30);
  const guardarPreferenciasNotif = async ({ tipos, silencioActivo, silencioInicio, silencioFin, anticipacionCitasMin }) => {
    setNotifTiposDesactivados(tipos); setNotifSilencioActivo(silencioActivo); setNotifSilencioInicio(silencioInicio); setNotifSilencioFin(silencioFin);
    setNotifAnticipacionCitasMin(anticipacionCitasMin);
    await supabase.from("preferencias").upsert({
      user_id: misId, notif_tipos_desactivados: tipos, notif_silencio_activo: silencioActivo,
      notif_silencio_inicio: silencioInicio, notif_silencio_fin: silencioFin,
      notif_anticipacion_citas_min: anticipacionCitasMin,
    }, { onConflict: "user_id" });
  };

  // --- Centro de mando configurable: orden y visibilidad de widgets, por usuario -------------
  // null = el usuario nunca ha personalizado su panel; se resuelve con DASHBOARD_WIDGETS_CATALOGO.
  const [ordenWidgetsDashboard, setOrdenWidgetsDashboard] = useState(null);
  const guardarOrdenWidgetsDashboard = async (lista) => {
    setOrdenWidgetsDashboard(lista);
    await supabase.from("preferencias").upsert({ user_id: misId, dashboard_widgets: lista }, { onConflict: "user_id" });
  };

  // --- Nombre para mostrar: así te saluda el Centro de mando y así te llama Arkey (voz), en vez
  // de derivarlo del correo. Vacío = se sigue derivando del correo (ver los call sites de
  // <Dashboard> y <VoiceMode> más abajo, que reciben nombreMostrar || miEmail).
  const [nombreMostrar, setNombreMostrar] = useState("");
  const guardarNombreMostrar = async (v) => {
    setNombreMostrar(v);
    await supabase.from("preferencias").upsert({ user_id: misId, nombre_mostrar: v }, { onConflict: "user_id" });
  };

  // --- Foto de perfil: mismo bucket "adjuntos" que ya usan otras entidades (App.jsx ~360),
  // solo con su propia carpeta avatares/{user_id}/ — no se creó bucket ni política nueva.
  const [avatarUrl, setAvatarUrl] = useState("");
  const subirAvatar = async (file) => {
    const path = `avatares/${misId}/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
    const { error: upErr } = await supabase.storage.from("adjuntos").upload(path, file);
    if (upErr) return { error: upErr.message };
    const { data: pub } = supabase.storage.from("adjuntos").getPublicUrl(path);
    setAvatarUrl(pub.publicUrl);
    await supabase.from("preferencias").upsert({ user_id: misId, avatar_url: pub.publicUrl }, { onConflict: "user_id" });
    return { url: pub.publicUrl };
  };

  // --- Ciudad para el clima del Centro de mando: se guarda ya geocodificada (lat/lon elegidos
  // por el usuario entre los resultados de la búsqueda) para no tener que geocodificar de nuevo
  // en cada carga (ver WeatherWidget). Sin ciudad = el widget de clima no se muestra.
  const [ciudad, setCiudad] = useState("");
  const [climaLat, setClimaLat] = useState(null);
  const [climaLon, setClimaLon] = useState(null);
  const guardarCiudad = async ({ ciudad: nombre, lat, lon }) => {
    setCiudad(nombre);
    setClimaLat(lat);
    setClimaLon(lon);
    await supabase.from("preferencias").upsert({ user_id: misId, ciudad: nombre, clima_lat: lat, clima_lon: lon }, { onConflict: "user_id" });
  };

  // --- Presupuesto mensual: usado por "Tu progreso" del Centro de mando (gastado del mes /
  // presupuesto) — un número recurrente por usuario, no un dato histórico por mes.
  const [presupuestoMensual, setPresupuestoMensual] = useState(null);
  const guardarPresupuestoMensual = async (monto) => {
    setPresupuestoMensual(monto);
    await supabase.from("preferencias").upsert({ user_id: misId, presupuesto_mensual: monto }, { onConflict: "user_id" });
  };

  // --- Mi Perfil: bio/estudios/habilidades/redes, mismo patrón que nombre_mostrar/ciudad (1 fila
  // en preferencias, no una tabla nueva) — ver migración 20260928_presupuesto_y_mi_perfil.
  const [perfilBio, setPerfilBio] = useState("");
  const [perfilEstudios, setPerfilEstudios] = useState([]);
  const [perfilHabilidades, setPerfilHabilidades] = useState([]);
  const [perfilRedes, setPerfilRedes] = useState([]);
  // --- Contextos de uso (Personal / Profesional / Empresarial) ---------------------------------
  // Viven en la misma fila de `preferencias` que el tema y los widgets: son configuración del
  // usuario, no una entidad. `contextos` vacío = cuenta sin configurar, y la app se comporta
  // exactamente como antes de que existiera el onboarding (sin filtro, todos los widgets).
  const [contextos, setContextos] = useState([]);
  const [actividadProfesional, setActividadProfesional] = useState("");
  const [onboardingCompletado, setOnboardingCompletado] = useState(true); // optimista: no parpadea el wizard mientras cargan las preferencias
  const [onboardingForzado, setOnboardingForzado] = useState(false); // se abre a mano desde Configuración
  // Filtro del Centro de Mando: "todos" | "ctx:<Contexto>" | "emp:<id>".
  const [contextoActivo, setContextoActivo] = useState("todos");

  const guardarContextos = async ({ contextos: nuevos, actividadProfesional: actividad, empresas: empresasNuevas, aplicarWidgets }) => {
    setContextos(nuevos);
    setActividadProfesional(actividad || "");
    setOnboardingCompletado(true);
    setOnboardingForzado(false);
    setContextoActivo("todos");

    // Las empresas capturadas en el onboarding se crean con addItem para que pasen por el mismo
    // camino que cualquier otra entidad (id, user_id, cola offline, estado local).
    for (const emp of empresasNuevas || []) {
      if ((data?.empresas || []).some((x) => x.id === emp.id)) continue;
      await addItem("empresas", { id: emp.id, nombre: emp.nombre.trim(), descripcion: emp.descripcion || "", logoUrl: emp.logoUrl || "" });
    }

    // Los widgets se traducen al formato que ya usa "Personalizar panel". Solo se sobreescriben
    // cuando el usuario viene del onboarding inicial: si ya acomodó su panel a mano, cambiar de
    // contexto después no debe tirarle ese acomodo.
    const widgets = aplicarWidgets ? widgetsParaContextos(nuevos) : null;
    if (widgets) setOrdenWidgetsDashboard(widgets);

    await supabase.from("preferencias").upsert({
      user_id: misId,
      contextos: nuevos,
      actividad_profesional: (actividad || "").trim() || null,
      onboarding_completado: true,
      ...(widgets ? { dashboard_widgets: widgets } : {}),
    }, { onConflict: "user_id" });
  };

  const saltarOnboarding = async () => {
    setOnboardingCompletado(true);
    setOnboardingForzado(false);
    await supabase.from("preferencias").upsert({ user_id: misId, onboarding_completado: true }, { onConflict: "user_id" });
  };

  const guardarPerfil = async ({ bio, estudios, habilidades, redes }) => {
    setPerfilBio(bio); setPerfilEstudios(estudios); setPerfilHabilidades(habilidades); setPerfilRedes(redes);
    await supabase.from("preferencias").upsert({
      user_id: misId, perfil_bio: bio, perfil_estudios: estudios, perfil_habilidades: habilidades, perfil_redes: redes,
    }, { onConflict: "user_id" });
  };

  // --- Notificaciones Push -------------------------------------------------
  // "sin-soporte" (navegador no puede), "sin-activar", "activando", "activo", "denegado".
  const [pushEstado, setPushEstado] = useState("sin-soporte");
  const [notifPanelAbierto, setNotifPanelAbierto] = useState(false);
  const [enviandoPrueba, setEnviandoPrueba] = useState(false);
  const [notificaciones, setNotificaciones] = useState([]);
  const notifNoLeidas = notificaciones.filter((n) => !n.leido).length;

  const cargarNotificaciones = async () => {
    const { data } = await supabase.from("notifications").select("*").eq("user_id", misId).order("created_at", { ascending: false }).limit(30);
    setNotificaciones(data || []);
  };

  useEffect(() => {
    cargarNotificaciones();
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) { setPushEstado("sin-soporte"); return; }
    if (Notification.permission === "denied") { setPushEstado("denegado"); return; }
    navigator.serviceWorker.ready.then(async (reg) => {
      const sub = await reg.pushManager.getSubscription();
      setPushEstado(sub ? "activo" : "sin-activar");
    }).catch(() => setPushEstado("sin-soporte"));
  }, []);

  const activarPush = async () => {
    setPushEstado("activando");
    try {
      const permiso = await Notification.requestPermission();
      if (permiso !== "granted") { setPushEstado(permiso === "denied" ? "denegado" : "sin-activar"); return; }
      const reg = await navigator.serviceWorker.ready;
      const vapidKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;
      if (!vapidKey) { alert("Falta configurar la llave pública de Push (VITE_VAPID_PUBLIC_KEY)."); setPushEstado("sin-activar"); return; }
      const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(vapidKey) });
      const json = sub.toJSON();
      const plataforma = /iphone|ipad|ipod/i.test(navigator.userAgent) ? "ios" : /android/i.test(navigator.userAgent) ? "android" : "desktop";
      await supabase.from("push_subscriptions").upsert({
        user_id: misId, endpoint: sub.endpoint, p256dh: json.keys.p256dh, auth: json.keys.auth,
        user_agent: navigator.userAgent, plataforma, activo: true,
      }, { onConflict: "user_id,endpoint" });
      setPushEstado("activo");
    } catch (err) {
      console.error("Error activando push:", err);
      setPushEstado("sin-activar");
    }
  };

  const desactivarPush = async () => {
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await supabase.from("push_subscriptions").update({ activo: false }).eq("user_id", misId).eq("endpoint", sub.endpoint);
        await sub.unsubscribe();
      }
      setPushEstado("sin-activar");
    } catch (err) {
      console.error("Error desactivando push:", err);
    }
  };

  const irADeepLink = (recursoTabla) => {
    const destino = recursoTabla && MODULO_TO_VIEW[recursoTabla];
    if (destino) irAVista(destino);
    setNotifPanelAbierto(false);
  };

  const marcarNotificacionLeida = async (n) => {
    if (!n.leido) {
      setNotificaciones((prev) => prev.map((x) => (x.id === n.id ? { ...x, leido: true } : x)));
      await supabase.from("notifications").update({ leido: true }).eq("id", n.id);
    }
    irADeepLink(n.recurso_tabla);
  };

  const marcarTodasLeidas = async () => {
    setNotificaciones((prev) => prev.map((n) => ({ ...n, leido: true })));
    await supabase.from("notifications").update({ leido: true }).eq("user_id", misId).eq("leido", false);
  };

  const eliminarNotificacion = async (id) => {
    setNotificaciones((prev) => prev.filter((n) => n.id !== id));
    const { error } = await supabase.from("notifications").delete().eq("id", id);
    if (error) console.error("Error al eliminar notificación:", error);
  };

  // Procesa el botón de acción rápida de una notificación de medicamento (Tomado / Posponer).
  const ACCION_MINUTOS = { posponer10: 10, posponer30: 30, posponer60: 60 };
  const procesarAccionRecordatorio = async (accion, recordatorioId) => {
    if (accion === "tomado") {
      await supabase.from("recordatorios").update({ estado: "completado" }).eq("id", recordatorioId).eq("user_id", misId);
    } else if (ACCION_MINUTOS[accion]) {
      const pospuestoHasta = new Date(Date.now() + ACCION_MINUTOS[accion] * 60000).toISOString();
      await supabase.from("recordatorios").update({ estado: "pospuesto", pospuesto_hasta: pospuestoHasta }).eq("id", recordatorioId).eq("user_id", misId);
    }
    irAVista("medicamentos");
    cargarNotificaciones();
  };

  // Igual que arriba, pero desde un botón inline en el panel de notificaciones (no navega a
  // ningún lado, solo marca la acción y refresca la lista) — la vía principal para iPhone.
  const marcarAccionDesdeNotif = async (n, accion) => {
    if (accion === "tomado") {
      await supabase.from("recordatorios").update({ estado: "completado" }).eq("id", n.recordatorio_id).eq("user_id", misId);
    } else if (ACCION_MINUTOS[accion]) {
      const pospuestoHasta = new Date(Date.now() + ACCION_MINUTOS[accion] * 60000).toISOString();
      await supabase.from("recordatorios").update({ estado: "pospuesto", pospuesto_hasta: pospuestoHasta }).eq("id", n.recordatorio_id).eq("user_id", misId);
    }
    await supabase.from("notifications").update({ leido: true }).eq("id", n.id);
    setNotificaciones((prev) => prev.map((x) => (x.id === n.id ? { ...x, leido: true } : x)));
  };

  // Deep links: si llegan de un push tocado con la app cerrada (abre /?modulo=deudas), o de
  // un push tocado con la app ya abierta (el Service Worker manda el mensaje a esta pestaña).
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const modulo = params.get("modulo");
    const accion = params.get("accion");
    const recordatorioId = params.get("recordatorio");
    if (accion && recordatorioId) {
      procesarAccionRecordatorio(accion, recordatorioId);
      window.history.replaceState({}, "", window.location.pathname);
    } else if (modulo) {
      irADeepLink(modulo);
      window.history.replaceState({}, "", window.location.pathname);
    }
    const alMensaje = (event) => {
      if (event.data?.tipo === "arkeyone-deep-link") {
        try {
          const url = new URL(event.data.url, window.location.origin);
          const a = url.searchParams.get("accion");
          const rid = url.searchParams.get("recordatorio");
          const m = url.searchParams.get("modulo");
          if (a && rid) procesarAccionRecordatorio(a, rid);
          else if (m) irADeepLink(m);
        } catch {}
      }
    };
    navigator.serviceWorker?.addEventListener?.("message", alMensaje);
    return () => navigator.serviceWorker?.removeEventListener?.("message", alMensaje);
  }, []);

  const [exportPaso, setExportPaso] = useState(null); // null | "confirmar" | "listo"
  const [mfaModalAbierto, setMfaModalAbierto] = useState(false);
  const [temaModalAbierto, setTemaModalAbierto] = useState(false);
  // await: desde que `xlsx` se carga de forma perezosa, exportar es asíncrono — sin el await el
  // paso "listo" aparecía antes de que el archivo existiera.
  const confirmarExportar = async () => {
    await exportarExcel(data, activeOwnerId === misId ? "mi-cuenta" : activeOwnerEmail?.split("@")[0]);
    setExportPaso("listo");
  };

  const cambiarCuenta = async (ownerId, ownerEmail, modulos, dependientes) => {
    setLoading(true);
    setActiveOwnerId(ownerId);
    setActiveOwnerEmail(ownerEmail);
    setModulosPermitidos(modulos); // null = tu propia cuenta
    setDependientesCuidado(dependientes || []);
    const result = await loadAllTables(ownerId);
    setData(result);
    const tieneSoloCuidado = modulos && !modulos.includes("salud") && (dependientes || []).length > 0;
    setView(modulos ? (Object.keys(VIEW_TO_MODULO).find((v) => modulos.includes(VIEW_TO_MODULO[v])) || (tieneSoloCuidado ? "salud" : "dashboard")) : "dashboard");
    setLoading(false);
  };

  // El Asistente guarda directo en Supabase desde el servidor, así que el navegador no se
  // entera solo. Esto vuelve a leer nada más las tablas que el Asistente tocó (no toda la
  // cuenta) y actualiza `data`, para que lo que acaba de crear se vea de inmediato en el
  // resto de la app sin tener que recargar la página a mano.
  const recargarModulos = async (keys) => {
    const unicos = [...new Set(keys)];
    const entries = await Promise.all(unicos.map(async (k) => [k, await fetchTable(k, activeOwnerId)]));
    setData((prev) => ({ ...prev, ...Object.fromEntries(entries) }));
  };

  // "Pull to refresh": deslizar hacia abajo desde arriba del todo en el contenido para volver
  // a traer todo de la base de datos (por si se hizo un cambio desde otro dispositivo, o desde
  // el Asistente en otra pestaña). Solo se activa si el scroll ya está hasta arriba.
  const [pullDist, setPullDist] = useState(0);
  const [refrescando, setRefrescando] = useState(false);
  const pullRef = useRef({ activo: false, startY: 0 });
  const contenidoRef = useRef(null);

  const refrescarTodo = async () => {
    setRefrescando(true);
    try {
      const result = await loadAllTables(activeOwnerId);
      setData(result);
    } finally {
      setRefrescando(false);
      setPullDist(0);
    }
  };

  // El banner de "Conexión recuperada" (IndicadorConexion, fuera de este componente) manda
  // este evento global al recuperar internet. Antes el banner lo prometía pero nadie volvía
  // a pedir datos reales — aquí sí se cumple: se vuelve a traer todo de Supabase igual que
  // con "pull to refresh". No corre si ya hay un refresco en curso.
  //
  // Además, si hay pendientes de cuando estuvo offline (ver addItem/editItem/removeItem),
  // se dispara el aviso (voz o modal, ver AvisoPendientesOffline) para que el usuario decida
  // qué hacer con ellos antes de seguir.
  const [pendientesParaAvisar, setPendientesParaAvisar] = useState(null);
  useEffect(() => {
    const alReconectar = () => {
      if (!refrescando) refrescarTodo();
      const propios = leerPendientesOffline().filter((p) => p.ownerId === activeOwnerId);
      if (propios.length > 0) setPendientesParaAvisar(propios);
    };
    window.addEventListener("arkeyone-reconectado", alReconectar);
    return () => window.removeEventListener("arkeyone-reconectado", alReconectar);
  }, [activeOwnerId, refrescando]);

  // Las 3 salidas que puede elegir el usuario para sus pendientes offline (por voz o en el modal).
  const resolverPendientesActualizar = async () => {
    const lista = pendientesParaAvisar || [];
    for (const p of lista) {
      try {
        if (p.operacion === "add") await supabase.from(tableName(p.key)).insert(toRow(p.key, p.payload));
        else if (p.operacion === "edit") await supabase.from(tableName(p.key)).update(toRow(p.key, p.payload)).eq("id", p.targetIds[0]);
        else if (p.operacion === "delete") await supabase.from(tableName(p.key)).update({ deleted_at: new Date().toISOString() }).in("id", p.targetIds);
      } catch (err) { console.error("Error al sincronizar pendiente offline:", p, err); }
    }
    quitarPendientesOffline(lista.map((p) => p.id));
    setPendientesParaAvisar(null);
    refrescarTodo();
  };
  const resolverPendientesComoNotas = async () => {
    const lista = pendientesParaAvisar || [];
    for (const p of lista) {
      try {
        await supabase.from("notas").insert(toRow("notas", { id: uid(), userId: activeOwnerId, titulo: `Pendiente offline — ${p.key}`, contenido: p.descripcion }));
      } catch (err) { console.error("Error al guardar pendiente offline como nota:", p, err); }
    }
    quitarPendientesOffline(lista.map((p) => p.id));
    setPendientesParaAvisar(null);
    refrescarTodo();
  };
  const resolverPendientesEliminar = () => {
    const lista = pendientesParaAvisar || [];
    quitarPendientesOffline(lista.map((p) => p.id));
    setPendientesParaAvisar(null);
  };

  const onTouchStartContenido = (e) => {
    if ((contenidoRef.current?.scrollTop || 0) > 0 || refrescando) { pullRef.current.activo = false; return; }
    pullRef.current = { activo: true, startY: e.touches[0].clientY };
  };
  const onTouchMoveContenido = (e) => {
    if (!pullRef.current.activo || refrescando) return;
    const dy = e.touches[0].clientY - pullRef.current.startY;
    if (dy > 0 && (contenidoRef.current?.scrollTop || 0) <= 0) {
      setPullDist(Math.min(dy * 0.5, 90));
    } else {
      pullRef.current.activo = false;
      setPullDist(0);
    }
  };
  const onTouchEndContenido = () => {
    if (!pullRef.current.activo) return;
    pullRef.current.activo = false;
    if (pullDist > 60) refrescarTodo(); else setPullDist(0);
  };

  const addItem = async (key, item) => {
    const newItem = { ...item, id: item.id || uid(), userId: activeOwnerId };
    if (!navigator.onLine) {
      agregarPendienteOffline({ ownerId: activeOwnerId, operacion: "add", key, payload: newItem, descripcion: `Nuevo en ${key}: ${labelFor(key, newItem)}` });
      setData((prev) => ({ ...prev })); // fuerza a que Notas vuelva a leer la cola local y se refresque en pantalla
      alert("Sin conexión: se guardó como pendiente en Notas. Se subirá cuando vuelva internet.");
      return;
    }
    const { error } = await supabase.from(tableName(key)).insert(toRow(key, newItem));
    if (error) { console.error(`Error al guardar en ${tableName(key)}:`, error); alert(mensajeErrorGuardado(error)); return; }
    setData((prev) => ({ ...prev, [key]: [...prev[key], newItem] }));
  };
  const editItem = async (key, id, patch) => {
    if (!navigator.onLine) {
      const actual = (data[key] || []).find((i) => i.id === id);
      agregarPendienteOffline({ ownerId: activeOwnerId, operacion: "edit", key, targetIds: [id], payload: patch, descripcion: `Editar en ${key}: ${labelFor(key, { ...actual, ...patch })}` });
      setData((prev) => ({ ...prev }));
      alert("Sin conexión: se guardó como pendiente en Notas. Se subirá cuando vuelva internet.");
      return;
    }
    const { error } = await supabase.from(tableName(key)).update(toRow(key, patch)).eq("id", id);
    if (error) { console.error(`Error al actualizar ${tableName(key)}:`, error); alert(mensajeErrorGuardado(error)); return; }
    setData((prev) => ({ ...prev, [key]: prev[key].map((i) => (i.id === id ? { ...i, ...patch } : i)) }));
  };
  const removeItem = async (key, id, extraIds = []) => {
    const idsTodos = [id, ...extraIds];
    if (!navigator.onLine) {
      const actual = (data[key] || []).find((i) => i.id === id);
      agregarPendienteOffline({ ownerId: activeOwnerId, operacion: "delete", key, targetIds: idsTodos, descripcion: `Borrar en ${key}: ${labelFor(key, actual || {})}` });
      setData((prev) => ({ ...prev }));
      alert("Sin conexión: se guardó como pendiente en Notas. Se aplicará cuando vuelva internet.");
      return;
    }
    const { error } = await supabase.from(tableName(key)).update({ deleted_at: new Date().toISOString() }).in("id", idsTodos);
    if (error) { console.error(`Error al borrar en ${tableName(key)}:`, error); alert(mensajeErrorGuardado(error)); return; }
    setData((prev) => ({ ...prev, [key]: prev[key].filter((i) => !idsTodos.includes(i.id)) }));
  };
  const restoreItem = async (key, id) => {
    const { error } = await supabase.from(tableName(key)).update({ deleted_at: null }).eq("id", id);
    if (error) { console.error(`Error al restaurar en ${tableName(key)}:`, error); alert(mensajeErrorGuardado(error)); return false; }
    const fresh = await fetchTable(key, activeOwnerId);
    setData((prev) => ({ ...prev, [key]: fresh }));
    return true;
  };

  // Cada Evento tiene su propia estructura (lugar, horario, costos, fotos) que no tiene sentido
  // meter en Finanzas — pero su utilidad SÍ debe contar como ingreso real en Panorama/Reportes/
  // Finanzas. En vez de fusionar las tablas, se mantiene un movimiento "espejo" en Finanzas
  // (Ingreso, categoría "Eventos", ligado por evento_id) que se crea/actualiza/borra solo cada
  // vez que se guarda o borra un evento — así los lugares que ya suman "Ingreso" en Finanzas no
  // necesitan tocarse, simplemente ven este movimiento como uno más.
  const sincronizarFinanzasDeEvento = async (evento) => {
    const monto = evento.utilidad !== null && evento.utilidad !== undefined && evento.utilidad !== ""
      ? Number(evento.utilidad)
      : (evento.ganancia !== null && evento.ganancia !== undefined && evento.ganancia !== "" ? Number(evento.ganancia) : null);
    const existente = data.finanzas.find((f) => f.eventoId === evento.id);
    if (!monto || monto <= 0) {
      if (existente) await removeItem("finanzas", existente.id);
      return;
    }
    const campos = { tipo: "Ingreso", categoria: "Eventos", monto, concepto: evento.nombre, fecha: evento.fecha, estatus: "Cobrado", eventoId: evento.id };
    if (existente) await editItem("finanzas", existente.id, campos);
    else await addItem("finanzas", campos);
  };

  // Mismo patrón de movimiento "espejo": un Activo digital con Renovación automática y costo de
  // renovación genera/actualiza un Egreso recurrente en Finanzas (categoría "Activos digitales",
  // ligado por activo_id) para que su costo cuente en Reportes/Estimaciones sin capturarlo dos
  // veces. Si se apaga la renovación automática o se borra el costo, el espejo se elimina — no
  // queda un pago recurrente huérfano (secc. 23.15).
  const sincronizarFinanzasDeActivo = async (activo) => {
    const existente = data.finanzas.find((f) => f.activoId === activo.id);
    const monto = Number(activo.costoRenovacion) || 0;
    if (!activo.renovacionAutomatica || monto <= 0) {
      if (existente) await removeItem("finanzas", existente.id);
      return;
    }
    const campos = {
      tipo: "Egreso", categoria: "Activos digitales", monto, concepto: activo.nombre,
      fecha: activo.fechaVencimiento, estatus: "Pendiente", esRecurrente: true,
      frecuencia: activo.frecuenciaRenovacion || "Anual", fechaFin: "", activoId: activo.id,
    };
    if (existente) await editItem("finanzas", existente.id, campos);
    else await addItem("finanzas", campos);
  };

  const permanentDelete = async (key, id) => {
    const { error } = await supabase.from(tableName(key)).delete().eq("id", id);
    if (error) { console.error(`Error al borrar definitivamente en ${tableName(key)}:`, error); alert("No se pudo borrar definitivamente."); return false; }
    return true;
  };
  // opts puede traer { extraIds: [...ids de subtareas que también se van a borrar], mensaje: "texto de advertencia" }
  const askDelete = (key, id, opts = {}) => setConfirmDelete({ key, id, ...opts });
  const updatePerfilSalud = async (contactoId, patch) => {
    // Se fusiona con lo ya guardado (no solo con `patch`) porque esta fila también lleva
    // metasSalud — sin el merge, guardar solo la estatura borraría las metas ya configuradas
    // y viceversa.
    const actual = data.perfilSalud?.[contactoId || "yo"] || {};
    const nuevo = { ...actual, ...patch };
    const row = { user_id: activeOwnerId, contacto_id: contactoId || null, altura_cm: nuevo.alturaCm || null, metas_salud: nuevo.metasSalud || {} };
    const { error } = await supabase.from("perfil_salud").upsert(row, { onConflict: contactoId ? "user_id,contacto_id" : "user_id" });
    if (error) { console.error("Error al guardar el perfil de salud:", error); return; }
    setData((prev) => ({ ...prev, perfilSalud: { ...(prev.perfilSalud || {}), [contactoId || "yo"]: nuevo } }));
  };
  // Contacto–Proyecto es muchos-a-muchos (anexo de arquitectura, sept 2026) — antes un contacto
  // solo podía tener un proyecto (contactos.proyecto_id, ya eliminado). vincular/desvincular
  // trabajan directo contra la tabla puente contacto_proyectos, sin pasar por addItem/removeItem
  // porque no es una entidad con papelera propia (mismo criterio que colaborador_dependientes).
  const vincularProyectoContacto = async (contactoId, proyectoId) => {
    const { data: fila, error } = await supabase.from("contacto_proyectos")
      .insert({ contacto_id: contactoId, proyecto_id: proyectoId, user_id: activeOwnerId })
      .select().single();
    if (error) { console.error("Error al vincular proyecto al contacto:", error); alert(mensajeErrorGuardado(error)); return; }
    setData((prev) => ({ ...prev, contactoProyectos: [...(prev.contactoProyectos || []), rowToJs(fila)] }));
  };
  const desvincularProyectoContacto = async (vinculoId) => {
    const { error } = await supabase.from("contacto_proyectos").delete().eq("id", vinculoId);
    if (error) { console.error("Error al desvincular proyecto del contacto:", error); alert(mensajeErrorGuardado(error)); return; }
    setData((prev) => ({ ...prev, contactoProyectos: (prev.contactoProyectos || []).filter((v) => v.id !== vinculoId) }));
  };
  // Apartar dinero: registra el aporte en el historial de movimientos del apartado y actualiza
  // el caché de "ahorrado" — nunca se captura el monto ahorrado directamente. No toca Finanzas:
  // apartar no es un egreso, es una transferencia interna entre "bolsas" (secc. 23.13).
  const aportarApartado = async (apartado, { monto }) => {
    const nuevoMontoActual = String((Number(apartado.montoActual) || 0) + Number(monto));
    await addItem("apartadosMovimientos", { apartadoId: apartado.id, tipo: "aporte", monto: String(monto), fecha: todayISO(), concepto: `Aporte a "${apartado.nombre}"` });
    await editItem("apartados", apartado.id, { montoActual: nuevoMontoActual });
  };

  // Retirar dinero: se registra como retiro en el historial del apartado (reduce el caché de
  // "ahorrado") y, cuando el dinero se libera hacia un proyecto o gasto concreto, también se
  // refleja como Ingreso en Finanzas para dejar el rastro de a dónde fue.
  const retirarApartado = async (apartado, { monto, proyectoId, concepto }) => {
    const nuevoMontoActual = String((Number(apartado.montoActual) || 0) - Number(monto));
    await addItem("apartadosMovimientos", { apartadoId: apartado.id, tipo: "retiro", monto: String(monto), fecha: todayISO(), concepto, proyectoId: proyectoId || "" });
    await editItem("apartados", apartado.id, { montoActual: nuevoMontoActual });
    await addItem("finanzas", {
      concepto, tipo: "Ingreso", proyectoId: proyectoId || "", contactoId: "",
      fecha: todayISO(), monto: String(monto), categoria: "Movimiento de apartado",
      forma: "Transferencia", estatus: "Cobrado", pautando: false, esRecurrente: false, frecuencia: "Mensual", fechaFin: "",
    });
  };

  // Recordatorio manual creado desde el botón de acciones rápidas (⚡). No pasa por addItem()
  // porque `recordatorios` no es una tabla que se cargue completa al estado `data` (se consume
  // vía notificaciones/push, no tiene una vista propia de lista todavía) — así que es una
  // inserción directa. El motor-recordatorios (cron cada 5 min) lo recoge solo.
  const onCrearRecordatorio = async ({ titulo, fechaHora }) => {
    const { error } = await supabase.from("recordatorios").insert({
      user_id: activeOwnerId, tipo: "manual", titulo, fecha_hora: fechaHora, recurrencia: "ninguna", prioridad: "normal", estado: "pendiente",
    });
    if (error) { console.error("Error al crear recordatorio:", error); alert("No se pudo guardar el recordatorio."); }
  };

  if (loading || !data) {
    return (
      <div className={`gp-root min-h-screen flex items-center justify-center ${claseTema(tema)}`}>
        <Tokens tema={tema} />
        <p className="gp-text-muted text-sm">Cargando tu sistema…</p>
      </div>
    );
  }

  // Reorganización de navegación (22 sept 2026, documento consolidado secc. 12/22): Citas ya no
  // es pantalla aparte (Agenda ya crea/edita citas directo, ver view==="agenda"), Medicamentos
  // pasa a ser pestaña dentro de Salud (mismo patrón que Ejercicio/Nutrición), "Equipo" se quita
  // (tabla ya desactivada desde el 10-sep, colaboradores es un rol de Contactos, no un módulo),
  // y ya no hay contenedores genéricos "Trabajo"/"Negocio" — Patrimonio y Módulos propios quedan
  // aparte de Dinero, como en la estructura revisada del documento.
  // "Centro de mando" ya no vive dentro de un grupo colapsable — va fijo hasta arriba del
  // sidebar, con ícono de casita, como un botón "Inicio" propio (ver render más abajo, justo
  // antes de navGroupsFiltrados.map). Ajuste 22 sept 2026 sobre la propuesta visual: Agenda,
  // Notas y Atenciones se unen a "Principal"; Eventos pasa al grupo del dinero (son shows/eventos
  // pagados, ligados a Finanzas por su naturaleza).
  const navGroups = [
    { label: "Principal", items: [
      { id: "contactos", label: "Contactos", icon: Contact },
      { id: "agenda", label: "Agenda", icon: CalendarRange },
      { id: "regalos", label: "Atenciones", icon: Gift },
      { id: "proyectos", label: "Proyectos e ideas", icon: FolderKanban },
      { id: "pendientes", label: "Tareas", icon: CheckSquare },
      { id: "notas", label: "Notas", icon: StickyNote },
    ]},
    // El grupo se llama FINANZAS (antes "Dinero") y su primera pantalla se llama Resumen (antes
    // era la que se llamaba "Finanzas"). Movimientos queda a su lado, al mismo nivel: adentro
    // están Ingresos y Egresos, y dentro de cada uno su estado. Decisión de Angel, 4 oct 2026.
    //
    // OJO: el id de la vista del Resumen sigue siendo "finanzas" y el del módulo de deudas
    // "deudas". Lo que cambió es la ETIQUETA, no el id: los ids viajan en los deep links de las
    // notificaciones push y en los permisos de colaborador, y renombrarlos rompería ambos.
    { label: "Finanzas", items: [
      { id: "finanzas", label: "Resumen", icon: BarChart3 },
      { id: "movimientos", label: "Movimientos", icon: ListChecks },
      { id: "deudas", label: "Deudas", icon: AlertTriangle },
      { id: "facturas", label: "Facturas e IVA", icon: Receipt },
      { id: "apartados", label: "Apartados", icon: PiggyBank },
      { id: "presupuesto", label: "Presupuesto", icon: Target },
      { id: "reportes", label: "Reportes", icon: PieChartIcon },
      { id: "estimaciones", label: "Estimaciones", icon: Sparkles },
      { id: "eventos", label: "Eventos", icon: Camera },
    ]},
    { label: "Patrimonio", items: [
      { id: "patrimonio", label: "Patrimonio", icon: Gem },
      { id: "activos", label: "Activos digitales", icon: Globe },
    ]},
    { label: "Módulos", items: [
      { id: "empresas", label: "Mis empresas", icon: Building2 },
      { id: "marketing", label: "Marketing", icon: Megaphone },
      { id: "documentos", label: "Documentos", icon: FileText },
    ]},
    { label: "Personal", items: [
      { id: "mi-perfil", label: "Mi Perfil", icon: User },
      { id: "actividades", label: "Diario", icon: Activity },
      { id: "habitos", label: "Hábitos", icon: Flame },
      { id: "salud", label: "Salud", icon: HeartPulse },
    ]},
  ];

  const ADMIN_UID = "eca7e776-6c96-44eb-b4e0-b03c85fa5bb8";
  const esAdmin = misId === ADMIN_UID && activeOwnerId === misId;

  // Un Cuidador ve Salud/Medicamentos aunque no tenga el módulo completo, si le
  // asignaron al menos una persona a su cargo (dependientesCuidado).
  const esCuidadorSinModuloCompleto = dependientesCuidado.length > 0;
  // "Trabajo" (mi-trabajo/mi-calendario/mis-pagos) es la vista filtrada que ve un colaborador
  // dentro de la cuenta de OTRA persona — nunca aparece para el dueño de la cuenta
  // (modulosPermitidos === null), así que no vive en navGroups: solo se agrega aquí cuando
  // modulosPermitidos !== null, es decir, cuando de verdad se está viendo la cuenta de alguien más.
  const GRUPO_TRABAJO_COLABORADOR = { label: "Trabajo", items: [
    { id: "mi-trabajo", label: "Mi trabajo", icon: CheckSquare },
    { id: "mi-calendario", label: "Mi calendario", icon: CalendarClock },
    { id: "mis-pagos", label: "Mis pagos", icon: Wallet },
  ]};
  const navGroupsFiltrados = modulosPermitidos === null
    ? navGroups
    : [
        GRUPO_TRABAJO_COLABORADOR,
        ...navGroups
          .map((g) => ({ ...g, items: g.items.filter((it) =>
            (VIEW_TO_MODULO[it.id] && modulosPermitidos.includes(VIEW_TO_MODULO[it.id]))
            // "medicamentos" ya no es un id de navGroups (es tab de Salud) — un cuidador sin
            // módulo completo solo necesita ver "salud" para llegar a esa pestaña.
            || (esCuidadorSinModuloCompleto && it.id === "salud")) }))
          .filter((g) => g.items.length > 0),
      ];

  // El onboarding solo se muestra en una cuenta que de verdad acaba de nacer: preferencia sin
  // marcar Y sin un solo dato cargado. Una cuenta con historia jamás debe recibir un wizard de
  // bienvenida por una preferencia que se quedó en false. Desde Configuración se puede abrir a
  // mano en cualquier momento (onboardingForzado).
  const cuentaRecienCreada = !!data && ["proyectos", "contactos", "finanzas", "pendientes", "habitos", "citas", "notas", "empresas"]
    .every((k) => (data[k] || []).length === 0);
  const mostrarOnboarding = !loading && !!data && (onboardingForzado || (!onboardingCompletado && cuentaRecienCreada));

  if (mostrarOnboarding) {
    return (
      <div className={`gp-root ${claseTema(tema)}`} style={{ minHeight: "100vh" }}>
        <Tokens tema={tema} />
        <Suspense fallback={<div style={{ minHeight: "100vh", background: "var(--bg)" }} />}>
          <OnboardingContextos
            catalogo={CONTEXTOS_USO}
            colorPorContexto={COLOR_CONTEXTO_PROYECTO}
            widgetsPorContexto={WIDGETS_POR_CONTEXTO}
            etiquetaWidget={(id) => DASHBOARD_WIDGETS_CATALOGO.find((w) => w.id === id)?.label || id}
            yaConfigurado={onboardingForzado}
            valorInicial={{ contextos, actividadProfesional, empresas: (data.empresas || []).map((e) => ({ id: e.id, nombre: e.nombre, descripcion: e.descripcion || "", logoUrl: e.logoUrl || "" })) }}
            onTerminar={(v) => guardarContextos({ ...v, aplicarWidgets: !onboardingForzado })}
            onSaltar={onboardingForzado ? () => setOnboardingForzado(false) : saltarOnboarding}
          />
        </Suspense>
      </div>
    );
  }

  return (
    <div className={`gp-root overflow-hidden ${claseTema(tema)}`} style={{ minHeight: "100vh" }}>
      <Tokens tema={tema} />
      <div className="flex relative" style={{ minHeight: "100vh" }}>
        {/* barra superior solo en móvil — padding extra arriba/lados para no quedar tapada
            por el notch/isla dinámica ni el reloj cuando la app corre "standalone" (instalada) */}
        <div
          className="md:hidden fixed top-0 left-0 right-0 z-30 grid items-center px-4 pb-3 border-b gp-border"
          style={{
            background: "var(--bg)",
            gridTemplateColumns: "1fr auto 1fr",
            paddingTop: "calc(env(safe-area-inset-top) + 12px)",
            paddingLeft: "calc(env(safe-area-inset-left) + 16px)",
            paddingRight: "calc(env(safe-area-inset-right) + 16px)",
          }}
        >
          <button onClick={() => setMobileNavOpen(true)} className="p-2 -ml-2 gp-btn-ghost rounded justify-self-start" aria-label="Abrir menú">
            <Menu size={20} />
          </button>
          {/* El icono siempre queda centrado en la columna del medio (1fr auto 1fr), sin
              importar cuántos controles haya a los lados ni qué tan anchos sean. */}
          <img src="/icono-arkeyone.png" alt="ArkeyOne" style={{ height: 36 }} className="justify-self-center" />
          <div className="flex items-center gap-1 justify-self-end">
            <button onClick={() => setBusquedaAbierta(true)} className="p-2 gp-btn-ghost rounded" aria-label="Buscar">
              <Search size={18} />
            </button>
          </div>
        </div>

        {/* fondo oscuro al abrir el cajón en móvil */}
        {mobileNavOpen && (
          <div className="md:hidden fixed inset-0 z-40" style={{ background: "rgba(0,0,0,.6)" }} onClick={() => setMobileNavOpen(false)} />
        )}

        {/* rail lateral / cajón */}
        <div
          className={`w-64 ${sidebarColapsado ? "md:w-20" : "md:w-56"} shrink-0 p-4 flex flex-col overflow-y-auto gp-scroll fixed md:static inset-y-0 left-0 z-50 md:z-auto transition-all duration-200 ${mobileNavOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}`}
          style={{ maxHeight: "100vh", background: "var(--sidebar-bg)", borderRight: "1px solid var(--sidebar-borde)" }}
        >
          <div className="px-2 flex flex-col items-center text-center gap-1 relative" style={{ paddingTop: "calc(env(safe-area-inset-top) + 4px)" }}>
            <button onClick={() => setMobileNavOpen(false)} className="md:hidden absolute right-0 p-1 gp-btn-ghost rounded" style={{ top: "calc(env(safe-area-inset-top) + 4px)" }} aria-label="Cerrar menú"><X size={16} /></button>
            <button
              onClick={toggleSidebarColapsado}
              title={sidebarColapsado ? "Fijar menú abierto" : "Colapsar menú"}
              className="hidden md:inline-flex absolute -right-2 top-0 p-1 gp-btn-ghost rounded"
            >
              {sidebarColapsado ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
            </button>
            {/* El logotipo tiene la "A" en navy (#031E4A) y sobre el menú oscuro (#0B2341) queda
                en 1.03:1 de contraste: literalmente invisible. En vez de recolorear el logo —que
                la guía de marca prohíbe— se le pone detrás el fondo blanco para el que fue
                diseñado. En tema claro el menú ya es blanco, así que la placa no se nota.
                Elegido por Angel el 1 oct 2026 (opción "A · con placa"). */}
            <span className="gp-placa-logo inline-flex items-center justify-center">
              <img src="/icono-arkeyone.png" alt="ARKEY·ONE" style={{ height: 34, display: "block" }} />
            </span>
            {/* El nombre va con punto medio, igual que el lockup de la pantalla de login. */}
            <span className={`gp-serif text-lg font-semibold ${sidebarColapsado ? "md:hidden" : ""}`} style={{ letterSpacing: "0.3px" }}>ARKEY·ONE</span>
          </div>

          {/* ZONA 2 — acciones fijas: lo que se usa desde cualquier pantalla. Va separada de la
              marca y de la navegación por bastante más aire que el que hay dentro de cada zona
              (28 contra 6): eso es lo que hace que se lean como tres bloques y no como una lista
              corrida (distribución "A · tres zonas", elegida por Angel el 1 oct 2026). */}
          <div className="mt-7 flex flex-col gap-1.5">
            <button
              onClick={() => setBusquedaAbierta(true)}
              title="Buscar en todo ARKEYONE"
              className={`gp-input gp-buscador hidden md:flex items-center gap-2 px-3 py-2 text-left ${sidebarColapsado ? "md:justify-center md:px-0" : ""}`}
            >
              <Search size={16} className="shrink-0" />
              {/* Con texto, no solo el ícono: así se lee como campo de búsqueda y no como un
                  botón más del menú. Colapsado se queda solo la lupa. */}
              <span className={`gp-text-muted ${sidebarColapsado ? "md:hidden" : ""}`}>Buscar…</span>
            </button>

          {misColaboraciones.length > 0 && (
            <div className={`${sidebarColapsado ? "md:hidden" : ""}`}>
              <select
                className="gp-input text-xs w-full"
                value={activeOwnerId}
                onChange={(e) => {
                  if (e.target.value === misId) cambiarCuenta(misId, miEmail, null);
                  else {
                    const c = misColaboraciones.find((x) => x.propietarioId === e.target.value);
                    cambiarCuenta(c.propietarioId, c.propietarioEmail, c.modulos, c.dependientes);
                  }
                }}
              >
                <option value={misId}>Mi cuenta</option>
                {misColaboraciones.map((c) => (
                  <option key={c.propietarioId} value={c.propietarioId}>Cuenta de {c.propietarioEmail}</option>
                ))}
              </select>
            </div>
          )}

          {/* Centro de mando: fijo hasta arriba, fuera de cualquier grupo colapsable (propuesta
              visual 22 sept 2026) — ícono de casita en vez del de dashboard. Oculto para un
              colaborador viendo la cuenta de otra persona (modulosPermitidos !== null), igual
              que antes cuando vivía dentro de un grupo filtrado — ver GRUPO_TRABAJO_COLABORADOR. */}
          {modulosPermitidos === null && (
            <button
              onClick={() => { irAVista("dashboard"); setMobileNavOpen(false); }}
              title="Centro de mando"
              className={`gp-navitem flex items-center gap-2 px-3 py-2.5 md:py-2 text-[15px] text-left w-full ${sidebarColapsado ? "md:justify-center md:px-2" : ""} ${view === "dashboard" ? "gp-navitem-active" : ""}`}
            >
              <Home size={15} /> <span className={sidebarColapsado ? "md:hidden" : ""}>Centro de mando</span>
            </button>
          )}
          </div>

          {/* ZONA 3 — navegación */}
          <div className="mt-7 flex flex-col">

          {navGroupsFiltrados.map((g) => {
            const cerrado = grupoEstaCerrado(g.label);
            const mostrarItems = (sidebarColapsado && esEscritorio) || !cerrado;
            const itemsOrdenados = ordenarItemsGrupo(g.label, g.items);
            return (
              <div key={g.label} className="gp-nav-grupo">
                <button
                  onClick={() => toggleGrupo(g.label)}
                  className={`gp-nav-titulo w-full flex items-center justify-between px-3 mb-1 text-xs gp-text-muted gp-btn-ghost rounded py-1 uppercase ${sidebarColapsado ? "md:hidden" : ""}`}
                >
                  <span>{g.label}</span>
                  {!cerrado ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                </button>
                {mostrarItems && (
                  <div className="flex flex-col gap-0.5">
                    {itemsOrdenados.map((n) => (
                      <button
                        key={n.id}
                        onClick={() => { irAVista(n.id); setMobileNavOpen(false); }}
                        title={n.label}
                        draggable={!sidebarColapsado && itemsOrdenados.length > 1}
                        onDragStart={(e) => { e.dataTransfer.effectAllowed = "move"; setDragNav({ grupo: g.label, id: n.id }); }}
                        onDragEnter={() => { if (dragNav && dragNav.grupo === g.label) setDragNavSobre(n.id); }}
                        onDragOver={(e) => { if (dragNav && dragNav.grupo === g.label) e.preventDefault(); }}
                        onDrop={(e) => {
                          e.preventDefault();
                          if (dragNav && dragNav.grupo === g.label) moverItemNav(g.label, itemsOrdenados, dragNav.id, n.id);
                          setDragNav(null); setDragNavSobre(null);
                        }}
                        onDragEnd={() => { setDragNav(null); setDragNavSobre(null); }}
                        className={`gp-navitem flex items-center gap-2 px-3 py-2.5 md:py-2 text-[15px] text-left ${sidebarColapsado ? "md:justify-center md:px-2" : ""} ${view === n.id ? "gp-navitem-active" : ""} ${dragNav && dragNav.id === n.id ? "opacity-40" : ""} ${dragNavSobre === n.id && dragNav && dragNav.id !== n.id ? "gp-navitem-drop" : ""}`}
                      >
                        <n.icon size={15} /> <span className={sidebarColapsado ? "md:hidden" : ""}>{n.label}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
          </div>

          {/* ZONA 4 — sistema y datos de la cuenta. Aquí bajaron el correo y el número de commit:
              arriba competían con el logo, y este es el bloque al que uno viene cuando le importa
              "de quién es esta cuenta" o "qué versión traigo". */}
          <div className="gp-nav-separador mt-auto pt-2 flex flex-col gap-0.5">
            <p className={`gp-nav-titulo px-3 mb-1 text-xs gp-text-muted uppercase ${sidebarColapsado ? "md:hidden" : ""}`}>Sistema</p>
            <button onClick={() => { setNotifPanelAbierto(true); setMobileNavOpen(false); }} title="Notificaciones"
              className={`gp-navitem flex items-center gap-2 px-3 py-2.5 md:py-2 text-[15px] text-left w-full relative ${sidebarColapsado ? "md:justify-center md:px-2" : ""}`}>
              <Bell size={15} />
              <span className={sidebarColapsado ? "md:hidden" : ""}>Notificaciones{notifNoLeidas > 0 ? ` (${notifNoLeidas})` : ""}</span>
              {notifNoLeidas > 0 && <span className="w-2 h-2 rounded-full absolute" style={{ background: "var(--red)", top: 8, left: sidebarColapsado ? 24 : 14 }} />}
            </button>
            <button onClick={() => { irAVista("configuracion"); setMobileNavOpen(false); }} title="Configuración"
              className={`gp-navitem flex items-center gap-2 px-3 py-2.5 md:py-2 text-[15px] text-left w-full ${sidebarColapsado ? "md:justify-center md:px-2" : ""} ${view === "configuracion" ? "gp-navitem-active" : ""}`}>
              <Settings size={15} /> <span className={sidebarColapsado ? "md:hidden" : ""}>Configuración</span>
            </button>
            <button onClick={cerrarSesion} disabled={cerrandoSesion} title="Cerrar sesión"
              className={`gp-navitem flex items-center gap-2 px-3 py-2.5 md:py-2 text-[15px] text-left w-full ${sidebarColapsado ? "md:justify-center md:px-2" : ""}`}
              style={cerrandoSesion ? { opacity: 0.6 } : undefined}>
              <LogOut size={15} /> <span className={sidebarColapsado ? "md:hidden" : ""}>{cerrandoSesion ? "Cerrando sesión…" : "Cerrar sesión"}</span>
            </button>
            {/* El correo salió de aquí (Angel, 1 oct 2026). Cuando se está viendo la cuenta de
                otra persona eso lo sigue diciendo el selector de cuenta de arriba, que es donde
                de verdad importa. */}
            {/* Temporal, mientras depuramos los bugs de voz en Android/iOS: confirma de un
                vistazo si un dispositivo ya cargó el último deploy. Quitar cuando ya no haga falta. */}
            <p className={`text-[10px] gp-text-muted px-3 pt-1.5 ${sidebarColapsado ? "md:hidden" : ""}`}>commit {__COMMIT_HASH__}</p>
          </div>
        </div>

        {pendientesParaAvisar && (
          <AvisoPendientesOffline
            pendientes={pendientesParaAvisar}
            onActualizar={resolverPendientesActualizar}
            onGuardarComoNotas={resolverPendientesComoNotas}
            onEliminar={resolverPendientesEliminar}
            onCerrar={() => setPendientesParaAvisar(null)}
          />
        )}

        {/* contenido */}
        <div
          ref={contenidoRef}
          onTouchStart={onTouchStartContenido}
          onTouchMove={onTouchMoveContenido}
          onTouchEnd={onTouchEndContenido}
          className="flex-1 p-4 pt-[calc(env(safe-area-inset-top)+4.75rem)] pb-[calc(env(safe-area-inset-bottom)+4.5rem)] md:p-6 md:pt-6 md:pb-6 overflow-y-auto gp-scroll w-full"
          style={{ maxHeight: "100vh" }}
        >
          {(pullDist > 0 || refrescando) && (
            <div
              className="flex items-center justify-center text-xs gp-text-muted"
              style={{ height: refrescando ? 32 : pullDist, overflow: "hidden", transition: refrescando ? "height .15s" : "none" }}
            >
              {refrescando ? "Actualizando…" : pullDist > 60 ? "Suelta para actualizar ↓" : "Desliza hacia abajo para actualizar…"}
            </div>
          )}
          {view !== "dashboard" && (
            <BotonRegresar onRegresar={() => (historialVistas.length > 0 ? volverA(historialVistas.length - 1) : irAInicioDesdeBreadcrumb())} />
          )}
          {/* Una sola frontera para TODAS las vistas, en vez de un <Suspense> por módulo perezoso:
              así cada módulo que se vuelva perezoso de aquí en adelante solo agrega su propia línea
              y nadie tiene que volver a tocar esta estructura. Las ramas de abajo no se re-indentaron
              a propósito —el diff quedaría de 280 líneas y taparía el cambio real— y a JSX le da
              igual la sangría. El fallback va fuera del área con scroll para que no la haga saltar. */}
          <Suspense fallback={<p className="text-sm gp-text-muted p-1">Cargando…</p>}>
          {view === "dashboard" && (
            <Dashboard
              data={data}
              setView={irAVista}
              onAddSaldo={(i) => addItem("saldoInicial", i)}
              onVerProyecto={irADetalleProyecto}
              onEditPendiente={(id, p) => editItem("pendientes", id, p)}
              sensibleDesbloqueadoHasta={sensibleDesbloqueadoHasta}
              onDesbloquear={desbloquearSensibleAqui}
              miEmail={nombreMostrar || miEmail}
              notifNoLeidas={notifNoLeidas}
              onBuscar={() => setBusquedaAbierta(true)}
              onNotificaciones={() => setNotifPanelAbierto(true)}
              onAddNota={(i) => addItem("notas", i)}
              onEditHabito={(id, p) => editItem("habitos", id, p)}
              modulosPermitidos={modulosPermitidos}
              onCrearRapido={irACrear}
              ordenWidgetsDashboard={ordenWidgetsDashboard}
              onGuardarOrdenWidgets={guardarOrdenWidgetsDashboard}
              empresas={data.empresas || []}
              contextos={contextos}
              contextoActivo={contextoActivo}
              onContextoActivo={setContextoActivo}
              avatarUrl={avatarUrl}
              onAbrirConfiguracion={() => irAVista("configuracion")}
              onCerrarSesion={cerrarSesion}
              presupuestoMensual={presupuestoMensual}
              onGuardarPresupuestoMensual={guardarPresupuestoMensual}
              ciudad={ciudad}
              climaLat={climaLat}
              climaLon={climaLon}
            />
          )}
          {view === "papelera" && <Papelera onRestore={restoreItem} onPermanentDelete={permanentDelete} ownerId={activeOwnerId} />}
          {view === "colaboradores" && <Colaboradores misId={misId} miEmail={miEmail} contactos={data.contactos} />}
          {view === "admin" && <AdminUsuarios adminUid={ADMIN_UID} adminEmail={miEmail} />}
          {view === "configuracion" && (
            <Configuracion
              tema={tema}
              onAbrirTema={() => setTemaModalAbierto(true)}
              onAbrirExportar={() => setExportPaso("confirmar")}
              onAbrirMfa={() => setMfaModalAbierto(true)}
              alertasCorreoActivas={alertasCorreoActivas}
              cambiarAlertasCorreo={cambiarAlertasCorreo}
              pushEstado={pushEstado}
              activarPush={activarPush}
              desactivarPush={desactivarPush}
              esPropia={activeOwnerId === misId}
              irAColaboradores={() => irAVista("colaboradores")}
              irAPapelera={() => irAVista("papelera")}
              esAdmin={esAdmin}
              irAAdmin={() => irAVista("admin")}
              miEmail={miEmail}
              notifTiposDesactivados={notifTiposDesactivados}
              notifSilencioActivo={notifSilencioActivo}
              notifSilencioInicio={notifSilencioInicio}
              notifSilencioFin={notifSilencioFin}
              notifAnticipacionCitasMin={notifAnticipacionCitasMin}
              guardarPreferenciasNotif={guardarPreferenciasNotif}
              nombreMostrar={nombreMostrar}
              guardarNombreMostrar={guardarNombreMostrar}
              avatarUrl={avatarUrl}
              subirAvatar={subirAvatar}
              ciudad={ciudad}
              guardarCiudad={guardarCiudad}
              contextos={contextos}
              actividadProfesional={actividadProfesional}
              onAbrirContextos={() => setOnboardingForzado(true)}
            />
          )}
          {view === "empresas" && (
            <MisEmpresas data={data}
              onAdd={(i) => addItem("empresas", i)} onEdit={(id, e) => editItem("empresas", id, e)} onRemove={(id) => askDelete("empresas", id)}
              onVerProyecto={irADetalleProyecto} onIrAVista={irAVista} />
          )}
          {view === "proyectos" && (
            <Proyectos
              data={data}
              onAdd={(i) => addItem("proyectos", i)} onEdit={(id, p) => editItem("proyectos", id, p)} onRemove={(id) => askDelete("proyectos", id)}
              onAddComentario={(i) => addItem("comentarios", i)} onRemoveComentario={(id) => askDelete("comentarios", id)}
              onAddTarea={(i) => addItem("pendientes", i)} onEditTarea={(id, t) => editItem("pendientes", id, t)}
              onAddFinanzas={(i) => addItem("finanzas", i)}
              onAddPresupuesto={(i) => addItem("presupuestos", i)} onEditPresupuesto={(id, x) => editItem("presupuestos", id, x)}
              onVerDetalle={irACentroProyecto}
              onVincularContacto={vincularProyectoContacto} onDesvincularContacto={desvincularProyectoContacto}
              onIrAVista={irAVista} onVerTareasDeProyecto={irATareasDeProyecto} onVerContacto={irAFichaContacto}
              onCrearContacto={crearContactoRapido} onEnviarInvitacion={enviarInvitacionTarea} onAceptarEnNombre={aceptarTareaEnNombre}
              sensibleDesbloqueadoHasta={sensibleDesbloqueadoHasta} onDesbloquear={desbloquearSensibleAqui}
              miNombre={nombreMostrar || miEmail} miAvatarUrl={avatarUrl}
              proyectoSel={proyectoSelId} onSeleccionar={(id) => { setProyectoSelId(id); setProyectoSelTab("resumen"); }}
              fichaTab={proyectoSelTab} onFichaTab={setProyectoSelTab}
              crearAlEntrar={accionRapidaCrear?.modulo === "proyectos" ? accionRapidaCrear : null} onConsumirCrearAlEntrar={consumirAccionRapidaCrear}
            />
          )}
          {view === "proyecto-detalle" && (
            <ProyectoDetalle
              data={data}
              proyectoId={proyectoDetalleId}
              onVolver={() => { setProyectoSelId(proyectoDetalleId); setProyectoSelTab("resumen"); irAVista("proyectos"); }}
              onAddTarea={(i) => addItem("pendientes", i)}
              onEditTarea={(id, p) => editItem("pendientes", id, p)}
              onEditProyecto={(id, patch) => editItem("proyectos", id, patch)}
              onRemoveTarea={(id, extraIds, mensaje) => askDelete("pendientes", id, { extraIds, mensaje })}
              onAddComentario={(i) => addItem("comentarios", i)}
              onRemoveComentario={(id) => askDelete("comentarios", id)}
              onAddMeta={(i) => addItem("metas", i)}
              onEditMeta={(id, p) => editItem("metas", id, p)}
              onRemoveMeta={(id) => askDelete("metas", id)}
              onIrAVista={irAVista}
              sensibleDesbloqueadoHasta={sensibleDesbloqueadoHasta}
              onDesbloquear={desbloquearSensibleAqui}
              onCrearContacto={crearContactoRapido}
              onEnviarInvitacion={enviarInvitacionTarea}
              onAceptarEnNombre={aceptarTareaEnNombre}
            />
          )}
          {view === "pendientes" && (
            <Pendientes data={data} activeOwnerId={activeOwnerId} onAdd={(i) => addItem("pendientes", i)} onEdit={(id, p) => editItem("pendientes", id, p)} onRemove={(id, extraIds, mensaje) => askDelete("pendientes", id, { extraIds, mensaje })} onAddComentario={(i) => addItem("comentarios", i)} onRemoveComentario={(id) => askDelete("comentarios", id)}
              filtroProyectoInicial={pendientesFiltroProyecto} onConsumirFiltroProyecto={() => setPendientesFiltroProyecto("")}
              onCrearProyecto={crearProyectoRapido}
              onEditProyecto={(id, patch) => editItem("proyectos", id, patch)}
              onCrearContacto={crearContactoRapido}
              onEnviarInvitacion={enviarInvitacionTarea}
              onAceptarEnNombre={aceptarTareaEnNombre}
              onAsignar={notificarAsignacionTarea}
              crearAlEntrar={accionRapidaCrear?.modulo === "pendientes" ? accionRapidaCrear : null}
              onConsumirCrearAlEntrar={consumirAccionRapidaCrear}
            />
          )}
          {/* Resumen (id "finanzas"), Movimientos y Facturas e IVA: tres pantallas del grupo
              FINANZAS, todas sobre la misma tabla. */}
          {view === "finanzas" && (
            <FinanzasResumen
              data={data}
              onAdd={(i) => addItem("finanzas", i)} onEdit={(id, p) => editItem("finanzas", id, p)}
              onVerMovimientos={(grupo, sub) => { setMovimientosFoco({ grupo, sub }); irAVista("movimientos"); }}
              crearAlEntrar={accionRapidaCrear?.modulo === "finanzas" ? accionRapidaCrear : null}
              onConsumirCrearAlEntrar={consumirAccionRapidaCrear}
            />
          )}
          {view === "movimientos" && (
            <FinanzasMovimientos
              data={data}
              onAdd={(i) => addItem("finanzas", i)} onEdit={(id, p) => editItem("finanzas", id, p)} onRemove={(id) => askDelete("finanzas", id)}
              onAddPago={(i) => addItem("pagosFinanzas", i)}
              foco={movimientosFoco} onConsumirFoco={() => setMovimientosFoco(null)}
              onIrAVista={irAVista}
              crearAlEntrar={accionRapidaCrear?.modulo === "finanzas" ? accionRapidaCrear : null}
              onConsumirCrearAlEntrar={consumirAccionRapidaCrear}
            />
          )}
          {view === "facturas" && (
            <Facturas
              data={data}
              onAdd={(i) => addItem("facturas", i)} onEdit={(id, p) => editItem("facturas", id, p)} onRemove={(id) => askDelete("facturas", id)}
              onAddComentario={(i) => addItem("comentarios", i)} onRemoveComentario={(id) => askDelete("comentarios", id)}
              onAddFinanzas={(i) => addItem("finanzas", i)}
            />
          )}
          {view === "reportes" && <Reportes data={data} />}
          {view === "estimaciones" && <Estimaciones data={data} />}
          {view === "deudas" && (
            <Deudas data={data} onAddFinanzas={(i) => addItem("finanzas", i)} onEditFinanzas={(id, p) => editItem("finanzas", id, p)} onRemoveFinanzas={(id) => askDelete("finanzas", id)} onAddPago={(i) => addItem("pagosFinanzas", i)} onCrearTarea={(t) => addItem("pendientes", t)} onAddComentario={(i) => addItem("comentarios", i)} />
          )}
          {view === "apartados" && (
            <Apartados data={data} onAdd={(i) => addItem("apartados", i)} onEdit={(id, p) => editItem("apartados", id, p)} onRemove={(id) => askDelete("apartados", id)} onAportar={aportarApartado} onRetirar={retirarApartado} />
          )}
          {view === "patrimonio" && (
            <Patrimonio data={data} onAdd={(i) => addItem("patrimonio", i)} onEdit={(id, p) => editItem("patrimonio", id, p)} onRemove={(id) => askDelete("patrimonio", id)} onAddValuacion={(i) => addItem("patrimonioValuaciones", i)} onRemoveValuacion={(id) => askDelete("patrimonioValuaciones", id)} onAddComentario={(i) => addItem("comentarios", i)} onRemoveComentario={(id) => askDelete("comentarios", id)} />
          )}
          {view === "documentos" && (
            <Documentos data={data} onAdd={(i) => addItem("documentos", i)} onEdit={(id, p) => editItem("documentos", id, p)} onRemove={(id) => askDelete("documentos", id)} onCrearTarea={(t) => addItem("pendientes", t)} />
          )}
          {view === "presupuesto" && (
            <Presupuesto data={data} onAdd={(i) => addItem("presupuestos", i)} onEdit={(id, p) => editItem("presupuestos", id, p)} onRemove={(id) => askDelete("presupuestos", id)}
              presupuestoMensual={presupuestoMensual} onGuardarPresupuestoMensual={guardarPresupuestoMensual} />
          )}
          {view === "mi-perfil" && (
            <MiPerfil
              nombreMostrar={nombreMostrar || miEmail} avatarUrl={avatarUrl} ciudad={ciudad}
              bio={perfilBio} estudios={perfilEstudios} habilidades={perfilHabilidades} redes={perfilRedes}
              onGuardar={guardarPerfil}
            />
          )}
          {view === "equipo" && (
            <Equipo data={data}
              onAddContacto={(i) => addItem("contactos", i)}
              onEditContacto={(id, p) => editItem("contactos", id, p)}
              onAddFinanzas={(i) => addItem("finanzas", i)}
              onAddFactura={(i) => addItem("facturas", i)}
              onVincularProyecto={vincularProyectoContacto} onDesvincularProyecto={desvincularProyectoContacto}
            />
          )}
          {view === "contactos" && (
            <Contactos data={data} onAdd={(i) => addItem("contactos", i)} onEdit={(id, p) => editItem("contactos", id, p)} onRemove={(id) => askDelete("contactos", id)} onAddComentario={(i) => addItem("comentarios", i)} onRemoveComentario={(id) => askDelete("comentarios", id)} onVerRegalos={(c) => { setRegalosFiltroContacto(c.id); setView("regalos"); }}
              onVincularProyecto={vincularProyectoContacto} onDesvincularProyecto={desvincularProyectoContacto}
              onAddNota={(i) => addItem("notas", i)} onAddCita={(i) => addItem("citas", i)} onIrAVista={irAVista}
              onAddEvento={(i) => addItem("eventos", i)}
              onVerProyecto={irADetalleProyecto}
              contactoSel={contactoSelId} onSeleccionar={(id) => { setContactoSelId(id); setContactoSelTab("informacion"); }}
              fichaTab={contactoSelTab} onFichaTab={setContactoSelTab} />
          )}
          {view === "regalos" && (
            <Regalos data={data} onAdd={(i) => addItem("regalos", i)} onEdit={(id, p) => editItem("regalos", id, p)} onRemove={(id) => askDelete("regalos", id)}
              filtroContactoInicial={regalosFiltroContacto} onLimpiarFiltro={() => setRegalosFiltroContacto("")}
              onVerContacto={irAFichaContacto}
              onAddNota={(i) => addItem("notas", i)} onAddCita={(i) => addItem("citas", i)} onAddEvento={(i) => addItem("eventos", i)}
              onAddComentario={(i) => addItem("comentarios", i)} onCrearContacto={crearContactoRapido}
              onIrAVista={irAVista} onVerProyecto={irADetalleProyecto} />
          )}
          {(view === "marketing" || view === "redes") && (
            <MarketingYRedes
              key={view}
              data={data}
              tabInicial={view === "redes" ? "redes" : "campanas"}
              marketingProps={{ onAdd: (i) => addItem("campanas", i), onEdit: (id, p) => editItem("campanas", id, p), onRemove: (id) => askDelete("campanas", id), onAddComentario: (i) => addItem("comentarios", i), onRemoveComentario: (id) => askDelete("comentarios", id), onAddActividad: (i) => addItem("campanaActividades", i), onEditActividad: (id, p) => editItem("campanaActividades", id, p), onRemoveActividad: (id) => askDelete("campanaActividades", id), onAddFinanzas: (i) => addItem("finanzas", i) }}
              redesProps={{ onAdd: (i) => addItem("redesMetricas", i), onEdit: (id, p) => editItem("redesMetricas", id, p), onRemove: (id) => askDelete("redesMetricas", id) }}
            />
          )}
          {view === "actividades" && (
            <Actividades data={data} onAdd={(i) => addItem("actividades", i)} onEdit={(id, p) => editItem("actividades", id, p)} onRemove={(id) => askDelete("actividades", id)} />
          )}
          {view === "eventos" && (
            <Eventos data={data}
              onAdd={async (i) => { const id = i.id || uid(); await addItem("eventos", { ...i, id }); await sincronizarFinanzasDeEvento({ ...i, id }); }}
              onEdit={async (id, p) => { await editItem("eventos", id, p); const actual = data.eventos.find((e) => e.id === id); await sincronizarFinanzasDeEvento({ ...actual, ...p, id }); }}
              onRemove={(id) => askDelete("eventos", id)}
              onAddComentario={(i) => addItem("comentarios", i)} onRemoveComentario={(id) => askDelete("comentarios", id)} />
          )}
          {view === "habitos" && (
            <Habitos data={data} onAdd={(i) => addItem("habitos", i)} onEdit={(id, p) => editItem("habitos", id, p)} onRemove={(id) => askDelete("habitos", id)} />
          )}
          {view === "salud" && (
            <Salud data={data} onAdd={(i) => addItem("salud", i)} onEdit={(id, p) => editItem("salud", id, p)} onRemove={(id) => askDelete("salud", id)} onUpdatePerfil={updatePerfilSalud} soloCuidado={esCuidadorSinModuloCompleto} onAddGenerico={addItem} onEditGenerico={editItem} onRemoveGenerico={askDelete}
              crearAlEntrar={accionRapidaCrear?.modulo === "salud" ? accionRapidaCrear : null} onConsumirCrearAlEntrar={consumirAccionRapidaCrear} />
          )}
          {view === "mi-trabajo" && <MiTrabajo misId={misId} />}
          {view === "mi-calendario" && <MiCalendario misId={misId} />}
          {view === "mis-pagos" && <MisPagos misId={misId} miEmail={miEmail} misColaboraciones={misColaboraciones} />}
          {view === "medicamentos" && (
            <Medicamentos data={data} onAdd={(i) => addItem("medicamentos", i)} onEdit={(id, p) => editItem("medicamentos", id, p)} onRemove={(id) => askDelete("medicamentos", id)} soloCuidado={esCuidadorSinModuloCompleto} />
          )}
          {view === "activos" && (
            <ActivosDigitales data={data}
              onAdd={async (i) => { const id = i.id || uid(); await addItem("activos", { ...i, id }); await sincronizarFinanzasDeActivo({ ...i, id }); }}
              onEdit={async (id, p) => { await editItem("activos", id, p); const actual = data.activos.find((a) => a.id === id); await sincronizarFinanzasDeActivo({ ...actual, ...p, id }); }}
              onRemove={(id) => askDelete("activos", id)} onCrearTarea={(t) => addItem("pendientes", t)} />
          )}
          {view === "agenda" && (
            <Agenda data={data} misId={misId}
              onEditPendiente={(id, p) => editItem("pendientes", id, p)}
              onAddPendiente={(t) => addItem("pendientes", t)}
              onAddCita={(c) => addItem("citas", c)}
              onRemoveCita={(id) => askDelete("citas", id)}
              onRemovePendiente={(id) => askDelete("pendientes", id)}
              onCrearContacto={(nombre, tipos) => crearContactoRapido(nombre, tipos)}
              onCrearProyecto={crearProyectoRapido}
              onEnviarInvitacion={enviarInvitacionTarea}
              onAceptarEnNombre={aceptarTareaEnNombre}
              onAsignar={notificarAsignacionTarea}
              onAbrirOrigen={(tabla, id) => {
                // No duplica el dato: lleva al registro real que generó la tarea. Proyecto y
                // contacto abren su ficha exacta; el resto usa el mismo deep link que ya usan
                // las notificaciones push (llega al módulo correspondiente).
                if (tabla === "proyectos" && id) irACentroProyecto(id);
                else if (tabla === "contactos" && id) irAFichaContacto(id);
                else irADeepLink(tabla);
              }}
              onEditCita={async (id, p) => {
                await editItem("citas", id, p);
                // Etapa 6 (Agenda interactiva, secc. 23.6): "al mover una tarea deben actualizarse
                // automáticamente ... los recordatorios relacionados". Si cambió la hora, se borra
                // el recordatorio ya disparado (si existía) para que el motor lo vuelva a evaluar
                // y avise en el horario nuevo, en vez de quedarse callado por haber avisado antes.
                if (p.fechaHora) await supabase.from("recordatorios").delete().eq("tabla_origen", "citas").eq("registro_origen_id", id);
              }}
            />
          )}
          {view === "notas" && (
            <Notas data={data} ownerId={activeOwnerId} onAdd={(i) => addItem("notas", i)} onEdit={(id, p) => editItem("notas", id, p)} onRemove={(id) => askDelete("notas", id)}
              onAddComentario={(i) => addItem("comentarios", i)} />
          )}
          </Suspense>
        </div>
      </div>

      <BottomNav view={view} setView={irAVista} onAbrirMas={() => setMobileNavOpen(true)} />

      {contactoRapido && (
        <ContactoRapidoModal
          nombreTecleado={contactoRapido.nombre}
          onCerrar={() => setContactoRapido(null)}
          onGuardar={(campos) => { editItem("contactos", contactoRapido.id, campos); setContactoRapido(null); }}
        />
      )}

      <QuickCapture data={data} onAdd={addItem} onCrearRecordatorio={onCrearRecordatorio} irAVista={irAVista} />
      <VoiceMode
        contextoPantalla={
          view === "proyecto-detalle" && proyectoDetalleId ? { modulo: "proyectos", entidad_id: proyectoDetalleId }
          : view === "proyectos" && proyectoSelId ? { modulo: "proyectos", entidad_id: proyectoSelId }
          : (view && view !== "dashboard" ? { modulo: view } : null)
        }
        onDatosCreados={recargarModulos}
        nombreUsuario={nombreMostrar || miEmail}
      />
      {busquedaAbierta && <BusquedaGlobal data={data} onNavigate={buscarNavegarA} onClose={() => setBusquedaAbierta(false)} />}

      {confirmDelete && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,.6)" }} onClick={() => setConfirmDelete(null)}>
          <div className="gp-panel w-full max-w-sm p-5" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle size={16} className="gp-text-red" />
              <h3 className="gp-serif text-lg">¿Eliminar esto?</h3>
            </div>
            <p className="text-sm gp-text-muted mb-5">{confirmDelete.mensaje || "Esta acción no se puede deshacer."}</p>
            <div className="flex gap-2">
              <button onClick={() => setConfirmDelete(null)} className="gp-btn-ghost flex-1 py-2 text-sm">Cancelar</button>
              <button
                onClick={() => {
                  if (confirmDelete.key === "eventos") {
                    const espejo = data.finanzas.find((f) => f.eventoId === confirmDelete.id);
                    if (espejo) removeItem("finanzas", espejo.id);
                  }
                  if (confirmDelete.key === "activos") {
                    const espejo = data.finanzas.find((f) => f.activoId === confirmDelete.id);
                    if (espejo) removeItem("finanzas", espejo.id);
                  }
                  // Borrado suave (deleted_at) — el "on delete cascade" de la base de datos solo
                  // aplica a borrados definitivos, así que los hijos se borran aparte aquí.
                  if (confirmDelete.key === "rutinasEjercicio") {
                    const hijos = data.rutinaEjercicioItems.filter((it) => it.rutinaId === confirmDelete.id).map((it) => it.id);
                    if (hijos.length) removeItem("rutinaEjercicioItems", hijos[0], hijos.slice(1));
                  }
                  if (confirmDelete.key === "sesionesEjercicio") {
                    const hijos = data.sesionEjercicioItems.filter((it) => it.sesionId === confirmDelete.id).map((it) => it.id);
                    if (hijos.length) removeItem("sesionEjercicioItems", hijos[0], hijos.slice(1));
                  }
                  removeItem(confirmDelete.key, confirmDelete.id, confirmDelete.extraIds || []);
                  setConfirmDelete(null);
                }}
                className="flex-1 py-2 text-sm rounded"
                style={{ background: "var(--red)", color: "#fff" }}
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
      {exportPaso === "confirmar" && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,.6)" }} onClick={() => setExportPaso(null)}>
          <div className="gp-panel w-full max-w-sm p-5" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-2 mb-2">
              <Download size={16} className="gp-text-gold" />
              <h3 className="gp-serif text-lg">¿Exportar tus datos?</h3>
            </div>
            <p className="text-sm gp-text-muted mb-5">Se va a descargar un archivo de Excel (.xlsx) con toda la información de {activeOwnerId === misId ? "tu cuenta" : `la cuenta de ${activeOwnerEmail}`}.</p>
            <div className="flex gap-2">
              <button onClick={() => setExportPaso(null)} className="gp-btn-ghost flex-1 py-2 text-sm">Cancelar</button>
              <button onClick={confirmarExportar} className="gp-btn flex-1 py-2 text-sm">Exportar</button>
            </div>
          </div>
        </div>
      )}

      {exportPaso === "listo" && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,.6)" }} onClick={() => setExportPaso(null)}>
          <div className="gp-panel w-full max-w-sm p-5" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-2 mb-2">
              <Check size={16} className="gp-text-teal" />
              <h3 className="gp-serif text-lg">Exportación completa</h3>
            </div>
            <p className="text-sm gp-text-muted mb-5">Tu archivo se descargó correctamente. Revisa la carpeta de Descargas de tu navegador.</p>
            <button onClick={() => setExportPaso(null)} className="gp-btn w-full py-2 text-sm">Entendido</button>
          </div>
        </div>
      )}

      {avisoInactividad && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,.65)" }}>
          <div className="gp-panel w-full max-w-sm p-5 text-center">
            <AlertTriangle size={22} className="gp-text-gold mx-auto mb-2" />
            <h3 className="gp-serif text-lg mb-2">¿Sigues ahí?</h3>
            <p className="text-sm gp-text-muted mb-5">Por seguridad, como tu información es sensible, la sesión se va a cerrar en 2 minutos por inactividad.</p>
            <button onClick={() => setAvisoInactividad(false)} className="gp-btn w-full py-2 text-sm">Seguir conectado</button>
          </div>
        </div>
      )}

      {reauthPendiente && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,.65)" }}>
          <div className="gp-panel w-full max-w-sm p-5">
            <div className="text-center mb-3">
              <Lock size={22} className="gp-text-gold mx-auto mb-2" />
              <h3 className="gp-serif text-lg mb-1">Confirma que eres tú</h3>
              <p className="text-sm gp-text-muted">Este módulo tiene información sensible. Escribe tu contraseña para continuar.</p>
            </div>
            <CampoPassword
              autoFocus
              value={reauthPassword}
              onChange={(e) => setReauthPassword(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") confirmarReauth(); }}
              placeholder="Tu contraseña"
              className="gp-input w-full mb-2"
            />
            {reauthError && <p className="text-sm text-red-400 mb-2">{reauthError}</p>}
            <div className="flex gap-2 mt-3">
              <button onClick={() => { setReauthPendiente(null); setReauthPassword(""); setReauthError(""); }} className="gp-btn-ghost flex-1 py-2 text-sm">Cancelar</button>
              <button onClick={confirmarReauth} disabled={reauthCargando} className="gp-btn flex-1 py-2 text-sm">{reauthCargando ? "Verificando…" : "Continuar"}</button>
            </div>
          </div>
        </div>
      )}

      {mfaModalAbierto && <SeguridadMfaModal onClose={() => setMfaModalAbierto(false)} />}
      {temaModalAbierto && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,.6)" }} onClick={() => setTemaModalAbierto(false)}>
          <div className="gp-panel p-4 max-w-sm w-full" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-semibold mb-3">Tema</h3>
            <div className="space-y-2">
              {[
                { id: "actual", label: "Oscuro", bg: "#0B2341", panel: "#12304F" },
                { id: "azul-claro", label: "Claro", bg: "#E8F1FB", panel: "#F7FBFF" },
              ].map((opcion) => (
                <button
                  key={opcion.id}
                  onClick={() => cambiarTema(opcion.id)}
                  className="w-full flex items-center gap-3 p-3 rounded text-sm text-left"
                  style={{ border: tema === opcion.id ? "2px solid var(--gold)" : "1px solid var(--border)", background: tema === opcion.id ? "var(--panel-2)" : "transparent" }}
                >
                  <span
                    className="shrink-0 rounded-md"
                    style={{ width: 32, height: 32, background: opcion.bg, border: "1px solid var(--border)", boxShadow: `inset 0 0 0 6px ${opcion.panel}` }}
                  />
                  <span>{opcion.label}</span>
                  {tema === opcion.id && <Check size={14} className="ml-auto gp-text-gold shrink-0" />}
                </button>
              ))}
            </div>
            <button className="gp-btn-ghost w-full px-3 py-2 text-sm rounded mt-3" onClick={() => setTemaModalAbierto(false)}>Cerrar</button>
          </div>
        </div>
      )}

      {notifPanelAbierto && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,.65)" }} onClick={() => setNotifPanelAbierto(false)}>
          <div className="gp-panel w-full max-w-md p-5 max-h-[80vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="gp-serif text-lg">Notificaciones</h3>
              <button onClick={() => setNotifPanelAbierto(false)} className="gp-btn-ghost p-1 rounded"><X size={16} /></button>
            </div>

            {pushEstado === "activo" && esAdmin && (
              <button
                onClick={async () => {
                  setEnviandoPrueba(true);
                  try {
                    const token = await tokenDeSesion();
                    await fetch(`${supabase.supabaseUrl}/functions/v1/enviar-push`, {
                      method: "POST",
                      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                      body: JSON.stringify({ titulo: "ARKEYONE", mensaje: "Esta es una notificación de prueba. Si la ves, el Push ya está funcionando 🎉", tipo: "prueba", url: "/" }),
                    });
                    setTimeout(cargarNotificaciones, 1000);
                  } finally {
                    setEnviandoPrueba(false);
                  }
                }}
                disabled={enviandoPrueba}
                className="text-xs gp-text-gold text-left mb-3 disabled:opacity-50"
              >
                {enviandoPrueba ? "Enviando…" : "Enviar notificación de prueba →"}
              </button>
            )}

            {notificaciones.length > 0 && (
              <button onClick={marcarTodasLeidas} className="text-xs gp-text-muted text-left mb-2">Marcar todas como leídas</button>
            )}

            <div className="overflow-y-auto gp-scroll flex-1 -mx-1 px-1">
              {notificaciones.length === 0 && <p className="text-sm gp-text-muted">Aún no tienes notificaciones.</p>}
              {notificaciones.map((n) => (
                <div
                  key={n.id}
                  onClick={() => marcarNotificacionLeida(n)}
                  className="w-full text-left p-3 rounded mb-1.5 gp-panel-hi cursor-pointer"
                  style={{ background: n.leido ? "transparent" : "var(--panel-hi)", border: "1px solid var(--border)" }}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className={`text-sm ${n.leido ? "gp-text-muted" : ""}`}>{n.titulo}</p>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {!n.leido && <span className="w-2 h-2 rounded-full" style={{ background: "var(--gold)" }} />}
                      <button
                        onClick={(e) => { e.stopPropagation(); eliminarNotificacion(n.id); }}
                        className="gp-btn-ghost p-1 rounded"
                        title="Eliminar notificación"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                  {n.mensaje && <p className="text-xs gp-text-muted mt-0.5">{n.mensaje}</p>}
                  <p className="text-xs gp-text-muted mt-1 opacity-70">{new Date(n.created_at).toLocaleString("es-MX")}</p>
                  {/* Botones manuales para marcar medicamentos — imprescindibles en iPhone, donde
                      los botones de la notificación del sistema no existen (limitación de Apple). */}
                  {n.tipo === "medicamento" && n.recordatorio_id && !n.leido && (
                    <div className="flex gap-2 mt-2" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => marcarAccionDesdeNotif(n, "tomado")}
                        className="text-xs px-2.5 py-1 rounded"
                        style={{ background: "var(--teal)", color: "#12141c" }}
                      >Tomado</button>
                      <button
                        onClick={() => marcarAccionDesdeNotif(n, "posponer30")}
                        className="text-xs px-2.5 py-1 rounded gp-btn-ghost"
                      >+30 min</button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------- Dashboard ---------- */
/* ---------- Papelera (recuperar o borrar definitivamente) ---------- */
/* ---------- Colaboradores (invitar gente a tu cuenta, con permisos por módulo) ---------- */
// Panel de administración: lista todos los usuarios registrados en ArkeyOne y permite
// bloquearlos (les impide entrar, pero conserva su información) o eliminarlos por completo
// (borra su cuenta y todos sus datos, sin poder deshacerse). Solo tú puedes ver esta pantalla.

// Configuración: junta en un solo lugar todo lo que antes estaba suelto como botones apilados
// al fondo del menú lateral (tema, exportar datos, seguridad, alertas, colaboradores, papelera,





// Ciudad para el clima del Centro de mando (WeatherWidget). Busca con la API de geocodificación

// Elegir qué categorías de notificación llegan (push y correo) y un horario de silencio en el






function Dashboard({ data: datosCompletos, empresas = [], contextos = [], contextoActivo = "todos", onContextoActivo, setView, onAddSaldo, onVerProyecto, onEditPendiente, sensibleDesbloqueadoHasta, onDesbloquear, miEmail, notifNoLeidas, onBuscar, onNotificaciones, onAddNota, onEditHabito, modulosPermitidos, onCrearRapido, ordenWidgetsDashboard, onGuardarOrdenWidgets, avatarUrl, onAbrirConfiguracion, onCerrarSesion, presupuestoMensual, onGuardarPresupuestoMensual, ciudad, climaLat, climaLon }) {
  const [saldoModal, setSaldoModal] = useState(false);
  const [presupuestoModal, setPresupuestoModal] = useState(false);
  const [personalizarModal, setPersonalizarModal] = useState(false);
  // Todo el Centro de Mando lee `data` ya filtrada al contexto activo. Se hace aquí arriba, una
  // sola vez, para que ningún widget tenga que acordarse de filtrar por su cuenta.
  const data = useMemo(() => filtrarDatosPorContexto(datosCompletos, contextoActivo), [datosCompletos, contextoActivo]);
  const filtrandoContexto = contextoActivo !== "todos";
  // Chips de contexto: solo tienen sentido si hay más de un ámbito o al menos una empresa. Con un
  // solo contexto y sin empresas no hay nada entre qué escoger.
  const opcionesContexto = [
    ...contextos.map((c) => ({ key: `ctx:${c}`, label: c, color: COLOR_CONTEXTO_PROYECTO[c] })),
    ...empresas.map((e) => ({ key: `emp:${e.id}`, label: e.nombre, color: "#16A36A" })),
  ];
  const mostrarChipsContexto = opcionesContexto.length > 1;
  const saldo = calcularSaldo(data);
  const hoy = todayISO();
  const mesActual = hoy.slice(0, 7);

  // Centro de Mando no es una pantalla sensible en sí (no pide contraseña para entrar), pero
  // resume información que SÍ lo es (montos, deudas, facturas, activos, documentos/legal). Antes,
  // el candado de 15 min solo protegía el clic hacia el módulo completo — el resumen ya mostraba
  // montos y conceptos reales sin pedir nada. Aquí se enmascara ese contenido sensible mientras la
  // ventana de 15 min no esté vigente; el candado del módulo completo (irAVista) sigue intacto.
  // Se usa un "tick" propio para que la máscara se active sola si el usuario se queda parado en
  // esta pantalla y la ventana de 15 min vence mientras tanto.
  const [, forceTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => forceTick((t) => t + 1), 15000);
    return () => clearInterval(id);
  }, []);
  const sensibleDesbloqueado = !CANDADO_SENSIBLE_ACTIVO || Date.now() < (sensibleDesbloqueadoHasta || 0);

  const ledgerMesActual = useMemo(() => buildMonthlyLedger(data.finanzas, [mesActual]), [data.finanzas, mesActual]);
  const egresos = ledgerMesActual.filter((f) => f.tipo === "Egreso").reduce((s, f) => s + f.monto, 0);
  const activos = data.proyectos.filter((p) => p.estatus === "Activo").length;

  const nombreProyecto = (id) => data.proyectos.find((p) => p.id === id)?.nombre || "";

  // --- Unificación de "Acciones": sin importar el módulo de origen, si requiere que el usuario
  // haga algo hoy o en los próximos días, se junta aquí en una sola vista. No es una entidad nueva
  // ni una tabla nueva — solo lee de las entidades reales (Pendientes, Citas, Finanzas).
  const [tachadas, setTachadas] = useState(new Set());
  const acciones = [];
  data.pendientes.forEach((p) => {
    if (p.estatus === "Completada" && !tachadas.has(p.id)) return;
    if (p.fechaLimite) {
      const dd = daysUntil(p.fechaLimite);
      if (dd <= 7) acciones.push({ id: `pend-${p.id}`, origen: "Tarea", tipo: "pendiente", texto: p.descripcion, sub: nombreProyecto(p.proyectoId), dd, irA: () => setView("pendientes"), pendienteId: p.id });
    }
    if (p.fechaRevision) {
      const dd = daysUntil(p.fechaRevision);
      if (dd <= 7 && (!p.fechaLimite || p.fechaRevision !== p.fechaLimite)) acciones.push({ id: `segu-${p.id}`, origen: "Seguimiento", tipo: "seguimiento", texto: p.descripcion, sub: nombreProyecto(p.proyectoId), dd, irA: () => setView("pendientes") });
    }
  });
  data.citas.forEach((c) => {
    const dd = Math.round((new Date(c.fechaHora).setHours(0, 0, 0, 0) - new Date(hoy + "T00:00:00").getTime()) / 86400000);
    if (dd === 0) acciones.push({ id: `cita-${c.id}`, origen: "Cita", tipo: "cita", texto: c.titulo, sub: fmtFechaHora(c.fechaHora), dd, irA: () => setView("agenda") });
  });
  data.finanzas.forEach((f) => {
    if (f.tipo === "Ingreso" && f.estatus === "Pendiente" && f.fechaVencimiento) {
      const dd = daysUntil(f.fechaVencimiento);
      if (dd <= 7) acciones.push({ id: `cobro-${f.id}`, origen: "Cobro pendiente", tipo: "finanzas", texto: sensibleDesbloqueado ? (f.concepto || "Cobro") : "Cobro pendiente", sub: sensibleDesbloqueado ? fmtMoney(f.monto) : "🔒 Verifica tu contraseña para ver el detalle", dd, irA: () => setView("finanzas") });
    }
  });
  deudasDeFinanzas(data.finanzas).forEach((d) => {
    if (!d.fechaVencimiento) return;
    const dd = daysUntil(d.fechaVencimiento);
    if (dd <= 7) acciones.push({ id: `deuda-${d.id}`, origen: "Pago por hacer", tipo: "finanzas", texto: sensibleDesbloqueado ? d.concepto : "Pago por hacer", sub: sensibleDesbloqueado ? fmtMoney(d.monto) : "🔒 Verifica tu contraseña para ver el detalle", dd, irA: () => setView("deudas") });
  });

  const accionesHoy = acciones.filter((a) => a.dd <= 0).sort((a, b) => a.dd - b.dd);
  const accionesProximas = acciones.filter((a) => a.dd > 0 && a.dd <= 7).sort((a, b) => a.dd - b.dd);

  // --- Datos para el nuevo look del Centro de mando (header/saludo/tarjetas/3 columnas):
  // se calculan aquí, a partir de lo mismo que ya usa el resto de la pantalla, y se pasan ya
  // resueltos a los widgets de src/components/dashboard/* (sin imports cruzados).
  const primerNombreRaw = (miEmail || "").split("@")[0]?.split(/[._-]/)[0];
  const primerNombre = primerNombreRaw ? primerNombreRaw.charAt(0).toUpperCase() + primerNombreRaw.slice(1) : "";

  const tareasPendientesTotal = data.pendientes.filter((p) => p.estatus !== "Completada").length;

  const toggleTareaHoy = (pendienteId, hecha) => {
    if (hecha) {
      setTachadas((prev) => { const n = new Set(prev); n.delete(pendienteId); return n; });
      onEditPendiente(pendienteId, { estatus: "Pendiente" });
    } else {
      setTachadas((prev) => new Set(prev).add(pendienteId));
      onEditPendiente(pendienteId, { estatus: "Completada" });
    }
  };
  const accionesHoyView = accionesHoy.map((a) => ({
    id: a.id, texto: a.texto || a.origen, sub: a.sub, irA: a.irA, pendienteId: a.pendienteId,
    hecha: a.pendienteId ? tachadas.has(a.pendienteId) : false,
    estado: a.dd < 0 ? "Vencida" : a.dd === 0 ? "Hoy" : a.dd === 1 ? "Mañana" : `${a.dd}d`,
    tono: a.dd < 0 ? "red" : a.dd === 0 ? "gold" : "muted",
  }));

  const citasHoy = data.citas
    .filter((c) => Math.round((new Date(c.fechaHora).setHours(0, 0, 0, 0) - new Date(hoy + "T00:00:00").getTime()) / 86400000) === 0)
    .sort((a, b) => new Date(a.fechaHora) - new Date(b.fechaHora));

  const habitosHoyView = (data.habitos || [])
    .filter((h) => aplicaHoy(h, hoy))
    .map((h) => ({ ...h, hecho: (h.fechas || []).includes(hoy) }));
  const toggleHabitoHoy = (h) => {
    const fechas = h.hecho ? (h.fechas || []).filter((f) => f !== hoy) : [...(h.fechas || []), hoy];
    onEditHabito(h.id, { fechas });
  };

  // Alertas importantes: vencimientos/renovaciones que no son "tareas" en sí — documentos, activos
  // digitales y facturas. Ventana un poco más amplia (14 días) porque son avisos tempranos, no
  // acciones inmediatas del día.
  const documentosProximos = (data.documentos || []).filter((d) => d.fechaVencimiento && daysUntil(d.fechaVencimiento) <= 14);
  const activosProximos = (data.activos || []).filter((a) => a.fechaVencimiento && daysUntil(a.fechaVencimiento) <= 14);
  const facturasPendientes = (data.facturas || []).filter((f) => f.estatus === "Pendiente");
  // Atenciones marcadas "Por comprar" con fecha próxima (mismo umbral de 14 días que Documentos/
  // Activos) — regalo/ocasión que se acerca y aún no se compra.
  const regalosProximos = (data.regalos || []).filter((r) => r.estatus === "Por comprar" && r.fecha && daysUntil(r.fecha) <= 14);
  const totalAlertas = documentosProximos.length + activosProximos.length + facturasPendientes.length;

  // Proyectos que requieren atención: revisión vencida/próxima, o con pendientes vencidos.
  const proyectosAtencion = data.proyectos
    .filter((p) => p.estatus === "Activo" || p.estatus === "En desarrollo")
    .map((p) => {
      const revisionDd = p.fechaRevision ? daysUntil(p.fechaRevision) : null;
      const pendVencidos = data.pendientes.filter((t) => t.proyectoId === p.id && t.estatus !== "Completada" && t.fechaLimite && daysUntil(t.fechaLimite) < 0).length;
      const motivo = revisionDd !== null && revisionDd <= 7 ? (revisionDd < 0 ? "Revisión vencida" : revisionDd === 0 ? "Revisión hoy" : `Revisión en ${revisionDd}d`) : pendVencidos > 0 ? `${pendVencidos} pendiente${pendVencidos === 1 ? "" : "s"} vencido${pendVencidos === 1 ? "" : "s"}` : null;
      return { ...p, motivo };
    })
    .filter((p) => p.motivo);

  // Medicamentos de hoy (widget Salud / Requiere tu atención): activos, con horario programado
  // para hoy según diasSemana. "Medicamentos" es módulo sensible (VISTAS_SENSIBLES) — el nombre
  // se enmascara igual que Finanzas cuando el candado de 15 min no está vigente.
  const diaSemanaHoy = new Date(hoy + "T00:00:00").getDay(); // 0=domingo..6=sábado
  const medicamentosHoy = (data.medicamentos || []).filter((m) => m.activo !== false && (!m.diasSemana || m.diasSemana.length === 0 || m.diasSemana.includes(diaSemanaHoy)) && (m.horarios || []).length > 0);

  // --- "Requiere tu atención" (rediseño 21 sept 2026): une próximas acciones, alertas de
  // documentos/activos/facturas, proyectos en atención y medicamentos de hoy en una sola lista
  // con badge de conteo — mismos datos de arriba, solo se presentan juntos.
  const itemsRequierenAtencion = [
    ...accionesProximas.map((a) => ({ id: a.id, texto: a.texto || a.origen, sub: a.sub, irA: a.irA, tono: a.dd === 0 ? "gold" : "muted", etiqueta: a.dd === 1 ? "Mañana" : `${a.dd}d` })),
    ...documentosProximos.map((d) => ({ id: `doc-${d.id}`, texto: sensibleDesbloqueado ? `Documento — ${d.nombre}` : "🔒 Documento próximo a vencer", irA: () => setView("documentos"), tono: "gold", etiqueta: `${daysUntil(d.fechaVencimiento)}d` })),
    ...activosProximos.map((a) => ({ id: `act-${a.id}`, texto: sensibleDesbloqueado ? `Renovación — ${a.nombre}` : "🔒 Renovación próxima", irA: () => setView("activos"), tono: "gold", etiqueta: `${daysUntil(a.fechaVencimiento)}d` })),
    ...facturasPendientes.map((f) => ({ id: `fact-${f.id}`, texto: sensibleDesbloqueado ? `Factura — ${f.concepto || f.folio || "sin folio"}` : "🔒 Factura pendiente", irA: () => setView("facturas"), tono: "red", etiqueta: "Factura" })),
    ...proyectosAtencion.map((p) => ({ id: `proy-${p.id}`, texto: p.nombre, sub: p.motivo, irA: () => onVerProyecto(p.id), tono: p.motivo.includes("vencid") ? "red" : "gold", etiqueta: "Proyecto" })),
    ...(medicamentosHoy.length > 0 ? [{ id: "medicamentos-hoy", texto: sensibleDesbloqueado ? `${medicamentosHoy.length} medicamento${medicamentosHoy.length === 1 ? "" : "s"} hoy` : "🔒 Medicamentos pendientes hoy", irA: () => setView("medicamentos"), tono: "muted", etiqueta: "Salud" }] : []),
    ...regalosProximos.map((r) => ({ id: `regalo-${r.id}`, texto: `${r.ocasion || "Atención"} — ${r.descripcion || "por comprar"}`, irA: () => setView("regalos"), tono: "gold", etiqueta: `${daysUntil(r.fecha)}d` })),
  ];

  // --- A partir de aquí: los mismos cálculos de "resumen" que ya existían (avance, ganancia por
  // proyecto, etc.), ahora como contexto al final de la pantalla, no como protagonista.
  const monthKeysAmplios = useMemo(() => lastNMonthKeys(120), []);
  const ledgerAmplio = useMemo(() => buildMonthlyLedger(data.finanzas, monthKeysAmplios), [data.finanzas, monthKeysAmplios]);
  // Widget "Resumen financiero": mismo patrón de Reportes (buildMonthlyLedger + BarChart), pero
  // acotado a los últimos 6 meses — es un vistazo del dashboard, no el análisis completo.
  const monthKeys6 = useMemo(() => lastNMonthKeys(6), []);
  const ledger6 = useMemo(() => buildMonthlyLedger(data.finanzas, monthKeys6), [data.finanzas, monthKeys6]);
  const serieMensualDashboard = useMemo(() => monthKeys6.map((m) => {
    const delMes = ledger6.filter((e) => e.mes === m);
    const ingresos = delMes.filter((e) => e.tipo === "Ingreso").reduce((s, e) => s + e.monto, 0);
    const egresos = delMes.filter((e) => e.tipo === "Egreso").reduce((s, e) => s + e.monto, 0);
    return { mes: monthLabel(m), ingresos, egresos };
  }), [ledger6, monthKeys6]);
  const gananciaPorProyecto = data.proyectos.map((p) => {
    const propios = ledgerAmplio.filter((f) => f.proyectoId === p.id);
    const ing = propios.filter((f) => f.tipo === "Ingreso").reduce((s, f) => s + f.monto, 0);
    const eg = propios.filter((f) => f.tipo === "Egreso").reduce((s, f) => s + f.monto, 0);
    return { nombre: p.nombre, neto: ing - eg };
  }).filter((p) => p.neto !== 0).sort((a, b) => b.neto - a.neto);

  const pendientesTotal = data.pendientes.length;
  const pendientesHechos = data.pendientes.filter((p) => p.estatus === "Completada").length;
  const pctPendientes = pendientesTotal ? Math.round((pendientesHechos / pendientesTotal) * 100) : 0;

  const avancePorProyecto = data.proyectos
    .filter((p) => p.estatus === "Activo" || p.estatus === "En desarrollo")
    .map((p) => {
      const pends = data.pendientes.filter((t) => t.proyectoId === p.id);
      const hechos = pends.filter((t) => t.estatus === "Completada").length;
      return { nombre: p.nombre, total: pends.length, hechos, pct: pends.length ? Math.round((hechos / pends.length) * 100) : null };
    })
    .filter((p) => p.total > 0)
    .sort((a, b) => b.pct - a.pct);

  // --- "Tu progreso" (widget nuevo, rediseño 21 sept 2026): 4 anillos a partir de datos que ya
  // se calculan arriba — ninguno es un cálculo nuevo salvo Finanzas (presupuesto mensual, dato
  // nuevo que el propio usuario define; sin presupuesto no hay % que mostrar, se pide definirlo).
  const proyectosAlDia = activos - proyectosAtencion.length;
  const progresoProyectos = { pct: activos ? Math.round((proyectosAlDia / activos) * 100) : 0, sub: `${proyectosAlDia} de ${activos} al día` };
  const progresoTareas = { pct: pctPendientes, sub: `${pendientesHechos}/${pendientesTotal}` };
  const habitosHechosHoy = habitosHoyView.filter((h) => h.hecho).length;
  const progresoHabitos = { pct: habitosHoyView.length ? Math.round((habitosHechosHoy / habitosHoyView.length) * 100) : 0, sub: `${habitosHechosHoy}/${habitosHoyView.length} hoy` };
  const progresoFinanzas = presupuestoMensual
    ? { presupuesto: true, pct: Math.min(100, Math.round((egresos / presupuestoMensual) * 100)), sub: `${fmtMoney(egresos)} de ${fmtMoney(presupuestoMensual)}` }
    : { presupuesto: false, onDefinirPresupuesto: () => setPresupuestoModal(true) };

  // Widget ARKI: mismo fetch a asistente-ia que ya usa el asistente de voz (ver interpretar/
  // enviarTurno más abajo en el archivo), pero de un solo turno — sin historial ni contexto de
  // pantalla, la pregunta ya trae todo lo que necesita.
  const preguntarArki = async (mensaje) => {
    try {
      const token = await tokenDeSesion();
      const resp = await fetch(`${supabase.supabaseUrl}/functions/v1/asistente-ia`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ mensaje, modo: "texto" }),
      });
      const json = await resp.json().catch(() => ({}));
      if (!resp.ok || json.error) return json.error || "No pude responder, intenta de nuevo.";
      return json.respuesta || "No pude responder, intenta de nuevo.";
    } catch { return "No pude conectarme. Revisa tu conexión."; }
  };

  // Contenido de cada widget configurable, en un mapa id → JSX. La lógica/datos de arriba no
  // cambia — esto solo envuelve el mismo JSX que ya existía para poder elegir cuáles mostrar
  // y en qué orden (ver DASHBOARD_WIDGETS_CATALOGO / resolverOrdenWidgets).
  const widgetContenido = {
    miDia: (
      <MiDia
        citas={citasHoy}
        tareas={accionesHoyView}
        onToggleTarea={toggleTareaHoy}
        onVerAgenda={() => setView("agenda")}
        onAgregarTarea={() => onCrearRapido("pendientes", {})}
      />
    ),

    requiereAtencion: <RequiereAtencion items={itemsRequierenAtencion} />,

    calendario: <CalendarioWidget citas={data.citas} onVerDia={() => setView("agenda")} />,

    progreso: (
      <ProgresoWidget
        proyectosPct={progresoProyectos}
        tareasPct={progresoTareas}
        habitosPct={progresoHabitos}
        finanzas={progresoFinanzas}
      />
    ),

    proyectos: <ProyectosMiniWidget proyectos={avancePorProyecto} onVerTodos={() => setView("proyectos")} />,

    tareas: (
      <div className="gp-panel p-4 h-full flex flex-col">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-medium">Tareas</h3>
          <button onClick={() => setView("pendientes")} className="text-xs gp-text-gold">Ver todas →</button>
        </div>
        <div className="flex-1">
          <p className="gp-serif text-2xl">{tareasPendientesTotal}</p>
          <p className="text-xs gp-text-muted">pendientes en total</p>
        </div>
        <button onClick={() => onCrearRapido("pendientes", {})} className="gp-btn-ghost w-full mt-3 py-1.5 text-xs rounded">+ Nueva tarea</button>
      </div>
    ),

    finanzas: (
      <div className="gp-panel p-4 h-full flex flex-col">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2"><Wallet size={14} className="gp-text-teal" /><h3 className="text-sm font-medium">Finanzas</h3></div>
          {sensibleDesbloqueado && (
            <button onClick={() => setSaldoModal(true)} className="text-xs gp-text-gold">
              {saldo ? "Redefinir saldo" : "Definir saldo inicial"}
            </button>
          )}
        </div>
        {!sensibleDesbloqueado ? (
          <button onClick={onDesbloquear} className="text-left w-full mt-2">
            <p className="text-sm gp-text-gold">🔒 Verifica tu contraseña para ver tu saldo</p>
            <p className="text-xs gp-text-muted mt-1">Finanzas es un módulo protegido — toca aquí para desbloquearlo.</p>
          </button>
        ) : saldo ? (
          <div className="grid grid-cols-3 gap-3 mt-3">
            <div><p className="text-xs gp-text-muted">Efectivo</p><p className="gp-serif text-lg">{fmtMoney(saldo.efectivo)}</p></div>
            <div><p className="text-xs gp-text-muted">Cuenta</p><p className="gp-serif text-lg">{fmtMoney(saldo.cuenta)}</p></div>
            <div><p className="text-xs gp-text-muted">Total</p><p className="gp-serif text-lg gp-text-teal">{fmtMoney(saldo.total)}</p></div>
          </div>
        ) : (
          <p className="text-xs gp-text-muted mt-2">Define cuánto dinero tienes ahorita para que el sistema empiece a contar desde ahí.</p>
        )}
        {sensibleDesbloqueado && gananciaPorProyecto.length > 0 && (
          <div className="mt-4 pt-3" style={{ borderTop: "1px solid var(--border)" }}>
            <p className="text-xs gp-text-muted mb-2">Ganancia neta por proyecto</p>
            <div className="space-y-2">
              {gananciaPorProyecto.slice(0, 4).map((p) => (
                <div key={p.nombre} className="flex items-center gap-3 text-xs">
                  <span className="w-28 truncate gp-text-muted">{p.nombre}</span>
                  <div className="flex-1 h-2 rounded" style={{ background: "var(--border)" }}>
                    <div className="h-2 rounded" style={{ width: `${Math.min(100, Math.abs(p.neto) / 50)}%`, background: p.neto >= 0 ? "var(--teal)" : "var(--red)" }} />
                  </div>
                  <span className={`gp-mono w-20 text-right ${p.neto >= 0 ? "gp-text-teal" : "gp-text-red"}`}>{fmtMoney(p.neto)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    ),

    resumenFinanciero: (
      <div className="gp-panel p-4 h-full flex flex-col">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2"><PieChartIcon size={14} className="gp-text-teal" /><h3 className="text-sm font-medium">Resumen financiero</h3></div>
          <button onClick={() => setView("reportes")} className="text-xs gp-text-gold">Ver reportes →</button>
        </div>
        {/* Honestidad por encima de la estética: Finanzas todavía no distingue contexto por sí
            misma, así que estos montos son los de TODA tu actividad aunque arriba haya un filtro
            puesto. Vale más decirlo que enseñar un número recortado que parece el total. */}
        {filtrandoContexto && (
          <p className="text-[10px] gp-text-muted mb-1">Muestra todo tu dinero — Finanzas aún no separa por contexto.</p>
        )}
        {!sensibleDesbloqueado ? (
          <button onClick={onDesbloquear} className="text-left w-full mt-2">
            <p className="text-sm gp-text-gold">🔒 Verifica tu contraseña para ver este resumen</p>
            <p className="text-xs gp-text-muted mt-1">Finanzas es un módulo protegido — toca aquí para desbloquearlo.</p>
          </button>
        ) : (
          // El fallback reserva los mismos 200px de alto que la gráfica, para que el panel no
          // salte cuando termina de bajar recharts.
          <Suspense fallback={<div style={{ height: 200 }} />}>
            <GraficaResumenFinanciero serie={serieMensualDashboard} />
          </Suspense>
        )}
      </div>
    ),

    arki: <ArkiWidget onPreguntar={preguntarArki} />,

    habitos: <HabitosHoyWidget habitos={habitosHoyView} onToggle={toggleHabitoHoy} onVerTodos={() => setView("habitos")} />,

    salud: (
      <div className="gp-panel p-4 h-full flex flex-col">
        <div className="flex items-center gap-2 mb-2"><HeartPulse size={14} className="gp-text-red" /><h3 className="text-sm font-medium">Salud</h3></div>
        <div className="flex-1">
          {medicamentosHoy.length === 0 ? (
            <p className="text-xs gp-text-muted">No tienes medicamentos programados para hoy.</p>
          ) : !sensibleDesbloqueado ? (
            <button onClick={onDesbloquear} className="text-left w-full">
              <p className="text-sm gp-text-gold">🔒 Verifica tu contraseña para ver el detalle</p>
              <p className="text-xs gp-text-muted mt-1">{medicamentosHoy.length} medicamento{medicamentosHoy.length === 1 ? "" : "s"} programado{medicamentosHoy.length === 1 ? "" : "s"} hoy.</p>
            </button>
          ) : (
            <ul className="space-y-1.5 text-sm">
              {medicamentosHoy.map((m) => (
                <li key={m.id} className="flex items-center justify-between gap-2">
                  <span className="truncate">{m.nombre}{m.dosis ? ` — ${m.dosis}` : ""}</span>
                  <span className="text-xs gp-text-muted shrink-0">{(m.horarios || []).map((h) => String(h).slice(0, 5)).join(", ")}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
        <button onClick={() => setView("medicamentos")} className="text-xs gp-text-gold mt-3">Ir a Medicamentos →</button>
      </div>
    ),

    empresas: <EmpresasWidget empresas={empresas} proyectos={datosCompletos.proyectos || []} onVerTodas={() => setView("empresas")} />,
    notasRapidas: <NotasRapidasWidget onAddNota={onAddNota} />,
    accesosRapidos: <AccesosRapidosWidget onCrear={onCrearRapido} modulosPermitidos={modulosPermitidos} />,
  };

  // Además de lo que el usuario dejó visible, se respeta a qué contexto pertenece cada widget:
  // filtrando por "Profesional" no tiene por qué seguir ahí el bloque de Salud.
  const contextoSeleccionado = contextoActivo.startsWith("ctx:") ? contextoActivo.slice(4) : contextoActivo.startsWith("emp:") ? "Empresarial" : null;
  const widgetsVisibles = resolverOrdenWidgets(ordenWidgetsDashboard).filter((w) => {
    if (!w.visible || !widgetContenido[w.id]) return false;
    const suyos = CONTEXTO_DE_WIDGET[w.id];
    if (!suyos) return true;
    if (contextoSeleccionado) return suyos.includes(contextoSeleccionado);
    // Sin filtro activo, un widget de contexto solo aparece si ese contexto es de los que usas
    // (o si nunca configuraste contextos, en cuyo caso la app se comporta como siempre).
    return contextos.length === 0 || suyos.some((c) => contextos.includes(c));
  });

  return (
    <div>
      <DashboardHeader
        primerNombre={primerNombre}
        avatarUrl={avatarUrl}
        onBuscar={onBuscar}
        onNotificaciones={onNotificaciones}
        notifNoLeidas={notifNoLeidas}
        onPersonalizarClick={() => setPersonalizarModal(true)}
        onAbrirConfiguracion={onAbrirConfiguracion}
        onCerrarSesion={onCerrarSesion}
        ciudad={ciudad}
        climaLat={climaLat}
        climaLon={climaLon}
      />
      <DashboardSaludo primerNombre={primerNombre} />

      {/* Filtro de contexto (secc. 12 y 13): un contacto, un proyecto o un movimiento siguen
          existiendo una sola vez — esto solo cambia por cuál de tus ámbitos estás mirando. */}
      {mostrarChipsContexto && (
        <div className="flex flex-wrap gap-1.5 mb-4">
          {[{ key: "todos", label: "Todos", color: "var(--gold)" }, ...opcionesContexto].map((o) => {
            const activo = contextoActivo === o.key;
            return (
              <button
                key={o.key} onClick={() => onContextoActivo?.(o.key)}
                className="text-xs px-3 py-1.5 rounded-full border"
                style={activo
                  ? { background: o.color, color: "#0B2341", borderColor: o.color, fontWeight: 600 }
                  : { borderColor: "var(--border)", color: "var(--muted)" }}
              >
                {o.label}
              </button>
            );
          })}
        </div>
      )}
      <ResumenCards
        activos={activos}
        tareasPendientes={tareasPendientesTotal}
        agendaHoy={citasHoy.length}
        egresos={fmtMoney(egresos)}
        habitosPct={`${progresoHabitos.pct}%`}
        saludHoy={medicamentosHoy.length}
        onVerProyectos={() => setView("proyectos")}
        onVerTareas={() => setView("pendientes")}
        onVerAgenda={() => setView("agenda")}
        onVerFinanzas={() => setView("finanzas")}
        onVerHabitos={() => setView("habitos")}
        onVerSalud={() => setView("salud")}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6 items-stretch">
        {widgetsVisibles.map((w) => <div key={w.id} className="h-full">{widgetContenido[w.id]}</div>)}
      </div>

      <MotivationalCard />

      {personalizarModal && (
        <Modal title="Personalizar panel" onClose={() => setPersonalizarModal(false)}>
          <Suspense fallback={<p className="text-sm gp-text-muted">Cargando…</p>}>
            <PersonalizarPanelModal
              widgetsIniciales={resolverOrdenWidgets(ordenWidgetsDashboard)}
              onSave={(lista) => onGuardarOrdenWidgets(lista)}
              onSaved={() => setPersonalizarModal(false)}
            />
          </Suspense>
        </Modal>
      )}

      {saldoModal && sensibleDesbloqueado && (
        <Modal title="Punto de partida de saldo" onClose={() => setSaldoModal(false)}>
          <SaldoInicialForm ultimo={saldo} onSave={(v) => { onAddSaldo(v); setSaldoModal(false); }} />
        </Modal>
      )}

      {presupuestoModal && (
        <Modal title="Presupuesto mensual" onClose={() => setPresupuestoModal(false)}>
          <PresupuestoMensualForm
            presupuestoMensual={presupuestoMensual}
            onSave={async (v) => { await onGuardarPresupuestoMensual(v); }}
            onSaved={() => setPresupuestoModal(false)}
          />
        </Modal>
      )}
    </div>
  );
}


function SaldoInicialForm({ ultimo, onSave }) {
  const [v, setV] = useState({ fecha: todayISO(), efectivo: "", cuenta: "", notas: "" });
  const [error, setError] = useState("");
  const checkpoints = ultimo?.checkpoints || [];

  return (
    <div>
      <p className="text-xs gp-text-muted mb-3">Cuánto dinero tienes ahorita, para que el sistema empiece a contar desde aquí (no borra tu historial, solo marca un punto de partida nuevo).</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="Efectivo"><MoneyInput className="gp-input" value={v.efectivo} onChange={(val) => setV({ ...v, efectivo: val })} /></Field>
        <Field label="En cuenta"><MoneyInput className="gp-input" value={v.cuenta} onChange={(val) => setV({ ...v, cuenta: val })} /></Field>
      </div>
      <Field label="A partir de qué fecha"><input type="date" className="gp-input" value={v.fecha} onChange={(e) => setV({ ...v, fecha: e.target.value })} /></Field>
      <Field label="Notas (opcional)"><input className="gp-input" placeholder="ej. corte después de viaje a Acapulco" value={v.notas} onChange={(e) => setV({ ...v, notas: e.target.value })} /></Field>
      {error && <p className="text-xs gp-text-red mb-2">{error}</p>}
      <button
        className="gp-btn w-full py-2 text-sm mt-2"
        onClick={() => {
          if (v.efectivo === "" && v.cuenta === "") { setError("Captura al menos uno: efectivo o cuenta."); return; }
          setError("");
          onSave(v);
        }}
      >
        Guardar punto de partida
      </button>

      {checkpoints.length > 0 && (
        <div className="mt-5 pt-4 border-t gp-border">
          <p className="text-xs font-medium mb-2 gp-text-muted">Puntos de partida anteriores</p>
          <div className="space-y-1.5 max-h-32 overflow-y-auto gp-scroll">
            {checkpoints.map((c) => (
              <div key={c.id} className="text-xs flex justify-between gp-text-muted">
                <span className="gp-mono">{c.fecha}</span>
                <span>{fmtMoney(c.efectivo)} efectivo · {fmtMoney(c.cuenta)} cuenta</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}


/* ---------- Proyectos ---------- */
// Ingresos/egresos cobrados y pagos a colaboradores relacionados con un proyecto (se usa en la
// lista de Proyectos y en la pantalla de detalle, por eso vive fuera de ambos componentes).
// Categorías típicas de gasto de un proyecto. Son sugerencias para el combo, no una lista

// Foto completa del dinero de un proyecto. TODO sale de donde ya vive: los movimientos reales de
// Finanzas ligados al proyecto y el precio pactado de sus tareas. Este módulo no guarda ni un
// importe propio — si lo hiciera, en tres meses habría dos cifras que no cuadran.
//
// Dos ejes que conviene no confundir:

// Cuánto se le debe a cada colaborador del proyecto y cuándo toca pagarle.
//   comprometido -> precio pactado de sus tareas en este proyecto
//   pagado       -> egresos "Pago a colaborador" ya pagados


// Cuánto dinero (según el precio pactado de cada tarea) le corresponde a cada quien en el proyecto:

/* ---------- Mis empresas ---------- */
// "Mis empresas" es una PERSPECTIVA del contexto Empresarial, no una segunda aplicación: aquí


// Widget del Centro de Mando para el contexto Empresarial.
function EmpresasWidget({ empresas, proyectos, onVerTodas }) {
  return (
    <div className="gp-panel p-4 h-full flex flex-col">
      <div className="flex items-center gap-2 mb-3"><Building2 size={14} style={{ color: "#16A36A" }} /><h3 className="text-sm font-medium">Mis empresas</h3></div>
      <div className="flex-1">
        {empresas.length === 0 ? (
          <p className="text-xs gp-text-muted">Todavía no registras empresas.</p>
        ) : (
          <ul className="space-y-2">
            {empresas.slice(0, 4).map((e) => {
              const n = proyectos.filter((p) => p.empresaId === e.id).length;
              return (
                <li key={e.id} className="flex items-center gap-2.5">
                  <LogoEmpresa e={e} size={26} />
                  <span className="text-sm truncate flex-1">{e.nombre}</span>
                  <span className="text-xs gp-text-muted shrink-0">{n} proyecto{n === 1 ? "" : "s"}</span>
                </li>
              );
            })}
          </ul>
        )}
      </div>
      <button onClick={onVerTodas} className="text-xs gp-text-gold mt-3 text-left">Ir a Mis empresas →</button>
    </div>
  );
}

/* ---------- Proyectos e ideas — piezas compartidas entre la lista y la ficha ---------- */

// Avance del proyecto: NO es un campo guardado, se calcula desde las tareas reales del módulo
// Tareas (mismo cálculo que el centro de proyecto). Devuelve null —no 0— cuando el proyecto





// Responsable del proyecto. null = tú (el dueño de la cuenta): se dibuja con tu propio nombre y


// Cuánto falta para la entrega, dicho en palabras y no en una fecha que haya que restar de




/* ---------- Proyectos e ideas (lista) ---------- */
// Rediseño del 24 sept 2026: misma filosofía que Contactos — LISTA LIMPIA → SELECCIONAR → FICHA.
// Se eliminó por completo la expansión en línea (antes cada fila abría finanzas, reparto de

function CandadoFicha({ texto, onDesbloquear }) {
  return (
    <button onClick={onDesbloquear} className="text-left w-full py-2">
      <p className="text-xs gp-text-gold flex items-center gap-1.5"><Lock size={12} /> {texto}</p>
    </button>
  );
}


/* ---------- Ficha del proyecto (panel de detalle) ---------- */
// Lo que la lista ya NO muestra vive aquí, y siempre como RESUMEN: las tareas son del módulo
// Tareas, el dinero es de Finanzas, las personas son de Contactos. Esta ficha solo consulta,
// relaciona y manda al módulo fuente — nunca guarda una copia de esos datos.
// --- Finanzas del proyecto (pestaña Finanzas de la ficha) -------------------------------------
// Todo lo que se captura aquí se guarda en su módulo de siempre: los cobros y gastos son
// movimientos de Finanzas con proyecto_id, y el pago al responsable es una tarea con precio.
// Esta pantalla solo es la puerta: ni una cifra vive en la tabla de proyectos.


// Pago al responsable por liderar el proyecto. Primero lo hice como una tarea con precio
// (opción A), y en cuanto se usó quedó claro que estaba mal: una tarea que no es trabajo
// ensucia la lista del proyecto y dos pagos se ven como la misma tarea repetida. Ahora es lo
// que Angel pidió y lo que la app ya hacía para esto — un Egreso de Finanzas con categoría
// "Pago a colaborador", el mismo que usa la pantalla de colaboradores. Así cae solo en los

// Cada cifra del panel de dinero es también la puerta a capturar ese tipo de movimiento. El
// ícono de la esquina es lo que avisa que se puede tocar — sin él, un número con fondo parece
// solo un dato.
function TarjetaDinero({ etiqueta, valor, color, detalle, significa, icono, titulo, onClick }) {
  return (
    <button onClick={onClick} title={titulo} className="gp-bloque rounded-lg p-2.5 text-left relative w-full">
      <span className="absolute gp-text-muted" style={{ top: 6, right: 6 }}>{icono}</span>
      <p className="text-[10px] gp-text-muted pr-4">{etiqueta}</p>
      <p className="gp-mono text-sm" style={{ color }}>{fmtMoney(valor)}</p>
      {/* Qué representa el número. Sin esto, cuatro cifras juntas se confunden entre sí. */}
      {significa && <p className="text-[9px] gp-text-muted leading-tight mt-0.5">{significa}</p>}
      {detalle && <p className="text-[9px] leading-tight" style={{ color: "var(--muted)" }}>{detalle}</p>}
    </button>
  );
}

// Caja para escribir una nota del proyecto. Las notas viven en el propio proyecto (campo

// Comprobante de un pago: la foto de la transferencia o el depósito. Se guarda con el mismo
// mecanismo de adjuntos que ya usa el resto de la app (un comentario con adjuntos ligado al
// movimiento), así que no hace falta columna nueva ni bucket nuevo.
//
// Dos formas de subirlo, porque en celular la diferencia importa: "Subir" abre la galería y



// Encabezado de una sección del formulario. Va FUERA del componente: declararlo adentro haría

/* ---------- Formulario de proyecto ---------- */
// Separado por secciones (secc. 27): lo indispensable arriba, fechas y relaciones después, y los

/* ---------- Detalle de proyecto (Fase: navegación con breadcrumb) ---------- */

/* ---------- Mi trabajo (workspace de colaborador — Fase 5) ---------- */
// A diferencia del resto de la app (que muestra los datos de UNA cuenta a la vez, la propia

/* ---------- Mi calendario (workspace de colaborador, Fase 7) ---------- */
// Vista de agenda cross-cuenta: agrupa por fecha las tareas que me asignaron en
// cualquier cuenta donde colaboro (mismo mecanismo RLS que "Mi trabajo": asignado_a =

/* ---------- Mis pagos / Mis facturas (workspace de colaborador, Fase 7) ---------- */
// Cross-cuenta: lo que he ganado (tareas aceptadas, en cualquier cuenta) contra lo que ya
// me pagaron (egresos "Pago a colaborador" donde soy el beneficiario por correo) y las



// Aplana el árbol a una lista con nivel de profundidad, para renderizar con indentación.



/* ---------- Completar tareas y proyectos (una sola regla para toda la app) ---------- */
// El check de completar aparece en tres pantallas (Tareas, centro de proyecto y ficha del
// proyecto). La regla vive aquí una sola vez para que se comporte igual en las tres: mismo texto
// de confirmación, misma fecha registrada y mismo cierre automático del proyecto.




// Reabrir una tarea borra su fecha de completado: la fecha guardada tiene que ser la de la vez que

// Pregunta de confirmación para completar un proyecto. Un proyecto SÍ se puede dar por terminado






// Ficha de la tarea: el panel que abre a la derecha al tocar un renglón en Tareas (pedido de
// Angel, 29 sept 2026). Solo consulta y deja hacer las dos cosas que se hacen a diario sin abrir


/* ---------- Finanzas ---------- */

function fmtMesLabel(mes) {
  if (mes === "sin-fecha") return "Sin fecha";
  const [y, m] = mes.split("-").map(Number);
  const txt = new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString("es-MX", { month: "long", year: "numeric", timeZone: "UTC" });
  return txt.charAt(0).toUpperCase() + txt.slice(1);
}

// Finanzas dejó de ser una pantalla sola (4 oct 2026). Es un módulo con hijos, cada uno con UNA
// pregunta que contestar:
//
//   Resumen        ¿cómo voy este mes?        tarjetas y gráficas, sin tabla
//   Movimientos    ¿dónde está ese registro?  el libro completo, todos los filtros
//   Por cobrar     ¿quién me debe?            pendientes de ingreso, por antigüedad
//   Por pagar      ¿qué debo?                 es el módulo Deudas, que ya existía
//   Ingresos       ¿quién me paga?            un renglón por cliente, no por movimiento
//   Egresos        ¿en qué se me va?          un renglón por categoría, contra su tope
//   Recurrentes    ¿cuánto me cuesta el mes?  lo que se repite, mensualizado
//   Facturas e IVA ¿qué papeleo falta?        ya existía
//
// Ninguno es una entidad nueva: TODOS leen la misma tabla `finanzas`. Lo que cambia entre ellos
// es el corte, las columnas y las acciones — por eso son hijos y no módulos aparte, y por eso
// Ingresos/Egresos agrupan en vez de solo filtrar: un filtro ya lo hacen los chips de Movimientos.
//
// La fila de pestañas "Movimientos / Facturas e IVA" que vivía aquí se quitó: ahora eso lo hace
// el panel izquierdo, y tenerla además era hacer lo mismo dos veces.

// Todas las cifras de un periodo en un solo lugar. Resumen las dibuja como tarjetas y gráficas;

// Encabezado común de los hijos de Finanzas: migaja, título, para qué sirve la pantalla, selector


// Cubetas de antigüedad. Un saldo de hace tres meses no es lo mismo que uno de la semana pasada,
// y es la primera cosa que se quiere ver en una lista de cobros.
// Las cuatro parten el total sin huecos ni traslapes, y "vencido" es el MISMO criterio que usa


// Tarjeta de resumen con su variación contra el periodo anterior y el desglose de qué la compone.
// El icono va en una placa redondeada con el tinte de su propio color (el verde del ingreso, el

// Los dos mundos del dinero, y dentro de cada uno sus estados. Esta es la estructura que pidió
// Angel el 4 oct 2026, y está escrita como una sola constante a propósito: el nombre que ve el
// usuario, el filtro que aplica y la palabra con que se lee el estado salen todos de aquí, así que
// no pueden decir una cosa en la pestaña y otra en la columna.
//
// Ojo con "Cobrado": en la base es el único valor que significa "ya se liquidó", para las dos

// Totales de lo que está seleccionado en el grid: cuánto es, cuánto ya se liquidó y cuánto falta.

// MOVIMIENTOS — sección propia, al mismo nivel que Resumen. Dos niveles y nada más:
//
//   1. INGRESOS / EGRESOS / Todos      — tres tarjetas grandes con su total del periodo
//   2. dentro del elegido, el estado   — Ingresos: Ya cobrados · Por cobrar
//                                        Egresos:  Ya pagados · Por pagar · Deudas
//
// Lo que se ve en la tabla cambia con la elección: la columna Tipo solo aparece en "Todos" (en
// Ingresos todos son ingresos, repetirlo en cada renglón es ruido), y Vence/Antigüedad solo
// cuando se está viendo lo pendiente, que es cuando el atraso importa.
//

// RESUMEN — la pantalla a la que se entra a VER, no a buscar. Las cuatro cifras del periodo, cómo

// Cuánto representa al mes un movimiento recurrente, según su frecuencia. 4.345 es el promedio de




/* ---------- Deudas ---------- */
// Deudas ya no es su propia tabla (Documento Maestro v1.2, secc. 23.11/40): es una vista
// especializada de Finanzas, filtrando egresos no recurrentes con saldo pendiente. Crear,
// editar, marcar como pagada o borrar una "deuda" aquí en realidad opera sobre `finanzas`
// (categoria="Deuda"), para que el movimiento real viva en un solo lugar.
// DEUDAS — qué debo, con su historial. Sigue siendo un módulo propio del grupo Dinero y una VISTA
// de `finanzas` (un egreso con saldo pendiente), no una tabla aparte.
//
// Se traslapa a propósito con la opción "Por pagar" del grid de Movimientos, y no es duplicar
// datos: las dos leen los mismos movimientos y escriben los mismos abonos en pagos_finanzas. La
// diferencia es para qué sirve cada una — en el grid se registra un pago de paso, aquí se revisa
// una cuenta completa: su antigüedad, todos sus abonos y el comprobante de cada uno.
//
// Lo que ganó en la revisión del 4 oct 2026:
//   - los recurrentes pendientes ya aparecen (antes los escondía a propósito, y la renta vencida
//     es exactamente lo que uno quiere ver aquí). Se pueden ocultar con el interruptor.
//   - el comprobante de cada pago se sube desde el mismo renglón, con el historial de abonos.
//   - cubetas de antigüedad, las mismas que Por cobrar.



/* ---------- Equipo ---------- */
// Colaboradores (Grupo C): ya no es su propia entidad — es una vista sobre Contactos filtrada por
// tipos incluye "Colaborador" (Documento Maestro: Contactos es la entidad maestra de personas,
// reutilizada transversalmente). La tabla `equipo` quedó desactivada; esta pantalla ahora muestra,






/* ---------- Metas por proyecto ---------- */
function Metas({ data, onAdd, onEdit, onRemove }) {
  const [modal, setModal] = useState(null);
  const [orden, setOrden] = useState("default");
  const [ordenDir, setOrdenDir] = useState("asc");
  const toggleOrden = (key) => { if (orden === key) setOrdenDir((d) => (d === "asc" ? "desc" : "asc")); else { setOrden(key); setOrdenDir("asc"); } };
  const empty = { proyectoId: "", descripcion: "", fechaObjetivo: todayISO(), fechaRevision: "", prioridad: "Media", estatus: "No iniciada" };
  const camposOrden = {
    objetivo: { get: (m) => m.fechaObjetivo, tipo: "fecha" },
    registro: { get: (m) => m.createdAt, tipo: "fecha" },
    revision: { get: (m) => m.fechaRevision, tipo: "fecha" },
    alfabetico: { get: (m) => m.descripcion, tipo: "texto" },
    prioridad: { get: (m) => m.prioridad, tipo: "prioridad" },
  };
  const opcionesOrden = [
    { key: "objetivo", label: "fecha objetivo" },
    { key: "registro", label: "fecha de registro" },
    { key: "revision", label: "fecha de revisión" },
    { key: "alfabetico", label: "alfabético" },
    { key: "prioridad", label: "prioridad" },
  ];
  const base = orden === "default" ? [...data.metas].sort((a, b) => (a.fechaObjetivo || "").localeCompare(b.fechaObjetivo || "")) : data.metas;
  const ordenados = ordenarLista(base, orden, camposOrden, ordenDir);
  const nombreProyecto = (id) => data.proyectos.find((p) => p.id === id)?.nombre || "—";

  return (
    <div>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-1">
        <h2 className="gp-serif text-2xl">Metas por proyecto</h2>
        <button onClick={() => setModal({ item: empty })} className="gp-btn flex items-center justify-center gap-1 px-3 py-1.5 text-sm w-full sm:w-auto"><Plus size={14} /> Nueva</button>
      </div>
      <p className="text-sm gp-text-muted mb-3">Qué define el éxito de cada proyecto, para que la bitácora tenga rumbo.</p>
      <div className="mb-4"><OrdenSelector opciones={opcionesOrden} value={orden} onChange={setOrden} /></div>

      <div className="gp-panel overflow-x-auto">
        <table className="gp-table">
          <thead><tr><th style={{ width: 36 }}></th><Th label="Meta" sortKey="alfabetico" orden={orden} ordenDir={ordenDir} onToggle={toggleOrden} /><th>Proyecto</th><Th label="Prioridad" sortKey="prioridad" orden={orden} ordenDir={ordenDir} onToggle={toggleOrden} /><Th label="Fecha objetivo" sortKey="objetivo" orden={orden} ordenDir={ordenDir} onToggle={toggleOrden} /><th>Estatus</th><th></th></tr></thead>
          <tbody>
            {ordenados.map((m) => {
              const cumplida = m.estatus === "Cumplida";
              return (
                <tr key={m.id} style={cumplida ? { background: "rgba(34,197,94,0.14)" } : undefined}>
                  <td>
                    <input
                      type="checkbox"
                      checked={cumplida}
                      title="Marcar como cumplida"
                      onChange={(e) => onEdit(m.id, { estatus: e.target.checked ? "Cumplida" : "En progreso" })}
                      style={{ width: 16, height: 16, accentColor: "var(--gold)", cursor: "pointer" }}
                    />
                  </td>
                  <td>{m.descripcion}</td>
                  <td className="gp-text-muted">{nombreProyecto(m.proyectoId)}</td>
                  <td><Badge tone={m.prioridad === "Alta" ? "red" : m.prioridad === "Media" ? "gold" : "muted"}>{m.prioridad || "Media"}</Badge></td>
                  <td className="gp-mono">{m.fechaObjetivo}</td>
                  <td>
                    <select className="gp-input" style={{ padding: "2px 6px" }} value={m.estatus} onChange={(e) => onEdit(m.id, { estatus: e.target.value })}>
                      {ESTATUS_META.map((s) => <option key={s}>{s}</option>)}
                    </select>
                  </td>
                  <td><div className="flex gap-1"><IconBtn title="Editar" onClick={() => setModal({ item: m })}><Pencil size={13} /></IconBtn><IconBtn title="Eliminar" onClick={() => onRemove(m.id)}><Trash2 size={13} /></IconBtn></div></td>
                </tr>
              );
            })}
            {ordenados.length === 0 && <tr><td colSpan={7} className="text-center gp-text-muted py-6">Sin metas registradas.</td></tr>}
          </tbody>
        </table>
      </div>

      {modal && (
        <Modal title={modal.item.id ? "Editar meta" : "Nueva meta"} onClose={() => setModal(null)}>
          <MetaForm item={modal.item} proyectos={data.proyectos} onSave={(v) => { modal.item.id ? onEdit(modal.item.id, v) : onAdd(v); setModal(null); }} />
        </Modal>
      )}
    </div>
  );
}


/* ---------- Contactos / networking ---------- */

// Piezas compartidas entre la lista y la ficha lateral. Viven aquí afuera a propósito: si se





// Colores de los botones de comunicación del contacto (pedido de Angel, 29 sept 2026): llamar en




// Combo de filtro con color por opción, compartido por Contactos (tipo de contacto) y Proyectos
// e ideas (etapa: Idea, Validación, Desarrollo…). A propósito NO es un <select> nativo: los

// Archivos de una entidad (contacto, proyecto…). NO crea una tabla nueva: reutiliza el sistema
// universal de comentarios y adjuntos que ya existe desde la migración 0006 (entidad_tipo/
// entidad_id + adjuntos jsonb), el mismo que usa la Bitácora. Aquí solo se muestran los adjuntos,
// sin el texto, y subir un archivo crea un comentario que únicamente lleva el adjunto.
// `carpeta` es el prefijo dentro del bucket de Storage, para que los archivos de cada módulo
// queden separados (contactos/<id>/…, proyectos/<id>/…).


// Crear un evento ligado a este contacto sin salir de la ficha (pedido de Angel, 29 sept 2026).




// Ficha del contacto (mockup de Angel, 24 sept 2026): el panel que aparece a la derecha al
// seleccionar a alguien en la lista. NO duplica datos: Proyectos sale de la tabla puente,

// Formulario corto que aparece justo después de crear un contacto desde otra pantalla. Pide lo
// mínimo para que la ficha sirva: nombre, los dos apellidos y el correo; el WhatsApp es opcional.
// Lo demás (empresa, dirección, cumpleaños, foto, proyectos) se completa en Contactos.
function ContactoRapidoModal({ nombreTecleado, onCerrar, onGuardar }) {
  // Lo que se tecleó en el combo se reparte como primera propuesta: "María Quintana Ríos" ->
  // nombre + apellido paterno + apellido materno. Es solo un punto de partida, se puede corregir.
  const partes = (nombreTecleado || "").trim().split(/\s+/).filter(Boolean);
  const [nombres, setNombres] = useState(partes[0] || "");
  const [apellidoPaterno, setApellidoPaterno] = useState(partes[1] || "");
  const [apellidoMaterno, setApellidoMaterno] = useState(partes.slice(2).join(" "));
  const [correo, setCorreo] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [error, setError] = useState("");

  const guardar = () => {
    if (!nombres.trim()) { setError("Falta el nombre."); return; }
    if (!apellidoPaterno.trim()) { setError("Falta el apellido paterno."); return; }
    if (!apellidoMaterno.trim()) { setError("Falta el apellido materno."); return; }
    // El correo es opcional (Angel, 30 sept 2026): mucha gente a la que se le registra algo no
    // tiene o no se sabe su correo, y bloquear por eso dejaba el contacto a medias. Si sí se
    // captura, se revisa que esté bien escrito.
    const correoLimpio = correo.trim();
    if (correoLimpio && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correoLimpio)) { setError("Ese correo no se ve bien escrito."); return; }
    onGuardar({
      nombres: nombres.trim(),
      apellidoPaterno: apellidoPaterno.trim(),
      apellidoMaterno: apellidoMaterno.trim(),
      nombre: [nombres.trim(), apellidoPaterno.trim(), apellidoMaterno.trim()].filter(Boolean).join(" "),
      correo: correoLimpio,
      whatsapp: whatsapp.trim(),
    });
  };

  return (
    <Modal title="Completa el contacto" onClose={onCerrar}>
      <p className="text-sm gp-text-muted mb-4">
        Ya quedó creado y seleccionado donde lo pediste. Completa sus datos para no dejarlo a medias;
        si lo cierras, se queda solo con el nombre y lo puedes completar después en Contactos.
      </p>
      <Field label="Nombre(s)"><input className="gp-input" autoFocus value={nombres} onChange={(e) => setNombres(e.target.value)} /></Field>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="Apellido paterno"><input className="gp-input" value={apellidoPaterno} onChange={(e) => setApellidoPaterno(e.target.value)} /></Field>
        <Field label="Apellido materno"><input className="gp-input" value={apellidoMaterno} onChange={(e) => setApellidoMaterno(e.target.value)} /></Field>
      </div>
      <Field label="Correo electrónico (opcional)"><input className="gp-input" type="email" inputMode="email" value={correo} onChange={(e) => setCorreo(e.target.value)} /></Field>
      <Field label="WhatsApp (opcional)">
        <CampoTelefonoPais valor={whatsapp} onChange={setWhatsapp} placeholderNumero="55 1234 5678" />
      </Field>
      {error && <p className="text-xs gp-text-red mb-2">{error}</p>}
      <div className="flex gap-2 mt-1">
        <button onClick={onCerrar} className="gp-btn-ghost flex-1 py-2 text-sm">Ahora no</button>
        <button onClick={guardar} className="gp-btn flex-1 py-2 text-sm">Guardar</button>
      </div>
    </Modal>
  );
}

// Códigos de país para los campos de teléfono y WhatsApp. No es la lista completa del mundo:
// son los países de donde realmente salen los contactos de ARKEYONE (América y España), más
// "Otro" para teclear la lada a mano cuando haga falta. Ordenados alfabéticamente, con México
// primero por ser el caso dominante.

// Separa un número guardado ("+1 213 555 0123") en lada + resto. Los números viejos, capturados

// Campo de teléfono con código de país. Guarda UN solo string ("+52 55 1234 5678") en la misma






/* ---------- Marketing (calendario de campañas, presupuesto, métricas, retorno) ---------- */














// Texto legible de la racha — nunca abreviaturas como "0d"/"1d".
const textoRacha = (n) => (n === 0 ? "Sin racha" : `Racha: ${n} día${n === 1 ? "" : "s"}`);









// Una gráfica de línea para un indicador de Salud. Solo usa registros que SÍ tienen ese valor
// capturado (nunca interpola ni inventa puntos para rellenar huecos, tal como pide la secc. 27).

// Tarjeta de avance hacia la meta de peso (el único indicador con resumen dedicado, por ser
// "el principal") — cuánto falta desde el último peso registrado y días restantes a la fecha



/* ---------- Ejercicio (sub-sección de Salud) ---------- */








// Primero se capturan los datos base de la rutina (se guardan de inmediato) y solo después se






// Cronómetro manual de trabajo/descanso para ejercicios "por tiempo" (circuitos tipo Planet
// Fitness: 1 min de fuerza, 30 seg de descanso, siguiente ejercicio...). Cada fase se arranca
// con un clic — nunca encadena sola a la siguiente, para que cada quien controle su propio












// Se calcula al momento sumando los ingredientes de las recetas asignadas en el rango de
// fechas — no se guarda como entidad aparte (mismo principio que Reportes: capa analítica









// --- Agenda visual (día/semana) ---------------------------------------------------------------
// Rediseño del 28 sept 2026. La Agenda ya no "acomoda sola" todo lo que tenga fecha: ahora
// distingue PARA CUÁNDO es algo (fecha límite, el compromiso) de CUÁNDO lo voy a hacer
// (fecha programada + hora, el plan). Reglas:
//
//   1. Citas: siempre en la cuadrícula horaria, a su hora.
//   2. Tarea con horario programado (fechaProgramada + horaInicio): también en la cuadrícula, pero
//      con borde punteado y más tenue que una cita, para distinguirlas de un vistazo, y con
//      checkbox visible.
//   3. Tarea con solo fecha límite: NO entra a la cuadrícula. Vive en la franja "Tareas del día"
//      de su columna; al arrastrarla a una hora se le llena el horario programado.
//   4. Tarea sin ninguna fecha: no aparece en la Agenda (sigue en Tareas).
//   5. Interruptor "Mostrar tareas", guardado en preferencias.agenda_mostrar_tareas.
//   6. Lo delegado a otra persona no es mío y no se muestra aquí; lo que me asignaron sí, venga de
//      la cuenta que venga — misma consulta cross-cuenta que usa "Mi trabajo".
//
// Mover o redimensionar un bloque cambia SU HORARIO, nunca la fecha límite (ese fue justo el
// motivo de separar los campos), y borra el recordatorio ya disparado de ese registro para que el
// motor de recordatorios lo vuelva a evaluar con el horario nuevo.
//
// Si la migración 20261002 todavía no se aplicó, `soportaProgramacion` queda en false y la



// Reparte en columnas los bloques que se encimen dentro de un mismo día, para que una tarea


// Arma los bloques de la cuadrícula: comida (fijo, informativo), citas y SOLO las tareas que ya




// Config de la búsqueda global: qué ícono mostrar y a qué vista mandar al usuario por cada módulo.
// Deliberadamente NO incluye "comentarios", "saldoInicial" ni "patrimonioValuaciones": no tienen
// pantalla propia a la que navegar, así que un resultado ahí no le serviría de nada al usuario.
const ICONO_MODULO_BUSQUEDA = {
  empresas: Building2, proyectos: FolderKanban, pendientes: CheckSquare, equipo: Users, finanzas: Wallet,
  actividades: Activity, activos: Globe, metas: Target, contactos: Contact, redesMetricas: BarChart3,
  documentos: FileText, habitos: Flame, salud: HeartPulse, apartados: PiggyBank, eventos: Camera,
  regalos: Gift, facturas: Receipt, campanas: Megaphone, patrimonio: Gem, medicamentos: Pill,
  citas: CalendarClock, notas: StickyNote,
};
const KEY_TO_VIEW_BUSQUEDA = {
  empresas: "empresas", proyectos: "proyectos", pendientes: "pendientes", equipo: "equipo", finanzas: "finanzas",
  actividades: "actividades", activos: "activos", metas: "metas", contactos: "contactos", redesMetricas: "redes",
  documentos: "documentos", habitos: "habitos", salud: "salud", apartados: "apartados", eventos: "eventos",
  regalos: "regalos", facturas: "facturas", campanas: "marketing", patrimonio: "patrimonio", medicamentos: "medicamentos",
  citas: "agenda", notas: "notas",
};
function subtituloResultadoBusqueda(key, item) {
  switch (key) {
    case "finanzas": return `${item.tipo || ""} · ${item.monto ? fmtMoney(item.monto) : ""}`;
    case "citas": return fmtFechaHora(item.fechaHora);
    case "pendientes": return item.fechaLimite ? `Vence ${item.fechaLimite}` : "";
    case "contactos": return item.correo || item.telefono || "";
    case "notas": return (item.contenido || "").slice(0, 90);
    case "proyectos": return item.categoria || "";
    default: return "";
  }
}

// Búsqueda global: recorre TODO lo que ya está cargado en memoria (data) para la cuenta activa —
// no hace falta ir a la base de datos porque el usuario ya tiene todos sus módulos en el cliente.
function BusquedaGlobal({ data, onNavigate, onClose }) {
  const [q, setQ] = useState("");
  const qn = normalizarTexto(q);
  const resultados = useMemo(() => {
    if (!qn) return [];
    const out = [];
    for (const key of Object.keys(KEY_TO_VIEW_BUSQUEDA)) {
      for (const item of data[key] || []) {
        const coincide = Object.values(item).some((v) => typeof v === "string" && normalizarTexto(v).includes(qn));
        if (coincide) out.push({ key, item });
      }
      if (out.length > 80) break;
    }
    return out.slice(0, 60);
  }, [qn, data]);

  return (
    <div className="fixed inset-0 z-[90] flex items-start justify-center p-4" style={{ background: "rgba(0,0,0,.7)", paddingTop: "8vh" }} onClick={onClose}>
      <div className="gp-panel w-full max-w-xl p-4 flex flex-col" style={{ maxHeight: "78vh" }} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-2 mb-3 shrink-0">
          <Search size={16} className="gp-text-muted" />
          <input autoFocus className="gp-input flex-1" placeholder="Buscar en todo ARKEYONE… (proyectos, pendientes, notas, contactos, movimientos…)" value={q} onChange={(e) => setQ(e.target.value)} />
          <button onClick={onClose} className="gp-btn-ghost p-1.5 rounded shrink-0"><X size={16} /></button>
        </div>
        <div className="overflow-y-auto gp-scroll flex-1 space-y-1">
          {!qn && <p className="text-sm gp-text-muted text-center py-8">Busca en todos tus módulos a la vez, incluyendo Notas.</p>}
          {qn && resultados.length === 0 && <p className="text-sm gp-text-muted text-center py-8">Sin resultados para "{q}".</p>}
          {resultados.map(({ key, item }) => {
            const Icono = ICONO_MODULO_BUSQUEDA[key] || FileText;
            const sub = subtituloResultadoBusqueda(key, item);
            return (
              <button key={key + item.id} onClick={() => onNavigate(key, item)} className="w-full flex items-center gap-3 p-2.5 rounded gp-btn-ghost text-left">
                <Icono size={15} className="gp-text-muted shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm truncate">{labelFor(key, item)}</span>
                    <Badge tone="muted">{ETIQUETA_TABLA[key]}</Badge>
                  </div>
                  {sub && <p className="text-xs gp-text-muted truncate">{sub}</p>}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}






// Formulario corto de nota. Lo usa la captura rápida (el botón flotante), donde no hay panel
// lateral ni etiquetas: solo título y texto para anotar algo en dos segundos. El editor completo
// vive en la pantalla de Notas.
function NotaForm({ item, onSave }) {
  const [titulo, setTitulo] = useState(item.titulo || "");
  const [contenido, setContenido] = useState(item.contenido || "");
  return (
    <div>
      <Field label="Título (opcional)"><input autoFocus className="gp-input" value={titulo} onChange={(e) => setTitulo(e.target.value)} /></Field>
      <Field label="Escribe lo que sea"><textarea className="gp-input" rows={8} value={contenido} onChange={(e) => setContenido(e.target.value)} /></Field>
      <button className="gp-btn w-full py-2 text-sm mt-1" onClick={() => onSave({ titulo: titulo.trim(), contenido })}>
        Guardar
      </button>
    </div>
  );
}

// Etiquetas legibles de las herramientas que puede ejecutar el asistente, para mostrar un
// resumen corto de qué hizo (en vez del nombre técnico de la función).
const ETIQUETA_ACCION_ASISTENTE = {
  buscar_datos: "Buscó información",
  crear_nota: "Creó una nota",
  crear_idea_proyecto: "Creó una idea nueva",
  crear_pendiente: "Creó un pendiente",
  registrar_avance_proyecto: "Registró un avance",
  crear_movimiento: "Registró un movimiento",
  crear_cita: "Agendó una cita",
  actualizar_pendiente: "Actualizó una tarea",
  eliminar_pendiente: "Eliminó una tarea",
  actualizar_movimiento: "Actualizó un movimiento",
  eliminar_movimiento: "Eliminó un movimiento",
  actualizar_proyecto: "Actualizó un proyecto",
  crear_contacto: "Creó un contacto",
  crear_atencion: "Registró una atención",
  actualizar_cita: "Reprogramó una cita",
  cancelar_cita: "Canceló una cita",
};
// A qué módulo de `data` (el estado local ya cargado en el navegador) pertenece cada
// herramienta de escritura del Asistente. Como el Asistente guarda directo en Supabase desde
// el servidor (Edge Function), el navegador no se entera solo — sin este mapeo, lo que crea
// el Asistente no aparecía en el resto de la app (Agenda, Pendientes, etc.) hasta recargar
// la página a mano.
const MODULO_POR_HERRAMIENTA_ASISTENTE = {
  crear_nota: "notas",
  crear_idea_proyecto: "proyectos",
  crear_pendiente: "pendientes",
  registrar_avance_proyecto: "comentarios",
  crear_movimiento: "finanzas",
  crear_cita: "citas",
  actualizar_pendiente: "pendientes",
  eliminar_pendiente: "pendientes",
  actualizar_movimiento: "finanzas",
  eliminar_movimiento: "finanzas",
  actualizar_proyecto: "proyectos",
  crear_contacto: "contactos",
  crear_atencion: "regalos",
  actualizar_cita: "citas",
  cancelar_cita: "citas",
};
// Herramientas cuyo resultado puede traer requiere_confirmacion:true — si el backend lo marca
// asi, NO se cuenta como "acción realizada" real todavía (nada se guardó), aunque la llamada
// haya ocurrido. Se usa para no mostrar una palomita de "hecho" cuando en realidad se está
// esperando el sí del usuario.
const ACCION_FUE_CONFIRMACION_PENDIENTE = (accion) => accion?.resultado?.requiere_confirmacion === true;


// Modo Conversación: capa flotante global de voz sobre el mismo Asistente/asistente-ia de
// siempre (no crea un chatbot aparte). Detecta la plataforma y usa dos caminos:
//  - Chrome/Edge/Android: SpeechRecognition nativo del navegador, en modo continuo con
//    reinicio automático — gratis y sin ida y vuelta de red extra.
//  - Safari iOS (no soporta SpeechRecognition, ni en PWA instalada): graba con MediaRecorder
//    y detecta el fin de cada turno con un VAD sencillo por energía (Web Audio API), luego
//    transcribe con la función transcribir-voz (Whisper). Requiere que se haya configurado
//    OPENAI_API_KEY como secret de Supabase; si no, el error se muestra y se ofrece el chat
//    de texto como respaldo.
// El "barge-in" (interrumpir a la IA hablando) usa el mismo micrófono ya abierto en ambos
// caminos — no hay un modo "siempre escuchando" en segundo plano, solo mientras este panel
// está abierto, como pide el Documento Maestro.
// Arkey: la mascota del Modo Conversación. Un robotcito de antenas y piernas cuyo cuerpo,
// ojos, boca y antenas reaccionan al estado real de la conversación (escuchando, pensando,
// hablando) en vez de ser un simple ícono estático.
// Puramente visual -- sin onClick ni ningún handler de puntero. La interrupción y el control del
// mic viven en los dos botones a los lados (oreja/boca, ver VoiceMode), no en tocar el avatar.
function ArkeyRobot({ estado }) {
  const colorCuerpo = "#9A2E1F"; // mismo rojo quemado del botón flotante -- identidad consistente
  const dormido = estado === "dormido";
  const colorAntena =
    estado === "escuchando" ? "#22c55e" :
    estado === "hablando" ? "var(--gold)" :
    estado === "procesando" ? "#f59e0b" :
    dormido ? "#4b5563" :
    "#6b7280";

  return (
    <div>
      <style>{`
        @keyframes arkey-bounce { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-3px); } }
        @keyframes arkey-antena { 0%,100% { opacity: .55; r: 5; } 50% { opacity: 1; r: 6.5; } }
        @keyframes arkey-talk { 0%,100% { transform: scaleY(1); } 50% { transform: scaleY(2.6); } }
        @keyframes arkey-blink { 0%,92%,100% { transform: scaleY(1); } 96% { transform: scaleY(.15); } }
        @keyframes arkey-pensar { 0%,100% { opacity: .25; } 50% { opacity: 1; } }
        @keyframes arkey-pie-tap { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-3px); } }
        @keyframes arkey-brazo-izq-mov { 0%,100% { transform: rotate(-10deg); } 50% { transform: rotate(20deg); } }
        @keyframes arkey-brazo-der-mov { 0%,100% { transform: rotate(10deg); } 50% { transform: rotate(-20deg); } }
        .arkey-grupo { animation: ${estado === "escuchando" ? "arkey-bounce 1.6s ease-in-out infinite" : "none"}; transform-origin: center; }
        .arkey-antena-punta { animation: ${estado === "escuchando" || estado === "hablando" ? "arkey-antena 1s ease-in-out infinite" : "none"}; transform-origin: center; }
        .arkey-ojo { animation: arkey-blink 4s ease-in-out infinite; transform-origin: center; }
        .arkey-boca-hablando { animation: arkey-talk .35s ease-in-out infinite; transform-origin: center; }
        .arkey-punto1 { animation: arkey-pensar 1s ease-in-out infinite; }
        .arkey-punto2 { animation: arkey-pensar 1s ease-in-out .2s infinite; }
        .arkey-punto3 { animation: arkey-pensar 1s ease-in-out .4s infinite; }
        .arkey-pie-izq { animation: ${estado === "hablando" ? "arkey-pie-tap .5s ease-in-out infinite" : "none"}; transform-origin: center; }
        .arkey-pie-der { animation: ${estado === "hablando" ? "arkey-pie-tap .5s ease-in-out infinite .25s" : "none"}; transform-origin: center; }
        .arkey-brazo-izq { animation: ${estado === "hablando" ? "arkey-brazo-izq-mov .6s ease-in-out infinite" : "none"}; }
        .arkey-brazo-der { animation: ${estado === "hablando" ? "arkey-brazo-der-mov .6s ease-in-out infinite .3s" : "none"}; }
      `}</style>
      <svg width="118" height="147" viewBox="0 0 120 150" className="arkey-grupo">
        {/* antenas */}
        <line x1="38" y1="34" x2="24" y2="10" stroke={colorAntena} strokeWidth="3" strokeLinecap="round" />
        <line x1="82" y1="34" x2="96" y2="10" stroke={colorAntena} strokeWidth="3" strokeLinecap="round" />
        <circle className="arkey-antena-punta" cx="24" cy="10" r="6" fill={colorAntena} />
        <circle className="arkey-antena-punta" cx="96" cy="10" r="6" fill={colorAntena} />
        {/* cuerpo / cabeza */}
        <rect x="18" y="30" width="84" height="72" rx="26" fill={colorCuerpo} />
        {/* cara */}
        <rect x="32" y="48" width="56" height="40" rx="14" fill="#0B2341" />
        {/* ojos: dormido = arquitos cerrados en vez de círculos, sin parpadeo */}
        {dormido ? (
          <>
            <path d="M42 66 Q48 70 54 66" stroke="#6b7280" strokeWidth="2.5" strokeLinecap="round" fill="none" />
            <path d="M66 66 Q72 70 78 66" stroke="#6b7280" strokeWidth="2.5" strokeLinecap="round" fill="none" />
          </>
        ) : (
          <>
            <circle className="arkey-ojo" cx="48" cy="66" r={estado === "escuchando" ? 6.5 : 5.5} fill="var(--gold)" />
            <circle className="arkey-ojo" cx="72" cy="66" r={estado === "escuchando" ? 6.5 : 5.5} fill="var(--gold)" />
          </>
        )}
        {/* boca */}
        {dormido ? (
          <text x="60" y="82" textAnchor="middle" fontSize="10" fill="#6b7280">zzZ</text>
        ) : estado === "hablando" ? (
          <rect className="arkey-boca-hablando" x="52" y="76" width="16" height="4" rx="2" fill="var(--gold)" />
        ) : estado === "procesando" ? (
          <>
            <circle className="arkey-punto1" cx="52" cy="78" r="2.5" fill="var(--gold)" />
            <circle className="arkey-punto2" cx="60" cy="78" r="2.5" fill="var(--gold)" />
            <circle className="arkey-punto3" cx="68" cy="78" r="2.5" fill="var(--gold)" />
          </>
        ) : (
          <rect x="52" y="77" width="16" height="2.5" rx="1.25" fill="var(--gold)" opacity=".7" />
        )}
        {/* brazos + manitas: cada uno gira desde el hombro (transform-origin en el punto donde
            pegan al cuerpo) para poder "gesticular" mientras habla */}
        <g className="arkey-brazo-izq" transform-origin="18 52">
          <rect x="2" y="47" width="18" height="10" rx="5" fill={colorCuerpo} />
          <circle cx="6" cy="52" r="6.5" fill={colorCuerpo} />
        </g>
        <g className="arkey-brazo-der" transform-origin="102 52">
          <rect x="100" y="47" width="18" height="10" rx="5" fill={colorCuerpo} />
          <circle cx="114" cy="52" r="6.5" fill={colorCuerpo} />
        </g>
        {/* piernas + tenis blancos: cada una en su propio grupo para poder "taconear" al hablar */}
        <g className="arkey-pie-izq">
          <rect x="35" y="102" width="14" height="24" rx="6" fill={colorCuerpo} />
          <rect x="30" y="122" width="24" height="9" rx="4" fill="#FFFFFF" stroke="#0B2341" strokeWidth="1.5" />
          <rect x="30" y="127" width="24" height="3" rx="1.5" fill="#D1D5DB" />
        </g>
        <g className="arkey-pie-der">
          <rect x="71" y="102" width="14" height="24" rx="6" fill={colorCuerpo} />
          <rect x="66" y="122" width="24" height="9" rx="4" fill="#FFFFFF" stroke="#0B2341" strokeWidth="1.5" />
          <rect x="66" y="127" width="24" height="3" rx="1.5" fill="#D1D5DB" />
        </g>
      </svg>
    </div>
  );
}

function VoiceMode({ contextoPantalla, onDatosCreados, nombreUsuario }) {
  const [abierto, setAbierto] = useState(false);
  const [estado, setEstado] = useState("inactivo"); // inactivo | escuchando | procesando | hablando | permiso | error
  const [errorMsg, setErrorMsg] = useState("");
  const [transcripciones, setTranscripciones] = useState([]); // [{rol, texto}]
  const [uso, setUso] = useState(null); // {usadas, limite}
  const [textoManual, setTextoManual] = useState("");
  const [historialAbierto, setHistorialAbierto] = useState(false);
  const [diasHistorial, setDiasHistorial] = useState(null); // null = no cargado; [] = cargado y vacio
  const [diaSeleccionado, setDiaSeleccionado] = useState(null);
  const [mensajesDia, setMensajesDia] = useState([]);

  const estadoRef = useRef("inactivo");
  const abiertoRef = useRef(false);
  const scrollRef = useRef(null); // contenedor de mensajes: se usa para auto-scroll al fondo
  const timerSilencioRef = useRef(null); // temporizador de 700ms que decide cuándo mandar lo que se dijo (ver iniciarEscuchaNativa); debe poder cancelarse desde detenerTodo()
  const finalBufferRef = useRef(""); // texto final acumulado del turno actual (camino nativo); vive fuera del reconocedor porque cada reinicio (ver r.onend) crea uno nuevo, y debe sobrevivir a esos reinicios sin duplicarse
  const recognitionRef = useRef(null);
  const streamRef = useRef(null);
  const audioCtxRef = useRef(null);
  const analyserRef = useRef(null);
  const rafRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const empezoHablarRef = useRef(null);
  const silencioDesdeRef = useRef(null);
  const wakeLockRef = useRef(null); // WakeLockSentinel activo mientras el panel está abierto, para que la pantalla no se bloquee sola

  // Botón oreja (izquierda del avatar): si el micrófono debe estar escuchando o no. Reemplaza al
  // viejo "mutear micrófono" -- apaga/enciende el mic de verdad (no solo lo silencia), en cualquier
  // estado, y decide si se reactiva solo al terminar de hablar/procesar (ver volverAEscuchar,
  // reanudarMicTrasHablarIOS, iniciarEscuchaNativa, iniciarEscuchaIOS). Default true al abrir el
  // panel (ver abrir()), no se persiste entre sesiones.
  const [escuchaActiva, setEscuchaActiva] = useState(true);
  const escuchaActivaRef = useRef(true);
  const cambiarEscuchaActiva = (v) => { escuchaActivaRef.current = v; setEscuchaActiva(v); };
  // Ninguna plataforma escucha nada mientras Arkey habla (ver hablar()) -- para que la oreja no
  // muestre "encendida" sin que en realidad esté pasando nada, se apaga sola (visual y funcional)
  // apenas empieza a hablar, y se restaura al valor real de antes justo al terminar/interrumpir (ver
  // volverAEscuchar/reanudarMicTrasHablarIOS). Este ref guarda ese valor real mientras dura el forzado.
  const escuchaActivaPreHablandoRef = useRef(true);
  // Botón boca (derecha del avatar): mantenerlo presionado corta la voz de Arkey de inmediato --
  // al soltarlo, siempre vuelve a quedar activada para lo que siga (ver alPresionarBoca/
  // alSoltarBoca) -- no es un interruptor persistente, es "presiona para interrumpir". Default
  // true al abrir el panel, no se persiste entre sesiones.
  const [vozActiva, setVozActiva] = useState(true);
  const vozActivaRef = useRef(true);
  const cambiarVozActiva = (v) => { vozActivaRef.current = v; setVozActiva(v); };
  // Qué burbuja del chat se está leyendo en voz alta con su propio botón ▶ (distinto de la
  // respuesta en vivo de Arkey, estado "hablando") -- id compuesto por vista+índice (ver render),
  // así no choca entre el historial y la conversación en curso. null = nada sonando así.
  const [mensajeReproduciendoId, setMensajeReproduciendoId] = useState(null);
  const mensajeReproduciendoIdRef = useRef(null);
  const cambiarMensajeReproduciendoId = (v) => { mensajeReproduciendoIdRef.current = v; setMensajeReproduciendoId(v); };
  const [copiadoId, setCopiadoId] = useState(null); // id del mensaje cuyo botón de copiar muestra el check de "copiado" un instante

  // Silenciar el audio (bocina en el header, junto al historial): simula el botón físico de
  // silencio del dispositivo. Pone en 0 el volumen de las utterances nuevas (ver hablar()/
  // leerTextoMensaje()) Y corta de inmediato lo que ya esté sonando en ese momento (reusa
  // interrumpirVoz(), que ya sabe cortar tanto la respuesta en vivo como una burbuja puntual sin
  // dejar nada colgado -- ver ahí). Desmutear no revive nada, solo deja de silenciar lo que venga
  // después. Igual que la oreja y la boca, NO se persiste entre aperturas del panel -- siempre
  // arranca activa (sin mutear) al abrir (ver abrir()).
  const [audioMuteado, setAudioMuteado] = useState(false);
  const audioMuteadoRef = useRef(false);
  const cambiarAudioMuteado = (v) => { audioMuteadoRef.current = v; setAudioMuteado(v); };
  function alternarAudioMuteado() {
    const nuevo = !audioMuteadoRef.current;
    cambiarAudioMuteado(nuevo);
    if (nuevo) interrumpirVoz(); // corta ya lo que esté sonando, no solo lo que venga después
  }

  const [nivelMic, setNivelMic] = useState(0); // 0..1, para la barra visual del nivel captado por el micrófono
  const nivelAnalyserRef = useRef(null); // apunta al analyser del VAD en el camino iOS de respaldo (en el camino nativo no hay acceso al audio crudo)
  const medidorIntervalRef = useRef(null);

  const cambiarEstado = (nuevo) => { estadoRef.current = nuevo; setEstado(nuevo); };

  function leerNivelDeAnalyser(analyser) {
    if (!analyser) return 0;
    const buffer = new Uint8Array(analyser.fftSize);
    analyser.getByteTimeDomainData(buffer);
    let suma = 0;
    for (let i = 0; i < buffer.length; i++) {
      const v = (buffer[i] - 128) / 128;
      suma += v * v;
    }
    return Math.sqrt(suma / buffer.length);
  }

  function iniciarMedidorVisual() {
    if (medidorIntervalRef.current) return;
    medidorIntervalRef.current = setInterval(() => {
      const rms = leerNivelDeAnalyser(nivelAnalyserRef.current);
      setNivelMic(Math.min(1, rms / 0.2));
    }, 80);
  }

  function detenerMedidorVisual() {
    if (medidorIntervalRef.current) clearInterval(medidorIntervalRef.current);
    medidorIntervalRef.current = null;
    setNivelMic(0);
  }

  // Botón oreja: apaga o enciende la escucha de verdad. El botón está deshabilitado mientras
  // "hablando" (ver el disabled del render -- nada escucha ahí en ninguna plataforma, ver
  // hablar()), así que esta función solo se llama estando "escuchando"/"procesando"/inactivo. Al
  // apagar, para todo de inmediato. Al encender, si no está "procesando" arranca a escuchar ya; si
  // sí lo está, el propio flujo de enviarTurno()/hablar()/volverAEscuchar()/
  // reanudarMicTrasHablarIOS() ya respeta escuchaActivaRef cuando llegue el momento (ver ahí).
  function alternarEscuchaActiva() {
    const nuevo = !escuchaActiva;
    cambiarEscuchaActiva(nuevo);
    if (!nuevo) {
      if (usaSTTNativo) { try { recognitionRef.current?.stop(); } catch {} }
      else pausarMicIOS();
      return;
    }
    if (abiertoRef.current && estadoRef.current !== "hablando" && estadoRef.current !== "procesando") {
      cambiarEstado("escuchando");
      if (usaSTTNativo) iniciarEscuchaNativa();
      else iniciarEscuchaIOS();
    }
  }

  // Primer nombre a partir del correo, para un saludo mas cercano cuando abre el panel.
  const primerNombre = (nombreUsuario || "").split("@")[0]?.split(/[._-]/)[0];
  const nombreCapitalizado = primerNombre ? primerNombre.charAt(0).toUpperCase() + primerNombre.slice(1) : "";
  const SALUDO_INICIAL = nombreCapitalizado ? `¡Hola ${nombreCapitalizado}! ¿En qué puedo apoyarte?` : "¡Hola! ¿En qué puedo apoyarte?";

  // En iOS, Safari a veces solo deja que speechSynthesis suene si la primerísima vez que se usa
  // en la sesión ocurre en el mismo instante de un toque real del usuario (sincrónico, sin ningún
  // await de por medio). Nuestra respuesta llega segundos después por la red, así que ese permiso
  // ya se perdió para cuando intentamos hablar. Por eso "desbloqueamos" la voz aquí, directo
  // dentro de cada toque genuino (abrir el panel, cortar el turno), con una utterance silenciosa.
  const desbloquearVoz = () => {
    try {
      // Solo hace falta en iOS Safari (ver arriba) -- en el resto de plataformas, esta utterance
      // silenciosa seguida del cancel() de hablar() (a milisegundos de distancia) coincidía con un
      // bug conocido de Chrome de escritorio: el motor de voz se queda internamente "pausado" tras
      // el cancel() y cualquier speak() posterior se encola sin sonar nunca, sin lanzar error --
      // eso hacía que Arkey transcribiera y respondiera en texto bien, pero nunca hablara en Chrome.
      if (!esIOS) return;
      if (!("speechSynthesis" in window)) return;
      const u = new SpeechSynthesisUtterance(" ");
      u.volume = 0;
      window.speechSynthesis.speak(u);
    } catch {}
  };

  // Posición libre del botón flotante, igual que el botón ⚡ (QuickCapture): por default abajo
  // a la izquierda, pero se puede arrastrar a donde acomode y se recuerda por dispositivo.
  const [pos, setPos] = useState(() => {
    try {
      const guardada = localStorage.getItem("arkeyone_vm_pos");
      return guardada ? JSON.parse(guardada) : null; // null = posición default
    } catch { return null; }
  });
  const btnRef = useRef(null);
  const arrastreRef = useRef({ activo: false, movido: false, startX: 0, startY: 0, offsetX: 0, offsetY: 0 });

  const clampPos = (x, y) => {
    const w = 66, h = 66, margen = 8;
    const maxX = window.innerWidth - w - margen;
    const maxY = window.innerHeight - h - margen;
    return { x: Math.min(Math.max(x, margen), maxX), y: Math.min(Math.max(y, margen), maxY) };
  };
  const onBtnPointerDown = (e) => {
    const rect = btnRef.current.getBoundingClientRect();
    arrastreRef.current = {
      activo: true, movido: false, startX: e.clientX, startY: e.clientY,
      offsetX: e.clientX - rect.left, offsetY: e.clientY - rect.top,
    };
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch {}
  };
  const onBtnPointerMove = (e) => {
    const a = arrastreRef.current;
    if (!a.activo) return;
    if (!a.movido && (Math.abs(e.clientX - a.startX) > 6 || Math.abs(e.clientY - a.startY) > 6)) a.movido = true;
    if (!a.movido) return;
    setPos(clampPos(e.clientX - a.offsetX, e.clientY - a.offsetY));
  };
  const onBtnPointerUp = () => {
    const a = arrastreRef.current;
    if (a.movido) {
      setPos((p) => {
        if (p) { try { localStorage.setItem("arkeyone_vm_pos", JSON.stringify(p)); } catch {} }
        return p;
      });
    } else {
      desbloquearVoz(); // toque real del usuario: aprovecharlo para desbloquear la voz en iOS
      abrir(); // fue un toque, no un arrastre: abre el Modo Conversación como siempre
    }
    arrastreRef.current.activo = false;
  };

  const SpeechRecognitionCtor = typeof window !== "undefined" && (window.SpeechRecognition || window.webkitSpeechRecognition);
  const usaSTTNativo = !!SpeechRecognitionCtor;
  // Nota: algún Safari futuro (iOS 26+) podría traer reconocimiento de voz nativo real, con lo
  // que usaSTTNativo sería true también en iOS y entraría por el mismo camino que Chrome/Android
  // (ver hablar()/iniciarEscuchaNativa). Hoy en la práctica los iPhone reales usan el camino de
  // respaldo de abajo (MediaRecorder + VAD), donde esta variable sí se usa para sus propios ajustes.
  const esIOS = typeof navigator !== "undefined" && /iPad|iPhone|iPod/.test(navigator.userAgent || "");
  const soportaModoVoz = usaSTTNativo || (typeof navigator !== "undefined" && navigator.mediaDevices?.getUserMedia && typeof window !== "undefined" && window.MediaRecorder);

  useEffect(() => () => detenerTodo(), []); // limpia todo si el componente se desmonta

  // Screen Wake Lock: evita que la pantalla se bloquee sola mientras el panel de Modo Conversación
  // está abierto (no tiene sentido que se apague a media conversación con Arkey). Silencioso si el
  // navegador no lo soporta (Safari lo soporta desde iOS 16.4) o si el permiso se niega.
  async function pedirWakeLock() {
    if (!("wakeLock" in navigator)) return;
    try { wakeLockRef.current = await navigator.wakeLock.request("screen"); } catch {}
  }
  function soltarWakeLock() {
    try { wakeLockRef.current?.release(); } catch {}
    wakeLockRef.current = null;
  }

  function detenerTodo() {
    // Desconectamos los handlers ANTES de abortar: si no, el propio r.onend puede disparar
    // un r.start() de auto-reinicio (ver iniciarEscuchaNativa) por una condición de carrera
    // entre el evento asíncrono del navegador y el cierre del panel. Mismo helper que usa
    // iniciarEscuchaNativa() antes de crear una instancia nueva -- comportamiento idéntico al
    // que había aquí, solo sin duplicar el código. No toca nada del camino de iOS (streamRef,
    // audioCtxRef, mediaRecorderRef, más abajo).
    detenerRecognitionActual();
    try { mediaRecorderRef.current?.stop(); } catch {}
    mediaRecorderRef.current = null;
    try { streamRef.current?.getTracks().forEach((t) => t.stop()); } catch {}
    streamRef.current = null;
    try { audioCtxRef.current?.close(); } catch {}
    audioCtxRef.current = null;
    analyserRef.current = null;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    try { window.speechSynthesis?.cancel(); } catch {}
    cambiarMensajeReproduciendoId(null); // no dejar una burbuja marcada como "sonando" para la próxima vez que se abra el panel
    if (timerSilencioRef.current) { clearTimeout(timerSilencioRef.current); timerSilencioRef.current = null; } // corta el envío pendiente de lo último que se dijo, si lo había -- si no, se manda solo y reactiva el mic aunque el panel ya esté cerrado
    finalBufferRef.current = ""; // no dejar texto de un turno a medias colgado para la próxima vez que se abra el panel
    empezoHablarRef.current = null;
    silencioDesdeRef.current = null;

    detenerMedidorVisual();
    nivelAnalyserRef.current = null;
    soltarWakeLock();

    // Bug conocido de WebKit en iOS: abort()/stop() detiene el reconocimiento o la grabación pero
    // a veces no libera de inmediato la sesión de audio del sistema, y el punto/indicador de
    // micrófono se queda encendido aunque ya no estemos escuchando. Forzamos la liberación pidiendo
    // y cerrando al instante un stream de audio "vacío": eso obliga a iOS a soltar la sesión de
    // grabación de verdad. Antes esto solo corría con usaSTTNativo (pensado para el eventual
    // reconocimiento nativo de iOS 26), pero el camino real que usa hoy la mayoría de iPhones es
    // MediaRecorder/VAD -- se quita esa condición para que el workaround corra ahí también, en vez
    // de depender de un reload() completo de la página (se quitó de cerrar(), ver abajo, porque
    // hacía que Safari no reutilizara el permiso de mic ya otorgado).
    if (esIOS && navigator.mediaDevices?.getUserMedia) {
      navigator.mediaDevices.getUserMedia({ audio: true })
        .then((s) => s.getTracks().forEach((t) => t.stop()))
        .catch(() => {});
    }
  }

  const abrir = async () => {
    setTranscripciones([{ rol: "asistente", texto: SALUDO_INICIAL }]);
    setErrorMsg("");
    abiertoRef.current = true;
    setAbierto(true);
    cambiarEscuchaActiva(true); // oreja, boca y bocina siempre arrancan encendidas -- no se persisten entre aperturas del panel
    cambiarVozActiva(true);
    cambiarAudioMuteado(false);
    cargarUso();
    pedirWakeLock();
    if (!soportaModoVoz) {
      cambiarEstado("error");
      setErrorMsg("Tu navegador no soporta el Modo Conversación por voz.");
      return;
    }
    iniciarMedidorVisual();
    // En el camino nativo (Chrome/Android) no se pide micrófono aquí -- SpeechRecognition pide
    // su propio permiso al arrancar (ver iniciarEscuchaNativa, llamado dentro de hablar()).
    // Pedirlo dos veces por separado (un stream propio aquí + el interno de SpeechRecognition)
    // hacía que algunos Android se quedaran con dos sesiones de micrófono compitiendo entre sí
    // y el reconocimiento nunca llegaba a escuchar de verdad ("saluda pero no escucha"). En el
    // camino iOS de respaldo, hablar() abre el micrófono (asegurarMicAbierto) antes de decir el
    // saludo -- así el diálogo de permiso del sistema aparece ANTES del saludo hablado, y ese
    // mismo stream se queda abierto el resto de la sesión (ver el comentario en asegurarMicAbierto).
    await hablar(SALUDO_INICIAL); // el saludo no gasta cuota (no llama a asistente-ia); al terminar de decirlo, pasa solo a escuchar
  };

  async function cargarUso() {
    try {
      const { data: sesion } = await supabase.auth.getSession();
      const uid = sesion?.session?.user?.id;
      if (!uid) return;
      const mes = new Date().toISOString().slice(0, 7);
      const { data } = await supabase.from("asistente_uso").select("consultas_usadas, limite_mes").eq("user_id", uid).eq("mes", mes).maybeSingle();
      if (data) setUso({ usadas: data.consultas_usadas, limite: data.limite_mes });
      else setUso({ usadas: 0, limite: 100 });
    } catch {}
  }

  const cerrar = () => {
    // En iOS, recargar la página completa al cerrar el panel es la única forma confiable de que
    // WebKit suelte de verdad la sesión de audio del sistema (el punto/indicador de "grabando" se
    // quedaba encendido sin esto -- confirmado real en el iPhone de Angel; el workaround más
    // liviano del stream "vacío" en detenerTodo() no bastaba por sí solo). Se guarda la pantalla
    // actual (contextoPantalla) para restaurarla justo después del reload, así no se siente como
    // perder el lugar. Trade-off aceptado a propósito: esto puede hacer que Safari vuelva a pedir
    // permiso de micrófono la próxima vez que se abra el panel (WebKit no siempre reutiliza el
    // permiso ya otorgado tras un reload en una PWA instalada) -- se prioriza que el mic quede
    // realmente apagado sobre evitar ese re-permiso.
    if (esIOS) {
      try { localStorage.setItem("arkeyone_reload_vista", JSON.stringify(contextoPantalla || null)); } catch {}
      window.location.reload();
      return;
    }
    detenerTodo();
    abiertoRef.current = false;
    setAbierto(false);
    cambiarEstado("inactivo");
    setHistorialAbierto(false);
    setDiaSeleccionado(null);
  };

  // ---------- Camino Chrome/Android: SpeechRecognition nativo ----------
  // Detiene y limpia por completo la instancia de reconocimiento actual (si había una) antes de
  // crear una nueva. iniciarEscuchaNativa() se llama desde varios sitios (volverAEscuchar() al
  // terminar de hablar, alternarEscuchaActiva() al encender) sin que ninguno detuviera antes la
  // instancia anterior -- si una vieja seguía viva justo cuando se crea la siguiente, quedan dos
  // objetos SpeechRecognition compitiendo por la misma sesión de audio del sistema en Android: la
  // segunda arranca sin error pero nunca recibe resultados (el mic "parece" escuchar pero no
  // captura audio real). Único punto de entrada para garantizar que nunca hay dos instancias vivas
  // al mismo tiempo, sin importar desde cuál sitio se llame.
  function detenerRecognitionActual() {
    const r = recognitionRef.current;
    if (r) {
      try {
        r.onresult = null; r.onerror = null; r.onend = null; r.onstart = null; r.onspeechend = null; r.onaudioend = null;
        r.abort();
      } catch {}
    }
    recognitionRef.current = null;
  }

  function iniciarEscuchaNativa() {
    if (!escuchaActivaRef.current) return; // la oreja está apagada -- no arrancamos hasta que se reactive (ver alternarEscuchaActiva)
    if (sinCreditosRef.current) return; // sin consultas disponibles este mes: Arkey se queda dormido, no escucha
    detenerRecognitionActual();
    const r = new SpeechRecognitionCtor();
    r.lang = "es-MX";
    r.continuous = true;
    r.interimResults = true;
    // Marcador propio de hasta dónde ya se agregó a finalBufferRef, en vez de confiar a ciegas en
    // e.resultIndex (no es confiable en Android en modo continuo). Como esta sesión es un objeto
    // SpeechRecognition recién creado (ver detenerRecognitionActual arriba), e.results empieza
    // vacío de verdad y arrancar en 0 es correcto.
    let indiceProcesado = 0;

    r.onresult = (e) => {
      // Ya no se escucha en absoluto mientras "hablando" en ninguna plataforma (ver hablar()) --
      // este handler solo procesa resultados durante "escuchando".
      if (estadoRef.current !== "escuchando") return;
      let huboCambio = false;
      for (let i = Math.max(e.resultIndex, indiceProcesado); i < e.results.length; i++) {
        if (!e.results[i].isFinal) continue;
        indiceProcesado = i + 1;
        const nuevo = (e.results[i][0].transcript || "").trim();
        if (!nuevo) continue;
        huboCambio = true;
        const actual = finalBufferRef.current;
        if (!actual) {
          finalBufferRef.current = nuevo;
          continue;
        }
        const actualMin = actual.toLowerCase();
        const nuevoMin = nuevo.toLowerCase();
        if (nuevoMin.includes(actualMin)) {
          // En modo continuo, Android a veces no segmenta limpio: en vez de mandar solo la
          // palabra nueva, re-finaliza el mismo tramo completo (con ligeras correcciones) como
          // un resultado "final" adicional -- si se concatenara tal cual, el texto se repite y
          // crece sin parar. Si el resultado nuevo ya incluye completo lo que teníamos, es una
          // revisión más larga del mismo tramo: se reemplaza, no se concatena.
          finalBufferRef.current = nuevo;
        } else if (actualMin.includes(nuevoMin)) {
          // No aporta nada que no tuviéramos ya -- se ignora.
        } else {
          finalBufferRef.current = `${actual} ${nuevo}`;
        }
      }
      if (huboCambio && finalBufferRef.current.trim()) {
        if (timerSilencioRef.current) clearTimeout(timerSilencioRef.current);
        // Pequeña pausa antes de mandar, para no cortar al usuario si sigue hablando. Se guarda
        // en un ref (no en una variable local) para que detenerTodo() -- llamado al cerrar el
        // panel -- pueda cancelarlo; si no, este envío se dispara igual aunque el panel ya esté
        // cerrado, y al terminar de responder reactiva el micrófono solo (bug reportado).
        timerSilencioRef.current = setTimeout(() => {
          timerSilencioRef.current = null;
          const texto = finalBufferRef.current.trim();
          finalBufferRef.current = "";
          if (texto) {
            try { r.stop(); } catch {}
            enviarTurno(texto);
          }
        }, 700);
      }
    };
    r.onerror = (e) => {
      if (e.error === "no-speech" || e.error === "aborted") return;
      if (e.error === "not-allowed" || e.error === "service-not-allowed") {
        cambiarEstado("permiso");
        setErrorMsg("ARKEYONE necesita permiso de micrófono para el Modo Conversación.");
      }
    };
    r.onend = () => {
      // Si seguimos abiertos y en modo escucha, se reinicia solo (el navegador a veces corta
      // el reconocimiento tras una pausa aunque continuous=true). iniciarEscuchaNativa() ya revisa
      // por su cuenta si la oreja sigue activa (ver ahí) -- no hace falta repetir ese chequeo aquí.
      // IMPORTANTE: se reinicia con un objeto SpeechRecognition NUEVO (iniciarEscuchaNativa), no
      // llamando r.start() sobre este mismo objeto -- en Android, reusar el mismo objeto a veces
      // no reinicia de verdad su lista interna de resultados, duplicando el texto acumulado.
      if (abiertoRef.current && estadoRef.current === "escuchando") {
        iniciarEscuchaNativa();
      }
    };
    recognitionRef.current = r;
    try { r.start(); } catch { cambiarEstado("error"); setErrorMsg("No se pudo iniciar el micrófono."); }
  }

  // ---------- Camino iOS Safari: MediaRecorder + VAD por energía ----------
  function mimeTypeSoportado() {
    const candidatos = ["audio/mp4", "audio/webm;codecs=opus", "audio/webm"];
    for (const c of candidatos) {
      if (window.MediaRecorder?.isTypeSupported?.(c)) return c;
    }
    return "";
  }

  // El micrófono se abre una sola vez y se queda abierto mientras el panel siga abierto -- no se
  // cierra ni se reabre en cada respuesta de Arkey. Antes sí se cerraba y reabría alrededor de
  // cada "hablando" (ver pausarMicIOS/git), lo que dejaba un hueco real de tiempo -- el de pedir
  // getUserMedia y armar el AudioContext de cero -- durante el cual no había nada escuchando: por
  // eso la interrupción por voz se sentía poco sensible aunque se bajara el umbral. Trade-off
  // aceptado de nuevo por Angel (como al principio, antes de que existiera pausarMicIOS): con el
  // mic siempre abierto, a veces Safari puede enrutar el audio distinto y la voz de Arkey sonar
  // más bajito.
  async function asegurarMicAbierto() {
    if (streamRef.current?.getAudioTracks().some((t) => t.readyState === "live")) return true; // ya está abierto de antes
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      stream.getAudioTracks().forEach((t) => { t.enabled = true; });
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      const ctx = new AudioCtx();
      audioCtxRef.current = ctx;
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 2048;
      source.connect(analyser);
      analyserRef.current = analyser;
      nivelAnalyserRef.current = analyser; // mismo analyser sirve para el VAD y para el medidor visual
      return true;
    } catch {
      cambiarEstado("permiso");
      setErrorMsg("ARKEYONE necesita permiso de micrófono para el Modo Conversación.");
      return false;
    }
  }

  async function iniciarEscuchaIOS() {
    if (!escuchaActivaRef.current) return false; // la oreja está apagada -- no arrancamos hasta que se reactive (ver alternarEscuchaActiva)
    if (sinCreditosRef.current) return false; // sin consultas disponibles este mes: Arkey se queda dormido, no escucha
    const ok = await asegurarMicAbierto();
    if (!ok) return false;
    iniciarSegmentoGrabacion();
    if (!rafRef.current) loopVAD(); // por si el loop se hubiera detenido -- normalmente ya corre desde abrir()
    return true;
  }

  function iniciarSegmentoGrabacion() {
    if (!streamRef.current) return;
    const mime = mimeTypeSoportado();
    try {
      const mr = new MediaRecorder(streamRef.current, mime ? { mimeType: mime } : undefined);
      chunksRef.current = [];
      mr.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mr.start();
      mediaRecorderRef.current = mr;
    } catch {
      cambiarEstado("error");
      setErrorMsg("No se pudo grabar audio en este navegador.");
    }
  }

  function loopVAD() {
    const tick = () => {
      const analyser = analyserRef.current;
      if (!analyser) return; // se detuvo el modo conversación
      const buffer = new Uint8Array(analyser.fftSize);
      analyser.getByteTimeDomainData(buffer);
      let suma = 0;
      for (let i = 0; i < buffer.length; i++) {
        const v = (buffer[i] - 128) / 128;
        suma += v * v;
      }
      const rms = Math.sqrt(suma / buffer.length);
      const ahora = Date.now();
      const UMBRAL = 0.012;

      // La interrupción automática por voz mientras "hablando" se desactivó a petición de Angel:
      // iOS ahora se comporta igual que Android -- la única forma de interrumpir a Arkey es el
      // botón boca (ver interrumpirVoz/alPresionarBoca). Antes esta rama comparaba el nivel de
      // audio contra un umbral más alto (para distinguir el propio eco de Arkey de una
      // interrupción real) y cancelaba la síntesis -- ya no hace nada, se deja el bloque vacío en
      // vez de borrar por completo el "if" para que quede claro dónde vivía esa lógica si hace
      // falta reactivarla.
      if (estadoRef.current === "hablando") {
        // (intencionalmente sin acción)
      } else if (estadoRef.current === "escuchando") {
        if (rms > UMBRAL) {
          if (!empezoHablarRef.current) empezoHablarRef.current = ahora;
          silencioDesdeRef.current = null;
        } else if (empezoHablarRef.current) {
          if (!silencioDesdeRef.current) silencioDesdeRef.current = ahora;
          else if (ahora - silencioDesdeRef.current > 900) {
            empezoHablarRef.current = null;
            silencioDesdeRef.current = null;
            finalizarSegmentoYEnviar();
          }
        }
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
  }

  function finalizarSegmentoYEnviar() {
    const mr = mediaRecorderRef.current;
    if (!mr || mr.state === "inactive") return;
    cambiarEstado("procesando");
    mr.onstop = async () => {
      const blob = new Blob(chunksRef.current, { type: mr.mimeType || "audio/webm" });
      chunksRef.current = [];
      if (blob.size < 2000) { volverAEscucharIOS(); return; } // muy corto, probablemente ruido
      await transcribirYEnviar(blob);
    };
    mr.stop();
  }

  async function transcribirYEnviar(blob) {
    try {
      const token = await tokenDeSesion();
      const form = new FormData();
      form.append("audio", blob, blob.type.includes("mp4") ? "audio.mp4" : "audio.webm");
      const resp = await fetch(`${supabase.supabaseUrl}/functions/v1/transcribir-voz`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      });
      const json = await resp.json().catch(() => ({}));
      if (!resp.ok || json.error) {
        setErrorMsg(json.error || "No se pudo transcribir tu audio.");
        volverAEscucharIOS();
        return;
      }
      const texto = (json.texto || "").trim();
      if (!texto) { volverAEscucharIOS(); return; }
      await enviarTurno(texto);
    } catch {
      setErrorMsg("No se pudo transcribir. Revisa tu conexión.");
      volverAEscucharIOS();
    }
  }

  function volverAEscucharIOS() {
    if (!abiertoRef.current) return;
    cambiarEstado("escuchando");
    iniciarSegmentoGrabacion();
  }

  // Cierre completo del micrófono en iOS -- YA NO se llama automáticamente antes de cada
  // hablar() (eso fue lo que hacía sentir poco sensible la interrupción por voz: reabrir de cero
  // tarda un rato real durante el cual no hay nada escuchando, ver asegurarMicAbierto). Ahora solo
  // se usa para el apagado explícito de la oreja (alternarEscuchaActiva) y para el cierre completo
  // del panel (detenerTodo). Efecto secundario aceptado de nuevo (decisión explícita de Angel):
  // con el mic siempre abierto mientras Arkey habla, Safari a veces enruta el audio al auricular
  // en vez de la bocina y la voz de Arkey puede sonar más bajito.
  async function pausarMicIOS() {
    try { mediaRecorderRef.current?.stop(); } catch {}
    mediaRecorderRef.current = null;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    try { streamRef.current?.getTracks().forEach((t) => t.stop()); } catch {}
    streamRef.current = null;
    try { await audioCtxRef.current?.close(); } catch {} // esperamos de verdad a que cierre, si no iOS puede tardar en soltar la sesion de audio de grabacion
    audioCtxRef.current = null;
    analyserRef.current = null;
  }

  async function reanudarMicTrasHablarIOS() {
    if (!abiertoRef.current) return;
    // La oreja se había apagado sola al entrar a "hablando" (ver hablar()) -- se restaura aquí al
    // valor real de antes de forzarla, sea que Arkey terminó de hablar solo o lo interrumpieron
    // con el botón boca (interrumpirVoz() llama esta función solo cuando venimos de "hablando").
    cambiarEscuchaActiva(escuchaActivaPreHablandoRef.current);
    if (!escuchaActivaRef.current) { cambiarEstado("inactivo"); return; } // la oreja está apagada -- no reactivar solo
    cambiarEstado("escuchando");
    // El mic se queda abierto todo el tiempo mientras el panel está abierto (ver asegurarMicAbierto
    // en hablar()) -- reusar ese stream (volverAEscucharIOS) en vez de pedir uno nuevo, que lo
    // dejaría filtrado (dos sesiones de mic abiertas a la vez). Si por lo que sea no quedó un
    // stream vivo (ej. falló al abrirlo, o la oreja estaba apagada y se acaba de reactivar), se
    // pide uno nuevo.
    const vivo = streamRef.current?.getAudioTracks().some((t) => t.readyState === "live");
    if (vivo) volverAEscucharIOS();
    else await iniciarEscuchaIOS(); // ya se concedio el permiso antes, no vuelve a preguntar
  }

  // Espera a que el navegador tenga la lista de voces cargada -- en Safari/iOS a veces esta
  // vacia justo al inicio de la sesion y speak() no dice nada ni da error si la llamas antes.
  function vocesListas() {
    return new Promise((resolve) => {
      if (!("speechSynthesis" in window)) { resolve(); return; }
      if (window.speechSynthesis.getVoices().length > 0) { resolve(); return; }
      const manejador = () => { window.speechSynthesis.removeEventListener("voiceschanged", manejador); resolve(); };
      window.speechSynthesis.addEventListener("voiceschanged", manejador);
      setTimeout(() => { window.speechSynthesis.removeEventListener("voiceschanged", manejador); resolve(); }, 1000);
    });
  }

  // ---------- Compartido: mandar el turno a asistente-ia y leer la respuesta ----------
  async function enviarTurno(texto) {
    if (!abiertoRef.current) return; // el panel ya se cerró -- no seguir ni gastar cuota ni reactivar el mic
    cambiarEstado("procesando");
    setTranscripciones((prev) => [...prev, { rol: "usuario", texto }]);
    try {
      const token = await tokenDeSesion();
      const resp = await fetch(`${supabase.supabaseUrl}/functions/v1/asistente-ia`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ mensaje: texto, modo: "voz", contexto_pantalla: contextoPantalla || null }),
      });
      const json = await resp.json().catch(() => ({}));
      if (!resp.ok || json.error) {
        setTranscripciones((prev) => [...prev, { rol: "asistente", texto: json.error || "No pude responder, intenta de nuevo." }]);
        volverAEscuchar();
        return;
      }
      setTranscripciones((prev) => [...prev, { rol: "asistente", texto: json.respuesta }]);
      if (json.consultas_usadas !== undefined) setUso({ usadas: json.consultas_usadas, limite: json.limite_mes });
      const modulosTocados = [...new Set(
        (json.acciones || [])
          .filter((a) => !a.resultado?.error && !ACCION_FUE_CONFIRMACION_PENDIENTE(a) && MODULO_POR_HERRAMIENTA_ASISTENTE[a.herramienta])
          .map((a) => MODULO_POR_HERRAMIENTA_ASISTENTE[a.herramienta])
      )];
      if (modulosTocados.length > 0) onDatosCreados?.(modulosTocados);
      podarHistorialSiExcede(); // no se espera: corre en segundo plano, no debe retrasar la respuesta hablada
      // Botón boca: si está apagada, la respuesta se queda solo en texto -- nunca se entra a
      // "hablando" (se puede escuchar igual tocando el ▶ de la burbuja, ver leerTextoMensaje). Se
      // lee vozActivaRef (no la variable de estado) para respetar el valor en ESTE momento, no el
      // que tenía cuando se mandó la pregunta (pudo cambiar mientras se esperaba la respuesta).
      if (vozActivaRef.current) await hablar(json.respuesta);
      else volverAEscuchar(); // ya respeta la oreja por su cuenta, ver ahí
    } catch {
      setTranscripciones((prev) => [...prev, { rol: "asistente", texto: "No pude conectarme. Revisa tu conexión." }]);
      volverAEscuchar();
    }
  }

  // Usado cuando el microfono NUNCA se cerro (errores durante "procesando", con el stream de
  // iOS todavia vivo) -- solo reinicia la grabacion, no vuelve a pedir permiso ni abre stream nuevo.
  function volverAEscuchar() {
    if (!abiertoRef.current) return;
    // Esta función puede llegar a llamarse dos veces seguidas para el mismo fin de turno (ej.
    // interrumpirVoz() la llama directo, y el cancel() que hace ahí puede además disparar
    // u.onend/u.onerror -> alTerminar() -> esta misma función otra vez) -- si la primera ya nos dejó
    // "escuchando", ignorar la segunda en vez de reiniciar el reconocedor de nuevo sin necesidad
    // (en Android, reiniciar el reconocedor dos veces casi seguidas es justo el patrón que históricamente
    // lo ha dejado "escuchando" sin captar audio real).
    if (estadoRef.current === "escuchando") return;
    // Si venimos de "hablando", la oreja se había apagado sola en las tres plataformas (ver
    // hablar()) -- se restaura aquí al valor real de antes de forzarla, sea que Arkey terminó de
    // hablar solo o lo interrumpieron con el botón boca (ambos casos llegan aquí, ver
    // interrumpirVoz()).
    const veniaDeHablar = estadoRef.current === "hablando";
    if (veniaDeHablar) {
      cambiarEscuchaActiva(escuchaActivaPreHablandoRef.current);
    }
    if (!escuchaActivaRef.current) { cambiarEstado("inactivo"); return; } // la oreja está apagada -- no reactivar solo
    cambiarEstado("escuchando");
    if (!usaSTTNativo) { volverAEscucharIOS(); return; }
    if (veniaDeHablar) {
      // Pequeña pausa antes de arrancar el reconocedor: si lo hacemos apenas termina de hablar,
      // a veces no se soltó del todo la sesión de audio de la síntesis de voz todavía, y el
      // mic "parece" escuchar pero no captura audio real (reportado por Angel en Android; se aplica
      // igual en Mac/desktop por si acaso, mismo mecanismo de SpeechRecognition). Se revisa que
      // sigamos abiertos y en "escuchando" por si el usuario cerró el panel o pasó algo más
      // mientras tanto.
      setTimeout(() => {
        if (abiertoRef.current && estadoRef.current === "escuchando") iniciarEscuchaNativa();
      }, 300);
    } else {
      iniciarEscuchaNativa();
    }
  }

  // Corta CUALQUIER voz en curso: la respuesta en vivo de Arkey (estado "hablando") y/o la lectura
  // puntual de una burbuja desde su botón ▶ (ver mensajeReproduciendoId/leerTextoMensaje) -- lo que
  // esté sonando en ese momento. Usado por el botón boca al presionarse (ver alPresionarBoca).
  // No basta con cancelar la síntesis y esperar a que u.onend/u.onerror dispare alTerminar() (ver
  // hablar()) -- no todos los navegadores garantizan ese evento tras cancel(), y dejarlo colgado
  // en "hablando" sería peor que el bug que se quiere evitar. Se hace el cambio de estado directo;
  // si el evento sí llega después, volverAEscuchar()/reanudarMicTrasHablarIOS() ya toleran que se
  // llamen dos veces sin problema.
  function interrumpirVoz() {
    try { window.speechSynthesis.cancel(); } catch {}
    if (mensajeReproduciendoIdRef.current !== null) cambiarMensajeReproduciendoId(null);
    if (estadoRef.current !== "hablando") return;
    if (usaSTTNativo) volverAEscuchar();
    else reanudarMicTrasHablarIOS();
  }

  // Botón boca: presiona-para-interrumpir, no es un interruptor persistente. Al presionarlo
  // (onPointerDown) corta cualquier voz en curso de inmediato; al soltarlo (onPointerUp, o si el
  // dedo se resbala fuera del botón) siempre vuelve a dejar la voz activa para lo que siga -- así
  // nunca se queda "apagada" esperando que alguien la reactive.
  function alPresionarBoca() {
    cambiarVozActiva(false); // solo visual mientras se mantiene presionado
    interrumpirVoz();
  }
  function alSoltarBoca() {
    cambiarVozActiva(true);
  }

  // Respaldo: escribir en vez de hablar -- corta cualquier escucha/lectura en curso y manda el
  // texto directo por el mismo flujo de siempre. Sirve si la voz falla, si no se puede hablar en
  // ese momento, o simplemente si el usuario prefiere teclear.
  const enviarTextoManual = () => {
    const t = textoManual.trim();
    if (!t) return;
    try { recognitionRef.current?.stop(); } catch {}
    try { window.speechSynthesis.cancel(); } catch {}
    setTextoManual("");
    enviarTurno(t);
  };

  // Historial por día: se guarda completo en asistente_mensajes (nunca se borra solo), pero aquí
  // solo se consulta bajo demanda -- se agrupa por fecha para no mandar meses enteros de una vez.
  async function abrirHistorial() {
    setHistorialAbierto(true);
    setDiaSeleccionado(null);
    if (diasHistorial !== null) return; // ya se cargó antes en esta sesión del panel
    try {
      const { data: sesion } = await supabase.auth.getSession();
      const uid = sesion?.session?.user?.id;
      if (!uid) return;
      const { data } = await supabase.from("asistente_mensajes").select("created_at")
        .eq("user_id", uid).order("created_at", { ascending: false }).limit(500);
      const porDia = {};
      for (const m of data || []) {
        const dia = m.created_at.slice(0, 10);
        porDia[dia] = (porDia[dia] || 0) + 1;
      }
      setDiasHistorial(Object.entries(porDia).map(([fecha, cantidad]) => ({ fecha, cantidad })));
    } catch {
      setDiasHistorial([]);
    }
  }

  async function verDia(fecha) {
    setDiaSeleccionado(fecha);
    setMensajesDia([]);
    try {
      const { data: sesion } = await supabase.auth.getSession();
      const uid = sesion?.session?.user?.id;
      if (!uid) return;
      const { data } = await supabase.from("asistente_mensajes").select("rol, contenido, created_at")
        .eq("user_id", uid).gte("created_at", `${fecha}T00:00:00`).lt("created_at", `${fecha}T23:59:59.999`)
        .order("created_at", { ascending: true });
      setMensajesDia(data || []);
    } catch {}
  }


  // Auto-scroll: cada vez que se agrega un mensaje (propio o de Arkey), baja el panel al fondo
  // para que el usuario nunca tenga que arrastrar el dedo mientras la conversación avanza.
  useEffect(() => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [transcripciones, mensajesDia]);

  // Se agotaron las consultas del mes: Arkey "se duerme" -- el micrófono se bloquea por completo
  // y no vuelve a arrancar solo, hasta que exista un botón de créditos extra (fase futura).
  const sinCreditos = !!uso && uso.limite != null && uso.usadas >= uso.limite;
  const sinCreditosRef = useRef(false); // se lee desde funciones con closures viejas (ej. iniciarEscuchaNativa) que no ven el re-render todavía
  useEffect(() => { sinCreditosRef.current = sinCreditos; }, [sinCreditos]);
  useEffect(() => {
    if (!sinCreditos) return;
    try { recognitionRef.current?.stop(); } catch {}
    try { window.speechSynthesis?.cancel(); } catch {}
    cambiarEstado("dormido");
  }, [sinCreditos]);

  // Si el sistema bloqueó la pantalla y, a pesar del wake lock (ver pedirWakeLock), el navegador
  // igual mató el reconocedor o el stream de audio de fondo, al volver a estar visible no debe
  // quedarse colgado en "hablando"/"escuchando" sin que nada esté pasando de verdad -- se reinicia
  // a un estado sano en vez de obligar a cerrar y volver a abrir todo el panel.
  function recuperarTrasSegundoPlano() {
    if (!abiertoRef.current || sinCreditosRef.current) return;
    if (estadoRef.current !== "hablando" && estadoRef.current !== "escuchando") return;
    try { window.speechSynthesis.cancel(); } catch {}
    if (!escuchaActivaRef.current) { cambiarEstado("inactivo"); return; } // la oreja estaba apagada -- no reactivar solo
    cambiarEstado("escuchando");
    if (usaSTTNativo) {
      iniciarEscuchaNativa(); // apaga cualquier reconocedor viejo como primer paso; barato crear uno nuevo
    } else {
      const vivo = streamRef.current?.getAudioTracks().some((t) => t.readyState === "live");
      if (vivo) volverAEscucharIOS(); // reusa el stream si el sistema no lo mató al bloquear
      else iniciarEscuchaIOS(); // stream nuevo -- el permiso ya está otorgado, no debería re-preguntar
    }
  }

  // El sistema libera el wake lock solo al pasar a segundo plano (pestaña oculta, pantalla
  // bloqueada) -- hay que volver a pedirlo cuando la app vuelve a estar visible, y de paso
  // aprovechar el mismo momento para revisar si el motor de voz quedó colgado (ver arriba).
  useEffect(() => {
    if (!abierto) return;
    const alVisibilityChange = () => {
      if (document.visibilityState !== "visible" || !abiertoRef.current) return;
      pedirWakeLock();
      recuperarTrasSegundoPlano();
    };
    document.addEventListener("visibilitychange", alVisibilityChange);
    return () => document.removeEventListener("visibilitychange", alVisibilityChange);
  }, [abierto]);

  // Reproducir un mensaje ya escrito en el historial o en la conversación actual, sin tocar el
  // estado de "escuchando/procesando/hablando" del modo voz en vivo -- solo suena y ya. Marca esa
  // burbuja como la que está sonando (id) para que su botón cambie a "detener" (ver render); se
  // limpia sola al terminar, o vía interrumpirVoz() (botón boca) o detenerReproduccionMensaje().
  function leerTextoMensaje(texto, id) {
    if (!texto || !("speechSynthesis" in window)) return;
    try {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(texto);
      u.volume = audioMuteadoRef.current ? 0 : 1;
      const voces = window.speechSynthesis.getVoices();
      const candidatasEs = voces.filter((v) => v.lang?.toLowerCase().startsWith("es"));
      const vozEs = candidatasEs.find((v) => v.lang?.toLowerCase() === "es-mx") || candidatasEs[0];
      if (vozEs) { u.voice = vozEs; u.lang = vozEs.lang; } else { u.lang = "es-MX"; }
      const terminar = () => { if (mensajeReproduciendoIdRef.current === id) cambiarMensajeReproduciendoId(null); };
      u.onend = terminar;
      u.onerror = terminar;
      cambiarMensajeReproduciendoId(id);
      window.speechSynthesis.resume(); // respaldo contra el bug de Chrome descrito en desbloquearVoz()
      window.speechSynthesis.speak(u);
    } catch {}
  }

  function detenerReproduccionMensaje() {
    try { window.speechSynthesis.cancel(); } catch {}
    cambiarMensajeReproduciendoId(null);
  }

  // Copiar el texto de una burbuja al portapapeles -- muestra un check un instante como feedback.
  async function copiarTexto(texto, id) {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(texto);
      } else {
        const ta = document.createElement("textarea");
        ta.value = texto;
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
      }
      setCopiadoId(id);
      setTimeout(() => setCopiadoId((actual) => (actual === id ? null : actual)), 1500);
    } catch {}
  }

  // Poda automática: conserva solo los últimos 100 mensajes por usuario en asistente_mensajes
  // para no dejar crecer el historial sin límite (rendimiento del panel y de la consulta).
  async function podarHistorialSiExcede() {
    try {
      const { data: sesion } = await supabase.auth.getSession();
      const uid = sesion?.session?.user?.id;
      if (!uid) return;
      const { data } = await supabase.from("asistente_mensajes").select("id, created_at")
        .eq("user_id", uid).order("created_at", { ascending: false }).range(100, 100 + 200);
      if (data && data.length > 0) {
        const idsAPodar = data.map((m) => m.id);
        await supabase.from("asistente_mensajes").delete().in("id", idsAPodar);
      }
    } catch {}
  }

  // Eliminar un día completo del historial de conversaciones, a petición del usuario.
  async function eliminarDiaHistorial(fecha) {
    try {
      const { data: sesion } = await supabase.auth.getSession();
      const uid = sesion?.session?.user?.id;
      if (!uid) return;
      await supabase.from("asistente_mensajes").delete()
        .eq("user_id", uid).gte("created_at", `${fecha}T00:00:00`).lt("created_at", `${fecha}T23:59:59.999`);
      setDiasHistorial((prev) => (prev || []).filter((d) => d.fecha !== fecha));
      if (diaSeleccionado === fecha) { setDiaSeleccionado(null); setMensajesDia([]); }
    } catch {}
  }

  async function hablar(texto) {
    if (!texto || !("speechSynthesis" in window)) { volverAEscuchar(); return; }
    setErrorMsg("");
    if (!usaSTTNativo) {
      // El micrófono se queda abierto a propósito durante toda la sesión (ver asegurarMicAbierto)
      // -- no se cierra ni se reabre en cada respuesta. Se asegura aquí (normalmente ya está
      // abierto desde el primer hablar() de la sesión -- el saludo -- así el diálogo de permiso
      // del sistema aparece ANTES del saludo hablado). Solo se para la grabación del turno
      // anterior si seguía activa por alguna razón (lo normal es que el flujo de silencio ya la
      // haya parado antes de llegar aquí).
      try { mediaRecorderRef.current?.stop(); } catch {}
      mediaRecorderRef.current = null;
      const ok = await asegurarMicAbierto();
      if (!ok) { volverAEscuchar(); return; }
    } else {
      // Camino nativo (Android/Mac/desktop): igual que en Android, se apaga explícitamente el
      // reconocedor de la escucha anterior -- r.stop() es async y a veces no cierra de inmediato,
      // dejando sus handlers activos de más (mismo fix ya probado en el commit a87266f).
      detenerRecognitionActual();
    }
    cambiarEstado("hablando");
    // Regla única para las tres plataformas: mientras Arkey habla, NUNCA se escucha -- la oreja se
    // apaga sola (visual y funcional) aquí, y se restaura al valor real de antes justo al terminar
    // de hablar o al interrumpir con el botón boca (ver volverAEscuchar()/
    // reanudarMicTrasHablarIOS(), que hacen la restauración). Si la oreja ya estaba encendida,
    // siempre vuelve a quedar encendida y escuchando en cuanto Arkey termine.
    escuchaActivaPreHablandoRef.current = escuchaActivaRef.current;
    cambiarEscuchaActiva(false);
    try {
      window.speechSynthesis.cancel();
      await vocesListas();
      const voces = window.speechSynthesis.getVoices();
      // Pequeña pausa: en Safari, hablar justo después de cancelar o de cerrar el AudioContext
      // del micrófono a veces se queda mudo sin avisar. Este respiro lo evita.
      await new Promise((resolve) => setTimeout(resolve, 150));
      const u = new SpeechSynthesisUtterance(texto);
      u.volume = audioMuteadoRef.current ? 0 : 1; // bocina del header -- silencia como el mute físico, sin tocar el resto del flujo
      // Buscar una voz en español instalada de verdad en vez de solo fijar 'lang': en Safari, si
      // no existe una voz que haga match exacto con el lang pedido, a veces se queda muda sin dar
      // ningún error (a diferencia de Chrome, que sí improvisa con la voz más cercana). Entre las
      // opciones en español, se prefiere una de mejor calidad (Enhanced/Premium/Neural) si el
      // dispositivo tiene alguna instalada -- suenan más naturales que la voz básica del sistema.
      const candidatasEs = voces.filter((v) => v.lang?.toLowerCase().startsWith("es"));
      const vozEs = candidatasEs.find((v) => v.lang?.toLowerCase() === "es-mx" && /enhanced|premium|neural/i.test(v.name || ""))
        || candidatasEs.find((v) => v.lang?.toLowerCase() === "es-mx")
        || candidatasEs.find((v) => /enhanced|premium|neural/i.test(v.name || ""))
        || candidatasEs[0];
      if (vozEs) { u.voice = vozEs; u.lang = vozEs.lang; } else { u.lang = "es-MX"; }
      const alTerminar = () => { if (usaSTTNativo) volverAEscuchar(); else reanudarMicTrasHablarIOS(); };
      u.onend = alTerminar;
      u.onerror = (e) => { setErrorMsg(`TTS: ${e.error || "error desconocido"}`); alTerminar(); };
      // Respaldo contra el mismo bug de Chrome descrito en desbloquearVoz(): si el motor quedó
      // "pausado" por cualquier otra razón, resume() antes de hablar evita que este speak() se
      // quede en cola sin sonar. No afecta a navegadores donde nunca se pausó (resume() ahí no hace nada).
      window.speechSynthesis.resume();
      window.speechSynthesis.speak(u);
      // No hace falta hacer nada más aquí: en ninguna plataforma se escucha mientras "hablando"
      // (ver arriba) -- solo queda esperar a que speak() termine (alTerminar) o a que lo
      // interrumpan con el botón boca (interrumpirVoz()).
    } catch { if (usaSTTNativo) volverAEscuchar(); else reanudarMicTrasHablarIOS(); }
  }

  return (
    <>
      {!abierto && (
        <button
          ref={btnRef}
          onPointerDown={onBtnPointerDown}
          onPointerMove={onBtnPointerMove}
          onPointerUp={onBtnPointerUp}
          className="fixed z-[65] rounded-full flex items-center justify-center touch-none animate-[pulse_1.4s_ease-in-out_infinite]"
          style={{
            width: 66, height: 66, background: "#9A2E1F", color: "#FFF3EC",
            boxShadow: "0 4px 14px rgba(154,46,31,.55), 0 0 0 4px rgba(154,46,31,.18)",
            ...(pos ? { left: pos.x, top: pos.y } : { bottom: 84, left: 16 }),
          }}
          title="Modo Conversación (voz)"
        >
          <Bot size={30} />
        </button>
      )}
      {abierto && (
        <div className="fixed inset-0 z-[75] flex items-end sm:items-center justify-center p-4" style={{ background: "rgba(0,0,0,.55)" }} onClick={cerrar}>
          <div className="gp-panel w-full max-w-lg sm:max-w-xl p-4 flex flex-col" style={{ maxHeight: "90vh", minHeight: "70vh" }} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-1">
              <h2 className="text-lg font-semibold flex items-center gap-2"><Bot size={20} className="gp-text-gold" /> Arkey</h2>
              <div className="flex items-center gap-1">
                <button
                  onClick={alternarAudioMuteado}
                  title={audioMuteado ? "Activar sonido" : "Silenciar sonido"}
                  className="gp-btn-ghost p-2 rounded"
                  style={audioMuteado ? { color: "#C0392B" } : undefined}
                >
                  {audioMuteado ? <VolumeX size={16} /> : <Volume2 size={16} />}
                </button>
                <button onClick={abrirHistorial} title="Conversaciones anteriores" className="gp-btn-ghost p-2 rounded"><Clock size={16} /></button>
                <button onClick={cerrar} className="gp-btn-ghost p-2 rounded"><X size={18} /></button>
              </div>
            </div>
            {uso && <p className="text-[11px] gp-text-muted mb-2">{uso.usadas}/{uso.limite} consultas este mes</p>}
            {sinCreditos && (
              <p className="text-[11px] mb-2 px-2 py-1 rounded" style={{ background: "rgba(197,48,48,.12)", color: "#C0392B" }}>
                Arkey se quedó sin consultas este mes y se fue a dormir 💤. El micrófono está bloqueado hasta el próximo mes (o hasta que agreguemos la opción de consultas extra).
              </p>
            )}

            {historialAbierto ? (
              <div className="flex-1 overflow-y-auto mb-3" style={{ minHeight: 200 }}>
                {!diaSeleccionado ? (
                  <>
                    <button onClick={() => setHistorialAbierto(false)} className="text-xs gp-text-muted mb-2">← Volver a la conversación</button>
                    {diasHistorial === null && <p className="text-sm gp-text-muted text-center py-6">Cargando…</p>}
                    {diasHistorial?.length === 0 && <p className="text-sm gp-text-muted text-center py-6">Todavía no hay conversaciones guardadas.</p>}
                    {diasHistorial?.map((d) => (
                      <button key={d.fecha} onClick={() => verDia(d.fecha)} className="w-full text-left px-3 py-2 rounded gp-btn-ghost mb-1 flex justify-between text-sm">
                        <span>{d.fecha}</span><span className="gp-text-muted">{d.cantidad} mensajes</span>
                      </button>
                    ))}
                  </>
                ) : (
                  <>
                    <div className="flex items-center justify-between mb-2">
                      <button onClick={() => setDiaSeleccionado(null)} className="text-xs gp-text-muted">← Ver otros días</button>
                      <button onClick={() => eliminarDiaHistorial(diaSeleccionado)} className="text-xs" style={{ color: "#C0392B" }}>Eliminar este día</button>
                    </div>
                    {mensajesDia.map((m, i) => {
                      const id = `hist-${i}`;
                      return (
                        <div key={i} className={`mb-2 flex ${m.rol === "usuario" ? "justify-end" : "justify-start"}`}>
                          <div className={`relative max-w-[85%] rounded-lg px-3 py-2 text-sm ${m.rol === "asistente" ? "pr-12" : "pr-7"}`} style={{
                            background: m.rol === "usuario" ? "var(--gold)" : "var(--panel-2, rgba(255,255,255,.06))",
                            color: m.rol === "usuario" ? "#0B2341" : "inherit",
                          }}>
                            {m.contenido}
                            <div className="absolute bottom-1 right-1 flex items-center gap-1">
                              <button
                                onClick={() => copiarTexto(m.contenido, id)}
                                title="Copiar"
                                className="opacity-60 hover:opacity-100"
                                style={{ background: "none", border: "none", padding: 2 }}
                              >
                                {copiadoId === id ? <Check size={12} /> : <Copy size={12} />}
                              </button>
                              {m.rol === "asistente" && (
                                mensajeReproduciendoId === id ? (
                                  <button
                                    onClick={detenerReproduccionMensaje}
                                    title="Detener"
                                    className="opacity-60 hover:opacity-100"
                                    style={{ background: "none", border: "none", padding: 2 }}
                                  >
                                    <Square size={12} />
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => leerTextoMensaje(m.contenido, id)}
                                    title="Escuchar"
                                    className="opacity-60 hover:opacity-100"
                                    style={{ background: "none", border: "none", padding: 2 }}
                                  >
                                    <Play size={12} />
                                  </button>
                                )
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </>
                )}
              </div>
            ) : (
              <div ref={scrollRef} className="flex-1 overflow-y-auto mb-3" style={{ minHeight: 80 }}>
                {transcripciones.map((t, i) => {
                  const id = `live-${i}`;
                  return (
                    <div key={i} className={`mb-2 flex ${t.rol === "usuario" ? "justify-end" : "justify-start"}`}>
                      <div className={`relative max-w-[85%] rounded-lg px-3 py-2 text-sm ${t.rol === "asistente" ? "pr-12" : "pr-7"}`} style={{
                        background: t.rol === "usuario" ? "var(--gold)" : "var(--panel-2, rgba(255,255,255,.06))",
                        color: t.rol === "usuario" ? "#0B2341" : "inherit",
                      }}>
                        {t.texto}
                        <div className="absolute bottom-1 right-1 flex items-center gap-1">
                          <button
                            onClick={() => copiarTexto(t.texto, id)}
                            title="Copiar"
                            className="opacity-60 hover:opacity-100"
                            style={{ background: "none", border: "none", padding: 2 }}
                          >
                            {copiadoId === id ? <Check size={12} /> : <Copy size={12} />}
                          </button>
                          {t.rol === "asistente" && (
                            mensajeReproduciendoId === id ? (
                              <button
                                onClick={detenerReproduccionMensaje}
                                title="Detener"
                                className="opacity-60 hover:opacity-100"
                                style={{ background: "none", border: "none", padding: 2 }}
                              >
                                <Square size={12} />
                              </button>
                            ) : (
                              <button
                                onClick={() => leerTextoMensaje(t.texto, id)}
                                title="Escuchar"
                                className="opacity-60 hover:opacity-100"
                                style={{ background: "none", border: "none", padding: 2 }}
                              >
                                <Play size={12} />
                              </button>
                            )
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="flex flex-col items-center gap-2 py-2">
              <div className="flex items-center gap-4">
                {/* Oreja: toggle de escuchar. Reemplaza al viejo botón de mutear -- ver alternarEscuchaActiva.
                    Regla única para las tres plataformas: se apaga sola y no se puede tocar mientras
                    Arkey habla (no escucha nada de verdad ahí, ver hablar()) -- se reactiva sola al
                    terminar o al interrumpir con 🗣️. */}
                <button
                  onClick={alternarEscuchaActiva}
                  title={sinCreditos ? "Sin consultas disponibles este mes" : escuchaActiva ? "Apagar escucha" : "Activar escucha"}
                  className="gp-btn-ghost p-2 rounded text-xl leading-none"
                  disabled={sinCreditos || estado === "hablando"}
                  style={sinCreditos || !escuchaActiva ? { opacity: 0.4, cursor: sinCreditos ? "not-allowed" : undefined } : undefined}
                >
                  👂
                </button>
                <ArkeyRobot estado={estado} />
                {/* Boca: presiona-para-interrumpir (ver alPresionarBoca/alSoltarBoca) -- no es un
                    interruptor persistente, siempre vuelve a quedar activada al soltar. */}
                <button
                  onPointerDown={sinCreditos ? undefined : alPresionarBoca}
                  onPointerUp={sinCreditos ? undefined : alSoltarBoca}
                  onPointerLeave={sinCreditos ? undefined : alSoltarBoca}
                  onPointerCancel={sinCreditos ? undefined : alSoltarBoca}
                  title={sinCreditos ? "Sin consultas disponibles este mes" : "Mantén presionado para interrumpir a Arkey"}
                  className="gp-btn-ghost p-2 rounded text-xl leading-none touch-none"
                  disabled={sinCreditos}
                  style={sinCreditos ? { opacity: 0.4, cursor: "not-allowed" } : !vozActiva ? { opacity: 0.4 } : undefined}
                >
                  🗣️
                </button>
              </div>
              <p className="text-xs gp-text-muted text-center">
                {sinCreditos && "Arkey está dormido 💤"}
                {!sinCreditos && mensajeReproduciendoId !== null && "Hablando..."}
                {!sinCreditos && mensajeReproduciendoId === null && estado === "hablando" && vozActiva && "Hablando... (Para interrumpir presione el botón 🗣️)"}
                {!sinCreditos && estado === "escuchando" && escuchaActiva && "Escuchando..."}
                {!sinCreditos && estado === "procesando" && "Pensando…"}
                {!sinCreditos && estado === "permiso" && (errorMsg || "Necesito permiso de micrófono.")}
                {!sinCreditos && estado === "error" && (errorMsg || "Algo salió mal.")}
              </p>
              <div className="flex items-center gap-2 w-full mt-1">
                <input
                  type="text"
                  value={textoManual}
                  onChange={(e) => setTextoManual(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") enviarTextoManual(); }}
                  placeholder={sinCreditos ? "Sin consultas disponibles este mes" : "O escríbele a Arkey…"}
                  className="gp-input flex-1 text-sm"
                  disabled={sinCreditos}
                />
                <button onClick={enviarTextoManual} className="gp-btn-ghost p-2 rounded" disabled={!textoManual.trim() || sinCreditos}>
                  <Send size={16} />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function QuickCapture({ data, onAdd, onCrearRecordatorio, irAVista }) {
  const [abierto, setAbierto] = useState(false);
  const [tipo, setTipo] = useState(null); // "cita" | "contacto" | "idea" | "ingreso" | "egreso"

  // Posición libre: por default va abajo a la derecha, pero el usuario puede arrastrarlo a
  // donde quiera (ej. en el Asistente se encimaba con el botón de enviar del chat). Se guarda
  // en localStorage por dispositivo — cada quien lo deja donde le acomode.
  const [pos, setPos] = useState(() => {
    try {
      const guardada = localStorage.getItem("arkeyone_qc_pos");
      return guardada ? JSON.parse(guardada) : null; // null = posición default
    } catch { return null; }
  });
  const btnRef = useRef(null);
  const arrastreRef = useRef({ activo: false, movido: false, startX: 0, startY: 0, offsetX: 0, offsetY: 0 });

  const clamp = (x, y) => {
    const w = 52, h = 52, margen = 8;
    const maxX = window.innerWidth - w - margen;
    const maxY = window.innerHeight - h - margen;
    return { x: Math.min(Math.max(x, margen), maxX), y: Math.min(Math.max(y, margen), maxY) };
  };

  const onPointerDown = (e) => {
    const rect = btnRef.current.getBoundingClientRect();
    arrastreRef.current = {
      activo: true, movido: false, startX: e.clientX, startY: e.clientY,
      offsetX: e.clientX - rect.left, offsetY: e.clientY - rect.top,
    };
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch {}
  };
  const onPointerMove = (e) => {
    const a = arrastreRef.current;
    if (!a.activo) return;
    if (!a.movido && (Math.abs(e.clientX - a.startX) > 6 || Math.abs(e.clientY - a.startY) > 6)) a.movido = true;
    if (!a.movido) return;
    setPos(clamp(e.clientX - a.offsetX, e.clientY - a.offsetY));
  };
  const onPointerUp = () => {
    const a = arrastreRef.current;
    if (a.movido) {
      setPos((p) => {
        if (p) { try { localStorage.setItem("arkeyone_qc_pos", JSON.stringify(p)); } catch {} }
        return p;
      });
    } else {
      setAbierto((v) => !v); // fue un toque, no un arrastre: abre/cierra el menú como siempre
    }
    arrastreRef.current = { activo: false, movido: false, startX: 0, startY: 0, offsetX: 0, offsetY: 0 };
  };
  // Doble toque: regresa el botón a su posición default (abajo a la derecha), por si se pierde de vista.
  const alDobleToque = () => {
    setPos(null);
    try { localStorage.removeItem("arkeyone_qc_pos"); } catch {}
  };

  const OPCIONES = [
    { key: "glucosa", label: "Glucosa", icon: HeartPulse },
    { key: "presion", label: "Presión arterial", icon: HeartPulse },
    { key: "tarea", label: "Tarea", icon: CheckSquare },
    { key: "cita", label: "Cita", icon: CalendarClock },
    { key: "recordatorio", label: "Recordatorio", icon: Clock },
    { key: "nota", label: "Nota", icon: StickyNote },
    { key: "diario", label: "Diario", icon: Activity },
    { key: "contacto", label: "Contacto", icon: Contact },
    { key: "idea", label: "Idea", icon: Lightbulb },
    { key: "ingreso", label: "Ingreso", icon: Wallet },
    { key: "egreso", label: "Egreso", icon: Receipt },
  ];

  const cerrar = () => { setAbierto(false); setTipo(null); };

  // Posición default (sin arrastrar): en móvil se levanta lo suficiente para no quedar tapado
  // por el nuevo BottomNav fijo (solo existe en móvil, md:hidden) — en desktop no hay BottomNav,
  // así que ahí se queda en su offset original de 20px.
  const estiloContenedor = pos ? { position: "fixed", left: pos.x, top: pos.y, zIndex: 55 } : { position: "fixed", right: 20, zIndex: 55 };
  const claseContenedorDefault = pos ? "" : "bottom-[calc(env(safe-area-inset-bottom)+5.5rem)] md:bottom-[calc(env(safe-area-inset-bottom)+20px)]";

  // El panel de opciones ya no depende de si el botón está a la izquierda/derecha/arriba/abajo
  // por CSS (eso era lo que lo hacía "perderse" en las esquinas). En vez de eso, cuando se abre
  // medimos la posición real del botón en pantalla (getBoundingClientRect) y calculamos dónde
  // poner el panel para que siempre quede completo dentro del área visible, sin importar en qué
  // esquina esté el rayo. Se recalcula también si cambia el tamaño de la ventana.
  const [panelEstilo, setPanelEstilo] = useState(null);
  useLayoutEffect(() => {
    if (!abierto) { setPanelEstilo(null); return; }
    const calcular = () => {
      const rect = btnRef.current?.getBoundingClientRect();
      if (!rect) return;
      const ANCHO_PANEL = 180, MARGEN = 8, HUECO = 8;
      let left = rect.right - ANCHO_PANEL; // alineado al borde derecho del botón por default
      left = Math.min(Math.max(left, MARGEN), window.innerWidth - ANCHO_PANEL - MARGEN);

      const espacioArriba = rect.top - MARGEN;
      const espacioAbajo = window.innerHeight - rect.bottom - MARGEN;
      const abrirAbajo = espacioAbajo >= espacioArriba;
      const alturaMax = Math.max(abrirAbajo ? espacioAbajo : espacioArriba, 120) - HUECO;

      setPanelEstilo({
        left,
        top: abrirAbajo ? rect.bottom + HUECO : undefined,
        bottom: abrirAbajo ? undefined : window.innerHeight - rect.top + HUECO,
        maxHeight: alturaMax,
      });
    };
    calcular();
    window.addEventListener("resize", calcular);
    return () => window.removeEventListener("resize", calcular);
  }, [abierto, pos]);

  const panel = abierto && panelEstilo && (
    <div
      className="p-2 flex flex-col gap-1 overflow-y-auto rounded-lg shadow-lg"
      style={{
        position: "fixed", left: panelEstilo.left, top: panelEstilo.top, bottom: panelEstilo.bottom,
        maxHeight: panelEstilo.maxHeight, width: 180, zIndex: 56,
        background: "var(--panel-hi)", border: "1.5px solid var(--gold)",
      }}
    >
      {OPCIONES.map((o) => (
        <button key={o.key} onClick={() => { setTipo(o.key); setAbierto(false); }} className="gp-btn-ghost flex items-center gap-2 px-3 py-2 text-sm rounded text-left">
          <o.icon size={15} /> {o.label}
        </button>
      ))}
    </div>
  );

  return (
    <>
      {/* Fondo invisible: al tocar cualquier otro lado de la pantalla con el menú abierto,
          se cierra solo (sin mover el botón de su lugar) y el ícono regresa al rayo normal. */}
      {abierto && (
        <div className="fixed inset-0" style={{ zIndex: 54 }} onClick={() => setAbierto(false)} />
      )}
      {panel}
      <div className={claseContenedorDefault} style={estiloContenedor}>
        <button
          ref={btnRef}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onDoubleClick={alDobleToque}
          title="Captura rápida — mantén presionado para moverlo, doble toque para regresarlo a su lugar"
          className="rounded-full flex items-center justify-center shadow-lg"
          style={{ width: 52, height: 52, background: "var(--gold)", color: "#0B2341", touchAction: "none" }}
        >
          {abierto ? <X size={22} /> : <Zap size={22} />}
        </button>
      </div>

      {tipo === "cita" && (
        <Modal title="Nueva cita" onClose={cerrar}>
          <CitaForm item={{ titulo: "", fechaHora: localInputsAFechaHora(todayISO(), "09:00"), lugar: "", contactoIds: [], tags: [], notas: "" }} contactos={data.contactos}
            tagsExistentes={tagsUnicos(data.citas)} onCrearContacto={(nombre) => { const nid = uid(); onAdd("contactos", { id: nid, nombre, tipos: ["Otro"] }); return nid; }}
            onSave={(v) => { onAdd("citas", { ...v, id: uid() }); cerrar(); irAVista("agenda"); }} />
        </Modal>
      )}
      {tipo === "nota" && (
        <Modal title="Nueva nota" onClose={cerrar}>
          <NotaForm item={{ titulo: "", contenido: "" }} onSave={(v) => { onAdd("notas", { ...v, id: uid() }); cerrar(); irAVista("notas"); }} />
        </Modal>
      )}
      {tipo === "contacto" && (
        <Modal title="Nuevo contacto" onClose={cerrar}>
          <ContactoRapidoForm onSave={(v) => { onAdd("contactos", { ...v, id: uid() }); cerrar(); irAVista("contactos"); }} />
        </Modal>
      )}
      {tipo === "idea" && (
        <Modal title="Nueva idea" onClose={cerrar}>
          <IdeaRapidaForm onSave={(v) => { onAdd("proyectos", { ...v, id: uid() }); cerrar(); irAVista("proyectos"); }} />
        </Modal>
      )}
      {(tipo === "ingreso" || tipo === "egreso") && (
        <Modal title={tipo === "ingreso" ? "Nuevo ingreso" : "Nuevo egreso"} onClose={cerrar}>
          <MovimientoRapidoForm tipoInicial={tipo === "ingreso" ? "Ingreso" : "Egreso"}
            onSave={(v) => { onAdd("finanzas", { ...v, id: uid() }); cerrar(); irAVista("finanzas"); }} />
        </Modal>
      )}
      {tipo === "glucosa" && (
        <Modal title="Registrar glucosa" onClose={cerrar}>
          <GlucosaRapidaForm contactos={data.contactos} onCrearContacto={(nombre) => { const nid = uid(); onAdd("contactos", { id: nid, nombre, tipos: ["Otro"] }); return nid; }}
            onSave={(v) => { onAdd("salud", { ...v, id: uid() }); cerrar(); irAVista("salud"); }} />
        </Modal>
      )}
      {tipo === "presion" && (
        <Modal title="Registrar presión arterial" onClose={cerrar}>
          <PresionRapidaForm contactos={data.contactos} onCrearContacto={(nombre) => { const nid = uid(); onAdd("contactos", { id: nid, nombre, tipos: ["Otro"] }); return nid; }}
            onSave={(v) => { onAdd("salud", { ...v, id: uid() }); cerrar(); irAVista("salud"); }} />
        </Modal>
      )}
      {tipo === "tarea" && (
        <Modal title="Nueva tarea" onClose={cerrar}>
          <TareaRapidaForm onSave={(v) => { onAdd("pendientes", { ...v, id: uid() }); cerrar(); irAVista("pendientes"); }} />
        </Modal>
      )}
      {tipo === "recordatorio" && (
        <Modal title="Nuevo recordatorio" onClose={cerrar}>
          <RecordatorioRapidoForm onSave={(v) => { onCrearRecordatorio(v); cerrar(); }} />
        </Modal>
      )}
      {tipo === "diario" && (
        <Modal title="Nueva entrada del diario" onClose={cerrar}>
          <DiarioRapidoForm onSave={(v) => { onAdd("actividades", { ...v, id: uid() }); cerrar(); irAVista("actividades"); }} />
        </Modal>
      )}
    </>
  );
}

function ContactoRapidoForm({ onSave }) {
  const [nombres, setNombres] = useState("");
  const [apellidoPaterno, setApellidoPaterno] = useState("");
  const [fechaNacimiento, setFechaNacimiento] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [correo, setCorreo] = useState("");
  const [error, setError] = useState("");
  return (
    <div>
      <Field label="Nombre(s)"><input className="gp-input" autoFocus value={nombres} onChange={(e) => setNombres(e.target.value)} /></Field>
      <Field label="Apellido paterno (opcional)"><input className="gp-input" value={apellidoPaterno} onChange={(e) => setApellidoPaterno(e.target.value)} /></Field>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="WhatsApp (opcional)"><input className="gp-input" value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} /></Field>
        <Field label="Correo (opcional)"><input className="gp-input" value={correo} onChange={(e) => setCorreo(e.target.value)} /></Field>
      </div>
      <CumpleanosField value={fechaNacimiento} onChange={setFechaNacimiento} />
      {error && <p className="text-xs gp-text-red mb-2">{error}</p>}
      <button className="gp-btn w-full py-2 text-sm mt-1" onClick={() => {
        if (!nombres.trim()) { setError("Captura un nombre."); return; }
        const nombresTrim = nombres.trim();
        const apellidoPaternoTrim = apellidoPaterno.trim();
        onSave({
          nombres: nombresTrim, apellidoPaterno: apellidoPaternoTrim,
          nombre: armarNombreContacto(nombresTrim, apellidoPaternoTrim, ""),
          whatsapp: whatsapp.trim(), correo: correo.trim(), tipo: "Otro", notas: "", fechaNacimiento,
        });
      }}>
        Guardar (puedes agregar más datos después desde Contactos)
      </button>
    </div>
  );
}

function IdeaRapidaForm({ onSave }) {
  const [nombre, setNombre] = useState("");
  const [error, setError] = useState("");
  return (
    <div>
      <Field label="Nombre de la idea"><input className="gp-input" value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="ej. App para..." /></Field>
      {error && <p className="text-xs gp-text-red mb-2">{error}</p>}
      <button className="gp-btn w-full py-2 text-sm mt-1" onClick={() => {
        if (!nombre.trim()) { setError("Captura un nombre."); return; }
        onSave({
          nombre: nombre.trim(), categoria: "Software", estatus: "Idea", modo: "Finito", monetizacion: "Dinero",
          prioridad: "Media", fechaRevision: "", descripcion: "", githubSubido: false, github: "",
        });
      }}>
        Guardar (puedes completar los detalles después desde Proyectos e ideas)
      </button>
    </div>
  );
}

function MovimientoRapidoForm({ tipoInicial, onSave }) {
  const [concepto, setConcepto] = useState("");
  const [monto, setMonto] = useState("");
  const [tipo, setTipo] = useState(tipoInicial);
  const [error, setError] = useState("");
  return (
    <div>
      <Field label="Concepto"><input className="gp-input" value={concepto} onChange={(e) => setConcepto(e.target.value)} /></Field>
      <Field label="Monto"><MoneyInput value={monto} onChange={setMonto} /></Field>
      <Field label="Tipo">
        <div className="flex gap-1">
          {["Ingreso", "Egreso"].map((t) => (
            <button key={t} onClick={() => setTipo(t)} className={`text-xs px-3 py-1.5 rounded-full border ${tipo === t ? "gp-btn" : "gp-text-muted"}`}>{t}</button>
          ))}
        </div>
      </Field>
      {error && <p className="text-xs gp-text-red mb-2">{error}</p>}
      <button className="gp-btn w-full py-2 text-sm mt-1" onClick={() => {
        if (!concepto.trim()) { setError("Captura un concepto."); return; }
        if (!monto || Number(monto) <= 0) { setError("Captura un monto válido."); return; }
        onSave({
          concepto: concepto.trim(), tipo, proyectoId: "", contactoId: "", fecha: todayISO(), fechaVencimiento: "",
          monto, categoria: "", forma: "Transferencia", estatus: "Cobrado", pautando: false, esRecurrente: false, frecuencia: "Mensual", fechaFin: "",
        });
      }}>
        Guardar (puedes agregar proyecto, categoría, etc. después desde Ingresos y egresos)
      </button>
    </div>
  );
}

function GlucosaRapidaForm({ contactos, onCrearContacto, onSave }) {
  const [valor, setValor] = useState("");
  const [fecha, setFecha] = useState(todayISO());
  const [hora, setHora] = useState(horaActualHHMM());
  const [contactoId, setContactoId] = useState("");
  const [nuevoAbierto, setNuevoAbierto] = useState(false);
  const [nombreNuevo, setNombreNuevo] = useState("");
  const [error, setError] = useState("");
  return (
    <div>
      <Field label="Glucosa (mg/dL)"><input type="number" autoFocus className="gp-input" value={valor} onChange={(e) => setValor(e.target.value)} /></Field>
      <Field label="¿De quién es esta medición?">
        <select className="gp-input" value={contactoId} onChange={(e) => setContactoId(e.target.value)}>
          <option value="">Yo</option>
          {ordenadosPorNombre(contactos).map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
        </select>
        <button type="button" className="text-xs gp-text-gold mt-1" onClick={() => setNuevoAbierto((v) => !v)}>
          {nuevoAbierto ? "Cancelar" : "+ Agregar contacto"}
        </button>
        {nuevoAbierto && (
          <div className="flex gap-2 mt-2">
            <input className="gp-input" placeholder="Nombre del contacto" value={nombreNuevo} onChange={(e) => setNombreNuevo(e.target.value)} />
            <button type="button" className="gp-btn px-3 text-xs shrink-0" onClick={() => {
              if (!nombreNuevo.trim()) return;
              setContactoId(onCrearContacto(nombreNuevo.trim()));
              setNombreNuevo(""); setNuevoAbierto(false);
            }}>Guardar</button>
          </div>
        )}
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Fecha"><input type="date" className="gp-input" value={fecha} onChange={(e) => setFecha(e.target.value)} /></Field>
        <Field label="Hora"><input type="time" className="gp-input" value={hora} onChange={(e) => setHora(e.target.value)} /></Field>
      </div>
      {error && <p className="text-xs gp-text-red mb-2">{error}</p>}
      <button className="gp-btn w-full py-2 text-sm mt-1" onClick={() => {
        if (!valor) { setError("Captura el valor de glucosa."); return; }
        onSave({ fecha, hora, glucosa: valor, origen: "rapido", contactoId: contactoId || null });
      }}>
        Guardar (queda en tu historial de Salud)
      </button>
    </div>
  );
}

function PresionRapidaForm({ contactos, onCrearContacto, onSave }) {
  const [sistolica, setSistolica] = useState("");
  const [diastolica, setDiastolica] = useState("");
  const [fecha, setFecha] = useState(todayISO());
  const [hora, setHora] = useState(horaActualHHMM());
  const [contactoId, setContactoId] = useState("");
  const [nuevoAbierto, setNuevoAbierto] = useState(false);
  const [nombreNuevo, setNombreNuevo] = useState("");
  const [error, setError] = useState("");
  return (
    <div>
      <Field label="Presión arterial (mmHg)">
        <div className="flex items-center gap-2">
          <input type="number" autoFocus placeholder="Sistólica" className="gp-input" value={sistolica} onChange={(e) => setSistolica(e.target.value)} />
          <span className="gp-text-muted">/</span>
          <input type="number" placeholder="Diastólica" className="gp-input" value={diastolica} onChange={(e) => setDiastolica(e.target.value)} />
        </div>
      </Field>
      <Field label="¿De quién es esta medición?">
        <select className="gp-input" value={contactoId} onChange={(e) => setContactoId(e.target.value)}>
          <option value="">Yo</option>
          {ordenadosPorNombre(contactos).map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
        </select>
        <button type="button" className="text-xs gp-text-gold mt-1" onClick={() => setNuevoAbierto((v) => !v)}>
          {nuevoAbierto ? "Cancelar" : "+ Agregar contacto"}
        </button>
        {nuevoAbierto && (
          <div className="flex gap-2 mt-2">
            <input className="gp-input" placeholder="Nombre del contacto" value={nombreNuevo} onChange={(e) => setNombreNuevo(e.target.value)} />
            <button type="button" className="gp-btn px-3 text-xs shrink-0" onClick={() => {
              if (!nombreNuevo.trim()) return;
              setContactoId(onCrearContacto(nombreNuevo.trim()));
              setNombreNuevo(""); setNuevoAbierto(false);
            }}>Guardar</button>
          </div>
        )}
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Fecha"><input type="date" className="gp-input" value={fecha} onChange={(e) => setFecha(e.target.value)} /></Field>
        <Field label="Hora"><input type="time" className="gp-input" value={hora} onChange={(e) => setHora(e.target.value)} /></Field>
      </div>
      {error && <p className="text-xs gp-text-red mb-2">{error}</p>}
      <button className="gp-btn w-full py-2 text-sm mt-1" onClick={() => {
        if (!sistolica || !diastolica) { setError("Captura ambos valores."); return; }
        onSave({ fecha, hora, sistolica, diastolica, origen: "rapido", contactoId: contactoId || null });
      }}>
        Guardar (queda en tu historial de Salud)
      </button>
    </div>
  );
}

function TareaRapidaForm({ onSave }) {
  const [descripcion, setDescripcion] = useState("");
  const [fechaLimite, setFechaLimite] = useState(todayISO());
  const [error, setError] = useState("");
  return (
    <div>
      <Field label="Descripción"><input autoFocus className="gp-input" value={descripcion} onChange={(e) => setDescripcion(e.target.value)} /></Field>
      <Field label="Fecha límite"><input type="date" className="gp-input" value={fechaLimite} onChange={(e) => setFechaLimite(e.target.value)} /></Field>
      {error && <p className="text-xs gp-text-red mb-2">{error}</p>}
      <button className="gp-btn w-full py-2 text-sm mt-1" onClick={() => {
        if (!descripcion.trim()) { setError("Captura una descripción."); return; }
        onSave({ descripcion: descripcion.trim(), fechaLimite, estatus: "Pendiente", prioridad: "Media", proyectoId: "", contactoId: "" });
      }}>
        Guardar (puedes agregar proyecto, prioridad, etc. después desde Tareas)
      </button>
    </div>
  );
}

function RecordatorioRapidoForm({ onSave }) {
  const [titulo, setTitulo] = useState("");
  const [fecha, setFecha] = useState(todayISO());
  const [hora, setHora] = useState(horaActualHHMM());
  const [error, setError] = useState("");
  return (
    <div>
      <Field label="¿Qué quieres recordar?"><input autoFocus className="gp-input" value={titulo} onChange={(e) => setTitulo(e.target.value)} /></Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Fecha"><input type="date" className="gp-input" value={fecha} onChange={(e) => setFecha(e.target.value)} /></Field>
        <Field label="Hora"><input type="time" className="gp-input" value={hora} onChange={(e) => setHora(e.target.value)} /></Field>
      </div>
      {error && <p className="text-xs gp-text-red mb-2">{error}</p>}
      <button className="gp-btn w-full py-2 text-sm mt-1" onClick={() => {
        if (!titulo.trim()) { setError("Captura qué quieres recordar."); return; }
        onSave({ titulo: titulo.trim(), fechaHora: localInputsAFechaHora(fecha, hora) });
      }}>
        Guardar recordatorio
      </button>
    </div>
  );
}

function DiarioRapidoForm({ onSave }) {
  const [nombre, setNombre] = useState("");
  const [fecha, setFecha] = useState(todayISO());
  const [error, setError] = useState("");
  return (
    <div>
      <Field label="¿Qué pasó hoy?"><textarea autoFocus rows={3} className="gp-input" value={nombre} onChange={(e) => setNombre(e.target.value)} /></Field>
      <Field label="Fecha"><input type="date" className="gp-input" value={fecha} onChange={(e) => setFecha(e.target.value)} /></Field>
      {error && <p className="text-xs gp-text-red mb-2">{error}</p>}
      <button className="gp-btn w-full py-2 text-sm mt-1" onClick={() => {
        if (!nombre.trim()) { setError("Escribe algo primero."); return; }
        onSave({ tipo: "Diario", nombre: nombre.trim(), fecha, proyectoId: "", ganancia: "", notas: "" });
      }}>
        Guardar (puedes editarlo después desde Diario)
      </button>
    </div>
  );
}



