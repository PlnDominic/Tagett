import { describe, expect, it } from 'vitest'
import { pickSocials, profileNetwork } from '@/lib/socials'

describe('profileNetwork', () => {
  it('accepts profile pages', () => {
    expect(profileNetwork('https://www.facebook.com/HebdenPlumbing')).toBe('facebook')
    expect(profileNetwork('https://web.facebook.com/people/Hebden-Plumbing/100063/')).toBe('facebook')
    expect(profileNetwork('https://www.instagram.com/hebdenplumbing/')).toBe('instagram')
    expect(profileNetwork('https://uk.linkedin.com/company/hebden-plumbing')).toBe('linkedin')
    expect(profileNetwork('https://www.tiktok.com/@hebdenplumbing')).toBe('tiktok')
    expect(profileNetwork('https://x.com/hebdenplumbing')).toBe('x')
  })

  it('rejects posts, groups, events and personal LinkedIn pages', () => {
    for (const url of [
      'https://www.facebook.com/groups/hebdenbridge/',
      'https://www.facebook.com/HebdenPlumbing/posts/123',
      'https://www.facebook.com/events/42',
      'https://www.instagram.com/p/Cx1/',
      'https://www.linkedin.com/in/john-smith',
      'https://www.tiktok.com/@hebden/video/1',
      'https://x.com/hebden/status/1',
      'https://example.com/hebden',
    ]) expect(profileNetwork(url), url).toBeNull()
  })
})

describe('pickSocials', () => {
  it('keeps one profile per network that names the business', () => {
    const s = pickSocials('Hebden Plumbing Ltd', [
      { link: 'https://www.facebook.com/HebdenPlumbingHeating', title: 'Hebden Plumbing & Heating | Hebden Bridge' },
      { link: 'https://www.facebook.com/otherplumber', title: 'Hebden Plumbing fans' },
      { link: 'https://www.instagram.com/hebdenplumbing/?hl=en', title: 'Instagram' },
      { link: 'https://www.linkedin.com/company/acme-plumbing', title: 'Acme Plumbing' },
    ])
    expect(s.facebook).toBe('https://www.facebook.com/HebdenPlumbingHeating')
    expect(s.instagram).toBe('https://www.instagram.com/hebdenplumbing/') // matched on the handle, query string dropped
    expect(s.linkedin).toBeUndefined() // a different business
  })

  it('finds nothing for a name with no distinctive words', () => {
    expect(pickSocials('The Company Ltd', [{ link: 'https://facebook.com/x', title: 'The Company Ltd' }])).toEqual({})
  })
})
