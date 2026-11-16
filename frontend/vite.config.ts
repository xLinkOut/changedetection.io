import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ command }) => ({
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  // Production files are served from /pulse/ with a <base href>, so relative
  // asset URLs are correct behind any reverse-proxy sub-path. The dev server
  // mounts the app at /pulse/ to match.
  base: command === 'build' ? './' : '/pulse/',
  build: {
    outDir: '../changedetectionio/static/pulse',
    emptyOutDir: true,
    manifest: 'manifest.json',
    sourcemap: false,
    target: 'es2020',
  },
  server: {
    port: 5173,
    strictPort: true,
    proxy: {
      '/api': 'http://127.0.0.1:5000',
      '/static': 'http://127.0.0.1:5000',
      '/login': 'http://127.0.0.1:5000',
      '/logout': 'http://127.0.0.1:5000',
      '/set-language': 'http://127.0.0.1:5000',
    },
  },
}))
