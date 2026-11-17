import { Resend } from 'resend'

let client: Resend | null = null

function resend(): Resend | null {
  const key = process.env.RESEND_API_KEY
  if (!key) return null
  if (!client) client = new Resend(key)
  return client
}

interface MailInput {
  to: string
  subject: string
  html: string
  text: string
}

export type MailResult = { status: 'sent' } | { status: 'skipped' } | { status: 'failed'; reason: string }

/**
 * Envoi d'emails transactionnels via Resend.
 * Sans RESEND_API_KEY (développement), l'email n'est pas envoyé : son contenu texte est affiché dans le terminal.
 */
export async function sendMail({ to, subject, html, text }: MailInput): Promise<MailResult> {
  const api = resend()
  if (!api) {
    console.info(`\n[email] RESEND_API_KEY absent, email non envoyé\n  À : ${to}\n  Objet : ${subject}\n\n${text}\n`)
    return { status: 'skipped' }
  }
  const { error } = await api.emails.send({
    from: process.env.EMAIL_FROM || 'Oh My Desk <onboarding@resend.dev>',
    to,
    subject,
    html,
    text,
  })
  if (error) {
    console.error('[email] Échec de l’envoi via Resend', { to, subject, error })
    return { status: 'failed', reason: error.message }
  }
  console.info(`[email] Envoyé via Resend à ${to} : ${subject}`)
  return { status: 'sent' }
}

/* ------------------------------------------------------------------ */
/* Gabarits                                                            */
/* ------------------------------------------------------------------ */

const escapeHtml = (value: string) =>
  value.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!)

const FONT = "-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif"

interface LayoutInput {
  title: string
  /** Paragraphes du corps (texte brut, échappé). */
  paragraphs: string[]
  cta?: { label: string; url: string }
  /** Phrase sous le bouton (validité du lien, consigne de sécurité…). */
  note?: string
  footer: string
}

