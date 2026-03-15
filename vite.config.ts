/// <reference types="vitest" />

import legacy from '@vitejs/plugin-legacy'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

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
      },
      '/api-consumet': {
        target: 'https://api.consumet.org',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api-consumet/, ''),
      }
    }
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/setupTests.ts',
  }
})
