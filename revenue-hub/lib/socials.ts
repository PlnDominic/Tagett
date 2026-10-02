// Finding a business's own social profiles among Google results. Kept pure
// (no fetch) so the matching rules are tested: a result only counts when it
// is a profile (not a post, group or event) and plainly names this business.

export type SocialNetwork = 'facebook' | 'instagram' | 'linkedin' | 'tiktok' | 'x'
export type Socials = Partial<Record<SocialNetwork, string>> & { checkedAt?: number }

export const SOCIAL_LABELS: Record<SocialNetwork, string> = {
  facebook: 'Facebook', instagram: 'Instagram', linkedin: 'LinkedIn', tiktok: 'TikTok', x: 'X',
}

// Words that say nothing about which business it is.
const GENERIC = new Set([
  'the', 'and', 'of', 'co', 'ltd', 'limited', 'llc', 'inc', 'plc', 'gmbh', 'company', 'group',
  'services', 'service', 'solutions', 'enterprise', 'enterprises', 'ventures', 'international',
])

export function nameTokens(name: string): string[] {
  return name.toLowerCase().normalize('NFKD').replace(/[^a-z0-9\s]/g, ' ').split(/\s+/)
    .filter(t => t.length >= 3 && !GENERIC.has(t))
}

/** Which network a URL is a profile on, or null for posts, groups, events and other pages. */
export function profileNetwork(url: string): SocialNetwork | null {
  let u: URL
  try { u = new URL(url) } catch { return null }
  const host = u.hostname.replace(/^(www|m|web|business|[a-z]{2})\./, '')
  const parts = u.pathname.split('/').filter(Boolean)
  if (host === 'facebook.com' || host === 'fb.com') {
    if (!parts.length || /^(posts|groups|events|photo|photos|videos|watch|share|story\.php|permalink\.php|hashtag|search|marketplace|login)/i.test(parts[0])) return null
    if (parts.length > 1 && /^(posts|videos|photos|reviews)$/i.test(parts[1])) return null
    return 'facebook'
  }
  if (host === 'instagram.com') {
    if (parts.length !== 1 || /^(p|reel|reels|explore|stories|tv|accounts)$/i.test(parts[0])) return null
    return 'instagram'
  }
  if (host === 'linkedin.com') return parts[0] === 'company' && parts[1] ? 'linkedin' : null
  if (host === 'tiktok.com') return parts.length === 1 && parts[0].startsWith('@') ? 'tiktok' : null
  if (host === 'x.com' || host === 'twitter.com') {
    if (parts.length !== 1 || /^(search|hashtag|home|explore|i|intent|share)$/i.test(parts[0])) return null
    return 'x'
  }
  return null
}

/**
 * Picks at most one profile per network from search results. A result counts
 * when every distinctive word of the business name appears in its title, or
 * in its URL (handles like facebook.com/gracepharmacykumasi run words together).
 */
export function pickSocials(name: string, results: Array<{ link?: string; title?: string }>): Socials {
  const tokens = nameTokens(name)
  const found: Socials = {}
  if (!tokens.length) return found
  for (const r of results) {
    const link = r.link ?? ''
    const network = profileNetwork(link)
    if (!network || found[network]) continue
    const title = (r.title ?? '').toLowerCase()
    const slug = link.toLowerCase().replace(/[^a-z0-9]/g, '')
    if (tokens.every(t => title.includes(t) || slug.includes(t))) found[network] = link.split('?')[0]
  }
  return found
}
