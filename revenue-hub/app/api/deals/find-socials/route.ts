import { NextResponse } from 'next/server'
import { marketFor } from '@/lib/markets'
import { pickSocials } from '@/lib/socials'

export const dynamic = 'force-dynamic'

// POST { name, hint?, country? } -> the business's Facebook, Instagram,
// LinkedIn, TikTok and X profiles, from one Google search in its own country.
export async function POST(req: Request) {
  const key = process.env.SERPAPI_KEY
  if (!key) return NextResponse.json({ error: 'SERPAPI_KEY not set' }, { status: 503 })
  const { name, hint, country } = await req.json().catch(() => ({})) as { name?: string; hint?: string; country?: string }
  if (!name?.trim()) return NextResponse.json({ error: 'name required' }, { status: 400 })

  const market = marketFor(country)
  const sites = '(site:facebook.com OR site:instagram.com OR site:linkedin.com/company OR site:tiktok.com OR site:x.com)'
  const q = [`"${name.trim()}"`, hint, market.country, sites].filter(Boolean).join(' ')
  const params = new URLSearchParams({ engine: 'google', q, hl: 'en', gl: market.gl, num: '20', api_key: key })
  try {
    const res = await fetch(`https://serpapi.com/search.json?${params}`, { signal: AbortSignal.timeout(15000) })
    if (!res.ok) return NextResponse.json({ error: res.status === 429 ? 'Out of SerpAPI searches for now' : `Search failed (${res.status})` }, { status: res.status === 429 ? 429 : 502 })
    const data = await res.json() as { organic_results?: Array<{ link?: string; title?: string }> }
    let socials = pickSocials(name, data.organic_results ?? [])
    // An industry word in the query can hide a profile that doesn't repeat
    // it; if nothing matched, try once more on the name alone.
    if (Object.keys(socials).length === 0 && hint) {
      params.set('q', [`"${name.trim()}"`, market.country, sites].join(' '))
      const retry = await fetch(`https://serpapi.com/search.json?${params}`, { signal: AbortSignal.timeout(15000) })
      if (retry.ok) socials = pickSocials(name, ((await retry.json()) as { organic_results?: Array<{ link?: string; title?: string }> }).organic_results ?? [])
    }
    return NextResponse.json({ socials: { ...socials, checkedAt: Date.now() } })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Search failed' }, { status: 500 })
  }
}
