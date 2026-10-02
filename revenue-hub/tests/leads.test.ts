import { describe, expect, it } from 'vitest'
import { parseProspects } from '@/lib/leads'

const LIST = `Checked 40 businesses on Google Maps in Adum, Kumasi.

1. Business Name — Grace Pharmacy
   Industry: Pharmacies
   Address: 12 Adum Rd, Kumasi
   Country: Ghana
   Phone: 024 123 4567
   Why they need a website: Customers can't check stock before visiting.
   Service to pitch: web design
   Estimated value: GHS 3,500
   Phone pitch: "Hello, is this Grace Pharmacy?"
   Source: Google Maps

2. Business Name — Hebden Plumbing
   Industry: Plumbers
   Address: Hebden Bridge
   Country: United Kingdom
   Phone: Not listed on Google Maps
   Estimated value: £1,500
   Source: https://facebook.com/hebdenplumbing).

PIPELINE SUMMARY
Total estimated value: GHS 3,500`

describe('parseProspects', () => {
  const leads = parseProspects(LIST)

  it('finds each numbered lead', () => {
    expect(leads.map(l => l.name)).toEqual(['Grace Pharmacy', 'Hebden Plumbing'])
  })

  it('normalises Ghanaian phone numbers to +233', () => {
    expect(leads[0].phone).toBe('+233241234567')
  })

  it('reads GHS values, and keeps foreign-currency values separately', () => {
    expect(leads[0].valueGHS).toBe(3500)
    expect(leads[0].valueLocal).toBeUndefined()
    expect(leads[1].valueGHS).toBe(0)
    expect(leads[1].valueLocal).toBe(1500)
  })

  it('treats kr and zł amounts as foreign, not GHS', () => {
    const [se, pl] = parseProspects(`1. Business Name — Malmo Bakery\n   Estimated value: kr 15,000\n\n2. Business Name — Krakow Dental\n   Estimated value: 6,000 zł`)
    expect([se.valueGHS, se.valueLocal]).toEqual([0, 15000])
    expect([pl.valueGHS, pl.valueLocal]).toEqual([0, 6000])
  })

  it('keeps country and a cleaned source link', () => {
    expect(leads[0].country).toBe('Ghana')
    expect(leads[1].country).toBe('United Kingdom')
    expect(leads[1].sourceUrl).toBe('https://facebook.com/hebdenplumbing')
    expect(leads[0].sourceUrl).toBeUndefined()
  })
})
