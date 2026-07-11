import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
import { getAgentTools, executeTool, ToolDefinition } from '@/lib/tools'
import { getSupabase } from '@/lib/supabase'
import { sendRunEmail } from '@/lib/mailer'

// Vercel: allow up to 120s for this route (requires Pro plan)
export const maxDuration = 120

const MODEL = 'llama-3.3-70b-versatile'
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

const CITIES = [
  'Accra', 'Kumasi', 'Takoradi', 'Tamale', 'Cape Coast', 'Ho',
  'Koforidua', 'Sunyani', 'Techiman', 'Bolgatanga', 'Wa', 'Tema',
  'Kasoa', 'Obuasi', 'Ejisu', 'Nsawam', 'Winneba', 'Agona Swedru',
]

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
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
      return (msg?.content as string) ?? ''
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
  const city = pick(CITIES)
  const workspace: Record<string, string> = {}

  // ── 1. Scout + Prospect in parallel ──────────────────────────────────────────
  const [social, prospect] = await Promise.all([
    runAgent({
      apiKey,
      tools: getAgentTools('scout'),
      system: `TEAM: Ecstasy Technologies 6-agent revenue team. Goal: GHS 12,000/month in new deals.
You are SocialScout. Use search_web and search_reddit to find Ghana businesses publicly looking for website help, complaining about their online presence, or posting "need a website". Report 3-5 specific, actionable findings — real names, links, what they said. Be concise.`,
      userMsg: 'Find businesses in Ghana right now who need a website or are complaining about their current one. Search Reddit and DuckDuckGo.',
    }),
    runAgent({
      apiKey,
      tools: getAgentTools('prospect'),
      system: `TEAM: Ecstasy Technologies 6-agent revenue team. Goal: GHS 12,000/month in new deals.
You are ProspectBot. NEVER invent businesses — only report what a tool call actually returns.
Industry focus this run: ${industry}. City focus: ${city}, Ghana.
Call search_google_maps FIRST with query="${industry}" and city="${city}" — it returns real local businesses with a website field, so any result with no website is a confirmed prime prospect with a verified phone number. Only fall back to search_web if search_google_maps returns no results or is unavailable. Find 3-5 real businesses without websites. Include phone numbers where found.`,
      userMsg: `Find ${industry} businesses in ${city}, Ghana that don't have websites. Use search_google_maps first — it's built for exactly this.`,
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
You are ContentBot. Based on the TEAM INTEL below, draft 3 short WhatsApp pitch messages (under 60 words each) for the top leads found. Each message should be warm, specific to their business, reference a real Ecstasy Technologies project as proof, and end with one clear CTA.

TEAM INTEL:
${intel}`,
    userMsg: 'Draft 3 WhatsApp pitch messages for the best leads from the team intel above.',
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
      city,
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
  try {
    await fetch(`${req.nextUrl.origin}/api/notify/send`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        title: '🤖 Tagett auto-run complete',
        body: `Leads found. Pitches drafted. Check your email — ${runAt}`,
      }),
    })
  } catch { /* non-fatal */ }

  return NextResponse.json({ ok: true, emailSent, runAt, industry, city })
}
