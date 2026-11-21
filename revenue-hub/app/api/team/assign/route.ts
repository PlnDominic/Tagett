import { NextRequest, NextResponse } from 'next/server'
import { getSupabase, describeDbError } from '@/lib/supabase'
import { denyUnlessAdmin } from '@/lib/auth'

export const dynamic = 'force-dynamic'

// POST { dealIds: string[], ownerId: string | null }  — hand specific deals to
//                                                       a rep (null = back to the pool).
// POST { distribute: true }                           — split every unassigned
//                                                       deal evenly across the
//                                                       active reps, so each
//                                                       starts with their own list.
export async function POST(req: NextRequest) {
  const denied = denyUnlessAdmin(req)
  if (denied) return denied
  const body = await req.json().catch(() => ({})) as { dealIds?: string[]; ownerId?: string | null; distribute?: boolean }
  try {
    const sb = getSupabase()
    const { data: users, error: uerr } = await sb.auth.admin.listUsers({ page: 1, perPage: 200 })
    if (uerr) throw uerr
    const reps = users.users.filter(u => u.app_metadata?.role === 'member' && !(u.banned_until && new Date(u.banned_until).getTime() > Date.now()))
    const nameOf = (id: string) => {
      const u = users.users.find(x => x.id === id)
      return u ? String(u.user_metadata?.name ?? '') || (u.email ?? '').split('@')[0] : null
    }

    if (body.distribute) {
      if (reps.length === 0) return NextResponse.json({ error: 'Create at least one team member first.' }, { status: 400 })
      const { data: pool } = await sb.from('deals').select('id').is('owner_id', null).order('created_at', { ascending: true })
      const ids = (pool ?? []).map(r => r.id as string)
      const counts: Record<string, number> = {}
      for (let i = 0; i < ids.length; i++) {
        const rep = reps[i % reps.length]
        const { error } = await sb.from('deals').update({ owner_id: rep.id, owner_name: nameOf(rep.id) }).eq('id', ids[i])
        if (error) throw error
        counts[rep.id] = (counts[rep.id] ?? 0) + 1
      }
      return NextResponse.json({ ok: true, assigned: ids.length, counts })
    }

    const ids = Array.isArray(body.dealIds) ? body.dealIds.filter(x => typeof x === 'string') : []
    if (ids.length === 0) return NextResponse.json({ error: 'Pick at least one deal.' }, { status: 400 })
    const ownerId = body.ownerId ?? null
    if (ownerId && !nameOf(ownerId)) return NextResponse.json({ error: 'Unknown team member.' }, { status: 404 })
    const { error } = await sb.from('deals').update({ owner_id: ownerId, owner_name: ownerId ? nameOf(ownerId) : null }).in('id', ids)
    if (error) throw error
    return NextResponse.json({ ok: true, assigned: ids.length })
  } catch (err) {
    return NextResponse.json({ error: describeDbError(err) }, { status: 500 })
  }
}
