import { requireUser } from '../../utils/auth'
import { listSetupsByUser } from '../../utils/setups'

/** Setups de l'utilisateur connecté (tableau de bord). */
export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  return listSetupsByUser(user.id)
})
