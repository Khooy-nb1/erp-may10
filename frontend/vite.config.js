import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { astryxStylex } from '@astryxdesign/build/vite';

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    ...astryxStylex({
      rootDir: import.meta.dirname,
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
