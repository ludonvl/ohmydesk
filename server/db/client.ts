import { neon } from '@neondatabase/serverless'
import type { NeonHttpDatabase } from 'drizzle-orm/neon-http'
import { drizzle } from 'drizzle-orm/neon-http'
import * as schema from './schema'

export type Database = NeonHttpDatabase<typeof schema>

let instance: Database | null = null

/**
 * Client Drizzle sur le driver HTTP de Neon : une requête = un appel HTTP,
 * idéal en serverless (pas de pool de connexions à gérer sur Vercel).
 * Créé à la première utilisation pour que le build ne dépende pas de DATABASE_URL.
 */
export function useDb(): Database {
  if (!instance) {
    const url = process.env.DATABASE_URL
    if (!url) throw new Error('DATABASE_URL manquant : ajoute la chaîne de connexion Neon dans .env')
    instance = drizzle(neon(url), { schema })
  }
  return instance
}

export { schema }
