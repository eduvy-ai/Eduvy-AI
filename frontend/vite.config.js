import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  
  return {
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
        '/api': {
          target: env.VITE_API_URL || 'http://127.0.0.1:8000',
          changeOrigin: true,
        },
      },
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules')) {
              if (id.includes('/node_modules/@phosphor-icons/')) {
                return 'vendor-icons'
              }
              if (id.includes('react-router') || id.includes('@remix-run')) {
                return 'vendor-router'
              }
              if (id.includes('/node_modules/react/') || id.includes('/node_modules/react-dom/')) {
                return 'vendor-react'
              }
              if (id.includes('@reduxjs/toolkit') || id.includes('react-redux')) {
                return 'vendor-redux'
              }
              if (id.includes('katex')) {
                return 'vendor-katex'
              }
            }
          },
        },
      },
    },
  }
})