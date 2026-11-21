import { NextResponse } from 'next/server'

// Who is calling an /api route. middleware.ts is the only place a Supabase
// session is checked; it strips any client-supplied x-tg-* headers and then
// sets these from the verified session, so routes can trust them without a
// second round trip to Supabase.
//
//   admin  — the operator (and anyone promoted to admin): sees everything.
//   member — a sales rep: works only the deals assigned to / claimed by them.
//   system — Vercel Cron carrying CRON_SECRET: no person, full access.
export type Role = 'admin' | 'member'
export type ActorRole = Role | 'system'

export const H_ROLE = 'x-tg-role'
export const H_ID = 'x-tg-user-id'
export const H_NAME = 'x-tg-user-name'
export const H_EMAIL = 'x-tg-user-email'
export const IDENTITY_HEADERS = [H_ROLE, H_ID, H_NAME, H_EMAIL]

export interface Actor {
  role: ActorRole
  id: string | null
  name: string
  email: string
}

const decode = (v: string | null) => { try { return v ? decodeURIComponent(v) : '' } catch { return v ?? '' } }
export const encodeHeader = (v: string) => encodeURIComponent(v)

export function getActor(req: Request): Actor {
  const role = req.headers.get(H_ROLE)
  if (role === 'admin' || role === 'member' || role === 'system') {
    return { role, id: req.headers.get(H_ID) || null, name: decode(req.headers.get(H_NAME)), email: decode(req.headers.get(H_EMAIL)) }
  }
  // No identity header: middleware did not run for this request. Only local dev
  // without Supabase keys gets there (middleware 503s in production), so behave
  // like the original single-operator app.
  if (process.env.NODE_ENV !== 'production') return { role: 'admin', id: null, name: 'Local dev', email: '' }
  return { role: 'member', id: null, name: '', email: '' }
}

export const isPrivileged = (a: Actor) => a.role === 'admin' || a.role === 'system'

// Returns a 403 response when the caller is not an admin, else null.
export function denyUnlessAdmin(req: Request): NextResponse | null {
  return isPrivileged(getActor(req)) ? null : NextResponse.json({ error: 'Admins only.' }, { status: 403 })
}

// Admin emails come from ALLOWED_EMAILS (kept under its original name so the
// deployed config keeps working). Anyone else needs a role stamped on their
// account by an admin, in app_metadata — which only the service-role key can
// write, unlike user_metadata, which a user can edit about themselves.
export function parseEmailList(raw: string | undefined): string[] {
  return (raw ?? '').split(',').map(e => e.trim().toLowerCase()).filter(Boolean)
}

export function resolveRole(
  user: { email?: string | null; app_metadata?: Record<string, unknown> | null },
  adminEmails: string[],
): Role | null {
  const email = (user.email ?? '').toLowerCase()
  if (adminEmails.length > 0 && adminEmails.includes(email)) return 'admin'
  const r = user.app_metadata?.role
  if (r === 'admin' || r === 'member') return r
  // Legacy single-operator mode: nobody configured, so any valid session is the operator.
  if (adminEmails.length === 0 && r == null) return 'admin'
  return null
}
