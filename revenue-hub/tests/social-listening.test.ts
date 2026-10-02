import { describe, expect, it } from 'vitest'
import { buildListenQuery, commenterFrom, messageUrl, postRef, xReplyUrl } from '@/lib/social-listening'

describe('postRef', () => {
  it('reads the author and id of an X post', () => {
    expect(postRef('https://x.com/kofi_bakes/status/1789?s=20')).toEqual({ platform: 'x', author: 'kofi_bakes', postId: '1789' })
    expect(postRef('https://twitter.com/kofi_bakes')).toBeNull()
  })

  it('accepts Facebook posts but not pages or groups', () => {
    expect(postRef('https://www.facebook.com/gracefoods/posts/pfbid02abc')).toEqual({ platform: 'facebook', author: 'gracefoods' })
    expect(postRef('https://www.facebook.com/groups/123/posts/456/')).toEqual({ platform: 'facebook' })
    expect(postRef('https://www.facebook.com/gracefoods')).toBeNull()
    expect(postRef('https://www.facebook.com/groups/123')).toBeNull()
  })

  it('accepts Instagram and TikTok posts only', () => {
    expect(postRef('https://www.instagram.com/p/C1abc/')).toEqual({ platform: 'instagram' })
    expect(postRef('https://www.instagram.com/shopgh/reel/C1abc/')).toEqual({ platform: 'instagram', author: 'shopgh' })
    expect(postRef('https://www.instagram.com/shopgh/')).toBeNull()
    expect(postRef('https://www.tiktok.com/@shopgh/video/7301')).toEqual({ platform: 'tiktok', author: 'shopgh' })
    expect(postRef('https://www.tiktok.com/@shopgh')).toBeNull()
  })
})

describe('queries and links', () => {
  it('quotes every phrase and limits to the platform', () => {
    expect(buildListenQuery('facebook', ['I need a website', 'need a developer'], 'Ghana'))
      .toBe('site:facebook.com ("I need a website" OR "need a developer") Ghana')
  })

  it('opens a DM where the platform allows it', () => {
    expect(messageUrl('instagram', '@shop.gh')).toBe('https://ig.me/m/shop.gh')
    expect(messageUrl('facebook', 'gracefoods')).toBe('https://m.me/gracefoods')
    expect(messageUrl('tiktok', 'shopgh')).toBe('https://www.tiktok.com/@shopgh')
    expect(xReplyUrl('1789', 'Hi & hello')).toBe('https://x.com/intent/post?in_reply_to=1789&text=Hi%20%26%20hello')
  })
})

describe('commenterFrom', () => {
  it('reads Instagram and TikTok scraper items', () => {
    expect(commenterFrom({ ownerUsername: 'shop.gh', text: 'We sell shea butter' })).toEqual({ handle: 'shop.gh', text: 'We sell shea butter' })
    expect(commenterFrom({ uniqueId: 'kofi', text: 'Cakes in Accra' })).toEqual({ handle: 'kofi', text: 'Cakes in Accra' })
    expect(commenterFrom({ user: { uniqueId: 'ama' }, text: 'Braids' })).toEqual({ handle: 'ama', text: 'Braids' })
    expect(commenterFrom({ text: 'no author' })).toBeNull()
  })
})
