import { getSessionUser } from '../../utils/auth'
import { clearPresence } from '../../utils/presence'

/** Hors ligne immédiatement (appelé juste avant la déconnexion). */
export default defineEventHandler(async (event) => {
  const user = await getSessionUser(event)
  if (user) await clearPresence(user.id)
  setResponseStatus(event, 204)
  return null
})
