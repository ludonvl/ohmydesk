import { requireUser } from '../../utils/auth'
import { deleteSetup, requireOwnedSetup } from '../../utils/setups'

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const record = await requireOwnedSetup(getRouterParam(event, 'id'), user.id)
  await deleteSetup(record)
  setResponseStatus(event, 204)
  return null
})
