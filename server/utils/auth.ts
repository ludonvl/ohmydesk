import { drizzleAdapter } from '@better-auth/drizzle-adapter'
import { betterAuth } from 'better-auth'
import { APIError, createAuthMiddleware } from 'better-auth/api'
import type { H3Event } from 'h3'
import { schema, useDb } from '../db/client'
import type { MailResult } from './email'
import {
  changeEmailApprovalEmail,
  newEmailVerificationEmail,
  passwordChangedEmail,
  passwordResetDoneEmail,
  resetPasswordEmail,
  sendMail,
  verificationEmail,
} from './email'

const https = (host?: string) => (host ? `https://${host}` : undefined)

const pathOf = (request?: Request) => (request ? new URL(request.url).pathname : '')

/**
 * Remonte un échec d'envoi à l'interface, uniquement là où cela ne révèle pas l'existence d'un compte
 * (renvoi de confirmation demandé explicitement, changement d'email par un utilisateur connecté).
 */
function failLoudly(result: MailResult) {
  if (result.status !== 'failed') return
  throw new APIError('BAD_GATEWAY', {
    message: import.meta.dev ? `Resend a refusé l’envoi : ${result.reason}` : 'L’email n’a pas pu être envoyé. Réessaie dans quelques minutes.',
  })
}

function createAuth() {
  // Sur Vercel, les déploiements de prévisualisation ont leur propre URL.
  const baseURL = process.env.BETTER_AUTH_URL ?? https(process.env.VERCEL_URL)
  const appURL = baseURL ?? 'http://localhost:3000'
  const forgotPasswordURL = `${appURL}/forgot-password`
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
      // Mot de passe oublié. Pas d'erreur remontée : la réponse doit rester identique que le compte existe ou non.
      resetPasswordTokenExpiresIn: 60 * 60,
      revokeSessionsOnPasswordReset: true,
      sendResetPassword: async ({ user, url }) => {
        await sendMail({ to: user.email, ...resetPasswordEmail(user.name, url) })
      },
      onPasswordReset: async ({ user }) => {
        await sendMail({ to: user.email, ...passwordResetDoneEmail(user.name, forgotPasswordURL) })
      },
    },

    emailVerification: {
      sendOnSignUp: true,
      autoSignInAfterVerification: true,
      expiresIn: 60 * 60,
      // Les envois sont attendus (pas de « fire and forget ») : sur Vercel, une promesse non attendue peut être
      // coupée à la fin de la requête.
      sendVerificationEmail: async ({ user, url }, request) => {
        // Un compte déjà vérifié qui reçoit ce lien est en train de changer d'adresse :
        // Better Auth l'envoie alors à la nouvelle adresse (user.email).
        const mail = user.emailVerified ? newEmailVerificationEmail(user.name, url) : verificationEmail(user.name, url)
        const result = await sendMail({ to: user.email, ...mail })
        const path = pathOf(request)
        if (path.endsWith('/send-verification-email') || path.endsWith('/change-email')) failLoudly(result)
      },
    },

    user: {
      changeEmail: {
        enabled: true,
        // Sécurité : le changement doit d'abord être approuvé depuis l'adresse actuelle,
        // puis la nouvelle adresse est confirmée par un second lien.
        sendChangeEmailConfirmation: async ({ user, newEmail, url }) => {
          failLoudly(await sendMail({ to: user.email, ...changeEmailApprovalEmail(user.name, newEmail, url) }))
        },
      },
    },

    hooks: {
      // Prévient par email après un changement de mot de passe depuis les paramètres.
      after: createAuthMiddleware(async (ctx) => {
        if (ctx.path !== '/change-password') return
        const returned = ctx.context.returned
        if (!returned || returned instanceof APIError) return
        const user = (returned as { user?: { email?: string; name?: string } }).user
        if (!user?.email) return
        await sendMail({ to: user.email, ...passwordChangedEmail(user.name ?? '', forgotPasswordURL) })
      }),
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
        '/change-email': { window: 60 * 60, max: 5 },
        '/change-password': { window: 15 * 60, max: 5 },
        '/request-password-reset': { window: 15 * 60, max: 3 },
        '/reset-password': { window: 15 * 60, max: 5 },
        '/get-session': false,
      },
    },

    // Connexion Google. Si un compte email existe déjà avec la même adresse, Better Auth l'associe
    // automatiquement (liaison de comptes activée par défaut, Google certifiant que l'email est vérifié).
    socialProviders: googleEnabled
      ? {
          google: {
            clientId: process.env.GOOGLE_CLIENT_ID as string,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
            // Toujours proposer le choix du compte (utile avec plusieurs comptes Google).
            prompt: 'select_account',
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
