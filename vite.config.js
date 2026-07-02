import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.js',
      registerType: 'autoUpdate',
      inlineDynamicImports: false,
      devOptions: {
        enabled: true,
        type: 'module'
      },
      manifest: {
        name: 'TernieTrack',
        short_name: 'TernieTrack',
        description: 'Internship Time Tracking System',
        theme_color: '#ffffff',
        icons: [
          {
            src: '/pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: '/pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      }
    })
  ],
  optimizeDeps: {
    include: ['recharts'],
  },
  build: {
    commonjsOptions: {
      include: [/recharts/, /node_modules/],
    },
  },
})
