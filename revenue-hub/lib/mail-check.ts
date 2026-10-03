// A free check that an address's domain can receive email at all, before a
// message is sent or an address is offered: its DNS must list a mail server
// (MX), or at least resolve, which mail servers fall back to. A bounce costs
// the sending domain's reputation, which is what keeps outreach out of spam.

import { promises as dns } from 'dns'

const cache = new Map<string, { at: number; ok: boolean }>()
const TTL_MS = 6 * 60 * 60 * 1000
// The big free providers always accept mail; no need to look them up.
const KNOWN_GOOD = /^(gmail|googlemail|yahoo|ymail|outlook|hotmail|live|msn|icloud|me|aol|proton|protonmail|gmx|web|mail|zoho)\.[a-z.]+$/i

export async function domainAcceptsMail(domain: string): Promise<boolean> {
  const d = domain.trim().toLowerCase()
  if (!d || !d.includes('.')) return false
  if (KNOWN_GOOD.test(d)) return true
  const hit = cache.get(d)
  if (hit && Date.now() - hit.at < TTL_MS) return hit.ok
  let ok: boolean
  try {
    const mx = await dns.resolveMx(d)
    ok = mx.some(r => r.exchange && r.exchange !== '.')
  } catch (err) {
    const code = (err as { code?: string }).code
    if (code === 'ENOTFOUND' || code === 'ENODATA') {
      // No MX: mail falls back to the domain's own address, if it has one.
      ok = await dns.resolve4(d).then(a => a.length > 0, () => false)
    } else {
      // A DNS hiccup is not proof the address is bad; don't block on it.
      return true
    }
  }
  cache.set(d, { at: Date.now(), ok })
  return ok
}

export async function emailAcceptsMail(email: string): Promise<boolean> {
  return domainAcceptsMail(email.split('@')[1] ?? '')
}
