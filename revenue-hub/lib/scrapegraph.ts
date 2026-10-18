// Client for the Tagett website scraper (scraper/ in this repo): ScrapeGraphAI
// with a real browser, hosted separately because Vercel can't run one. It
// reads a business's site, including pages built by JavaScript, and returns
// the contact emails that are actually on the pages. Optional: set
// SCRAPEGRAPH_URL and SCRAPEGRAPH_SECRET in Vercel to turn it on.

export interface ScrapedContacts {
  emails: string[]
  phones: string[]
  contactName?: string
  summary?: string
  pages: string[]
}

export function scrapeGraphConfigured(): boolean {
  return !!process.env.SCRAPEGRAPH_URL?.trim() && !!process.env.SCRAPEGRAPH_SECRET?.trim()
}

function baseUrl(): string {
  return process.env.SCRAPEGRAPH_URL!.trim().replace(/\/+$/, '')
}

/**
 * Reads a site's contact details. Throws on failure; a free host that has
 * gone to sleep can take about a minute to wake, which shows as a timeout.
 */
export async function scrapeContacts(url: string, timeoutMs = 45000): Promise<ScrapedContacts> {
  const res = await fetch(`${baseUrl()}/extract`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'X-Scraper-Secret': process.env.SCRAPEGRAPH_SECRET!.trim() },
    body: JSON.stringify({ url }),
    signal: AbortSignal.timeout(timeoutMs),
  })
  if (res.status === 401) throw new Error('The scraper secret in Vercel does not match the scraper service')
  if (!res.ok) throw new Error(`Website scraper failed (${res.status})`)
  const data = await res.json() as { ok?: boolean; error?: string; emails?: string[]; phones?: string[]; contact_name?: string | null; summary?: string | null; pages?: string[] }
  if (!data.ok) throw new Error(data.error ?? 'Website scraper could not read the site')
  return {
    emails: (data.emails ?? []).map(e => String(e).toLowerCase()),
    phones: data.phones ?? [],
    contactName: data.contact_name ?? undefined,
    summary: data.summary ?? undefined,
    pages: data.pages ?? [],
  }
}

/** Whether the service answers, and how fast (a slow first answer means it was asleep). */
export async function scrapeGraphHealth(timeoutMs = 60000): Promise<{ ok: boolean; ms: number; error?: string }> {
  const started = Date.now()
  try {
    const res = await fetch(`${baseUrl()}/health`, { signal: AbortSignal.timeout(timeoutMs) })
    return { ok: res.ok, ms: Date.now() - started, ...(res.ok ? {} : { error: `status ${res.status}` }) }
  } catch (err) {
    return { ok: false, ms: Date.now() - started, error: err instanceof Error ? err.message : 'unreachable' }
  }
}
