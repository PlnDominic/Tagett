// The Google search behind Social listening, shared by /api/social/listen and
// the overnight run. One SerpAPI search per platform.

import { marketFor } from './markets'
import { MODE_PLATFORMS, REQUEST_PHRASES, THREAD_PHRASES, buildListenQuery, postRef, type ListenMode, type ListenPlatform, type Recency } from './social-listening'

export interface ListenPost {
  url: string
  platform: ListenPlatform
  author?: string
  postId?: string
  title: string
  snippet: string
  date?: string
}

export async function searchListenPosts(key: string, opts: {
  mode: ListenMode
  /** A MARKETS country, or 'Anywhere' (or unset) to search without a place. */
  country?: string
  recency?: Recency
  phrases?: string[]
  /** Defaults to every platform of the mode. */
  platforms?: ListenPlatform[]
}): Promise<{ posts: ListenPost[]; errors: string[] }> {
  const anywhere = !opts.country || opts.country === 'Anywhere'
  const market = marketFor(anywhere ? undefined : opts.country)
  const phrases = opts.phrases?.length ? opts.phrases : opts.mode === 'requests' ? REQUEST_PHRASES : THREAD_PHRASES
  const platforms = opts.platforms ?? MODE_PLATFORMS[opts.mode]

  const searchOne = async (platform: ListenPlatform): Promise<ListenPost[]> => {
    const params = new URLSearchParams({
      engine: 'google',
      q: buildListenQuery(platform, phrases, anywhere ? undefined : market.country),
      hl: 'en',
      num: '20',
      tbs: `qdr:${opts.recency ?? 'm'}`,
      api_key: key,
    })
    if (!anywhere) params.set('gl', market.gl)
    const res = await fetch(`https://serpapi.com/search.json?${params}`, { signal: AbortSignal.timeout(20000) })
    if (res.status === 429) throw new Error('Out of SerpAPI searches for now')
    if (!res.ok) throw new Error(`Search failed (${res.status})`)
    const data = await res.json() as { organic_results?: Array<{ link?: string; title?: string; snippet?: string; date?: string }> }
    return (data.organic_results ?? []).flatMap(r => {
      const ref = r.link ? postRef(r.link) : null
      if (!ref || ref.platform !== platform) return []
      return [{ url: r.link!.split('?')[0], ...ref, title: r.title ?? '', snippet: r.snippet ?? '', date: r.date }]
    })
  }

  const settled = await Promise.allSettled(platforms.map(searchOne))
  const seen = new Set<string>()
  return {
    posts: settled.flatMap(s => s.status === 'fulfilled' ? s.value : []).filter(p => !seen.has(p.url) && seen.add(p.url)),
    errors: settled.flatMap(s => s.status === 'rejected' ? [s.reason instanceof Error ? s.reason.message : 'Search failed'] : []),
  }
}
