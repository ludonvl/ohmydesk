import { requireAdmin } from '../../../../utils/moderation'
import { readPngBody } from '../../../../utils/png'
import { getSetupById, replacePreview } from '../../../../utils/setups'

/** Aperçu généré depuis l'espace de modération pour un setup public qui n'en a pas (démos…). */
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const record = await getSetupById(getRouterParam(event, 'id') ?? '')
  if (!record || !record.isPublic) throw createError({ statusCode: 404, statusMessage: 'Setup introuvable' })
  return { previewUrl: await replacePreview(record, await readPngBody(event)) }
})
