import { and, eq, isNull, lt, or, sql } from 'drizzle-orm'
import { PRESENCE_TTL_MS } from '#shared/types/presence'
import { schema, useDb } from '../db/client'

const { user } = schema

/** Écart minimal entre deux écritures du battement de cœur (les onglets battent toutes les 45 s). */
const WRITE_THROTTLE_MS = 30_000

/** `updatedAt` du compte ne doit pas bouger à chaque battement : on le réécrit à l'identique. */
const keepUpdatedAt = { updatedAt: sql`${user.updatedAt}` }

/**
 * Battement de cœur d'un onglet ouvert. N'écrit rien si la personne n'a pas activé sa présence publique,
 * ni si le dernier battement date de moins de 30 s (une écriture par minute au plus par personne).
 */
export async function touchPresence(userId: string): Promise<void> {
  const threshold = new Date(Date.now() - WRITE_THROTTLE_MS)
  await useDb()
    .update(user)
    .set({ lastSeenAt: new Date(), ...keepUpdatedAt })
    .where(and(eq(user.id, userId), eq(user.showPresence, true), or(isNull(user.lastSeenAt), lt(user.lastSeenAt, threshold))))
}

/** Hors ligne immédiatement (déconnexion). */
export async function clearPresence(userId: string): Promise<void> {
  await useDb().update(user).set({ lastSeenAt: null, ...keepUpdatedAt }).where(eq(user.id, userId))
}

export async function setShowPresence(userId: string, show: boolean): Promise<void> {
  await useDb()
    .update(user)
    .set({ showPresence: show, lastSeenAt: show ? new Date() : null, ...keepUpdatedAt })
    .where(eq(user.id, userId))
}

/** En ligne = présence publique activée et battement de moins de 90 s. Inconnu ou masqué = hors ligne. */
export async function isOnline(username: string): Promise<boolean> {
  const [row] = await useDb()
    .select({ show: user.showPresence, lastSeenAt: user.lastSeenAt })
    .from(user)
    .where(eq(user.username, username.toLowerCase()))
    .limit(1)
  return !!row?.show && !!row.lastSeenAt && Date.now() - row.lastSeenAt.getTime() < PRESENCE_TTL_MS
}
