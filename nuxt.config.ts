// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  modules: ['nuxt-gtag'],
  app: {
    head: {
      title: 'Treastock: Real-Time Market Data, Economic Indicators, and Corporate News',
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no' },

        { name: 'description', content: 'Explore real-time market data with Treastock. Dive deep into comprehensive economic indicators, corporate news, and interactive treemaps to gain valuable insights into market trends.' },
        { name: 'keywords', content: 'real-time market data, economic indicators, corporate news, stock market, financial news, treemap, market trends, financial analysis' },
        { name: 'robots', content: 'index, follow' },
        { property: 'og:type', content: 'website' },
        { property: 'og:url', content: 'https://www.treastock.com/' },
        { property: 'og:title', content: 'Treastock: Real-Time Market Data, Economic Indicators, and Corporate News' },
        { property: 'og:description', content: 'Get real-time market insights with Treastock. Analyze market trends using interactive treemaps, track economic indicators, and stay updated with corporate news for smarter investment decisions.' },
        { name: 'twitter:card', content: 'summary_large_image' },
        { name: 'twitter:url', content: 'https://www.treastock.com/' },
        { name: 'twitter:title', content: 'Treastock: Real-Time Market Data, Economic Indicators, and Corporate News' },
        { name: 'twitter:description', content: 'Stay ahead with Treastock\'s real-time market data, detailed economic insights, and latest corporate news. Explore interactive treemaps to make informed decisions.' },
      ],
      link: [
        { rel: 'canonical', href: 'https://www.treastock.com/' },
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
            "name": "Treastock",
            "url": "https://www.treastock.com/",
            "description": "Stay updated with real-time market data, economic indicators, and corporate news on Treastock. Explore interactive treemaps for comprehensive market analysis.",
            "publisher": {
              "@type": "Organization",
              "name": "Treastock",
            }
          })
        }
      ],
    }
  },

  gtag: {
    id: 'G-CHKS355R0L',
    debug: false,
    config: {
      anonymize_ip: true, // GDPR에 따른 IP 익명화
      send_page_view: process.env.NODE_ENV === 'production', // production 환경에서만 페이지 뷰 전송
    },
    enabled: process.env.NODE_ENV === 'production',
  },

  compatibilityDate: '2024-09-01'
})
