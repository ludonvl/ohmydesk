import type { RoomThemeId, SceneData, SetupSummary, SetupUpdate, SetupWithScene } from '#shared/types/scene'
import { createDefaultScene } from '#shared/utils/defaultScene'
import { createId, slugify } from '#shared/utils/ids'

/**
 * Dépôt provisoire des setups (étape 1) basé sur le stockage Nitro
 * (fichiers dans .data/ en dev, mémoire en prod).
 * L'interface est volontairement celle du futur dépôt Drizzle/Neon : seules ces fonctions changeront.
 */
interface SetupRecord extends SetupSummary {
  userId: string | null
  version: number
  scene: SceneData
}

const storage = () => useStorage<SetupRecord | string>('setups')

const DEMO_SETUPS: { slug: string; name: string; description: string; theme: RoomThemeId; authorName: string }[] = [
  {
    slug: 'bureau-du-dimanche',
    name: 'Bureau du dimanche',
    description: 'Bois clair, vert sauge et une lampe qui ne s’éteint jamais. Un coin pour dessiner et coder au calme.',
    theme: 'scandi',
    authorName: 'Camille',
  },
  {
    slug: 'station-de-nuit',
    name: 'Station de nuit',
    description: 'Néons roses, écran bleu et tour qui brille : le setup des longues sessions.',
    theme: 'neon',
    authorName: 'Nox',
  },
]

let seeding: Promise<void> | null = null
async function ensureSeeded() {
  if (!seeding) {
    seeding = (async () => {
      const s = storage()
      if (await s.hasItem('meta:seeded')) return
      const now = new Date().toISOString()
      for (const demo of DEMO_SETUPS) {
        const record: SetupRecord = {
          id: createId('s_'),
          userId: null,
          name: demo.name,
          slug: demo.slug,
          description: demo.description,
          isPublic: true,
          authorName: demo.authorName,
          publishedAt: now,
          createdAt: now,
          updatedAt: now,
          version: 1,
          scene: createDefaultScene(demo.theme),
        }
        await s.setItem(`setup:${record.id}`, record)
        await s.setItem(`slug:${record.slug}`, record.id)
      }
      await s.setItem('meta:seeded', now)
    })()
  }
  return seeding
}

function toPublic(record: SetupRecord): SetupWithScene {
  const { userId: _userId, ...rest } = record
  return rest
}

export async function getSetupById(id: string): Promise<SetupWithScene | null> {
  await ensureSeeded()
  const record = (await storage().getItem(`setup:${id}`)) as SetupRecord | null
  return record ? toPublic(record) : null
}

export async function getSetupBySlug(slug: string): Promise<SetupWithScene | null> {
  await ensureSeeded()
  const id = (await storage().getItem(`slug:${slug}`)) as string | null
  return id ? getSetupById(id) : null
}

async function uniqueSlug(name: string): Promise<string> {
  const base = slugify(name)
  for (let i = 0; i < 20; i++) {
    const candidate = i === 0 ? base : `${base}-${createId().slice(0, 5)}`
    if (!(await storage().hasItem(`slug:${candidate}`))) return candidate
  }
  return `${base}-${createId()}`
}

export async function createSetup(input: { name?: string; scene: SceneData; authorName?: string }): Promise<SetupWithScene> {
  await ensureSeeded()
  const now = new Date().toISOString()
  const name = input.name ?? 'Mon setup'
  const record: SetupRecord = {
    id: createId('s_'),
    userId: null,
    name,
    slug: await uniqueSlug(name),
    description: '',
    isPublic: false,
    authorName: input.authorName ?? 'Anonyme',
    publishedAt: null,
    createdAt: now,
    updatedAt: now,
    version: 1,
    scene: input.scene,
  }
  await storage().setItem(`setup:${record.id}`, record)
  await storage().setItem(`slug:${record.slug}`, record.id)
  return toPublic(record)
}

export async function updateSetup(id: string, patch: SetupUpdate): Promise<SetupWithScene | null> {
  const s = storage()
  const record = (await s.getItem(`setup:${id}`)) as SetupRecord | null
  if (!record) return null
  const now = new Date().toISOString()
  if (patch.name !== undefined) record.name = patch.name
  if (patch.description !== undefined) record.description = patch.description
  if (patch.isPublic !== undefined) {
    if (patch.isPublic && !record.isPublic) record.publishedAt = now
    record.isPublic = patch.isPublic
  }
  if (patch.scene) {
    record.scene = patch.scene
    record.version += 1
  }
  record.updatedAt = now
  await s.setItem(`setup:${id}`, record)
  return toPublic(record)
}
