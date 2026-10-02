import { NextResponse } from 'next/server'
import { marketFor } from '@/lib/markets'
import { MODE_PLATFORMS, REQUEST_PHRASES, THREAD_PHRASES, buildListenQuery, postRef, type ListenMode, type ListenPlatform, type Recency } from '@/lib/social-listening'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

// POST { mode, country?, recency?, phrases? } -> public posts from Google, one
// search per platform: 'requests' finds people asking for a website or
// developer on Facebook and X; 'threads' finds "comment your business" posts
// on Instagram and TikTok. country 'Anywhere' searches without a place.
export async function POST(req: Request) {
  const key = process.env.SERPAPI_KEY
  if (!key) return NextResponse.json({ error: 'SERPAPI_KEY not set' }, { status: 503 })
  const body = await req.json().catch(() => ({})) as { mode?: ListenMode; country?: string; recency?: Recency; phrases?: string[] }
  const mode: ListenMode = body.mode === 'threads' ? 'threads' : 'requests'
  const recency: Recency = body.recency === 'w' || body.recency === 'y' ? body.recency : 'm'
  const anywhere = body.country === 'Anywhere'
  const market = marketFor(anywhere ? undefined : body.country)
  const custom = (body.phrases ?? []).map(p => String(p).trim()).filter(Boolean).slice(0, 10)
  const phrases = custom.length ? custom : mode === 'requests' ? REQUEST_PHRASES : THREAD_PHRASES

  const searchOne = async (platform: ListenPlatform) => {
    const params = new URLSearchParams({
      engine: 'google',
      q: buildListenQuery(platform, phrases, anywhere ? undefined : market.country),
      hl: 'en',
      num: '20',
      tbs: `qdr:${recency}`,
      api_key: key,
    })
    if (!anywhere) params.set('gl', market.gl)
    const res = await fetch(`https://serpapi.com/search.json?${params}`, { signal: AbortSignal.timeout(20000) })
    if (res.status === 429) throw new Error('Out of SerpAPI searches for now')
    if (!res.ok) throw new Error(`Search failed (${res.status})`)
    const data = await res.json() as { organic_results?: Array<{ link?: string; title?: string; snippet?: string; date?: string }> }
    return (data.organic_results ?? []).flatMap(r => {
      const ref = r.link ? postRef(r.link) : null
      if (!ref || ref.platform !== platform) return []
      return [{ url: r.link!.split('?')[0], ...ref, title: r.title ?? '', snippet: r.snippet ?? '', date: r.date }]
    })
  }

  const settled = await Promise.allSettled(MODE_PLATFORMS[mode].map(searchOne))
  const posts = settled.flatMap(s => s.status === 'fulfilled' ? s.value : [])
  const errors = settled.flatMap(s => s.status === 'rejected' ? [s.reason instanceof Error ? s.reason.message : 'Search failed'] : [])
  if (!posts.length && errors.length) return NextResponse.json({ error: errors[0] }, { status: 502 })
  const seen = new Set<string>()
  return NextResponse.json({
    posts: posts.filter(p => !seen.has(p.url) && seen.add(p.url)),
    searchesUsed: MODE_PLATFORMS[mode].length,
    errors,
  })
}
