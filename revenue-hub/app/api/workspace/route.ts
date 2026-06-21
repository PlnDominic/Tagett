import { NextRequest, NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

// GET returns Record<string, string> — agent_id → summary
export async function GET() {
  try {
    const sb = getSupabase()
    const { data, error } = await sb.from('workspace').select('agent_id, summary')
    if (error) throw error
    const out: Record<string, string> = {}
    for (const row of data ?? []) out[row.agent_id as string] = row.summary as string
    return NextResponse.json(out)
  } catch {
    return NextResponse.json({})
  }
}

// PUT accepts Record<string, string>, upserts each agent's summary
export async function PUT(req: NextRequest) {
  try {
    const workspace: Record<string, string> = await req.json()
    const sb = getSupabase()
    const rows = Object.entries(workspace).map(([agent_id, summary]) => ({
      agent_id,
      summary,
      updated_at: new Date().toISOString(),
    }))
    if (rows.length > 0) {
      const { error } = await sb.from('workspace').upsert(rows, { onConflict: 'agent_id' })
      if (error) throw error
    }
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Save failed' }, { status: 500 })
  }
}
