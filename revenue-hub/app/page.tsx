'use client'

import { useState, useEffect, useRef, useCallback } from 'react'

// ─── Design tokens ────────────────────────────────────────────────────────────

const GOLD = '#C8A96E'
const BG = '#0B0B0D'
const SURFACE = '#111114'
const SURFACE2 = '#18181C'
const BORDER = '#222226'
const TEXT = '#F0EDE8'
const MUTED = '#6B6870'
const SUCCESS = '#4ade80'
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

type AgentId = 'prospect' | 'content' | 'scope' | 'revenue'

interface Agent {
  id: AgentId
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
    label: '01 ProspectBot',
    short: 'Prospect',
    description: 'Find businesses without websites in Ghana',
    briefingLabel: "Today's Prospect List",
    dailyPrompt: '',
    systemPrompt: `You are ProspectBot, a lead generation AI for Ecstasy Geospatial Services based in Kumasi, Ghana.

Your job is to find businesses in Ghana that do NOT have a website and qualify them as leads for web development services.

IMPORTANT: Always include phone numbers for every prospect in Ghanaian format (+233XXXXXXXXX or 0XXXXXXXXX).

Output format for each prospect:
1. Business Name — [name]
   Industry: [type]
   Address: [specific location in Ghana]
   Phone: +233XXXXXXXXX
   Why they need a website: [specific reason]
   Service to pitch: [web dev / GIS / social media]
   Estimated value: GHS [amount]
   Phone pitch: "[one sentence to say when they pick up]"

Cover all industries and business types. Be specific about Ghanaian towns, streets, and areas. All pricing in GHS.`,
  },
  content: {
    id: 'content',
    label: '02 ContentBot',
    short: 'Content',
    description: 'X posts & client proposals',
    briefingLabel: "Today's Content Pack",
    dailyPrompt: `Generate today's content package for Ecstasy Geospatial Services. Deliver:

1. Three ready-to-post X (Twitter) posts — each showcasing a different service (GIS mapping, web development, or UAV surveys). Make them specific and compelling to attract Ghanaian clients. No hashtag spam. Under 280 characters each.

2. One professional WhatsApp follow-up message I can send to a warm prospect today — confident, brief, with a clear call to action.

Keep everything on-brand: premium, confident, no filler phrases.`,
    systemPrompt: `You are ContentBot, a content writing AI for Ecstasy Geospatial Services based in Kumasi, Ghana. You write two types of content:

1. X (Twitter) posts — concise, professional, GIS/tech/urban planning focus. Aimed at attracting Ghanaian clients and showcasing expertise. No hashtag spam. Max 280 characters unless thread requested.

2. Client proposals — formal business proposals for Ghanaian clients. Include: executive summary, scope of work, deliverables, timeline, pricing in GHS, and terms.

Services offered:
- Web development: GHS 5,000–18,000
- GIS mapping: GHS 3,000–10,000
- UAV surveys: GHS 5,000–12,000
- Social media packages: GHS 1,200–2,500/month
- Planning documents: GHS 1,500–4,000

Write in a confident, premium tone. Reference Ghana, Kumasi, Accra, and local industries authentically. Never use AI slop filler phrases.`,
  },
  scope: {
    id: 'scope',
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
    systemPrompt: `You are ProjectBot, a project scoping AI for Ecstasy Geospatial Services based in Kumasi, Ghana. When given a project brief, you:

1. Ask clarifying questions if needed
2. Define clear scope, deliverables, and milestones
3. Generate a GHS-priced proposal with line items
4. Flag risks and assumptions

Service pricing ranges (always in GHS):
- Web development: GHS 5,000–18,000 (complexity-dependent)
- GIS mapping & spatial analysis: GHS 3,000–10,000
- UAV/drone surveys: GHS 5,000–12,000 (area and deliverable dependent)
- Social media management: GHS 1,200–2,500/month
- Urban planning documents: GHS 1,500–4,000

Consider Ghanaian project realities: site access, data availability, GNSS accuracy, internet reliability, client capacity. Reference local standards and agencies (Lands Commission, EPA Ghana, GSGDA, etc.) where applicable.`,
  },
  revenue: {
    id: 'revenue',
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
    systemPrompt: `You are RevenueTracker, a business analytics AI for Ecstasy Geospatial Services based in Kumasi, Ghana. You help track and analyse monthly revenue against a GHS 120,000/month target (~$10,000 USD).

When given revenue data, you:
1. Calculate total earnings and % of monthly goal achieved
2. Break down earnings by service type
3. Identify which services are over/under-performing
4. Suggest strategies to close any gap to GHS 120,000
5. Project the month-end total based on current pace

Service pricing context:
- Web development: GHS 5,000–18,000
- GIS mapping: GHS 3,000–10,000
- UAV surveys: GHS 5,000–12,000
- Social media packages: GHS 1,200–2,500/month
- Planning documents: GHS 1,500–4,000

Always express amounts in GHS. Give clear, actionable analysis.`,
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

async function initiateCall(toNumber: string): Promise<{ success: boolean; error?: string }> {
  const res = await fetch('/api/call', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ toNumber }),
  })
  const data = await res.json()
  if (!res.ok) return { success: false, error: data.error }
  return { success: true }
}

