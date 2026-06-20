import { NextRequest, NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase'

interface Deal {
  id: string
  name: string
  industry: string
  valueGHS: number
  stage: string
  phone?: string
  createdAt: number
  stageChangedAt?: number
  followUpAt?: number
}

function toRow(d: Deal) {
  return {
    id: d.id,
    name: d.name,
    industry: d.industry,
    value_ghs: d.valueGHS,
    stage: d.stage,
    phone: d.phone ?? null,
    created_at: d.createdAt,
    stage_changed_at: d.stageChangedAt ?? null,
    follow_up_at: d.followUpAt ?? null,
  }
}

function fromRow(r: Record<string, unknown>): Deal {
  return {
    id: r.id as string,
    name: r.name as string,
    industry: r.industry as string,
    valueGHS: r.value_ghs as number,
    stage: r.stage as string,
    phone: (r.phone as string | null) ?? undefined,
    createdAt: r.created_at as number,
    stageChangedAt: (r.stage_changed_at as number | null) ?? undefined,
    followUpAt: (r.follow_up_at as number | null) ?? undefined,
  }
}

export async function GET() {
  try {
    const sb = getSupabase()
    const { data, error } = await sb
      .from('deals')
      .select('*')
      .order('created_at', { ascending: false })
    if (error) throw error
    return NextResponse.json((data ?? []).map(fromRow))
  } catch {
    return NextResponse.json(null)
  }
}

// PUT replaces the full deal list — upsert new/changed, delete removed
export async function PUT(req: NextRequest) {
  try {
    const deals: Deal[] = await req.json()
    const sb = getSupabase()

    const { data: existing } = await sb.from('deals').select('id')
    const existingIds = new Set((existing ?? []).map((r: { id: string }) => r.id))
    const newIds = new Set(deals.map(d => d.id))
    const toDelete = [...existingIds].filter(id => !newIds.has(id))

    if (deals.length > 0) {
      const { error } = await sb.from('deals').upsert(deals.map(toRow), { onConflict: 'id' })
      if (error) throw error
    }
    if (toDelete.length > 0) {
      const { error } = await sb.from('deals').delete().in('id', toDelete)
      if (error) throw error
    }

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Save failed' }, { status: 500 })
  }
}
