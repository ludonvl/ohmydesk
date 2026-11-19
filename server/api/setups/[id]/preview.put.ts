import { requireUser } from '../../../utils/auth'
import { readPngBody } from '../../../utils/png'
import { replacePreview, requireOwnedSetup } from '../../../utils/setups'

/** Reçoit l'aperçu PNG généré par l'éditeur (`engine.capture()`), corps brut `image/png`. */
export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const record = await requireOwnedSetup(getRouterParam(event, 'id'), user.id)
  return { previewUrl: await replacePreview(record, await readPngBody(event)) }
})
