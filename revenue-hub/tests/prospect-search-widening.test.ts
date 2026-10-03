import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { findProspects, findProspectsWidening } from '@/lib/prospect-search'

type Reply = { status?: number; body: unknown }
function stubSerpApi(reply: (q: string) => Reply) {
  const calls: string[] = []
  vi.stubGlobal('fetch', vi.fn(async (url: string) => {
    const q = new URL(url).searchParams.get('q') ?? ''
    calls.push(q)
    const { status = 200, body } = reply(q)
    return new Response(JSON.stringify(body), { status })
  }))
  return calls
}

const shop = (title: string) => ({ title, phone: '024 000 0000', reviews: 12, rating: 4.2 })

beforeEach(() => { vi.stubEnv('SERPAPI_KEY', 'test') })
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs() })

describe('findProspects errors', () => {
  it('reports running out of searches, even on a 200', async () => {
    stubSerpApi(() => ({ body: { error: 'Your account has run out of searches.' } }))
    expect((await findProspects({ industries: ['Hotels'], city: 'Kibi', country: 'Ghana' })).error).toBe('quota')
  })

  it('treats "no results" as an empty search, not an error', async () => {
    stubSerpApi(() => ({ body: { error: "Google hasn't returned any results for this query." } }))
    const r = await findProspects({ industries: ['Hotels'], city: 'Kibi', country: 'Ghana' })
    expect(r.error).toBeUndefined()
    expect(r.candidates).toEqual([])
  })

  it('reports a timeout instead of throwing', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw Object.assign(new Error('t'), { name: 'TimeoutError' }) }))
    const r = await findProspects({ industries: ['Hotels'], city: 'Kibi', country: 'Ghana' })
    expect(r).toMatchObject({ error: 'failed', errorMessage: 'SerpAPI timed out' })
  })
})

describe('findProspectsWidening', () => {
  it('widens from the town to the region when the town has nothing', async () => {
    const calls = stubSerpApi(q => ({ body: { local_results: q.includes('Nkawkaw') ? [] : [shop('Eastern Freight')] } }))
    const { result, area, tried } = await findProspectsWidening({ industries: ['Logistics'], country: 'Ghana' }, ['Nkawkaw, Eastern', 'Eastern', ''])
    expect(area).toBe('Eastern')
    expect(tried).toEqual(['Nkawkaw, Eastern', 'Eastern'])
    expect(result.candidates.map(c => c.name)).toEqual(['Eastern Freight'])
    expect(calls).toHaveLength(2)
  })

  it('stops at a quota error instead of spending more searches', async () => {
    const calls = stubSerpApi(() => ({ status: 429, body: { error: 'Your account has run out of searches.' } }))
    const { result, tried } = await findProspectsWidening({ industries: ['Logistics'], country: 'Ghana' }, ['Nkawkaw, Eastern', 'Eastern', ''])
    expect(result.error).toBe('quota')
    expect(tried).toEqual(['Nkawkaw, Eastern'])
    expect(calls).toHaveLength(1)
  })
})
