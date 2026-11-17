import { requireUser } from '../../utils/auth'
import { requireOwnedSetup, toPublic } from '../../utils/setups'

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  return toPublic(await requireOwnedSetup(getRouterParam(event, 'id'), user.id))
})
