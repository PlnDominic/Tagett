// Where a business's email can be found besides its own website: each
// market's own business directories (searched through Google, so they're
// never fetched directly and never blocked), and the contact details on its
// Facebook Page or Instagram business profile (read with an Apify scraper).

/** Directories that list a business on its own page, email included, per market. */
export const DIRECTORY_SITES: Record<string, string[]> = {
  'United Kingdom': ['yell.com', 'thomsonlocal.com', 'freeindex.co.uk', 'checkatrade.com', 'scoot.co.uk'],
  'Ireland': ['goldenpages.ie', 'yell.ie'],
  'United States': ['yelp.com', 'yellowpages.com', 'bbb.org', 'manta.com'],
  'Canada': ['yellowpages.ca', 'yelp.ca', 'canpages.ca'],
  'Australia': ['yellowpages.com.au', 'truelocal.com.au', 'hotfrog.com.au'],
  'New Zealand': ['yellow.co.nz', 'finda.co.nz'],
  'Germany': ['gelbeseiten.de', 'dasoertliche.de', '11880.com'],
  'Austria': ['herold.at'],
  'Switzerland': ['local.ch', 'search.ch'],
  'France': ['pagesjaunes.fr'],
  'Belgium': ['goldenpages.be', 'pagesdor.be'],
  'Netherlands': ['detelefoongids.nl', 'telefoonboek.nl'],
  'Spain': ['paginasamarillas.es'],
  'Italy': ['paginegialle.it'],
  'Portugal': ['pai.pt'],
  'Norway': ['gulesider.no', 'proff.no'],
  'Sweden': ['hitta.se', 'eniro.se'],
  'Denmark': ['krak.dk', 'degulesider.dk'],
  'Poland': ['panoramafirm.pl', 'pkt.pl'],
  'Nigeria': ['vconnect.com', 'businesslist.com.ng', 'finelib.com'],
  'Kenya': ['businesslist.co.ke', 'yellowpageskenya.com'],
  'South Africa': ['brabys.com', 'yellosa.co.za', 'cylex.co.za'],
  'Mexico': ['seccionamarilla.com.mx'],
  'Ghana': ['businessghana.com', 'ghanayello.com'],
}

/**
 * A listing page about one business (yell.com/biz/..., yelp.com/biz/...),
 * not a search or category page that lists many, whose emails could belong
 * to any of them.
 */
export function isSingleListing(url: string): boolean {
  let u: URL
  try { u = new URL(url) } catch { return false }
  if (u.search && /[?&](q|query|search|keyword|what)=/i.test(u.search)) return false
  return !/\/(search|s|find|category|categories|results|ucs|browse|list)(\/|$)/i.test(u.pathname)
    && u.pathname.split('/').filter(Boolean).length >= 1
}

const EMAIL_RE = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*\.[a-zA-Z]{2,}/g
const PLATFORM_DOMAINS = /(^|\.)(facebook|fb|instagram|meta|apify|sentry|example|cdninstagram|fbcdn)\.(com|net|io|org)$/i

/**
 * Emails in a scraper's output for one profile: fields named like "email"
 * first (Facebook Pages give `email`, Instagram business profiles
 * `businessEmail` or `public_email`), then any address in the rest of the
 * profile, such as the bio. Platform and image addresses are dropped.
 */
export function emailsFromProfile(item: unknown): string[] {
  const named: string[] = []
  const other: string[] = []
  const walk = (value: unknown, key: string, depth: number) => {
    if (depth > 4 || value == null) return
    if (typeof value === 'string') {
      for (const m of value.match(EMAIL_RE) ?? []) (/mail/i.test(key) ? named : other).push(m.toLowerCase())
    } else if (Array.isArray(value)) {
      value.forEach(v => walk(v, key, depth + 1))
    } else if (typeof value === 'object') {
      for (const [k, v] of Object.entries(value as Record<string, unknown>)) walk(v, k, depth + 1)
    }
  }
  walk(item, '', 0)
  return Array.from(new Set([...named, ...other])).filter(e => {
    const domain = e.split('@')[1] ?? ''
    return !PLATFORM_DOMAINS.test(domain) && !/\.(png|jpe?g|gif|webp|svg)$/.test(e) && !/^(noreply|no-reply)/.test(e)
  })
}
