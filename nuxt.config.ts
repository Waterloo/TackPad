export default defineNuxtConfig({
  devtools:{
    enabled: true
  },
  modules: [
    '@nuxtjs/tailwindcss',
    '@pinia/nuxt',
    '@nuxthub/core',
    '@nuxt/fonts',
    'nuxt-auth-utils'
  ],

  runtimeConfig: {
    public: {
      apiBase: process.env.NUXT_PUBLIC_API_BASE || '/api'
    },
    oauth:{
      google: {
        clientId: '...',
        clientSecret: '...',
        redirectURL: '...'
      }
    },
        bucket: process.env.NUXT_BUCKET,
        endpoint: process.env.NUXT_ENDPOINT,
        accessKeyId: process.env.NUXT_ACCESS_KEY_ID,
        secretAccessKey: process.env.NUXT_SECRET_ACCESS_KEY,
        region: process.env.NUXT_REGION
  },
  hub:{
    database:true
  },
  app: {
    head: {
      title: 'Sticky Board',
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' }
      ]
    }
  },

  compatibilityDate: '2024-11-28'
})