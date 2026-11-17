import { setupUpdateSchema } from '#shared/types/scene'
import { requireUser } from '../../utils/auth'
import { requireOwnedSetup, toPublic, updateSetup } from '../../utils/setups'

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const current = await requireOwnedSetup(getRouterParam(event, 'id'), user.id)
  const patch = await readValidatedBody(event, (b) => setupUpdateSchema.parse(b))
  return toPublic(await updateSetup(current, patch))
})
