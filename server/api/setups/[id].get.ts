import { getSetupById } from '../../utils/setups'

// TODO étape 2 : réservé au propriétaire (Better Auth).
export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  const setup = id ? await getSetupById(id) : null
  if (!setup) throw createError({ statusCode: 404, statusMessage: 'Setup introuvable' })
  return setup
})
