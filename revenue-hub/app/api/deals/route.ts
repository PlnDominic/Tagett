import { NextRequest, NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'

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
  lastContactedAt?: number
  whatsappHistory?: Array<{ text: string; sentAt: number }>
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
    last_contacted_at: d.lastContactedAt ?? null,
    whatsapp_history: d.whatsappHistory ?? [],
  }
}

function fromRow(r: Record<string, unknown>): Deal {
  return {
    id: r.id as string,
    name: r.name as string,
    industry: (r.industry as string) ?? 'Unknown',
    valueGHS: (r.value_ghs as number) ?? 0,
    stage: (r.stage as string) ?? 'found',
    phone: (r.phone as string | null) ?? undefined,
    createdAt: r.created_at as number,
    stageChangedAt: (r.stage_changed_at as number | null) ?? undefined,
    followUpAt: (r.follow_up_at as number | null) ?? undefined,
    lastContactedAt: (r.last_contacted_at as number | null) ?? undefined,
    whatsappHistory: (r.whatsapp_history as Deal['whatsappHistory']) ?? undefined,
  }
}

export async function GET() {
  try {
    const sb = getSupabase()
    const { data, error } = await sb
      .from('deals')
      .select('*')
      .order('created_at', { ascending: false })
    if (error) {
      console.error('[deals GET]', error.message)
      return NextResponse.json([], { status: 200 })
    }
    return NextResponse.json((data ?? []).map(fromRow))
  } catch (err) {
    console.error('[deals GET]', err)
    return NextResponse.json([], { status: 200 })
  }
}

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
  } catch (err) {
    console.error('[deals PUT]', err)
    return NextResponse.json({ error: 'Save failed' }, { status: 500 })
  }
}
