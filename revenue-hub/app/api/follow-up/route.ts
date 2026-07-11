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
      .select('id, name, industry, stage, phone, follow_up_at, follow_up_reason')
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

    // Send push notifications — /api/notify/send already fans out to every saved
    // subscription itself, so one call per due deal is correct. Looping the
    // subscriptions list here too (as this used to) sent each reminder once per
    // subscription per subscription — harmless with exactly one device
    // registered, but multiplying duplicate pushes the moment a second device
    // (e.g. an iPad) is added.
    const pushPromises = deals.map(deal =>
      fetch(`${req.nextUrl.origin}/api/notify/send`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(
          deal.follow_up_reason === 'referral'
            ? { title: `Ask for a referral: ${deal.name}`, body: `Closed 2 weeks ago${deal.phone ? ' · ' + deal.phone : ''} — good time to ask who else needs this.` }
            : { title: `Follow up: ${deal.name}`, body: `Stage: ${deal.stage}${deal.phone ? ' · ' + deal.phone : ''} — time to reach out!` }
        ),
      }).catch(() => {})
    )
    await Promise.all(pushPromises)

    // Send a single summary email
    const dealList = deals.map(d => `• ${d.name} (${d.industry ?? 'unknown'}) — ${d.follow_up_reason === 'referral' ? 'Ask for a referral' : `Stage: ${d.stage}`}${d.phone ? ', ' + d.phone : ''}`).join('\n')
    await sendRunEmail({
      runAt: new Date().toUTCString().replace(' GMT', ''),
      social: '',
      prospect: '',
      pitches: '',
      pipeline: `FOLLOW-UP REMINDERS DUE TODAY\n\n${dealList}`,
    }).catch(() => {})

    // Clear follow_up_at so it doesn't fire again tomorrow
    await sb
      .from('deals')
      .update({ follow_up_at: null })
      .in('id', deals.map(d => d.id))

    return NextResponse.json({ ok: true, notified: deals.length })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Unknown' }, { status: 500 })
  }
}
