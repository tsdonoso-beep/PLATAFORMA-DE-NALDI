import { defineConfig } from 'vite'
import { fileURLToPath, URL } from 'node:url'

const r = (p) => fileURLToPath(new URL(p, import.meta.url))

export default defineConfig({
  root: '.',
  publicDir: 'public',
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        hub:       r('index.html'),
        funciones: r('src/funciones/index.html'),
        geometria: r('src/geometria/index.html'),
        vectores:  r('src/vectores/index.html'),
      },
    },
  },
  server: {
    port: 3000,
    open: true,
  },
})
