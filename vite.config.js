import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // Configuração para compatibilidade de variáveis de ambiente do Firebase
  define: {
    'process.env': {} 
  }
})