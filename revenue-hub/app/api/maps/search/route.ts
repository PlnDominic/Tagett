import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const KEY = process.env.GOOGLE_MAPS_API_KEY

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
}

export async function POST(req: Request) {
  if (!KEY) return NextResponse.json({ error: 'GOOGLE_MAPS_API_KEY not configured' }, { status: 500 })

  const { query, city = 'Accra' } = await req.json()
  if (!query?.trim()) return NextResponse.json({ error: 'query required' }, { status: 400 })

  const res = await fetch('https://places.googleapis.com/v1/places:searchText', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': KEY,
      'X-Goog-FieldMask': [
        'places.id',
        'places.displayName',
        'places.formattedAddress',
        'places.nationalPhoneNumber',
        'places.websiteUri',
        'places.rating',
        'places.userRatingCount',
        'places.googleMapsUri',
        'places.businessStatus',
      ].join(','),
    },
    body: JSON.stringify({
      textQuery: `${query.trim()} ${city.trim()} Ghana`,
      languageCode: 'en',
      maxResultCount: 20,
    }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    return NextResponse.json({ error: err?.error?.message ?? `Places API ${res.status}` }, { status: 502 })
  }

  const data = await res.json()
  const places: PlaceResult[] = (data.places ?? [])
    .filter((p: Record<string, unknown>) => p.businessStatus !== 'CLOSED_PERMANENTLY')
    .map((p: Record<string, unknown>) => {
      const displayName = p.displayName as { text?: string } | undefined
      const hasWebsite = !!(p.websiteUri)
      return {
        id: p.id as string,
        name: displayName?.text ?? 'Unknown',
        address: (p.formattedAddress as string) ?? '',
        phone: (p.nationalPhoneNumber as string | undefined),
        website: (p.websiteUri as string | undefined),
        hasWebsite,
        rating: (p.rating as number | undefined),
        ratingCount: (p.userRatingCount as number | undefined),
        mapsUrl: (p.googleMapsUri as string) ?? `https://www.google.com/maps/search/${encodeURIComponent(displayName?.text ?? '')}+Ghana`,
      }
    })

  // Sort: no-website businesses first (prime prospects)
  places.sort((a, b) => Number(a.hasWebsite) - Number(b.hasWebsite))

  return NextResponse.json(places)
}
