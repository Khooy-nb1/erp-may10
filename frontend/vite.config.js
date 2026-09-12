import path from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { astryxStylex } from '@astryxdesign/build/vite';

const rootDir = import.meta.dirname;

/**
 * `astryxStylex` aliases `@astryxdesign/core` to that package's `src/` so StyleX
 * compiles component sources. Its alias is a prefix match, so the documented
 * `@astryxdesign/core/locales/<tag>.json` import would rewrite to a
 * non-existent `src/locales/…` — the catalogs ship at the package root.
 * Prepend a more specific entry so the catalogs resolve before that prefix.
 */
const astryxLocales = () => ({
  name: 'astryx-locales',
  config() {
    return {
      resolve: {
        alias: {
          '@astryxdesign/core/locales': path.join(rootDir, 'node_modules/@astryxdesign/core/locales'),
        },
      },
    };
  },
});

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    astryxLocales(),
    ...astryxStylex({
      rootDir,
      dev: process.env.NODE_ENV !== 'production',
    }),
    react(),
  ],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
});
