import { NextResponse } from 'next/server'

// Domains that turn up in Google results for a business but aren't the business's
// own website — a hit on Google Maps only means "no website field on their Maps
// listing," which can be wrong or stale. This route runs an actual Google search
// to confirm that before trusting a prospect as a real "no website" lead.
const EXCLUDE_DOMAINS = [
  'facebook.com', 'instagram.com', 'twitter.com', 'x.com', 'linkedin.com',
  'google.com', 'maps.google.com', 'goo.gl', 'yelp.com', 'tripadvisor.com',
  'jiji.com.gh', 'ghanayello.com', 'yellowpages.com.gh', 'wikipedia.org',
  'youtube.com', 'tiktok.com', 'whatsapp.com', 'wa.me', 'jumia.com.gh',
  'foursquare.com', 'bing.com', 'yandex.com', 'pinterest.com', 'yellowpagesghana.com',
]

function extractDomain(url: string): string {
  try { return new URL(url).hostname.replace(/^www\./, '') } catch { return '' }
}

function isRealSite(domain: string): boolean {
  if (!domain) return false
  return !EXCLUDE_DOMAINS.some(d => domain === d || domain.endsWith('.' + d))
}

export async function POST(req: Request) {
  const key = process.env.SERPAPI_KEY
  if (!key) return NextResponse.json({ error: 'SERPAPI_KEY not set' }, { status: 503 })

  try {
    const { name, hint } = await req.json()
    if (!name) return NextResponse.json({ error: 'name required' }, { status: 400 })

    const q = [name, hint, 'Ghana'].filter(Boolean).join(' ')
    const params = new URLSearchParams({
      engine: 'google', q, hl: 'en', gl: 'gh', num: '10', api_key: key,
    })
    const res = await fetch(`https://serpapi.com/search.json?${params}`, { signal: AbortSignal.timeout(15000) })
    if (!res.ok) return NextResponse.json({ error: `SerpAPI error: HTTP ${res.status}` }, { status: 502 })

    const data = await res.json() as { organic_results?: Array<{ link?: string }> }
    const results = data.organic_results ?? []

    const siteHit = results.find(r => r.link && isRealSite(extractDomain(r.link)))

    if (siteHit?.link) {
      return NextResponse.json({ verdict: 'found_site', url: siteHit.link, checkedAt: Date.now() })
    }
    if (results.length === 0) {
      return NextResponse.json({ verdict: 'unclear', checkedAt: Date.now() })
    }
    return NextResponse.json({ verdict: 'confirmed_no_site', checkedAt: Date.now() })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Unknown' }, { status: 500 })
  }
}
