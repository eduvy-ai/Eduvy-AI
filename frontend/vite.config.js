import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.js',
    css: false,
  },
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@modules': path.resolve(__dirname, './src/modules'),
      '@shared': path.resolve(__dirname, './src/shared'),
      '@redux': path.resolve(__dirname, './src/redux'),
      '@services': path.resolve(__dirname, './src/services'),
      '@layouts': path.resolve(__dirname, './src/layouts'),
      '@routes': path.resolve(__dirname, './src/routes'),
      '@styles': path.resolve(__dirname, './src/styles'),
      '@assets': path.resolve(__dirname, './src/assets'),
    },
  },
  server: {
    host: true,
    proxy: {
      // Dev: forward /api/* → FastAPI backend on :8000
      '/api': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
    },
  },
})