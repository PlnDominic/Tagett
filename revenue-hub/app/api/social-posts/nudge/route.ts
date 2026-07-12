import { NextRequest, NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

// Vercel Cron, every Monday 8am: consistency matters more than any single post's
// quality, and nothing else in the app enforces a posting cadence. If zero posts
// (of any status — draft counts, since generating one is the hard part) were
// created in the last 7 days, nudge instead of letting the calendar go quiet.
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
    const weekAgo = Date.now() - 7 * 86400000

    const { count, error } = await sb
      .from('social_posts')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', weekAgo)
    if (error) throw error

    if ((count ?? 0) > 0) {
      return NextResponse.json({ ok: true, nudged: false, postsThisWeek: count })
    }

    await fetch(`${req.nextUrl.origin}/api/notify/send`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        title: '📅 No posts this week',
        body: 'The Social Calendar has been quiet for 7 days — generate a Status pack or an X/LinkedIn pair.',
      }),
    }).catch(() => {})

    return NextResponse.json({ ok: true, nudged: true })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : ((err as { message?: string })?.message ?? 'Unknown') }, { status: 500 })
  }
}
