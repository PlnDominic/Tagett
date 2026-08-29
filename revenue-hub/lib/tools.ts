import { COUNTRIES, marketFor, glFor } from '@/lib/markets'
import { parseBrownbookListing, parseYellListing, type DirectoryResult } from '@/lib/directories'

export interface ToolDefinition {
  type: 'function'
  function: {
    name: string
    description: string
    parameters: Record<string, unknown>
  }
}

const SEARCH_WEB: ToolDefinition = {
  type: 'function',
  function: {
    name: 'search_web',
    description: 'Search the web using DuckDuckGo. Use this to find businesses, market info, competitors, or news about potential clients in Ghana.',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'The search query' },
      },
      required: ['query'],
    },
  },
}

const SEARCH_REDDIT: ToolDefinition = {
  type: 'function',
  function: {
    name: 'search_reddit',
    description: 'Search Reddit for posts where people discuss needing websites, looking for developers, or complaining about poor online presence. Great for finding warm leads.',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'The search query' },
        subreddit: { type: 'string', description: 'Optional: restrict to a specific subreddit (e.g. "ghana", "entrepreneur", "smallbusiness")' },
      },
      required: ['query'],
    },
  },
}

const CHECK_DOMAIN: ToolDefinition = {
  type: 'function',
  function: {
    name: 'check_domain',
    description: 'Look up domain registration info to check if a business has a website, when it was registered, or if it has expired.',
    parameters: {
      type: 'object',
      properties: {
        domain: { type: 'string', description: 'The domain name to look up, e.g. "example.com"' },
      },
      required: ['domain'],
    },
  },
}

const SEARCH_GOOGLE_MAPS: ToolDefinition = {
  type: 'function',
  function: {
    name: 'search_google_maps',
    description: 'Search Google Maps for real local businesses using SerpAPI. Returns business names, addresses, phone numbers, websites, and ratings. Ideal for finding businesses without websites — those are the prime prospects.',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Business type to search for, e.g. "pharmacies" or "restaurants"' },
        city: { type: 'string', description: 'Place to focus the search on — any town, village or rural area, not only large cities, e.g. "Accra", "Hebden Bridge", "Marfa". Include the region if the name is ambiguous, e.g. "Newport, Shropshire".' },
        country: { type: 'string', description: `Country the city is in — one of: ${COUNTRIES.join(', ')}. Defaults to Ghana. Always pass this, because city names repeat across countries.` },
      },
      required: ['query', 'city'],
    },
  },
}

const SEARCH_GOOGLE: ToolDefinition = {
  type: 'function',
  function: {
    name: 'search_google',
    description: 'Real Google web search via SerpAPI — much stronger than search_web (DuckDuckGo\'s API only returns Wikipedia-style infoboxes, not forum posts, Facebook pages, or reviews). Use this to find actual posts, complaints, and public signals: "need a website" posts, Facebook business pages, reviews mentioning no online presence, or to confirm whether a specific business really has no website.',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'The search query, e.g. \'"need a website" Ghana\' or \'site:facebook.com restaurant Manchester\'' },
        country: { type: 'string', description: `Country to bias results toward — one of: ${COUNTRIES.join(', ')}. Defaults to Ghana. Set this when prospecting outside Ghana or the results come back for the wrong market.` },
      },
      required: ['query'],
    },
  },
}

const SEARCH_BROWNBOOK: ToolDefinition = {
  type: 'function',
  function: {
    name: 'search_brownbook',
    description: 'Search Brownbook.net, a free global business directory, for real businesses — name, phone, address, and email when listed. Complements search_google_maps: independently sourced, and often has businesses (and occasionally an email address) that Google Maps does not. Especially useful for abroad markets outside Ghana.',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Business type to search for, e.g. "pharmacies" or "restaurants"' },
        city: { type: 'string', description: 'City or town to focus the search on.' },
        country: { type: 'string', description: `Country the city is in — one of: ${COUNTRIES.join(', ')}. Defaults to Ghana.` },
      },
      required: ['query'],
    },
  },
}

