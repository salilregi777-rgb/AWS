import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';

const projectRoot = fileURLToPath(new URL('.', import.meta.url));

// The deployed client uses the same application, without the local preview's
// Cloudflare worker adapter. Relay's state and Cedar engine run in the browser.
export default defineConfig({
  root: fileURLToPath(new URL('./deployment/', import.meta.url)),
  publicDir: fileURLToPath(new URL('./public/', import.meta.url)),
  plugins: [react()],
  resolve: { alias: { '@': projectRoot } },
  css: { postcss: projectRoot },
  build: {
    outDir: fileURLToPath(new URL('./dist-aws/', import.meta.url)),
    emptyOutDir: true,
    sourcemap: false,
  },
  preview: { host: '127.0.0.1', port: 5174, strictPort: true },
});
