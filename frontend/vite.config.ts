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
      '/profile': API_TARGET,
      '/karteset': API_TARGET,
      '/connections': API_TARGET,
      '/invitations': API_TARGET,
      '/health': API_TARGET,
      '/quota': API_TARGET,
      '/desk': API_TARGET,
    },
  },
})
