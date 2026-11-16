import { catalogCategories, catalogItems } from '#shared/catalog/items'

// Étape 2 : servi depuis les tables CatalogItem / CatalogCategory.
export default defineEventHandler(() => ({
  categories: catalogCategories,
  items: catalogItems,
}))
