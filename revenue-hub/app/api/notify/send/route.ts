import { NextRequest, NextResponse } from 'next/server'
import webpush from 'web-push'
import { getSupabase } from '@/lib/supabase'

// The browser subscribes with NEXT_PUBLIC_VAPID_PUBLIC_KEY, and the push
// service rejects any send signed with a different key — so prefer that same
// var here and only fall back to VAPID_PUBLIC_KEY. Keeping them as two separate
// env vars that could drift apart was a silent way to break every notification.
const PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? process.env.VAPID_PUBLIC_KEY
const PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY
const SUBJECT = process.env.VAPID_SUBJECT ?? 'mailto:dominickudom1738@gmail.com'

// GET — called by Vercel Cron at 08:00 UTC (8am Ghana time / GMT)
export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret) {
    const auth = req.headers.get('authorization')
    if (auth !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }
  return sendPush({
    title: '☀ Good morning, Dominic',
    body: "Your daily briefing is ready. Let's find today's prospects.",
  })
}

// POST — triggered manually from the app
export async function POST(req: NextRequest) {
  const { title, body } = await req.json().catch(() => ({}))
  return sendPush({
    title: title ?? 'Revenue Hub',
    body: body ?? 'Tap to open.',
  })
}

async function sendPush(payload: { title: string; body: string }) {
  if (!PUBLIC_KEY || !PRIVATE_KEY) {
    return NextResponse.json(
      { error: 'Set NEXT_PUBLIC_VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY in env vars.' },
      { status: 503 }
    )
  }

  let sb: ReturnType<typeof getSupabase>
  let subscriptions: { endpoint: string; subscription: unknown }[]
  try {
    sb = getSupabase()
    const { data, error } = await sb.from('push_subscriptions').select('endpoint, subscription')
    if (error) throw error
    subscriptions = data ?? []
  } catch {
    return NextResponse.json({ error: 'Could not load subscriptions from Supabase.' }, { status: 500 })
  }

  if (subscriptions.length === 0) {
    return NextResponse.json(
      { error: 'No push subscriptions saved. Open the app and tap the bell to enable notifications.' },
      { status: 404 }
    )
  }

  webpush.setVapidDetails(SUBJECT, PUBLIC_KEY, PRIVATE_KEY)

  const results = await Promise.allSettled(
    subscriptions.map(row =>
      webpush.sendNotification(
        row.subscription as webpush.PushSubscription,
        JSON.stringify(payload),
        // urgency: high asks APNs/FCM to deliver immediately instead of
        // batching — matters on iPhones in low-power states.
        { TTL: 12 * 60 * 60, urgency: 'high' }
      )
    )
  )

  const failures: { statusCode?: number; message: string }[] = []
  const goneEndpoints: string[] = []
  results.forEach((r, i) => {
    if (r.status === 'fulfilled') return
    const err = r.reason as { statusCode?: number; body?: string; message?: string }
    failures.push({ statusCode: err?.statusCode, message: err?.body?.trim() || err?.message || 'Unknown error' })
    // 404/410 mean the push service says this endpoint no longer exists
    // (uninstalled PWA, rotated iOS subscription) — drop the row so dead
    // devices stop counting as "sent to".
    if (err?.statusCode === 404 || err?.statusCode === 410) {
      goneEndpoints.push(subscriptions[i].endpoint)
    }
  })

  if (goneEndpoints.length > 0) {
    await sb.from('push_subscriptions').delete().in('endpoint', goneEndpoints).then(() => {}, () => {})
  }

  const sent = results.length - failures.length

  // Every device failed — that's an error the caller must see, not a success.
  // A VAPID key mismatch (403/400) means existing subscriptions were created
  // with a different key pair and every device must re-subscribe.
  if (sent === 0) {
    const keyMismatch = failures.some(f => f.statusCode === 403 || f.statusCode === 400)
    const detail = failures.map(f => `${f.statusCode ?? '?'}: ${f.message}`).join(' | ')
    return NextResponse.json({
      error: keyMismatch
        ? `Push rejected (VAPID key mismatch?). Turn notifications off and on again in the app to re-subscribe. Details: ${detail}`
        : `All ${results.length} push(es) failed. Details: ${detail}`,
      sent: 0,
      failed: failures.length,
      pruned: goneEndpoints.length,
    }, { status: 502 })
  }

  return NextResponse.json({ success: true, sent, failed: failures.length, pruned: goneEndpoints.length })
}
