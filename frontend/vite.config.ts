import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    proxy: {
      '/game': 'http://localhost:3000',
      '/deliveries': 'http://localhost:3000',
      '/api': 'http://localhost:3000',
    },
  },
});
