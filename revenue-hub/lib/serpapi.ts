// The SerpAPI key as SerpAPI expects it. Keys pasted into Vercel often carry
// a trailing newline or space, quotes, or the "api_key=" from SerpAPI's
// example URLs, and SerpAPI answers any of those with "Invalid API key".
export function serpApiKey(raw: string | undefined = process.env.SERPAPI_KEY): string | undefined {
  const key = raw?.trim().replace(/^["']|["']$/g, '').replace(/^api_key=/i, '').trim()
  return key || undefined
}
