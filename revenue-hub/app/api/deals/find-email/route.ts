import { NextResponse } from 'next/server'

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

export async function POST(req: Request) {
  const key = process.env.SERPAPI_KEY
  if (!key) return NextResponse.json({ error: 'SERPAPI_KEY not set' }, { status: 503 })

  try {
    const { name, hint, websiteUrl } = await req.json() as { name?: string; hint?: string; websiteUrl?: string }
    if (!name) return NextResponse.json({ error: 'name required' }, { status: 400 })

    const candidates: Array<{ email: string; source: string }> = []

    // 1. If we already know their website (e.g. from the website-verification
    // check), that's the most trustworthy source — check the homepage and a
    // couple of likely contact pages directly.
    if (websiteUrl) {
      try {
        const base = new URL(websiteUrl)
        const pages = [base.toString(), new URL('/contact', base).toString(), new URL('/contact-us', base).toString(), new URL('/about', base).toString()]
        for (const page of pages) {
          const emails = await fetchPageEmails(page)
          emails.forEach(email => candidates.push({ email, source: page }))
          if (candidates.length > 0) break // stop once the homepage or contact page yields something
        }
      } catch { /* invalid URL, skip */ }
    }

    // 2. Otherwise (or in addition), run a real Google search — this is what
    // surfaces an email listed on their Facebook Page, a directory listing, a
    // press mention, or a registry entry, not just their own site.
    if (candidates.length === 0) {
      const q = [`"${name}"`, hint, 'Ghana', 'email OR contact'].filter(Boolean).join(' ')
      const params = new URLSearchParams({ engine: 'google', q, hl: 'en', gl: 'gh', num: '10', api_key: key })
      const res = await fetch(`https://serpapi.com/search.json?${params}`, { signal: AbortSignal.timeout(15000) })
      if (res.ok) {
        const data = await res.json() as { organic_results?: Array<{ link?: string; title?: string; snippet?: string }> }
        for (const r of data.organic_results ?? []) {
          const text = `${r.title ?? ''} ${r.snippet ?? ''}`
          extractEmails(text).forEach(email => candidates.push({ email, source: r.link ?? 'search snippet' }))
        }
      }
    }

    if (candidates.length === 0) {
      return NextResponse.json({ email: null, checkedAt: Date.now() })
    }

    // Prefer an address whose domain plausibly belongs to the business name
    // over a generic gmail/yahoo one, but a free-mail address is still a
    // perfectly real, usable contact for a small business — just lower priority.
    const nameTokens = name.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(t => t.length >= 4)
    const best = candidates.find(c => nameTokens.some(t => c.email.split('@')[1]?.includes(t))) ?? candidates[0]

    return NextResponse.json({ email: best.email, source: best.source, checkedAt: Date.now() })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : ((err as { message?: string })?.message ?? 'Unknown') }, { status: 500 })
  }
}
