// Personal messages on social media: what sending one does to a deal, and
// where the next one goes.

import type { Deal } from './types'
import type { ListenPlatform } from './social-listening'

/**
 * Logs a social message. The first one starts a follow-up in 3 days; sending
 * the due follow-up schedules one more in 4 days; after that third touch the
 * deal stops asking to be chased.
 */
export function dmSentUpdates(deal: Deal, network: ListenPlatform, text: string): Partial<Deal> {
  const now = Date.now()
  const updates: Partial<Deal> = {
    lastContactedAt: now,
    dmHistory: [...(deal.dmHistory ?? []), { network, text, sentAt: now }],
  }
  if (deal.stage === 'found') { updates.stage = 'contacted'; updates.stageChangedAt = now }
  if (deal.stage === 'closed' || deal.stage === 'lost') return updates
  if (!deal.followUpAt) {
    updates.followUpAt = now + 3 * 86400000
    updates.sequenceStep = 1
  } else if (deal.followUpAt <= now) {
    const step = (deal.sequenceStep ?? 1) + 1
    updates.sequenceStep = step
    updates.followUpAt = step >= 3 ? undefined : now + 4 * 86400000
  }
  return updates
}

/** The network and handle a deal was (or can be) messaged on: the last one used, else its first profile. */
export function dmTarget(deal: Deal): { network: ListenPlatform; handle: string } | null {
  const networks: ListenPlatform[] = ['instagram', 'facebook', 'x', 'tiktok']
  const last = deal.dmHistory?.[deal.dmHistory.length - 1]?.network as ListenPlatform | undefined
  for (const n of last ? [last, ...networks] : networks) {
    const url = deal.socials?.[n]
    if (!url) continue
    const handle = url.split('?')[0].replace(/\/+$/, '').split('/').pop()?.replace(/^@/, '')
    if (handle) return { network: n, handle }
  }
  return null
}
