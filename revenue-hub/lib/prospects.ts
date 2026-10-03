// Shared by the Maps prospect search (app/api/prospects/find) and the
// browser, which remembers which businesses it has already shown.

export interface ProspectCandidate {
  key: string
  name: string
  industry: string
  address?: string
  phone?: string
  rating?: number
  reviews: number
  /** The Facebook/Instagram/link page they use instead of a website. */
  socialOnly?: string
  category?: string
  /** Weak-website search: their site, and what's wrong with it. */
  website?: string
  siteIssue?: string
  siteScore?: number
}

/** Stable identity for "have we seen this business before", from name + phone digits. */
export function prospectKey(name: string, phone?: string): string {
  const n = name.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
  const p = (phone ?? '').replace(/\D/g, '').slice(-9)
  return `${n}|${p}`
}
