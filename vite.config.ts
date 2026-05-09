import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    server: {
      port: 3000,
      host: '0.0.0.0',
      historyApiFallback: true,
      allowedHosts: ['bookingui-anurakx.onrender.com'],
    },
    plugins: [react()],
    build: {
      chunkSizeWarningLimit: 1000,
      rollupOptions: {
        output: {
          manualChunks: {
            'vendor-react': ['react', 'react-dom', 'react-router-dom'],
            'vendor-utils': ['axios', 'date-fns', 'zod', 'clsx', 'tailwind-merge'],
            'vendor-recharts': ['recharts'],
            'vendor-pdf': ['jspdf', 'jspdf-autotable'],
            'vendor-dom': ['html2canvas', 'dompurify', 'qrcode'],
            'vendor-icons': ['lucide-react'],
          },
        },
      },
    },
    define: {
    }, resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      }
    }
  };
});
