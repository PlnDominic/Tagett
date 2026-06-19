import { NextRequest, NextResponse } from 'next/server'
import webpush from 'web-push'

const KV_URL = process.env.UPSTASH_REDIS_REST_URL
const KV_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN

async function kvGet(key: string): Promise<string | null> {
  if (!KV_URL || !KV_TOKEN) return null
  const res = await fetch(`${KV_URL}/get/${key}`, {
    headers: { Authorization: `Bearer ${KV_TOKEN}` },
  })
  const data = await res.json()
  return data.result ?? null
}

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

  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT!,
    process.env.VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!,
  )

  const raw = await kvGet('push_subscription')
  if (!raw) {
    return NextResponse.json({ error: 'No push subscription saved.' }, { status: 404 })
  }

  const subscription = JSON.parse(raw)
  await webpush.sendNotification(subscription, JSON.stringify(payload))
  return NextResponse.json({ success: true })
}
