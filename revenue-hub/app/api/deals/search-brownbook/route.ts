import { NextResponse } from 'next/server'
import { marketFor } from '@/lib/markets'

export const dynamic = 'force-dynamic'
// Up to ~8 sequential business-page fetches after the initial SerpAPI call —
// comfortably exceeds Vercel's 10s default. Same reasoning as the website
// publish routes (see their maxDuration comments).
export const maxDuration = 60

const KEY = process.env.SERPAPI_KEY

// brownbook.net's own robots.txt (checked before building this) fully allows
// individual /business/{id}/{slug}/ pages — it only disallows the /countries/*
// browse pages, which is exactly where a "search by industry/city" listing
// would otherwise have to be discovered. So businesses are found the same way
// the rest of this app finds anything on the open web — a real Google search
// via SerpAPI, scoped to brownbook.net — and only the explicitly allowed
// individual pages are ever fetched directly.
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

const EMAIL_RE = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g
const JUNK_EMAIL_DOMAINS = ['brownbook.net', 'example.com', 'sentry.io', 'wixpress.com', 'schema.org', 'w3.org']

function extractEmails(text: string): string[] {
  const found = text.match(EMAIL_RE) ?? []
  return [...new Set(found.map(e => e.toLowerCase()))]
    .filter(e => {
      const domain = e.split('@')[1] ?? ''
      return !JUNK_EMAIL_DOMAINS.some(d => domain === d || domain.endsWith('.' + d))
    })
}

async function fetchBusiness(url: string, diagOut?: Record<string, unknown>[]): Promise<BrownbookResult | null> {
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      signal: AbortSignal.timeout(10000),
    })
    if (!res.ok) {
      diagOut?.push({ url, status: res.status, ok: false })
      return null
    }
    const html = await res.text()
    diagOut?.push({ url, status: res.status, len: html.length, hasLdScript: html.includes('application/ld+json'), snippet: html.slice(0, 300) })

    const idMatch = url.match(/\/business\/(\d+)\//)
    const id = idMatch ? idMatch[1] : url

    // schema.org LocalBusiness JSON-LD is what actually carries structured
    // name/phone/address on every listing — see the block this route was
    // designed against.
    const ldMatch = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)
    let name = ''
    let phone: string | undefined
    let address = ''
    let ldEmail: string | undefined
    if (ldMatch) {
      try {
        const ld = JSON.parse(ldMatch[1])
        name = ld.name ?? ''
        phone = ld.telephone || undefined
        ldEmail = ld.email || undefined
        const addr = ld.address ?? ld.location
        if (addr) address = [addr.streetAddress, addr.postalCode].filter(Boolean).join(', ')
      } catch { /* malformed JSON-LD — fall through to regex below */ }
    }

    // Not every listing has an email in structured data — a mailto: link
    // elsewhere on the page is the fallback, same pattern as /api/deals/find-email.
    const mailtoMatch = html.match(/mailto:([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/)
    const email = ldEmail || mailtoMatch?.[1] || extractEmails(html)[0]

    // A listing sometimes links out to the business's real external site —
    // if so, that's a stronger prospect signal (or a disqualifier, if the
    // whole point is finding businesses WITHOUT one) than the brownbook.net
    // profile URL itself.
    const websiteMatch = html.match(/href="(https?:\/\/(?!(?:www\.)?brownbook\.net)[^"]+)"[^>]*>\s*(?:Visit website|Website|Visit site)/i)
    const website = websiteMatch?.[1]

    if (!name) return null
    return { id, name, address, phone, email, website, hasWebsite: !!website, mapsUrl: url }
  } catch {
    return null
  }
}

export async function POST(req: Request) {
  if (!KEY) return NextResponse.json({ error: 'SERPAPI_KEY not configured' }, { status: 500 })

  const { query, city, country, debug, qOverride } = await req.json()
  if (!query?.trim() && !qOverride) return NextResponse.json({ error: 'query required' }, { status: 400 })

  const market = marketFor(country)
  const q = qOverride || `site:brownbook.net/business "${query.trim()}" ${[city?.trim(), market.country].filter(Boolean).join(' ')}`
  const params = new URLSearchParams({ engine: 'google', q, hl: 'en', gl: market.gl, num: '10', api_key: KEY })

  const res = await fetch(`https://serpapi.com/search.json?${params}`, { signal: AbortSignal.timeout(15000) })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    return NextResponse.json({ error: err?.error ?? `SerpAPI ${res.status}` }, { status: 502 })
  }
  const data = await res.json()
  const links = ((data.organic_results ?? []) as Array<{ link?: string }>)
    .map(r => r.link)
    .filter((l): l is string => !!l && BUSINESS_URL_RE.test(l))
  const uniqueLinks = [...new Set(links)].slice(0, 8)

  if (uniqueLinks.length === 0) {
    if (debug) {
      const all = ((data.organic_results ?? []) as Array<{ link?: string; title?: string }>)
      return NextResponse.json({ debug: true, stage: 'no-links-matched-regex', q, totalResults: all.length, sample: all.slice(0, 10) })
    }
    return NextResponse.json([])
  }

  const diag: Record<string, unknown>[] = []
  const results = (await Promise.all(uniqueLinks.map(l => fetchBusiness(l, debug ? diag : undefined)))).filter((r): r is BrownbookResult => !!r)
  if (debug) {
    return NextResponse.json({ debug: true, stage: 'parsed', q, uniqueLinks, resultCount: results.length, results, diag })
  }

  // Prospects with no separate website and no email yet found are the
  // priority — a phone-only, no-site listing is exactly what this is for.
  results.sort((a, b) => Number(a.hasWebsite) - Number(b.hasWebsite))

  return NextResponse.json(results)
}
