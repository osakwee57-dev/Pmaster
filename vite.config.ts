
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: './index.html',
      },
      // These are handled by the browser's importmap in index.html.
      // We must list all ESM-sh imports here to prevent Vite from trying to bundle them.
      external: [
        'react',
        'react-dom',
        'react-dom/client',
        'lucide-react',
        'jspdf',
        'pdf-lib',
        'tesseract.js',
        '@vercel/analytics/react'
      ],
    },
  },
  server: {
    port: 3000,
    open: true,
  },
});
