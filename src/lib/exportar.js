// src/lib/exportar.js
//
// Exportar una lista a Excel o PDF. Salio de App.jsx en la Fase 0 del corte por modulos
// (5 oct 2026). Es el estandar transversal de listas del Documento Maestro (secc. 23.5): la
// exportacion respeta EXACTAMENTE los filtros, la busqueda y el orden que el usuario tiene puestos,
// porque recibe la lista ya filtrada y ordenada, no los datos crudos.
//
// Las dos librerias pesadas se cargan con import dinamico, nunca arriba del archivo: asi viajan en
// su propio trozo y solo las descarga quien de verdad exporta algo. Ver el commit eee405b para el
// caso de `xlsx`, que estaba estatico y le costaba ~140 KB gzip de arranque a todos los usuarios.
//
// Lo que NO esta aqui: exportarExcel (el respaldo de la cuenta completa, un modulo por hoja) se
// quedo en App.jsx porque depende de TABLES y ETIQUETA_TABLA, que son el modelo de datos; traerlas
// aqui habria creado un import circular. Esa funcion usa cargarXLSX de este archivo.

import { todayISO } from "./formato";
// El logo va en el encabezado de los PDF: son reportes que salen de la app y se comparten, deben
// verse de ARKEYONE.
import logoArkeyone from "../assets/arkeyone-lockup.png";

// La app instalada en iPhone (PWA en modo standalone) no deja que una página dispare una descarga:
// el archivo se genera pero no pasa nada visible, que es justo el "no hace nada" que se reportó.
// Ahí el PDF se abre en una pestaña nueva, desde donde iOS sí ofrece Compartir/Guardar en Archivos.
const esPWAStandalone = () => {
  try {
    return window.navigator.standalone === true ||
      (window.matchMedia && window.matchMedia("(display-mode: standalone)").matches);
  } catch { return false; }
};

// `xlsx` pesa ~864kB (sabe leer y escribir todos los formatos de Excel desde los noventa) y solo
// hace falta cuando alguien exporta o importa. Importarla arriba del archivo la metía en el bundle
// principal, así que TODOS los usuarios la descargaban antes de ver el login aunque nunca
// exportaran nada. Con el import dinámico viaja en su propio trozo, igual que jsPDF más abajo.
// El módulo queda cacheado por el navegador y por este helper, así que exportar dos veces no la
// vuelve a bajar.
let xlsxPromesa; // undefined = nunca se ha pedido
export const cargarXLSX = () => (xlsxPromesa ??= import("xlsx"));

// Exporta una lista YA filtrada/ordenada tal como el usuario la está viendo (secc. 23.5: la
// exportación debe respetar exactamente los filtros, búsqueda y orden actuales).
export async function exportarFilasExcel(filas, columnas, nombreArchivo) {
  // La validación va ANTES de cargar la librería: no tiene sentido bajar 864kB para avisar que no
  // hay nada que exportar.
  if (filas.length === 0) { alert("No hay filas para exportar con los filtros actuales."); return; }
  try {
    const XLSX = await cargarXLSX();
    const limpias = filas.map((item) => Object.fromEntries(columnas.map((c) => [c.label, c.get(item) ?? ""])));
    const hoja = XLSX.utils.json_to_sheet(limpias);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, hoja, "Datos".slice(0, 31));
    XLSX.writeFile(wb, `arkeyone_${nombreArchivo}_${todayISO()}.xlsx`);
  } catch (err) {
    // Antes esto se perdía en la consola y la pantalla se quedaba igual, sin decir nada. Ahora el
    // try también cubre la carga del trozo de `xlsx` (misma razón que en el export a PDF).
    console.error("Error al exportar a Excel:", err);
    alert(`No se pudo generar el Excel: ${err?.message || err}`);
  }
}

