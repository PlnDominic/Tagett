import { NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

// POST { email, reason? } — records that an address asked not to be emailed
// (e.g. they replied "stop"). /api/email/send refuses these addresses.
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({})) as { email?: string; reason?: string }
  const email = body.email?.trim().toLowerCase()
  if (!email) return NextResponse.json({ error: 'email required' }, { status: 400 })
  try {
    const sb = getSupabase()
    const { error } = await sb.from('email_optouts').upsert({ email, reason: body.reason ?? null }, { onConflict: 'email' })
    if (error) throw error
    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Could not save' }, { status: 500 })
  }
}