// ─── Phone number utilities ───────────────────────────────────────────────────

const GH_PHONE_REGEX = /(\+233|0)([235][0-9]{8})/g

function extractPhoneNumbers(text: string): string[] {
  const matches = [...text.matchAll(GH_PHONE_REGEX)]
  const numbers = matches.map((m) => {
    const raw = m[0].replace(/\s/g, '')
    return raw.startsWith('0') ? '+233' + raw.slice(1) : raw
  })
  return [...new Set(numbers)]
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

// ─── CallChips ────────────────────────────────────────────────────────────────

function CallChips({ numbers }: { numbers: string[] }) {
  const [states, setStates] = useState<Record<string, 'idle' | 'calling' | 'called' | 'error'>>({})

  const handleCall = async (num: string) => {
    setStates((p) => ({ ...p, [num]: 'calling' }))
    const result = await initiateCall(num)
    setStates((p) => ({ ...p, [num]: result.success ? 'called' : 'error' }))
  }

  if (numbers.length === 0) return null

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8, paddingLeft: 34 }}>
      {numbers.map((num) => {
        const state = states[num] ?? 'idle'
        const isCalling = state === 'calling'
        const isCalled = state === 'called'
        const isError = state === 'error'
        return (
          <button
            key={num}
            onClick={() => handleCall(num)}
            disabled={isCalling || isCalled}
            style={{
              display: 'flex', alignItems: 'center', gap: 5,
              padding: '5px 12px', borderRadius: 20,
              background: isCalled ? `${SUCCESS}15` : isError ? '#2a1010' : SURFACE,
              border: `1px solid ${isCalled ? SUCCESS : isError ? '#f87171' : GOLD + '60'}`,
              color: isCalled ? SUCCESS : isError ? '#f87171' : GOLD,
              fontSize: 12, fontFamily: FONT_BODY, fontWeight: 500,
              cursor: isCalling || isCalled ? 'default' : 'pointer',
              transition: 'all 0.15s',
            }}
          >
            <span style={{ fontSize: 11 }}>
              {isCalling ? '...' : isCalled ? '✓' : isError ? '!' : '◉'}
            </span>
            {isCalling ? 'Calling…' : isCalled ? 'Called' : isError ? 'Failed — retry?' : `Call ${num}`}
          </button>
        )
      })}
    </div>
  )
}

// ─── ChatMessage ──────────────────────────────────────────────────────────────

function ChatMessage({ message }: { message: Message }) {
  const isUser = message.role === 'user'
  const phoneNumbers = !isUser ? extractPhoneNumbers(message.content) : []

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
      {phoneNumbers.length > 0 && <CallChips numbers={phoneNumbers} />}
    </div>
  )
}

// ─── ProspectIntakeScreen ─────────────────────────────────────────────────────

