import { z } from 'zod'
import { getSessionUser } from '../../utils/auth'
import { likedSetupIds } from '../../utils/social'

const querySchema = z.object({ ids: z.string().max(2000).default('') })

/** Parmi les setups affichés (`?ids=a,b,c`), ceux que la personne connectée a likés. Vide si non connectée. */
export default defineEventHandler(async (event) => {
  setHeader(event, 'Cache-Control', 'private, no-store')
  const user = await getSessionUser(event)
  if (!user) return { liked: [] as string[] }
  const ids = querySchema.parse(getQuery(event)).ids.split(',').map((s) => s.trim()).filter(Boolean).slice(0, 100)
  return { liked: await likedSetupIds(user.id, ids) }
})
