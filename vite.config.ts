
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: './', // CRUCIALE: Questo risolve lo schermo blu/bianco in Electron
  server: {
    port: 3000,
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false,
    rollupOptions: {
      // Escludiamo node-hid dal bundle perché è un modulo nativo C++
      // che deve essere caricato da Electron, non dal browser
      external: ['node-hid', 'serialport', 'usb'], 
    }
  }
});
