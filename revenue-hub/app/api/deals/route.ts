import { NextRequest, NextResponse } from 'next/server'
import { getSupabase, describeDbError, writeToleratingSchemaDrift } from '@/lib/supabase'
import { getActor, isPrivileged, type Actor } from '@/lib/auth'
import { dedupeKeys } from '@/lib/dedupe'

export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'

interface Deal {
  id: string
  name: string
  industry: string
  valueGHS: number
  valueLocal?: number
  currency?: string
  stage: string
  phone?: string
  email?: string
  country?: string
  sourceUrl?: string
  socials?: Record<string, unknown>
  createdAt: number
  stageChangedAt?: number
  followUpAt?: number
  followUpReason?: string
  lastContactedAt?: number
  whatsappHistory?: Array<{ text: string; sentAt: number }>
  emailHistory?: Array<{ subject: string; text: string; sentAt: number }>
  dmHistory?: Array<{ network: string; text: string; sentAt: number }>
  repliedAt?: number
  callLog?: Array<{ calledAt: number }>
  websiteCheck?: string
  websiteCheckUrl?: string
  siteIssue?: string
  contactName?: string
  sequenceStep?: number
  // Server-assigned: who is working this deal. Never taken from the client.
  ownerId?: string
  ownerName?: string
}

function toRow(d: Deal) {
  return {
    id: d.id,
    name: d.name,
    industry: d.industry,
    value_ghs: d.valueGHS,
    value_local: d.valueLocal ?? null,
    currency: d.currency ?? null,
    stage: d.stage,
    phone: d.phone ?? null,
    email: d.email ?? null,
    country: d.country ?? null,
    source_url: d.sourceUrl ?? null,
    socials: d.socials ?? null,
    created_at: d.createdAt,
    stage_changed_at: d.stageChangedAt ?? null,
    follow_up_at: d.followUpAt ?? null,
    follow_up_reason: d.followUpReason ?? null,
    last_contacted_at: d.lastContactedAt ?? null,
    whatsapp_history: d.whatsappHistory ?? [],
    email_history: d.emailHistory ?? [],
    dm_history: d.dmHistory ?? [],
    replied_at: d.repliedAt ?? null,
    call_log: d.callLog ?? [],
    website_check: d.websiteCheck ?? null,
    website_check_url: d.websiteCheckUrl ?? null,
    site_issue: d.siteIssue ?? null,
    contact_name: d.contactName ?? null,
    sequence_step: d.sequenceStep ?? null,
  }
}

function fromRow(r: Record<string, unknown>): Deal {
  return {
    id: r.id as string,
    name: r.name as string,
    industry: (r.industry as string) ?? 'Unknown',
    valueGHS: (r.value_ghs as number) ?? 0,
    valueLocal: r.value_local == null ? undefined : Number(r.value_local),
    currency: (r.currency as string | null) ?? undefined,
    stage: (r.stage as string) ?? 'found',
    phone: (r.phone as string | null) ?? undefined,
    email: (r.email as string | null) ?? undefined,
    country: (r.country as string | null) ?? undefined,
    sourceUrl: (r.source_url as string | null) ?? undefined,
    socials: (r.socials as Deal['socials'] | null) ?? undefined,
    createdAt: r.created_at as number,
    stageChangedAt: (r.stage_changed_at as number | null) ?? undefined,
    followUpAt: (r.follow_up_at as number | null) ?? undefined,
    followUpReason: (r.follow_up_reason as string | null) ?? undefined,
    lastContactedAt: (r.last_contacted_at as number | null) ?? undefined,
    whatsappHistory: (r.whatsapp_history as Deal['whatsappHistory']) ?? undefined,
    emailHistory: (r.email_history as Deal['emailHistory']) ?? undefined,
    dmHistory: (r.dm_history as Deal['dmHistory']) ?? undefined,
    repliedAt: (r.replied_at as number | null) ?? undefined,
    callLog: (r.call_log as Deal['callLog']) ?? undefined,
    websiteCheck: (r.website_check as string | null) ?? undefined,
    websiteCheckUrl: (r.website_check_url as string | null) ?? undefined,
    siteIssue: (r.site_issue as string | null) ?? undefined,
    contactName: (r.contact_name as string | null) ?? undefined,
    sequenceStep: (r.sequence_step as number | null) ?? undefined,
    ownerId: (r.owner_id as string | null) ?? undefined,
    ownerName: (r.owner_name as string | null) ?? undefined,
  }
}

type Sb = ReturnType<typeof getSupabase>
type Row = Record<string, unknown>

// A rep works only their own deals. Admins (and the cron) see all of them,
// including unassigned ones imported before accounts existed.
const canTouch = (a: Actor, row: Row) => isPrivileged(a) || (!!a.id && row.owner_id === a.id)

// Is this business already in the pipeline under someone else's name? Checked
// against every deal, not just the caller's, so two reps can never end up
// chasing the same prospect. Returns the deal that already holds it.
async function findOverlap(sb: Sb, deal: Deal, actor: Actor): Promise<Row | null> {
  const keys = new Set(dedupeKeys({ name: deal.name, phone: deal.phone, email: deal.email, websiteCheckUrl: deal.websiteCheckUrl, country: deal.country }))
  if (keys.size === 0) return null
  const { data } = await sb.from('deals').select('id, name, phone, email, website_check_url, country, owner_id, owner_name')
  for (const r of (data ?? []) as Row[]) {
    if (r.id === deal.id) continue
    const hit = dedupeKeys({ name: r.name as string, phone: r.phone as string, email: r.email as string, websiteCheckUrl: r.website_check_url as string, country: r.country as string })
      .some(k => keys.has(k))
    // Your own earlier copy isn't a conflict for you, but it still is a duplicate.
    if (hit) return actor.id && r.owner_id === actor.id ? { ...r, mine: true } : r
  }
  return null
}

