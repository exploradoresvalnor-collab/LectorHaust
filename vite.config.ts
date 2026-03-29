/// <reference types="vitest" />

import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import dns from 'dns'

// Fix for Node 17+ Vite proxy ENOTFOUND issues (forces IPv4 resolution for mangadex.org)
dns.setDefaultResultOrder('ipv4first')


// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react()
  ],
  server: {
    host: 'localhost',
    port: 5173,
    strictPort: true,
    proxy: {
      '/api-md': {
        target: 'https://api.mangadex.org',
        changeOrigin: true,
        secure: false, // Prevents bazı SSL handshake errors
        timeout: 30000,
        rewrite: (path) => path.replace(/^\/api-md/, ''),
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
          'Accept': 'application/json',
          'Referer': 'https://mangadex.org',
          'Origin': 'https://mangadex.org'
        }
      },
      '/uploads-md': {
        target: 'https://uploads.mangadex.org',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/uploads-md/, ''),
        headers: {
          'User-Agent': 'Mozilla/5.0',
          'Referer': 'https://mangadex.org'
        }
      },
      '/proxy-wp': {
        target: 'https://i0.wp.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/proxy-wp/, '')
      },
      '/api-aniwatch': {
        target: 'https://apideaniwatch.vercel.app',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api-aniwatch/, ''),
        timeout: 20000,
        headers: {
          'User-Agent': 'MangaApp/1.0 (Local Dev)',
          'Accept': 'application/json',
          'Referer': 'https://apideaniwatch.vercel.app'
        }
      },
      '/api-local': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api-local/, ''),
        timeout: 20000
      },
      '/api-comick': {
        target: 'https://api.comick.io',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api-comick/, ''),
        timeout: 15000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Referer': 'https://comick.io',
          'Origin': 'https://comick.io'
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