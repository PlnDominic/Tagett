import { NextResponse } from 'next/server'

// Domains that turn up in Google results for a business but aren't the business's
// own website — a hit on Google Maps only means "no website field on their Maps
// listing," which can be wrong or stale. This route runs an actual Google search
// to confirm that before trusting a prospect as a real "no website" lead.
const EXCLUDE_DOMAINS = [
  // Social / messaging
  'facebook.com', 'instagram.com', 'twitter.com', 'x.com', 'linkedin.com',
  'youtube.com', 'tiktok.com', 'whatsapp.com', 'wa.me', 'pinterest.com',
  'linktr.ee', 'snapchat.com', 'threads.net',
  // Search engines / maps
  'google.com', 'maps.google.com', 'goo.gl', 'bing.com', 'yandex.com',
  // Directories / listings / reviews
  'yelp.com', 'tripadvisor.com', 'foursquare.com', 'jiji.com.gh',
  'ghanayello.com', 'yellowpages.com.gh', 'yellowpagesghana.com',
  'businesslist.com.gh', 'ghanabusinessdirectory.com', 'jumia.com.gh',
  'tonaton.com', 'crunchbase.com', 'glassdoor.com', 'indeed.com',
  'jobberman.com.gh', 'booking.com', 'hotels.com', 'expedia.com',
  'agoda.com', 'trivago.com', 'hotels.ng',
  // News / media (a mention in an article is not their website)
  'wikipedia.org', 'ghanaweb.com', 'modernghana.com', 'myjoyonline.com',
  'graphic.com.gh', 'citinewsroom.com', 'pulse.com.gh', 'businessghana.com',
  'ghananewsagency.org', '3news.com', 'adomonline.com', 'peacefmonline.com',
  'starrfm.com.gh', 'dailyguidenetwork.com', 'gbcghanaonline.com',
  // Document / misc hosts
  'scribd.com', 'issuu.com', 'academia.edu', 'medium.com', 'blogspot.com',
]

// Generic words that appear in many Ghanaian business names — useless for
// deciding whether a search result actually belongs to THIS business.
const GENERIC_WORDS = new Set([
  'ltd', 'limited', 'company', 'co', 'enterprise', 'enterprises', 'ventures',
  'venture', 'group', 'services', 'service', 'solutions', 'international',
  'global', 'the', 'and', 'of', 'ghana', 'gh', 'africa', 'accra', 'kumasi',
  'takoradi', 'tamale', 'tema', 'hotel', 'restaurant', 'shop', 'store',
  'school', 'clinic', 'pharmacy', 'salon', 'fashion', 'foods', 'food',
])

function extractDomain(url: string): string {
  try { return new URL(url).hostname.replace(/^www\./, '') } catch { return '' }
}

function isExcludedDomain(domain: string): boolean {
  if (!domain) return true
  return EXCLUDE_DOMAINS.some(d => domain === d || domain.endsWith('.' + d))
}

function normalize(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, '')
}

function nameTokens(name: string): string[] {
  return name.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/)
    .filter(t => t.length >= 3 && !GENERIC_WORDS.has(t))
}

// A result only counts as the business's own site when the business name shows
// up in the domain itself or in the page title. A random article, directory we
// don't know about, or an unrelated business ranking for the same keywords must
// NOT flip the verdict to "found_site" — that false positive was making every
// deal show "May have a site" by default.
function belongsToBusiness(
  result: { link: string; title: string },
  name: string,
  tokens: string[],
): boolean {
  const domain = extractDomain(result.link)
  if (isExcludedDomain(domain)) return false

  const domainBare = normalize(domain.split('.')[0])
  const fullName = normalize(name)

  // e.g. "Lavimac Royal Hotel" → lavimacroyalhotel.com, or lavimac.com
  if (domainBare.length >= 5 && fullName.includes(domainBare)) return true
  if (tokens.some(t => t.length >= 4 && domainBare.includes(t))) return true

  // Domain doesn't match — accept only if the page title clearly names the
  // business (every distinctive word of the name appears in the title).
  if (tokens.length > 0) {
    const title = normalize(result.title)
    return tokens.every(t => title.includes(t))
  }
  return false
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

    const data = await res.json() as { organic_results?: Array<{ link?: string; title?: string }> }
    const results = (data.organic_results ?? [])
      .filter((r): r is { link: string; title?: string } => !!r.link)
      .map(r => ({ link: r.link, title: r.title ?? '' }))

    if (results.length === 0) {
      return NextResponse.json({ verdict: 'unclear', checkedAt: Date.now() })
    }

    const tokens = nameTokens(name)
    const siteHit = results.find(r => belongsToBusiness(r, name, tokens))

    if (siteHit) {
      return NextResponse.json({ verdict: 'found_site', url: siteHit.link, checkedAt: Date.now() })
    }
    return NextResponse.json({ verdict: 'confirmed_no_site', checkedAt: Date.now() })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : ((err as { message?: string })?.message ?? 'Unknown') }, { status: 500 })
  }
}
