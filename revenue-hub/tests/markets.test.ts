import { describe, expect, it } from 'vitest'
import { countryFromPhone, dealCountry } from '@/lib/markets'
import { prospectKey } from '@/lib/prospects'

describe('country from phone', () => {
  it('reads the dialling code of international numbers', () => {
    expect(countryFromPhone('+233 24 123 4567')).toBe('Ghana')
    expect(countryFromPhone('+44 161 496 0000')).toBe('United Kingdom')
    expect(countryFromPhone('+1 416 555 0100')).toBe('United States')
  })

  it('prefers the longest matching code', () => {
    // +353 (Ireland) must not be read as a shorter code.
    expect(countryFromPhone('+353 1 234 5678')).toBe('Ireland')
  })

  it('does not guess for local numbers', () => {
    expect(countryFromPhone('0241234567')).toBeUndefined()
    expect(countryFromPhone(undefined)).toBeUndefined()
  })

  it('uses a stored country first, then the phone, then Ghana', () => {
    expect(dealCountry({ country: 'Kenya', phone: '+233241234567' })).toBe('Kenya')
    expect(dealCountry({ phone: '+447700900000' })).toBe('United Kingdom')
    expect(dealCountry({})).toBe('Ghana')
  })
})

describe('prospect identity', () => {
  it('treats the same business with differently formatted phones as one', () => {
    expect(prospectKey('Grace Pharmacy Ltd.', '+233 24 123 4567')).toBe(prospectKey('grace pharmacy ltd', '024 123 4567'))
  })
})
