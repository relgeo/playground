import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vite.dev/config/
export default defineConfig({
  base: '/playground/',
  resolve: {
    alias: {
      'relgeo-core': fileURLToPath(new URL('../core/src/index.ts', import.meta.url)),
      'relgeo-geometry': fileURLToPath(new URL('../geometry/src/index.ts', import.meta.url)),
      'relgeo-renderer-svg': fileURLToPath(new URL('../renderer-svg/src/index.ts', import.meta.url)),
      'relgeo-language-service': fileURLToPath(new URL('../language-service/src/index.ts', import.meta.url)),
    },
  },
  build: {
    cssMinify: 'esbuild',
  },
  plugins: [react()],
});
