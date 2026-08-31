# Centro de mando — Angel Rey

Sistema personal de gestión de proyectos, finanzas, equipo y vida.

## Cómo correrlo en tu computadora

1. Instala [Node.js](https://nodejs.org) (versión 18 o superior) si no lo tienes.
2. Abre esta carpeta en una terminal (o en Cursor con su terminal integrada).
3. Instala dependencias:
   ```
   npm install
   ```
4. Arranca el servidor de desarrollo:
   ```
   npm run dev
   ```
5. Abre en tu navegador la URL que aparece (normalmente http://localhost:5173).

Tus datos se guardan en el navegador (localStorage), así que persisten entre sesiones en esa misma computadora y navegador. Si quieres acceder a tus datos desde varios dispositivos, el siguiente paso sería conectar una base de datos real (por ejemplo Supabase o Firebase) en lugar de localStorage.

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
