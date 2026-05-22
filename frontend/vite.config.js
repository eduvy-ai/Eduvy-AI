// import { defineConfig } from 'vite'
// import react from '@vitejs/plugin-react'

// export default defineConfig({
//   test: {
//     globals: true,
//     environment: 'jsdom',
//     setupFiles: './src/test/setup.js',
//     css: false,
//   },
//   plugins: [react()],
//   server: {
//     host: true,
//     proxy: {
//       // Dev: forward /api/* → FastAPI backend on :8000
//       '/api': {
//         target: 'http://127.0.0.1:8000',
//         changeOrigin: true,
//       },
//     },
//   },
// })

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.js',
    css: false,
  },
  plugins: [react()],
  server: {
    host: true,
  },
})