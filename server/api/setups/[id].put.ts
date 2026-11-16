import { setupUpdateSchema } from '#shared/types/scene'
import { updateSetup } from '../../utils/setups'

// TODO étape 2 : vérifier que l'utilisateur connecté est propriétaire du setup.
export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, statusMessage: 'Identifiant manquant' })
  const patch = await readValidatedBody(event, (b) => setupUpdateSchema.parse(b))
  const setup = await updateSetup(id, patch)
  if (!setup) throw createError({ statusCode: 404, statusMessage: 'Setup introuvable' })
  return setup
})
