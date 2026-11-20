import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const API_ORIGIN = 'http://127.0.0.1:8765'
// The data that the front shares with the API sits in its folder: Vite serves it, the API is not asked for it.
const SHARED_DATA_PATH = '/api/data/'

export default defineConfig({
  // Relative, so that the built site works from any folder, such as the page of a GitHub project.
  base: './',
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: API_ORIGIN,
        bypass: (request) => (request.url?.startsWith(SHARED_DATA_PATH) ? request.url : undefined),
      },
    },
  },
})
