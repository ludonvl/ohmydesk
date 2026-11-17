import { getSetupBySlug, toPublic } from '../../../utils/setups'

export default defineEventHandler(async (event) => {
  const slug = getRouterParam(event, 'slug')
  const setup = slug ? await getSetupBySlug(slug) : null
  if (!setup || !setup.isPublic) throw createError({ statusCode: 404, statusMessage: 'Setup introuvable' })
  setHeader(event, 'Cache-Control', 'public, max-age=60, stale-while-revalidate=300')
  return toPublic(setup)
})
