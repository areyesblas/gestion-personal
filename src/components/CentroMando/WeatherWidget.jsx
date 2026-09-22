// src/components/CentroMando/WeatherWidget.jsx
//
// Clima actual junto al encabezado del Centro de mando (pedido de Angel, 21 sept 2026, en vez
// de un simple sol/luna por horario): usa Open-Meteo (gratis, sin API key) con la ciudad que
// el usuario configuró en Configuración. El ícono de condición ya viene resuelto con el
// amanecer/atardecer real de esa ciudad (is_day), no con la hora del dispositivo — así se
// obtiene sol/luna de forma más precisa que una regla fija de horas.
//
// Se cachea en localStorage por ciudad (30 min) para no pegarle a la API en cada render del
// dashboard, mismo espíritu que el resto de la app (arkeyone_login_at, pendientes offline).

import { useEffect, useState } from 'react';
import { Sun, Moon, CloudSun, CloudMoon, Cloud, CloudFog, CloudDrizzle, CloudRain, CloudSnow, CloudLightning } from 'lucide-react';

const TTL_MS = 30 * 60 * 1000;

// Código WMO -> { Icon, label }. https://open-meteo.com/en/docs (weather_code)
function condicion(code, esDia) {
  if (code === 0) return { Icon: esDia ? Sun : Moon, label: 'Despejado' };
  if (code === 1 || code === 2) return { Icon: esDia ? CloudSun : CloudMoon, label: 'Parcialmente nublado' };
  if (code === 3) return { Icon: Cloud, label: 'Nublado' };
  if (code === 45 || code === 48) return { Icon: CloudFog, label: 'Niebla' };
  if (code >= 51 && code <= 57) return { Icon: CloudDrizzle, label: 'Llovizna' };
  if ((code >= 61 && code <= 67) || (code >= 80 && code <= 82)) return { Icon: CloudRain, label: 'Lluvia' };
  if (code >= 71 && code <= 77) return { Icon: CloudSnow, label: 'Nieve' };
  if (code >= 95) return { Icon: CloudLightning, label: 'Tormenta' };
  return { Icon: esDia ? Sun : Moon, label: '' };
}

function leerCache(lat, lon) {
  try {
    const raw = localStorage.getItem(`arkeyone_clima_${lat}_${lon}`);
    if (!raw) return null;
    const cached = JSON.parse(raw);
    if (Date.now() - cached.guardadoEn > TTL_MS) return null;
    return cached.datos;
  } catch { return null; }
}
function guardarCache(lat, lon, datos) {
  try { localStorage.setItem(`arkeyone_clima_${lat}_${lon}`, JSON.stringify({ guardadoEn: Date.now(), datos })); } catch {}
}

export default function WeatherWidget({ ciudad, lat, lon, onConfigurarCiudad }) {
  const [datos, setDatos] = useState(() => (lat != null && lon != null ? leerCache(lat, lon) : null));

  useEffect(() => {
    if (lat == null || lon == null) return;
    const cache = leerCache(lat, lon);
    if (cache) { setDatos(cache); return; }
    let cancelado = false;
    fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code,is_day&timezone=auto`)
      .then((r) => r.json())
      .then((json) => {
        if (cancelado || !json?.current) return;
        const nuevos = { temp: Math.round(json.current.temperature_2m), code: json.current.weather_code, esDia: json.current.is_day === 1 };
        setDatos(nuevos);
        guardarCache(lat, lon, nuevos);
      })
      .catch(() => {});
    return () => { cancelado = true; };
  }, [lat, lon]);

  if (lat == null || lon == null) {
    return (
      <button onClick={onConfigurarCiudad} className="hidden sm:block text-xs gp-text-muted underline decoration-dotted" title="Configura tu ciudad para ver el clima">
        Configura tu ciudad
      </button>
    );
  }
  if (!datos) return null;

  const { Icon, label } = condicion(datos.code, datos.esDia);
  // ciudad viene como "Nombre, Estado, País" (ver geocoding en Configuración) — en el header
  // solo mostramos el nombre corto; el resto queda en el tooltip para no saturar el espacio.
  const ciudadCorta = ciudad ? ciudad.split(",")[0].trim() : "";
  return (
    <div className="hidden sm:flex items-center gap-2" title={`${label}${ciudad ? ` · ${ciudad}` : ''}`}>
      <Icon size={24} className="gp-text-gold shrink-0" />
      <div className="leading-tight">
        <p className="gp-mono text-base font-semibold">{datos.temp}°C</p>
        {ciudadCorta && <p className="text-[11px] gp-text-muted truncate max-w-[9rem]">{ciudadCorta}</p>}
      </div>
    </div>
  );
}
