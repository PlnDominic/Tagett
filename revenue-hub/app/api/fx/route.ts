import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// Daily rates against GHS from open.er-api.com (free, no key, updated once a
// day). Cached in memory for 12 hours so converting deal values doesn't call
// out every time; a failed fetch falls back to the last good rates.
const TTL_MS = 12 * 60 * 60 * 1000
let cache: { at: number; rates: Record<string, number>; updated: string } | null = null

export async function GET() {
  if (cache && Date.now() - cache.at < TTL_MS) return NextResponse.json({ base: 'GHS', rates: cache.rates, updated: cache.updated })
  try {
    const res = await fetch('https://open.er-api.com/v6/latest/GHS', { signal: AbortSignal.timeout(10000) })
    const data = await res.json() as { result?: string; rates?: Record<string, number>; time_last_update_utc?: string }
    if (data.result !== 'success' || !data.rates) throw new Error('rates unavailable')
    cache = { at: Date.now(), rates: data.rates, updated: data.time_last_update_utc ?? '' }
    return NextResponse.json({ base: 'GHS', rates: cache.rates, updated: cache.updated })
  } catch {
    if (cache) return NextResponse.json({ base: 'GHS', rates: cache.rates, updated: cache.updated, stale: true })
    return NextResponse.json({ error: 'Exchange rates are unavailable right now' }, { status: 503 })
  }
}
