import { authClient } from '~/lib/auth-client'

/** Pages de connexion / inscription : inutiles si on est déjà connecté. */
export default defineNuxtRouteMiddleware(async (to) => {
  const { data: session } = await authClient.useSession(useFetch)
  if (session.value) {
    const redirect = typeof to.query.redirect === 'string' && to.query.redirect.startsWith('/') ? to.query.redirect : '/dashboard'
    return navigateTo(redirect)
  }
})
