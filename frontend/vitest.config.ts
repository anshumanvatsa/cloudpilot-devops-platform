import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import path from 'path'

export default defineConfig({
  plugins: [react()],

  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },

  // ✅ THIS IS THE IMPORTANT FIX
  preview: {
    host: true,
    port: 3000,
    allowedHosts: 'all'
  }
})