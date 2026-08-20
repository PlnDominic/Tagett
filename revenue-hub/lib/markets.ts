// ─── Target markets ───────────────────────────────────────────────────────────
// Ecstasy Technologies sells remotely, so the prospecting surface is not limited
// to Ghana. Ghana stays the home market (local phone numbers, WhatsApp-first
// outreach, GHS pricing); Europe and North America are added because the same
// small-business website work bills at several times the Ghanaian rate there.
//
// Country matters mechanically, not just in prompt wording: Google Maps queries
// need the country appended to disambiguate city names (there is a Kumasi and a
// Cambridge in more than one country), and Google web search needs the right
// `gl` region code or results skew to the wrong market entirely.

export type Region = 'Ghana' | 'Europe' | 'North America'

export interface Market {
  country: string
  /** SerpAPI/Google `gl` region code — Google's own alias table (e.g. 'uk'). */
  gl: string
  /**
   * True ISO 3166-1 alpha-2, for GeoNames' `country` param and anything else
   * that expects the real standard rather than Google's aliases — they
   * diverge for the UK ('uk' vs 'GB') and nowhere else in this list, but
   * that one divergence is enough to make silently reusing `gl` wrong.
   */
  iso2: string
  /** International dialling code, including the leading '+'. */
  dialCode: string
  region: Region
  /**
   * A handful of well-known cities, kept only as a fallback for when
   * GEONAMES_USERNAME isn't configured or the API call fails — NOT the
   * primary place source. See lib/places.ts for the real one, which draws
   * from every town and village GeoNames knows in the country.
   */
  seedCities: string[]
  /** Local currency symbol used when drafting a quote for this market. */
  currency: string
  /** Typical small-business website budget in local currency, for pitch framing. */
  budget: string
}

export const MARKETS: Market[] = [
  {
    country: 'Ghana', gl: 'gh', iso2: 'GH', dialCode: '+233', region: 'Ghana', currency: 'GHS', budget: '3,500–6,000',
    seedCities: ['Accra', 'Kumasi', 'Takoradi', 'Tamale', 'Cape Coast', 'Ho', 'Koforidua',
             'Sunyani', 'Techiman', 'Bolgatanga', 'Wa', 'Tema', 'Kasoa', 'Obuasi',
             'Ejisu', 'Nsawam', 'Winneba', 'Agona Swedru'],
  },
  {
    country: 'United Kingdom', gl: 'uk', iso2: 'GB', dialCode: '+44', region: 'Europe', currency: '£', budget: '1,500–4,000',
    seedCities: ['Manchester', 'Birmingham', 'Leeds', 'Glasgow', 'Bristol', 'Nottingham',
             'Sheffield', 'Liverpool', 'Cardiff', 'Leicester'],
  },
  {
    country: 'Ireland', gl: 'ie', iso2: 'IE', dialCode: '+353', region: 'Europe', currency: '€', budget: '1,500–4,000',
    seedCities: ['Dublin', 'Cork', 'Galway', 'Limerick', 'Waterford'],
  },
  {
    country: 'Germany', gl: 'de', iso2: 'DE', dialCode: '+49', region: 'Europe', currency: '€', budget: '2,000–5,000',
    seedCities: ['Berlin', 'Hamburg', 'Cologne', 'Frankfurt', 'Stuttgart', 'Leipzig', 'Bremen'],
  },
  {
    country: 'Netherlands', gl: 'nl', iso2: 'NL', dialCode: '+31', region: 'Europe', currency: '€', budget: '2,000–5,000',
    seedCities: ['Amsterdam', 'Rotterdam', 'The Hague', 'Utrecht', 'Eindhoven'],
  },
  {
    country: 'Spain', gl: 'es', iso2: 'ES', dialCode: '+34', region: 'Europe', currency: '€', budget: '1,500–3,500',
    seedCities: ['Madrid', 'Barcelona', 'Valencia', 'Seville', 'Malaga', 'Bilbao'],
  },
  {
    country: 'United States', gl: 'us', iso2: 'US', dialCode: '+1', region: 'North America', currency: '$', budget: '2,500–6,000',
    seedCities: ['Houston', 'Atlanta', 'Charlotte', 'Phoenix', 'Columbus', 'Dallas',
             'Philadelphia', 'Chicago', 'Minneapolis', 'Tampa', 'Kansas City', 'Denver'],
  },
  {
    country: 'Canada', gl: 'ca', iso2: 'CA', dialCode: '+1', region: 'North America', currency: 'C$', budget: '2,500–6,000',
    seedCities: ['Toronto', 'Calgary', 'Ottawa', 'Edmonton', 'Winnipeg', 'Hamilton', 'Mississauga'],
  },
]

