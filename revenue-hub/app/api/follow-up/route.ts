import { NextRequest, NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase'
import { sendRunEmail } from '@/lib/mailer'

export const dynamic = 'force-dynamic'

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

    const { data: allDue } = await sb
      .from('deals')
      .select('id, name, industry, stage, phone, follow_up_at, follow_up_reason, replied_at, sequence_step')
      .not('follow_up_at', 'is', null)
      .lte('follow_up_at', now)

    // A closed deal only stays in this list for a referral ask (set automatically
    // 14 days after closing) — a generic "time to reach out" reminder makes no
    // sense once the sale is done. Any other closed-with-follow-up case is
    // filtered out here rather than at the query, so referral asks aren't lost.
    const deals = (allDue ?? []).filter(d => d.stage !== 'closed' || d.follow_up_reason === 'referral')

    if (deals.length === 0) {
      return NextResponse.json({ ok: true, notified: 0 })
    }

    // Multi-touch sequences: sequence_step counts touches sent so far (1 = the
    // initial pitch). A due sequence deal that hasn't replied advances to the
    // next touch — day 3 (this firing), then +4d (day 7), then +7d (day 14
    // break-up), then the sequence ends. A reply ends it immediately: the deal
    // is in live conversation and canned nudges would be worse than silence.
    const touchLabel = (step: number) => step >= 3 ? 'Final touch — send the break-up message' : `Touch ${step + 1} — new angle, not a repeat`
    const notifyDeals: typeof deals = []
    for (const deal of deals) {
      const step = (deal.sequence_step as number | null) ?? 0
      if (step > 0 && deal.replied_at) {
        await sb.from('deals').update({ follow_up_at: null, sequence_step: null }).eq('id', deal.id)
        continue
      }
      if (step > 0) {
        const next = step + 1
        // next=2 fires day 3 (now), schedules day 7; next=3 schedules day 14; after that stop.
        const followUpAt = next >= 4 ? null : now + (next === 2 ? 4 : 7) * 86400000
        await sb.from('deals').update({ follow_up_at: followUpAt, sequence_step: next >= 4 ? null : next }).eq('id', deal.id)
      } else {
        await sb.from('deals').update({ follow_up_at: null }).eq('id', deal.id)
      }
      notifyDeals.push(deal)
    }

    // Send push notifications — /api/notify/send already fans out to every saved
    // subscription itself, so one call per due deal is correct. Looping the
    // subscriptions list here too (as this used to) sent each reminder once per
    // subscription per subscription — harmless with exactly one device
    // registered, but multiplying duplicate pushes the moment a second device
    // (e.g. an iPad) is added.
    const pushPromises = notifyDeals.map(deal => {
      const step = (deal.sequence_step as number | null) ?? 0
      const payload =
        deal.follow_up_reason === 'referral'
          ? { title: `Ask for a referral: ${deal.name}`, body: `Closed 2 weeks ago${deal.phone ? ' · ' + deal.phone : ''} — good time to ask who else needs this.` }
          : step > 0
          ? { title: `Follow up: ${deal.name}`, body: `${touchLabel(step)}${deal.phone ? ' · ' + deal.phone : ''}` }
          : { title: `Follow up: ${deal.name}`, body: `Stage: ${deal.stage}${deal.phone ? ' · ' + deal.phone : ''} — time to reach out!` }
      return fetch(`${req.nextUrl.origin}/api/notify/send`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      }).catch(() => {})
    })
    await Promise.all(pushPromises)

    if (notifyDeals.length > 0) {
      // Send a single summary email
      const dealList = notifyDeals.map(d => `• ${d.name} (${d.industry ?? 'unknown'}) — ${d.follow_up_reason === 'referral' ? 'Ask for a referral' : `Stage: ${d.stage}`}${d.phone ? ', ' + d.phone : ''}`).join('\n')
      await sendRunEmail({
        runAt: new Date().toUTCString().replace(' GMT', ''),
        social: '',
        prospect: '',
        pitches: '',
        pipeline: `FOLLOW-UP REMINDERS DUE TODAY\n\n${dealList}`,
      }).catch(() => {})
    }

    return NextResponse.json({ ok: true, notified: notifyDeals.length })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : ((err as { message?: string })?.message ?? 'Unknown') }, { status: 500 })
  }
}
