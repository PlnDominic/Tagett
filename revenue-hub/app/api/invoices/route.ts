import { NextRequest, NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase'

interface InvoiceMilestone {
  id: string
  label: string
  amountGHS: number
  paidAt?: number
  paymentMethod?: string
  notes?: string
}

interface Invoice {
  id: string
  clientName: string
  description: string
  dealId?: string
  totalGHS: number
  milestones: InvoiceMilestone[]
  status: 'draft' | 'sent' | 'partial' | 'paid'
  createdAt: number
  dueAt?: number
  sentAt?: number
  notes?: string
}

type Row = Record<string, unknown>

function buildInvoice(inv: Row, milestones: Row[]): Invoice {
  return {
    id: inv.id as string,
    clientName: inv.client_name as string,
    description: (inv.description as string) ?? '',
    dealId: (inv.deal_id as string | null) ?? undefined,
    totalGHS: inv.total_ghs as number,
    status: inv.status as Invoice['status'],
    createdAt: inv.created_at as number,
    dueAt: (inv.due_at as number | null) ?? undefined,
    sentAt: (inv.sent_at as number | null) ?? undefined,
    notes: (inv.notes as string | null) ?? undefined,
    milestones: milestones.map(m => ({
      id: m.id as string,
      label: m.label as string,
      amountGHS: m.amount_ghs as number,
      paidAt: (m.paid_at as number | null) ?? undefined,
      paymentMethod: (m.payment_method as string | null) ?? undefined,
      notes: (m.notes as string | null) ?? undefined,
    })),
  }
}

export async function GET() {
  try {
    const sb = getSupabase()
    const [{ data: invs, error: e1 }, { data: mils, error: e2 }] = await Promise.all([
      sb.from('invoices').select('*').order('created_at', { ascending: false }),
      sb.from('invoice_milestones').select('*'),
    ])
    if (e1) throw e1
    if (e2) throw e2

    const milsByInvoice: Record<string, Row[]> = {}
    for (const m of mils ?? []) {
      const key = m.invoice_id as string
      if (!milsByInvoice[key]) milsByInvoice[key] = []
      milsByInvoice[key].push(m)
    }

    return NextResponse.json(
      (invs ?? []).map(inv => buildInvoice(inv, milsByInvoice[inv.id as string] ?? []))
    )
  } catch {
    return NextResponse.json([])
  }
}

export async function PUT(req: NextRequest) {
  try {
    const invoices: Invoice[] = await req.json()
    const sb = getSupabase()

    const { data: existing } = await sb.from('invoices').select('id')
    const existingIds = new Set((existing ?? []).map((r: { id: string }) => r.id))
    const newIds = new Set(invoices.map(i => i.id))
    const toDelete = [...existingIds].filter(id => !newIds.has(id))

    if (invoices.length > 0) {
      const { error } = await sb.from('invoices').upsert(
        invoices.map(inv => ({
          id: inv.id,
          client_name: inv.clientName,
          description: inv.description ?? '',
          deal_id: inv.dealId ?? null,
          total_ghs: inv.totalGHS,
          status: inv.status,
          created_at: inv.createdAt,
          due_at: inv.dueAt ?? null,
          sent_at: inv.sentAt ?? null,
          notes: inv.notes ?? null,
        })),
        { onConflict: 'id' }
      )
      if (error) throw error

      // Replace milestones for each invoice in one shot
      await sb.from('invoice_milestones').delete().in('invoice_id', invoices.map(i => i.id))
      const milestoneRows = invoices.flatMap(inv =>
        inv.milestones.map(m => ({
          id: m.id,
          invoice_id: inv.id,
          label: m.label,
          amount_ghs: m.amountGHS,
          paid_at: m.paidAt ?? null,
          payment_method: m.paymentMethod ?? null,
          notes: m.notes ?? null,
        }))
      )
      if (milestoneRows.length > 0) {
        const { error: me } = await sb.from('invoice_milestones').insert(milestoneRows)
        if (me) throw me
      }
    }

    if (toDelete.length > 0) {
      await sb.from('invoices').delete().in('id', toDelete) // milestones CASCADE
    }

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Save failed' }, { status: 500 })
  }
}
