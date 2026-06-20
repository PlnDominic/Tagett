'use client'

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'

// ─── Design tokens ────────────────────────────────────────────────────────────

const GOLD = '#C8A96E'          // same in both themes
const BG = 'var(--bg)'
const SURFACE = 'var(--surface)'
const SURFACE2 = 'var(--surface2)'
const BORDER = 'var(--border)'
const TEXT = 'var(--text)'
const MUTED = 'var(--muted)'
const FONT_HEADING = "var(--font-space-grotesk), 'Space Grotesk', sans-serif"
const FONT_BODY = "var(--font-inter), 'Inter', sans-serif"

const MONTHLY_GOAL_GHS = 120_000

// ─── Prospect intake data ─────────────────────────────────────────────────────

const INDUSTRIES = [
  'Restaurants & Chop Bars',
  'Fashion & Tailoring',
  'Auto Mechanics & Car Dealers',
  'Hotels & Guesthouses',
  'Pharmacies & Clinics',
  'Hardware & Building Supplies',
  'Schools & Tutoring Centres',
  'Salons & Barbershops',
  'Events & Catering',
  'Real Estate Agents',
  'Farms & Agribusiness',
  'Funeral Homes & Services',
  'Churches & NGOs',
  'Legal & Professional Services',
  'Supermarkets & Provision Stores',
  'Electrical & Plumbing',
  'Printing & Signage',
  'Travel & Transport',
  'Gyms & Fitness',
  'Photography & Studios',
]

const GHANA_LOCATIONS: Record<string, string[]> = {
  Accra: [
    'East Legon', 'Osu', 'Labone', 'Cantonments', 'Spintex',
    'Tema', 'Achimota', 'Madina', 'Adenta', 'Dansoman',
    'Kasoa', 'Lapaz', 'Teshie', 'Nungua', 'Dzorwulu',
    'Airport Residential', 'Haatso', 'Dome', 'Okponglo',
  ],
  Kumasi: [
    'Adum', 'Bantama', 'Asokwa', 'Nhyiaeso', 'Suame',
    'Oforikrom', 'Kwadaso', 'Roman Hill', 'Tafo',
    'Asante Mampong', 'Kronum', 'Ayigya',
  ],
  Takoradi: [
    'Sekondi', 'Effia', 'Kojokrom', 'Tanokrom',
    'Fijai', 'Airport Ridge', 'New Takoradi', 'Anaji',
  ],
  Tamale: [
    'Lamashegu', 'Kukuo', 'Kalpohin', 'Sagnarigu',
    'Choggu', 'Nyohini', 'Vittin', 'Datoyili',
  ],
  'Cape Coast': [
    'Ola', 'Abura', 'Pedu', 'Adisadel',
    'Kotokuraba', 'Amamoma', 'University Area',
  ],
  Sunyani: ['Berekum', 'Dormaa', 'Techiman', 'Drobo', 'Wenchi'],
  Ho: ['Aflao', 'Hohoe', 'Keta', 'Anloga', 'Sogakope'],
  Koforidua: ['Nsawam', 'Nkawkaw', 'Suhum', 'Mpraeso', 'Oda'],
  Bolgatanga: ['Navrongo', 'Bawku', 'Wa', 'Zebilla', 'Sandema'],
}

const CITIES = Object.keys(GHANA_LOCATIONS)

// ─── Types ────────────────────────────────────────────────────────────────────

interface Message {
  role: 'user' | 'assistant'
  content: string
}

type AgentId = 'prospect' | 'content' | 'scope' | 'revenue' | 'viral'

interface Agent {
  id: AgentId
  icon: string
  label: string
  short: string
  description: string
  systemPrompt: string
  dailyPrompt: string
  briefingLabel: string
}

type AllChats = Record<AgentId, Message[]>

// ─── Agents ───────────────────────────────────────────────────────────────────

