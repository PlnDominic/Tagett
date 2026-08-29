// Shared logic for business-directory lead search (Brownbook, Yell, and any
// future site of the same shape). Both directories were fetched directly at
// first (for their clean structured page data) and both got blocked from
// Vercel's network — Brownbook with a flat 403 on every request (confirmed
// by hand, IP-range blocking by a WAF, not a header-fingerprint issue), Yell
// even more aggressively (Cloudflare challenges robots.txt itself, from
// every network tested). Neither is worth working around with a proxy for a
// directory lookup, so both are found the same way instead: a real Google
// search via SerpAPI (that request goes to serpapi.com, never directly to
// the target site, so it's never blocked), parsing whatever Google's own
// indexed snippet contains.

export interface DirectoryResult {
  id: string
  name: string
  address: string
  phone?: string
  email?: string
  website?: string
  hasWebsite: boolean
  mapsUrl: string
  source: 'brownbook' | 'yell'
}

// A phone candidate is filtered by digit count, not just regex shape — a
// street number ("147-149") or postal district ("M19") matches the same
// loose digit/punctuation pattern as a real phone number, but a genuine one
// runs 9+ digits once punctuation is stripped and those never do. Verified
// against real production responses for both sites before settling on 9.
const PHONE_CANDIDATE_RE = /\+?\d[\d\-\s()]{5,}\d/g
const MIN_PHONE_DIGITS = 9
const EMAIL_RE = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/

export function findPhone(text: string): { phone: string; index: number } | undefined {
  for (const m of text.matchAll(PHONE_CANDIDATE_RE)) {
    if ((m[0].match(/\d/g) ?? []).length >= MIN_PHONE_DIGITS) return { phone: m[0].trim(), index: m.index ?? 0 }
  }
  return undefined
}

export function findEmail(text: string): string | undefined {
  return text.match(EMAIL_RE)?.[0]
}

// Brownbook's snippet is a clean, structured directory line — either its own
// meta description ("Business profile: NAME, street, city, region, GB,
// postcode, category.") or an excerpt of the page's own visible text
// ("NAME. street, city, region, postcode. phone. Share Edit listing. ...").
// Both were verified against real production responses.
export function parseBrownbookListing(id: string, title: string, link: string, snippet: string): DirectoryResult | null {
  const text = (snippet || '').trim()
  if (!text) return null

  let name = ''
  let rest = text
  const profileMatch = text.match(/^Business profile:\s*([^,]+),\s*(.+)$/i)
  const sentenceMatch = text.match(/^([^.]+)\.\s*(.+)$/)
  if (profileMatch) {
    name = profileMatch[1].trim()
    rest = profileMatch[2]
  } else if (sentenceMatch && sentenceMatch[1].length < 80) {
    name = sentenceMatch[1].trim()
    rest = sentenceMatch[2]
  } else {
    name = title.split(/\s{2,}/)[0].trim()
  }
  if (!name) return null

  const found = findPhone(rest)
  let address = found ? rest.slice(0, found.index).trim() : rest.trim()
  address = address.replace(/Share Edit listing.*$/i, '').replace(/\.\s*$/, '').trim()

  return { id, name, address, phone: found?.phone, email: findEmail(text), website: undefined, hasWebsite: false, mapsUrl: link, source: 'brownbook' }
}

// Yell's snippet is marketing copy, not a structured directory line — e.g.
// "Give us a call now on 0161 825 9524 and our operators can arrange..." or
// "220 Kingsway, Manchester, M19. Simply call or message us... 07500002379".
// There's no reliable field boundary to split on, so the name comes from the
// search result title (which reliably leads with the business name — Yell's
// own <title> convention), and the whole snippet is kept as loose context
// text (with any phone number stripped out into its own field) rather than
// pretending it's a clean postal address the way Brownbook's is.
export function parseYellListing(id: string, title: string, link: string, snippet: string): DirectoryResult | null {
  const name = title.split(/\s*[|–-]\s*/)[0].trim()
  if (!name) return null
  const text = (snippet || '').trim()

  const found = findPhone(text)
  const context = (found ? (text.slice(0, found.index) + ' ' + text.slice(found.index + found.phone.length)) : text)
    .replace(/\s+/g, ' ')
    .trim()

  return { id, name, address: context, phone: found?.phone, email: findEmail(text), website: undefined, hasWebsite: false, mapsUrl: link, source: 'yell' }
}
