import { NextRequest, NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase'

export async function GET() {
  try {
    const sb = getSupabase()
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
