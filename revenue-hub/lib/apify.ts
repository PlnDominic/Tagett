// Runs an Apify actor and returns its dataset, for the scrapers that read
// what Google doesn't index: Instagram and TikTok comments, and the contact
// details on Facebook Pages and Instagram business profiles.

export function apifyToken(): string | undefined {
  return process.env.APIFY_TOKEN?.trim() || undefined
}

export class ApifyError extends Error {
  constructor(message: string, readonly status: number) { super(message) }
}

export async function runActor(actor: string, input: unknown, timeoutSecs = 45): Promise<Array<Record<string, unknown>>> {
  const token = apifyToken()
  if (!token) throw new ApifyError('APIFY_TOKEN not set', 503)
  const res = await fetch(`https://api.apify.com/v2/acts/${actor}/run-sync-get-dataset-items?timeout=${timeoutSecs}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
    body: JSON.stringify(input),
    signal: AbortSignal.timeout((timeoutSecs + 10) * 1000),
  })
  if (res.status === 402) throw new ApifyError('Apify credit used up for this month', 402)
  if (!res.ok) throw new ApifyError(`Apify ${actor} failed (${res.status})`, 502)
  const items = await res.json()
  return Array.isArray(items) ? items : []
}