// jsPDF necesita los bytes de la imagen, no una URL, así que el logo se pasa a dataURL una sola
// vez por sesión y se reutiliza en todos los reportes. Si por lo que sea no se puede cargar, el
// PDF se genera igual, solo que sin logo: nunca vale la pena tronar una exportación por un adorno.
const LOGO_PDF_PROPORCION = 900 / 396; // tamaño real del archivo
let logoPdfCache; // undefined = no se ha intentado; "" = se intentó y no se pudo
export async function logoParaPDF() {
  if (logoPdfCache !== undefined) return logoPdfCache;
  try {
    const resp = await fetch(logoArkeyone);
    const blob = await resp.blob();
    logoPdfCache = await new Promise((resolve, reject) => {
      const fr = new FileReader();
      fr.onload = () => resolve(fr.result);
      fr.onerror = reject;
      fr.readAsDataURL(blob);
    });
  } catch (err) {
    console.error("No se pudo cargar el logo para el PDF:", err);
    logoPdfCache = "";
  }
  return logoPdfCache;
}

// Mismo criterio que exportarFilasExcel, pero a PDF (tabla con jspdf-autotable), incluyendo
// fecha de generación y el resumen de filtros aplicados, como pide la secc. 23.5.
export async function exportarFilasPDF(filas, columnas, nombreArchivo, titulo, resumenFiltros) {
  if (filas.length === 0) { alert("No hay filas para exportar con los filtros actuales."); return; }
  // Todo va dentro de un try: jsPDF se carga de forma perezosa y cualquier tropiezo (la carga del
  // trozo, una columna que revienta al leer un dato) dejaba la promesa rechazada en silencio y la
  // pantalla sin reaccionar — el usuario solo veía que el botón "no hacía nada".
  try {
    const { jsPDF } = await import("jspdf");
    const autoTable = (await import("jspdf-autotable")).default;
    const logo = await logoParaPDF();
    const doc = new jsPDF({ orientation: columnas.length > 5 ? "landscape" : "portrait" });
    const anchoPag = doc.internal.pageSize.getWidth();
    const altoPag = doc.internal.pageSize.getHeight();
    const generado = `Generado el ${new Date().toLocaleString("es-MX")}${resumenFiltros ? ` · ${resumenFiltros}` : ""}`;
    const ANCHO_LOGO = 32;

    // Se dibuja en CADA página (gancho didDrawPage de autotable), no una sola vez: un reporte de
    // varias hojas tiene que traer el logo y el pie en todas.
    const marcaDeAgua = () => {
      if (logo) {
        try { doc.addImage(logo, "PNG", anchoPag - 14 - ANCHO_LOGO, 9, ANCHO_LOGO, ANCHO_LOGO / LOGO_PDF_PROPORCION); } catch { /* el PDF va igual sin logo */ }
      }
      doc.setFontSize(14);
      doc.setTextColor(11, 35, 65);
      doc.text(titulo, 14, 16);
      doc.setFontSize(9);
      doc.setTextColor(120);
      doc.text(generado, 14, 21.5);
      doc.setDrawColor(221, 227, 236);
      doc.line(14, 24.5, anchoPag - 14, 24.5);

      const pagina = doc.internal.getNumberOfPages();
      doc.setFontSize(8);
      doc.setTextColor(150);
      doc.text("ARKEYONE · arkeyone.com", 14, altoPag - 8);
      doc.text(`Página ${pagina}`, anchoPag - 14, altoPag - 8, { align: "right" });
    };

    autoTable(doc, {
      startY: 29,
      margin: { top: 29, bottom: 14 },
      didDrawPage: marcaDeAgua,
      head: [columnas.map((c) => c.label)],
      body: filas.map((item) => columnas.map((c) => {
        let v;
        try { v = c.get(item); } catch { v = ""; }
        return String(v ?? "");
      })),
      styles: { fontSize: 8 },
      headStyles: { fillColor: [11, 35, 65] },
    });
    const archivo = `arkeyone_${nombreArchivo}_${todayISO()}.pdf`;
    if (esPWAStandalone()) {
      const url = doc.output("bloburl");
      const ventana = window.open(url, "_blank");
      if (!ventana) { doc.save(archivo); return; } // si el navegador bloqueó la pestaña, al menos intentar la descarga
      return;
    }
    doc.save(archivo);
  } catch (err) {
    console.error("Error al exportar a PDF:", err);
    alert(`No se pudo generar el PDF: ${err?.message || err}`);
  }
}
