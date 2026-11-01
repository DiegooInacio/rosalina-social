import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    tailwindcss(),
    react(),
    // React Compiler memoizava registros/refs mutáveis do React Hook Form,
    // deixando valores e mensagens dos formulários desatualizados.
  ],
})
