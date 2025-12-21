import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

const backendProxyTarget =
  process.env.GO_BACKEND_URL ||
  process.env.VITE_BACKEND_URL ||
  'http://localhost:8080'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: backendProxyTarget,
        changeOrigin: true,
      },
    },
  },
})
