import { NextResponse } from 'next/server'
import { marketFor } from '@/lib/markets'
import { serpApiKey } from '@/lib/serpapi'
import { apifyToken, runActor } from '@/lib/apify'
import { DIRECTORY_SITES, emailsFromProfile, isSingleListing } from '@/lib/email-sources'
import type { Socials } from '@/lib/socials'

// Social profiles are read with Apify scrapers, which take 20-40 seconds.
export const maxDuration = 60

// Addresses that show up in search results / page HTML but are never the
// business's own contact — platform noreply addresses, template/demo
// placeholders, and infrastructure vendors that get dragged in by embedded
// widgets (Sentry, Wix, GoDaddy, Cloudflare, schema.org boilerplate, etc.).
const JUNK_DOMAINS = [
  'example.com', 'example.org', 'sentry.io', 'wixpress.com', 'godaddy.com',
  'cloudflare.com', 'schema.org', 'w3.org', 'github.com', 'facebook.com',
  'google.com', 'gstatic.com', 'googlemail.com', 'privacy.icann.org',
  'whoisguard.com', 'domainsbyproxy.com', 'sentry-next.wixpress.com',
]
const JUNK_LOCAL_PARTS = ['noreply', 'no-reply', 'donotreply', 'do-not-reply', 'test', 'admin@example', 'user']

// Multi-business listing sites: a name match in the snippet doesn't mean the
// email in that same snippet belongs to THIS business — these pages list many
// businesses side by side, each with their own separate contact info, so an
// email regex match anywhere on the page is a coin flip whose it is.
const DIRECTORY_DOMAINS = [
  'jiji.com.gh', 'ghanayello.com', 'yellowpagesghana.com', 'yellowpages.com.gh',
  'businesslist.com.gh', 'ghanabusinessdirectory.com', 'tonaton.com',
  'jumia.com.gh', 'jobberman.com.gh', 'crunchbase.com',
]

const GENERIC_WORDS = new Set([
  'ltd', 'limited', 'company', 'co', 'enterprise', 'enterprises', 'ventures',
  'venture', 'group', 'services', 'service', 'solutions', 'international',
  'global', 'the', 'and', 'of', 'ghana', 'gh', 'africa', 'accra', 'kumasi',
  'takoradi', 'tamale', 'tema', 'hotel', 'restaurant', 'shop', 'store',
  'school', 'clinic', 'pharmacy', 'salon', 'fashion', 'foods', 'food',
])

const EMAIL_RE = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g

function isJunk(email: string): boolean {
  const lower = email.toLowerCase()
  const [local, domain] = lower.split('@')
  if (!domain) return true
  if (JUNK_DOMAINS.some(d => domain === d || domain.endsWith('.' + d))) return true
  if (JUNK_LOCAL_PARTS.some(p => local.includes(p))) return true
  // Filenames/hashes that happen to match the email regex shape, e.g. asset@2x.png
  if (/\.(png|jpg|jpeg|gif|svg|webp|css|js)$/i.test(lower)) return true
  return false
}

function extractEmails(text: string): string[] {
  const found = text.match(EMAIL_RE) ?? []
  return [...new Set(found.map(e => e.toLowerCase()))].filter(e => !isJunk(e))
}

function extractDomain(url: string): string {
  try { return new URL(url).hostname.replace(/^www\./, '') } catch { return '' }
}

function nameTokens(name: string): string[] {
  return name.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/)
    .filter(t => t.length >= 4 && !GENERIC_WORDS.has(t))
}

async function fetchPageEmails(url: string): Promise<string[]> {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; TagettBot/1.0; +https://ecstasytechnologies.com)' },
      signal: AbortSignal.timeout(8000),
    })
    if (!res.ok) return []
    const html = await res.text()
    return extractEmails(html)
  } catch {
    return []
  }
}

interface Candidate {
  email: string
  source: string
  confidence: 'high' | 'low'
  reason: string
}

