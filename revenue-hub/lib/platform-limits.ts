// Character limits per network, counted the way each network counts them,
// so a post is checked before it's pasted rather than rejected or cut off.

import type { ViralNetwork } from './viral-posts'

export type LimitNetwork = ViralNetwork | 'status'

/** Hard limits: the network refuses (or truncates) anything longer. */
export const CHAR_LIMITS: Record<LimitNetwork, number> = {
  x: 280,          // per post; each post of a thread separately
  linkedin: 3000,
  instagram: 2200, // caption
  facebook: 63206,
  tiktok: 4000,    // caption
  status: 700,     // WhatsApp Status text
}

export const NETWORK_NAMES: Record<LimitNetwork, string> = {
  x: 'X', linkedin: 'LinkedIn', instagram: 'Instagram', facebook: 'Facebook', tiktok: 'TikTok', status: 'WhatsApp Status',
}

/**
 * What the writers are told. Targets sit below the hard limits: a tracking
 * link is appended to most posts (on X a link always counts as 23
 * characters, plus "WhatsApp: " in front of it), and the first ~200
 * characters are all LinkedIn and Instagram show before "see more".
 */
export const PLATFORM_LIMITS_PROMPT = `CHARACTER LIMITS (count before you answer; a post over its limit can't be posted):
- X: each post at most 240 characters, so the tracking link added after it still fits X's 280. A thread is numbered posts (1/6, 2/6, ...), each one at most 240 on its own.
- LinkedIn: at most 1,300 characters (hard limit 3,000). The hook must land in the first 200, before "see more".
- Instagram: caption at most 1,000 characters (hard limit 2,200), 3 to 5 hashtags.
- Facebook: at most 500 characters.
- TikTok: the script is for filming and has no limit, but end it with a "Caption:" line of at most 150 characters (hard limit 4,000).
- WhatsApp Status: at most 100 characters.`

// twitter-text v3: these code points count once, everything else (CJK, most
// emoji) twice, and every URL counts as 23 whatever its length.
const SINGLE_WEIGHT: Array<[number, number]> = [[0, 4351], [8192, 8205], [8208, 8223], [8242, 8247]]
const URL_RE = /https?:\/\/[^\s]+/g

/** Length of a post as X counts it. */
export function xLength(text: string): number {
  const urls = text.match(URL_RE) ?? []
  let n = urls.length * 23
  for (const ch of text.replace(URL_RE, '')) {
    const cp = ch.codePointAt(0)!
    n += SINGLE_WEIGHT.some(([a, b]) => cp >= a && cp <= b) ? 1 : 2
  }
  return n
}

export function postLength(network: LimitNetwork, text: string): number {
  return network === 'x' ? xLength(text) : Array.from(text).length
}

/** A numbered X thread ("1/6 ...", "2/6 ...") split into its posts; a single post otherwise. */
export function splitThread(text: string): string[] {
  const parts = text.split(/\n\s*(?=\(?\d{1,2}\s*\/\s*\d{1,2}\)?[\s.:])/).map(p => p.trim()).filter(Boolean)
  return parts.length > 1 && /^\(?1\s*\/\s*\d/.test(parts[0]) ? parts : [text.trim()]
}

export interface LengthCheck {
  /** For a thread, one entry per post. */
  parts: Array<{ text: string; length: number; over: boolean }>
  limit: number
  over: boolean
}

export function checkLength(network: LimitNetwork, text: string): LengthCheck {
  const limit = CHAR_LIMITS[network]
  const pieces = network === 'x' ? splitThread(text) : [text.trim()]
  const parts = pieces.map(p => ({ text: p, length: postLength(network, p), over: postLength(network, p) > limit }))
  return { parts, limit, over: parts.some(p => p.over) }
}
