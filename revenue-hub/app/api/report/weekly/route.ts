import { NextRequest, NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase'
import { sendReportEmail } from '@/lib/mailer'

export const dynamic = 'force-dynamic'

// Mirrors STAGE_STALE_MS in lib/types.ts — how long a deal can sit in a stage
// before it counts as going cold. Server-side copy: this route runs on cron
// with no page bundle, and importing the client types module here would be the
// only server usage of it.
const STALE_MS: Record<string, number> = {
  found: 3 * 86400000, contacted: 5 * 86400000, interested: 7 * 86400000,
  proposal: 10 * 86400000, negotiating: 14 * 86400000, closed: 0, lost: 0,
}

type Row = Record<string, unknown>

function countInWindow(items: Array<{ at: number }>, from: number, to: number): number {
  return items.filter(i => i.at >= from && i.at < to).length
}

function delta(current: number, previous: number): string {
  if (previous === 0) return current > 0 ? ' (up from 0)' : ''
  const diff = current - previous
  if (diff === 0) return ' (same as last week)'
  return diff > 0 ? ` (+${diff} vs last week)` : ` (${diff} vs last week)`
}

// Vercel Cron, Monday 6am (Ghana is UTC): assembles the week that just ended
// into one push + one email, so the numbers arrive without opening Analytics.
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (secret) {
    const auth = req.headers.get('authorization')
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  try {
    const sb = getSupabase()
    const now = Date.now()
    const weekAgo = now - 7 * 86400000
    const twoWeeksAgo = now - 14 * 86400000

    const [{ data: deals }, { data: invoices }, { data: milestones }, { data: retainers }] = await Promise.all([
      sb.from('deals').select('*'),
      sb.from('invoices').select('*'),
      sb.from('invoice_milestones').select('*'),
      sb.from('retainers').select('*'),
    ])

    // ── Activity, this week vs last ──────────────────────────────────────────
    const pitches: Array<{ at: number }> = []
    const calls: Array<{ at: number }> = []
    for (const d of deals ?? []) {
      for (const h of (d.whatsapp_history as Array<{ sentAt: number }> | null) ?? []) pitches.push({ at: h.sentAt })
      for (const c of (d.call_log as Array<{ calledAt: number }> | null) ?? []) calls.push({ at: c.calledAt })
    }
    const pitchesNow = countInWindow(pitches, weekAgo, now)
    const pitchesPrev = countInWindow(pitches, twoWeeksAgo, weekAgo)
    const callsNow = countInWindow(calls, weekAgo, now)
    const callsPrev = countInWindow(calls, twoWeeksAgo, weekAgo)
    const leadsNow = (deals ?? []).filter(d => (d.created_at as number) >= weekAgo).length
    const repliesNow = (deals ?? []).filter(d => d.replied_at && (d.replied_at as number) >= weekAgo).length

    const closedThisWeek = (deals ?? []).filter(d =>
      d.stage === 'closed' && ((d.stage_changed_at as number | null) ?? (d.created_at as number)) >= weekAgo
    )
    const closedGHS = closedThisWeek.reduce((s, d) => s + ((d.value_ghs as number) ?? 0), 0)

    // ── Pipeline health ───────────────────────────────────────────────────────
    const active = (deals ?? []).filter(d => d.stage !== 'closed' && d.stage !== 'lost')
    const activeGHS = active.reduce((s, d) => s + ((d.value_ghs as number) ?? 0), 0)
    const stale = active.filter(d => {
      const ms = STALE_MS[d.stage as string] ?? 0
      return ms > 0 && now - (((d.stage_changed_at as number | null) ?? (d.created_at as number))) > ms
    })

    const dueThisWeek = (deals ?? []).filter(d =>
      d.follow_up_at && (d.follow_up_at as number) >= now && (d.follow_up_at as number) < now + 7 * 86400000
    )

    // ── Money ────────────────────────────────────────────────────────────────
    const paidByInvoice: Record<string, number> = {}
    for (const m of milestones ?? []) {
      if (m.paid_at) {
        const key = m.invoice_id as string
        paidByInvoice[key] = (paidByInvoice[key] ?? 0) + ((m.amount_ghs as number) ?? 0)
      }
    }
    let outstanding = 0
    let overdueCount = 0
    for (const inv of invoices ?? []) {
      if (inv.status === 'paid' || inv.status === 'draft') continue
      outstanding += ((inv.total_ghs as number) ?? 0) - (paidByInvoice[inv.id as string] ?? 0)
      if (inv.due_at && (inv.due_at as number) < now) overdueCount++
    }
    const mrr = (retainers ?? [])
      .filter(r => r.status === 'active')
      .reduce((s, r) => s + ((r.monthly_ghs as number) ?? 0), 0)

    // ── Assemble ─────────────────────────────────────────────────────────────
    const activityText = [
      `Pitches sent: ${pitchesNow}${delta(pitchesNow, pitchesPrev)}`,
      `Calls made: ${callsNow}${delta(callsNow, callsPrev)}`,
      `Replies received: ${repliesNow}`,
      `New leads: ${leadsNow}`,
      `Deals closed: ${closedThisWeek.length}${closedThisWeek.length > 0 ? ` — GHS ${closedGHS.toLocaleString()}` : ''}`,
    ].join('\n')

    const pipelineText = [
      `Active pipeline: ${active.length} deals — GHS ${activeGHS.toLocaleString()}`,
      `Going cold: ${stale.length}${stale.length > 0 ? ` (${stale.slice(0, 5).map(d => d.name).join(', ')}${stale.length > 5 ? '…' : ''})` : ''}`,
      `Follow-ups due this week: ${dueThisWeek.length}${dueThisWeek.length > 0 ? ` (${dueThisWeek.slice(0, 5).map(d => d.name).join(', ')}${dueThisWeek.length > 5 ? '…' : ''})` : ''}`,
    ].join('\n')

    const moneyText = [
      `Outstanding invoices: GHS ${Math.max(0, outstanding).toLocaleString()}${overdueCount > 0 ? ` — ${overdueCount} overdue` : ''}`,
      `Retainer MRR: GHS ${mrr.toLocaleString()}`,
    ].join('\n')

    let emailSent = false
    try {
      await sendReportEmail({
        subject: `📊 Tagett Weekly Report · ${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`,
        headline: 'Weekly CEO Report',
        sections: [
          { icon: '⚡', title: 'Activity This Week', content: activityText },
          { icon: '◫', title: 'Pipeline', content: pipelineText },
          { icon: '💰', title: 'Money', content: moneyText },
        ],
      })
      emailSent = true
    } catch { /* push still goes out below */ }

    await fetch(`${req.nextUrl.origin}/api/notify/send`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        title: '📊 Weekly report',
        body: `${pitchesNow} pitches · ${repliesNow} replies · ${closedThisWeek.length} closed${closedThisWeek.length > 0 ? ` (GHS ${closedGHS.toLocaleString()})` : ''} · ${stale.length} going cold. Full report in your email.`,
      }),
    }).catch(() => {})

    return NextResponse.json({ ok: true, emailSent, pitchesNow, repliesNow, closed: closedThisWeek.length, stale: stale.length })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Unknown' }, { status: 500 })
  }
}
