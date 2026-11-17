import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const API_ORIGIN = 'http://127.0.0.1:8765'

export default defineConfig({
  // Relative, so that the built site works from any folder, such as the page of a GitHub project.
  base: './',
  plugins: [react()],
  server: {
    proxy: {
      '/api': API_ORIGIN,
    },
  },
})
