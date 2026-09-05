import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api/censtatd': {
        target: 'https://www.censtatd.gov.hk',
        changeOrigin: true,
        rewrite: () => '/api/get.php?id=340-46001&lang=en&full_series=1',
      },
    },
  },
})
