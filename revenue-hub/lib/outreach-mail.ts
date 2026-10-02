import nodemailer from 'nodemailer'

// Outreach email from the business address (support@ecstasytechnologies.com),
// separate from lib/mailer.ts, which sends Dominic his own notifications from
// a personal account. Reads OUTREACH_SMTP_* first, then the SMTP_* names the
// website's contact form uses, so the same mailbox settings can be copied over.

export const OUTREACH_FROM = process.env.OUTREACH_FROM?.trim() || 'support@ecstasytechnologies.com'
export const OUTREACH_NAME = process.env.OUTREACH_FROM_NAME?.trim() || 'Dominic Kudom, Ecstasy Technologies'
/** Cold email from a young domain gets flagged as spam quickly if volume jumps. */
export const DAILY_LIMIT = Number(process.env.OUTREACH_DAILY_LIMIT ?? 30) || 30

function env(name: string): string | undefined {
  return (process.env[`OUTREACH_${name}`] ?? process.env[name])?.trim() || undefined
}

export function outreachConfigured(): boolean {
  return !!(env('SMTP_HOST') && env('SMTP_USER') && env('SMTP_PASS'))
}

function transport() {
  const port = Number(env('SMTP_PORT') ?? 465)
  const secure = env('SMTP_SECURE')
  return nodemailer.createTransport({
    host: env('SMTP_HOST'),
    port,
    secure: secure ? secure === 'true' : port === 465,
    auth: { user: env('SMTP_USER'), pass: env('SMTP_PASS') },
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 15_000,
  })
}

// Cold email law (UK PECR/GDPR, EU, US CAN-SPAM) expects the sender to be
// identifiable with an address and gives the recipient an easy way to stop.
const FOOTER = `--
Ecstasy Technologies, Bibiani, Ghana · ecstasytechnologies.com
Not interested? Reply "stop" and I won't email you again.`

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

export async function sendOutreachEmail(msg: { to: string; subject: string; text: string }): Promise<void> {
  const text = `${msg.text.trim()}\n\n${FOOTER}`
  // Plain, personal-looking HTML: heavy templates read as marketing and are
  // more likely to be filtered as cold email.
  // A complete document: SpamAssassin's HTML_MIME_NO_HTML_TAG docks points
  // from an HTML part that is only a fragment (mail-tester showed -0.5).
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${esc(msg.subject)}</title></head><body><div style="font-family:Arial,sans-serif;font-size:14px;line-height:1.6;color:#222">${
    esc(msg.text.trim()).replace(/\n/g, '<br>')
  }<br><br><span style="color:#888;font-size:12px">${esc(FOOTER).replace(/\n/g, '<br>')}</span></div></body></html>`
  await transport().sendMail({
    from: `"${OUTREACH_NAME}" <${OUTREACH_FROM}>`,
    replyTo: OUTREACH_FROM,
    to: msg.to,
    subject: msg.subject,
    text,
    html,
    headers: { 'List-Unsubscribe': `<mailto:${OUTREACH_FROM}?subject=unsubscribe>` },
  })
}
