import { reportCreateSchema } from '#shared/types/moderation'
import { requireUser } from '../../../utils/auth'
import { createReport } from '../../../utils/moderation'

/** Signaler un setup public (connexion requise, un signalement par personne). */
export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const input = await readValidatedBody(event, (b) => reportCreateSchema.parse(b))
  await createReport(getRouterParam(event, 'id') ?? '', user, input)
  setResponseStatus(event, 201)
  return { reported: true }
})
