// src/components/ui/ErrorBoundary.jsx
//
// Atrapa los errores de una pantalla para que no se lleven la app entera.
//
// POR QUE HIZO FALTA (6 oct 2026). Desde que cada modulo se carga por separado, navegar a una
// pantalla implica DESCARGAR su archivo. Si esa descarga falla, el `lazy()` lanza, React desmonta
// todo el arbol y el usuario se queda viendo una pantalla en blanco, sin explicacion y sin salida.
// Antes no podia pasar: todo venia en un solo archivo ya cargado.
//
// Falla de verdad en dos casos, y los dos son normales:
//   1. Sin conexion, entrando a un modulo que nunca se abrio en ese dispositivo: su archivo no
//      esta en el cache del service worker (que cachea bajo demanda, no por adelantado).
//   2. CUANDO SE DESPLIEGA MIENTRAS ALGUIEN TIENE LA APP ABIERTA. Los archivos llevan un hash en
//      el nombre; al desplegar, los viejos dejan de existir. La siguiente pantalla que abra esa
//      persona pide un archivo que ya no esta y recibe 404. Esto pasa en CADA deploy.
//
// Por eso el boton principal es "Volver a cargar": en el caso 2 basta con eso, porque la recarga
// trae el index nuevo con los nombres de archivo nuevos.

import { Component } from "react";

export class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    // Se registra con el nombre de la pantalla para que un reporte ("Finanzas no abre") se pueda
    // rastrear sin tener que reproducirlo.
    console.error(`Error en la pantalla ${this.props.nombre || "(sin nombre)"}:`, error, info?.componentStack);
  }

  // Al cambiar de pantalla se limpia el error: si falló Finanzas, Contactos debe poder abrir.
  componentDidUpdate(prevProps) {
    if (this.state.error && prevProps.clave !== this.props.clave) this.setState({ error: null });
  }

  render() {
    if (!this.state.error) return this.props.children;

    // Un fallo al traer el trozo de la pantalla se ve distinto a un error de programación, y la
    // salida del usuario es otra: ahí recargar casi siempre lo resuelve.
    const esFalloDeCarga = /dynamically imported module|Importing a module script failed|Failed to fetch/i
      .test(String(this.state.error?.message || ""));

    return (
      <div className="gp-panel p-5 max-w-md">
        <h2 className="gp-serif text-lg mb-2">No se pudo abrir esta pantalla</h2>
        <p className="text-sm gp-text-muted mb-4">
          {esFalloDeCarga
            ? "No se pudo descargar. Suele pasar si se perdió la conexión, o si la app se actualizó mientras la tenías abierta."
            : "Algo falló al dibujarla. El resto de la app sigue funcionando."}
        </p>
        <div className="flex gap-2">
          <button className="gp-btn px-3 py-2 text-sm rounded" onClick={() => window.location.reload()}>
            Volver a cargar
          </button>
          <button className="gp-btn-ghost px-3 py-2 text-sm rounded" onClick={() => this.setState({ error: null })}>
            Intentar de nuevo
          </button>
        </div>
      </div>
    );
  }
}
