import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

function normalizeUrl(input: string): string {
  const trimmed = input.trim()
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`
}

// Without PAGESPEED_API_KEY, Google shares a small unkeyed quota across every
// caller on this network/project — it can run out fast. Cache scans briefly
// so re-scanning the same site (or a double-click) doesn't burn more of it.
const CACHE_TTL_MS = 5 * 60 * 1000
const cache = new Map<string, { at: number; body: Record<string, unknown> }>()

// Google PageSpeed Insights v5 — free, works without an API key at low volume;
// PAGESPEED_API_KEY (optional) lifts the rate limit. A site that fails to load
// here is itself the strongest pitch material, so that's returned as a result
// (loadedOk: false), not an HTTP error — but a quota/rate-limit error from our
// own scanner is NOT the same thing as the prospect's site being down, so it
// gets its own flag (quotaExceeded) instead of masquerading as a dead site.
export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json()
    if (!url || typeof url !== 'string') {
      return NextResponse.json({ error: 'A website URL is required.' }, { status: 400 })
    }
    const target = normalizeUrl(url)

    const cached = cache.get(target)
    if (cached && Date.now() - cached.at < CACHE_TTL_MS) {
      return NextResponse.json(cached.body)
    }

    const params = new URLSearchParams({ url: target, strategy: 'mobile' })
    params.append('category', 'performance')
    params.append('category', 'seo')
    params.append('category', 'accessibility')
    const key = process.env.PAGESPEED_API_KEY
    if (key) params.set('key', key)

    const res = await fetch(`https://www.googleapis.com/pagespeedonline/v5/runPagespeed?${params.toString()}`, {
      signal: AbortSignal.timeout(45000),
    })
    const data = await res.json()

    if (!res.ok || data.error) {
      const status: number | undefined = data.error?.code
      const message: string = data.error?.message ?? ''
      const isQuota = status === 429 || /quota exceeded/i.test(message)

      if (isQuota) {
        // Quota errors are ours, not the prospect's site — don't cache them
        // (so the next attempt, e.g. after adding a key, isn't stuck serving
        // this) and never present them as "this site failed to load".
        return NextResponse.json({
          loadedOk: false,
          quotaExceeded: true,
          url: target,
          reason: key
            ? 'The PageSpeed scan quota for this API key has been used up for today. Try again later.'
            : 'The scanner is out of free daily scans (no PAGESPEED_API_KEY is configured, so it shares Google\'s small public quota). Add a PAGESPEED_API_KEY to raise the limit, or try again tomorrow.',
        })
      }

      const body = {
        loadedOk: false,
        url: target,
        reason: message || 'Could not load this website. It may be down, blocking scans, or unreachable.',
      }
      cache.set(target, { at: Date.now(), body })
      return NextResponse.json(body)
    }

    const categories = data.lighthouseResult?.categories ?? {}
    const audits = data.lighthouseResult?.audits ?? {}
    const scoreOf = (c: { score?: number } | undefined) =>
      typeof c?.score === 'number' ? Math.round(c.score * 100) : undefined

    const lcpMs = audits['largest-contentful-paint']?.numericValue
    const isHttps = audits['is-on-https']?.score === 1
    const mobileFriendly = audits['viewport']?.score === 1

    const body = {
      loadedOk: true,
      url: data.lighthouseResult?.finalUrl ?? target,
      performanceScore: scoreOf(categories.performance),
      seoScore: scoreOf(categories.seo),
      accessibilityScore: scoreOf(categories.accessibility),
      lcpSeconds: typeof lcpMs === 'number' ? Math.round((lcpMs / 1000) * 10) / 10 : undefined,
      isHttps,
      mobileFriendly,
    }
    cache.set(target, { at: Date.now(), body })
    return NextResponse.json(body)
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : ((err as { message?: string })?.message ?? 'Unknown') }, { status: 500 })
  }
}