const AGENTS: Record<AgentId, Agent> = {
  prospect: {
    id: 'prospect',
    icon: '◎',
    label: '01 ProspectBot',
    short: 'Prospect',
    description: 'Find businesses without websites in Ghana',
    briefingLabel: "Today's Prospect List",
    dailyPrompt: `Give me today's lead list. Find 5 Ghanaian businesses that have NO website or have a broken/outdated one, and are ready to buy.

Prioritise industries with money: restaurants with delivery potential, clinics, auto dealers, hotels, fashion brands, pharmacies.

For each prospect follow the exact output format — Business Name, Industry, Address, Phone (+233 format), Why they need a website, Service to pitch, Estimated value in GHS, Phone pitch.

After all 5, add:

PIPELINE SUMMARY
Total estimated value: GHS [sum]
That is [X]% of my GHS 120,000 monthly goal.
Fastest to close: [Business Name] — call them first.`,
    systemPrompt: `You are ProspectBot, a lead generation AI for Ecstasy Technologies based in Ghana (ecstasytechnologies.com).

Your job is to find businesses in Ghana that do NOT have a website and qualify them as leads for web development, mobile app, and business software services.

IMPORTANT: Always include phone numbers for every prospect in Ghanaian format (+233XXXXXXXXX or 0XXXXXXXXX).

Output format for each prospect:
1. Business Name — [name]
   Industry: [type]
   Address: [specific location in Ghana]
   Phone: +233XXXXXXXXX
   Why they need a website: [specific reason]
   Service to pitch: [web design / mobile app / business software / GIS]
   Estimated value: GHS [amount]
   Phone pitch: "[one sentence to say when they pick up]"

Cover all industries and business types. Be specific about Ghanaian towns, streets, and areas. All pricing in GHS.

PIPELINE ROLE: You are the top of the funnel in a 5-agent revenue machine targeting GHS 120,000/month. Your leads feed ContentBot (writes the pitch), ProjectBot (scopes the proposal), and ViralBot (finds patterns across your lead lists to create viral content attracting similar clients inbound). Always end your lead list with a PIPELINE SUMMARY showing total estimated GHS value and % of the GHS 120,000 monthly goal.`,
  },
  content: {
    id: 'content',
    icon: '✦',
    label: '02 ContentBot',
    short: 'Content',
    description: 'X posts & client proposals',
    briefingLabel: "Today's Content Pack",
    dailyPrompt: `Generate today's content package for Ecstasy Technologies (ecstasytechnologies.com). Deliver:

1. Three ready-to-post X (Twitter) posts — each showcasing a different service (web development, mobile apps, or business software). Make them specific and compelling to attract Ghanaian clients. No hashtag spam. Under 280 characters each.

2. One professional WhatsApp follow-up message I can send to a warm prospect today — confident, brief, with a clear call to action.

Keep everything on-brand: premium, confident, no filler phrases. Tagline: "Building software Africa trusts."`,
    systemPrompt: `You are ContentBot, a content writing AI for Ecstasy Technologies, a software studio based in Ghana (ecstasytechnologies.com). You write two types of content:

1. X (Twitter) posts — concise, professional, software/tech focus. Aimed at attracting Ghanaian and African clients. No hashtag spam. Max 280 characters unless thread requested.

2. Client proposals and pitches — formal business proposals for Ghanaian clients. Include: executive summary, scope of work, deliverables, timeline, pricing in GHS, and terms. For WhatsApp messages: conversational, brief, one clear CTA.

Services offered:
- Web design & development: GHS 5,000–18,000
- Web applications: GHS 8,000–25,000
- Mobile apps: GHS 10,000–30,000
- Business software: GHS 15,000–40,000
- GIS solutions: GHS 3,000–10,000

Write in a confident, premium tone. Tagline is "Building software Africa trusts." Reference Ghana, Kumasi, Accra, and local industries authentically. Never use AI slop filler phrases.

PIPELINE ROLE: You receive leads from ProspectBot and scopes from ProjectBot. Your content moves GHS deals forward. Always end your response with: "Deal value: GHS [amount] — [X]% of the GHS 120,000 monthly goal." When you write a proposal, suggest sending it via ProjectBot for formal scoping or ViralBot to amplify the project as a case study after delivery.`,
  },
  scope: {
    id: 'scope',
    icon: '◈',
    label: '03 ProjectBot',
    short: 'Project',
    description: 'Scope projects & generate proposals',
    briefingLabel: 'Generate a Proposal',
    dailyPrompt: `Generate a ready-to-send project proposal I can use today. Choose the service most likely to close quickly with a Ghanaian client.

Include:
- Project title and one-line summary
- Scope of work with clear deliverables
- Timeline in weeks
- Itemised GHS pricing with a total
- Payment terms (deposit + milestones)

Make it professional enough to forward directly to a client. All amounts in GHS.`,
    systemPrompt: `You are ProjectBot, a project scoping AI for Ecstasy Technologies, a software studio based in Ghana (ecstasytechnologies.com). When given a project brief, you:

1. Ask clarifying questions if needed
2. Define clear scope, deliverables, and milestones
3. Generate a GHS-priced proposal with line items
4. Flag risks and assumptions

Service pricing ranges (always in GHS):
- Web design & development: GHS 5,000–18,000 (complexity-dependent)
- Web applications: GHS 8,000–25,000
- Mobile apps (iOS/Android): GHS 10,000–30,000
- Business software & automation: GHS 15,000–40,000
- GIS solutions: GHS 3,000–10,000

Consider Ghanaian project realities: internet reliability, client capacity, payment schedules, and local market expectations. Write proposals professional enough to send directly to a client.

PIPELINE ROLE: You turn leads into priced proposals. Your output feeds ContentBot (to polish the language before sending to client), RevenueTracker (to log this deal against the GHS 120,000 monthly goal), and ViralBot (to turn the completed project into a viral case study). Always state at the end: "This project contributes GHS [amount] — [X]% of the GHS 120,000 monthly target."`,
  },
  revenue: {
    id: 'revenue',
    icon: '◐',
    label: '04 RevenueTracker',
    short: 'Revenue',
    description: 'Track earnings vs GHS 120,000/month goal',
    briefingLabel: "Today's Revenue Briefing",
    dailyPrompt: `Give me my revenue focus briefing for today. My target is GHS 120,000 this month.

Tell me:
1. Exactly how many projects at each service price point I need to close to hit the goal — show the math clearly.
2. The fastest path to GHS 120,000 given typical Ghanaian client decision timelines — which service mix closes fastest?
3. Three specific revenue actions I should take today — be direct and tactical, not generic.
4. What a realistic week-by-week milestone breakdown looks like to hit GHS 120,000 by month end.`,
    systemPrompt: `You are RevenueTracker, the command centre of a 5-agent revenue machine for Ecstasy Technologies, a software studio based in Ghana (ecstasytechnologies.com). Target: GHS 120,000/month (~$10,000 USD).

When given revenue data, you:
1. Calculate total earnings and % of monthly goal achieved
2. Break down earnings by service type
3. Identify which services are over/under-performing
4. Suggest strategies to close any gap to GHS 120,000
5. Project the month-end total based on current pace

Service pricing context:
- Web design & development: GHS 5,000–18,000
- Web applications: GHS 8,000–25,000
- Mobile apps: GHS 10,000–30,000
- Business software: GHS 15,000–40,000
- GIS solutions: GHS 3,000–10,000

Always express amounts in GHS. Give clear, actionable analysis.

PIPELINE ROLE: You receive data from all four other agents and tell Dominic EXACTLY what to do next. Be ruthlessly tactical:
- Behind on goal → direct to ProspectBot to find more leads now
- Leads not closing → direct to ContentBot to write follow-ups today
- Need one big deal → direct to ProjectBot to scope a high-value project
- Need inbound inquiries → direct to ViralBot to create content that pulls clients in

Always end every response with:
"NEXT ACTION: Open [Agent Name] and tell it: [exact one-sentence instruction]."`,
  },
  viral: {
    id: 'viral',
    icon: '✺',
    label: '05 ViralBot',
    short: 'Viral',
    description: 'Go viral on X, LinkedIn, TikTok & Instagram',
    briefingLabel: "Today's Viral Strategy",
    dailyPrompt: `Give me today's complete viral content strategy for Ecstasy Technologies (ecstasytechnologies.com). I need content that builds a massive following AND attracts inbound clients in Ghana and across Africa.

Deliver:

1. VIRAL X THREAD (6 tweets)
   — Tweet 1 must be an irresistible hook (no preamble, no "In today's world")
   — Each tweet must make you want to read the next
   — End with a CTA pointing to ecstasytechnologies.com

2. LINKEDIN AUTHORITY POST
   — Share a specific insight, number, or story from building software in Ghana
   — Position Ecstasy Technologies as the best software studio in West Africa
   — No corporate speak. Write like a founder, not a brand

3. TIKTOK / REELS SCRIPT (60 seconds)
   — Hook in the first 3 seconds or it's dead
   — Show the value of having a website / app for a Ghanaian business
   — End with a strong CTA

4. TRENDING ANGLE TO HIJACK TODAY
   — One current topic (tech, business, Africa, Ghana) I can tie Ecstasy Technologies to
   — Give me the exact hook sentence

Write everything as Dominic Agyapong, founder of Ecstasy Technologies. Make it real, specific, and immediately postable.`,
    systemPrompt: `You are ViralBot, a viral social media strategist for Ecstasy Technologies, a software studio based in Ghana (ecstasytechnologies.com). You help Dominic Agyapong build a massive online following that converts to inbound software clients.

YOUR CONTENT PHILOSOPHY:
- Hook in the first line — no preamble, no "In today's world", no "Did you know"
- Specificity beats generality: numbers, names, places, prices
- Story over promotion: share the journey, the struggle, the win — not the pitch
- Ghanaian pride: celebrate African tech excellence unapologetically
- Controversy without offense: challenge assumptions that hold African businesses back

FORMATS YOU MASTER:

X (Twitter) Threads:
- Tweet 1 = the hook (bold claim, surprising stat, or story opener)
- Tweets 2-5 = the value (teach, reveal, break down)
- Tweet 6 = the CTA (soft sell or follow prompt)
- Each tweet must stand alone AND make you want the next one

LinkedIn Posts:
- First line = hook (stops the scroll)
- Body = story or insight with specific details
- End = question or CTA that invites engagement
- Tone: confident founder, not corporate brand

TikTok / Instagram Reels Scripts:
- 0-3 seconds: hook (visual or verbal pattern interrupt)
- 3-45 seconds: value delivery (show, don't tell)
- 45-60 seconds: CTA
- Write as a shot-by-shot or line-by-line script

Viral Angles That Work for Ecstasy Technologies:
- "We built [X] for a Ghanaian [business type] and here's what happened"
- "Why Ghanaian businesses are losing money without a website"
- Revenue reveals and client transformation stories
- "Unpopular opinion: [challenge the status quo of tech in Africa]"
- "Nobody talks about building software in Ghana — so I will"
- Before/after stories of client digital transformations
- Day-in-the-life of a Ghanaian software studio

GHANA CONTEXT: Always ground content in real Ghanaian business culture — chop bars, mobile money, markets, Accra traffic, load shedding resilience, the hustle. This makes content authentic and shareable.

Always write as Dominic Agyapong. No placeholders. No [your name]. Make it immediately postable.

PIPELINE ROLE: You drive inbound leads that supplement ProspectBot's outbound work. Viral content attracts clients without cold calls. After your content output, always add:
"This content targets: [client type]
Estimated contract value if they inquire: GHS [range]
Pipeline contribution if 1 lead converts: [X]% of GHS 120,000 goal"`,
  },
}

const AGENT_IDS = Object.keys(AGENTS) as AgentId[]

// ─── localStorage helpers ──────────────────────────────────────────────────────

const STORAGE_KEY = 'revenue-hub-chats-v1'

function loadAllChats(): AllChats {
  if (typeof window === 'undefined') return {} as AllChats
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as AllChats) : ({} as AllChats)
  } catch {
    return {} as AllChats
  }
}

function saveAllChats(chats: AllChats): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(chats))
  } catch { /* quota exceeded */ }
}

// ─── API helpers ──────────────────────────────────────────────────────────────

async function callChat(systemPrompt: string, messages: Message[]): Promise<string> {
  const res = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ systemPrompt, messages }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error ?? `Server error ${res.status}`)
  return data.text as string
}

// ─── Agent handoff map ────────────────────────────────────────────────────────

