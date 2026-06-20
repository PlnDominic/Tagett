import { NextRequest, NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase'

export async function POST(req: NextRequest) {
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
