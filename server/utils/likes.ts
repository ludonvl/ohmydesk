import type { H3Event } from 'h3'
import type { LikeState } from '#shared/types/social'
import { requireUser } from './auth'
import { getSetupById } from './setups'
import { setLike } from './social'

/** Like / unlike d'un setup public (on ne révèle pas l'existence d'un setup privé). */
export async function handleLike(event: H3Event, liked: boolean): Promise<LikeState> {
  const user = await requireUser(event)
  const id = getRouterParam(event, 'id')
  const record = id ? await getSetupById(id) : null
  if (!record || !record.isPublic || record.hidden) throw createError({ statusCode: 404, statusMessage: 'Setup introuvable' })
  return { liked, likeCount: await setLike(record.id, user.id, liked) }
}
