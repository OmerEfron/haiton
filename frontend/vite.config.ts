import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
const API_TARGET = 'http://localhost:8787'
const REPORTER_TARGET = 'http://localhost:8788'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/interviews': REPORTER_TARGET,
      '/auth': API_TARGET,
      '/editions': API_TARGET,
      '/stories': API_TARGET,
      '/flashes': API_TARGET,
      '/profile': {
        target: API_TARGET,
        bypass(req) {
          if (req.headers['sec-fetch-dest'] === 'document') return '/index.html'
          const accept = req.headers.accept
          if (typeof accept === 'string' && accept.includes('text/html')) {
            return '/index.html'
          }
        },
      },
      '/karteset': API_TARGET,
      '/connections': API_TARGET,
      '/invitations': API_TARGET,
      '/health': API_TARGET,
      '/quota': API_TARGET,
      '/desk': API_TARGET,
      '/admin': API_TARGET,
    },
  },
})
