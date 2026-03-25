import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      '/api/auth': 'http://localhost:8000',
      '/api/jobs': 'http://localhost:8000',
      '/api/ml': 'http://localhost:8001',
      '/outputs': 'http://localhost:8001',
    },
  },
})
