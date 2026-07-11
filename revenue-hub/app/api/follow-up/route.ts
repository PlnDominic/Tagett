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

    const { data: deals } = await sb
      .from('deals')
      .select('id, name, industry, stage, phone, follow_up_at')
      .not('follow_up_at', 'is', null)
      .lte('follow_up_at', now)
      .neq('stage', 'closed')

    if (!deals || deals.length === 0) {
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
        body: JSON.stringify({
          title: `Follow up: ${deal.name}`,
          body: `Stage: ${deal.stage}${deal.phone ? ' · ' + deal.phone : ''} — time to reach out!`,
        }),
      }).catch(() => {})
    )
    await Promise.all(pushPromises)

    // Send a single summary email
    const dealList = deals.map(d => `• ${d.name} (${d.industry ?? 'unknown'}) — Stage: ${d.stage}${d.phone ? ', ' + d.phone : ''}`).join('\n')
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
