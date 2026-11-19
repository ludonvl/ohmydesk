import type { SQL } from 'drizzle-orm'
import { and, desc, eq } from 'drizzle-orm'
import type { SceneData, SetupUpdate, SetupWithScene } from '#shared/types/scene'
import { createId, slugify } from '#shared/utils/ids'
import { schema, useDb } from '../db/client'
import { deleteFile, putFile } from './storage'

const { setup, setupVersion, user } = schema

/**
 * Les sauvegardes automatiques rapprochées mettent à jour la même version ;
 * une nouvelle SetupVersion est créée au-delà de cet intervalle (historique utile sans exploser la table).
 */
const VERSION_WINDOW_MS = 10 * 60 * 1000

export interface SetupRecord extends SetupWithScene {
  userId: string
}

const iso = (d: Date | null) => (d ? d.toISOString() : null)

async function findOne(where: SQL): Promise<SetupRecord | null> {
  const rows = await useDb()
    .select({ s: setup, authorName: user.name, scene: setupVersion.sceneData, version: setupVersion.version })
    .from(setup)
    .innerJoin(user, eq(user.id, setup.userId))
    .innerJoin(setupVersion, and(eq(setupVersion.setupId, setup.id), eq(setupVersion.version, setup.currentVersion)))
    .where(where)
    .limit(1)
  const row = rows[0]
  if (!row) return null
  return toRecord(row.s, row.authorName, row.scene, row.version)
}

function toRecord(s: typeof setup.$inferSelect, authorName: string, scene: SceneData, version: number): SetupRecord {
  return {
    id: s.id,
    userId: s.userId,
    name: s.name,
    slug: s.slug,
    description: s.description,
    isPublic: s.isPublic,
    authorName,
    previewUrl: s.previewUrl,
    publishedAt: iso(s.publishedAt),
    createdAt: s.createdAt.toISOString(),
    updatedAt: s.updatedAt.toISOString(),
    version,
    scene,
  }
}

/** Retire les champs internes avant d'envoyer au client. */
export function toPublic(record: SetupRecord): SetupWithScene {
  const { userId: _userId, ...rest } = record
  return rest
}

export function getSetupById(id: string) {
  return findOne(eq(setup.id, id))
}

export function getSetupBySlug(slug: string) {
  return findOne(eq(setup.slug, slug))
}

export async function listSetupsByUser(userId: string): Promise<SetupWithScene[]> {
  const rows = await useDb()
    .select({ s: setup, authorName: user.name, scene: setupVersion.sceneData, version: setupVersion.version })
    .from(setup)
    .innerJoin(user, eq(user.id, setup.userId))
    .innerJoin(setupVersion, and(eq(setupVersion.setupId, setup.id), eq(setupVersion.version, setup.currentVersion)))
    .where(eq(setup.userId, userId))
    .orderBy(desc(setup.updatedAt))
  return rows.map((r) => toPublic(toRecord(r.s, r.authorName, r.scene, r.version)))
}

async function uniqueSlug(name: string): Promise<string> {
  const base = slugify(name)
  for (let i = 0; i < 10; i++) {
    const candidate = i === 0 ? base : `${base}-${createId().slice(0, 5)}`
    const taken = await useDb().select({ id: setup.id }).from(setup).where(eq(setup.slug, candidate)).limit(1)
    if (!taken.length) return candidate
  }
  return `${base}-${createId()}`
}

export async function createSetup(input: { userId: string; name?: string; scene: SceneData }): Promise<SetupRecord> {
  const db = useDb()
  const id = createId('s_')
  const name = input.name?.trim() || 'Mon setup'
  await db.batch([
    db.insert(setup).values({ id, userId: input.userId, name, slug: await uniqueSlug(name), currentVersion: 1 }),
    db.insert(setupVersion).values({ id: createId('v_'), setupId: id, version: 1, sceneData: input.scene }),
  ])
  const created = await getSetupById(id)
  if (!created) throw createError({ statusCode: 500, statusMessage: 'Création du setup impossible' })
  return created
}

export async function updateSetup(current: SetupRecord, patch: SetupUpdate): Promise<SetupRecord> {
  const db = useDb()
  const now = new Date()
  const changes: Partial<typeof setup.$inferInsert> = { updatedAt: now }

  if (patch.name !== undefined) changes.name = patch.name
  if (patch.description !== undefined) changes.description = patch.description
  if (patch.isPublic !== undefined) {
    changes.isPublic = patch.isPublic
    if (patch.isPublic && !current.isPublic) changes.publishedAt = now
  }

  if (patch.scene) {
    const [latest] = await db
      .select({ id: setupVersion.id, createdAt: setupVersion.createdAt })
      .from(setupVersion)
      .where(and(eq(setupVersion.setupId, current.id), eq(setupVersion.version, current.version)))
      .limit(1)
    if (latest && now.getTime() - latest.createdAt.getTime() < VERSION_WINDOW_MS) {
      await db.update(setupVersion).set({ sceneData: patch.scene }).where(eq(setupVersion.id, latest.id))
    } else {
      const next = current.version + 1
      await db.insert(setupVersion).values({ id: createId('v_'), setupId: current.id, version: next, sceneData: patch.scene })
      changes.currentVersion = next
    }
  }

  await db.update(setup).set(changes).where(eq(setup.id, current.id))
  const updated = await getSetupById(current.id)
  if (!updated) throw createError({ statusCode: 404, statusMessage: 'Setup introuvable' })
  return updated
}

export async function deleteSetup(record: SetupRecord) {
  await useDb().delete(setup).where(eq(setup.id, record.id))
  await deleteFile(record.previewUrl)
}

/** Remplace l'aperçu PNG du setup (sans toucher à sa date de modification). */
export async function replacePreview(record: SetupRecord, png: Buffer): Promise<string> {
  // Nom unique à chaque aperçu : le fichier peut être mis en cache indéfiniment par le CDN.
  const file = await putFile(`previews/${record.id}/${createId()}.png`, png, {
    contentType: 'image/png',
    cacheControlMaxAge: 60 * 60 * 24 * 365,
  })
  await useDb()
    .update(setup)
    .set({ previewUrl: file.url, updatedAt: new Date(record.updatedAt) })
    .where(eq(setup.id, record.id))
  if (record.previewUrl !== file.url) await deleteFile(record.previewUrl)
  return file.url
}

/** Setup appartenant à l'utilisateur, sinon 404 (on ne révèle pas l'existence d'un setup d'autrui). */
export async function requireOwnedSetup(id: string | undefined, userId: string): Promise<SetupRecord> {
  const record = id ? await getSetupById(id) : null
  if (!record || record.userId !== userId) throw createError({ statusCode: 404, statusMessage: 'Setup introuvable' })
  return record
}
