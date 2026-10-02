import { afterEach, describe, expect, it, vi } from 'vitest'
import { findProspects } from '@/lib/prospect-search'
import { prospectKey } from '@/lib/prospects'

const place = (i: number, extra: Record<string, unknown> = {}) => ({
  title: `Biz ${i}`, address: `${i} Adum Rd`, phone: `024 000 00${String(i).padStart(2, '0')}`, rating: 4.5, reviews: i * 10, ...extra,
})

function mockMaps(pages: unknown[][]) {
  const starts: string[] = []
  vi.stubGlobal('fetch', vi.fn(async (url: string) => {
    const start = new URL(url).searchParams.get('start') ?? '0'
    starts.push(start)
    const results = pages[Number(start) / 20] ?? []
    return { ok: true, status: 200, json: async () => ({ local_results: results }) }
  }))
  return starts
}

afterEach(() => { vi.unstubAllGlobals(); delete process.env.SERPAPI_KEY })

describe('findProspects', () => {
  it('keeps businesses with no website or only a social page, busiest first', async () => {
    process.env.SERPAPI_KEY = 'test'
    mockMaps([[
      place(1, { website: 'https://biz1.com' }),
      place(2, { website: 'https://facebook.com/biz2' }),
      place(3),
      place(5),
    ]])
    const r = await findProspects({ industries: ['Pharmacies'], city: 'Kumasi', country: 'Ghana' })
    expect(r.candidates.map(c => c.name)).toEqual(['Biz 5', 'Biz 3', 'Biz 2'])
    expect(r.candidates.find(c => c.name === 'Biz 2')?.socialOnly).toContain('facebook.com')
    expect(r.candidates[0].phone).toBe('+233240000005')
    expect(r.stats).toEqual({ scanned: 4, withWebsite: 1, alreadyKnown: 0 })
  })

  it('skips businesses already in the pipeline, by key or by name', async () => {
    process.env.SERPAPI_KEY = 'test'
    mockMaps([[place(1), place(2), place(3)]])
    const r = await findProspects({
      industries: ['Pharmacies'], city: 'Kumasi', country: 'Ghana',
      exclude: [prospectKey('Biz 1', '+233240000001')], excludeNames: ['biz 2'],
    })
    expect(r.candidates.map(c => c.name)).toEqual(['Biz 3'])
    expect(r.stats.alreadyKnown).toBe(2)
  })

  it('continues further down the results next time, and resets at the end', async () => {
    process.env.SERPAPI_KEY = 'test'
    const full = Array.from({ length: 20 }, (_, i) => place(i + 1, { website: 'https://x.com' }))
    const starts = mockMaps([full, [place(99)]])
    const r = await findProspects({ industries: ['Pharmacies'], city: 'Kumasi', country: 'Ghana' })
    expect(starts).toEqual(['0', '20'])
    expect(Object.values(r.offsets)).toEqual([0]) // second page was short: back to the top next time

    const resumed = mockMaps([full, full, full, full])
    await findProspects({ industries: ['Pharmacies'], city: 'Kumasi', country: 'Ghana', offsets: { 'pharmacies|kumasi|ghana': 40 } })
    expect(resumed[0]).toBe('40')
  })

  it('reports a missing key instead of searching', async () => {
    const r = await findProspects({ industries: ['Pharmacies'], city: 'Kumasi' })
    expect(r.error).toBe('no-key')
  })
})
