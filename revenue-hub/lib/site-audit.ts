// A quick check of a business's own website for the "weak website" prospect
// search: Google PageSpeed's mobile performance score, plus whether the site
// loads at all and is on HTTPS. Each is a concrete opening line for an email
// ("your site scores 31/100 on phones"), which is what makes these leads
// worth contacting.

export interface SiteAudit {
  /** PageSpeed mobile performance, 0-100; unset if it couldn't be measured. */
  score?: number
  /** The site didn't load for Google's tester. */
  down?: boolean
  https: boolean
  /** Our PageSpeed quota ran out: nothing is known about the site. */
  quota?: boolean
}

/** A score under this is slow enough to lead with. */
export const WEAK_SCORE = 50

export async function auditSite(url: string, timeoutMs = 30000): Promise<SiteAudit> {
  const target = /^https?:\/\//i.test(url) ? url : `https://${url}`
  const https = target.toLowerCase().startsWith('https://')
  const params = new URLSearchParams({ url: target, strategy: 'mobile', category: 'performance' })
  const key = process.env.PAGESPEED_API_KEY?.trim()
  if (key) params.set('key', key)
  try {
    const res = await fetch(`https://www.googleapis.com/pagespeedonline/v5/runPagespeed?${params}`, { signal: AbortSignal.timeout(timeoutMs) })
    const data = await res.json().catch(() => ({})) as { error?: { code?: number; message?: string }; lighthouseResult?: { categories?: { performance?: { score?: number | null } } } }
    if (!res.ok || data.error) {
      if (res.status === 429 || data.error?.code === 429 || /quota/i.test(data.error?.message ?? '')) return { https, quota: true }
      // PageSpeed answers "unable to process / failed to load" for sites that are down.
      return { https, down: true }
    }
    const raw = data.lighthouseResult?.categories?.performance?.score
    return { https, score: typeof raw === 'number' ? Math.round(raw * 100) : undefined }
  } catch {
    return { https }
  }
}

/** The single most useful problem to lead with, or null for a site that's fine. */
export function siteIssue(audit: SiteAudit): string | null {
  if (audit.down) return 'site does not load'
  if (audit.score != null && audit.score < WEAK_SCORE) return `scores ${audit.score}/100 for speed on phones`
  if (!audit.https) return 'not secure (no HTTPS), so browsers warn visitors'
  return null
}
