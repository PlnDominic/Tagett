import { NextResponse } from 'next/server'
import { randomBytes } from 'crypto'
import { getSupabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

// POST { dealId?, businessName, industry?, scope?, priceGHS } — authenticated (Dominic
// creating a proposal to send). Viewing the resulting link is public — see [id]/route.ts.
export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { dealId, businessName, industry, scope, priceGHS } = body
    if (!businessName) return NextResponse.json({ error: 'businessName required' }, { status: 400 })

    // 16 bytes (128 bits): this id is a permanent, unauthenticated capability
    // URL exposing a client's name and price — 6 bytes (48 bits) was guessable
    // at scale by anyone enumerating /p/<id>.
    const id = randomBytes(16).toString('base64url')
    const sb = getSupabase()
    const { error } = await sb.from('proposals').insert({
      id,
      deal_id: dealId ?? null,
      business_name: businessName,
      industry: industry ?? null,
      scope: scope ?? '',
      price_ghs: priceGHS ?? 0,
      status: 'sent',
      created_at: Date.now(),
    })
    if (error) throw error

    return NextResponse.json({ ok: true, id, path: `/p/${id}` })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : ((err as { message?: string })?.message ?? 'Unknown') }, { status: 500 })
  }
}
