import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  define: {
    // jQuery needs a global object — Vite targets ESM which has no `global`
    global: 'globalThis',
  },
  optimizeDeps: {
    include: ['jquery'],
  },
})
