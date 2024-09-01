// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  modules: ['nuxt-gtag'],

  app: {
    head: {
      title: 'Nasdaq Now: Real-Time Market Data, Economic Indicators, and Corporate News',
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },

        { name: 'description', content: 'Stay updated with Nasdaq100 using real-time market data, detailed economic indicators, and the latest corporate news. Get a comprehensive view of the market with interactive treemaps and expert insights.' },
        { name: 'keywords', content: 'Nasdaq100, market data, economic indicators, corporate news, Nasdaq, stock market, financial news, treemap, market analysis' },
        { name: 'robots', content: 'index, follow' },
        { property: 'og:type', content: 'website' },
        { property: 'og:url', content: 'https://www.nasdaqnow.com/' },
        { property: 'og:title', content: 'Nasdaq100 Insights: Real-Time Market Data, Economic Indicators, and Corporate News' },
        { property: 'og:description', content: 'Stay updated with Nasdaq100 using real-time market data, detailed economic indicators, and the latest corporate news. Get a comprehensive view of the market with interactive treemaps and expert insights.' },
        { name: 'twitter:card', content: 'summary_large_image' },
        { name: 'twitter:url', content: 'https://www.nasdaqnow.com/' },
        { name: 'twitter:title', content: 'Nasdaq100 Insights: Real-Time Market Data, Economic Indicators, and Corporate News' },
        { name: 'twitter:description', content: 'Stay updated with Nasdaq100 using real-time market data, detailed economic indicators, and the latest corporate news. Get a comprehensive view of the market with interactive treemaps and expert insights.' },
      ],
      link: [
        { rel: 'canonical', href: 'https://www.nasdaqnow.com/' },
        {
          rel: 'stylesheet',
          href: 'https://fonts.googleapis.com/css2?family=Roboto:wght@400;700&family=Open+Sans:ital@400;700&display=swap',
        },
      ],
      script: [
        {
          type: 'application/ld+json',
          innerHTML: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebSite",
            "name": "NasdaqNow",
            "url": "https://www.nasdaqnow.com/",
            "description": "Stay updated with Nasdaq100 using real-time market data, detailed economic indicators, and the latest corporate news. Get a comprehensive view of the market with interactive treemaps and expert insights.",
            "publisher": {
              "@type": "Personal",
              "name": "NasdaqNow",
            }
          })
        }
      ],
    }
  },

  gtag: {
    id: 'G-CHKS355R0L'
  },

  compatibilityDate: '2024-09-01'
})