const SEARCH_YELL: ToolDefinition = {
  type: 'function',
  function: {
    name: 'search_yell',
    description: 'Search Yell.com, the UK\'s major business directory, for real businesses — name, phone when the listing has one, and rough location. UK-only (only useful when country is "United Kingdom"). Complements search_google_maps and search_brownbook as another independent source. Phone coverage is real but not guaranteed on every result — a result with no phone is still a real business worth a manual look.',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Business type to search for, e.g. "plumbers" or "electricians"' },
        city: { type: 'string', description: 'UK city or town to focus the search on.' },
      },
      required: ['query'],
    },
  },
}

const ALL_TOOLS: ToolDefinition[] = [SEARCH_WEB, SEARCH_REDDIT, CHECK_DOMAIN, SEARCH_GOOGLE_MAPS, SEARCH_GOOGLE, SEARCH_BROWNBOOK, SEARCH_YELL]

// Tools available per agent
const AGENT_TOOLS: Record<string, string[]> = {
  scout: ['search_google', 'search_reddit', 'search_web', 'check_domain'],
  prospect: ['search_web', 'check_domain', 'search_google_maps', 'search_brownbook', 'search_yell'],
  scope: ['search_web', 'check_domain'],
  content: ['search_web'],
  revenue: ['search_web'],
  viral: ['search_web'],
}

export function getAgentTools(agentId: string): ToolDefinition[] {
  const allowed = AGENT_TOOLS[agentId] ?? []
  return ALL_TOOLS.filter(t => allowed.includes(t.function.name))
}

