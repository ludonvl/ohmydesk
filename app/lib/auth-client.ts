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
  INVALID_TOKEN: 'Ce lien n’est pas valide ou a déjà servi. Demande un nouvel email.',
  INVALID_PASSWORD: 'Mot de passe actuel incorrect.',
  CREDENTIAL_ACCOUNT_NOT_FOUND: 'Ce compte n’a pas de mot de passe : tu te connectes avec Google.',
  EMAIL_IS_THE_SAME: 'C’est déjà l’adresse de ton compte.',
  // Connexion Google (paramètre ?error= au retour de Google)
  access_denied: 'Connexion Google annulée.',
  account_not_linked: 'Un compte existe déjà avec cette adresse. Connecte-toi avec ton mot de passe, puis associe Google depuis tes paramètres.',
  unable_to_link_account: 'Impossible d’associer ce compte Google. Réessaie depuis tes paramètres.',
  email_not_found: 'Google n’a pas transmis d’adresse email. Vérifie les autorisations accordées et réessaie.',
  email_not_verified: 'Ton adresse Google n’est pas vérifiée. Vérifie-la chez Google, ou inscris-toi avec un mot de passe.',
  state_mismatch: 'La connexion Google a expiré. Réessaie.',
  'please_restart_the_process': 'La connexion Google a expiré. Réessaie.',
  internal_server_error: 'La connexion Google n’a pas abouti. Réessaie dans quelques instants.',
  email_doesn_t_match: 'Ce compte Google utilise une autre adresse que ton compte Oh My Desk.',
  "email_doesn't_match": 'Ce compte Google utilise une autre adresse que ton compte Oh My Desk.',
  account_already_linked_to_different_user: 'Ce compte Google est déjà associé à un autre compte Oh My Desk.',
}

/** Règles communes de validation côté client. */
export const isValidEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())
export const PASSWORD_MIN = 8

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
  // Code reçu dans l'URL (?error=…) sans statut HTTP : on reste générique.
  if (!error.status && error.code) return 'La demande n’a pas abouti. Réessaie.'
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
