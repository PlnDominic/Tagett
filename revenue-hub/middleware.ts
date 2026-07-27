import { createServerClient } from '@supabase/ssr'
import { NextRequest, NextResponse } from 'next/server'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const CRON_SECRET = process.env.CRON_SECRET

// Tagett is a single-operator CRM (Ecstasy Technologies, run by Dominic) — it
// was never meant to be multi-tenant. Every /api/* data route reads and
// writes with the Supabase service-role key, which bypasses Row Level
// Security entirely, and no table actually has an RLS policy defined anyway.
// That means "is there a valid Supabase session" was previously the ONLY
// check standing between the whole business's deals, clients, invoices, and
// phone numbers and anyone who could authenticate — including a stranger who
// simply signs up, if signups are enabled on the Supabase project. This
// allowlist is defense in depth: even a successfully authenticated session is
// rejected unless the email matches. Defaults to the operator's own email so
// this is protective out of the box; ALLOWED_EMAILS (comma-separated) can
// override it if a teammate ever needs access too.
const ALLOWED_EMAILS = (process.env.ALLOWED_EMAILS ?? 'dominickudom1738@gmail.com')
  .split(',')
  .map(e => e.trim().toLowerCase())
  .filter(Boolean)

// Proposal and client-portal links are shared over WhatsApp — the recipients
// have no Tagett session and never will. /p/[id] and /c/[id] are the pages they
// see; /api/proposals/[id] and /api/portals/[id] are the (GET-only) routes those
// pages read from. Deliberately NOT the bare /api/proposals or /api/portals —
// those are the create/update routes, used only from the logged-in app, and the
// trailing slash in the prefix is what keeps them behind the session check below.
const PUBLIC_PREFIXES = ['/p/', '/api/proposals/', '/c/', '/api/portals/']

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()
  const pathname = req.nextUrl.pathname

  if (PUBLIC_PREFIXES.some(p => pathname.startsWith(p))) return res

  // Vercel Cron automatically sends Authorization: Bearer <CRON_SECRET> when that
  // env var is set. A request carrying the correct secret is definitely Vercel
  // Cron (a session cookie can't be forged), so let it straight through to the
  // route's own CRON_SECRET check — without this, cron requests get redirected
  // to /login before that check ever runs, silently breaking the daily
  // notification, agent run, and follow-up jobs.
  //
  // Deliberately NOT a path allowlist: /api/agents/run and /api/notify/send are
  // also triggered manually from the logged-in app (a "Run Now" button, and
  // "hold to test" on the notification bell) with no bearer token — those calls
  // must still go through the normal session check below, or the endpoints
  // become open to anyone on the internet, not just Vercel Cron.
  if (CRON_SECRET && req.headers.get('authorization') === `Bearer ${CRON_SECRET}`) {
    return res
  }

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    // Every /api/* data route reads with the Supabase service-role key (bypasses
    // RLS) and has no auth check of its own — this middleware is the only gate.
    // Failing open in production would silently serve all CRM data to anyone.
    // Development still passes through so a fresh clone can run without keys.
    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json({ error: 'Auth not configured' }, { status: 503 })
    }
    return res
  }

  const supabase = createServerClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() { return req.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            req.cookies.set(name, value)
            res.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  const isLogin = pathname === '/login'
  const isAuthCallback = pathname.startsWith('/api/auth')

  // Let auth routes through always
  if (isAuthCallback) return res

  // A real Supabase session that isn't the operator's own email is treated as
  // not logged in at all — sign it out so the stray cookie doesn't linger,
  // and fall through to the normal "not logged in" handling below rather than
  // ever letting it reach a data route.
  const authorized = !!user && ALLOWED_EMAILS.includes((user.email ?? '').toLowerCase())
  if (user && !authorized) {
    await supabase.auth.signOut()
  }

  // Already logged in and going to /login → redirect home
  if (authorized && isLogin) {
    return NextResponse.redirect(new URL('/', req.url))
  }

  // Not logged in (or not authorized) and not on /login → redirect to /login
  if (!authorized && !isLogin) {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  return res
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon\\.ico|icon-|apple-touch-icon|manifest|sw\\.js).*)',
  ],
}
