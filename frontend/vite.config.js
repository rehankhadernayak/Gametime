import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // Matches Next.js `gametime-web-nav` → nav shim (see web-next/next.config.ts)
      'gametime-web-nav': path.resolve(__dirname, 'src/shims/nav.vite.jsx'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
        rewrite: (reqPath) => reqPath.replace(/^\/api/, ''),
      },
    },
  },
});
