import { NextRequest, NextResponse } from 'next/server'
import { sendPush } from '@/lib/push'

// GET — called by Vercel Cron at 08:00 UTC (8am Ghana time / GMT)
export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret) {
    const auth = req.headers.get('authorization')
    if (auth !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }
  const result = await sendPush({
    title: '☀ Good morning, Dominic',
    body: "Your daily briefing is ready. Let's find today's prospects.",
  })
  return NextResponse.json(result, { status: result.status })
}

// POST — triggered manually from the app (the notification bell's
// hold-to-test gesture). Session-gated by middleware, same as every other
// non-cron route.
export async function POST(req: NextRequest) {
  const { title, body } = await req.json().catch(() => ({}))
  const result = await sendPush({
    title: title ?? 'Revenue Hub',
    body: body ?? 'Tap to open.',
  })
  return NextResponse.json(result, { status: result.status })
}
