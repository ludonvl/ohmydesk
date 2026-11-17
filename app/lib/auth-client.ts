import { createAuthClient } from 'better-auth/vue'

/** Client Better Auth (même origine : /api/auth). */
export const authClient = createAuthClient()

const AUTH_ERRORS: Record<string, string> = {
  INVALID_EMAIL_OR_PASSWORD: 'Email ou mot de passe incorrect.',
  USER_ALREADY_EXISTS: 'Un compte existe déjà avec cet email.',
  USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL: 'Un compte existe déjà avec cet email.',
  PASSWORD_TOO_SHORT: 'Le mot de passe doit faire au moins 8 caractères.',
  PASSWORD_TOO_LONG: 'Le mot de passe est trop long.',
  INVALID_EMAIL: 'Cette adresse email n’est pas valide.',
  EMAIL_NOT_VERIFIED: 'Ton adresse email n’est pas encore confirmée. Clique sur le lien reçu par email.',
  TOKEN_EXPIRED: 'Ce lien de confirmation a expiré. Demande un nouvel email.',
  INVALID_TOKEN: 'Ce lien de confirmation n’est pas valide. Demande un nouvel email.',
}

export type AuthError = { code?: string; message?: string; status?: number }

export function isEmailNotVerified(error: AuthError | null | undefined): boolean {
  return !!error && (error.code === 'EMAIL_NOT_VERIFIED' || error.status === 403)
}

/** Message d'erreur lisible, sans jargon, à partir d'une erreur Better Auth. */
export function authErrorMessage(error: AuthError | null | undefined): string {
  if (!error) return ''
  if (error.code && AUTH_ERRORS[error.code]) return AUTH_ERRORS[error.code]!
  if (isEmailNotVerified(error)) return AUTH_ERRORS.EMAIL_NOT_VERIFIED!
  if (error.status === 429) return 'Trop de tentatives. Réessaie dans quelques minutes.'
  // Le détail technique reste dans la console du navigateur et dans le terminal du serveur.
  console.error('[auth]', error)
  if (!error.status) return 'Le serveur ne répond pas. Vérifie qu’il est bien lancé, puis réessaie.'
  if (error.status >= 500) {
    return import.meta.dev
      ? `Erreur serveur (${error.status}) : ${error.message || 'voir le terminal de npm run dev'}`
      : 'Un problème est survenu de notre côté. Réessaie dans quelques instants.'
  }
  return error.message || 'La demande n’a pas abouti. Réessaie.'
}

/** URL vers laquelle le lien de l'email renvoie, en conservant la destination finale. */
export function verificationCallbackURL(redirect: string): string {
  return `/verify-email?redirect=${encodeURIComponent(redirect)}`
}
