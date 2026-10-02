// Pipeline maths shared by the app's bots: what counts toward this month's
// goal, and RevenueTracker's list of money to chase.
import type { Deal, DealStage, Invoice } from '@/lib/types'
import { STAGE_LABELS, STAGE_STALE_MS, STAGE_WEIGHT } from '@/lib/types'

function startOfMonth(now = new Date()): number {
  return new Date(now.getFullYear(), now.getMonth(), 1).getTime()
}

/** Closed deals counted toward this month's goal: closed since the 1st. */
export function closedThisMonth(deals: Deal[]): Deal[] {
  const since = startOfMonth()
  return deals.filter(d => d.stage === 'closed' && (d.stageChangedAt ?? d.createdAt) >= since)
}

/**
 * RevenueTracker's working list: money already earned but not collected,
 * deals whose follow-up is overdue, deals that stopped moving, and an honest
 * month-end forecast. These are the actions that turn into cash fastest.
 */
export function buildMoneyToChase(deals: Deal[], invoices: Invoice[]): string {
  const now = Date.now()
  const day = 86400000
  const fmt = (n: number) => `GHS ${Math.round(n).toLocaleString()}`
  const parts: string[] = []

  const owed = invoices
    .filter(i => i.status === 'sent' || i.status === 'partial')
    .map(i => ({ i, due: i.totalGHS - i.milestones.filter(m => m.paidAt).reduce((s, m) => s + m.amountGHS, 0) }))
    .filter(x => x.due > 0)
    .sort((a, b) => ((a.i.dueAt ?? Infinity) - (b.i.dueAt ?? Infinity)) || b.due - a.due)
  parts.push(owed.length
    ? `UNPAID INVOICES (earned, not collected; chase these first):\n${owed.map(({ i, due }) => {
        const late = i.dueAt && i.dueAt < now ? `, ${Math.floor((now - i.dueAt) / day)} days overdue` : i.dueAt ? `, due ${new Date(i.dueAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}` : ''
        return `  - ${i.clientName}: ${fmt(due)} owed of ${fmt(i.totalGHS)}${late}`
      }).join('\n')}`
    : 'UNPAID INVOICES: none.')

  const drafts = invoices.filter(i => i.status === 'draft')
  if (drafts.length) parts.push(`DRAFT INVOICES NOT SENT YET:\n${drafts.map(i => `  - ${i.clientName}: ${fmt(i.totalGHS)}`).join('\n')}`)

  const open = deals.filter(d => d.stage !== 'closed' && d.stage !== 'lost')
  const overdue = open.filter(d => d.followUpAt && d.followUpAt < now).sort((a, b) => b.valueGHS - a.valueGHS)
  if (overdue.length) parts.push(`FOLLOW-UPS OVERDUE:\n${overdue.slice(0, 10).map(d => `  - ${d.name} (${STAGE_LABELS[d.stage]}, ${fmt(d.valueGHS)}): ${Math.max(1, Math.floor((now - d.followUpAt!) / day))} days late`).join('\n')}`)

  const stale = open.filter(d => !overdue.includes(d) && STAGE_STALE_MS[d.stage] > 0 && now - (d.stageChangedAt ?? d.createdAt) > STAGE_STALE_MS[d.stage])
    .sort((a, b) => b.valueGHS - a.valueGHS)
  if (stale.length) parts.push(`STUCK DEALS (no stage change for longer than usual):\n${stale.slice(0, 10).map(d => `  - ${d.name} (${STAGE_LABELS[d.stage]}, ${fmt(d.valueGHS)}): ${Math.floor((now - (d.stageChangedAt ?? d.createdAt)) / day)} days in this stage`).join('\n')}`)

  const month = closedThisMonth(deals).reduce((s, d) => s + d.valueGHS, 0)
  const weighted = open.reduce((s, d) => s + d.valueGHS * STAGE_WEIGHT[d.stage], 0)
  const end = new Date(); end.setMonth(end.getMonth() + 1, 1); end.setHours(0, 0, 0, 0)
  const daysLeft = Math.ceil((end.getTime() - now) / day)
  parts.push(`FORECAST: closed this month ${fmt(month)}; open pipeline weighted by stage odds ${fmt(weighted)} (${Object.entries(STAGE_WEIGHT).filter(([k, w]) => w > 0 && k !== 'closed').map(([k, w]) => `${STAGE_LABELS[k as DealStage]} ${Math.round(w * 100)}%`).join(', ')}); likely month end ${fmt(month + weighted)} against the GHS 12,000 goal, ${daysLeft} days left.`)

  return `MONEY TO CHASE (real data):\n${parts.join('\n\n')}`
}
