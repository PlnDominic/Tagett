import { NextRequest, NextResponse } from 'next/server'
import { lookupPlaces, pickProspectPlace, GeoNamesError } from '@/lib/places'
import { marketFor } from '@/lib/markets'

export const dynamic = 'force-dynamic'

// Place lookup for the Find Prospects field.
//
// GEONAMES_USERNAME is server-side only, so the browser cannot call GeoNames
// directly — this route is what puts the full gazetteer (every town, village
// and hamlet) behind the place input instead of a hardcoded list of metros.
//
// ?random=1 returns one weighted long-tail pick, the same selection the
// nightly cron uses, so the small places are reachable by a single click
// rather than only by already knowing a name to type.
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const country = searchParams.get('country') ?? 'Ghana'
  const market = marketFor(country)

  try {
    if (searchParams.get('random')) {
      const place = await pickProspectPlace(market.iso2)
      return NextResponse.json(place ? [place] : [])
    }

    const q = searchParams.get('q') ?? ''
    return NextResponse.json(await lookupPlaces(market.iso2, q))
  } catch (err) {
    // A misconfigured or exhausted GeoNames key must not look like "this
    // country has no towns" — the UI needs to say why the list is empty.
    const message = err instanceof GeoNamesError ? err.message : 'Place lookup failed'
    console.error('[places/search]', message)
    return NextResponse.json({ error: message }, { status: 502 })
  }
}
