import { describe, expect, it, vi } from 'vitest'

vi.mock('dns', () => {
  const err = (code: string) => Object.assign(new Error(code), { code })
  return {
    promises: {
      resolveMx: vi.fn(async (d: string) => {
        if (d === 'joes.co.uk') return [{ exchange: 'mx.joes.co.uk', priority: 10 }]
        if (d === 'flaky.com') throw err('ETIMEOUT')
        throw err('ENOTFOUND')
      }),
      resolve4: vi.fn(async (d: string) => {
        if (d === 'apex-only.com') return ['1.2.3.4']
        throw Object.assign(new Error('ENOTFOUND'), { code: 'ENOTFOUND' })
      }),
    },
  }
})

const { domainAcceptsMail, emailAcceptsMail } = await import('@/lib/mail-check')

describe('domainAcceptsMail', () => {
  it('accepts domains with a mail server, or an address to fall back to', async () => {
    expect(await domainAcceptsMail('joes.co.uk')).toBe(true)
    expect(await domainAcceptsMail('apex-only.com')).toBe(true)
    expect(await emailAcceptsMail('owner@gmail.com')).toBe(true)
  })

  it('rejects domains that cannot receive email, but not on a DNS hiccup', async () => {
    expect(await domainAcceptsMail('joes-typo.co.uk')).toBe(false)
    expect(await domainAcceptsMail('flaky.com')).toBe(true)
    expect(await emailAcceptsMail('not-an-email')).toBe(false)
  })
})