function buildProspectPrompt(industries: string[], city: string, area: string): string {
  const industryStr = industries.join(', ')
  const locationStr = area ? `${area}, ${city}` : city
  return `Find me 5 specific ${industryStr} businesses in ${locationStr}, Ghana that do NOT currently have a website. I will be calling them today to offer web development services from Ecstasy Geospatial Services.

For each business provide exactly in this format:

1. Business Name — [name]
   Industry: [type]
   Address: [specific street or area in ${locationStr}]
   Phone: +233XXXXXXXXX
   Why they need a website: [specific reason relevant to their industry]
   Service to pitch: [web development / social media / GIS]
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

function GoalRing({ earned }: { earned: number }) {
  const pct = Math.min((earned / MONTHLY_GOAL_GHS) * 100, 100)
  const r = 36
  const circ = 2 * Math.PI * r
  const dash = (pct / 100) * circ
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: '20px 0' }}>
      <svg width="88" height="88" viewBox="0 0 88 88">
        <circle cx="44" cy="44" r={r} fill="none" stroke={BORDER} strokeWidth="5" />
        <circle cx="44" cy="44" r={r} fill="none" stroke={GOLD} strokeWidth="5" strokeLinecap="round"
          strokeDasharray={`${dash} ${circ}`} transform="rotate(-90 44 44)"
          style={{ transition: 'stroke-dasharray 0.6s ease' }} />
        <text x="44" y="47" textAnchor="middle" fill={TEXT} fontSize="13" fontFamily={FONT_HEADING} fontWeight="600">
          {Math.round(pct)}%
        </text>
      </svg>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontFamily: FONT_HEADING, fontSize: 11, color: MUTED, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Monthly Goal</div>
        <div style={{ fontFamily: FONT_HEADING, fontSize: 13, color: TEXT, fontWeight: 600, marginTop: 2 }}>
          GHS {earned.toLocaleString()} / 120,000
        </div>
      </div>
    </div>
  )
}

// ─── MiniGoalRing ─────────────────────────────────────────────────────────────

function MiniGoalRing({ earned }: { earned: number }) {
  const pct = Math.min((earned / MONTHLY_GOAL_GHS) * 100, 100)
  const r = 13, circ = 2 * Math.PI * r, dash = (pct / 100) * circ
  return (
    <div style={{ position: 'relative', width: 40, height: 40, flexShrink: 0 }}>
      <svg width="40" height="40" viewBox="0 0 40 40">
        <circle cx="20" cy="20" r={r} fill="none" stroke={BORDER} strokeWidth="3" />
        <circle cx="20" cy="20" r={r} fill="none" stroke={GOLD} strokeWidth="3" strokeLinecap="round"
          strokeDasharray={`${dash} ${circ}`} transform="rotate(-90 20 20)"
          style={{ transition: 'stroke-dasharray 0.6s ease' }} />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: FONT_HEADING, fontSize: 9, fontWeight: 700, color: TEXT }}>
        {Math.round(pct)}%
      </div>
    </div>
  )
}

// ─── MobileHeader ─────────────────────────────────────────────────────────────

function MobileHeader({ agent, earnedGHS }: { agent: Agent; earnedGHS: number }) {
  return (
    <div style={{ background: SURFACE, borderBottom: `1px solid ${BORDER}`, paddingTop: 'env(safe-area-inset-top)', flexShrink: 0 }}>
      <div style={{ height: 52, padding: '0 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontFamily: FONT_HEADING, fontWeight: 700, fontSize: 12, color: GOLD, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Revenue Hub</div>
          <div style={{ fontFamily: FONT_HEADING, fontWeight: 600, fontSize: 14, color: TEXT, marginTop: 1 }}>{agent.label}</div>
        </div>
        <MiniGoalRing earned={earnedGHS} />
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
            borderTop: `2px solid ${isActive ? GOLD : 'transparent'}`,
            paddingTop: 10, paddingBottom: 8, transition: 'border-color 0.15s',
          }}>
            <span style={{ fontFamily: FONT_HEADING, fontWeight: 700, fontSize: 11, color: isActive ? GOLD : MUTED, letterSpacing: '0.04em' }}>
              {agent.label.split(' ')[0]}
            </span>
            <span style={{ fontFamily: FONT_HEADING, fontSize: 12, fontWeight: isActive ? 600 : 400, color: isActive ? TEXT : MUTED }}>
              {agent.short}
            </span>
            {turnCount > 0 && (
              <span style={{ fontFamily: FONT_BODY, fontSize: 9, color: isActive ? GOLD : MUTED, background: isActive ? `${GOLD}20` : SURFACE2, padding: '1px 5px', borderRadius: 8, minWidth: 16, textAlign: 'center' }}>
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

function MessageList({ messages, loading, agent, onSend, onRunBriefing }: {
  messages: Message[]
  loading: boolean
  agent: Agent
  onSend: (text: string) => void
  onRunBriefing: () => void
}) {
  const bottomRef = useRef<HTMLDivElement>(null)
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages, loading])

  const isEmpty = messages.length === 0

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
          {messages.map((m, i) => <ChatMessage key={i} message={m} />)}
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

  const handleSelectAgent = useCallback((id: AgentId) => {
    setActiveAgent(id); setError(null)
  }, [])

  const earnedGHS = (() => {
    let max = 0
    for (const m of allChats.revenue ?? []) {
      for (const match of m.content.match(/GHS\s*([\d,]+)/gi) ?? []) {
        const val = parseInt(match.replace(/[^0-9]/g, ''), 10)
        if (val < MONTHLY_GOAL_GHS && val > max) max = val
      }
    }
    return max
  })()

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
        <MobileHeader agent={agent} earnedGHS={earnedGHS} />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {AgentSubheader}
          {error && <ErrorBanner error={error} onDismiss={() => setError(null)} />}
          <MessageList messages={messages} loading={loading} agent={agent} onSend={handleSend} onRunBriefing={handleRunBriefing} />
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
          <div style={{ fontFamily: FONT_HEADING, fontWeight: 700, fontSize: 14, color: GOLD, letterSpacing: '0.05em', textTransform: 'uppercase' }}>Revenue Hub</div>
          <div style={{ fontSize: 11, color: MUTED, marginTop: 2, fontFamily: FONT_BODY }}>Ecstasy Geospatial</div>
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
        <div style={{ borderTop: `1px solid ${BORDER}` }}><GoalRing earned={earnedGHS} /></div>
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
        <MessageList messages={messages} loading={loading} agent={agent} onSend={handleSend} onRunBriefing={handleRunBriefing} />
        <ChatInput agentShort={agent.short} onSend={handleSend} loading={loading} />
      </div>
    </div>
  )
}
