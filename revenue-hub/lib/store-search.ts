// The online-store search, shared by ProspectBot and the 3am run: Google
// (through SerpAPI) for stores in the market, then each store's own pages
// for the contacts it publishes. Two SerpAPI searches per run.

import { serpApiKey } from './serpapi'
import { marketFor } from './markets'
import { prospectKey, type ProspectCandidate } from './prospects'
import { ECOMMERCE_INDUSTRIES, inspectStore, storeOrigin, storeQueries } from './store-finder'
import { emailAcceptsMail } from './mail-check'

const MAX_STORES = 10

export interface StoreSearchResult {
  candidates: ProspectCandidate[]
  industry: string
  stats: { found: number; inspected: number; withEmail: number; alreadyKnown: number }
  error?: 'no-key' | 'quota' | 'failed'
  errorMessage?: string
}

export async function findStores(input: {
  industry?: string
  country: string
  /** Websites and names already in the pipeline. */
  excludeSites?: string[]
  excludeNames?: string[]
}): Promise<StoreSearchResult> {
  const industry = input.industry && input.industry !== 'Any industry'
    ? input.industry
    : ECOMMERCE_INDUSTRIES[Math.floor(Math.random() * ECOMMERCE_INDUSTRIES.length)]
  const empty = { candidates: [], industry, stats: { found: 0, inspected: 0, withEmail: 0, alreadyKnown: 0 } }
  const key = serpApiKey()
  if (!key) return { ...empty, error: 'no-key' }
  const market = marketFor(input.country)

  const origins: string[] = []
  let refused: StoreSearchResult['error'] | undefined
  for (const q of storeQueries(industry, market.country)) {
    const params = new URLSearchParams({ engine: 'google', q, gl: market.gl, hl: 'en', num: '20', api_key: key })
    try {
      const res = await fetch(`https://serpapi.com/search.json?${params}`, { signal: AbortSignal.timeout(15000) })
      const data = await res.json().catch(() => ({})) as { organic_results?: Array<{ link?: string }>; error?: string }
      if (res.status === 429 || /run out of searches/i.test(data.error ?? '')) { refused = 'quota'; break }
      for (const r of data.organic_results ?? []) {
        const origin = r.link ? storeOrigin(r.link) : null
        if (origin && !origins.includes(origin)) origins.push(origin)
      }
    } catch { /* one query failing still leaves the other */ }
  }
  if (!origins.length && refused) return { ...empty, error: refused }

  const known = new Set((input.excludeSites ?? []).map(s => storeOrigin(s)?.replace(/^https?:\/\/(www\.)?/, '')).filter(Boolean))
  const fresh = origins.filter(o => !known.has(o.replace(/^https?:\/\/(www\.)?/, '')))
  const knownNames = new Set((input.excludeNames ?? []).map(n => prospectKey(n).split('|')[0]))
  const inspected = (await Promise.all(fresh.slice(0, MAX_STORES).map(inspectStore))).filter(s => s !== null)

  const candidates: ProspectCandidate[] = []
  let alreadyKnown = origins.length - fresh.length
  for (const s of inspected) {
    const k = prospectKey(s.name, s.phone)
    if (knownNames.has(k.split('|')[0])) { alreadyKnown++; continue }
    // Only addresses that can receive mail.
    const ok = await Promise.all(s.emails.map(e => emailAcceptsMail(e.email)))
    const emails = s.emails.filter((_, i) => ok[i])
    const business = emails.find(e => !e.personal) ?? emails[0]
    const owner = emails.find(e => e.personal && e !== business)
    candidates.push({
      key: k, name: s.name, industry, phone: s.phone, reviews: 0,
      website: s.origin, platform: s.platform,
      email: business?.email, ownerEmail: owner?.email, contactName: s.ownerName, socials: s.socials,
    })
  }
  // Stores with an email first, then those naming an owner.
  candidates.sort((a, b) => Number(!!b.email) - Number(!!a.email) || Number(!!b.contactName) - Number(!!a.contactName))
  return {
    candidates,
    industry,
    stats: { found: origins.length, inspected: inspected.length, withEmail: candidates.filter(c => c.email).length, alreadyKnown },
  }
}
