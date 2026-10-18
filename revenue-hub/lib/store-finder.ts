// Finding e-commerce brands abroad and the contact details they publish.
// Stores are found through Google (Shopify stores have /collections/ pages,
// WooCommerce stores /product-category/), limited to the market's own
// domains. Each store's own site is then read: homepage, contact and
// imprint pages, and Shopify's legal pages, which by law and by Shopify's
// templates usually carry the store's email and legal owner. Only details
// the business itself published are kept; no address is ever guessed.

import { contactLinks, extractPageEmails } from './site-emails'

export const ECOMMERCE_INDUSTRIES = [
  'Fashion & Apparel', 'Beauty & Skincare', 'Jewellery & Watches', 'Home Decor & Furniture',
  'Pet Supplies', 'Health & Supplements', 'Sports & Fitness', 'Kids & Baby',
  'Food & Drink', 'Coffee & Tea', 'Art & Prints', 'Outdoor & Camping',
  'Phone & Tech Accessories', 'Bags & Leather Goods', 'Candles & Gifts', 'Shoes & Sneakers',
]

/** The market's own web domain, so a search stays in that country. */
const COUNTRY_TLD: Record<string, string> = {
  'United Kingdom': '.co.uk', 'Ireland': '.ie', 'Germany': '.de', 'Austria': '.at', 'Switzerland': '.ch',
  'France': '.fr', 'Belgium': '.be', 'Netherlands': '.nl', 'Spain': '.es', 'Italy': '.it', 'Portugal': '.pt',
  'Sweden': '.se', 'Norway': '.no', 'Denmark': '.dk', 'Poland': '.pl', 'Canada': '.ca', 'Australia': '.com.au',
  'New Zealand': '.co.nz', 'South Africa': '.co.za', 'Nigeria': '.ng', 'Kenya': '.co.ke', 'Ghana': '.com.gh', 'Mexico': '.mx',
}

// Marketplaces, social sites and platforms: never a brand's own store.
const NOT_A_STORE = /(^|\.)(amazon|ebay|etsy|aliexpress|alibaba|temu|shein|walmart|target|zalando|asos|facebook|instagram|pinterest|youtube|tiktok|twitter|x|reddit|wikipedia|linkedin|shopify|myshopify|wordpress|woocommerce|google|apple|trustpilot|yelp|tripadvisor|notonthehighstreet|depop|vinted|bol|otto|cdiscount|allegro|takealot|jumia|mercadolibre)\./i

export function storeQueries(industry: string, country: string): string[] {
  const tld = COUNTRY_TLD[country]
  const place = tld ? `site:${tld}` : `"${country}"`
  return [
    `${industry} inurl:collections ${place}`,
    `${industry} inurl:product-category ${place}`,
  ]
}

/** https://www.shop.co.uk/collections/x -> https://www.shop.co.uk ; null for marketplaces. */
export function storeOrigin(url: string): string | null {
  let u: URL
  try { u = new URL(url) } catch { return null }
  const host = u.hostname.toLowerCase()
  if (NOT_A_STORE.test(host + '.')) return null
  return `${u.protocol}//${host}`
}

export type StorePlatform = 'Shopify' | 'WooCommerce' | 'Wix' | 'Squarespace' | 'BigCommerce' | 'Other'

