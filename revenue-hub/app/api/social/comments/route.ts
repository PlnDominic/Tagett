import { NextResponse } from 'next/server'
import { commenterFrom, postRef, type Commenter } from '@/lib/social-listening'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

// Google doesn't index Instagram or TikTok comments, so they are read with an
// Apify scraper (free plan: $5 of runs a month). Without APIFY_TOKEN the app
// asks for the comments to be pasted instead.
const ACTORS = {
  instagram: (url: string, limit: number) => ({ actor: 'apify~instagram-comment-scraper', input: { directUrls: [url], resultsLimit: limit } }),
  tiktok: (url: string, limit: number) => ({ actor: 'clockworks~tiktok-comments-scraper', input: { postURLs: [url], commentsPerPost: limit, maxRepliesPerComment: 0 } }),
}

export async function GET() {
  return NextResponse.json({ configured: !!process.env.APIFY_TOKEN })
}

// POST { url, limit? } -> { comments: [{ handle, text }] }
export async function POST(req: Request) {
  const token = process.env.APIFY_TOKEN
  if (!token) return NextResponse.json({ error: 'APIFY_TOKEN not set' }, { status: 503 })
  const { url, limit } = await req.json().catch(() => ({})) as { url?: string; limit?: number }
  const ref = url ? postRef(url) : null
  if (!ref || (ref.platform !== 'instagram' && ref.platform !== 'tiktok')) {
    return NextResponse.json({ error: 'Not an Instagram or TikTok post' }, { status: 400 })
  }
  const { actor, input } = ACTORS[ref.platform](url!, Math.min(Math.max(limit ?? 80, 10), 150))
  try {
    const res = await fetch(`https://api.apify.com/v2/acts/${actor}/run-sync-get-dataset-items?timeout=50`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
      body: JSON.stringify(input),
      signal: AbortSignal.timeout(55000),
    })
    if (res.status === 402) return NextResponse.json({ error: 'Apify credit used up for this month' }, { status: 402 })
    if (!res.ok) return NextResponse.json({ error: `Comment reader failed (${res.status})` }, { status: 502 })
    const items = await res.json() as Array<Record<string, unknown>>
    const seen = new Set<string>()
    const comments: Commenter[] = []
    for (const item of Array.isArray(items) ? items : []) {
      const c = commenterFrom(item)
      // One entry per account; the post's own author replying isn't a lead.
      if (!c || seen.has(c.handle.toLowerCase()) || c.handle.toLowerCase() === ref.author?.toLowerCase()) continue
      seen.add(c.handle.toLowerCase())
      comments.push({ handle: c.handle, text: c.text.slice(0, 400) })
    }
    return NextResponse.json({ comments })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error && err.name === 'TimeoutError' ? 'The comment reader took too long; try again or paste the comments' : 'Comment reader failed' }, { status: 504 })
  }
}
