import { describe, expect, it } from 'vitest'
import { checkLength, splitThread, xLength } from '@/lib/platform-limits'

describe('xLength', () => {
  it('counts a link as 23 whatever its length', () => {
    expect(xLength('Hi https://wa.me/233542855399?text=Ref%20ABCD')).toBe(3 + 23)
  })

  it('counts emoji twice and plain text once', () => {
    expect(xLength('abc')).toBe(3)
    expect(xLength('🇬🇭')).toBe(4)
  })
})

describe('splitThread', () => {
  it('splits a numbered thread into its posts', () => {
    expect(splitThread('1/3 We built a booking site.\n\n2/3 It took two weeks.\n3/3 DM us.')).toEqual([
      '1/3 We built a booking site.', '2/3 It took two weeks.', '3/3 DM us.',
    ])
  })

  it('leaves a single post whole, even with a fraction inside it', () => {
    expect(splitThread('Half of shops (1/2) have no site.')).toEqual(['Half of shops (1/2) have no site.'])
  })
})

describe('checkLength', () => {
  it('checks each post of an X thread on its own', () => {
    const thread = `1/2 ${'a'.repeat(200)}\n2/2 ${'b'.repeat(300)}`
    const check = checkLength('x', thread)
    expect(check.parts.map(p => p.over)).toEqual([false, true])
    expect(check.over).toBe(true)
  })

  it('uses each network\'s own limit', () => {
    expect(checkLength('linkedin', 'x'.repeat(2999)).over).toBe(false)
    expect(checkLength('instagram', 'x'.repeat(2201)).over).toBe(true)
  })
})
