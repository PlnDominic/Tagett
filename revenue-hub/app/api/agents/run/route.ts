import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
import { getAgentTools, executeTool, ToolDefinition } from '@/lib/tools'
import { getSupabase, writeToleratingSchemaDrift } from '@/lib/supabase'
import { findProspectsWidening } from '@/lib/prospect-search'
import { prospectKey } from '@/lib/prospects'
import { sendRunEmail } from '@/lib/mailer'
import { stripEmDashes } from '@/lib/text'
import { sendPush } from '@/lib/push'
import { MARKETS, Market, Region, outreachNotes, randomPlace } from '@/lib/markets'
import { searchListenPosts, type ListenPost } from '@/lib/social-listening-search'
import { serpApiKey } from '@/lib/serpapi'

// Vercel: allow up to 120s for this route (requires Pro plan)
export const maxDuration = 120

// Groq retired llama-3.3-70b-versatile for free/developer tiers in June 2026 —
// it 404s now, which had been silently failing this nightly prospecting run.
const MODEL = 'openai/gpt-oss-120b'
const MAX_ITER = 3

// Weighted toward segments that actually pay GHS 3,500+ for a website — schools,
// churches, hotels, clinics, construction, and logistics all have real closed
// projects in the portfolio (Royal Ecclesia, MoldGold, Lavimac Royal, Solani
// Construction, Dynamic Shipping). Chop bars, salons, and barbershops rarely
// have the budget, so they're deliberately absent from the pick pool.
const INDUSTRIES = [
  'Schools & Tutoring Centres', 'Churches & NGOs', 'Hotels & Guesthouses',
  'Pharmacies & Clinics', 'Real Estate Agents', 'Legal & Professional Services',
  'Construction & Engineering Firms', 'Shipping & Logistics Companies',
  'Auto Mechanics & Car Dealers', 'Farms & Agribusiness',
]

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

// Ecstasy Technologies delivers remotely, so the prospecting surface isn't only
// Ghana. Ghana stays weighted highest — it's the home market, the referral
// network is there, and WhatsApp outreach converts — but Europe and North
// America are worth two runs each because the same small-business site bills
// at several times the Ghanaian rate, so one closed deal there moves the
// monthly goal much further. Africa (Nigeria, Kenya, South Africa) and
// Oceania get one run each — real markets, just not weighted as heavily yet.
const REGION_WEIGHTS: Array<Region> = [
  'Ghana', 'Ghana', 'Ghana',
  'Africa',
  'Europe', 'Europe',
  'North America', 'North America',
  'Oceania',
]

function pickMarket(): Market {
  const region = pick(REGION_WEIGHTS)
  return pick(MARKETS.filter(m => m.region === region))
}

interface GroqToolCall {
  id: string
  type: 'function'
  function: { name: string; arguments: string }
}

type GMsg =
  | { role: 'system' | 'user' | 'assistant'; content: string }
  | { role: 'assistant'; content: null; tool_calls: GroqToolCall[] }
  | { role: 'tool'; tool_call_id: string; content: string }

