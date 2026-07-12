import { NextRequest, NextResponse } from 'next/server'
import { randomBytes } from 'crypto'
import { getSupabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

// Protected collection route (session-gated by middleware). The public,
// no-auth read that clients open from WhatsApp lives at /api/portals/[id] —
// middleware's public prefix is '/api/portals/' with the trailing slash, so
// this bare route stays behind the login wall.

// GET ?dealId=xxx — look up the portal for a deal (used by the modal to decide
// between "create" and "update status" mode).
export async function GET(req: NextRequest) {
  try {
    const dealId = req.nextUrl.searchParams.get('dealId')
    if (!dealId) return NextResponse.json({ error: 'dealId required' }, { status: 400 })
    const sb = getSupabase()
    const { data, error } = await sb.from('portals').select('*').eq('deal_id', dealId).maybeSingle()
    if (error) throw error
    if (!data) return NextResponse.json(null)
    return NextResponse.json({
      id: data.id,
      dealId: data.deal_id,
      clientName: data.client_name,
      projectTitle: data.project_title,
      status: data.status,
    })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : ((err as { message?: string })?.message ?? 'Unknown') }, { status: 500 })
  }
}

// POST { dealId?, clientName, projectTitle } — create a portal, returns the link path.
export async function POST(req: NextRequest) {
  try {
    const { dealId, clientName, projectTitle } = await req.json()
    if (!clientName || !projectTitle) {
      return NextResponse.json({ error: 'clientName and projectTitle required' }, { status: 400 })
    }
    const id = randomBytes(6).toString('base64url')
    const sb = getSupabase()
    const { error } = await sb.from('portals').insert({
      id,
      deal_id: dealId ?? null,
      client_name: clientName,
      project_title: projectTitle,
      status: 'kickoff',
      created_at: Date.now(),
    })
    if (error) throw error
    return NextResponse.json({ ok: true, id, path: `/c/${id}` })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : ((err as { message?: string })?.message ?? 'Unknown') }, { status: 500 })
  }
}

// PATCH { id, status } — move the project through kickoff → in-progress → delivered.
export async function PATCH(req: NextRequest) {
  try {
    const { id, status } = await req.json()
    if (!id || !['kickoff', 'in-progress', 'delivered'].includes(status)) {
      return NextResponse.json({ error: 'id and a valid status required' }, { status: 400 })
    }
    const sb = getSupabase()
    const { error } = await sb.from('portals').update({ status }).eq('id', id)
    if (error) throw error
    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : ((err as { message?: string })?.message ?? 'Unknown') }, { status: 500 })
  }
}
