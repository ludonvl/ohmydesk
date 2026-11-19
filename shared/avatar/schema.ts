import { z } from 'zod'
import { hexColorSchema } from '../types/scene'

/**
 * Avatar d'une personne : défini une fois dans son profil, repris dans tous ses setups.
 * Figurine « jouet » articulée, construite à partir de pièces procédurales (voir `rig.ts`).
 * Stocké en JSONB dans `user.avatar`. Chaque champ a une valeur par défaut : un avatar
 * enregistré avant l'ajout d'une option reste valide.
 */

export const avatarBodyIds = ['standard', 'large', 'fin'] as const
export const avatarHairIds = ['court', 'mi-long', 'long', 'chignon', 'afro', 'rase'] as const
export const avatarTopIds = ['t-shirt', 'sweat', 'chemise', 'debardeur'] as const
export const avatarBottomIds = ['pantalon', 'short', 'jupe'] as const
export const avatarAccessoryIds = ['aucun', 'lunettes', 'casque', 'bonnet', 'casquette'] as const

export type AvatarBody = (typeof avatarBodyIds)[number]
export type AvatarHair = (typeof avatarHairIds)[number]
export type AvatarTop = (typeof avatarTopIds)[number]
export type AvatarBottom = (typeof avatarBottomIds)[number]
export type AvatarAccessory = (typeof avatarAccessoryIds)[number]

export const avatarColorSlots = ['skin', 'hair', 'top', 'bottom', 'shoes', 'accessory'] as const
export type AvatarColorSlot = (typeof avatarColorSlots)[number]

export const DEFAULT_AVATAR = {
  body: 'standard',
  hair: 'court',
  top: 't-shirt',
  bottom: 'pantalon',
  accessory: 'aucun',
  colors: {
    skin: '#E0A57F',
    hair: '#5A3A26',
    top: '#FF6B35',
    bottom: '#2E2C3D',
    shoes: '#F5F2EC',
    accessory: '#2E2C3D',
  },
} as const satisfies {
  body: AvatarBody
  hair: AvatarHair
  top: AvatarTop
  bottom: AvatarBottom
  accessory: AvatarAccessory
  colors: Record<AvatarColorSlot, string>
}

/** Schéma strict, pour l'écriture (API). */
export const avatarSchema = z
  .object({
    body: z.enum(avatarBodyIds),
    hair: z.enum(avatarHairIds),
    top: z.enum(avatarTopIds),
    bottom: z.enum(avatarBottomIds),
    accessory: z.enum(avatarAccessoryIds),
    colors: z.object(Object.fromEntries(avatarColorSlots.map((s) => [s, hexColorSchema])) as Record<AvatarColorSlot, typeof hexColorSchema>).strict(),
  })
  .strict()
export type Avatar = z.infer<typeof avatarSchema>

/** Schéma tolérant, pour la lecture (JSONB en base) : une valeur inconnue retombe sur la valeur par défaut. */
const lenientAvatarSchema = z.object({
  body: z.enum(avatarBodyIds).catch(DEFAULT_AVATAR.body),
  hair: z.enum(avatarHairIds).catch(DEFAULT_AVATAR.hair),
  top: z.enum(avatarTopIds).catch(DEFAULT_AVATAR.top),
  bottom: z.enum(avatarBottomIds).catch(DEFAULT_AVATAR.bottom),
  accessory: z.enum(avatarAccessoryIds).catch(DEFAULT_AVATAR.accessory),
  colors: z
    .object(
      Object.fromEntries(avatarColorSlots.map((s) => [s, hexColorSchema.catch(DEFAULT_AVATAR.colors[s])])) as Record<AvatarColorSlot, z.ZodCatch<typeof hexColorSchema>>,
    )
    .catch({ ...DEFAULT_AVATAR.colors }),
})

export function parseAvatar(value: unknown): Avatar | null {
  if (!value || typeof value !== 'object') return null
  const result = lenientAvatarSchema.safeParse(value)
  return result.success ? result.data : null
}

export function defaultAvatar(): Avatar {
  return { ...DEFAULT_AVATAR, colors: { ...DEFAULT_AVATAR.colors } }
}

/* ------------------------------------------------------------------ */
/* Libellés et palettes de l'éditeur d'avatar                          */
/* ------------------------------------------------------------------ */

type Option<T extends string> = { id: T; label: string }

export const AVATAR_AXES = [
  {
    id: 'body',
    label: 'Silhouette',
    values: [
      { id: 'standard', label: 'Standard' },
      { id: 'large', label: 'Carrure' },
      { id: 'fin', label: 'Fine' },
    ] satisfies Option<AvatarBody>[],
  },
  {
    id: 'hair',
    label: 'Cheveux',
    values: [
      { id: 'court', label: 'Courts' },
      { id: 'mi-long', label: 'Mi-longs' },
      { id: 'long', label: 'Longs' },
      { id: 'chignon', label: 'Chignon' },
      { id: 'afro', label: 'Afro' },
      { id: 'rase', label: 'Rasés' },
    ] satisfies Option<AvatarHair>[],
  },
  {
    id: 'top',
    label: 'Haut',
    values: [
      { id: 't-shirt', label: 'T-shirt' },
      { id: 'sweat', label: 'Sweat' },
      { id: 'chemise', label: 'Chemise' },
      { id: 'debardeur', label: 'Débardeur' },
    ] satisfies Option<AvatarTop>[],
  },
  {
    id: 'bottom',
    label: 'Bas',
    values: [
      { id: 'pantalon', label: 'Pantalon' },
      { id: 'short', label: 'Short' },
      { id: 'jupe', label: 'Jupe' },
    ] satisfies Option<AvatarBottom>[],
  },
  {
    id: 'accessory',
    label: 'Accessoire',
    values: [
      { id: 'aucun', label: 'Aucun' },
      { id: 'lunettes', label: 'Lunettes' },
      { id: 'casque', label: 'Casque audio' },
      { id: 'bonnet', label: 'Bonnet' },
      { id: 'casquette', label: 'Casquette' },
    ] satisfies Option<AvatarAccessory>[],
  },
] as const

export const AVATAR_COLOR_LABELS: Record<AvatarColorSlot, string> = {
  skin: 'Peau',
  hair: 'Cheveux',
  top: 'Haut',
  bottom: 'Bas',
  shoes: 'Chaussures',
  accessory: 'Accessoire',
}

export const SKIN_PALETTE = [
  { hex: '#F6D7C3', name: 'Porcelaine' },
  { hex: '#EEC1A2', name: 'Pêche' },
  { hex: '#E0A57F', name: 'Sable' },
  { hex: '#C68863', name: 'Caramel' },
  { hex: '#A86B4A', name: 'Cannelle' },
  { hex: '#8A5236', name: 'Noisette' },
  { hex: '#6B3E28', name: 'Cacao' },
  { hex: '#4A2A1C', name: 'Ébène' },
] as const

export const HAIR_PALETTE = [
  { hex: '#231C19', name: 'Noir' },
  { hex: '#5A3A26', name: 'Châtain' },
  { hex: '#8B5A34', name: 'Brun clair' },
  { hex: '#C0612F', name: 'Roux' },
  { hex: '#E8C77E', name: 'Blond' },
  { hex: '#D9D4CC', name: 'Gris' },
  { hex: '#A497FF', name: 'Lavande' },
  { hex: '#FF4FD8', name: 'Rose néon' },
] as const
