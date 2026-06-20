'use client'

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'

// ─── Design tokens ────────────────────────────────────────────────────────────

const GOLD        = 'var(--gold)'
const GOLD_HEX    = '#D4A96A'
const BG          = 'var(--bg)'
const SURFACE     = 'var(--surface)'
const SURFACE2    = 'var(--surface2)'
const SURFACE3    = 'var(--surface3)'
const BORDER      = 'var(--border)'
const BORDER2     = 'var(--border2)'
const TEXT        = 'var(--text)'
const MUTED       = 'var(--muted)'
const PROSE       = 'var(--prose)'
const GLASS       = 'var(--glass)'
const GLASS_BORDER = 'var(--glass-border)'

const FONT_HEADING = "var(--font-space-grotesk), 'Space Grotesk', sans-serif"
const FONT_BODY    = "var(--font-inter), 'Inter', sans-serif"

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
    dailyPrompt: '',
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

Cover all industries and business types. Be specific about Ghanaian towns, streets, and areas. All pricing in GHS.`,
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

2. Client proposals — formal business proposals for Ghanaian clients. Include: executive summary, scope of work, deliverables, timeline, pricing in GHS, and terms.

Services offered:
- Web design & development: GHS 5,000–18,000
- Web applications: GHS 8,000–25,000
- Mobile apps: GHS 10,000–30,000
- Business software: GHS 15,000–40,000
- GIS solutions: GHS 3,000–10,000

Write in a confident, premium tone. Tagline is "Building software Africa trusts." Reference Ghana, Kumasi, Accra, and local industries authentically. Never use AI slop filler phrases.`,
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

Consider Ghanaian project realities: internet reliability, client capacity, payment schedules, and local market expectations. Write proposals professional enough to send directly to a client.`,
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
    systemPrompt: `You are RevenueTracker, a business analytics AI for Ecstasy Technologies, a software studio based in Ghana (ecstasytechnologies.com). You help track and analyse monthly revenue against a GHS 120,000/month target (~$10,000 USD).

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

// ─── Agent handoff map ────────────────────────────────────────────────────────

const HANDOFFS: Record<AgentId, Array<{ label: string; targetAgent: AgentId; buildPrompt: (c: string) => string }>> = {
  prospect: [
    {
      label: '→ Scope with ProjectBot',
      targetAgent: 'scope',
      buildPrompt: (c) => `I found this lead from ProspectBot. Scope a project and generate a GHS-priced proposal:\n\n${c.slice(0, 1500)}`,
    },
    {
      label: '→ Draft Pitch (ContentBot)',
      targetAgent: 'content',
      buildPrompt: (c) => `I have this prospect from ProspectBot. Write a personalized WhatsApp message I can send them today to open the conversation:\n\n${c.slice(0, 1500)}`,
    },
  ],
  scope: [
    {
      label: '→ Polish Proposal (ContentBot)',
      targetAgent: 'content',
      buildPrompt: (c) => `I have this project scope from ProjectBot. Turn it into a polished client-ready proposal I can send by email or WhatsApp:\n\n${c.slice(0, 1500)}`,
    },
    {
      label: '→ Log to RevenueTracker',
      targetAgent: 'revenue',
      buildPrompt: (c) => `I have this scoped project from ProjectBot. Add it to my pipeline and show what % of my GHS 120,000 monthly goal it covers:\n\n${c.slice(0, 1500)}`,
    },
  ],
  content: [
    {
      label: '→ Scope with ProjectBot',
      targetAgent: 'scope',
      buildPrompt: (c) => `I have this content/proposal from ContentBot. Review the scope and generate a formal project proposal with GHS line items:\n\n${c.slice(0, 1500)}`,
    },
  ],
  revenue: [],
}

// ─── Social & WhatsApp helpers ────────────────────────────────────────────────

const WA_GREEN  = '#25D366'
const X_BLACK   = '#000000'
const LI_BLUE   = '#0A66C2'
const FB_BLUE   = '#1877F2'
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

