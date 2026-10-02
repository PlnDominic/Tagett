import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { buildMoneyToChase, closedThisMonth } from '@/lib/pipeline'
import type { Deal, Invoice } from '@/lib/types'

const NOW = new Date(2026, 9, 15, 12).getTime() // 15 Oct 2026
const DAY = 86400000
const deal = (d: Partial<Deal>): Deal => ({ id: d.name ?? 'x', name: 'x', industry: 'Hotel', valueGHS: 0, stage: 'found', createdAt: NOW - 60 * DAY, ...d })

beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(NOW) })
afterEach(() => { vi.useRealTimers() })

describe('closedThisMonth', () => {
  it('counts only deals closed since the 1st', () => {
    const deals = [
      deal({ name: 'this month', stage: 'closed', valueGHS: 4000, stageChangedAt: NOW - 3 * DAY }),
      deal({ name: 'last month', stage: 'closed', valueGHS: 9000, stageChangedAt: NOW - 30 * DAY }),
      deal({ name: 'open', stage: 'proposal', valueGHS: 5000, stageChangedAt: NOW - DAY }),
    ]
    expect(closedThisMonth(deals).map(d => d.name)).toEqual(['this month'])
  })
})

describe('buildMoneyToChase', () => {
  const invoices: Invoice[] = [{
    id: 'i1', clientName: 'Lavimac', description: '', totalGHS: 6000, status: 'partial', createdAt: NOW - 40 * DAY, dueAt: NOW - 5 * DAY,
    milestones: [
      { id: 'm1', label: 'Deposit', amountGHS: 2000, paidAt: NOW - 30 * DAY },
      { id: 'm2', label: 'Balance', amountGHS: 4000 },
    ],
  }]

  it('lists what is still owed, net of paid milestones, with days overdue', () => {
    const out = buildMoneyToChase([], invoices)
    expect(out).toContain('Lavimac: GHS 4,000 owed of GHS 6,000, 5 days overdue')
  })

  it('lists overdue follow-ups and forecasts from stage odds', () => {
    const deals = [
      deal({ name: 'Peravic', stage: 'proposal', valueGHS: 10000, followUpAt: NOW - 2 * DAY, stageChangedAt: NOW - 2 * DAY }),
      deal({ name: 'Won', stage: 'closed', valueGHS: 3000, stageChangedAt: NOW - DAY }),
    ]
    const out = buildMoneyToChase(deals, [])
    expect(out).toContain('Peravic (Proposal Sent, GHS 10,000): 2 days late')
    // 3,000 closed this month + 10,000 x 60% (Proposal Sent odds) = 9,000
    expect(out).toContain('closed this month GHS 3,000')
    expect(out).toContain('likely month end GHS 9,000 against the GHS 12,000 goal')
  })
})
