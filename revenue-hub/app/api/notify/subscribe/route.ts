import { NextRequest, NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase'
import { denyUnlessAdmin } from '@/lib/auth'

// Admin devices only: the daily push lists follow-ups across every deal, so a
// rep's phone must not be on the receiving end.
export async function POST(req: NextRequest) {
  const denied = denyUnlessAdmin(req)
  if (denied) return denied
  try {
    const subscription = await req.json()
    const endpoint: string = subscription?.endpoint
    if (!endpoint) return NextResponse.json({ error: 'Invalid subscription' }, { status: 400 })

    const sb = getSupabase()
    const { error } = await sb
      .from('push_subscriptions')
      .upsert({ endpoint, subscription }, { onConflict: 'endpoint' })
    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { endpoint } = await req.json().catch(() => ({}))
    if (!endpoint) return NextResponse.json({ success: true })

    const sb = getSupabase()
    await sb.from('push_subscriptions').delete().eq('endpoint', endpoint)
    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
