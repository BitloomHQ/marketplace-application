import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const apiBaseUrl = (
    env.VITE_API_BASE_URL ||
    'http://127.0.0.1:8000'
  ).replace(/\/$/, '')
  const wsBaseUrl = apiBaseUrl.replace(/^http/, 'ws')

  return {
    plugins: [react(), tailwindcss()],
    optimizeDeps: {
      include: ['leaflet', 'react-leaflet'],
    },
    server: {
      proxy: {
        '/api': apiBaseUrl,
        '/media': apiBaseUrl,
        '/ws': {
          target: wsBaseUrl,
          ws: true,
        },
      },
    },
  }
})
