import { describe, expect, it } from 'vitest'
import { dmSentUpdates, dmTarget } from '@/lib/dm'
import type { Deal } from '@/lib/types'

const DAY = 86400000
const base: Deal = { id: '1', name: 'Grace Foods', industry: 'Catering', valueGHS: 0, stage: 'found', createdAt: 0 }

describe('dmSentUpdates', () => {
  it('moves a new lead to contacted and starts a follow-up in 3 days', () => {
    const u = dmSentUpdates(base, 'instagram', 'hi')
    expect(u.stage).toBe('contacted')
    expect(u.sequenceStep).toBe(1)
    expect(u.followUpAt! - Date.now()).toBeGreaterThan(2.9 * DAY)
    expect(u.dmHistory).toHaveLength(1)
  })

  it('schedules the next touch when a due follow-up is sent, and stops after three', () => {
    const due = { ...base, stage: 'contacted' as const, followUpAt: Date.now() - 1000, sequenceStep: 1 }
    const second = dmSentUpdates(due, 'instagram', 'again')
    expect(second.sequenceStep).toBe(2)
    expect(second.followUpAt! - Date.now()).toBeGreaterThan(3.9 * DAY)
    const third = dmSentUpdates({ ...due, sequenceStep: 2 }, 'instagram', 'last')
    expect(third.sequenceStep).toBe(3)
    expect('followUpAt' in third && third.followUpAt === undefined).toBe(true)
  })

  it('leaves a follow-up that is not yet due alone', () => {
    const later = Date.now() + 5 * DAY
    const u = dmSentUpdates({ ...base, stage: 'contacted', followUpAt: later, sequenceStep: 1 }, 'x', 'hi')
    expect(u.followUpAt).toBeUndefined()
    expect('followUpAt' in u).toBe(false)
  })
})

describe('dmTarget', () => {
  it('prefers the network last messaged on', () => {
    const deal: Deal = { ...base, socials: { instagram: 'https://www.instagram.com/gracefoods/', tiktok: 'https://www.tiktok.com/@gracefoods' }, dmHistory: [{ network: 'tiktok', text: 'hi', sentAt: 1 }] }
    expect(dmTarget(deal)).toEqual({ network: 'tiktok', handle: 'gracefoods' })
    expect(dmTarget({ ...deal, dmHistory: [] })).toEqual({ network: 'instagram', handle: 'gracefoods' })
    expect(dmTarget(base)).toBeNull()
  })
})
