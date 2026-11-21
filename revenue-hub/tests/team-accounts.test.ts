import { describe, expect, it } from 'vitest'
import { dedupeKeys, phoneKey } from '../lib/dedupe'
import { parseEmailList, resolveRole } from '../lib/auth'

describe('resolveRole', () => {
  const admins = parseEmailList('Boss@Example.com, ')
  it('treats a listed email as admin regardless of metadata', () => {
    expect(resolveRole({ email: 'boss@example.com', app_metadata: {} }, admins)).toBe('admin')
  })
  it('lets an account created by an admin in as a member', () => {
    expect(resolveRole({ email: 'rep@example.com', app_metadata: { role: 'member' } }, admins)).toBe('member')
  })
  it('rejects a stranger who signed up themselves when admins are configured', () => {
    expect(resolveRole({ email: 'x@example.com', app_metadata: {} }, admins)).toBeNull()
  })
  it('ignores a role a user wrote on themselves in user_metadata', () => {
    expect(resolveRole({ email: 'x@example.com', app_metadata: {}, ...({ user_metadata: { role: 'admin' } } as object) }, admins)).toBeNull()
  })
  it('keeps the single-operator behaviour when no admins are configured', () => {
    expect(resolveRole({ email: 'me@example.com', app_metadata: {} }, [])).toBe('admin')
    expect(resolveRole({ email: 'rep@example.com', app_metadata: { role: 'member' } }, [])).toBe('member')
  })
})

describe('dedupeKeys — same business, two reps', () => {
  const overlaps = (a: Parameters<typeof dedupeKeys>[0], b: Parameters<typeof dedupeKeys>[0]) => {
    const k = new Set(dedupeKeys(a)); return dedupeKeys(b).some(x => k.has(x))
  }
  it('matches one phone number written three ways', () => {
    expect(phoneKey('0244 123 456')).toBe(phoneKey('+233 244 123 456'))
    expect(overlaps({ name: 'A', phone: '0244123456' }, { name: 'B', phone: '+233244123456' })).toBe(true)
  })
  it('matches on email, website host or normalised name', () => {
    expect(overlaps({ name: 'A', email: 'Info@Shop.com' }, { name: 'B', email: 'info@shop.com' })).toBe(true)
    expect(overlaps({ name: 'A', websiteCheckUrl: 'https://www.shop.com/about' }, { name: 'B', websiteCheckUrl: 'shop.com' })).toBe(true)
    expect(overlaps({ name: 'Accra Bakery Ltd', country: 'Ghana' }, { name: 'accra bakery', country: 'Ghana' })).toBe(true)
  })
  it('does not match different businesses', () => {
    expect(overlaps({ name: 'Accra Bakery', phone: '0244123456' }, { name: 'Kumasi Bakery', phone: '0244123999' })).toBe(false)
  })
})
