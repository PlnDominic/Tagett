import { NextRequest, NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'

type Row = Record<string, unknown>

interface Retainer {
  id: string
  clientName: string
  dealId?: string
  phone?: string
  monthlyGHS: number
  status: 'active' | 'paused' | 'cancelled'
  startedAt: number
  lastBilledAt?: number
  notes?: string
}

function fromRow(r: Row): Retainer {
  return {
    id: r.id as string,
    clientName: r.client_name as string,
    dealId: (r.deal_id as string | null) ?? undefined,
    phone: (r.phone as string | null) ?? undefined,
    monthlyGHS: (r.monthly_ghs as number) ?? 0,
    status: (r.status as Retainer['status']) ?? 'active',
    startedAt: r.started_at as number,
    lastBilledAt: (r.last_billed_at as number | null) ?? undefined,
    notes: (r.notes as string | null) ?? undefined,
  }
}

export async function GET() {
  try {
    const sb = getSupabase()
    const { data, error } = await sb.from('retainers').select('*').order('started_at', { ascending: false })
    if (error) throw error
    return NextResponse.json((data ?? []).map(fromRow))
  } catch (err) {
    console.error('[retainers GET]', err)
    return NextResponse.json([], { status: 200 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { clientName, dealId, phone, monthlyGHS, notes } = body
    if (!clientName || !monthlyGHS) {
      return NextResponse.json({ error: 'clientName and monthlyGHS required' }, { status: 400 })
    }
    const id = `ret_${Date.now()}`
    const sb = getSupabase()
    const { error } = await sb.from('retainers').insert({
      id,
      client_name: clientName,
      deal_id: dealId ?? null,
      phone: phone ?? null,
      monthly_ghs: monthlyGHS,
      status: 'active',
      started_at: Date.now(),
      notes: notes ?? null,
    })
    if (error) throw error
    return NextResponse.json({ ok: true, id })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : ((err as { message?: string })?.message ?? 'Unknown') }, { status: 500 })
  }
}

// PATCH { id, status } — pause/resume/cancel
export async function PATCH(req: NextRequest) {
  try {
    const { id, status } = await req.json()
    if (!id || !status) return NextResponse.json({ error: 'id and status required' }, { status: 400 })
    const sb = getSupabase()
    const { error } = await sb.from('retainers').update({ status }).eq('id', id)
    if (error) throw error
    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : ((err as { message?: string })?.message ?? 'Unknown') }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { id } = await req.json()
    const sb = getSupabase()
    const { error } = await sb.from('retainers').delete().eq('id', id)
    if (error) throw error
    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : ((err as { message?: string })?.message ?? 'Unknown') }, { status: 500 })
  }
}
