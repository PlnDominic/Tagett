import { NextResponse } from 'next/server'
import { findStores } from '@/lib/store-search'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

// POST { industry?, country, excludeSites?, excludeNames? } -> online stores
// in that market and the contacts each publishes on its own site.
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({})) as { industry?: string; country?: string; excludeSites?: string[]; excludeNames?: string[] }
  if (!body.country) return NextResponse.json({ error: 'country required' }, { status: 400 })
  const result = await findStores({ industry: body.industry, country: body.country, excludeSites: body.excludeSites, excludeNames: body.excludeNames })
  if (result.error === 'no-key') return NextResponse.json({ error: 'SERPAPI_KEY not set' }, { status: 503 })
  if (result.error === 'quota') return NextResponse.json({ error: 'Out of SerpAPI searches for now' }, { status: 429 })
  return NextResponse.json(result)
}
