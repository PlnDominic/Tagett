// ─── Place discovery (GeoNames) ───────────────────────────────────────────────
// Prospecting was limited to a hand-written list of ~10 cities per country,
// which is both tiny and the most competitive ground — every agency chases
// Manchester and Houston. The opportunity is the opposite end: market towns,
// villages and rural areas where a plumber or garage is far less likely to have
// a website and far less likely to be pitched.
//
// GeoNames is the gazetteer for that. Feature class P is "populated place", and
// its feature codes distinguish a capital (PPLC) from an admin seat (PPLA*)
// from an ordinary town or village (PPL, PPLX, PPLS). Filtering by population
// band is what lets us deliberately target the long tail instead of the same
// dozen cities.
//
// REST Countries cannot do this job: it returns one place per country (the
// capital) plus a country centroid — no towns, no villages, no subdivisions.

const GEONAMES_BASE = 'http://api.geonames.org'

/** Populated-place feature codes worth prospecting, coarse → fine. */
export const PLACE_CODES = {
  /** Capitals and first-order admin seats: big, saturated, most competitive. */
  major: ['PPLC', 'PPLA'],
  /** Second/third-order seats: regional towns, still substantial. */
  regional: ['PPLA2', 'PPLA3', 'PPLA4'],
  /** Ordinary towns, villages, hamlets — the underserved long tail. */
  longTail: ['PPL', 'PPLX', 'PPLS', 'PPLL', 'PPLF'],
} as const

export interface Place {
  name: string
  /** Region/state/province, e.g. "England", "Ontario". */
  admin1: string
  countryCode: string
  population: number
  /** GeoNames feature code, e.g. PPL, PPLA2. */
  fcode: string
  lat: string
  lng: string
}

export interface PlaceQuery {
  /** ISO-3166 alpha-2, e.g. 'GB', 'US'. */
  countryCode: string
  /** Cap results. GeoNames hard-limits to 1000 per request. */
  limit?: number
  /** Skip this many — lets a nightly run walk deeper into the tail over time. */
  offset?: number
  minPopulation?: number
  maxPopulation?: number
  /** Restrict to specific feature codes; defaults to every populated place. */
  fcodes?: readonly string[]
}

export class GeoNamesError extends Error {}

// GeoNames answers quota and auth problems with HTTP 200 and a status object in
// the body, so a bare res.ok check reports success on an empty result set. The
// shared "demo" account in particular is perpetually over quota. Surface these
// as real errors rather than letting a run silently prospect zero places.
function assertOk(body: { status?: { message?: string; value?: number } }) {
  const status = body?.status
  if (!status) return
  const msg = status.message ?? 'unknown GeoNames error'
  if (/limit/i.test(msg)) {
    throw new GeoNamesError(
      `GeoNames quota exhausted: ${msg} — check GEONAMES_USERNAME is your own account, not "demo", and that Free Web Services is enabled on it.`,
    )
  }
  throw new GeoNamesError(`GeoNames: ${msg}`)
}

export async function searchPlaces(q: PlaceQuery): Promise<Place[]> {
  const username = process.env.GEONAMES_USERNAME
  if (!username) {
    throw new GeoNamesError(
      'GEONAMES_USERNAME not set. Register free at geonames.org, verify the email, then enable "Free Web Services" in account settings.',
    )
  }

  const params = new URLSearchParams({
    country: q.countryCode,
    featureClass: 'P',
    maxRows: String(Math.min(q.limit ?? 200, 1000)),
    startRow: String(q.offset ?? 0),
    // Ascending population walks from the smallest villages upward — the
    // opposite of every competitor's city-first list.
    orderby: 'population',
    style: 'MEDIUM',
    username,
  })
  for (const code of q.fcodes ?? []) params.append('fcode', code)

  const res = await fetch(`${GEONAMES_BASE}/searchJSON?${params}`, {
    signal: AbortSignal.timeout(20000),
  })
  if (!res.ok) throw new GeoNamesError(`GeoNames HTTP ${res.status}`)

  const body = await res.json() as {
    status?: { message?: string; value?: number }
    geonames?: Array<Record<string, unknown>>
  }
  assertOk(body)

  const places = (body.geonames ?? []).map(g => ({
    name: String(g.name ?? ''),
    admin1: String(g.adminName1 ?? ''),
    countryCode: String(g.countryCode ?? q.countryCode),
    population: Number(g.population ?? 0),
    fcode: String(g.fcode ?? ''),
    lat: String(g.lat ?? ''),
    lng: String(g.lng ?? ''),
  })).filter(p => p.name)

  // Population filtering happens here rather than via GeoNames' own east/west
  // box params, which don't accept a population range directly.
  return places.filter(p =>
    (q.minPopulation === undefined || p.population >= q.minPopulation) &&
    (q.maxPopulation === undefined || p.population <= q.maxPopulation))
}

