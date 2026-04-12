import { defineConfig } from 'vite'
import { fileURLToPath, URL } from 'node:url'

const r = (p) => fileURLToPath(new URL(p, import.meta.url))

export default defineConfig({
  root: '.',
  publicDir: 'public',
  build: {
    outDir: 'dist',
    chunkSizeWarningLimit: 1200,
    rollupOptions: {
      input: {
        hub:           r('index.html'),
        calculo:       r('src/calculo/index.html'),
        geometria:     r('src/geometria/index.html'),
        vectores:      r('src/vectores/index.html'),
        fisica:        r('src/fisica/index.html'),
        trigonometria: r('src/trigonometria/index.html'),
        estadistica:   r('src/estadistica/index.html'),
      },
    },
  },
  server: {
    port: 3000,
    open: true,
  },
})
