import { eq, inArray, sql } from 'drizzle-orm'
import { schema, useDb } from '../db/client'
import { deleteFile } from './storage'

const { setup, setupLike } = schema

export interface AccountCleanup {
  previewUrls: string[]
  likedSetupIds: string[]
}

/**
 * À lire avant la suppression du compte : les lignes disparaissent ensuite en cascade
 * (setups, versions, likes, signalements, sessions), mais pas les fichiers ni les compteurs.
 */
export async function prepareAccountDeletion(userId: string): Promise<AccountCleanup> {
  const db = useDb()
  const [previews, likes] = await Promise.all([
    db.select({ url: setup.previewUrl }).from(setup).where(eq(setup.userId, userId)),
    db.select({ setupId: setupLike.setupId }).from(setupLike).where(eq(setupLike.userId, userId)),
  ])
  return {
    previewUrls: previews.map((p) => p.url).filter((u): u is string => Boolean(u)),
    likedSetupIds: likes.map((l) => l.setupId),
  }
}

/** Après la suppression : efface les aperçus stockés et recalcule les likes des setups que la personne aimait. */
export async function finishAccountDeletion(cleanup: AccountCleanup): Promise<void> {
  await Promise.all(cleanup.previewUrls.map((url) => deleteFile(url)))
  if (cleanup.likedSetupIds.length) {
    await useDb()
      .update(setup)
      .set({
        likeCount: sql`(select count(*)::int from ${setupLike} where ${setupLike.setupId} = ${setup.id})`,
        updatedAt: sql`${setup.updatedAt}`,
      })
      .where(inArray(setup.id, cleanup.likedSetupIds))
  }
}
