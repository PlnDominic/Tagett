import { createServerClient } from '@supabase/ssr'
import { NextRequest, NextResponse } from 'next/server'

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
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

  const isLogin = req.nextUrl.pathname === '/login'
  const isAuthCallback = req.nextUrl.pathname.startsWith('/api/auth')

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
    '/((?!_next/static|_next/image|favicon.ico|icon-|manifest|sw.js).*)',
  ],
}
