import type { SQL } from 'drizzle-orm'
import { and, desc, eq, inArray, isNull, sql } from 'drizzle-orm'
import type { SceneData } from '#shared/types/scene'
import type { GallerySetup, GallerySort, OwnProfile, PublicProfile } from '#shared/types/social'
import { RESERVED_USERNAMES, USERNAME_MAX } from '#shared/types/social'
import { slugify } from '#shared/utils/ids'
import type { Avatar } from '#shared/avatar/schema'
import { parseAvatar } from '#shared/avatar/schema'
import { schema, useDb } from '../db/client'
import { authorColumns, toSummary } from './setups'

const { setup, setupLike, setupVersion, user } = schema

/* ------------------------------------------------------------------ */
/* Galerie                                                             */
/* ------------------------------------------------------------------ */

const cardColumns = {
  s: setup,
  author: authorColumns,
  // La scène n'est utile qu'en l'absence d'aperçu PNG (rendu SVG de repli) : on évite de la transférer sinon.
  scene: sql<SceneData | null>`case when ${setup.previewUrl} is null then ${setupVersion.sceneData} end`,
  objectCount: sql<number>`jsonb_array_length(${setupVersion.sceneData} -> 'objects')`.mapWith(Number),
}

async function listCards(where: SQL, orderBy: SQL[], limit: number, offset = 0): Promise<GallerySetup[]> {
  const rows = await useDb()
    .select(cardColumns)
    .from(setup)
    .innerJoin(user, eq(user.id, setup.userId))
    .innerJoin(setupVersion, and(eq(setupVersion.setupId, setup.id), eq(setupVersion.version, setup.currentVersion)))
    .where(where)
    .orderBy(...orderBy)
    .limit(limit)
    .offset(offset)
  return rows.map((r) => ({ ...toSummary(r.s, r.author), objectCount: r.objectCount, scene: r.scene }))
}

/** Visible publiquement : publié et non masqué par la modération. */
export const publiclyVisible = () => and(eq(setup.isPublic, true), isNull(setup.hiddenAt)) as SQL

const ORDER: Record<GallerySort, SQL[]> = {
  recent: [desc(setup.publishedAt), desc(setup.id)],
  popular: [desc(setup.likeCount), desc(setup.publishedAt), desc(setup.id)],
}

/** Setups publics, page par page. On lit un élément de plus pour savoir s'il reste une page. */
export async function listGallery(sort: GallerySort, page: number, pageSize: number) {
  const items = await listCards(publiclyVisible(), ORDER[sort], pageSize + 1, (page - 1) * pageSize)
  return { items: items.slice(0, pageSize), page, hasMore: items.length > pageSize }
}

/* ------------------------------------------------------------------ */
/* Profils                                                             */
/* ------------------------------------------------------------------ */

export async function getPublicProfile(username: string): Promise<PublicProfile | null> {
  const db = useDb()
  const [owner] = await db
    .select({ id: user.id, name: user.name, username: user.username, bio: user.bio, image: user.image, createdAt: user.createdAt })
    .from(user)
    .where(eq(user.username, username))
    .limit(1)
  if (!owner?.username) return null
  const where = and(eq(setup.userId, owner.id), publiclyVisible()) as SQL
  const [setups, [stats]] = await Promise.all([
    listCards(where, ORDER.recent, 60),
    db
      .select({ count: sql<number>`count(*)`.mapWith(Number), likes: sql<number>`coalesce(sum(${setup.likeCount}), 0)`.mapWith(Number) })
      .from(setup)
      .where(where),
  ])
  return {
    name: owner.name,
    username: owner.username,
    bio: owner.bio,
    image: owner.image,
    joinedAt: owner.createdAt.toISOString(),
    setupCount: stats?.count ?? 0,
    likesReceived: stats?.likes ?? 0,
    setups,
  }
}

async function usernameTaken(username: string, exceptUserId?: string) {
  const [row] = await useDb().select({ id: user.id }).from(user).where(eq(user.username, username)).limit(1)
  return Boolean(row && row.id !== exceptUserId)
}

