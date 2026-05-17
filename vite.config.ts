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
    emptyOutDir: true
  }
})
