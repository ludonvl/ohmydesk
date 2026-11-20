import { presenceSettingSchema } from '#shared/types/presence'
import { requireUser } from '../../utils/auth'
import { setShowPresence } from '../../utils/presence'
import { getOwnProfile } from '../../utils/social'

/** Active ou désactive la présence publique (avatar visible dans ses setups quand on est sur le site). */
export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const result = presenceSettingSchema.safeParse(await readBody(event))
  if (!result.success) throw createError({ statusCode: 400, statusMessage: 'Réglage invalide' })
  await setShowPresence(user.id, result.data.showPresence)
  setHeader(event, 'Cache-Control', 'private, no-store')
  return getOwnProfile(user.id, user.name)
})
