import { NextResponse } from 'next/server'
import { marketFor } from '@/lib/markets'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

// TEMPORARY exploration route — mirrors the debug instrumentation used to
// validate the Brownbook integration (see search-brownbook/route.ts commit
// history). Not linked from any UI or agent tool. Delete once Yell (or
// whichever site) is validated and a real dedicated route is built the same
// way search-brownbook was.
const KEY = process.env.SERPAPI_KEY

export async function POST(req: Request) {
  if (!KEY) return NextResponse.json({ error: 'SERPAPI_KEY not configured' }, { status: 500 })
  const { site, query, city, country, urlPattern } = await req.json()
  if (!site || !query) return NextResponse.json({ error: 'site and query required' }, { status: 400 })

  const market = marketFor(country)
  const q = `site:${site} ${query} ${city ?? ''}`.trim()
  const params = new URLSearchParams({ engine: 'google', q, hl: 'en', gl: market.gl, num: '10', api_key: KEY })

  const res = await fetch(`https://serpapi.com/search.json?${params}`, { signal: AbortSignal.timeout(15000) })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    return NextResponse.json({ error: err?.error ?? `SerpAPI ${res.status}` }, { status: 502 })
  }
  const data = await res.json()
  const organic = (data.organic_results ?? []) as Array<{ link?: string; title?: string; snippet?: string }>

  const re = urlPattern ? new RegExp(urlPattern, 'i') : null
  const matched = re ? organic.filter(r => r.link && re.test(r.link)) : organic

  return NextResponse.json({ q, totalResults: organic.length, matchedCount: matched.length, sample: matched.slice(0, 10), allLinks: organic.map(r => r.link) })
}
