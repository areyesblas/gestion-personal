# Centro de mando — Angel Rey

Sistema personal de gestión de proyectos, finanzas, equipo y vida.

## Configura tu base de datos (una sola vez)

Este sistema usa [Supabase](https://supabase.com) (gratis) como base de datos relacional, para que tus datos no dependan solo de este navegador.

1. Crea un proyecto en supabase.com.
2. En el SQL Editor del proyecto, crea las 14 tablas (proyectos, equipo, pendientes, finanzas, deudas, actividades, activos, metas, contactos, redes_metricas, documentos, habitos, salud y perfil_salud) — el script completo de creación quedó documentado en la conversación donde se armó este sistema.
3. Desactiva Row Level Security en cada una (`alter table <nombre> disable row level security;`) — es una decisión temporal hasta que se agregue login.
4. En Storage, crea un bucket público llamado `estudios` (ahí se guardan tus PDFs).
5. En Project Settings > API, copia tu "Project URL" y tu "Publishable key" (o "anon public" si ves la versión anterior de claves).
6. En esta carpeta, copia `.env.example` y renómbralo a `.env`, y pega ahí tus dos valores:
   ```
   VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
   VITE_SUPABASE_ANON_KEY=tu-clave-publica
   ```
   El archivo `.env` nunca se sube a GitHub (ya está en `.gitignore`) — tus credenciales quedan solo en tu computadora.

## Cómo correrlo en tu computadora

1. Instala [Node.js](https://nodejs.org) (versión 18 o superior) si no lo tienes.
2. Abre esta carpeta en una terminal (o en VS Code con su terminal integrada).
3. Instala dependencias:
   ```
   npm install
   ```
4. Arranca el servidor de desarrollo:
   ```
   npm run dev
   ```
5. Abre en tu navegador la URL que aparece (normalmente http://localhost:5173).

La primera vez que abras la app conectada a Supabase, si tenías datos guardados de la versión anterior (en localStorage), se migran automáticamente a la base de datos.

## Cómo subirlo a GitHub

```
git init
git add .
git commit -m "Primera versión del sistema de gestión"
git branch -M main
git remote add origin <URL-de-tu-repo-en-GitHub>
git push -u origin main
```

## Cómo publicarlo como sitio web (opcional)

Puedes desplegarlo gratis en Netlify o Vercel:
1. Sube el proyecto a GitHub (pasos arriba).
2. Conecta el repo en [netlify.com](https://netlify.com) o [vercel.com](https://vercel.com).
3. Comando de build: `npm run build` — carpeta de salida: `dist`.
4. En la configuración de variables de entorno del sitio (Environment variables), agrega `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` con tus mismos valores del `.env`.
5. Importante: antes de hacerlo público, agrega un login/contraseña — este sistema maneja tus finanzas y datos de salud.
