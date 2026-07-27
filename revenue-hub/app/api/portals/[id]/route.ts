import { NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

// Public — no auth. Clients open this from a WhatsApp link with no Tagett
// session. Read-only by design: it exposes just this client's project status
// and their own invoice milestones, never the pipeline or other clients.
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    const sb = getSupabase()
    const { data: portal, error } = await sb.from('portals').select('*').eq('id', params.id).maybeSingle()
    if (error) throw error
    if (!portal) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    // Milestones from this client's invoices — matched by deal first (precise),
    // falling back to exact client-name match for invoices created standalone.
    // Two separate parameterized .eq() queries, merged here, rather than
    // building a single .or(`deal_id.eq.${x},client_name.eq.${y}`) filter
    // string: PostgREST's filter syntax treats commas, dots, and parens as
    // structural, so a client name containing any of those (e.g. "Acme, Ltd")
    // would silently corrupt the query and return the wrong milestones.
    const invoices: { id: string; client_name: string; deal_id: string | null }[] = []
    if (portal.deal_id) {
      const { data } = await sb.from('invoices').select('id, client_name, deal_id').eq('deal_id', portal.deal_id)
      invoices.push(...(data ?? []))
    }
    const { data: byName } = await sb.from('invoices').select('id, client_name, deal_id').eq('client_name', portal.client_name)
    for (const inv of byName ?? []) {
      if (!invoices.some(i => i.id === inv.id)) invoices.push(inv)
    }

    const invoiceIds = invoices.map(i => i.id)
    const { data: milestones } = invoiceIds.length
      ? await sb.from('invoice_milestones').select('*').in('invoice_id', invoiceIds)
      : { data: [] }

    return NextResponse.json({
      id: portal.id,
      clientName: portal.client_name,
      projectTitle: portal.project_title,
      status: portal.status,
      milestones: (milestones ?? []).map(m => ({
        label: m.label,
        amountGHS: m.amount_ghs,
        paid: !!m.paid_at,
      })),
    })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : ((err as { message?: string })?.message ?? 'Unknown') }, { status: 500 })
  }
}
