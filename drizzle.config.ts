import { defineConfig } from 'drizzle-kit'

// drizzle-kit ne lit pas .env tout seul.
try {
  process.loadEnvFile('.env')
} catch {
  // Pas de .env (CI, Vercel) : les variables viennent de l'environnement.
}

export default defineConfig({
  schema: './server/db/schema.ts',
  out: './server/db/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL ?? '',
  },
  strict: true,
  verbose: true,
})
