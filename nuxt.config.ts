export default defineNuxtConfig({
  devtools:{
    enabled: true
  },
  modules: ['@nuxtjs/tailwindcss', '@pinia/nuxt', '@nuxthub/core', '@nuxt/fonts'],

  runtimeConfig: {
    public: {
      apiBase: process.env.NUXT_PUBLIC_API_BASE || '/api'
    }
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