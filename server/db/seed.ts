/**
 * Remplit le catalogue et crée les setups de démonstration.
 * Idempotent : peut être relancé sans dupliquer les données.
 *   npm run db:seed
 */
import { neon } from '@neondatabase/serverless'
import { eq } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/neon-http'
import { catalogCategories, catalogItems } from '../../shared/catalog/items'
import type { RoomThemeId } from '../../shared/types/scene'
import { createDefaultScene } from '../../shared/utils/defaultScene'
import { createId } from '../../shared/utils/ids'
import * as schema from './schema'

const url = process.env.DATABASE_URL
if (!url) {
  console.error('DATABASE_URL manquant (.env)')
  process.exit(1)
}
const db = drizzle(neon(url), { schema })

const DEMO_USERS = [
  {
    id: 'user_demo_camille',
    name: 'Camille',
    email: 'camille@demo.ohmydesk.invalid',
    username: 'camille',
    bio: 'Illustratrice. Bois clair, plantes vertes et une tasse toujours à portée de main.',
  },
  {
    id: 'user_demo_nox',
    name: 'Nox',
    email: 'nox@demo.ohmydesk.invalid',
    username: 'nox',
    bio: 'Dev le jour, joueur la nuit. Plus il y a de néons, mieux c’est.',
  },
]

const DEMO_SETUPS: { slug: string; name: string; description: string; theme: RoomThemeId; userId: string }[] = [
  {
    slug: 'bureau-du-dimanche',
    name: 'Bureau du dimanche',
    description: 'Bois clair, vert sauge et une lampe qui ne s’éteint jamais. Un coin pour dessiner et coder au calme.',
    theme: 'scandi',
    userId: 'user_demo_camille',
  },
  {
    slug: 'station-de-nuit',
    name: 'Station de nuit',
    description: 'Néons roses, écran bleu et tour qui brille : le setup des longues sessions.',
    theme: 'neon',
    userId: 'user_demo_nox',
  },
]

async function main() {
  console.log('→ Catégories')
  for (const c of catalogCategories) {
    await db
      .insert(schema.catalogCategory)
      .values({ id: c.slug, name: c.name, slug: c.slug, description: c.description })
      .onConflictDoUpdate({ target: schema.catalogCategory.id, set: { name: c.name, description: c.description } })
  }

  console.log('→ Objets du catalogue')
  for (const item of catalogItems) {
    const values = {
      id: item.id,
      name: item.name,
      slug: item.slug,
      categoryId: item.category,
      description: item.description,
      modelUrl: item.glb?.path ?? (item.model.type === 'gltf' ? item.model.url : null),
      thumbnailUrl: item.thumbnailUrl ?? null,
      defaultProperties: {
        scale: item.defaultScale,
        colors: Object.fromEntries(item.materials.map((m) => [m.slot, m.default])),
      },
      metadata: item,
    }
    await db
      .insert(schema.catalogItem)
      .values(values)
      .onConflictDoUpdate({ target: schema.catalogItem.id, set: { ...values, id: undefined } })
  }

  console.log('→ Comptes de démonstration (sans mot de passe, connexion impossible)')
  for (const u of DEMO_USERS) {
    await db
      .insert(schema.user)
      .values({ ...u, emailVerified: true })
      .onConflictDoUpdate({ target: schema.user.id, set: { username: u.username, bio: u.bio } })
  }

  console.log('→ Setups de démonstration')
  for (const demo of DEMO_SETUPS) {
    const existing = await db.select({ id: schema.setup.id }).from(schema.setup).where(eq(schema.setup.slug, demo.slug)).limit(1)
    if (existing.length) {
      console.log(`  · ${demo.slug} existe déjà`)
      continue
    }
    const id = createId('s_')
    const now = new Date()
    await db.batch([
      db.insert(schema.setup).values({
        id,
        userId: demo.userId,
        name: demo.name,
        slug: demo.slug,
        description: demo.description,
        isPublic: true,
        publishedAt: now,
        currentVersion: 1,
      }),
      db.insert(schema.setupVersion).values({ id: createId('v_'), setupId: id, version: 1, sceneData: createDefaultScene(demo.theme) }),
    ])
    console.log(`  · ${demo.slug} créé`)
  }

  console.log('✓ Terminé')
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
