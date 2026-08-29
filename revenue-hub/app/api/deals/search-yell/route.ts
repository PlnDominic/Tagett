import { NextResponse } from 'next/server'
import { marketFor } from '@/lib/markets'
import { parseYellListing, type DirectoryResult } from '@/lib/directories'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

const KEY = process.env.SERPAPI_KEY

// See lib/directories.ts for why this parses SerpAPI's own indexed snippet
// rather than fetching yell.com directly — Yell's Cloudflare protection
// challenges even robots.txt from any network tested, direct fetch was
// never a viable option here at all.
const BUSINESS_URL_RE = /https?:\/\/(?:www\.)?yell\.com\/biz\/[a-z0-9-]+-(\d+)\/?/i

export async function POST(req: Request) {
  if (!KEY) return NextResponse.json({ error: 'SERPAPI_KEY not configured' }, { status: 500 })

  const { query, city, country } = await req.json()
  if (!query?.trim()) return NextResponse.json({ error: 'query required' }, { status: 400 })

  const market = marketFor(country)
  // "phone number" is deliberately appended: Google's plain snippet for a
  // Yell listing is usually marketing copy with no contact details at all —
  // biasing the query this way is what makes it surface the passage that
  // actually has one, verified against real production responses before
  // settling on this (a plain query returned zero phone numbers across 4
  // results; this one returned phone numbers in 2 of 3).
  const q = `site:yell.com ${query.trim()} phone number ${city?.trim() ?? ''}`.trim()
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
    const parsed = parseYellListing(m[1], r.title ?? '', r.link!, r.snippet ?? '')
    if (parsed) results.push(parsed)
    if (results.length >= 8) break
  }

  // Yell listings with a phone number found in the snippet are the useful
  // ones — a result with neither phone nor address context is nearly
  // impossible to act on, so it's sorted to the bottom rather than dropped
  // (the business is still real; worth a manual look).
  results.sort((a, b) => Number(!a.phone) - Number(!b.phone))
  return NextResponse.json(results)
}
