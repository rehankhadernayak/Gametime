import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173
  },
  preview: {
    port: 4173,
    host: true,
    // Allow public preview tunnels (Cloudflare Quick Tunnels, ngrok, etc.).
    // Vite blocks unknown Host headers by default to prevent DNS rebinding;
    // we relax that here because preview is intentionally exposed.
    allowedHosts: true
  }
});
