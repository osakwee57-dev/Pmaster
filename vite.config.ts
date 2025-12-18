
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        main: './index.html',
      },
      // Ensure external modules from the import map are not bundled
      external: [
        'react',
        'react-dom',
        'react-dom/client',
        'lucide-react',
        'tesseract.js',
        'jspdf',
        'pdf-lib',
        'pdfjs-dist',
        '@vercel/analytics/react'
      ],
    },
  },
  server: {
    port: 3000,
    open: true,
  },
});
