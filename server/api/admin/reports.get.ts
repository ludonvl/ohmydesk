import { z } from 'zod'
import { listModeration, requireAdmin } from '../../utils/moderation'

const querySchema = z.object({ filter: z.enum(['open', 'hidden']).catch('open') })

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  setHeader(event, 'Cache-Control', 'private, no-store')
  return listModeration(querySchema.parse(getQuery(event)).filter)
})
