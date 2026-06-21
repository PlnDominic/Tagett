import { NextRequest, NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'

export async function GET(req: NextRequest) {
  try {
    const q = new URL(req.url).searchParams.get('q')?.trim()
    const sb = getSupabase()

    if (q) {
      // Search mode: full-text keyword match across all conversations
      const { data, error } = await sb
        .from('conversations')
        .select('agent_id, role, content, created_at')
        .ilike('content', `%${q}%`)
        .order('created_at', { ascending: false })
        .limit(50)
      if (error) throw error
      return NextResponse.json(data ?? [])
    }

    // Default: return all conversations grouped by agent
    const { data, error } = await sb
      .from('conversations')
      .select('agent_id, role, content')
      .order('created_at', { ascending: true })
    if (error) throw error

    const grouped: Record<string, Array<{ role: string; content: string }>> = {}
    for (const row of data ?? []) {
      if (!grouped[row.agent_id]) grouped[row.agent_id] = []
      grouped[row.agent_id].push({ role: row.role, content: row.content })
    }
    return NextResponse.json(grouped)
  } catch {
    return NextResponse.json({})
  }
}

export async function POST(req: NextRequest) {
  try {
    const { agent_id, role, content } = await req.json()
    const sb = getSupabase()
    const { error } = await sb.from('conversations').insert({ agent_id, role, content })
    if (error) throw error
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Save failed' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const agent_id = new URL(req.url).searchParams.get('agent_id')
    const sb = getSupabase()
    const query = sb.from('conversations').delete()
    const { error } = agent_id
      ? await query.eq('agent_id', agent_id)
      : await query.neq('agent_id', '')
    if (error) throw error
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Delete failed' }, { status: 500 })
  }
}