const HANDOFFS: Record<AgentId, Array<{ label: string; targetAgent: AgentId; buildPrompt: (c: string) => string }>> = {
  prospect: [
    {
      label: '→ Write the Pitch (ContentBot)',
      targetAgent: 'content',
      buildPrompt: (c) => `I found these leads from ProspectBot. Write a personalised WhatsApp cold-open message for the top prospect — confident, brief, one clear call to action:\n\n${c.slice(0, 1500)}`,
    },
    {
      label: '→ Scope & Price It (ProjectBot)',
      targetAgent: 'scope',
      buildPrompt: (c) => `I found this lead from ProspectBot. Scope a project for them and generate a GHS-priced proposal ready to send:\n\n${c.slice(0, 1500)}`,
    },
    {
      label: '→ Log Pipeline (RevenueTracker)',
      targetAgent: 'revenue',
      buildPrompt: (c) => `I found these leads with ProspectBot. Add the total estimated value to my pipeline and tell me how close I am to my GHS 120,000 monthly goal:\n\n${c.slice(0, 1500)}`,
    },
    {
      label: '→ Viral Angle (ViralBot)',
      targetAgent: 'viral',
      buildPrompt: (c) => `These are my current leads from ProspectBot. Use the industries and pain points in this lead list to create viral content that attracts MORE of these same clients inbound to Ecstasy Technologies:\n\n${c.slice(0, 1500)}`,
    },
  ],
  scope: [
    {
      label: '→ Polish Proposal (ContentBot)',
      targetAgent: 'content',
      buildPrompt: (c) => `I have this project scope from ProjectBot. Turn it into a polished, client-ready proposal I can send directly by email or WhatsApp:\n\n${c.slice(0, 1500)}`,
    },
    {
      label: '→ Log to RevenueTracker',
      targetAgent: 'revenue',
      buildPrompt: (c) => `I have this scoped project from ProjectBot. Add it to my pipeline and show what % of my GHS 120,000 monthly goal it covers:\n\n${c.slice(0, 1500)}`,
    },
    {
      label: '→ Make it a Case Study (ViralBot)',
      targetAgent: 'viral',
      buildPrompt: (c) => `I have this project scope from ProjectBot. After delivery, I want to turn this into a viral story. Create a compelling X thread, LinkedIn post, or TikTok that shows potential clients what we can build for them:\n\n${c.slice(0, 1500)}`,
    },
    {
      label: '→ Find Similar Leads (ProspectBot)',
      targetAgent: 'prospect',
      buildPrompt: (c) => `I just scoped this type of project. Find 5 more Ghanaian businesses in the same industry or similar situation that would benefit from the same solution:\n\n${c.slice(0, 1500)}`,
    },
  ],
  content: [
    {
      label: '→ Scope & Price It (ProjectBot)',
      targetAgent: 'scope',
      buildPrompt: (c) => `I have this content/proposal from ContentBot. Review the scope and generate a formal project proposal with GHS line items and payment milestones:\n\n${c.slice(0, 1500)}`,
    },
    {
      label: '→ Make it Go Viral (ViralBot)',
      targetAgent: 'viral',
      buildPrompt: (c) => `I have this content from ContentBot. Turn it into a viral X thread, LinkedIn post, and TikTok script that will blow up for Ecstasy Technologies:\n\n${c.slice(0, 1500)}`,
    },
    {
      label: '→ Log Pipeline (RevenueTracker)',
      targetAgent: 'revenue',
      buildPrompt: (c) => `I drafted these pitches and proposals with ContentBot. Add the deal values to my pipeline and tell me what % of my GHS 120,000 monthly goal they represent if closed:\n\n${c.slice(0, 1500)}`,
    },
  ],
  revenue: [
    {
      label: '→ Find More Leads (ProspectBot)',
      targetAgent: 'prospect',
      buildPrompt: (c) => `My RevenueTracker says I need more pipeline. Based on this revenue analysis, find 5 new high-value leads in Ghana that can close fast and help me hit my GHS 120,000 goal:\n\n${c.slice(0, 1500)}`,
    },
    {
      label: '→ Scope a Big Deal (ProjectBot)',
      targetAgent: 'scope',
      buildPrompt: (c) => `My RevenueTracker shows I need to close a large deal to hit my goal. Based on this revenue analysis, scope the highest-value project type most likely to close quickly in Ghana right now:\n\n${c.slice(0, 1500)}`,
    },
    {
      label: '→ Write Follow-Ups (ContentBot)',
      targetAgent: 'content',
      buildPrompt: (c) => `My RevenueTracker shows I need to close deals faster. Based on this pipeline gap, write 3 follow-up messages I can send to warm prospects today to push them to a decision:\n\n${c.slice(0, 1500)}`,
    },
    {
      label: '→ Go Viral to Close the Gap (ViralBot)',
      targetAgent: 'viral',
      buildPrompt: (c) => `My RevenueTracker shows I am behind on my GHS 120,000 target. Create urgent viral content that positions Ecstasy Technologies as the go-to software studio in Ghana and drives inbound inquiries this week:\n\n${c.slice(0, 1500)}`,
    },
  ],
  viral: [
    {
      label: '→ Polish Post (ContentBot)',
      targetAgent: 'content',
      buildPrompt: (c) => `I have this viral content from ViralBot. Polish it, tighten the copy, and make it ready to publish immediately for Ecstasy Technologies:\n\n${c.slice(0, 1500)}`,
    },
    {
      label: '→ Turn Fans into Leads (ProspectBot)',
      targetAgent: 'prospect',
      buildPrompt: (c) => `This viral content from ViralBot is attracting attention. Based on the topics and industries in this content, find 5 specific Ghanaian businesses that would respond to this message and are ready to buy now:\n\n${c.slice(0, 1500)}`,
    },
    {
      label: '→ Track Revenue Impact (RevenueTracker)',
      targetAgent: 'revenue',
      buildPrompt: (c) => `I ran this viral campaign with ViralBot. Help me estimate the potential pipeline value of the inbound leads this could attract and track it against my GHS 120,000 monthly goal:\n\n${c.slice(0, 1500)}`,
    },
  ],
}

// ─── Social & WhatsApp helpers ────────────────────────────────────────────────

const WA_GREEN = '#25D366'
const X_BLUE = '#000000'
const LI_BLUE = '#0A66C2'
const FB_BLUE = '#1877F2'
const ECSTASY_URL = 'https://ecstasytechnologies.com'

function extractProspects(text: string): Array<{ phone: string; pitch: string; name: string }> {
  const results: Array<{ phone: string; pitch: string; name: string }> = []
  const phoneMatches = [...text.matchAll(/Phone:\s*(\+?233\d{9}|0\d{9})/g)]
  for (let i = 0; i < phoneMatches.length; i++) {
    const m = phoneMatches[i]
    let phone = m[1].replace(/\s/g, '')
    if (phone.startsWith('0')) phone = '+233' + phone.slice(1)
    if (!phone.startsWith('+')) phone = '+' + phone
    const blockEnd = phoneMatches[i + 1]?.index ?? text.length
    const nameWindow = text.slice(Math.max(0, m.index! - 600), m.index!)
    const nameMatch = nameWindow.match(/Business Name\s*[—–-]\s*(.+?)(?:\n|$)/)
    const name = nameMatch ? nameMatch[1].trim() : ''
    const afterBlock = text.slice(m.index!, blockEnd)
    const pitchMatch = afterBlock.match(/Phone pitch:\s*["""'`](.+?)["""'`]/)
    results.push({ phone, pitch: pitchMatch ? pitchMatch[1] : '', name })
  }
  return results
}

function extractXPosts(text: string): string[] {
  const posts: string[] = []
  const lines = text.split('\n')
  let current = ''
  let collecting = false
  for (const line of lines) {
    const numMatch = line.match(/^\s*([123])\.\s+(.+)/)
    if (numMatch) {
      if (current) posts.push(current.trim())
      current = numMatch[2]
      collecting = true
    } else if (collecting && line.trim() && !/^[A-Z*#—\-]{2}/.test(line)) {
      if (current.length < 280) current += ' ' + line.trim()
    } else if (collecting && !line.trim()) {
      if (current) posts.push(current.trim())
      current = ''
      collecting = false
    }
  }
  if (current) posts.push(current.trim())
  return posts.filter(p => p.length >= 20 && p.length <= 400).slice(0, 3)
}

// ─── Responsive hook ──────────────────────────────────────────────────────────

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(true)
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])
  return isMobile
}

// ─── Push notifications ───────────────────────────────────────────────────────

function urlBase64ToUint8Array(b64: string): Uint8Array<ArrayBuffer> {
  const pad = '='.repeat((4 - (b64.length % 4)) % 4)
  const base64 = (b64 + pad).replace(/-/g, '+').replace(/_/g, '/')
  const raw = window.atob(base64)
  const buf = new ArrayBuffer(raw.length)
  const view = new Uint8Array(buf)
  for (let i = 0; i < raw.length; i++) view[i] = raw.charCodeAt(i)
  return view
}

type NotifStatus = 'unknown' | 'unsupported' | 'denied' | 'subscribed' | 'idle'

