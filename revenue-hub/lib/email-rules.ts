// Cold-email rules per market, for the Send button and the email session.
// This is working guidance on each country's anti-spam law as it applies to
// unsolicited business-to-business email, not legal advice; when in doubt the
// stricter reading is used.

export type ColdEmailRule =
  /** Allowed to businesses with a clear opt-out (every email has one). */
  | 'allowed'
  /** Allowed to companies (Ltd, GmbH, BV...); sole traders need consent. */
  | 'companies'
  /** Allowed when they published the address themselves and the offer suits their business. */
  | 'published'
  /** Unsolicited marketing email needs prior consent, businesses included. */
  | 'consent'

const RULES: Record<string, ColdEmailRule> = {
  'United States': 'allowed',      // CAN-SPAM: opt-out based
  'Mexico': 'allowed',
  'Ghana': 'allowed',
  'Nigeria': 'allowed',
  'Kenya': 'allowed',
  'United Kingdom': 'companies',   // PECR: corporate subscribers only
  'Ireland': 'companies',
  'Netherlands': 'companies',
  'Belgium': 'companies',
  'Portugal': 'companies',
  'Sweden': 'companies',
  'Norway': 'companies',
  'Canada': 'published',           // CASL conspicuous-publication exemption
  'Australia': 'published',        // Spam Act inferred consent
  'New Zealand': 'published',
  'France': 'published',           // B2B allowed when relevant to their work
  'Germany': 'consent',            // UWG §7: consent even B2B
  'Austria': 'consent',
  'Switzerland': 'consent',
  'Denmark': 'consent',
  'Spain': 'consent',
  'Italy': 'consent',
  'Poland': 'consent',
  'South Africa': 'consent',       // POPIA s69 covers businesses too
}

export function coldEmailRule(country: string | undefined): ColdEmailRule {
  return (country && RULES[country]) || 'allowed'
}

export const RULE_NOTES: Record<ColdEmailRule, string> = {
  allowed: 'Cold email to businesses is allowed here, with the opt-out line every email already carries.',
  companies: 'Allowed to companies (Ltd and similar). A sole trader or partnership needs to have agreed first.',
  published: 'Allowed when they published this address themselves and your offer suits their business. Mention where you found it.',
  consent: 'Unsolicited marketing email needs their prior consent here, businesses included. Use a social message, their contact form or a call instead, unless they asked you to email them.',
}

/** Whether sending needs the sender to confirm consent first. */
export function needsConsent(country: string | undefined): boolean {
  return coldEmailRule(country) === 'consent'
}
