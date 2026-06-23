import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const KEY = process.env.SERPAPI_KEY

export interface PlaceResult {
  id: string
  name: string
  address: string
  phone?: string
  website?: string
  hasWebsite: boolean
  rating?: number
  ratingCount?: number
  mapsUrl: string
  thumbnail?: string
}

export async function POST(req: Request) {
  if (!KEY) return NextResponse.json({ error: 'SERPAPI_KEY not configured' }, { status: 500 })

  const { query, city = 'Accra' } = await req.json()
  if (!query?.trim()) return NextResponse.json({ error: 'query required' }, { status: 400 })

  const params = new URLSearchParams({
    engine: 'google_maps',
    q: `${query.trim()} ${city.trim()} Ghana`,
    type: 'search',
    hl: 'en',
    api_key: KEY,
  })

  const res = await fetch(`https://serpapi.com/search.json?${params}`)

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    return NextResponse.json({ error: err?.error ?? `SerpAPI ${res.status}` }, { status: 502 })
  }

  const data = await res.json()
  const raw: Array<Record<string, unknown>> = data.local_results ?? []

  const places: PlaceResult[] = raw.map(p => {
    const website = p.website as string | undefined
    return {
      id: (p.place_id as string) ?? String(p.position),
      name: (p.title as string) ?? 'Unknown',
      address: (p.address as string) ?? '',
      phone: p.phone as string | undefined,
      website,
      hasWebsite: !!website,
      rating: p.rating as number | undefined,
      ratingCount: p.reviews as number | undefined,
      mapsUrl: (p.link as string) ?? `https://www.google.com/maps/search/${encodeURIComponent((p.title as string) ?? '')}+Ghana`,
      thumbnail: p.thumbnail as string | undefined,
    }
  })

  // Sort: no-website businesses first (prime prospects)
  places.sort((a, b) => Number(a.hasWebsite) - Number(b.hasWebsite))

  return NextResponse.json(places)
}
