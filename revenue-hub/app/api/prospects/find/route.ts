import { NextResponse } from 'next/server'
import { findProspects, type ProspectSearchInput } from '@/lib/prospect-search'

// Up to 3 industries x 3 Maps pages, each a SerpAPI call of a few seconds.
export const maxDuration = 60

// ProspectBot used to have the LLM run searches and write the list itself:
// slow, ~6k tokens a request (enough to trip free-tier limits on its own),
// and free to "fill in" businesses it never found. The search now runs with
// no LLM at all (lib/prospect-search.ts); the LLM is only asked for the
// pitch lines (see runProspectSearch in page.tsx).
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({})) as Partial<ProspectSearchInput>
  if (!body.industries?.length || !body.city?.trim()) {
    return NextResponse.json({ error: 'industries and city are required' }, { status: 400 })
  }
  const result = await findProspects(body as ProspectSearchInput)
  if (result.error === 'no-key') return NextResponse.json({ error: 'SERPAPI_KEY not set' }, { status: 503 })
  if (result.error === 'quota') return NextResponse.json({ error: 'Out of SerpAPI searches for now' }, { status: 429 })
  if (result.error === 'failed') return NextResponse.json({ error: result.errorMessage ?? 'Google Maps search failed' }, { status: 502 })
  return NextResponse.json(result)
}
