import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { execSync } from 'node:child_process'

// Hash corto del commit actual, para mostrarlo en la UI y confirmar de un vistazo que un
// dispositivo ya cargó el último deploy (ver __COMMIT_HASH__ en App.jsx) -- temporal, mientras
// depuramos los bugs de voz en Android.
const commitHash = (() => {
  try { return execSync('git rev-parse --short HEAD').toString().trim() }
  catch { return 'sin-git' }
})()

export default defineConfig({
  plugins: [react()],
  define: {
    __COMMIT_HASH__: JSON.stringify(commitHash),
  },
})
