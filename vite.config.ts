
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
      external: [
        'react',
        'react-dom',
        'react-dom/client',
        'lucide-react',
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
