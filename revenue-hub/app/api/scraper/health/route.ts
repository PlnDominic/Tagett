import { NextResponse } from 'next/server'
import { scrapeGraphConfigured, scrapeGraphHealth } from '@/lib/scrapegraph'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

// GET -> whether the website scraper (scraper/, ScrapeGraphAI) is set up and
// answering. Calling it also wakes a free host that has gone to sleep.
export async function GET() {
  if (!scrapeGraphConfigured()) return NextResponse.json({ configured: false })
  return NextResponse.json({ configured: true, ...(await scrapeGraphHealth()) })
}
