import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    strictPort: true,
    allowedHosts: true, // Bu ayar, farklı arkadaşlarınızın farklı cihazlardan girmesine izin verir.
    watch: {
      usePolling: true,
    },
    proxy: {
      '/api': {
        target: 'http://localhost:5295',
        changeOrigin: true,
        secure: false,
      },
    },
  },
})