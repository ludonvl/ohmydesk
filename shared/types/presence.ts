import { z } from 'zod'

/** Battement de cœur d'un onglet ouvert et visible. */
export const PRESENCE_HEARTBEAT_MS = 45_000
/** Sans battement depuis ce délai, la personne est considérée hors ligne. */
export const PRESENCE_TTL_MS = 90_000
/** Fréquence à laquelle un visiteur revérifie la présence de l'auteur. */
export const PRESENCE_POLL_MS = 30_000

export interface PresenceState {
  online: boolean
}

export const presenceSettingSchema = z.object({ showPresence: z.boolean() })
