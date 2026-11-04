import tailwindcss from '@tailwindcss/vite';
import { tanstackRouter } from '@tanstack/router-plugin/vite';
import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  const api = `http://localhost:${loadEnv(mode, process.cwd(), '').PORT || 8080}`;

  return {
    plugins: [
      tanstackRouter({
        target: 'react',
        routesDirectory: 'src/client/routes',
        generatedRouteTree: 'src/client/routeTree.gen.ts',
        autoCodeSplitting: true,
        addExtensions: true,
        quoteStyle: 'single',
      }),
      react(),
      tailwindcss(),
    ],
    server: {
      proxy: { '/api': api, '/images': api },
    },
    build: {
      outDir: 'dist',
      emptyOutDir: true,
    },
  };
});
