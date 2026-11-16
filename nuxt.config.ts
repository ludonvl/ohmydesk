import tailwindcss from '@tailwindcss/vite'

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },

  modules: ['@pinia/nuxt'],

  css: ['~/assets/css/main.css'],

  // Les fichiers .ts des dossiers de composants (index des composants shadcn-vue)
  // ne doivent pas être enregistrés comme composants.
  components: {
    dirs: [{ path: '~/components', extensions: ['.vue'], pathPrefix: false }],
  },

  app: {
    head: {
      htmlAttrs: { lang: 'fr' },
      title: 'Oh My Desk',
      meta: [
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        { name: 'description', content: 'Crée, personnalise et partage ton setup de bureau en 3D isométrique.' },
      ],
      link: [
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
        {
          rel: 'stylesheet',
          href: 'https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,500;12..96,700;12..96,800&family=Inter:wght@400;500;600;700&display=swap',
        },
      ],
    },
  },

  runtimeConfig: {
    public: {
      siteUrl: 'http://localhost:3000',
      // Origines autorisées à piloter le viewer embarqué via postMessage (séparées par des virgules).
      // Surcharge : NUXT_PUBLIC_EMBED_ALLOWED_ORIGINS="https://monsite.fr,https://blog.monsite.fr"
      embedAllowedOrigins: '',
    },
  },

  routeRules: {
    // Le viewer embarqué est le seul à pouvoir être affiché dans une iframe tierce.
    '/embed/**': {
      headers: { 'Content-Security-Policy': 'frame-ancestors *' },
    },
    '/editor/**': {
      ssr: false,
      headers: { 'Content-Security-Policy': "frame-ancestors 'self'", 'X-Frame-Options': 'SAMEORIGIN' },
    },
    '/setup/**': {
      headers: { 'Content-Security-Policy': "frame-ancestors 'self'", 'X-Frame-Options': 'SAMEORIGIN' },
    },
  },

  nitro: {
    // Stockage provisoire des setups (étape 1). Remplacé par Neon + Drizzle à l'étape 2.
    storage: {
      setups: { driver: 'memory' },
    },
    devStorage: {
      setups: { driver: 'fs', base: './.data/setups' },
    },
  },

  vite: {
    plugins: [tailwindcss()],
    optimizeDeps: {
      include: ['three'],
    },
  },

  typescript: {
    strict: true,
  },
})
