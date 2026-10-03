// Finding the email on a business's own website, for free: the homepage,
// then the pages its own links call contact, imprint or legal notice in the
// site's language (Germany, Austria and Switzerland require an Impressum
// with an email; France a Mentions légales page), reading plain, mailto,
// "name [at] domain [dot] com", Cloudflare-protected and structured-data
// addresses.

const EMAIL_RE = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*\.[a-zA-Z]{2,}/g
const WHOLE_EMAIL = /^[a-z0-9._%+-]+@[a-z0-9-]+(?:\.[a-z0-9-]+)*\.[a-z]{2,}$/
const JUNK = /(^|\.)(example\.(com|org)|sentry\.io|wixpress\.com|godaddy\.com|cloudflare\.com|schema\.org|w3\.org|github\.com|facebook\.com|google\.com|gstatic\.com|domainsbyproxy\.com|whoisguard\.com|sentry-next\.wixpress\.com|squarespace\.com|wordpress\.(com|org)|jquery\.com)$/i
const JUNK_LOCAL = /^(noreply|no-reply|donotreply|do-not-reply|test|user|your|name|email|example|john\.?doe|jane\.?doe)$/i

export function isUsableEmail(email: string): boolean {
  const [local, domain] = email.toLowerCase().split('@')
  if (!local || !domain) return false
  if (/\.(png|jpe?g|gif|svg|webp|css|js|ico)$/.test(domain)) return false
  return !JUNK.test(domain) && !JUNK_LOCAL.test(local)
}

/** Cloudflare's email protection: hex, the first byte the XOR key. */
export function decodeCfEmail(hex: string): string {
  const key = parseInt(hex.slice(0, 2), 16)
  let out = ''
  for (let i = 2; i < hex.length; i += 2) out += String.fromCharCode(parseInt(hex.slice(i, i + 2), 16) ^ key)
  return out
}

/** Every address in a page, however it's written, cleaned and de-duplicated. */
export function extractPageEmails(html: string): string[] {
  const found: string[] = []
  // Cloudflare-protected addresses.
  for (const m of html.matchAll(/data-cfemail="([0-9a-fA-F]+)"/g)) found.push(decodeCfEmail(m[1]))
  for (const m of html.matchAll(/\/cdn-cgi\/l\/email-protection#([0-9a-fA-F]+)/g)) found.push(decodeCfEmail(m[1]))
  // mailto links, URL-encoded or not.
  for (const m of html.matchAll(/mailto:([^"'?>\s]+)/gi)) {
    try { found.push(decodeURIComponent(m[1])) } catch { found.push(m[1]) }
  }
  // Written out to dodge bots: "info [at] shop [dot] co [dot] uk", "info(at)shop.de".
  const text = html.replace(/<[^>]+>/g, ' ').replace(/&#64;|&commat;/g, '@').replace(/&#46;|&period;/g, '.').replace(/&nbsp;/g, ' ')
  const deobfuscated = text
    .replace(/\s*[[({]\s*(?:at|@)\s*[\])}]\s*/gi, '@')
    .replace(/\s*[[({]\s*(?:dot|punkt|point|punto)\s*[\])}]\s*/gi, '.')
  for (const source of [html, deobfuscated]) found.push(...(source.match(EMAIL_RE) ?? []))
  return Array.from(new Set(found.map(e => e.trim().toLowerCase().replace(/^[.\-_]+|[.\-_]+$/g, ''))))
    .filter(e => WHOLE_EMAIL.test(e) && isUsableEmail(e))
}

// Link text or paths that lead to contact details, in the markets' languages.
const CONTACT_WORDS = /contact|kontakt|impressum|imprint|legal|mentions|contacto|contatti|contato|contacten|om-oss|om oss|kontakta|about|über|ueber|uber-uns|chi-siamo|a-propos|qui-sommes|sobre|nous-contacter|get-in-touch|reach-us|find-us/i

/** Same-site links that look like contact, imprint or legal pages, best first. */
export function contactLinks(html: string, baseUrl: string, max = 4): string[] {
  let base: URL
  try { base = new URL(baseUrl) } catch { return [] }
  const links: Array<{ url: string; rank: number }> = []
  for (const m of html.matchAll(/<a\b[^>]*href=["']([^"'#]+)["'][^>]*>([\s\S]*?)<\/a>/gi)) {
    const href = m[1].trim()
    const label = m[2].replace(/<[^>]+>/g, ' ')
    if (/^(mailto|tel|javascript):/i.test(href)) continue
    if (!CONTACT_WORDS.test(href) && !CONTACT_WORDS.test(label)) continue
    let url: URL
    try { url = new URL(href, base) } catch { continue }
    if (url.hostname.replace(/^www\./, '') !== base.hostname.replace(/^www\./, '')) continue
    // Contact and imprint pages carry the email far more often than "about".
    const rank = /impressum|imprint|mentions|legal/i.test(href + label) ? 0 : /contact|kontakt|contacto|contatti|contato/i.test(href + label) ? 1 : 2
    links.push({ url: url.toString().split('#')[0], rank })
  }
  const seen = new Set<string>([base.toString()])
  return links.sort((a, b) => a.rank - b.rank).map(l => l.url).filter(u => !seen.has(u) && seen.add(u)).slice(0, max)
}

async function fetchHtml(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; TagettBot/1.0; +https://ecstasytechnologies.com)', Accept: 'text/html' },
      signal: AbortSignal.timeout(8000),
      redirect: 'follow',
    })
    if (!res.ok || !(res.headers.get('content-type') ?? 'text/html').includes('html')) return null
    return (await res.text()).slice(0, 1_500_000)
  } catch {
    return null
  }
}

/** The site's own addresses (same domain) before others, e.g. a Gmail in the footer. */
function rankByDomain(emails: string[], siteUrl: string): string[] {
  let host = ''
  try { host = new URL(siteUrl).hostname.replace(/^www\./, '') } catch { /* keep order */ }
  const root = host.split('.').slice(-2).join('.')
  return [...emails].sort((a, b) => Number(b.endsWith('@' + host) || b.endsWith('.' + root) || b.endsWith('@' + root)) - Number(a.endsWith('@' + host) || a.endsWith('.' + root) || a.endsWith('@' + root)))
}

/**
 * Crawls a business site for its email: the homepage, then up to four of its
 * own contact/imprint/legal pages (or the usual paths when it links none).
 * Returns the addresses found and the page each came from.
 */
export async function crawlSiteEmails(siteUrl: string): Promise<Array<{ email: string; page: string }>> {
  let base: URL
  try { base = new URL(/^https?:\/\//i.test(siteUrl) ? siteUrl : `https://${siteUrl}`) } catch { return [] }
  const home = await fetchHtml(base.toString())
  const results: Array<{ email: string; page: string }> = []
  if (home) extractPageEmails(home).forEach(email => results.push({ email, page: base.toString() }))
  if (results.length) return rankByDomain(results.map(r => r.email), base.toString()).map(email => results.find(r => r.email === email)!)

  const linked = home ? contactLinks(home, base.toString()) : []
  const fallbacks = ['/contact', '/contact-us', '/impressum', '/kontakt'].map(p => new URL(p, base).toString())
  const pages = (linked.length ? linked : fallbacks).slice(0, 4)
  const htmls = await Promise.all(pages.map(fetchHtml))
  htmls.forEach((html, i) => html && extractPageEmails(html).forEach(email => {
    if (!results.some(r => r.email === email)) results.push({ email, page: pages[i] })
  }))
  return rankByDomain(results.map(r => r.email), base.toString()).map(email => results.find(r => r.email === email)!)
}
