// Google Maps prospect search, shared by the ProspectBot start screen
// (app/api/prospects/find) and the 3am run (app/api/agents/run). No LLM is
// involved: every name, phone and address in a lead list is one Maps
// returned, which is what makes the leads trustworthy and the search cheap.
import { marketFor, toE164 } from '@/lib/markets'
import { prospectKey, type ProspectCandidate } from '@/lib/prospects'

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

export interface ProspectSearchInput {
  industries: string[]
  city: string
  area?: string
  country?: string
  /** prospectKey()s of businesses already in the pipeline or shown before. */
  exclude?: string[]
  /** Pipeline names, for deals saved without a phone. */
  excludeNames?: string[]
  /** How far each search has been read, keyed by query; returned updated. */
  offsets?: Record<string, number>
}

export interface ProspectSearchResult {
  candidates: ProspectCandidate[]
  offsets: Record<string, number>
  stats: { scanned: number; withWebsite: number; alreadyKnown: number }
  /** Set when SerpAPI refused before anything was found. */
  error?: 'quota' | 'no-key'
}

export async function findProspects(input: ProspectSearchInput): Promise<ProspectSearchResult> {
  const key = process.env.SERPAPI_KEY
  const empty = { candidates: [], offsets: input.offsets ?? {}, stats: { scanned: 0, withWebsite: 0, alreadyKnown: 0 } }
  if (!key) return { ...empty, error: 'no-key' }
  const industries = input.industries.map(s => s.trim()).filter(Boolean).slice(0, 3)
  const city = input.city.trim()
  const market = marketFor(input.country)
  const place = [input.area?.trim(), city].filter(Boolean).join(', ')
  // Keys of businesses already in the pipeline or shown in an earlier run,
  // plus bare pipeline names (deals often have no phone, so their key alone
  // would miss a match).
  const exclude = new Set(input.exclude ?? [])
  const excludeNames = new Set((input.excludeNames ?? []).map(n => prospectKey(n).split('|')[0]))
  const offsets: Record<string, number> = { ...(input.offsets ?? {}) }

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
        if (found.size === 0 && res.status === 429) return { ...empty, error: 'quota' }
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

  return { candidates, offsets, stats: { scanned, withWebsite, alreadyKnown } }
}
