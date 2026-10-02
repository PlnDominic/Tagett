import { describe, expect, it } from 'vitest'
import { marketFor } from '@/lib/markets'
import { buildPriceBlock, money, priceRange, SERVICES } from '@/lib/pricing'

describe('price list', () => {
  it('uses the hand-set GHS prices for Ghana', () => {
    expect(priceRange('web', marketFor('Ghana'))).toEqual([3500, 4000])
    expect(priceRange('software', marketFor('Ghana'))).toEqual([15000, 40000])
  })

  it('anchors other markets to their website budget', () => {
    const uk = marketFor('United Kingdom')
    expect(priceRange('web', uk)).toEqual([1500, 4000])
    // Other services keep Ghana's ratio to the website price.
    const [lo, hi] = priceRange('webapp', uk)
    expect(lo).toBeGreaterThan(1500)
    expect(hi).toBeGreaterThan(4000)
  })

  it('never prices a service at zero in any market', () => {
    for (const country of ['Ghana', 'Nigeria', 'Kenya', 'United States', 'Germany', 'Poland']) {
      for (const s of SERVICES) {
        const [lo, hi] = priceRange(s.id, marketFor(country))
        expect(lo, `${country} ${s.id}`).toBeGreaterThan(0)
        expect(hi, `${country} ${s.id}`).toBeGreaterThanOrEqual(lo)
      }
    }
  })

  it('writes amounts the way each market reads them', () => {
    expect(money(marketFor('Ghana'), 3500)).toBe('GHS 3,500')
    expect(money(marketFor('United Kingdom'), 1500)).toBe('£1,500')
    expect(money(marketFor('Kenya'), 30000)).toBe('KSh 30,000')
  })

  it('always includes Ghana and each requested market once', () => {
    const block = buildPriceBlock(['United Kingdom', 'United Kingdom'])
    expect(block.match(/^Ghana \(GHS\):/m)).toBeTruthy()
    expect(block.match(/^United Kingdom/gm)).toHaveLength(1)
  })
})
