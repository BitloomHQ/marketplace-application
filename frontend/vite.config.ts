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
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (!id.includes('node_modules')) {
              if (id.includes('/pages/admin/')) return 'admin'
              if (id.includes('/pages/provider/')) return 'provider'
              if (id.includes('/pages/customer/')) return 'customer'
              return undefined
            }
            if (id.includes('leaflet') || id.includes('react-leaflet')) return 'leaflet'
            if (id.includes('react-router')) return 'router'
            if (id.includes('react-dom') || id.includes('/react/')) return 'react'
            return 'vendor'
          },
        },
      },
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
