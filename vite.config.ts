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
    host: '0.0.0.0', // Explicitly listen on all interfaces for Windows stability
    port: 5173,
    strictPort: true,
    proxy: {
      '/api-md': {
        target: 'https://api.mangadex.org',
        changeOrigin: true,
        secure: false, // Prevents SSL handshake errors
        timeout: 15000, // Reduced from 30s - fail fast in local dev
        proxyTimeout: 15000,
        ws: false,
        rewrite: (path) => path.replace(/^\/api-md/, ''),
        logLevel: 'warn',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
          'Accept': 'application/json',
          'Referer': 'https://mangadex.org',
          'Origin': 'https://mangadex.org'
        },
        onError: (err, req, res) => {
          console.error(`[Vite Proxy Error] ${req.url}: ${err.message}`);
          res.writeHead(503, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Proxy timeout or connection error', details: err.message }));
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
      '/api-anilist': {
        target: 'https://graphql.anilist.co',
        changeOrigin: true,
        timeout: 10000,
        proxyTimeout: 10000,
        rewrite: (path) => {
          // Keep the path as "/" for GraphQL endpoint
          const stripped = path.replace(/^\/api-anilist/, '');
          return stripped || '/';  // If empty, default to "/"
        },
        ws: false,
        logLevel: 'warn',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
          'Accept': 'application/json',
          'Referer': 'https://anilist.co',
          'Origin': 'https://anilist.co'
        },
        onError: (err, req, res) => {
          console.error(`[Vite Proxy] AniList ${req.method} ${req.url}: ${err.message}`);
          res.writeHead(503, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'AniList proxy error' }));
        }
      },
      '/proxy-wp': {
        target: 'https://i0.wp.com',
        changeOrigin: true,
        timeout: 10000,
        proxyTimeout: 10000,
        rewrite: (path) => path.replace(/^\/proxy-wp/, ''),
        logLevel: 'warn'
      },
      '/api-aniwatch': {
        target: 'https://apideaniwatch.vercel.app',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api-aniwatch/, ''),
        timeout: 10000,      // Reduced from 20s
        proxyTimeout: 10000,
        logLevel: 'warn',
        headers: {
          'User-Agent': 'MangaApp/1.0 (Local Dev)',
          'Accept': 'application/json',
          'Referer': 'https://apideaniwatch.vercel.app'
        },
        onError: (err, req, res) => {
          console.error(`[Vite Proxy Error] AniWatch - ${req.url}: ${err.message}`);
          res.writeHead(503, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'AniWatch proxy error' }));
        }
      },
      '/api-local': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api-local/, ''),
        timeout: 5000,
        proxyTimeout: 5000,
        logLevel: 'warn'
      },
      '/api-comick': {
        target: 'https://api.comick.io',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api-comick/, ''),
        timeout: 10000,
        proxyTimeout: 10000,
        logLevel: 'warn',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Referer': 'https://comick.io',
          'Origin': 'https://comick.io'
        },
        onError: (err, req, res) => {
          console.error(`[Vite Proxy Error] Comick - ${req.url}: ${err.message}`);
          res.writeHead(503, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Comick proxy error' }));
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