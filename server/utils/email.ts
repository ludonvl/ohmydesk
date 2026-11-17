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

/**
 * Envoi d'emails transactionnels via Resend.
 * Sans RESEND_API_KEY (développement), l'email n'est pas envoyé : son contenu texte est affiché dans le terminal.
 */
export async function sendMail({ to, subject, html, text }: MailInput): Promise<boolean> {
  const api = resend()
  if (!api) {
    console.info(`\n[email] RESEND_API_KEY absent, email non envoyé\n  À : ${to}\n  Objet : ${subject}\n\n${text}\n`)
    return false
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
    return false
  }
  return true
}

const escapeHtml = (value: string) =>
  value.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!)

/** Gabarit simple et compatible avec les clients mail (tableaux, styles en ligne, polices système). */
function layout({ title, intro, cta, url, outro }: { title: string; intro: string; cta: string; url: string; outro: string }) {
  const safeUrl = escapeHtml(url)
  return `<!doctype html>
<html lang="fr">
<body style="margin:0;padding:0;background:#F7F5FB;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F7F5FB;padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#FFFFFF;border:1px solid #E4DFEF;border-radius:20px;">
        <tr><td style="padding:32px 32px 8px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
          <p style="margin:0 0 24px;font-size:16px;font-weight:800;color:#16151F;">Oh My Desk</p>
          <h1 style="margin:0 0 12px;font-size:24px;line-height:1.2;font-weight:800;color:#16151F;">${escapeHtml(title)}</h1>
          <p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:#4B475E;">${escapeHtml(intro)}</p>
          <a href="${safeUrl}" style="display:inline-block;background:#FF6B35;color:#16151F;text-decoration:none;font-weight:700;font-size:15px;padding:14px 22px;border-radius:12px;">${escapeHtml(cta)}</a>
          <p style="margin:24px 0 0;font-size:13px;line-height:1.6;color:#5F5B72;">${escapeHtml(outro)}</p>
          <p style="margin:16px 0 0;font-size:12px;line-height:1.6;color:#5F5B72;word-break:break-all;">Le bouton ne fonctionne pas ? Copie ce lien dans ton navigateur :<br><a href="${safeUrl}" style="color:#4A38D6;">${safeUrl}</a></p>
        </td></tr>
        <tr><td style="padding:24px 32px 32px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;font-size:12px;color:#5F5B72;">
          Tu reçois cet email parce que cette adresse a été utilisée pour créer un compte sur Oh My Desk.
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}

export function verificationEmail(name: string, url: string) {
  const firstName = name.split(/\s+/)[0] || 'toi'
  const intro = `Bienvenue ${firstName} ! Confirme ton adresse email pour activer ton compte et sauvegarder tes setups.`
  const outro = 'Ce lien est valable 1 heure. Si tu n’as pas créé de compte, ignore simplement cet email.'
  return {
    subject: 'Confirme ton adresse email · Oh My Desk',
    html: layout({ title: 'Confirme ton adresse email', intro, cta: 'Confirmer mon email', url, outro }),
    text: `${intro}\n\nConfirmer mon email : ${url}\n\n${outro}`,
  }
}
