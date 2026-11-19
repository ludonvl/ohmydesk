import { relations } from 'drizzle-orm'
import { bigint, boolean, index, integer, jsonb, pgTable, primaryKey, text, timestamp, uniqueIndex } from 'drizzle-orm/pg-core'
import type { Avatar } from '../../shared/avatar/schema'
import type { CatalogItem } from '../../shared/catalog/types'
import type { SceneData } from '../../shared/types/scene'

const createdAt = () => timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
const updatedAt = () =>
  timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date())

/* ------------------------------------------------------------------ */
/* Better Auth (schéma cœur). Les clés de propriété sont celles         */
/* attendues par Better Auth ; les colonnes sont en snake_case.        */
/* ------------------------------------------------------------------ */

export const user = pgTable('user', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: boolean('email_verified').notNull().default(false),
  /** « avatar » dans le modèle de données ; Better Auth l'appelle « image ». */
  image: text('avatar'),
  /**
   * Identifiant public du profil (/u/:username). Hors du schéma Better Auth : attribué juste après
   * l'inscription (hook `user.create.after`), modifiable dans les paramètres.
   */
  username: text('username').unique(),
  bio: text('bio').notNull().default(''),
  /** Avatar 3D (figurine) repris dans tous les setups de la personne ; null = pas encore créé. */
  avatar3d: jsonb('avatar_3d').$type<Avatar>(),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
})

export const session = pgTable(
  'session',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    token: text('token').notNull().unique(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    ipAddress: text('ip_address'),
    userAgent: text('user_agent'),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index('session_user_idx').on(t.userId)],
)

export const account = pgTable(
  'account',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    accountId: text('account_id').notNull(),
    providerId: text('provider_id').notNull(),
    accessToken: text('access_token'),
    refreshToken: text('refresh_token'),
    accessTokenExpiresAt: timestamp('access_token_expires_at', { withTimezone: true }),
    refreshTokenExpiresAt: timestamp('refresh_token_expires_at', { withTimezone: true }),
    scope: text('scope'),
    idToken: text('id_token'),
    password: text('password'),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index('account_user_idx').on(t.userId)],
)

export const verification = pgTable(
  'verification',
  {
    id: text('id').primaryKey(),
    identifier: text('identifier').notNull(),
    value: text('value').notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index('verification_identifier_idx').on(t.identifier)],
)

/** Limitation de débit Better Auth, partagée entre toutes les instances serverless. */
export const rateLimit = pgTable('rate_limit', {
  id: text('id').primaryKey(),
  key: text('key').notNull().unique(),
  count: integer('count').notNull(),
  lastRequest: bigint('last_request', { mode: 'number' }).notNull(),
})

/* ------------------------------------------------------------------ */
/* Domaine Oh My Desk                                                  */
/* ------------------------------------------------------------------ */

export const catalogCategory = pgTable('catalog_category', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  description: text('description').notNull().default(''),
})

export const catalogItem = pgTable(
  'catalog_item',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    slug: text('slug').notNull().unique(),
    categoryId: text('category_id')
      .notNull()
      .references(() => catalogCategory.id),
    description: text('description').notNull().default(''),
    /** URL du GLB (Vercel Blob) ; null tant que le modèle est procédural. */
    modelUrl: text('model_url'),
    thumbnailUrl: text('thumbnail_url'),
    /** Valeurs par défaut d'un objet posé : échelle, couleurs des slots… */
    defaultProperties: jsonb('default_properties').$type<Record<string, unknown>>().notNull().default({}),
    /** Définition complète (dimensions, slots de matériaux, placement, modèle procédural, tags). */
    metadata: jsonb('metadata').$type<CatalogItem>().notNull(),
    createdAt: createdAt(),
  },
  (t) => [index('catalog_item_category_idx').on(t.categoryId)],
)

export const setup = pgTable(
  'setup',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    slug: text('slug').notNull().unique(),
    description: text('description').notNull().default(''),
    isPublic: boolean('is_public').notNull().default(false),
    /** Numéro de la SetupVersion courante. */
    currentVersion: integer('current_version').notNull().default(1),
    /** Aperçu PNG de la scène (Vercel Blob), régénéré par l'éditeur après les modifications. */
    previewUrl: text('preview_url'),
    /** Nombre de likes, dénormalisé pour trier la galerie ; recalculé à chaque like / unlike. */
    likeCount: integer('like_count').notNull().default(0),
    /** Masqué par la modération : absent de la galerie et des pages publiques, même s'il est publié. */
    hiddenAt: timestamp('hidden_at', { withTimezone: true }),
    hiddenReason: text('hidden_reason'),
    publishedAt: timestamp('published_at', { withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index('setup_user_idx').on(t.userId),
    index('setup_public_idx').on(t.isPublic, t.publishedAt),
    index('setup_popular_idx').on(t.isPublic, t.likeCount),
  ],
)

/** Un like par personne et par setup (la clé primaire rend le like idempotent). */
export const setupLike = pgTable(
  'setup_like',
  {
    setupId: text('setup_id')
      .notNull()
      .references(() => setup.id, { onDelete: 'cascade' }),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    createdAt: createdAt(),
  },
  (t) => [primaryKey({ columns: [t.setupId, t.userId] }), index('setup_like_user_idx').on(t.userId)],
)

export const setupVersion = pgTable(
  'setup_version',
  {
    id: text('id').primaryKey(),
    setupId: text('setup_id')
      .notNull()
      .references(() => setup.id, { onDelete: 'cascade' }),
    version: integer('version').notNull(),
    sceneData: jsonb('scene_data').$type<SceneData>().notNull(),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex('setup_version_setup_version_uq').on(t.setupId, t.version)],
)

/** Signalement d'un setup public, un seul par personne et par setup. */
export const setupReport = pgTable(
  'setup_report',
  {
    id: text('id').primaryKey(),
    setupId: text('setup_id')
      .notNull()
      .references(() => setup.id, { onDelete: 'cascade' }),
    reporterId: text('reporter_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    reason: text('reason').notNull(),
    details: text('details').notNull().default(''),
    /** open : à traiter · dismissed : classé sans suite · actioned : setup masqué */
    status: text('status').notNull().default('open'),
    createdAt: createdAt(),
    resolvedAt: timestamp('resolved_at', { withTimezone: true }),
  },
  (t) => [
    uniqueIndex('setup_report_setup_reporter_uq').on(t.setupId, t.reporterId),
    index('setup_report_status_idx').on(t.status, t.createdAt),
  ],
)

/* Relations */

export const userRelations = relations(user, ({ many }) => ({
  setups: many(setup),
  sessions: many(session),
  accounts: many(account),
}))

export const setupRelations = relations(setup, ({ one, many }) => ({
  user: one(user, { fields: [setup.userId], references: [user.id] }),
  versions: many(setupVersion),
  likes: many(setupLike),
}))

export const setupLikeRelations = relations(setupLike, ({ one }) => ({
  setup: one(setup, { fields: [setupLike.setupId], references: [setup.id] }),
  user: one(user, { fields: [setupLike.userId], references: [user.id] }),
}))

export const setupVersionRelations = relations(setupVersion, ({ one }) => ({
  setup: one(setup, { fields: [setupVersion.setupId], references: [setup.id] }),
}))

export const catalogItemRelations = relations(catalogItem, ({ one }) => ({
  category: one(catalogCategory, { fields: [catalogItem.categoryId], references: [catalogCategory.id] }),
}))
