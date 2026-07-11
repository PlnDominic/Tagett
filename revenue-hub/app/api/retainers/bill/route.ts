import { NextRequest, NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

function sameMonth(a: number, b: number): boolean {
  const da = new Date(a)
  const db = new Date(b)
  return da.getFullYear() === db.getFullYear() && da.getMonth() === db.getMonth()
}

// Vercel Cron, 1st of every month: creates one invoice per active retainer that
// hasn't already been billed this month, so maintenance revenue doesn't rely on
// remembering to invoice each client by hand.
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (secret) {
    const auth = req.headers.get('authorization')
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  try {
    const sb = getSupabase()
    const now = Date.now()

    const { data: retainers, error } = await sb.from('retainers').select('*').eq('status', 'active')
    if (error) throw error

    const due = (retainers ?? []).filter(r => !r.last_billed_at || !sameMonth(r.last_billed_at as number, now))
    if (due.length === 0) {
      return NextResponse.json({ ok: true, billed: 0 })
    }

    const billed: string[] = []
    for (const r of due) {
      const invoiceId = `inv_ret_${r.id}_${now}`
      const dueAt = now + 7 * 86400000
      const { error: invErr } = await sb.from('invoices').insert({
        id: invoiceId,
        client_name: r.client_name,
        description: 'Monthly maintenance & support',
        deal_id: r.deal_id ?? null,
        total_ghs: r.monthly_ghs,
        status: 'sent',
        created_at: now,
        due_at: dueAt,
        sent_at: now,
      })
      if (invErr) continue

      await sb.from('invoice_milestones').insert({
        id: `${invoiceId}_m1`,
        invoice_id: invoiceId,
        label: 'Monthly maintenance',
        amount_ghs: r.monthly_ghs,
      })

      await sb.from('retainers').update({ last_billed_at: now }).eq('id', r.id)
      billed.push(r.client_name as string)
    }

    if (billed.length > 0) {
      const totalGHS = due.reduce((s, r) => s + ((r.monthly_ghs as number) ?? 0), 0)
      await fetch(`${req.nextUrl.origin}/api/notify/send`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          title: `💳 ${billed.length} retainer invoice${billed.length === 1 ? '' : 's'} sent`,
          body: `GHS ${totalGHS.toLocaleString()} total — ${billed.join(', ')}`,
        }),
      }).catch(() => {})
    }

    return NextResponse.json({ ok: true, billed: billed.length })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Unknown' }, { status: 500 })
  }
}
