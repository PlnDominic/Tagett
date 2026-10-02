import { describe, expect, it } from 'vitest'
import { COUNTRIES } from '@/lib/markets'
import { CURRENCY_CODES, currencyCodeFor, toGHS } from '@/lib/fx'

describe('currencies', () => {
  it('has an ISO code for every market', () => {
    for (const c of COUNTRIES) expect(CURRENCY_CODES[c], c).toMatch(/^[A-Z]{3}$/)
  })

  it('tells the three "kr" currencies apart', () => {
    expect(['Sweden', 'Norway', 'Denmark'].map(currencyCodeFor)).toEqual(['SEK', 'NOK', 'DKK'])
  })

  it('defaults to GHS', () => {
    expect(currencyCodeFor(undefined)).toBe('GHS')
  })
})

describe('toGHS', () => {
  const rates = { GBP: 0.064349, USD: 0.085242 } // per 1 GHS

  it('converts by dividing by the per-GHS rate', () => {
    expect(toGHS(2500, 'GBP', rates)).toBe(Math.round(2500 / 0.064349))
  })

  it('passes GHS through and refuses unknown rates instead of guessing', () => {
    expect(toGHS(3500, 'GHS', null)).toBe(3500)
    expect(toGHS(100, 'JPY', rates)).toBeNull()
    expect(toGHS(100, 'USD', null)).toBeNull()
  })
})
