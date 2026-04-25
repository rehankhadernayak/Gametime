import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const backendTarget = process.env.VITE_DEV_API_PROXY_TARGET || 'http://127.0.0.1:4000';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      'gametime-web-nav': path.resolve(__dirname, 'src/shims/nav.vite.jsx')
    }
  },
  server: {
    port: 5173,
    // Quick tunnels (trycloudflare.com) and Cursor agent preview hosts send a non-local Host header.
    allowedHosts: ['.trycloudflare.com', '.cfargotunnel.com', '.cvm.dev'],
    proxy: {
      // Same-origin API in dev so one HTTPS tunnel (e.g. cloudflared) covers UI + cookies + no CORS.
      '/api': {
        target: backendTarget,
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, '')
      }
    }
  }
});
