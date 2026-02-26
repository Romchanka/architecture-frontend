import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [
        react(),
        VitePWA({
            registerType: 'autoUpdate',
            includeAssets: ['favicon.svg'],
            manifest: {
                name: 'Квартиры Бишкек — Сервис покупки недвижимости',
                short_name: 'Квартиры',
                description: 'Современная платформа для покупки недвижимости в Бишкеке',
                theme_color: '#d97706',
                background_color: '#ffffff',
                display: 'standalone',
                orientation: 'portrait',
                scope: '/',
                start_url: '/',
                icons: [
                    {
                        src: '/favicon.svg',
                        sizes: 'any',
                        type: 'image/svg+xml',
                        purpose: 'any',
                    },
                    {
                        src: '/favicon.svg',
                        sizes: 'any',
                        type: 'image/svg+xml',
                        purpose: 'maskable',
                    },
                ],
            },
            workbox: {
                globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
                runtimeCaching: [
                    {
                        urlPattern: /^https?:\/\/.*\/api\/marketplace\/.*/i,
                        handler: 'StaleWhileRevalidate',
                        options: {
                            cacheName: 'marketplace-api-cache',
                            expiration: {
                                maxEntries: 50,
                                maxAgeSeconds: 60 * 60, // 1 hour
                            },
                        },
                    },
                    {
                        urlPattern: /^https?:\/\/static\.tildacdn\.one\/.*/i,
                        handler: 'CacheFirst',
                        options: {
                            cacheName: 'cdn-images-cache',
                            expiration: {
                                maxEntries: 30,
                                maxAgeSeconds: 60 * 60 * 24 * 7, // 7 days
                            },
                        },
                    },
                ],
            },
        }),
    ],
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src'),
        },
    },
    server: {
        port: 3000,
        proxy: {
            '/api': {
                target: 'http://localhost:8080',
                changeOrigin: true,
            },
            '/uploads': {
                target: 'http://localhost:8080',
                changeOrigin: true,
            },
        },
    },
})
