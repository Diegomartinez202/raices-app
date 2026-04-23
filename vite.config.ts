import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      '@core': resolve(__dirname, './src/core'),
      '@components': resolve(__dirname, './src/components'),
      '@assets': resolve(__dirname, './src/assets'),
      '@hooks': resolve(__dirname, './src/hooks'),
    },
  },
  server: {
    port: 5173,
    host: true, // Crucial para pruebas en red local sin salida a internet
    headers: {
      // ESTO ES LO MÁS IMPORTANTE PARA EL LLM LOCAL:
      // Habilita SharedArrayBuffer, necesario para que Gemma 2B use varios núcleos del CPU
      "Cross-Origin-Opener-Policy": "same-origin",
      "Cross-Origin-Embedder-Policy": "require-corp",
    },
  },
  build: {
    target: 'esnext', // Permite usar Top-level await requerido por modelos de IA
    outDir: 'dist',
    assetsInlineLimit: 0, // No convierte el modelo .gguf en base64 (rompería la RAM)
    rollupOptions: {
      output: {
        manualChunks(id) {
          // Separa las librerías pesadas para carga más rápida en el móvil
          if (id.includes('node_modules')) {
            if (id.includes('react')) return 'vendor_react';
            if (id.includes('@capacitor')) return 'vendor_cap';
            if (id.includes('@llama-node')) return 'vendor_ai';
          }
        },
      },
    },
  },
  optimizeDeps: {
    // Evita que Vite intente pre-bundling de binarios de C++/Rust
    exclude: ['@llama-node/llama-cpp', 'sql.js'], 
  },
  // Instruye a Vite para que trate los modelos y archivos cifrados como archivos estáticos
  assetsInclude: ['**/*.gguf', '**/*.bin', '**/*.enc'],
})