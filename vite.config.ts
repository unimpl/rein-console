import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': { target: process.env.REIN_HUB_HTTP || 'http://127.0.0.1:9010', changeOrigin: true },
    },
  },
  build: {
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            { name: 'react', test: /node_modules\/(?:react|react-dom|scheduler)\// },
            { name: 'mui', test: /node_modules\/(?:@mui|@emotion)\// },
          ],
        },
      },
    },
  },
})
