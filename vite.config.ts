import { existsSync } from 'node:fs';
import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const localPackageAliases = Object.fromEntries(
  [
    ['@relgeo/core', '../core/src/index.ts'],
    ['@relgeo/geometry', '../geometry/src/index.ts'],
    ['@relgeo/renderer-svg', '../renderer-svg/src/index.ts'],
    ['@relgeo/language-service', '../language-service/src/index.ts'],
  ]
    .map(([name, relativePath]) => [
      name,
      fileURLToPath(new URL(relativePath, import.meta.url)),
    ])
    .filter(([, absolutePath]) => existsSync(absolutePath)),
);

// Use sibling source repositories in the root integration workspace, while
// allowing standalone builds (such as GitHub Pages) to resolve public npm
// packages normally.
export default defineConfig({
  base: '/playground/',
  resolve: {
    alias: localPackageAliases,
  },
  build: {
    cssMinify: 'esbuild',
  },
  plugins: [react()],
});
