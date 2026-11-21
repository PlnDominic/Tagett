import { randomBytes } from 'crypto'

// Node-only (kept out of lib/auth.ts, which the Edge middleware imports).
// Random 12-char password with no look-alike characters.
export function generatePassword(): string {
  // 12 chars, no look-alikes; meets Supabase's default minimum.
  const alphabet = 'abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  const bytes = randomBytes(12)
  return Array.from(bytes, b => alphabet[b % alphabet.length]).join('')
}

