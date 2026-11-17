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
    rollupOptions: {
      output: {
        // Keep vendor code in its own long-lived chunks so an app edit does not
        // invalidate the framework, query or diff libraries in the browser cache.
        manualChunks: {
          react: ['react', 'react-dom', 'react-router-dom'],
          query: ['@tanstack/react-query'],
          radix: [
            '@radix-ui/react-dialog',
            '@radix-ui/react-dropdown-menu',
            '@radix-ui/react-switch',
            '@radix-ui/react-tooltip',
          ],
          diff: ['diff'],
        },
      },
    },
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
