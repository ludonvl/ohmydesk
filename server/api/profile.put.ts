import { profileUpdateSchema } from '#shared/types/social'
import { requireUser } from '../utils/auth'
import { getOwnProfile, updateOwnProfile } from '../utils/social'

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const result = profileUpdateSchema.safeParse(await readBody(event))
  if (!result.success) {
    const issue = result.error.issues[0]
    throw createError({ statusCode: 400, statusMessage: issue?.message ?? 'Profil invalide', data: { field: issue?.path[0] } })
  }
  await updateOwnProfile(user.id, result.data)
  return getOwnProfile(user.id, result.data.name ?? user.name)
})
