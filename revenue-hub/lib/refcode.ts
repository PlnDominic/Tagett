/**
 * Short code an inbound message quotes to say which post it came from. It
 * used to be the id's last 4 characters, which for ids like "1727…087-0"
 * gave "87-0": a hyphen, and only two digits of timestamp, so posts made
 * close together collided. A hash of the whole id gives 4 clean characters
 * that differ between posts.
 */
export function refCodeFor(id: string): string {
  let h = 2166136261
  for (let i = 0; i < id.length; i++) h = Math.imul(h ^ id.charCodeAt(i), 16777619) >>> 0
  // No 0/O or 1/I, so a code read out over the phone isn't misheard.
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < 4; i++) { code += alphabet[h % alphabet.length]; h = Math.floor(h / alphabet.length) }
  return code
}
