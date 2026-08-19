import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [react(), tailwindcss()],
    base: './',
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
    },
    build: {
      target: ['es2020', 'safari14', 'ios14', 'chrome87', 'firefox78'],
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules')) {
              if (id.includes('pdfjs-dist')) return 'vendor-pdfjs';
              if (id.includes('lucide-react')) return 'vendor-lucide';
              if (id.includes('motion')) return 'vendor-motion';
              if (id.includes('react-youtube')) return 'vendor-youtube';
              if (id.includes('react') || id.includes('react-dom')) return 'vendor-core';
              return 'vendor-other';
            }
            if (id.includes('src/data/videos.json')) return 'data-videos';
            if (id.includes('src/data/india_365_day_calendar')) return 'data-calendar';
          },
        },
      },
    },
  };
});
