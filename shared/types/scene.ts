import { z } from 'zod'

/**
 * Format de scène sauvegardé (JSONB dans SetupVersion.sceneData).
 * Unités : mètres. Repère Three.js (Y vers le haut). La pièce est centrée sur l'origine :
 * x ∈ [-width/2, width/2], z ∈ [-depth/2, depth/2], sol à y = 0.
 */
export const SCENE_VERSION = 1 as const

export const hexColorSchema = z.string().regex(/^#[0-9a-fA-F]{6}$/)
export const vec3Schema = z.tuple([z.number(), z.number(), z.number()])

export const roomThemeIds = ['studio', 'neon', 'scandi'] as const
export const roomThemeSchema = z.enum(roomThemeIds)
export type RoomThemeId = z.infer<typeof roomThemeSchema>

export const finishIds = ['mat', 'satin', 'gloss'] as const
export const finishSchema = z.enum(finishIds)
export type Finish = z.infer<typeof finishSchema>

export const sceneObjectSchema = z.object({
  id: z.string().min(1).max(64),
  catalogId: z.string().min(1).max(64),
  position: vec3Schema,
  /** Rotation autour de l'axe Y, en degrés. */
  rotation: z.number().default(0),
  scale: z.number().min(0.1).max(10).default(1),
  /** Couleurs par slot de matériau (clé = slot du catalogue). */
  colors: z.record(z.string(), hexColorSchema).default({}),
  finish: finishSchema.default('satin'),
})
export type SceneObject = z.infer<typeof sceneObjectSchema>

export const roomSchema = z.object({
  width: z.number().min(1.5).max(8).default(3),
  depth: z.number().min(1.5).max(8).default(3),
  height: z.number().min(1.8).max(4).default(2.4),
  theme: roomThemeSchema.default('studio'),
  walls: z.boolean().default(true),
})
export type Room = z.infer<typeof roomSchema>

export const cameraStateSchema = z.object({
  /** Azimut en degrés (45 = vue isométrique par défaut). */
  azimuth: z.number().default(45),
  zoom: z.number().min(0.25).max(4).default(1),
})
export type CameraState = z.infer<typeof cameraStateSchema>

export const sceneDataSchema = z.object({
  version: z.literal(SCENE_VERSION),
  room: roomSchema,
  camera: cameraStateSchema.default({ azimuth: 45, zoom: 1 }),
  objects: z.array(sceneObjectSchema).max(300),
})
export type SceneData = z.infer<typeof sceneDataSchema>

/** Données d'un setup exposées par l'API. */
export interface SetupSummary {
  id: string
  name: string
  slug: string
  description: string
  isPublic: boolean
  authorName: string
  /** Identifiant du profil public de l'auteur (/u/:username). */
  authorUsername: string | null
  authorImage: string | null
  likeCount: number
  /** Masqué par la modération (visible seulement par son auteur, dans le tableau de bord). */
  hidden: boolean
  /** Aperçu PNG (URL absolue Vercel Blob, ou `/blob/…` en développement local). */
  previewUrl: string | null
  publishedAt: string | null
  createdAt: string
  updatedAt: string
}

export interface SetupWithScene extends SetupSummary {
  version: number
  scene: SceneData
}

export const setupUpdateSchema = z.object({
  name: z.string().trim().min(1).max(80).optional(),
  description: z.string().max(600).optional(),
  isPublic: z.boolean().optional(),
  scene: sceneDataSchema.optional(),
})
export type SetupUpdate = z.infer<typeof setupUpdateSchema>

export const setupCreateSchema = z.object({
  name: z.string().trim().min(1).max(80).optional(),
  template: roomThemeSchema.optional(),
  /** Remixer un setup public existant. */
  fromSlug: z.string().max(120).optional(),
})
export type SetupCreate = z.infer<typeof setupCreateSchema>
