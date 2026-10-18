import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { scrapeContacts, scrapeGraphConfigured, scrapeGraphHealth } from '@/lib/scrapegraph'

describe('website scraper client', () => {
  beforeEach(() => {
    vi.stubEnv('SCRAPEGRAPH_URL', 'https://tagett-scraper.onrender.com/')
    vi.stubEnv('SCRAPEGRAPH_SECRET', 's3cret')
  })
  afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs() })

  it('is off until both settings are present', () => {
    expect(scrapeGraphConfigured()).toBe(true)
    vi.stubEnv('SCRAPEGRAPH_SECRET', '')
    expect(scrapeGraphConfigured()).toBe(false)
  })

  it('sends the secret and reads the contacts', async () => {
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      expect(url).toBe('https://tagett-scraper.onrender.com/extract')
      expect((init?.headers as Record<string, string>)['X-Scraper-Secret']).toBe('s3cret')
      return new Response(JSON.stringify({ ok: true, emails: ['Info@Mueller.de'], phones: ['+49 30 1'], contact_name: 'Hans', summary: 'A bakery', pages: ['https://mueller.de/', 'https://mueller.de/impressum'] }))
    })
    vi.stubGlobal('fetch', fetchMock)
    const r = await scrapeContacts('https://mueller.de/')
    expect(r).toEqual({ emails: ['info@mueller.de'], phones: ['+49 30 1'], contactName: 'Hans', summary: 'A bakery', pages: ['https://mueller.de/', 'https://mueller.de/impressum'] })
  })

  it('explains a wrong secret and a site that did not load', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('', { status: 401 })))
    await expect(scrapeContacts('https://x.de')).rejects.toThrow(/secret/)
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ ok: false, error: 'the website did not load' }))))
    await expect(scrapeContacts('https://x.de')).rejects.toThrow('the website did not load')
  })

  it('reports health without throwing', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('timeout') }))
    expect(await scrapeGraphHealth()).toMatchObject({ ok: false, error: 'timeout' })
  })
})
