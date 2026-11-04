import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

const api = process.env.API_URL ?? 'http://localhost:8080';

export default defineConfig({
  // The server mounts the admin panel at /admin.
  base: '/admin/',
  plugins: [react()],
  server: {
    port: 5174,
    proxy: {
      '/api': api,
      '/images': api,
    },
  },
});
