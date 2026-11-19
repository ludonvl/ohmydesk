/** Espace de modération : réservé aux adresses de ADMIN_EMAILS, sinon page introuvable. */
export default defineNuxtRouteMiddleware(async () => {
  const { admin } = await useRequestFetch()<{ admin: boolean }>('/api/admin/status').catch(() => ({ admin: false }))
  if (!admin) return abortNavigation(createError({ statusCode: 404, statusMessage: 'Page introuvable', fatal: true }))
})
