import { asc } from 'drizzle-orm'
import type { CatalogCategory } from '#shared/catalog/types'
import { schema, useDb } from '../db/client'

/** Catalogue servi depuis Neon (tables catalog_category / catalog_item, remplies par `npm run db:seed`). */
export default defineEventHandler(async (event) => {
  const db = useDb()
  const [categories, items] = await Promise.all([
    db.select().from(schema.catalogCategory).orderBy(asc(schema.catalogCategory.name)),
    db.select().from(schema.catalogItem).orderBy(asc(schema.catalogItem.name)),
  ])
  setHeader(event, 'Cache-Control', 'public, max-age=300, stale-while-revalidate=3600')
  return {
    categories: categories.map((c) => ({ slug: c.slug, name: c.name, description: c.description }) as CatalogCategory),
    items: items.map((i) => ({ ...i.metadata, thumbnailUrl: i.thumbnailUrl ?? i.metadata.thumbnailUrl })),
  }
})
