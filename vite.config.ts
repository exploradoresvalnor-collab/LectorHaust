/// <reference types="vitest" />

import legacy from '@vitejs/plugin-legacy'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import dns from 'dns'

// Fix for Node 17+ Vite proxy ENOTFOUND issues (forces IPv4 resolution for mangadex.org)
dns.setDefaultResultOrder('ipv4first')


// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    legacy()
  ],
  server: {
    proxy: {
      '/api-md': {
        target: 'https://api.mangadex.org',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api-md/, ''),
        headers: {
          'User-Agent': 'MiravoyApp/1.0 (Local Dev)',
        }
      }
    }
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/setupTests.ts',
  }
})
