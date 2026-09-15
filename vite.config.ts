import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  base: '/PasseiAZ104/',
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Passei AZ-104',
        short_name: 'PasseiAZ104',
        description: 'Simulado + revisão espaçada para o exame AZ-104',
        lang: 'pt-BR',
        categories: ['education'],
        start_url: '.',
        display: 'standalone',
        theme_color: '#0a0e14',
        background_color: '#0a0e14',
        icons: [
          {
            src: 'icons/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: 'icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: 'icons/icon-maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
    }),
  ],
})
