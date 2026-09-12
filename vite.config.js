import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { defineConfig } from 'vite';
import solid from 'vite-plugin-solid';

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [solid()],
  server: { port: 5173, open: true },
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        control: resolve(__dirname, 'control.html')
      }
    }
  }
});
