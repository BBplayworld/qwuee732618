// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  modules: ['nuxt-gtag'],
  app: {
    head: {
      htmlAttrs: {
        lang: 'en',
      },
      title: 'BBstoqq: US Stocks Treemap',
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no' },

        { name: 'description', content: 'Explore BBstoqq’s US Stocks Treemap — a delayed real-time visualization of market performance and sector trends.' },
        { name: 'keywords', content: 'US stock treemap, stock heatmap, US market visualization, delayed real-time data, financial treemap, sector performance' },
        { name: 'robots', content: 'index, follow' },

        { property: 'og:type', content: 'website' },
        { property: 'og:url', content: 'https://www.bbstoqq.com/' },
        { property: 'og:title', content: 'BBstoqq: US Stocks Treemap' },
        { property: 'og:description', content: 'Explore BBstoqq’s US Stocks Treemap — a delayed real-time visualization of market performance and sector trends.' },

        { name: 'twitter:card', content: 'summary_large_image' },
        { name: 'twitter:url', content: 'https://www.bbstoqq.com/' },
        { name: 'twitter:title', content: 'BBstoqq: US Stocks Treemap' },
        { name: 'twitter:description', content: 'Explore BBstoqq’s US Stocks Treemap — a delayed real-time visualization of market performance and sector trends.' },
      ],
      link: [
        { rel: 'canonical', href: 'https://www.bbstoqq.com/' },
        { rel: 'icon', type: 'image/x-icon', href: '/favicon.ico' },
        {
          rel: 'stylesheet',
          href: 'https://fonts.googleapis.com/css2?family=Open+Sans:ital,wght@0,300..800;1,300..800&family=Roboto:ital,wght@0,100;0,300;0,400;0,500;0,700;0,900;1,100;1,300;1,400;1,500;1,700;1,900&family=Noto+Sans+KR:wght@100;300;400;500;700;900&display=swap',
        },
      ],
      script: [
        {
          type: 'application/ld+json',
          innerHTML: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'WebSite',
            name: 'BBstoqq',
            url: 'https://www.bbstoqq.com/',
            logo: 'https://www.bbstoqq.com/favicon.ico',
            description: 'Explore BBstoqq’s US Stocks Treemap — a delayed real-time visualization of market performance and sector trends.',
            publisher: {
              '@type': 'Organization',
              name: 'BBstoqq',
            },
          }),
        },
        {
          src: 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-7852495050691458',
          async: true,
          crossorigin: 'anonymous',
        },
      ],
    },
  },

  gtag: {
    id: 'G-CHKS355R0L',
    config: {
      anonymize_ip: true, // GDPR에 따른 IP 익명화
      send_page_view: true,
    },
    enabled: process.env.NODE_ENV === 'production' && process.env.APP_ENV !== 'preview',
  },

  routeRules: {
    '/api/**': { cache: false },
  },

  compatibilityDate: '2024-09-01',
})
