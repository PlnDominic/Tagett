import { describe, expect, it } from 'vitest'
import { refCodeFor } from '@/lib/refcode'

describe('post ref codes', () => {
  it('are 4 characters people can read out (no 0/O or 1/I, no hyphens)', () => {
    for (const id of ['1727870087000-0', 'viral-1727870087001', `${Date.now()}-testimonial`]) {
      expect(refCodeFor(id)).toMatch(/^[A-HJ-NP-Z2-9]{4}$/)
    }
  })

  it('are stable for the same post', () => {
    expect(refCodeFor('viral-123')).toBe(refCodeFor('viral-123'))
  })

  it('differ between posts made at nearly the same time', () => {
    const codes = new Set(Array.from({ length: 50 }, (_, i) => refCodeFor(`viral-${1727870087000 + i}`)))
    expect(codes.size).toBeGreaterThan(45)
  })
})
