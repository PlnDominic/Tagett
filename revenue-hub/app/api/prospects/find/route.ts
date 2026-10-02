import { NextResponse } from 'next/server'
import { marketFor, toE164 } from '@/lib/markets'
import { prospectKey, type ProspectCandidate } from '@/lib/prospects'

// Up to 3 industries x 3 Maps pages, each a SerpAPI call of a few seconds.
export const maxDuration = 60

// ProspectBot used to have the LLM run searches and write the list itself:
// slow, ~6k tokens a request (enough to trip free-tier limits on its own),
// and free to "fill in" businesses it never found. This route does the
// finding with no LLM at all, straight from Google Maps, so every name,
// phone and address in a lead list is one Maps returned. The LLM is then
// only asked for the pitch lines (see runProspectSearch in page.tsx).

const PAGE_SIZE = 20          // Google Maps results per page
const MAX_PAGES_PER_QUERY = 3 // how deep one run digs before giving up
const TARGET = 5              // leads wanted per run

// A Facebook/Instagram page or link-in-bio is not a website: those
// businesses are still prospects, and often the warmest ones.
const SOCIAL_ONLY = /(^|\.)(facebook\.com|fb\.com|instagram\.com|wa\.me|whatsapp\.com|linktr\.ee|tiktok\.com)/i

interface MapsPlace {
  title?: string
  address?: string
  phone?: string
  website?: string
  rating?: number
  reviews?: number
  type?: string
}

export async function POST(req: Request) {
  const key = process.env.SERPAPI_KEY
  if (!key) return NextResponse.json({ error: 'SERPAPI_KEY not set' }, { status: 503 })

  const body = await req.json().catch(() => ({})) as {
    industries?: string[]; city?: string; area?: string; country?: string
    exclude?: string[]; excludeNames?: string[]; offsets?: Record<string, number>
  }
  const industries = (body.industries ?? []).map(s => s.trim()).filter(Boolean).slice(0, 3)
  const city = body.city?.trim()
  if (!industries.length || !city) return NextResponse.json({ error: 'industries and city are required' }, { status: 400 })

  const market = marketFor(body.country)
  const place = [body.area?.trim(), city].filter(Boolean).join(', ')
  // Keys of businesses already in the pipeline or shown in an earlier run,
  // plus bare pipeline names (deals often have no phone, so their key alone
  // would miss a match).
  const exclude = new Set(body.exclude ?? [])
  const excludeNames = new Set((body.excludeNames ?? []).map(n => prospectKey(n).split('|')[0]))
  const offsets: Record<string, number> = { ...(body.offsets ?? {}) }

  const found = new Map<string, ProspectCandidate>()
  let scanned = 0, withWebsite = 0, alreadyKnown = 0

  for (const industry of industries) {
    const queryKey = `${industry}|${place}|${market.country}`.toLowerCase()
    let start = offsets[queryKey] ?? 0
    for (let page = 0; page < MAX_PAGES_PER_QUERY; page++) {
      const params = new URLSearchParams({
        engine: 'google_maps', type: 'search', hl: 'en', api_key: key,
        // Country appended so "Cambridge" or "Kumasi" resolve to the right place.
        q: `${industry} ${place} ${market.country}`,
        start: String(start),
      })
      const res = await fetch(`https://serpapi.com/search.json?${params}`, { signal: AbortSignal.timeout(15000) })
      if (!res.ok) {
        if (found.size === 0 && res.status === 429) return NextResponse.json({ error: 'Out of SerpAPI searches for now' }, { status: 429 })
        break
      }
      const data = await res.json() as { local_results?: MapsPlace[] }
      const results = data.local_results ?? []
      // Remember how far this query has been read, so the next run of the
      // same search continues past these results instead of repeating them.
      start += PAGE_SIZE
      offsets[queryKey] = results.length < PAGE_SIZE ? 0 : start

      for (const r of results) {
        if (!r.title) continue
        scanned++
        const site = r.website?.trim()
        const socialOnly = site && SOCIAL_ONLY.test(site.replace(/^https?:\/\//, '')) ? site : undefined
        if (site && !socialOnly) { withWebsite++; continue }
        const phone = toE164(r.phone, market)
        const k = prospectKey(r.title, phone)
        if (exclude.has(k) || excludeNames.has(k.split('|')[0])) { alreadyKnown++; continue }
        if (found.has(k)) continue
        found.set(k, {
          key: k, name: r.title, industry, address: r.address, phone,
          rating: r.rating, reviews: r.reviews ?? 0, socialOnly, category: r.type,
        })
      }
      if (results.length < PAGE_SIZE) break // last page of this search
      if (found.size >= TARGET * 2) break     // enough to rank from
    }
  }

  // Busy first: many reviews means real foot traffic, and a busy business
  // with no website is losing the most customers online. Rating breaks ties
  // and tempers volume (a 2-star place with many reviews is a harder sell).
  const score = (c: ProspectCandidate) => Math.log10(1 + c.reviews) * ((c.rating ?? 3.5) / 5) + (c.phone ? 0.3 : 0)
  const candidates = [...found.values()].sort((a, b) => score(b) - score(a)).slice(0, TARGET)

  return NextResponse.json({ candidates, offsets, stats: { scanned, withWebsite, alreadyKnown } })
}