function IconButton({ active = false, activeColor = GOLD_HEX, onClick, onPointerDown, onPointerUp, onPointerLeave, title, disabled, children }: {
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
        width: 32, height: 32, borderRadius: 10, fontSize: 15,
        border: `1px solid ${active ? activeColor + '60' : BORDER2}`,
        background: active ? `${activeColor}18` : GLASS,
        color: active ? activeColor : MUTED,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0, opacity: disabled ? 0.35 : 1,
        transition: 'all 0.18s ease',
        boxShadow: active ? `0 0 16px ${activeColor}20` : 'none',
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
      justifyContent: 'flex-end',
      padding: '0 28px env(safe-area-inset-bottom)',
    }}>
      {/* Radial glow backdrop */}
      <div style={{
        position: 'absolute', top: '15%', left: '50%', transform: 'translateX(-50%)',
        width: 400, height: 400, borderRadius: '50%',
        background: `radial-gradient(circle, ${GOLD_HEX}0C 0%, transparent 70%)`,
        pointerEvents: 'none',
      }} />

      <div style={{
        width: '100%', maxWidth: 360, marginBottom: 48,
        animation: 'scaleIn 0.4s ease',
      }}>
        {step === 0 ? (
          <div style={{ textAlign: 'center', paddingBottom: 8 }}>
            <div style={{
              width: 76, height: 76, borderRadius: 22, margin: '0 auto 24px',
              background: `linear-gradient(135deg, ${GOLD_HEX}30 0%, ${GOLD_HEX}10 100%)`,
              border: `1px solid ${GOLD_HEX}40`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: `0 0 48px ${GOLD_HEX}20, 0 0 0 1px ${GOLD_HEX}20`,
              overflow: 'hidden',
            }}>
              <img src="/icon-192.png" alt="Tagett" width={76} height={76} style={{ borderRadius: 22 }} />
            </div>

            <div style={{
              fontFamily: FONT_HEADING, fontWeight: 800, fontSize: 32,
              color: TEXT, marginBottom: 6, letterSpacing: '-0.03em',
            }}>
              Tagett
            </div>
            <div style={{
              fontFamily: FONT_HEADING, fontSize: 13, fontWeight: 500,
              color: GOLD, letterSpacing: '0.12em', textTransform: 'uppercase',
              marginBottom: 20, opacity: 0.9,
            }}>
              Ecstasy Technologies
            </div>
            <div style={{
              fontSize: 15, color: PROSE, lineHeight: 1.7,
              fontFamily: FONT_BODY, maxWidth: 280, margin: '0 auto',
            }}>
              AI operator tools to find leads, write content, scope projects, and hit your monthly revenue goal.
            </div>
          </div>
        ) : (
          <div style={{ animation: 'fadeSlideUp 0.35s ease' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 28 }}>
              {AGENT_IDS.map((id, idx) => {
                const a = AGENTS[id]
                return (
                  <div key={id} style={{
                    background: SURFACE2,
                    border: `1px solid ${BORDER2}`,
                    borderRadius: 16,
                    padding: '16px 14px',
                    display: 'flex', flexDirection: 'column', gap: 8,
                    animation: `fadeSlideUp 0.35s ease ${idx * 0.06}s both`,
                  }}>
                    <div style={{
                      width: 34, height: 34, borderRadius: 10,
                      background: `${GOLD_HEX}15`,
                      border: `1px solid ${GOLD_HEX}30`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 16, color: GOLD,
                    }}>
                      {a.icon}
                    </div>
                    <div>
                      <div style={{ fontFamily: FONT_HEADING, fontWeight: 700, fontSize: 13, color: TEXT, marginBottom: 3 }}>
                        {a.short}
                      </div>
                      <div style={{ fontSize: 11, color: MUTED, lineHeight: 1.5, fontFamily: FONT_BODY }}>
                        {a.description}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
            <div style={{ textAlign: 'center', marginBottom: 24 }}>
              <div style={{ fontFamily: FONT_HEADING, fontWeight: 700, fontSize: 20, color: TEXT, marginBottom: 8, letterSpacing: '-0.02em' }}>
                Four agents. One mission.
              </div>
              <div style={{ fontSize: 14, color: PROSE, lineHeight: 1.7, fontFamily: FONT_BODY }}>
                They collaborate — hand off prospects, polish proposals, and log deals seamlessly.
              </div>
            </div>
          </div>
        )}

        {/* Step dots */}
        <div style={{ display: 'flex', gap: 5, justifyContent: 'center', marginBottom: 20, marginTop: step === 0 ? 32 : 0 }}>
          {[0, 1].map((i) => (
            <div key={i} style={{
              width: i === step ? 24 : 6, height: 6, borderRadius: 3,
              background: i === step ? GOLD : BORDER2,
              transition: 'width 0.3s ease, background 0.3s ease',
            }} />
          ))}
        </div>

        <button
          onClick={next}
          style={{
            width: '100%', padding: '16px',
            background: `linear-gradient(135deg, ${GOLD_HEX} 0%, #C49050 100%)`,
            color: '#07070F',
            borderRadius: 14, border: 'none',
            fontFamily: FONT_HEADING, fontWeight: 700, fontSize: 15,
            cursor: 'pointer', letterSpacing: '-0.01em',
            boxShadow: `0 4px 24px ${GOLD_HEX}30, 0 1px 0 rgba(255,255,255,0.15) inset`,
            transition: 'transform 0.15s, box-shadow 0.15s',
          }}
        >
          {step === 0 ? 'Continue' : 'Get Started'}
        </button>

        {step === 0 && (
          <button
            onClick={onComplete}
            style={{
              display: 'block', width: '100%', textAlign: 'center',
              marginTop: 14, fontSize: 13, color: MUTED, fontFamily: FONT_BODY,
              letterSpacing: '0.01em',
            }}
          >
            Skip intro
          </button>
        )}
      </div>
    </div>
  )
}

// ─── ThinkingDots ─────────────────────────────────────────────────────────────

function ThinkingDots() {
  return (
    <span style={{ display: 'inline-flex', gap: 4, alignItems: 'center', padding: '2px 0' }}>
      {[0, 1, 2].map((i) => (
        <span key={i} style={{
          width: 5, height: 5, borderRadius: '50%',
          background: GOLD,
          display: 'inline-block',
          animation: 'rhPulse 1.4s ease-in-out infinite',
          animationDelay: `${i * 0.18}s`,
        }} />
      ))}
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
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 12, paddingLeft: 38 }}>
      {handoffs.map((h) => (
        <button
          key={h.targetAgent}
          onClick={() => onHandoff(h.targetAgent, h.buildPrompt(content))}
          style={{
            padding: '5px 13px', borderRadius: 20,
            border: `1px solid ${GOLD_HEX}50`,
            background: `${GOLD_HEX}0D`,
            color: GOLD,
            fontSize: 12, fontFamily: FONT_BODY, fontWeight: 500,
            cursor: 'pointer', transition: 'all 0.15s',
            letterSpacing: '0.01em',
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
    <div style={{ marginTop: 10, paddingLeft: 38, display: 'flex', flexDirection: 'column', gap: 8 }}>
      {prospects.map(({ phone, pitch, name }) => {
        const waUrl = `https://wa.me/${phone.replace('+', '')}${pitch ? `?text=${encodeURIComponent(pitch)}` : ''}`
        const liUrl = name
          ? `https://www.linkedin.com/search/results/companies/?keywords=${encodeURIComponent(name + ' Ghana')}`
          : null
        return (
          <div key={phone} style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            <a
              href={waUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 5,
                padding: '5px 13px', borderRadius: 20,
                border: `1px solid ${WA_GREEN}50`,
                background: `${WA_GREEN}0D`,
                color: WA_GREEN,
                fontSize: 12, fontFamily: FONT_BODY, fontWeight: 500,
                textDecoration: 'none',
              }}
            >
              📱 {phone}
            </a>
            {liUrl && (
              <a
                href={liUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 5,
                  padding: '5px 13px', borderRadius: 20,
                  border: `1px solid ${LI_BLUE}50`,
                  background: `${LI_BLUE}0D`,
                  color: LI_BLUE,
                  fontSize: 12, fontFamily: FONT_BODY, fontWeight: 500,
                  textDecoration: 'none',
                }}
              >
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
    padding: '5px 11px', borderRadius: 20,
    border: `1px solid ${s === 'done' ? GOLD_HEX + '70' : s === 'error' ? '#f8717150' : BORDER2}`,
    background: s === 'done' ? `${GOLD_HEX}15` : s === 'error' ? '#f8717112' : GLASS,
    color: s === 'done' ? GOLD : s === 'error' ? '#f87171' : MUTED,
    fontSize: 12, fontFamily: FONT_BODY, fontWeight: 500,
    opacity: s === 'posting' ? 0.5 : 1,
    transition: 'all 0.15s',
    cursor: s === 'posting' ? 'default' : 'pointer',
  })

  return (
    <div style={{ marginTop: 12, paddingLeft: 38 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <div style={{
          fontSize: 10, color: MUTED, fontFamily: FONT_HEADING,
          textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 600,
        }}>
          Post to social
        </div>
        {profiles.length > 0 && (
          <div style={{ fontSize: 10, color: MUTED, fontFamily: FONT_BODY }}>
            Buffer: {profiles.map(p => p.service).join(' · ')}
          </div>
        )}
      </div>

      {posts.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 10 }}>
          {posts.map((post, i) => {
            const s = statuses[i] ?? 'idle'
            return (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 10, color: MUTED, fontFamily: FONT_BODY, minWidth: 14, opacity: 0.6 }}>{i + 1}</span>
                <a
                  href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(post)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 4,
                    padding: '5px 12px', borderRadius: 20,
                    border: `1px solid ${BORDER2}`,
                    background: GLASS,
                    color: TEXT,
                    fontSize: 12, fontFamily: FONT_BODY, fontWeight: 500,
                    textDecoration: 'none',
                  }}
                >
                  𝕏 Tweet
                </a>
                {profiles.length > 0 && (
                  <button onClick={() => postToBuffer(post, i)} disabled={s === 'posting'} style={bufferBtnStyle(s)}>
                    {s === 'idle' && '↑ Buffer'}
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
        <a href={liUrl} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '5px 12px', borderRadius: 20, border: `1px solid ${LI_BLUE}50`, background: `${LI_BLUE}0D`, color: LI_BLUE, fontSize: 12, fontFamily: FONT_BODY, fontWeight: 500, textDecoration: 'none' }}>
          in LinkedIn
        </a>
        <a href={fbUrl} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '5px 12px', borderRadius: 20, border: `1px solid ${FB_BLUE}50`, background: `${FB_BLUE}0D`, color: FB_BLUE, fontSize: 12, fontFamily: FONT_BODY, fontWeight: 500, textDecoration: 'none' }}>
          f Facebook
        </a>
        <button
          onClick={handleCopy}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 4,
            padding: '5px 12px', borderRadius: 20,
            border: `1px solid ${copied ? GOLD_HEX + '60' : BORDER2}`,
            background: copied ? `${GOLD_HEX}12` : GLASS,
            color: copied ? GOLD : MUTED,
            fontSize: 12, fontFamily: FONT_BODY, fontWeight: 500,
            transition: 'all 0.15s',
          }}
        >
          {copied ? '✓ Copied' : '📋 Copy'}
        </button>
      </div>
    </div>
  )
}

// ─── ChatMessage ──────────────────────────────────────────────────────────────

function ChatMessage({ message, agentId, agentIcon, isLast, onHandoff }: {
  message: Message
  agentId?: AgentId
  agentIcon?: string
  isLast?: boolean
  onHandoff?: (targetAgent: AgentId, prompt: string) => void
}) {
  const isUser = message.role === 'user'

  return (
    <div style={{ marginBottom: 16, animation: 'fadeSlideUp 0.28s ease' }}>
      <div style={{ display: 'flex', justifyContent: isUser ? 'flex-end' : 'flex-start', alignItems: 'flex-end', gap: 10 }}>
        {!isUser && (
          <div style={{
            width: 30, height: 30, borderRadius: 10, flexShrink: 0,
            background: `linear-gradient(135deg, ${GOLD_HEX}30 0%, ${GOLD_HEX}12 100%)`,
            border: `1px solid ${GOLD_HEX}35`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 13, color: GOLD,
            boxShadow: `0 2px 8px ${GOLD_HEX}15`,
          }}>
            {agentIcon ?? '◈'}
          </div>
        )}
        <div style={{
          maxWidth: '78%', padding: '11px 15px',
          borderRadius: isUser ? '18px 18px 5px 18px' : '18px 18px 18px 5px',
          background: isUser
            ? `linear-gradient(135deg, ${GOLD_HEX} 0%, #C49050 100%)`
            : SURFACE3,
          border: isUser ? 'none' : `1px solid ${BORDER2}`,
          color: isUser ? '#07070F' : PROSE,
          fontSize: 14, lineHeight: 1.65,
          whiteSpace: 'pre-wrap', wordBreak: 'break-word',
          fontFamily: FONT_BODY,
          boxShadow: isUser
            ? `0 2px 12px ${GOLD_HEX}25`
            : 'var(--shadow-sm)',
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
    <div style={{ flex: 1, overflowY: 'auto', padding: '24px 16px 20px', WebkitOverflowScrolling: 'touch' } as React.CSSProperties}>
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontFamily: FONT_HEADING, fontWeight: 700, fontSize: 18, color: TEXT, letterSpacing: '-0.02em', marginBottom: 6 }}>
          Find Today&apos;s Prospects
        </div>
        <div style={{ fontSize: 13, color: MUTED, lineHeight: 1.6, fontFamily: FONT_BODY }}>
          Select an industry and location. ProspectBot finds businesses without websites and gives you their phone numbers.
        </div>
      </div>

      {/* Step 1: Industry */}
      <div style={{ marginBottom: 24 }}>
        <div style={{
          fontFamily: FONT_HEADING, fontWeight: 700, fontSize: 11, color: GOLD,
          textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12,
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <span style={{ width: 18, height: 18, borderRadius: 6, background: `${GOLD_HEX}18`, border: `1px solid ${GOLD_HEX}30`, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: GOLD }}>1</span>
          Industry
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {INDUSTRIES.map((ind) => {
            const active = selectedIndustries.includes(ind)
            return (
              <button
                key={ind}
                onClick={() => toggleIndustry(ind)}
                style={{
                  padding: '6px 13px', borderRadius: 20,
                  border: `1px solid ${active ? GOLD_HEX + '60' : BORDER}`,
                  background: active ? `${GOLD_HEX}15` : GLASS,
                  color: active ? GOLD : MUTED,
                  fontSize: 13, fontFamily: FONT_BODY,
                  transition: 'all 0.15s',
                  fontWeight: active ? 500 : 400,
                }}
              >
                {ind}
              </button>
            )
          })}
        </div>
      </div>

      {/* Step 2: City */}
      <div style={{ marginBottom: 18 }}>
        <div style={{
          fontFamily: FONT_HEADING, fontWeight: 700, fontSize: 11, color: GOLD,
          textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12,
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <span style={{ width: 18, height: 18, borderRadius: 6, background: `${GOLD_HEX}18`, border: `1px solid ${GOLD_HEX}30`, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: GOLD }}>2</span>
          City
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {CITIES.map((city) => {
            const active = selectedCity === city
            return (
              <button
                key={city}
                onClick={() => selectCity(city)}
                style={{
                  padding: '6px 15px', borderRadius: 20,
                  border: `1px solid ${active ? GOLD_HEX + '60' : BORDER2}`,
                  background: active ? `${GOLD_HEX}15` : GLASS,
                  color: active ? GOLD : TEXT,
                  fontSize: 13, fontFamily: FONT_HEADING,
                  fontWeight: active ? 600 : 400,
                  transition: 'all 0.15s',
                }}
              >
                {city}
              </button>
            )
          })}
        </div>
      </div>

      {/* Step 3: Area */}
      {selectedCity && (
        <div style={{ marginBottom: 28, animation: 'fadeSlideUp 0.25s ease' }}>
          <div style={{
            fontFamily: FONT_HEADING, fontWeight: 700, fontSize: 11, color: GOLD,
            textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12,
            display: 'flex', alignItems: 'center', gap: 8,
          }}>
            <span style={{ width: 18, height: 18, borderRadius: 6, background: `${GOLD_HEX}18`, border: `1px solid ${GOLD_HEX}30`, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: GOLD }}>3</span>
            Area
            <span style={{ fontFamily: FONT_BODY, fontSize: 11, color: MUTED, textTransform: 'none', letterSpacing: 0, fontWeight: 400 }}>(optional)</span>
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
                    border: `1px solid ${active ? GOLD_HEX + '60' : BORDER}`,
                    background: active ? `${GOLD_HEX}15` : 'transparent',
                    color: active ? GOLD : MUTED,
                    fontSize: 12, fontFamily: FONT_BODY,
                    transition: 'all 0.15s',
                    fontWeight: active ? 500 : 400,
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
          width: '100%', padding: '16px',
          background: canSubmit && !loading
            ? `linear-gradient(135deg, ${GOLD_HEX} 0%, #C49050 100%)`
            : SURFACE3,
          color: canSubmit && !loading ? '#07070F' : MUTED,
          borderRadius: 14, border: canSubmit && !loading ? 'none' : `1px solid ${BORDER}`,
          fontFamily: FONT_HEADING, fontWeight: 700, fontSize: 15,
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          transition: 'all 0.2s',
          boxShadow: canSubmit && !loading ? `0 4px 24px ${GOLD_HEX}28` : 'none',
          cursor: canSubmit && !loading ? 'pointer' : 'not-allowed',
          marginTop: selectedCity ? 0 : 8, letterSpacing: '-0.01em',
        }}
      >
        {loading ? <><ThinkingDots /> Finding prospects…</> : 'Find Prospects + Get Phone Numbers'}
      </button>

      {selectedIndustries.length === 0 && (
        <div style={{ textAlign: 'center', fontSize: 12, color: MUTED, marginTop: 12, fontFamily: FONT_BODY, opacity: 0.7 }}>
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
          fontSize: 11, fontFamily: FONT_HEADING, fontWeight: 600,
          color: loading ? MUTED : GOLD,
          padding: '5px 11px',
          border: `1px solid ${loading ? BORDER : GOLD_HEX + '50'}`,
          borderRadius: 8,
          background: loading ? 'transparent' : `${GOLD_HEX}0D`,
          opacity: loading ? 0.5 : 1,
          whiteSpace: 'nowrap',
          transition: 'all 0.15s',
          letterSpacing: '0.01em',
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
        padding: '14px 32px',
        background: loading
          ? SURFACE3
          : `linear-gradient(135deg, ${GOLD_HEX} 0%, #C49050 100%)`,
        color: loading ? MUTED : '#07070F',
        border: loading ? `1px solid ${BORDER}` : 'none',
        borderRadius: 14,
        fontFamily: FONT_HEADING, fontWeight: 700, fontSize: 15,
        transition: 'all 0.2s',
        marginTop: 24,
        cursor: loading ? 'not-allowed' : 'pointer',
        boxShadow: loading ? 'none' : `0 4px 24px ${GOLD_HEX}28, 0 1px 0 rgba(255,255,255,0.12) inset`,
        letterSpacing: '-0.01em',
      }}
    >
      {loading ? <><ThinkingDots /> Generating…</> : <>▶ {label}</>}
    </button>
  )
}

// ─── GoalRing ─────────────────────────────────────────────────────────────────

function GoalRing({ earned, mini = false }: { earned: number; mini?: boolean }) {
  const pct    = Math.min((earned / MONTHLY_GOAL_GHS) * 100, 100)
  const r      = mini ? 13 : 36
  const sz     = mini ? 40 : 90
  const cx     = sz / 2
  const sw     = mini ? 3 : 4.5
  const circ   = 2 * Math.PI * r
  const dash   = (pct / 100) * circ
  const pctStr = `${Math.round(pct)}%`

  const arc = (
    <svg width={sz} height={sz} viewBox={`0 0 ${sz} ${sz}`}>
      <defs>
        <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={GOLD_HEX} />
          <stop offset="100%" stopColor="#C49050" />
        </linearGradient>
        <filter id="glow">
          <feGaussianBlur stdDeviation="1.5" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>
      <circle cx={cx} cy={cx} r={r} fill="none" stroke={BORDER2} strokeWidth={sw} />
      <circle
        cx={cx} cy={cx} r={r} fill="none"
        stroke="url(#goldGrad)" strokeWidth={sw} strokeLinecap="round"
        strokeDasharray={`${dash} ${circ}`}
        transform={`rotate(-90 ${cx} ${cx})`}
        style={{ transition: 'stroke-dasharray 0.7s cubic-bezier(0.4,0,0.2,1)', filter: pct > 0 ? 'url(#glow)' : undefined }}
      />
      {!mini && (
        <text x={cx} y={cx + 4} textAnchor="middle" fill={GOLD_HEX} fontSize="13" fontFamily={FONT_HEADING} fontWeight="700">
          {pctStr}
        </text>
      )}
    </svg>
  )

  if (mini) {
    return (
      <div style={{ position: 'relative', width: 40, height: 40, flexShrink: 0 }}>
        {arc}
        <div style={{
          position: 'absolute', inset: 0, display: 'flex',
          alignItems: 'center', justifyContent: 'center',
          fontFamily: FONT_HEADING, fontSize: 9, fontWeight: 700, color: GOLD,
        }}>
          {pctStr}
        </div>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, padding: '22px 0' }}>
      {arc}
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontFamily: FONT_HEADING, fontSize: 10, color: MUTED, letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 600 }}>Monthly Goal</div>
        <div style={{ fontFamily: FONT_HEADING, fontSize: 12, color: TEXT, fontWeight: 600, marginTop: 4 }}>
          GHS {earned.toLocaleString()} <span style={{ color: MUTED, fontWeight: 400 }}>/ 120,000</span>
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
    <div style={{
      background: SURFACE,
      borderBottom: `1px solid ${BORDER}`,
      paddingTop: 'env(safe-area-inset-top)',
      flexShrink: 0,
    }}>
      <div style={{ height: 54, padding: '0 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{
            fontFamily: FONT_HEADING, fontWeight: 700, fontSize: 10,
            color: GOLD, letterSpacing: '0.12em', textTransform: 'uppercase',
          }}>
            Tagett
          </div>
          <div style={{
            fontFamily: FONT_HEADING, fontWeight: 600, fontSize: 14,
            color: TEXT, marginTop: 1, letterSpacing: '-0.01em',
          }}>
            {agent.label}
          </div>
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
    <div style={{
      background: SURFACE,
      borderTop: `1px solid ${BORDER}`,
      display: 'flex',
      paddingBottom: 'env(safe-area-inset-bottom)',
      flexShrink: 0,
    }}>
      {AGENT_IDS.map((id) => {
        const agent = AGENTS[id]
        const isActive = id === activeAgent
        const turnCount = Math.floor((allChats[id]?.length ?? 0) / 2)
        return (
          <button key={id} onClick={() => onSelect(id)} style={{
            flex: 1, minHeight: 58, display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', gap: 3,
            background: 'none', paddingTop: 12, paddingBottom: 10,
            position: 'relative',
            transition: 'all 0.15s',
          }}>
            {isActive && (
              <div style={{
                position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)',
                width: 24, height: 2, borderRadius: 1,
                background: `linear-gradient(90deg, ${GOLD_HEX}80, ${GOLD_HEX}, ${GOLD_HEX}80)`,
                boxShadow: `0 0 8px ${GOLD_HEX}60`,
              }} />
            )}
            <span style={{
              fontSize: 18, lineHeight: 1,
              color: isActive ? GOLD : MUTED,
              transition: 'color 0.15s',
            }}>
              {agent.icon}
            </span>
            <span style={{
              fontFamily: FONT_HEADING, fontSize: 10,
              fontWeight: isActive ? 700 : 400,
              color: isActive ? GOLD : MUTED,
              marginTop: 1, letterSpacing: '0.03em',
              transition: 'color 0.15s',
            }}>
              {agent.short}
            </span>
            {turnCount > 0 && (
              <span style={{
                fontFamily: FONT_BODY, fontSize: 9, color: isActive ? GOLD : MUTED,
                background: isActive ? `${GOLD_HEX}18` : SURFACE2,
                border: `1px solid ${isActive ? GOLD_HEX + '30' : BORDER}`,
                padding: '0px 5px', borderRadius: 8, minWidth: 16, textAlign: 'center',
              }}>
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
  const [focused, setFocused] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const handleSend = useCallback(() => {
    const text = input.trim()
    if (!text || loading) return
    setInput('')
    if (textareaRef.current) textareaRef.current.style.height = 'auto'
    onSend(text)
  }, [input, loading, onSend])

  const hasInput = !!input.trim()

  return (
    <div style={{ padding: '10px 12px 14px', borderTop: `1px solid ${BORDER}`, flexShrink: 0 }}>
      <div style={{
        display: 'flex', gap: 8, alignItems: 'flex-end',
        background: SURFACE2,
        border: `1px solid ${focused ? GOLD_HEX + '60' : BORDER2}`,
        borderRadius: 14,
        padding: '8px 8px 8px 14px',
        transition: 'border-color 0.2s',
        boxShadow: focused ? `0 0 0 3px ${GOLD_HEX}10` : 'none',
      }}>
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder={`Message ${agentShort}…`}
          rows={1}
          style={{
            flex: 1, background: 'none', border: 'none', outline: 'none',
            color: TEXT, fontSize: 15, resize: 'none', lineHeight: 1.55,
            maxHeight: 120, overflowY: 'auto', fontFamily: FONT_BODY,
          }}
          onInput={(e) => {
            const t = e.currentTarget
            t.style.height = 'auto'
            t.style.height = Math.min(t.scrollHeight, 120) + 'px'
          }}
        />
        <button
          onClick={handleSend}
          disabled={!hasInput || loading}
          style={{
            width: 36, height: 36, borderRadius: 10, flexShrink: 0,
            background: hasInput && !loading
              ? `linear-gradient(135deg, ${GOLD_HEX} 0%, #C49050 100%)`
              : SURFACE3,
            color: hasInput && !loading ? '#07070F' : MUTED,
            border: hasInput && !loading ? 'none' : `1px solid ${BORDER}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 16, transition: 'all 0.18s',
            boxShadow: hasInput && !loading ? `0 2px 10px ${GOLD_HEX}30` : 'none',
          }}
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
          <div style={{
            flex: 1, display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            padding: '0 28px', textAlign: 'center',
            animation: 'fadeIn 0.4s ease',
          }}>
            <div style={{
              width: 52, height: 52, borderRadius: 16, marginBottom: 20,
              background: `linear-gradient(135deg, ${GOLD_HEX}20 0%, ${GOLD_HEX}08 100%)`,
              border: `1px solid ${GOLD_HEX}25`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 22, color: GOLD,
              boxShadow: `0 4px 20px ${GOLD_HEX}10`,
            }}>
              {agent.icon}
            </div>
            <div style={{ fontFamily: FONT_HEADING, fontWeight: 700, fontSize: 16, color: TEXT, marginBottom: 6, letterSpacing: '-0.02em' }}>
              {agent.label}
            </div>
            <div style={{ fontSize: 13, color: MUTED, marginBottom: 4, lineHeight: 1.6, fontFamily: FONT_BODY }}>
              {agent.description}
            </div>
            <div style={{ fontSize: 12, color: MUTED, opacity: 0.5, marginBottom: 4, fontFamily: FONT_BODY }}>
              Run autonomously or type a message below.
            </div>
            <BriefingButton label={agent.briefingLabel} onClick={onRunBriefing} loading={loading} size="large" />
          </div>
        )
      ) : (
        <div style={{ padding: '20px 14px 10px' }}>
          {messages.map((m, i) => (
            <ChatMessage
              key={i}
              message={m}
              agentId={agent.id}
              agentIcon={agent.icon}
              isLast={i === lastAssistantIdx && !loading}
              onHandoff={onHandoff}
            />
          ))}
          {loading && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14, animation: 'fadeIn 0.2s ease' }}>
              <div style={{
                width: 30, height: 30, borderRadius: 10, flexShrink: 0,
                background: `linear-gradient(135deg, ${GOLD_HEX}30 0%, ${GOLD_HEX}12 100%)`,
                border: `1px solid ${GOLD_HEX}35`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 13, color: GOLD,
              }}>
                {agent.icon}
              </div>
              <div style={{
                padding: '10px 14px', background: SURFACE3,
                border: `1px solid ${BORDER2}`,
                borderRadius: '12px 12px 12px 4px',
              }}>
                <ThinkingDots />
              </div>
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
    <div style={{
      padding: '10px 16px',
      background: 'rgba(248, 113, 113, 0.08)',
      borderBottom: `1px solid rgba(248, 113, 113, 0.2)`,
      color: '#f87171', fontSize: 13, fontFamily: FONT_BODY,
      flexShrink: 0, display: 'flex', alignItems: 'center',
      justifyContent: 'space-between', gap: 12,
    }}>
      <span><strong>Error:</strong> {error}</span>
      <button onClick={onDismiss} style={{ color: '#f87171', fontSize: 12, opacity: 0.7, fontFamily: FONT_BODY, textDecoration: 'underline', flexShrink: 0 }}>
        Dismiss
      </button>
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
    <div style={{
      padding: '10px 16px 9px',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
      borderBottom: `1px solid ${BORDER}`,
      flexShrink: 0,
    }}>
      <span style={{ fontSize: 12, color: MUTED, fontFamily: FONT_BODY, flex: 1, lineHeight: 1.5 }}>
        {agent.description}
      </span>
      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
        {agent.id !== 'prospect' && (
          <BriefingButton label={agent.briefingLabel} onClick={handleRunBriefing} loading={loading} size="small" />
        )}
        {messages.length > 0 && (
          <button
            onClick={handleClear}
            style={{
              fontSize: 11, color: MUTED, padding: '5px 11px',
              border: `1px solid ${BORDER2}`, borderRadius: 8,
              fontFamily: FONT_BODY, minHeight: 30, background: GLASS,
              transition: 'all 0.15s',
            }}
          >
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
        <MobileHeader
          agent={agent}
          earnedGHS={earnedGHS}
          theme={theme}
          onToggleTheme={toggleTheme}
          notifToggle={<NotifToggle status={notifStatus} onSubscribe={subscribe} onUnsubscribe={unsubscribe} onTest={sendTest} />}
        />
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
      {/* Sidebar */}
      <div style={{
        width: 252, flexShrink: 0,
        background: SURFACE,
        borderRight: `1px solid ${BORDER}`,
        display: 'flex', flexDirection: 'column',
      }}>
        {/* Brand */}
        <div style={{
          padding: '22px 20px 18px',
          borderBottom: `1px solid ${BORDER}`,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 32, height: 32, borderRadius: 10,
              background: `linear-gradient(135deg, ${GOLD_HEX}25 0%, ${GOLD_HEX}08 100%)`,
              border: `1px solid ${GOLD_HEX}30`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 15,
              flexShrink: 0,
              overflow: 'hidden',
            }}>
              <img src="/icon-192.png" alt="" width={32} height={32} style={{ display: 'block' }} />
            </div>
            <div>
              <div style={{ fontFamily: FONT_HEADING, fontWeight: 700, fontSize: 14, color: TEXT, letterSpacing: '-0.01em' }}>Tagett</div>
              <div style={{ fontSize: 10, color: MUTED, marginTop: 1, fontFamily: FONT_BODY, letterSpacing: '0.02em' }}>Ecstasy Technologies</div>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav style={{ padding: '10px 10px', flex: 1, overflowY: 'auto' }}>
          <div style={{ fontSize: 10, fontFamily: FONT_HEADING, color: MUTED, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', padding: '6px 10px 8px' }}>
            Agents
          </div>
          {AGENT_IDS.map((id) => {
            const a = AGENTS[id]
            const isActive = id === activeAgent
            const msgCount = (allChats[id] ?? []).length
            return (
              <button
                key={id}
                onClick={() => handleSelectAgent(id)}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                  textAlign: 'left', padding: '9px 10px',
                  borderRadius: 10, marginBottom: 2,
                  background: isActive ? `${GOLD_HEX}12` : 'transparent',
                  border: `1px solid ${isActive ? GOLD_HEX + '25' : 'transparent'}`,
                  transition: 'all 0.15s',
                  position: 'relative',
                }}
                onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.background = GLASS }}
                onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.background = 'transparent' }}
              >
                <div style={{
                  width: 30, height: 30, borderRadius: 9, flexShrink: 0,
                  background: isActive ? `${GOLD_HEX}20` : SURFACE2,
                  border: `1px solid ${isActive ? GOLD_HEX + '35' : BORDER2}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 13, color: isActive ? GOLD : MUTED,
                  transition: 'all 0.15s',
                }}>
                  {a.icon}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontFamily: FONT_HEADING, fontSize: 13,
                    fontWeight: isActive ? 600 : 400,
                    color: isActive ? TEXT : PROSE,
                    letterSpacing: '-0.01em',
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                  }}>
                    {a.label}
                  </div>
                  <div style={{ fontSize: 11, color: MUTED, marginTop: 1, fontFamily: FONT_BODY, lineHeight: 1.4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {a.description}
                  </div>
                </div>
                {msgCount > 0 && (
                  <span style={{
                    fontSize: 10, fontFamily: FONT_BODY,
                    color: isActive ? GOLD : MUTED,
                    background: isActive ? `${GOLD_HEX}18` : SURFACE3,
                    border: `1px solid ${isActive ? GOLD_HEX + '25' : BORDER}`,
                    padding: '1px 6px', borderRadius: 8, flexShrink: 0,
                  }}>
                    {Math.floor(msgCount / 2)}
                  </span>
                )}
              </button>
            )
          })}
        </nav>

        {/* Sidebar footer */}
        <div style={{ borderTop: `1px solid ${BORDER}` }}>
          <div style={{ padding: '12px 16px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <NotifToggle status={notifStatus} onSubscribe={subscribe} onUnsubscribe={unsubscribe} onTest={sendTest} />
            <ThemeToggle theme={theme} onToggle={toggleTheme} />
          </div>
          <GoalRing earned={earnedGHS} />
        </div>
      </div>

      {/* Main content */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Header */}
        <div style={{
          padding: '16px 22px',
          borderBottom: `1px solid ${BORDER}`,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          flexShrink: 0,
          background: SURFACE,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 11,
              background: `linear-gradient(135deg, ${GOLD_HEX}22 0%, ${GOLD_HEX}0A 100%)`,
              border: `1px solid ${GOLD_HEX}28`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 16, color: GOLD,
            }}>
              {agent.icon}
            </div>
            <div>
              <div style={{ fontFamily: FONT_HEADING, fontWeight: 600, fontSize: 15, color: TEXT, letterSpacing: '-0.02em' }}>
                {agent.label}
              </div>
              <div style={{ fontSize: 12, color: MUTED, marginTop: 2, fontFamily: FONT_BODY }}>
                {agent.description}
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {agent.id !== 'prospect' && (
              <BriefingButton label={agent.briefingLabel} onClick={handleRunBriefing} loading={loading} size="small" />
            )}
            {messages.length > 0 && (
              <button
                onClick={handleClear}
                style={{
                  fontSize: 12, color: MUTED, padding: '5px 12px',
                  border: `1px solid ${BORDER2}`, borderRadius: 8,
                  fontFamily: FONT_BODY, transition: 'all 0.15s',
                  background: GLASS,
                }}
                onMouseEnter={(e) => { e.currentTarget.style.color = TEXT; e.currentTarget.style.borderColor = MUTED }}
                onMouseLeave={(e) => { e.currentTarget.style.color = MUTED; e.currentTarget.style.borderColor = BORDER2 }}
              >
                Clear
              </button>
            )}
          </div>
        </div>
        {error && <ErrorBanner error={error} onDismiss={() => setError(null)} />}
        <MessageList
          messages={messages} loading={loading} agent={agent}
          onSend={handleSend} onRunBriefing={handleRunBriefing} onHandoff={handleHandoff}
        />
        <ChatInput agentShort={agent.short} onSend={handleSend} loading={loading} />
      </div>
    </div>
  )
}