async function fetchJSON(url: string): Promise<unknown> {
  const res = await fetch(url, {
    headers: { 'User-Agent': 'RevHub/1.0 (ecstasytechnologies.com)' },
    signal: AbortSignal.timeout(8000),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

export async function executeTool(name: string, args: Record<string, string>): Promise<string> {
  try {
    if (name === 'search_web') {
      const q = encodeURIComponent(args.query ?? '')
      const data = await fetchJSON(
        `https://api.duckduckgo.com/?q=${q}&format=json&no_html=1&skip_disambig=1`
      ) as Record<string, unknown>

      const parts: string[] = []
      if (data.AbstractText) parts.push(`${data.AbstractText}\nSource: ${data.AbstractURL}`)

      const topics = (data.RelatedTopics as Array<{ Text?: string; FirstURL?: string }> ?? [])
        .slice(0, 6)
        .map(t => t.Text ? `• ${t.Text}` : '')
        .filter(Boolean)
      if (topics.length) parts.push(topics.join('\n'))

      const results = (data.Results as Array<{ Text?: string; FirstURL?: string }> ?? [])
        .slice(0, 4)
        .map(r => r.Text ? `• ${r.Text} — ${r.FirstURL}` : '')
        .filter(Boolean)
      if (results.length) parts.push(results.join('\n'))

      return parts.join('\n\n') || 'No results found for this query.'
    }

    if (name === 'search_reddit') {
      const q = encodeURIComponent(args.query ?? '')
      const sub = args.subreddit ? encodeURIComponent(args.subreddit) : ''
      const url = sub
        ? `https://www.reddit.com/r/${sub}/search.json?q=${q}&sort=new&limit=8&restrict_sr=1&raw_json=1`
        : `https://www.reddit.com/search.json?q=${q}&sort=new&limit=8&raw_json=1`

      const data = await fetchJSON(url) as { data?: { children?: Array<{ data: { title: string; selftext?: string; permalink: string; score?: number; subreddit?: string } }> } }
      const posts = (data?.data?.children ?? []).slice(0, 8).map(c => {
        const p = c.data
        const preview = (p.selftext ?? '').slice(0, 180).replace(/\n/g, ' ')
        return `[r/${p.subreddit ?? 'unknown'} | ${p.score ?? 0}↑] ${p.title}\n${preview ? preview + '…' : '(no body)'}\nhttps://reddit.com${p.permalink}`
      })

      return posts.length ? posts.join('\n\n') : 'No Reddit posts found.'
    }

    if (name === 'check_domain') {
      const raw = (args.domain ?? '').replace(/^https?:\/\//, '').split('/')[0].toLowerCase()
      const data = await fetchJSON(`https://rdap.org/domain/${encodeURIComponent(raw)}`) as {
        events?: Array<{ eventAction: string; eventDate: string }>
        status?: string[]
        ldhName?: string
      }

      const get = (action: string) =>
        data.events?.find(e => e.eventAction === action)?.eventDate ?? 'unknown'

      const lines = [
        `Domain: ${data.ldhName ?? raw}`,
        `Registered: ${get('registration')}`,
        `Last changed: ${get('last changed')}`,
        `Expires: ${get('expiration')}`,
        `Status: ${(data.status ?? []).join(', ') || 'unknown'}`,
      ]
      return lines.join('\n')
    }

    if (name === 'search_google_maps') {
      const key = process.env.SERPAPI_KEY
      if (!key) return 'Google Maps search not available — SERPAPI_KEY not set.'
      const market = marketFor(args.country)
      const city = (args.city ?? market.seedCities[0]).trim()
      const query = (args.query ?? '').trim()
      const params = new URLSearchParams({
        engine: 'google_maps',
        // Country is appended, not assumed: "Kumasi" and "Cambridge" both exist
        // in more than one country, and Maps silently picks the wrong one.
        q: `${query} ${city} ${market.country}`,
        type: 'search',
        hl: 'en',
        api_key: key,
      })
      const res = await fetch(`https://serpapi.com/search.json?${params}`, { signal: AbortSignal.timeout(15000) })
      if (!res.ok) return `SerpAPI error: HTTP ${res.status}`
      const data = await res.json() as { local_results?: Array<Record<string, unknown>> }
      const items = (data.local_results ?? []).slice(0, 10)
      if (!items.length) return 'No Google Maps results found for this query.'
      const lines = items.map((p, i) => {
        const website = p.website as string | undefined
        return [
          `${i + 1}. ${p.title ?? 'Unknown'}`,
          `   Address: ${p.address ?? 'N/A'}`,
          `   Phone: ${(p.phone as string) ?? 'N/A'}`,
          `   Website: ${website ?? 'NONE — PRIME PROSPECT'}`,
          `   Rating: ${p.rating ?? 'N/A'} (${p.reviews ?? 0} reviews)`,
        ].join('\n')
      })
      return lines.join('\n\n')
    }

    if (name === 'search_google') {
      const key = process.env.SERPAPI_KEY
      if (!key) return 'Google search not available — SERPAPI_KEY not set. Fall back to search_web.'
      const query = (args.query ?? '').trim()
      const params = new URLSearchParams({ engine: 'google', q: query, hl: 'en', gl: glFor(args.country), num: '10', api_key: key })
      const res = await fetch(`https://serpapi.com/search.json?${params}`, { signal: AbortSignal.timeout(15000) })
      if (!res.ok) return `SerpAPI error: HTTP ${res.status}`
      const data = await res.json() as { organic_results?: Array<{ title?: string; link?: string; snippet?: string }> }
      const items = (data.organic_results ?? []).slice(0, 8)
      if (!items.length) return 'No Google results found for this query.'
      const lines = items.map((r, i) => `${i + 1}. ${r.title ?? 'Untitled'}\n   ${r.snippet ?? ''}\n   ${r.link ?? ''}`)
      return lines.join('\n\n')
    }

    if (name === 'search_brownbook') {
      const key = process.env.SERPAPI_KEY
      if (!key) return 'Brownbook search not available — SERPAPI_KEY not set.'
      const market = marketFor(args.country)
      const query = (args.query ?? '').trim()
      const city = (args.city ?? '').trim()
      // See lib/directories.ts for why this parses SerpAPI's own indexed
      // snippet rather than fetching brownbook.net directly (a flat 403 on
      // every request from Vercel, confirmed by hand). A plain site: +
      // keywords query surfaces real listings; a site:.../business path
      // restriction, a quoted phrase, OR a literal country name in the query
      // text each independently zeroed out results — all tested directly.
      const q = `site:brownbook.net ${query} ${city}`.trim()
      const params = new URLSearchParams({ engine: 'google', q, hl: 'en', gl: market.gl, num: '10', api_key: key })
      const res = await fetch(`https://serpapi.com/search.json?${params}`, { signal: AbortSignal.timeout(15000) })
      if (!res.ok) return `SerpAPI error: HTTP ${res.status}`
      const data = await res.json() as { organic_results?: Array<{ link?: string; title?: string; snippet?: string }> }

      const seen = new Set<string>()
      const found: DirectoryResult[] = []
      for (const r of data.organic_results ?? []) {
        const m = r.link?.match(/brownbook\.net\/business\/(\d+)\/[a-z0-9-]+/i)
        if (!m || seen.has(r.link!)) continue
        seen.add(r.link!)
        const parsed = parseBrownbookListing(m[1], r.title ?? '', r.link!, r.snippet ?? '')
        if (parsed) found.push(parsed)
        if (found.length >= 6) break
      }
      if (!found.length) return 'No Brownbook results found for this query.'
      const lines = found.map((b, i) => [
        `${i + 1}. ${b.name}`,
        `   Address: ${b.address || 'N/A'}`,
        `   Phone: ${b.phone ?? 'N/A'}`,
        `   Email: ${b.email ?? 'NONE — not listed on this directory entry'}`,
        `   Source: ${b.mapsUrl}`,
      ].join('\n'))
      return lines.join('\n\n')
    }

    if (name === 'search_yell') {
      const key = process.env.SERPAPI_KEY
      if (!key) return 'Yell search not available — SERPAPI_KEY not set.'
      const query = (args.query ?? '').trim()
      const city = (args.city ?? '').trim()
      // See lib/directories.ts — Yell's Cloudflare protection blocks even
      // robots.txt from any network tested, so direct fetch was never
      // viable. "phone number" is deliberately appended: a plain query's
      // snippets are marketing copy with no contact details at all; this
      // biasing is what surfaces the passage that actually has a number —
      // verified against real production responses before settling on it.
      const q = `site:yell.com ${query} phone number ${city}`.trim()
      const params = new URLSearchParams({ engine: 'google', q, hl: 'en', gl: 'uk', num: '10', api_key: key })
      const res = await fetch(`https://serpapi.com/search.json?${params}`, { signal: AbortSignal.timeout(15000) })
      if (!res.ok) return `SerpAPI error: HTTP ${res.status}`
      const data = await res.json() as { organic_results?: Array<{ link?: string; title?: string; snippet?: string }> }

      const seen = new Set<string>()
      const found: DirectoryResult[] = []
      for (const r of data.organic_results ?? []) {
        const m = r.link?.match(/yell\.com\/biz\/[a-z0-9-]+-(\d+)\/?/i)
        if (!m || seen.has(r.link!)) continue
        seen.add(r.link!)
        const parsed = parseYellListing(m[1], r.title ?? '', r.link!, r.snippet ?? '')
        if (parsed) found.push(parsed)
        if (found.length >= 6) break
      }
      if (!found.length) return 'No Yell results found for this query.'
      const lines = found.map((b, i) => [
        `${i + 1}. ${b.name}`,
        `   Context: ${b.address || 'N/A'}`,
        `   Phone: ${b.phone ?? 'N/A — not in the indexed snippet, may still be on the listing page'}`,
        `   Source: ${b.mapsUrl}`,
      ].join('\n'))
      return lines.join('\n\n')
    }

    return `Unknown tool: ${name}`
  } catch (e) {
    return `Tool error (${name}): ${e instanceof Error ? e.message : String(e)}`
  }
}