export function detectPlatform(html: string): StorePlatform {
  if (/cdn\.shopify\.com|Shopify\.theme|shopify-section/i.test(html)) return 'Shopify'
  if (/woocommerce|wc-block|\/wp-content\//i.test(html)) return 'WooCommerce'
  if (/static\.wixstatic\.com|wix-warmup-data/i.test(html)) return 'Wix'
  if (/squarespace\.com|static1\.squarespace/i.test(html)) return 'Squarespace'
  if (/bigcommerce\.com|stencil-utils/i.test(html)) return 'BigCommerce'
  return 'Other'
}

export function storeName(html: string, origin: string): string {
  const og = html.match(/<meta[^>]+property=["']og:site_name["'][^>]+content=["']([^"']+)["']/i)?.[1]
    ?? html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:site_name["']/i)?.[1]
  const title = html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1]?.split(/\s[|–—-]\s/)[0]
  const name = (og ?? title ?? '').replace(/&amp;/g, '&').replace(/&#39;|&apos;/g, "'").trim()
  return name || new URL(origin).hostname.replace(/^www\./, '')
}

// "Geschäftsführer: Anna Schmidt", "Owner – Tom Price", "Founded by Lisa Wong"...
const OWNER_LABEL = /(?:Gesch(?:ä|ae)ftsf(?:ü|ue)hrer(?:in)?|Inhaber(?:in)?|Vertreten durch|Vertretungsberechtigt(?:e|er)?|Owner|Proprietor|Co-?founder|Founder|Managing Director|Director|G(?:é|e)rant(?:e)?|Propri(?:é|e)taire|Fondat(?:eur|rice)|Eigenaar|Oprichter|Titolare|Fundador(?:a)?|Daglig leder|(?:Ä|A)gare|Indehaver|Founded by|Run by)\s*(?:[:\-–]|is|by)?\s*/iu
const NAME = /([A-ZÀ-ÖØ-Þ][\p{Ll}'’.-]+(?:[ -][A-ZÀ-ÖØ-Þ][\p{Ll}'’.-]+){1,2})/u

/** A person's name the site publishes as its owner, founder or director. */
// Words that follow a name on an imprint and aren't part of it.
const AFTER_NAME = /^(Handelsregister|Registergericht|Registernummer|Amtsgericht|Sitz|Anschrift|Adresse|Address|Kontakt|Contact|E-?Mail|Email|Telefon|Tel|Phone|Fax|Mobil|Mobile|USt|VAT|Steuernummer|Website|Web|Company|Registered|Siret|Siren|Kvk|Btw)\b/i

export function ownerName(text: string): string | undefined {
  // Names never span lines, so lines stay apart.
  const flat = text.replace(/[ \t]+/g, ' ')
  // Labels in any case ("OWNER", "Inhaber"), but the name itself must be
  // capitalised, so one flag can't cover both: find the label, then the name.
  const nameAt = new RegExp('^' + NAME.source, 'u')
  for (const m of flat.matchAll(new RegExp(OWNER_LABEL.source, 'giu'))) {
    const found = flat.slice((m.index ?? 0) + m[0].length).match(nameAt)
    if (!found) continue
    const words = found[1].trim().replace(/[.,]$/, '').split(' ')
    while (words.length > 2 && AFTER_NAME.test(words[words.length - 1])) words.pop()
    const name = words.join(' ')
    // Skip label words caught as names ("Owner Contact Us").
    if (!/\b(Contact|Shop|Store|Privacy|Policy|Terms|Limited|Ltd|GmbH|Company|Team|Customer|Service|Email|Phone)\b/i.test(name)) return name
  }
  return undefined
}

const SOCIAL_RE = /https?:\/\/(?:www\.)?(instagram\.com|facebook\.com|tiktok\.com|linkedin\.com\/company|pinterest\.[a-z.]+)\/[^\s"'<>?#]+/gi

export function socialLinks(html: string): string[] {
  const seen = new Map<string, string>()
  for (const m of html.matchAll(SOCIAL_RE)) {
    const site = m[1].toLowerCase().split('.')[0]
    if (!seen.has(site) && !/sharer|share|intent|plugins|tr\?|dialog/i.test(m[0])) seen.set(site, m[0].replace(/\/+$/, ''))
  }
  return Array.from(seen.values()).slice(0, 4)
}

/** An address that names a person (anna@, anna.schmidt@) rather than an inbox (info@, shop@). */
export function isPersonalEmail(email: string, owner?: string): boolean {
  const local = email.split('@')[0].toLowerCase()
  if (/^(info|hello|hi|contact|support|help|shop|store|sales|orders?|service|kundenservice|team|office|mail|admin|enquiries|care|customercare|returns|bonjour|hallo|kontakt|post|ciao|hola)\b/.test(local)) return false
  if (owner) {
    const first = owner.split(' ')[0].toLowerCase().normalize('NFKD').replace(/[^a-z]/g, '')
    if (first.length > 2 && local.normalize('NFKD').replace(/[^a-z]/g, '').includes(first)) return true
  }
  return /^[a-z]+([._-][a-z]+)?$/.test(local) && local.length <= 20
}

export interface StoreContacts {
  origin: string
  name: string
  platform: StorePlatform
  emails: Array<{ email: string; personal: boolean; page: string }>
  ownerName?: string
  phone?: string
  socials: string[]
}

async function fetchHtml(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; TagettBot/1.0; +https://ecstasytechnologies.com)', Accept: 'text/html' },
      signal: AbortSignal.timeout(8000),
      redirect: 'follow',
    })
    if (!res.ok || !(res.headers.get('content-type') ?? 'text/html').includes('html')) return null
    return (await res.text()).slice(0, 1_500_000)
  } catch {
    return null
  }
}

const textOf = (html: string) => html.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, ' ').replace(/<\/?(br|p|div|li|tr|td|h\d|section|footer|header)\b[^>]*>/gi, '\n').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ')

/** Reads one store's public contact details from its own pages. */
export async function inspectStore(origin: string): Promise<StoreContacts | null> {
  const home = await fetchHtml(origin)
  if (!home) return null
  const platform = detectPlatform(home)
  const pages = [
    ...contactLinks(home, origin, 3),
    // Shopify's legal pages carry the store's email and legal name on almost every store.
    ...(platform === 'Shopify' ? ['/policies/privacy-policy', '/policies/refund-policy', '/pages/contact'].map(p => new URL(p, origin).toString()) : []),
  ].filter((u, i, all) => all.indexOf(u) === i).slice(0, 5)
  const htmls = await Promise.all(pages.map(fetchHtml))

  const emails: StoreContacts['emails'] = []
  const all: Array<[string, string]> = [[origin, home], ...pages.map((p, i) => [p, htmls[i]] as [string, string | null]).filter((x): x is [string, string] => !!x[1])]
  let owner: string | undefined
  let phone: string | undefined
  for (const [page, html] of all) {
    const text = textOf(html)
    owner ??= ownerName(text)
    phone ??= text.match(/(?:Tel(?:efon)?|Phone|Téléphone|Telefoon)\.?\s*[:]?\s*(\+?[\d][\d\s()/-]{7,}\d)/i)?.[1]?.trim()
    for (const email of extractPageEmails(html)) {
      if (!emails.some(e => e.email === email)) emails.push({ email, personal: false, page })
    }
  }
  // Prefer the store's own domain over a gmail in the footer, then mark personal ones.
  const host = new URL(origin).hostname.replace(/^www\./, '')
  emails.sort((a, b) => Number(b.email.endsWith('@' + host)) - Number(a.email.endsWith('@' + host)))
  emails.forEach(e => { e.personal = isPersonalEmail(e.email, owner) })
  return { origin, name: storeName(home, origin), platform, emails: emails.slice(0, 4), ownerName: owner, phone, socials: socialLinks(home) }
}
