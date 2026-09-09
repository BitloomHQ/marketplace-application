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

  return {
    plugins: [react(), tailwindcss()],
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules')) {
              if (id.includes('react-router')) return 'router'
              if (id.includes('react-dom') || id.includes('/react/')) return 'react'
              return 'vendor'
            }
            return undefined
          },
        },
      },
    },
    server: {
      proxy: {
        '/api': apiBaseUrl,
        '/media': apiBaseUrl,
      },
    },
  }
})