export async function POST(req: Request) {
  const key = serpApiKey()
  if (!key) return NextResponse.json({ error: 'SERPAPI_KEY not set' }, { status: 503 })

  try {
    const { name, hint, websiteUrl, country, socials } = await req.json() as { name?: string; hint?: string; websiteUrl?: string; country?: string; socials?: Socials }
    if (!name) return NextResponse.json({ error: 'name required' }, { status: 400 })
    // Searching Google Ghana for a Manchester plumber mostly returns nothing,
    // so both the query and the result region follow the deal's market.
    const market = marketFor(country)

    const tokens = nameTokens(name)
    const candidates: Candidate[] = []

    // 1. If we already know their website (from the website-verification check,
    // which already confirmed the domain/title belongs to THIS business before
    // ever setting websiteCheckUrl), an email found there is high confidence —
    // it's their own site, not a third party's page that happens to mention them.
    if (websiteUrl) {
      try {
        const base = new URL(websiteUrl)
        const pages = [base.toString(), new URL('/contact', base).toString(), new URL('/contact-us', base).toString(), new URL('/about', base).toString()]
        for (const page of pages) {
          const emails = await fetchPageEmails(page)
          emails.forEach(email => candidates.push({ email, source: page, confidence: 'high', reason: 'found on their own verified website' }))
          if (candidates.length > 0) break // stop once the homepage or contact page yields something
        }
      } catch { /* invalid URL, skip */ }
    }

    // 1b. Hunter.io (optional, HUNTER_API_KEY; free plan 25 searches a month)
    // knows addresses on a domain that aren't printed on the site itself.
    const hunterKey = process.env.HUNTER_API_KEY?.trim()
    if (websiteUrl && hunterKey && candidates.length === 0) {
      const domain = extractDomain(websiteUrl)
      try {
        const res = await fetch(`https://api.hunter.io/v2/domain-search?${new URLSearchParams({ domain, limit: '5', api_key: hunterKey })}`, { signal: AbortSignal.timeout(10000) })
        if (res.ok) {
          const data = await res.json() as { data?: { emails?: Array<{ value?: string; type?: string; confidence?: number }> } }
          // A generic inbox (info@, hello@) is the right first contact for a
          // small business; a named person's address only if there's no other.
          const emails = (data.data?.emails ?? []).filter(e => e.value && !isJunk(e.value))
            .sort((a, b) => Number(b.type === 'generic') - Number(a.type === 'generic') || (b.confidence ?? 0) - (a.confidence ?? 0))
          emails.slice(0, 2).forEach(e => candidates.push({ email: e.value!.toLowerCase(), source: `https://hunter.io/search/${domain}`, confidence: (e.confidence ?? 0) >= 80 ? 'high' : 'low', reason: `Hunter.io knows this address at ${domain}${e.confidence ? ` (${e.confidence}% confidence)` : ''}` }))
        }
      } catch { /* optional source */ }
    }

    // 2. Otherwise, run a real Google search — this is what surfaces an email
    // listed on their Facebook Page, a directory listing, a press mention, or a
    // registry entry, not just their own site. A result only counts if its own
    // title/link plausibly names THIS business — otherwise an email regex match
    // anywhere in the snippet could belong to an unrelated business or the page
    // author, not our prospect.
    if (candidates.length === 0 && tokens.length > 0) {
      const q = [`"${name}"`, hint, market.country, 'email OR contact'].filter(Boolean).join(' ')
      const params = new URLSearchParams({ engine: 'google', q, hl: 'en', gl: market.gl, num: '10', api_key: key })
      const res = await fetch(`https://serpapi.com/search.json?${params}`, { signal: AbortSignal.timeout(15000) })
      if (res.ok) {
        const data = await res.json() as { organic_results?: Array<{ link?: string; title?: string; snippet?: string }> }
        for (const r of data.organic_results ?? []) {
          const link = r.link ?? ''
          const domain = extractDomain(link)
          const title = (r.title ?? '').toLowerCase()
          const titleNamesBusiness = tokens.every(t => title.includes(t))
          if (!titleNamesBusiness) continue // result isn't clearly *about* this business — skip its emails entirely

          const isDirectory = DIRECTORY_DOMAINS.some(d => domain === d || domain.endsWith('.' + d))
          const text = `${r.title ?? ''} ${r.snippet ?? ''}`
          extractEmails(text).forEach(email => {
            const emailDomain = email.split('@')[1] ?? ''
            const emailMatchesName = tokens.some(t => emailDomain.includes(t))
            candidates.push({
              email,
              source: link || 'search result',
              confidence: emailMatchesName && !isDirectory ? 'high' : 'low',
              reason: isDirectory
                ? 'from a business directory listing — may belong to a different business on the same page, verify before using'
                : emailMatchesName
                  ? 'email domain matches the business name'
                  : `found alongside "${name}" in a search result, but the address itself doesn't clearly belong to them — verify before using`,
            })
          })
        }
      }
    }

    // 2b. The market's own business directories. Abroad, a business with no
    // website often still lists an email on Yell, Yelp, Gelbe Seiten and the
    // like. Only a page about this one business counts, not a search page.
    const directories = DIRECTORY_SITES[market.country] ?? []
    if (!candidates.some(c => c.confidence === 'high') && tokens.length > 0 && directories.length) {
      const q = `"${name}" (${directories.map(d => `site:${d}`).join(' OR ')})`
      const params = new URLSearchParams({ engine: 'google', q, hl: 'en', gl: market.gl, num: '10', api_key: key })
      const res = await fetch(`https://serpapi.com/search.json?${params}`, { signal: AbortSignal.timeout(15000) }).catch(() => null)
      if (res?.ok) {
        const data = await res.json() as { organic_results?: Array<{ link?: string; title?: string; snippet?: string }> }
        for (const r of data.organic_results ?? []) {
          const link = r.link ?? ''
          const site = directories.find(d => extractDomain(link) === d || extractDomain(link).endsWith('.' + d))
          if (!site || !isSingleListing(link)) continue
          if (!tokens.every(t => (r.title ?? '').toLowerCase().includes(t))) continue
          extractEmails(`${r.title ?? ''} ${r.snippet ?? ''}`).forEach(email => candidates.push({
            email, source: link, confidence: 'high', reason: `listed on their ${site} page`,
          }))
        }
      }
    }

    // 3. Businesses without a website usually have a Facebook Page instead, and
    // Google's snippet of that page often carries the email from its About
    // section. A snippet from the business's own Page is far more trustworthy
    // than one from a post, group or event that merely mentions them.
    let facebookUrl: string | undefined
    if (!candidates.some(c => c.confidence === 'high') && tokens.length > 0) {
      // No industry hint here: the quoted name already narrows it, and a Page
      // rarely repeats the category words we stored, so they only lose matches.
      const q = `site:facebook.com "${name}"`
      const params = new URLSearchParams({ engine: 'google', q, hl: 'en', gl: market.gl, num: '10', api_key: key })
      const res = await fetch(`https://serpapi.com/search.json?${params}`, { signal: AbortSignal.timeout(15000) })
      if (res.ok) {
        const data = await res.json() as { organic_results?: Array<{ link?: string; title?: string; snippet?: string }> }
        for (const r of data.organic_results ?? []) {
          const link = r.link ?? ''
          if (!/(^|\.)facebook\.com$/.test(extractDomain(link))) continue
          const title = (r.title ?? '').toLowerCase()
          if (!tokens.every(t => title.includes(t))) continue

          const isOwnPage = !/\/(posts|groups|events|photos|videos|story|permalink|share)/i.test(link)
          if (isOwnPage && !facebookUrl) facebookUrl = link
          extractEmails(`${r.title ?? ''} ${r.snippet ?? ''}`).forEach(email => {
            candidates.push({
              email,
              source: link,
              confidence: isOwnPage ? 'high' : 'low',
              reason: isOwnPage
                ? 'listed on their Facebook Page'
                : `found in a Facebook post mentioning "${name}", may not be their own address, verify before using`,
            })
          })
        }
      }
    }

    // 4. Google rarely shows a Page's contact email in its snippet, but the
    // Page and an Instagram business profile list it in their contact info.
    // Read them directly with Apify (optional, APIFY_TOKEN), using the
    // profiles Find socials saved, or the Page the search above found.
    const fbPage = socials?.facebook ?? facebookUrl
    const igHandle = socials?.instagram?.replace(/\/+$/, '').split('/').pop()
    if (!candidates.some(c => c.confidence === 'high') && apifyToken() && (fbPage || igHandle)) {
      const runs = await Promise.allSettled([
        fbPage ? runActor('apify~facebook-pages-scraper', { startUrls: [{ url: fbPage }] }, 40) : Promise.resolve([]),
        igHandle ? runActor('apify~instagram-profile-scraper', { usernames: [igHandle] }, 40) : Promise.resolve([]),
      ])
      runs.forEach((run, i) => {
        if (run.status !== 'fulfilled') return
        run.value.flatMap(emailsFromProfile).slice(0, 2).forEach(email => candidates.push({
          email,
          source: i === 0 ? fbPage! : `https://www.instagram.com/${igHandle}`,
          confidence: 'high',
          reason: i === 0 ? 'in the contact info of their Facebook Page' : 'on their Instagram business profile',
        }))
      })
    }

    // 5. Outscraper (optional, OUTSCRAPER_API_KEY) crawls a site or Page for
    // contacts, as a last resort when nothing above found one.
    const outscraperKey = process.env.OUTSCRAPER_API_KEY?.trim()
    const crawlTarget = websiteUrl ?? fbPage
    if (!candidates.some(c => c.confidence === 'high') && outscraperKey && crawlTarget) {
      try {
        const res = await fetch(`https://api.app.outscraper.com/emails-and-contacts?${new URLSearchParams({ query: crawlTarget, async: 'false' })}`, {
          headers: { 'X-API-KEY': outscraperKey }, signal: AbortSignal.timeout(30000),
        })
        if (res.ok) {
          emailsFromProfile(await res.json()).filter(e => !isJunk(e)).slice(0, 2).forEach(email => candidates.push({
            email, source: crawlTarget, confidence: 'high', reason: `found by Outscraper on ${websiteUrl ? 'their website' : 'their Facebook Page'}`,
          }))
        }
      } catch { /* optional source */ }
    }

    if (candidates.length === 0) {
      return NextResponse.json({ email: null, facebookUrl, checkedAt: Date.now() })
    }

    // Prefer a high-confidence match; among ties, prefer one whose domain
    // matches the business name over a generic gmail/yahoo one.
    const best =
      candidates.find(c => c.confidence === 'high') ??
      candidates[0]

    return NextResponse.json({
      email: best.email,
      source: best.source,
      confidence: best.confidence,
      reason: best.reason,
      facebookUrl,
      checkedAt: Date.now(),
    })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : ((err as { message?: string })?.message ?? 'Unknown') }, { status: 500 })
  }
}
