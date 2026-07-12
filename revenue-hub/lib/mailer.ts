import nodemailer from 'nodemailer'

function getTransport() {
  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST ?? 'smtp.gmail.com',
    port: Number(process.env.EMAIL_PORT ?? 587),
    secure: false,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  })
}

function esc(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function section(icon: string, title: string, content: string) {
  return `
  <div style="margin-bottom:28px">
    <div style="color:#C8A96E;font-size:13px;font-weight:700;letter-spacing:0.07em;text-transform:uppercase;margin-bottom:8px;font-family:sans-serif">${icon} ${title}</div>
    <div style="background:#1c1c1c;border:1px solid #2a2a2a;border-radius:8px;padding:14px 16px;font-family:'Courier New',monospace;font-size:12.5px;color:#d4d4d4;white-space:pre-wrap;line-height:1.65">${esc(content)}</div>
  </div>`
}

export async function sendRunEmail(payload: {
  runAt: string
  social: string
  prospect: string
  pitches: string
  pipeline: string
}) {
  const to = process.env.EMAIL_TO ?? 'dominickudom1738@gmail.com'
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://tagett.vercel.app'

  const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#111111">
  <div style="max-width:660px;margin:0 auto;padding:32px 24px;font-family:sans-serif">
    <div style="margin-bottom:28px;display:flex;align-items:baseline;gap:12px">
      <span style="color:#C8A96E;font-size:22px;font-weight:800;letter-spacing:0.06em">TAGETT</span>
      <span style="color:#555;font-size:12px">Auto-Run · ${payload.runAt} GMT</span>
    </div>
    ${section('⌖', 'SocialScout: Social Leads Found', payload.social)}
    ${section('◎', 'ProspectBot: Business Leads', payload.prospect)}
    ${section('✦', 'ContentBot: Pitch Drafts Ready', payload.pitches)}
    ${section('⊙', 'RevenueBot: Pipeline Status', payload.pipeline)}
    <div style="margin-top:32px;padding-top:20px;border-top:1px solid #222;display:flex;justify-content:space-between;align-items:center">
      <span style="color:#444;font-size:11px">Ecstasy Technologies · Tagett Revenue Hub</span>
      <a href="${appUrl}" style="color:#C8A96E;font-size:12px;text-decoration:none;font-weight:600">Open Tagett →</a>
    </div>
  </div>
</body>
</html>`

  await getTransport().sendMail({
    from: `"Tagett" <${process.env.EMAIL_USER}>`,
    to,
    subject: `🤖 Tagett Auto-Run · ${payload.runAt}`,
    html,
  })
}

// General-purpose report email — sendRunEmail above is hardwired to the
// auto-run's four agent sections, so anything else (weekly CEO report etc.)
// uses this instead of overloading that shape.
export async function sendReportEmail(payload: {
  subject: string
  headline: string
  sections: Array<{ icon: string; title: string; content: string }>
}) {
  const to = process.env.EMAIL_TO ?? 'dominickudom1738@gmail.com'
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://tagett.vercel.app'

  const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#111111">
  <div style="max-width:660px;margin:0 auto;padding:32px 24px;font-family:sans-serif">
    <div style="margin-bottom:28px;display:flex;align-items:baseline;gap:12px">
      <span style="color:#C8A96E;font-size:22px;font-weight:800;letter-spacing:0.06em">TAGETT</span>
      <span style="color:#555;font-size:12px">${esc(payload.headline)}</span>
    </div>
    ${payload.sections.map(s => section(s.icon, s.title, s.content)).join('')}
    <div style="margin-top:32px;padding-top:20px;border-top:1px solid #222;display:flex;justify-content:space-between;align-items:center">
      <span style="color:#444;font-size:11px">Ecstasy Technologies · Tagett Revenue Hub</span>
      <a href="${appUrl}" style="color:#C8A96E;font-size:12px;text-decoration:none;font-weight:600">Open Tagett →</a>
    </div>
  </div>
</body>
</html>`

  await getTransport().sendMail({
    from: `"Tagett" <${process.env.EMAIL_USER}>`,
    to,
    subject: payload.subject,
    html,
  })
}
