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

const ALL_TOOLS: ToolDefinition[] = [SEARCH_WEB, SEARCH_REDDIT, CHECK_DOMAIN]

// Tools available per agent
const AGENT_TOOLS: Record<string, string[]> = {
  scout: ['search_web', 'search_reddit', 'check_domain'],
  prospect: ['search_web', 'check_domain'],
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

    return `Unknown tool: ${name}`
  } catch (e) {
    return `Tool error (${name}): ${e instanceof Error ? e.message : String(e)}`
  }
}
