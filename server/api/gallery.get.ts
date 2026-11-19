import { z } from 'zod'
import { gallerySorts } from '#shared/types/social'
import { listGallery } from '../utils/social'

const querySchema = z.object({
  sort: z.enum(gallerySorts).catch('recent'),
  page: z.coerce.number().int().min(1).max(200).catch(1),
  limit: z.coerce.number().int().min(1).max(24).catch(24),
})

/**
 * Galerie publique. Réponse identique pour tout le monde (cache CDN) :
 * les likes de la personne connectée sont lus à part (/api/me/likes).
 */
export default defineEventHandler(async (event) => {
  const { sort, page, limit } = querySchema.parse(getQuery(event))
  setHeader(event, 'Cache-Control', 'public, max-age=30, stale-while-revalidate=300')
  return listGallery(sort, page, limit)
})
