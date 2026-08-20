import { NextRequest, NextResponse } from 'next/server'
import { getSupabase, describeDbError, writeToleratingSchemaDrift } from '@/lib/supabase'

export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'

interface Deal {
  id: string
  name: string
  industry: string
  valueGHS: number
  stage: string
  phone?: string
  email?: string
  createdAt: number
  stageChangedAt?: number
  followUpAt?: number
  followUpReason?: string
  lastContactedAt?: number
  whatsappHistory?: Array<{ text: string; sentAt: number }>
  repliedAt?: number
  callLog?: Array<{ calledAt: number }>
  websiteCheck?: string
  websiteCheckUrl?: string
  sequenceStep?: number
}

function toRow(d: Deal) {
  return {
    id: d.id,
    name: d.name,
    industry: d.industry,
    value_ghs: d.valueGHS,
    stage: d.stage,
    phone: d.phone ?? null,
    email: d.email ?? null,
    created_at: d.createdAt,
    stage_changed_at: d.stageChangedAt ?? null,
    follow_up_at: d.followUpAt ?? null,
    follow_up_reason: d.followUpReason ?? null,
    last_contacted_at: d.lastContactedAt ?? null,
    whatsapp_history: d.whatsappHistory ?? [],
    replied_at: d.repliedAt ?? null,
    call_log: d.callLog ?? [],
    website_check: d.websiteCheck ?? null,
    website_check_url: d.websiteCheckUrl ?? null,
    sequence_step: d.sequenceStep ?? null,
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
    email: (r.email as string | null) ?? undefined,
    createdAt: r.created_at as number,
    stageChangedAt: (r.stage_changed_at as number | null) ?? undefined,
    followUpAt: (r.follow_up_at as number | null) ?? undefined,
    followUpReason: (r.follow_up_reason as string | null) ?? undefined,
    lastContactedAt: (r.last_contacted_at as number | null) ?? undefined,
    whatsappHistory: (r.whatsapp_history as Deal['whatsappHistory']) ?? undefined,
    repliedAt: (r.replied_at as number | null) ?? undefined,
    callLog: (r.call_log as Deal['callLog']) ?? undefined,
    websiteCheck: (r.website_check as string | null) ?? undefined,
    websiteCheckUrl: (r.website_check_url as string | null) ?? undefined,
    sequenceStep: (r.sequence_step as number | null) ?? undefined,
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

// POST — persist a single newly-added deal immediately. Adds from the Find
// Prospects page previously only reached Supabase via the 1500ms-debounced
// PUT below, which sends the client's *entire* in-memory deals array. If the
// page's initial GET (on mount) resolved in that 1500ms window, it would
// unconditionally overwrite local state with the older server snapshot,
// silently wiping out the deal that was just added. Saving the new row the
// instant it's created closes that race.
export async function POST(req: NextRequest) {
  try {
    const deal: Deal = await req.json()
    if (!deal?.id) return NextResponse.json({ error: 'id required' }, { status: 400 })
    const sb = getSupabase()
    const { error, dropped } = await writeToleratingSchemaDrift([toRow(deal)], rows =>
      sb.from('deals').upsert(rows, { onConflict: 'id' }),
    )
    if (error) throw error
    if (dropped.length) console.warn('[deals POST] deals table is missing columns, saved without them:', dropped.join(', '))
    return NextResponse.json({ ok: true, ...(dropped.length ? { droppedColumns: dropped } : {}) })
  } catch (err) {
    const detail = describeDbError(err)
    console.error('[deals POST]', detail)
    return NextResponse.json({ error: `Save failed: ${detail}` }, { status: 500 })
  }
}

// DELETE — remove a single deal immediately, for the same reason as POST above:
// don't leave a just-deleted row waiting on the debounced full-array PUT,
// where it could reappear if a slower in-flight GET lands afterward.
export async function DELETE(req: NextRequest) {
  try {
    const { id } = await req.json().catch(() => ({} as { id?: string }))
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
    const sb = getSupabase()
    const { error } = await sb.from('deals').delete().eq('id', id)
    if (error) throw error
    return NextResponse.json({ ok: true })
  } catch (err) {
    const detail = describeDbError(err)
    console.error('[deals DELETE]', detail)
    return NextResponse.json({ error: `Delete failed: ${detail}` }, { status: 500 })
  }
}

// PUT — upsert-only bulk sync of the client's in-memory deals array (used by
// the 1500ms-debounced autosave for edits like stage moves and field updates).
// This used to also delete every server-side row whose id was missing from
// the sent array, on the theory that "not in the list" meant "deleted". That
// made the array whichever device pushed last: if a deal was added on one
// device (or by the immediate POST above) and a second device's array — open
// in another tab, mid-edit, not yet aware of it — synced afterward, its
// shorter array would delete the other device's brand-new deal from
// Supabase. Deletion is now only ever done explicitly via DELETE above.
export async function PUT(req: NextRequest) {
  try {
    const deals: Deal[] = await req.json()
    if (deals.length === 0) return NextResponse.json({ ok: true })
    const sb = getSupabase()
    const { error, dropped } = await writeToleratingSchemaDrift(deals.map(toRow), rows =>
      sb.from('deals').upsert(rows, { onConflict: 'id' }),
    )
    if (error) throw error
    if (dropped.length) console.warn('[deals PUT] deals table is missing columns, saved without them:', dropped.join(', '))
    return NextResponse.json({ ok: true, ...(dropped.length ? { droppedColumns: dropped } : {}) })
  } catch (err) {
    const detail = describeDbError(err)
    console.error('[deals PUT]', detail)
    return NextResponse.json({ error: `Save failed: ${detail}` }, { status: 500 })
  }
}
