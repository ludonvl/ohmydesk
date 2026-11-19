import { moderateSchema } from '#shared/types/moderation'
import { moderateSetup, requireAdmin } from '../../../../utils/moderation'

/** Masquer (auteur prévenu par email), rétablir, ou classer les signalements sans suite. */
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const { action, reason } = await readValidatedBody(event, (b) => moderateSchema.parse(b))
  await moderateSetup(getRouterParam(event, 'id') ?? '', action, reason)
  return { ok: true }
})
