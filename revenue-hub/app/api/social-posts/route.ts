import { NextRequest, NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'

interface SocialPost {
  id: string
  content: string
  platforms: string[]
  status: 'draft' | 'scheduled' | 'posted'
  scheduledFor?: number
  postedAt?: number
  createdAt: number
  category?: string
}

type Row = Record<string, unknown>

function toRow(p: SocialPost) {
  return {
    id: p.id,
    content: p.content,
    platforms: p.platforms,
    status: p.status,
    scheduled_for: p.scheduledFor ?? null,
    posted_at: p.postedAt ?? null,
    created_at: p.createdAt,
    category: p.category ?? null,
  }
}

function fromRow(r: Row): SocialPost {
  return {
    id: r.id as string,
    content: r.content as string,
    platforms: (r.platforms as string[]) ?? [],
    status: r.status as SocialPost['status'],
    scheduledFor: (r.scheduled_for as number | null) ?? undefined,
    postedAt: (r.posted_at as number | null) ?? undefined,
    createdAt: r.created_at as number,
    category: (r.category as string | null) ?? undefined,
  }
}

export async function GET() {
  try {
    const sb = getSupabase()
    const { data, error } = await sb
      .from('social_posts')
      .select('*')
      .order('created_at', { ascending: false })
    if (error) throw error
    return NextResponse.json((data ?? []).map(fromRow))
  } catch {
    return NextResponse.json([])
  }
}

// Insert a single post without touching existing ones — PUT below is a full-array
// replace (deletes anything not included), so callers that only have one new post
// to add (e.g. the auto-draft on website publish) must use this instead.
export async function POST(req: NextRequest) {
  try {
    const post: SocialPost = await req.json()
    if (!post.content) return NextResponse.json({ error: 'content required' }, { status: 400 })
    const sb = getSupabase()
    const { error } = await sb.from('social_posts').insert(toRow(post))
    if (error) throw error
    return NextResponse.json({ ok: true, id: post.id })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Unknown' }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    const posts: SocialPost[] = await req.json()
    const sb = getSupabase()

    const { data: existing } = await sb.from('social_posts').select('id')
    const existingIds = new Set((existing ?? []).map((r: { id: string }) => r.id))
    const newIds = new Set(posts.map(p => p.id))
    const toDelete = [...existingIds].filter(id => !newIds.has(id))

    if (posts.length > 0) {
      const { error } = await sb.from('social_posts').upsert(posts.map(toRow), { onConflict: 'id' })
      if (error) throw error
    }
    if (toDelete.length > 0) {
      await sb.from('social_posts').delete().in('id', toDelete)
    }

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Save failed' }, { status: 500 })
  }
}
