import { NextResponse } from 'next/server'
import { MODE_PLATFORMS, type ListenMode, type Recency } from '@/lib/social-listening'
import { searchListenPosts } from '@/lib/social-listening-search'
import { serpApiKey } from '@/lib/serpapi'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

// POST { mode, country?, recency?, phrases? } -> public posts from Google, one
// search per platform: 'requests' finds people asking for a website or
// developer on Facebook and X; 'threads' finds "comment your business" posts
// on Instagram and TikTok. country 'Anywhere' searches without a place.
export async function POST(req: Request) {
  const key = serpApiKey()
  if (!key) return NextResponse.json({ error: 'SERPAPI_KEY not set' }, { status: 503 })
  const body = await req.json().catch(() => ({})) as { mode?: ListenMode; country?: string; recency?: Recency; phrases?: string[] }
  const mode: ListenMode = body.mode === 'threads' ? 'threads' : 'requests'
  const recency: Recency = body.recency === 'w' || body.recency === 'y' ? body.recency : 'm'
  const phrases = (body.phrases ?? []).map(p => String(p).trim()).filter(Boolean).slice(0, 10)

  const { posts, errors } = await searchListenPosts(key, { mode, country: body.country, recency, phrases })
  if (!posts.length && errors.length) return NextResponse.json({ error: errors[0] }, { status: 502 })
  return NextResponse.json({ posts, searchesUsed: MODE_PLATFORMS[mode].length, errors })
}
