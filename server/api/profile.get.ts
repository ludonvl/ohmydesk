import { requireUser } from '../utils/auth'
import { getOwnProfile } from '../utils/social'

/** Profil de la personne connectée (formulaire des paramètres, lien « Mon profil »). */
export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  setHeader(event, 'Cache-Control', 'private, no-store')
  return getOwnProfile(user.id, user.name)
})
