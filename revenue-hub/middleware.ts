import { createServerClient } from '@supabase/ssr'
import { NextRequest, NextResponse } from 'next/server'
import { IDENTITY_HEADERS, H_ROLE, H_ID, H_NAME, H_EMAIL, encodeHeader, parseEmailList, resolveRole } from '@/lib/auth'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const CRON_SECRET = process.env.CRON_SECRET

// Tagett is run by Ecstasy Technologies: an admin (Dominic) plus sales reps who
// have their own accounts. Every /api/* data route reads and writes with the
// Supabase service-role key, which bypasses Row Level Security, so this
// middleware is the gate: it verifies the session, works out the caller's role
// and passes it to the routes in x-tg-* headers (see lib/auth.ts). Routes then
// scope data by that identity, so each rep only ever sees and works their own
// deals.
//
// ALLOWED_EMAILS (comma-separated) lists the ADMIN emails. Reps don't go in it:
// an admin creates them from the Team page, which stamps role=member on their
// account. With ALLOWED_EMAILS empty and no role on the account, any valid
// session is treated as the operator (the original single-operator behavior) —
// set it once you can get back in, so a stranger who signs up gets no access.
const ADMIN_EMAILS = parseEmailList(process.env.ALLOWED_EMAILS)

// Parts of the CRM that are the business's, not a rep's: billing, the client
// database, shared AI chat history, social accounts, the website, reporting.
// Reps are blocked from these at the API; the app also hides the screens.
const ADMIN_ONLY_API = [
  '/api/invoices', '/api/retainers', '/api/clients', '/api/report', '/api/website',
  '/api/case-studies', '/api/workspace', '/api/audit', '/api/agents', '/api/team',
  '/api/social-posts', '/api/social/buffer', '/api/conversations', '/api/notes',
]
// /api/team/me is how any signed-in user learns their own role.
const ADMIN_ONLY_EXEMPT = ['/api/team/me']

// Proposal and client-portal links are shared over WhatsApp — the recipients
// have no Tagett session and never will. /p/[id] and /c/[id] are the pages they
// see; /api/proposals/[id] and /api/portals/[id] are the (GET-only) routes those
// pages read from. Deliberately NOT the bare /api/proposals or /api/portals —
// those are the create/update routes, used only from the logged-in app, and the
// trailing slash in the prefix is what keeps them behind the session check below.
const PUBLIC_PREFIXES = ['/p/', '/api/proposals/', '/c/', '/api/portals/']

export async function middleware(req: NextRequest) {
  const pathname = req.nextUrl.pathname

  // Never trust identity headers from the outside: drop any the client sent,
  // then set them below only from a verified session.
  const fwd = new Headers(req.headers)
  IDENTITY_HEADERS.forEach(h => fwd.delete(h))
  const pending: Array<{ name: string; value: string; options?: Record<string, unknown> }> = []
  const next = (identity?: { role: string; id?: string; name?: string; email?: string }) => {
    const h = new Headers(fwd)
    if (identity) {
      h.set(H_ROLE, identity.role)
      if (identity.id) h.set(H_ID, identity.id)
      if (identity.name) h.set(H_NAME, encodeHeader(identity.name))
      if (identity.email) h.set(H_EMAIL, encodeHeader(identity.email))
    }
    const r = NextResponse.next({ request: { headers: h } })
    pending.forEach(c => r.cookies.set(c.name, c.value, c.options as never))
    return r
  }

  if (PUBLIC_PREFIXES.some(p => pathname.startsWith(p))) return next()

  // Vercel Cron automatically sends Authorization: Bearer <CRON_SECRET> when that
  // env var is set. A request carrying the correct secret is definitely Vercel
  // Cron (a session cookie can't be forged), so let it straight through to the
  // route's own CRON_SECRET check — without this, cron requests get redirected
  // to /login before that check ever runs, silently breaking the daily
  // notification, agent run, and follow-up jobs.
  //
  // Deliberately NOT a path allowlist: /api/notify/send is also triggered
  // manually from the logged-in app with no bearer token — those calls must
  // still go through the normal session check below.
  if (CRON_SECRET && req.headers.get('authorization') === `Bearer ${CRON_SECRET}`) {
    return next({ role: 'system' })
  }

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    // Every /api/* data route reads with the Supabase service-role key (bypasses
    // RLS) — this middleware is the only gate. Failing open in production would
    // silently serve all CRM data to anyone. Development still passes through
    // so a fresh clone can run without keys.
    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json({ error: 'Auth not configured' }, { status: 503 })
    }
    return next()
  }

  const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() { return req.cookies.getAll() },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          req.cookies.set(name, value)
          pending.push({ name, value, options })
        })
      },
    },
  })

  const { data: { user } } = await supabase.auth.getUser()

  const isLogin = pathname === '/login'

  // Let auth routes through always
  if (pathname.startsWith('/api/auth')) return next()

  // A real session with no role (not an admin email, never created by an admin)
  // is treated as not logged in — sign it out so the stray cookie doesn't linger.
  const role = user ? resolveRole(user, ADMIN_EMAILS) : null
  // Accounts an admin has deactivated are banned in Supabase; their existing
  // session stops validating there, so nothing extra is needed here.
  if (user && !role) await supabase.auth.signOut()

  if (user && role) {
    if (isLogin) return NextResponse.redirect(new URL('/', req.url))

    if (
      role === 'member' &&
      ADMIN_ONLY_API.some(p => pathname === p || pathname.startsWith(p + '/')) &&
      !ADMIN_ONLY_EXEMPT.includes(pathname)
    ) {
      return NextResponse.json({ error: 'Admins only.' }, { status: 403 })
    }

    const name = String(user.user_metadata?.name ?? '').trim() || (user.email ?? '').split('@')[0]
    return next({ role, id: user.id, name, email: user.email ?? '' })
  }

  return isLogin ? next() : NextResponse.redirect(new URL('/login', req.url))
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon\\.ico|icon-|apple-touch-icon|manifest|sw\\.js).*)',
  ],
}
