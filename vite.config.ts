import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import { VitePWA } from 'vite-plugin-pwa'
import fs from 'node:fs'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      injectRegister: 'script',
      strategies: 'generateSW',
      registerType: 'autoUpdate',
      manifest: {
        name: 'pwatt1',
        short_name: 'pwatest',
        start_url: '/',
        display: 'standalone',
        background_color: '#ffffff',
        theme_color: '#111827',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,webp}'],
      },
    }),
  ],
  preview: {
    host: true,
    port: 4173,
    https: {
      cert: fs.readFileSync('./192.168.110.174+2.pem'),
      key: fs.readFileSync('./192.168.110.174+2-key.pem'),
    },
  },
})
