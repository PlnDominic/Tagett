import { NextRequest, NextResponse } from 'next/server'
import webpush from 'web-push'
import { getSupabase } from '@/lib/supabase'

function configured() {
  return (
    process.env.VAPID_PUBLIC_KEY &&
    process.env.VAPID_PRIVATE_KEY &&
    process.env.VAPID_SUBJECT
  )
}

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
  if (!configured()) {
    return NextResponse.json(
      { error: 'Set VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT in env vars.' },
      { status: 503 }
    )
  }

  let subscriptions: { subscription: unknown }[]
  try {
    const sb = getSupabase()
    const { data, error } = await sb.from('push_subscriptions').select('subscription')
    if (error) throw error
    subscriptions = data ?? []
  } catch {
    return NextResponse.json({ error: 'Could not load subscriptions from Supabase.' }, { status: 500 })
  }

  if (subscriptions.length === 0) {
    return NextResponse.json({ error: 'No push subscriptions saved.' }, { status: 404 })
  }

  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT!,
    process.env.VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!,
  )

  const results = await Promise.allSettled(
    subscriptions.map(row =>
      webpush.sendNotification(
        row.subscription as webpush.PushSubscription,
        JSON.stringify(payload)
      )
    )
  )

  const sent = results.filter(r => r.status === 'fulfilled').length
  const failed = results.length - sent
  return NextResponse.json({ success: true, sent, failed })
}
