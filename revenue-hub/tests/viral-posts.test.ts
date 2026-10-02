import { describe, expect, it } from 'vitest'
import { labelledPosts, plainPostText } from '@/lib/viral-posts'

const reply = `Here are today's posts.

**X (take):**
Most Accra restaurants lose orders at 9pm because nobody answers WhatsApp.
A menu site takes them while you sleep.

LinkedIn (showcase):
We built Lavimac Royal Hotel a booking system.
**Direct bookings** went live in two weeks.

---
This content targets: hotel owners
— Council Check —
⊗ Contrarian: too salesy`

describe('labelledPosts', () => {
  it('splits a reply into one post per label, without the notes', () => {
    const posts = labelledPosts(reply)
    expect(posts.map(p => [p.network, p.type])).toEqual([['x', 'take'], ['linkedin', 'showcase']])
    expect(posts[0].content).toBe('Most Accra restaurants lose orders at 9pm because nobody answers WhatsApp.\nA menu site takes them while you sleep.')
    expect(posts[1].content).toBe('We built Lavimac Royal Hotel a booking system.\nDirect bookings went live in two weeks.')
    expect(posts.some(p => p.content.includes('Contrarian'))).toBe(false)
  })

  it('accepts plain labels and Twitter for X', () => {
    expect(labelledPosts('Twitter: hello world, this is a post\nLinkedIn post: a longer one')).toEqual([
      { network: 'x', type: undefined, content: 'hello world, this is a post' },
      { network: 'linkedin', type: undefined, content: 'a longer one' },
    ])
  })

  it('finds nothing in an unlabelled reply', () => {
    expect(labelledPosts('Just some advice about posting more often.')).toEqual([])
  })
})

describe('plainPostText', () => {
  it('drops markdown bold and separator lines', () => {
    expect(plainPostText('**Bold** and __this__\n---\nend')).toBe('Bold and this\n\nend')
  })
})
