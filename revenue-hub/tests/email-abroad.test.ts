import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { coldEmailRule, needsConsent } from '@/lib/email-rules'
import { emailsFromProfile, isSingleListing } from '@/lib/email-sources'
import { auditSite, siteIssue } from '@/lib/site-audit'
import { findProspects } from '@/lib/prospect-search'

describe('cold email rules', () => {
  it('knows the strict markets and defaults to allowed', () => {
    expect(needsConsent('Germany')).toBe(true)
    expect(coldEmailRule('United Kingdom')).toBe('companies')
    expect(coldEmailRule('Canada')).toBe('published')
    expect(coldEmailRule('United States')).toBe('allowed')
    expect(coldEmailRule(undefined)).toBe('allowed')
  })
})

describe('isSingleListing', () => {
  it('accepts a business page and rejects search pages', () => {
    expect(isSingleListing('https://www.yell.com/biz/joes-plumbing-manchester-123/')).toBe(true)
    expect(isSingleListing('https://www.yelp.com/biz/joes-diner-austin')).toBe(true)
    expect(isSingleListing('https://www.yell.com/ucs/UcsSearchAction.do?keywords=plumber')).toBe(false)
    expect(isSingleListing('https://www.yellowpages.com/search?search_terms=plumber')).toBe(false)
  })
})

describe('emailsFromProfile', () => {
  it('prefers email fields, reads the bio, and drops platform addresses', () => {
    const fb = { title: 'Joe Diner', email: 'Hello@JoesDiner.com', info: ['Call us'], about: 'support@facebook.com' }
    expect(emailsFromProfile(fb)).toEqual(['hello@joesdiner.com'])
    const ig = { username: 'joes', biography: 'Bookings: joesdiner@gmail.com 📸', profilePicUrl: 'https://x.cdninstagram.com/a@2x.jpg' }
    expect(emailsFromProfile(ig)).toEqual(['joesdiner@gmail.com'])
  })
})

describe('site audit', () => {
  afterEach(() => { vi.unstubAllGlobals() })

  it('leads with the most useful problem', () => {
    expect(siteIssue({ https: true, down: true })).toBe('site does not load')
    expect(siteIssue({ https: true, score: 31 })).toBe('scores 31/100 for speed on phones')
    expect(siteIssue({ https: false, score: 80 })).toMatch(/not secure/)
    expect(siteIssue({ https: true, score: 80 })).toBeNull()
  })

  it('reads the PageSpeed score and tells quota apart from a dead site', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ lighthouseResult: { categories: { performance: { score: 0.31 } } } }))))
    expect(await auditSite('joes.com')).toEqual({ https: true, score: 31 })
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ error: { code: 429, message: 'Quota exceeded' } }), { status: 429 })))
    expect((await auditSite('joes.com')).quota).toBe(true)
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ error: { code: 500, message: 'Lighthouse returned error: FAILED_DOCUMENT_REQUEST' } }), { status: 500 })))
    expect((await auditSite('joes.com')).down).toBe(true)
  })
})

describe('weak-website search', () => {
  beforeEach(() => { vi.stubEnv('SERPAPI_KEY', 'test') })
  afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs() })

  it('keeps businesses whose site has a problem, with the problem', async () => {
    const places = [
      { title: 'Fast Co', website: 'https://fast.co', reviews: 50, phone: '020 7946 0001' },
      { title: 'Slow Co', website: 'https://slow.co', reviews: 40, phone: '020 7946 0002' },
      { title: 'No Site Co', reviews: 90, phone: '020 7946 0003' },
    ]
    vi.stubGlobal('fetch', vi.fn(async (url: string) => {
      if (url.includes('serpapi.com')) return new Response(JSON.stringify({ local_results: places }))
      const score = url.includes('slow.co') ? 0.22 : 0.9
      return new Response(JSON.stringify({ lighthouseResult: { categories: { performance: { score } } } }))
    }))
    const r = await findProspects({ industries: ['Plumbers'], city: 'Leeds', country: 'United Kingdom', target: 'weak-site' })
    expect(r.candidates.map(c => [c.name, c.website, c.siteIssue])).toEqual([['Slow Co', 'https://slow.co', 'scores 22/100 for speed on phones']])
    expect(r.stats).toMatchObject({ withWebsite: 2, audited: 2, fine: 1 })
  })
})
