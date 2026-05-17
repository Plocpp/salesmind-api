import react from '@vitejs/plugin-react'
import { resolve } from 'node:path'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react()],
  root: resolve(__dirname, 'src/frontend'),
  server: {
    // Permite acesso via dominios temporarios de tunel para testes externos.
    allowedHosts: ['.lhr.life', '.localhost.run']
  },
  build: {
    outDir: resolve(__dirname, 'dist'),
    emptyOutDir: true,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined
          if (id.includes('recharts')) return 'charts'
          if (id.includes('lucide-react')) return 'icons'
          if (id.includes('/react/') || id.includes('/react-dom/') || id.includes('/scheduler/')) return 'react-vendor'
          return 'vendor'
        }
      }
    }
  }
})
