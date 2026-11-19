import { z } from 'zod'
import type { Avatar } from '../avatar/schema'
import type { SceneData, SetupSummary } from './scene'

/** Identifiants réservés : ils servent de routes ou prêteraient à confusion. */
export const RESERVED_USERNAMES = new Set(['me', 'moi', 'admin', 'api', 'settings', 'parametres', 'ohmydesk', 'support', 'aide'])

export const USERNAME_MIN = 3
export const USERNAME_MAX = 30
export const BIO_MAX = 240

export const usernameSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(USERNAME_MIN, `Au moins ${USERNAME_MIN} caractères.`)
  .max(USERNAME_MAX, `${USERNAME_MAX} caractères au maximum.`)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Lettres minuscules, chiffres et tirets uniquement (pas de tiret au début ni à la fin).')
  .refine((u) => !RESERVED_USERNAMES.has(u), 'Cet identifiant est réservé.')

export const profileUpdateSchema = z.object({
  name: z.string().trim().min(1, 'Indique un nom.').max(60, '60 caractères au maximum.').optional(),
  username: usernameSchema.optional(),
  bio: z.string().trim().max(BIO_MAX, `${BIO_MAX} caractères au maximum.`).optional(),
})
export type ProfileUpdate = z.infer<typeof profileUpdateSchema>

export const gallerySorts = ['recent', 'popular'] as const
export type GallerySort = (typeof gallerySorts)[number]

/**
 * Setup d'une carte de galerie. La scène n'est envoyée que si le setup n'a pas encore d'aperçu PNG :
 * elle sert alors au rendu SVG de repli.
 */
export interface GallerySetup extends SetupSummary {
  objectCount: number
  scene: SceneData | null
}

export interface GalleryPage {
  items: GallerySetup[]
  page: number
  hasMore: boolean
}

export interface PublicProfile {
  name: string
  username: string
  bio: string
  image: string | null
  joinedAt: string
  setupCount: number
  likesReceived: number
  setups: GallerySetup[]
}

export interface OwnProfile {
  name: string
  username: string
  bio: string
  /** Avatar 3D ; null tant que la personne ne l'a pas créé. */
  avatar: Avatar | null
}

export interface LikeState {
  liked: boolean
  likeCount: number
}
