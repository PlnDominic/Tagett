import { NextResponse } from 'next/server'
import { marketFor } from '@/lib/markets'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

const KEY = process.env.SERPAPI_KEY

// Fetching individual brownbook.net business pages directly (to read their
// clean schema.org JSON-LD) was the original design and worked perfectly
// when tested from a normal network — but every single request from
// Vercel's own serverless IPs came back 403, consistently, even with
// browser-matching headers. That's IP-range blocking (a WAF fronting the
// site), not a fingerprint issue, and not something worth working around
// with a proxy for a directory lookup. So this instead parses SerpAPI's own
// indexed title/snippet for each result — that request goes to serpapi.com,
// never directly to brownbook.net, so it isn't blocked. Google's snippet
// for these pages is often the page's own visible text (name, address,
// phone), not just the meta description, so this is still genuinely
// useful, just without the JSON-LD's clean field boundaries.
const BUSINESS_URL_RE = /https?:\/\/(?:www\.)?brownbook\.net\/business\/\d+\/[a-z0-9-]+\/?/i

interface BrownbookResult {
  id: string
  name: string
  address: string
  phone?: string
  email?: string
  website?: string
  hasWebsite: boolean
  mapsUrl: string
}

// Candidate phone-shaped substrings — digits/spaces/hyphens/parens, or a
// leading "+country code". Deliberately loose at the regex level (a street
// number like "147-149" matches this shape too) because the real filter is
// the digit-count check below: a genuine phone number runs 9+ digits once
// punctuation is stripped, while a street number never does.
const PHONE_CANDIDATE_RE = /\+?\d[\d\-\s()]{5,}\d/g
const MIN_PHONE_DIGITS = 9
const EMAIL_RE = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/

function findPhone(text: string): { phone: string; index: number } | undefined {
  for (const m of text.matchAll(PHONE_CANDIDATE_RE)) {
    const digitCount = (m[0].match(/\d/g) ?? []).length
    if (digitCount >= MIN_PHONE_DIGITS) return { phone: m[0].trim(), index: m.index ?? 0 }
  }
  return undefined
}

function parseListing(title: string, link: string, snippet: string): BrownbookResult | null {
  const id = link.match(/\/business\/(\d+)\//)?.[1] ?? link
  const text = (snippet || '').trim()
  if (!text) return null

  let name = ''
  let rest = text

  // Format A — the meta-description Brownbook generates:
  // "Business profile: NAME, street, city, region, GB, postcode, category, category."
  const profileMatch = text.match(/^Business profile:\s*([^,]+),\s*(.+)$/i)
  // Format B — an excerpt of the page's own visible text:
  // "NAME. street, city, region, postcode. phone. Share Edit listing. ..."
  const sentenceMatch = text.match(/^([^.]+)\.\s*(.+)$/)

  if (profileMatch) {
    name = profileMatch[1].trim()
    rest = profileMatch[2]
  } else if (sentenceMatch && sentenceMatch[1].length < 80) {
    name = sentenceMatch[1].trim()
    rest = sentenceMatch[2]
  } else {
    // Fall back to the search result title, which usually leads with the
    // business name before the address runs on.
    name = title.split(/\s{2,}/)[0].trim()
  }
  if (!name) return null

  const found = findPhone(rest)
  const phone = found?.phone

  let address = found ? rest.slice(0, found.index).trim() : rest.trim()
  address = address.replace(/Share Edit listing.*$/i, '').replace(/\.\s*$/, '').trim()

  const emailMatch = text.match(EMAIL_RE)

  return { id, name, address, phone, email: emailMatch?.[0], website: undefined, hasWebsite: false, mapsUrl: link }
}

export async function POST(req: Request) {
  if (!KEY) return NextResponse.json({ error: 'SERPAPI_KEY not configured' }, { status: 500 })

  const { query, city, country } = await req.json()
  if (!query?.trim()) return NextResponse.json({ error: 'query required' }, { status: 400 })

  const market = marketFor(country)
  // No site:.../business path restriction or quoted phrase — both were
  // tested against SerpAPI directly and returned zero organic_results even
  // for categories with many real listings; a plain site: + keywords query
  // reliably surfaces them instead.
  const q = `site:brownbook.net ${query.trim()} ${[city?.trim(), market.country].filter(Boolean).join(' ')}`
  const params = new URLSearchParams({ engine: 'google', q, hl: 'en', gl: market.gl, num: '10', api_key: KEY })

  const res = await fetch(`https://serpapi.com/search.json?${params}`, { signal: AbortSignal.timeout(15000) })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    return NextResponse.json({ error: err?.error ?? `SerpAPI ${res.status}` }, { status: 502 })
  }
  const data = await res.json()
  const organic = (data.organic_results ?? []) as Array<{ link?: string; title?: string; snippet?: string }>

  const seen = new Set<string>()
  const results: BrownbookResult[] = []
  for (const r of organic) {
    if (!r.link || !BUSINESS_URL_RE.test(r.link) || seen.has(r.link)) continue
    seen.add(r.link)
    const parsed = parseListing(r.title ?? '', r.link, r.snippet ?? '')
    if (parsed) results.push(parsed)
    if (results.length >= 8) break
  }

  // Prospects with no separate website and no email yet found are the
  // priority — a phone-only, no-site listing is exactly what this is for.
  results.sort((a, b) => Number(a.hasWebsite) - Number(b.hasWebsite))

  return NextResponse.json(results)
}
