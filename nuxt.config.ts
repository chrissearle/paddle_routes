// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  modules: ['@nuxt/eslint', '@nuxt/fonts', '@nuxt/ui', '@nuxt/scripts'],
  css: ['~/assets/css/main.css'],
  app: {
    head: {
      link: [
        { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' },
        { rel: 'icon', href: '/favicon.ico', sizes: 'any' },
      ],
    },
  },
  colorMode: {
    preference: 'dark',
    fallback: 'dark',
  },
  // Infrastructure only: app/plugins/umami.client.ts loads the tracker with
  // the deployment's settings. Without this entry the module bundles Umami
  // Cloud's script at build time and proxies its sends to Umami Cloud, which
  // overrides the self-hosted src
  scripts: {
    registry: {
      umamiAnalytics: { trigger: false, proxy: false, bundle: false },
    },
  },
  runtimeConfig: {
    dataDir: process.env.DATA_DIR || './data',
    // Umami, served to the client by server/api/analytics.get.ts. Set only by
    // the production deployment (NUXT_UMAMI_WEBSITE_ID, NUXT_UMAMI_DOMAINS as
    // a JSON array, NUXT_UMAMI_SRC); left empty, no tracker loads
    umami: {
      websiteId: '',
      domains: [] as string[],
      src: '',
    },
    // Prometheus scrapes this port in-cluster; the ingress only routes 3000.
    // Override with NUXT_METRICS_PORT
    metricsPort: 9090,
    public: {
      imageTag: '',
    },
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
    // Overlay detail levels are equally fixed per deploy, and far more
    // bandwidth-sensitive — zooming in and back out must not refetch.
    '/api/geojson/**': {
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
