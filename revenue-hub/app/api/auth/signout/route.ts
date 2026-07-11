import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServer } from '@/lib/supabase-server'

export async function POST(req: NextRequest) {
  const supabase = await getSupabaseServer()
  await supabase.auth.signOut()
  return NextResponse.redirect(new URL('/login', req.url))
}
