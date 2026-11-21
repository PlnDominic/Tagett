import { needsConsent } from '@/lib/email-rules'
import { emailAcceptsMail } from '@/lib/mail-check'
import { NextResponse } from 'next/server'
import { getSupabase, writeToleratingSchemaDrift } from '@/lib/supabase'
import { getActor, isPrivileged } from '@/lib/auth'
import { DAILY_LIMIT, OUTREACH_FROM, outreachConfigured, sendOutreachEmail } from '@/lib/outreach-mail'

export const dynamic = 'force-dynamic'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function startOfTodayUTC(): string {
  const d = new Date()
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())).toISOString()
}

// email_log gained sent_by columns with accounts; tolerate a missed migration.
function logEmail(sb: ReturnType<typeof getSupabase>, row: Record<string, unknown>) {
  return writeToleratingSchemaDrift([row], rows => sb.from('email_log').insert(rows))
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
  const actor = getActor(req)
  const body = await req.json().catch(() => ({})) as { to?: string; subject?: string; text?: string; dealId?: string; country?: string; consent?: boolean }
  const to = body.to?.trim().toLowerCase() ?? ''
  const subject = body.subject?.trim() ?? ''
  const text = body.text?.trim() ?? ''
  if (!EMAIL_RE.test(to)) return NextResponse.json({ error: 'That email address does not look valid.' }, { status: 400 })
  if (!subject || !text) return NextResponse.json({ error: 'A subject and a message are both required.' }, { status: 400 })
  // A domain with no mail server bounces the message, and bounces are what
  // get a sending domain marked as spam. Free DNS check before any send.
  if (!(await emailAcceptsMail(to))) {
    return NextResponse.json({ error: `${to.split('@')[1]} doesn't accept email (no mail server), so this would bounce. Check the address for a typo.` }, { status: 422 })
  }
  // Cold email needs prior consent in some markets (lib/email-rules.ts).
  if (needsConsent(body.country) && !body.consent) {
    return NextResponse.json({ error: `In ${body.country} unsolicited marketing email needs their consent first. Message them on social media, use their contact form or call instead.` }, { status: 403 })
  }
  if (!outreachConfigured()) {
    return NextResponse.json({ error: 'Email sending is not set up yet: add OUTREACH_SMTP_HOST, OUTREACH_SMTP_USER and OUTREACH_SMTP_PASS in Vercel.' }, { status: 503 })
  }

  const sb = getSupabase()

  // A rep may only email on behalf of a deal they own, and never an address a
  // teammate has already emailed — that's the overlap this is here to stop.
  if (!isPrivileged(actor)) {
    if (!body.dealId) return NextResponse.json({ error: 'Open the deal you are working to send from it.' }, { status: 400 })
    const { data: deal } = await sb.from('deals').select('owner_id').eq('id', body.dealId).maybeSingle()
    if (!deal || deal.owner_id !== actor.id) return NextResponse.json({ error: 'That deal is not assigned to you.' }, { status: 403 })
  }
  const { data: prior } = await sb.from('email_log').select('sent_by_name').eq('to_email', to).eq('status', 'sent').limit(1).maybeSingle()
  if (prior && (prior as { sent_by_name?: string | null }).sent_by_name && (prior as { sent_by_name?: string }).sent_by_name !== actor.name) {
    return NextResponse.json({ error: `${(prior as { sent_by_name?: string }).sent_by_name} has already emailed ${to}, so this was not sent.` }, { status: 409 })
  }

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
    await logEmail(sb, { deal_id: body.dealId ?? null, to_email: to, subject, body: text, status: 'failed', error, sent_by: actor.id, sent_by_name: actor.name || null })
    return NextResponse.json({ error: `The email server refused it: ${error}` }, { status: 502 })
  }
  await logEmail(sb, { deal_id: body.dealId ?? null, to_email: to, subject, body: text, status: 'sent', sent_by: actor.id, sent_by_name: actor.name || null })
  return NextResponse.json({ ok: true, sentToday: (count ?? 0) + 1, dailyLimit: DAILY_LIMIT })
}
