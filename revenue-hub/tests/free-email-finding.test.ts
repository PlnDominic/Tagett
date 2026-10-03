import { afterEach, describe, expect, it, vi } from 'vitest'
import { contactLinks, crawlSiteEmails, decodeCfEmail, extractPageEmails } from '@/lib/site-emails'
import { findWithProviders } from '@/lib/email-providers'

const cf = (email: string, key = 0x42) =>
  key.toString(16).padStart(2, '0') + Array.from(email).map(c => (c.charCodeAt(0) ^ key).toString(16).padStart(2, '0')).join('')

describe('extractPageEmails', () => {
  it('reads plain, mailto, written-out and Cloudflare-protected addresses', () => {
    const html = `
      <a href="mailto:Hello%40joes.co.uk?subject=Hi">Email us</a>
      <p>Bookings: bookings [at] joes [dot] co [dot] uk</p>
      <p>Inhaber: info(at)baeckerei-mueller.de</p>
      <span class="__cf_email__" data-cfemail="${cf('owner@joes.co.uk')}">[email protected]</span>
      <img src="logo@2x.png"> <p>noreply@joes.co.uk</p>`
    expect(extractPageEmails(html).sort()).toEqual([
      'bookings@joes.co.uk', 'hello@joes.co.uk', 'info@baeckerei-mueller.de', 'owner@joes.co.uk',
    ])
  })

  it('decodes Cloudflare email protection', () => {
    expect(decodeCfEmail(cf('a@b.co', 0x1f))).toBe('a@b.co')
  })
})

describe('contactLinks', () => {
  it('finds contact and imprint pages on the same site, imprint first', () => {
    const html = `<a href="/ueber-uns">Über uns</a><a href="/kontakt">Kontakt</a><a href="https://x.com/impressum">Impressum</a>
      <a href="https://other.com/contact">Contact</a><a href="/impressum">Impressum</a><a href="/menu">Menu</a>`
    expect(contactLinks(html, 'https://www.mueller.de/')).toEqual([
      'https://www.mueller.de/impressum', 'https://www.mueller.de/kontakt', 'https://www.mueller.de/ueber-uns',
    ])
  })
})

describe('crawlSiteEmails', () => {
  afterEach(() => { vi.unstubAllGlobals() })

  it('follows the imprint link when the homepage has no address', async () => {
    const pages: Record<string, string> = {
      'https://mueller.de/': '<a href="/impressum">Impressum</a>',
      'https://mueller.de/impressum': '<p>E-Mail: info@mueller.de</p>',
    }
    vi.stubGlobal('fetch', vi.fn(async (url: string) => pages[url]
      ? new Response(pages[url], { headers: { 'content-type': 'text/html' } })
      : new Response('', { status: 404 })))
    expect(await crawlSiteEmails('mueller.de')).toEqual([{ email: 'info@mueller.de', page: 'https://mueller.de/impressum' }])
  })
})

describe('findWithProviders', () => {
  afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs() })

  it('skips providers without keys and stops at the first with an address', async () => {
    vi.stubEnv('HUNTER_API_KEY', 'h')
    vi.stubEnv('TOMBA_KEY', 't'); vi.stubEnv('TOMBA_SECRET', 's')
    vi.stubEnv('SNOV_CLIENT_ID', ''); vi.stubEnv('SNOV_CLIENT_SECRET', '')
    const calls: string[] = []
    vi.stubGlobal('fetch', vi.fn(async (url: string) => {
      calls.push(new URL(url).hostname)
      if (url.includes('hunter.io')) return new Response(JSON.stringify({ data: { emails: [] } }))
      return new Response(JSON.stringify({ data: { emails: [{ email: 'jane@joes.com' }, { email: 'info@joes.com' }, { email: 'x@gmail.com' }] } }))
    }))
    const found = await findWithProviders('joes.com')
    expect(calls).toEqual(['api.hunter.io', 'api.tomba.io'])
    expect(found.map(f => f.email)).toEqual(['info@joes.com', 'jane@joes.com'])
  })
})
