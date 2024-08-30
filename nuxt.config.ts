// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  app: {
    head: {
      charset: 'utf-8',
      viewport: 'width=device-width, initial-scale=1',
      title: 'Nadaq Today',
      meta: [
        { name: 'description', content: `Nasdaq100, today's market situation` }
      ]
    }
  },
  compatibilityDate: '2024-04-03',
  devtools: { enabled: true }
})