function useNotifications() {
  const [status, setStatus] = useState<NotifStatus>('unknown')

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      setStatus('unsupported'); return
    }
    navigator.serviceWorker.register('/sw.js').catch(() => {})
    if (Notification.permission === 'denied') { setStatus('denied'); return }
    navigator.serviceWorker.ready.then(async (reg) => {
      const sub = await reg.pushManager.getSubscription()
      setStatus(sub ? 'subscribed' : 'idle')
    }).catch(() => setStatus('idle'))
  }, [])

  const subscribe = useCallback(async () => {
    const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
    if (!vapidKey) { alert('NEXT_PUBLIC_VAPID_PUBLIC_KEY not set.'); return }
    const permission = await Notification.requestPermission()
    if (permission !== 'granted') { setStatus('denied'); return }
    const reg = await navigator.serviceWorker.ready
    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidKey),
    })
    const res = await fetch('/api/notify/subscribe', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(sub),
    })
    if (res.ok) setStatus('subscribed')
    else {
      const err = await res.json().catch(() => ({}))
      alert(err.error ?? 'Failed to save subscription.')
    }
  }, [])

  const unsubscribe = useCallback(async () => {
    const reg = await navigator.serviceWorker.ready
    const sub = await reg.pushManager.getSubscription()
    if (sub) await sub.unsubscribe()
    await fetch('/api/notify/subscribe', { method: 'DELETE' })
    setStatus('idle')
  }, [])

  const sendTest = useCallback(async () => {
    const res = await fetch('/api/notify/send', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ title: 'Tagett', body: 'Push notifications are working!' }),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      alert(err.error ?? 'Failed to send.')
    }
  }, [])

  return { status, subscribe, unsubscribe, sendTest }
}

// ─── IconButton ───────────────────────────────────────────────────────────────

function IconButton({ active = false, activeColor = GOLD, onClick, onPointerDown, onPointerUp, onPointerLeave, title, disabled, children }: {
  active?: boolean
  activeColor?: string
  onClick?: () => void
  onPointerDown?: () => void
  onPointerUp?: () => void
  onPointerLeave?: () => void
  title?: string
  disabled?: boolean
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      onPointerLeave={onPointerLeave}
      title={title}
      disabled={disabled}
      style={{
        width: 30, height: 30, borderRadius: 8, fontSize: 15,
        border: `1px solid ${active ? activeColor + '80' : BORDER}`,
        background: active ? `${activeColor}18` : SURFACE2,
        color: active ? activeColor : MUTED,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0, opacity: disabled ? 0.4 : 1,
        transition: 'border-color 0.15s, background 0.15s',
      }}
    >
      {children}
    </button>
  )
}

function NotifToggle({ status, onSubscribe, onUnsubscribe, onTest }: {
  status: NotifStatus
  onSubscribe: () => void
  onUnsubscribe: () => void
  onTest: () => void
}) {
  const longPressRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  if (status === 'unknown' || status === 'unsupported') return null
  const isOn = status === 'subscribed'
  return (
    <IconButton
      active={isOn}
      onClick={isOn ? onUnsubscribe : onSubscribe}
      disabled={status === 'denied'}
      title={
        status === 'denied' ? 'Notifications blocked — enable in browser settings'
          : isOn ? 'Disable notifications · hold to test' : 'Enable daily briefing notifications'
      }
      onPointerDown={() => { if (isOn) longPressRef.current = setTimeout(onTest, 700) }}
      onPointerUp={() => { if (longPressRef.current) clearTimeout(longPressRef.current) }}
      onPointerLeave={() => { if (longPressRef.current) clearTimeout(longPressRef.current) }}
    >
      {isOn ? '🔔' : '🔕'}
    </IconButton>
  )
}

// ─── Theme ────────────────────────────────────────────────────────────────────

function useTheme() {
  const [theme, setTheme] = useState<'dark' | 'light'>('dark')

  useEffect(() => {
    const saved = localStorage.getItem('revenue-hub-theme') as 'dark' | 'light' | null
    const initial = saved ?? 'dark'
    setTheme(initial)
    document.documentElement.setAttribute('data-theme', initial)
  }, [])

  const toggleTheme = useCallback(() => {
    setTheme((prev) => {
      const next = prev === 'dark' ? 'light' : 'dark'
      document.documentElement.setAttribute('data-theme', next)
      localStorage.setItem('revenue-hub-theme', next)
      return next
    })
  }, [])

  return { theme, toggleTheme }
}

function ThemeToggle({ theme, onToggle }: { theme: 'dark' | 'light'; onToggle: () => void }) {
  return (
    <IconButton onClick={onToggle} title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}>
      {theme === 'dark' ? '☀' : '☽'}
    </IconButton>
  )
}

// ─── Onboarding ───────────────────────────────────────────────────────────────

function useOnboarding() {
  const [done, setDone] = useState<boolean | null>(() =>
    typeof window !== 'undefined' ? !!localStorage.getItem('tagett-onboarded') : null
  )
  const complete = useCallback(() => {
    localStorage.setItem('tagett-onboarded', '1')
    setDone(true)
  }, [])
  return { done, complete }
}

function OnboardingScreen({ onComplete }: { onComplete: () => void }) {
  const [step, setStep] = useState(0)

  const next = () => (step < 1 ? setStep(1) : onComplete())

  return (
    <div style={{
      position: 'fixed', inset: 0, background: BG, zIndex: 200,
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      padding: '0 36px env(safe-area-inset-bottom)',
    }}>
      {/* spacer pushes content into the lower portion */}
      <div style={{ flex: 1 }} />

      {step === 0 ? (
        <>
          <img
            src="/icon-192.png"
            alt="Tagett"
            width={72}
            height={72}
            style={{ borderRadius: 18, marginBottom: 22, boxShadow: `0 0 36px ${GOLD}40` }}
          />
          <div style={{ fontFamily: FONT_HEADING, fontWeight: 800, fontSize: 28, color: TEXT, marginBottom: 10, letterSpacing: '-0.02em' }}>
            Tagett
          </div>
          <div style={{ fontSize: 13, color: MUTED, textAlign: 'center', lineHeight: 1.6, marginBottom: 40, fontFamily: FONT_BODY }}>
            AI operator tools for Ecstasy Technologies. Find leads, write content, scope projects, and track revenue.
          </div>
        </>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 22, width: '100%' }}>
            {AGENT_IDS.map((id) => {
              const a = AGENTS[id]
              return (
                <div key={id} style={{
                  background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 12,
                  padding: '12px 10px', display: 'flex', flexDirection: 'column', gap: 4,
                }}>
                  <span style={{ fontSize: 20, lineHeight: 1 }}>{a.icon}</span>
                  <div style={{ fontFamily: FONT_HEADING, fontWeight: 600, fontSize: 12, color: TEXT }}>{a.short}</div>
                  <div style={{ fontSize: 10, color: MUTED, lineHeight: 1.4, fontFamily: FONT_BODY }}>{a.description}</div>
                </div>
              )
            })}
          </div>
          <div style={{ fontFamily: FONT_HEADING, fontWeight: 700, fontSize: 18, color: TEXT, marginBottom: 8, textAlign: 'center' }}>
            Five agents. One mission.
          </div>
          <div style={{ fontSize: 13, color: MUTED, textAlign: 'center', lineHeight: 1.6, marginBottom: 36, fontFamily: FONT_BODY }}>
            They work as a machine: find leads, write pitches, scope deals, go viral, and track every GHS toward the goal.
          </div>
        </>
      )}

      <div style={{ display: 'flex', gap: 6, marginBottom: 20 }}>
        {[0, 1].map((i) => (
          <div key={i} style={{
            width: i === step ? 20 : 6, height: 5, borderRadius: 3,
            background: i === step ? TEXT : BORDER,
            transition: 'width 0.25s ease, background 0.25s ease',
          }} />
        ))}
      </div>

      <button
        onClick={next}
        style={{
          width: '100%', padding: '15px',
          background: TEXT, color: BG,
          borderRadius: 14, border: 'none',
          fontFamily: FONT_HEADING, fontWeight: 700, fontSize: 15,
          cursor: 'pointer',
        }}
      >
        {step === 0 ? 'Continue' : 'Get Started'}
      </button>

      {step === 0 && (
        <button
          onClick={onComplete}
          style={{ marginTop: 16, marginBottom: 8, fontSize: 13, color: MUTED, fontFamily: FONT_BODY }}
        >
          Skip
        </button>
      )}

      <div style={{ height: step === 0 ? 0 : 24 }} />
    </div>
  )
}

// ─── ThinkingDots ─────────────────────────────────────────────────────────────

