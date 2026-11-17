import { drizzleAdapter } from '@better-auth/drizzle-adapter'
import { betterAuth } from 'better-auth'
import type { H3Event } from 'h3'
import { schema, useDb } from '../db/client'
import { sendMail, verificationEmail } from './email'

const https = (host?: string) => (host ? `https://${host}` : undefined)

function createAuth() {
  // Sur Vercel, les déploiements de prévisualisation ont leur propre URL.
  const baseURL = process.env.BETTER_AUTH_URL ?? https(process.env.VERCEL_URL)
  const trustedOrigins = [
    process.env.BETTER_AUTH_URL,
    https(process.env.VERCEL_URL),
    https(process.env.VERCEL_BRANCH_URL),
    https(process.env.VERCEL_PROJECT_PRODUCTION_URL),
  ].filter((o): o is string => Boolean(o))

  const googleEnabled = Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET)

  return betterAuth({
    baseURL,
    trustedOrigins,
    database: drizzleAdapter(useDb(), {
      provider: 'pg',
      schema: {
        user: schema.user,
        session: schema.session,
        account: schema.account,
        verification: schema.verification,
        rateLimit: schema.rateLimit,
      },
    }),
    emailAndPassword: {
      enabled: true,
      minPasswordLength: 8,
      // Pas de session tant que l'email n'est pas confirmé : un bot sans boîte mail réelle ne peut rien faire.
      requireEmailVerification: true,
    },
    emailVerification: {
      sendOnSignUp: true,
      autoSignInAfterVerification: true,
      expiresIn: 60 * 60,
      // L'envoi est attendu (pas de « fire and forget ») : sur Vercel, une promesse non attendue peut être
      // coupée à la fin de la requête. L'inscription répond déjà « compte existant » de façon explicite,
      // l'attente n'apporte donc pas d'information supplémentaire sur l'existence d'un compte.
      sendVerificationEmail: async ({ user, url }) => {
        const mail = verificationEmail(user.name, url)
        await sendMail({ to: user.email, ...mail })
      },
    },
    // Anti-abus : limites stockées en base pour être partagées entre instances serverless.
    rateLimit: {
      storage: 'database',
      window: 60,
      max: 60,
      customRules: {
        '/sign-up/email': { window: 60 * 60, max: 5 },
        '/sign-in/email': { window: 60, max: 5 },
        '/send-verification-email': { window: 5 * 60, max: 3 },
        '/get-session': false,
      },
    },
    // OAuth Google prêt : il suffit de renseigner GOOGLE_CLIENT_ID et GOOGLE_CLIENT_SECRET.
    socialProviders: googleEnabled
      ? {
          google: {
            clientId: process.env.GOOGLE_CLIENT_ID as string,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
          },
        }
      : {},
    session: {
      expiresIn: 60 * 60 * 24 * 30,
      updateAge: 60 * 60 * 24,
    },
  })
}

let auth: ReturnType<typeof createAuth> | null = null

/** Instance Better Auth (créée à la première requête). */
export function useAuth() {
  if (!auth) auth = createAuth()
  return auth
}

export async function getSessionUser(event: H3Event) {
  const session = await useAuth().api.getSession({ headers: event.headers })
  return session?.user ?? null
}

/** Utilisateur connecté, sinon 401. */
export async function requireUser(event: H3Event) {
  const user = await getSessionUser(event)
  if (!user) throw createError({ statusCode: 401, statusMessage: 'Connexion requise' })
  return user
}
