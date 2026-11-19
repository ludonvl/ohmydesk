import { z } from 'zod'
import type { SceneData, SetupSummary } from './scene'

export const reportReasons = ['inappropriate', 'hateful', 'spam', 'rights', 'other'] as const
export type ReportReason = (typeof reportReasons)[number]

export const REPORT_REASON_LABELS: Record<ReportReason, string> = {
  inappropriate: 'Contenu choquant, violent ou sexuel',
  hateful: 'Haine, harcèlement ou propos discriminatoires',
  spam: 'Spam ou publicité',
  rights: 'Atteinte à des droits (marque, droit d’auteur, vie privée)',
  other: 'Autre raison',
}

export const REPORT_DETAILS_MAX = 500
/** Nombre de signalements distincts à partir duquel un setup est masqué en attendant l'examen. */
export const AUTO_HIDE_THRESHOLD = 3

export const reportCreateSchema = z.object({
  reason: z.enum(reportReasons),
  details: z.string().trim().max(REPORT_DETAILS_MAX).default(''),
})
export type ReportCreate = z.infer<typeof reportCreateSchema>

export const moderationActions = ['hide', 'restore', 'dismiss'] as const
export type ModerationAction = (typeof moderationActions)[number]

export const moderateSchema = z.object({
  action: z.enum(moderationActions),
  /** Motif communiqué à l'auteur quand le setup est masqué. */
  reason: z.enum(reportReasons).optional(),
})

export interface ModerationReport {
  id: string
  reason: ReportReason
  details: string
  reporterName: string
  status: 'open' | 'dismissed' | 'actioned'
  createdAt: string
}

export interface ModerationItem {
  setup: SetupSummary
  hiddenAt: string | null
  hiddenReason: string | null
  openCount: number
  reports: ModerationReport[]
}

export interface MissingPreview {
  id: string
  name: string
  slug: string
  scene: SceneData
}
