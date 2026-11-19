import type { SQL } from 'drizzle-orm'
import { and, asc, desc, eq, gte, inArray, isNotNull, isNull, or, sql } from 'drizzle-orm'
import type { H3Event } from 'h3'
import type { MissingPreview, ModerationAction, ModerationItem, ModerationReport, ReportCreate, ReportReason } from '#shared/types/moderation'
import { AUTO_HIDE_THRESHOLD, REPORT_REASON_LABELS } from '#shared/types/moderation'
import { createId } from '#shared/utils/ids'
import { schema, useDb } from '../db/client'
import { getSessionUser } from './auth'
import { reportNotificationEmail, sendMail, setupHiddenEmail } from './email'
import { authorColumns, getSetupById, toSummary } from './setups'

const { setup, setupReport, setupVersion, user } = schema

/** Signalements qu'une même personne peut envoyer en 24 h (anti-abus). */
const DAILY_REPORT_LIMIT = 20

/* ------------------------------------------------------------------ */
/* Administrateurs                                                     */
/* ------------------------------------------------------------------ */

/** Adresses des modérateurs, séparées par des virgules : ADMIN_EMAILS="moi@exemple.fr,autre@exemple.fr". */
export function adminEmails(): string[] {
  return (process.env.ADMIN_EMAILS ?? '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)
}

export function isAdmin(u: { email: string; emailVerified: boolean } | null | undefined): boolean {
  return Boolean(u && u.emailVerified && adminEmails().includes(u.email.toLowerCase()))
}

/** Modérateur connecté, sinon 404 (on ne révèle pas l'existence de l'espace de modération). */
export async function requireAdmin(event: H3Event) {
  const u = await getSessionUser(event)
  if (!isAdmin(u)) throw createError({ statusCode: 404, statusMessage: 'Page introuvable' })
  return u!
}

const siteUrl = () => process.env.BETTER_AUTH_URL ?? process.env.NUXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'

/* ------------------------------------------------------------------ */
/* Signalements                                                        */
/* ------------------------------------------------------------------ */

export async function createReport(setupId: string, reporter: { id: string; name: string }, input: ReportCreate) {
  const db = useDb()
  const record = await getSetupById(setupId)
  if (!record || !record.isPublic || record.hidden) throw createError({ statusCode: 404, statusMessage: 'Setup introuvable' })
  if (record.userId === reporter.id) throw createError({ statusCode: 400, statusMessage: 'Tu ne peux pas signaler ton propre setup.' })

  const since = new Date(Date.now() - 24 * 60 * 60 * 1000)
  const [recent] = await db
    .select({ count: sql<number>`count(*)`.mapWith(Number) })
    .from(setupReport)
    .where(and(eq(setupReport.reporterId, reporter.id), gte(setupReport.createdAt, since)))
  if ((recent?.count ?? 0) >= DAILY_REPORT_LIMIT) {
    throw createError({ statusCode: 429, statusMessage: 'Tu as envoyé beaucoup de signalements aujourd’hui. Réessaie demain.' })
  }

  const inserted = await db
    .insert(setupReport)
    .values({ id: createId('r_'), setupId, reporterId: reporter.id, reason: input.reason, details: input.details })
    .onConflictDoNothing()
    .returning({ id: setupReport.id })
  if (!inserted.length) throw createError({ statusCode: 409, statusMessage: 'Tu as déjà signalé ce setup. Merci, il sera examiné.' })

  const [open] = await db
    .select({ count: sql<number>`count(*)`.mapWith(Number) })
    .from(setupReport)
    .where(and(eq(setupReport.setupId, setupId), eq(setupReport.status, 'open')))
  const openCount = open?.count ?? 1

  // Plusieurs personnes différentes : masqué en attendant l'examen (l'auteur n'est pas prévenu à ce stade).
  let autoHidden = false
  if (openCount >= AUTO_HIDE_THRESHOLD) {
    const hidden = await db
      .update(setup)
      .set({ hiddenAt: new Date(), hiddenReason: 'auto', updatedAt: sql`${setup.updatedAt}` })
      .where(and(eq(setup.id, setupId), isNull(setup.hiddenAt)))
      .returning({ id: setup.id })
    autoHidden = hidden.length > 0
  }

  const admins = adminEmails()
  if (admins.length) {
    const mail = reportNotificationEmail({
      setupName: record.name,
      setupUrl: `${siteUrl()}/setup/${record.slug}`,
      moderationUrl: `${siteUrl()}/admin/moderation`,
      reason: REPORT_REASON_LABELS[input.reason],
      details: input.details,
      openCount,
      autoHidden,
    })
    // Non bloquant : le signalement est enregistré même si l'email échoue.
    await Promise.all(admins.map((to) => sendMail({ to, ...mail }))).catch((error) => console.error('[moderation] Email admin', error))
  }
  return { autoHidden }
}

/* ------------------------------------------------------------------ */
/* Espace de modération                                                */
/* ------------------------------------------------------------------ */

/** Setups à examiner : signalements ouverts (`open`) ou setups actuellement masqués (`hidden`). */
export async function listModeration(filter: 'open' | 'hidden'): Promise<ModerationItem[]> {
  const db = useDb()
  const openCount = sql<number>`(select count(*)::int from ${setupReport} where ${setupReport.setupId} = ${setup.id} and ${setupReport.status} = 'open')`
  const where: SQL =
    filter === 'hidden'
      ? isNotNull(setup.hiddenAt)
      : (or(
          sql`exists (select 1 from ${setupReport} where ${setupReport.setupId} = ${setup.id} and ${setupReport.status} = 'open')`,
          and(isNotNull(setup.hiddenAt), eq(setup.hiddenReason, 'auto')),
        ) as SQL)
  const rows = await db
    .select({ s: setup, author: authorColumns, openCount })
    .from(setup)
    .innerJoin(user, eq(user.id, setup.userId))
    .where(where)
    .orderBy(desc(openCount), desc(setup.updatedAt))
    .limit(100)
  if (!rows.length) return []

  const reports = await db
    .select({
      id: setupReport.id,
      setupId: setupReport.setupId,
      reason: setupReport.reason,
      details: setupReport.details,
      status: setupReport.status,
      createdAt: setupReport.createdAt,
      reporterName: user.name,
    })
    .from(setupReport)
    .innerJoin(user, eq(user.id, setupReport.reporterId))
    .where(inArray(setupReport.setupId, rows.map((r) => r.s.id)))
    .orderBy(asc(setupReport.status), desc(setupReport.createdAt))

  return rows.map((r) => ({
    setup: toSummary(r.s, r.author),
    hiddenAt: r.s.hiddenAt?.toISOString() ?? null,
    hiddenReason: r.s.hiddenReason,
    openCount: r.openCount,
    reports: reports
      .filter((rep) => rep.setupId === r.s.id)
      .map(
        (rep): ModerationReport => ({
          id: rep.id,
          reason: rep.reason as ReportReason,
          details: rep.details,
          reporterName: rep.reporterName,
          status: rep.status as ModerationReport['status'],
          createdAt: rep.createdAt.toISOString(),
        }),
      ),
  }))
}

export async function moderateSetup(setupId: string, action: ModerationAction, reason?: ReportReason) {
  const db = useDb()
  const [target] = await db
    .select({ s: setup, ownerEmail: user.email, ownerName: user.name })
    .from(setup)
    .innerJoin(user, eq(user.id, setup.userId))
    .where(eq(setup.id, setupId))
    .limit(1)
  if (!target) throw createError({ statusCode: 404, statusMessage: 'Setup introuvable' })
  const now = new Date()
  const keepUpdatedAt = sql`${setup.updatedAt}`
  const openReports = and(eq(setupReport.setupId, setupId), eq(setupReport.status, 'open'))

  if (action === 'hide') {
    await db.batch([
      db.update(setup).set({ hiddenAt: target.s.hiddenAt ?? now, hiddenReason: reason ?? 'other', updatedAt: keepUpdatedAt }).where(eq(setup.id, setupId)),
      db.update(setupReport).set({ status: 'actioned', resolvedAt: now }).where(openReports),
    ])
    const label = REPORT_REASON_LABELS[reason ?? 'other']
    await sendMail({
      to: target.ownerEmail,
      ...setupHiddenEmail(target.ownerName, target.s.name, label, `${siteUrl()}/conditions-utilisation`),
    }).catch((error) => console.error('[moderation] Email auteur', error))
  } else {
    // Rétablir ou classer sans suite : le setup redevient visible, les signalements ouverts sont clos.
    await db.batch([
      db.update(setup).set({ hiddenAt: null, hiddenReason: null, updatedAt: keepUpdatedAt }).where(eq(setup.id, setupId)),
      db.update(setupReport).set({ status: 'dismissed', resolvedAt: now }).where(openReports),
    ])
  }
}

/* ------------------------------------------------------------------ */
/* Aperçus manquants                                                   */
/* ------------------------------------------------------------------ */

/** Setups publics sans aperçu PNG (démos, setups publiés avant l'étape 3), à générer depuis l'espace de modération. */
export async function listMissingPreviews(): Promise<MissingPreview[]> {
  const rows = await useDb()
    .select({ id: setup.id, name: setup.name, slug: setup.slug, scene: setupVersion.sceneData })
    .from(setup)
    .innerJoin(setupVersion, and(eq(setupVersion.setupId, setup.id), eq(setupVersion.version, setup.currentVersion)))
    .where(and(eq(setup.isPublic, true), isNull(setup.previewUrl)))
    .orderBy(desc(setup.publishedAt))
    .limit(50)
  return rows
}
