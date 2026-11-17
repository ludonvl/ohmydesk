import { authClient } from '~/lib/auth-client'

/** Pages réservées aux personnes connectées : redirige vers /login en gardant la destination. */
export default defineNuxtRouteMiddleware(async (to) => {
  const { data: session } = await authClient.useSession(useFetch)
  if (!session.value) {
    return navigateTo({ path: '/login', query: { redirect: to.fullPath } })
  }
})
