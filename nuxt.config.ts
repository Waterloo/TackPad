import Aura from '@primevue/themes/aura'

export default defineNuxtConfig({
  compatibilityDate: '2026-02-21',
  devtools: { enabled: true },
  ssr: false,

  app: {
    head: {
      meta: [
        { name: 'viewport', content: 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover' },
      ],
    },
  },

  modules: [
    '@nuxt/a11y',
    '@nuxt/eslint',
    '@nuxt/fonts',
    '@nuxt/icon',
    '@nuxt/image',
    '@nuxt/scripts',
    'nitro-cloudflare-dev',
    '@nuxtjs/tailwindcss',
    '@primevue/nuxt-module',
    '@pinia/nuxt',
    'nuxt-auth-utils',
  ],

  nitro: {
    preset: 'cloudflare_module',
    cloudflareDev: {
      configPath: 'wrangler.jsonc',
    },
  },

  tailwindcss: {
    cssPath: '~/assets/css/main.css',
  },

  primevue: {
    options: {
      theme: {
        preset: Aura,
        options: { darkModeSelector: false },
      },
    },
  },

  runtimeConfig: {
    // Private (server-only)
    // Set NUXT_SESSION_PASSWORD to a random 32-char string in production.
    // nuxt-auth-utils uses this to encrypt session cookies — empty = broken.
    sessionPassword: '',   // NUXT_SESSION_PASSWORD
    websocketUrl: process.env.NUXT_WEBSOCKET_URL ?? 'ws://localhost:1234',
    oauth: {
      google: { clientId: '', clientSecret: '' },
      github: { clientId: '', clientSecret: '' },
    },
    bucket: process.env.NUXT_BUCKET ?? '',
    // Public
    public: {
      websocketUrl: process.env.NUXT_PUBLIC_WEBSOCKET_URL ?? 'ws://localhost:1234',
      tackletsV2Enabled: process.env.NUXT_PUBLIC_TACKLETS_V2_ENABLED !== 'false',
      tackletsRegistryUrl: process.env.NUXT_PUBLIC_TACKLETS_REGISTRY_URL ?? 'https://tacklets.tackpad.xyz/directory/tacklets.json',
      tackletsAllowedOrigins: process.env.NUXT_PUBLIC_TACKLETS_ALLOWED_ORIGINS ?? '',
    },
  },

  typescript: {
    tsConfig: {
      compilerOptions: {
        types: ['@cloudflare/workers-types/2025-11-01'],
      },
    },
  },
})
