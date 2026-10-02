// ─── Price list ───────────────────────────────────────────────────────────────
// The one place service prices live. ContentBot, ProjectBot, RevenueTracker,
// ProspectBot and proposal pages all read from here; before, three bots each
// had their own typed-in GHS list and the market settings had a fourth figure
// for a website, so quotes disagreed and nothing covered markets abroad.
//
// Ghana prices are set by hand in GHS. Other markets are scaled from each
// market's typical small-business website budget (Market.budget), using the
// same ratio between services as in Ghana, so a market where a website runs
// £1,500–4,000 gets web apps, mobile apps and so on priced to match.

import { MARKETS, marketFor, type Market } from '@/lib/markets'

export interface Service {
  id: 'web' | 'webapp' | 'mobile' | 'software' | 'gis'
  label: string
  /** Low and high price in GHS, for Ghana. */
  ghs: [number, number]
}

export const SERVICES: Service[] = [
  { id: 'web', label: 'Web design & development', ghs: [3500, 4000] },
  { id: 'webapp', label: 'Web applications', ghs: [8000, 25000] },
  { id: 'mobile', label: 'Mobile apps (iOS/Android)', ghs: [10000, 30000] },
  { id: 'software', label: 'Business software & automation', ghs: [15000, 40000] },
  { id: 'gis', label: 'GIS solutions', ghs: [3000, 10000] },
]

function parseRange(budget: string): [number, number] {
  const nums = budget.replace(/,/g, '').match(/\d+/g)?.map(Number) ?? []
  return [nums[0] ?? 0, nums[1] ?? nums[0] ?? 0]
}

/** Rounds to two significant figures so scaled prices read like prices. */
function nice(n: number): number {
  if (n <= 0) return 0
  const step = Math.pow(10, Math.max(1, Math.floor(Math.log10(n)) - 1))
  return Math.round(n / step) * step
}

/** Low and high price for a service in a market's own currency. */
export function priceRange(serviceId: Service['id'], market: Market): [number, number] {
  const service = SERVICES.find(s => s.id === serviceId)!
  if (market.country === MARKETS[0].country) return service.ghs
  const [webLo, webHi] = SERVICES[0].ghs
  const [lo, hi] = parseRange(market.budget)
  return [nice(service.ghs[0] * lo / webLo), nice(service.ghs[1] * hi / webHi)]
}

/** An amount written the way the market reads it: "GHS 3,500", "£1,500", "KSh 30,000". */
export function money(market: Market, amount: number): string {
  const n = Math.round(amount).toLocaleString('en-GB')
  if (market.currency === 'GHS') return `GHS ${n}`
  return /^\p{L}+$/u.test(market.currency) ? `${market.currency} ${n}` : `${market.currency}${n}`
}

export function priceListText(market: Market): string {
  return SERVICES.map(s => {
    const [lo, hi] = priceRange(s.id, market)
    return `  - ${s.label}: ${money(market, lo)}–${money(market, hi).replace(/^[^\d]+/, '')}`
  }).join('\n')
}

/** Prompt block with the price list for each market given (Ghana always included). */
export function buildPriceBlock(countries: string[]): string {
  const markets = [...new Set([MARKETS[0].country, ...countries])].map(c => marketFor(c))
  return `PRICE LIST (the only prices to quote; use the client's own market and currency):\n${
    markets.map(m => `${m.country} (${m.currency}):\n${priceListText(m)}`).join('\n')
  }`
}