/** Identifiant libre dérivé du nom : « camille », puis « camille-4821 »… */
async function generateUsername(name: string): Promise<string> {
  let base = slugify(name).slice(0, USERNAME_MAX - 5).replace(/-+$/, '')
  if (base.length < 3 || RESERVED_USERNAMES.has(base)) base = `membre${base ? `-${base}` : ''}`.slice(0, USERNAME_MAX - 5)
  if (!(await usernameTaken(base))) return base
  for (let i = 0; i < 20; i++) {
    const candidate = `${base}-${Math.floor(1000 + Math.random() * 9000)}`
    if (!(await usernameTaken(candidate))) return candidate
  }
  return `${base}-${Date.now().toString(36)}`
}

/** Attribue un identifiant public s'il manque (inscription, ou compte antérieur aux profils). */
export async function ensureUsername(userId: string, name: string): Promise<string> {
  const db = useDb()
  const [current] = await db.select({ username: user.username }).from(user).where(eq(user.id, userId)).limit(1)
  if (current?.username) return current.username
  for (let attempt = 0; attempt < 3; attempt++) {
    const username = await generateUsername(name)
    try {
      await db.update(user).set({ username }).where(eq(user.id, userId))
      return username
    } catch {
      // Course avec une autre inscription sur le même identifiant (contrainte unique) : on retente.
    }
  }
  throw createError({ statusCode: 500, statusMessage: 'Impossible d’attribuer un identifiant' })
}

export async function getOwnProfile(userId: string, name: string): Promise<OwnProfile> {
  const username = await ensureUsername(userId, name)
  const [row] = await useDb().select({ name: user.name, bio: user.bio, avatar: user.avatar3d, showPresence: user.showPresence }).from(user).where(eq(user.id, userId)).limit(1)
  return { name: row?.name ?? name, username, bio: row?.bio ?? '', avatar: parseAvatar(row?.avatar), showPresence: row?.showPresence ?? false }
}

export async function updateOwnAvatar(userId: string, avatar: Avatar): Promise<void> {
  await useDb().update(user).set({ avatar3d: avatar }).where(eq(user.id, userId))
}

export async function updateOwnProfile(userId: string, patch: { name?: string; username?: string; bio?: string }): Promise<void> {
  if (patch.username && (await usernameTaken(patch.username, userId))) {
    throw createError({ statusCode: 409, statusMessage: 'Cet identifiant est déjà pris.' })
  }
  if (patch.name === undefined && patch.username === undefined && patch.bio === undefined) return
  try {
    await useDb().update(user).set(patch).where(eq(user.id, userId))
  } catch (error) {
    if (String(error).includes('user_username_unique')) throw createError({ statusCode: 409, statusMessage: 'Cet identifiant est déjà pris.' })
    throw error
  }
}

/* ------------------------------------------------------------------ */
/* Likes                                                               */
/* ------------------------------------------------------------------ */

/** Like ou retire le like ; le compteur est recalculé dans la même transaction (toujours exact). */
export async function setLike(setupId: string, userId: string, liked: boolean): Promise<number> {
  const db = useDb()
  const write = liked
    ? db.insert(setupLike).values({ setupId, userId }).onConflictDoNothing()
    : db.delete(setupLike).where(and(eq(setupLike.setupId, setupId), eq(setupLike.userId, userId)))
  const [, updated] = await db.batch([
    write,
    db
      .update(setup)
      .set({ likeCount: sql`(select count(*)::int from ${setupLike} where ${setupLike.setupId} = ${setupId})`, updatedAt: sql`${setup.updatedAt}` })
      .where(eq(setup.id, setupId))
      .returning({ likeCount: setup.likeCount }),
  ])
  return updated[0]?.likeCount ?? 0
}

/** Parmi ces setups, ceux que l'utilisateur a likés. */
export async function likedSetupIds(userId: string, setupIds: string[]): Promise<string[]> {
  if (!setupIds.length) return []
  const rows = await useDb()
    .select({ id: setupLike.setupId })
    .from(setupLike)
    .where(and(eq(setupLike.userId, userId), inArray(setupLike.setupId, setupIds)))
  return rows.map((r) => r.id)
}