const ownerLabel = (r: Row) => (r.mine ? 'you' : (r.owner_name as string) || 'another team member')

export async function GET(req: NextRequest) {
  try {
    const actor = getActor(req)
    const sb = getSupabase()
    let q = sb.from('deals').select('*').order('created_at', { ascending: false })
    if (!isPrivileged(actor)) q = q.eq('owner_id', actor.id ?? '00000000-0000-0000-0000-000000000000')
    const { data, error } = await q
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

// Insert a brand-new deal for `actor`, refusing it if the business is already
// being worked. The owner comes from the verified session, never the body.
async function insertDeal(sb: Sb, deal: Deal, actor: Actor): Promise<{ conflict?: Row; dropped: string[]; error?: unknown }> {
  const overlap = await findOverlap(sb, deal, actor)
  if (overlap) return { conflict: overlap, dropped: [] }
  const ownerRow = { owner_id: actor.id, owner_name: actor.name || null }
  const { error, dropped } = await writeToleratingSchemaDrift([{ ...toRow(deal), ...ownerRow }], rows =>
    sb.from('deals').upsert(rows, { onConflict: 'id' }),
  )
  return { dropped, error: error ?? undefined }
}

// POST — persist a single newly-added deal immediately. Adds from the Find
// Prospects page previously only reached Supabase via the 1500ms-debounced
// PUT below, which sends the client's *entire* in-memory deals array. If the
// page's initial GET (on mount) resolved in that 1500ms window, it would
// unconditionally overwrite local state with the older server snapshot,
// silently wiping out the deal that was just added. Saving the new row the
// instant it's created closes that race.
//
// 409 means the business is already in someone's pipeline (or yours): the
// client drops it from the screen rather than keeping a deal nobody owns.
export async function POST(req: NextRequest) {
  try {
    const actor = getActor(req)
    const deal: Deal = await req.json()
    if (!deal?.id) return NextResponse.json({ error: 'id required' }, { status: 400 })
    const sb = getSupabase()

    const { data: existing } = await sb.from('deals').select('id, owner_id').eq('id', deal.id).maybeSingle()
    if (existing) {
      // Re-save of a deal that's already there (a retry): an update, not a claim.
      if (!canTouch(actor, existing)) return NextResponse.json({ error: 'That deal belongs to someone else.' }, { status: 403 })
      const { error, dropped } = await writeToleratingSchemaDrift([toRow(deal)], rows => sb.from('deals').upsert(rows, { onConflict: 'id' }))
      if (error) throw error
      return NextResponse.json({ ok: true, ...(dropped.length ? { droppedColumns: dropped } : {}) })
    }

    const { conflict, dropped, error } = await insertDeal(sb, deal, actor)
    if (conflict) {
      const who = ownerLabel(conflict)
      return NextResponse.json({
        error: who === 'you' ? `${deal.name} is already in your pipeline.` : `${deal.name} is already being worked by ${who}.`,
        conflict: true, existingName: conflict.name, ownerName: who,
      }, { status: 409 })
    }
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
    const actor = getActor(req)
    const { id } = await req.json().catch(() => ({} as { id?: string }))
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
    const sb = getSupabase()
    const { data: row } = await sb.from('deals').select('id, owner_id').eq('id', id).maybeSingle()
    if (row && !canTouch(actor, row)) return NextResponse.json({ error: 'That deal belongs to someone else.' }, { status: 403 })
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
//
// With several people on the app each row is checked against its owner: edits
// to a deal that isn't yours are dropped (and reported back in `rejected` so the
// client stops showing it), and a row the server hasn't seen yet goes through
// the same overlap check as POST. The owner columns are never written here, so
// a stage move can't change who owns a deal.
export async function PUT(req: NextRequest) {
  try {
    const actor = getActor(req)
    const deals: Deal[] = await req.json()
    if (deals.length === 0) return NextResponse.json({ ok: true })
    const sb = getSupabase()

    const { data: existing } = await sb.from('deals').select('id, owner_id').in('id', deals.map(d => d.id))
    const known = new Map(((existing ?? []) as Row[]).map(r => [r.id as string, r]))
    const rejected: string[] = []
    const updates: Deal[] = []
    const fresh: Deal[] = []
    for (const d of deals) {
      const row = known.get(d.id)
      if (!row) fresh.push(d)
      else if (canTouch(actor, row)) updates.push(d)
      else rejected.push(d.id)
    }

    const dropped = new Set<string>()
    if (updates.length) {
      const r = await writeToleratingSchemaDrift(updates.map(toRow), rows => sb.from('deals').upsert(rows, { onConflict: 'id' }))
      if (r.error) throw r.error
      r.dropped.forEach(c => dropped.add(c))
    }
    for (const d of fresh) {
      const r = await insertDeal(sb, d, actor)
      if (r.conflict) { rejected.push(d.id); continue }
      if (r.error) throw r.error
      r.dropped.forEach(c => dropped.add(c))
    }
    if (dropped.size) console.warn('[deals PUT] deals table is missing columns, saved without them:', [...dropped].join(', '))
    return NextResponse.json({ ok: true, ...(rejected.length ? { rejected } : {}), ...(dropped.size ? { droppedColumns: [...dropped] } : {}) })
  } catch (err) {
    const detail = describeDbError(err)
    console.error('[deals PUT]', detail)
    return NextResponse.json({ error: `Save failed: ${detail}` }, { status: 500 })
  }
}
