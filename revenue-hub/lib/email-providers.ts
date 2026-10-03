// Email-finder services with free monthly allowances, tried in turn for a
// lead with a website when its own pages don't show an address. Each one is
// optional: it runs only when its key is set in Vercel. They search by
// domain, so they can't help a business without a website.

import { emailsFromProfile } from './email-sources'

export interface ProviderEmail { email: string; confidence: 'high' | 'low'; source: string; reason: string }

type Provider = { name: string; configured: () => boolean; find: (domain: string) => Promise<ProviderEmail[]> }

/** A generic inbox (info@, hello@) is the right first contact; named people after. */
function preferGeneric(emails: string[]): string[] {
  const generic = /^(info|hello|contact|enquiries|inquiries|office|mail|admin|team|sales|bookings|reservations|kontakt|post|bonjour|ciao|hola)@/
  return [...emails].sort((a, b) => Number(generic.test(b)) - Number(generic.test(a)))
}

function onDomain(emails: string[], domain: string): string[] {
  const root = domain.replace(/^www\./, '').toLowerCase()
  return emails.filter(e => e.endsWith('@' + root) || e.endsWith('.' + root))
}

const hunter: Provider = {
  name: 'Hunter.io',
  configured: () => !!process.env.HUNTER_API_KEY?.trim(),
  async find(domain) {
    const res = await fetch(`https://api.hunter.io/v2/domain-search?${new URLSearchParams({ domain, limit: '5', api_key: process.env.HUNTER_API_KEY!.trim() })}`, { signal: AbortSignal.timeout(10000) })
    if (!res.ok) return []
    const data = await res.json() as { data?: { emails?: Array<{ value?: string; type?: string; confidence?: number }> } }
    return (data.data?.emails ?? [])
      .filter(e => e.value)
      .sort((a, b) => Number(b.type === 'generic') - Number(a.type === 'generic') || (b.confidence ?? 0) - (a.confidence ?? 0))
      .slice(0, 2)
      .map(e => ({ email: e.value!.toLowerCase(), confidence: (e.confidence ?? 0) >= 80 ? 'high' as const : 'low' as const, source: `https://hunter.io/search/${domain}`, reason: `Hunter.io knows this address at ${domain}${e.confidence ? ` (${e.confidence}% confidence)` : ''}` }))
  },
}

const tomba: Provider = {
  name: 'Tomba.io',
  configured: () => !!process.env.TOMBA_KEY?.trim() && !!process.env.TOMBA_SECRET?.trim(),
  async find(domain) {
    const res = await fetch(`https://api.tomba.io/v1/domain-search?${new URLSearchParams({ domain, limit: '10' })}`, {
      headers: { 'X-Tomba-Key': process.env.TOMBA_KEY!.trim(), 'X-Tomba-Secret': process.env.TOMBA_SECRET!.trim() },
      signal: AbortSignal.timeout(10000),
    })
    if (!res.ok) return []
    return preferGeneric(onDomain(emailsFromProfile(await res.json()), domain)).slice(0, 2)
      .map(email => ({ email, confidence: 'high' as const, source: `https://tomba.io/domain-search/${domain}`, reason: `Tomba.io knows this address at ${domain}` }))
  },
}

let snovToken: { value: string; until: number } | null = null
async function snovAccessToken(): Promise<string | null> {
  if (snovToken && Date.now() < snovToken.until) return snovToken.value
  const res = await fetch('https://api.snov.io/v1/oauth/access_token', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ grant_type: 'client_credentials', client_id: process.env.SNOV_CLIENT_ID!.trim(), client_secret: process.env.SNOV_CLIENT_SECRET!.trim() }),
    signal: AbortSignal.timeout(10000),
  })
  if (!res.ok) return null
  const data = await res.json() as { access_token?: string; expires_in?: number }
  if (!data.access_token) return null
  snovToken = { value: data.access_token, until: Date.now() + Math.max(60, (data.expires_in ?? 3600) - 60) * 1000 }
  return snovToken.value
}

const snov: Provider = {
  name: 'Snov.io',
  configured: () => !!process.env.SNOV_CLIENT_ID?.trim() && !!process.env.SNOV_CLIENT_SECRET?.trim(),
  async find(domain) {
    const token = await snovAccessToken()
    if (!token) return []
    const res = await fetch(`https://api.snov.io/v1/get-domain-emails-with-info?${new URLSearchParams({ access_token: token, domain, type: 'all', limit: '10' })}`, { signal: AbortSignal.timeout(15000) })
    if (!res.ok) return []
    return preferGeneric(onDomain(emailsFromProfile(await res.json()), domain)).slice(0, 2)
      .map(email => ({ email, confidence: 'high' as const, source: `https://app.snov.io/domain-search?name=${domain}`, reason: `Snov.io knows this address at ${domain}` }))
  },
}

export const EMAIL_PROVIDERS: Provider[] = [hunter, tomba, snov]

/** Tries each configured provider in turn until one finds an address on the domain. */
export async function findWithProviders(domain: string): Promise<ProviderEmail[]> {
  for (const p of EMAIL_PROVIDERS) {
    if (!p.configured()) continue
    try {
      const found = await p.find(domain)
      if (found.length) return found
    } catch { /* an optional source; try the next */ }
  }
  return []
}
