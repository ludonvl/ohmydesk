import { getSessionUser } from '../../utils/auth'
import { isAdmin } from '../../utils/moderation'

/** Indique au client si la personne connectée modère (lien « Modération » du menu). */
export default defineEventHandler(async (event) => {
  setHeader(event, 'Cache-Control', 'private, no-store')
  return { admin: isAdmin(await getSessionUser(event)) }
})
