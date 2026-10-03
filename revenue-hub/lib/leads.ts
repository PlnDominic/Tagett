// Reads a lead list written in ProspectBot's format ("1. Business Name — X",
// "Phone:", "Estimated value:", "Source:" …) back into structured leads for
// the Import button. Used for ProspectBot and SocialScout replies alike.
import type { ParsedProspect } from '@/lib/types'

export function parseProspects(text: string): ParsedProspect[] {
  // Split on numbered prospect blocks (1., 2., 3. …)
  const blocks = text.split(/(?=\n\s*\d+\.\s+Business Name|\n\s*---|\n\s*\*\*\d+\.)/i)
  const results: ParsedProspect[] = []

  for (const block of blocks) {
    const nameMatch = block.match(/Business Name\s*[—–\-]+\s*(.+?)(?:\n|$)/i)
      || block.match(/^\s*\d+\.\s+\*{0,2}(.+?)\*{0,2}\s*(?:\n|$)/)
    if (!nameMatch) continue
    const name = nameMatch[1].replace(/\*+/g, '').trim()
    if (name.length < 2) continue

    const field = (label: string) => {
      const m = block.match(new RegExp(label + '\\s*:?\\s*(.+?)(?:\\n|$)', 'i'))
      return m ? m[1].replace(/\*+/g, '').trim() : undefined
    }

    const phoneRaw = field('Phone')
    let phone: string | undefined
    if (phoneRaw) {
      const digits = phoneRaw.replace(/\D/g, '')
      if (digits.startsWith('233') && digits.length === 12) phone = '+' + digits
      else if (digits.startsWith('0') && digits.length === 10) phone = '+233' + digits.slice(1)
      else if (digits.length === 9) phone = '+233' + digits
      else phone = phoneRaw
    }

    const valueRaw = field('Estimated value')
    let valueGHS = 0
    let valueLocal: number | undefined
    // A value quoted in another currency (£1,500, KSh 30,000, kr 15,000) is
    // not GHS: keep it as valueLocal, converted to GHS on import, rather than
    // store it as the wrong GHS amount.
    const foreignCurrency = valueRaw && !/GHS|₵/i.test(valueRaw) && /[£$€₦]|KSh|\bkr\b|zł|\bR\s?\d|MX\$|[A-Z]{2,3}\s?\d/.test(valueRaw)
    if (valueRaw && !foreignCurrency) {
      const m = valueRaw.match(/GHS\s*([\d,]+)|₵\s*([\d,]+)|([\d,]+)/)
      if (m) valueGHS = parseInt((m[1] || m[2] || m[3]).replace(/,/g, ''), 10) || 0
    } else if (valueRaw) {
      const m = valueRaw.match(/\d[\d,]*/)
      if (m) valueLocal = parseInt(m[0].replace(/,/g, ''), 10) || undefined
    }

    const pitchRaw = field('Phone pitch')
    const phonePitch = pitchRaw ? pitchRaw.replace(/^["""'`]|["""'`]$/g, '').trim() : undefined

    results.push({
      name,
      industry: field('Industry') ?? 'Unknown',
      address: field('Address'),
      phone,
      whyNeedsWebsite: field('Why they need a website') ?? field('Why they need a better website'),
      // Weak-website leads: their site and what's wrong with it.
      websiteUrl: field('Website')?.match(/https?:\/\/\S+/)?.[0],
      siteIssue: field('Website issue'),
      country: field('Country'),
      // SocialScout leads carry the post or page they came from.
      sourceUrl: field('Source')?.match(/https?:\/\/\S+/)?.[0]?.replace(/[)\].,]+$/, ''),
      servicePitch: field('Service to pitch'),
      valueGHS,
      valueLocal,
      phonePitch,
    })
  }

  return results.filter(p => p.name.length > 1)
}
