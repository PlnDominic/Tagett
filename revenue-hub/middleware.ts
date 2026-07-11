import { createServerClient } from '@supabase/ssr'
import { NextRequest, NextResponse } from 'next/server'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// These routes authenticate themselves via a CRON_SECRET bearer token (Vercel Cron),
// not a Supabase session cookie. A cron invocation carries no session, so the auth
// check below would redirect it to /login before its own bearer check ever runs —
// silently breaking the daily notification, agent run, and follow-up jobs.
const CRON_PATHS = ['/api/notify/send', '/api/agents/run', '/api/follow-up']

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()
  const pathname = req.nextUrl.pathname

  if (CRON_PATHS.some(p => pathname.startsWith(p))) return res

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

  // Already logged in and going to /login → redirect home
  if (user && isLogin) {
    return NextResponse.redirect(new URL('/', req.url))
  }

  // Not logged in and not on /login → redirect to /login
  if (!user && !isLogin) {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  return res
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon\\.ico|icon-|apple-touch-icon|manifest|sw\\.js).*)',
  ],
}
