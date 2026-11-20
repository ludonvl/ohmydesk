import { getSessionUser } from '../../utils/auth'
import { touchPresence } from '../../utils/presence'

/** Battement de cœur d'un onglet ouvert. Sans session, on ne fait rien (pas d'erreur bruyante). */
export default defineEventHandler(async (event) => {
  const user = await getSessionUser(event)
  if (user) await touchPresence(user.id)
  setResponseStatus(event, 204)
  return null
})
