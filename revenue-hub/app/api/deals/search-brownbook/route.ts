import { NextResponse } from 'next/server'
import { marketFor } from '@/lib/markets'
import { parseBrownbookListing, type DirectoryResult } from '@/lib/directories'
import { serpApiKey } from '@/lib/serpapi'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

const KEY = serpApiKey()

// See lib/directories.ts for why this parses SerpAPI's own indexed snippet
// rather than fetching brownbook.net directly (a flat 403 on every request
// from Vercel, confirmed by hand — not a header-fingerprint issue).
const BUSINESS_URL_RE = /https?:\/\/(?:www\.)?brownbook\.net\/business\/(\d+)\/[a-z0-9-]+\/?/i

export async function POST(req: Request) {
  if (!KEY) return NextResponse.json({ error: 'SERPAPI_KEY not configured' }, { status: 500 })

  const { query, city, country } = await req.json()
  if (!query?.trim()) return NextResponse.json({ error: 'query required' }, { status: 400 })

  const market = marketFor(country)
  // No site:.../business path restriction, no quoted phrase, and no literal
  // country name in the query text — all three independently zeroed out
  // organic_results in production testing, even for categories with many
  // real listings. The gl param already biases region without a keyword.
  const q = `site:brownbook.net ${query.trim()} ${city?.trim() ?? ''}`.trim()
  const params = new URLSearchParams({ engine: 'google', q, hl: 'en', gl: market.gl, num: '10', api_key: KEY })

  const res = await fetch(`https://serpapi.com/search.json?${params}`, { signal: AbortSignal.timeout(15000) })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    return NextResponse.json({ error: err?.error ?? `SerpAPI ${res.status}` }, { status: 502 })
  }
  const data = await res.json()
  const organic = (data.organic_results ?? []) as Array<{ link?: string; title?: string; snippet?: string }>

  const seen = new Set<string>()
  const results: DirectoryResult[] = []
  for (const r of organic) {
    const m = r.link?.match(BUSINESS_URL_RE)
    if (!m || seen.has(r.link!)) continue
    seen.add(r.link!)
    const parsed = parseBrownbookListing(m[1], r.title ?? '', r.link!, r.snippet ?? '')
    if (parsed) results.push(parsed)
    if (results.length >= 8) break
  }

  results.sort((a, b) => Number(a.hasWebsite) - Number(b.hasWebsite))
  return NextResponse.json(results)
}
