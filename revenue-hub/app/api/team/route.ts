import { NextRequest, NextResponse } from 'next/server'
import { getSupabase, describeDbError } from '@/lib/supabase'
import { denyUnlessAdmin } from '@/lib/auth'
import { generatePassword } from '@/lib/password'

export const dynamic = 'force-dynamic'

// Admin-only (enforced in middleware.ts and again here). Accounts are created
// by an admin, never by self sign-up: the role lives in app_metadata, which
// only this service-role client can write.

export interface TeamMember {
  id: string
  email: string
  name: string
  role: 'admin' | 'member'
  active: boolean
  createdAt: string
  lastSignInAt: string | null
  deals: number
  contacted: number
  closed: number
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export async function GET(req: NextRequest) {
  const denied = denyUnlessAdmin(req)
  if (denied) return denied
  try {
    const sb = getSupabase()
    const { data, error } = await sb.auth.admin.listUsers({ page: 1, perPage: 200 })
    if (error) throw error

    const { data: deals } = await sb.from('deals').select('owner_id, stage')
    const stats = new Map<string, { deals: number; contacted: number; closed: number }>()
    let unassigned = 0
    for (const d of (deals ?? []) as Array<{ owner_id: string | null; stage: string }>) {
      if (!d.owner_id) { unassigned++; continue }
      const s = stats.get(d.owner_id) ?? { deals: 0, contacted: 0, closed: 0 }
      s.deals++
      if (d.stage !== 'found') s.contacted++
      if (d.stage === 'closed') s.closed++
      stats.set(d.owner_id, s)
    }

    const members: TeamMember[] = data.users.map(u => {
      const s = stats.get(u.id) ?? { deals: 0, contacted: 0, closed: 0 }
      const banned = u.banned_until ? new Date(u.banned_until).getTime() > Date.now() : false
      return {
        id: u.id,
        email: u.email ?? '',
        name: String(u.user_metadata?.name ?? '') || (u.email ?? '').split('@')[0],
        role: u.app_metadata?.role === 'member' ? 'member' : 'admin',
        active: !banned,
        createdAt: u.created_at,
        lastSignInAt: u.last_sign_in_at ?? null,
        ...s,
      }
    })
    members.sort((a, b) => (a.role === b.role ? a.name.localeCompare(b.name) : a.role === 'admin' ? -1 : 1))
    return NextResponse.json({ members, unassigned })
  } catch (err) {
    return NextResponse.json({ error: describeDbError(err) }, { status: 500 })
  }
}

// POST { name, email, password?, role? } — create an account. Returns the
// password once (generated when omitted) so the admin can hand it over.
export async function POST(req: NextRequest) {
  const denied = denyUnlessAdmin(req)
  if (denied) return denied
  const body = await req.json().catch(() => ({})) as { name?: string; email?: string; password?: string; role?: string }
  const name = body.name?.trim() ?? ''
  const email = body.email?.trim().toLowerCase() ?? ''
  const role = body.role === 'admin' ? 'admin' : 'member'
  const password = body.password?.trim() || generatePassword()
  if (!name) return NextResponse.json({ error: 'Enter their name.' }, { status: 400 })
  if (!EMAIL_RE.test(email)) return NextResponse.json({ error: 'That email address does not look valid.' }, { status: 400 })
  if (password.length < 8) return NextResponse.json({ error: 'The password needs at least 8 characters.' }, { status: 400 })
  try {
    const sb = getSupabase()
    const { data, error } = await sb.auth.admin.createUser({
      email, password, email_confirm: true,
      user_metadata: { name },
      app_metadata: { role },
    })
    if (error) {
      const msg = /already|registered|exists/i.test(error.message) ? `${email} already has an account.` : error.message
      return NextResponse.json({ error: msg }, { status: /already|registered|exists/i.test(error.message) ? 409 : 400 })
    }
    return NextResponse.json({ ok: true, id: data.user.id, email, name, role, password })
  } catch (err) {
    return NextResponse.json({ error: describeDbError(err) }, { status: 500 })
  }
}
