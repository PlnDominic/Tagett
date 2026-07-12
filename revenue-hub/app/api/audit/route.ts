import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

function normalizeUrl(input: string): string {
  const trimmed = input.trim()
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`
}

// Google PageSpeed Insights v5 — free, works without an API key at low volume;
// PAGESPEED_API_KEY (optional) lifts the rate limit. A site that fails to load
// here is itself the strongest pitch material, so that's returned as a result
// (loadedOk: false), not an HTTP error.
export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json()
    if (!url || typeof url !== 'string') {
      return NextResponse.json({ error: 'A website URL is required.' }, { status: 400 })
    }
    const target = normalizeUrl(url)

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
      return NextResponse.json({
        loadedOk: false,
        url: target,
        reason: data.error?.message ?? 'Could not load this website. It may be down, blocking scans, or unreachable.',
      })
    }

    const categories = data.lighthouseResult?.categories ?? {}
    const audits = data.lighthouseResult?.audits ?? {}
    const scoreOf = (c: { score?: number } | undefined) =>
      typeof c?.score === 'number' ? Math.round(c.score * 100) : undefined

    const lcpMs = audits['largest-contentful-paint']?.numericValue
    const isHttps = audits['is-on-https']?.score === 1
    const mobileFriendly = audits['viewport']?.score === 1

    return NextResponse.json({
      loadedOk: true,
      url: data.lighthouseResult?.finalUrl ?? target,
      performanceScore: scoreOf(categories.performance),
      seoScore: scoreOf(categories.seo),
      accessibilityScore: scoreOf(categories.accessibility),
      lcpSeconds: typeof lcpMs === 'number' ? Math.round((lcpMs / 1000) * 10) / 10 : undefined,
      isHttps,
      mobileFriendly,
    })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : ((err as { message?: string })?.message ?? 'Unknown') }, { status: 500 })
  }
}
