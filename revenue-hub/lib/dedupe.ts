// Keys used to tell that two deals are the same business, so two reps are never
// pointed at the same prospect. Deliberately conservative: a false match blocks
// a rep from adding a lead, so only exact phone / email / website matches count,
// plus an exact normalised name+country match.

export function phoneKey(p?: string | null): string | null {
  const d = (p ?? '').replace(/\D/g, '')
  // Compare the trailing 9 digits so 0244…, +233 244… and 233244… all match.
  return d.length >= 7 ? d.slice(-9) : null
}

export function emailKey(e?: string | null): string | null {
  const v = (e ?? '').trim().toLowerCase()
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) ? v : null
}

export function hostKey(url?: string | null): string | null {
  if (!url) return null
  try {
    const h = new URL(/^https?:\/\//i.test(url) ? url : `https://${url}`).hostname.toLowerCase().replace(/^www\./, '')
    return h.includes('.') ? h : null
  } catch { return null }
}

export function nameKey(name?: string | null, country?: string | null): string | null {
  const n = (name ?? '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').replace(/\b(ltd|limited|llc|inc|co|company|ghana|gh)\b/g, '').replace(/\s+/g, ' ').trim()
  return n.length >= 4 ? `${n}|${(country ?? '').toLowerCase()}` : null
}

export interface DedupeInput { name?: string | null; phone?: string | null; email?: string | null; websiteCheckUrl?: string | null; country?: string | null }

export function dedupeKeys(d: DedupeInput): string[] {
  return [
    phoneKey(d.phone) && `p:${phoneKey(d.phone)}`,
    emailKey(d.email) && `e:${emailKey(d.email)}`,
    hostKey(d.websiteCheckUrl) && `h:${hostKey(d.websiteCheckUrl)}`,
    nameKey(d.name, d.country) && `n:${nameKey(d.name, d.country)}`,
  ].filter((k): k is string => !!k)
}