export const COUNTRIES = MARKETS.map(m => m.country)

export function marketFor(country: string | undefined): Market {
  if (!country) return MARKETS[0]
  const needle = country.trim().toLowerCase()
  return MARKETS.find(m => m.country.toLowerCase() === needle) ?? MARKETS[0]
}

/** Region code for Google web search; falls back to Ghana. */
export function glFor(country: string | undefined): string {
  return marketFor(country).gl
}

// The real place source is lib/places.ts (GeoNames — every town and village in
// the country, not ten hand-picked cities). Imported here, not re-exported
// from there, to keep a single fallback path: any GeoNames failure — no
// username configured yet, quota, network — degrades to a seed city instead
// of breaking the nightly run or the UI.
import { pickProspectPlace, type Place } from '@/lib/places'

export interface PickedPlace {
  name: string
  admin1: string
  /** false once GEONAMES_USERNAME is set and reachable — true means this came from the small hardcoded fallback list, not the real gazetteer. */
  isFallback: boolean
}

function randomSeedCity(m: Market): PickedPlace {
  const name = m.seedCities[Math.floor(Math.random() * m.seedCities.length)]
  return { name, admin1: '', isFallback: true }
}

export async function randomPlace(m: Market): Promise<PickedPlace> {
  try {
    const place: Place | null = await pickProspectPlace(m.iso2)
    if (!place) return randomSeedCity(m)
    return { name: place.name, admin1: place.admin1, isFallback: false }
  } catch {
    // Covers GeoNamesError (no username yet, quota) and any network failure —
    // deliberately swallowed here so callers never need their own fallback
    // logic; a prospecting run should degrade, not fail outright.
    return randomSeedCity(m)
  }
}

// Normalise a number Google Maps returned into E.164 for the market it came
// from. Prospect capture used to hardcode a leading 0 → '+233' rewrite, which
// is correct only in Ghana: a Manchester listing's "0161 496 0000" became the
// Ghanaian number +233161496000, so the deal was saved uncallable.
export function toE164(raw: string | undefined, m: Market): string | undefined {
  if (!raw) return undefined
  const trimmed = raw.replace(/[^\d+]/g, '')
  if (!trimmed) return undefined
  // Already international — Maps usually returns this form outside the US.
  if (trimmed.startsWith('+')) return trimmed
  if (trimmed.startsWith('00')) return '+' + trimmed.slice(2)
  // National trunk prefix: drop the leading 0 and apply the country's code.
  if (trimmed.startsWith('0')) return m.dialCode + trimmed.slice(1)
  // Bare national number (common for US/Canada 10-digit listings).
  return m.dialCode + trimmed
}

// Outreach differs by market in ways that change the pitch, not just the
// currency: a Ghanaian SME is reachable on WhatsApp and responds to a direct
// message, while a UK or US business expects email and a company that looks
// established before it replies. Handing this to the drafting agents keeps the
// pitch from reading as obviously foreign.
export function outreachNotes(m: Market): string {
  if (m.region === 'Ghana') {
    return 'WhatsApp-first: a direct, warm message to the business owner is normal and expected. Quote in GHS.'
  }
  return [
    `Quote in ${m.currency} (typical small-business site: ${m.currency}${m.budget}).`,
    'Email or the website contact form is the norm — a cold WhatsApp message reads as spam in this market.',
    'Lead with credibility (named past projects, clear scope, clear price) before any ask.',
    'Time zones and local spelling matter; write in the market\'s own English/language conventions.',
  ].join(' ')
}
