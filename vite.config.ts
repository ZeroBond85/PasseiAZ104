import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  base: '/PasseiAZ104/',
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        // ADR-001 (Sprint 2): banco data/*.json em runtime cache — primeira visita
        // exige rede; depois, StaleWhileRevalidate serve do SW mesmo sem rede.
        runtimeCaching: [
          {
            // RegExp (não função): workbox-build serializa p/ o sw.js gerado.
            urlPattern: /\/data\/.*\.json$/,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'az104-questions',
              expiration: {
                maxEntries: 20,
                maxAgeSeconds: 60 * 60 * 24 * 30,
              },
            },
          },
        ],
      },
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
