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
  /** SerpAPI/Google `gl` region code. */
  gl: string
  /** International dialling code, including the leading '+'. */
  dialCode: string
  region: Region
  cities: string[]
  /** Local currency symbol used when drafting a quote for this market. */
  currency: string
  /** Typical small-business website budget in local currency, for pitch framing. */
  budget: string
}

export const MARKETS: Market[] = [
  {
    country: 'Ghana', gl: 'gh', dialCode: '+233', region: 'Ghana', currency: 'GHS', budget: '3,500–6,000',
    cities: ['Accra', 'Kumasi', 'Takoradi', 'Tamale', 'Cape Coast', 'Ho', 'Koforidua',
             'Sunyani', 'Techiman', 'Bolgatanga', 'Wa', 'Tema', 'Kasoa', 'Obuasi',
             'Ejisu', 'Nsawam', 'Winneba', 'Agona Swedru'],
  },
  {
    country: 'United Kingdom', gl: 'uk', dialCode: '+44', region: 'Europe', currency: '£', budget: '1,500–4,000',
    cities: ['Manchester', 'Birmingham', 'Leeds', 'Glasgow', 'Bristol', 'Nottingham',
             'Sheffield', 'Liverpool', 'Cardiff', 'Leicester'],
  },
  {
    country: 'Ireland', gl: 'ie', dialCode: '+353', region: 'Europe', currency: '€', budget: '1,500–4,000',
    cities: ['Dublin', 'Cork', 'Galway', 'Limerick', 'Waterford'],
  },
  {
    country: 'Germany', gl: 'de', dialCode: '+49', region: 'Europe', currency: '€', budget: '2,000–5,000',
    cities: ['Berlin', 'Hamburg', 'Cologne', 'Frankfurt', 'Stuttgart', 'Leipzig', 'Bremen'],
  },
  {
    country: 'Netherlands', gl: 'nl', dialCode: '+31', region: 'Europe', currency: '€', budget: '2,000–5,000',
    cities: ['Amsterdam', 'Rotterdam', 'The Hague', 'Utrecht', 'Eindhoven'],
  },
  {
    country: 'Spain', gl: 'es', dialCode: '+34', region: 'Europe', currency: '€', budget: '1,500–3,500',
    cities: ['Madrid', 'Barcelona', 'Valencia', 'Seville', 'Malaga', 'Bilbao'],
  },
  {
    country: 'United States', gl: 'us', dialCode: '+1', region: 'North America', currency: '$', budget: '2,500–6,000',
    cities: ['Houston', 'Atlanta', 'Charlotte', 'Phoenix', 'Columbus', 'Dallas',
             'Philadelphia', 'Chicago', 'Minneapolis', 'Tampa', 'Kansas City', 'Denver'],
  },
  {
    country: 'Canada', gl: 'ca', dialCode: '+1', region: 'North America', currency: 'C$', budget: '2,500–6,000',
    cities: ['Toronto', 'Calgary', 'Ottawa', 'Edmonton', 'Winnipeg', 'Hamilton', 'Mississauga'],
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
