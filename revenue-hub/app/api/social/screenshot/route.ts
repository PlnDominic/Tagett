import { NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase'

// PageSpeed runs a full page load before it returns, which can take 20-40s.
export const maxDuration = 60

const BUCKET = 'project-images'

// Screenshots a public page for a social post. Google PageSpeed already
// renders the page in a real browser and returns the final frame as a JPEG,
// so this needs no headless browser of our own; the image is then stored in
// the same public bucket as portfolio images so Buffer can fetch it by URL.
export async function POST(req: Request) {
  try {
    const { url } = await req.json() as { url?: string }
    let target: URL
    try { target = new URL(url ?? '') } catch { return NextResponse.json({ error: 'A full http(s) URL is required' }, { status: 400 }) }
    if (target.protocol !== 'http:' && target.protocol !== 'https:') {
      return NextResponse.json({ error: 'A full http(s) URL is required' }, { status: 400 })
    }

    const params = new URLSearchParams({ url: target.toString(), strategy: 'desktop', category: 'performance' })
    const key = process.env.PAGESPEED_API_KEY
    if (key) params.set('key', key)
    const res = await fetch(`https://www.googleapis.com/pagespeedonline/v5/runPagespeed?${params}`, {
      signal: AbortSignal.timeout(50000),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok || data.error) {
      const quota = data.error?.code === 429 || /quota/i.test(data.error?.message ?? '')
      return NextResponse.json(
        { error: quota ? 'Out of free screenshots for today (set PAGESPEED_API_KEY to raise the limit)' : `Could not load ${target.hostname}` },
        { status: quota ? 429 : 502 },
      )
    }

    const shot: string | undefined = data.lighthouseResult?.audits?.['final-screenshot']?.details?.data
    const base64 = shot?.split(',')[1]
    if (!base64) return NextResponse.json({ error: 'The page loaded but no screenshot came back' }, { status: 502 })

    const sb = getSupabase()
    const name = `social-${Date.now()}.jpg`
    const { error } = await sb.storage.from(BUCKET).upload(name, Buffer.from(base64, 'base64'), { contentType: 'image/jpeg', upsert: false })
    if (error) throw error
    return NextResponse.json({ url: sb.storage.from(BUCKET).getPublicUrl(name).data.publicUrl })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Screenshot failed' }, { status: 500 })
  }
}
