import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/mail-check', () => ({
  emailAcceptsMail: vi.fn(async (email: string) => !email.endsWith('@dead-domain.de')),
}))

const { detectPlatform, inspectStore, isPersonalEmail, ownerName, storeName, storeOrigin, storeQueries } = await import('@/lib/store-finder')
const { findStores } = await import('@/lib/store-search')

describe('store-finder helpers', () => {
  it('builds Shopify and WooCommerce searches inside the country', () => {
    expect(storeQueries('Pet Supplies', 'United Kingdom')).toEqual([
      'Pet Supplies inurl:collections site:.co.uk', 'Pet Supplies inurl:product-category site:.co.uk',
    ])
  })

  it('keeps brand stores and drops marketplaces', () => {
    expect(storeOrigin('https://www.pawsandco.co.uk/collections/toys?page=2')).toBe('https://www.pawsandco.co.uk')
    expect(storeOrigin('https://www.etsy.com/uk/shop/Paws')).toBeNull()
    expect(storeOrigin('https://paws.myshopify.com/collections/all')).toBeNull()
  })

  it('recognises the platform and the store name', () => {
    expect(detectPlatform('<script src="https://cdn.shopify.com/s/files/x.js"></script>')).toBe('Shopify')
    expect(detectPlatform('<link href="/wp-content/plugins/woocommerce/x.css">')).toBe('WooCommerce')
    expect(storeName('<meta property="og:site_name" content="Paws &amp; Co">', 'https://pawsandco.co.uk')).toBe('Paws & Co')
    expect(storeName('<title>Leder Werk | Handmade bags</title>', 'https://lederwerk.de')).toBe('Leder Werk')
  })

  it('reads owners the site publishes, in several languages', () => {
    expect(ownerName('Impressum Angaben gemäß § 5 TMG Geschäftsführer: Anna Schmidt Handelsregister')).toBe('Anna Schmidt')
    expect(ownerName('Our story. Founded by Lisa Wong in 2019 in Leeds.')).toBe('Lisa Wong')
    expect(ownerName('Gérant : Pierre Dubois')).toBe('Pierre Dubois')
    expect(ownerName('Owner Contact Us today')).toBeUndefined()
  })

  it('tells a person from an inbox', () => {
    expect(isPersonalEmail('anna@lederwerk.de', 'Anna Schmidt')).toBe(true)
    expect(isPersonalEmail('anna.schmidt@lederwerk.de')).toBe(true)
    expect(isPersonalEmail('info@lederwerk.de', 'Anna Schmidt')).toBe(false)
    expect(isPersonalEmail('kundenservice@lederwerk.de')).toBe(false)
  })
})

const html = (body: string) => new Response(body, { headers: { 'content-type': 'text/html' } })

describe('inspectStore', () => {
  afterEach(() => { vi.unstubAllGlobals() })

  it('reads the email and owner from a Shopify store\'s own pages', async () => {
    const pages: Record<string, string> = {
      'https://lederwerk.de': '<meta property="og:site_name" content="Leder Werk"><script src="//cdn.shopify.com/a.js"></script><a href="/pages/impressum">Impressum</a><a href="https://instagram.com/lederwerk">IG</a>',
      'https://lederwerk.de/pages/impressum': '<p>Inhaberin: Anna Schmidt</p><p>E-Mail: anna [at] lederwerk [dot] de</p><p>Telefon: +49 30 1234567</p>',
      'https://lederwerk.de/policies/privacy-policy': '<p>Contact us at info@lederwerk.de</p>',
    }
    vi.stubGlobal('fetch', vi.fn(async (url: string) => pages[url] ? html(pages[url]) : new Response('', { status: 404 })))
    const s = await inspectStore('https://lederwerk.de')
    expect(s).toMatchObject({ name: 'Leder Werk', platform: 'Shopify', ownerName: 'Anna Schmidt', phone: '+49 30 1234567', socials: ['https://instagram.com/lederwerk'] })
    expect(s!.emails).toEqual(expect.arrayContaining([
      expect.objectContaining({ email: 'anna@lederwerk.de', personal: true }),
      expect.objectContaining({ email: 'info@lederwerk.de', personal: false }),
    ]))
  })
})

describe('findStores', () => {
  beforeEach(() => { vi.stubEnv('SERPAPI_KEY', 'test') })
  afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs() })

  it('finds stores, skips known ones, and puts the business inbox and owner email apart', async () => {
    vi.stubGlobal('fetch', vi.fn(async (url: string) => {
      if (url.includes('serpapi.com')) return new Response(JSON.stringify({ organic_results: [
        { link: 'https://lederwerk.de/collections/bags' }, { link: 'https://www.amazon.de/x' },
        { link: 'https://known-shop.de/product-category/x' }, { link: 'https://deadmail.de/collections/a' },
      ] }))
      if (url === 'https://lederwerk.de') return html('<title>Leder Werk</title><p>Inhaberin: Anna Schmidt</p><a href="mailto:info@lederwerk.de">x</a><p>anna@lederwerk.de</p>')
      if (url === 'https://deadmail.de') return html('<title>Dead Mail</title><p>hello@dead-domain.de</p>')
      return new Response('', { status: 404 })
    }))
    const r = await findStores({ industry: 'Bags & Leather Goods', country: 'Germany', excludeSites: ['https://www.known-shop.de/'] })
    expect(r.candidates.map(c => [c.name, c.email, c.ownerEmail, c.contactName])).toEqual([
      ['Leder Werk', 'info@lederwerk.de', 'anna@lederwerk.de', 'Anna Schmidt'],
      ['Dead Mail', undefined, undefined, undefined],
    ])
    expect(r.stats).toMatchObject({ found: 3, alreadyKnown: 1, withEmail: 1 })
  })
})
