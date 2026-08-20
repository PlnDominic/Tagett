import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
import { getAgentTools, executeTool, ToolDefinition } from '@/lib/tools'
import { getSupabase } from '@/lib/supabase'
import { sendRunEmail } from '@/lib/mailer'
import { stripEmDashes } from '@/lib/text'
import { sendPush } from '@/lib/push'
import { MARKETS, Market, Region, outreachNotes } from '@/lib/markets'

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
// America are worth a run each because the same small-business site bills at
// several times the Ghanaian rate, so one closed deal there moves the monthly
// goal much further.
const REGION_WEIGHTS: Array<Region> = [
  'Ghana', 'Ghana', 'Ghana',
  'Europe', 'Europe',
  'North America', 'North America',
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
    if (opts.tools.length) body.tools = opts.tools

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
  const city = pick(market.cities)
  const outreach = outreachNotes(market)
  const workspace: Record<string, string> = {}

  // ── 1. Scout + Prospect in parallel ──────────────────────────────────────────
  const [social, prospect] = await Promise.all([
    runAgent({
      apiKey,
      tools: getAgentTools('scout'),
      system: `TEAM: Ecstasy Technologies 6-agent revenue team. Goal: GHS 12,000/month in new deals.
You are SocialScout. Market this run: ${city}, ${market.country}.
Call search_google FIRST — it's a real Google search via SerpAPI and actually surfaces Facebook posts, reviews, and local mentions. Always pass country="${market.country}" so results come back for the right market. Reddit has almost no Ghanaian SME activity but is genuinely active for UK/US/Canada small business, so use search_reddit as a real second source outside Ghana. Try queries like '"need a website" ${city}', 'site:facebook.com [industry] ${city}', or '[industry] ${city} reviews "no website"'. Report 3-5 specific, actionable findings — real names, links, what they said. Never invent a result if a search comes up empty — say so and try a different query. Be concise.
OUTREACH FOR THIS MARKET: ${outreach}`,
      userMsg: `Find businesses in ${city}, ${market.country} right now who need a website or are complaining about their current one. Use search_google first with country="${market.country}".`,
    }),
    runAgent({
      apiKey,
      tools: getAgentTools('prospect'),
      system: `TEAM: Ecstasy Technologies 6-agent revenue team. Goal: GHS 12,000/month in new deals.
You are ProspectBot. NEVER invent businesses — only report what a tool call actually returns.
Industry focus this run: ${industry}. City focus: ${city}, ${market.country}.
Call search_google_maps FIRST with query="${industry}", city="${city}" and country="${market.country}" — it returns real local businesses with a website field, so any result with no website is a confirmed prime prospect with a verified phone number. The country argument matters: city names repeat across countries and Maps will silently return the wrong one. Only fall back to search_web if search_google_maps returns no results or is unavailable. Find 3-5 real businesses without websites. Include phone numbers where found.
OUTREACH FOR THIS MARKET: ${outreach}`,
      userMsg: `Find ${industry} businesses in ${city}, ${market.country} that don't have websites. Use search_google_maps first with country="${market.country}" — it's built for exactly this.`,
    }),
  ])

  workspace.scout = social
  workspace.prospect = prospect

  // ── 2. ContentBot — draft pitches from what scout + prospect found ────────────
  const intel = teamIntel(workspace, 'content')
  const pitches = await runAgent({
    apiKey,
    tools: [],
    system: `TEAM: Ecstasy Technologies 6-agent revenue team. Goal: GHS 12,000/month.
You are ContentBot. Leads this run are in ${city}, ${market.country}.
OUTREACH FOR THIS MARKET: ${outreach}
Based on the TEAM INTEL below, draft 3 short pitch messages (under 60 words each) for the top leads found, in whichever channel the note above says this market actually uses. Each message should be warm, specific to their business, reference a real Ecstasy Technologies project as proof, and end with one clear CTA.

TEAM INTEL:
${intel}`,
    userMsg: `Draft 3 pitch messages for the best leads from the team intel above, written for ${market.country}.`,
  })

  workspace.content = pitches

  // ── 3. RevenueBot — pipeline summary ─────────────────────────────────────────
  let deals: Array<{ stage: string; value_ghs: number; name: string }> = []
  try {
    const sb = getSupabase()
    const { data } = await sb.from('deals').select('stage, value_ghs, name')
    deals = data ?? []
  } catch { /* continue without DB data */ }

  const closed = deals.filter(d => d.stage === 'closed').reduce((s, d) => s + d.value_ghs, 0)
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
    await sb.from('agent_runs').insert({
      run_at: new Date().toISOString(),
      industry,
      // Qualified with the country: run history is ambiguous otherwise now that
      // cities span three regions. Stays a plain string, so no migration.
      city: `${city}, ${market.country}`,
      social_results: social,
      prospect_results: prospect,
      pitch_drafts: pitches,
      pipeline_summary: pipelineSummary,
    })
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
      title: '🤖 Tagett auto-run complete',
      body: `Leads found. Pitches drafted. Check your email — ${runAt}`,
    })
  } catch { /* non-fatal */ }

  return NextResponse.json({ ok: true, emailSent, runAt, industry, city })
}
