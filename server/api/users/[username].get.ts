import { getPublicProfile } from '../../utils/social'

/** Profil public : nom, bio, statistiques et setups publics. */
export default defineEventHandler(async (event) => {
  const username = getRouterParam(event, 'username')?.toLowerCase()
  const profile = username ? await getPublicProfile(username) : null
  if (!profile) throw createError({ statusCode: 404, statusMessage: 'Profil introuvable' })
  setHeader(event, 'Cache-Control', 'public, max-age=30, stale-while-revalidate=300')
  return profile
})