async function runAgent(opts: {
  apiKey: string
  system: string
  userMsg: string
  tools: ToolDefinition[]
}): Promise<string> {
  const msgs: GMsg[] = [
    { role: 'system', content: opts.system },
    { role: 'user', content: opts.userMsg },
  ]

  for (let i = 0; i < MAX_ITER; i++) {
    const body: Record<string, unknown> = {
      model: MODEL,
      max_tokens: 1500,
      temperature: 0.3,
      messages: msgs,
    }
    // The last step gets no tools, so the agent answers with what it has
    // found instead of searching again and ending as "[max iterations]".
    if (opts.tools.length && i < MAX_ITER - 1) body.tools = opts.tools

    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${opts.apiKey}`, 'content-type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (!res.ok) return `[Groq error ${res.status}]`

    const data = await res.json()
    const choice = data.choices?.[0]
    const msg = choice?.message
    const finish: string = choice?.finish_reason ?? 'stop'

    if (finish !== 'tool_calls' || !msg?.tool_calls?.length) {
      return stripEmDashes((msg?.content as string) ?? '')
    }

    msgs.push({ role: 'assistant', content: null, tool_calls: msg.tool_calls as GroqToolCall[] })

    for (const tc of msg.tool_calls as GroqToolCall[]) {
      let args: Record<string, string> = {}
      try { args = JSON.parse(tc.function.arguments) } catch { /* ignore */ }
      const result = await executeTool(tc.function.name, args)
      msgs.push({ role: 'tool', tool_call_id: tc.id, content: result })
    }
  }
  return '[max iterations]'
}

function teamIntel(workspace: Record<string, string>, exclude: string) {
  const labels: Record<string, string> = {
    scout: 'SocialScout', prospect: 'ProspectBot',
    content: 'ContentBot', revenue: 'RevenueBot',
  }
  return Object.entries(workspace)
    .filter(([k, v]) => k !== exclude && v)
    .map(([k, v]) => `[${labels[k] ?? k}]: ${v.slice(0, 500)}`)
    .join('\n\n')
}

export async function GET(req: NextRequest) {
  // Verify cron secret
  const secret = process.env.CRON_SECRET
  if (secret) {
    const auth = req.headers.get('authorization')
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  const apiKey = process.env.GROQ_API_KEY
  if (!apiKey) return NextResponse.json({ error: 'GROQ_API_KEY not set' }, { status: 500 })

  const runAt = new Date().toUTCString().replace(' GMT', '')
  const industry = pick(INDUSTRIES)
  const market = pickMarket()
  // Drawn from GeoNames: any town, village or hamlet in the country, weighted
  // toward the small ones. A hardcoded city list would keep sending the run at
  // the same dozen saturated metros — the least likely places to find a
  // business still without a website.
  const place = await randomPlace(market)
  const city = place.name
  // Villages share names freely ("Newport" exists many times over in the UK
  // alone), so carry the region into the search string when we have one.
  const locale = place.admin1 ? `${city}, ${place.admin1}, ${market.country}` : `${city}, ${market.country}`
  const outreach = outreachNotes(market)
  const workspace: Record<string, string> = {}

  let deals: Array<{ stage: string; value_ghs: number; name: string; phone?: string | null; stage_changed_at?: number | null; created_at?: number | null; source_url?: string | null }> = []
  try {
    const sb = getSupabase()
    const { data } = await sb.from('deals').select('stage, value_ghs, name, phone, stage_changed_at, created_at, source_url')
    deals = data ?? []
  } catch { /* continue without DB data */ }

  // ── 1. Scout + Prospect in parallel ──────────────────────────────────────────
  // Prospects come straight from Google Maps (no LLM), the same search the
  // ProspectBot start screen uses, so the morning list holds only real
  // businesses and is saved as data the app can show and import.
  // Social listening: one SerpAPI search a night for people asking for a
  // website this past week, Facebook and X on alternate nights to keep the
  // monthly search budget small. Saved as raw posts; the app's AI reads them
  // when they're opened, so this costs no AI quota overnight.
  // OVERNIGHT_LISTENING=off turns it off.
  // Abroad most businesses have some website, and the ones without rarely
  // publish an email: there the run looks for weak websites instead.
  const target = market.whatsappFirst ? 'no-site' as const : 'weak-site' as const
  const kind = target === 'weak-site' ? 'with a weak website' : 'without a website'

  const listenPlatform = new Date().getUTCDate() % 2 ? 'x' as const : 'facebook' as const
  const serpKey = serpApiKey()
  const listening: Promise<{ posts: ListenPost[]; error?: string }> = serpKey && process.env.OVERNIGHT_LISTENING !== 'off'
    ? searchListenPosts(serpKey, { mode: 'requests', country: market.country, recency: 'w', platforms: [listenPlatform] })
        .then(r => ({ posts: r.posts.filter(p => !deals.some(d => d.source_url === p.url)), error: r.errors[0] }))
        .catch(err => ({ posts: [], error: err instanceof Error ? err.message : 'Search failed' }))
    : Promise.resolve({ posts: [] })

  const [social, searched, listening_] = await Promise.all([
    runAgent({
      apiKey,
      tools: getAgentTools('scout'),
      system: `TEAM: Ecstasy Technologies 6-agent revenue team. Goal: GHS 12,000/month in new deals.
You are SocialScout. Market this run: ${locale}. This is deliberately often a small town or village, not a big city — those are far less picked over.
Call search_google FIRST — it's a real Google search via SerpAPI and actually surfaces Facebook posts, reviews, and local mentions. Always pass country="${market.country}" so results come back for the right market. Reddit has almost no Ghanaian SME activity but is genuinely active for UK/US/Canada small business, so use search_reddit as a real second source outside Ghana. Try queries like '"need a website" ${city}', 'site:facebook.com [industry] ${city}', or '[industry] ${locale} reviews "no website"'. If a small place returns nothing at all, widen to the surrounding district or county rather than inventing results. Report 3-5 specific, actionable findings — real names, links, what they said. Never invent a result if a search comes up empty — say so and try a different query. Be concise.
OUTREACH FOR THIS MARKET: ${outreach}`,
      userMsg: `Find businesses in ${locale} right now who need a website or are complaining about their current one. Use search_google first with country="${market.country}".`,
    }),
    // The town first (region included: village names repeat within a
    // country), then its region, then the whole country, so a small town
    // with nothing on Maps doesn't leave the morning list empty.
    findProspectsWidening({
      industries: [industry],
      target,
      // The run has 120s in all; up to three areas may each test their sites.
      auditTimeoutMs: 20000,
      country: market.country,
      exclude: deals.map(d => prospectKey(d.name, d.phone ?? undefined)),
      excludeNames: deals.map(d => d.name),
    }, [place.admin1 ? `${city}, ${place.admin1}` : city, ...(place.admin1 ? [place.admin1] : []), '']),
    listening,
  ])

  const { result: found, area: foundArea, tried } = searched
  const listenPosts = listening_.posts
  const leads = found.candidates
  const where = (area: string) => area ? `${area}, ${market.country}` : `${market.country} (country-wide)`
  const leadsLocale = where(foundArea)
  // A failed search used to read as "nothing found"; say what happened.
  const searchError = found.error === 'quota' ? 'Out of SerpAPI searches: no Google Maps search could run tonight. Check "Searches left" at serpapi.com.'
    : found.error === 'no-key' ? 'SERPAPI_KEY is not set in Vercel, so no Google Maps search ran.'
    : found.error === 'failed' ? `Google Maps search failed: ${found.errorMessage ?? 'unknown error'}.`
    : null
  const prospect = searchError ?? (leads.length
    ? `${foundArea !== tried[0] ? `Nothing in ${where(tried[0])}, so widened to ${leadsLocale}.\n` : ''}${leads.map((c, i) => `${i + 1}. ${c.name} | ${c.address ?? 'address not listed'} | ${c.phone ?? 'no phone listed'} | ${c.reviews} Google reviews${c.rating ? `, rated ${c.rating}` : ''}${c.website ? ` | ${c.website}: ${c.siteIssue}` : c.socialOnly ? ` | social page only: ${c.socialOnly}` : ''}`).join('\n')}`
    : `No ${industry} businesses ${kind} found on Google Maps in ${tried.map(where).join(', then ')} (checked ${found.stats.scanned} in the last).`)
  workspace.scout = social
  workspace.prospect = prospect

  // ── 2. ContentBot — draft pitches from what scout + prospect found ────────────
  const intel = teamIntel(workspace, 'content')
  const pitches = await runAgent({
    apiKey,
    tools: [],
    system: `TEAM: Ecstasy Technologies 6-agent revenue team. Goal: GHS 12,000/month.
You are ContentBot. Leads this run are in ${leadsLocale}.
OUTREACH FOR THIS MARKET: ${outreach}
Based on the TEAM INTEL below, draft 3 short pitch messages (under 60 words each) for the top leads found, in whichever channel the note above says this market actually uses. Each message should be warm, specific to their business, reference a real Ecstasy Technologies project as proof, and end with one clear CTA.

TEAM INTEL:
${intel}`,
    userMsg: `Draft 3 pitch messages for the best leads from the team intel above, written for ${market.country}.`,
  })

  workspace.content = pitches

  // ── 3. RevenueBot — pipeline summary ─────────────────────────────────────────

  // Only deals closed since the 1st count toward the monthly goal; summing
  // every deal ever closed overstated progress once a few wins piled up.
  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime()
  const closed = deals
    .filter(d => d.stage === 'closed' && (d.stage_changed_at ?? d.created_at ?? 0) >= monthStart)
    .reduce((s, d) => s + d.value_ghs, 0)
  const pipeline = deals.filter(d => d.stage !== 'closed').reduce((s, d) => s + d.value_ghs, 0)
  const pct = Math.min(100, Math.round((closed / 12000) * 100))

  const pipelineSummary = await runAgent({
    apiKey,
    tools: [],
    system: `TEAM: Ecstasy Technologies 6-agent revenue team. Goal: GHS 12,000/month.
You are RevenueBot. Current pipeline data: Closed this month: GHS ${closed.toLocaleString()} (${pct}% of GHS 12,000 goal). Active pipeline: GHS ${pipeline.toLocaleString()} across ${deals.filter(d => d.stage !== 'closed').length} deals.
Leads found this run by teammates: ${workspace.scout.slice(0, 200)} / ${workspace.prospect.slice(0, 200)}
Provide a 3-sentence status: where we stand, biggest opportunity right now, and one specific action to take today to move closer to GHS 12,000.`,
    userMsg: 'Give me a brief pipeline status and today\'s highest-leverage action.',
  })

  workspace.revenue = pipelineSummary

  // ── 4. Save to Supabase ───────────────────────────────────────────────────────
  try {
    const sb = getSupabase()
    // prospect_leads is newer than the table; tolerate it being missing so
    // the rest of the run is still recorded before the migration runs.
    await writeToleratingSchemaDrift([{
      run_at: new Date().toISOString(),
      industry,
      // Qualified with the country: run history is ambiguous otherwise now that
      // cities span three regions. Stays a plain string, so no migration.
      city: locale,
      social_results: social,
      prospect_results: prospect,
      pitch_drafts: pitches,
      pipeline_summary: pipelineSummary,
      // Structured leads + where they came from, for ProspectBot's
      // "found overnight" list in the app.
      // locale is where the leads were found, which may be wider than the town.
      prospect_leads: { country: market.country, city, locale: leadsLocale, industry, leads, ...(searchError ? { error: searchError } : {}) },
      // Posts asking for a website, for Social listening's "found overnight".
      social_posts: { country: market.country, platform: listenPlatform, posts: listenPosts, ...(listening_.error ? { error: listening_.error } : {}) },
    }], rows => sb.from('agent_runs').insert(rows))
  } catch { /* non-fatal */ }

  // ── 5. Send email ─────────────────────────────────────────────────────────────
  let emailSent = false
  try {
    await sendRunEmail({
      runAt,
      social,
      prospect,
      pitches,
      pipeline: pipelineSummary,
    })
    emailSent = true
  } catch (e) {
    console.error('Email send failed:', e)
  }

  // ── 6. Push notification ──────────────────────────────────────────────────────
  // Called directly rather than fetching /api/notify/send: that route sits
  // behind session middleware, and this Vercel Cron request carries no
  // session cookie, so the fetch was silently redirected to /login — the
  // try/catch never saw an error because a redirect response isn't a thrown
  // exception, so this notification never actually went out.
  try {
    await sendPush({
      title: leads.length ? `🌙 ${leads.length} new lead${leads.length === 1 ? '' : 's'} ready` : '🤖 Tagett auto-run complete',
      body: (leads.length
        ? `${industry} in ${leadsLocale}, ${kind}, busiest first. Open ProspectBot to import them.`
        : searchError ?? `No new ${industry} leads in ${locale} or wider tonight. Pitches and pipeline summary are in your email.`)
        + (listenPosts.length ? ` Plus ${listenPosts.length} ${listenPlatform === 'x' ? 'X' : 'Facebook'} post${listenPosts.length === 1 ? '' : 's'} asking for a website in ${market.country}: SocialScout → Social listening.` : ''),
    })
  } catch { /* non-fatal */ }

  return NextResponse.json({ ok: true, emailSent, runAt, industry, city })
}
