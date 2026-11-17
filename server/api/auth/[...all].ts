import { useAuth } from '../../utils/auth'

// Toutes les routes Better Auth : /api/auth/sign-in/email, /api/auth/sign-up/email, /api/auth/get-session…
export default defineEventHandler((event) => {
  return useAuth().handler(toWebRequest(event))
})
