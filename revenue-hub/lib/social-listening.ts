// Social listening: Google searches for public posts where someone asks for a
// website or developer (Facebook, X), and "comment your business" posts whose
// comment sections are full of small businesses (Instagram, TikTok). Kept pure
// (no fetch) so the URL rules are tested.

import type { SocialNetwork } from './socials'

export type ListenMode = 'requests' | 'threads'
export type ListenPlatform = Extract<SocialNetwork, 'facebook' | 'x' | 'instagram' | 'tiktok'>
export type Recency = 'w' | 'm' | 'y'

export const MODE_PLATFORMS: Record<ListenMode, ListenPlatform[]> = {
  requests: ['facebook', 'x'],
  threads: ['instagram', 'tiktok'],
}

/** People asking for a website or a developer, in their own words. */
export const REQUEST_PHRASES = [
  'I need a website',
  'need a web developer',
  'looking for a web developer',
  'need a website for my business',
  'who can build a website',
  'recommend a web designer',
  'need someone to build my website',
  'I need a developer',
  'looking for a website designer',
]

/** Posts that invite businesses to introduce themselves in the comments. */
export const THREAD_PHRASES = [
  'comment your business',
  'drop your business',
  'promote your business in the comments',
  'comment your business name',
  'small business owners drop',
]

const SITE: Record<ListenPlatform, string> = {
  facebook: 'site:facebook.com',
  x: '(site:x.com OR site:twitter.com)',
  instagram: 'site:instagram.com',
  tiktok: 'site:tiktok.com',
}

/** One Google query for one platform: any of the phrases, quoted, plus a place when given. */
export function buildListenQuery(platform: ListenPlatform, phrases: string[], place?: string): string {
  const any = phrases.map(p => `"${p.replace(/"/g, '')}"`).join(' OR ')
  return [SITE[platform], `(${any})`, place].filter(Boolean).join(' ')
}

export interface PostRef {
  platform: ListenPlatform
  /** Handle or page name of whoever posted, when the URL shows it. */
  author?: string
  /** Numeric id of an X post, for a reply link. */
  postId?: string
}

/** Which platform a URL is a single post on (not a profile, search or group page), and who posted it. */
export function postRef(url: string): PostRef | null {
  let u: URL
  try { u = new URL(url) } catch { return null }
  const host = u.hostname.replace(/^(www|m|web|mobile|[a-z]{2})\./, '')
  const parts = u.pathname.split('/').filter(Boolean)
  if (host === 'facebook.com') {
    if (parts[0] === 'groups' && parts[2] === 'posts') return { platform: 'facebook' }
    if (/^(permalink\.php|story\.php)$/.test(parts[0] ?? '')) return { platform: 'facebook' }
    if (parts[0] === 'share' && parts[1] === 'p') return { platform: 'facebook' }
    if (parts.length >= 3 && /^(posts|videos)$/.test(parts[1])) return { platform: 'facebook', author: parts[0] }
    return null
  }
  if (host === 'x.com' || host === 'twitter.com') {
    if (parts.length >= 3 && parts[1] === 'status' && /^\d+$/.test(parts[2])) return { platform: 'x', author: parts[0], postId: parts[2] }
    return null
  }
  if (host === 'instagram.com') {
    if (/^(p|reel|reels|tv)$/.test(parts[0] ?? '') && parts[1]) return { platform: 'instagram' }
    if (parts.length >= 3 && /^(p|reel)$/.test(parts[1])) return { platform: 'instagram', author: parts[0] }
    return null
  }
  if (host === 'tiktok.com') {
    if (parts.length >= 3 && parts[0].startsWith('@') && /^(video|photo)$/.test(parts[1])) return { platform: 'tiktok', author: parts[0].slice(1) }
    return null
  }
  return null
}

export function cleanHandle(handle: string): string {
  return handle.trim().replace(/^@+/, '').replace(/[^A-Za-z0-9._-]/g, '')
}

export function profileUrl(platform: ListenPlatform, handle: string): string {
  const h = cleanHandle(handle)
  if (platform === 'facebook') return `https://www.facebook.com/${h}`
  if (platform === 'x') return `https://x.com/${h}`
  if (platform === 'instagram') return `https://www.instagram.com/${h}`
  return `https://www.tiktok.com/@${h}`
}

/**
 * Where a personal message to this handle is written. Instagram (ig.me) and
 * Facebook Pages (m.me) open the conversation directly; X and TikTok have no
 * link that opens a DM by handle, so these open the profile and its Message button.
 */
export function messageUrl(platform: ListenPlatform, handle: string): string {
  const h = cleanHandle(handle)
  if (platform === 'instagram') return `https://ig.me/m/${h}`
  if (platform === 'facebook') return `https://m.me/${h}`
  return profileUrl(platform, h)
}

/** A public reply to an X post, prefilled. */
export function xReplyUrl(postId: string, text: string): string {
  return `https://x.com/intent/post?in_reply_to=${postId}&text=${encodeURIComponent(text)}`
}

export interface Commenter { handle: string; text: string }

/**
 * Reads one comment from a comment scraper's output. Instagram scrapers name
 * the author ownerUsername; TikTok ones uniqueId (sometimes under user).
 */
export function commenterFrom(item: Record<string, unknown>): Commenter | null {
  const user = (item.user ?? item.owner ?? item.author) as Record<string, unknown> | string | undefined
  const nested = typeof user === 'object' && user ? (user.uniqueId ?? user.username ?? user.unique_id) : user
  const raw = item.ownerUsername ?? item.username ?? item.uniqueId ?? nested
  const text = item.text ?? item.comment ?? item.content
  if (typeof raw !== 'string' || typeof text !== 'string') return null
  const handle = cleanHandle(raw)
  return handle && text.trim() ? { handle, text: text.trim() } : null
}
