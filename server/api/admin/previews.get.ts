import { listMissingPreviews, requireAdmin } from '../../utils/moderation'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  setHeader(event, 'Cache-Control', 'private, no-store')
  return listMissingPreviews()
})
