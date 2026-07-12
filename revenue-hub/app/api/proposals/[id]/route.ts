import { NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

// Public — no auth. Prospects open this link from WhatsApp, they have no Tagett
// session. Records a view and pushes a notification to Dominic (throttled to once
// per hour per proposal so repeated glances don't spam him).
export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const sb = getSupabase()
    const { data, error } = await sb.from('proposals').select('*').eq('id', params.id).maybeSingle()
    if (error) throw error
    if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const now = Date.now()
    const isFirstView = !data.first_viewed_at
    const shouldNotify = isFirstView || (data.last_viewed_at && now - data.last_viewed_at > 60 * 60 * 1000)
    const nextViewCount = (data.view_count ?? 0) + 1

    await sb.from('proposals').update({
      view_count: nextViewCount,
      first_viewed_at: data.first_viewed_at ?? now,
      last_viewed_at: now,
    }).eq('id', params.id)

    if (shouldNotify) {
      const origin = new URL(req.url).origin
      await fetch(`${origin}/api/notify/send`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          title: isFirstView ? `👀 ${data.business_name} opened your proposal` : `👀 ${data.business_name} viewed your proposal again`,
          body: `GHS ${Number(data.price_ghs).toLocaleString()} · ${nextViewCount} view${nextViewCount === 1 ? '' : 's'} total`,
        }),
      }).catch(() => {})
    }

    return NextResponse.json({
      id: data.id,
      businessName: data.business_name,
      industry: data.industry,
      scope: data.scope,
      priceGHS: data.price_ghs,
      status: data.status,
    })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : ((err as { message?: string })?.message ?? 'Unknown') }, { status: 500 })
  }
}
