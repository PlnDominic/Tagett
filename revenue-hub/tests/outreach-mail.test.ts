import { beforeEach, describe, expect, it, vi } from 'vitest'

const sent: Array<{ text: string; html: string; from: string; replyTo: string; headers: Record<string, string> }> = []
vi.mock('nodemailer', () => ({
  default: { createTransport: () => ({ sendMail: async (m: (typeof sent)[number]) => { sent.push(m) } }) },
}))

import { sendOutreachEmail, SIGNATURE } from '@/lib/outreach-mail'

beforeEach(() => { sent.length = 0 })

describe('outreach email', () => {
  it('adds the signature, in italics in the HTML part', async () => {
    await sendOutreachEmail({ to: 'a@b.com', subject: 'quick idea', text: 'Hi,\n\nBody.\n\nBest regards,' })
    const [m] = sent
    for (const line of SIGNATURE) expect(m.text).toContain(line)
    expect(m.html).toMatch(/<em[^>]*>Pln\. Dominic Kudom<br>Chief Executive Officer<br>Ecstasy Technologies<br>dominic@ecstasytechnologies\.com<br>\+233\(0\)542855399<\/em>/)
  })

  it('puts the signature after the message and before the opt-out footer', async () => {
    await sendOutreachEmail({ to: 'a@b.com', subject: 's', text: 'Body.' })
    const t = sent[0].text
    expect(t.indexOf('Body.')).toBeLessThan(t.indexOf('Pln. Dominic Kudom'))
    expect(t.indexOf('Pln. Dominic Kudom')).toBeLessThan(t.indexOf('Reply "stop"'))
  })

  it('sends a complete HTML document from support@, with an unsubscribe header', async () => {
    await sendOutreachEmail({ to: 'a@b.com', subject: 's', text: 'Body.' })
    const m = sent[0]
    expect(m.html.startsWith('<!DOCTYPE html><html>')).toBe(true)
    expect(m.from).toContain('<support@ecstasytechnologies.com>')
    expect(m.replyTo).toBe('support@ecstasytechnologies.com')
    expect(m.headers['List-Unsubscribe']).toContain('mailto:support@ecstasytechnologies.com')
  })

  it('escapes HTML in the message', async () => {
    await sendOutreachEmail({ to: 'a@b.com', subject: 's', text: '<script>x</script>' })
    expect(sent[0].html).not.toContain('<script>')
  })
})
