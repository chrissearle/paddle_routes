// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  modules: ['@nuxt/eslint', '@nuxt/fonts', '@nuxt/ui'],
  css: ['~/assets/css/main.css'],
  app: {
    head: {
      link: [
        { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' },
        { rel: 'alternate icon', href: '/favicon.ico' },
      ],
    },
  },
  colorMode: {
    preference: 'dark',
    fallback: 'dark',
  },
  runtimeConfig: {
    dataDir: process.env.DATA_DIR || './data',
  },
  // Track geometry is fixed for the life of a deploy, so it can be cached by
  // the browser. Set here rather than via setResponseHeader in the handler:
  // Nitro applies its default `cache-control: no-cache` to API routes after
  // the handler runs, which overrides anything the handler sets.
  routeRules: {
    '/api/tracks/points': {
      headers: {
        'cache-control': 'public, max-age=300, stale-while-revalidate=86400',
      },
    },
  },
  vite: {
    optimizeDeps: {
      include: ['leaflet'],
    },
  },
})