/** Gabarit compatible avec les clients mail : tableaux, styles en ligne, polices système. */
function layout({ title, paragraphs, cta, note, footer }: LayoutInput): string {
  const body = paragraphs
    .map((p) => `<p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#4B475E;">${escapeHtml(p)}</p>`)
    .join('')
  const button = cta
    ? `<a href="${escapeHtml(cta.url)}" style="display:inline-block;margin:8px 0 0;background:#FF6B35;color:#16151F;text-decoration:none;font-weight:700;font-size:15px;padding:14px 22px;border-radius:12px;">${escapeHtml(cta.label)}</a>`
    : ''
  const fallback = cta
    ? `<p style="margin:16px 0 0;font-size:12px;line-height:1.6;color:#5F5B72;word-break:break-all;">Le bouton ne fonctionne pas ? Copie ce lien dans ton navigateur :<br><a href="${escapeHtml(cta.url)}" style="color:#4A38D6;">${escapeHtml(cta.url)}</a></p>`
    : ''
  const noteHtml = note ? `<p style="margin:24px 0 0;font-size:13px;line-height:1.6;color:#5F5B72;">${escapeHtml(note)}</p>` : ''
  return `<!doctype html>
<html lang="fr">
<body style="margin:0;padding:0;background:#F7F5FB;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F7F5FB;padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#FFFFFF;border:1px solid #E4DFEF;border-radius:20px;">
        <tr><td style="padding:32px 32px 8px;font-family:${FONT};">
          <p style="margin:0 0 24px;font-size:16px;font-weight:800;color:#16151F;">Oh My Desk</p>
          <h1 style="margin:0 0 16px;font-size:24px;line-height:1.2;font-weight:800;color:#16151F;">${escapeHtml(title)}</h1>
          ${body}${button}${noteHtml}${fallback}
        </td></tr>
        <tr><td style="padding:24px 32px 32px;font-family:${FONT};font-size:12px;line-height:1.6;color:#5F5B72;">${escapeHtml(footer)}</td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}

function toText({ title, paragraphs, cta, note }: LayoutInput): string {
  return [title, '', ...paragraphs, ...(cta ? ['', `${cta.label} : ${cta.url}`] : []), ...(note ? ['', note] : [])].join('\n')
}

function build(subject: string, input: LayoutInput) {
  return { subject: `${subject} · Oh My Desk`, html: layout(input), text: toText(input) }
}

const firstName = (name: string) => name.trim().split(/\s+/)[0] || ''
const hello = (name: string) => (firstName(name) ? `Bonjour ${firstName(name)},` : 'Bonjour,')
const FOOTER_ACCOUNT = 'Tu reçois cet email parce qu’il concerne la sécurité de ton compte Oh My Desk.'

/** Inscription : confirmer l'adresse pour activer le compte. */
export function verificationEmail(name: string, url: string) {
  return build('Confirme ton adresse email', {
    title: 'Confirme ton adresse email',
    paragraphs: [`Bienvenue ${firstName(name) || 'à toi'} ! Confirme ton adresse email pour activer ton compte et sauvegarder tes setups.`],
    cta: { label: 'Confirmer mon email', url },
    note: 'Ce lien est valable 1 heure. Si tu n’as pas créé de compte, ignore simplement cet email.',
    footer: 'Tu reçois cet email parce que cette adresse a été utilisée pour créer un compte sur Oh My Desk.',
  })
}

/** Changement d'email, étape 1 : envoyé à l'adresse ACTUELLE pour approuver le changement. */
export function changeEmailApprovalEmail(name: string, newEmail: string, url: string) {
  return build('Confirme le changement d’adresse email', {
    title: 'Changement d’adresse email',
    paragraphs: [
      hello(name),
      `Une demande a été faite pour remplacer l’adresse de ton compte par ${newEmail}.`,
      'Si c’est bien toi, approuve le changement : un dernier lien sera ensuite envoyé à la nouvelle adresse.',
    ],
    cta: { label: 'Approuver le changement', url },
    note: 'Ce n’est pas toi ? Ne clique pas : ton adresse ne changera pas. Change ton mot de passe par précaution.',
    footer: FOOTER_ACCOUNT,
  })
}

/** Changement d'email, étape 2 : envoyé à la NOUVELLE adresse pour la confirmer. */
export function newEmailVerificationEmail(name: string, url: string) {
  return build('Confirme ta nouvelle adresse email', {
    title: 'Confirme ta nouvelle adresse',
    paragraphs: [hello(name), 'Dernière étape : confirme que cette adresse t’appartient pour qu’elle devienne celle de ton compte Oh My Desk.'],
    cta: { label: 'Confirmer cette adresse', url },
    note: 'Ce lien est valable 1 heure. Si tu n’es pas à l’origine de cette demande, ignore cet email.',
    footer: FOOTER_ACCOUNT,
  })
}

/** Mot de passe modifié depuis les paramètres. */
export function passwordChangedEmail(name: string, resetUrl: string) {
  return build('Ton mot de passe a été modifié', {
    title: 'Mot de passe modifié',
    paragraphs: [hello(name), `Le mot de passe de ton compte vient d’être modifié, le ${formatNow()}.`, 'Si c’est toi, tout va bien : tu n’as rien à faire.'],
    cta: { label: 'Ce n’est pas moi : réinitialiser', url: resetUrl },
    note: 'Si tu n’es pas à l’origine de ce changement, réinitialise ton mot de passe tout de suite : cela déconnectera tous les appareils.',
    footer: FOOTER_ACCOUNT,
  })
}

/** Mot de passe oublié : lien de réinitialisation. */
export function resetPasswordEmail(name: string, url: string) {
  return build('Réinitialise ton mot de passe', {
    title: 'Réinitialise ton mot de passe',
    paragraphs: [hello(name), 'Tu as demandé à réinitialiser ton mot de passe. Choisis-en un nouveau avec le bouton ci-dessous.'],
    cta: { label: 'Choisir un nouveau mot de passe', url },
    note: 'Ce lien est valable 1 heure. Si tu n’as rien demandé, ignore cet email : ton mot de passe actuel reste valable.',
    footer: FOOTER_ACCOUNT,
  })
}

/** Mot de passe réinitialisé : confirmation. */
export function passwordResetDoneEmail(name: string, resetUrl: string) {
  return build('Ton mot de passe a été réinitialisé', {
    title: 'Mot de passe réinitialisé',
    paragraphs: [hello(name), `Ton mot de passe a été réinitialisé le ${formatNow()} et tes autres appareils ont été déconnectés.`],
    cta: { label: 'Ce n’est pas moi : réinitialiser à nouveau', url: resetUrl },
    footer: FOOTER_ACCOUNT,
  })
}

function formatNow(): string {
  return new Intl.DateTimeFormat('fr-FR', { dateStyle: 'long', timeStyle: 'short', timeZone: 'Europe/Paris' }).format(new Date())
}