/**
 * Type-ahead lookup by name prefix, for the Find Prospects place field.
 *
 * Without this the UI can only offer the handful of seed cities, which means a
 * village is reachable only if the user already knows its exact name — no way
 * to browse or discover one. GeoNames' name_startsWith surfaces the real long
 * tail: "Marf" finds Marfa, Texas (pop 1,733) alongside two West Virginia
 * hamlets.
 */
export async function lookupPlaces(countryCode: string, prefix: string, limit = 12): Promise<Place[]> {
  const username = process.env.GEONAMES_USERNAME
  if (!username) throw new GeoNamesError('GEONAMES_USERNAME not set.')
  const trimmed = prefix.trim()
  if (trimmed.length < 2) return []

  const params = new URLSearchParams({
    country: countryCode,
    featureClass: 'P',
    name_startsWith: trimmed,
    maxRows: String(Math.min(limit, 50)),
    // Population-ordered so the recognisable place wins the top slot when a
    // name is shared, while the smaller ones stay visible right below it.
    orderby: 'population',
    style: 'MEDIUM',
    username,
  })

  const res = await fetch(`${GEONAMES_BASE}/searchJSON?${params}`, { signal: AbortSignal.timeout(15000) })
  if (!res.ok) throw new GeoNamesError(`GeoNames HTTP ${res.status}`)
  const body = await res.json() as {
    status?: { message?: string; value?: number }
    geonames?: Array<Record<string, unknown>>
  }
  assertOk(body)

  return (body.geonames ?? []).map(g => ({
    name: String(g.name ?? ''),
    admin1: String(g.adminName1 ?? ''),
    countryCode: String(g.countryCode ?? countryCode),
    population: Number(g.population ?? 0),
    fcode: String(g.fcode ?? ''),
    lat: String(g.lat ?? ''),
    lng: String(g.lng ?? ''),
  })).filter(p => p.name)
}

/**
 * One place to prospect, biased toward the underserved tail.
 *
 * Weighting is deliberate: small places are where businesses are least likely
 * to have a website, but a run that ONLY ever saw hamlets would miss the
 * higher-value regional towns entirely, so major centres keep a small share.
 */
export async function pickProspectPlace(countryCode: string): Promise<Place | null> {
  const roll = Math.random()
  const tier = roll < 0.6 ? PLACE_CODES.longTail
    : roll < 0.9 ? PLACE_CODES.regional
    : PLACE_CODES.major

  // Walk a random window so repeated nightly runs don't re-prospect the same
  // first page of results forever.
  const offset = Math.floor(Math.random() * 400)
  let places = await searchPlaces({ countryCode, fcodes: tier, limit: 100, offset })

  // The window can overshoot the end of the list — guaranteed for the `major`
  // tier, where a country has only a handful of capitals and admin seats.
  // Without this retry that overshoot returns nothing and the caller quietly
  // falls back to a hardcoded seed city, which is the exact behaviour this
  // whole module exists to replace.
  if (!places.length && offset > 0) {
    places = await searchPlaces({ countryCode, fcodes: tier, limit: 100, offset: 0 })
  }

  if (!places.length) return null
  return places[Math.floor(Math.random() * places.length)]
}
