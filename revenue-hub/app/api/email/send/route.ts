import { needsConsent } from '@/lib/email-rules'
import { NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase'
import { DAILY_LIMIT, OUTREACH_FROM, outreachConfigured, sendOutreachEmail } from '@/lib/outreach-mail'

export const dynamic = 'force-dynamic'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function startOfTodayUTC(): string {
  const d = new Date()
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())).toISOString()
}

// GET — how many outreach emails went out today, against the daily limit.
export async function GET() {
  try {
    const sb = getSupabase()
    const { count } = await sb.from('email_log').select('id', { count: 'exact', head: true })
      .eq('status', 'sent').gte('sent_at', startOfTodayUTC())
    return NextResponse.json({ configured: outreachConfigured(), from: OUTREACH_FROM, sentToday: count ?? 0, dailyLimit: DAILY_LIMIT })
  } catch {
    return NextResponse.json({ configured: outreachConfigured(), from: OUTREACH_FROM, sentToday: 0, dailyLimit: DAILY_LIMIT })
  }
}

// POST { to, subject, text, dealId? } — sends one outreach email from the
// business address. Only ever called from an explicit Send click in the app
// (behind the session middleware); nothing sends on its own.
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({})) as { to?: string; subject?: string; text?: string; dealId?: string; country?: string; consent?: boolean }
  const to = body.to?.trim().toLowerCase() ?? ''
  const subject = body.subject?.trim() ?? ''
  const text = body.text?.trim() ?? ''
  if (!EMAIL_RE.test(to)) return NextResponse.json({ error: 'That email address does not look valid.' }, { status: 400 })
  if (!subject || !text) return NextResponse.json({ error: 'A subject and a message are both required.' }, { status: 400 })
  // Cold email needs prior consent in some markets (lib/email-rules.ts).
  if (needsConsent(body.country) && !body.consent) {
    return NextResponse.json({ error: `In ${body.country} unsolicited marketing email needs their consent first. Message them on social media, use their contact form or call instead.` }, { status: 403 })
  }
  if (!outreachConfigured()) {
    return NextResponse.json({ error: 'Email sending is not set up yet: add OUTREACH_SMTP_HOST, OUTREACH_SMTP_USER and OUTREACH_SMTP_PASS in Vercel.' }, { status: 503 })
  }

  const sb = getSupabase()
  const { data: optedOut } = await sb.from('email_optouts').select('email').eq('email', to).maybeSingle()
  if (optedOut) return NextResponse.json({ error: `${to} asked not to be emailed, so this was not sent.` }, { status: 409 })

  const { count } = await sb.from('email_log').select('id', { count: 'exact', head: true })
    .eq('status', 'sent').gte('sent_at', startOfTodayUTC())
  if ((count ?? 0) >= DAILY_LIMIT) {
    return NextResponse.json({ error: `Daily limit reached (${DAILY_LIMIT} emails). Sending more today risks the domain being marked as spam; try again tomorrow.` }, { status: 429 })
  }

  try {
    await sendOutreachEmail({ to, subject, text })
  } catch (err) {
    const error = err instanceof Error ? err.message : 'Send failed'
    await sb.from('email_log').insert({ deal_id: body.dealId ?? null, to_email: to, subject, body: text, status: 'failed', error })
    return NextResponse.json({ error: `The email server refused it: ${error}` }, { status: 502 })
  }
  await sb.from('email_log').insert({ deal_id: body.dealId ?? null, to_email: to, subject, body: text, status: 'sent' })
  return NextResponse.json({ ok: true, sentToday: (count ?? 0) + 1, dailyLimit: DAILY_LIMIT })
}
