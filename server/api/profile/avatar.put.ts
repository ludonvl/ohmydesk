import { avatarSchema } from '#shared/avatar/schema'
import { requireUser } from '../../utils/auth'
import { getOwnProfile, updateOwnAvatar } from '../../utils/social'

/** Enregistre l'avatar 3D de la personne connectée (repris dans tous ses setups). */
export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const result = avatarSchema.safeParse(await readBody(event))
  if (!result.success) throw createError({ statusCode: 400, statusMessage: 'Avatar invalide' })
  await updateOwnAvatar(user.id, result.data)
  setHeader(event, 'Cache-Control', 'private, no-store')
  return getOwnProfile(user.id, user.name)
})