function ThinkingDots() {
  return (
    <span style={{ display: 'inline-flex', gap: 3, alignItems: 'center' }}>
      {[0, 1, 2].map((i) => (
        <span key={i} style={{
          width: 5, height: 5, borderRadius: '50%', background: MUTED,
          display: 'inline-block',
          animation: 'rhPulse 1.2s ease-in-out infinite',
          animationDelay: `${i * 0.2}s`,
        }} />
      ))}
      <style>{`@keyframes rhPulse { 0%,80%,100%{opacity:0.2} 40%{opacity:1} }`}</style>
    </span>
  )
}

// ─── HandoffChips ─────────────────────────────────────────────────────────────

function HandoffChips({ agentId, content, onHandoff }: {
  agentId: AgentId
  content: string
  onHandoff: (targetAgent: AgentId, prompt: string) => void
}) {
  const handoffs = HANDOFFS[agentId]
  if (!handoffs || handoffs.length === 0) return null
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10, paddingLeft: 34 }}>
      {handoffs.map((h) => (
        <button
          key={h.targetAgent}
          onClick={() => onHandoff(h.targetAgent, h.buildPrompt(content))}
          style={{
            padding: '5px 12px', borderRadius: 20,
            border: `1px solid ${GOLD}60`,
            background: `${GOLD}10`,
            color: GOLD,
            fontSize: 12, fontFamily: FONT_BODY, fontWeight: 500,
            cursor: 'pointer', transition: 'background 0.15s',
          }}
        >
          {h.label}
        </button>
      ))}
    </div>
  )
}

// ─── ProspectActionChips ─────────────────────────────────────────────────────

function ProspectActionChips({ content }: { content: string }) {
  const prospects = extractProspects(content)
  if (prospects.length === 0) return null
  return (
    <div style={{ marginTop: 8, paddingLeft: 34, display: 'flex', flexDirection: 'column', gap: 6 }}>
      {prospects.map(({ phone, pitch, name }) => {
        const waUrl = `https://wa.me/${phone.replace('+', '')}${pitch ? `?text=${encodeURIComponent(pitch)}` : ''}`
        const liUrl = name
          ? `https://www.linkedin.com/search/results/companies/?keywords=${encodeURIComponent(name + ' Ghana')}`
          : null
        return (
          <div key={phone} style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            <a href={waUrl} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '5px 12px', borderRadius: 20, border: `1px solid ${WA_GREEN}60`, background: `${WA_GREEN}10`, color: WA_GREEN, fontSize: 12, fontFamily: FONT_BODY, fontWeight: 500, textDecoration: 'none' }}>
              📱 {phone}
            </a>
            {liUrl && (
              <a href={liUrl} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '5px 12px', borderRadius: 20, border: `1px solid ${LI_BLUE}60`, background: `${LI_BLUE}10`, color: LI_BLUE, fontSize: 12, fontFamily: FONT_BODY, fontWeight: 500, textDecoration: 'none' }}>
                in {name}
              </a>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ─── SocialShareBar ───────────────────────────────────────────────────────────

type PostStatus = 'idle' | 'posting' | 'done' | 'error'
type BufferProfile = { id: string; service: string; username: string }

function SocialShareBar({ content }: { content: string }) {
  const [copied, setCopied] = useState(false)
  const [statuses, setStatuses] = useState<Record<number, PostStatus>>({})
  const [profiles, setProfiles] = useState<BufferProfile[]>([])

  useEffect(() => {
    fetch('/api/social/buffer')
      .then(r => r.ok ? r.json() : [])
      .then(data => { if (Array.isArray(data)) setProfiles(data) })
      .catch(() => {})
  }, [])

  const posts = extractXPosts(content)

  const postToBuffer = useCallback(async (post: string, idx: number) => {
    setStatuses(prev => ({ ...prev, [idx]: 'posting' }))
    try {
      const res = await fetch('/api/social/buffer', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ text: post, profileIds: profiles.map(p => p.id), now: true }),
      })
      const next: PostStatus = res.ok ? 'done' : 'error'
      setStatuses(prev => ({ ...prev, [idx]: next }))
      if (next === 'done') setTimeout(() => setStatuses(prev => ({ ...prev, [idx]: 'idle' })), 3000)
    } catch {
      setStatuses(prev => ({ ...prev, [idx]: 'error' }))
    }
  }, [profiles])

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [content])

  const liUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(ECSTASY_URL)}`
  const fbUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(ECSTASY_URL)}&quote=${encodeURIComponent(content.slice(0, 500))}`

  const bufferBtnStyle = (s: PostStatus): React.CSSProperties => ({
    display: 'inline-flex', alignItems: 'center', gap: 4,
    padding: '5px 10px', borderRadius: 20,
    border: `1px solid ${s === 'done' ? GOLD + '80' : s === 'error' ? '#f8717160' : BORDER}`,
    background: s === 'done' ? `${GOLD}18` : s === 'error' ? '#f8717110' : SURFACE2,
    color: s === 'done' ? GOLD : s === 'error' ? '#f87171' : MUTED,
    fontSize: 12, fontFamily: FONT_BODY, fontWeight: 500,
    opacity: s === 'posting' ? 0.6 : 1,
  })

  return (
    <div style={{ marginTop: 10, paddingLeft: 34 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <div style={{ fontSize: 10, color: MUTED, fontFamily: FONT_HEADING, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          Post to social
        </div>
        {profiles.length > 0 && (
          <div style={{ fontSize: 10, color: MUTED, fontFamily: FONT_BODY }}>
            Buffer: {profiles.map(p => p.service).join(' · ')}
          </div>
        )}
      </div>

      {posts.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5, marginBottom: 8 }}>
          {posts.map((post, i) => {
            const s = statuses[i] ?? 'idle'
            return (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 10, color: MUTED, fontFamily: FONT_BODY, minWidth: 12 }}>{i + 1}</span>
                <a
                  href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(post)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '5px 12px', borderRadius: 20, border: `1px solid ${X_BLUE}40`, background: `${X_BLUE}08`, color: X_BLUE, fontSize: 12, fontFamily: FONT_BODY, fontWeight: 500, textDecoration: 'none' }}
                >
                  𝕏 Tweet
                </a>
                {profiles.length > 0 && (
                  <button
                    onClick={() => postToBuffer(post, i)}
                    disabled={s === 'posting'}
                    style={bufferBtnStyle(s)}
                  >
                    {s === 'idle' && '↑ Post'}
                    {s === 'posting' && '…'}
                    {s === 'done' && '✓ Posted'}
                    {s === 'error' && '✗ Failed'}
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        <a href={liUrl} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '5px 12px', borderRadius: 20, border: `1px solid ${LI_BLUE}60`, background: `${LI_BLUE}10`, color: LI_BLUE, fontSize: 12, fontFamily: FONT_BODY, fontWeight: 500, textDecoration: 'none' }}>
          in LinkedIn
        </a>
        <a href={fbUrl} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '5px 12px', borderRadius: 20, border: `1px solid ${FB_BLUE}60`, background: `${FB_BLUE}10`, color: FB_BLUE, fontSize: 12, fontFamily: FONT_BODY, fontWeight: 500, textDecoration: 'none' }}>
          f Facebook
        </a>
        <button onClick={handleCopy} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '5px 12px', borderRadius: 20, border: `1px solid ${copied ? GOLD + '80' : BORDER}`, background: copied ? `${GOLD}18` : SURFACE2, color: copied ? GOLD : MUTED, fontSize: 12, fontFamily: FONT_BODY, fontWeight: 500 }}>
          {copied ? '✓ Copied' : '📋 Copy'}
        </button>
      </div>
    </div>
  )
}

// ─── ChatMessage ──────────────────────────────────────────────────────────────

function ChatMessage({ message, agentId, isLast, onHandoff }: {
  message: Message
  agentId?: AgentId
  isLast?: boolean
  onHandoff?: (targetAgent: AgentId, prompt: string) => void
}) {
  const isUser = message.role === 'user'

  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: 'flex', justifyContent: isUser ? 'flex-end' : 'flex-start' }}>
        {!isUser && (
          <div style={{
            width: 26, height: 26, borderRadius: '50%', background: GOLD,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0, marginRight: 8, marginTop: 2,
            fontFamily: FONT_HEADING, fontSize: 9, fontWeight: 700, color: BG,
          }}>AI</div>
        )}
        <div style={{
          maxWidth: '80%', padding: '10px 14px',
          borderRadius: isUser ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
          background: isUser ? GOLD : SURFACE2,
          color: isUser ? BG : TEXT,
          fontSize: 15, lineHeight: 1.6,
          whiteSpace: 'pre-wrap', wordBreak: 'break-word',
          fontFamily: FONT_BODY,
        }}>
          {message.content}
        </div>
      </div>
      {!isUser && agentId === 'prospect' && (
        <ProspectActionChips content={message.content} />
      )}
      {!isUser && isLast && agentId === 'content' && (
        <SocialShareBar content={message.content} />
      )}
      {!isUser && isLast && agentId && onHandoff && (
        <HandoffChips agentId={agentId} content={message.content} onHandoff={onHandoff} />
      )}
    </div>
  )
}

