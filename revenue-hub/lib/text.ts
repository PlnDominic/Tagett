// Owner's standing writing rule: no em dashes in anything a client or reader
// sees. The main agents are instructed not to use them, but models slip, and
// the many standalone generation prompts (WhatsApp drafts, status packs,
// proposals, teach posts) never carried the rule at all — so every LLM response
// gets sanitized centrally instead of trusting each prompt.
export function stripEmDashes(s: string): string {
  return s
    // Numeric ranges (GHS 3,500—4,000) become a hyphen, not a comma
    .replace(/(\d)\s*—\s*(\d)/g, '$1-$2')
    // Everything else reads naturally as a comma pause
    .replace(/\s*—\s*/g, ', ')
}
