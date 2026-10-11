import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    host: true,
    proxy: {
      /**
       * DEVELOPMENT PROXY — /api/ai → local backend proxy server
       *
       * The Vite dev proxy forwards AI requests to the local backend
       * proxy (server/index.ts) running on PROXY_PORT.
       *
       * The backend proxy injects provider credentials server-side.
       * The API key is NEVER sent to the browser.
       *
       * Production: See PRODUCTION_DEPLOYMENT.md for backend requirements.
       */
      '/api/ai': {
        target: `http://localhost:${process.env.PROXY_PORT || '3001'}`,
        changeOrigin: true,
      },
    },
  },
});