// ─── ProspectIntakeScreen ─────────────────────────────────────────────────────

function buildProspectPrompt(industries: string[], city: string, area: string): string {
  const industryStr = industries.join(', ')
  const locationStr = area ? `${area}, ${city}` : city
  return `Find me 5 specific ${industryStr} businesses in ${locationStr}, Ghana that do NOT currently have a website. I will be calling them today to offer web and software services from Ecstasy Technologies (ecstasytechnologies.com).

For each business provide exactly in this format:

1. Business Name — [name]
   Industry: [type]
   Address: [specific street or area in ${locationStr}]
   Phone: +233XXXXXXXXX
   Why they need a website: [specific reason relevant to their industry]
   Service to pitch: [web development / mobile app / business software / GIS]
   Estimated value: GHS [amount]
   Phone pitch: "[one sentence I say when they answer the phone]"

Be specific — use real-sounding Ghanaian business names, actual street names in ${locationStr}, and valid +233 phone number formats. Make every entry immediately actionable for a cold call today.`
}

function ProspectIntakeScreen({ onSubmit, loading }: {
  onSubmit: (prompt: string) => void
  loading: boolean
}) {
  const [selectedIndustries, setSelectedIndustries] = useState<string[]>([])
  const [selectedCity, setSelectedCity] = useState<string>('')
  const [selectedArea, setSelectedArea] = useState<string>('')

  const toggleIndustry = (ind: string) => {
    setSelectedIndustries((prev) =>
      prev.includes(ind) ? prev.filter((i) => i !== ind) : [...prev, ind]
    )
  }

  const selectCity = (city: string) => {
    setSelectedCity(city)
    setSelectedArea('')
  }

  const canSubmit = selectedIndustries.length > 0 && selectedCity !== ''

  const handleSubmit = () => {
    if (!canSubmit || loading) return
    onSubmit(buildProspectPrompt(selectedIndustries, selectedCity, selectedArea))
  }

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '20px 16px 16px', WebkitOverflowScrolling: 'touch' } as React.CSSProperties}>
      {/* Heading */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontFamily: FONT_HEADING, fontWeight: 700, fontSize: 17, color: TEXT }}>
          Find Today&apos;s Prospects
        </div>
        <div style={{ fontSize: 13, color: MUTED, marginTop: 4, fontFamily: FONT_BODY }}>
          Select an industry and location. ProspectBot finds businesses without websites and gives you their phone numbers.
        </div>
      </div>

      {/* Step 1: Industry */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontFamily: FONT_HEADING, fontWeight: 600, fontSize: 12, color: GOLD, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>
          01 — Which industry?
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {INDUSTRIES.map((ind) => {
            const active = selectedIndustries.includes(ind)
            return (
              <button
                key={ind}
                onClick={() => toggleIndustry(ind)}
                style={{
                  padding: '6px 12px', borderRadius: 20,
                  border: `1px solid ${active ? GOLD : BORDER}`,
                  background: active ? `${GOLD}18` : 'transparent',
                  color: active ? GOLD : MUTED,
                  fontSize: 13, fontFamily: FONT_BODY,
                  transition: 'all 0.15s',
                }}
              >
                {ind}
              </button>
            )
          })}
        </div>
      </div>

      {/* Step 2: City */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontFamily: FONT_HEADING, fontWeight: 600, fontSize: 12, color: GOLD, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>
          02 — Which city?
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {CITIES.map((city) => {
            const active = selectedCity === city
            return (
              <button
                key={city}
                onClick={() => selectCity(city)}
                style={{
                  padding: '6px 14px', borderRadius: 20,
                  border: `1px solid ${active ? GOLD : BORDER}`,
                  background: active ? `${GOLD}18` : 'transparent',
                  color: active ? GOLD : TEXT,
                  fontSize: 13, fontFamily: FONT_HEADING, fontWeight: active ? 600 : 400,
                  transition: 'all 0.15s',
                }}
              >
                {city}
              </button>
            )
          })}
        </div>
      </div>

      {/* Step 3: Area (only when city selected) */}
      {selectedCity && (
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontFamily: FONT_HEADING, fontWeight: 600, fontSize: 12, color: GOLD, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>
            03 — Which area? <span style={{ color: MUTED, fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(optional)</span>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {GHANA_LOCATIONS[selectedCity].map((area) => {
              const active = selectedArea === area
              return (
                <button
                  key={area}
                  onClick={() => setSelectedArea(active ? '' : area)}
                  style={{
                    padding: '6px 12px', borderRadius: 20,
                    border: `1px solid ${active ? GOLD : BORDER}`,
                    background: active ? `${GOLD}18` : 'transparent',
                    color: active ? GOLD : MUTED,
                    fontSize: 13, fontFamily: FONT_BODY,
                    transition: 'all 0.15s',
                  }}
                >
                  {area}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Submit */}
      <button
        onClick={handleSubmit}
        disabled={!canSubmit || loading}
        style={{
          width: '100%', padding: '15px',
          background: canSubmit && !loading ? GOLD : SURFACE2,
          color: canSubmit && !loading ? BG : MUTED,
          borderRadius: 12, border: 'none',
          fontFamily: FONT_HEADING, fontWeight: 700, fontSize: 15,
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          transition: 'background 0.15s, color 0.15s',
          boxShadow: canSubmit && !loading ? `0 0 24px ${GOLD}30` : 'none',
          cursor: canSubmit && !loading ? 'pointer' : 'not-allowed',
          marginTop: selectedCity ? 0 : 8,
        }}
      >
        {loading ? <><ThinkingDots /> Finding prospects…</> : 'Find Prospects + Get Phone Numbers'}
      </button>

      {selectedIndustries.length === 0 && (
        <div style={{ textAlign: 'center', fontSize: 12, color: MUTED, marginTop: 10, fontFamily: FONT_BODY }}>
          Select at least one industry to continue
        </div>
      )}
    </div>
  )
}

// ─── BriefingButton ───────────────────────────────────────────────────────────

function BriefingButton({ label, onClick, loading, size = 'large' }: {
  label: string; onClick: () => void; loading: boolean; size?: 'large' | 'small'
}) {
  if (size === 'small') {
    return (
      <button
        onClick={onClick}
        disabled={loading}
        style={{
          fontSize: 12, fontFamily: FONT_HEADING, fontWeight: 600,
          color: loading ? MUTED : GOLD,
          padding: '4px 10px',
          border: `1px solid ${loading ? BORDER : GOLD + '60'}`,
          borderRadius: 6,
          opacity: loading ? 0.5 : 1,
          whiteSpace: 'nowrap',
        }}
      >
        ▶ Run
      </button>
    )
  }
  return (
    <button
      onClick={onClick}
      disabled={loading}
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        padding: '14px 28px',
        background: loading ? SURFACE2 : GOLD,
        color: loading ? MUTED : BG,
        borderRadius: 12,
        fontFamily: FONT_HEADING, fontWeight: 700, fontSize: 15,
        transition: 'background 0.15s, color 0.15s',
        marginTop: 20,
        cursor: loading ? 'not-allowed' : 'pointer',
        boxShadow: loading ? 'none' : `0 0 24px ${GOLD}30`,
      }}
    >
      {loading ? <><ThinkingDots /> Generating…</> : <>▶ {label}</>}
    </button>
  )
}

// ─── GoalRing ─────────────────────────────────────────────────────────────────

function GoalRing({ earned, mini = false }: { earned: number; mini?: boolean }) {
  const pct = Math.min((earned / MONTHLY_GOAL_GHS) * 100, 100)
  const r = mini ? 13 : 36
  const sz = mini ? 40 : 88
  const cx = sz / 2
  const sw = mini ? 3 : 5
  const circ = 2 * Math.PI * r
  const dash = (pct / 100) * circ
  const pctStr = `${Math.round(pct)}%`

  const arc = (
    <svg width={sz} height={sz} viewBox={`0 0 ${sz} ${sz}`}>
      <circle cx={cx} cy={cx} r={r} fill="none" stroke={BORDER} strokeWidth={sw} />
      <circle cx={cx} cy={cx} r={r} fill="none" stroke={GOLD} strokeWidth={sw} strokeLinecap="round"
        strokeDasharray={`${dash} ${circ}`} transform={`rotate(-90 ${cx} ${cx})`}
        style={{ transition: 'stroke-dasharray 0.6s ease' }} />
      {!mini && (
        <text x={cx} y={cx + 3} textAnchor="middle" fill={TEXT} fontSize="13" fontFamily={FONT_HEADING} fontWeight="600">
          {pctStr}
        </text>
      )}
    </svg>
  )

  if (mini) {
    return (
      <div style={{ position: 'relative', width: 40, height: 40, flexShrink: 0 }}>
        {arc}
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: FONT_HEADING, fontSize: 9, fontWeight: 700, color: TEXT }}>
          {pctStr}
        </div>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: '20px 0' }}>
      {arc}
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontFamily: FONT_HEADING, fontSize: 11, color: MUTED, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Monthly Goal</div>
        <div style={{ fontFamily: FONT_HEADING, fontSize: 13, color: TEXT, fontWeight: 600, marginTop: 2 }}>
          GHS {earned.toLocaleString()} / 120,000
        </div>
      </div>
    </div>
  )
}

// ─── MobileHeader ─────────────────────────────────────────────────────────────

function MobileHeader({ agent, earnedGHS, theme, onToggleTheme, notifToggle }: {
  agent: Agent
  earnedGHS: number
  theme: 'dark' | 'light'
  onToggleTheme: () => void
  notifToggle: React.ReactNode
}) {
  return (
    <div style={{ background: SURFACE, borderBottom: `1px solid ${BORDER}`, paddingTop: 'env(safe-area-inset-top)', flexShrink: 0 }}>
      <div style={{ height: 52, padding: '0 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontFamily: FONT_HEADING, fontWeight: 700, fontSize: 12, color: GOLD, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Tagett</div>
          <div style={{ fontFamily: FONT_HEADING, fontWeight: 600, fontSize: 14, color: TEXT, marginTop: 1 }}>{agent.label}</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {notifToggle}
          <ThemeToggle theme={theme} onToggle={onToggleTheme} />
          <GoalRing earned={earnedGHS} mini />
        </div>
      </div>
    </div>
  )
}

// ─── BottomNav ────────────────────────────────────────────────────────────────

function BottomNav({ activeAgent, allChats, onSelect }: {
  activeAgent: AgentId; allChats: AllChats; onSelect: (id: AgentId) => void
}) {
  return (
    <div style={{ background: SURFACE, borderTop: `1px solid ${BORDER}`, display: 'flex', paddingBottom: 'env(safe-area-inset-bottom)', flexShrink: 0 }}>
      {AGENT_IDS.map((id) => {
        const agent = AGENTS[id]
        const isActive = id === activeAgent
        const turnCount = Math.floor((allChats[id]?.length ?? 0) / 2)
        return (
          <button key={id} onClick={() => onSelect(id)} style={{
            flex: 1, minHeight: 56, display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', gap: 3, background: 'none',
            borderTop: `2px solid ${isActive ? TEXT : 'transparent'}`,
            paddingTop: 10, paddingBottom: 8, transition: 'border-color 0.15s',
          }}>
            <span style={{ fontSize: 20, lineHeight: 1, color: isActive ? TEXT : MUTED, transition: 'color 0.15s' }}>
              {agent.icon}
            </span>
            <span style={{ fontFamily: FONT_HEADING, fontSize: 10, fontWeight: isActive ? 700 : 400, color: isActive ? TEXT : MUTED, marginTop: 1, letterSpacing: '0.02em' }}>
              {agent.short}
            </span>
            {turnCount > 0 && (
              <span style={{ fontFamily: FONT_BODY, fontSize: 9, color: MUTED, background: SURFACE2, padding: '1px 5px', borderRadius: 8, minWidth: 16, textAlign: 'center' }}>
                {turnCount}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}

// ─── ChatInput ────────────────────────────────────────────────────────────────

function ChatInput({ agentShort, onSend, loading }: {
  agentShort: string; onSend: (text: string) => void; loading: boolean
}) {
  const [input, setInput] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const handleSend = useCallback(() => {
    const text = input.trim()
    if (!text || loading) return
    setInput('')
    if (textareaRef.current) textareaRef.current.style.height = 'auto'
    onSend(text)
  }, [input, loading, onSend])

  return (
    <div style={{ padding: '10px 12px 12px', borderTop: `1px solid ${BORDER}`, flexShrink: 0 }}>
      <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', background: SURFACE2, border: `1px solid ${BORDER}`, borderRadius: 12, padding: '8px 8px 8px 14px' }}>
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }}
          placeholder={`Message ${agentShort}…`}
          rows={1}
          style={{ flex: 1, background: 'none', border: 'none', outline: 'none', color: TEXT, fontSize: 16, resize: 'none', lineHeight: 1.5, maxHeight: 120, overflowY: 'auto', fontFamily: FONT_BODY }}
          onInput={(e) => { const t = e.currentTarget; t.style.height = 'auto'; t.style.height = Math.min(t.scrollHeight, 120) + 'px' }}
        />
        <button
          onClick={handleSend}
          disabled={!input.trim() || loading}
          style={{ width: 36, height: 36, borderRadius: 8, flexShrink: 0, background: input.trim() && !loading ? GOLD : SURFACE, color: input.trim() && !loading ? BG : MUTED, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, transition: 'background 0.15s, color 0.15s' }}
        >↑</button>
      </div>
    </div>
  )
}

// ─── MessageList ──────────────────────────────────────────────────────────────

function MessageList({ messages, loading, agent, onSend, onRunBriefing, onHandoff }: {
  messages: Message[]
  loading: boolean
  agent: Agent
  onSend: (text: string) => void
  onRunBriefing: () => void
  onHandoff: (targetAgent: AgentId, prompt: string) => void
}) {
  const bottomRef = useRef<HTMLDivElement>(null)
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages, loading])

  const isEmpty = messages.length === 0
  const lastAssistantIdx = messages.reduce((acc, m, i) => m.role === 'assistant' ? i : acc, -1)

  return (
    <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', WebkitOverflowScrolling: 'touch' } as React.CSSProperties}>
      {isEmpty ? (
        agent.id === 'prospect' ? (
          <ProspectIntakeScreen onSubmit={onSend} loading={loading} />
        ) : (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '0 24px', color: MUTED, textAlign: 'center', lineHeight: 1.7, fontFamily: FONT_BODY }}>
            <div style={{ fontSize: 32, marginBottom: 16, opacity: 0.2 }}>◈</div>
            <div style={{ fontFamily: FONT_HEADING, fontWeight: 600, fontSize: 15, color: TEXT, marginBottom: 6 }}>{agent.label}</div>
            <div style={{ fontSize: 13, color: MUTED, marginBottom: 4 }}>{agent.description}</div>
            <div style={{ fontSize: 12, color: MUTED, opacity: 0.6, marginBottom: 8 }}>Tap to run autonomously, or type a message below.</div>
            <BriefingButton label={agent.briefingLabel} onClick={onRunBriefing} loading={loading} size="large" />
          </div>
        )
      ) : (
        <div style={{ padding: '16px 12px 8px' }}>
          {messages.map((m, i) => (
            <ChatMessage
              key={i}
              message={m}
              agentId={agent.id}
              isLast={i === lastAssistantIdx && !loading}
              onHandoff={onHandoff}
            />
          ))}
          {loading && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <div style={{ width: 26, height: 26, borderRadius: '50%', background: GOLD, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: FONT_HEADING, fontSize: 9, fontWeight: 700, color: BG, flexShrink: 0 }}>AI</div>
              <ThinkingDots />
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      )}
    </div>
  )
}

// ─── ErrorBanner ──────────────────────────────────────────────────────────────

function ErrorBanner({ error, onDismiss }: { error: string; onDismiss: () => void }) {
  return (
    <div style={{ padding: '10px 16px', background: '#2a1010', borderBottom: '1px solid #4a2020', color: '#f87171', fontSize: 13, fontFamily: FONT_BODY, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
      <span><strong>Error:</strong> {error}</span>
      <button onClick={onDismiss} style={{ color: '#f87171', fontSize: 12, textDecoration: 'underline', fontFamily: FONT_BODY, flexShrink: 0 }}>Dismiss</button>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function Page() {
  const isMobile = useIsMobile()
  const { theme, toggleTheme } = useTheme()
  const { done: onboarded, complete: completeOnboarding } = useOnboarding()
  const { status: notifStatus, subscribe, unsubscribe, sendTest } = useNotifications()
  const [activeAgent, setActiveAgent] = useState<AgentId>('prospect')
  const [allChats, setAllChats] = useState<AllChats>(() => ({} as AllChats))
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => { setAllChats(loadAllChats()) }, [])
  useEffect(() => { saveAllChats(allChats) }, [allChats])

  const messages: Message[] = allChats[activeAgent] ?? []
  const agent = AGENTS[activeAgent]

  const handleSend = useCallback(async (text: string) => {
    const userMsg: Message = { role: 'user', content: text }
    const next = [...messages, userMsg]
    setAllChats((prev) => ({ ...prev, [activeAgent]: next }))
    setLoading(true)
    setError(null)
    try {
      const reply = await callChat(agent.systemPrompt, next)
      setAllChats((prev) => ({
        ...prev,
        [activeAgent]: [...(prev[activeAgent] ?? []), { role: 'assistant', content: reply }],
      }))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }, [activeAgent, messages, agent])

  const handleRunBriefing = useCallback(() => {
    if (agent.dailyPrompt) handleSend(agent.dailyPrompt)
  }, [agent.dailyPrompt, handleSend])

  const handleClear = useCallback(() => {
    setAllChats((prev) => ({ ...prev, [activeAgent]: [] }))
    setError(null)
  }, [activeAgent])

  const handleHandoff = useCallback(async (targetAgent: AgentId, prompt: string) => {
    setActiveAgent(targetAgent)
    setError(null)
    const userMsg: Message = { role: 'user', content: prompt }
    let messagesForApi: Message[] = []
    setAllChats((prev) => {
      messagesForApi = [...(prev[targetAgent] ?? []), userMsg]
      return { ...prev, [targetAgent]: messagesForApi }
    })
    setLoading(true)
    try {
      const reply = await callChat(AGENTS[targetAgent].systemPrompt, messagesForApi)
      setAllChats((prev) => ({
        ...prev,
        [targetAgent]: [...(prev[targetAgent] ?? []), { role: 'assistant', content: reply }],
      }))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }, [])

  const handleSelectAgent = useCallback((id: AgentId) => {
    setActiveAgent(id); setError(null)
  }, [])

  const earnedGHS = useMemo(() => {
    let max = 0
    for (const m of allChats.revenue ?? []) {
      for (const match of m.content.match(/GHS\s*([\d,]+)/gi) ?? []) {
        const val = parseInt(match.replace(/[^0-9]/g, ''), 10)
        if (val < MONTHLY_GOAL_GHS && val > max) max = val
      }
    }
    return max
  }, [allChats.revenue])

  if (onboarded === null) return null
  if (!onboarded) return <OnboardingScreen onComplete={completeOnboarding} />

  const AgentSubheader = (
    <div style={{ padding: '10px 16px 8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, borderBottom: `1px solid ${BORDER}`, flexShrink: 0 }}>
      <span style={{ fontSize: 12, color: MUTED, fontFamily: FONT_BODY, flex: 1 }}>{agent.description}</span>
      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
        {agent.id !== 'prospect' && (
          <BriefingButton label={agent.briefingLabel} onClick={handleRunBriefing} loading={loading} size="small" />
        )}
        {messages.length > 0 && (
          <button onClick={handleClear} style={{ fontSize: 12, color: MUTED, padding: '4px 10px', border: `1px solid ${BORDER}`, borderRadius: 6, fontFamily: FONT_BODY, minHeight: 30 }}>
            Clear
          </button>
        )}
      </div>
    </div>
  )

  // ── Mobile ─────────────────────────────────────────────────────────────────
  if (isMobile) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100dvh', background: BG, overflow: 'hidden' }}>
        <MobileHeader agent={agent} earnedGHS={earnedGHS} theme={theme} onToggleTheme={toggleTheme} notifToggle={<NotifToggle status={notifStatus} onSubscribe={subscribe} onUnsubscribe={unsubscribe} onTest={sendTest} />} />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {AgentSubheader}
          {error && <ErrorBanner error={error} onDismiss={() => setError(null)} />}
          <MessageList messages={messages} loading={loading} agent={agent} onSend={handleSend} onRunBriefing={handleRunBriefing} onHandoff={handleHandoff} />
          <ChatInput agentShort={agent.short} onSend={handleSend} loading={loading} />
        </div>
        <BottomNav activeAgent={activeAgent} allChats={allChats} onSelect={handleSelectAgent} />
      </div>
    )
  }

  // ── Desktop ────────────────────────────────────────────────────────────────
  return (
    <div style={{ display: 'flex', height: '100vh', background: BG, overflow: 'hidden' }}>
      <div style={{ width: 240, flexShrink: 0, background: SURFACE, borderRight: `1px solid ${BORDER}`, display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '20px 20px 16px', borderBottom: `1px solid ${BORDER}` }}>
          <div style={{ fontFamily: FONT_HEADING, fontWeight: 700, fontSize: 14, color: GOLD, letterSpacing: '0.05em', textTransform: 'uppercase' }}>Tagett</div>
          <div style={{ fontSize: 11, color: MUTED, marginTop: 2, fontFamily: FONT_BODY }}>Ecstasy Technologies</div>
        </div>
        <nav style={{ padding: '12px 10px', flex: 1 }}>
          {AGENT_IDS.map((id) => {
            const a = AGENTS[id], isActive = id === activeAgent
            const msgCount = (allChats[id] ?? []).length
            return (
              <button key={id} onClick={() => handleSelectAgent(id)} style={{ width: '100%', display: 'block', textAlign: 'left', padding: '9px 12px', borderRadius: 8, marginBottom: 2, background: isActive ? `${GOLD}18` : 'transparent', transition: 'background 0.15s' }}
                onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.background = `${GOLD}0A` }}
                onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.background = 'transparent' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontFamily: FONT_HEADING, fontSize: 13, fontWeight: isActive ? 600 : 400, color: isActive ? GOLD : TEXT }}>{a.label}</span>
                  {msgCount > 0 && <span style={{ fontSize: 10, fontFamily: FONT_BODY, color: isActive ? GOLD : MUTED, background: isActive ? `${GOLD}20` : SURFACE2, padding: '1px 6px', borderRadius: 10 }}>{Math.floor(msgCount / 2)}</span>}
                </div>
                <div style={{ fontSize: 11, color: MUTED, marginTop: 2, fontFamily: FONT_BODY }}>{a.description}</div>
              </button>
            )
          })}
        </nav>
        <div style={{ borderTop: `1px solid ${BORDER}` }}>
          <div style={{ padding: '10px 16px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <NotifToggle status={notifStatus} onSubscribe={subscribe} onUnsubscribe={unsubscribe} onTest={sendTest} />
            <ThemeToggle theme={theme} onToggle={toggleTheme} />
          </div>
          <GoalRing earned={earnedGHS} />
        </div>

      </div>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: `1px solid ${BORDER}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <div>
            <div style={{ fontFamily: FONT_HEADING, fontWeight: 600, fontSize: 15, color: TEXT }}>{agent.label}</div>
            <div style={{ fontSize: 12, color: MUTED, marginTop: 2, fontFamily: FONT_BODY }}>{agent.description}</div>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {agent.id !== 'prospect' && <BriefingButton label={agent.briefingLabel} onClick={handleRunBriefing} loading={loading} size="small" />}
            {messages.length > 0 && (
              <button onClick={handleClear} style={{ fontSize: 12, color: MUTED, padding: '4px 10px', border: `1px solid ${BORDER}`, borderRadius: 6, fontFamily: FONT_BODY, transition: 'color 0.15s, border-color 0.15s' }}
                onMouseEnter={(e) => { const t = e.currentTarget; t.style.color = TEXT; t.style.borderColor = MUTED }}
                onMouseLeave={(e) => { const t = e.currentTarget; t.style.color = MUTED; t.style.borderColor = BORDER }}>
                Clear
              </button>
            )}
          </div>
        </div>
        {error && <ErrorBanner error={error} onDismiss={() => setError(null)} />}
        <MessageList messages={messages} loading={loading} agent={agent} onSend={handleSend} onRunBriefing={handleRunBriefing} onHandoff={handleHandoff} />
        <ChatInput agentShort={agent.short} onSend={handleSend} loading={loading} />
      </div>
    </div>
  )
}
