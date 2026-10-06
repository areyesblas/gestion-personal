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
import { ESTATUS_TAREA, FRECUENCIA } from "./lib/catalogos";
import { aplicaHoy } from "./lib/habitos";
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
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  PieChart, Pie, Cell, LineChart, Line, ReferenceLine, ComposedChart,
} from "recharts";
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
// etiqueta), no por su id interno: si el id es "Proveedor" pero el combo dice "Proveedores", lo
// que tiene que quedar alfabético es lo segundo.
const CATS = ordenAlfabetico(["Fundación", "Software", "Música", "Renta", "Marketing", "Chatbots", "Personal", "Otro"]);
const ESTATUS_PROYECTO = ["Idea", "En validación", "En desarrollo", "Activo", "Finalizado", "Pausado", "Archivado"];
// Etiqueta corta SOLO para dibujar (chips de filtro, badges): el valor guardado en Supabase sigue
// siendo el de ESTATUS_PROYECTO. No son estados nuevos — es el mismo estado escrito más corto para
// que la fila de filtros no se convierta en una barra gigantesca (secc. 7 del rediseño).
const ETIQUETA_ESTATUS_PROYECTO = { "En validación": "Validación", "En desarrollo": "Desarrollo", "Pausado": "En pausa" };
const etiquetaEstatusProyecto = (e) => ETIQUETA_ESTATUS_PROYECTO[e] || e;
// Colores semánticos del pipeline: de la idea (ámbar, todavía sin compromiso) al activo (verde,
// produciendo), con el archivado en gris. Son los mismos colores que ya usa el resto de ARKEYONE.
const COLOR_ESTATUS_PROYECTO = {
  "Idea": "#F59E0B",
  "En validación": "#8B5CF6",
  "En desarrollo": "#087CF5",
  "Activo": "#16A36A",
  "Finalizado": "#5FBF8B",
  "Pausado": "#F97316",
  "Archivado": "#64748B",
};
// Contexto de vida del proyecto (secc. 12 del rediseño, 24 sept 2026). NO es un módulo por
// contexto: es una propiedad del proyecto, como la categoría, para poder separar lo personal de
// lo del negocio sin duplicar pantallas.
const CONTEXTOS_PROYECTO = ["Personal", "Profesional", "Empresarial"];
const COLOR_CONTEXTO_PROYECTO = { Personal: "#8B5CF6", Profesional: "#087CF5", Empresarial: "#16A36A" };
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
// Ícono y color del proyecto: se DERIVAN de su categoría, no se guardan como campo. Así cada
// proyecto se reconoce de un vistazo en la lista sin pedirle a nadie que elija un ícono.
const ICONO_CATEGORIA_PROYECTO = {
  "Fundación": Heart, "Software": Code2, "Música": Music, "Renta": Home,
  "Marketing": Megaphone, "Chatbots": Bot, "Personal": User, "Otro": FolderKanban,
};
const COLOR_CATEGORIA_PROYECTO = {
  "Fundación": "#EC4899", "Software": "#087CF5", "Música": "#8B5CF6", "Renta": "#16A36A",
  "Marketing": "#F59E0B", "Chatbots": "#06B6D4", "Personal": "#64748B", "Otro": "#64748B",
};
const MODO_PROYECTO = ["Finito", "Continuo"];
const MONETIZACION = ordenAlfabetico(["Dinero", "Especie", "Intercambio", "No genera dinero"]);
const PRIORIDADES = ["Alta", "Media", "Baja"];
// 7 estados según el documento maestro v0.1 (antes eran solo 3: Pendiente/En progreso/Hecho).
// Estados que cuentan como "ya no requiere trabajo activo" (para filtros de "abiertas" vs archivadas).
const ESTATUS_TAREA_CERRADOS = ["Completada", "Cancelada"];
const tareaAbierta = (estatus) => !ESTATUS_TAREA_CERRADOS.includes(estatus);
const toneEstatusTarea = (estatus) => (
  estatus === "Completada" ? "teal" :
  estatus === "Cancelada" ? "muted" :
  estatus === "En proceso" ? "gold" :
  estatus === "En espera" ? "red" :
  "muted" // Borrador, No iniciada, Pendiente
);
const TIPO_FIN = ["Ingreso", "Egreso"];

/* ---------- Divisas ----------
   MONEDA_BASE, MONEDAS, montoBaseDe y fmtMonedaOriginal viven en src/lib/formato.js, con la nota
   de por qué el monto base se congela al capturar. Aquí se queda solo lo que necesita red. */

// Tipo de cambio del DÍA del movimiento, no el de hoy: api.frankfurter.dev responde histórico
// pidiéndole una fecha. Si falla (sin internet, fecha futura, moneda que la API no cubre) se
// devuelve null y el formulario deja capturarlo a mano, que es lo que hay que hacer de todos
// modos cuando el banco te cobró a otro tipo.
const cacheTipoCambio = new Map();
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
const FORMA_PAGO = ordenAlfabetico(["Efectivo", "Transferencia", "Especie", "Intercambio"]);
const OCASIONES_REGALO = ordenAlfabetico(["Cumpleaños", "Navidad", "Aniversario", "Felicitación", "Otro"]);
const ESTATUS_REGALO = ["Por comprar", "Comprado", "Envuelto", "Entregado"];
// Tipo de atención: distinto de la ocasión (Cumpleaños/Navidad/…). La ocasión es CUÁNDO/POR QUÉ;
// el tipo es QUÉ clase de atención se dio o se dará.
const TIPOS_ATENCION = ordenAlfabetico(["Regalo", "Felicitación", "Condolencia", "Agradecimiento", "Llamada", "Visita", "Mensaje", "Otro"]);

// Roles de un contacto. Un contacto puede tener varios a la vez (anexo de arquitectura). "Personal"
// y "Familia" se agregaron el 24 sept 2026 con el rediseño de la pantalla, calcados del mockup de
// Angel — la columna `tipos` es text[], así que ampliar el catálogo no requiere migración.
const TIPOS_CONTACTO = ordenAlfabetico(["Amistad", "Cliente", "Proveedor", "Colaborador", "Personal", "Familia", "Otro"]);
// Cómo se nombra cada rol en las pastillas de filtro (en plural, como el mockup).
const FILTRO_PLURAL = { Amistad: "Amistades", Cliente: "Clientes", Proveedor: "Proveedores", Colaborador: "Colaboradores", Personal: "Personal", Familia: "Familia", Otro: "Otros" };
// Un color propio por rol, para distinguirlos de un vistazo en la lista (mockup 24 sept 2026).
const COLOR_TIPO_CONTACTO = { Amistad: "#14B8A6", Cliente: "#087CF5", Proveedor: "#F59E0B", Colaborador: "#16A36A", Personal: "#8B5CF6", Familia: "#EC4899", Otro: "#64748B" };

// Títulos de trato más comunes. Es una sugerencia, no una lista cerrada: el campo deja escribir
// cualquier otro. Sirve para dirigirse a la persona ("Estimado Arq. Quintana"), NO para filtrar
// —para eso están las etiquetas, que sí admiten varias por contacto.
// Catálogo abierto de etiquetas: se deduce de las que ya se usaron, igual que los tags de
// Citas. No hay tabla que mantener ni opciones que puedan quedarse huérfanas.
// Mismo criterio para las etiquetas de proyectos: el catálogo son las que ya se usaron.
const etiquetasDeProyectos = (proyectos) =>
  [...new Set((proyectos || []).flatMap((p) => p.etiquetas || []))].sort((a, b) => compararEs(a, b));

const etiquetasDeContactos = (contactos) =>
  [...new Set((contactos || []).flatMap((c) => c.etiquetas || []))].sort((a, b) => compararEs(a, b));

// Los títulos funcionan igual: la lista fija es solo el arranque, y todo título que se escriba
// una vez queda sugerido para los siguientes contactos. Así no hay que pedirle a nadie que
// agregue "Mtro. en Arquitectura" a una lista del código para poder usarlo.
// Renombra o quita un valor de catálogo en todos los registros que lo usan. `esLista` distingue
// un campo de varios valores (etiquetas) de uno solo (título). Devuelve cuántos cambió.
// Pasar `nuevo = null` borra.
async function editarValorCatalogo({ registros, campo, esLista, viejo, nuevo, onEditar }) {
  const afectados = (registros || []).filter((r) => (esLista ? (r[campo] || []).includes(viejo) : (r[campo] || "") === viejo));
  for (const r of afectados) {
    const valor = esLista
      ? (nuevo
          ? [...new Set((r[campo] || []).map((x) => (x === viejo ? nuevo : x)))]
          : (r[campo] || []).filter((x) => x !== viejo))
      : (nuevo || "");
    await onEditar(r.id, { [campo]: valor });
  }
  return afectados.length;
}

// Pregunta y ejecuta. Se usa igual en Contactos, Proyectos y Citas, para que administrar un
// catálogo se sienta igual en toda la app.
function usarCatalogoEditable({ registros, campo, esLista, onEditar, nombreSingular }) {
  const cuantos = (viejo) => (registros || []).filter((r) => (esLista ? (r[campo] || []).includes(viejo) : (r[campo] || "") === viejo)).length;
  return {
    renombrar: async (viejo) => {
      const nuevo = window.prompt(`Renombrar "${viejo}". Se cambia en ${cuantos(viejo)} ficha(s).`, viejo);
      if (nuevo === null) return;
      const limpio = nuevo.trim();
      if (!limpio || limpio === viejo) return;
      await editarValorCatalogo({ registros, campo, esLista, viejo, nuevo: limpio, onEditar });
    },
    eliminar: async (viejo) => {
      const n = cuantos(viejo);
      if (!window.confirm(`Quitar ${nombreSingular} "${viejo}" de ${n} ficha(s). Esto no borra las fichas, solo les quita ese valor. ¿Continuar?`)) return;
      await editarValorCatalogo({ registros, campo, esLista, viejo, nuevo: null, onEditar });
    },
  };
}

const titulosDeContactos = (contactos) =>
  [...new Set([...TITULOS_CONTACTO, ...(contactos || []).map((c) => (c.titulo || "").trim()).filter(Boolean)])]
    .sort((a, b) => compararEs(a, b));

const TITULOS_CONTACTO = ordenAlfabetico(["Arq.", "C.P.", "Dr.", "Dra.", "Ing.", "Lic.", "Mtro.", "Mtra.", "Profr.", "Sr.", "Sra."]);

// Categorías de notificación configurables por el usuario (Configuración > Notificaciones).
const CATEGORIA_POR_TIPO_NOTIF = {
  medicamento: "Salud", cita: "Agenda", deuda: "Finanzas", cobro_pendiente: "Finanzas",
  pago_recurrente: "Finanzas", pendiente: "Recordatorios", documento: "Documentos",
  activo_digital: "Activos digitales", apartado: "Finanzas", revision_proyecto: "Proyectos",
  cumpleanos: "Recordatorios", regalo: "Recordatorios", evento: "Agenda", factura: "Finanzas",
  campana: "Proyectos", asignacion: "Colaboradores",
};
const PARENTESCOS = ordenAlfabetico(["Papá", "Mamá", "Hermano/a", "Hijo/a", "Esposo/a", "Abuelo/a", "Tío/a", "Primo/a", "Sobrino/a", "Cuñado/a", "Suegro/a", "Compadre/Comadre", "Amigo cercano", "Conocido"]);
const ESTATUS_META = ["No iniciada", "En progreso", "Cumplida"];

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
// quiere compartir el año. Internamente se sigue guardando como fecha (columna "date" en Supabase),
// pero con un año ficticio (2000) que diasParaCumple() ignora por completo: solo usa mes/día.
const diaMesDeFecha = (fechaNacimiento) => {
  if (!fechaNacimiento) return { dia: "", mes: "" };
  const d = new Date(fechaNacimiento + "T00:00:00");
  if (isNaN(d.getTime())) return { dia: "", mes: "" };
  return { dia: String(d.getDate()), mes: String(d.getMonth() + 1) };
};
const construirFechaCumple = (dia, mes) => (dia && mes ? `2000-${String(mes).padStart(2, "0")}-${String(dia).padStart(2, "0")}` : "");
const armarNombreContacto = (nombres, apellidoPaterno, apellidoMaterno) =>
  [nombres, apellidoPaterno, apellidoMaterno].map((s) => (s || "").toString().trim()).filter(Boolean).join(" ");
// Orden alfabético de contactos: nombre(s), luego apellido paterno y materno — así lo pidió
// Angel el 24 sept 2026 (antes ordenaba por apellido primero, estilo directorio telefónico).
const claveOrdenContacto = (c) =>
  `${c.nombres || c.nombre || ""} ${c.apellidoPaterno || ""} ${c.apellidoMaterno || ""}`.trim();

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
function CumpleanosField({ value, onChange }) {
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

// Días que faltan para el próximo cumpleaños (a partir de una fecha de nacimiento cualquiera).
const diasParaCumple = (fechaNacimiento) => {
  if (!fechaNacimiento) return null;
  const hoy = new Date(todayISO());
  const nac = new Date(fechaNacimiento);
  let proximo = new Date(hoy.getFullYear(), nac.getMonth(), nac.getDate());
  if (proximo < hoy) proximo = new Date(hoy.getFullYear() + 1, nac.getMonth(), nac.getDate());
  return Math.round((proximo - hoy) / 86400000);
};

/* Números de página a dibujar, con "…" cuando hay muchas (1 2 3 4 5 … 11), para no llenar la
   barra de paginación de botones. Devuelve números y la cadena "…" como separador. */
function paginasVisibles(actual, total) {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  if (actual <= 4) return [1, 2, 3, 4, 5, "…", total];
  if (actual >= total - 3) return [1, "…", total - 4, total - 3, total - 2, total - 1, total];
  return [1, "…", actual - 1, actual, actual + 1, "…", total];
}




/* ---------- persistencia relacional ---------- */
const TABLES = ["empresas", "proyectos", "pendientes", "equipo", "finanzas", "actividades", "activos", "metas", "contactos", "redesMetricas", "documentos", "habitos", "salud", "apartados", "apartadosMovimientos", "eventos", "comentarios", "saldoInicial", "regalos", "facturas", "campanas", "campanaActividades", "patrimonio", "patrimonioValuaciones", "medicamentos", "citas", "notas", "pagosFinanzas", "rutinasEjercicio", "rutinaEjercicioItems", "sesionesEjercicio", "sesionEjercicioItems", "medidasCorporales", "recetas", "dietaDias", "presupuestos"];
// Deudas ya NO es una tabla propia (Documento Maestro v1.2, secc. 23.11/40): es una vista
// calculada sobre Finanzas (egresos no recurrentes con saldo pendiente). Esta función se usa
// en cualquier lugar que antes leía `data.deudas`.
const deudasDeFinanzas = (finanzas) => (finanzas || []).filter((f) => f.tipo === "Egreso" && !f.esRecurrente && (f.estatus === "Pendiente" || f.estatus === "Parcial"));
// Catálogo abierto de tags de Citas (Grupo C): junta los tags ya usados en todas las citas para
// sugerirlos en el combobox, sin imponer una lista fija — cualquiera puede escribir uno nuevo.
const tagsUnicos = (citas) => [...new Set((citas || []).flatMap((c) => c.tags || []))].sort((a, b) => a.localeCompare(b));
const OLD_STORAGE_KEY = "gestion_personal_data"; // localStorage, versión muy vieja
const OLD_BLOB_TABLE = "gestion_data"; // tabla única jsonb, versión anterior a este modelo relacional

const camelToSnake = (s) => s.replace(/[A-Z]/g, (c) => "_" + c.toLowerCase());
const snakeToCamel = (s) => s.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
const tableName = (key) => camelToSnake(key);



const ETIQUETA_TABLA = {
  empresas: "Empresa", proyectos: "Proyecto", pendientes: "Pendiente", equipo: "Equipo", finanzas: "Movimiento financiero",
  actividades: "Actividad", activos: "Activo digital", metas: "Meta",
  contactos: "Contacto", redesMetricas: "Métrica de red social", documentos: "Documento",
  habitos: "Hábito", salud: "Registro de salud", apartados: "Apartado", apartadosMovimientos: "Movimiento de apartado", eventos: "Evento",
  comentarios: "Comentario", saldoInicial: "Saldo inicial", regalos: "Regalo",
  facturas: "Factura", campanas: "Campaña", campanaActividades: "Actividad de campaña", patrimonio: "Bien patrimonial",
  patrimonioValuaciones: "Valuación de patrimonio", medicamentos: "Medicamento", citas: "Cita", notas: "Nota",
  pagosFinanzas: "Pago registrado", presupuestos: "Presupuesto",
};

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


function labelFor(key, item) {
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


function rowToJs(row) {
  const out = {};
  for (const [k, v] of Object.entries(row)) {
    out[snakeToCamel(k)] = v;
  }
  return out;
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
function rowToSalud(row) {
  const { estudioNombre, estudioUrl, ...rest } = rowToJs(row);
  return { ...rest, estudio: estudioNombre ? { nombre: estudioNombre, url: estudioUrl } : null };
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

const fromRow = (key, row) => (key === "salud" ? rowToSalud(row) : rowToJs(row));

async function fetchTable(key, ownerId) {
  const { data, error } = await supabase.from(tableName(key)).select("*").eq("user_id", ownerId).is("deleted_at", null).order("created_at", { ascending: true });
  if (error) { console.error(`Error al leer ${tableName(key)}:`, error); return []; }
  return data.map((row) => fromRow(key, row));
}
async function fetchPapelera(ownerId) {
  const entries = await Promise.all(TABLES.map(async (key) => {
    const { data, error } = await supabase.from(tableName(key)).select("*").eq("user_id", ownerId).not("deleted_at", "is", null).order("deleted_at", { ascending: false });
    if (error) { console.error(`Error al leer papelera de ${tableName(key)}:`, error); return [key, []]; }
    return [key, data.map((row) => fromRow(key, row))];
  }));
  return Object.fromEntries(entries);
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

// migración única desde la versión anterior (un solo blob jsonb), solo si las tablas nuevas están vacías
async function migrateFromOldBlobIfNeeded(current, ownerId) {
  const allEmpty = TABLES.every((k) => current[k].length === 0);
  if (!allEmpty) return current;
  try {
    const { data: blobRow } = await supabase.from(OLD_BLOB_TABLE).select("data").eq("id", "main").maybeSingle();
    const blob = blobRow?.data;
    if (!blob) return current;
    for (const key of TABLES) {
      for (const item of blob[key] || []) {
        const { error } = await supabase.from(tableName(key)).insert(toRow(key, item));
        if (error) console.error(`Error migrando ${key}:`, error);
      }
    }
    if (blob.perfilSalud?.alturaCm) {
      await supabase.from("perfil_salud").upsert({ altura_cm: blob.perfilSalud.alturaCm }, { onConflict: "user_id" });
    }
    return await loadAllTables(ownerId);
  } catch (e) {
    console.error("No se pudo migrar desde la versión anterior:", e);
    return current;
  }
}






// Monto en cualquier moneda, con su tipo de cambio del día. Lo usa el formulario de Finanzas y
// el de movimientos del proyecto, para que capturar en dólares se haga igual en los dos lados.
//
// El tipo de cambio se pide a la API con la FECHA del movimiento, no con la de hoy: así un gasto
// capturado hoy pero fechado el mes pasado se congela al tipo que había ese día. Y siempre queda
// editable, porque el tipo que te cobró el banco casi nunca es el oficial.
// Muestra el importe de un movimiento. Siempre en pesos, porque es la moneda con la que se
// compara todo; si el movimiento fue en otra moneda, debajo va lo que realmente se pagó y el
// tipo de cambio al que quedó congelado, que es el dato que hace cuadrar el histórico.
function MontoMovimiento({ f, className = "" }) {
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

function CamposMoneda({ monto, moneda, tipoCambio, fecha, onCambiar }) {
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



// Mismo patrón que SelectGuardable, para los campos numéricos de una tabla (el avance en el
// árbol de tareas del centro de proyecto).
function NumeroGuardable({ valor, placeholder, onGuardar, ariaLabel, style }) {
  const { borrador, cambiar, descartar, sucio } = useBorrador({ v: valor ?? "" });
  return (
    <span className="inline-flex items-center gap-1">
      <input
        type="number" min={0} max={100} aria-label={ariaLabel}
        value={borrador.v} placeholder={placeholder}
        onChange={(e) => cambiar({ v: e.target.value === "" ? "" : Math.max(0, Math.min(100, Number(e.target.value))) })}
        className="gp-input gp-mono" style={{ width: 48, padding: "1px 4px", fontSize: 10, ...(style || {}) }}
      />
      {sucio && (
        <>
          <IconBtn title="Guardar este cambio" onClick={() => { const v = borrador.v; descartar(); onGuardar(v === "" ? null : Number(v)); }}>
            <Check size={12} className="gp-text-teal" />
          </IconBtn>
          <IconBtn title="Descartar" onClick={descartar}><X size={12} className="gp-text-red" /></IconBtn>
        </>
      )}
    </span>
  );
}

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
      const { data: sesion } = await supabase.auth.getSession();
      const resp = await fetch(`${supabase.supabaseUrl}/functions/v1/asistente-ia`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${sesion.session.access_token}` },
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
// Candados de reautenticación de los módulos sensibles. Apagados a propósito el 1 oct 2026
// (Angel: "de momento quítalos, al final vemos a qué se los ponemos y el mecanismo más
// práctico"). Toda la maquinaria sigue intacta —las listas de vistas, el modal de contraseña,
// las ventanas de 15 y 10 minutos—: volver a encenderlos es poner esta constante en true.
// Mientras esté en false, la app NO pide contraseña para entrar a Finanzas, Salud, Documentos,
// etc. Eso baja el nivel de protección a propósito y es una decisión del dueño del producto.
const CANDADO_SENSIBLE_ACTIVO = false;

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
      const { data: sesion } = await supabase.auth.getSession();
      await fetch(`${supabase.supabaseUrl}/functions/v1/notificar-asignacion`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${sesion.session.access_token}` },
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
      const { data: sesion } = await supabase.auth.getSession();
      const resp = await fetch(`${supabase.supabaseUrl}/functions/v1/notificar-tarea-asignada`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${sesion.session.access_token}` },
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

      let result = await loadAllTables(misId);
      result = await migrateFromOldBlobIfNeeded(result, misId);
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
                    const { data: sesion } = await supabase.auth.getSession();
                    await fetch(`${supabase.supabaseUrl}/functions/v1/enviar-push`, {
                      method: "POST",
                      headers: { "Content-Type": "application/json", Authorization: `Bearer ${sesion.session.access_token}` },
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


function Colaboradores({ misId, miEmail, contactos }) {
  const [lista, setLista] = useState(null);
  const [modal, setModal] = useState(false);
  const [busy, setBusy] = useState(null);
  const [revocarConfirm, setRevocarConfirm] = useState(null);
  const [eliminarConfirm, setEliminarConfirm] = useState(null);
  const [avisoCorreo, setAvisoCorreo] = useState(null); // { id, ok, mensaje }
  const [cuidadoModal, setCuidadoModal] = useState(null); // colaborador para el que se gestionan dependientes

  const cargar = async () => {
    setLista(null);
    const { data, error } = await supabase.from("colaboradores").select("*, colaborador_dependientes(id, contacto_id)").eq("propietario_id", misId).order("created_at", { ascending: false });
    if (error) { console.error("Error al cargar colaboradores:", error); setLista([]); return; }
    setLista(data);
  };
  useEffect(() => { cargar(); }, []);

  const nombreContacto = (id) => (contactos || []).find((c) => c.id === id)?.nombre || "—";

  const agregarDependiente = async (colaboradorId, contactoId) => {
    const { error } = await supabase.from("colaborador_dependientes").insert({ colaborador_id: colaboradorId, propietario_id: misId, contacto_id: contactoId });
    if (error) { alert("No se pudo agregar: " + error.message); return; }
    cargar();
  };
  const quitarDependiente = async (dependienteId) => {
    const { error } = await supabase.from("colaborador_dependientes").delete().eq("id", dependienteId);
    if (error) { alert("No se pudo quitar: " + error.message); return; }
    cargar();
  };

  // Llama a la Edge Function que manda el correo de invitación por Resend.
  // Blindado con try/catch: si falla la red o el fetch se cae (ej. CORS, sin conexión),
  // nunca debe dejar el botón pegado en "Invitando…" — siempre regresa un resultado.
  const enviarCorreoInvitacion = async (colaboradorId) => {
    try {
      const { data: sesion } = await supabase.auth.getSession();
      const resp = await fetch(`${supabase.supabaseUrl}/functions/v1/invitar-colaborador`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${sesion.session.access_token}` },
        body: JSON.stringify({ colaboradorId }),
      });
      const json = await resp.json().catch(() => ({}));
      return { ok: resp.ok, json };
    } catch (err) {
      console.error("Error al enviar correo de invitación:", err);
      return { ok: false, json: { error: String(err) } };
    }
  };

  const invitar = async ({ nombre, correo, modulos }) => {
    setBusy("nuevo");
    const modulosSnake = modulos.map((k) => tableName(k));
    // "comentarios" siempre viene incluido si se dio acceso a cualquier módulo, para que vean la bitácora.
    if (modulosSnake.length && !modulosSnake.includes("comentarios")) modulosSnake.push("comentarios");
    // las valuaciones de patrimonio van junto con el módulo de patrimonio.
    if (modulos.includes("patrimonio") && !modulosSnake.includes("patrimonio_valuaciones")) modulosSnake.push("patrimonio_valuaciones");
    const { data: fila, error } = await supabase.from("colaboradores").insert({
      propietario_id: misId, propietario_email: miEmail,
      colaborador_email: correo.trim().toLowerCase(), colaborador_nombre: nombre || null, modulos: modulosSnake, estatus: "Pendiente",
    }).select().single();
    if (error) { setBusy(null); alert("No se pudo invitar: " + error.message); return; }
    const { ok } = await enviarCorreoInvitacion(fila.id);
    setBusy(null);
    setModal(false);
    setAvisoCorreo({ id: fila.id, ok, mensaje: ok ? `Se envió el correo de invitación a ${fila.colaborador_email}.` : `Se guardó la invitación, pero no se pudo enviar el correo a ${fila.colaborador_email}. Puedes reenviarlo desde el botón "Reenviar correo".` });
    cargar();
  };

  const reenviarInvitacion = async (c) => {
    setBusy(c.id);
    const { ok } = await enviarCorreoInvitacion(c.id);
    setBusy(null);
    setAvisoCorreo({ id: c.id, ok, mensaje: ok ? `Se reenvió el correo de invitación a ${c.colaborador_email}.` : `No se pudo enviar el correo a ${c.colaborador_email}. Inténtalo de nuevo en un momento.` });
  };

  const revocar = async (id) => {
    setBusy(id);
    const { error } = await supabase.from("colaboradores").update({ estatus: "Revocado" }).eq("id", id);
    setBusy(null);
    if (error) { alert("No se pudo revocar."); return; }
    setRevocarConfirm(null);
    cargar();
  };

  const reactivar = async (id) => {
    setBusy(id);
    const { error } = await supabase.from("colaboradores").update({ estatus: "Activo" }).eq("id", id);
    setBusy(null);
    if (error) { alert("No se pudo reactivar."); return; }
    cargar();
  };

  const eliminar = async (id) => {
    setBusy(id);
    const { error } = await supabase.from("colaboradores").delete().eq("id", id);
    setBusy(null);
    if (error) { alert("No se pudo eliminar: " + error.message); return; }
    setEliminarConfirm(null);
    cargar();
  };

  const toneEstatus = { Activo: "teal", Pendiente: "gold", Revocado: "red" };

  return (
    <div>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-1">
        <h2 className="gp-serif text-2xl">Colaboradores</h2>
        <button onClick={() => setModal(true)} className="gp-btn flex items-center justify-center gap-1 px-3 py-1.5 text-sm w-full sm:w-auto"><Plus size={14} /> Invitar</button>
      </div>
      <p className="text-sm gp-text-muted mb-6">Invita por correo a alguien (tu contador, un asistente) y elige exactamente qué módulos puede ver y editar dentro de tu cuenta.</p>

      {avisoCorreo && (
        <div className="gp-panel-hi p-3 mb-4 text-xs flex items-start justify-between gap-3" style={{ borderLeft: `3px solid ${avisoCorreo.ok ? "var(--teal)" : "var(--red)"}` }}>
          <span>{avisoCorreo.mensaje}</span>
          <button onClick={() => setAvisoCorreo(null)} className="gp-text-muted shrink-0"><X size={14} /></button>
        </div>
      )}

      {lista === null && <p className="text-sm gp-text-muted">Cargando…</p>}
      {lista !== null && lista.length === 0 && <p className="text-sm gp-text-muted">Aún no has invitado a nadie.</p>}

      {lista !== null && lista.length > 0 && (
        <div className="space-y-2">
          {lista.map((c) => (
            <div key={c.id} className="gp-panel p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    {c.colaborador_nombre ? (
                      <>
                        <span className="text-sm font-medium truncate">{c.colaborador_nombre}</span>
                        <span className="text-xs gp-text-muted truncate">{c.colaborador_email}</span>
                      </>
                    ) : (
                      <span className="text-sm font-medium truncate">{c.colaborador_email}</span>
                    )}
                    <Badge tone={toneEstatus[c.estatus]}>{c.estatus}</Badge>
                  </div>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {(c.modulos || []).filter((m) => m !== "comentarios").map((m) => {
                      const key = Object.keys(ETIQUETA_TABLA).find((k) => tableName(k) === m);
                      return <Badge key={m} tone="muted">{key ? ETIQUETA_TABLA[key] : m}</Badge>;
                    })}
                    {(c.colaborador_dependientes || []).map((d) => (
                      <Badge key={d.id} tone="teal">Cuidador de {nombreContacto(d.contacto_id)}</Badge>
                    ))}
                  </div>
                </div>
                <div className="flex gap-1 shrink-0">
                  {c.estatus === "Pendiente" && (
                    <button disabled={busy === c.id} onClick={() => reenviarInvitacion(c)} className="gp-btn-ghost px-3 py-1.5 text-xs whitespace-nowrap">
                      {busy === c.id ? "Enviando…" : "Reenviar correo"}
                    </button>
                  )}
                  {c.estatus === "Revocado" ? (
                    <button disabled={busy === c.id} onClick={() => reactivar(c.id)} className="gp-btn-ghost px-3 py-1.5 text-xs">Reactivar</button>
                  ) : (
                    <button disabled={busy === c.id} onClick={() => setRevocarConfirm(c)} className="px-3 py-1.5 text-xs rounded" style={{ background: "var(--red)", color: "#fff" }}>Revocar</button>
                  )}
                  <IconBtn onClick={() => setEliminarConfirm(c)} title="Eliminar colaborador"><Trash2 size={13} /></IconBtn>
                </div>
              </div>
              {c.estatus === "Pendiente" && <p className="text-xs gp-text-muted mt-2">Ya le mandamos un correo de invitación. Se activa solo en cuanto esa persona cree su cuenta o inicie sesión con ese correo.</p>}
              {c.estatus !== "Revocado" && (
                <button onClick={() => setCuidadoModal(c)} className="text-xs gp-text-gold mt-2">Gestionar personas a cargo (Cuidador)</button>
              )}
            </div>
          ))}
        </div>
      )}

      {revocarConfirm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,.6)" }} onClick={() => setRevocarConfirm(null)}>
          <div className="gp-panel w-full max-w-sm p-5" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-2 mb-2"><AlertTriangle size={16} className="gp-text-red" /><h3 className="gp-serif text-lg">¿Revocar acceso?</h3></div>
            <p className="text-sm gp-text-muted mb-5">{revocarConfirm.colaborador_email} ya no va a poder ver ni editar nada de tu cuenta. Puedes reactivarlo después si quieres.</p>
            <div className="flex gap-2">
              <button onClick={() => setRevocarConfirm(null)} className="gp-btn-ghost flex-1 py-2 text-sm">Cancelar</button>
              <button onClick={() => revocar(revocarConfirm.id)} className="flex-1 py-2 text-sm rounded" style={{ background: "var(--red)", color: "#fff" }}>Revocar</button>
            </div>
          </div>
        </div>
      )}

      {eliminarConfirm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,.6)" }} onClick={() => setEliminarConfirm(null)}>
          <div className="gp-panel w-full max-w-sm p-5" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-2 mb-2"><Trash2 size={16} className="gp-text-red" /><h3 className="gp-serif text-lg">¿Eliminar colaborador?</h3></div>
            <p className="text-sm gp-text-muted mb-5">Se borra por completo el registro de {eliminarConfirm.colaborador_nombre || eliminarConfirm.colaborador_email} de tu lista de colaboradores. Esto no borra ninguna tarea que ya le hayas asignado, pero si quieres volver a darle acceso vas a tener que invitarlo de nuevo.</p>
            <div className="flex gap-2">
              <button onClick={() => setEliminarConfirm(null)} className="gp-btn-ghost flex-1 py-2 text-sm">Cancelar</button>
              <button disabled={busy === eliminarConfirm.id} onClick={() => eliminar(eliminarConfirm.id)} className="flex-1 py-2 text-sm rounded" style={{ background: "var(--red)", color: "#fff" }}>Eliminar</button>
            </div>
          </div>
        </div>
      )}

      {modal && (
        <Modal title="Invitar colaborador" onClose={() => setModal(false)}>
          <InvitarForm busy={busy === "nuevo"} onSave={invitar} />
        </Modal>
      )}

      {cuidadoModal && (
        <Modal title={`Personas a cargo de ${cuidadoModal.colaborador_nombre || cuidadoModal.colaborador_email}`} onClose={() => setCuidadoModal(null)}>
          <p className="text-xs gp-text-muted mb-3">
            Marca los contactos que esta persona puede acompañar como Cuidador: va a poder ver y registrar Salud y Medicamentos solo de quienes marques aquí, sin acceso al resto de tu cuenta — aunque no le hayas dado el módulo completo de Salud.
          </p>
          {(contactos || []).length === 0 ? (
            <p className="text-sm gp-text-muted">No tienes contactos todavía. Crea uno primero desde Contactos.</p>
          ) : (
            <div className="flex flex-col gap-1 max-h-72 overflow-y-auto gp-scroll">
              {(contactos || []).map((ct) => {
                const dep = (lista.find((c) => c.id === cuidadoModal.id)?.colaborador_dependientes || []).find((d) => d.contacto_id === ct.id);
                return (
                  <label key={ct.id} className="flex items-center gap-2 text-sm py-1.5">
                    <input
                      type="checkbox"
                      checked={!!dep}
                      onChange={() => (dep ? quitarDependiente(dep.id) : agregarDependiente(cuidadoModal.id, ct.id))}
                    />
                    {ct.nombre}
                  </label>
                );
              })}
            </div>
          )}
          <button onClick={() => setCuidadoModal(null)} className="gp-btn w-full py-2 text-sm mt-4">Listo</button>
        </Modal>
      )}
    </div>
  );
}

function InvitarForm({ onSave, busy }) {
  const [nombre, setNombre] = useState("");
  const [correo, setCorreo] = useState("");
  const [modulos, setModulos] = useState([]);
  const [error, setError] = useState("");

  const toggle = (key) => setModulos((prev) => prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]);

  return (
    <div>
      <Field label="Nombre (opcional)"><input className="gp-input" placeholder="ej. Mi contador, Juan asistente" value={nombre} onChange={(e) => setNombre(e.target.value)} /></Field>
      <Field label="Correo de la persona"><input type="email" className="gp-input" value={correo} onChange={(e) => setCorreo(e.target.value)} /></Field>
      <p className="text-xs gp-text-muted mb-2">¿Qué puede ver y editar?</p>
      <div className="grid grid-cols-2 gap-1.5 mb-4 max-h-56 overflow-y-auto gp-scroll">
        {TABLES.filter((k) => k !== "comentarios" && k !== "patrimonioValuaciones" && k !== "campanaActividades").map((k) => (
          <label key={k} className="flex items-center gap-1.5 text-xs">
            <input type="checkbox" checked={modulos.includes(k)} onChange={() => toggle(k)} />
            {ETIQUETA_TABLA[k] || k}
          </label>
        ))}
      </div>
      {error && <p className="text-xs gp-text-red mb-2">{error}</p>}
      <button
        className="gp-btn w-full py-2 text-sm mt-1 disabled:opacity-50"
        disabled={busy}
        onClick={() => {
          if (!correo.trim() || !correo.includes("@")) { setError("Captura un correo válido."); return; }
          if (modulos.length === 0) { setError("Elige al menos un módulo."); return; }
          setError("");
          onSave({ nombre: nombre.trim(), correo, modulos });
        }}
      >
        {busy ? "Invitando…" : "Invitar"}
      </button>
    </div>
  );
}


function Papelera({ onRestore, onPermanentDelete, ownerId }) {
  const [items, setItems] = useState(null); // null = cargando
  const [busyId, setBusyId] = useState(null);
  const [confirmarBorrar, setConfirmarBorrar] = useState(null); // { key, id, label }

  const cargar = async () => {
    setItems(null);
    const resultado = await fetchPapelera(ownerId);
    const plano = [];
    for (const key of TABLES) {
      for (const item of resultado[key] || []) {
        plano.push({ key, item });
      }
    }
    plano.sort((a, b) => (b.item.deletedAt || "").localeCompare(a.item.deletedAt || ""));
    setItems(plano);
  };

  useEffect(() => { cargar(); }, []);

  const restaurar = async (key, id) => {
    setBusyId(id);
    const ok = await onRestore(key, id);
    if (ok) setItems((prev) => prev.filter((x) => x.item.id !== id));
    setBusyId(null);
  };

  const borrarDefinitivo = async () => {
    const { key, id } = confirmarBorrar;
    setBusyId(id);
    const ok = await onPermanentDelete(key, id);
    if (ok) setItems((prev) => prev.filter((x) => x.item.id !== id));
    setBusyId(null);
    setConfirmarBorrar(null);
  };

  return (
    <div>
      <h2 className="gp-serif text-2xl mb-1">Papelera</h2>
      <p className="text-sm gp-text-muted mb-6">Todo lo que has eliminado, de cualquier módulo. Puedes recuperarlo o borrarlo definitivamente.</p>

      {items === null && <p className="text-sm gp-text-muted">Cargando…</p>}

      {items !== null && items.length === 0 && (
        <p className="text-sm gp-text-muted">La papelera está vacía.</p>
      )}

      {items !== null && items.length > 0 && (
        <div className="space-y-2">
          {items.map(({ key, item }) => (
            <div key={`${key}-${item.id}`} className="gp-panel p-3 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge tone="muted">{ETIQUETA_TABLA[key] || key}</Badge>
                  <span className="text-sm truncate">{labelFor(key, item)}</span>
                </div>
                <p className="text-xs gp-text-muted mt-1">Eliminado el {item.deletedAt ? new Date(item.deletedAt).toLocaleString("es-MX") : "—"}</p>
              </div>
              <div className="flex gap-2 shrink-0">
                <button disabled={busyId === item.id} onClick={() => restaurar(key, item.id)} className="gp-btn-ghost px-3 py-1.5 text-xs">Restaurar</button>
                <button disabled={busyId === item.id} onClick={() => setConfirmarBorrar({ key, id: item.id, label: labelFor(key, item) })} className="px-3 py-1.5 text-xs rounded" style={{ background: "var(--red)", color: "#fff" }}>Borrar definitivo</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {confirmarBorrar && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,.6)" }} onClick={() => setConfirmarBorrar(null)}>
          <div className="gp-panel w-full max-w-sm p-5" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle size={16} className="gp-text-red" />
              <h3 className="gp-serif text-lg">¿Borrar para siempre?</h3>
            </div>
            <p className="text-sm gp-text-muted mb-5">"{confirmarBorrar.label}" se va a borrar por completo. Esto ya no se puede deshacer, ni siquiera desde la papelera.</p>
            <div className="flex gap-2">
              <button onClick={() => setConfirmarBorrar(null)} className="gp-btn-ghost flex-1 py-2 text-sm">Cancelar</button>
              <button onClick={borrarDefinitivo} className="flex-1 py-2 text-sm rounded" style={{ background: "var(--red)", color: "#fff" }}>Borrar para siempre</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

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
      const { data: sesion } = await supabase.auth.getSession();
      const resp = await fetch(`${supabase.supabaseUrl}/functions/v1/asistente-ia`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${sesion.session.access_token}` },
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
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={serieMensualDashboard} margin={{ left: -20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="mes" tick={{ fill: "var(--muted)", fontSize: 11 }} />
              <YAxis tick={{ fill: "var(--muted)", fontSize: 11 }} />
              <Tooltip contentStyle={{ background: "var(--panel)", border: "1px solid var(--border)", fontSize: 12 }} formatter={(v) => fmtMoney(v)} />
              <Bar dataKey="ingresos" name="Ingresos" fill="var(--teal)" radius={[3, 3, 0, 0]} />
              <Bar dataKey="egresos" name="Egresos" fill="var(--red)" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
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
// cerrada: Finanzas acepta cualquier categoría y el campo deja escribir una nueva.
// Colores de la dona de gastos, en orden. Son los acentos de la app, no una paleta nueva.
const COLORES_DESGLOSE = ["#087CF5", "#F59E0B", "#8B5CF6", "#16A36A", "#EC4899", "#64748B"];

const CATEGORIAS_GASTO_PROYECTO = ordenAlfabetico([
  "Viáticos", "Traslados", "Materiales", "Software", "Subcontratación", "Comidas de trabajo",
  "Papelería", "Permisos y trámites", "Otro",
]);

// Foto completa del dinero de un proyecto. TODO sale de donde ya vive: los movimientos reales de
// Finanzas ligados al proyecto y el precio pactado de sus tareas. Este módulo no guarda ni un
// importe propio — si lo hiciera, en tres meses habría dos cifras que no cuadran.
//
// Dos ejes que conviene no confundir:
//   · cobrado / por cobrar  -> lo que entra del cliente (ingresos reales vs ingresos pendientes)
//   · comprometido / pagado -> lo que sale al equipo (precio pactado de tareas vs tareas ya hechas)
function finanzasProyecto(data, proyectoId) {
  const movs = (data.finanzas || []).filter((f) => f.proyectoId === proyectoId);
  const suma = (lista) => lista.reduce((t, f) => t + montoBaseDe(f), 0);

  const ingresos = movs.filter((f) => f.tipo === "Ingreso");
  const egresos = movs.filter((f) => f.tipo === "Egreso");
  const cobrado = suma(ingresos.filter((f) => f.estatus === "Cobrado"));
  const porCobrar = suma(ingresos.filter((f) => f.estatus !== "Cobrado"));
  const gastado = suma(egresos.filter((f) => f.estatus === "Cobrado"));
  const gastoPorPagar = suma(egresos.filter((f) => f.estatus !== "Cobrado"));
  // Dentro de los egresos conviene separar lo que se le paga a la gente de lo que se gasta en
  // operar (viáticos, materiales): son dos conversaciones distintas al revisar un proyecto.
  const pagosAPersonas = suma(egresos.filter((f) => f.categoria === "Pago a colaborador"));
  const gastosOperativos = (gastado + gastoPorPagar) - pagosAPersonas;

  const tareas = (data.pendientes || []).filter((t) => t.proyectoId === proyectoId && Number(t.precio) > 0);
  // Comprometido = todo lo pactado, se haya hecho o no. Devengado = lo de las tareas ya
  // terminadas, que es lo que de verdad hay que pagar hoy.
  const comprometidoEquipo = tareas.reduce((t, x) => t + (Number(x.precio) || 0), 0);
  const devengadoEquipo = tareas
    .filter((x) => x.estatus === "Completada")
    .reduce((t, x) => t + (Number(x.precio) || 0), 0);

  const ingresoTotal = cobrado + porCobrar;
  const costoTotal = comprometidoEquipo + gastado + gastoPorPagar;
  const margen = ingresoTotal - costoTotal;
  const margenPct = ingresoTotal > 0 ? Math.round((margen / ingresoTotal) * 100) : null;

  // Presupuesto de gasto del proyecto, si se fijó uno (tabla presupuestos, que ya traía
  // proyecto_id y nadie estaba usando).
  const presupuesto = (data.presupuestos || []).find((x) => x.proyectoId === proyectoId) || null;
  const topeGasto = presupuesto ? Number(presupuesto.monto) || 0 : null;
  const gastoReal = gastado + gastoPorPagar;
  const pctPresupuesto = topeGasto ? Math.round((gastoReal / topeGasto) * 100) : null;

  // Reparto del gasto por categoría, para la dona. "Otros" junta lo que no trae categoría.
  const porCategoria = {};
  egresos.forEach((f) => {
    const k = (f.categoria || "").trim() || "Otros";
    porCategoria[k] = (porCategoria[k] || 0) + montoBaseDe(f);
  });
  const desgloseGastos = Object.entries(porCategoria)
    .map(([nombre, monto]) => ({ nombre, monto, pct: gastoReal ? Math.round((monto / gastoReal) * 100) : 0 }))
    .sort((a, b) => b.monto - a.monto);

  // Evolución mes a mes. Dos líneas distintas a propósito:
  //   · la sólida es HISTORIA: solo lo que ya se cobró y ya se pagó.
  //   · la punteada es PROYECCIÓN: agrega lo pendiente en el mes en que se espera que pase.
  //
  // De qué fecha cuelga cada pendiente, en este orden:
  //   1. su propia fecha de cobro/pago (fecha_vencimiento). Es la mejor porque ya la capturaste
  //      tú al registrar el movimiento: es un compromiso, no una estimación mía.
  //   2. si no tiene, la fecha de entrega del proyecto, que es cuando normalmente se factura.
  //   3. si tampoco hay, el mes del propio movimiento, para que no desaparezca de la gráfica.
  const proyecto = (data.proyectos || []).find((x) => x.id === proyectoId);
  const mesDe = (f) => {
    if (f.estatus === "Cobrado") return (f.fecha || "").slice(0, 7);
    return ((f.fechaVencimiento || proyecto?.fechaFin || f.fecha || "")).slice(0, 7);
  };
  const porMes = {};
  const tocar = (mes) => { if (!porMes[mes]) porMes[mes] = { mes, ingreso: 0, gasto: 0, ingresoPend: 0, gastoPend: 0 }; };
  movs.forEach((f) => {
    const mes = mesDe(f);
    if (!mes) return;
    tocar(mes);
    const monto = montoBaseDe(f);
    if (f.estatus === "Cobrado") {
      if (f.tipo === "Ingreso") porMes[mes].ingreso += monto; else porMes[mes].gasto += monto;
    } else if (f.tipo === "Ingreso") porMes[mes].ingresoPend += monto;
    else porMes[mes].gastoPend += monto;
  });

  // Meses corridos entre el primero y el último, para que el eje no brinque huecos.
  const clavesMes = Object.keys(porMes).sort();
  if (clavesMes.length) {
    const [aIni, mIni] = clavesMes[0].split("-").map(Number);
    const [aFin, mFin] = clavesMes[clavesMes.length - 1].split("-").map(Number);
    for (let a = aIni, m = mIni; a < aFin || (a === aFin && m <= mFin); m === 12 ? (m = 1, a++) : m++) {
      tocar(`${a}-${String(m).padStart(2, "0")}`);
    }
  }

  const mesHoy = todayISO().slice(0, 7);
  // La punteada solo tiene sentido si queda algo por pasar; si no, duplicaría la sólida.
  const hayPendientes = porCobrar > 0 || gastoPorPagar > 0;
  let acumI = 0, acumG = 0, acumProy = 0;
  const evolucion = Object.values(porMes)
    .sort((a, b) => a.mes.localeCompare(b.mes))
    .map((m) => {
      acumI += m.ingreso; acumG += m.gasto;
      acumProy += m.ingreso - m.gasto + m.ingresoPend - m.gastoPend;
      const esPasado = m.mes <= mesHoy;
      return {
        ...m,
        acumuladoIngreso: acumI, acumuladoGasto: acumG,
        neto: esPasado ? acumI - acumG : null,
        // Arranca EN el mes actual, no después: ahí las dos valen lo mismo y las líneas se
        // tocan. Si empezara en el primer mes con pendientes, se verían como dos trazos sueltos.
        proyeccion: !hayPendientes || m.mes < mesHoy ? null : acumProy,
      };
    });
  const hayProyeccion = hayPendientes && evolucion.some((m) => m.proyeccion !== null);

  // Resultado: lo que hay hoy en la mano y lo que habrá cuando el cliente termine de pagar.
  const disponibleHoy = cobrado - gastado;
  const resultadoProyectado = disponibleHoy + porCobrar;

  return {
    movs, cobrado, porCobrar, ingresoTotal, gastado, gastoPorPagar, gastoReal,
    pagosAPersonas, gastosOperativos, desgloseGastos, evolucion, hayProyeccion,
    disponibleHoy, resultadoProyectado,
    comprometidoEquipo, devengadoEquipo, costoTotal, margen, margenPct,
    presupuesto, topeGasto, pctPresupuesto,
    pctCobrado: ingresoTotal ? Math.round((cobrado / ingresoTotal) * 100) : 0,
    pctPorCobrar: ingresoTotal ? Math.round((porCobrar / ingresoTotal) * 100) : 0,
    disponiblePresupuesto: topeGasto === null ? null : Math.max(0, topeGasto - gastoReal),
  };
}

// Cuánto se le debe a cada colaborador del proyecto y cuándo toca pagarle.
//   comprometido -> precio pactado de sus tareas en este proyecto
//   pagado       -> egresos "Pago a colaborador" ya pagados
//   por pagar    -> lo comprometido que todavía no se le entrega; si no hay tareas con precio,
//                   son los pagos ya registrados que siguen pendientes
function pagosPorColaborador(data, proyectoId) {
  const tareas = (data.pendientes || []).filter((t) => t.proyectoId === proyectoId && Number(t.precio) > 0 && t.colaboradorContactoId);
  const pagos = (data.finanzas || []).filter((f) => f.proyectoId === proyectoId && f.categoria === "Pago a colaborador" && f.contactoId);
  const ids = [...new Set([...tareas.map((t) => t.colaboradorContactoId), ...pagos.map((f) => f.contactoId)])];
  return ids.map((id) => {
    const suyas = tareas.filter((t) => t.colaboradorContactoId === id);
    const comprometido = suyas.reduce((s, t) => s + (Number(t.precio) || 0), 0);
    const pagado = pagos.filter((f) => f.contactoId === id && f.estatus === "Cobrado").reduce((s, f) => s + montoBaseDe(f), 0);
    const programado = pagos.filter((f) => f.contactoId === id && f.estatus !== "Cobrado").reduce((s, f) => s + montoBaseDe(f), 0);
    const porPagar = comprometido > 0 ? Math.max(0, comprometido - pagado) : programado;
    // La fecha más próxima entre lo que prometiste en las tareas y lo que dejaste programado.
    const fechas = [
      ...suyas.map((t) => t.fechaPagoAprox).filter(Boolean),
      ...pagos.filter((f) => f.contactoId === id && f.estatus !== "Cobrado").map((f) => f.fechaVencimiento).filter(Boolean),
    ].sort();
    return {
      id, nombre: (data.contactos || []).find((c) => c.id === id)?.nombre || "—",
      comprometido, pagado, porPagar, proximoPago: fechas[0] || "",
      estado: porPagar > 0 ? "Pendiente" : "Pagado",
    };
  }).sort((a, b) => b.porPagar - a.porPagar || compararEs(a.nombre, b.nombre));
}

function rentabilidadProyecto(data, proyectoId) {
  const movs = data.finanzas.filter((f) => f.proyectoId === proyectoId && f.estatus === "Cobrado");
  const ingresos = movs.filter((f) => f.tipo === "Ingreso").reduce((s, f) => s + montoBaseDe(f), 0);
  const egresos = movs.filter((f) => f.tipo === "Egreso").reduce((s, f) => s + montoBaseDe(f), 0);
  const tareasProyecto = data.pendientes.filter((t) => t.proyectoId === proyectoId);
  const pagosColab = tareasProyecto
    .filter((t) => t.colaboradorContactoId && t.estatus === "Completada")
    .reduce((s, t) => s + (Number(t.precio) || 0), 0);
  // Cuánto costaría en total hacer el proyecto si se pagara TODO lo pactado en el precio de cada
  // tarea (sin importar si ya está hecha o quién la haga) — un estimado, no un movimiento real.
  const costoEstimadoTotal = tareasProyecto.reduce((s, t) => s + (Number(t.precio) || 0), 0);
  return { ingresos, egresos, pagosColab, neto: ingresos - egresos, costoEstimadoTotal };
}

// Cuánto dinero (según el precio pactado de cada tarea) le corresponde a cada quien en el proyecto:
// a un colaborador con Responsable asignado, o a ti mismo cuando la tarea no tiene responsable
// (si la haces tú, ese dinero es ingreso potencial tuyo, no un costo a pagarle a alguien más).
function repartoCostosProyecto(data, proyectoId) {
  const tareas = data.pendientes.filter((t) => t.proyectoId === proyectoId && Number(t.precio) > 0);
  const grupos = {};
  for (const t of tareas) {
    const key = t.colaboradorContactoId || "_yo";
    if (!grupos[key]) {
      grupos[key] = {
        key,
        nombre: t.colaboradorContactoId ? (data.contactos.find((c) => c.id === t.colaboradorContactoId)?.nombre || "—") : "Tú",
        esYo: !t.colaboradorContactoId,
        tareas: 0, total: 0, generado: 0, pendiente: 0,
      };
    }
    const precio = Number(t.precio) || 0;
    grupos[key].tareas += 1;
    grupos[key].total += precio;
    if (t.estatus === "Completada") grupos[key].generado += precio; else grupos[key].pendiente += precio;
  }
  return Object.values(grupos).sort((a, b) => (a.esYo ? -1 : b.esYo ? 1 : a.nombre.localeCompare(b.nombre)));
}

/* ---------- Mis empresas ---------- */
// "Mis empresas" es una PERSPECTIVA del contexto Empresarial, no una segunda aplicación: aquí
// solo viven la empresa y su identidad. Sus proyectos, tareas, dinero, contactos y documentos
// siguen en sus módulos de siempre, relacionados con la empresa — nunca duplicados por empresa.

function LogoEmpresa({ e, size = 40 }) {
  if (e.logoUrl) {
    return <img src={e.logoUrl} alt="" className="rounded-xl object-cover shrink-0" style={{ width: size, height: size, border: "1px solid var(--border)" }} />;
  }
  return (
    <div className="rounded-xl flex items-center justify-center shrink-0" style={{ width: size, height: size, background: "rgba(22,163,106,.16)", color: "#16A36A" }}>
      <Building2 size={Math.round(size * 0.5)} />
    </div>
  );
}

function MisEmpresas({ data, onAdd, onEdit, onRemove, onVerProyecto, onIrAVista }) {
  const [modal, setModal] = useState(null);
  const [busqueda, setBusqueda] = useState("");
  const empresas = data.empresas || [];

  const proyectosDe = (empresaId) => (data.proyectos || []).filter((p) => p.empresaId === empresaId);
  const tareasAbiertasDe = (empresaId) => {
    const ids = new Set(proyectosDe(empresaId).map((p) => p.id));
    return (data.pendientes || []).filter((t) => ids.has(t.proyectoId) && !ESTATUS_TAREA_CERRADOS.includes(t.estatus)).length;
  };

  const visibles = ordenarLista(
    filtrarPorBusqueda(empresas, busqueda, [(e) => e.nombre, (e) => e.descripcion]),
    "alfabetico", { alfabetico: { get: (e) => e.nombre, tipo: "texto" } }
  );
  const columnasExport = [
    { label: "Nombre", get: (e) => e.nombre },
    { label: "Descripción", get: (e) => e.descripcion || "" },
    { label: "Proyectos", get: (e) => proyectosDe(e.id).length },
  ];

  return (
    <div>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-1">
        <h2 className="gp-serif text-2xl">Mis empresas</h2>
        <button onClick={() => setModal({ item: { nombre: "", descripcion: "", logoUrl: "" } })} className="gp-btn flex items-center justify-center gap-1 px-3 py-1.5 text-sm w-full sm:w-auto"><Plus size={14} /> Nueva empresa</button>
      </div>
      <p className="text-sm gp-text-muted mb-3">
        Las empresas que administras. Sus proyectos, tareas y dinero viven en sus módulos de siempre — aquí se relacionan, no se duplican.
      </p>

      <BarraListaEstandar busqueda={busqueda} onBusqueda={setBusqueda} placeholder="Buscar empresa por nombre o descripción…"
        onExportExcel={() => exportarFilasExcel(visibles, columnasExport, "empresas")}
        onExportPDF={() => exportarFilasPDF(visibles, columnasExport, "empresas", "Mis empresas", busqueda ? `búsqueda: "${busqueda}"` : "")} />

      {visibles.length === 0 ? (
        <div className="gp-panel p-8 text-center">
          <Building2 size={28} className="gp-text-muted mx-auto mb-3" />
          <p className="text-sm gp-text-muted">
            {empresas.length === 0
              ? "Todavía no registras ninguna empresa. Agrega la primera para poder ligarle proyectos."
              : "Ninguna empresa coincide con la búsqueda."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {visibles.map((e) => {
            const proys = proyectosDe(e.id);
            const abiertas = tareasAbiertasDe(e.id);
            return (
              <div key={e.id} className="gp-panel p-4">
                <div className="flex items-start gap-3">
                  <LogoEmpresa e={e} size={44} />
                  <div className="min-w-0 flex-1">
                    <p className="font-medium truncate">{e.nombre}</p>
                    {e.descripcion && <p className="text-xs gp-text-muted line-clamp-2 mt-0.5">{e.descripcion}</p>}
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <IconBtn title="Editar" onClick={() => setModal({ item: e })}><Pencil size={13} /></IconBtn>
                    <IconBtn title="Eliminar" onClick={() => onRemove(e.id)}><Trash2 size={13} /></IconBtn>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 mt-3">
                  <div className="gp-bloque rounded-lg p-2.5">
                    <p className="text-[10px] gp-text-muted">Proyectos</p>
                    <p className="gp-serif text-lg">{proys.length}</p>
                  </div>
                  <div className="gp-bloque rounded-lg p-2.5">
                    <p className="text-[10px] gp-text-muted">Tareas abiertas</p>
                    <p className="gp-serif text-lg">{abiertas}</p>
                  </div>
                </div>

                {proys.length > 0 && (
                  <div className="mt-3 pt-3 border-t gp-border flex flex-col gap-1.5">
                    {proys.slice(0, 3).map((p) => (
                      <button key={p.id} onClick={() => onVerProyecto(p.id)} className="flex items-center justify-between gap-2 w-full text-left">
                        <span className="text-xs truncate">{p.nombre}</span>
                        <BadgeEstatusProyecto estatus={p.estatus} />
                      </button>
                    ))}
                    {proys.length > 3 && (
                      <button onClick={() => onIrAVista("proyectos")} className="text-xs gp-text-gold text-left">Ver los {proys.length} proyectos →</button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {modal && (
        <Modal title={modal.item.id ? "Editar empresa" : "Nueva empresa"} onClose={() => setModal(null)}>
          <EmpresaForm item={modal.item} onSave={(v) => { modal.item.id ? onEdit(modal.item.id, v) : onAdd(v); setModal(null); }} />
        </Modal>
      )}
    </div>
  );
}

function EmpresaForm({ item, onSave }) {
  const [empresaId] = useState(() => item.id || uid());
  const [v, setV] = useState({ ...item, nombre: item.nombre || "", descripcion: item.descripcion || "", logoUrl: item.logoUrl || "" });
  const [error, setError] = useState("");
  return (
    <div>
      <div className="flex flex-col items-center mb-3">
        <AvatarForm
          avatarUrl={v.logoUrl}
          forma="cuadro"
          textoBoton="Elegir logo…"
          iconoVacio={<Building2 size={32} className="gp-text-muted" />}
          helpText="Logo de la empresa (opcional)."
          subirAvatar={async (file) => {
            const path = `empresas/${empresaId}/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
            const { error: upErr } = await supabase.storage.from("adjuntos").upload(path, file);
            if (upErr) return { error: upErr.message };
            const { data: pub } = supabase.storage.from("adjuntos").getPublicUrl(path);
            setV((prev) => ({ ...prev, logoUrl: pub.publicUrl }));
            return { url: pub.publicUrl };
          }}
        />
        {v.logoUrl && (
          <button type="button" onClick={() => setV({ ...v, logoUrl: "" })} className="text-xs gp-text-muted mt-2">Quitar logo</button>
        )}
      </div>
      <Field label="Nombre de la empresa"><input className="gp-input" autoFocus value={v.nombre} onChange={(e) => setV({ ...v, nombre: e.target.value })} /></Field>
      <Field label="Descripción (opcional)"><textarea className="gp-input" rows={2} value={v.descripcion} onChange={(e) => setV({ ...v, descripcion: e.target.value })} /></Field>
      {error && <p className="text-xs gp-text-red mb-2">{error}</p>}
      <button
        className="gp-btn w-full py-2 text-sm mt-2"
        onClick={() => {
          if (!v.nombre.trim()) { setError("El nombre de la empresa es obligatorio."); return; }
          setError("");
          onSave({ ...v, id: empresaId, nombre: v.nombre.trim() });
        }}
      >Guardar</button>
    </div>
  );
}

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
// todavía no tiene tareas, para no dibujar un "0%" que parece atraso cuando en realidad no hay
// nada que medir.
function avanceProyecto(data, proyectoId) {
  const arbol = buildTareaTree((data.pendientes || []).filter((t) => t.proyectoId === proyectoId));
  if (arbol.length === 0) return null;
  return Math.round(arbol.reduce((s, n) => s + calcAvanceTarea(n), 0) / arbol.length);
}

// Imagen del proyecto si subiste una; si no, un ícono derivado de su categoría. Así ningún
// proyecto se queda sin identidad visual, pero el que la merece puede tener la suya.
function IconoProyecto({ p, size = 36 }) {
  if (p.imagenUrl) {
    return (
      <img
        src={p.imagenUrl} alt=""
        className="rounded-xl object-cover shrink-0"
        style={{ width: size, height: size, border: "1px solid var(--border)" }}
      />
    );
  }
  const Icono = ICONO_CATEGORIA_PROYECTO[p.categoria] || FolderKanban;
  const color = COLOR_CATEGORIA_PROYECTO[p.categoria] || "#64748B";
  return (
    <div
      className="rounded-xl flex items-center justify-center shrink-0"
      style={{ width: size, height: size, background: `${color}1F`, color }}
    >
      <Icono size={Math.round(size * 0.5)} />
    </div>
  );
}

function BadgeEstatusProyecto({ estatus }) {
  const color = COLOR_ESTATUS_PROYECTO[estatus] || "#64748B";
  return <span className="gp-badge whitespace-nowrap" style={{ color, background: `${color}22` }}>{etiquetaEstatusProyecto(estatus)}</span>;
}

function BadgeContextoProyecto({ contexto }) {
  if (!contexto) return <span className="gp-text-muted text-xs">—</span>;
  const color = COLOR_CONTEXTO_PROYECTO[contexto] || "#64748B";
  return <span className="gp-badge whitespace-nowrap" style={{ color, background: `${color}22` }}>{contexto}</span>;
}

// Barra compacta de progreso para comparar proyectos de un vistazo (secc. 10: nada de gráficas
// grandes dentro de la lista).
function BarraProgresoProyecto({ pct, ancho = 78 }) {
  if (pct === null || pct === undefined) return <span className="text-xs gp-text-muted">sin tareas</span>;
  const color = pct >= 100 ? "var(--teal)" : pct >= 50 ? "#087CF5" : "var(--gold)";
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 rounded-full" style={{ width: ancho, background: "var(--border)" }}>
        <div className="h-1.5 rounded-full" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="gp-mono text-xs shrink-0" style={{ color }}>{pct}%</span>
    </div>
  );
}

// Responsable del proyecto. null = tú (el dueño de la cuenta): se dibuja con tu propio nombre y
// avatar en vez de un hueco. Reutiliza AvatarContacto para no tener dos formas de pintar una
// persona en la app.
function ResponsableProyecto({ p, data, miNombre, miAvatarUrl, size = 24 }) {
  const c = p.responsableContactoId ? (data.contactos || []).find((x) => x.id === p.responsableContactoId) : null;
  const persona = c || { nombre: miNombre || "Tú", fotoUrl: miAvatarUrl || "" };
  return (
    <div className="flex items-center gap-2 min-w-0">
      <AvatarContacto c={persona} size={size} />
      <span className="text-xs truncate">{primerNombreYApellido(persona.nombre)}</span>
    </div>
  );
}

// "Angel Reyes Blas" -> "Angel Reyes": nombre corto para que la columna Responsable no empuje al
// resto de la tabla (secc. 14).
const primerNombreYApellido = (nombre) => (nombre || "").trim().split(/\s+/).slice(0, 2).join(" ") || "—";

// Cuánto falta para la entrega, dicho en palabras y no en una fecha que haya que restar de
// cabeza (pedido de Angel, 29 sept 2026). Un proyecto ya cerrado no cuenta días: no le falta nada.
// Devuelve null cuando no hay nada que decir, para que quien lo use no dibuje un hueco.
function diasParaEntrega(p) {
  if (!p.fechaFin) return null;
  if (p.estatus === "Finalizado" || p.estatus === "Archivado") return null;
  const d = daysUntil(p.fechaFin);
  if (d < 0) return { dias: d, texto: `Vencido por ${Math.abs(d)} día${Math.abs(d) === 1 ? "" : "s"}`, color: "var(--red)" };
  if (d === 0) return { dias: 0, texto: "Se entrega hoy", color: "var(--gold)" };
  if (d === 1) return { dias: 1, texto: "Falta 1 día", color: "var(--gold)" };
  return { dias: d, texto: `Faltan ${d} días`, color: d <= 7 ? "var(--gold)" : "var(--muted)" };
}

function EtiquetaDiasEntrega({ p, className = "" }) {
  const info = diasParaEntrega(p);
  if (!info) return null;
  return <span className={`text-[11px] whitespace-nowrap ${className}`} style={{ color: info.color }}>{info.texto}</span>;
}

// Rango de fechas del proyecto, en dos renglones como el mockup, más los días que faltan para la
// entrega debajo.
function RangoFechasProyecto({ p }) {
  if (!p.fechaInicio && !p.fechaFin) return <span className="gp-text-muted text-xs">—</span>;
  const vencido = p.fechaFin && p.estatus !== "Finalizado" && p.estatus !== "Archivado" && daysUntil(p.fechaFin) < 0;
  return (
    <div className="gp-mono text-xs leading-snug">
      <div className="gp-text-muted">{fmtFechaCorta(p.fechaInicio) || "—"}</div>
      <div style={{ color: vencido ? "var(--red)" : "var(--muted)" }}>{fmtFechaCorta(p.fechaFin) || "—"}</div>
      <EtiquetaDiasEntrega p={p} className="gp-serif" />
    </div>
  );
}

// Menú "···" de cada proyecto. Igual que en Contactos, el estado de cuál está abierto vive en la
// lista (uno solo para toda la tabla), no uno por fila.
function MenuFilaProyecto({ p, abierto, onToggle, onCerrar, onAbrir, onEditar, onDuplicar, onArchivar, onEliminar }) {
  const archivado = p.estatus === "Archivado";
  return (
    <div className="relative">
      <IconBtn title="Acciones" onClick={onToggle}><MoreHorizontal size={15} /></IconBtn>
      {abierto && (
        <>
          <div className="fixed inset-0 z-10" onClick={onCerrar} />
          <div className="absolute right-0 top-8 z-20 gp-panel py-1 text-sm" style={{ minWidth: 190 }}>
            <button onClick={() => { onCerrar(); onAbrir(p); }} className="w-full text-left px-3 py-2 gp-panel-hi flex items-center gap-2"><Eye size={13} /> Abrir</button>
            <button onClick={() => { onCerrar(); onEditar(p); }} className="w-full text-left px-3 py-2 gp-panel-hi flex items-center gap-2"><Pencil size={13} /> Editar</button>
            <button onClick={() => { onCerrar(); onDuplicar(p); }} className="w-full text-left px-3 py-2 gp-panel-hi flex items-center gap-2"><Copy size={13} /> Duplicar</button>
            <button onClick={() => { onCerrar(); onArchivar(p); }} className="w-full text-left px-3 py-2 gp-panel-hi flex items-center gap-2"><Archive size={13} /> {archivado ? "Desarchivar" : "Archivar"}</button>
            <button onClick={() => { onCerrar(); onEliminar(p.id); }} className="w-full text-left px-3 py-2 gp-panel-hi flex items-center gap-2 gp-text-red"><Trash2 size={13} /> Eliminar</button>
          </div>
        </>
      )}
    </div>
  );
}

/* ---------- Proyectos e ideas (lista) ---------- */
// Rediseño del 24 sept 2026: misma filosofía que Contactos — LISTA LIMPIA → SELECCIONAR → FICHA.
// Se eliminó por completo la expansión en línea (antes cada fila abría finanzas, reparto de
// costos, tabla de tareas, GitHub y bitácora dentro de la propia lista, y la lista dejaba de
// servir como lista). Todo eso vive ahora en la ficha de la derecha o en su módulo fuente.
function Proyectos({
  data, onAdd, onEdit, onRemove, onAddComentario, onRemoveComentario,
  onVerDetalle, onVincularContacto, onDesvincularContacto,
  onAddTarea, onEditTarea, onIrAVista, onVerTareasDeProyecto, onVerContacto,
  onAddFinanzas, onAddPresupuesto, onEditPresupuesto,
  onCrearContacto, onEnviarInvitacion, onAceptarEnNombre,
  sensibleDesbloqueadoHasta, onDesbloquear, miNombre, miAvatarUrl,
  proyectoSel, onSeleccionar, fichaTab, onFichaTab,
  crearAlEntrar, onConsumirCrearAlEntrar,
}) {
  // Ancho de la ficha de la derecha, arrastrable y recordado por pantalla.
  const { contenedorRef, divisor, estiloPanel } = usePanelRedimensionable("proyectos");
  const [modal, setModal] = useState(null);
  const [importarAbierto, setImportarAbierto] = useState(false);
  const [filtroEstatus, setFiltroEstatusState] = useState("Todos");
  const [filtroContexto, setFiltroContextoState] = useState("Todos");
  const [filtroCategoria, setFiltroCategoriaState] = useState("Todas");
  const [orden, setOrden] = useState("default");
  const [ordenDir, setOrdenDir] = useState("asc");
  const [busqueda, setBusquedaState] = useState("");
  const [menuAcciones, setMenuAcciones] = useState(null);
  const [pagina, setPagina] = useState(1);
  // 100 por página (Angel, 2 oct 2026): con el encabezado fijo ya no estorba una lista larga, y
  // paginar de 8 en 8 obligaba a andar brincando páginas para encontrar algo.
  const [porPagina, setPorPagina] = useState(100);
  // Cualquier cambio de filtro o búsqueda regresa a la página 1 — si no, se queda en una página
  // que ya no existe con el nuevo resultado y la lista se ve vacía sin razón aparente.
  const setFiltroEstatus = (t) => { setFiltroEstatusState(t); setPagina(1); };
  const setFiltroContexto = (t) => { setFiltroContextoState(t); setPagina(1); };
  const setFiltroCategoria = (t) => { setFiltroCategoriaState(t); setPagina(1); };
  const setBusqueda = (q) => { setBusquedaState(q); setPagina(1); };
  const toggleOrden = (key) => { if (orden === key) setOrdenDir((d) => (d === "asc" ? "desc" : "asc")); else { setOrden(key); setOrdenDir("asc"); } };

  const empty = {
    nombre: "", descripcion: "", estatus: "Idea", contexto: "Personal", categoria: "Otro",
    responsableContactoId: "", fechaInicio: "", fechaFin: "", etiquetas: [], imagenUrl: "",
    modo: "Finito", monetizacion: "Dinero", prioridad: "Media", fechaRevision: "",
    github: "", githubSubido: false, notas: [],
  };

  // Accesos rápidos del Centro de mando: si se navegó aquí pidiendo crear directo, abre el
  // formulario solo (ver irACrear en AppLoggedIn) y limpia la señal para no reabrirlo después.
  useEffect(() => {
    if (crearAlEntrar) { setModal({ item: { ...empty, ...(crearAlEntrar.preset || {}) } }); onConsumirCrearAlEntrar(); }
  }, [crearAlEntrar]);

  const contactosDe = (proyectoId) => (data.contactoProyectos || [])
    .filter((v) => v.proyectoId === proyectoId)
    .map((v) => ({ vinculoId: v.id, contacto: (data.contactos || []).find((c) => c.id === v.contactoId) }))
    .filter((x) => x.contacto);

  const camposOrden = {
    alfabetico: { get: (p) => p.nombre, tipo: "texto" },
    estatus: { get: (p) => ESTATUS_PROYECTO.indexOf(p.estatus), tipo: "numero" },
    progreso: { get: (p) => avanceProyecto(data, p.id), tipo: "numero" },
    inicio: { get: (p) => p.fechaInicio, tipo: "fecha" },
    fin: { get: (p) => p.fechaFin, tipo: "fecha" },
    // createdAt lo pone el servidor: un proyecto recién creado todavía no lo tiene en memoria. Se
    // trata como "lo más nuevo que hay" para que aparezca hasta arriba al crearlo y no hasta el
    // final, que es donde lo mandaría un valor vacío.
    registro: { get: (p) => p.createdAt || "9999", tipo: "fecha" },
    prioridad: { get: (p) => p.prioridad, tipo: "prioridad" },
  };
  const opcionesOrden = [
    { key: "alfabetico", label: "alfabético" },
    { key: "estatus", label: "estado" },
    { key: "progreso", label: "progreso" },
    { key: "inicio", label: "fecha de inicio" },
    { key: "fin", label: "fecha de fin" },
    { key: "registro", label: "fecha de registro" },
    { key: "prioridad", label: "prioridad" },
  ];

  const FILTROS = ["Todos", ...ESTATUS_PROYECTO];
  // Corregir o quitar una etiqueta la cambia en todos los proyectos que la traen: el catálogo
  // son las etiquetas ya capturadas, no una tabla aparte.
  const catalogoEtiquetasProyectos = usarCatalogoEditable({
    registros: data.proyectos, campo: "etiquetas", esLista: true, onEditar: onEdit, nombreSingular: "la etiqueta",
  });
  const contarFiltro = (t) => (t === "Todos" ? data.proyectos.length : data.proyectos.filter((p) => p.estatus === t).length);
  // Opciones del combo de etapa: id, etiqueta corta, color y cuántos proyectos hay en cada una.
  const opcionesFiltroEstatus = FILTROS.map((t) => ({
    id: t,
    label: t === "Todos" ? "Todas las etapas" : etiquetaEstatusProyecto(t),
    color: t === "Todos" ? "var(--gold)" : COLOR_ESTATUS_PROYECTO[t],
    n: contarFiltro(t),
  }));

  const porEstatus = filtroEstatus === "Todos" ? data.proyectos : data.proyectos.filter((p) => p.estatus === filtroEstatus);
  const porContexto = filtroContexto === "Todos" ? porEstatus : porEstatus.filter((p) => (p.contexto || "") === filtroContexto);
  const porCategoria = filtroCategoria === "Todas" ? porContexto : porContexto.filter((p) => p.categoria === filtroCategoria);
  // Búsqueda por contenido sobre lo que el proyecto realmente tiene: nombre, descripción,
  // categoría, contexto y etiquetas (secc. 8 — nada de criterios inventados).
  const buscados = filtrarPorBusqueda(porCategoria, busqueda, [
    (p) => p.nombre, (p) => p.descripcion, (p) => p.categoria, (p) => p.contexto,
    (p) => (p.etiquetas || []).join(" "),
  ]);
  // Sin criterio elegido, "Orden: más reciente" tiene que ser justo eso: el último proyecto que
  // registraste hasta arriba (ordenarLista respeta el orden de llegada, que es el más viejo
  // primero, así que aquí se invierte a propósito).
  const visibles = orden === "default"
    ? ordenarLista(buscados, "registro", camposOrden, "desc")
    : ordenarLista(buscados, orden, camposOrden, ordenDir);

  const totalPaginas = Math.max(1, Math.ceil(visibles.length / porPagina));
  const paginaActual = Math.min(pagina, totalPaginas);
  const desde = (paginaActual - 1) * porPagina;
  const enPagina = visibles.slice(desde, desde + porPagina);

  const columnasExport = [
    { label: "Nombre", get: (p) => p.nombre },
    { label: "Descripción", get: (p) => p.descripcion || "" },
    { label: "Estado", get: (p) => p.estatus },
    { label: "Contexto", get: (p) => p.contexto || "" },
    { label: "Categoría", get: (p) => p.categoria || "" },
    { label: "Responsable", get: (p) => (p.responsableContactoId ? (data.contactos.find((c) => c.id === p.responsableContactoId)?.nombre || "—") : (miNombre || "Tú")) },
    { label: "Progreso", get: (p) => { const a = avanceProyecto(data, p.id); return a === null ? "" : `${a}%`; } },
    { label: "Inicio", get: (p) => p.fechaInicio || "" },
    { label: "Fin", get: (p) => p.fechaFin || "" },
    { label: "Etiquetas", get: (p) => (p.etiquetas || []).join(", ") },
    { label: "Prioridad", get: (p) => p.prioridad || "" },
  ];

  // Duplicar: copia la definición del proyecto (lo que ES el proyecto), nunca su historia. Las
  // tareas, movimientos, contactos vinculados y comentarios pertenecen al original — copiarlos
  // sería duplicar datos de otros módulos, justo lo que la regla prohíbe.
  const duplicar = (p) => {
    const { id, createdAt, userId, ...definicion } = p;
    onAdd({ ...definicion, nombre: `${p.nombre} (copia)`, estatus: "Idea", notas: [] });
  };
  const archivar = (p) => onEdit(p.id, { estatus: p.estatus === "Archivado" ? "Activo" : "Archivado" });

  const propsMenu = (p) => ({
    p,
    abierto: menuAcciones === p.id,
    onToggle: () => setMenuAcciones(menuAcciones === p.id ? null : p.id),
    onCerrar: () => setMenuAcciones(null),
    onAbrir: (x) => onSeleccionar(x.id),
    onEditar: (x) => setModal({ item: x }),
    onDuplicar: duplicar,
    onArchivar: archivar,
    onEliminar: onRemove,
  });

  const seleccionado = data.proyectos.find((p) => p.id === proyectoSel) || null;
  const limpiarFiltros = () => { setFiltroEstatus("Todos"); setFiltroContexto("Todos"); setFiltroCategoria("Todas"); setBusqueda(""); setOrden("default"); setOrdenDir("asc"); };

  return (
    <div ref={contenedorRef} className="flex flex-col lg:flex-row gap-4 items-start">
      {/* Columna de la lista. En celular se esconde cuando hay una ficha abierta (no caben lado a
          lado); en escritorio se angosta y la ficha se pone a la derecha, igual que Contactos. */}
      <div className={`min-w-0 flex-1 w-full ${seleccionado ? "hidden lg:block" : ""}`}>
        <div className="relative overflow-hidden rounded-2xl mb-4">
          <img src={bannerMontanas} alt="" className="absolute inset-0 w-full h-full object-cover" style={{ objectPosition: "50% 30%" }} />
          <div className="absolute inset-0" style={{ background: "linear-gradient(100deg, rgba(11,35,72,.88) 0%, rgba(11,35,72,.6) 45%, rgba(11,35,72,.12) 80%, rgba(11,35,72,0) 100%)" }} />
          <div className="relative z-10 p-5 md:px-8 md:py-7">
            <h2 className="gp-serif text-white text-2xl md:text-4xl font-extrabold" style={{ textShadow: "0 2px 8px rgba(0,0,0,.45)" }}>Proyectos e ideas</h2>
            <p className="text-white text-xs md:text-sm mt-1 font-medium" style={{ textShadow: "0 1px 5px rgba(0,0,0,.5)" }}>
              De idea a proyecto activo — organiza, da seguimiento y avanza.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 mb-3">
          {/* Antes era una fila de siete chips que en celular ocupaba media pantalla. Ahora es el
              mismo combo con color que ya usa Contactos (pedido de Angel, 29 sept 2026): las
              etapas conservan su color y su conteo, y el orden sigue siendo el del pipeline
              (Idea → Validación → …), no alfabético. */}
          <div className="flex-1 min-w-0">
            <ComboFiltroColor opciones={opcionesFiltroEstatus} valor={filtroEstatus} onCambiar={setFiltroEstatus} />
          </div>
          <div className="flex gap-2 shrink-0">
            <button onClick={() => setImportarAbierto(true)} className="gp-btn-ghost flex items-center justify-center gap-1 px-3 py-1.5 text-sm"><Upload size={14} /> Importar</button>
            <button onClick={() => setModal({ item: empty })} className="gp-btn flex items-center justify-center gap-1 px-3 py-1.5 text-sm"><Plus size={14} /> Nuevo proyecto</button>
          </div>
        </div>

        <BarraListaEstandar
          busqueda={busqueda} onBusqueda={setBusqueda}
          placeholder="Buscar proyectos por nombre, descripción, categoría o etiqueta…"
          extra={
            <>
              <select className="gp-input text-xs py-1.5" style={{ width: "auto" }} value={filtroContexto} onChange={(e) => setFiltroContexto(e.target.value)} aria-label="Filtrar por contexto">
                <option value="Todos">Contexto: Todos</option>
                {CONTEXTOS_PROYECTO.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
              <select className="gp-input text-xs py-1.5" style={{ width: "auto" }} value={filtroCategoria} onChange={(e) => setFiltroCategoria(e.target.value)} aria-label="Filtrar por categoría">
                <option value="Todas">Categoría: Todas</option>
                {CATS.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
              <OrdenSelector opciones={opcionesOrden} value={orden} onChange={(v) => { setOrden(v); setOrdenDir("asc"); }} />
            </>
          }
          onExportExcel={() => exportarFilasExcel(visibles, columnasExport, "proyectos")}
          onExportPDF={() => exportarFilasPDF(visibles, columnasExport, "proyectos", "Proyectos e ideas", `estado: ${filtroEstatus} · contexto: ${filtroContexto} · categoría: ${filtroCategoria}${busqueda ? ` · búsqueda: "${busqueda}"` : ""}`)}
        />

        {/* Escritorio: tabla. Celular: tarjetas — el documento pide explícitamente no comprimir la
            tabla en móvil. */}
        <div className="gp-panel overflow-x-auto hidden md:block">
          <table className="gp-table">
            <thead>
              <tr>
                <Th label="Nombre" sortKey="alfabetico" orden={orden} ordenDir={ordenDir} onToggle={toggleOrden} />
                <Th label="Estado" sortKey="estatus" orden={orden} ordenDir={ordenDir} onToggle={toggleOrden} />
                <th>Contexto</th>
                <th>Categoría</th>
                <th>Responsable</th>
                <Th label="Progreso" sortKey="progreso" orden={orden} ordenDir={ordenDir} onToggle={toggleOrden} />
                <Th label="Inicio / Fin" sortKey="inicio" orden={orden} ordenDir={ordenDir} onToggle={toggleOrden} />
                <th></th>
              </tr>
            </thead>
            <tbody>
              {enPagina.map((p) => {
                const esSel = proyectoSel === p.id;
                return (
                  <tr key={p.id} onClick={() => onSeleccionar(p.id)} style={{ cursor: "pointer", background: esSel ? "var(--panel-hi)" : undefined }}>
                    <td>
                      <div className="flex items-center gap-2.5">
                        <IconoProyecto p={p} size={32} />
                        <div className="min-w-0">
                          <div className="font-medium truncate" style={{ maxWidth: 240 }}>{p.nombre}</div>
                          {p.descripcion && <div className="text-xs gp-text-muted truncate" style={{ maxWidth: 240 }}>{p.descripcion}</div>}
                        </div>
                      </div>
                    </td>
                    <td><BadgeEstatusProyecto estatus={p.estatus} /></td>
                    <td><BadgeContextoProyecto contexto={p.contexto} /></td>
                    <td className="gp-text-muted">{p.categoria || "—"}</td>
                    <td><ResponsableProyecto p={p} data={data} miNombre={miNombre} miAvatarUrl={miAvatarUrl} /></td>
                    <td><BarraProgresoProyecto pct={avanceProyecto(data, p.id)} /></td>
                    <td><RangoFechasProyecto p={p} /></td>
                    <td onClick={(e) => e.stopPropagation()}><MenuFilaProyecto {...propsMenu(p)} /></td>
                  </tr>
                );
              })}
              {enPagina.length === 0 && (
                <tr><td colSpan={8} className="text-center gp-text-muted py-8">
                  {data.proyectos.length === 0 ? "Aún no tienes proyectos o ideas registradas." : "Ningún proyecto coincide con la búsqueda o los filtros."}
                </td></tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="md:hidden flex flex-col gap-2">
          {enPagina.map((p) => (
            <div key={p.id} className="gp-panel p-3" onClick={() => onSeleccionar(p.id)} style={{ cursor: "pointer" }}>
              <div className="flex items-start gap-3">
                <IconoProyecto p={p} size={40} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{p.nombre}</p>
                  {p.descripcion && <p className="text-xs gp-text-muted truncate">{p.descripcion}</p>}
                  <div className="flex items-center gap-1.5 flex-wrap mt-1.5">
                    <BadgeEstatusProyecto estatus={p.estatus} />
                    {p.contexto && <BadgeContextoProyecto contexto={p.contexto} />}
                    {p.categoria && <Badge tone="muted">{p.categoria}</Badge>}
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                  <MenuFilaProyecto {...propsMenu(p)} />
                  <ChevronRight size={16} className="gp-text-muted" />
                </div>
              </div>
              <div className="flex items-center justify-between gap-3 mt-2 pt-2 border-t gp-border">
                <BarraProgresoProyecto pct={avanceProyecto(data, p.id)} ancho={70} />
                <div className="text-right">
                  <span className="gp-mono text-xs gp-text-muted block">
                    {p.fechaInicio || p.fechaFin ? `${fmtFechaCorta(p.fechaInicio) || "—"} — ${fmtFechaCorta(p.fechaFin) || "—"}` : ""}
                  </span>
                  <EtiquetaDiasEntrega p={p} />
                </div>
              </div>
            </div>
          ))}
          {enPagina.length === 0 && (
            <p className="text-sm gp-text-muted text-center py-6">
              {data.proyectos.length === 0 ? "Aún no tienes proyectos o ideas registradas." : "Ningún proyecto coincide con la búsqueda o los filtros."}
            </p>
          )}
        </div>

        {visibles.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3 mt-3 text-xs gp-text-muted">
            <span>Mostrando {desde + 1}–{Math.min(desde + porPagina, visibles.length)} de {visibles.length} proyecto{visibles.length === 1 ? "" : "s"}</span>
            {totalPaginas > 1 && (
              <div className="flex items-center gap-1">
                <button onClick={() => setPagina(Math.max(1, paginaActual - 1))} disabled={paginaActual === 1} className="px-2 py-1 rounded gp-btn-ghost disabled:opacity-40" aria-label="Página anterior"><ChevronLeft size={13} /></button>
                {paginasVisibles(paginaActual, totalPaginas).map((n, i) => (
                  n === "…"
                    ? <span key={`sep-${i}`} className="px-1">…</span>
                    : <button key={n} onClick={() => setPagina(n)} className={`px-2.5 py-1 rounded ${n === paginaActual ? "gp-btn" : "gp-btn-ghost"}`}>{n}</button>
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
        {visibles.length === 0 && data.proyectos.length > 0 && (
          <button onClick={limpiarFiltros} className="text-xs gp-text-gold mt-3">Limpiar filtros</button>
        )}
      </div>

      {/* Ficha del proyecto: panel a la derecha en escritorio (pegado arriba mientras se baja la
          lista) y pantalla completa en celular. */}
      {seleccionado && divisor}
      {seleccionado && (
        <div className="w-full shrink-0 lg:sticky lg:top-4" style={estiloPanel}>
          <FichaProyecto
            p={seleccionado}
            data={data}
            contactosVinculados={contactosDe(seleccionado.id)}
            miNombre={miNombre} miAvatarUrl={miAvatarUrl}
            tab={fichaTab} onTab={onFichaTab}
            onCerrar={() => onSeleccionar(null)}
            onEditar={() => setModal({ item: seleccionado })}
            onEdit={onEdit}
            onEditTarea={onEditTarea}
            onAddComentario={onAddComentario}
            onVincularContacto={onVincularContacto}
            onDesvincularContacto={onDesvincularContacto}
            onVerContacto={onVerContacto}
            onVerDetalle={onVerDetalle}
            onVerTareas={onVerTareasDeProyecto}
            onIrAVista={onIrAVista}
            onNuevaTarea={() => setModal({ tarea: true, proyectoId: seleccionado.id })}
            onAddFinanzas={onAddFinanzas}
            onAddTarea={onAddTarea}
            onGuardarPresupuesto={(actual, monto) => {
              // Un solo tope por proyecto: si ya había uno se edita, si no se crea. El periodo
              // va vacío a propósito — este presupuesto es del proyecto completo, no mensual.
              // OJO: presupuestos tiene CHECK (tipo IN ('categoria','proyecto')) y
              // CHECK (periodo IN ('mensual','anual')), los dos en minúsculas. Mandar "Proyecto"
              // con mayúscula reventaba el insert y solo se veía "No se pudo guardar".
              // El periodo va nulo a propósito: este tope es del proyecto completo, no de un mes.
              if (actual) onEditPresupuesto(actual.id, { monto });
              else onAddPresupuesto({ id: uid(), tipo: "proyecto", proyectoId: seleccionado.id, monto, notas: "" });
            }}
            sensibleDesbloqueadoHasta={sensibleDesbloqueadoHasta}
            onDesbloquear={onDesbloquear}
          />
        </div>
      )}

      {modal?.tarea && (
        <Modal title="Nueva tarea" onClose={() => setModal(null)}>
          <PendienteForm
            item={{ proyectoId: modal.proyectoId, parentId: "", descripcion: "", fechaLimite: todayISO(), fechaRevision: "", prioridad: "Media", estatus: "Pendiente", colaboradorContactoId: null, contactoId: "", precio: "", fechaPagoAprox: "", tiempoEstimado: "", tiempoReal: "", asignadoA: "", avance: "" }}
            proyectos={data.proyectos} contactos={data.contactos} pendientes={data.pendientes} colaboradores={[]}
            proyectoFijoId={modal.proyectoId}
            onCrearContacto={(nombre, tipos) => onCrearContacto(nombre, tipos || ["Colaborador"])}
            onEnviarInvitacion={onEnviarInvitacion}
            onAceptarEnNombre={onAceptarEnNombre}
            onSave={(v, enviarCorreo) => {
              const nuevoId = uid();
              onAddTarea({ ...v, id: nuevoId });
              if (enviarCorreo) onEnviarInvitacion(nuevoId);
              setModal(null);
            }}
          />
        </Modal>
      )}

      {modal && !modal.tarea && (
        <Modal title={modal.item.id ? "Editar proyecto" : "Nuevo proyecto"} onClose={() => setModal(null)}>
          <ProyectoForm
            item={modal.item}
            contactos={data.contactos}
            empresas={data.empresas || []}
            vinculos={(data.contactoProyectos || []).filter((v) => v.proyectoId === modal.item.id)}
            etiquetasExistentes={etiquetasDeProyectos(data.proyectos)}
            catalogoEtiquetas={catalogoEtiquetasProyectos}
            onVincularContacto={onVincularContacto}
            onDesvincularContacto={onDesvincularContacto}
            onSave={(v) => { modal.item.id ? onEdit(modal.item.id, v) : onAdd(v); setModal(null); }}
          />
        </Modal>
      )}

      {importarAbierto && (
        <Modal title="Importar proyectos" onClose={() => setImportarAbierto(false)}>
          <Suspense fallback={<p className="text-sm gp-text-muted">Cargando…</p>}>
            <ImportarExcelModal tipo="proyectos" onImportarFila={(item) => onAdd(item)} onCerrar={() => setImportarAbierto(false)} />
          </Suspense>
        </Modal>
      )}
    </div>
  );
}

/* Piezas de presentación de la ficha del proyecto. Viven FUERA del componente a propósito: si se
   declararan adentro, React las trataría como un tipo de componente nuevo en cada render y
   desmontaría su contenido — un input de adentro perdería el foco en cada tecla. */
function DatoFicha({ label, valor, icono }) {
  return (
    <div className="flex items-start justify-between gap-3 py-1.5">
      <span className="text-xs gp-text-muted shrink-0 flex items-center gap-1.5">{icono} {label}</span>
      <span className="text-xs text-right min-w-0">{valor || <span className="gp-text-muted">—</span>}</span>
    </div>
  );
}
function VacioFicha({ children }) {
  return <p className="text-xs gp-text-muted py-2">{children}</p>;
}
function CandadoFicha({ texto, onDesbloquear }) {
  return (
    <button onClick={onDesbloquear} className="text-left w-full py-2">
      <p className="text-xs gp-text-gold flex items-center gap-1.5"><Lock size={12} /> {texto}</p>
    </button>
  );
}

// Etiquetas del proyecto. Componente aparte para que escribir una etiqueta solo vuelva a dibujar
// esta caja y no la ficha entera (que es lo que hacía perder el foco al teclear).
function EtiquetasProyecto({ p, onEdit }) {
  const [texto, setTexto] = useState("");
  const [agregando, setAgregando] = useState(false);
  const etiquetas = p.etiquetas || [];
  const guardar = () => {
    const t = texto.trim();
    if (t && !etiquetas.some((e) => e.toLowerCase() === t.toLowerCase())) onEdit(p.id, { etiquetas: [...etiquetas, t] });
    setTexto("");
    setAgregando(false);
  };
  return (
    <BloqueFicha
      titulo="Etiquetas" icono={<Tag size={14} className="gp-text-gold" />}
      accion={<button onClick={() => setAgregando(true)} className="text-xs gp-text-gold flex items-center gap-1"><Plus size={12} /> Agregar</button>}
    >
      {etiquetas.length === 0 && !agregando && <VacioFicha>Sin etiquetas. Sirven para agrupar proyectos que no comparten categoría.</VacioFicha>}
      {etiquetas.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {etiquetas.map((e) => (
            <span key={e} className="gp-bloque text-xs pl-2.5 pr-1.5 py-1 rounded-full flex items-center gap-1">
              {e}
              <button onClick={() => onEdit(p.id, { etiquetas: etiquetas.filter((x) => x !== e) })} className="gp-text-muted" title="Quitar etiqueta"><X size={11} /></button>
            </span>
          ))}
        </div>
      )}
      {agregando && (
        <input
          className="gp-input text-xs mt-2" autoFocus placeholder="Escribe la etiqueta y Enter"
          value={texto} onChange={(e) => setTexto(e.target.value)}
          onBlur={guardar}
          onKeyDown={(e) => { if (e.key === "Enter") guardar(); if (e.key === "Escape") { setTexto(""); setAgregando(false); } }}
        />
      )}
    </BloqueFicha>
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

// Alta rápida de un movimiento del proyecto. Sirve para los dos casos: cobrarle al cliente
// (Ingreso) y registrar un gasto —viáticos, traslados, materiales— (Egreso).
function MovimientoProyectoForm({ tipo, proyecto, contactos, categoriasUsadas, estatusInicial, onGuardar, onCancelar }) {
  const esIngreso = tipo === "Ingreso";
  const [concepto, setConcepto] = useState(esIngreso ? `Cobro — ${proyecto.nombre}` : "");
  const [monto, setMonto] = useState("");
  const [moneda, setMoneda] = useState(MONEDA_BASE);
  const [tipoCambio, setTipoCambio] = useState(1);
  const [fecha, setFecha] = useState(todayISO());
  const [fechaVencimiento, setFechaVencimiento] = useState("");
  const [categoria, setCategoria] = useState(esIngreso ? "Proyectos" : "Viáticos");
  const [forma, setForma] = useState("Transferencia");
  // El estatus lo decide el cuadrito desde el que se abrió: tocar "Ya cobrado" tiene que
  // registrar algo ya cobrado. Antes los dos cuadritos abrían el formulario igual, en
  // "Pendiente", y el dinero se iba a "Por cobrar" aunque hubieras entrado por el otro.
  const [estatus, setEstatus] = useState(estatusInicial || (esIngreso ? "Pendiente" : "Cobrado"));
  const [contactoId, setContactoId] = useState(esIngreso ? (proyecto.responsableContactoId || "") : "");
  const [error, setError] = useState("");

  const sugerencias = esIngreso
    ? [...new Set(["Proyectos", ...(categoriasUsadas || [])])]
    : [...new Set([...CATEGORIAS_GASTO_PROYECTO, ...(categoriasUsadas || [])])];

  return (
    <div>
      <p className="text-sm gp-text-muted mb-4">
        {esIngreso
          ? "Lo que vas a cobrar por este proyecto. Déjalo en Pendiente y con fecha de cobro: así cuenta como \u201cpor cobrar\u201d y el motor de recordatorios te avisa cuando se acerque."
          : "Un gasto del proyecto: traslados, viáticos, materiales, lo que sea. Se guarda en Finanzas ligado a este proyecto."}
      </p>
      <Field label="Concepto"><input className="gp-input" autoFocus value={concepto} onChange={(e) => setConcepto(e.target.value)} /></Field>
      <Field label="Fecha"><input type="date" className="gp-input" value={fecha} onChange={(e) => setFecha(e.target.value)} /></Field>
      <CamposMoneda
        monto={monto} moneda={moneda} tipoCambio={tipoCambio} fecha={fecha}
        onCambiar={(parche) => {
          if (parche.monto !== undefined) setMonto(parche.monto);
          if (parche.moneda !== undefined) setMoneda(parche.moneda);
          if (parche.tipoCambio !== undefined) setTipoCambio(parche.tipoCambio);
        }}
      />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="Categoría">
          <input className="gp-input" list="cats-mov-proyecto" value={categoria} onChange={(e) => setCategoria(e.target.value)} />
          <datalist id="cats-mov-proyecto">{sugerencias.map((c) => <option key={c} value={c} />)}</datalist>
        </Field>
        <Field label="Forma de pago">
          <select className="gp-input" value={forma} onChange={(e) => setForma(e.target.value)}>{FORMA_PAGO.map((f) => <option key={f}>{f}</option>)}</select>
        </Field>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="Estatus">
          <select className="gp-input" value={estatus} onChange={(e) => setEstatus(e.target.value)}>
            <option value="Cobrado">{esIngreso ? "Ya cobrado" : "Ya pagado"}</option>
            <option value="Pendiente">{esIngreso ? "Por cobrar" : "Por pagar"}</option>
            <option value="Parcial">Parcial (anticipo)</option>
          </select>
        </Field>
        <Field label={esIngreso ? "Fecha de cobro (opcional)" : "Fecha de pago (opcional)"}>
          <input type="date" className="gp-input" value={fechaVencimiento} onChange={(e) => setFechaVencimiento(e.target.value)} disabled={estatus === "Cobrado"} />
        </Field>
      </div>
      <Field label={esIngreso ? "Cliente (opcional)" : "A quién se le paga (opcional)"}>
        <select className="gp-input" value={contactoId} onChange={(e) => setContactoId(e.target.value)}>
          <option value="">— ninguno —</option>
          {ordenadosPorNombre(contactos).map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
        </select>
      </Field>
      {error && <p className="text-xs gp-text-red mb-2">{error}</p>}
      <div className="flex gap-2 mt-1">
        <button onClick={onCancelar} className="gp-btn-ghost flex-1 py-2 text-sm">Cancelar</button>
        <button
          className="gp-btn flex-1 py-2 text-sm"
          onClick={() => {
            if (!concepto.trim()) { setError("Captura un concepto."); return; }
            if (!(Number(monto) > 0)) { setError("El monto tiene que ser mayor a cero."); return; }
            onGuardar({
              id: uid(), tipo, concepto: concepto.trim(), monto: Number(monto), fecha,
              // El monto base se congela aquí: es el número con el que suma toda la app.
              moneda, tipoCambio: Number(tipoCambio) || 1, montoBase: Number(monto) * (Number(tipoCambio) || 1),
              fechaVencimiento: estatus === "Cobrado" ? "" : fechaVencimiento,
              categoria: categoria.trim() || (esIngreso ? "Proyectos" : "Otro"),
              forma, estatus, proyectoId: proyecto.id, contactoId: contactoId || "",
              pautando: false, esRecurrente: false, frecuencia: "Mensual", fechaFin: "",
            });
          }}
        >Guardar</button>
      </div>
    </div>
  );
}

// Pago al responsable por liderar el proyecto. Primero lo hice como una tarea con precio
// (opción A), y en cuanto se usó quedó claro que estaba mal: una tarea que no es trabajo
// ensucia la lista del proyecto y dos pagos se ven como la misma tarea repetida. Ahora es lo
// que Angel pidió y lo que la app ya hacía para esto — un Egreso de Finanzas con categoría
// "Pago a colaborador", el mismo que usa la pantalla de colaboradores. Así cae solo en los
// pagos del colaborador, en los gastos del proyecto y en el histórico de Finanzas, y pueden
// registrarse varios sin que ninguno estorbe en las tareas.
function PagoResponsableForm({ proyecto, contactos, onGuardar, onCancelar }) {
  const [contactoId, setContactoId] = useState(proyecto.responsableContactoId || "");
  const [monto, setMonto] = useState("");
  const [concepto, setConcepto] = useState(`Liderazgo del proyecto — ${proyecto.nombre}`);
  const [fecha, setFecha] = useState(todayISO());
  const [estatus, setEstatus] = useState("Pendiente");
  const [error, setError] = useState("");
  const [guardando, setGuardando] = useState(false);
  const nombreDe = (id) => (contactos || []).find((c) => c.id === id)?.nombre || "";
  return (
    <div>
      <p className="text-sm gp-text-muted mb-4">
        Un pago por dirigir el proyecto, aparte de las tareas que ejecute. Se registra como un
        egreso de Finanzas en la categoría "Pago a colaborador", igual que cualquier otro pago:
        aparece en los pagos de esa persona y en los gastos del proyecto, no en sus tareas.
      </p>
      <Field label="A quién se le paga">
        <select className="gp-input" value={contactoId} onChange={(e) => setContactoId(e.target.value)}>
          <option value="">— elige a la persona —</option>
          {ordenadosPorNombre(contactos).map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
        </select>
      </Field>
      <Field label="Concepto"><input className="gp-input" value={concepto} onChange={(e) => setConcepto(e.target.value)} /></Field>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="Monto"><MoneyInput value={monto} onChange={setMonto} /></Field>
        <Field label="Fecha"><input type="date" className="gp-input" value={fecha} onChange={(e) => setFecha(e.target.value)} /></Field>
      </div>
      <Field label="Estatus">
        <select className="gp-input" value={estatus} onChange={(e) => setEstatus(e.target.value)}>
          <option value="Pendiente">Por pagar</option>
          <option value="Cobrado">Ya pagado</option>
        </select>
      </Field>
      {error && <p className="text-xs gp-text-red mb-2">{error}</p>}
      <div className="flex gap-2 mt-1">
        <button onClick={onCancelar} className="gp-btn-ghost flex-1 py-2 text-sm">Cancelar</button>
        <button
          className="gp-btn flex-1 py-2 text-sm"
          disabled={guardando}
          style={guardando ? { opacity: 0.6 } : undefined}
          onClick={() => {
            if (!contactoId) { setError("Elige a quién se le paga."); return; }
            if (!(Number(monto) > 0)) { setError("El monto tiene que ser mayor a cero."); return; }
            // Bloquear al primer clic: sin esto, dos toques seguidos creaban dos pagos.
            setGuardando(true);
            onGuardar({
              id: uid(), tipo: "Egreso", categoria: "Pago a colaborador", forma: "Transferencia",
              estatus, esRecurrente: false, fecha, proyectoId: proyecto.id, contactoId,
              concepto: concepto.trim() || `Liderazgo — ${nombreDe(contactoId)}`,
              monto: Number(monto), moneda: MONEDA_BASE, tipoCambio: 1, montoBase: Number(monto),
            });
          }}
        >Registrar pago</button>
      </div>
    </div>
  );
}

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
// `notas`, un arreglo de {id, fecha, texto}), no en una tabla aparte: son de ese proyecto y no
// se consultan desde ningún otro lado.
function NotaRapidaProyecto({ p, onEdit }) {
  const [texto, setTexto] = useState("");
  return (
    <div>
      <textarea className="gp-input text-xs" rows={2} placeholder="Escribe una nota de este proyecto…"
        value={texto} onChange={(e) => setTexto(e.target.value)} />
      <button
        className="gp-btn px-3 py-1.5 text-xs rounded mt-1.5"
        disabled={!texto.trim()}
        style={!texto.trim() ? { opacity: 0.5 } : undefined}
        onClick={() => {
          onEdit(p.id, { notas: [...(p.notas || []), { id: uid(), fecha: todayISO(), texto: texto.trim() }] });
          setTexto("");
        }}
      >Agregar nota</button>
    </div>
  );
}

// Comprobante de un pago: la foto de la transferencia o el depósito. Se guarda con el mismo
// mecanismo de adjuntos que ya usa el resto de la app (un comentario con adjuntos ligado al
// movimiento), así que no hace falta columna nueva ni bucket nuevo.
//
// Dos formas de subirlo, porque en celular la diferencia importa: "Subir" abre la galería y
// "Tomar foto" abre la cámara directo — eso lo hace el atributo capture, que en iPhone y
// Android manda a la cámara trasera sin pasar por el carrete.
function ComprobantePago({ movimiento, data, onAddComentario }) {
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

// Tope de gasto del proyecto. Usa la tabla `presupuestos`, que ya tenía proyecto_id.
function PresupuestoProyectoForm({ proyecto, actual, onGuardar, onCancelar }) {
  const [monto, setMonto] = useState(actual ? String(actual.monto ?? "") : "");
  const [error, setError] = useState("");
  return (
    <div>
      <p className="text-sm gp-text-muted mb-4">
        Cuánto estás dispuesto a gastar en este proyecto. No bloquea nada: sirve para ver en la
        barra cuánto llevas consumido y que no te agarre de sorpresa.
      </p>
      <Field label="Tope de gasto"><MoneyInput value={monto} onChange={setMonto} autoFocus /></Field>
      {error && <p className="text-xs gp-text-red mb-2">{error}</p>}
      <div className="flex gap-2 mt-1">
        <button onClick={onCancelar} className="gp-btn-ghost flex-1 py-2 text-sm">Cancelar</button>
        <button className="gp-btn flex-1 py-2 text-sm" onClick={() => {
          if (!(Number(monto) > 0)) { setError("Captura un monto mayor a cero."); return; }
          onGuardar(Number(monto));
        }}>Guardar</button>
      </div>
    </div>
  );
}

function FichaProyecto({
  p, data, contactosVinculados, miNombre, miAvatarUrl, tab, onTab,
  onCerrar, onEditar, onEdit, onEditTarea, onAddComentario,
  onVincularContacto, onDesvincularContacto, onVerContacto,
  onVerDetalle, onVerTareas, onIrAVista, onNuevaTarea,
  onAddFinanzas, onAddTarea, onGuardarPresupuesto,
  sensibleDesbloqueadoHasta, onDesbloquear,
}) {
  const setTab = onTab;
  // Pestaña Finanzas: qué formulario está abierto y los números del proyecto.
  const [modalFin, setModalFin] = useState(null); // null | ingreso | egreso | responsable | presupuesto
  const fin = finanzasProyecto(data, p.id);
  const reparto = repartoCostosProyecto(data, p.id);
  const categoriasUsadas = [...new Set((data.finanzas || []).map((f) => f.categoria).filter(Boolean))].sort();
  const pagosColaboradores = fin.movs
    .filter((f) => f.categoria === "Pago a colaborador")
    .sort((a, b) => (b.fecha || "").localeCompare(a.fecha || ""));
  const nombreContactoFicha = (id) => (data.contactos || []).find((c) => c.id === id)?.nombre || "";
  const movimientosRecientes = [...fin.movs]
    .sort((a, b) => (b.fecha || "").localeCompare(a.fecha || ""))
    .slice(0, 5);
  const pagosColab = pagosPorColaborador(data, p.id);
  // Los pagos ya registrados de una persona, para colgarles su comprobante.
  const pagosDeColaborador = (contactoId) => fin.movs
    .filter((f) => f.categoria === "Pago a colaborador" && f.contactoId === contactoId)
    .sort((a, b) => (b.fecha || "").localeCompare(a.fecha || ""));
  // Ramas cerradas del árbol de tareas de la pestaña "Tareas" de esta ficha.
  const [colapsadasTareas, setColapsadasTareas] = useState(() => new Set());
  const [confirmacion, setConfirmacion] = useState(null);
  // La ventana de 15 min de los módulos sensibles se vence sola, sin que nada más vuelva a
  // dibujar la pantalla. Este latido hace que el resumen financiero se vuelva a tapar cuando
  // caduca, igual que en el centro de proyecto.
  const [, forceTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => forceTick((t) => t + 1), 15000);
    return () => clearInterval(id);
  }, []);
  const sensibleDesbloqueado = !CANDADO_SENSIBLE_ACTIVO || Date.now() < (sensibleDesbloqueadoHasta || 0);

  const tareas = (data.pendientes || []).filter((t) => t.proyectoId === p.id);
  const tareasAbiertas = tareas.filter((t) => !ESTATUS_TAREA_CERRADOS.includes(t.estatus));
  // El resumen de tareas también respeta la jerarquía padre/hija: una lista plana escondería que
  // media docena de renglones son en realidad subtareas de uno solo.
  const arbolTareas = buildTareaTree(tareas);
  const filasTareas = flattenTareas(arbolTareas, 0, colapsadasTareas);
  const ramasTareas = idsRamasTareas(arbolTareas);
  const toggleRamaFicha = (id) => setColapsadasTareas((prev) => { const st = new Set(prev); st.has(id) ? st.delete(id) : st.add(id); return st; });
  const pedirCompletarTarea = (t) => setConfirmacion(preguntaCompletarTarea({
    tarea: t, data, onEditTarea, onEditProyecto: onEdit, onAviso: (m) => alert(m),
  }));
  // Cambiar el estado del proyecto pasa SIEMPRE por aquí, venga del check o del selector: así
  // completar por cualquiera de los dos caminos registra la fecha, y salir de "Finalizado" la
  // borra (si no, quedaría una fecha de cierre en un proyecto abierto).
  // El estado vive en un borrador y se escribe al dar Guardar. Completar sigue pasando por su
  // confirmación de siempre (fecha, tareas abiertas), así que se delega a cambiarEstatusProyecto.
  const borradorProyecto = useBorrador({ estatus: p.estatus });
  const cambiarEstatusProyecto = (nuevo) => {
    if (nuevo === p.estatus) return;
    if (nuevo === "Finalizado") { setConfirmacion(preguntaCompletarProyecto({ proyecto: p, data, onEditProyecto: onEdit })); return; }
    onEdit(p.id, p.estatus === "Finalizado" ? { estatus: nuevo, completadoEn: null } : { estatus: nuevo });
  };
  const proximas = [...tareasAbiertas]
    .sort((a, b) => (a.fechaLimite || "9999").localeCompare(b.fechaLimite || "9999"))
    .slice(0, 5);
  const avance = avanceProyecto(data, p.id);
  const r = rentabilidadProyecto(data, p.id);
  const archivos = (data.comentarios || [])
    .filter((x) => x.entidadTipo === "proyectos" && x.entidadId === p.id)
    .reduce((n, x) => n + (x.adjuntos || []).length, 0);
  // Actividad = bitácora universal del proyecto (comentarios con texto) + las notas rápidas de
  // avance que ya existían en el campo `notas` del proyecto. Un solo hilo cronológico, no un chat.
  const actividad = [
    ...(data.comentarios || [])
      .filter((x) => x.entidadTipo === "proyectos" && x.entidadId === p.id && (x.texto || "").trim())
      .map((x) => ({ id: x.id, fecha: (x.createdAt || "").slice(0, 10), texto: x.texto })),
    ...(p.notas || []).map((n) => ({ id: n.id, fecha: n.fecha, texto: n.texto })),
  ].sort((a, b) => (b.fecha || "").localeCompare(a.fecha || ""));

  const TABS = [
    { key: "resumen", label: "Resumen" },
    { key: "tareas", label: "Tareas", n: tareas.length },
    { key: "finanzas", label: "Finanzas" },
    { key: "contactos", label: "Contactos", n: contactosVinculados.length },
    { key: "archivos", label: "Archivos", n: archivos },
    { key: "notas", label: "Notas", n: (p.notas || []).length },
  ];

  const responsable = p.responsableContactoId ? (data.contactos || []).find((c) => c.id === p.responsableContactoId) : null;
  const completado = p.estatus === "Finalizado";

  return (
    <div className="gp-panel p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-3 min-w-0">
          <IconoProyecto p={p} size={56} />
          <div className="min-w-0">
            <p className="gp-serif text-lg leading-tight">{p.nombre}</p>
            {p.descripcion && <p className="text-xs gp-text-muted mt-0.5 line-clamp-2">{p.descripcion}</p>}
            <div className="flex items-center gap-1.5 flex-wrap mt-1.5">
              <BadgeEstatusProyecto estatus={p.estatus} />
              {p.contexto && <BadgeContextoProyecto contexto={p.contexto} />}
              {p.categoria && <Badge tone="muted">{p.categoria}</Badge>}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button onClick={onEditar} className="gp-btn-ghost px-2.5 py-1.5 text-xs rounded flex items-center gap-1"><Pencil size={12} /> Editar</button>
          <IconBtn title="Cerrar" onClick={() => { if (confirmarDescartarCambios()) onCerrar(); }}><X size={15} /></IconBtn>
        </div>
      </div>

      {/* Cambiar el estado es la acción más frecuente sobre un proyecto (el pipeline entero vive
          de eso), por eso está aquí arriba y no escondida dentro del formulario. Ya no se guarda
          al soltar el combo: queda en borrador hasta que se da Guardar, y si intentas salir con
          el cambio pendiente la app pregunta antes de perderlo. */}
      <div className="grid grid-cols-2 gap-2 mt-3">
        <select
          className="gp-input text-xs" value={borradorProyecto.borrador.estatus}
          onChange={(e) => borradorProyecto.cambiar({ estatus: e.target.value })}
          aria-label="Cambiar estado del proyecto"
        >
          {ESTATUS_PROYECTO.map((e) => <option key={e} value={e}>{e}</option>)}
        </select>
        <button onClick={() => onVerDetalle(p.id)} className="gp-btn-ghost px-2.5 py-1.5 text-xs rounded flex items-center justify-center gap-1.5">
          <ExternalLink size={12} /> Centro de proyecto
        </button>
      </div>

      <BarraGuardar
        sucio={borradorProyecto.sucio}
        onDescartar={borradorProyecto.descartar}
        onGuardar={() => { cambiarEstatusProyecto(borradorProyecto.borrador.estatus); }}
        etiqueta="Guardar estado"
      />

      {/* Un proyecto se puede dar por terminado aunque le queden tareas abiertas — la confirmación
          avisa cuántas faltan. Y no necesita fecha de fin: los proyectos continuos no la tienen y
          aun así se cierran. Lo que sí queda registrado siempre es CUÁNDO se completó. */}
      <label
        className="flex items-center gap-2 mt-2 px-2.5 py-2 rounded cursor-pointer"
        style={completado ? { background: "var(--hecho-bg)", boxShadow: "inset 4px 0 0 var(--hecho-borde)" } : { background: "var(--panel-2)", boxShadow: "inset 0 0 0 1px var(--border)" }}
      >
        <input
          type="checkbox" checked={completado}
          onChange={(e) => cambiarEstatusProyecto(e.target.checked ? "Finalizado" : "Activo")}
          style={{ width: 16, height: 16, accentColor: "var(--teal)", cursor: "pointer" }}
        />
        <span className="text-xs">
          {completado
            ? <>Proyecto completado{p.completadoEn ? <span className="gp-text-muted"> · {fmtFechaCompletado(p.completadoEn)}</span> : null}</>
            : "Marcar proyecto como completado"}
        </span>
      </label>

      <div className="flex flex-wrap gap-1 mt-4 mb-3">
        {TABS.map((t) => (
          <button
            key={t.key} onClick={() => setTab(t.key)}
            className="text-xs px-2.5 py-1.5 rounded-full whitespace-nowrap shrink-0"
            style={tab === t.key ? { background: "var(--panel-hi)", color: "var(--text)", fontWeight: 600 } : { color: "var(--muted)" }}
          >
            {t.label}{t.n === undefined ? "" : ` ${t.n}`}
          </button>
        ))}
      </div>

      {tab === "resumen" && (
        <>
          <BloqueFicha titulo="Información general" icono={<Info size={14} className="gp-text-gold" />} accion={<button onClick={onEditar} className="text-xs gp-text-gold">Editar</button>}>
            <DatoFicha label="Contexto" icono={<Globe size={12} />} valor={p.contexto ? <BadgeContextoProyecto contexto={p.contexto} /> : null} />
            <DatoFicha label="Categoría" icono={<Tag size={12} />} valor={p.categoria} />
            {p.contexto === "Empresarial" && (
              <DatoFicha
                label="Empresa" icono={<Building2 size={12} />}
                valor={(data.empresas || []).find((e) => e.id === p.empresaId)?.nombre}
              />
            )}
            <DatoFicha label="Estado" icono={<Rocket size={12} />} valor={<BadgeEstatusProyecto estatus={p.estatus} />} />
            <DatoFicha label="Inicio" icono={<CalendarClock size={12} />} valor={fmtFechaCorta(p.fechaInicio)} />
            <DatoFicha
              label="Fin" icono={<CalendarClock size={12} />}
              valor={p.fechaFin
                ? fmtFechaCorta(p.fechaFin)
                : (p.modo === "Continuo" ? <span className="gp-text-muted">Sin fecha (continuo)</span> : null)}
            />
            {completado && (
              <DatoFicha
                label="Completado" icono={<Check size={12} />}
                valor={p.completadoEn
                  ? <span className="gp-text-teal">{fmtFechaCompletado(p.completadoEn)}</span>
                  : <span className="gp-text-muted">sin fecha registrada</span>}
              />
            )}
            <DatoFicha
              label="Responsable" icono={<User size={12} />}
              valor={<span className="inline-flex items-center gap-1.5"><AvatarContacto c={responsable || { nombre: miNombre || "Tú", fotoUrl: miAvatarUrl || "" }} size={20} />{responsable ? responsable.nombre : (miNombre || "Tú")}</span>}
            />
            {p.descripcion && (
              <div className="pt-2 mt-1 border-t gp-border">
                <p className="text-[10px] uppercase tracking-wide gp-text-muted mb-1">Descripción</p>
                <p className="text-xs">{p.descripcion}</p>
              </div>
            )}
          </BloqueFicha>

          <BloqueFicha
            titulo="Progreso del proyecto" icono={<BarChart3 size={14} className="gp-text-gold" />}
            accion={tareas.length > 0 && <button onClick={() => onVerTareas(p.id)} className="text-xs gp-text-gold">Ver todas</button>}
          >
            {avance === null
              ? <VacioFicha>Sin tareas todavía — el progreso se calcula solo cuando el proyecto tiene tareas en el módulo Tareas.</VacioFicha>
              : (
                <>
                  <div className="flex items-center gap-2 mb-3">
                    <div className="h-2 rounded-full flex-1" style={{ background: "var(--border)" }}>
                      <div className="h-2 rounded-full" style={{ width: `${avance}%`, background: avance >= 100 ? "var(--teal)" : avance >= 50 ? "#087CF5" : "var(--gold)" }} />
                    </div>
                    <span className="gp-mono text-sm shrink-0">{avance}%</span>
                  </div>
                  {proximas.length === 0
                    ? <p className="text-xs gp-text-muted">Sin pendientes abiertos — todo lo registrado está cerrado.</p>
                    : (
                      <div className="flex flex-col gap-1.5">
                        <p className="text-[10px] uppercase tracking-wide gp-text-muted">Próximos pendientes</p>
                        {proximas.map((t) => {
                          const vencida = t.fechaLimite && daysUntil(t.fechaLimite) < 0;
                          return (
                            <div key={t.id} className="flex items-center justify-between gap-2">
                              <span className="text-xs truncate">{t.descripcion}</span>
                              <span className="gp-mono text-[10px] shrink-0" style={{ color: vencida ? "var(--red)" : "var(--muted)" }}>{t.fechaLimite || "—"}</span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                </>
              )}
          </BloqueFicha>

          <BloqueFicha
            titulo="Contactos relacionados" icono={<Contact size={14} className="gp-text-gold" />}
            accion={contactosVinculados.length > 0 && <button onClick={() => setTab("contactos")} className="text-xs gp-text-gold">Ver todos ({contactosVinculados.length})</button>}
          >
            {contactosVinculados.length === 0
              ? <VacioFicha>Sin contactos vinculados. Ve a la pestaña Contactos para relacionar personas con este proyecto.</VacioFicha>
              : (
                <div className="flex flex-col gap-2">
                  {contactosVinculados.slice(0, 3).map(({ contacto: c }) => (
                    <button key={c.id} onClick={() => onVerContacto?.(c.id)} className="flex items-center gap-2.5 w-full text-left">
                      <AvatarContacto c={c} size={28} />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium truncate">{c.nombre}</p>
                        <p className="text-[10px] gp-text-muted truncate">{tiposDeContacto(c).join(" · ")}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
          </BloqueFicha>

          <EtiquetasProyecto p={p} onEdit={onEdit} />

          {/* GitHub ya existe como funcionalidad (campos github/githubSubido), así que se muestra
              aquí dentro del detalle y NUNCA en cada fila de la lista (secc. 24). */}
          <BloqueFicha titulo="Repositorio" icono={<Github size={14} className="gp-text-gold" />} accion={<button onClick={onEditar} className="text-xs gp-text-gold">{p.github ? "Cambiar" : "Agregar"}</button>}>
            {p.github
              ? (
                <a href={p.github} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-xs py-1.5 px-2 rounded gp-panel-hi">
                  <Github size={13} className="shrink-0" />
                  <span className="truncate flex-1">{p.github.replace(/^https?:\/\//, "")}</span>
                  <ExternalLink size={12} className="gp-text-muted shrink-0" />
                </a>
              )
              : <VacioFicha>Sin repositorio ligado a este proyecto.</VacioFicha>}
          </BloqueFicha>

          <BloqueFicha titulo="Actividad" icono={<MessageSquare size={14} className="gp-text-gold" />}>
            {actividad.length === 0
              ? <VacioFicha>Sin actividad registrada. Los comentarios y avances que escribas en el centro de proyecto aparecen aquí.</VacioFicha>
              : (
                <div className="flex flex-col gap-2">
                  {actividad.slice(0, 6).map((a) => (
                    <div key={a.id} className="flex gap-2.5">
                      <span className="gp-mono text-[10px] gp-text-muted shrink-0" style={{ width: 62 }}>{fmtFechaCorta(a.fecha) || "—"}</span>
                      <span className="text-xs min-w-0">{a.texto}</span>
                    </div>
                  ))}
                  {actividad.length > 6 && (
                    <button onClick={() => onVerDetalle(p.id)} className="text-xs gp-text-gold text-left">Ver toda la actividad →</button>
                  )}
                </div>
              )}
          </BloqueFicha>
        </>
      )}

      {tab === "tareas" && (
        <BloqueFicha
          titulo="Tareas del proyecto" icono={<ListChecks size={14} className="gp-text-gold" />}
          accion={<button onClick={onNuevaTarea} className="text-xs gp-text-gold flex items-center gap-1"><Plus size={12} /> Agregar tarea</button>}
        >
          <div className="flex items-center justify-between gap-2 mb-2">
            <p className="text-xs gp-text-muted">
              {tareasAbiertas.length} pendiente{tareasAbiertas.length === 1 ? "" : "s"} de {tareas.length} tarea{tareas.length === 1 ? "" : "s"}.
            </p>
            <BotonArbolTareas idsRamas={ramasTareas} colapsadas={colapsadasTareas} onCambiar={setColapsadasTareas} />
          </div>
          {tareas.length === 0
            ? <VacioFicha>Sin tareas todavía. Las tareas viven en el módulo Tareas — aquí solo se resumen las de este proyecto.</VacioFicha>
            : (
              <div className="flex flex-col gap-2">
                {filasTareas.slice(0, 12).map(({ item: t, nivel }) => {
                  const cerrada = ESTATUS_TAREA_CERRADOS.includes(t.estatus);
                  const vencida = !cerrada && t.fechaLimite && daysUntil(t.fechaLimite) < 0;
                  const colapsada = colapsadasTareas.has(t.id);
                  return (
                    <div
                      key={t.id} className="flex items-start justify-between gap-2 rounded-lg"
                      style={cerrada
                        ? { paddingLeft: nivel * 14 + 8, paddingRight: 8, paddingTop: 5, paddingBottom: 5, background: "var(--hecho-bg)", boxShadow: "inset 4px 0 0 var(--hecho-borde)" }
                        : { paddingLeft: nivel * 14 }}
                    >
                      <span className="flex items-start gap-1.5 min-w-0">
                        <CheckTareaHecha tarea={t} size={14} onCompletar={pedirCompletarTarea} onReabrir={(x) => reabrirTarea(x, onEditTarea)} />
                        {nivel > 0 && <span className="gp-text-muted shrink-0 text-xs">└</span>}
                        <ToggleArbolTarea nodo={t} colapsada={colapsada} onToggle={toggleRamaFicha} />
                        <span className={`text-xs min-w-0 ${cerrada ? "gp-texto-hecho" : ""}`} style={cerrada ? { textDecoration: "line-through" } : undefined}>{t.descripcion}</span>
                        <ContadorRamaColapsada nodo={t} colapsada={colapsada} />
                      </span>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {Number(t.precio) > 0 && <span className="gp-mono text-[10px] gp-text-gold">{fmtMoney(t.precio)}</span>}
                        <Badge tone={toneEstatusTarea(t.estatus)}>{t.estatus}</Badge>
                        <span className="gp-mono text-[10px]" style={{ color: vencida ? "var(--red)" : "var(--muted)" }}>{t.fechaLimite || ""}</span>
                      </div>
                    </div>
                  );
                })}
                {filasTareas.length > 12 && <p className="text-[10px] gp-text-muted">y {filasTareas.length - 12} más.</p>}
              </div>
            )}
          <button onClick={() => onVerTareas(p.id)} className="text-xs gp-text-gold mt-3 flex items-center gap-1">Ver todas las tareas <ChevronRight size={12} /></button>
        </BloqueFicha>
      )}

      {tab === "finanzas" && (
        <div>
          <div className="flex items-start justify-between gap-2 mb-3">
            <div className="min-w-0">
              <p className="gp-serif text-base flex items-center gap-1.5"><Wallet size={15} className="gp-text-gold" /> Dinero del proyecto</p>
              <p className="text-[11px] gp-text-muted">Control de ingresos, gastos y pagos del proyecto.</p>
            </div>
            <button onClick={() => setModalFin("elegir")} className="gp-btn px-3 py-1.5 text-xs rounded flex items-center gap-1.5 shrink-0">
              <Plus size={13} /> Agregar movimiento
            </button>
          </div>

          {/* Las dos caras del dinero, cada una con su barra: lo que entra del cliente y lo que
              sale contra el presupuesto. La barra es lo que deja ver de un golpe qué tan avanzado
              va cada lado sin tener que dividir de cabeza. */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3">
            <div className="gp-bloque rounded-xl p-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-xs font-medium">Ingresos del cliente</p>
                  <p className="text-[10px] gp-text-muted">Total del proyecto</p>
                </div>
                <IconBtn title="Registrar un cobro" onClick={() => setModalFin({ tipo: "ingreso", estatus: "Pendiente" })}><Plus size={13} /></IconBtn>
              </div>
              <p className="gp-serif text-xl mt-1.5">{fmtMoney(fin.ingresoTotal)}</p>
              <div className="h-2 rounded-full my-2" style={{ background: "var(--border)" }}>
                <div className="h-2 rounded-full" style={{ width: `${fin.pctCobrado}%`, background: "var(--teal)" }} />
              </div>
              <div className="flex items-start justify-between gap-2 text-[10px]">
                <span className="gp-text-muted">Ya cobrado<br /><span className="gp-mono gp-text-teal text-[11px]">{fmtMoney(fin.cobrado)} ({fin.pctCobrado}%)</span></span>
                <span className="gp-text-muted text-right">Por cobrar<br /><span className="gp-mono text-[11px]">{fmtMoney(fin.porCobrar)} ({fin.pctPorCobrar}%)</span></span>
              </div>
            </div>

            <div className="gp-bloque rounded-xl p-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-xs font-medium">Gastos del proyecto</p>
                  <p className="text-[10px] gp-text-muted">{fin.topeGasto === null ? "Sin presupuesto fijado" : "Presupuesto total"}</p>
                </div>
                <span className="flex items-center shrink-0">
                  <IconBtn title="Registrar un gasto" onClick={() => setModalFin({ tipo: "egreso", estatus: "Cobrado" })}><Plus size={13} /></IconBtn>
                  <IconBtn title={fin.topeGasto === null ? "Poner un tope de gasto" : "Cambiar el tope"} onClick={() => setModalFin("presupuesto")}><Target size={13} /></IconBtn>
                </span>
              </div>
              <p className="gp-serif text-xl mt-1.5">{fin.topeGasto === null ? fmtMoney(fin.gastoReal) : fmtMoney(fin.topeGasto)}</p>
              <div className="h-2 rounded-full my-2" style={{ background: "var(--border)" }}>
                <div className="h-2 rounded-full" style={{
                  width: `${Math.min(100, fin.topeGasto ? Math.round((fin.gastoReal / fin.topeGasto) * 100) : (fin.gastoReal ? 100 : 0))}%`,
                  background: fin.pctPresupuesto > 100 ? "var(--red)" : "var(--red)",
                }} />
              </div>
              <div className="flex items-start justify-between gap-2 text-[10px]">
                <span className="gp-text-muted">Gastado<br /><span className="gp-mono gp-text-red text-[11px]">{fmtMoney(fin.gastoReal)}{fin.pctPresupuesto !== null ? ` (${fin.pctPresupuesto}%)` : ""}</span></span>
                {fin.disponiblePresupuesto !== null && (
                  <span className="gp-text-muted text-right">Disponible<br /><span className="gp-mono text-[11px]">{fmtMoney(fin.disponiblePresupuesto)} ({100 - Math.min(100, fin.pctPresupuesto)}%)</span></span>
                )}
              </div>
            </div>
          </div>

          {/* Resultado: lo que HAY hoy y lo que habrá cuando el cliente termine de pagar. Son dos
              números distintos y mezclarlos es el error clásico — por eso van separados, con la
              suma explícita en medio. */}
          <div className="gp-bloque rounded-xl p-3 mb-3">
            <p className="text-xs font-medium mb-2.5 flex items-center gap-1.5"><BarChart3 size={14} className="gp-text-gold" /> Resultado del proyecto</p>
            <div className="flex flex-col sm:flex-row items-stretch gap-2">
              <div className="flex-1 min-w-0">
                <p className="gp-serif text-xl" style={{ color: fin.disponibleHoy >= 0 ? "var(--teal)" : "var(--red)" }}>{fmtMoney(fin.disponibleHoy)}</p>
                <p className="text-[10px] gp-text-muted mb-1.5">Disponible actualmente</p>
                <div className="flex items-center justify-between text-[11px]"><span className="gp-text-muted">Ingresos cobrados</span><span className="gp-mono gp-text-teal">{fmtMoney(fin.cobrado)}</span></div>
                <div className="flex items-center justify-between text-[11px]"><span className="gp-text-muted">Gastos realizados</span><span className="gp-mono gp-text-red">−{fmtMoney(fin.gastado)}</span></div>
                <div className="flex items-center justify-between text-[11px] pt-1 mt-1 border-t gp-border"><span>= Disponible hoy</span><span className="gp-mono">{fmtMoney(fin.disponibleHoy)}</span></div>
              </div>
              <div className="flex items-center justify-center gp-text-muted px-1"><Plus size={16} /></div>
              <div className="flex-1 min-w-0 text-center rounded-lg p-2" style={{ background: "var(--panel-2)" }}>
                <p className="gp-serif text-lg" style={{ color: "var(--violeta, #8B5CF6)" }}>{fmtMoney(fin.porCobrar)}</p>
                <p className="text-[10px] gp-text-muted">Por cobrar del cliente</p>
                <p className="gp-serif text-xl mt-1.5">{fmtMoney(fin.resultadoProyectado)}</p>
                <p className="text-[10px] gp-text-muted">Resultado proyectado<br />al recibir el pago completo</p>
              </div>
            </div>
          </div>

          {/* Evolución y desglose. Solo se dibujan si hay con qué: una gráfica vacía es ruido. */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-2 mb-3">
            {fin.evolucion.length > 0 && (
              <div className="gp-bloque rounded-xl p-3">
                <p className="text-xs font-medium mb-2">Evolución financiera</p>
                <div style={{ height: 150 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={fin.evolucion} margin={{ top: 4, right: 4, left: -18, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                      <XAxis dataKey="mes" tick={{ fontSize: 9, fill: "var(--muted)" }} tickFormatter={(m) => (m || "").slice(5)} />
                      <YAxis tick={{ fontSize: 9, fill: "var(--muted)" }} tickFormatter={(n) => `${Math.round(n / 1000)}k`} />
                      <Tooltip formatter={(v) => fmtMoney(v)} contentStyle={{ background: "var(--panel)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 11 }} />
                      <Bar dataKey="ingreso" name="Cobrado" fill="#16A36A" radius={[3, 3, 0, 0]} />
                      <Bar dataKey="gasto" name="Gastado" fill="#E5484D" radius={[3, 3, 0, 0]} />
                      <Line type="monotone" dataKey="neto" name="Neto acumulado" stroke="#087CF5" strokeWidth={2} dot={false} connectNulls={false} />
                      {/* Punteada = lo que falta por pasar, colocado en la fecha de cobro o pago
                          que capturaste en cada movimiento pendiente. */}
                      {fin.hayProyeccion && (
                        <Line type="monotone" dataKey="proyeccion" name="Proyección" stroke="#8B5CF6" strokeWidth={2} strokeDasharray="5 4" dot={false} connectNulls />
                      )}
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
                {fin.hayProyeccion && (
                  <p className="text-[9px] gp-text-muted mt-1">
                    La línea punteada es lo que falta por pasar, puesto en la fecha de cobro o de
                    pago que capturaste en cada movimiento pendiente.
                  </p>
                )}
              </div>
            )}

            {fin.desgloseGastos.length > 0 && (
              <div className="gp-bloque rounded-xl p-3">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <p className="text-xs font-medium">Desglose de gastos</p>
                  <button onClick={() => onIrAVista("finanzas")} className="text-[10px] gp-text-gold">Ver detalle</button>
                </div>
                <div className="flex items-center gap-3">
                  <div style={{ width: 96, height: 96 }} className="shrink-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={fin.desgloseGastos} dataKey="monto" nameKey="nombre" innerRadius={28} outerRadius={46} paddingAngle={2}>
                          {fin.desgloseGastos.map((x, i) => <Cell key={x.nombre} fill={COLORES_DESGLOSE[i % COLORES_DESGLOSE.length]} />)}
                        </Pie>
                        <Tooltip formatter={(v) => fmtMoney(v)} contentStyle={{ background: "var(--panel)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 11 }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex-1 min-w-0 flex flex-col gap-1">
                    {fin.desgloseGastos.slice(0, 5).map((x, i) => (
                      <div key={x.nombre} className="flex items-center gap-1.5 text-[11px]">
                        <span className="rounded-full shrink-0" style={{ width: 8, height: 8, background: COLORES_DESGLOSE[i % COLORES_DESGLOSE.length] }} />
                        <span className="truncate flex-1">{x.nombre}</span>
                        <span className="gp-mono shrink-0">{fmtMoney(x.monto)}</span>
                        <span className="gp-text-muted shrink-0" style={{ width: 30, textAlign: "right" }}>{x.pct}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Últimos movimientos y pagos a colaboradores, uno al lado del otro. */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
            <div className="gp-bloque rounded-xl p-3">
              <div className="flex items-center justify-between gap-2 mb-2">
                <p className="text-xs font-medium flex items-center gap-1.5"><ListChecks size={13} className="gp-text-gold" /> Últimos movimientos</p>
                <button onClick={() => onIrAVista("finanzas")} className="text-[10px] gp-text-gold">Ver todos</button>
              </div>
              {movimientosRecientes.length === 0
                ? <p className="text-[11px] gp-text-muted">Todavía no hay movimientos de este proyecto.</p>
                : (
                  <div className="flex flex-col gap-1.5">
                    {movimientosRecientes.map((f) => (
                      <div key={f.id} className="flex items-center justify-between gap-2 text-[11px]">
                        <span className="min-w-0">
                          <span className="block truncate">{f.concepto}</span>
                          <span className="block gp-text-muted">{fmtFechaCorta(f.fecha) || "sin fecha"} · {f.categoria || "sin categoría"}</span>
                        </span>
                        <MontoMovimiento f={f} className="shrink-0" />
                      </div>
                    ))}
                  </div>
                )}
            </div>

            <div className="gp-bloque rounded-xl p-3">
              <div className="flex items-center justify-between gap-2 mb-2">
                <p className="text-xs font-medium flex items-center gap-1.5"><Users size={13} className="gp-text-gold" /> Pagos a colaboradores</p>
                <button onClick={() => setModalFin("responsable")} className="text-[10px] gp-text-gold">Registrar pago</button>
              </div>
              {pagosColab.length === 0
                ? <p className="text-[11px] gp-text-muted">Nadie tiene pagos ni tareas con precio en este proyecto.</p>
                : (
                  <div className="flex flex-col gap-2">
                    {pagosColab.map((x) => (
                      <div key={x.id}>
                        <div className="flex items-center justify-between gap-2 text-[11px]">
                          <span className="truncate flex-1">{x.nombre}</span>
                          <span className="gp-mono gp-text-teal shrink-0">{fmtMoney(x.pagado)}</span>
                          <span className="gp-mono shrink-0" style={{ color: x.porPagar > 0 ? "var(--gold)" : "var(--muted)" }}>{fmtMoney(x.porPagar)}</span>
                          <Badge tone={x.estado === "Pagado" ? "teal" : "gold"}>{x.estado}</Badge>
                        </div>
                        <div className="flex items-center justify-between gap-2 text-[9px] gp-text-muted">
                          <span>pagado · por pagar</span>
                          {x.proximoPago && <span>próximo: {fmtFechaCorta(x.proximoPago)}</span>}
                        </div>
                        {/* El comprobante de cada pago se sube desde aquí: foto de la
                            transferencia o del depósito, con la cámara o desde la galería. */}
                        {(pagosDeColaborador(x.id) || []).map((f) => (
                          <ComprobantePago key={f.id} movimiento={f} data={data} onAddComentario={onAddComentario} />
                        ))}
                      </div>
                    ))}
                  </div>
                )}
            </div>
          </div>

          <div className="flex items-center justify-between gap-2 mt-3">
            <button onClick={() => onIrAVista("finanzas")} className="text-xs gp-text-gold flex items-center gap-1">Ver en Finanzas <ChevronRight size={12} /></button>
            <button
              onClick={() => exportarFilasPDF(
                [...fin.movs].sort((a, b) => (a.fecha || "").localeCompare(b.fecha || "")),
                [
                  { label: "Fecha", get: (f) => f.fecha },
                  { label: "Concepto", get: (f) => f.concepto },
                  { label: "Tipo", get: (f) => f.tipo },
                  { label: "Categoría", get: (f) => f.categoria },
                  { label: "Estatus", get: (f) => f.estatus },
                  { label: "Monto", get: (f) => fmtMoney(montoBaseDe(f)) },
                ],
                `proyecto_${p.nombre}`,
                `Estado financiero — ${p.nombre}`,
                `Total ${fmtMoney(fin.ingresoTotal)} · Cobrado ${fmtMoney(fin.cobrado)} · Gastado ${fmtMoney(fin.gastoReal)} · Disponible hoy ${fmtMoney(fin.disponibleHoy)}`
              )}
              className="text-xs gp-text-muted flex items-center gap-1"
            >
              <Download size={12} /> PDF
            </button>
          </div>

          <p className="text-[10px] gp-text-muted mt-2">
            Todo sale de Finanzas y del precio pactado de las tareas. Lo que capturas aquí se guarda
            allá, ligado a este proyecto: este módulo no almacena ni un importe propio.
          </p>
        </div>
      )}

      {/* Los modales del dinero. Van aquí, hermanos de las pestañas y no dentro de la de
          Finanzas, para que sigan montados aunque se cambie de pestaña con uno abierto. */}
      {modalFin === "elegir" && (
        <Modal title="¿Qué vas a registrar?" onClose={() => setModalFin(null)}>
          <div className="flex flex-col gap-2">
            {[
              { id: { tipo: "ingreso", estatus: "Pendiente" }, icono: <Plus size={15} className="gp-text-teal" />, titulo: "Cobro al cliente", sub: "Lo que te van a pagar por el proyecto, cobrado o por cobrar." },
              { id: { tipo: "egreso", estatus: "Cobrado" }, icono: <Plus size={15} className="gp-text-red" />, titulo: "Gasto del proyecto", sub: "Viáticos, traslados, materiales, software…" },
              { id: "responsable", icono: <Users size={15} className="gp-text-gold" />, titulo: "Pago a un colaborador", sub: "Lo que le entregas a alguien del equipo." },
            ].map((o) => (
              <button key={o.titulo} onClick={() => setModalFin(o.id)}
                className="gp-bloque rounded-lg p-3 text-left flex items-start gap-2.5">
                <span className="mt-0.5 shrink-0">{o.icono}</span>
                <span className="min-w-0">
                  <span className="block text-sm font-medium">{o.titulo}</span>
                  <span className="block text-xs gp-text-muted">{o.sub}</span>
                </span>
              </button>
            ))}
          </div>
        </Modal>
      )}

      {modalFin?.tipo === "ingreso" && (
        <Modal title={modalFin.estatus === "Cobrado" ? "Cobro ya recibido" : "Cobro por recibir"} onClose={() => setModalFin(null)}>
          <MovimientoProyectoForm tipo="Ingreso" proyecto={p} contactos={data.contactos} categoriasUsadas={categoriasUsadas}
            estatusInicial={modalFin.estatus}
            onCancelar={() => setModalFin(null)}
            onGuardar={(mov) => { onAddFinanzas(mov); setModalFin(null); }} />
        </Modal>
      )}
      {modalFin?.tipo === "egreso" && (
        <Modal title="Gasto del proyecto" onClose={() => setModalFin(null)}>
          <MovimientoProyectoForm tipo="Egreso" proyecto={p} contactos={data.contactos} categoriasUsadas={categoriasUsadas}
            estatusInicial={modalFin.estatus}
            onCancelar={() => setModalFin(null)}
            onGuardar={(mov) => { onAddFinanzas(mov); setModalFin(null); }} />
        </Modal>
      )}
      {modalFin === "responsable" && (
        <Modal title="Pago a un colaborador" onClose={() => setModalFin(null)}>
          <PagoResponsableForm proyecto={p} contactos={data.contactos}
            onCancelar={() => setModalFin(null)}
            onGuardar={(mov) => { onAddFinanzas(mov); setModalFin(null); }} />
        </Modal>
      )}
      {modalFin === "presupuesto" && (
        <Modal title="Tope de gasto del proyecto" onClose={() => setModalFin(null)}>
          <PresupuestoProyectoForm proyecto={p} actual={fin.presupuesto}
            onCancelar={() => setModalFin(null)}
            onGuardar={(monto) => { onGuardarPresupuesto(fin.presupuesto, monto); setModalFin(null); }} />
        </Modal>
      )}

      {tab === "notas" && (
        <BloqueFicha titulo="Notas del proyecto" icono={<StickyNote size={14} className="gp-text-gold" />}>
          {/* Las notas ya vivían en el proyecto (campo `notas`) pero solo se veían dentro del
              centro de proyecto, mezcladas con los comentarios. Aquí están en su propia pestaña,
              que es como las pidió el mockup. */}
          <NotaRapidaProyecto p={p} onEdit={onEdit} />
          {(p.notas || []).length === 0
            ? <VacioFicha>Sin notas todavía. Escribe arriba lo que quieras recordar de este proyecto.</VacioFicha>
            : (
              <div className="flex flex-col gap-2 mt-3">
                {[...(p.notas || [])].sort((a, b) => (b.fecha || "").localeCompare(a.fecha || "")).map((n) => (
                  <div key={n.id} className="pb-2 border-b gp-border last:border-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-xs flex-1 min-w-0" style={{ whiteSpace: "pre-line" }}>{n.texto}</p>
                      <IconBtn title="Eliminar" onClick={() => onEdit(p.id, { notas: (p.notas || []).filter((x) => x.id !== n.id) })}><Trash2 size={12} /></IconBtn>
                    </div>
                    <p className="text-[10px] gp-text-muted">{fmtFechaCorta(n.fecha) || ""}</p>
                  </div>
                ))}
              </div>
            )}
        </BloqueFicha>
      )}

      {tab === "contactos" && (
        <BloqueFicha titulo="Contactos relacionados" icono={<Contact size={14} className="gp-text-gold" />}>
          {/* Contacto ↔ Proyecto es muchos-a-muchos (tabla puente contacto_proyectos): el mismo
              contacto puede estar en varios proyectos y el proyecto en varios contactos. Aquí solo
              se crea o se quita el vínculo — la ficha de la persona vive en Contactos. */}
          {contactosVinculados.length === 0
            ? <VacioFicha>Sin contactos vinculados todavía.</VacioFicha>
            : (
              <div className="flex flex-col gap-2 mb-3">
                {contactosVinculados.map(({ contacto: c, vinculoId }) => (
                  <div key={c.id} className="flex items-center gap-2.5">
                    <AvatarContacto c={c} size={30} />
                    <button onClick={() => onVerContacto?.(c.id)} className="min-w-0 flex-1 text-left">
                      <p className="text-xs font-medium truncate">{c.nombre}</p>
                      <p className="text-[10px] gp-text-muted truncate">{tiposDeContacto(c).join(" · ")}{c.empresa ? ` · ${c.empresa}` : ""}</p>
                    </button>
                    <IconBtn title="Quitar del proyecto" onClick={() => onDesvincularContacto(vinculoId)}><X size={13} /></IconBtn>
                  </div>
                ))}
              </div>
            )}
          <p className="text-[10px] uppercase tracking-wide gp-text-muted mb-1.5">Vincular contacto</p>
          <ComboboxMultiBuscar
            seleccionados={[]}
            opciones={(data.contactos || [])
              .filter((c) => !contactosVinculados.some((x) => x.contacto.id === c.id))
              .map((c) => ({ id: c.id, label: c.nombre }))}
            onAgregar={(o) => onVincularContacto(o.id, p.id)}
            onQuitar={() => {}}
            placeholder="Busca a la persona por su nombre…"
          />
        </BloqueFicha>
      )}

      <ConfirmacionModal pregunta={confirmacion} onCerrar={() => setConfirmacion(null)} />

      {tab === "archivos" && (
        <BloqueFicha titulo="Archivos" icono={<FileText size={14} className="gp-text-gold" />}>
          <ArchivosEntidad
            entidadTipo="proyectos" entidadId={p.id} carpeta="proyectos"
            data={data} onAddComentario={onAddComentario}
            vacioTexto="Sin archivos todavía. Sube propuestas, contratos, manuales o lo que necesites tener a la mano de este proyecto."
          />
        </BloqueFicha>
      )}
    </div>
  );
}

// Encabezado de una sección del formulario. Va FUERA del componente: declararlo adentro haría
// que React lo tratara como un tipo nuevo en cada render y desmontara los campos — el input
// perdería el foco a cada tecla.
function SeccionForm({ titulo, children }) {
  return (
    <div className="mb-4">
      <p className="text-[10px] uppercase tracking-wide gp-text-muted mb-2">{titulo}</p>
      {children}
    </div>
  );
}

/* ---------- Formulario de proyecto ---------- */
// Separado por secciones (secc. 27): lo indispensable arriba, fechas y relaciones después, y los
// datos secundarios detrás de "Información adicional" para que dar de alta un proyecto no sea un
// formulario gigantesco.
function ProyectoForm({ item, contactos, empresas = [], vinculos, etiquetasExistentes = [], catalogoEtiquetas, onVincularContacto, onDesvincularContacto, onSave }) {
  // El id se decide desde ahora (no al guardar) para poder vincular contactos antes de que el
  // proyecto exista como fila — mismo truco que ya usa ContactoForm.
  const [proyectoId] = useState(() => item.id || uid());
  const [v, setV] = useState({
    ...item,
    contexto: item.contexto || "Personal",
    categoria: item.categoria || "Otro",
    estatus: item.estatus || "Idea",
    responsableContactoId: item.responsableContactoId || "",
    fechaInicio: item.fechaInicio || "",
    fechaFin: item.fechaFin || "",
    etiquetas: item.etiquetas || [],
    imagenUrl: item.imagenUrl || "",
    empresaId: item.empresaId || "",
  });
  const [error, setError] = useState("");
  const [adicionalAbierto, setAdicionalAbierto] = useState(false);

  // Igual que en ContactoForm: si el proyecto YA existe, vincular/desvincular se guarda al
  // momento (esperar al botón Guardar hacía que se perdieran al cerrar con la X); si es nuevo, se
  // acumulan en memoria y se crean al guardar, porque la llave foránea rechazaría una fila que
  // todavía no existe.
  const esNuevo = !item.id;
  const [contactosSeleccionados, setContactosSeleccionados] = useState(() =>
    (vinculos || []).map((vinc) => ({ id: vinc.contactoId, label: contactos.find((c) => c.id === vinc.contactoId)?.nombre || "—" }))
  );
  const agregarContacto = (o) => {
    setContactosSeleccionados((prev) => (prev.some((c) => c.id === o.id) ? prev : [...prev, o]));
    if (!esNuevo) onVincularContacto?.(o.id, proyectoId);
  };
  const quitarContacto = (contactoId) => {
    setContactosSeleccionados((prev) => prev.filter((c) => c.id !== contactoId));
    if (!esNuevo) {
      const vinculo = (vinculos || []).find((vv) => vv.contactoId === contactoId);
      if (vinculo) onDesvincularContacto?.(vinculo.id);
    }
  };


  const guardar = () => {
    if (!v.nombre?.toString().trim()) { setError("El nombre del proyecto es obligatorio."); return; }
    if (v.fechaInicio && v.fechaFin && v.fechaFin < v.fechaInicio) { setError("La fecha de fin no puede ser anterior a la de inicio."); return; }
    setError("");
    onSave({ ...v, id: proyectoId, nombre: v.nombre.trim() });
    if (esNuevo) {
      for (const c of contactosSeleccionados) onVincularContacto?.(c.id, proyectoId);
    }
  };

  return (
    <div>
      <div className="flex flex-col items-center mb-3">
        <AvatarForm
          avatarUrl={v.imagenUrl}
          forma="cuadro"
          textoBoton="Elegir imagen…"
          iconoVacio={<FolderKanban size={32} className="gp-text-muted" />}
          helpText="Imagen del proyecto (opcional). Si no subes una, se dibuja un ícono según su categoría."
          subirAvatar={async (file) => {
            const path = `proyectos/${proyectoId}/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
            const { error: upErr } = await supabase.storage.from("adjuntos").upload(path, file);
            if (upErr) return { error: upErr.message };
            const { data: pub } = supabase.storage.from("adjuntos").getPublicUrl(path);
            setV((prev) => ({ ...prev, imagenUrl: pub.publicUrl }));
            return { url: pub.publicUrl };
          }}
        />
        {v.imagenUrl && (
          <button type="button" onClick={() => setV({ ...v, imagenUrl: "" })} className="text-xs gp-text-muted mt-2">
            Quitar imagen
          </button>
        )}
      </div>
      <SeccionForm titulo="Información básica">
        <Field label="Nombre"><input className="gp-input" autoFocus value={v.nombre || ""} onChange={(e) => setV({ ...v, nombre: e.target.value })} /></Field>
        <Field label="Descripción"><textarea className="gp-input" rows={2} placeholder="En una línea: de qué se trata." value={v.descripcion || ""} onChange={(e) => setV({ ...v, descripcion: e.target.value })} /></Field>
        {/* Un proyecto tiene UN estado, así que va en combo y no en una fila de siete pastillas
            que parecían de selección múltiple (Angel, 1 oct 2026). Es el mismo combo con color
            del filtro de la lista, sin el conteo: aquí no hay nada que contar. El orden sigue
            siendo el del pipeline (Idea → Validación → …), no alfabético. */}
        <Field label="Estado">
          <ComboFiltroColor
            opciones={ESTATUS_PROYECTO.map((e) => ({ id: e, label: etiquetaEstatusProyecto(e), color: COLOR_ESTATUS_PROYECTO[e] }))}
            valor={v.estatus}
            onCambiar={(e) => setV({ ...v, estatus: e })}
          />
        </Field>
        <Field label="Contexto">
          <div className="flex flex-wrap gap-1.5">
            {CONTEXTOS_PROYECTO.map((c) => {
              const color = COLOR_CONTEXTO_PROYECTO[c];
              return (
                <button
                  key={c} type="button" onClick={() => setV({ ...v, contexto: c, empresaId: c === "Empresarial" ? v.empresaId : "" })}
                  className="text-xs px-2.5 py-1 rounded-full border"
                  style={v.contexto === c
                    ? { background: color, color: "#0B2341", borderColor: color, fontWeight: 600 }
                    : { borderColor: "var(--border)", color: "var(--muted)" }}
                >
                  {c}
                </button>
              );
            })}
          </div>
        </Field>
        {/* La empresa solo aplica al contexto Empresarial: un proyecto personal no es de nadie
            más que tuyo, y dejar el campo visible invitaría a llenarlo sin sentido. */}
        {v.contexto === "Empresarial" && (
          <Field label={empresas.length ? "Empresa" : "Empresa"}>
            {empresas.length === 0
              ? <p className="text-xs gp-text-muted">Todavía no registras empresas. Créalas en "Mis empresas" y podrás ligar este proyecto a una.</p>
              : (
                <select className="gp-input" value={v.empresaId || ""} onChange={(e) => setV({ ...v, empresaId: e.target.value })}>
                  <option value="">— sin asignar —</option>
                  {[...empresas].sort((a, b) => (a.nombre || "").localeCompare(b.nombre || "", "es")).map((emp) => <option key={emp.id} value={emp.id}>{emp.nombre}</option>)}
                </select>
              )}
          </Field>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Categoría">
            <select className="gp-input" value={v.categoria} onChange={(e) => setV({ ...v, categoria: e.target.value })}>{CATS.map((c) => <option key={c}>{c}</option>)}</select>
          </Field>
          <Field label="Responsable">
            {/* El responsable es un Contacto real: no se escribe un nombre suelto, se apunta a la
                ficha que ya existe en Contactos. */}
            <select className="gp-input" value={v.responsableContactoId || ""} onChange={(e) => setV({ ...v, responsableContactoId: e.target.value })}>
              <option value="">Tú</option>
              {ordenadosPorNombre(contactos).map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
            </select>
          </Field>
        </div>
      </SeccionForm>

      <SeccionForm titulo="Fechas">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Las tres fechas del proyecto, con el nombre con el que Angel las usa (29 sept 2026).
              Son las columnas que ya existían: fecha_inicio, fecha_revision y fecha_fin — no se
              crean campos nuevos, solo se nombran bien y la de revisión se deja de esconder. */}
          <Field label="Fecha de arranque"><input type="date" className="gp-input" value={v.fechaInicio || ""} onChange={(e) => setV({ ...v, fechaInicio: e.target.value })} /></Field>
          <Field label="Fecha de revisión"><input type="date" className="gp-input" value={v.fechaRevision || ""} onChange={(e) => setV({ ...v, fechaRevision: e.target.value })} /></Field>
          <Field label="Fecha de entrega"><input type="date" className="gp-input" value={v.fechaFin || ""} onChange={(e) => setV({ ...v, fechaFin: e.target.value })} /></Field>
        </div>
      </SeccionForm>

      <SeccionForm titulo="Relaciones">
        <Field label="Contactos relacionados (puede ser varios)">
          <ComboboxMultiBuscar
            seleccionados={contactosSeleccionados}
            opciones={contactos.map((c) => ({ id: c.id, label: c.nombre }))}
            onAgregar={agregarContacto}
            onQuitar={quitarContacto}
            placeholder="Busca a la persona por su nombre…"
          />
        </Field>
      </SeccionForm>

      <button
        type="button" onClick={() => setAdicionalAbierto((x) => !x)}
        className="text-xs gp-text-gold flex items-center gap-1 mb-3"
      >
        {adicionalAbierto ? <ChevronDown size={12} /> : <ChevronRight size={12} />} Información adicional (opcional)
      </button>

      {adicionalAbierto && (
        <SeccionForm titulo="Opcional">
          {/* Mismo combobox que las etiquetas de contactos y los tags de citas: sugiere las ya
              usadas, deja crear una nueva y permite corregirla o quitarla de todos los proyectos.
              Antes era un input suelto que solo respondía a Enter y no sugería nada. */}
          <Field label="Etiquetas">
            <ComboboxMultiBuscar
              seleccionados={(v.etiquetas || []).map((e) => ({ id: e, label: e }))}
              opciones={(etiquetasExistentes || []).map((e) => ({ id: e, label: e }))}
              onAgregar={(o) => setV({ ...v, etiquetas: [...(v.etiquetas || []), o.id] })}
              onQuitar={(id) => setV({ ...v, etiquetas: (v.etiquetas || []).filter((x) => x !== id) })}
              onCrear={(texto) => setV({ ...v, etiquetas: [...(v.etiquetas || []), texto] })}
              onRenombrarOpcion={catalogoEtiquetas?.renombrar}
              onEliminarOpcion={catalogoEtiquetas?.eliminar}
              placeholder="Escribe una etiqueta…"
              crearLabel={(t) => `Crear etiqueta "${t}"`}
            />
          </Field>
          <Field label="Repositorio (opcional)">
            <input className="gp-input" placeholder="https://github.com/…" value={v.github || ""} onChange={(e) => setV({ ...v, github: e.target.value })} />
          </Field>
          <label className="flex items-center gap-2 text-xs gp-text-muted mb-3">
            <input type="checkbox" checked={!!v.githubSubido} onChange={(e) => setV({ ...v, githubSubido: e.target.checked })} />
            Ya está subido a GitHub
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Prioridad">
              <select className="gp-input" value={v.prioridad || "Media"} onChange={(e) => setV({ ...v, prioridad: e.target.value })}>{PRIORIDADES.map((c) => <option key={c}>{c}</option>)}</select>
            </Field>
            <Field label="Fecha de revisión">
              <input type="date" className="gp-input" value={v.fechaRevision || ""} onChange={(e) => setV({ ...v, fechaRevision: e.target.value })} />
            </Field>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Modo">
              <select className="gp-input" value={v.modo || "Finito"} onChange={(e) => setV({ ...v, modo: e.target.value })}>{MODO_PROYECTO.map((c) => <option key={c}>{c}</option>)}</select>
            </Field>
            <Field label="Cómo genera valor">
              <select className="gp-input" value={v.monetizacion || "Dinero"} onChange={(e) => setV({ ...v, monetizacion: e.target.value })}>{MONETIZACION.map((c) => <option key={c}>{c}</option>)}</select>
            </Field>
          </div>
          <p className="text-xs gp-text-muted -mt-2 mb-1">
            {v.modo === "Continuo" ? "Continuo: genera flujo de forma constante (ej. renta, agencia de servicios)." : "Finito: tiene un punto claro de terminado (ej. lanzar un sitio, un show específico)."}
          </p>
        </SeccionForm>
      )}

      {error && <p className="text-xs gp-text-red mb-2">{error}</p>}
      <button className="gp-btn w-full py-2 text-sm mt-2" onClick={guardar}>Guardar</button>
    </div>
  );
}

/* ---------- Detalle de proyecto (Fase: navegación con breadcrumb) ---------- */
// Pantalla completa de un solo proyecto: todos sus pendientes con subtareas anidadas,
// porcentaje de avance (manual en tareas finales, calculado en tareas con hijos), y comentarios.
function ProyectoDetalle({ data, proyectoId, onVolver, onAddTarea, onEditTarea, onEditProyecto, onRemoveTarea, onAddComentario, onRemoveComentario, onAddMeta, onEditMeta, onRemoveMeta, onIrAVista, sensibleDesbloqueadoHasta, onDesbloquear, onCrearContacto, onEnviarInvitacion, onAceptarEnNombre }) {
  const proyecto = data.proyectos.find((p) => p.id === proyectoId);
  const [modal, setModal] = useState(null);
  const [modalMeta, setModalMeta] = useState(null);
  const [comentariosDe, setComentariosDe] = useState(null);
  // Ramas del árbol de tareas que están cerradas (ids de las tareas padre). Vacío = todo abierto.
  const [colapsadas, setColapsadas] = useState(() => new Set());
  const [confirmacion, setConfirmacion] = useState(null);
  // Etapa 7 (Centro de Proyecto, secc. 24.1): vista integral con pestañas — no crea tablas nuevas,
  // solo consulta y filtra las entidades reales por proyectoId y permite navegar al módulo fuente.
  const [tab, setTab] = useState("resumen");

  // Mismo enmascarado que Centro de Mando y Notificaciones (secc. 23.8): Finanzas y Legal/
  // Documentos son módulos sensibles — verlos resumidos aquí sin candado sería el mismo hueco que
  // ya se corrigió ahí. Se protege mientras la ventana de 15 min no esté vigente.
  const [, forceTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => forceTick((t) => t + 1), 15000);
    return () => clearInterval(id);
  }, []);
  const sensibleDesbloqueado = !CANDADO_SENSIBLE_ACTIVO || Date.now() < (sensibleDesbloqueadoHasta || 0);

  if (!proyecto) {
    return (
      <div>
        <button onClick={onVolver} className="text-xs gp-text-muted flex items-center gap-1 mb-4"><ChevronRight size={12} style={{ transform: "rotate(180deg)" }} /> Proyectos e ideas</button>
        <p className="text-sm gp-text-muted">Este proyecto ya no existe o no tienes acceso a él.</p>
      </div>
    );
  }

  const empty = { proyectoId, parentId: "", descripcion: "", fechaLimite: todayISO(), fechaRevision: "", prioridad: "Media", estatus: "Pendiente", colaboradorContactoId: null, contactoId: "", precio: "", fechaPagoAprox: "", tiempoEstimado: "", tiempoReal: "", asignadoA: "", avance: "" };
  const tareasProyecto = data.pendientes.filter((t) => t.proyectoId === proyectoId);
  const arbol = buildTareaTree(tareasProyecto);
  const filas = flattenTareas(arbol, 0, colapsadas);
  const idsRamas = idsRamasTareas(arbol);
  const toggleRama = (id) => setColapsadas((prev) => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });
  const avanceGeneral = arbol.length ? Math.round(arbol.reduce((s, n) => s + calcAvanceTarea(n), 0) / arbol.length) : 0;
  const r = rentabilidadProyecto(data, proyectoId);
  const metasProyecto = (data.metas || []).filter((m) => m.proyectoId === proyectoId);
  const nComentarios = (id) => (data.comentarios || []).filter((c) => c.entidadTipo === "pendientes" && c.entidadId === id).length;
  const nombreResp = (id) => data.contactos.find((c) => c.id === id)?.nombre || "Tú";
  const nombreCliente = (id) => data.contactos.find((c) => c.id === id)?.nombre || "—";
  const paraEditar = (t) => { const { hijos, ...limpio } = t; return limpio; };
  const pedirCompletarTarea = (t) => setConfirmacion(preguntaCompletarTarea({
    tarea: t, data, onEditTarea, onEditProyecto, onAviso: (m) => alert(m),
  }));
  // Elegir "Completada" en el selector pasa por la misma regla que el check: confirma y registra
  // la fecha. Salir de "Completada" la borra, junto con el avance de 100 que se había fijado.
  const cambiarEstatusTarea = (t, nuevo) => {
    if (nuevo === t.estatus) return;
    if (nuevo === "Completada") { pedirCompletarTarea(t); return; }
    onEditTarea(t.id, t.estatus === "Completada" ? { estatus: nuevo, completadaEn: null, avance: null } : { estatus: nuevo });
  };
  const confirmarBorrado = (item) => {
    const hijosIds = descendientesDe(item.id, data.pendientes);
    if (hijosIds.length > 0) {
      onRemoveTarea(item.id, hijosIds, `Esta tarea tiene ${hijosIds.length} subtarea${hijosIds.length > 1 ? "s" : ""} debajo. Si la eliminas, también se eliminan todas sus subtareas.`);
    } else {
      onRemoveTarea(item.id);
    }
  };

  // Datos de los demás módulos relacionados a este proyecto — solo se consultan y filtran, nada
  // se duplica; "Ver en <módulo>" navega a la fuente real (secc. 24.1: "permitir navegación al
  // registro fuente").
  const finanzasProyecto = (data.finanzas || []).filter((f) => f.proyectoId === proyectoId).sort((a, b) => (b.fecha || "").localeCompare(a.fecha || ""));
  const facturasProyecto = (data.facturas || []).filter((f) => f.proyectoId === proyectoId);
  const campanasProyecto = (data.campanas || []).filter((c) => c.proyectoId === proyectoId);
  const redesProyecto = (data.redesMetricas || []).filter((r2) => r2.proyectoId === proyectoId);
  const documentosProyecto = (data.documentos || []).filter((d) => d.proyectoId === proyectoId);
  // Contacto–Proyecto es muchos-a-muchos desde la tabla puente contacto_proyectos (antes era un
  // campo proyectoId directo en el contacto, ya no existe esa columna).
  const contactosProyecto = (data.contactoProyectos || [])
    .filter((v) => v.proyectoId === proyectoId)
    .map((v) => data.contactos.find((c) => c.id === v.contactoId))
    .filter(Boolean);

  const TABS = [
    { key: "resumen", label: "Resumen" },
    { key: "finanzas", label: `Finanzas${finanzasProyecto.length + facturasProyecto.length ? ` (${finanzasProyecto.length + facturasProyecto.length})` : ""}` },
    { key: "marketing", label: `Marketing${campanasProyecto.length ? ` (${campanasProyecto.length})` : ""}` },
    { key: "legal", label: `Documentos${documentosProyecto.length ? ` (${documentosProyecto.length})` : ""}` },
    { key: "contactos", label: `Contactos${contactosProyecto.length ? ` (${contactosProyecto.length})` : ""}` },
  ];

  return (
    <div>
      {/* breadcrumb: para siempre saber en dónde estás navegando dentro de la app */}
      <div className="flex items-center gap-1.5 text-xs gp-text-muted mb-3">
        <button onClick={onVolver} className="hover:underline">Proyectos e ideas</button>
        <ChevronRight size={12} />
        <span className="gp-text-teal">{proyecto.nombre}</span>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between mb-1">
        <div>
          <h2 className="gp-serif text-2xl">{proyecto.nombre}</h2>
          <div className="flex items-center gap-2 flex-wrap mt-1">
            <Badge tone="muted">{proyecto.categoria}</Badge>
            <Badge tone={proyecto.modo === "Continuo" ? "teal" : "muted"}>{proyecto.modo || "Finito"}</Badge>
            {proyecto.prioridad && <Badge tone={proyecto.prioridad === "Alta" ? "red" : proyecto.prioridad === "Media" ? "gold" : "muted"}>{proyecto.prioridad}</Badge>}
            {/* Lo primero que quieres saber al abrir un proyecto: cuánto falta para entregarlo. */}
            <EtiquetaDiasEntrega p={proyecto} />
          </div>
        </div>
        <button onClick={() => setModal({ item: empty })} className="gp-btn flex items-center justify-center gap-1 px-3 py-1.5 text-sm w-full sm:w-auto"><Plus size={14} /> Nueva tarea</button>
      </div>
      {proyecto.descripcion && <p className="text-sm gp-text-muted mb-4">{proyecto.descripcion}</p>}

      {/* Pestañas del Centro de Proyecto */}
      <div className="flex gap-1 mb-4 flex-wrap">
        {TABS.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)} className="px-3 py-1.5 text-xs rounded-full border"
            style={{ background: tab === t.key ? "var(--gold)" : "transparent", color: tab === t.key ? "#0B2341" : "inherit", borderColor: tab === t.key ? "var(--gold)" : "var(--border)" }}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === "resumen" && (
        <>
          <div className="gp-panel-hi p-3 mb-4 grid grid-cols-2 sm:grid-cols-6 gap-2 text-xs">
            <div><p className="gp-text-muted">Avance general</p><p className="gp-mono gp-text-gold">{avanceGeneral}%</p></div>
            {sensibleDesbloqueado ? (
              <>
                <div><p className="gp-text-muted">Ingresos</p><p className="gp-mono gp-text-teal">{fmtMoney(r.ingresos)}</p></div>
                <div><p className="gp-text-muted">Egresos</p><p className="gp-mono gp-text-red">{fmtMoney(r.egresos)}</p></div>
                <div><p className="gp-text-muted">Neto</p><p className={`gp-mono ${r.neto >= 0 ? "gp-text-teal" : "gp-text-red"}`}>{fmtMoney(r.neto)}</p></div>
                <div><p className="gp-text-muted">Pagado a colaboradores</p><p className="gp-mono gp-text-gold">{fmtMoney(r.pagosColab)}</p></div>
                <div><p className="gp-text-muted">Costo estimado total</p><p className="gp-mono">{fmtMoney(r.costoEstimadoTotal)}</p></div>
              </>
            ) : (
              <button onClick={onDesbloquear} className="col-span-2 sm:col-span-5 text-left">
                <p className="text-xs gp-text-gold">🔒 Verifica tu contraseña para ver los números de este proyecto</p>
              </button>
            )}
          </div>

          {sensibleDesbloqueado && (() => {
            const reparto = repartoCostosProyecto(data, proyectoId);
            if (reparto.length === 0) return null;
            return (
              <div className="mb-4">
                <p className="text-sm font-medium mb-2">Reparto de costos por participante</p>
                <div className="gp-panel overflow-x-auto">
                  <table className="gp-table">
                    <thead><tr><th>Participante</th><th>Tareas con precio</th><th>Ya generado</th><th>Por hacer</th><th>Total pactado</th></tr></thead>
                    <tbody>
                      {reparto.map((g) => (
                        <tr key={g.key}>
                          <td>{g.esYo ? "Tú" : g.nombre}</td>
                          <td className="gp-mono">{g.tareas}</td>
                          <td className="gp-mono gp-text-teal">{fmtMoney(g.generado)}</td>
                          <td className="gp-mono gp-text-gold">{fmtMoney(g.pendiente)}</td>
                          <td className="gp-mono">{fmtMoney(g.total)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="text-xs gp-text-muted mt-1">Es un estimado según el precio pactado en cada tarea (columna "Precio" del pendiente). Lo tuyo ("Tú") es ingreso potencial y no se suma solo a Ingresos y egresos; para eso registra el movimiento ahí cuando lo cobres.</p>
              </div>
            );
          })()}

          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium">Metas — qué define el éxito de este proyecto</p>
              <button onClick={() => setModalMeta({ item: { proyectoId, descripcion: "", fechaObjetivo: todayISO(), fechaRevision: "", prioridad: "Media", estatus: "No iniciada" } })} className="gp-btn-ghost px-2.5 py-1 text-xs flex items-center gap-1"><Plus size={12} /> Nueva meta</button>
            </div>
            {metasProyecto.length === 0 ? (
              <p className="text-xs gp-text-muted">Sin metas todavía — agrega una para darle rumbo a este proyecto.</p>
            ) : (
              <div className="space-y-1.5">
                {metasProyecto.map((m) => {
                  const cumplida = m.estatus === "Cumplida";
                  return (
                    <div key={m.id} className="gp-panel p-2.5 flex items-center gap-2" style={cumplida ? { background: "var(--teal-tint)", color: "var(--teal-text)" } : undefined}>
                      <input
                        type="checkbox"
                        checked={cumplida}
                        title="Marcar como cumplida"
                        onChange={(e) => onEditMeta(m.id, { estatus: e.target.checked ? "Cumplida" : "En progreso" })}
                        style={{ width: 15, height: 15, accentColor: "var(--gold)", cursor: "pointer" }}
                      />
                      <span className="text-sm flex-1">{m.descripcion}</span>
                      <Badge tone={m.prioridad === "Alta" ? "red" : m.prioridad === "Media" ? "gold" : "muted"}>{m.prioridad || "Media"}</Badge>
                      {m.fechaObjetivo && <span className="text-xs gp-mono gp-text-muted">{m.fechaObjetivo}</span>}
                      <IconBtn title="Editar" onClick={() => setModalMeta({ item: m })}><Pencil size={12} /></IconBtn>
                      <IconBtn title="Eliminar" onClick={() => onRemoveMeta(m.id)}><Trash2 size={12} /></IconBtn>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {modalMeta && (
            <Modal title={modalMeta.item.id ? "Editar meta" : "Nueva meta"} onClose={() => setModalMeta(null)}>
              <MetaForm item={modalMeta.item} proyectos={data.proyectos} onSave={(v) => { modalMeta.item.id ? onEditMeta(modalMeta.item.id, v) : onAddMeta(v); setModalMeta(null); }} />
            </Modal>
          )}

          <div className="flex items-center justify-between gap-2 mb-2">
            <p className="text-sm font-medium">Tareas y subtareas · {tareasProyecto.length}</p>
            <BotonArbolTareas idsRamas={idsRamas} colapsadas={colapsadas} onCambiar={setColapsadas} />
          </div>

          <div className="gp-panel overflow-x-auto">
            <table className="gp-table">
              <thead><tr><th style={{ width: 30 }}></th><th>Pendiente</th><th>Cliente</th><th>Responsable</th><th>Fecha</th><th>Prioridad</th><th>Avance</th><th>Precio</th><th></th></tr></thead>
              <tbody>
                {filas.map(({ item: p, nivel }) => {
                  const vencido = p.estatus !== "Completada" && p.fechaLimite && daysUntil(p.fechaLimite) < 0;
                  const nc = nComentarios(p.id);
                  const tieneHijos = p.hijos && p.hijos.length > 0;
                  const colapsada = colapsadas.has(p.id);
                  const hecha = p.estatus === "Completada";
                  const avance = Math.round(calcAvanceTarea(p));
                  return (
                    <tr key={p.id} className={hecha ? "gp-fila-hecha" : undefined}>
                      <td><CheckTareaHecha tarea={p} onCompletar={pedirCompletarTarea} onReabrir={(t) => reabrirTarea(t, onEditTarea)} /></td>
                      <td>
                        <span style={{ paddingLeft: nivel * 18 }} className="flex items-center gap-1">
                          {nivel > 0 && <span className="gp-text-muted shrink-0">└</span>}
                          <ToggleArbolTarea nodo={p} colapsada={colapsada} onToggle={toggleRama} />
                          <span className={hecha ? "gp-texto-hecho" : ""} style={hecha ? { textDecoration: "line-through" } : undefined}>{p.descripcion}</span>
                          <ContadorRamaColapsada nodo={p} colapsada={colapsada} />
                        </span>
                      </td>
                      <td className="gp-text-muted">{p.contactoId ? nombreCliente(p.contactoId) : "—"}</td>
                      <td className="gp-text-muted">{nombreResp(p.colaboradorContactoId)}</td>
                      <td className="gp-mono" style={{ color: hecha ? "var(--teal)" : vencido ? "var(--red)" : undefined }}>
                        {hecha
                          ? <span title={p.fechaLimite ? `Fecha límite: ${p.fechaLimite}` : undefined}>✓ {p.completadaEn ? fmtFechaCompletado(p.completadaEn) : "—"}</span>
                          : p.fechaLimite}
                      </td>
                      <td><Badge tone={p.prioridad === "Alta" ? "red" : p.prioridad === "Media" ? "gold" : "muted"}>{p.prioridad}</Badge></td>
                      <td>
                        <div className="flex items-center gap-1.5" style={{ minWidth: 130 }}>
                          <div className="h-1.5 rounded flex-1" style={{ background: "var(--border)" }}>
                            <div className="h-1.5 rounded" style={{ width: `${avance}%`, background: avance === 100 ? "var(--teal)" : "var(--gold)" }} />
                          </div>
                          {tieneHijos ? (
                            <span className="gp-mono" style={{ fontSize: 10 }}>{avance}%</span>
                          ) : (
                            <NumeroGuardable
                              valor={p.avance} placeholder={String(avance)} ariaLabel="Avance de la tarea"
                              onGuardar={(val) => onEditTarea(p.id, { avance: val })}
                            />
                          )}
                          {!tieneHijos && (
                            <select className="gp-input" style={{ padding: "1px 4px", fontSize: 10, width: 88 }} value={p.estatus} onChange={(e) => cambiarEstatusTarea(p, e.target.value)}>
                              {ESTATUS_TAREA.map((s) => <option key={s}>{s}</option>)}
                            </select>
                          )}
                        </div>
                      </td>
                      <td className="gp-mono">{sensibleDesbloqueado ? (p.precio ? fmtMoney(p.precio) : "—") : (p.precio ? "🔒" : "—")}</td>
                      <td><div className="flex gap-1">
                        <IconBtn title="Agregar subtarea" onClick={() => setModal({ item: { ...empty, parentId: p.id } })}><Plus size={13} /></IconBtn>
                        <IconBtn title="Comentarios" onClick={() => setComentariosDe(p)}><MessageCircle size={13} />{nc > 0 && <span className="gp-mono" style={{ fontSize: 9, marginLeft: 2 }}>{nc}</span>}</IconBtn>
                        <IconBtn title="Editar" onClick={() => setModal({ item: paraEditar(p) })}><Pencil size={13} /></IconBtn>
                        <IconBtn title="Eliminar" onClick={() => confirmarBorrado(p)}><Trash2 size={13} /></IconBtn>
                      </div></td>
                    </tr>
                  );
                })}
                {filas.length === 0 && <tr><td colSpan={9} className="text-center gp-text-muted py-6">Sin tareas registradas en este proyecto todavía.</td></tr>}
              </tbody>
            </table>
          </div>

          <div className="border-t gp-border pt-4 mt-6">
            <p className="text-sm font-medium mb-2">Actividad — comentarios del proyecto</p>
            <Bitacora data={data} entidadTipo="proyectos" entidadId={proyecto.id} onAdd={onAddComentario} onRemove={onRemoveComentario} />
          </div>
        </>
      )}

      {tab === "finanzas" && (
        <div>
          {!sensibleDesbloqueado ? (
            <button onClick={onDesbloquear} className="text-left">
              <p className="text-sm gp-text-gold">🔒 Verifica tu contraseña para ver Finanzas de este proyecto</p>
            </button>
          ) : (
            <>
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium">Movimientos financieros de este proyecto</p>
                <button onClick={() => onIrAVista("finanzas")} className="text-xs gp-text-gold">Ver en Finanzas →</button>
              </div>
              {finanzasProyecto.length === 0 ? (
                <p className="text-xs gp-text-muted mb-4">Sin movimientos registrados con este proyecto todavía.</p>
              ) : (
                <div className="gp-panel overflow-x-auto mb-4">
                  <table className="gp-table">
                    <thead><tr><th>Concepto</th><th>Tipo</th><th>Fecha</th><th>Estatus</th><th>Monto</th></tr></thead>
                    <tbody>
                      {finanzasProyecto.map((f) => (
                        <tr key={f.id}>
                          <td>{f.concepto || "—"}{f.eventoId && <span className="gp-text-muted text-xs"> · Eventos</span>}{f.activoId && <span className="gp-text-muted text-xs"> · Activos digitales</span>}</td>
                          <td><Badge tone={f.tipo === "Ingreso" ? "teal" : "red"}>{f.tipo}</Badge></td>
                          <td className="gp-mono">{f.fecha}</td>
                          <td><Badge tone={f.estatus === "Cobrado" ? "teal" : "gold"}>{f.estatus}</Badge></td>
                          <td className={`gp-mono ${f.tipo === "Ingreso" ? "gp-text-teal" : "gp-text-red"}`}>{f.tipo === "Ingreso" ? "+" : "−"}{fmtMoney(f.monto)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium">Facturas de este proyecto</p>
                <button onClick={() => onIrAVista("facturas")} className="text-xs gp-text-gold">Ver en Finanzas →</button>
              </div>
              {facturasProyecto.length === 0 ? (
                <p className="text-xs gp-text-muted">Sin facturas ligadas a este proyecto.</p>
              ) : (
                <div className="gp-panel overflow-x-auto">
                  <table className="gp-table">
                    <thead><tr><th>Concepto</th><th>Fecha</th><th>Estatus</th><th>Total</th></tr></thead>
                    <tbody>
                      {facturasProyecto.map((f) => (
                        <tr key={f.id}>
                          <td>{f.concepto || f.folio || "—"}</td>
                          <td className="gp-mono">{f.fecha}</td>
                          <td><Badge tone={f.estatus === "Pagada" || f.estatus === "Cobrado" ? "teal" : "gold"}>{f.estatus}</Badge></td>
                          <td className="gp-mono">{fmtMoney(f.total)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {tab === "marketing" && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium">Campañas de este proyecto</p>
            <button onClick={() => onIrAVista("marketing")} className="text-xs gp-text-gold">Ver en Marketing →</button>
          </div>
          {campanasProyecto.length === 0 ? (
            <p className="text-xs gp-text-muted mb-4">Sin campañas ligadas a este proyecto.</p>
          ) : (
            <div className="space-y-1.5 mb-4">
              {campanasProyecto.map((c) => (
                <div key={c.id} className="gp-panel p-2.5 flex items-center justify-between gap-2 text-sm">
                  <span>{c.nombre}</span>
                  <div className="flex items-center gap-2">
                    <Badge tone="muted">{c.plataforma}</Badge>
                    <Badge tone={c.estatus === "Activa" ? "teal" : c.estatus === "Planeada" ? "gold" : "muted"}>{c.estatus}</Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium">Cuentas y métricas de redes</p>
            <button onClick={() => onIrAVista("redes")} className="text-xs gp-text-gold">Ver en Marketing →</button>
          </div>
          {redesProyecto.length === 0 ? (
            <p className="text-xs gp-text-muted">Sin cuentas de redes ligadas a este proyecto.</p>
          ) : (
            <div className="space-y-1.5">
              {redesProyecto.map((rm) => (
                <div key={rm.id} className="gp-panel p-2.5 flex items-center justify-between gap-2 text-sm">
                  <span>{rm.plataforma}</span>
                  <span className="text-xs gp-text-muted">{rm.seguidores ? `${rm.seguidores} seguidores` : ""}{rm.fecha ? ` · ${rm.fecha}` : ""}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === "legal" && (
        <div>
          {!sensibleDesbloqueado ? (
            <button onClick={onDesbloquear} className="text-left">
              <p className="text-sm gp-text-gold">🔒 Verifica tu contraseña para ver los documentos de este proyecto</p>
            </button>
          ) : (
            <>
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium">Documentos y contratos de este proyecto</p>
                <button onClick={() => onIrAVista("documentos")} className="text-xs gp-text-gold">Ver en Documentos →</button>
              </div>
              {documentosProyecto.length === 0 ? (
                <p className="text-xs gp-text-muted">Sin documentos o contratos ligados a este proyecto.</p>
              ) : (
                <div className="space-y-1.5">
                  {documentosProyecto.map((doc) => {
                    const dd = doc.fechaVencimiento ? daysUntil(doc.fechaVencimiento) : null;
                    return (
                      <div key={doc.id} className="gp-panel p-2.5 flex items-center justify-between gap-2 text-sm">
                        <div>
                          <span>{doc.nombre}</span>
                          <span className="gp-text-muted text-xs ml-2">{doc.tipo}</span>
                        </div>
                        {doc.fechaVencimiento && <Badge tone={dd < 0 ? "red" : dd <= 14 ? "gold" : "muted"}>{dd < 0 ? "Vencido" : `Vence ${doc.fechaVencimiento}`}</Badge>}
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {tab === "contactos" && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium">Personas relacionadas con este proyecto</p>
            <button onClick={() => onIrAVista("contactos")} className="text-xs gp-text-gold">Ver en Contactos →</button>
          </div>
          {contactosProyecto.length === 0 ? (
            <p className="text-xs gp-text-muted">Sin contactos ligados a este proyecto todavía. Desde la ficha de un contacto puedes relacionarlo a este proyecto.</p>
          ) : (
            <div className="space-y-1.5">
              {contactosProyecto.map((c) => (
                <div key={c.id} className="gp-panel p-2.5 flex items-center justify-between gap-2 text-sm">
                  <span>{c.nombre}</span>
                  <span className="text-xs gp-text-muted">{c.correo || c.whatsapp || ""}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <ConfirmacionModal pregunta={confirmacion} onCerrar={() => setConfirmacion(null)} />

      <ConfirmacionModal pregunta={confirmacion} onCerrar={() => setConfirmacion(null)} />

      {comentariosDe && (
        <Modal title={`Comentarios — ${comentariosDe.descripcion}`} onClose={() => setComentariosDe(null)}>
          <Bitacora data={data} entidadTipo="pendientes" entidadId={comentariosDe.id} onAdd={onAddComentario} onRemove={onRemoveComentario} />
        </Modal>
      )}

      {modal && (
        <Modal title={modal.item.id ? "Editar tarea" : modal.item.parentId ? "Nueva subtarea" : "Nueva tarea"} onClose={() => setModal(null)}>
          <PendienteForm item={modal.item} proyectos={data.proyectos} contactos={data.contactos} pendientes={data.pendientes} colaboradores={[]} proyectoFijoId={proyectoId}
            onCrearContacto={(nombre, tipos) => onCrearContacto(nombre, tipos || ["Colaborador"])}
            onEnviarInvitacion={onEnviarInvitacion}
            onAceptarEnNombre={onAceptarEnNombre}
            onSave={(v, enviarCorreo) => {
              if (modal.item.id) {
                onEditTarea(modal.item.id, v);
                if (v.proyectoId !== modal.item.proyectoId) {
                  const hijosIds = descendientesDe(modal.item.id, data.pendientes);
                  hijosIds.forEach((hid) => onEditTarea(hid, { proyectoId: v.proyectoId }));
                }
              } else {
                const nuevoId = uid();
                onAddTarea({ ...v, id: nuevoId });
                if (enviarCorreo) onEnviarInvitacion(nuevoId);
              }
              setModal(null);
            }}
          />
        </Modal>
      )}
    </div>
  );
}

/* ---------- Mi trabajo (workspace de colaborador — Fase 5) ---------- */
// A diferencia del resto de la app (que muestra los datos de UNA cuenta a la vez, la propia

/* ---------- Mi calendario (workspace de colaborador, Fase 7) ---------- */
// Vista de agenda cross-cuenta: agrupa por fecha las tareas que me asignaron en
// cualquier cuenta donde colaboro (mismo mecanismo RLS que "Mi trabajo": asignado_a =

/* ---------- Mis pagos / Mis facturas (workspace de colaborador, Fase 7) ---------- */
// Cross-cuenta: lo que he ganado (tareas aceptadas, en cualquier cuenta) contra lo que ya
// me pagaron (egresos "Pago a colaborador" donde soy el beneficiario por correo) y las



// Arma el árbol de subtareas (sin límite de profundidad) a partir de la lista plana.
function buildTareaTree(items) {
  const byParent = {};
  for (const it of items) {
    const key = it.parentId || "_root";
    (byParent[key] = byParent[key] || []).push(it);
  }
  const attach = (key) => (byParent[key] || []).map((it) => ({ ...it, hijos: attach(it.id) }));
  return attach("_root");
}
// Aplana el árbol a una lista con nivel de profundidad, para renderizar con indentación.
// `colapsadas` (opcional) es un Set con los ids de las tareas cuya rama está cerrada: la tarea
// sigue apareciendo, pero sus subtareas no se incluyen en el resultado.
function flattenTareas(tree, nivel = 0, colapsadas = null) {
  const out = [];
  for (const nodo of tree) {
    out.push({ item: nodo, nivel });
    if (colapsadas && colapsadas.has(nodo.id)) continue;
    out.push(...flattenTareas(nodo.hijos, nivel + 1, colapsadas));
  }
  return out;
}
// ids de todas las tareas que tienen al menos una subtarea, en cualquier nivel del árbol. Es lo
// que necesita "Colapsar todo" para saber qué ramas existen.
function idsRamasTareas(tree) {
  const out = [];
  for (const nodo of tree) {
    if (nodo.hijos && nodo.hijos.length > 0) {
      out.push(nodo.id);
      out.push(...idsRamasTareas(nodo.hijos));
    }
  }
  return out;
}
// Cuántas tareas cuelgan de este nodo contando todos los niveles — para poder decir cuántas se
// están escondiendo al colapsar, en vez de esconderlas en silencio.
function contarDescendientesTarea(nodo) {
  return (nodo.hijos || []).reduce((n, h) => n + 1 + contarDescendientesTarea(h), 0);
}

// Flecha de colapsar/expandir de una fila del árbol. Una tarea sin subtareas dibuja un hueco del
// mismo ancho, para que todas las descripciones de un mismo nivel queden alineadas.
function ToggleArbolTarea({ nodo, colapsada, onToggle }) {
  const tieneHijos = nodo.hijos && nodo.hijos.length > 0;
  if (!tieneHijos) return <span className="shrink-0" style={{ width: 16, display: "inline-block" }} />;
  const n = contarDescendientesTarea(nodo);
  return (
    <button
      type="button"
      onClick={(e) => { e.stopPropagation(); onToggle(nodo.id); }}
      title={colapsada ? `Expandir ${n} subtarea${n === 1 ? "" : "s"}` : "Colapsar subtareas"}
      aria-label={colapsada ? "Expandir subtareas" : "Colapsar subtareas"}
      aria-expanded={!colapsada}
      className="shrink-0 gp-text-muted"
      style={{ width: 16, lineHeight: 0 }}
    >
      {colapsada ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
    </button>
  );
}

// Cuántas subtareas quedaron escondidas en esta rama, para que colapsar no borre información.
function ContadorRamaColapsada({ nodo, colapsada }) {
  if (!colapsada) return null;
  const n = contarDescendientesTarea(nodo);
  if (n === 0) return null;
  return <span className="gp-bloque gp-badge shrink-0" style={{ color: "var(--muted-bloque)" }}>+{n}</span>;
}

// "Colapsar todo / Expandir todo". Un solo botón que alterna: si ya está todo cerrado, abre; si
// no, cierra. No se dibuja cuando el árbol no tiene ninguna rama que colapsar.
function BotonArbolTareas({ idsRamas, colapsadas, onCambiar }) {
  if (idsRamas.length === 0) return null;
  const todasColapsadas = idsRamas.every((id) => colapsadas.has(id));
  return (
    <button
      type="button"
      onClick={() => onCambiar(todasColapsadas ? new Set() : new Set(idsRamas))}
      className="text-xs px-2.5 py-1.5 rounded gp-btn-ghost flex items-center gap-1.5 whitespace-nowrap"
    >
      {todasColapsadas ? <ChevronsUpDown size={12} /> : <ChevronsDownUp size={12} />}
      {todasColapsadas ? "Expandir todo" : "Colapsar todo"}
    </button>
  );
}
// % de avance: si la tarea tiene subtareas, es el promedio del avance de sus hijos (recursivo);
// si es una tarea final (sin hijos), es binario según su estatus.
function calcAvanceTarea(nodo) {
  if (!nodo.hijos || nodo.hijos.length === 0) {
    if (nodo.avance !== null && nodo.avance !== undefined && nodo.avance !== "") return Number(nodo.avance);
    return nodo.estatus === "Completada" ? 100 : nodo.estatus === "En proceso" ? 50 : 0;
  }
  const suma = nodo.hijos.reduce((s, h) => s + calcAvanceTarea(h), 0);
  return suma / nodo.hijos.length;
}
/* ---------- Completar tareas y proyectos (una sola regla para toda la app) ---------- */
// El check de completar aparece en tres pantallas (Tareas, centro de proyecto y ficha del
// proyecto). La regla vive aquí una sola vez para que se comporte igual en las tres: mismo texto
// de confirmación, misma fecha registrada y mismo cierre automático del proyecto.

// "2026-09-24T18:30:00Z" -> "24 Sep 2026". Para mostrar cuándo se completó algo. (Aparte de
// fmtFechaHora(), que es el de Citas y no lleva año.)
const fmtFechaCompletado = (iso) => (iso ? fmtFechaCorta(String(iso).slice(0, 10)) : "");

// Subtareas todavía abiertas que cuelgan de una tarea.
function subtareasAbiertas(tareaId, pendientes) {
  return descendientesDe(tareaId, pendientes)
    .map((id) => pendientes.find((t) => t.id === id))
    .filter((t) => t && !ESTATUS_TAREA_CERRADOS.includes(t.estatus));
}

// Pregunta de confirmación para completar una tarea, con todo lo que hay que hacer si se acepta.
// Devuelve el objeto que consume ConfirmacionModal; no toca nada por su cuenta.
function preguntaCompletarTarea({ tarea, data, onEditTarea, onEditProyecto, onAviso }) {
  const pendientes = data.pendientes || [];
  const abiertas = subtareasAbiertas(tarea.id, pendientes);
  const n = abiertas.length;
  return {
    titulo: "Completar tarea",
    mensaje: n > 0
      ? `"${tarea.descripcion}" tiene ${n} subtarea${n === 1 ? "" : "s"} sin terminar.\n\nAl completarla, esa${n === 1 ? "" : "s"} subtarea${n === 1 ? "" : "s"} también quedará${n === 1 ? "" : "n"} como completada${n === 1 ? "" : "s"}, con la fecha de hoy.`
      : `Se va a marcar "${tarea.descripcion}" como completada y se va a guardar la fecha de hoy.`,
    etiqueta: "Sí, completar",
    onConfirmar: () => {
      const ahora = ahoraISO();
      // El avance se fija en 100 junto con el estatus: calcAvanceTarea() usa el avance manual
      // cuando está capturado, así que sin esto una tarea "completada" al 40% dejaría a su tarea
      // padre en un porcentaje que no cuadra con tener todo cerrado.
      onEditTarea(tarea.id, { estatus: "Completada", completadaEn: ahora, avance: 100 });
      for (const h of abiertas) onEditTarea(h.id, { estatus: "Completada", completadaEn: ahora, avance: 100 });

      // ¿Fue la última tarea abierta del proyecto? Entonces el proyecto se cierra solo.
      const cerradasAhora = new Set([tarea.id, ...abiertas.map((h) => h.id)]);
      const delProyecto = pendientes.filter((t) => t.proyectoId === tarea.proyectoId);
      const quedaAlgoAbierto = delProyecto.some((t) => !cerradasAhora.has(t.id) && !ESTATUS_TAREA_CERRADOS.includes(t.estatus));
      const proyecto = (data.proyectos || []).find((pr) => pr.id === tarea.proyectoId);
      if (proyecto && delProyecto.length > 0 && !quedaAlgoAbierto && proyecto.estatus !== "Finalizado") {
        onEditProyecto?.(proyecto.id, { estatus: "Finalizado", completadoEn: ahora });
        // Diferido para que el aviso salga con el modal de confirmación ya cerrado, no encima.
        setTimeout(() => onAviso?.(`Era la última tarea abierta de "${proyecto.nombre}", así que el proyecto se marcó como Finalizado. Si el proyecto sigue vivo, puedes reabrirlo desde su ficha.`), 60);
      }
    },
  };
}

// Reabrir una tarea borra su fecha de completado: la fecha guardada tiene que ser la de la vez que
// de verdad se terminó, no la de un clic que se deshizo. No pide confirmación porque no destruye
// nada más que ese dato y se vuelve a generar al completarla otra vez.
function reabrirTarea(tarea, onEditTarea) {
  onEditTarea(tarea.id, { estatus: "Pendiente", completadaEn: null, avance: null });
}

// Pregunta de confirmación para completar un proyecto. Un proyecto SÍ se puede dar por terminado
// con tareas abiertas (a veces se cierra algo dejando pendientes que ya no se van a hacer), pero
// el aviso tiene que decir cuántas quedan para que sea una decisión, no un descuido.
function preguntaCompletarProyecto({ proyecto, data, onEditProyecto }) {
  const abiertas = (data.pendientes || []).filter((t) => t.proyectoId === proyecto.id && !ESTATUS_TAREA_CERRADOS.includes(t.estatus));
  const n = abiertas.length;
  return {
    titulo: "Completar proyecto",
    mensaje: n > 0
      ? `"${proyecto.nombre}" todavía tiene ${n} tarea${n === 1 ? "" : "s"} sin completar.\n\n¿Aun así quieres marcar el proyecto como completado? Las tareas se quedan como están; solo se cierra el proyecto.`
      : `Se va a marcar "${proyecto.nombre}" como completado y se va a guardar la fecha de hoy.`,
    etiqueta: n > 0 ? "Sí, completar de todos modos" : "Sí, completar",
    onConfirmar: () => onEditProyecto(proyecto.id, { estatus: "Finalizado", completadoEn: ahoraISO() }),
  };
}

// Modal de confirmación reutilizable. `pregunta` es null cuando no hay nada que preguntar.
function ConfirmacionModal({ pregunta, onCerrar }) {
  if (!pregunta) return null;
  return (
    <Modal title={pregunta.titulo} onClose={onCerrar}>
      <p className="text-sm gp-text-muted mb-4" style={{ whiteSpace: "pre-line" }}>{pregunta.mensaje}</p>
      <div className="flex gap-2">
        <button onClick={onCerrar} className="gp-btn-ghost flex-1 py-2 text-sm">Cancelar</button>
        <button onClick={() => { pregunta.onConfirmar(); onCerrar(); }} className="gp-btn flex-1 py-2 text-sm">{pregunta.etiqueta || "Confirmar"}</button>
      </div>
    </Modal>
  );
}

// Check de "completada" de una fila de tareas. Completar pasa por confirmación (lo pide el flujo);
// reabrir es directo, porque deshacer un clic no debería costar otro clic.
function CheckTareaHecha({ tarea, onCompletar, onReabrir, size = 17 }) {
  const hecha = tarea.estatus === "Completada";
  return (
    <input
      type="checkbox"
      checked={hecha}
      title={hecha ? `Completada${tarea.completadaEn ? ` el ${fmtFechaCompletado(tarea.completadaEn)}` : ""} — clic para reabrirla` : "Marcar como completada"}
      aria-label={hecha ? "Reabrir tarea" : "Marcar tarea como completada"}
      onClick={(e) => e.stopPropagation()}
      onChange={(e) => (e.target.checked ? onCompletar(tarea) : onReabrir(tarea))}
      style={{ width: size, height: size, accentColor: "var(--teal)", cursor: "pointer" }}
    />
  );
}

// ids de todos los descendientes de una tarea (para no permitir que se vuelva subtarea de sí misma).
function descendientesDe(id, items) {
  const hijos = items.filter((t) => t.parentId === id);
  return hijos.reduce((acc, h) => [...acc, h.id, ...descendientesDe(h.id, items)], []);
}

// Vista mind-map: dibuja el proyecto en el centro y sus pendientes/subtareas ramificándose a la derecha.
function MindMapPendientes({ proyecto, tareas, onNodoClick, onAgregar, onEliminar }) {
  const NODE_W = 190, NODE_H = 36, GAP_Y = 12, GAP_X = 60;
  const BTN_R = 8; // radio de los botoncitos "+" y "×"
  const raices = buildTareaTree(tareas.filter((t) => t.proyectoId === proyecto.id));
  const root = { id: "_root", descripcion: proyecto.nombre, estatus: null, hijos: raices };

  let leafIndex = 0;
  const posiciones = [];
  const walk = (nodo, nivel) => {
    let y;
    if (!nodo.hijos || nodo.hijos.length === 0) {
      y = leafIndex * (NODE_H + GAP_Y);
      leafIndex++;
    } else {
      const ys = nodo.hijos.map((h) => walk(h, nivel + 1));
      y = (ys[0] + ys[ys.length - 1]) / 2;
    }
    posiciones.push({ nodo, nivel, y });
    return y;
  };
  walk(root, 0);

  const posById = {};
  posiciones.forEach((p) => (posById[p.nodo.id] = p));
  const edges = [];
  const conectar = (nodo) => {
    (nodo.hijos || []).forEach((h) => {
      edges.push({ from: posById[nodo.id], to: posById[h.id] });
      conectar(h);
    });
  };
  conectar(root);

  if (posiciones.length === 1) {
    return (
      <div className="text-center py-10">
        <p className="text-sm gp-text-muted mb-3">Este proyecto todavía no tiene tareas registradas.</p>
        <button onClick={() => onAgregar && onAgregar(root)} className="gp-btn px-4 py-2 text-sm inline-flex items-center gap-1"><Plus size={14} /> Agregar el primero</button>
      </div>
    );
  }

  const maxNivel = Math.max(...posiciones.map((p) => p.nivel));
  const maxY = Math.max(...posiciones.map((p) => p.y));
  const width = (maxNivel + 1) * (NODE_W + GAP_X) + 20;
  const height = maxY + NODE_H + 20;
  const colorEstatus = (estatus) => (estatus === "Completada" ? "var(--teal)" : estatus === "En proceso" ? "var(--gold)" : estatus === "En espera" ? "var(--red)" : estatus === "Cancelada" ? "var(--muted)" : "var(--border)");

  return (
    <div>
      <p className="text-xs gp-text-muted mb-2">Clic en un pendiente para editarlo · <span className="gp-text-gold">➕</span> agrega una subtarea · <span className="gp-text-red">✕</span> la elimina.</p>
      <div className="overflow-auto gp-scroll gp-panel p-4" style={{ maxHeight: 560 }}>
        <svg width={width} height={height} style={{ minWidth: width, display: "block" }}>
          {edges.map((e, i) => {
            const x1 = e.from.nivel * (NODE_W + GAP_X) + NODE_W;
            const y1 = e.from.y + NODE_H / 2;
            const x2 = e.to.nivel * (NODE_W + GAP_X);
            const y2 = e.to.y + NODE_H / 2;
            const mx = (x1 + x2) / 2;
            return <path key={i} d={`M ${x1} ${y1} C ${mx} ${y1}, ${mx} ${y2}, ${x2} ${y2}`} stroke="var(--border)" strokeWidth={1.5} fill="none" />;
          })}
          {posiciones.map((p) => {
            const x = p.nivel * (NODE_W + GAP_X);
            const esRaiz = p.nodo.id === "_root";
            const texto = (p.nodo.descripcion || "").length > 26 ? p.nodo.descripcion.slice(0, 25) + "…" : p.nodo.descripcion;
            return (
              <g key={p.nodo.id}>
                <g transform={`translate(${x},${p.y})`} style={{ cursor: esRaiz ? "default" : "pointer" }} onClick={() => !esRaiz && onNodoClick && onNodoClick(p.nodo)}>
                  <rect width={NODE_W} height={NODE_H} rx={8}
                    fill={esRaiz ? "var(--gold)" : "var(--panel-hi)"}
                    stroke={esRaiz ? "var(--gold)" : colorEstatus(p.nodo.estatus)}
                    strokeWidth={esRaiz ? 0 : 2} />
                  <text x={10} y={NODE_H / 2 + 4} fontSize={12} fontFamily="'IBM Plex Sans',sans-serif"
                    fontWeight={esRaiz ? 600 : 400}
                    fill={esRaiz ? "#161822" : "var(--text)"}>
                    {texto}
                  </text>
                </g>
                {/* botón "+" para agregar una subtarea colgando de este nodo, y "×" para eliminarlo (todos menos el proyecto) */}
                <g
                  transform={`translate(${x + NODE_W + (GAP_X / 2)},${p.y + NODE_H / 2 - (esRaiz ? 0 : 9)})`}
                  style={{ cursor: "pointer" }}
                  onClick={() => onAgregar && onAgregar(p.nodo)}
                >
                  <circle r={BTN_R} fill="var(--gold)" />
                  <text x={0} y={3.5} fontSize={12} textAnchor="middle" fontWeight={700} fill="#161822">+</text>
                </g>
                {!esRaiz && (
                  <g
                    transform={`translate(${x + NODE_W + (GAP_X / 2)},${p.y + NODE_H / 2 + 9})`}
                    style={{ cursor: "pointer" }}
                    onClick={() => onEliminar && onEliminar(p.nodo)}
                  >
                    <circle r={BTN_R} fill="var(--red)" />
                    <text x={0} y={3.5} fontSize={11} textAnchor="middle" fontWeight={700} fill="#fff">✕</text>
                  </g>
                )}
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}

function Pendientes({ data, activeOwnerId, onAdd, onEdit, onEditProyecto, onRemove, onAddComentario, onRemoveComentario, onAsignar, onCrearContacto, onCrearProyecto, onEnviarInvitacion, onAceptarEnNombre, crearAlEntrar, onConsumirCrearAlEntrar, filtroProyectoInicial, onConsumirFiltroProyecto }) {
  // Ancho de la ficha de la derecha, arrastrable y recordado por pantalla.
  const { contenedorRef, divisor, estiloPanel } = usePanelRedimensionable("tareas");
  const [modal, setModal] = useState(null);
  const [comentariosDe, setComentariosDe] = useState(null);
  const [orden, setOrden] = useState("default");
  const [vista, setVista] = useState("lista"); // "lista" | "mindmap"
  const [proyectoMindMap, setProyectoMindMap] = useState("");
  // Se entra aquí ya filtrado cuando vienes de "Ver todas las tareas" en la ficha de un proyecto.
  const [filtroProyecto, setFiltroProyecto] = useState(filtroProyectoInicial || ""); // "" = todos los proyectos, en la vista de lista
  const [filtroAvance, setFiltroAvance] = useState("todas"); // todas | sinTerminar | sinEmpezar | enProceso | terminadas
  const [tareaSelId, setTareaSelId] = useState(null); // ficha abierta en el panel de la derecha
  // Ramas del árbol de tareas que están cerradas (ids de las tareas padre). Vacío = todo abierto.
  const [colapsadas, setColapsadas] = useState(() => new Set());
  const [confirmacion, setConfirmacion] = useState(null);
  const [colaboradores, setColaboradores] = useState([]);
  // Si la lista está filtrada por un proyecto, la tarea nueva ya nace en ese proyecto: es de
  // donde viene el usuario y volver a elegirlo a mano era un paso de más (pedido de Angel,
  // 29 sept 2026). Se recalcula en cada render, así que siempre refleja el filtro actual.
  const empty = { proyectoId: filtroProyecto && filtroProyecto !== "_sin_" ? filtroProyecto : "", parentId: "", descripcion: "", fechaLimite: todayISO(), fechaRevision: "", prioridad: "Media", estatus: "Pendiente", colaboradorContactoId: null, contactoId: "", precio: "", fechaPagoAprox: "", tiempoEstimado: "", tiempoReal: "", asignadoA: "" };

  useEffect(() => {
    if (crearAlEntrar) { setModal({ item: { ...empty, ...(crearAlEntrar.preset || {}) } }); onConsumirCrearAlEntrar(); }
  }, [crearAlEntrar]);

  // El filtro que llega desde la ficha de un proyecto se consume una sola vez: si no, volver a
  // Tareas por el menú te dejaría filtrado sin que lo hayas pedido.
  useEffect(() => {
    if (filtroProyectoInicial) { setFiltroProyecto(filtroProyectoInicial); onConsumirFiltroProyecto?.(); }
  }, [filtroProyectoInicial]);

  useEffect(() => {
    if (!activeOwnerId) return;
    supabase.from("colaboradores").select("colaborador_user_id, colaborador_email").eq("propietario_id", activeOwnerId).eq("estatus", "Activo")
      .then(({ data: rows }) => setColaboradores(rows || []));
  }, [activeOwnerId]);

  const camposOrden = {
    entrega: { get: (p) => p.fechaLimite, tipo: "fecha" },
    registro: { get: (p) => p.createdAt, tipo: "fecha" },
    revision: { get: (p) => p.fechaRevision, tipo: "fecha" },
    alfabetico: { get: (p) => p.descripcion, tipo: "texto" },
    prioridad: { get: (p) => p.prioridad, tipo: "prioridad" },
  };
  const opcionesOrden = [
    { key: "entrega", label: "fecha de entrega" },
    { key: "registro", label: "fecha de registro" },
    { key: "revision", label: "fecha de revisión" },
    { key: "alfabetico", label: "alfabético" },
    { key: "prioridad", label: "prioridad" },
  ];
  const nombreProyectoOrden = (t) => (t.proyectoId ? (data.proyectos.find((pr) => pr.id === t.proyectoId)?.nombre || "") : "");
  const porProyecto = filtroProyecto === "_sin_"
    ? data.pendientes.filter((t) => !t.proyectoId)
    : filtroProyecto ? data.pendientes.filter((t) => t.proyectoId === filtroProyecto) : data.pendientes;
  // Filtro por avance (pedido de Angel, 29 sept 2026). "Sin terminar" es el de todos los días:
  // todo lo que sigue vivo. Una tarea cuenta como empezada si tiene estatus "En proceso" o si le
  // pusieron un porcentaje mayor a cero.
  const empezada = (t) => t.estatus === "En proceso" || (Number(t.avance) > 0 && Number(t.avance) < 100);
  const pendientesFiltrados = (() => {
    switch (filtroAvance) {
      case "sinTerminar": return porProyecto.filter((t) => !ESTATUS_TAREA_CERRADOS.includes(t.estatus));
      case "sinEmpezar": return porProyecto.filter((t) => !ESTATUS_TAREA_CERRADOS.includes(t.estatus) && !empezada(t));
      case "enProceso": return porProyecto.filter((t) => !ESTATUS_TAREA_CERRADOS.includes(t.estatus) && empezada(t));
      case "terminadas": return porProyecto.filter((t) => t.estatus === "Completada");
      default: return porProyecto;
    }
  })();
  // Orden por default: alfabético por proyecto (los que no tienen proyecto van al final), y dentro
  // de cada proyecto por fecha de entrega. Como las subtareas siempre heredan el proyecto de su
  // tarea principal, este orden agrupa cada proyecto junto sin romper la jerarquía de subtareas.
  const base = orden === "default"
    ? [...pendientesFiltrados].sort((a, b) => {
        const pa = nombreProyectoOrden(a), pb = nombreProyectoOrden(b);
        if (!pa && pb) return 1;
        if (pa && !pb) return -1;
        if (pa !== pb) return pa.localeCompare(pb, "es");
        return (a.fechaLimite || "").localeCompare(b.fechaLimite || "");
      })
    : ordenarLista(pendientesFiltrados, orden, camposOrden);
  const arbol = buildTareaTree(base);
  const filas = flattenTareas(arbol, 0, colapsadas);
  const idsRamas = idsRamasTareas(arbol);
  const toggleRama = (id) => setColapsadas((prev) => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });
  const pedirCompletarTarea = (t) => setConfirmacion(preguntaCompletarTarea({
    tarea: t, data, onEditTarea: onEdit, onEditProyecto, onAviso: (m) => alert(m),
  }));
  // Elegir "Completada" en el selector pasa por la misma regla que el check: confirma y registra
  // la fecha. Salir de "Completada" la borra, junto con el avance de 100 que se había fijado.
  const cambiarEstatusTarea = (t, nuevo) => {
    if (nuevo === t.estatus) return;
    if (nuevo === "Completada") { pedirCompletarTarea(t); return; }
    onEdit(t.id, t.estatus === "Completada" ? { estatus: nuevo, completadaEn: null, avance: null } : { estatus: nuevo });
  };
  const nComentarios = (id) => (data.comentarios || []).filter((c) => c.entidadTipo === "pendientes" && c.entidadId === id).length;

  const nombreProyecto = (id) => data.proyectos.find((p) => p.id === id)?.nombre || "—";
  const nombreResp = (id) => data.contactos.find((c) => c.id === id)?.nombre || "Tú";
  const nombreCliente = (id) => data.contactos.find((c) => c.id === id)?.nombre || "—";
  // Los objetos armados por buildTareaTree traen un campo "hijos" que es solo para dibujar el árbol
  // en pantalla — hay que quitarlo antes de mandar el ítem a editar, porque no es una columna real.
  const paraEditar = (t) => { const { hijos, ...limpio } = t; return limpio; };
  // Si la tarea tiene subtareas debajo, avisa que también se van a borrar (si no, se quedarían "huérfanas").
  const confirmarBorrado = (item) => {
    const hijosIds = descendientesDe(item.id, data.pendientes);
    if (hijosIds.length > 0) {
      onRemove(item.id, hijosIds, `Esta tarea tiene ${hijosIds.length} subtarea${hijosIds.length > 1 ? "s" : ""} debajo. Si la eliminas, también se eliminan todas sus subtareas.`);
    } else {
      onRemove(item.id);
    }
  };

  const tareaSel = tareaSelId ? data.pendientes.find((t) => t.id === tareaSelId) : null;

  return (
    <div ref={contenedorRef} className="flex flex-col lg:flex-row gap-4 items-start">
      {/* Lista a la izquierda, ficha de la tarea a la derecha — mismo patrón que Contactos. */}
      <div className={`min-w-0 flex-1 w-full ${tareaSel ? "hidden lg:block" : ""}`}>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-1">
        <h2 className="gp-serif text-2xl">Tareas</h2>
        <button onClick={() => setModal({ item: empty })} className="gp-btn flex items-center justify-center gap-1 px-3 py-1.5 text-sm w-full sm:w-auto"><Plus size={14} /> Nueva</button>
      </div>
      <p className="text-sm gp-text-muted mb-3">De todos tus proyectos, en un solo lugar. Puedes anidar subtareas sin límite con el ➕ de cada fila.</p>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
        <div className="flex gap-1 gp-panel p-1 w-fit">
          <button onClick={() => setVista("lista")} className={`px-3 py-1 text-xs rounded ${vista === "lista" ? "gp-btn" : "gp-text-muted"}`}>Lista</button>
          <button onClick={() => setVista("mindmap")} className={`px-3 py-1 text-xs rounded ${vista === "mindmap" ? "gp-btn" : "gp-text-muted"}`}>Mind-map</button>
        </div>
        {vista === "lista" && (
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <select className="gp-input" style={{ maxWidth: 220 }} value={filtroProyecto} onChange={(e) => setFiltroProyecto(e.target.value)}>
              {/* Las tareas sueltas no tenían forma de verse: con "Todos" se perdían entre las de
                  proyecto y no había filtro que las aislara. Va hasta arriba, como pidió Angel. */}
              <option value="_sin_">— Sin proyecto —</option>
              <option value="">Todos los proyectos</option>
              {ordenadosPorNombre(data.proyectos).map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
            </select>
            <select className="gp-input" style={{ maxWidth: 190 }} value={filtroAvance} onChange={(e) => setFiltroAvance(e.target.value)} aria-label="Filtrar por avance">
              <option value="todas">Avance: todas</option>
              <option value="sinTerminar">Todas menos las terminadas</option>
              <option value="sinEmpezar">Sin empezar</option>
              <option value="enProceso">En proceso</option>
              <option value="terminadas">Terminadas</option>
            </select>
            <OrdenSelector opciones={opcionesOrden} value={orden} onChange={setOrden} />
            <BotonArbolTareas idsRamas={idsRamas} colapsadas={colapsadas} onCambiar={setColapsadas} />
          </div>
        )}
        {vista === "mindmap" && (
          <select className="gp-input" style={{ maxWidth: 260 }} value={proyectoMindMap} onChange={(e) => setProyectoMindMap(e.target.value)}>
            <option value="">— elige un proyecto —</option>
            {ordenadosPorNombre(data.proyectos).map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
          </select>
        )}
      </div>

      {vista === "mindmap" ? (
        proyectoMindMap ? (
          <MindMapPendientes
            proyecto={data.proyectos.find((p) => p.id === proyectoMindMap)}
            tareas={data.pendientes}
            onNodoClick={(nodo) => setModal({ item: paraEditar(nodo) })}
            onAgregar={(nodo) => setModal({ item: { ...empty, proyectoId: proyectoMindMap, parentId: nodo.id === "_root" ? "" : nodo.id } })}
            onEliminar={(nodo) => confirmarBorrado(nodo)}
          />
        ) : (
          <p className="text-sm gp-text-muted py-8 text-center">Elige un proyecto arriba para ver su mind-map de pendientes.</p>
        )
      ) : (
      <div className="gp-panel overflow-x-auto">
        <table className="gp-table gp-tabla-tareas">
          <thead>
            <tr>
              <th style={{ width: 30 }}></th>
              <th>Pendiente</th>
              <th className="hidden md:table-cell">Proyecto</th>
              <th className="hidden md:table-cell">Cliente</th>
              <th className="hidden md:table-cell">Responsable</th>
              <th className="hidden md:table-cell">Fecha</th>
              <th className="hidden md:table-cell">Prioridad</th>
              <th>Avance</th>
              <th className="hidden md:table-cell">Precio</th>
              <th className="hidden md:table-cell">Horas</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filas.map(({ item: p, nivel }) => {
              const vencido = p.estatus !== "Completada" && p.fechaLimite && daysUntil(p.fechaLimite) < 0;
              const nc = nComentarios(p.id);
              const tieneHijos = p.hijos && p.hijos.length > 0;
              const colapsada = colapsadas.has(p.id);
              const hecha = p.estatus === "Completada";
              const avance = tieneHijos ? Math.round(calcAvanceTarea(p)) : null;
              // Con subtareas el avance es la ponderación; sin ellas, el capturado o el que se
              // deduce del estatus (0 / 50 / 100). La barrita de la columna usa siempre este.
              const avanceFila = Math.round(calcAvanceTarea(p));
              return (
                <tr key={p.id}
                  className={`${hecha ? "gp-fila-hecha" : ""} ${p.id === tareaSelId ? "gp-fila-sel" : ""}`.trim() || undefined}
                  onClick={() => setTareaSelId(p.id)}
                  title="Ver el detalle de esta tarea">
                  <td onClick={(e) => e.stopPropagation()}><CheckTareaHecha tarea={p} onCompletar={pedirCompletarTarea} onReabrir={(t) => reabrirTarea(t, onEdit)} /></td>
                  <td style={{ maxWidth: 220 }}>
                    <span style={{ paddingLeft: nivel * 18 }} className="flex items-start gap-1">
                      {nivel > 0 && <span className="gp-text-muted shrink-0">└</span>}
                      <ToggleArbolTarea nodo={p} colapsada={colapsada} onToggle={toggleRama} />
                      <span className={`line-clamp-2 md:line-clamp-none ${hecha ? "gp-texto-hecho" : ""}`} style={hecha ? { textDecoration: "line-through" } : undefined}>{p.descripcion}</span>
                      <ContadorRamaColapsada nodo={p} colapsada={colapsada} />
                    </span>
                  </td>
                  <td className="gp-text-muted hidden md:table-cell">{nombreProyecto(p.proyectoId)}</td>
                  <td className="gp-text-muted hidden md:table-cell">{p.contactoId ? nombreCliente(p.contactoId) : "—"}</td>
                  <td className="gp-text-muted hidden md:table-cell">{nombreResp(p.colaboradorContactoId)}</td>
                  <td className="gp-mono hidden md:table-cell" style={{ color: hecha ? "var(--teal)" : vencido ? "var(--red)" : undefined }}>
                    {hecha
                      ? <span title={p.fechaLimite ? `Fecha límite: ${p.fechaLimite}` : undefined}>✓ {p.completadaEn ? fmtFechaCompletado(p.completadaEn) : "—"}</span>
                      : p.fechaLimite}
                  </td>
                  <td className="hidden md:table-cell"><Badge tone={p.prioridad === "Alta" ? "red" : p.prioridad === "Media" ? "gold" : "muted"}>{p.prioridad}</Badge></td>
                  <td onClick={(e) => e.stopPropagation()}>
                    {/* La barrita se ve SIEMPRE, tenga o no subtareas: es la columna de avance y
                        antes, en las tareas sin hijos, ahí solo salía el selector de estatus. */}
                    <div className="flex items-center gap-1.5 mb-1" style={{ minWidth: 86 }}>
                      <div className="h-1.5 rounded flex-1" style={{ background: "var(--border)" }}>
                        <div className="h-1.5 rounded" style={{ width: `${avanceFila}%`, background: avanceFila >= 100 ? "var(--teal)" : avanceFila >= 50 ? "#087CF5" : "var(--gold)" }} />
                      </div>
                      <span className="gp-mono" style={{ fontSize: 10 }}>{avanceFila}%</span>
                    </div>
                    {tieneHijos ? null : (
                      // El check de completar ya vive en su propia columna; aquí queda el selector
                      // completo para los demás estados (En proceso, En espera, Cancelada…). En
                      // celular el selector no cabe, así que ahí se muestra el estado como badge.
                      <>
                        <span className="md:hidden"><Badge tone={toneEstatusTarea(p.estatus)}>{p.estatus}</Badge></span>
                        <span className="hidden md:inline-flex">
                          <SelectGuardable
                            valor={p.estatus} opciones={ESTATUS_TAREA} ariaLabel="Estatus de la tarea"
                            onGuardar={(nuevo) => cambiarEstatusTarea(p, nuevo)}
                          />
                        </span>
                      </>
                    )}
                  </td>
                  <td className="gp-mono hidden md:table-cell">{p.precio ? fmtMoney(p.precio) : "—"}</td>
                  <td className="gp-mono gp-text-muted hidden md:table-cell">{p.tiempoEstimado ? `${p.tiempoEstimado}h` : "—"}{p.tiempoReal ? ` / ${p.tiempoReal}h` : ""}</td>
                  <td onClick={(e) => e.stopPropagation()}><div className="flex gap-1">
                    <IconBtn title="Editar" onClick={() => setModal({ item: paraEditar(p) })}><Pencil size={13} /></IconBtn>
                    <IconBtn title="Agregar subtarea" onClick={() => setModal({ item: { ...empty, proyectoId: p.proyectoId, parentId: p.id } })}><Plus size={13} /></IconBtn>
                    <IconBtn title="Comentarios" onClick={() => setComentariosDe(p)}><MessageCircle size={13} />{nc > 0 && <span className="gp-mono" style={{ fontSize: 9, marginLeft: 2 }}>{nc}</span>}</IconBtn>
                    <IconBtn title="Eliminar" onClick={() => confirmarBorrado(p)}><Trash2 size={13} /></IconBtn>
                  </div></td>
                </tr>
              );
            })}
            {filas.length === 0 && <tr><td colSpan={11} className="text-center gp-text-muted py-6">Sin tareas registradas.</td></tr>}
          </tbody>
        </table>
      </div>
      )}
      </div>

      {tareaSel && divisor}
      {tareaSel && (
        <div className="w-full shrink-0 lg:sticky lg:top-4" style={estiloPanel}>
          <FichaTarea
            key={tareaSel.id}
            t={tareaSel}
            data={data}
            onCerrar={() => setTareaSelId(null)}
            onEditar={() => setModal({ item: paraEditar(tareaSel) })}
            onAgregarSubtarea={() => setModal({ item: { ...empty, proyectoId: tareaSel.proyectoId, parentId: tareaSel.id } })}
            onComentarios={() => setComentariosDe(tareaSel)}
            onEliminar={() => { confirmarBorrado(tareaSel); setTareaSelId(null); }}
            onCambiarAvance={(valor) => onEdit(tareaSel.id, { avance: valor })}
            onCambiarEstatus={(nuevo) => cambiarEstatusTarea(tareaSel, nuevo)}
            nComentarios={nComentarios(tareaSel.id)}
          />
        </div>
      )}

      <ConfirmacionModal pregunta={confirmacion} onCerrar={() => setConfirmacion(null)} />

      {comentariosDe && (
        <Modal title={`Comentarios — ${comentariosDe.descripcion}`} onClose={() => setComentariosDe(null)}>
          <Bitacora data={data} entidadTipo="pendientes" entidadId={comentariosDe.id} onAdd={onAddComentario} onRemove={onRemoveComentario} />
        </Modal>
      )}

      {modal && (
        <Modal title={modal.item.id ? "Editar tarea" : modal.item.parentId ? "Nueva subtarea" : "Nueva tarea"} onClose={() => setModal(null)}>
          <PendienteForm item={modal.item} proyectos={data.proyectos} contactos={data.contactos} pendientes={data.pendientes} colaboradores={colaboradores}
            onCrearContacto={(nombre, tipos) => onCrearContacto(nombre, tipos || ["Colaborador"])}
            onCrearProyecto={onCrearProyecto}
            onEnviarInvitacion={onEnviarInvitacion}
            onAceptarEnNombre={onAceptarEnNombre}
            onSave={(v, enviarCorreo) => {
              if (modal.item.id) {
                onEdit(modal.item.id, v);
                // Si cambió de proyecto (directo, o porque ahora es subtarea de otra tarea en otro proyecto),
                // arrastra el cambio a todas sus propias subtareas para que nunca queden en un proyecto distinto.
                if (v.proyectoId !== modal.item.proyectoId) {
                  const hijosIds = descendientesDe(modal.item.id, data.pendientes);
                  hijosIds.forEach((hid) => onEdit(hid, { proyectoId: v.proyectoId }));
                }
                if (v.asignadoA && v.asignadoA !== modal.item.asignadoA) onAsignar(modal.item.id);
              } else {
                const nuevoId = uid();
                onAdd({ ...v, id: nuevoId });
                if (v.asignadoA) onAsignar(nuevoId);
                if (enviarCorreo) onEnviarInvitacion(nuevoId);
              }
              setModal(null);
            }}
          />
        </Modal>
      )}
    </div>
  );
}

// Ficha de la tarea: el panel que abre a la derecha al tocar un renglón en Tareas (pedido de
// Angel, 29 sept 2026). Solo consulta y deja hacer las dos cosas que se hacen a diario sin abrir
// el formulario completo: mover el porcentaje de avance y cambiar el estatus. Lo demás son
// atajos a lo que ya existe (editar, subtarea, comentarios, eliminar).
function FichaTarea({ t, data, onCerrar, onEditar, onAgregarSubtarea, onComentarios, onEliminar, onCambiarAvance, onCambiarEstatus, nComentarios }) {
  // El avance y el estatus se editan en un borrador: mover la barra ya no escribe en la base.
  // Se guardan al dar Guardar, y si intentas salir con cambios la app pregunta antes.
  const { borrador, cambiar, descartar, sucio } = useBorrador({
    avance: t.avance ?? "", estatus: t.estatus,
  });
  const guardar = () => {
    if (borrador.avance !== (t.avance ?? "")) onCambiarAvance(borrador.avance === "" ? null : Number(borrador.avance));
    // Completar pasa por su propia confirmación (fecha, subtareas abiertas): se delega al mismo
    // camino de siempre en vez de escribir el estatus a mano desde aquí.
    if (borrador.estatus !== t.estatus) onCambiarEstatus(borrador.estatus);
  };
  const subtareas = (data.pendientes || []).filter((x) => x.parentId === t.id);
  const tieneHijos = subtareas.length > 0;
  // Con subtareas el avance NO se teclea: es la ponderación de los hijos. Teclearlo encima sería
  // tener dos verdades para el mismo número.
  const avance = Math.round(calcAvanceTarea(buildTareaTree((data.pendientes || []).filter((x) => x.id === t.id || descendientesDe(t.id, data.pendientes).includes(x.id)))[0] || t));
  const hecha = t.estatus === "Completada";
  const vencida = !hecha && t.fechaLimite && daysUntil(t.fechaLimite) < 0;
  // Lo que se está viendo en la barra: el borrador si se movió, y si no el calculado.
  const avanceEditable = borrador.avance === "" || borrador.avance === null || borrador.avance === undefined
    ? avance : Number(borrador.avance);
  const colorAvance = avanceEditable >= 100 ? "var(--teal)" : avanceEditable >= 50 ? "#087CF5" : "var(--gold)";
  const nombreDe = (lista, id, vacio = "—") => (lista || []).find((x) => x.id === id)?.nombre || vacio;
  const padre = t.parentId ? (data.pendientes || []).find((x) => x.id === t.parentId) : null;

  const Dato = ({ label, valor, color }) => (
    valor ? (
      <div className="flex items-start justify-between gap-3 py-1.5">
        <span className="text-xs gp-text-muted shrink-0">{label}</span>
        <span className="text-xs text-right" style={color ? { color } : undefined}>{valor}</span>
      </div>
    ) : null
  );

  return (
    <div className="gp-panel p-4">
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="min-w-0">
          <p className="text-[10px] uppercase tracking-wide gp-text-muted">{padre ? "Subtarea" : "Tarea"}</p>
          <p className="gp-serif text-base leading-tight break-words" style={hecha ? { textDecoration: "line-through" } : undefined}>{t.descripcion}</p>
          {padre && <p className="text-xs gp-text-muted mt-1">de: {padre.descripcion}</p>}
        </div>
        <IconBtn title="Cerrar" onClick={() => { if (confirmarDescartarCambios()) onCerrar(); }}><X size={15} /></IconBtn>
      </div>

      <div className="gp-bloque rounded-lg p-3 mb-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs gp-text-muted">Avance</span>
          <span className="gp-mono text-sm" style={{ color: colorAvance }}>{avanceEditable}%</span>
        </div>
        {tieneHijos ? (
          <>
            <div className="h-2.5 rounded-full mb-2" style={{ background: "var(--border)" }}>
              <div className="h-2.5 rounded-full" style={{ width: `${avance}%`, background: colorAvance }} />
            </div>
            <p className="text-[10px] gp-text-muted">Se calcula solo: es el promedio del avance de sus {subtareas.length} subtarea{subtareas.length === 1 ? "" : "s"}.</p>
          </>
        ) : (
          /* Una sola barra: la misma que muestra el porcentaje es la que se arrastra, y se tiñe
             según cuánto lleve. Tener dos (una de progreso y un deslizador aparte) hacía creer
             que eran cosas distintas. */
          <div className="flex items-center gap-2.5">
            <input
              type="range" min={0} max={100} step={5} className="gp-rango flex-1"
              value={avanceEditable}
              onChange={(e) => cambiar({ avance: Number(e.target.value) })}
              aria-label="Porcentaje de avance"
              style={{
                color: colorAvance,
                background: `linear-gradient(to right, ${colorAvance} 0%, ${colorAvance} ${avanceEditable}%, var(--border) ${avanceEditable}%, var(--border) 100%)`,
              }}
            />
            <input
              type="number" min={0} max={100} className="gp-input" style={{ width: 68 }}
              value={borrador.avance ?? ""} placeholder={String(avance)}
              onChange={(e) => cambiar({ avance: e.target.value === "" ? "" : Math.max(0, Math.min(100, Number(e.target.value))) })}
            />
          </div>
        )}
      </div>

      <div className="mb-3">
        <span className="text-xs gp-text-muted">Estatus</span>
        <select className="gp-input mt-1" value={borrador.estatus} onChange={(e) => cambiar({ estatus: e.target.value })}>
          {ESTATUS_TAREA.map((x) => <option key={x}>{x}</option>)}
        </select>
      </div>

      <BarraGuardar sucio={sucio} onGuardar={guardar} onDescartar={descartar} />

      <div className="flex flex-col gap-0.5 mb-3">
        <Dato label="Proyecto" valor={nombreDe(data.proyectos, t.proyectoId, "")} />
        <Dato label="Cliente" valor={nombreDe(data.contactos, t.contactoId, "")} />
        <Dato label="Responsable" valor={t.colaboradorContactoId ? nombreDe(data.contactos, t.colaboradorContactoId) : "Tú"} />
        <Dato label="Prioridad" valor={t.prioridad} />
        <Dato label="Fecha límite" valor={t.fechaLimite} color={vencida ? "var(--red)" : undefined} />
        <Dato label="Programada" valor={t.fechaProgramada ? `${t.fechaProgramada}${t.horaInicio ? ` ${t.horaInicio}` : ""}` : ""} />
        <Dato label="Revisión" valor={t.fechaRevision} />
        <Dato label="Horas" valor={t.tiempoEstimado ? `${t.tiempoEstimado}h estimadas${t.tiempoReal ? ` · ${t.tiempoReal}h reales` : ""}` : ""} />
        <Dato label="Precio" valor={t.precio ? fmtMoney(t.precio) : ""} />
        <Dato label="Completada" valor={t.completadaEn ? fmtFechaCompletado(t.completadaEn) : ""} color="var(--teal)" />
      </div>

      {tieneHijos && (
        <div className="mb-3">
          <p className="text-[10px] uppercase tracking-wide gp-text-muted mb-1.5">Subtareas ({subtareas.length})</p>
          <div className="flex flex-col gap-1">
            {subtareas.map((h) => (
              <div key={h.id} className="flex items-center justify-between gap-2 text-xs">
                <span className="truncate" style={h.estatus === "Completada" ? { textDecoration: "line-through", color: "var(--muted)" } : undefined}>{h.descripcion}</span>
                <span className="gp-mono gp-text-muted shrink-0">{h.estatus === "Completada" ? "100%" : `${h.avance ?? 0}%`}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-2">
        <button onClick={onEditar} className="gp-btn-ghost py-2 text-xs rounded flex items-center justify-center gap-1.5"><Pencil size={13} /> Editar</button>
        <button onClick={onAgregarSubtarea} className="gp-btn-ghost py-2 text-xs rounded flex items-center justify-center gap-1.5"><Plus size={13} /> Subtarea</button>
        <button onClick={onComentarios} className="gp-btn-ghost py-2 text-xs rounded flex items-center justify-center gap-1.5"><MessageCircle size={13} /> Comentarios{nComentarios > 0 ? ` (${nComentarios})` : ""}</button>
        <button onClick={onEliminar} className="gp-btn-ghost py-2 text-xs rounded flex items-center justify-center gap-1.5 gp-text-red"><Trash2 size={13} /> Eliminar</button>
      </div>
    </div>
  );
}

function PendienteForm({ item, proyectos, contactos, pendientes, colaboradores, onCrearContacto, onCrearProyecto, onEnviarInvitacion, onAceptarEnNombre, onSave, proyectoFijoId }) {
  const [v, setV] = useState({ ...item, colaboradorContactoId: item.colaboradorContactoId || null, fechaPagoAprox: item.fechaPagoAprox || "" });
  const [error, setError] = useState("");
  const [enviarCorreo, setEnviarCorreo] = useState(!item.id);
  const [enviando, setEnviando] = useState(false);
  const excluidos = item.id ? [item.id, ...descendientesDe(item.id, pendientes)] : [];
  // Si el proyecto está fijo (venimos desde el detalle de un proyecto), solo se puede elegir
  // como tarea principal a otra tarea de ESE mismo proyecto — no tiene sentido anidar entre proyectos distintos.
  const opcionesParent = pendientes.filter((t) => !excluidos.includes(t.id) && (!proyectoFijoId || t.proyectoId === proyectoFijoId));

  // Si es subtarea de algo, el proyecto se hereda de la tarea principal — no se elige aparte.
  // Esto se sincroniza cada vez que cambias de qué tarea es subtarea (por si eliges otra tarea principal).
  useEffect(() => {
    if (v.parentId) {
      const padre = pendientes.find((t) => t.id === v.parentId);
      if (padre && padre.proyectoId !== v.proyectoId) setV((prev) => ({ ...prev, proyectoId: padre.proyectoId }));
    }
  }, [v.parentId]);

  const proyectoHeredado = v.parentId ? proyectos.find((p) => p.id === v.proyectoId) : null;
  const proyectoFijo = proyectoFijoId ? proyectos.find((p) => p.id === proyectoFijoId) : null;
  const colaboradorElegido = v.colaboradorContactoId ? contactos.find((c) => c.id === v.colaboradorContactoId) : null;
  const clienteElegido = v.contactoId ? (contactos || []).find((c) => c.id === v.contactoId) : null;
  const proyectoElegido = v.proyectoId ? (proyectos || []).find((x) => x.id === v.proyectoId) : null;
  const porNombre = (a, b) => (a.nombre || "").localeCompare(b.nombre || "", "es", { sensitivity: "base" });
  const contactosOrdenados = useMemo(() => [...(contactos || [])].sort(porNombre), [contactos]);
  const proyectosOrdenados = useMemo(() => [...(proyectos || [])].sort(porNombre), [proyectos]);

  return (
    <div>
      <Field label="Descripción"><input className="gp-input" value={v.descripcion} onChange={(e) => setV({ ...v, descripcion: e.target.value })} /></Field>
      <Field label="Es subtarea de (opcional)">
        <select className="gp-input" value={v.parentId || ""} onChange={(e) => setV({ ...v, parentId: e.target.value })}>
          <option value="">— tarea principal —</option>
          {ordenadosPor(opcionesParent, (t) => t.descripcion).map((t) => <option key={t.id} value={t.id}>{t.descripcion}</option>)}
        </select>
      </Field>
      <Field label="Proyecto">
        {proyectoFijoId ? (
          <div>
            <input className="gp-input" disabled value={proyectoFijo ? proyectoFijo.nombre : "—"} style={{ opacity: 0.7 }} />
            <p className="text-xs gp-text-muted mt-1">Estás creando este pendiente desde el detalle de este proyecto, así que no se puede cambiar aquí.</p>
          </div>
        ) : v.parentId ? (
          <div>
            <input className="gp-input" disabled value={proyectoHeredado ? proyectoHeredado.nombre : "— sin proyecto —"} style={{ opacity: 0.7 }} />
            <p className="text-xs gp-text-muted mt-1">Hereda el proyecto de su tarea principal. Si necesitas cambiarlo, cambia el proyecto de esa tarea principal.</p>
          </div>
        ) : (
          /* Buscador en vez de lista larga, y si el proyecto no existe todavía se crea desde aquí
             mismo (pedido de Angel, 29 sept 2026): el proyecto queda creado de verdad en Proyectos
             e ideas, como Idea, y luego se le completan los detalles allá. */
          <ComboboxMultiBuscar
            max={1}
            seleccionados={proyectoElegido ? [{ id: proyectoElegido.id, label: proyectoElegido.nombre }] : []}
            opciones={proyectosOrdenados.map((x) => ({ id: x.id, label: x.nombre }))}
            onAgregar={(o) => setV({ ...v, proyectoId: o.id })}
            onQuitar={() => setV({ ...v, proyectoId: "" })}
            onCrear={onCrearProyecto ? (nombre) => setV({ ...v, proyectoId: onCrearProyecto(nombre) }) : undefined}
            placeholder="Buscar proyecto… (opcional)"
            crearLabel={(t) => `Crear proyecto "${t}"`}
          />
        )}
      </Field>
      <Field label="Cliente (a quién se le entrega)">
        <ComboboxMultiBuscar
          max={1}
          seleccionados={clienteElegido ? [{ id: clienteElegido.id, label: clienteElegido.nombre }] : []}
          opciones={contactosOrdenados.map((c) => ({ id: c.id, label: c.nombre }))}
          onAgregar={(o) => setV({ ...v, contactoId: o.id })}
          onQuitar={() => setV({ ...v, contactoId: "" })}
          onCrear={onCrearContacto ? (nombre) => setV({ ...v, contactoId: onCrearContacto(nombre, ["Cliente"]) }) : undefined}
          placeholder="Buscar cliente… (opcional)"
          crearLabel={(t) => `Crear contacto "${t}"`}
        />
      </Field>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="Fecha límite"><input type="date" className="gp-input" value={v.fechaLimite} onChange={(e) => setV({ ...v, fechaLimite: e.target.value })} /></Field>
        <Field label="Prioridad"><select className="gp-input" value={v.prioridad} onChange={(e) => setV({ ...v, prioridad: e.target.value })}>{PRIORIDADES.map((c) => <option key={c}>{c}</option>)}</select></Field>
      </div>
      <Field label="Fecha de revisión (opcional)"><input type="date" className="gp-input" value={v.fechaRevision || ""} onChange={(e) => setV({ ...v, fechaRevision: e.target.value })} /></Field>

      {/* Cuándo la vas a HACER, que no es lo mismo que para cuándo debe estar lista (migración
          20261002). Normalmente esto se llena arrastrando la tarea en la Agenda; aquí está para
          poder verlo y corregirlo sin salir del formulario. Sin día programado, la tarea vive en
          la franja "Tareas del día" de la Agenda en vez de ocupar una hora del horario. */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="Día en que la harás (opcional)">
          <input type="date" className="gp-input" value={v.fechaProgramada || ""}
            onChange={(e) => setV({ ...v, fechaProgramada: e.target.value, horaInicio: e.target.value ? v.horaInicio : "" })} />
        </Field>
        <Field label="Hora de inicio (opcional)">
          <input type="time" className="gp-input" value={v.horaInicio || ""} disabled={!v.fechaProgramada}
            onChange={(e) => setV({ ...v, horaInicio: e.target.value })} />
        </Field>
      </div>

      <Field label="Colaborador (opcional — se le puede pagar y le llega correo para aceptar)">
        <ComboboxMultiBuscar
          max={1}
          seleccionados={colaboradorElegido ? [{ id: colaboradorElegido.id, label: colaboradorElegido.nombre }] : []}
          opciones={contactos.map((c) => ({ id: c.id, label: c.nombre }))}
          onAgregar={(o) => setV({ ...v, colaboradorContactoId: o.id })}
          onQuitar={() => setV({ ...v, colaboradorContactoId: null })}
          onCrear={(nombre) => setV({ ...v, colaboradorContactoId: onCrearContacto(nombre, ["Colaborador"]) })}
          placeholder="Buscar o agregar colaborador…"
          crearLabel={(texto) => `Crear contacto "${texto}"`}
        />
      </Field>

      {colaboradorElegido && (
        <div className="gp-panel-hi p-3 mb-3 text-xs" style={{ border: "1px solid var(--border)", borderRadius: 6 }}>
          {!colaboradorElegido.correo ? (
            <p className="gp-text-gold">Este contacto no tiene correo — agrégaselo desde Contactos para poder enviarle la invitación.</p>
          ) : !item.id ? (
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={enviarCorreo} onChange={(e) => setEnviarCorreo(e.target.checked)} />
              Enviarle un correo a {colaboradorElegido.correo} en cuanto guarde, para que acepte o rechace esta tarea
            </label>
          ) : !v.estadoAceptacion ? (
            <div className="flex items-center justify-between gap-2">
              <span className="gp-text-muted">Aún no se le ha avisado.</span>
              <button type="button" disabled={enviando} className="gp-btn-ghost px-2.5 py-1 rounded" onClick={async () => { setEnviando(true); await onEnviarInvitacion(item.id); setEnviando(false); }}>
                {enviando ? "Enviando…" : "Enviar invitación por correo"}
              </button>
            </div>
          ) : v.estadoAceptacion === "pendiente" ? (
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <Badge tone="gold">Esperando que {colaboradorElegido.nombre} confirme</Badge>
              <button type="button" className="gp-btn-ghost px-2.5 py-1 rounded" onClick={() => onAceptarEnNombre(item.id)}>Aceptar en su nombre</button>
            </div>
          ) : v.estadoAceptacion === "aceptada" ? (
            <Badge tone="teal">Aceptada{v.aceptadaPorCreador ? " (por ti, en su nombre)" : ""}</Badge>
          ) : (
            <Badge tone="red">Rechazada</Badge>
          )}
        </div>
      )}

      {colaboradores && colaboradores.length > 0 && (
        <Field label="Asignar a colaborador ARKEYONE (opcional — le llega notificación push)">
          <select className="gp-input" value={v.asignadoA || ""} onChange={(e) => setV({ ...v, asignadoA: e.target.value })}>
            <option value="">— sin asignar —</option>
            {ordenadosPor(colaboradores, (c) => c.colaborador_email).map((c) => <option key={c.colaborador_user_id} value={c.colaborador_user_id}>{c.colaborador_email}</option>)}
          </select>
        </Field>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="Precio pactado (si es delegado)"><MoneyInput className="gp-input" value={v.precio} onChange={(val) => setV({ ...v, precio: val })} /></Field>
        <Field label="Fecha aprox. de pago (opcional)"><input type="date" className="gp-input" value={v.fechaPagoAprox} onChange={(e) => setV({ ...v, fechaPagoAprox: e.target.value })} /></Field>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="Tiempo estimado (horas)"><input type="number" className="gp-input" value={v.tiempoEstimado} onChange={(e) => setV({ ...v, tiempoEstimado: e.target.value })} /></Field>
        <Field label="Tiempo real (horas, cuando termine)"><input type="number" className="gp-input" value={v.tiempoReal} onChange={(e) => setV({ ...v, tiempoReal: e.target.value })} /></Field>
      </div>
      {/* El % de avance se puede poner aquí, en la ficha de la derecha de Tareas o en el árbol del
          centro de proyecto — es el mismo campo. Si la tarea tiene subtareas, este número se
          ignora: ahí el avance es la ponderación de los hijos, para no tener dos verdades. */}
      <Field label="Avance (%, opcional — se ignora si la tarea tiene subtareas)">
        <input type="number" min={0} max={100} className="gp-input" value={v.avance ?? ""} placeholder="0"
          onChange={(e) => setV({ ...v, avance: e.target.value === "" ? "" : Math.max(0, Math.min(100, Number(e.target.value))) })} />
      </Field>
      {error && <p className="text-xs gp-text-red mb-2">{error}</p>}

      <button
        className="gp-btn w-full py-2 text-sm mt-2"
        onClick={() => {
          if (!v.descripcion?.toString().trim()) { setError("La descripción del pendiente es obligatoria."); return; }
          setError("");
          onSave(v, !item.id && colaboradorElegido && colaboradorElegido.correo ? enviarCorreo : false);
        }}
      >
        Guardar
      </button>
    </div>
  );
}

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
// los demás hijos reusan las que les toquen en su propio encabezado. Cualquier cambio en cómo se
// calcula el dinero se hace aquí y los siete quedan consistentes.
function cifrasFinanzas(finanzas, desde, hasta) {
  const dentro = (f) => (!desde || (f.fecha || "") >= desde) && (!hasta || (f.fecha || "") <= hasta);
  const enRango = (finanzas || []).filter(dentro);
  const suma = (lista) => lista.reduce((t, f) => t + montoBaseDe(f), 0);

  const ingresos = enRango.filter((f) => f.tipo === "Ingreso");
  const egresos = enRango.filter((f) => f.tipo === "Egreso");
  const ingresosTotal = suma(ingresos);
  const egresosTotal = suma(egresos);
  const egresosColaboradores = suma(egresos.filter((f) => f.categoria === "Pago a colaborador"));
  const egresosProyecto = suma(egresos.filter((f) => f.proyectoId && f.categoria !== "Pago a colaborador"));

  // El saldo son los movimientos ya liquidados; lo pendiente va aparte, en el proyectado.
  const enCuentas = suma(ingresos.filter((f) => f.estatus === "Cobrado")) - suma(egresos.filter((f) => f.estatus === "Cobrado"));
  const porCobrar = suma(ingresos.filter((f) => f.estatus !== "Cobrado"));
  const porPagar = suma(egresos.filter((f) => f.estatus !== "Cobrado"));

  return {
    enRango, ingresos, egresos, suma,
    ingresosTotal, egresosTotal,
    ingresosDeCliente: suma(ingresos.filter((f) => f.contactoId)),
    egresosColaboradores, egresosProyecto,
    egresosGenerales: egresosTotal - egresosColaboradores - egresosProyecto,
    enCuentas, porCobrar, porPagar,
    proyectado: enCuentas + porCobrar - porPagar,
  };
}

// Encabezado común de los hijos de Finanzas: migaja, título, para qué sirve la pantalla, selector
// de periodo y los botones de la derecha. Está aquí para que los siete se vean como el mismo
// módulo y no como siete pantallas que alguien pegó una junto a otra.
function CabeceraFinanzas({ seccion, titulo, icono, subtitulo, rango, onRango, acciones }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
      <div className="min-w-0">
        <p className="text-[11px] gp-text-muted">Finanzas · {seccion}</p>
        <h2 className="gp-serif text-2xl flex items-center gap-2">{icono} {titulo}</h2>
        {subtitulo && <p className="text-sm gp-text-muted">{subtitulo}</p>}
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        {onRango && (
          <select className="gp-input text-xs py-1.5" style={{ width: "auto" }} value={rango} onChange={(e) => onRango(e.target.value)} aria-label="Periodo">
            {RANGOS_MOVIMIENTOS.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}
          </select>
        )}
        {acciones}
      </div>
    </div>
  );
}

// Días de atraso (positivo) o que faltan (negativo) para una fecha de vencimiento, con su texto
// ya resuelto. Lo usan Por cobrar y Por pagar, que son las dos pantallas donde el atraso importa.
function vencimientoDe(f) {
  const fecha = f.fechaVencimiento || f.fecha || "";
  if (!fecha) return { fecha: "", dias: null, texto: "Sin fecha", vencido: false };
  const dias = -daysUntil(fecha);
  if (dias > 0) return { fecha, dias, texto: `${dias} día${dias === 1 ? "" : "s"} de atraso`, vencido: true };
  if (dias === 0) return { fecha, dias, texto: "Vence hoy", vencido: true };
  return { fecha, dias, texto: `Faltan ${-dias} día${dias === -1 ? "" : "s"}`, vencido: false };
}

// Cubetas de antigüedad. Un saldo de hace tres meses no es lo mismo que uno de la semana pasada,
// y es la primera cosa que se quiere ver en una lista de cobros.
// Las cuatro parten el total sin huecos ni traslapes, y "vencido" es el MISMO criterio que usa
// vencimientoDe() — si no, la tarjeta de "Vencido" y el chip de "Vencido" darían números
// distintos por lo que vence hoy, que es un caso que cae justo en la frontera.
const CUBETAS_ANTIGUEDAD = [
  { id: "vencido", label: "Vencido", test: (v) => v.vencido },
  { id: "semana", label: "Esta semana", test: (v) => !v.vencido && v.dias !== null && v.dias >= -7 },
  { id: "mes", label: "Este mes", test: (v) => !v.vencido && v.dias !== null && v.dias < -7 && v.dias >= -30 },
  { id: "despues", label: "Más adelante", test: (v) => v.dias === null || (!v.vencido && v.dias < -30) },
];
// Rangos de fecha del encabezado de Movimientos. "Este mes" es el de siempre; los demás están
// para revisar un periodo cerrado sin tener que filtrar a mano.
const RANGOS_MOVIMIENTOS = [
  { id: "mes", label: "Este mes" },
  { id: "mesAnterior", label: "Mes anterior" },
  { id: "trimestre", label: "Últimos 3 meses" },
  { id: "anio", label: "Este año" },
  { id: "todo", label: "Todo" },
];
function rangoFechas(id) {
  const hoy = new Date();
  const iso = (d) => dateStr(d);
  const primeroDeMes = (a, m) => new Date(a, m, 1);
  const ultimoDeMes = (a, m) => new Date(a, m + 1, 0);
  const a = hoy.getFullYear(), m = hoy.getMonth();
  if (id === "mesAnterior") return { desde: iso(primeroDeMes(a, m - 1)), hasta: iso(ultimoDeMes(a, m - 1)) };
  if (id === "trimestre") return { desde: iso(primeroDeMes(a, m - 2)), hasta: iso(ultimoDeMes(a, m)) };
  if (id === "anio") return { desde: `${a}-01-01`, hasta: `${a}-12-31` };
  if (id === "todo") return { desde: "", hasta: "" };
  return { desde: iso(primeroDeMes(a, m)), hasta: iso(ultimoDeMes(a, m)) };
}
// El mismo rango, corrido un periodo hacia atrás: es contra lo que se compara cada tarjeta.
function rangoAnterior(id) {
  const hoy = new Date();
  const a = hoy.getFullYear(), m = hoy.getMonth();
  const iso = (d) => dateStr(d);
  const p = (y, mm) => new Date(y, mm, 1), u = (y, mm) => new Date(y, mm + 1, 0);
  if (id === "mes") return { desde: iso(p(a, m - 1)), hasta: iso(u(a, m - 1)) };
  if (id === "mesAnterior") return { desde: iso(p(a, m - 2)), hasta: iso(u(a, m - 2)) };
  if (id === "trimestre") return { desde: iso(p(a, m - 5)), hasta: iso(u(a, m - 3)) };
  if (id === "anio") return { desde: `${a - 1}-01-01`, hasta: `${a - 1}-12-31` };
  return { desde: "", hasta: "" };
}

// Encabezado de bloque: icono en su color + título. Todas las secciones de Movimientos lo usan,
// para que el ojo distinga una tarjeta de otra sin leer el texto.
function TituloBloque({ icono, color, children, derecha }) {
  return (
    <div className="flex items-center gap-2 mb-2">
      <span className="shrink-0 inline-flex" style={color ? { color } : undefined}>{icono}</span>
      <p className="text-xs font-medium flex-1 min-w-0 truncate">{children}</p>
      {derecha}
    </div>
  );
}

// Tarjeta de resumen con su variación contra el periodo anterior y el desglose de qué la compone.
// El icono va en una placa redondeada con el tinte de su propio color (el verde del ingreso, el
// rojo del egreso): el tinte se pasa explícito en lugar de calcularlo con color-mix, que no todos
// los navegadores del iPhone soportan todavía.
function TarjetaResumenFin({ etiqueta, valor, color, tinte, icono, variacion, filas, destacada }) {
  return (
    <div className={destacada ? "gp-bloque rounded-xl p-3.5" : "gp-panel p-3.5"} style={destacada ? { borderLeft: "3px solid var(--violeta, #8B5CF6)" } : undefined}>
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-medium">{etiqueta}</p>
        <span
          className="shrink-0 inline-flex items-center justify-center rounded-lg"
          style={{ color, background: tinte || "var(--panel-2)", width: 30, height: 30 }}
        >
          {icono}
        </span>
      </div>
      <p className="gp-serif text-2xl mt-1" style={{ color }}>{fmtMoney(valor)}</p>
      {variacion !== null && variacion !== undefined && (
        <p className="text-[11px] mt-0.5" style={{ color: variacion >= 0 ? "var(--teal)" : "var(--red)" }}>
          {variacion >= 0 ? "↑" : "↓"} {Math.abs(variacion)}% vs. periodo anterior
        </p>
      )}
      {filas?.length > 0 && (
        <div className="flex flex-col gap-0.5 mt-2.5 pt-2.5 border-t gp-border">
          {filas.map((f) => (
            <div key={f.label} className="flex items-center justify-between gap-2 text-[11px]">
              <span className="gp-text-muted truncate">{f.label}</span>
              <span className="gp-mono shrink-0" style={f.color ? { color: f.color } : undefined}>{fmtMoney(f.valor)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Los dos mundos del dinero, y dentro de cada uno sus estados. Esta es la estructura que pidió
// Angel el 4 oct 2026, y está escrita como una sola constante a propósito: el nombre que ve el
// usuario, el filtro que aplica y la palabra con que se lee el estado salen todos de aquí, así que
// no pueden decir una cosa en la pestaña y otra en la columna.
//
// Ojo con "Cobrado": en la base es el único valor que significa "ya se liquidó", para las dos
// direcciones del dinero. En un ingreso se lee "Cobrado" y en un egreso "Pagado" — misma fila en
// la tabla, palabra distinta en la pantalla.
const GRUPOS_MOVIMIENTOS = [
  {
    id: "ingresos",
    label: "Ingresos",
    ayuda: "Dinero que entra",
    icono: ArrowDownCircle,
    color: "var(--teal)",
    tinte: "rgba(22,163,106,.14)",
    base: (f) => f.tipo === "Ingreso",
    etiquetasEstado: { Cobrado: "Cobrado", Pendiente: "Por cobrar", Parcial: "Parcial" },
    subs: [
      { id: "todos", label: "Todos", test: () => true },
      { id: "cobrados", label: "Ya cobrados", test: (f) => f.estatus === "Cobrado" },
      { id: "cobrar", label: "Por cobrar", test: (f) => f.estatus !== "Cobrado", pendiente: true },
    ],
  },
  {
    id: "egresos",
    label: "Egresos",
    ayuda: "Dinero que sale",
    icono: ArrowUpCircle,
    color: "var(--red)",
    tinte: "rgba(229,72,77,.14)",
    base: (f) => f.tipo === "Egreso",
    etiquetasEstado: { Cobrado: "Pagado", Pendiente: "Por pagar", Parcial: "Parcial" },
    subs: [
      { id: "todos", label: "Todos", test: () => true },
      { id: "pagados", label: "Ya pagados", test: (f) => f.estatus === "Cobrado" },
      { id: "pagar", label: "Por pagar", test: (f) => f.estatus !== "Cobrado", pendiente: true },
      // Las deudas son egresos con categoría "Deuda" — las crea así el módulo Deudas. No es otra
      // tabla ni otro concepto: es por dónde entraron.
      { id: "deudas", label: "Deudas", test: (f) => f.categoria === "Deuda" },
    ],
  },
  {
    id: "todos",
    label: "Todos",
    ayuda: "Entra y sale, junto",
    icono: ListChecks,
    color: "var(--gold)",
    tinte: "rgba(212,175,55,.16)",
    base: () => true,
    etiquetasEstado: { Cobrado: "Liquidado", Pendiente: "Pendiente", Parcial: "Parcial" },
    subs: [
      { id: "todos", label: "Todos", test: () => true },
      { id: "liquidados", label: "Ya liquidados", test: (f) => f.estatus === "Cobrado" },
      { id: "pendientes", label: "Pendientes", test: (f) => f.estatus !== "Cobrado", pendiente: true },
    ],
  },
];

// Totales de lo que está seleccionado en el grid: cuánto es, cuánto ya se liquidó y cuánto falta.
// Va pegado arriba de la tabla porque la pregunta "¿y de esto cuánto ya cobré?" aparece justo al
// cambiar de pestaña, no al entrar a la pantalla.
function TotalesSeleccion({ titulo, total, liquidado, pendiente, etiquetaLiquidado, extra }) {
  const pct = total > 0 ? Math.round((liquidado / total) * 100) : 0;
  return (
    <div className="gp-bloque rounded-xl p-3 mb-2 flex flex-wrap items-center gap-x-6 gap-y-2">
      <div>
        <p className="text-[10px] gp-text-muted uppercase" style={{ letterSpacing: ".05em" }}>{titulo}</p>
        <p className="gp-serif text-xl">{fmtMoney(total)}</p>
      </div>
      <div>
        <p className="text-[10px] gp-text-muted uppercase" style={{ letterSpacing: ".05em" }}>{etiquetaLiquidado}</p>
        <p className="gp-serif text-xl gp-text-teal">{fmtMoney(liquidado)}</p>
      </div>
      <div>
        <p className="text-[10px] gp-text-muted uppercase" style={{ letterSpacing: ".05em" }}>Falta</p>
        <p className="gp-serif text-xl" style={{ color: pendiente > 0 ? "var(--gold)" : "var(--muted)" }}>{fmtMoney(pendiente)}</p>
      </div>
      {extra}
      <div className="flex-1 min-w-[140px]">
        <div className="rounded-full overflow-hidden" style={{ height: 6, background: "var(--panel)" }}>
          <div style={{ width: `${pct}%`, height: "100%", background: "var(--teal)" }} />
        </div>
        <p className="text-[10px] gp-text-muted mt-1">{pct}% de lo que estás viendo ya se liquidó</p>
      </div>
    </div>
  );
}

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
// Desde cualquier renglón pendiente se registra el pago o el cobro, parcial o total, con el mismo
// mecanismo de pagos_finanzas que usa Deudas: un abono hecho aquí es el mismo que se ve allá.
function FinanzasMovimientos({ data, onAdd, onEdit, onRemove, onAddPago, foco, onConsumirFoco, onIrAVista, crearAlEntrar, onConsumirCrearAlEntrar }) {
  const [modal, setModal] = useState(null); // { item } | { item, paso: "pagar" }
  const [importarAbierto, setImportarAbierto] = useState(false);
  const [grupoId, setGrupoId] = useState(foco?.grupo || "ingresos");
  const [subId, setSubId] = useState(foco?.sub || "todos");
  // Al entrar directo a lo pendiente el periodo arranca en "Todo": un adeudo de hace tres meses
  // sigue pendiente hoy, y recortarlo por mes lo esconde justo cuando se iba a ver.
  const [rango, setRango] = useState(foco?.sub === "cobrar" || foco?.sub === "pagar" ? "todo" : "mes");
  const [soloRecurrentes, setSoloRecurrentes] = useState(false);
  const [busqueda, setBusqueda] = useState("");
  const [filtroProyecto, setFiltroProyecto] = useState("Todos");
  const [filtroCategoria, setFiltroCategoria] = useState("Todas");
  const [orden, setOrden] = useState("fecha");
  const [ordenDir, setOrdenDir] = useState("desc");
  const [pagina, setPagina] = useState(1);
  const [porPagina, setPorPagina] = useState(100);

  const empty = { concepto: "", tipo: "Ingreso", proyectoId: "", contactoId: "", fecha: todayISO(), fechaVencimiento: "", monto: "", moneda: MONEDA_BASE, tipoCambio: 1, montoBase: "", categoria: "", forma: "Transferencia", estatus: "Cobrado", pautando: false, esRecurrente: false, frecuencia: "Mensual", fechaFin: "" };

  useEffect(() => {
    if (crearAlEntrar) { setModal({ item: { ...empty, ...(crearAlEntrar.preset || {}) } }); onConsumirCrearAlEntrar(); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [crearAlEntrar]);
  // El foco (de dónde venía el usuario) se consume una sola vez: ya quedó en el estado inicial.
  useEffect(() => { if (foco) onConsumirFoco?.(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  const nombreProyecto = (id) => data.proyectos.find((p) => p.id === id)?.nombre || "—";
  const nombreContacto = (id) => data.contactos.find((c) => c.id === id)?.nombre || "—";

  // Saldo real de un movimiento: su monto menos los abonos que ya tiene registrados.
  const yaAbonado = (id) => (data.pagosFinanzas || []).filter((p) => p.finanzasId === id).reduce((s, p) => s + (Number(p.monto) || 0), 0);
  const saldoDe = (f) => Math.max(0, montoBaseDe(f) - yaAbonado(f.id));

  const grupo = GRUPOS_MOVIMIENTOS.find((g) => g.id === grupoId) || GRUPOS_MOVIMIENTOS[0];
  const sub = grupo.subs.find((x) => x.id === subId) || grupo.subs[0];

  const { desde, hasta } = rangoFechas(rango);
  const { enRango } = cifrasFinanzas(data.finanzas, desde, hasta);
  const suma = (lista) => lista.reduce((t, f) => t + montoBaseDe(f), 0);

  // Al cambiar de mundo (ingresos <-> egresos) el estado vuelve a "Todos": "Deudas" no existe en
  // Ingresos, y dejar seleccionado un sub que el grupo nuevo no tiene mostraría una lista vacía
  // sin explicar por qué.
  const elegirGrupo = (g) => { setGrupoId(g.id); setSubId("todos"); setPagina(1); };
  const elegirSub = (x) => {
    setSubId(x.id);
    setPagina(1);
    if (x.pendiente) setRango("todo");
  };

  const delGrupo = enRango.filter(grupo.base);
  const filtrados = delGrupo
    .filter(sub.test)
    .filter((f) => !soloRecurrentes || f.esRecurrente)
    .filter((f) => filtroProyecto === "Todos" || f.proyectoId === filtroProyecto)
    .filter((f) => filtroCategoria === "Todas" || f.categoria === filtroCategoria);
  const buscados = filtrarPorBusqueda(filtrados, busqueda, [
    (f) => f.concepto, (f) => f.categoria, (f) => nombreProyecto(f.proyectoId),
    (f) => nombreContacto(f.contactoId), (f) => f.forma,
  ]);
  const camposOrden = {
    fecha: { get: (f) => f.fecha, tipo: "fecha" },
    vencimiento: { get: (f) => f.fechaVencimiento || f.fecha || "9999-12-31", tipo: "fecha" },
    monto: { get: (f) => montoBaseDe(f), tipo: "numero" },
    concepto: { get: (f) => f.concepto, tipo: "texto" },
  };
  const ordenados = ordenarLista(buscados, orden, camposOrden, ordenDir);
  const totalPaginas = Math.max(1, Math.ceil(ordenados.length / porPagina));
  const paginaActual = Math.min(pagina, totalPaginas);
  const inicio = (paginaActual - 1) * porPagina;
  const enPagina = ordenados.slice(inicio, inicio + porPagina);
  const toggleOrden = (key) => { if (orden === key) setOrdenDir((d) => (d === "asc" ? "desc" : "asc")); else { setOrden(key); setOrdenDir(key === "concepto" || key === "vencimiento" ? "asc" : "desc"); } };

  // --- Totales de lo que está a la vista ---
  const totalSel = suma(buscados);
  // Lo liquidado cuenta los abonos parciales, no solo los movimientos marcados como liquidados: un
  // movimiento de 10,000 con 4,000 abonados aporta 4,000, no 0 ni 10,000.
  const liquidadoSel = buscados.reduce((t, f) => t + (f.estatus === "Cobrado" ? montoBaseDe(f) : yaAbonado(f.id)), 0);
  const etiquetaLiquidado = grupo.id === "ingresos" ? "Ya cobrado" : grupo.id === "egresos" ? "Ya pagado" : "Ya liquidado";
  const mensualSel = soloRecurrentes
    ? buscados.reduce((t, f) => t + montoMensualizado(f) * (f.tipo === "Ingreso" ? 1 : -1), 0)
    : null;

  const verVencimiento = !!sub.pendiente || sub.id === "deudas";
  const verTipo = grupo.id === "todos";
  const categorias = [...new Set(delGrupo.map((f) => f.categoria).filter(Boolean))].sort((a, b) => compararEs(a, b));

  const columnasExport = [
    { label: "Fecha", get: (f) => f.fecha },
    { label: "Tipo", get: (f) => f.tipo },
    { label: "Descripción", get: (f) => f.concepto },
    { label: "Proyecto", get: (f) => (f.proyectoId ? nombreProyecto(f.proyectoId) : "") },
    { label: "Categoría", get: (f) => f.categoria },
    { label: "Cliente / Colaborador", get: (f) => (f.contactoId ? nombreContacto(f.contactoId) : "") },
    { label: "Forma de pago", get: (f) => f.forma },
    { label: "Vence", get: (f) => f.fechaVencimiento || "" },
    { label: "Moneda", get: (f) => f.moneda || MONEDA_BASE },
    { label: "Monto", get: (f) => f.monto },
    { label: `Monto en ${MONEDA_BASE}`, get: (f) => montoBaseDe(f) },
    { label: "Abonado", get: (f) => yaAbonado(f.id) },
    { label: "Falta", get: (f) => saldoDe(f) },
    { label: "Estado", get: (f) => grupo.etiquetasEstado[f.estatus] || f.estatus },
    { label: "Recurrente", get: (f) => (f.esRecurrente ? (f.frecuencia || "Sí") : "") },
    { label: "Próximo cargo", get: (f) => (f.esRecurrente ? (proximoCargoRecurrente(f) || "terminado") : "") },
  ];

  // Un movimiento nuevo arranca del lado en que está parado el usuario: en Egresos no tiene
  // sentido que el formulario abra en Ingreso.
  const nuevo = (preset) => setModal({ item: { ...empty, tipo: grupo.id === "egresos" ? "Egreso" : "Ingreso", ...preset } });

  // Registra un abono (parcial o total) y recalcula el estado: si el saldo llega a cero el
  // movimiento queda liquidado, si queda algo queda Parcial.
  const registrarAbono = async (f, { monto, fecha }) => {
    await onAddPago({ id: uid(), finanzasId: f.id, fecha, monto, comentario: "" });
    const restante = saldoDe(f) - monto;
    onEdit(f.id, { estatus: restante <= 0 ? "Cobrado" : "Parcial" });
    setModal(null);
  };

  return (
    <div>
      <CabeceraFinanzas
        seccion="Movimientos" titulo="Movimientos" icono={<ListChecks size={20} className="gp-text-gold" />}
        subtitulo="Todo el dinero que entra y sale. Elige un lado y, dentro, qué estado quieres ver."
        rango={rango} onRango={(v) => { setRango(v); setPagina(1); }}
        acciones={<>
          <button onClick={() => setImportarAbierto(true)} className="gp-btn-ghost px-3 py-1.5 text-xs rounded flex items-center gap-1.5"><Upload size={13} /> Importar</button>
          <button onClick={() => exportarFilasExcel(ordenados, columnasExport, "movimientos")} className="gp-btn-ghost px-3 py-1.5 text-xs rounded flex items-center gap-1.5"><Download size={13} /> Excel</button>
          <button onClick={() => exportarFilasPDF(ordenados, columnasExport, "movimientos", `${grupo.label} · ${sub.label}`, `${desde || "inicio"} a ${hasta || "hoy"}`)} className="gp-btn-ghost px-3 py-1.5 text-xs rounded flex items-center gap-1.5"><Download size={13} /> PDF</button>
          <button onClick={() => nuevo({})} className="gp-btn px-3 py-1.5 text-sm rounded flex items-center gap-1.5"><Plus size={14} /> Nuevo</button>
        </>}
      />

      {/* NIVEL 1 — de qué lado del dinero estamos */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 mb-2.5">
        {GRUPOS_MOVIMIENTOS.map((g) => {
          const propios = enRango.filter(g.base);
          const activo = g.id === grupoId;
          const Icono = g.icono;
          return (
            <button
              key={g.id} onClick={() => elegirGrupo(g)} aria-pressed={activo}
              className="gp-panel p-3 text-left flex items-center gap-3"
              style={activo
                ? { borderColor: g.color, boxShadow: `inset 0 0 0 1px ${g.color}`, background: g.tinte }
                : undefined}
            >
              <span className="shrink-0 inline-flex items-center justify-center rounded-lg"
                style={{ color: g.color, background: activo ? "var(--panel)" : g.tinte, width: 34, height: 34 }}>
                <Icono size={18} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium">{g.label}</span>
                <span className="block gp-serif text-xl" style={{ color: g.color }}>{fmtMoney(suma(propios))}</span>
                <span className="block text-[10px] gp-text-muted">{g.ayuda} · {propios.length} movimiento{propios.length === 1 ? "" : "s"}</span>
              </span>
            </button>
          );
        })}
      </div>

      {/* NIVEL 2 — qué estado, dentro del lado elegido */}
      <div className="flex items-center gap-1.5 flex-wrap mb-2.5">
        <span className="text-[11px] gp-text-muted mr-0.5">{grupo.label}:</span>
        {grupo.subs.map((x) => {
          const propios = delGrupo.filter(x.test);
          return (
            <button key={x.id} onClick={() => elegirSub(x)}
              title={x.pendiente ? `${x.label} — se muestra sin recortar por periodo` : x.label}
              className={`text-xs px-3 py-1.5 rounded-full border inline-flex items-center gap-1.5 ${subId === x.id ? "gp-btn" : "gp-btn-ghost"}`}>
              {x.label} <span className="gp-mono">{propios.length}</span>
              {propios.length > 0 && <span className="gp-text-muted">{fmtMoney(suma(propios))}</span>}
            </button>
          );
        })}
        {sub.id === "deudas" && (
          <button onClick={() => onIrAVista("deudas")} className="text-[11px] gp-text-gold flex items-center gap-1 ml-1">
            Ver con su historial de abonos <ArrowRight size={11} />
          </button>
        )}
      </div>

      {/* Filtros. No hay filtro de "estado": eso lo decide el renglón de arriba, y tenerlo dos
          veces hacía que una elección contradijera a la otra. */}
      <div className="flex flex-wrap items-center gap-2 mb-2">
        <div className="relative flex-1" style={{ minWidth: 180, maxWidth: 300 }}>
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 gp-text-muted" style={{ pointerEvents: "none" }} />
          <input className="gp-input gp-buscador text-sm" style={{ paddingLeft: 32 }} placeholder="Buscar movimientos…"
            value={busqueda} onChange={(e) => { setBusqueda(e.target.value); setPagina(1); }} />
        </div>
        <select className="gp-input text-xs py-1.5" style={{ width: "auto" }} value={filtroProyecto} onChange={(e) => { setFiltroProyecto(e.target.value); setPagina(1); }} aria-label="Proyecto">
          <option value="Todos">Proyecto: Todos</option>
          {ordenadosPorNombre(data.proyectos).map((pr) => <option key={pr.id} value={pr.id}>{pr.nombre}</option>)}
        </select>
        <select className="gp-input text-xs py-1.5" style={{ width: "auto" }} value={filtroCategoria} onChange={(e) => { setFiltroCategoria(e.target.value); setPagina(1); }} aria-label="Categoría">
          <option value="Todas">Categoría: Todas</option>
          {categorias.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <label className="flex items-center gap-1.5 text-[11px] gp-text-muted cursor-pointer" title="Solo lo que se repite solo: renta, suscripciones, renovaciones">
          <input type="checkbox" checked={soloRecurrentes} onChange={(e) => { setSoloRecurrentes(e.target.checked); setPagina(1); }} />
          Solo recurrentes
        </label>
      </div>

      <TotalesSeleccion
        titulo={`${grupo.label} · ${sub.label} · ${buscados.length} movimiento${buscados.length === 1 ? "" : "s"}`}
        total={totalSel} liquidado={liquidadoSel} pendiente={Math.max(0, totalSel - liquidadoSel)}
        etiquetaLiquidado={etiquetaLiquidado}
        extra={mensualSel !== null ? (
          <div>
            <p className="text-[10px] gp-text-muted uppercase" style={{ letterSpacing: ".05em" }}>Equivale al mes</p>
            <p className="gp-serif text-xl" style={{ color: mensualSel >= 0 ? "var(--teal)" : "var(--red)" }}>{fmtMoney(Math.round(mensualSel))}</p>
          </div>
        ) : null}
      />

      {/* Tabla */}
      <div className="gp-panel overflow-x-auto">
        <table className="gp-table">
          <thead>
            <tr>
              <Th label="Fecha" sortKey="fecha" orden={orden} ordenDir={ordenDir} onToggle={toggleOrden} />
              {verTipo && <th>Tipo</th>}
              <Th label="Descripción" sortKey="concepto" orden={orden} ordenDir={ordenDir} onToggle={toggleOrden} />
              <th className="hidden md:table-cell">Proyecto</th>
              <th className="hidden md:table-cell">Categoría</th>
              <th className="hidden lg:table-cell">{grupo.id === "ingresos" ? "Cliente" : grupo.id === "egresos" ? "A quién" : "Cliente / A quién"}</th>
              {verVencimiento && <Th label="Vence" sortKey="vencimiento" orden={orden} ordenDir={ordenDir} onToggle={toggleOrden} />}
              {verVencimiento && <th>Antigüedad</th>}
              {soloRecurrentes && <th>Frecuencia</th>}
              {soloRecurrentes && <th>Al mes</th>}
              {soloRecurrentes && <th>Próximo</th>}
              {!verVencimiento && !soloRecurrentes && <th className="hidden lg:table-cell">Forma de pago</th>}
              <Th label="Monto" sortKey="monto" orden={orden} ordenDir={ordenDir} onToggle={toggleOrden} />
              <th>Estado</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {enPagina.map((f) => {
              const abonado = yaAbonado(f.id);
              const saldo = saldoDe(f);
              const pendiente = f.estatus !== "Cobrado";
              const v = vencimientoDe(f);
              const esIngreso = f.tipo === "Ingreso";
              return (
                <tr key={f.id}>
                  <td className="gp-mono">{fmtFechaCorta(f.fecha)}</td>
                  {verTipo && (
                    <td>
                      <Badge tone={esIngreso ? "teal" : "red"}>{esIngreso ? "Ingreso" : "Egreso"}</Badge>
                    </td>
                  )}
                  <td style={{ maxWidth: 260 }}><span className="truncate block">{f.concepto}</span></td>
                  <td className="hidden md:table-cell gp-text-gold">{f.proyectoId ? nombreProyecto(f.proyectoId) : "—"}</td>
                  <td className="hidden md:table-cell gp-text-muted">{f.categoria || "—"}</td>
                  <td className="hidden lg:table-cell gp-text-muted">{f.contactoId ? nombreContacto(f.contactoId) : "—"}</td>
                  {verVencimiento && <td className="gp-mono">{v.fecha ? fmtFechaCorta(v.fecha) : "—"}</td>}
                  {verVencimiento && <td><span className="text-xs" style={{ color: v.vencido ? "var(--red)" : "var(--muted)" }}>{v.texto}</span></td>}
                  {soloRecurrentes && <td className="gp-text-muted">{f.frecuencia || "Mensual"}</td>}
                  {soloRecurrentes && <td className="gp-mono" style={{ color: esIngreso ? "var(--teal)" : "var(--red)" }}>{fmtMoney(Math.round(montoMensualizado(f)))}</td>}
                  {soloRecurrentes && (
                    <td className="gp-mono">
                      {proximoCargoRecurrente(f) ? fmtFechaCorta(proximoCargoRecurrente(f)) : <span className="gp-text-muted">terminado</span>}
                    </td>
                  )}
                  {!verVencimiento && !soloRecurrentes && <td className="hidden lg:table-cell gp-text-muted">{f.forma || "—"}</td>}
                  <td>
                    <MontoMovimiento f={f} />
                    {abonado > 0 && pendiente && (
                      <span className="block text-[10px] gp-text-muted">abonado {fmtMoney(abonado)} · falta {fmtMoney(saldo)}</span>
                    )}
                  </td>
                  <td>
                    <SelectGuardable
                      valor={f.estatus || "Pendiente"} opciones={["Cobrado", "Pendiente", "Parcial"]}
                      etiquetas={esIngreso
                        ? { Cobrado: "Cobrado", Pendiente: "Por cobrar", Parcial: "Parcial" }
                        : { Cobrado: "Pagado", Pendiente: "Por pagar", Parcial: "Parcial" }}
                      ariaLabel="Estado del movimiento" onGuardar={(nuevoEstado) => onEdit(f.id, { estatus: nuevoEstado })}
                    />
                  </td>
                  <td>
                    <div className="flex gap-1 items-center">
                      {/* Pago o cobro, parcial o total, sin salir del grid. */}
                      {pendiente && (
                        <button
                          onClick={() => setModal({ item: f, paso: "pagar" })}
                          title={esIngreso ? "Registrar un cobro (parcial o total)" : "Registrar un pago (parcial o total)"}
                          className={`text-xs px-2 py-1 rounded gp-btn-ghost ${esIngreso ? "gp-text-teal" : "gp-text-gold"}`}
                        >
                          {esIngreso ? "Cobrar" : "Pagar"}
                        </button>
                      )}
                      <IconBtn title="Editar" onClick={() => setModal({ item: f })}><Pencil size={13} /></IconBtn>
                      <IconBtn title="Eliminar" onClick={() => onRemove(f.id)}><Trash2 size={13} /></IconBtn>
                    </div>
                  </td>
                </tr>
              );
            })}
            {enPagina.length === 0 && (
              <tr><td colSpan={13} className="text-center gp-text-muted py-8">
                {busqueda || filtroProyecto !== "Todos" || filtroCategoria !== "Todas" || soloRecurrentes
                  ? "Sin resultados con estos filtros."
                  : sub.id === "cobrar" ? "No hay nada por cobrar. "
                  : sub.id === "pagar" ? "No hay nada por pagar. "
                  : sub.id === "deudas" ? "No tienes deudas registradas."
                  : `No hay ${grupo.label.toLowerCase()} en este periodo.`}
              </td></tr>
            )}
          </tbody>
        </table>
      </div>

      {ordenados.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 mt-3 text-xs gp-text-muted">
          <span>Mostrando {inicio + 1}–{Math.min(inicio + porPagina, ordenados.length)} de {ordenados.length} movimiento{ordenados.length === 1 ? "" : "s"}</span>
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-1.5">
              Filas por página
              <select className="gp-input text-xs py-1" style={{ width: "auto" }} value={porPagina} onChange={(e) => { setPorPagina(Number(e.target.value)); setPagina(1); }}>
                {[12, 24, 50, 100, 250].map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
            </label>
            {totalPaginas > 1 && (
              <div className="flex items-center gap-1">
                <button onClick={() => setPagina(Math.max(1, paginaActual - 1))} disabled={paginaActual === 1} className="px-2 py-1 rounded gp-btn-ghost disabled:opacity-40" aria-label="Página anterior"><ChevronLeft size={13} /></button>
                {paginasVisibles(paginaActual, totalPaginas).map((x, i) => (
                  x === "…" ? <span key={`s-${i}`} className="px-1">…</span>
                    : <button key={x} onClick={() => setPagina(x)} className={`px-2.5 py-1 rounded ${x === paginaActual ? "gp-btn" : "gp-btn-ghost"}`}>{x}</button>
                ))}
                <button onClick={() => setPagina(Math.min(totalPaginas, paginaActual + 1))} disabled={paginaActual === totalPaginas} className="px-2 py-1 rounded gp-btn-ghost disabled:opacity-40" aria-label="Página siguiente"><ChevronRight size={13} /></button>
              </div>
            )}
          </div>
        </div>
      )}

      {modal && !modal.paso && (
        <Modal title={modal.item.id ? "Editar movimiento" : "Nuevo movimiento"} onClose={() => setModal(null)}>
          <FinanzaForm item={modal.item} proyectos={data.proyectos} contactos={data.contactos} onSave={(v) => { modal.item.id ? onEdit(modal.item.id, v) : onAdd(v); setModal(null); }} />
        </Modal>
      )}

      {modal && modal.paso === "pagar" && (
        <Modal
          title={`${modal.item.tipo === "Ingreso" ? "Registrar cobro" : "Registrar pago"} — ${modal.item.concepto || ""}`}
          onClose={() => setModal(null)}
        >
          <PagoDeudaForm
            saldoPendiente={saldoDe(modal.item)}
            textoSaldado={modal.item.tipo === "Ingreso" ? "Con este cobro la cuenta queda liquidada." : "Con este pago la cuenta queda liquidada."}
            etiquetaBoton={modal.item.tipo === "Ingreso" ? "Registrar cobro" : "Registrar pago"}
            onPagar={(p) => registrarAbono(modal.item, p)}
          />
        </Modal>
      )}

      {importarAbierto && (
        <Modal title="Importar movimientos desde Excel" onClose={() => setImportarAbierto(false)}>
          <Suspense fallback={<p className="text-sm gp-text-muted">Cargando…</p>}>
            <ImportarExcelModal tipo="finanzas" proyectos={data.proyectos} onImportarFila={(item) => onAdd(item)} onCerrar={() => setImportarAbierto(false)} />
          </Suspense>
        </Modal>
      )}
    </div>
  );
}

// RESUMEN — la pantalla a la que se entra a VER, no a buscar. Las cuatro cifras del periodo, cómo
// se movieron, en qué se fue el dinero y qué falta cobrar o pagar. Sin tabla: para la lista están
// Movimientos y los demás hijos, y a cada uno se llega desde aquí.
function FinanzasResumen({ data, onAdd, onEdit, onVerMovimientos, crearAlEntrar, onConsumirCrearAlEntrar }) {
  const [modal, setModal] = useState(null);
  const [rango, setRango] = useState("mes");

  const empty = { concepto: "", tipo: "Ingreso", proyectoId: "", contactoId: "", fecha: todayISO(), fechaVencimiento: "", monto: "", moneda: MONEDA_BASE, tipoCambio: 1, montoBase: "", categoria: "", forma: "Transferencia", estatus: "Cobrado", pautando: false, esRecurrente: false, frecuencia: "Mensual", fechaFin: "" };
  useEffect(() => {
    if (crearAlEntrar) { setModal({ item: { ...empty, ...(crearAlEntrar.preset || {}) } }); onConsumirCrearAlEntrar(); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [crearAlEntrar]);

  const nombreContacto = (id) => data.contactos.find((c) => c.id === id)?.nombre || "—";
  const { desde, hasta } = rangoFechas(rango);
  const c = cifrasFinanzas(data.finanzas, desde, hasta);
  const anterior = rangoAnterior(rango);
  const previo = cifrasFinanzas(data.finanzas, anterior.desde, anterior.hasta);
  const variacion = (ahora, antes) => (antes > 0 ? Math.round(((ahora - antes) / antes) * 100) : null);

  // Gráfica: ingresos y egresos por día, con el saldo acumulado encima.
  const porDia = {};
  c.enRango.forEach((f) => {
    const d = (f.fecha || "").slice(0, 10);
    if (!d) return;
    if (!porDia[d]) porDia[d] = { dia: d, ingreso: 0, egreso: 0 };
    if (f.estatus !== "Cobrado") return;
    if (f.tipo === "Ingreso") porDia[d].ingreso += montoBaseDe(f); else porDia[d].egreso += montoBaseDe(f);
  });
  let acum = 0;
  const evolucion = Object.values(porDia).sort((a, b) => a.dia.localeCompare(b.dia)).map((d) => {
    acum += d.ingreso - d.egreso;
    return { ...d, saldo: acum, etiqueta: fmtFechaCorta(d.dia).slice(0, 6) };
  });

  const porCategoria = {};
  c.egresos.forEach((f) => {
    const k = (f.categoria || "").trim() || "Otros";
    porCategoria[k] = (porCategoria[k] || 0) + montoBaseDe(f);
  });
  const desglose = Object.entries(porCategoria)
    .map(([nombre, monto]) => ({ nombre, monto, pct: c.egresosTotal ? Math.round((monto / c.egresosTotal) * 100) : 0 }))
    .sort((a, b) => b.monto - a.monto);

  // Lo pendiente NO se filtra por periodo: un cobro de hace tres meses sigue pendiente hoy, y
  // esconderlo porque no cae en el mes elegido sería justo lo contrario de lo que sirve aquí.
  const cobrosPendientes = (data.finanzas || [])
    .filter((f) => f.tipo === "Ingreso" && f.estatus !== "Cobrado")
    .sort((a, b) => (a.fechaVencimiento || a.fecha || "9999").localeCompare(b.fechaVencimiento || b.fecha || "9999"));
  const pagosPendientes = (data.finanzas || [])
    .filter((f) => f.tipo === "Egreso" && f.estatus !== "Cobrado")
    .sort((a, b) => (a.fechaVencimiento || a.fecha || "9999").localeCompare(b.fechaVencimiento || b.fecha || "9999"));
  const totalPendiente = (lista) => lista.reduce((t, f) => t + montoBaseDe(f), 0);

  const nuevo = (preset) => setModal({ item: { ...empty, ...preset } });
  const ACCIONES = [
    { titulo: "Cobro del cliente", sub: "Registra un ingreso", icono: <Banknote size={16} className="gp-text-teal" />, tinte: "rgba(22,163,106,.14)", preset: { tipo: "Ingreso", categoria: "Proyectos", estatus: "Pendiente" } },
    { titulo: "Gasto del proyecto", sub: "Viáticos, materiales, servicios…", icono: <Receipt size={16} className="gp-text-red" />, tinte: "rgba(229,72,77,.14)", preset: { tipo: "Egreso", categoria: "Viáticos" } },
    { titulo: "Pago a colaborador", sub: "Registra un pago", icono: <HandCoins size={16} className="gp-text-gold" />, tinte: "rgba(212,175,55,.16)", preset: { tipo: "Egreso", categoria: "Pago a colaborador" } },
  ];

  return (
    <div>
      <CabeceraFinanzas
        seccion="Resumen" titulo="Resumen" icono={<BarChart3 size={20} className="gp-text-gold" />}
        subtitulo="Cómo vas en el periodo: lo que entró, lo que salió y lo que falta."
        rango={rango} onRango={setRango}
        acciones={<button onClick={() => nuevo({})} className="gp-btn px-3 py-1.5 text-sm rounded flex items-center gap-1.5"><Plus size={14} /> Nuevo movimiento</button>}
      />

      <div className="flex flex-col xl:flex-row gap-3 items-start">
        <div className="min-w-0 flex-1 w-full">
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-2.5 mb-3">
            <TarjetaResumenFin
              etiqueta="Ingresos totales" valor={c.ingresosTotal} color="var(--teal)" tinte="rgba(22,163,106,.14)" icono={<TrendingUp size={16} />}
              variacion={variacion(c.ingresosTotal, previo.ingresosTotal)}
              filas={[
                { label: "De clientes", valor: c.ingresosDeCliente },
                { label: "Otros ingresos", valor: c.ingresosTotal - c.ingresosDeCliente },
              ]}
            />
            <TarjetaResumenFin
              etiqueta="Egresos totales" valor={c.egresosTotal} color="var(--red)" tinte="rgba(229,72,77,.14)" icono={<TrendingDown size={16} />}
              variacion={variacion(c.egresosTotal, previo.egresosTotal)}
              filas={[
                { label: "Proyectos", valor: c.egresosProyecto },
                { label: "Colaboradores", valor: c.egresosColaboradores },
                { label: "Gastos generales", valor: c.egresosGenerales },
              ]}
            />
            <TarjetaResumenFin
              etiqueta="Saldo del periodo" valor={c.enCuentas} color={c.enCuentas >= 0 ? "#087CF5" : "var(--red)"}
              tinte={c.enCuentas >= 0 ? "rgba(8,124,245,.14)" : "rgba(229,72,77,.14)"} icono={<Wallet size={16} />}
              variacion={null}
              filas={[
                { label: "Ya liquidado", valor: c.enCuentas },
                { label: "Por cobrar", valor: c.porCobrar, color: "var(--teal)" },
                { label: "Por pagar", valor: c.porPagar, color: "var(--red)" },
              ]}
            />
            <TarjetaResumenFin
              destacada etiqueta="Resultado proyectado" valor={c.proyectado} color="var(--violeta, #8B5CF6)" tinte="rgba(139,92,246,.16)" icono={<Sparkles size={16} />}
              variacion={null}
              filas={[
                { label: "Saldo del periodo", valor: c.enCuentas },
                { label: "+ Por cobrar", valor: c.porCobrar, color: "var(--teal)" },
                { label: "− Por pagar", valor: c.porPagar, color: "var(--red)" },
              ]}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-2.5">
            {evolucion.length > 0 && (
              <div className="gp-panel p-3.5">
                <TituloBloque icono={<Activity size={15} />} color="#087CF5">Evolución de movimientos</TituloBloque>
                <div style={{ height: 180 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={evolucion} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                      <XAxis dataKey="etiqueta" tick={{ fontSize: 9, fill: "var(--muted)" }} />
                      <YAxis tick={{ fontSize: 9, fill: "var(--muted)" }} tickFormatter={(n) => `${Math.round(n / 1000)}k`} />
                      <Tooltip formatter={(v) => fmtMoney(v)} contentStyle={{ background: "var(--panel)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 11 }} />
                      <Legend wrapperStyle={{ fontSize: 10 }} />
                      <Bar dataKey="ingreso" name="Ingresos" fill="#16A36A" radius={[3, 3, 0, 0]} />
                      <Bar dataKey="egreso" name="Egresos" fill="#E5484D" radius={[3, 3, 0, 0]} />
                      <Line type="monotone" dataKey="saldo" name="Saldo acumulado" stroke="#087CF5" strokeWidth={2} dot={false} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {desglose.length > 0 && (
              <div className="gp-panel p-3.5">
                <TituloBloque
                  icono={<PieChartIcon size={15} />} color="var(--red)"
                  derecha={<button onClick={() => onVerMovimientos("egresos", "todos")} className="text-[10px] gp-text-gold shrink-0">Ver detalle</button>}
                >
                  Egresos por categoría
                </TituloBloque>
                <div className="flex items-center gap-3">
                  <div style={{ width: 120, height: 120 }} className="shrink-0 relative">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={desglose} dataKey="monto" nameKey="nombre" innerRadius={36} outerRadius={56} paddingAngle={2}>
                          {desglose.map((x, i) => <Cell key={x.nombre} fill={COLORES_DESGLOSE[i % COLORES_DESGLOSE.length]} />)}
                        </Pie>
                        <Tooltip formatter={(v) => fmtMoney(v)} contentStyle={{ background: "var(--panel)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 11 }} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                      <span className="gp-mono text-xs">{fmtMoney(c.egresosTotal)}</span>
                      <span className="text-[9px] gp-text-muted">Total</span>
                    </div>
                  </div>
                  <div className="flex-1 min-w-0 flex flex-col gap-1">
                    {desglose.slice(0, 6).map((x, i) => (
                      <div key={x.nombre} className="flex items-center gap-1.5 text-[11px]">
                        <span className="rounded-full shrink-0" style={{ width: 8, height: 8, background: COLORES_DESGLOSE[i % COLORES_DESGLOSE.length] }} />
                        <span className="truncate flex-1">{x.nombre}</span>
                        <span className="gp-mono shrink-0">{fmtMoney(x.monto)}</span>
                        <span className="gp-text-muted shrink-0" style={{ width: 30, textAlign: "right" }}>{x.pct}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {evolucion.length === 0 && desglose.length === 0 && (
            <div className="gp-panel p-8 text-center">
              <p className="text-sm gp-text-muted">No hay movimientos en este periodo.</p>
              <button onClick={() => nuevo({})} className="gp-btn px-3 py-1.5 text-sm rounded mt-3 inline-flex items-center gap-1.5"><Plus size={14} /> Registrar el primero</button>
            </div>
          )}
        </div>

        {/* Columna derecha: lo que hay que hacer. Cada bloque lleva a su propio hijo. */}
        <div className="w-full xl:w-[300px] shrink-0 flex flex-col gap-2.5">
          <div className="gp-panel p-3.5">
            <TituloBloque icono={<Zap size={15} />} color="var(--gold)">Acciones rápidas</TituloBloque>
            <div className="flex flex-col gap-1.5">
              {ACCIONES.map((a) => (
                <button key={a.titulo} onClick={() => nuevo(a.preset)} className="gp-bloque rounded-lg p-2.5 text-left flex items-center gap-2.5">
                  <span className="shrink-0 inline-flex items-center justify-center rounded-lg" style={{ background: a.tinte, width: 30, height: 30 }}>{a.icono}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-xs font-medium">{a.titulo}</span>
                    <span className="block text-[10px] gp-text-muted">{a.sub}</span>
                  </span>
                  <ChevronRight size={13} className="gp-text-muted shrink-0" />
                </button>
              ))}
            </div>
          </div>

          <div className="gp-panel p-3.5">
            <TituloBloque
              icono={<ArrowDownCircle size={15} />} color="var(--teal)"
              derecha={cobrosPendientes.length > 0 ? <Badge tone="teal">{cobrosPendientes.length}</Badge> : null}
            >
              Cobros pendientes
            </TituloBloque>
            {cobrosPendientes.length === 0
              ? <p className="text-[11px] gp-text-muted">Nada por cobrar.</p>
              : (
                <>
                  <p className="gp-serif text-lg gp-text-teal mb-1.5">{fmtMoney(totalPendiente(cobrosPendientes))}</p>
                  <div className="flex flex-col gap-1.5">
                    {cobrosPendientes.slice(0, 5).map((f) => {
                      const v = vencimientoDe(f);
                      return (
                        <button key={f.id} onClick={() => setModal({ item: f })} className="flex items-start justify-between gap-2 text-[11px] text-left">
                          <span className="min-w-0">
                            <span className="block truncate">{f.contactoId ? nombreContacto(f.contactoId) : f.concepto}</span>
                            <span className="block" style={{ color: v.vencido ? "var(--red)" : "var(--muted)" }}>{v.texto}</span>
                          </span>
                          <span className="gp-mono gp-text-teal shrink-0">{fmtMoney(montoBaseDe(f))}</span>
                        </button>
                      );
                    })}
                  </div>
                  <button onClick={() => onVerMovimientos("ingresos", "cobrar")} className="text-[10px] gp-text-gold mt-2 flex items-center gap-1">
                    Ver los {cobrosPendientes.length} <ArrowRight size={10} />
                  </button>
                </>
              )}
          </div>

          <div className="gp-panel p-3.5">
            <TituloBloque
              icono={<ArrowUpCircle size={15} />} color="var(--red)"
              derecha={pagosPendientes.length > 0 ? <Badge tone="red">{pagosPendientes.length}</Badge> : null}
            >
              Pagos pendientes
            </TituloBloque>
            {pagosPendientes.length === 0
              ? <p className="text-[11px] gp-text-muted">Nada por pagar.</p>
              : (
                <>
                  <p className="gp-serif text-lg gp-text-red mb-1.5">{fmtMoney(totalPendiente(pagosPendientes))}</p>
                  <div className="flex flex-col gap-1.5">
                    {pagosPendientes.slice(0, 5).map((f) => {
                      const v = vencimientoDe(f);
                      return (
                        <button key={f.id} onClick={() => setModal({ item: f })} className="flex items-start justify-between gap-2 text-[11px] text-left">
                          <span className="min-w-0">
                            <span className="block truncate">{f.contactoId ? nombreContacto(f.contactoId) : f.concepto}</span>
                            <span className="block" style={{ color: v.vencido ? "var(--red)" : "var(--muted)" }}>{v.texto}</span>
                          </span>
                          <span className="gp-mono gp-text-red shrink-0">{fmtMoney(montoBaseDe(f))}</span>
                        </button>
                      );
                    })}
                  </div>
                  <button onClick={() => onVerMovimientos("egresos", "pagar")} className="text-[10px] gp-text-gold mt-2 flex items-center gap-1">
                    Ver los {pagosPendientes.length} <ArrowRight size={10} />
                  </button>
                </>
              )}
          </div>
        </div>
      </div>

      {modal && (
        <Modal title={modal.item.id ? "Editar movimiento" : "Nuevo movimiento"} onClose={() => setModal(null)}>
          <FinanzaForm item={modal.item} proyectos={data.proyectos} contactos={data.contactos} onSave={(v) => { modal.item.id ? onEdit(modal.item.id, v) : onAdd(v); setModal(null); }} />
        </Modal>
      )}
    </div>
  );
}

// Cuánto representa al mes un movimiento recurrente, según su frecuencia. 4.345 es el promedio de
// semanas por mes (52/12): sin eso, un pago semanal se vería como si costara cuatro veces al mes
// en los meses de cuatro semanas y cinco en los de cinco.
function montoMensualizado(f) {
  const m = montoBaseDe(f);
  if (f.frecuencia === "Semanal") return m * 4.345;
  if (f.frecuencia === "Quincenal") return m * 2;
  if (f.frecuencia === "Anual") return m / 12;
  return m; // Mensual
}
// Próxima fecha en que toca, avanzando desde la fecha de arranque según la frecuencia. Devuelve
// null si el recurrente ya terminó (tiene fecha fin y quedó atrás).
function proximoCargoRecurrente(f) {
  if (!f.fecha) return null;
  // El "T00:00:00" no es decoración: sin él el navegador lee "2026-01-05" como medianoche UTC,
  // que en México son las 18:00 del día 4, y como setMonth/getDate trabajan en hora local la
  // fecha calculada salía un día ANTES. Se detectó con una prueba de las fechas, no en pantalla.
  const hoy = new Date(todayISO() + "T00:00:00");
  const fin = f.fechaFin ? new Date(String(f.fechaFin).slice(0, 10) + "T00:00:00") : null;
  const d = new Date(String(f.fecha).slice(0, 10) + "T00:00:00");
  let guarda = 0;
  while (d < hoy && guarda < 600) {
    if (f.frecuencia === "Semanal") d.setDate(d.getDate() + 7);
    else if (f.frecuencia === "Quincenal") d.setDate(d.getDate() + 15);
    else if (f.frecuencia === "Anual") d.setFullYear(d.getFullYear() + 1);
    else d.setMonth(d.getMonth() + 1);
    guarda++;
  }
  if (fin && d > fin) return null;
  return dateStr(d);
}

function FinanzaForm({ item, proyectos, contactos, onSave }) {
  const [v, setV] = useState(item);
  const [error, setError] = useState("");
  return (
    <div>
      <Field label="Concepto"><input className="gp-input" placeholder="ej. Claude, PlanetFitness, Renta Xochinahuac" value={v.concepto || ""} onChange={(e) => setV({ ...v, concepto: e.target.value })} /></Field>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="Tipo"><select className="gp-input" value={v.tipo} onChange={(e) => setV({ ...v, tipo: e.target.value })}>{TIPO_FIN.map((c) => <option key={c}>{c}</option>)}</select></Field>
        {v.esRecurrente ? (
          <Field label="Día del mes en que se cobra">
            <input
              type="number" min="1" max="31" className="gp-input"
              value={v.fecha ? Number(v.fecha.slice(8, 10)) : ""}
              onChange={(e) => {
                const dia = Math.min(31, Math.max(1, Number(e.target.value) || 1));
                setV({ ...v, fecha: `${todayISO().slice(0, 7)}-${String(dia).padStart(2, "0")}` });
              }}
            />
          </Field>
        ) : (
          <Field label="Fecha"><input type="date" className="gp-input" value={v.fecha} onChange={(e) => setV({ ...v, fecha: e.target.value })} /></Field>
        )}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="Proyecto">
          <select className="gp-input" value={v.proyectoId} onChange={(e) => setV({ ...v, proyectoId: e.target.value })}>
            <option value="">— sin proyecto —</option>
            {ordenadosPorNombre(proyectos).map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
          </select>
        </Field>
        <Field label="Cliente (quién pagó)">
          <select className="gp-input" value={v.contactoId || ""} onChange={(e) => setV({ ...v, contactoId: e.target.value })}>
            <option value="">— sin cliente —</option>
            {ordenadosPorNombre(contactos).map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
          </select>
        </Field>
      </div>
      <Field label="Categoría"><input className="gp-input" value={v.categoria} onChange={(e) => setV({ ...v, categoria: e.target.value })} placeholder="ej. hosting, venta, renta" /></Field>
      <CamposMoneda
        monto={v.monto} moneda={v.moneda || MONEDA_BASE} tipoCambio={v.tipoCambio ?? 1} fecha={v.fecha}
        onCambiar={(parche) => setV((prev) => ({ ...prev, ...parche }))}
      />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="Forma"><select className="gp-input" value={v.forma} onChange={(e) => setV({ ...v, forma: e.target.value })}>{FORMA_PAGO.map((c) => <option key={c}>{c}</option>)}</select></Field>
        <Field label="Estatus"><select className="gp-input" value={v.estatus} onChange={(e) => setV({ ...v, estatus: e.target.value })}><option>Cobrado</option><option>Pendiente</option></select></Field>
      </div>
      {v.estatus === "Pendiente" && v.tipo === "Ingreso" && (
        <Field label="Fecha de vencimiento (cuándo esperas cobrarlo)"><input type="date" className="gp-input" value={v.fechaVencimiento || ""} onChange={(e) => setV({ ...v, fechaVencimiento: e.target.value })} /></Field>
      )}
      <label className="flex items-center gap-2 text-xs gp-text-muted mb-3">
        <input type="checkbox" checked={v.pautando} onChange={(e) => setV({ ...v, pautando: e.target.checked })} /> Este proyecto está pautando publicidad
      </label>

      <div className="gp-panel p-3 mb-3">
        <label className="flex items-center gap-2 text-xs mb-2">
          <input type="checkbox" checked={v.esRecurrente} onChange={(e) => setV({ ...v, esRecurrente: e.target.checked })} />
          Es un pago recurrente (luz, agua, compra a meses…)
        </label>
        {v.esRecurrente && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
            <Field label="Frecuencia"><select className="gp-input" value={v.frecuencia} onChange={(e) => setV({ ...v, frecuencia: e.target.value })}>{FRECUENCIA.map((c) => <option key={c}>{c}</option>)}</select></Field>
            <Field label="Fecha de fin (vacío = indefinido)"><input type="date" className="gp-input" value={v.fechaFin} onChange={(e) => setV({ ...v, fechaFin: e.target.value })} /></Field>
          </div>
        )}
      </div>

      {error && <p className="text-xs gp-text-red mb-2">{error}</p>}


      <button className="gp-btn w-full py-2 text-sm mt-1" onClick={() => {
        if (!v.concepto?.toString().trim()) { setError("El concepto es obligatorio."); return; }
        setError("");
        // El monto base se congela al guardar: monto × tipo de cambio de ese día. Es el número
        // con el que suma toda la app, y no se vuelve a recalcular aunque el tipo cambie.
        const tc = Number(v.tipoCambio) || 1;
        onSave({ ...v, moneda: v.moneda || MONEDA_BASE, tipoCambio: tc, montoBase: (Number(v.monto) || 0) * tc });
      }}>Guardar</button>
    </div>
  );
}



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
// Lo que NO cambió: el saldo sigue saliendo de pagos_finanzas, así que los pagos parciales ya
// registrados valen igual que antes.
function Deudas({ data, onAddFinanzas, onEditFinanzas, onRemoveFinanzas, onAddPago, onCrearTarea, onAddComentario }) {
  const [modal, setModal] = useState(null); // {item} en captura/edición | {item, paso:"tarea", origenId} tras crear | {item, paso:"pagar"}
  const [orden, setOrden] = useState("vencimiento");
  const [ordenDir, setOrdenDir] = useState("asc");
  const [busqueda, setBusqueda] = useState("");
  const [cubeta, setCubeta] = useState("todas");
  const [incluirRecurrentes, setIncluirRecurrentes] = useState(true);
  const [abierto, setAbierto] = useState(null);
  const toggleOrden = (key) => { if (orden === key) setOrdenDir((d) => (d === "asc" ? "desc" : "asc")); else { setOrden(key); setOrdenDir("asc"); } };
  const empty = { concepto: "", proyectoId: "", monto: "", fechaVencimiento: todayISO(), notas: "" };
  const nombreProyecto = (id) => data.proyectos.find((p) => p.id === id)?.nombre || "—";
  const nombreContacto = (id) => data.contactos.find((c) => c.id === id)?.nombre || "";

  const totalPagado = (finanzasId) => (data.pagosFinanzas || []).filter((p) => p.finanzasId === finanzasId).reduce((s, p) => s + (Number(p.monto) || 0), 0);
  const saldoPendiente = (d) => Math.max(0, montoBaseDe(d) - totalPagado(d.id));
  const pagosDe = (id) => (data.pagosFinanzas || []).filter((p) => p.finanzasId === id).sort((a, b) => (b.fecha || "").localeCompare(a.fecha || ""));

  const pendientes = (data.finanzas || [])
    .filter((f) => f.tipo === "Egreso" && (f.estatus === "Pendiente" || f.estatus === "Parcial"))
    .filter((f) => incluirRecurrentes || !f.esRecurrente);
  const conVencimiento = pendientes.map((f) => ({ f, v: vencimientoDe(f), saldo: saldoPendiente(f) }));

  const totalPorPagar = conVencimiento.reduce((t, x) => t + x.saldo, 0);
  const vencido = conVencimiento.filter((x) => x.v.vencido).reduce((t, x) => t + x.saldo, 0);
  const porVencer = conVencimiento.filter((x) => !x.v.vencido && x.v.dias !== null && x.v.dias >= -30).reduce((t, x) => t + x.saldo, 0);
  const aQuienes = new Set(pendientes.map((f) => f.contactoId || f.concepto || "")).size;

  const cubetas = CUBETAS_ANTIGUEDAD.map((cu) => ({
    ...cu,
    n: conVencimiento.filter((x) => cu.test(x.v)).length,
    monto: conVencimiento.filter((x) => cu.test(x.v)).reduce((t, x) => t + x.saldo, 0),
  }));
  const enCubeta = cubeta === "todas"
    ? conVencimiento
    : conVencimiento.filter((x) => CUBETAS_ANTIGUEDAD.find((cu) => cu.id === cubeta)?.test(x.v));
  const buscados = filtrarPorBusqueda(enCubeta, busqueda, [
    (x) => x.f.concepto, (x) => nombreContacto(x.f.contactoId), (x) => nombreProyecto(x.f.proyectoId), (x) => x.f.categoria,
  ]);
  const camposOrden = {
    vencimiento: { get: (x) => x.v.fecha || "9999-12-31", tipo: "fecha" },
    alfabetico: { get: (x) => x.f.concepto, tipo: "texto" },
    monto: { get: (x) => x.saldo, tipo: "numero" },
  };
  const ordenados = ordenarLista(buscados, orden, camposOrden, ordenDir);

  const columnasExport = [
    { label: "A quién", get: (x) => x.f.concepto },
    { label: "Contacto", get: (x) => nombreContacto(x.f.contactoId) },
    { label: "Proyecto", get: (x) => (x.f.proyectoId ? nombreProyecto(x.f.proyectoId) : "") },
    { label: "Categoría", get: (x) => x.f.categoria },
    { label: "Vence", get: (x) => x.v.fecha },
    { label: "Antigüedad", get: (x) => x.v.texto },
    { label: "Monto", get: (x) => montoBaseDe(x.f) },
    { label: "Saldo pendiente", get: (x) => x.saldo },
  ];

  // Registra un pago (total o parcial) en pagos_finanzas y recalcula el estatus del movimiento:
  // si el saldo llega a 0, queda Cobrado; si queda algo pendiente, Parcial.
  const registrarPago = async (d, { monto, fecha }) => {
    await onAddPago({ id: uid(), finanzasId: d.id, fecha, monto, comentario: "" });
    const restante = saldoPendiente(d) - monto;
    onEditFinanzas(d.id, { estatus: restante <= 0 ? "Cobrado" : "Parcial" });
    setModal(null);
  };

  return (
    <div>
      <CabeceraFinanzas
        seccion="Deudas" titulo="Deudas" icono={<AlertTriangle size={20} className="gp-text-red" />}
        subtitulo="A quién le debes, desde cuándo y cuánto. Al llegar el saldo a cero sale solo de esta lista."
        acciones={<>
          <button onClick={() => exportarFilasExcel(ordenados, columnasExport, "por-pagar")} className="gp-btn-ghost px-3 py-1.5 text-xs rounded flex items-center gap-1.5"><Download size={13} /> Excel</button>
          <button onClick={() => exportarFilasPDF(ordenados, columnasExport, "por-pagar", "Por pagar", `Al ${fmtFechaCorta(todayISO())}`)} className="gp-btn-ghost px-3 py-1.5 text-xs rounded flex items-center gap-1.5"><Download size={13} /> PDF</button>
          <button onClick={() => setModal({ item: empty })} className="gp-btn px-3 py-1.5 text-sm rounded flex items-center gap-1.5"><Plus size={14} /> Nueva deuda</button>
        </>}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-2.5 mb-3">
        <TarjetaResumenFin etiqueta="Total que debes" valor={totalPorPagar} color="var(--red)" tinte="rgba(229,72,77,.14)" icono={<ArrowUpCircle size={16} />} />
        <TarjetaResumenFin etiqueta="Atrasado" valor={vencido} color="var(--red)" tinte="rgba(229,72,77,.14)" icono={<AlertTriangle size={16} />} />
        <TarjetaResumenFin etiqueta="Vence en 30 días" valor={porVencer} color="var(--gold)" tinte="rgba(212,175,55,.16)" icono={<Clock size={16} />} />
        <div className="gp-panel p-3.5">
          <div className="flex items-start justify-between gap-2">
            <p className="text-xs font-medium">Cuentas abiertas</p>
            <span className="shrink-0 inline-flex items-center justify-center rounded-lg" style={{ color: "#087CF5", background: "rgba(8,124,245,.14)", width: 30, height: 30 }}><Users size={16} /></span>
          </div>
          <p className="gp-serif text-2xl mt-1" style={{ color: "#087CF5" }}>{aQuienes}</p>
          <p className="text-[11px] gp-text-muted mt-0.5">{pendientes.length} pago{pendientes.length === 1 ? "" : "s"} pendiente{pendientes.length === 1 ? "" : "s"}</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 mb-2">
        <div className="relative flex-1" style={{ minWidth: 180, maxWidth: 300 }}>
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 gp-text-muted" style={{ pointerEvents: "none" }} />
          <input className="gp-input gp-buscador text-sm" style={{ paddingLeft: 32 }} placeholder="Buscar acreedor, proyecto o categoría…" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
        </div>
        <button onClick={() => setCubeta("todas")} className={`text-[11px] px-2.5 py-1 rounded-full border ${cubeta === "todas" ? "gp-btn" : "gp-btn-ghost"}`}>
          Todas <span className="gp-mono">{conVencimiento.length}</span>
        </button>
        {cubetas.map((cu) => (
          <button key={cu.id} onClick={() => setCubeta(cu.id)} className={`text-[11px] px-2.5 py-1 rounded-full border inline-flex items-center gap-1.5 ${cubeta === cu.id ? "gp-btn" : "gp-btn-ghost"}`}>
            {cu.label} <span className="gp-mono">{cu.n}</span>
            {cu.monto > 0 && <span className="gp-text-muted">{fmtMoney(cu.monto)}</span>}
          </button>
        ))}
        <label className="flex items-center gap-1.5 text-[11px] gp-text-muted cursor-pointer">
          <input type="checkbox" checked={incluirRecurrentes} onChange={(e) => setIncluirRecurrentes(e.target.checked)} />
          Incluir recurrentes
        </label>
      </div>

      <div className="gp-panel overflow-x-auto">
        <table className="gp-table">
          <thead>
            <tr>
              <th style={{ width: 28 }}></th>
              <Th label="A quién" sortKey="alfabetico" orden={orden} ordenDir={ordenDir} onToggle={toggleOrden} />
              <th className="hidden md:table-cell">Proyecto</th>
              <th className="hidden lg:table-cell">Categoría</th>
              <Th label="Vence" sortKey="vencimiento" orden={orden} ordenDir={ordenDir} onToggle={toggleOrden} />
              <th>Antigüedad</th>
              <Th label="Saldo pendiente" sortKey="monto" orden={orden} ordenDir={ordenDir} onToggle={toggleOrden} />
              <th></th>
            </tr>
          </thead>
          <tbody>
            {ordenados.map(({ f, v, saldo }) => {
              const pagado = totalPagado(f.id);
              const pagos = pagosDe(f.id);
              return (
                <Fragment key={f.id}>
                  <tr>
                    <td onClick={() => setAbierto(abierto === f.id ? null : f.id)} style={{ cursor: "pointer" }}>
                      {abierto === f.id ? <ChevronDown size={14} className="gp-text-muted" /> : <ChevronRight size={14} className="gp-text-muted" />}
                    </td>
                    <td>
                      <span className="block">{f.concepto}</span>
                      {f.contactoId && <span className="block text-[10px] gp-text-muted">{nombreContacto(f.contactoId)}</span>}
                      {f.esRecurrente && <Badge tone="muted">{f.frecuencia || "Recurrente"}</Badge>}
                    </td>
                    <td className="hidden md:table-cell gp-text-gold">{f.proyectoId ? nombreProyecto(f.proyectoId) : "—"}</td>
                    <td className="hidden lg:table-cell gp-text-muted">{f.categoria || "—"}</td>
                    <td className="gp-mono">{v.fecha ? fmtFechaCorta(v.fecha) : "—"}</td>
                    <td><span className="text-xs" style={{ color: v.vencido ? "var(--red)" : "var(--muted)" }}>{v.texto}</span></td>
                    <td>
                      <span className="gp-mono gp-text-red">{fmtMoney(saldo)}</span>
                      {pagado > 0 && <span className="block text-[10px] gp-text-muted">pagado {fmtMoney(pagado)} de {fmtMoney(montoBaseDe(f))}</span>}
                    </td>
                    <td>
                      <div className="flex gap-1">
                        <button title="Registrar un pago" onClick={() => setModal({ item: f, paso: "pagar" })} className="text-xs px-2 py-1 rounded gp-btn-ghost gp-text-teal">Pagar</button>
                        <IconBtn title="Editar" onClick={() => setModal({ item: f })}><Pencil size={13} /></IconBtn>
                        <IconBtn title="Eliminar" onClick={() => onRemoveFinanzas(f.id)}><Trash2 size={13} /></IconBtn>
                      </div>
                    </td>
                  </tr>
                  {abierto === f.id && (
                    <tr>
                      <td colSpan={8} style={{ padding: 0 }}>
                        <div className="gp-bloque p-2.5">
                          <p className="text-[11px] font-medium mb-1">Pagos registrados</p>
                          {pagos.length === 0
                            ? <p className="text-[11px] gp-text-muted">Todavía no hay abonos a esta cuenta.</p>
                            : (
                              <div className="flex flex-col gap-0.5">
                                {pagos.map((p) => (
                                  <div key={p.id} className="flex items-center justify-between gap-2 text-[11px]">
                                    <span className="gp-mono gp-text-muted">{fmtFechaCorta(p.fecha)}</span>
                                    <span className="flex-1 min-w-0 truncate gp-text-muted">{p.comentario || "Abono"}</span>
                                    <span className="gp-mono gp-text-teal">{fmtMoney(p.monto)}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          {/* El comprobante de la transferencia o el depósito: desde la galería o
                              tomándole foto ahí mismo, que es como se hace en el celular. */}
                          {onAddComentario && <ComprobantePago movimiento={f} data={data} onAddComentario={onAddComentario} />}
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
            {ordenados.length === 0 && (
              <tr><td colSpan={8} className="text-center gp-text-muted py-8">
                {pendientes.length === 0 ? "No debes nada. " : "Sin resultados con estos filtros."}
              </td></tr>
            )}
          </tbody>
        </table>
      </div>

      {modal && !modal.paso && (
        <Modal title={modal.item.id ? "Editar deuda" : "Nueva deuda"} onClose={() => setModal(null)}>
          <DeudaForm
            item={modal.item} proyectos={data.proyectos}
            saldoPendiente={modal.item.id ? saldoPendiente(modal.item) : null}
            onAbrirPago={() => setModal({ item: modal.item, paso: "pagar" })}
            onSave={(v) => {
              if (modal.item.id) { onEditFinanzas(modal.item.id, v); setModal(null); return; }
              const nuevoId = uid();
              onAddFinanzas({
                id: nuevoId, tipo: "Egreso", categoria: "Deuda", forma: "Transferencia", estatus: "Pendiente",
                esRecurrente: false, fecha: todayISO(), contactoId: "",
                concepto: v.concepto, proyectoId: v.proyectoId, monto: v.monto, fechaVencimiento: v.fechaVencimiento, notas: v.notas,
              });
              setModal({ item: v, paso: "tarea", origenId: nuevoId });
            }}
          />
        </Modal>
      )}
      {modal && modal.paso === "pagar" && (
        <Modal title={`Registrar pago — ${modal.item.concepto}`} onClose={() => setModal(null)}>
          <PagoDeudaForm saldoPendiente={saldoPendiente(modal.item)} onPagar={(p) => registrarPago(modal.item, p)} />
        </Modal>
      )}
      {modal && modal.paso === "tarea" && (
        <Modal title="Tarea relacionada" onClose={() => setModal(null)}>
          <PromptTareaRelacionada
            origenTabla="finanzas" origenId={modal.origenId} proyectoId={modal.item.proyectoId}
            descripcionSugerida={`Pagar a ${modal.item.concepto}`}
            fechaSugerida={modal.item.fechaVencimiento}
            onCrear={(t) => { onCrearTarea(t); setModal(null); }}
            onOmitir={() => setModal(null)}
          />
        </Modal>
      )}
    </div>
  );
}

// Sirve para los dos lados del dinero: registrar un pago en Por pagar y registrar un cobro en Por
// cobrar. Solo cambian los textos, porque el mecanismo es el mismo (un abono en pagos_finanzas).
function PagoDeudaForm({ saldoPendiente, onPagar, textoSaldado = "Con este pago la deuda queda saldada.", etiquetaBoton = "Registrar pago" }) {
  const [monto, setMonto] = useState(saldoPendiente);
  const [fecha, setFecha] = useState(todayISO());
  const [error, setError] = useState("");
  const montoNum = Number(monto) || 0;
  const saldoRestante = Math.max(0, (saldoPendiente || 0) - montoNum);
  return (
    <div>
      <p className="text-xs gp-text-muted mb-3">Saldo pendiente actual: <span className="gp-mono">{fmtMoney(saldoPendiente)}</span></p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="Monto pagado"><MoneyInput className="gp-input" value={monto} onChange={setMonto} /></Field>
        <Field label="Fecha del pago"><input type="date" className="gp-input" value={fecha} onChange={(e) => setFecha(e.target.value)} /></Field>
      </div>
      <p className="text-xs gp-text-muted mb-3">
        {montoNum > 0 && (saldoRestante <= 0 ? textoSaldado : `Saldo pendiente después de este pago: ${fmtMoney(saldoRestante)}`)}
      </p>
      {error && <p className="text-xs gp-text-red mb-2">{error}</p>}
      <button className="gp-btn w-full py-2 text-sm mt-1" onClick={() => {
        if (!montoNum || montoNum <= 0) { setError("Captura un monto válido."); return; }
        onPagar({ monto: montoNum, fecha });
      }}>
        {etiquetaBoton}
      </button>
    </div>
  );
}

function DeudaForm({ item, proyectos, saldoPendiente, onAbrirPago, onSave }) {
  const [v, setV] = useState(item);
  const [error, setError] = useState("");
  return (
    <div>
      <Field label="Acreedor"><input className="gp-input" value={v.concepto} onChange={(e) => setV({ ...v, concepto: e.target.value })} /></Field>
      <Field label="Proyecto relacionado">
        <select className="gp-input" value={v.proyectoId} onChange={(e) => setV({ ...v, proyectoId: e.target.value })}>
          <option value="">— personal / sin proyecto —</option>
          {ordenadosPorNombre(proyectos).map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
        </select>
      </Field>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="Monto"><MoneyInput className="gp-input" value={v.monto} onChange={(val) => setV({ ...v, monto: val })} /></Field>
        <Field label="Fecha de vencimiento"><input type="date" className="gp-input" value={v.fechaVencimiento} onChange={(e) => setV({ ...v, fechaVencimiento: e.target.value })} /></Field>
      </div>
      <Field label="Nota (opcional)"><textarea className="gp-input" rows={2} value={v.notas || ""} onChange={(e) => setV({ ...v, notas: e.target.value })} /></Field>
      {item.id && (
        <div className="gp-panel-hi p-3 mb-3 flex items-center justify-between gap-2" style={{ border: "1px solid var(--border)", borderRadius: 6 }}>
          <div>
            <p className="text-xs gp-text-muted">Saldo pendiente</p>
            <p className="gp-serif text-lg">{fmtMoney(saldoPendiente)}</p>
          </div>
          <button type="button" className="gp-btn-ghost px-3 py-1.5 text-xs rounded" onClick={onAbrirPago}>Registrar pago</button>
        </div>
      )}
      {error && <p className="text-xs gp-text-red mb-2">{error}</p>}

      <button className="gp-btn w-full py-2 text-sm mt-2" onClick={() => { if (!v.concepto?.toString().trim()) { setError("El acreedor es obligatorio."); return; } setError(""); onSave(v); }}>Guardar</button>
    </div>
  );
}

/* ---------- Equipo ---------- */
// Colaboradores (Grupo C): ya no es su propia entidad — es una vista sobre Contactos filtrada por
// tipos incluye "Colaborador" (Documento Maestro: Contactos es la entidad maestra de personas,
// reutilizada transversalmente). La tabla `equipo` quedó desactivada; esta pantalla ahora muestra,
// por cada colaborador, sus tareas asignadas, lo ganado (tareas aceptadas, aunque sigan en proceso),
// lo ya pagado (egresos reales en Finanzas) y el saldo pendiente — sin duplicar el dinero real.
function Equipo({ data, onAddContacto, onEditContacto, onAddFinanzas, onAddFactura, onVincularProyecto, onDesvincularProyecto }) {
  // Mismos catálogos que en Contactos: es la misma gente y las mismas etiquetas, solo que
  // editadas desde otra pantalla. Aquí el editor de contactos se llama onEditContacto.
  const catalogoEtiquetasContactos = usarCatalogoEditable({
    registros: data.contactos, campo: "etiquetas", esLista: true, onEditar: onEditContacto, nombreSingular: "la etiqueta",
  });
  const catalogoTitulosContactos = usarCatalogoEditable({
    registros: data.contactos, campo: "titulo", esLista: false, onEditar: onEditContacto, nombreSingular: "el título",
  });
  const [modal, setModal] = useState(null); // {item} alta/edición contacto | {colaborador, paso:"pagar"}
  const [orden, setOrden] = useState("alfabetico");
  const [busqueda, setBusqueda] = useState("");
  const emptyContacto = { nombre: "", nombres: "", apellidoPaterno: "", apellidoMaterno: "", tipos: ["Colaborador"], titulo: "", etiquetas: [], whatsapp: "", correo: "", direccion: "", notas: "", contexto: "", parentesco: "", fechaNacimiento: "" };

  const colaboradores = data.contactos.filter((c) => (c.tipos && c.tipos.length ? c.tipos : [c.tipo || "Otro"]).includes("Colaborador"));
  const tareasDe = (id) => data.pendientes.filter((p) => p.colaboradorContactoId === id);
  const ganadoDe = (id) => tareasDe(id).filter((p) => p.estadoAceptacion === "aceptada" || p.aceptadaPorCreador).reduce((s, p) => s + (Number(p.precio) || 0), 0);
  const pagadoDe = (id) => data.finanzas.filter((f) => f.categoria === "Pago a colaborador" && f.contactoId === id && f.estatus !== "Cancelado").reduce((s, f) => s + montoBaseDe(f), 0);
  const nombreProyecto = (pid) => data.proyectos.find((p) => p.id === pid)?.nombre || "—";

  const camposOrden = {
    registro: { get: (m) => m.createdAt, tipo: "fecha" },
    alfabetico: { get: (m) => m.nombre, tipo: "texto" },
    saldo: { get: (m) => ganadoDe(m.id) - pagadoDe(m.id), tipo: "numero" },
  };
  const opcionesOrden = [
    { key: "registro", label: "fecha de registro" },
    { key: "alfabetico", label: "alfabético" },
    { key: "saldo", label: "saldo pendiente" },
  ];
  const qn = normalizarTexto(busqueda);
  const filtrados = !qn
    ? colaboradores
    : colaboradores.filter((m) => [m.nombre, m.whatsapp, m.correo, m.notas].some((v) => normalizarTexto(v).includes(qn)));
  const listaEquipo = ordenarLista(filtrados, orden, camposOrden);

  return (
    <div>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-1">
        <h2 className="gp-serif text-2xl">Colaboradores</h2>
        <button onClick={() => setModal({ item: emptyContacto })} className="gp-btn flex items-center justify-center gap-1 px-3 py-1.5 text-sm w-full sm:w-auto"><Plus size={14} /> Nuevo</button>
      </div>
      <p className="text-sm gp-text-muted mb-3">Colaboradores a los que delegas tareas y les pagas por su trabajo. Un colaborador es un Contacto — puede ser también tu cliente o proveedor a la vez.</p>
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <input className="gp-input text-sm flex-1 sm:max-w-xs" placeholder="Buscar en Colaboradores…" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
        <OrdenSelector opciones={opcionesOrden} value={orden} onChange={setOrden} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {listaEquipo.map((m) => {
          const tareas = tareasDe(m.id);
          const ganado = ganadoDe(m.id);
          const pagado = pagadoDe(m.id);
          const saldo = Math.max(0, ganado - pagado);
          return (
            <div key={m.id} className="gp-panel p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium">{m.nombre}</p>
                  <div className="flex gap-3 mt-1 text-xs gp-text-muted flex-wrap">
                    {m.whatsapp && <span className="flex items-center gap-1"><MessageCircle size={12} /> {m.whatsapp}</span>}
                    {m.correo && <span className="flex items-center gap-1"><Mail size={12} /> {m.correo}</span>}
                  </div>
                </div>
                <IconBtn title="Editar" onClick={() => setModal({ item: m })}><Pencil size={13} /></IconBtn>
              </div>
              {m.notas && <p className="text-xs mt-2 gp-text-muted">{m.notas}</p>}
              <div className="mt-3 pt-3 border-t gp-border text-xs space-y-1">
                <div className="flex justify-between"><span className="gp-text-muted">{tareas.length} tarea(s) asignadas</span><span className="gp-mono">{fmtMoney(ganado)} ganado</span></div>
                <div className="flex justify-between"><span className="gp-text-muted">Pagado</span><span className="gp-mono gp-text-teal">{fmtMoney(pagado)}</span></div>
                <div className="flex justify-between items-center">
                  <span className="gp-text-muted">Saldo pendiente</span>
                  <span className="gp-mono gp-text-gold font-medium">{fmtMoney(saldo)}</span>
                </div>
              </div>
              {saldo > 0 && (
                <button onClick={() => setModal({ colaborador: m, paso: "pagar" })} className="gp-btn-ghost w-full mt-3 py-1.5 text-xs rounded">Registrar pago</button>
              )}
            </div>
          );
        })}
        {listaEquipo.length === 0 && (
          <p className="text-sm gp-text-muted col-span-2">
            {colaboradores.length === 0 ? "Aún no tienes contactos marcados como Colaborador. Márcalos desde Contactos, o crea uno aquí." : "Ningún colaborador coincide con tu búsqueda."}
          </p>
        )}
      </div>

      {modal && modal.item && (
        <Modal title={modal.item.id ? "Editar colaborador" : "Nuevo colaborador"} onClose={() => setModal(null)}>
          <ContactoForm
            item={modal.item} proyectos={data.proyectos}
            vinculos={(data.contactoProyectos || []).filter((v) => v.contactoId === modal.item.id)}
            etiquetasExistentes={etiquetasDeContactos(data.contactos)}
            titulosExistentes={titulosDeContactos(data.contactos)}
            catalogoEtiquetas={catalogoEtiquetasContactos}
            catalogoTitulos={catalogoTitulosContactos}
            onVincularProyecto={onVincularProyecto} onDesvincularProyecto={onDesvincularProyecto}
            onSave={(v) => {
              const vConTipo = { ...v, tipos: v.tipos.includes("Colaborador") ? v.tipos : [...v.tipos, "Colaborador"] };
              if (modal.item.id) onEditContacto(modal.item.id, vConTipo); else onAddContacto(vConTipo);
              setModal(null);
            }}
          />
        </Modal>
      )}
      {modal && modal.paso === "pagar" && (
        <Modal title={`Registrar pago — ${modal.colaborador.nombre}`} onClose={() => setModal(null)}>
          <PagoColaboradorForm
            saldoPendiente={ganadoDe(modal.colaborador.id) - pagadoDe(modal.colaborador.id)}
            proyectos={data.proyectos}
            onPagar={({ monto, fecha, proyectoId, solicitarFactura }) => {
              const finanzasId = uid();
              onAddFinanzas({
                id: finanzasId, tipo: "Egreso", categoria: "Pago a colaborador", forma: "Transferencia", estatus: "Cobrado",
                esRecurrente: false, fecha, proyectoId: proyectoId || "", contactoId: modal.colaborador.id,
                concepto: `Pago a ${modal.colaborador.nombre}`, monto,
              });
              if (solicitarFactura) {
                onAddFactura({
                  id: uid(), tipo: "Recibida", proyectoId: proyectoId || "", contactoId: modal.colaborador.id,
                  folio: "", fecha, concepto: `Pago a ${modal.colaborador.nombre}`, subtotal: monto, iva: 0, total: monto,
                  estatus: "Pendiente", notas: "Factura solicitada al colaborador por este pago.", finanzasId,
                });
              }
              setModal(null);
            }}
          />
        </Modal>
      )}
    </div>
  );
}

function PagoColaboradorForm({ saldoPendiente, proyectos, onPagar }) {
  const [monto, setMonto] = useState(saldoPendiente);
  const [fecha, setFecha] = useState(todayISO());
  const [proyectoId, setProyectoId] = useState("");
  const [solicitarFactura, setSolicitarFactura] = useState(false);
  const [error, setError] = useState("");
  return (
    <div>
      <p className="text-xs gp-text-muted mb-3">Saldo pendiente actual: <span className="gp-mono">{fmtMoney(saldoPendiente)}</span></p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="Monto a pagar"><MoneyInput className="gp-input" value={monto} onChange={setMonto} /></Field>
        <Field label="Fecha del pago"><input type="date" className="gp-input" value={fecha} onChange={(e) => setFecha(e.target.value)} /></Field>
      </div>
      <Field label="Proyecto relacionado (opcional)">
        <select className="gp-input" value={proyectoId} onChange={(e) => setProyectoId(e.target.value)}>
          <option value="">— sin proyecto —</option>
          {ordenadosPorNombre(proyectos).map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
        </select>
      </Field>
      <label className="flex items-center gap-2 mb-3 text-sm cursor-pointer">
        <input type="checkbox" checked={solicitarFactura} onChange={(e) => setSolicitarFactura(e.target.checked)} />
        Solicitar factura al colaborador por este pago
      </label>
      <p className="text-xs gp-text-muted mb-3">Este pago se registra como un Egreso real en Finanzas (categoría "Pago a colaborador"), ligado a este contacto.</p>
      {error && <p className="text-xs gp-text-red mb-2">{error}</p>}
      <button className="gp-btn w-full py-2 text-sm mt-1" onClick={() => {
        const montoNum = Number(monto);
        if (!montoNum || montoNum <= 0) { setError("Captura un monto válido."); return; }
        onPagar({ monto: montoNum, fecha, proyectoId, solicitarFactura });
      }}>
        Registrar pago
      </button>
    </div>
  );
}





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

function MetaForm({ item, proyectos, onSave }) {
  const [v, setV] = useState(item);
  const [error, setError] = useState("");
  return (
    <div>
      <Field label="Proyecto">
        <select className="gp-input" value={v.proyectoId} onChange={(e) => setV({ ...v, proyectoId: e.target.value })}>
          <option value="">— sin proyecto —</option>
          {ordenadosPorNombre(proyectos).map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
        </select>
      </Field>
      <Field label="Meta"><input className="gp-input" placeholder="ej. Llegar a 1000 seguidores, cerrar 3 clientes" value={v.descripcion} onChange={(e) => setV({ ...v, descripcion: e.target.value })} /></Field>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="Fecha objetivo"><input type="date" className="gp-input" value={v.fechaObjetivo} onChange={(e) => setV({ ...v, fechaObjetivo: e.target.value })} /></Field>
        <Field label="Estatus"><select className="gp-input" value={v.estatus} onChange={(e) => setV({ ...v, estatus: e.target.value })}>{ESTATUS_META.map((c) => <option key={c}>{c}</option>)}</select></Field>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="Prioridad"><select className="gp-input" value={v.prioridad || "Media"} onChange={(e) => setV({ ...v, prioridad: e.target.value })}>{PRIORIDADES.map((c) => <option key={c}>{c}</option>)}</select></Field>
        <Field label="Fecha de revisión (opcional)"><input type="date" className="gp-input" value={v.fechaRevision || ""} onChange={(e) => setV({ ...v, fechaRevision: e.target.value })} /></Field>
      </div>
      {error && <p className="text-xs gp-text-red mb-2">{error}</p>}

      <button className="gp-btn w-full py-2 text-sm mt-2" onClick={() => { if (!v.descripcion?.toString().trim()) { setError("La meta es obligatoria."); return; } setError(""); onSave(v); }}>Guardar</button>
    </div>
  );
}

/* ---------- Contactos / networking ---------- */

// Piezas compartidas entre la lista y la ficha lateral. Viven aquí afuera a propósito: si se
// declaran dentro de Contactos, React las trata como un tipo de componente nuevo en cada render
// y vuelve a montar todas las filas (pierde estado y parpadea).
const tiposDeContacto = (c) => (c.tipos && c.tipos.length ? c.tipos : [c.tipo || "Otro"]);

function AvatarContacto({ c, size = 32 }) {
  if (c.fotoUrl) {
    return <img src={c.fotoUrl} alt="" className="rounded-full object-cover shrink-0" style={{ width: size, height: size, border: "1px solid var(--border)" }} />;
  }
  return (
    <div className="rounded-full flex items-center justify-center shrink-0 font-semibold" style={{ width: size, height: size, fontSize: Math.round(size / 2.8), background: "var(--panel-hi)", color: "var(--gold)" }}>
      {(c.nombre || "").slice(0, 2).toUpperCase()}
    </div>
  );
}

// Las etiquetas del contacto, en chips. Se ven en la lista y en la ficha: son justo el dato que
// sirve para encontrar a alguien ("¿quiénes son de Gobierno?").
function ChipsEtiquetasContacto({ c, max = 3 }) {
  const lista = c.etiquetas || [];
  if (lista.length === 0) return null;
  return (
    <span className="inline-flex items-center gap-1 flex-wrap">
      {lista.slice(0, max).map((e) => (
        <span key={e} className="gp-badge" style={{ color: "var(--muted)", background: "var(--panel-2)" }}>{e}</span>
      ))}
      {lista.length > max && <span className="text-[10px] gp-text-muted">+{lista.length - max}</span>}
    </span>
  );
}

function ChipsTiposContacto({ c }) {
  return (
    <div className="flex items-center gap-1 flex-wrap">
      {tiposDeContacto(c).map((t) => (
        <span key={t} className="gp-badge" style={{ color: COLOR_TIPO_CONTACTO[t] || "var(--muted)", background: `${COLOR_TIPO_CONTACTO[t] || "#64748B"}22` }}>{t}</span>
      ))}
      {c.parentesco && <Badge tone="muted">{c.parentesco}</Badge>}
    </div>
  );
}

function BadgeCumpleContacto({ c }) {
  const dc = diasParaCumple(c.fechaNacimiento);
  if (dc === null || dc > 30) return null;
  return <Badge tone="gold">🎂 {dc === 0 ? "¡hoy!" : `en ${dc}d`}</Badge>;
}

// Colores de los botones de comunicación del contacto (pedido de Angel, 29 sept 2026): llamar en
// verde bandera para no confundirlo con el verde de WhatsApp, correo en el azul ARKEYONE y
// agendar en el mismo dorado del botón "Nuevo contacto".
const VERDE_BANDERA = "#006847";
const AZUL_CORREO = "#087CF5";
const VERDE_WHATSAPP = "#25D366";

// Ícono de WhatsApp: el de la marca (teléfono dentro del globo), no el bocadillo genérico de
// lucide, que no trae íconos de marca. Va como SVG inline y relleno (no trazo) para que se vea
// igual que el original. Verde oficial #25D366.
function IconoWhatsApp({ size = 14, color = "currentColor" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color} aria-hidden="true" focusable="false">
      <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.46 1.32 4.96L2 22l5.25-1.38a9.87 9.87 0 0 0 4.79 1.22h.01c5.46 0 9.91-4.45 9.91-9.91C21.96 6.45 17.5 2 12.04 2zm0 18.15h-.01a8.2 8.2 0 0 1-4.18-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.19 8.19 0 0 1-1.26-4.38c0-4.54 3.7-8.23 8.24-8.23 2.2 0 4.27.86 5.82 2.42a8.18 8.18 0 0 1 2.41 5.82c0 4.54-3.69 8.23-8.23 8.23z"/>
      <path d="M16.6 14.22c-.25-.13-1.47-.72-1.7-.8-.23-.09-.4-.13-.56.12-.17.25-.64.8-.79.97-.14.16-.29.18-.54.06-.25-.13-1.05-.39-2-1.23-.74-.66-1.24-1.47-1.38-1.72-.15-.25-.02-.39.11-.51.11-.11.25-.29.37-.44.13-.15.17-.25.25-.41.08-.17.04-.31-.02-.44-.06-.12-.56-1.35-.77-1.85-.2-.48-.4-.42-.56-.43h-.47c-.17 0-.44.06-.67.31-.23.25-.87.85-.87 2.07 0 1.22.89 2.4 1.02 2.57.12.16 1.76 2.68 4.25 3.76.6.26 1.06.41 1.42.53.6.19 1.14.16 1.57.1.48-.07 1.47-.6 1.68-1.18.21-.58.21-1.08.15-1.18-.06-.11-.23-.17-.48-.29z"/>
    </svg>
  );
}

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

// Combo de filtro con color por opción, compartido por Contactos (tipo de contacto) y Proyectos
// e ideas (etapa: Idea, Validación, Desarrollo…). A propósito NO es un <select> nativo: los
// navegadores —Safari e iOS sobre todo— ignoran el estilo de <option>, así que no hay forma de
// darle a cada categoría su color. Usa el mismo patrón de menú desplegable que el "···" de cada
// fila. Cada opción trae su color y cuántos registros tiene; la cerrada muestra la seleccionada.
function ComboFiltroColor({ opciones, valor, onCambiar }) {
  const [abierto, setAbierto] = useState(false);
  const sel = opciones.find((o) => o.id === valor) || opciones[0];
  if (!sel) return null;
  return (
    <div className="relative">
      <button
        onClick={() => setAbierto((v) => !v)}
        onKeyDown={(e) => { if (e.key === "Escape") setAbierto(false); }}
        aria-haspopup="listbox" aria-expanded={abierto}
        className="gp-btn-ghost rounded-full pl-1.5 pr-2.5 py-1.5 flex items-center gap-2"
      >
        <span
          className="text-xs px-2.5 py-1 rounded-full whitespace-nowrap"
          style={{ background: sel.color, color: "#0B2341", fontWeight: 600 }}
        >
          {sel.label}
        </span>
        {sel.n !== undefined && <span className="gp-mono text-xs gp-text-muted">{sel.n}</span>}
        <ChevronDown size={14} className="gp-text-muted" />
      </button>

      {abierto && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setAbierto(false)} />
          <div className="absolute left-0 top-11 z-20 gp-panel py-1" style={{ minWidth: 240 }} role="listbox">
            {opciones.map((o) => {
              const activo = o.id === valor;
              return (
                <button
                  key={o.id} role="option" aria-selected={activo}
                  onClick={() => { onCambiar(o.id); setAbierto(false); }}
                  className="w-full px-2.5 py-2 gp-panel-hi flex items-center justify-between gap-3"
                >
                  <span
                    className="text-xs px-2.5 py-1 rounded-full whitespace-nowrap"
                    style={activo
                      ? { background: o.color, color: "#0B2341", fontWeight: 600 }
                      : { background: `${o.color}22`, color: o.color, fontWeight: 600 }}
                  >
                    {o.label}
                  </span>
                  <span className="flex items-center gap-2 shrink-0">
                    {o.n !== undefined && <span className="gp-mono text-xs gp-text-muted">{o.n}</span>}
                    {activo ? <Check size={13} style={{ color: o.color }} /> : <span style={{ width: 13 }} />}
                  </span>
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

function Contactos({ data, onAdd, onEdit, onRemove, onAddComentario, onRemoveComentario, onVerRegalos, onVincularProyecto, onDesvincularProyecto, onAddNota, onAddCita, onAddEvento, onIrAVista, onVerProyecto, contactoSel, onSeleccionar, fichaTab, onFichaTab }) {
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

// Archivos de una entidad (contacto, proyecto…). NO crea una tabla nueva: reutiliza el sistema
// universal de comentarios y adjuntos que ya existe desde la migración 0006 (entidad_tipo/
// entidad_id + adjuntos jsonb), el mismo que usa la Bitácora. Aquí solo se muestran los adjuntos,
// sin el texto, y subir un archivo crea un comentario que únicamente lleva el adjunto.
// `carpeta` es el prefijo dentro del bucket de Storage, para que los archivos de cada módulo
// queden separados (contactos/<id>/…, proyectos/<id>/…).

// Nota rápida ligada al contacto: se guarda en el módulo de Notas con su contacto_id, no en una
// copia aparte — por eso también aparece en la pantalla de Notas.
function NuevaNotaContacto({ c, onAddNota }) {
  const [abierto, setAbierto] = useState(false);
  const [titulo, setTitulo] = useState("");
  const [contenido, setContenido] = useState("");
  if (!abierto) {
    return <button onClick={() => setAbierto(true)} className="text-xs gp-text-gold">+ Nueva nota</button>;
  }
  return (
    <div className="mt-2 pt-2 border-t gp-border">
      <input className="gp-input text-xs mb-2" autoFocus placeholder="Título" value={titulo} onChange={(e) => setTitulo(e.target.value)} />
      <textarea className="gp-input text-xs" rows={3} placeholder="Escribe la nota…" value={contenido} onChange={(e) => setContenido(e.target.value)} />
      <div className="flex gap-2 mt-2">
        <button onClick={() => { setAbierto(false); setTitulo(""); setContenido(""); }} className="gp-btn-ghost flex-1 py-1.5 text-xs">Cancelar</button>
        <button
          className="gp-btn flex-1 py-1.5 text-xs"
          onClick={() => {
            if (!titulo.trim() && !contenido.trim()) return;
            onAddNota({ titulo: titulo.trim() || `Nota de ${c.nombre}`, contenido: contenido.trim(), contactoId: c.id });
            setAbierto(false); setTitulo(""); setContenido("");
          }}
        >Guardar</button>
      </div>
    </div>
  );
}

// Crear un evento ligado a este contacto sin salir de la ficha (pedido de Angel, 29 sept 2026).
// El evento se guarda en el módulo Eventos con su contacto_id — no se duplica nada aquí, la ficha
// solo lo consulta. Los detalles (costos, media, proyecto) se completan después en Eventos.
function NuevoEventoContacto({ c, onAddEvento }) {
  const [abierto, setAbierto] = useState(false);
  const [nombre, setNombre] = useState("");
  const [fecha, setFecha] = useState(todayISO());
  const [lugar, setLugar] = useState("");
  const limpiar = () => { setAbierto(false); setNombre(""); setFecha(todayISO()); setLugar(""); };
  if (!abierto) {
    return <button onClick={() => setAbierto(true)} className="text-xs gp-text-gold">+ Nuevo evento</button>;
  }
  return (
    <div className="mt-2 pt-2 border-t gp-border">
      <input className="gp-input text-xs mb-2" autoFocus placeholder="Nombre del evento" value={nombre} onChange={(e) => setNombre(e.target.value)} />
      <div className="grid grid-cols-2 gap-2">
        <input type="date" className="gp-input text-xs" value={fecha} onChange={(e) => setFecha(e.target.value)} />
        <input className="gp-input text-xs" placeholder="Lugar (opcional)" value={lugar} onChange={(e) => setLugar(e.target.value)} />
      </div>
      <div className="flex gap-2 mt-2">
        <button onClick={limpiar} className="gp-btn-ghost flex-1 py-1.5 text-xs">Cancelar</button>
        <button
          className="gp-btn flex-1 py-1.5 text-xs"
          onClick={() => {
            if (!nombre.trim()) return;
            onAddEvento({ nombre: nombre.trim(), fecha, lugar: lugar.trim(), contactoId: c.id });
            limpiar();
          }}
        >Guardar</button>
      </div>
    </div>
  );
}

// Horarios y duraciones en bloques de media hora (pedido de Angel, 24 sept 2026): agendar a las
// 9, 9:30, 10… y poder apartar más de una hora para una reunión, sin teclear la hora a mano.
const HORAS_MEDIA_HORA = Array.from({ length: 48 }, (_, i) =>
  `${String(Math.floor(i / 2)).padStart(2, "0")}:${i % 2 === 0 ? "00" : "30"}`);
const DURACIONES_MEDIA_HORA = Array.from({ length: 16 }, (_, i) => (i + 1) * 0.5); // 0.5 h a 8 h
const etiquetaDuracion = (h) => {
  const horas = Math.floor(h);
  const media = h % 1 !== 0;
  if (horas === 0) return "30 min";
  return `${horas}${media ? " ½" : ""} h`;
};

// Lo que tienes agendado con esta persona: citas del módulo Agenda ligadas a su contacto_id, más
// la opción de agendar una nueva sin salir de la ficha (queda en Agenda, no en una copia).
function AgendaContacto({ c, data, onAddCita, onIrAVista }) {
  const [abierto, setAbierto] = useState(false);
  const [titulo, setTitulo] = useState("");
  const [fecha, setFecha] = useState(todayISO());
  const [hora, setHora] = useState("09:00");
  const [duracionHoras, setDuracionHoras] = useState(1);
  const [lugar, setLugar] = useState("");

  const ahora = new Date().toISOString();
  // Una cita puede tener VARIOS contactos (citas.contacto_ids). Se revisa ese arreglo y también
  // el contacto_id suelto, que es como quedaron las citas viejas de antes de que fuera multi.
  const citas = (data.citas || [])
    .filter((x) => (x.contactoIds || []).includes(c.id) || x.contactoId === c.id)
    .sort((a, b) => (a.fechaHora || "").localeCompare(b.fechaHora || ""));
  const proximas = citas.filter((x) => (x.fechaHora || "") >= ahora);
  const pasadas = citas.filter((x) => (x.fechaHora || "") < ahora).reverse();

  const Linea = ({ x, tenue }) => (
    <div className="flex items-start justify-between gap-2 py-1.5" style={tenue ? { opacity: 0.6 } : undefined}>
      <div className="min-w-0">
        <p className="text-xs font-medium truncate">{x.titulo}</p>
        <p className="text-[10px] gp-text-muted truncate">
          {[x.lugar, `${Number(x.duracionHoras) > 0 ? Number(x.duracionHoras) : 1} h`].filter(Boolean).join(" · ")}
        </p>
      </div>
      <span className="text-[10px] gp-mono gp-text-muted shrink-0">{fmtFechaHora(x.fechaHora)}</span>
    </div>
  );

  return (
    <>
      {proximas.length === 0 && pasadas.length === 0 && (
        <p className="text-xs gp-text-muted py-2">No tienes nada agendado con {c.nombre.split(" ")[0]}. Agenda algo aquí abajo.</p>
      )}
      {proximas.length > 0 && (
        <div className="mb-2">
          <p className="text-[10px] uppercase tracking-wide gp-text-muted mb-1">Próximas</p>
          {proximas.map((x) => <Linea key={x.id} x={x} />)}
        </div>
      )}
      {pasadas.length > 0 && (
        <div className="mb-2">
          <p className="text-[10px] uppercase tracking-wide gp-text-muted mb-1">Ya pasaron</p>
          {pasadas.slice(0, 5).map((x) => <Linea key={x.id} x={x} tenue />)}
        </div>
      )}

      {!abierto ? (
        <div className="flex items-center gap-3 mt-1">
          <button onClick={() => { setAbierto(true); setTitulo(`Cita con ${c.nombre}`); }} className="gp-btn px-3 py-1.5 text-xs rounded flex items-center gap-1.5">
            <CalendarClock size={13} /> Agendar cita
          </button>
          <button onClick={() => onIrAVista?.("agenda")} className="text-xs gp-text-gold">Ver Agenda →</button>
        </div>
      ) : (
        <div className="mt-2 pt-2 border-t gp-border">
          <input className="gp-input text-xs mb-2" autoFocus placeholder="¿De qué es la cita?" value={titulo} onChange={(e) => setTitulo(e.target.value)} />
          <div className="grid grid-cols-3 gap-2 mb-2">
            <input type="date" className="gp-input text-xs" value={fecha} onChange={(e) => setFecha(e.target.value)} />
            <select className="gp-input text-xs" value={hora} onChange={(e) => setHora(e.target.value)} aria-label="Hora de inicio">
              {HORAS_MEDIA_HORA.map((h) => <option key={h} value={h}>{h}</option>)}
            </select>
            <select className="gp-input text-xs" value={duracionHoras} onChange={(e) => setDuracionHoras(Number(e.target.value))} aria-label="Duración">
              {DURACIONES_MEDIA_HORA.map((d) => <option key={d} value={d}>{etiquetaDuracion(d)}</option>)}
            </select>
          </div>
          <input className="gp-input text-xs" placeholder="Lugar (opcional)" value={lugar} onChange={(e) => setLugar(e.target.value)} />
          <div className="flex gap-2 mt-2">
            <button onClick={() => setAbierto(false)} className="gp-btn-ghost flex-1 py-1.5 text-xs">Cancelar</button>
            <button
              className="gp-btn flex-1 py-1.5 text-xs"
              onClick={() => {
                if (!titulo.trim() || !fecha) return;
                // contactoIds (arreglo) es como guarda la Agenda: así esta cita también sale bien
                // en el calendario y admite sumarle más personas después.
                onAddCita({
                  titulo: titulo.trim(), fechaHora: localInputsAFechaHora(fecha, hora),
                  duracionHoras, lugar: lugar.trim(), contactoIds: [c.id], tags: [], notas: "",
                });
                setAbierto(false); setLugar("");
              }}
            >Guardar cita</button>
          </div>
        </div>
      )}
    </>
  );
}

// Botón de acción de la ficha. Mantiene su color siempre; si el dato que necesita no está
// capturado, en vez de quedar muerto lleva a capturarlo. `color` vacío = botón neutro (ghost).
function BotonAccionFicha({ color, colorTexto, icono, label, href, nuevaPestana, onClick, onFalta, faltaTitulo }) {
  const estilo = color ? { background: color, color: colorTexto || "#fff" } : undefined;
  const clases = `py-2 text-xs rounded flex items-center justify-center gap-1.5 font-medium ${color ? "" : "gp-btn-ghost"}`;
  if (href) {
    return (
      <a href={href} className={clases} style={estilo} {...(nuevaPestana ? { target: "_blank", rel: "noopener noreferrer" } : {})}>
        {icono} {label}
      </a>
    );
  }
  return (
    <button onClick={onClick || onFalta} title={onClick ? undefined : faltaTitulo} className={clases} style={estilo}>
      {icono} {label}
    </button>
  );
}

// Ficha del contacto (mockup de Angel, 24 sept 2026): el panel que aparece a la derecha al
// seleccionar a alguien en la lista. NO duplica datos: Proyectos sale de la tabla puente,
// Atenciones del módulo Regalos/Atenciones, Eventos del módulo Eventos y Notas del módulo Notas
// — cada bloque solo consulta y deja abrir el módulo fuente, como pide el documento maestro.
function FichaContacto({ c, data, proyectosVinculados, onCerrar, onEditar, onVerAtenciones, onIrAVista, onAddNota, onAddCita, onAddEvento, onAddComentario, tab, onTab, onVerProyecto }) {
  const setTab = onTab;
  const citas = (data.citas || []).filter((x) => x.contactoId === c.id);
  const archivos = (data.comentarios || [])
    .filter((x) => x.entidadTipo === "contactos" && x.entidadId === c.id)
    .reduce((n, x) => n + (x.adjuntos || []).length, 0);
  const atenciones = (data.regalos || [])
    .filter((r) => r.contactoId === c.id)
    .sort((a, b) => (b.fecha || "").localeCompare(a.fecha || ""));
  const eventos = (data.eventos || [])
    .filter((e) => e.contactoId === c.id)
    .sort((a, b) => (b.fecha || "").localeCompare(a.fecha || ""));
  const notas = (data.notas || []).filter((n) => n.contactoId === c.id);
  const ultimaAtencion = atenciones[0];

  const TABS = [
    { key: "informacion", label: "Información" },
    { key: "proyectos", label: "Proyectos", n: proyectosVinculados.length },
    { key: "agenda", label: "Agenda", n: citas.length },
    { key: "notas", label: "Notas", n: notas.length },
    { key: "eventos", label: "Eventos", n: eventos.length },
    { key: "atenciones", label: "Atenciones", n: atenciones.length },
    { key: "archivos", label: "Archivos", n: archivos },
  ];

  const Dato = ({ label, valor }) => (
    valor ? (
      <div className="flex items-start justify-between gap-3 py-1.5">
        <span className="text-xs gp-text-muted shrink-0">{label}</span>
        <span className="text-xs text-right">{valor}</span>
      </div>
    ) : null
  );

  const Bloque = ({ titulo, icono, accion, children }) => (
    <div className="gp-panel p-3.5 mb-3">
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm font-medium flex items-center gap-1.5">{icono} {titulo}</p>
        {accion}
      </div>
      {children}
    </div>
  );

  const Vacio = ({ children }) => <p className="text-xs gp-text-muted py-2">{children}</p>;

  return (
    <div className="gp-panel p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-3 min-w-0">
          <AvatarContacto c={c} size={64} />
          <div className="min-w-0">
            {/* Solo nombre y apellidos. El título va como dato, más abajo. */}
            <p className="gp-serif text-lg leading-tight">{c.nombre}</p>
            <div className="mt-1 flex flex-wrap items-center gap-1"><ChipsTiposContacto c={c} /><ChipsEtiquetasContacto c={c} /></div>
            {c.puesto && <p className="text-xs gp-text-muted mt-1">{c.puesto}</p>}
            {c.empresa && <p className="text-xs gp-text-muted">{c.empresa}</p>}
            <div className="mt-1"><BadgeCumpleContacto c={c} /></div>
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button onClick={onEditar} className="gp-btn-ghost px-2.5 py-1.5 text-xs rounded flex items-center gap-1"><Pencil size={12} /> Editar</button>
          <IconBtn title="Cerrar" onClick={onCerrar}><X size={15} /></IconBtn>
        </div>
      </div>

      {/* Los botones SIEMPRE conservan su color (verde WhatsApp, azul correo), aunque el contacto
          todavía no tenga ese dato — apagarlos hacía que la ficha se viera rota estando bien
          (pedido de Angel, 24 sept 2026). Si falta el dato, el botón no lleva a un enlace roto:
          abre el formulario para capturarlo. */}
      <div className="grid grid-cols-2 gap-2 mt-3">
        <BotonAccionFicha
          color={VERDE_WHATSAPP} colorTexto="#0B2341" icono={<IconoWhatsApp size={14} color="#0B2341" />} label="WhatsApp"
          href={c.whatsapp ? `https://wa.me/${(c.whatsapp || "").replace(/\D/g, "")}` : null}
          nuevaPestana onFalta={onEditar} faltaTitulo="Agrega su WhatsApp"
        />
        <BotonAccionFicha
          color={AZUL_CORREO} icono={<Mail size={13} />} label="Enviar correo"
          href={c.correo ? `mailto:${c.correo}` : null}
          onFalta={onEditar} faltaTitulo="Agrega su correo"
        />
        {/* Llamada telefónica normal (tel:), no WhatsApp — por eso va en verde bandera y con el
            ícono de teléfono, para que no se confunda con el botón de arriba. */}
        <BotonAccionFicha
          color={VERDE_BANDERA} icono={<Phone size={13} />} label="Llamar"
          href={(c.telefono || c.whatsapp) ? `tel:${c.telefono || c.whatsapp}` : null}
          onFalta={onEditar} faltaTitulo="Agrega su teléfono"
        />
        <BotonAccionFicha
          color="var(--gold)" colorTexto="#0B2341" icono={<CalendarClock size={13} />} label="Agendar"
          onClick={() => setTab("agenda")}
        />
      </div>

      <div className="flex flex-wrap gap-1 mt-4 mb-3">
        {TABS.map((t) => (
          <button
            key={t.key} onClick={() => setTab(t.key)}
            className="text-xs px-2.5 py-1.5 rounded-full whitespace-nowrap shrink-0"
            style={tab === t.key
              ? { background: "var(--panel-hi)", color: "var(--text)", fontWeight: 600 }
              : { color: "var(--muted)" }}
          >
            {t.label}{t.n === undefined ? "" : ` ${t.n}`}
          </button>
        ))}
      </div>

      {tab === "informacion" && (
        <>
          <Bloque titulo="Información personal" icono={<User size={14} className="gp-text-gold" />}>
            <Dato label="Nombre(s)" valor={c.nombres} />
            <Dato label="Apellido paterno" valor={c.apellidoPaterno} />
            <Dato label="Apellido materno" valor={c.apellidoMaterno} />
            {/* El título vive aquí desde que salió del nombre: se captura para dirigirse a la
                persona ("Estimado M en C Quintana"), no para identificarla en una lista. */}
            <Dato label="Título" valor={c.titulo} />
            <Dato label="Cumpleaños" valor={c.fechaNacimiento} />
            <Dato label="Parentesco" valor={c.parentesco} />
            <Dato label="Dónde lo conociste" valor={c.contexto} />
            {/* La nota del contacto ya NO se muestra aquí: vive en su propia pestaña de Notas,
                para no tener dos lugares distintos donde escribir sobre la misma persona
                (pedido de Angel, 24 sept 2026). */}
            {!c.nombres && !c.fechaNacimiento && !c.contexto && <Vacio>Sin datos personales capturados todavía.</Vacio>}
          </Bloque>

          <Bloque titulo="Comunicación" icono={<Contact size={14} className="gp-text-gold" />}>
            <Dato label="WhatsApp" valor={c.whatsapp} />
            <Dato label="Teléfono" valor={c.telefono} />
            <Dato label="Correo" valor={c.correo} />
            <Dato label="Dirección" valor={c.direccion} />
            {!c.whatsapp && !c.telefono && !c.correo && !c.direccion && <Vacio>Sin datos de contacto todavía.</Vacio>}
          </Bloque>

          <Bloque titulo="Resumen" icono={<BarChart3 size={14} className="gp-text-gold" />}>
            <div className="grid grid-cols-4 gap-2">
              {[
                { n: proyectosVinculados.length, label: "Proyectos", color: "#F59E0B" },
                { n: atenciones.length, label: "Atenciones", color: "#EC4899" },
                { n: eventos.length, label: "Eventos", color: "#087CF5" },
                { n: notas.length, label: "Notas", color: "#8B5CF6" },
              ].map((x) => (
                <div key={x.label} className="rounded-lg p-2 text-center" style={{ background: `${x.color}17` }}>
                  <p className="gp-serif text-lg" style={{ color: x.color }}>{x.n}</p>
                  <p className="text-[10px] gp-text-muted">{x.label}</p>
                </div>
              ))}
            </div>
            {ultimaAtencion && (
              <div className="flex items-center justify-between gap-2 mt-3 pt-2.5 border-t gp-border">
                <span className="text-xs gp-text-muted">Última atención: <span className="gp-mono">{ultimaAtencion.fecha || "—"}</span> · {ultimaAtencion.tipo}</span>
                {onVerAtenciones && <button onClick={() => onVerAtenciones(c)} className="text-xs gp-text-gold shrink-0">Ver todas →</button>}
              </div>
            )}
          </Bloque>

          <Bloque
            titulo="Proyectos relacionados"
            icono={<FolderKanban size={14} className="gp-text-gold" />}
            accion={proyectosVinculados.length > 0 && <button onClick={() => setTab("proyectos")} className="text-xs gp-text-gold">Ver todos ({proyectosVinculados.length})</button>}
          >
            {proyectosVinculados.length === 0
              ? <Vacio>Sin proyectos vinculados. Se vinculan al editar el contacto.</Vacio>
              : (
                <div className="flex flex-col gap-1.5">
                  {proyectosVinculados.slice(0, 3).map((p) => (
                    <button key={p.id} onClick={() => onVerProyecto?.(p.id)} className="flex items-center justify-between gap-2 w-full text-left">
                      <div className="min-w-0">
                        <p className="text-xs font-medium truncate">{p.nombre}</p>
                        <p className="text-[10px] gp-text-muted">{p.categoria}</p>
                      </div>
                      <Badge tone={p.estatus === "Activo" ? "teal" : "muted"}>{p.estatus}</Badge>
                    </button>
                  ))}
                </div>
              )}
          </Bloque>
        </>
      )}

      {tab === "proyectos" && (
        <Bloque titulo="Proyectos relacionados" icono={<FolderKanban size={14} className="gp-text-gold" />} accion={<button onClick={onEditar} className="text-xs gp-text-gold">Vincular</button>}>
          {proyectosVinculados.length === 0
            ? <Vacio>Sin proyectos vinculados. Dale a "Vincular" para relacionarlo con uno o varios.</Vacio>
            : (
              <div className="flex flex-col gap-2">
                {proyectosVinculados.map((p) => (
                  <div key={p.id} className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-xs font-medium truncate">{p.nombre}</p>
                      <p className="text-[10px] gp-text-muted">{p.categoria}</p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <Badge tone={p.estatus === "Activo" ? "teal" : "muted"}>{p.estatus}</Badge>
                      <button onClick={() => onVerProyecto?.(p.id)} className="text-xs gp-text-gold">Abrir</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
        </Bloque>
      )}

      {tab === "agenda" && (
        <Bloque titulo="Agenda con este contacto" icono={<CalendarClock size={14} className="gp-text-gold" />}>
          <AgendaContacto c={c} data={data} onAddCita={onAddCita} onIrAVista={onIrAVista} />
        </Bloque>
      )}

      {tab === "notas" && (
        <Bloque titulo="Notas" icono={<StickyNote size={14} className="gp-text-gold" />}>
          {/* La nota corta que se captura en la ficha del contacto (campo `notas`), que antes
              salía perdida dentro de Información general. */}
          {c.notas && (
            <div className="mb-3 pb-2.5 border-b gp-border">
              <p className="text-[10px] uppercase tracking-wide gp-text-muted mb-1">Nota del contacto</p>
              <p className="text-xs">{c.notas}</p>
            </div>
          )}
          {notas.length === 0
            ? <Vacio>Sin notas ligadas a este contacto. Las que crees aquí quedan también en el módulo de Notas.</Vacio>
            : (
              <div className="flex flex-col gap-2">
                {notas.map((n) => (
                  <div key={n.id} className="pb-2 border-b gp-border last:border-0">
                    <p className="text-xs font-medium">{n.titulo || "(sin título)"}</p>
                    {n.contenido && <p className="text-[11px] gp-text-muted line-clamp-2">{n.contenido}</p>}
                  </div>
                ))}
                <button onClick={() => onIrAVista?.("notas")} className="text-xs gp-text-gold text-left">Ver en Notas →</button>
              </div>
            )}
          {onAddNota && <NuevaNotaContacto c={c} onAddNota={onAddNota} />}
        </Bloque>
      )}

      {tab === "eventos" && (
        <Bloque
          titulo="Eventos"
          icono={<CalendarClock size={14} className="gp-text-gold" />}
          accion={eventos.length > 0 && <button onClick={() => onIrAVista?.("eventos")} className="text-xs gp-text-gold">Ver en Eventos</button>}
        >
          {eventos.length === 0
            ? <Vacio>Sin eventos relacionados con este contacto. Crea uno aquí abajo y queda en el módulo de Eventos.</Vacio>
            : (
              <div className="flex flex-col gap-2">
                {/* Cada renglón entra al módulo Eventos: la ficha consulta, no duplica. */}
                {eventos.map((e) => (
                  <button key={e.id} onClick={() => onIrAVista?.("eventos")} className="flex items-center justify-between gap-2 w-full text-left gp-panel-hi rounded px-1.5 py-1">
                    <div className="min-w-0">
                      <p className="text-xs font-medium truncate">{e.nombre}</p>
                      {e.lugar && <p className="text-[10px] gp-text-muted truncate">{e.lugar}</p>}
                    </div>
                    <span className="text-[10px] gp-mono gp-text-muted shrink-0">{e.fecha}</span>
                  </button>
                ))}
              </div>
            )}
          {onAddEvento && <div className="mt-2"><NuevoEventoContacto c={c} onAddEvento={onAddEvento} /></div>}
        </Bloque>
      )}

      {tab === "atenciones" && (
        <Bloque
          titulo="Atenciones"
          icono={<Gift size={14} className="gp-text-gold" />}
          accion={onVerAtenciones && <button onClick={() => onVerAtenciones(c)} className="text-xs gp-text-gold">Ver todas</button>}
        >
          {atenciones.length === 0
            ? <Vacio>Sin atenciones registradas: regalos, felicitaciones, llamadas, visitas…</Vacio>
            : (
              <div className="flex flex-col gap-2">
                {atenciones.map((a) => (
                  <div key={a.id} className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-xs font-medium">{a.tipo}{a.ocasion ? ` · ${a.ocasion}` : ""}</p>
                      {a.descripcion && <p className="text-[10px] gp-text-muted truncate">{a.descripcion}</p>}
                    </div>
                    <span className="text-[10px] gp-mono gp-text-muted shrink-0">{a.fecha || a.anio || ""}</span>
                  </div>
                ))}
              </div>
            )}
        </Bloque>
      )}

      {tab === "archivos" && (
        <Bloque titulo="Archivos" icono={<FileText size={14} className="gp-text-gold" />}>
          <ArchivosEntidad
            entidadTipo="contactos" entidadId={c.id} carpeta="contactos"
            data={data} onAddComentario={onAddComentario}
            vacioTexto="Sin archivos todavía. Sube contratos, identificaciones, cotizaciones o lo que necesites tener a la mano de esta persona."
          />
        </Bloque>
      )}
    </div>
  );
}

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
// Las banderas son emoji: en Mac, iPhone y Android se dibujan; en Windows se ven como dos letras
// (WIN no trae glifos de bandera), y por eso la lada siempre va escrita al lado y no solo el icono.
const PAISES_LADA = [
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

// Separa un número guardado ("+1 213 555 0123") en lada + resto. Los números viejos, capturados
// sin lada, se quedan tal cual en el campo de número y con el país en blanco: no se les inventa
// un país, porque adivinarlo mal rompería el enlace de WhatsApp.
function partirTelefono(valor) {
  const txt = (valor || "").trim();
  if (!txt.startsWith("+")) return { iso: "", numero: txt };
  const candidatos = [...PAISES_LADA].sort((a, b) => b.lada.length - a.lada.length);
  const p = candidatos.find((x) => txt.startsWith(x.lada));
  if (!p) return { iso: "", numero: txt };
  return { iso: p.iso, numero: txt.slice(p.lada.length).trim() };
}

// Campo de teléfono con código de país. Guarda UN solo string ("+52 55 1234 5678") en la misma
// columna de siempre: no se parte en dos columnas, porque el número es un dato, no dos. Los
// enlaces de wa.me y tel: ya limpian lo que no sea dígito, así que el "+" y los espacios no
// estorban y sí hacen el número legible.
function CampoTelefonoPais({ valor, onChange, placeholderNumero }) {
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

function ContactoForm({ item, proyectos, vinculos, etiquetasExistentes = [], titulosExistentes = TITULOS_CONTACTO, catalogoEtiquetas, catalogoTitulos, onVincularProyecto, onDesvincularProyecto, onSave }) {
  // El id se decide desde ahora (no al guardar) para poder subir la foto y armar la ruta de
  // Storage antes de que el contacto exista como fila — mismo truco que ya usa ContactoRapidoForm.
  const [contactoId] = useState(() => item.id || uid());
  const [v, setV] = useState({
    ...item,
    nombres: item.nombres ?? item.nombre ?? "",
    apellidoPaterno: item.apellidoPaterno || "",
    apellidoMaterno: item.apellidoMaterno || "",
    tipos: item.tipos && item.tipos.length ? item.tipos : (item.tipo ? [item.tipo] : ["Cliente"]),
    fotoUrl: item.fotoUrl || "",
    empresa: item.empresa || "",
    puesto: item.puesto || "",
    telefono: item.telefono || "",
  });
  const [error, setError] = useState("");
  const [otroParentesco, setOtroParentesco] = useState(() => !!item.parentesco && !PARENTESCOS.includes(item.parentesco));
  // Proyectos vinculados. Si el contacto YA existe, vincular/desvincular se guarda al momento:
  // esperar al botón Guardar hacía que se perdieran si el formulario se cerraba de cualquier otra
  // forma (la X, un clic fuera, "descartar cambios") — que es justo lo que reportó Angel el 24
  // sept 2026. Para un contacto NUEVO no se puede guardar todavía (la fila no existe y la llave
  // foránea lo rechazaría), así que ahí sí se acumulan en memoria y se crean al guardar.
  const esNuevo = !item.id;
  const [proyectosSeleccionados, setProyectosSeleccionados] = useState(() =>
    (vinculos || []).map((vinc) => ({ id: vinc.proyectoId, label: proyectos.find((p) => p.id === vinc.proyectoId)?.nombre || "—" }))
  );
  const agregarProyecto = (o) => {
    setProyectosSeleccionados((prev) => (prev.some((p) => p.id === o.id) ? prev : [...prev, o]));
    if (!esNuevo) onVincularProyecto?.(contactoId, o.id);
  };
  const quitarProyecto = (proyectoId) => {
    setProyectosSeleccionados((prev) => prev.filter((p) => p.id !== proyectoId));
    if (!esNuevo) {
      const vinculo = (vinculos || []).find((vv) => vv.proyectoId === proyectoId);
      if (vinculo) onDesvincularProyecto?.(vinculo.id);
    }
  };
  const toggleTipo = (t) => setV((prev) => ({ ...prev, tipos: prev.tipos.includes(t) ? prev.tipos.filter((x) => x !== t) : [...prev.tipos, t] }));

  const guardar = () => {
    if (!v.nombres?.toString().trim()) { setError("El nombre del contacto es obligatorio."); return; }
    if (v.tipos.length === 0) { setError("Elige al menos un tipo."); return; }
    setError("");
    const nombres = v.nombres.trim();
    const apellidoPaterno = (v.apellidoPaterno || "").trim();
    const apellidoMaterno = (v.apellidoMaterno || "").trim();
    // proyectoId ya no es una columna de contactos (ahora es tabla puente contacto_proyectos) —
    // se descarta explícitamente por si el navegador todavía trae un contacto en memoria desde
    // antes de la migración, para no mandar una columna que Supabase ya no tiene.
    const { proyectoId: _proyectoIdViejo, ...vLimpio } = v;
    onSave({ ...vLimpio, id: contactoId, nombres, apellidoPaterno, apellidoMaterno, nombre: armarNombreContacto(nombres, apellidoPaterno, apellidoMaterno) });
    // Solo el contacto nuevo trae vínculos pendientes; al editar ya se guardaron al momento.
    if (esNuevo) {
      for (const p of proyectosSeleccionados) onVincularProyecto?.(contactoId, p.id);
    }
  };

  return (
    <div>
      <div className="flex justify-center mb-3">
        <AvatarForm
          avatarUrl={v.fotoUrl}
          helpText="Foto del contacto (opcional). Si no subes una, se muestran sus iniciales."
          subirAvatar={async (file) => {
            const path = `contactos/${contactoId}/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
            const { error: upErr } = await supabase.storage.from("adjuntos").upload(path, file);
            if (upErr) return { error: upErr.message };
            const { data: pub } = supabase.storage.from("adjuntos").getPublicUrl(path);
            setV((prev) => ({ ...prev, fotoUrl: pub.publicUrl }));
            return { url: pub.publicUrl };
          }}
        />
      </div>
      <Field label="Nombre(s)"><input className="gp-input" autoFocus value={v.nombres} onChange={(e) => setV({ ...v, nombres: e.target.value })} /></Field>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="Apellido paterno"><input className="gp-input" value={v.apellidoPaterno} onChange={(e) => setV({ ...v, apellidoPaterno: e.target.value })} /></Field>
        <Field label="Apellido materno"><input className="gp-input" value={v.apellidoMaterno} onChange={(e) => setV({ ...v, apellidoMaterno: e.target.value })} /></Field>
      </div>
      <Field label="Tipo de contacto (puede ser varios)">
        <div className="flex flex-wrap gap-1.5">
          {TIPOS_CONTACTO.map((t) => {
            const color = COLOR_TIPO_CONTACTO[t];
            return (
              <button
                key={t} type="button" onClick={() => toggleTipo(t)}
                className="text-xs px-2.5 py-1 rounded-full border"
                style={v.tipos.includes(t)
                  ? { background: color, color: "#0B2341", borderColor: color, fontWeight: 600 }
                  : { borderColor: "var(--border)", color: "var(--muted)" }}
              >
                {t}
              </button>
            );
          })}
        </div>
      </Field>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="Empresa/Organización (opcional)"><input className="gp-input" value={v.empresa} onChange={(e) => setV({ ...v, empresa: e.target.value })} /></Field>
        <Field label="Puesto/Cargo (opcional)"><input className="gp-input" value={v.puesto} onChange={(e) => setV({ ...v, puesto: e.target.value })} /></Field>
      </div>
      <Field label="Parentesco (opcional)">
        <select
          className="gp-input"
          value={otroParentesco ? "Otro" : (v.parentesco || "")}
          onChange={(e) => {
            if (e.target.value === "Otro") { setOtroParentesco(true); setV({ ...v, parentesco: "" }); }
            else { setOtroParentesco(false); setV({ ...v, parentesco: e.target.value }); }
          }}
        >
          <option value="">— ninguno —</option>
          {PARENTESCOS.map((p) => <option key={p}>{p}</option>)}
          <option value="Otro">Otro…</option>
        </select>
        {otroParentesco && (
          <input className="gp-input mt-2" placeholder="Escribe el parentesco" value={v.parentesco || ""} onChange={(e) => setV({ ...v, parentesco: e.target.value })} />
        )}
      </Field>
      <CumpleanosField value={v.fechaNacimiento} onChange={(f) => setV({ ...v, fechaNacimiento: f })} />
      <Field label="Dónde lo conociste"><input className="gp-input" placeholder="ej. Expo Acapulco 2026" value={v.contexto} onChange={(e) => setV({ ...v, contexto: e.target.value })} /></Field>
      <Field label="Proyectos relacionados (puede ser varios)">
        <ComboboxMultiBuscar
          seleccionados={proyectosSeleccionados}
          opciones={proyectos.map((p) => ({ id: p.id, label: p.nombre }))}
          onAgregar={agregarProyecto}
          onQuitar={quitarProyecto}
          placeholder="Buscar proyecto…"
        />
        {!esNuevo && <p className="text-[10px] gp-text-muted -mt-2 mb-2">Los proyectos se guardan al momento, no hace falta dar Guardar.</p>}
      </Field>
      {/* El país va aparte para que nadie tenga que acordarse de teclear "+1" o "+52": se elige y
          ya. Con la lada puesta, el botón de WhatsApp funciona con contactos de cualquier país
          (antes, un número de EU sin lada abría un chat inexistente). */}
      <Field label="WhatsApp">
        <CampoTelefonoPais valor={v.whatsapp} onChange={(x) => setV({ ...v, whatsapp: x })} placeholderNumero="55 1234 5678" />
      </Field>
      <Field label="Teléfono (opcional)">
        <CampoTelefonoPais valor={v.telefono} onChange={(x) => setV({ ...v, telefono: x })} placeholderNumero="55 1234 5678" />
      </Field>
      <Field label="Correo (opcional)"><input className="gp-input" value={v.correo} onChange={(e) => setV({ ...v, correo: e.target.value })} /></Field>

      {/* Dos ejes distintos, a propósito en dos campos. El título es cómo le hablas a la persona
          (un solo valor). Las etiquetas son a qué mundo pertenece —Médicos, Gobierno,
          ExGobierno— y por eso admiten varias: alguien puede ser médico Y de gobierno, y
          "ExGobierno" es justo el caso donde un campo único te obligaría a elegir entre lo que
          es hoy y lo que fue. Ninguna sustituye al Tipo de contacto, que es TU relación con esa
          persona: si "Médico" se metiera ahí, el filtro de Clientes dejaría de servir. */}
      {/* Mismo buscador que las etiquetas, con una diferencia a propósito: max=1, porque una
          persona tiene UN título. Se busca entre los ya usados y si no está sale "Crear…",
          igual que en etiquetas, en vez del datalist que parecía una lista cerrada. */}
      <Field label="Título (opcional)">
        <ComboboxMultiBuscar
          max={1}
          seleccionados={v.titulo ? [{ id: v.titulo, label: v.titulo }] : []}
          opciones={titulosExistentes.map((t) => ({ id: t, label: t }))}
          onAgregar={(o) => setV({ ...v, titulo: o.id })}
          onQuitar={() => setV({ ...v, titulo: "" })}
          onCrear={(texto) => setV({ ...v, titulo: texto })}
          onRenombrarOpcion={catalogoTitulos?.renombrar}
          onEliminarOpcion={catalogoTitulos?.eliminar}
          placeholder="Buscar o escribir un título… (Arq., Dr., Lic.)"
          crearLabel={(t) => `Crear título "${t}"`}
        />
      </Field>
      <Field label="Etiquetas (opcional — para agrupar y buscar: Médicos, Gobierno, ExGobierno…)">
        <ComboboxMultiBuscar
          seleccionados={(v.etiquetas || []).map((e) => ({ id: e, label: e }))}
          opciones={etiquetasExistentes.map((e) => ({ id: e, label: e }))}
          onAgregar={(o) => setV({ ...v, etiquetas: [...(v.etiquetas || []), o.id] })}
          onQuitar={(id) => setV({ ...v, etiquetas: (v.etiquetas || []).filter((x) => x !== id) })}
          onCrear={(texto) => setV({ ...v, etiquetas: [...(v.etiquetas || []), texto] })}
          onRenombrarOpcion={catalogoEtiquetas?.renombrar}
          onEliminarOpcion={catalogoEtiquetas?.eliminar}
          placeholder="Escribe una etiqueta…"
          crearLabel={(t) => `Crear etiqueta "${t}"`}
        />
      </Field>
      <Field label="Dirección (opcional)"><textarea className="gp-input" rows={2} placeholder="Calle, número, colonia, ciudad…" value={v.direccion || ""} onChange={(e) => setV({ ...v, direccion: e.target.value })} /></Field>
      <Field label="Notas"><textarea className="gp-input" rows={2} value={v.notas} onChange={(e) => setV({ ...v, notas: e.target.value })} /></Field>
      {error && <p className="text-xs gp-text-red mb-2">{error}</p>}

      <button className="gp-btn w-full py-2 text-sm mt-2" onClick={guardar}>
        Guardar
      </button>
    </div>
  );
}

/* ---------- Regalos (histórico de regalos/felicitaciones, incluye control de Navidad) ---------- */
function Regalos({ data, onAdd, onEdit, onRemove, filtroContactoInicial, onLimpiarFiltro, onVerContacto,
  onAddNota, onAddCita, onAddEvento, onAddComentario, onCrearContacto, onIrAVista, onVerProyecto }) {
  // Ancho de la ficha de la derecha, arrastrable y recordado por pantalla.
  const { contenedorRef, divisor, estiloPanel } = usePanelRedimensionable("atenciones");
  const [modal, setModal] = useState(null);
  // Ficha del contacto abierta a la derecha, sin salir de Atenciones (pedido de Angel,
  // 29 sept 2026): el grid se queda a la izquierda y la navegación no cambia de pantalla.
  const [contactoFichaId, setContactoFichaId] = useState(null);
  const [fichaTab, setFichaTab] = useState("informacion");
  const [filtroContacto, setFiltroContacto] = useState(filtroContactoInicial || "");
  const [filtroOcasion, setFiltroOcasion] = useState("Todos");
  const [filtroAnio, setFiltroAnio] = useState("Todos");
  const [orden, setOrden] = useState("default");
  const [ordenDir, setOrdenDir] = useState("asc");
  const [busqueda, setBusqueda] = useState("");
  const toggleOrden = (key) => { if (orden === key) setOrdenDir((d) => (d === "asc" ? "desc" : "asc")); else { setOrden(key); setOrdenDir("asc"); } };
  const anioActual = new Date().getFullYear();
  const empty = { contactoId: filtroContactoInicial || "", tipo: "Regalo", ocasion: "Cumpleaños", anio: anioActual, fecha: "", descripcion: "", costo: "", estatus: "Por comprar", notas: "" };

  const nombreContacto = (id) => data.contactos.find((c) => c.id === id)?.nombre || "—";
  const anios = [...new Set(data.regalos.map((r) => r.anio).filter(Boolean))].sort((a, b) => b - a);
  const contactoFicha = contactoFichaId ? (data.contactos || []).find((c) => c.id === contactoFichaId) : null;
  // Mismo cálculo que en Contactos: la ficha se arma con la tabla puente contacto_proyectos.
  const proyectosDeContacto = (contactoId) => (data.contactoProyectos || [])
    .filter((v) => v.contactoId === contactoId)
    .map((v) => (data.proyectos || []).find((p) => p.id === v.proyectoId))
    .filter(Boolean);
  const abrirFicha = (contactoId) => { setContactoFichaId(contactoId); setFichaTab("informacion"); };

  const camposOrden = {
    fecha: { get: (r) => r.fecha, tipo: "fecha" },
    registro: { get: (r) => r.createdAt, tipo: "fecha" },
    alfabetico: { get: (r) => nombreContacto(r.contactoId), tipo: "texto" },
    costo: { get: (r) => Number(r.costo) || 0, tipo: "numero" },
  };
  const opcionesOrden = [
    { key: "fecha", label: "fecha" },
    { key: "registro", label: "fecha de registro" },
    { key: "alfabetico", label: "alfabético (contacto)" },
    { key: "costo", label: "costo" },
  ];

  let filtrados = data.regalos;
  if (filtroContacto) filtrados = filtrados.filter((r) => r.contactoId === filtroContacto);
  if (filtroOcasion !== "Todos") filtrados = filtrados.filter((r) => r.ocasion === filtroOcasion);
  if (filtroAnio !== "Todos") filtrados = filtrados.filter((r) => String(r.anio) === String(filtroAnio));
  filtrados = filtrarPorBusqueda(filtrados, busqueda, [(r) => r.descripcion, (r) => r.ocasion, (r) => r.notas, (r) => nombreContacto(r.contactoId)]);
  const ordenados = ordenarLista(filtrados, orden, camposOrden, ordenDir);
  const totalGastado = ordenados.reduce((s, r) => s + (Number(r.costo) || 0), 0);
  const columnasExport = [
    { label: "Contacto", get: (r) => nombreContacto(r.contactoId) }, { label: "Tipo", get: (r) => r.tipo },
    { label: "Ocasión", get: (r) => r.ocasion }, { label: "Año", get: (r) => r.anio },
    { label: "Fecha", get: (r) => r.fecha }, { label: "Descripción", get: (r) => r.descripcion },
    { label: "Costo", get: (r) => r.costo }, { label: "Estatus", get: (r) => r.estatus },
  ];

  return (
    <div ref={contenedorRef} className="flex flex-col lg:flex-row gap-4 items-start">
      {/* El grid de atenciones se queda siempre aquí a la izquierda; la ficha del contacto abre a
          la derecha, sin cambiar de pantalla. En celular no caben lado a lado, así que ahí la
          ficha toma el ancho completo — mismo comportamiento que Contactos y Proyectos. */}
      <div className={`min-w-0 flex-1 w-full ${contactoFicha ? "hidden lg:block" : ""}`}>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-1">
        <h2 className="gp-serif text-2xl">Atenciones</h2>
        <button onClick={() => setModal({ item: empty })} className="gp-btn flex items-center justify-center gap-1 px-3 py-1.5 text-sm w-full sm:w-auto"><Plus size={14} /> Nuevo</button>
      </div>
      <p className="text-sm gp-text-muted mb-3">Regalos, felicitaciones, condolencias y agradecimientos a tus contactos. Para ver una ocasión concreta —Navidad, cumpleaños— usa el filtro de ocasión y el de año.</p>

      <div className="flex flex-wrap items-center gap-2 mb-2">
        {filtroContacto && (
          <span className="text-xs px-2.5 py-1 rounded-full border flex items-center gap-1">
            {nombreContacto(filtroContacto)}
            <button onClick={() => { setFiltroContacto(""); onLimpiarFiltro?.(); }} className="gp-text-red">✕</button>
          </span>
        )}
        <select className="gp-input text-xs py-1.5" style={{ width: "auto" }} value={filtroOcasion} onChange={(e) => setFiltroOcasion(e.target.value)}>
          <option value="Todos">Todas las ocasiones</option>
          {OCASIONES_REGALO.map((o) => <option key={o}>{o}</option>)}
        </select>
        <select className="gp-input text-xs py-1.5" style={{ width: "auto" }} value={filtroAnio} onChange={(e) => setFiltroAnio(e.target.value)}>
          <option value="Todos">Todos los años</option>
          {anios.map((a) => <option key={a} value={a}>{a}</option>)}
        </select>
        <OrdenSelector opciones={opcionesOrden} value={orden} onChange={setOrden} />
      </div>
      <BarraListaEstandar busqueda={busqueda} onBusqueda={setBusqueda} placeholder="Buscar por contacto, ocasión o descripción…"
        onExportExcel={() => exportarFilasExcel(ordenados, columnasExport, "atenciones")}
        onExportPDF={() => exportarFilasPDF(ordenados, columnasExport, "atenciones", "Atenciones", busqueda ? `búsqueda: "${busqueda}"` : "")} />

      {totalGastado > 0 && (
        <p className="text-xs gp-text-muted mb-3">Total en esta vista: <span className="gp-mono gp-text-gold">{fmtMoney(totalGastado)}</span></p>
      )}

      <div className="gp-panel overflow-x-auto">
        <table className="gp-table">
          <thead><tr><Th label="Contacto" sortKey="alfabetico" orden={orden} ordenDir={ordenDir} onToggle={toggleOrden} /><th>Tipo</th><th>Ocasión</th><th>Año</th><Th label="Fecha" sortKey="fecha" orden={orden} ordenDir={ordenDir} onToggle={toggleOrden} /><th>Detalle</th><Th label="Costo" sortKey="costo" orden={orden} ordenDir={ordenDir} onToggle={toggleOrden} /><th>Estatus</th><th></th></tr></thead>
          <tbody>
            {ordenados.map((r) => (
              // Tocar el renglón abre la ficha completa de esa persona en Contactos — la misma
              // misma ficha que usa Contactos (la entidad maestra de personas), no una copia.
              <tr key={r.id}
                onClick={() => r.contactoId && abrirFicha(r.contactoId)}
                style={{ cursor: r.contactoId ? "pointer" : "default", background: r.contactoId === contactoFichaId ? "var(--panel-hi)" : undefined }}
                title={r.contactoId ? "Ver la ficha de este contacto" : undefined}>
                <td>{nombreContacto(r.contactoId)}</td>
                <td><Badge tone="gold">{r.tipo || "Regalo"}</Badge></td>
                <td><Badge tone="muted">{r.ocasion}</Badge></td>
                <td className="gp-mono">{r.anio || "—"}</td>
                <td className="gp-mono">{r.fecha || "—"}</td>
                <td className="gp-text-muted">{r.descripcion}</td>
                <td className="gp-mono">{r.costo ? fmtMoney(r.costo) : "—"}</td>
                <td onClick={(e) => e.stopPropagation()}>
                  <SelectGuardable
                    valor={r.estatus || "Por comprar"} opciones={ESTATUS_REGALO} ariaLabel="Estatus de la atención"
                    onGuardar={(nuevo) => onEdit(r.id, { estatus: nuevo })}
                  />
                </td>
                <td onClick={(e) => e.stopPropagation()}><div className="flex gap-1"><IconBtn title="Editar" onClick={() => setModal({ item: r })}><Pencil size={13} /></IconBtn><IconBtn title="Eliminar" onClick={() => onRemove(r.id)}><Trash2 size={13} /></IconBtn></div></td>
              </tr>
            ))}
            {ordenados.length === 0 && <tr><td colSpan={9} className="text-center gp-text-muted py-6">Sin atenciones registradas con este filtro.</td></tr>}
          </tbody>
        </table>
      </div>

      {modal && (
        <Modal title={modal.item.id ? "Editar atención" : "Nueva atención"} onClose={() => setModal(null)}>
          <RegaloForm item={modal.item} contactos={data.contactos} onCrearContacto={onCrearContacto}
            onSave={(v) => { modal.item.id ? onEdit(modal.item.id, v) : onAdd(v); setModal(null); }} />
        </Modal>
      )}
      </div>

      {contactoFicha && divisor}
      {contactoFicha && (
        <div className="w-full shrink-0 lg:sticky lg:top-4" style={estiloPanel}>
          <FichaContacto
            c={contactoFicha}
            data={data}
            proyectosVinculados={proyectosDeContacto(contactoFicha.id)}
            onCerrar={() => setContactoFichaId(null)}
            /* Editar sí lleva a Contactos: ahí vive el formulario completo de la persona, y es un
               salto que el usuario pidió a propósito, no el efecto de tocar un renglón. */
            onEditar={() => onVerContacto?.(contactoFicha.id)}
            /* Ya estamos en Atenciones: "ver todas" filtra este mismo grid por esa persona. */
            onVerAtenciones={(c) => setFiltroContacto(c.id)}
            onIrAVista={onIrAVista}
            onAddNota={onAddNota}
            onAddCita={onAddCita}
            onAddEvento={onAddEvento}
            onAddComentario={onAddComentario}
            tab={fichaTab} onTab={setFichaTab}
            onVerProyecto={onVerProyecto}
          />
        </div>
      )}
    </div>
  );
}

function RegaloForm({ item, contactos, onCrearContacto, onSave }) {
  const [v, setV] = useState(item);
  const [error, setError] = useState("");
  const contactoElegido = v.contactoId ? (contactos || []).find((c) => c.id === v.contactoId) : null;
  // Combo alfabético, como el resto de los combos de la app: la lista llega en orden de captura
  // y con muchos contactos encontrar a alguien se vuelve una lotería.
  const contactosOrdenados = useMemo(
    () => [...(contactos || [])].sort((a, b) => (a.nombre || "").localeCompare(b.nombre || "", "es", { sensitivity: "base" })),
    [contactos]);
  return (
    <div>
      {/* Misma mecánica que en Nueva tarea (pedido de Angel, 30 sept 2026): se busca por nombre y,
          si la persona no existe, se crea desde aquí. Al crearla se abre el formulario corto para
          completar apellidos, correo y WhatsApp sin salir de la atención. */}
      <Field label="Contacto">
        <ComboboxMultiBuscar
          max={1}
          seleccionados={contactoElegido ? [{ id: contactoElegido.id, label: contactoElegido.nombre }] : []}
          opciones={contactosOrdenados.map((c) => ({ id: c.id, label: c.nombre }))}
          onAgregar={(o) => setV({ ...v, contactoId: o.id })}
          onQuitar={() => setV({ ...v, contactoId: "" })}
          onCrear={onCrearContacto ? (nombre) => setV({ ...v, contactoId: onCrearContacto(nombre) }) : undefined}
          placeholder="Buscar persona o crearla…"
          crearLabel={(t) => `Crear contacto "${t}"`}
        />
      </Field>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="Tipo de atención"><select className="gp-input" value={v.tipo || "Regalo"} onChange={(e) => setV({ ...v, tipo: e.target.value })}>{TIPOS_ATENCION.map((t) => <option key={t}>{t}</option>)}</select></Field>
        <Field label="Ocasión"><select className="gp-input" value={v.ocasion} onChange={(e) => setV({ ...v, ocasion: e.target.value })}>{OCASIONES_REGALO.map((o) => <option key={o}>{o}</option>)}</select></Field>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="Año"><input type="number" className="gp-input" value={v.anio} onChange={(e) => setV({ ...v, anio: e.target.value })} /></Field>
      </div>
      <Field label="Fecha (opcional)"><input type="date" className="gp-input" value={v.fecha || ""} onChange={(e) => setV({ ...v, fecha: e.target.value })} /></Field>
      {/* Se llama "Mensaje" y es de varios renglones (Angel, 2 oct 2026): la mayoría de las
          atenciones son justo eso —un texto de condolencia, una felicitación—, y en un renglón
          no cabía ni se podía releer antes de mandarlo. */}
      <Field label="Mensaje">
        <textarea className="gp-input" rows={3}
          placeholder="ej. el texto de la felicitación, o qué se regaló: perfume, tarjeta, transferencia"
          value={v.descripcion} onChange={(e) => setV({ ...v, descripcion: e.target.value })} />
      </Field>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="Costo (opcional)"><MoneyInput className="gp-input" value={v.costo} onChange={(val) => setV({ ...v, costo: val })} /></Field>
        <Field label="Estatus"><select className="gp-input" value={v.estatus} onChange={(e) => setV({ ...v, estatus: e.target.value })}>{ESTATUS_REGALO.map((s) => <option key={s}>{s}</option>)}</select></Field>
      </div>
      <Field label="Notas"><textarea className="gp-input" rows={2} value={v.notas} onChange={(e) => setV({ ...v, notas: e.target.value })} /></Field>
      {error && <p className="text-xs gp-text-red mb-2">{error}</p>}

      <button className="gp-btn w-full py-2 text-sm mt-2" onClick={() => { if (!v.contactoId) { setError("Elige a qué contacto es el regalo."); return; } setError(""); onSave(v); }}>Guardar</button>
    </div>
  );
}




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








/* ---------- Eventos (con fotos y videos) ---------- */
/* ---------- Citas (agenda ligera con hora y recordatorio push — distinta de Eventos/Actividades) ---------- */
function fechaHoraALocalInputs(iso) {
  if (!iso) return { fecha: todayISO(), hora: "09:00" };
  const d = new Date(iso);
  const pad = (n) => String(n).padStart(2, "0");
  return { fecha: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`, hora: `${pad(d.getHours())}:${pad(d.getMinutes())}` };
}
function localInputsAFechaHora(fecha, hora) {
  if (!fecha) return "";
  return new Date(`${fecha}T${hora || "09:00"}:00`).toISOString();
}
function fmtFechaHora(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("es-MX", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit", hour12: true });
}
// Etapa 6 (Agenda interactiva): convierte una hora decimal (9.5) a "HH:MM" (09:30), redondeando
// al cuarto de hora más cercano — es el "snap" al soltar un bloque arrastrado.
function horaDecimalAHHMM(dec) {
  const totalMin = Math.round(dec * 60 / 15) * 15;
  const hh = Math.floor(totalMin / 60);
  const mm = totalMin % 60;
  return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
}

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
// pantalla sigue funcionando con el modelo viejo (la hora se ancla al día de la fecha límite), sin
// tronar y sin mandar columnas que no existen.
const DIA_ISO_LABEL = { 1: "Lun", 2: "Mar", 3: "Mié", 4: "Jue", 5: "Vie", 6: "Sáb", 7: "Dom" };

// De qué módulo puede venir una tarea creada desde otro lado (origenTabla), para el botón "Abrir
// registro origen" de la tarjeta rápida. El texto es el complemento de "Abrir …".
const ETIQUETA_ORIGEN = {
  finanzas: "el movimiento", facturas: "la factura", eventos: "el evento", medicamentos: "el medicamento",
  activos: "el activo digital", documentos: "el documento", proyectos: "el proyecto", apartados: "el apartado",
  patrimonio: "el bien", campanas: "la campaña", salud: "el registro de salud", contactos: "el contacto",
  regalos: "el regalo", metas: "la meta",
};

function lunesDeSemana(fecha) {
  const d = new Date(fecha);
  const diaIso = d.getDay() === 0 ? 7 : d.getDay(); // 1=lunes..7=domingo
  d.setDate(d.getDate() - (diaIso - 1));
  d.setHours(0, 0, 0, 0);
  return d;
}
function sumarDias(fecha, n) {
  const d = new Date(fecha);
  d.setDate(d.getDate() + n);
  return d;
}
function hhmmADecimal(hhmm) {
  const [h, m] = String(hhmm || "").split(":").map(Number);
  if (Number.isNaN(h)) return null;
  return h + (m || 0) / 60;
}
// La duración del bloque de una tarea es su tiempo estimado — no se inventa un campo nuevo para
// no duplicar el mismo dato en dos lugares. Sin estimación, una hora.
function duracionDeTarea(t) {
  const n = Number(t.tiempoEstimado);
  return n > 0 ? n : 1;
}

// Reparte en columnas los bloques que se encimen dentro de un mismo día, para que una tarea
// programada a la misma hora que una cita no quede escondida debajo. Los que no se encimen con
// nadie siguen ocupando todo el ancho.
function colocarEnColumnas(bloques) {
  const ordenados = [...bloques].sort((a, b) => a.inicio - b.inicio || b.duracion - a.duracion);
  const salida = [];
  let grupo = [];
  let finGrupo = -Infinity;
  const cerrarGrupo = () => {
    if (!grupo.length) return;
    const columnas = [];
    const conCol = grupo.map((b) => {
      let idx = columnas.findIndex((col) => col.fin <= b.inicio + 0.0001);
      if (idx === -1) { columnas.push({ fin: b.inicio + b.duracion }); idx = columnas.length - 1; }
      else columnas[idx].fin = b.inicio + b.duracion;
      return { ...b, col: idx };
    });
    conCol.forEach((b) => salida.push({ ...b, totalCols: columnas.length }));
    grupo = [];
    finGrupo = -Infinity;
  };
  for (const b of ordenados) {
    if (grupo.length && b.inicio >= finGrupo - 0.0001) cerrarGrupo();
    grupo.push(b);
    finGrupo = Math.max(finGrupo, b.inicio + b.duracion);
  }
  cerrarGrupo();
  return salida;
}

// Primer hueco libre de al menos `duracion` horas dentro de la jornada. null si ya no cabe.
function buscarHueco(ocupados, desde, hasta, duracion) {
  const orden = [...ocupados].sort((a, b) => a[0] - b[0]);
  let cursor = desde;
  for (const [ini, fin] of orden) {
    if (cursor + duracion <= ini) return cursor;
    cursor = Math.max(cursor, fin);
  }
  return cursor + duracion <= hasta ? cursor : null;
}

// Arma los bloques de la cuadrícula: comida (fijo, informativo), citas y SOLO las tareas que ya
// tienen horario programado. Las tareas que solo tienen fecha límite no pasan por aquí — van a la
// franja de su día, que se calcula aparte.
function calcularBloquesAgenda({ dias, citas, tareasProgramadas, comida, diaProgramadoDe }) {
  const bloquesPorDia = {};
  dias.forEach((d) => (bloquesPorDia[dateStr(d)] = []));

  if (comida) {
    dias.forEach((d) => {
      bloquesPorDia[dateStr(d)].push({ tipo: "comida", inicio: comida.inicio, duracion: comida.duracion });
    });
  }

  citas.forEach((c) => {
    if (!c.fechaHora) return;
    const d = new Date(c.fechaHora);
    const key = dateStr(d);
    if (!bloquesPorDia[key]) return;
    const duracion = Number(c.duracionHoras) > 0 ? Number(c.duracionHoras) : 1;
    bloquesPorDia[key].push({ tipo: "cita", inicio: d.getHours() + d.getMinutes() / 60, duracion, item: c });
  });

  tareasProgramadas.forEach((t) => {
    const key = diaProgramadoDe(t);
    const inicio = hhmmADecimal(t.horaInicio);
    if (!key || inicio == null || !bloquesPorDia[key]) return;
    bloquesPorDia[key].push({ tipo: "tarea", inicio, duracion: duracionDeTarea(t), item: t });
  });

  Object.keys(bloquesPorDia).forEach((k) => {
    bloquesPorDia[k] = colocarEnColumnas(bloquesPorDia[k]).sort((a, b) => a.inicio - b.inicio);
  });
  return bloquesPorDia;
}

function Agenda({
  data, misId, onEditPendiente, onAddCita, onEditCita, onRemoveCita, onRemovePendiente,
  onCrearContacto, onCrearProyecto, onAsignar, onEnviarInvitacion, onAceptarEnNombre, onAbrirOrigen,
  onAddPendiente,
}) {
  const [vista, setVista] = useState("semana"); // "dia" | "semana"
  const [base, setBase] = useState(() => new Date());
  const [config, setConfig] = useState({
    horasLaboralesDiarias: 8, horaInicioLaboral: "09:00", diasLaborales: [1, 2, 3, 4, 5],
    horaInicioComida: "", duracionComidaMin: 60, mostrarTareas: true,
  });
  const [configAbierta, setConfigAbierta] = useState(false);
  const [cargando, setCargando] = useState(true);
  const [modalAgregar, setModalAgregar] = useState(null); // null | "nueva" | "existente"
  // Clic en un hueco de la cuadrícula: menú para crear ahí mismo, con el día y la hora que se
  // tocaron ya puestos (pedido de Angel, 29 sept 2026).
  // Catálogo de tags de citas: igual que las etiquetas de contactos, se puede corregir o quitar
  // un tag en todas las citas que lo traen.
  const catalogoTagsCitas = usarCatalogoEditable({
    registros: data.citas, campo: "tags", esLista: true,
    onEditar: (id, patch) => onEditCita(id, patch), nombreSingular: "el tag",
  });
  const [menuHueco, setMenuHueco] = useState(null);   // { x, y, dia, hora }
  const [nuevaCitaEn, setNuevaCitaEn] = useState(null); // { dia, hora }
  const [nuevaTareaEn, setNuevaTareaEn] = useState(null); // { dia, hora }
  const [edicion, setEdicion] = useState(null);           // { tipo:"cita"|"tarea", item }
  const [tarjeta, setTarjeta] = useState(null);           // { tipo, item, rect }
  const [toast, setToast] = useState(null);               // { clave, texto, deshacer }
  // Columnas nuevas de la migración 20261002. null = todavía no se sabe (se está probando).
  const [soportaProgramacion, setSoportaProgramacion] = useState(null);
  const [soportaPrefTareas, setSoportaPrefTareas] = useState(true);
  const [soportaRealizada, setSoportaRealizada] = useState(true);
  // Tareas que me asignaron desde OTRAS cuentas (misma consulta que "Mi trabajo"): no vienen en
  // `data`, que solo trae la cuenta activa.
  const [tareasAsignadas, setTareasAsignadas] = useState([]);

  // Pantalla chica o dedo: decide hoja inferior vs popover y el tamaño de los objetivos táctiles.
  // Detección real de viewport con matchMedia, no una bandera compartida con el escritorio.
  const [esMovil, setEsMovil] = useState(() =>
    typeof window !== "undefined" && (window.matchMedia("(max-width: 767px)").matches || window.matchMedia("(pointer: coarse)").matches));
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px), (pointer: coarse)");
    const alCambiar = (e) => setEsMovil(e.matches);
    mq.addEventListener("change", alCambiar);
    return () => mq.removeEventListener("change", alCambiar);
  }, []);

  const PX_POR_HORA = 56;
  const SNAP_HORAS = 0.25; // 15 minutos
  const ALTO_MIN_BLOQUE = esMovil ? 44 : 22; // 44 px es el mínimo táctil de iPhone
  const ALTO_FRANJA = 66;
  const colRefs = useRef([]);
  const gestoRef = useRef(null);
  const [drag, setDrag] = useState(null); // espejo del gesto activo, solo para dibujar el fantasma

  useEffect(() => {
    (async () => {
      const columnas = "horas_laborales_diarias, hora_inicio_laboral, dias_laborales, hora_inicio_comida, duracion_comida_min";
      let { data: pref, error } = await supabase.from("preferencias")
        .select(`${columnas}, agenda_mostrar_tareas`).eq("user_id", misId).maybeSingle();
      if (error) {
        setSoportaPrefTareas(false);
        ({ data: pref } = await supabase.from("preferencias").select(columnas).eq("user_id", misId).maybeSingle());
      }
      if (pref) {
        setConfig({
          horasLaboralesDiarias: Number(pref.horas_laborales_diarias) || 8,
          horaInicioLaboral: (pref.hora_inicio_laboral || "09:00").slice(0, 5),
          diasLaborales: pref.dias_laborales?.length ? pref.dias_laborales : [1, 2, 3, 4, 5],
          horaInicioComida: pref.hora_inicio_comida ? pref.hora_inicio_comida.slice(0, 5) : "",
          duracionComidaMin: pref.duracion_comida_min || 60,
          mostrarTareas: pref.agenda_mostrar_tareas ?? true,
        });
      }
      // ¿Ya existen las columnas nuevas? Si la migración no se ha aplicado, la Agenda sigue
      // funcionando con el modelo viejo en vez de romperse.
      const prog = await supabase.from("pendientes").select("fecha_programada").limit(1);
      setSoportaProgramacion(!prog.error);
      const real = await supabase.from("citas").select("realizada_en").limit(1);
      setSoportaRealizada(!real.error);
      setCargando(false);
    })();
  }, [misId]);

  // Lo que me asignaron desde otras cuentas. RLS ya permite leerlas y actualizarlas al ejecutor
  // (política "ejecutor ve y actualiza sus tareas asignadas"), no se debilita nada.
  useEffect(() => {
    (async () => {
      const { data: filas } = await supabase.from("pendientes").select("*")
        .eq("asignado_a", misId).is("deleted_at", null);
      setTareasAsignadas((filas || []).map(rowToJs));
    })();
  }, [misId]);

  const guardarConfig = async (nuevo) => {
    setConfig(nuevo);
    const fila = {
      user_id: misId,
      horas_laborales_diarias: nuevo.horasLaboralesDiarias,
      hora_inicio_laboral: nuevo.horaInicioLaboral,
      dias_laborales: nuevo.diasLaborales,
      hora_inicio_comida: nuevo.horaInicioComida || null,
      duracion_comida_min: nuevo.duracionComidaMin || null,
    };
    if (soportaPrefTareas) fila.agenda_mostrar_tareas = nuevo.mostrarTareas;
    await supabase.from("preferencias").upsert(fila, { onConflict: "user_id" });
  };

  const lunes = lunesDeSemana(base);
  const diasVisibles = useMemo(() => {
    if (vista === "dia") return [new Date(base)];
    return [0, 1, 2, 3, 4, 5, 6].map((i) => sumarDias(lunes, i)).filter((d) => {
      const iso = d.getDay() === 0 ? 7 : d.getDay();
      return config.diasLaborales.includes(iso);
    });
  }, [vista, base, lunes, config.diasLaborales]);

  const horaInicioDec = useMemo(() => hhmmADecimal(config.horaInicioLaboral) ?? 9, [config.horaInicioLaboral]);
  const jornadaFin = horaInicioDec + config.horasLaboralesDiarias;

  const comidaDec = useMemo(() => {
    if (!config.horaInicioComida) return null;
    const inicio = hhmmADecimal(config.horaInicioComida);
    return inicio == null ? null : { inicio, duracion: (config.duracionComidaMin || 60) / 60 };
  }, [config.horaInicioComida, config.duracionComidaMin]);

  // Qué día está programada una tarea. Con las columnas nuevas es fechaProgramada; sin ellas
  // (migración pendiente) se conserva el comportamiento viejo: si tiene hora, va en su fecha límite.
  const diaProgramadoDe = (t) =>
    (soportaProgramacion ? t.fechaProgramada : (t.horaInicio ? t.fechaLimite : null)) || null;
  const patchProgramar = (dia, hora) =>
    soportaProgramacion ? { fechaProgramada: dia, horaInicio: hora } : { fechaLimite: dia, horaInicio: hora };

  const rango = {
    desde: dateStr(diasVisibles[0]),
    hasta: dateStr(diasVisibles[diasVisibles.length - 1]),
  };
  const enRango = (iso) => !!iso && iso >= rango.desde && iso <= rango.hasta;

  const citasEnRango = useMemo(
    () => (data.citas || []).filter((c) => c.fechaHora && enRango(dateStr(new Date(c.fechaHora)))),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [data.citas, rango.desde, rango.hasta]);

  // Regla 6: lo que delegué a alguien más no es mío (no se dibuja); lo que me asignaron sí, aunque
  // viva en la cuenta de quien me lo asignó.
  const tareasVisibles = useMemo(() => {
    const propias = (data.pendientes || []).filter((p) => !p.asignadoA || p.asignadoA === misId);
    const ajenas = tareasAsignadas.filter((t) => !propias.some((p) => p.id === t.id));
    return [...propias, ...ajenas].filter((t) => t.estatus !== "Cancelada");
  }, [data.pendientes, tareasAsignadas, misId]);

  const tareasProgramadas = useMemo(
    () => (config.mostrarTareas ? tareasVisibles.filter((t) => t.horaInicio && enRango(diaProgramadoDe(t))) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tareasVisibles, config.mostrarTareas, rango.desde, rango.hasta, soportaProgramacion]);

  // Franja "Tareas del día": lo que tiene fecha pero todavía no tiene hora. Se agrupa por el día
  // programado si ya lo tiene, y si no por su fecha límite.
  const tareasPorFranja = useMemo(() => {
    const porDia = {};
    diasVisibles.forEach((d) => (porDia[dateStr(d)] = []));
    if (!config.mostrarTareas) return porDia;
    tareasVisibles.forEach((t) => {
      if (t.horaInicio) return;
      const dia = diaProgramadoDe(t) || t.fechaLimite;
      if (!enRango(dia) || !porDia[dia]) return;
      porDia[dia].push(t);
    });
    Object.values(porDia).forEach((arr) => arr.sort((a, b) =>
      (PRIORIDAD_ORDEN[a.prioridad] ?? 1) - (PRIORIDAD_ORDEN[b.prioridad] ?? 1) ||
      (a.descripcion || "").localeCompare(b.descripcion || "")));
    return porDia;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tareasVisibles, diasVisibles, config.mostrarTareas, soportaProgramacion]);

  const bloques = useMemo(() => calcularBloquesAgenda({
    dias: diasVisibles, citas: citasEnRango, tareasProgramadas, comida: comidaDec, diaProgramadoDe,
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [diasVisibles, citasEnRango, tareasProgramadas, comidaDec, soportaProgramacion]);

  const hayEnFranja = Object.values(tareasPorFranja).some((a) => a.length > 0);

  /* ---------- escrituras ---------- */

  // Una tarea que me asignaron desde otra cuenta no vive en `data`: se actualiza directo contra
  // Supabase (RLS del ejecutor) y se refleja en el estado local de esta pantalla.
  const esTareaAjena = (t) => !(data.pendientes || []).some((p) => p.id === t.id);

  const limpiarRecordatorio = async (tabla, id) => {
    try {
      await supabase.from("recordatorios").delete().eq("tabla_origen", tabla).eq("registro_origen_id", id);
    } catch (err) {
      console.error("No se pudo limpiar el recordatorio:", err);
    }
  };

  const editarTarea = async (t, patch, reprogramada = false) => {
    if (esTareaAjena(t)) {
      const fila = Object.fromEntries(Object.entries(patch)
        .filter(([k]) => k !== "createdAt") // lo controla el servidor, nunca se reescribe desde aquí
        .map(([k, v]) => [camelToSnake(k), v === "" ? null : v]));
      await supabase.from("pendientes").update(fila).eq("id", t.id);
      setTareasAsignadas((prev) => prev.map((x) => (x.id === t.id ? { ...x, ...patch } : x)));
    } else {
      await onEditPendiente(t.id, patch);
    }
    // "Al mover una tarea deben actualizarse los recordatorios relacionados": se borra el
    // recordatorio ya generado para que el motor lo vuelva a crear con el horario nuevo.
    if (reprogramada) await limpiarRecordatorio("pendientes", t.id);
  };

  const editarCita = async (c, patch, reprogramada = false) => {
    await onEditCita(c.id, patch);
    if (reprogramada) await limpiarRecordatorio("citas", c.id);
  };

  const completar = (tipo, item) => {
    if (tipo === "tarea") {
      const estatusPrevio = item.estatus || "Pendiente";
      const yaHecha = item.estatus === "Completada";
      editarTarea(item, yaHecha
        ? { estatus: "Pendiente", completadaEn: null }
        : { estatus: "Completada", completadaEn: new Date().toISOString() });
      setToast({
        clave: `${item.id}-${Date.now()}`,
        texto: yaHecha ? `"${item.descripcion}" vuelve a pendiente` : `"${item.descripcion}" marcada como realizada`,
        deshacer: () => {
          editarTarea(item, yaHecha
            ? { estatus: estatusPrevio, completadaEn: item.completadaEn || new Date().toISOString() }
            : { estatus: estatusPrevio, completadaEn: null });
          setToast(null);
        },
      });
    } else {
      if (!soportaRealizada) return;
      const previo = item.realizadaEn || null;
      editarCita(item, { realizadaEn: previo ? null : new Date().toISOString() });
      setToast({
        clave: `${item.id}-${Date.now()}`,
        texto: previo ? `"${item.titulo}" vuelve a pendiente` : `"${item.titulo}" marcada como realizada`,
        deshacer: () => { editarCita(item, { realizadaEn: previo }); setToast(null); },
      });
    }
  };

  /* ---------- gestos: mover, redimensionar y programar desde la franja ---------- */

  const ajustar = (v) => Math.round(v / SNAP_HORAS) * SNAP_HORAS;

  // Qué día y qué hora hay bajo el dedo/cursor. Se usa al arrastrar desde la franja, donde el
  // arrastre empieza FUERA de la cuadrícula y no sirve calcular por desplazamiento.
  const posicionDesdePuntero = (clientX, clientY) => {
    for (let i = 0; i < diasVisibles.length; i++) {
      const el = colRefs.current[i];
      if (!el) continue;
      const r = el.getBoundingClientRect();
      if (clientX >= r.left && clientX <= r.right) {
        const cruda = (clientY - r.top) / PX_POR_HORA + horaInicioDec;
        return { diaIdx: i, inicio: Math.max(horaInicioDec, Math.min(ajustar(cruda), jornadaFin - SNAP_HORAS)) };
      }
    }
    return null;
  };

  const espejo = (g) => setDrag({
    tipo: g.tipo, id: g.item.id, modo: g.modo,
    curInicio: g.curInicio, curDuracion: g.curDuracion, curDiaIdx: g.curDiaIdx, valido: g.valido,
  });

  const activarGesto = (g) => {
    g.activo = true;
    if (navigator.vibrate) { try { navigator.vibrate(8); } catch { /* no todos los navegadores */ } }
    espejo(g);
  };

  // En celular el arrastre se activa manteniendo presionado (350 ms): así un toque sigue abriendo
  // la tarjeta rápida y el dedo puede desplazar la pantalla sin mover bloques por accidente.
  const LARGO_MS = 350;
  const iniciarGesto = (e, { tipo, item, modo, inicio, duracion, diaIdx }) => {
    if (e.button != null && e.button !== 0) return;
    e.stopPropagation();
    e.preventDefault(); // sin esto el mouse arrastra el texto del bloque en vez del bloque
    const tactil = e.pointerType !== "mouse";
    const g = {
      tipo, item, modo, tactil, diaIdxOrig: diaIdx, inicioOrig: inicio, duracionOrig: duracion,
      curInicio: inicio, curDuracion: duracion, curDiaIdx: diaIdx, valido: modo !== "programar",
      startX: e.clientX, startY: e.clientY, activo: false, timer: null,
      rect: e.currentTarget.getBoundingClientRect(),
    };
    gestoRef.current = g;
    // El borde de redimensionar se agarra a propósito: arranca de inmediato en cualquier aparato.
    // Con el dedo, mover y programar esperan a que se mantenga presionado, para que un toque siga
    // abriendo la tarjeta y para no pelearse con el desplazamiento de la pantalla. Con mouse no
    // hay espera pero sí umbral: el gesto se activa hasta que el cursor se mueve (ver alMover),
    // así un clic sin mover sigue siendo un clic.
    if (modo === "redimensionar") activarGesto(g);
    else if (tactil) g.timer = setTimeout(() => { g.timer = null; activarGesto(g); }, LARGO_MS);
  };

  const abrirTarjeta = (g) => setTarjeta({ tipo: g.tipo, item: g.item, rect: g.rect });

  const aplicarGesto = async (g) => {
    const dia = diasVisibles[g.curDiaIdx];
    if (!dia) return;
    const nuevoDia = dateStr(dia);
    const cambioHorario = g.curInicio !== g.inicioOrig || g.curDiaIdx !== g.diaIdxOrig || g.modo === "programar";
    const cambioDuracion = g.curDuracion !== g.duracionOrig;
    if (!cambioHorario && !cambioDuracion) return;

    if (g.tipo === "cita") {
      if (g.modo === "redimensionar") await editarCita(g.item, { duracionHoras: g.curDuracion });
      else await editarCita(g.item, { fechaHora: localInputsAFechaHora(nuevoDia, horaDecimalAHHMM(g.curInicio)) }, true);
    } else {
      if (g.modo === "redimensionar") await editarTarea(g.item, { tiempoEstimado: g.curDuracion });
      else await editarTarea(g.item, patchProgramar(nuevoDia, horaDecimalAHHMM(g.curInicio)), true);
    }
  };

  useEffect(() => {
    const alMover = (e) => {
      const g = gestoRef.current;
      if (!g) return;
      const dx = e.clientX - g.startX;
      const dy = e.clientY - g.startY;
      if (!g.activo) {
        // Esperando el "mantén presionado": si el dedo se desplaza, era scroll, no un arrastre.
        if (g.timer) {
          if (Math.abs(dx) > 10 || Math.abs(dy) > 10) { clearTimeout(g.timer); gestoRef.current = null; }
          return;
        }
        if (!g.tactil && (Math.abs(dx) > 4 || Math.abs(dy) > 4)) activarGesto(g);
        else return;
      }
      if (g.modo === "redimensionar") {
        const cruda = g.duracionOrig + dy / PX_POR_HORA;
        g.curDuracion = Math.max(SNAP_HORAS, Math.min(ajustar(cruda), jornadaFin - g.inicioOrig));
      } else if (g.modo === "programar") {
        const pos = posicionDesdePuntero(e.clientX, e.clientY);
        if (pos) {
          g.curDiaIdx = pos.diaIdx;
          g.curInicio = Math.min(pos.inicio, Math.max(horaInicioDec, jornadaFin - g.duracionOrig));
          g.valido = true;
        } else g.valido = false;
      } else {
        const cruda = g.inicioOrig + dy / PX_POR_HORA;
        g.curInicio = Math.max(horaInicioDec, Math.min(ajustar(cruda), jornadaFin - g.duracionOrig));
        const ancho = colRefs.current[0]?.getBoundingClientRect().width || 1;
        const saltos = vista === "semana" ? Math.round(dx / ancho) : 0;
        g.curDiaIdx = Math.max(0, Math.min(diasVisibles.length - 1, g.diaIdxOrig + saltos));
      }
      espejo(g);
    };
    const alSoltar = () => {
      const g = gestoRef.current;
      if (!g) return;
      gestoRef.current = null;
      if (g.timer) { clearTimeout(g.timer); abrirTarjeta(g); return; } // fue un toque, no un arrastre
      if (!g.activo) { abrirTarjeta(g); return; }                     // clic con mouse sin mover
      setDrag(null);
      if (g.valido) aplicarGesto(g);
    };
    window.addEventListener("pointermove", alMover);
    window.addEventListener("pointerup", alSoltar);
    window.addEventListener("pointercancel", alSoltar);
    return () => {
      window.removeEventListener("pointermove", alMover);
      window.removeEventListener("pointerup", alSoltar);
      window.removeEventListener("pointercancel", alSoltar);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [diasVisibles, horaInicioDec, jornadaFin, vista, soportaProgramacion, data.pendientes]);

  /* ---------- acciones ---------- */

  // Programa en huecos libres las tareas que hoy solo tienen fecha límite. A diferencia del
  // acomodo viejo (que solo las dibujaba y se perdía al recargar), esto SÍ les guarda su horario.
  const acomodarEnHuecos = async () => {
    const ocupado = {};
    diasVisibles.forEach((d) => {
      const k = dateStr(d);
      ocupado[k] = (bloques[k] || []).map((b) => [b.inicio, b.inicio + b.duracion]);
    });
    const claves = diasVisibles.map(dateStr);
    for (const k of claves) {
      for (const t of tareasPorFranja[k] || []) {
        if (t.estatus === "Completada") continue;
        const dur = duracionDeTarea(t);
        const candidatos = [k, ...claves.filter((x) => x !== k)];
        for (const dia of candidatos) {
          const hueco = buscarHueco(ocupado[dia], horaInicioDec, jornadaFin, dur);
          if (hueco == null) continue;
          ocupado[dia].push([hueco, hueco + dur]);
          await editarTarea(t, patchProgramar(dia, horaDecimalAHHMM(hueco)), true);
          break;
        }
      }
    }
  };

  const reprogramar = async (tipo, item, opcion) => {
    const baseFecha = () => {
      if (tipo === "cita") return new Date(item.fechaHora);
      const dia = diaProgramadoDe(item) || item.fechaLimite || todayISO();
      return new Date(`${dia}T${item.horaInicio || config.horaInicioLaboral}:00`);
    };
    let destino;
    if (opcion.tipo === "mas1h") { destino = baseFecha(); destino.setHours(destino.getHours() + 1); }
    else if (opcion.tipo === "manana") { destino = baseFecha(); destino.setDate(destino.getDate() + 1); }
    else destino = new Date(`${opcion.fecha}T${opcion.hora || "09:00"}:00`);

    const dia = dateStr(destino);
    const hora = `${String(destino.getHours()).padStart(2, "0")}:${String(destino.getMinutes()).padStart(2, "0")}`;
    if (tipo === "cita") await editarCita(item, { fechaHora: destino.toISOString() }, true);
    else await editarTarea(item, patchProgramar(dia, hora), true);
    setTarjeta(null);
  };

  // Quita el horario programado y devuelve la tarea a la franja de "Tareas del día", sin tocar su
  // fecha límite.
  const quitarHorario = async (t) => {
    await editarTarea(t, soportaProgramacion ? { fechaProgramada: null, horaInicio: null } : { horaInicio: null }, true);
    setTarjeta(null);
  };

  const asignarPendienteExistente = (id, fecha, hora) => {
    const t = (data.pendientes || []).find((p) => p.id === id);
    if (!t) return;
    editarTarea(t, hora ? patchProgramar(fecha, hora) : (soportaProgramacion ? { fechaProgramada: fecha } : { fechaLimite: fecha }), true);
    setModalAgregar(null);
  };

  /* ---------- datos para la tarjeta rápida ---------- */

  const nombreProyectoDe = (id) => (data.proyectos || []).find((p) => p.id === id)?.nombre || "";
  const nombreContactoDe = (id) => (data.contactos || []).find((c) => c.id === id)?.nombre || "";
  const nombreResponsableDe = (t) => {
    if (t.asignadoA && t.asignadoA === misId) return "Yo";
    if (t.colaboradorContactoId) return nombreContactoDe(t.colaboradorContactoId);
    if (t.responsableId) return (data.equipo || []).find((e) => e.id === t.responsableId)?.nombre || "";
    return "";
  };

  const horas = Array.from({ length: Math.ceil(config.horasLaboralesDiarias) + 1 }, (_, i) => horaInicioDec + i);

  if (cargando) return <p className="text-sm gp-text-muted">Cargando tu agenda…</p>;

  const altoCuadricula = PX_POR_HORA * config.horasLaboralesDiarias;

  return (
    <div>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <h1 className="text-2xl font-bold">Agenda</h1>
        <div className="flex items-center gap-2 flex-wrap">
          <label className="flex items-center gap-1.5 text-xs cursor-pointer select-none" style={{ minHeight: esMovil ? 44 : undefined }}>
            <input type="checkbox" checked={config.mostrarTareas}
              onChange={(e) => guardarConfig({ ...config, mostrarTareas: e.target.checked })}
              style={{ width: 16, height: 16, accentColor: "var(--gold)", cursor: "pointer" }} />
            Mostrar tareas
          </label>
          <button className="gp-btn flex items-center gap-1 px-2.5 py-1.5 text-xs" onClick={() => setModalAgregar("nueva")}>
            <Plus size={14} /> Agregar
          </button>
          <button className="gp-btn-ghost px-2 py-1 text-xs rounded" onClick={() => setVista((v) => (v === "dia" ? "semana" : "dia"))}>
            {vista === "dia" ? "Ver semana" : "Ver día"}
          </button>
          <button className="gp-btn-ghost p-1.5 rounded" onClick={() => setBase((b) => sumarDias(b, vista === "dia" ? -1 : -7))} aria-label="Anterior"><ChevronLeft size={16} /></button>
          <button className="gp-btn-ghost px-2 py-1 text-xs rounded" onClick={() => setBase(new Date())}>Hoy</button>
          <button className="gp-btn-ghost p-1.5 rounded" onClick={() => setBase((b) => sumarDias(b, vista === "dia" ? 1 : 7))} aria-label="Siguiente"><ChevronRight size={16} /></button>
          <button className="gp-btn-ghost p-1.5 rounded" onClick={() => setConfigAbierta(true)} title="Configurar jornada"><Settings size={16} /></button>
        </div>
      </div>

      {soportaProgramacion === false && (
        <div className="gp-panel-hi p-3 mb-4 text-xs" style={{ borderLeft: "3px solid var(--gold)" }}>
          La base de datos todavía no tiene la columna <span className="gp-mono">fecha_programada</span>. La Agenda
          funciona con el modelo anterior: mover una tarea cambia su fecha límite. Al aplicar la migración
          20261002 se separan los dos conceptos, sin perder nada de lo que ya está capturado.
        </div>
      )}

      {config.mostrarTareas && hayEnFranja && (
        <div className="flex items-center justify-between gap-3 flex-wrap mb-3 text-xs gp-text-muted">
          <span>Las tareas de la franja de arriba solo tienen fecha límite. Arrástralas a una hora para programarlas.</span>
          <button className="gp-btn-ghost px-2.5 py-1.5 rounded shrink-0" onClick={acomodarEnHuecos}>Acomodar en huecos libres</button>
        </div>
      )}

      {modalAgregar && (
        <Modal title="Agregar a la Agenda" onClose={() => setModalAgregar(null)}>
          <div className="flex gap-1 mb-4">
            <button onClick={() => setModalAgregar("nueva")} className="flex-1 px-3 py-2 text-sm rounded"
              style={{ background: modalAgregar === "nueva" ? "var(--gold)" : "var(--panel-2)", color: modalAgregar === "nueva" ? "#0B2341" : "inherit" }}>
              Actividad nueva
            </button>
            <button onClick={() => setModalAgregar("existente")} className="flex-1 px-3 py-2 text-sm rounded"
              style={{ background: modalAgregar === "existente" ? "var(--gold)" : "var(--panel-2)", color: modalAgregar === "existente" ? "#0B2341" : "inherit" }}>
              Desde lo guardado
            </button>
          </div>
          {modalAgregar === "nueva" && (
            <CitaForm item={{ titulo: "", fechaHora: localInputsAFechaHora(todayISO(), "09:00"), lugar: "", contactoIds: [], tags: [], notas: "" }} contactos={data.contactos}
              tagsExistentes={tagsUnicos(data.citas)} catalogoTags={catalogoTagsCitas} onCrearContacto={onCrearContacto}
              onSave={(v) => { onAddCita({ ...v, id: uid() }); setModalAgregar(null); }} />
          )}
          {modalAgregar === "existente" && (
            <PendienteExistenteForm
              pendientes={(data.pendientes || []).filter((p) => p.estatus !== "Completada" && !p.horaInicio)}
              horaSugerida={config.horaInicioLaboral}
              onAsignar={asignarPendienteExistente} />
          )}
        </Modal>
      )}

      {edicion && (
        <Modal title={edicion.tipo === "cita" ? "Editar cita" : "Editar tarea"} onClose={() => setEdicion(null)}>
          {edicion.tipo === "cita" ? (
            <>
              <CitaForm item={edicion.item} contactos={data.contactos} tagsExistentes={tagsUnicos(data.citas)} catalogoTags={catalogoTagsCitas}
                onCrearContacto={onCrearContacto}
                onSave={(v) => { editarCita(edicion.item, v, true); setEdicion(null); }} />
              <button className="w-full mt-3 py-2 text-sm rounded gp-btn-ghost gp-text-red flex items-center justify-center gap-2"
                style={{ minHeight: esMovil ? 44 : undefined }}
                onClick={() => { onRemoveCita(edicion.item.id); setEdicion(null); }}>
                <Trash2 size={15} /> Eliminar cita
              </button>
            </>
          ) : (
            <>
              <PendienteForm item={edicion.item} proyectos={data.proyectos} contactos={data.contactos}
                pendientes={data.pendientes} colaboradores={[]}
                onCrearContacto={(nombre, tipos) => onCrearContacto(nombre, tipos)}
                onCrearProyecto={onCrearProyecto}
                onEnviarInvitacion={onEnviarInvitacion}
                onAceptarEnNombre={onAceptarEnNombre}
                onSave={(v) => {
                  editarTarea(edicion.item, v, true);
                  if (v.asignadoA && v.asignadoA !== edicion.item.asignadoA && onAsignar) onAsignar(edicion.item.id);
                  setEdicion(null);
                }} />
              {!esTareaAjena(edicion.item) && (
                <button className="w-full mt-3 py-2 text-sm rounded gp-btn-ghost gp-text-red flex items-center justify-center gap-2"
                  style={{ minHeight: esMovil ? 44 : undefined }}
                  onClick={() => { onRemovePendiente(edicion.item.id); setEdicion(null); }}>
                  <Trash2 size={15} /> Eliminar tarea
                </button>
              )}
            </>
          )}
        </Modal>
      )}

      {configAbierta && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,.6)" }} onClick={() => setConfigAbierta(false)}>
          <div className="gp-panel p-4 max-w-sm w-full" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-semibold mb-3">Configurar tu jornada</h3>
            <Field label="Horas laborales por día">
              <input type="number" min="1" max="16" step="0.5" className="gp-input" value={config.horasLaboralesDiarias}
                onChange={(e) => setConfig((c) => ({ ...c, horasLaboralesDiarias: Number(e.target.value) || 1 }))} />
            </Field>
            <Field label="Hora de inicio">
              <input type="time" className="gp-input" value={config.horaInicioLaboral}
                onChange={(e) => setConfig((c) => ({ ...c, horaInicioLaboral: e.target.value }))} />
            </Field>
            <Field label="Días laborales">
              <div className="flex gap-1 flex-wrap">
                {[1, 2, 3, 4, 5, 6, 7].map((iso) => (
                  <button key={iso} type="button"
                    onClick={() => setConfig((c) => ({ ...c, diasLaborales: c.diasLaborales.includes(iso) ? c.diasLaborales.filter((d) => d !== iso) : [...c.diasLaborales, iso].sort() }))}
                    className="px-2 py-1 rounded text-xs"
                    style={{ background: config.diasLaborales.includes(iso) ? "var(--gold)" : "var(--panel-2, rgba(255,255,255,.08))", color: config.diasLaborales.includes(iso) ? "#0B2341" : "inherit" }}>
                    {DIA_ISO_LABEL[iso]}
                  </button>
                ))}
              </div>
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Hora de comida (opcional)">
                <input type="time" className="gp-input" value={config.horaInicioComida}
                  onChange={(e) => setConfig((c) => ({ ...c, horaInicioComida: e.target.value }))} />
              </Field>
              <Field label="Duración (min)">
                <input type="number" min="15" step="15" className="gp-input" value={config.duracionComidaMin}
                  onChange={(e) => setConfig((c) => ({ ...c, duracionComidaMin: Number(e.target.value) || 60 }))} disabled={!config.horaInicioComida} />
              </Field>
            </div>
            {config.horaInicioComida && (
              <button type="button" className="text-xs gp-text-red mb-2" onClick={() => setConfig((c) => ({ ...c, horaInicioComida: "" }))}>Quitar horario de comida</button>
            )}
            <div className="flex gap-2 justify-end mt-2">
              <button className="gp-btn-ghost px-3 py-2 text-sm rounded" onClick={() => setConfigAbierta(false)}>Cancelar</button>
              <button className="gp-btn px-3 py-2 text-sm" onClick={() => { guardarConfig(config); setConfigAbierta(false); }}>Guardar</button>
            </div>
          </div>
        </div>
      )}

      <div className="gp-panel gp-hueso p-3 overflow-x-auto">
        <div className="flex" style={{ minWidth: vista === "semana" ? 720 : 320 }}>
          <div style={{ width: 44 }}>
            <div style={{ height: 28 }} />
            {config.mostrarTareas && <div style={{ height: ALTO_FRANJA }} className="text-[9px] gp-text-muted pr-1 text-right pt-1">Del día</div>}
            {horas.map((h) => (
              <div key={h} style={{ height: PX_POR_HORA }} className="text-[10px] gp-text-muted text-right pr-1 -mt-2">
                {String(Math.floor(h)).padStart(2, "0")}:{h % 1 ? "30" : "00"}
              </div>
            ))}
          </div>
          {diasVisibles.map((d, di) => {
            const key = dateStr(d);
            const esHoy = key === todayISO();
            return (
              <div key={key} className="flex-1" style={{ minWidth: vista === "semana" ? 96 : 280 }}>
                <div className="text-center text-xs mb-1 pb-1" style={{ height: 28, fontWeight: esHoy ? 700 : 400, color: esHoy ? "var(--gold)" : undefined }}>
                  {DIA_ISO_LABEL[d.getDay() === 0 ? 7 : d.getDay()]} {d.getDate()}
                </div>

                {/* Franja "Tareas del día": lo que tiene fecha límite pero todavía no tiene hora. */}
                {config.mostrarTareas && (
                  <div className="gp-scroll" style={{
                    height: ALTO_FRANJA, overflowY: "auto", borderLeft: "1px solid var(--border)",
                    borderBottom: "1px solid var(--border)", padding: 2, display: "flex", flexDirection: "column", gap: 2,
                  }}>
                    {(tareasPorFranja[key] || []).map((t) => {
                      const hecha = t.estatus === "Completada";
                      const vencida = !hecha && t.fechaLimite && daysUntil(t.fechaLimite) < 0;
                      return (
                        <div key={t.id}
                          role="button" tabIndex={0}
                          onKeyDown={(e) => { if (e.key === "Enter") setTarjeta({ tipo: "tarea", item: t, rect: e.currentTarget.getBoundingClientRect() }); }}
                          onPointerDown={(e) => iniciarGesto(e, { tipo: "tarea", item: t, modo: "programar", inicio: horaInicioDec, duracion: duracionDeTarea(t), diaIdx: di })}
                          title={`${t.descripcion} — mantén presionado y arrastra a una hora para programarla`}
                          className="rounded flex items-center gap-1.5 px-1.5"
                          style={{
                            minHeight: esMovil ? 34 : 22, fontSize: 10.5, cursor: "grab", touchAction: "none",
                            background: "var(--panel-2)", border: `1px dashed ${vencida ? "var(--red)" : "var(--border)"}`,
                            opacity: hecha ? 0.65 : 1, textDecoration: hecha ? "line-through" : "none",
                          }}>
                          <button
                            onPointerDown={(e) => e.stopPropagation()}
                            onClick={(e) => { e.stopPropagation(); completar("tarea", t); }}
                            aria-label={hecha ? "Marcar como pendiente" : "Marcar como realizada"}
                            className="flex items-center justify-center shrink-0 rounded"
                            style={{ width: esMovil ? 30 : 16, height: esMovil ? 30 : 16, border: "1px solid var(--border)", background: hecha ? "var(--teal)" : "transparent" }}>
                            {hecha && <Check size={11} color="#0B2341" />}
                          </button>
                          <span className="truncate">{t.descripcion}</span>
                        </div>
                      );
                    })}
                  </div>
                )}

                <div ref={(el) => (colRefs.current[di] = el)} className="relative"
                  style={{ height: altoCuadricula, borderLeft: "1px solid var(--border)" }}
                  title="Toca un hueco para agendar algo a esa hora"
                  onClick={(e) => {
                    // Solo los huecos: los clics que vienen de un bloque ya los corta el bloque.
                    const r = e.currentTarget.getBoundingClientRect();
                    const cruda = (e.clientY - r.top) / PX_POR_HORA + horaInicioDec;
                    const hora = Math.max(horaInicioDec, Math.min(ajustar(cruda), jornadaFin - SNAP_HORAS));
                    setMenuHueco({ x: e.clientX, y: e.clientY, dia: key, hora: horaDecimalAHHMM(hora) });
                  }}>
                  {horas.slice(0, -1).map((h) => (
                    <div key={h} style={{ position: "absolute", top: (h - horaInicioDec) * PX_POR_HORA, left: 0, right: 0, borderTop: "1px solid var(--border)" }} />
                  ))}
                  {(bloques[key] || []).map((b, i) => {
                    const esCita = b.tipo === "cita";
                    const esTarea = b.tipo === "tarea";
                    const hecho = (esTarea && b.item.estatus === "Completada") || (esCita && !!b.item.realizadaEn);
                    const arrastrable = esCita || esTarea;
                    const enMovimiento = !!(drag && b.item && drag.tipo === b.tipo && drag.id === b.item.id);
                    const alto = Math.max(b.duracion * PX_POR_HORA - 2, ALTO_MIN_BLOQUE);
                    const total = b.totalCols || 1;
                    const ancho = 100 / total;
                    const titulo = esCita ? b.item.titulo : esTarea ? b.item.descripcion : "Comida";
                    return (
                      <div key={`${b.tipo}-${b.item?.id || i}`}
                        role={arrastrable ? "button" : undefined}
                        tabIndex={arrastrable ? 0 : undefined}
                        onKeyDown={(e) => { if (arrastrable && e.key === "Enter") setTarjeta({ tipo: b.tipo, item: b.item, rect: e.currentTarget.getBoundingClientRect() }); }}
                        className="absolute rounded px-1 py-0.5 text-[11px] overflow-hidden flex items-start gap-1"
                        style={{
                          top: (b.inicio - horaInicioDec) * PX_POR_HORA + 1,
                          height: alto,
                          left: `calc(${b.col * ancho}% + 2px)`,
                          width: `calc(${ancho}% - 4px)`,
                          // Una cita es un compromiso con alguien más: va sólida y en dorado. Una
                          // tarea programada es plan propio: más tenue y con borde punteado.
                          background: esCita ? "var(--gold)" : b.tipo === "comida" ? "var(--border)" : hecho ? "var(--teal-tint)" : "var(--panel-2)",
                          color: esCita ? "#0B2341" : hecho && esTarea ? "var(--teal-text)" : "inherit",
                          border: esTarea ? `1px dashed ${hecho ? "var(--teal)" : "var(--border)"}` : "none",
                          textDecoration: hecho ? "line-through" : "none",
                          opacity: enMovimiento ? 0.3 : b.tipo === "comida" ? 0.7 : esTarea && !hecho ? 0.92 : 1,
                          cursor: arrastrable ? "grab" : "default",
                          touchAction: arrastrable ? "none" : undefined,
                        }}
                        title={arrastrable
                          ? `${titulo} — toca para ver opciones, mantén presionado para mover, jala el borde inferior para cambiar la duración`
                          : "Comida"}
                        onClick={(e) => e.stopPropagation()}
                        onPointerDown={(e) => arrastrable && iniciarGesto(e, { tipo: b.tipo, item: b.item, modo: "mover", inicio: b.inicio, duracion: b.duracion, diaIdx: di })}
                      >
                        {arrastrable && alto >= 26 && (esTarea || soportaRealizada) && (
                          <button
                            onPointerDown={(e) => e.stopPropagation()}
                            onClick={(e) => { e.stopPropagation(); completar(b.tipo, b.item); }}
                            aria-label={hecho ? "Marcar como pendiente" : "Marcar como realizada"}
                            className="flex items-center justify-center shrink-0 rounded mt-0.5"
                            style={{
                              width: esMovil ? 26 : 15, height: esMovil ? 26 : 15,
                              border: `1px solid ${esCita ? "rgba(11,35,65,.5)" : "var(--border)"}`,
                              background: hecho ? "var(--teal)" : "transparent",
                            }}>
                            {hecho && <Check size={11} color="#0B2341" />}
                          </button>
                        )}
                        <span className="font-medium min-w-0 break-words" style={{ lineHeight: 1.15 }}>{titulo}</span>
                        {arrastrable && (
                          <div
                            onPointerDown={(e) => iniciarGesto(e, { tipo: b.tipo, item: b.item, modo: "redimensionar", inicio: b.inicio, duracion: b.duracion, diaIdx: di })}
                            style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: esMovil ? 12 : 6, cursor: "ns-resize", touchAction: "none" }}
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {drag && drag.valido && (() => {
        const colEl = colRefs.current[drag.curDiaIdx];
        if (!colEl) return null;
        const rect = colEl.getBoundingClientRect();
        const item = drag.tipo === "cita"
          ? (data.citas || []).find((c) => c.id === drag.id)
          : tareasVisibles.find((p) => p.id === drag.id);
        const diaGhost = diasVisibles[drag.curDiaIdx];
        const etiquetaDia = diaGhost ? `${DIA_ISO_LABEL[diaGhost.getDay() === 0 ? 7 : diaGhost.getDay()]} ${diaGhost.getDate()}` : "";
        return (
          <div style={{
            position: "fixed", left: rect.left + 2, width: Math.max(rect.width - 4, 40),
            top: rect.top + (drag.curInicio - horaInicioDec) * PX_POR_HORA,
            height: Math.max(drag.curDuracion * PX_POR_HORA - 2, 22),
            background: drag.tipo === "cita" ? "var(--gold)" : "var(--panel-2)",
            color: drag.tipo === "cita" ? "#0B2341" : "inherit",
            border: "2px dashed var(--teal)", borderRadius: 4, zIndex: 90, pointerEvents: "none",
            padding: "2px 6px", fontSize: 11, overflow: "hidden", boxShadow: "0 4px 12px rgba(0,0,0,.25)",
          }}>
            <span className="font-medium">{item?.titulo || item?.descripcion || "…"}</span>
            <div className="text-[10px] opacity-80">
              {drag.modo === "redimensionar" ? `${drag.curDuracion}h` : `${etiquetaDia} · ${horaDecimalAHHMM(drag.curInicio)}`}
            </div>
          </div>
        );
      })()}

      {tarjeta && (() => {
        const esCita = tarjeta.tipo === "cita";
        const t = tarjeta.item;
        const diaProg = esCita ? null : diaProgramadoDe(t);
        const cuando = esCita
          ? fmtFechaHora(t.fechaHora)
          : [diaProg ? `Programada ${diaProg}${t.horaInicio ? ` ${t.horaInicio}` : ""}` : null,
             t.fechaLimite ? `Vence ${t.fechaLimite}` : null].filter(Boolean).join(" · ") || "Sin fecha";
        const origen = !esCita && t.origenTabla && t.origenId ? t.origenTabla : null;
        return (
          <TarjetaRapidaAgenda
            tipo={tarjeta.tipo}
            titulo={esCita ? t.titulo : t.descripcion}
            cuando={cuando}
            proyecto={esCita ? "" : nombreProyectoDe(t.proyectoId)}
            contacto={esCita ? (t.contactoIds || []).map(nombreContactoDe).filter(Boolean).join(", ") : nombreContactoDe(t.contactoId)}
            responsable={esCita ? "" : nombreResponsableDe(t)}
            completada={esCita ? !!t.realizadaEn : t.estatus === "Completada"}
            esMovil={esMovil}
            rect={tarjeta.rect}
            onCerrar={() => setTarjeta(null)}
            onRealizada={() => { completar(tarjeta.tipo, t); setTarjeta(null); }}
            onEditar={() => { setEdicion({ tipo: tarjeta.tipo, item: t }); setTarjeta(null); }}
            onReprogramar={(opcion) => reprogramar(tarjeta.tipo, t, opcion)}
            onAbrirOrigen={origen ? () => { setTarjeta(null); onAbrirOrigen(t.origenTabla, t.origenId); } : null}
            etiquetaOrigen={origen ? ETIQUETA_ORIGEN[origen] : null}
          />
        );
      })()}

      {menuHueco && (
        <div className="fixed inset-0 z-[75]" onClick={() => setMenuHueco(null)}>
          <div
            className="gp-panel py-1 text-sm absolute"
            style={{
              minWidth: 190,
              left: Math.min(menuHueco.x, window.innerWidth - 210),
              top: Math.min(menuHueco.y, window.innerHeight - 160),
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <p className="px-3 py-1.5 text-[11px] gp-text-muted border-b gp-border">
              {fmtFechaCorta(menuHueco.dia)} · {menuHueco.hora}
            </p>
            <button
              className="w-full text-left px-3 gp-panel-hi flex items-center gap-2"
              style={{ minHeight: esMovil ? 44 : 36 }}
              onClick={() => { setNuevaCitaEn({ dia: menuHueco.dia, hora: menuHueco.hora }); setMenuHueco(null); }}
            >
              <CalendarClock size={14} className="gp-text-gold" /> Agregar cita
            </button>
            <button
              className="w-full text-left px-3 gp-panel-hi flex items-center gap-2"
              style={{ minHeight: esMovil ? 44 : 36 }}
              onClick={() => { setNuevaTareaEn({ dia: menuHueco.dia, hora: menuHueco.hora }); setMenuHueco(null); }}
            >
              <CheckSquare size={14} className="gp-text-teal" /> Agregar tarea
            </button>
          </div>
        </div>
      )}

      {nuevaCitaEn && (
        <Modal title={`Nueva cita — ${fmtFechaCorta(nuevaCitaEn.dia)} ${nuevaCitaEn.hora}`} onClose={() => setNuevaCitaEn(null)}>
          <CitaForm
            item={{ titulo: "", fechaHora: localInputsAFechaHora(nuevaCitaEn.dia, nuevaCitaEn.hora), lugar: "", contactoIds: [], tags: [], notas: "" }}
            contactos={data.contactos} tagsExistentes={tagsUnicos(data.citas)} catalogoTags={catalogoTagsCitas} onCrearContacto={onCrearContacto}
            onSave={(v) => { onAddCita({ ...v, id: uid() }); setNuevaCitaEn(null); }} />
        </Modal>
      )}

      {nuevaTareaEn && (
        <Modal title={`Nueva tarea — ${fmtFechaCorta(nuevaTareaEn.dia)} ${nuevaTareaEn.hora}`} onClose={() => setNuevaTareaEn(null)}>
          {/* Nace programada justo en el hueco que se tocó. La fecha límite arranca igual al día
              elegido, pero son campos distintos: cambiar una no mueve la otra. */}
          <PendienteForm
            item={{
              proyectoId: "", parentId: "", descripcion: "", fechaLimite: nuevaTareaEn.dia, fechaRevision: "",
              prioridad: "Media", estatus: "Pendiente", colaboradorContactoId: null, contactoId: "",
              precio: "", fechaPagoAprox: "", tiempoEstimado: 1, tiempoReal: "", asignadoA: "", avance: "",
              ...(soportaProgramacion ? { fechaProgramada: nuevaTareaEn.dia } : {}), horaInicio: nuevaTareaEn.hora,
            }}
            proyectos={data.proyectos} contactos={data.contactos} pendientes={data.pendientes} colaboradores={[]}
            onCrearContacto={(nombre, tipos) => onCrearContacto(nombre, tipos)}
            onCrearProyecto={onCrearProyecto}
            onEnviarInvitacion={onEnviarInvitacion}
            onAceptarEnNombre={onAceptarEnNombre}
            onSave={(v) => {
              const nuevoId = uid();
              onAddPendiente({ ...v, id: nuevoId });
              if (v.asignadoA && onAsignar) onAsignar(nuevoId);
              setNuevaTareaEn(null);
            }} />
        </Modal>
      )}

      {toast && (
        <ToastDeshacer clave={toast.clave} texto={toast.texto} onDeshacer={toast.deshacer} onCerrar={() => setToast(null)} />
      )}

      <p className="text-xs gp-text-muted mt-2">
        Toca una cita o tarea para ver sus opciones; su checkbox la marca como realizada de un toque.
        Mantén presionado para moverla de día u hora, y jala el borde inferior para cambiar cuánto dura.
        Mover un bloque cambia cuándo lo vas a hacer, nunca su fecha límite.
      </p>
    </div>
  );
}

// Elegir una tarea que ya existe y programarla sin salir de la Agenda. Guarda el horario (día +
// hora); si no se pone hora, la tarea se queda en la franja "Tareas del día" de ese día.
function PendienteExistenteForm({ pendientes, horaSugerida, onAsignar }) {
  const [pendienteId, setPendienteId] = useState("");
  const [fecha, setFecha] = useState(todayISO());
  const [hora, setHora] = useState(horaSugerida || "09:00");
  const [conHora, setConHora] = useState(true);
  return (
    <div>
      <Field label="Tarea guardada">
        <select className="gp-input" value={pendienteId} onChange={(e) => setPendienteId(e.target.value)}>
          <option value="">— elige una —</option>
          {ordenadosPor(pendientes, (p) => p.descripcion).map((p) => <option key={p.id} value={p.id}>{p.descripcion}{p.fechaLimite ? ` (vence: ${p.fechaLimite})` : ""}</option>)}
        </select>
      </Field>
      {pendientes.length === 0 && <p className="text-xs gp-text-muted mb-2">No tienes tareas guardadas sin programar.</p>}
      <div className="grid grid-cols-2 gap-3">
        <Field label="Día en que la harás"><input type="date" className="gp-input" value={fecha} onChange={(e) => setFecha(e.target.value)} /></Field>
        <Field label="Hora de inicio"><input type="time" className="gp-input" value={hora} onChange={(e) => setHora(e.target.value)} disabled={!conHora} /></Field>
      </div>
      <label className="flex items-center gap-2 text-xs mb-2 cursor-pointer">
        <input type="checkbox" checked={conHora} onChange={(e) => setConHora(e.target.checked)}
          style={{ width: 15, height: 15, accentColor: "var(--gold)" }} />
        Ponerle hora (si no, se queda en “Tareas del día”)
      </label>
      <p className="text-xs gp-text-muted mb-3">Esto define cuándo la vas a hacer. Su fecha límite no se toca.</p>
      <button className="gp-btn w-full py-2 mt-1 text-sm" disabled={!pendienteId} onClick={() => onAsignar(pendienteId, fecha, conHora ? hora : null)}>
        Programar en la Agenda
      </button>
    </div>
  );
}

function CitaForm({ item, contactos, tagsExistentes, catalogoTags, onCrearContacto, onSave }) {
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
      const { data: sesion } = await supabase.auth.getSession();
      const form = new FormData();
      form.append("audio", blob, blob.type.includes("mp4") ? "audio.mp4" : "audio.webm");
      const resp = await fetch(`${supabase.supabaseUrl}/functions/v1/transcribir-voz`, {
        method: "POST",
        headers: { Authorization: `Bearer ${sesion.session.access_token}` },
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
      const { data: sesion } = await supabase.auth.getSession();
      const resp = await fetch(`${supabase.supabaseUrl}/functions/v1/asistente-ia`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${sesion.session.access_token}` },
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



