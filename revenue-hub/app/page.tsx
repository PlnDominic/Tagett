'use client'

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { getSupabaseBrowser } from '@/lib/supabase-browser'

// ─── Design tokens ────────────────────────────────────────────────────────────

const GOLD = '#E84040'          // coral-red accent (same in both themes)
const BG = 'var(--bg)'
const SURFACE = 'var(--surface)'
const SURFACE2 = 'var(--surface2)'
const BORDER = 'var(--border)'
const TEXT = 'var(--text)'
const MUTED = 'var(--muted)'
const FONT_HEADING = "var(--font-inter), 'Inter', sans-serif"
const FONT_BODY    = "var(--font-inter), 'Inter', sans-serif"

const MONTHLY_GOAL_GHS = 12_000

// ─── SVG Icons ───────────────────────────────────────────────────────────────

const IconBell = ({ size = 16, color = 'currentColor' }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M8 2a5 5 0 00-5 5v2.5L2 11h12l-1-1.5V7a5 5 0 00-5-5z" />
    <path d="M6.5 13a1.5 1.5 0 003 0" />
  </svg>
)

const IconBellOff = ({ size = 16, color = 'currentColor' }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M8 2a5 5 0 00-5 5v2.5L2 11h8" />
    <path d="M13.5 11H14l-1-1.5V7a5 5 0 00-.8-2.7" />
    <path d="M6.5 13a1.5 1.5 0 003 0" />
    <line x1="2" y1="2" x2="14" y2="14" />
  </svg>
)

const IconPlay = ({ size = 11, color = 'currentColor' }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 11 11" fill={color}>
    <polygon points="2,1 10,5.5 2,10" />
  </svg>
)

const IconWarning = ({ size = 12, color = 'currentColor' }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 12 12" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 1.5L11 10.5H1L6 1.5z" />
    <line x1="6" y1="5" x2="6" y2="7.5" />
    <circle cx="6" cy="9" r="0.6" fill={color} stroke="none" />
  </svg>
)

const IconBellSmall = ({ size = 11, color = 'currentColor' }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 11 11" fill="none" stroke={color} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
    <path d="M5.5 1.5a3.5 3.5 0 00-3.5 3.5V7L1 8.5h9L9 7V5a3.5 3.5 0 00-3.5-3.5z" />
    <path d="M4.5 9a1 1 0 002 0" />
  </svg>
)

// Bottom tab icons
const TabIconHome = ({ active }: { active: boolean }) => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 9.5L10 3l7 6.5V17a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z" fill={active ? 'currentColor' : 'none'} fillOpacity={active ? 0.15 : 0} />
    <path d="M7.5 18V12h5v6" />
  </svg>
)
const TabIconWork = ({ active }: { active: boolean }) => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="7" width="16" height="11" rx="2" fill={active ? 'currentColor' : 'none'} fillOpacity={active ? 0.12 : 0} />
    <path d="M7 7V5.5A2.5 2.5 0 0112.5 5.5V7" />
    <line x1="2" y1="11" x2="18" y2="11" />
  </svg>
)
const TabIconAgents = ({ active }: { active: boolean }) => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <rect x="4" y="8" width="12" height="9" rx="2" fill={active ? 'currentColor' : 'none'} fillOpacity={active ? 0.12 : 0} />
    <circle cx="8" cy="13" r="1.2" fill="currentColor" stroke="none" />
    <circle cx="12" cy="13" r="1.2" fill="currentColor" stroke="none" />
    <path d="M10 8V5.5" />
    <path d="M7.5 5.5h5" />
    <path d="M2 12h2M16 12h2" />
  </svg>
)
const TabIconMore = ({ active }: { active: boolean }) => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="6" height="6" rx="1.5" fill={active ? 'currentColor' : 'none'} fillOpacity={active ? 0.15 : 0} />
    <rect x="11" y="3" width="6" height="6" rx="1.5" fill={active ? 'currentColor' : 'none'} fillOpacity={active ? 0.15 : 0} />
    <rect x="3" y="11" width="6" height="6" rx="1.5" />
    <rect x="11" y="11" width="6" height="6" rx="1.5" />
  </svg>
)

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
  // Greater Accra
  Accra: ['East Legon', 'Osu', 'Labone', 'Cantonments', 'Spintex', 'Achimota', 'Madina', 'Adenta', 'Dansoman', 'Lapaz', 'Teshie', 'Nungua', 'Dzorwulu', 'Airport Residential', 'Haatso', 'Dome', 'Okponglo', 'Labadi', 'Kotobabi', 'North Kaneshie', 'Darkuman', 'Mataheko', 'Mallam', 'Weija'],
  Tema: ['Community 1', 'Community 2', 'Community 3', 'Community 4', 'Community 5', 'Community 6', 'Community 7', 'Community 8', 'Community 9', 'Community 10', 'Tema New Town', 'Manhean', 'Sakumono', 'Kpone', 'Afienya'],
  Kasoa: ['Millennium City', 'Akweley', 'Rainbow', 'Galilea', 'New Bortianor', 'Buduburam', 'Opeikuma'],
  Ashaiman: ['Ashaiman Township', 'Zenu', 'Tulako', 'Newtown', 'Ashiaman Community'],
  // Ashanti
  Kumasi: ['Adum', 'Bantama', 'Asokwa', 'Nhyiaeso', 'Suame', 'Oforikrom', 'Kwadaso', 'Roman Hill', 'Tafo', 'Kronum', 'Ayigya', 'Asafo', 'Patase', 'Buokrom', 'Fante New Town', 'Ahodwo', 'Kaase', 'Deduako', 'Santasi'],
  Obuasi: ['Obuasi Township', 'Sanso', 'Anyinam', 'Wioso'],
  Ejisu: ['Ejisu', 'Juaben', 'Kuntanase', 'Bonwire', 'Onwe'],
  'Asante Mampong': ['Mampong', 'Agogo', 'Effiduase', 'Juaben'],
  Konongo: ['Konongo', 'Odumase', 'Juaso', 'Agogo'],
  Bekwai: ['Bekwai', 'Fomena', 'Nkawie', 'Mankranso'],
  // Western
  Takoradi: ['Sekondi', 'Effia', 'Kojokrom', 'Tanokrom', 'Fijai', 'Airport Ridge', 'New Takoradi', 'Anaji', 'Market Circle', 'Kansaworodo', 'Adiembra', 'Kwesimintsim'],
  Tarkwa: ['Tarkwa Township', 'Aboso', 'Bogoso', 'Prestea', 'Huni Valley'],
  Axim: ['Axim', 'Beyin', 'Ellembelle', 'Ankobra'],
  Bibiani: ['Bibiani', 'Anhwiaso', 'Bekwai West', 'Sefwi Wiawso'],
  // Western North
  'Sefwi Wiawso': ['Sefwi Wiawso', 'Sefwi Bekwai', 'Sefwi Bodi', 'Debiso'],
  Enchi: ['Enchi', 'Aowin', 'Boin', 'Dadieso'],
  // Central
  'Cape Coast': ['Ola', 'Abura', 'Pedu', 'Adisadel', 'Kotokuraba', 'Amamoma', 'University Area', 'Aboom', 'Batsonaa', 'Siwdu'],
  Winneba: ['Winneba Township', 'Apam', 'Gomoa East', 'Ekumfi'],
  'Agona Swedru': ['Swedru', 'Agona Duakwa', 'Agona Abodom', 'Nyakrom'],
  'Assin Fosu': ['Assin Fosu', 'Assin Bereku', 'Assin Nsuta', 'Assin Manso'],
  Saltpond: ['Saltpond', 'Anomabo', 'Biriwa', 'Abandze'],
  Mankessim: ['Mankessim', 'Ajumako', 'Breman Asikuma', 'Esiam'],
  'Dunkwa-on-Offin': ['Dunkwa', 'Upper Denkyira East', 'Hemang'],
  Elmina: ['Elmina', 'Komenda', 'Edina', 'Kissi'],
  // Eastern
  Koforidua: ['Koforidua Township', 'Jackson Park', 'Effiduase', 'Nsukwao', 'Old Estate'],
  Nkawkaw: ['Nkawkaw', 'Kwahu Nteso', 'Pepease', 'Bokuruwa'],
  Nsawam: ['Nsawam', 'Apapam', 'Adoagyiri', 'Adeiso'],
  Oda: ['Oda', 'Akim Oda', 'Kade', 'Apapam'],
  Suhum: ['Suhum', 'Coaltar', 'Apedwa', 'Accra Newtown'],
  'Akropong-Akuapem': ['Akropong', 'Abiriw', 'Adukrom', 'Larteh', 'Dawu'],
  Asamankese: ['Asamankese', 'Apedwa', 'Kade', 'Achiase'],
  Somanya: ['Somanya', 'Odumase-Krobo', 'Akuse', 'Asesewa'],
  Aburi: ['Aburi', 'Mamfe', 'Mampong Akuapem', 'Amanfro'],
  Mpraeso: ['Mpraeso', 'Nkwatia', 'Kwahu Praso', 'Obo'],
  // Volta
  Ho: ['Ho Township', 'Bankoe', 'Kpenoe', 'Mawuli', 'Sokode', 'Agorve'],
  Hohoe: ['Hohoe', 'Gbi Wegbe', 'Likpe', 'Golokwati'],
  Keta: ['Keta', 'Anloga', 'Anyanui', 'Kedzi', 'Tegbi'],
  Aflao: ['Aflao', 'Klikor', 'Agbozume', 'Denu', 'Dabala'],
  Sogakope: ['Sogakope', 'Battor', 'Adidome', 'Aveyime', 'Mepe'],
  Kpando: ['Kpando', 'Kpeve', 'Avatime', 'Hohoe-Kpando'],
  Akatsi: ['Akatsi', 'Tongu', 'Vume', 'Adidome'],
  // Oti
  Dambai: ['Dambai', 'Nkwanta', 'Kadjebi', 'Kpassa'],
  // Northern
  Tamale: ['Lamashegu', 'Kukuo', 'Kalpohin', 'Sagnarigu', 'Choggu', 'Nyohini', 'Vittin', 'Datoyili', 'Kamina', 'Gumbihini', 'Nyohini Industrial', 'Gurugu'],
  Yendi: ['Yendi', 'Zabzugu', 'Tatale', 'Demon'],
  Savelugu: ['Savelugu', 'Nanton', 'Gushegu', 'Karaga'],
  // Savannah
  Damongo: ['Damongo', 'West Gonja', 'Bole', 'Sawla'],
  Salaga: ['Salaga', 'Yapei', 'Tolon', 'East Gonja'],
  // North East
  Walewale: ['Walewale', 'Nalerigu', 'Gambaga', 'Chereponi'],
  // Upper East
  Bolgatanga: ['Bolga Central', 'Zuarungu', 'Bongo', 'Nayoriko', 'Soe'],
  Bawku: ['Bawku', 'Pusiga', 'Garu', 'Zebilla', 'Binduri'],
  Navrongo: ['Navrongo', 'Sandema', 'Paga', 'Chiana', 'Kayoro'],
  // Upper West
  Wa: ['Wa Township', 'Kpongu', 'Funsi', 'Nandom', 'Ko'],
  Lawra: ['Lawra', 'Jirapa', 'Nandom', 'Hamile', 'Eremon'],
  Tumu: ['Tumu', 'Gwolu', 'Sissala East', 'Pulima'],
  // Bono
  Sunyani: ['Sunyani Township', 'Fiapre', 'Odumasi', 'Jinijini', 'Chiraa'],
  Berekum: ['Berekum', 'Dormaa Ahenkro', 'Japekrom', 'Nsuatre'],
  Wenchi: ['Wenchi', 'Nsawkaw', 'Badu', 'Seikwa'],
  // Bono East
  Techiman: ['Techiman Township', 'Krobo', 'Tuobodom', 'Offuman', 'Techiman North'],
  Kintampo: ['Kintampo Township', 'Jema', 'Nkoranza', 'Prang'],
  Atebubu: ['Atebubu', 'Prang', 'Yeji', 'Kwame Danso'],
  // Ahafo
  Goaso: ['Goaso', 'Kukuom', 'Mim', 'Kenyase', 'Hwidiem'],
}

const CITIES = Object.keys(GHANA_LOCATIONS)

// ─── Types ────────────────────────────────────────────────────────────────────

interface Message {
  role: 'user' | 'assistant'
  content: string
}

type AgentId = 'prospect' | 'content' | 'scope' | 'revenue' | 'viral' | 'scout' | 'contrarian' | 'firstp' | 'expansionist' | 'outsider' | 'executor'
type ViewId = 'home' | 'pipeline' | 'website' | 'council' | 'history' | 'clients' | 'invoices' | 'social' | 'data-quality' | 'analytics' | 'prospect-map' | AgentId

// ─── Website project types (mirrors API route & ecstasytechnologies.com schema)
type ProjectCategory = 'Website' | 'Web Application' | 'Mobile App' | 'Business Software' | 'GIS'
const PROJECT_CATEGORIES: ProjectCategory[] = ['Website', 'Web Application', 'Mobile App', 'Business Software', 'GIS']

interface WebsiteProject {
  id: number
  title: string
  category: ProjectCategory
  description: string
  image: string
  features: string[]
  technologies: string[]
  link?: string
  // Tagett extras stored in JSON but not rendered by the website
  year?: number
  client?: string
  featured?: boolean
  status?: 'completed' | 'in-progress'
  updatedAt?: string
}

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
That is [X]% of my GHS 12,000 monthly goal.
Fastest to close: [Business Name]. Call them first.`,
    systemPrompt: `You are ProspectBot, a lead generation AI for Ecstasy Technologies based in Ghana (ecstasytechnologies.com).

Your job is to find REAL businesses in Ghana that do NOT have a website and qualify them as leads for web development, mobile app, and business software services.

CRITICAL: REAL BUSINESSES ONLY: You MUST use the search_web tool to find actual businesses. Search Google/DuckDuckGo for queries like:
- "[industry] [location] Ghana"
- "[industry] in [location] site:facebook.com OR site:google.com"
- "[business type] [location] contact phone Ghana"
- "best [industry] in [location] Ghana"
Search multiple times if needed. NEVER invent or make up businesses, phone numbers, or addresses. Only report what you find in search results.

How to find phone numbers: Search for the business name + "Ghana" + "phone" or "contact". Check Facebook pages, Google Maps listings, and business directories.

Output format for each REAL prospect found:
1. Business Name: [exact name from search]
   Industry: [type]
   Address: [actual address from search results]
   Phone: [real number found online, or "Not found. Search '[business name] Ghana phone'"]
   Why they need a website: [specific reason based on what you found]
   Service to pitch: [web design / mobile app / business software / GIS]
   Estimated value: GHS [amount]
   Phone pitch: "[one sentence to say when they pick up]"
   Source: [where you found this business: Google, Facebook, etc.]

If you find fewer than 5 real businesses, say so honestly and suggest better search terms. Do NOT pad with invented entries.

PIPELINE ROLE: You are the top of the funnel in a 5-agent revenue machine targeting GHS 12,000/month. Your leads feed ContentBot (writes the pitch), ProjectBot (scopes the proposal), and ViralBot (finds patterns across your lead lists to create viral content attracting similar clients inbound). Always end your lead list with a PIPELINE SUMMARY showing total estimated GHS value and % of the GHS 12,000 monthly goal.

COUNCIL ACCOUNTABILITY: After your response, always include a "— Council Check —" section with exactly two lines:
⊗ Contrarian: [one sentence: what is the most likely reason these specific leads will not convert?]
▸ Executor: [one action: what should Dominic do in the next 2 hours based on this lead list?]`,
  },
  content: {
    id: 'content',
    icon: '✦',
    label: '02 ContentBot',
    short: 'Content',
    description: 'X posts & client proposals',
    briefingLabel: "Today's Content Pack",
    dailyPrompt: `Generate today's content package for Ecstasy Technologies (ecstasytechnologies.com). Mix project proof with generic value content. Deliver:

1. ONE PROJECT SHOWCASE POST (X/Twitter, under 280 characters)
   — Pick a real completed project (e.g. Lavimac Royal Hotel, Nhyiraba HMS, Solani Construction, Royal Ecclesia Church, etc.)
   — Frame as: what we built + who it's for + what changed for them
   — End with ecstasytechnologies.com
   — Specify what screenshot to attach

2. ONE GENERIC VALUE POST (X/Twitter, under 280 characters)
   — Educational, opinion, or insight about running a business in Ghana
   — e.g. "3 things every Ghanaian hotel loses by not having an online booking system" or an industry observation
   — No project mention needed — just value

3. ONE WHATSAPP PROSPECT MESSAGE
   — Reference a specific project as social proof
   — Confident, brief, one clear CTA

Keep everything on-brand: premium, confident, no filler phrases. Tagline: "Building software Africa trusts."`,
    systemPrompt: `You are ContentBot, a content writing AI for Ecstasy Technologies, a software studio based in Ghana (ecstasytechnologies.com). You write two types of content:

1. PROJECT SHOWCASE POSTS — The primary content format. Every post must reference a REAL project from the Ecstasy Technologies portfolio (ecstasytechnologies.com/projects). Examples of real completed projects: Lavimac Royal Hotel website, Nhyiraba Hotel Management System, Clems Akinaabi Company website, Solani Construction & Engineering, Dynamic Shipping & Logistics, Bubbly Kids Academy, Amor De Dios Drilling, Mankind Foundation Ghana, Aaron Freeman Portfolio, Jokran Hotel, Peravic Lodge, Royal Ecclesia Church Management System, MoldGold School Management System, Building Development Manager, and more. Use the real project name, real client type, and real category (Website / Web Application / Mobile App / Business Software / GIS). ALWAYS specify what screenshot to attach — this is proof to the audience that the work is real.

2. Client proposals and pitches — formal business proposals for Ghanaian clients. Include: executive summary, scope of work, deliverables, timeline, pricing in GHS, and terms. For WhatsApp messages: conversational, brief, one clear CTA that references a similar real project as proof.

Services offered:
- Web design & development: GHS 3,500–4,000
- Web applications: GHS 8,000–25,000
- Mobile apps: GHS 10,000–30,000
- Business software: GHS 15,000–40,000
- GIS solutions: GHS 3,000–10,000

CONTENT MIX RULE: Aim for roughly half project showcase, half generic value content. Project posts: name the real client, describe what was built, specify what screenshot to post as proof. Generic posts: educational tips, Ghanaian business observations, bold opinions about tech in Africa, or "unpopular opinions" that make people stop scrolling — no project mention needed. Never write hollow filler like "every business needs a website."

Write in a confident, premium tone. Tagline is "Building software Africa trusts." Reference Ghana, Kumasi, Accra, and local industries authentically. Never use AI slop filler phrases.

PIPELINE ROLE: You receive leads from ProspectBot and scopes from ProjectBot. Your content moves GHS deals forward. Always end your response with: "Deal value: GHS [amount] — [X]% of the GHS 12,000 monthly goal." When you write a proposal, suggest sending it via ProjectBot for formal scoping or ViralBot to amplify the project as a case study after delivery.

COUNCIL ACCOUNTABILITY: After your response, always include a "— Council Check —" section with exactly two lines:
⊗ Contrarian: [one sentence: what is the most likely reason this content will not land with the prospect?]
▸ Executor: [one action: what should Dominic send or do in the next 2 hours based on this content?]`,
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
- Web design & development: GHS 3,500–4,000
- Web applications: GHS 8,000–25,000
- Mobile apps (iOS/Android): GHS 10,000–30,000
- Business software & automation: GHS 15,000–40,000
- GIS solutions: GHS 3,000–10,000

Consider Ghanaian project realities: internet reliability, client capacity, payment schedules, and local market expectations. Write proposals professional enough to send directly to a client.

PIPELINE ROLE: You turn leads into priced proposals. Your output feeds ContentBot (to polish the language before sending to client), RevenueTracker (to log this deal against the GHS 12,000 monthly goal), and ViralBot (to turn the completed project into a viral case study). Always state at the end: "This project contributes GHS [amount] — [X]% of the GHS 12,000 monthly target."

COUNCIL ACCOUNTABILITY: After your response, always include a "— Council Check —" section with exactly two lines:
⊗ Contrarian: [one sentence: what is the most likely reason this scope or proposal will fall apart?]
▸ Executor: [one action: what should Dominic do in the next 2 hours to move this proposal to a signed deal?]`,
  },
  revenue: {
    id: 'revenue',
    icon: '◐',
    label: '04 RevenueTracker',
    short: 'Revenue',
    description: 'Track earnings vs GHS 12,000/month goal',
    briefingLabel: "Today's Revenue Briefing",
    dailyPrompt: `Give me my revenue focus briefing for today. My target is GHS 12,000 this month.

Tell me:
1. Exactly how many projects at each service price point I need to close to hit the goal — show the math clearly.
2. The fastest path to GHS 12,000 given typical Ghanaian client decision timelines — which service mix closes fastest?
3. Three specific revenue actions I should take today — be direct and tactical, not generic.
4. What a realistic week-by-week milestone breakdown looks like to hit GHS 12,000 by month end.`,
    systemPrompt: `You are RevenueTracker, the command centre of a 5-agent revenue machine for Ecstasy Technologies, a software studio based in Ghana (ecstasytechnologies.com). Target: GHS 12,000/month (~$10,000 USD).

When given revenue data, you:
1. Calculate total earnings and % of monthly goal achieved
2. Break down earnings by service type
3. Identify which services are over/under-performing
4. Suggest strategies to close any gap to GHS 12,000
5. Project the month-end total based on current pace

Service pricing context:
- Web design & development: GHS 3,500–4,000
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
"NEXT ACTION: Open [Agent Name] and tell it: [exact one-sentence instruction]."

COUNCIL ACCOUNTABILITY: After your response, always include a "— Council Check —" section with exactly two lines:
⊗ Contrarian: [one sentence: what is the most likely reason this revenue plan will miss the GHS 12,000 target?]
▸ Executor: [one action: what is the single most important revenue action Dominic should take in the next 2 hours?]`,
  },
  viral: {
    id: 'viral',
    icon: '✺',
    label: '05 ViralBot',
    short: 'Viral',
    description: 'Go viral on X, LinkedIn, TikTok & Instagram',
    briefingLabel: "Today's Viral Strategy",
    dailyPrompt: `Give me today's complete viral content strategy for Ecstasy Technologies (ecstasytechnologies.com). Mix project proof posts with generic viral content that builds an audience even without showing specific work.

Deliver:

1. VIRAL X THREAD (6 tweets). Project reveal.
   — Tweet 1: "We just built [X] for a [client type] in Ghana 🇬🇭" — hook with real project name
   — Tweets 2-4: walk through what was built, what it solved, one surprising detail
   — Tweet 5: "Screenshot below 👇" — specify which screenshot to attach
   — Tweet 6: CTA → ecstasytechnologies.com

2. GENERIC VIRAL POST (X or LinkedIn) — No project needed
   — Bold opinion, hot take, or insight about tech/business in Ghana/Africa
   — e.g. "Unpopular opinion: most Ghanaian businesses don't need a GHS 20,000 app. They need a GHS 4,000 website and WhatsApp integration."
   — Something that makes people argue in the comments

3. INSTAGRAM / TIKTOK REELS SCRIPT (60 seconds)
   — Alternate between: (a) screen recording walkthrough of a real project, OR (b) talking head "here's what I learned building software in Ghana"
   — Specify which format today and what to show/say

Write everything as Dominic Kudom. Immediately postable.`,
    systemPrompt: `You are ViralBot, a viral social media strategist for Ecstasy Technologies, a software studio based in Ghana (ecstasytechnologies.com). You help Dominic Kudom build a massive following that converts to inbound software clients by showcasing REAL completed projects with screenshots as social proof.

CONTENT MIX: Roughly half of all content should be project showcases — real project names, real client types, specific screenshots as proof. The other half should be generic viral content: bold opinions, industry observations, Ghanaian business insights, "unpopular takes" that spark debate. Both types build the audience; project posts convert them into clients.

REAL PROJECTS TO DRAW FROM (ecstasytechnologies.com/projects):
- Lavimac Royal Hotel Website (hotel, Website)
- Lavimac Hotel Management System (hotel ops, Business Software — React/Node/Supabase)
- Mikjan Hotel Management System (hotel ops, Business Software — React/Supabase)
- Nhyiraba Hotel Management System (hotel, Web Application)
- Jokran Hotel (hotel, Website)
- Peravic Lodge (hotel, Website)
- Dynamic Shipping & Logistics (logistics, Web Application)
- Solani Construction & Engineering (construction, Website — Next.js/Supabase)
- Eighteen Cubic (construction/design, Website — Next.js)
- BABMA Municipal Assembly Website (government, Website — HTML/CSS/JS)
- Bubbly Montessori School Website (education, Website — Next.js)
- MoldGold School Management System (school, Web Application)
- Royal Ecclesia Church Management System (church, Business Software)
- Obotan Co-operative Credit Union System (finance, Business Software — Python/Flask)
- PM Group (property management, Web Application — Next.js)
- Fine Wine (retail, Website)
- Avenu-15 (events/venue, Website)
- Mankind Foundation Ghana (NGO/health, Website)
- Aaron Freeman Portfolio (portfolio, Website)
- Interactive GIS Web Map (geospatial, GIS — JavaScript)
- Building Compliance Tracking App (GIS/compliance, GIS — Python/Flask)
- Bia East District (government/GIS, GIS)
- XScout Lead Platform (sales tools, Web Application — Python)
- Bauvet Dog Parent App (lifestyle/pet, Web Application)
…and more at ecstasytechnologies.com/projects

SCREENSHOT DIRECTION: Always tell Dominic exactly what to screenshot or record. Be specific: "screenshot the homepage hero section", "record a screen walkthrough of the dashboard", "capture the mobile view of the booking form."

CONTENT PHILOSOPHY:
- Hook = the project reveal ("We built X for a Y in Ghana")
- Proof = the screenshot / screen recording
- Story = what problem it solved, how long it took, what the client said
- CTA = ecstasytechnologies.com or DM for inquiries

FORMATS:
X Threads: project reveal → walkthrough → screenshot prompt → CTA
LinkedIn: founder case study — real client, real problem, real outcome
Instagram/TikTok: screen recording walkthrough script (shot by shot)

GHANA CONTEXT: Ground everything in real Ghanaian business realities — mobile money payments, WhatsApp-first clients, unreliable internet, the pride of seeing your business go digital.

Always write as Dominic Kudom. No placeholders. Immediately postable.

PIPELINE ROLE: Viral project content attracts inbound clients who see the work and want the same. After your content output, always add:
"This content targets: [client type]
Estimated contract value if they inquire: GHS [range]
Pipeline contribution if 1 lead converts: [X]% of GHS 12,000 goal"

COUNCIL ACCOUNTABILITY: After your response, always include a "— Council Check —" section with exactly two lines:
⊗ Contrarian: [one sentence: what is the most likely reason this content will not go viral or attract clients?]
▸ Executor: [one action: what should Dominic post first and on which platform in the next 30 minutes?]`,
  },
  contrarian: {
    id: 'contrarian',
    icon: '⊗',
    label: '06 Contrarian',
    short: 'Contra',
    description: 'Finds what will fail before it does',
    briefingLabel: 'Challenge the Plan',
    dailyPrompt: `Review Ecstasy Technologies' current approach: using 5 AI agents to hit GHS 12,000/month by finding Ghanaian businesses without websites and selling them software.

What are the 3 biggest assumptions that could be wrong? What is the most likely failure mode of the entire system? What early warning sign should I watch for this week?

Be direct. No padding. No validation.`,
    systemPrompt: `You are The Contrarian, a critical advisor in The Council for Ecstasy Technologies (ecstasytechnologies.com) targeting GHS 12,000/month.

Your ONLY job is to find what will fail. You do not cheerlead. You do not validate. You interrogate every assumption with one question: "Why will this fail?"

When given a plan or idea:
1. List every assumption that must be true for this to work
2. Identify the weakest, most untested assumption
3. Name the most likely failure mode — be specific, not generic
4. State the early warning sign that will tell Dominic this is failing before it is too late
5. Give ONE targeted change that would make the plan more failure-resistant

You are not here to kill ideas. You are here to pressure-test them so only strong ones survive. Be direct. No softening. No validation.`,
  },
  firstp: {
    id: 'firstp',
    icon: '∴',
    label: '07 First P.',
    short: 'First P.',
    description: 'Ignores convention, builds from first principles',
    briefingLabel: 'Rebuild From Scratch',
    dailyPrompt: `Strip Ecstasy Technologies' entire approach to its foundation. What is the actual problem being solved?

Ignore the current 5-agent system, the current pricing, and the current outreach method. If you were starting with a completely blank page today, what would the fastest path to GHS 12,000/month look like?

What is the one constraint in the current approach that, if removed, would change everything?`,
    systemPrompt: `You are The First Principles Thinker, a radical advisor in The Council for Ecstasy Technologies (ecstasytechnologies.com) targeting GHS 12,000/month.

You ignore how things are currently done. You strip every problem to its fundamental truths and rebuild from there. No analogies. No industry norms. No "how it's usually done."

When given a plan or problem:
1. List every assumption being carried forward from convention — not derived from first principles
2. State the fundamental truth underneath the problem
3. Rebuild the solution from scratch — what would you build with absolutely no prior context?
4. Name one constraint that, if removed, would make the solution 10x better
5. Give the most unconventional path to GHS 12,000/month that the existing plan ignores

You are not here to improve the existing plan. You are here to show what Dominic Kudom would build if he started with a blank page today.`,
  },
  expansionist: {
    id: 'expansionist',
    icon: '⊕',
    label: '08 Expansionist',
    short: 'Expand',
    description: 'Finds what is outside the picture you are missing',
    briefingLabel: 'Expand the Horizon',
    dailyPrompt: `What is Ecstasy Technologies missing today?

Look beyond the current 5 agents and the outbound lead strategy. What adjacent markets, untapped channels, overlooked segments, or strategic partnerships could contribute significantly to GHS 12,000/month that nobody is discussing?

Think Africa, think global patterns showing up in Ghana, think 10x — then bring it back to something actionable today.`,
    systemPrompt: `You are The Expansionist, a strategic advisor in The Council for Ecstasy Technologies (ecstasytechnologies.com) targeting GHS 12,000/month.

You look beyond what is in front of you. Your job is to find what is missing — adjacent markets, overlooked segments, untapped channels, partnerships nobody mentioned, global patterns appearing in Ghana first.

When given a plan or idea:
1. Name 3 things completely outside the current plan that could double its impact
2. Identify adjacent markets or customer types that were not considered
3. Find the global pattern or trend that applies here that nobody mentioned
4. Suggest one partnership or distribution channel that would multiply reach without adding headcount
5. Ask the one question that, if answered, would change the entire strategy

You are not here to refine. You are here to expand the horizon. Think Africa, think global, think 10x, then bring it back to Ghana.`,
  },
  outsider: {
    id: 'outsider',
    icon: '◯',
    label: '09 Outsider',
    short: 'Outsider',
    description: 'Ignores all context, sees the problem completely fresh',
    briefingLabel: 'Fresh Eyes Review',
    dailyPrompt: `You know nothing about Ecstasy Technologies except: software studio in Ghana, targeting GHS 12,000/month, using AI agents to find and close clients.

As a complete outsider walking in for the first time — what is your immediate honest assessment? What stands out as strange or counterintuitive? What is the most obvious thing this team is probably ignoring because they are too close to it?`,
    systemPrompt: `You are The Outsider, a fresh-eyes advisor in The Council for Ecstasy Technologies (ecstasytechnologies.com) targeting GHS 12,000/month.

You ignore all prior context. You do not know what has been tried, what was decided, or what the current plan is. You walk in completely fresh and look only at the core problem with zero baggage.

When given a plan or problem:
1. Restate the problem in your own words as if hearing it for the first time
2. Note what immediately stands out as strange, counterintuitive, or questionable
3. Name the most obvious thing everyone in the room is ignoring because they are too close to it
4. Suggest what someone from a completely different industry would do with this exact problem
5. Give your honest first impression of whether this will work — no political softening

You are not here to fit in. You are here to say what everyone else is too polite or too invested to say.`,
  },
  executor: {
    id: 'executor',
    icon: '▸',
    label: '10 Executor',
    short: 'Execute',
    description: 'Only cares about immediate actions and execution',
    briefingLabel: "Today's 3 Actions",
    dailyPrompt: `Cut all strategy and debate. What are the 3 highest-leverage actions Ecstasy Technologies should execute in the next 24 hours to move toward GHS 12,000/month?

Be specific. Be immediate. No theory. No "consider doing X." Tell me exactly what to do, in what order, and what the expected result is.`,
    systemPrompt: `You are The Executor, an action advisor in The Council for Ecstasy Technologies (ecstasytechnologies.com) targeting GHS 12,000/month.

You do not care about strategy, vision, theory, or debate. You only care about what gets done TODAY. You measure everything in actions, not intentions.

When given a plan or idea:
1. Strip everything out and name the ONE action that moves the needle most right now
2. List exactly 3 things Dominic Kudom can do in the next 2 hours to generate revenue or move a deal forward
3. Name the biggest time-waster in the current approach that should be cut immediately
4. Give a simple decision rule: "If [X] then do [A], if [Y] then do [B]" — no grey areas
5. Set a 48-hour checkpoint: what specific outcome should exist in 48 hours if execution is on track?

You are not here to plan. You are here to execute. Every response ends with: "DO THIS NOW: [one specific action, 10 words or less]."`,
  },
  scout: {
    id: 'scout',
    icon: '⌖',
    label: '06 SocialScout',
    short: 'Scout',
    description: 'Finds clients via social listening & keyword signals',
    briefingLabel: "Today's Search Strategy",
    dailyPrompt: `Generate today's social media listening plan for Ecstasy Technologies. I am a software studio in Ghana looking for businesses that need a website or are unhappy with their current online presence.

Deliver:
1. TOP 5 SEARCH QUERIES to run RIGHT NOW — one each for Facebook, Twitter/X, LinkedIn, Google, and WhatsApp groups
2. 3 PROSPECT SIGNALS to watch for in the results (exact wording patterns that mean "they're ready to buy")
3. ONE RESPONSE TEMPLATE — a comment or DM reply I can paste immediately when I find someone asking for a developer
4. TODAY'S FOCUS SECTOR — one Ghanaian industry where the best opportunities are hiding this week, and why`,
    systemPrompt: `You are SocialScout, a social media listening and inbound lead generation specialist for Ecstasy Technologies (ecstasytechnologies.com), a software studio in Ghana run by Dominic Kudom (CEO, +233542855399).

Your job is to find Ghanaian businesses and individuals who are actively signalling that they need a website or software developer through posts, comments, reviews, or complaints, so Dominic can reach them before any competitor does.

PLATFORMS TO MONITOR:
- Facebook: Ghana business groups, local buy/sell pages, business owner communities, public pages with no website link
- Twitter/X: searches for Ghanaian keywords, business owners' accounts with no website in bio
- LinkedIn: Ghana business owners, "looking for" posts, decision-maker profiles without a website
- Google/Maps: businesses with 1–2 star reviews citing "hard to find online", "no website", "couldn't reach them"
- WhatsApp: shared screenshots of group posts, "looking for developer" messages
- Domain tools: recently registered .com.gh / .gh domains that have no live site yet (indicating they registered but haven't built)

LEAD SIGNAL PATTERNS — what to look for:
HIGH INTENT (reply immediately):
- "I need a website for my business" / "who can build me a website in Ghana"
- "looking for a web developer in Accra/Kumasi/Takoradi"
- "website developer needed" / "I need someone to design my website"
- "my website is down/not working" / "I hate how my website looks"
- "how do I get more customers online?" / "how do I go digital?"

MEDIUM INTENT (warm outreach):
- Business posting on Facebook/Instagram with no website link in bio
- Google Maps listing with no website listed
- Business with multiple 1–2 star reviews about "can't find them online" or "no website"
- Businesses that just registered a .gh or .com.gh domain (check WHOIS — no site live yet)
- "which platform is best to sell my products online Ghana?" (they haven't committed yet)

LOW INTENT (monitor and nurture):
- "I'm thinking about getting a website" / "eventually I want a website"
- Accounts with 5,000+ followers but no website link
- Businesses running Facebook ads with no landing page (they're spending money without a site)

GHANA-SPECIFIC KEYWORDS TO SEARCH:
Facebook/Google: "need website Ghana", "web developer Accra", "website Kumasi", "website Takoradi", "build my website Ghana", "website for my business Ghana", "digital marketing Ghana", "online store Ghana", "e-commerce Ghana"
Twitter/X: "need a website" Ghana, "web developer" Accra, "website design" Ghana
LinkedIn: "web developer" Ghana, "website" Accra, "looking for developer" Ghana
Reviews: search "[business type] Accra no website" or "[business type] Kumasi poor online presence"

SEARCH STRATEGIES:
1. Facebook: Search bar → type keyword → click "Posts" tab → filter by recent → look at Ghana pages
2. Twitter/X Advanced Search: from:Ghana OR location:Accra OR location:Kumasi + keyword in quotes
3. LinkedIn: Search People → filter by Ghana → keyword in "Activity" or posts
4. Google Alerts: Set up free alerts for "need website Ghana", "web developer Accra" etc.
5. Domain scan: Tools like ExpiredDomains.net → filter .com.gh → find recently registered with no live site
6. Google Maps: Search "[industry] [city] Ghana" → look for listings with no website URL

WHEN THE USER PASTES SOCIAL MEDIA CONTENT, analyze it:
1. Business name and type
2. Location (city/area in Ghana)
3. Intent signal: HIGH / MEDIUM / LOW
4. Pain point in their own words (quote it)
5. Estimated deal value in GHS (website GHS 3,500–4,000, web app GHS 8,000–25,000, system GHS 15,000+)
6. First response script — exactly what to comment or DM (short, confident, no pitch)
7. Pipeline recommendation: "→ Add to pipeline as [name] — GHS [value] — Stage: Found"

OUTREACH TEMPLATES:
Comment reply: "Hey [name], I build websites for Ghanaian businesses like yours. Prices start at GHS 3,500. Check our work at ecstasytechnologies.com. DM me if you want a quick chat."
DM: "Hi [name], saw your post about needing a website. I'm Dominic from Ecstasy Technologies, a Ghanaian software studio. We've built sites for hotels, shops, clinics and more. Takes 2 weeks. Starts at GHS 3,500. Want to see some examples? ecstasytechnologies.com. You can also reach me on +233542855399."

COUNCIL ACCOUNTABILITY: After your response, always include a "— Council Check —" section with exactly two lines:
⊗ Contrarian: [one sentence: what is the most likely reason these leads won't convert?]
▸ Executor: [one action: what is the single search Dominic should run in the next 10 minutes?]`,
  },
}

const AGENT_IDS = Object.keys(AGENTS) as AgentId[]
const MAIN_AGENT_IDS: AgentId[] = ['prospect', 'content', 'scope', 'revenue', 'viral', 'scout']
const COUNCIL_AGENT_IDS: AgentId[] = ['contrarian', 'firstp', 'expansionist', 'outsider', 'executor']

// ─── Mobile tab groupings ─────────────────────────────────────────────────────
type MobileTab = 'home' | 'work' | 'agents' | 'more'
const WORK_VIEWS: ViewId[]  = ['pipeline', 'clients', 'invoices', 'prospect-map']
const AGENT_VIEWS: ViewId[] = ['council', ...MAIN_AGENT_IDS] as ViewId[]
const MORE_VIEWS: ViewId[]  = ['social', 'website', 'history', 'data-quality', 'analytics']
function getMobileTab(view: ViewId): MobileTab {
  if (WORK_VIEWS.includes(view))  return 'work'
  if (AGENT_VIEWS.includes(view)) return 'agents'
  if (MORE_VIEWS.includes(view))  return 'more'
  return 'home'
}

// ─── Website project seed data ─────────────────────────────────────────────────

const SEED_PROJECTS: Array<{
  title: string; category: string; description: string; image: string
  features: string[]; technologies: string[]; link?: string; year?: number; status?: string
}> = [
  {
    title: 'Lavimac Hotel Management System',
    category: 'Business Software',
    description: 'Full-stack hotel management system with real-time room status updates, guest check-in/checkout workflows, reservation handling, and comprehensive reporting for Lavimac Hotel, Ghana.',
    image: '',
    features: ['Real-time room occupancy dashboard', 'Guest check-in/checkout', 'Reservation management', 'Report generation & exports', 'Row-level security'],
    technologies: ['React', 'Node.js', 'Express', 'Supabase', 'PostgreSQL'],
    link: 'https://github.com/PlnDominic/Lavimac-HMS',
    year: 2024, status: 'completed',
  },
  {
    title: 'Mikjan Hotel Management System',
    category: 'Business Software',
    description: 'Full-stack hotel management system built for Mikjan Hotel with live occupancy tracking, guest workflows, reservation system, and automated reporting.',
    image: '',
    features: ['Room occupancy dashboard', 'Check-in/checkout workflows', 'Reservation system', 'Live database sync', 'Automated reports'],
    technologies: ['React', 'Supabase', 'PostgreSQL', 'Tailwind CSS', 'JavaScript'],
    link: 'https://github.com/PlnDominic/mikjan-hotel-management-system-software',
    year: 2024, status: 'completed',
  },
  {
    title: 'BABMA Municipal Assembly Website',
    category: 'Website',
    description: 'Modern, responsive official website for the BABMA Municipal Assembly with dark/light theme toggle, dynamic content loading, and multi-page structure covering services, departments, and announcements.',
    image: '',
    features: ['Responsive design', 'Dark/light theme toggle', 'Services directory', 'Announcements board', 'Departments listing', 'Contact form'],
    technologies: ['HTML5', 'CSS3', 'JavaScript', 'Google Fonts'],
    link: 'https://github.com/PlnDominic/BABMA02',
    year: 2024, status: 'completed',
  },
  {
    title: 'Obotan Co-operative Credit Union System',
    category: 'Business Software',
    description: 'Comprehensive web application for managing the Obotan Co-operative Credit Union — covering user management, financial transactions, work submissions, and administrative reporting.',
    image: '',
    features: ['User authentication', 'Financial transactions', 'Work submissions', 'Admin reporting dashboard', 'Role-based access control', 'Database migrations'],
    technologies: ['Python', 'Flask', 'PostgreSQL', 'HTML', 'CSS', 'JavaScript', 'Gunicorn'],
    link: 'https://github.com/PlnDominic/Obotan-Cooperative-Credit-Union',
    year: 2023, status: 'completed',
  },
  {
    title: 'Lavimac Royal Hotel Website',
    category: 'Website',
    description: 'Modern hotel website for Lavimac Royal Hotel with online room booking, Google Maps integration, email contact form, and WhatsApp direct messaging for guests.',
    image: '',
    features: ['Online booking system', 'Room displays', 'Contact form with email', 'Google Maps integration', 'WhatsApp direct contact'],
    technologies: ['TypeScript', 'Python', 'Flask', 'Vite', 'Tailwind CSS', 'Google Maps API'],
    link: 'https://github.com/PlnDominic/Lavimac-Royal-Hotel',
    year: 2024, status: 'completed',
  },
  {
    title: 'Solani Construction & Engineering',
    category: 'Website',
    description: 'Corporate website for Solani Construction & Engineering with project portfolio showcase, 3D animation elements, admin dashboard, and SEO optimization.',
    image: '',
    features: ['Project portfolio showcase', 'Admin dashboard', '3D animations', 'SEO optimization', 'Interactive maps', 'Responsive design'],
    technologies: ['Next.js', 'TypeScript', 'Tailwind CSS', 'Supabase'],
    link: 'https://github.com/PlnDominic/Solani-Construction-and-Engineering',
    year: 2024, status: 'completed',
  },
  {
    title: 'Bubbly Montessori School Website',
    category: 'Website',
    description: 'Clean, professional school website for Bubbly Montessori built with Next.js and Tailwind CSS with SEO optimization and component-based architecture.',
    image: '',
    features: ['School information pages', 'Responsive design', 'SEO optimization', 'Custom React hooks', 'Component-based UI'],
    technologies: ['Next.js', 'TypeScript', 'Tailwind CSS', 'PostCSS'],
    link: 'https://github.com/PlnDominic/Bubbly-Montessori',
    year: 2024, status: 'completed',
  },
  {
    title: 'Interactive GIS Web Map',
    category: 'GIS',
    description: 'Web-based interactive mapping application for spatial data visualization, built entirely with vanilla JavaScript and HTML5 for lightweight deployment.',
    image: '',
    features: ['Interactive map layers', 'Spatial data visualization', 'Location display', 'Custom data directory', 'No-framework deployment'],
    technologies: ['JavaScript', 'HTML5', 'CSS3'],
    link: 'https://github.com/PlnDominic/InteractiveMap',
    year: 2023, status: 'completed',
  },
  {
    title: 'Building Compliance Tracking App',
    category: 'GIS',
    description: 'Web application for tracking and assessing building compliance with geospatial mapping support, shapefile and GeoJSON data handling, and a migration-backed database.',
    image: '',
    features: ['Building compliance tracking', 'Geospatial map views', 'Shapefile & GeoJSON support', 'File upload system', 'Database migrations', 'Test suite'],
    technologies: ['Python', 'Flask', 'JavaScript', 'HTML5', 'CSS3', 'GeoJSON'],
    link: 'https://github.com/PlnDominic/building-compliance-app',
    year: 2023, status: 'completed',
  },
  {
    title: 'XScout Lead Platform',
    category: 'Web Application',
    description: 'Python-powered web application for lead scouting and data management with a dedicated dashboard for prospect tracking and analysis.',
    image: '',
    features: ['Lead scouting dashboard', 'Prospect data management', 'Detail views', 'Cloud deployment-ready', 'Data analytics'],
    technologies: ['Python', 'Flask', 'HTML5', 'Heroku'],
    link: 'https://github.com/PlnDominic/XScout',
    year: 2023, status: 'completed',
  },
  {
    title: 'PM Group',
    category: 'Web Application',
    description: 'Property management web application built with Next.js, TypeScript, and PostgreSQL for managing properties, listings, and client interactions.',
    image: '',
    features: ['Property listings', 'Management dashboard', 'Database integration', 'User authentication', 'Responsive design'],
    technologies: ['Next.js', 'TypeScript', 'Tailwind CSS', 'PostgreSQL', 'PLpgSQL'],
    link: 'https://github.com/PlnDominic/PM-Group',
    year: 2024, status: 'completed',
  },
  {
    title: 'Eighteen Cubic',
    category: 'Website',
    description: 'Modern business website built with Next.js and TypeScript using Geist font and a clean, professional architecture.',
    image: '',
    features: ['Modern UI/UX', 'Responsive design', 'Font optimization', 'Clean codebase', 'ESLint configured'],
    technologies: ['Next.js', 'TypeScript', 'CSS', 'Geist Font'],
    link: 'https://github.com/PlnDominic/Eighteen-Cubic',
    year: 2024, status: 'completed',
  },
  {
    title: 'Royal Ecclesia Church Management System',
    category: 'Business Software',
    description: 'Full-stack church management system for Royal Ecclesia Church covering member records, attendance tracking, event coordination, and church administration.',
    image: '',
    features: ['Member directory', 'Attendance tracking', 'Event management', 'Service schedules', 'Church administration dashboard'],
    technologies: ['Next.js', 'TypeScript', 'Tailwind CSS', 'PostgreSQL'],
    year: 2024, status: 'completed',
  },
  {
    title: 'Fine Wine',
    category: 'Website',
    description: 'Premium wine retail website with product catalogue, WhatsApp ordering, and elegant design tailored for a Ghanaian wine business.',
    image: '',
    features: ['Product catalogue', 'WhatsApp ordering', 'Elegant UI', 'Mobile-first design', 'Responsive layout'],
    technologies: ['Next.js', 'TypeScript', 'Tailwind CSS'],
    year: 2024, status: 'completed',
  },
  {
    title: 'Avenu-15',
    category: 'Website',
    description: 'Event venue and booking website with an online reservation system, gallery, and event listings for a premium Ghana venue.',
    image: '',
    features: ['Online reservations', 'Event listings', 'Venue gallery', 'Contact & enquiry form', 'Responsive design'],
    technologies: ['Next.js', 'TypeScript', 'Tailwind CSS'],
    year: 2024, status: 'completed',
  },
  {
    title: 'Bia East District',
    category: 'GIS',
    description: 'Digital platform for Bia East District, Ghana, with geographic information mapping, community resource directory, and district service listings.',
    image: '',
    features: ['District GIS mapping', 'Community resources', 'Service directory', 'Geographic data visualization', 'Responsive design'],
    technologies: ['JavaScript', 'Python', 'HTML5', 'GeoJSON'],
    year: 2023, status: 'completed',
  },
]

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

// ─── CSV export helper ─────────────────────────────────────────────────────────

function downloadCSV(filename: string, rows: string[][]) {
  const csv = rows.map(r => r.map(c => `"${String(c ?? '').replace(/"/g, '""')}"`).join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = filename; a.click()
  URL.revokeObjectURL(url)
}

// ─── Supabase conversation persistence ────────────────────────────────────────

function saveMessage(agentId: string, role: 'user' | 'assistant', content: string) {
  fetch('/api/conversations', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ agent_id: agentId, role, content }),
  }).catch(() => {})
}

function clearMessages(agentId: string) {
  fetch(`/api/conversations?agent_id=${encodeURIComponent(agentId)}`, { method: 'DELETE' }).catch(() => {})
}

// ─── API helpers ──────────────────────────────────────────────────────────────

const TEAM_LABELS: Record<string, string> = {
  prospect: 'ProspectBot', content: 'ContentBot', scope: 'ProjectBot',
  revenue: 'RevenueBot', viral: 'ViralBot', scout: 'SocialScout',
}

function buildTeamIntel(workspace: Record<string, string>, excludeId?: string): string {
  const liveData = workspace['_live'] ?? ''
  const agentIntel = Object.entries(workspace)
    .filter(([id, v]) => id !== excludeId && id !== '_live' && v?.trim())
    .map(([id, v]) => `[${TEAM_LABELS[id] ?? id}]: ${v.slice(0, 500)}`)
    .join('\n\n')
  const parts: string[] = []
  if (liveData.trim()) parts.push(liveData.trim())
  if (agentIntel.trim()) parts.push(agentIntel.trim())
  return parts.join('\n\n')
}

function buildPipelineSnapshot(deals: Deal[], invoices: Invoice[]): string {
  if (!deals.length && !invoices.length) return ''
  const closed = deals.filter(d => d.stage === 'closed')
  const active = deals.filter(d => d.stage !== 'closed' && d.stage !== 'lost')
  const lost = deals.filter(d => d.stage === 'lost')
  const closedGHS = closed.reduce((s, d) => s + d.valueGHS, 0)
  const activeGHS = active.reduce((s, d) => s + d.valueGHS, 0)
  const paidGHS = invoices.filter(i => i.status === 'paid').reduce((s, i) => s + i.totalGHS, 0)
  const unpaidGHS = invoices.filter(i => i.status !== 'paid').reduce((s, i) => s + i.totalGHS, 0)
  const dealLines = deals.slice(0, 20).map(d =>
    `  ${d.name} | ${STAGE_LABELS[d.stage]} | GHS ${d.valueGHS.toLocaleString()} | ${d.industry}${d.phone ? ` | ${d.phone}` : ''}`
  ).join('\n')
  return `LIVE PIPELINE (real data):
  Goal: GHS 12,000/month | Closed: GHS ${closedGHS.toLocaleString()} (${Math.round((closedGHS/12000)*100)}%) | Active: GHS ${activeGHS.toLocaleString()} | Lost: ${lost.length}
  Invoices: GHS ${paidGHS.toLocaleString()} paid, GHS ${unpaidGHS.toLocaleString()} outstanding
DEALS (${deals.length} total):
${dealLines || '  (none yet)'}`
}

const TEAM_MISSION_HEADER = `TEAM: You are part of Ecstasy Technologies' 6-agent revenue team. Owned by Dominic Kudom, CEO. WhatsApp & phone: +233542855399. Shared goal: GHS 12,000 in new deals per month. Pipeline: SocialScout → ProspectBot → ContentBot → ProjectBot → RevenueBot → ViralBot. When TEAM INTEL is present below, build directly on your teammates' work — don't start from scratch.

WRITING RULES — follow these in every single response, no exceptions:
- Write like a smart human, not a consultant. Use simple, direct words. Short sentences.
- Never use em dashes (—). Use a comma, a full stop, or a new sentence instead.
- Never use ** for bold. If you need to emphasize something, just write it in plain text with weight given through word choice and sentence structure.
- No bullet points that start with hollow words like "Ensure", "Leverage", "Utilize", "Streamline". Be specific and direct.
- No AI filler phrases: "Certainly!", "Great question!", "Of course!", "Absolutely!", "I'd be happy to".
- Sound like a sharp teammate talking to Dominic, not a chatbot writing a report.\n\n`

async function callChat(
  systemPrompt: string,
  messages: Message[],
  pinnedNotes?: string,
  agentId?: string,
  workspace?: Record<string, string>
): Promise<string> {
  let fullPrompt = TEAM_MISSION_HEADER

  if (pinnedNotes?.trim()) {
    fullPrompt += `\n\n⚠ OWNER'S RULES — READ FIRST, FOLLOW ABOVE ALL ELSE:\n${pinnedNotes.trim()}\n— END OWNER'S RULES —`
  }

  fullPrompt += '\n\n' + systemPrompt

  if (workspace) {
    const intel = buildTeamIntel(workspace, agentId)
    if (intel) {
      fullPrompt += `\n\n— TEAM INTEL (your colleagues' latest outputs — reference and build on these) —\n${intel}\n— END TEAM INTEL —`
    }
  }

  const res = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ systemPrompt: fullPrompt, messages, agentId }),
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
      buildPrompt: (c) => `I found these leads with ProspectBot. Add the total estimated value to my pipeline and tell me how close I am to my GHS 12,000 monthly goal:\n\n${c.slice(0, 1500)}`,
    },
    {
      label: '→ Viral Angle (ViralBot)',
      targetAgent: 'viral',
      buildPrompt: (c) => `These are my current leads from ProspectBot. Use the industries and pain points in this lead list to create viral content that attracts MORE of these same clients inbound to Ecstasy Technologies:\n\n${c.slice(0, 1500)}`,
    },
    {
      label: '⌖ Find More on Social',
      targetAgent: 'scout',
      buildPrompt: (c) => `ProspectBot found these leads. Now search social media for MORE businesses in the same industries — specifically find people actively posting "I need a website" or complaining about their online presence:\n\n${c.slice(0, 1500)}`,
    },
    {
      label: '⊗ Challenge My Leads',
      targetAgent: 'contrarian',
      buildPrompt: (c) => `I just got this lead list from ProspectBot. Challenge every assumption in it — what is most likely to fail when I pick up the phone and call these businesses?\n\n${c.slice(0, 1500)}`,
    },
    {
      label: '▸ Who Do I Call First?',
      targetAgent: 'executor',
      buildPrompt: (c) => `I have these prospects from ProspectBot. Cut the analysis — tell me exactly which lead to call first, what to say, and what to do in the next 2 hours.\n\n${c.slice(0, 1500)}`,
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
      buildPrompt: (c) => `I have this scoped project from ProjectBot. Add it to my pipeline and show what % of my GHS 12,000 monthly goal it covers:\n\n${c.slice(0, 1500)}`,
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
    {
      label: '∴ Rethink From Scratch',
      targetAgent: 'firstp',
      buildPrompt: (c) => `I have this project scope from ProjectBot. Ignore the scope — rebuild the solution from first principles. What should I actually be building for this client if I started from zero?\n\n${c.slice(0, 1500)}`,
    },
    {
      label: '⊕ What Am I Missing?',
      targetAgent: 'expansionist',
      buildPrompt: (c) => `I have this project scope. What adjacent services, features, or opportunities are completely outside this scope that could double the deal value or open new revenue streams?\n\n${c.slice(0, 1500)}`,
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
      buildPrompt: (c) => `I drafted these pitches and proposals with ContentBot. Add the deal values to my pipeline and tell me what % of my GHS 12,000 monthly goal they represent if closed:\n\n${c.slice(0, 1500)}`,
    },
    {
      label: '◯ Outside Read',
      targetAgent: 'outsider',
      buildPrompt: (c) => `I wrote this pitch/content with ContentBot. Read it as the client receiving it for the first time — what is your completely honest first impression? Would you respond to this?\n\n${c.slice(0, 1500)}`,
    },
    {
      label: '⊗ Will This Pitch Work?',
      targetAgent: 'contrarian',
      buildPrompt: (c) => `I wrote this pitch/content with ContentBot. Tell me every specific reason why the prospect will say no, ignore it, or ghost me after reading this.\n\n${c.slice(0, 1500)}`,
    },
  ],
  revenue: [
    {
      label: '→ Find More Leads (ProspectBot)',
      targetAgent: 'prospect',
      buildPrompt: (c) => `My RevenueTracker says I need more pipeline. Based on this revenue analysis, find 5 new high-value leads in Ghana that can close fast and help me hit my GHS 12,000 goal:\n\n${c.slice(0, 1500)}`,
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
      buildPrompt: (c) => `My RevenueTracker shows I am behind on my GHS 12,000 target. Create urgent viral content that positions Ecstasy Technologies as the go-to software studio in Ghana and drives inbound inquiries this week:\n\n${c.slice(0, 1500)}`,
    },
    {
      label: '⊗ Reality Check the Target',
      targetAgent: 'contrarian',
      buildPrompt: (c) => `This is my current revenue situation. Tell me every specific reason why I will NOT hit GHS 12,000 this month — challenge every assumption in my current approach.\n\n${c.slice(0, 1500)}`,
    },
    {
      label: '⊕ Find Hidden Revenue',
      targetAgent: 'expansionist',
      buildPrompt: (c) => `This is my current revenue data. What revenue streams, adjacent markets, or untapped opportunities am I completely missing that could help me hit GHS 12,000/month faster?\n\n${c.slice(0, 1500)}`,
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
      buildPrompt: (c) => `I ran this viral campaign with ViralBot. Help me estimate the potential pipeline value of the inbound leads this could attract and track it against my GHS 12,000 monthly goal:\n\n${c.slice(0, 1500)}`,
    },
    {
      label: '◯ Audience Reality Check',
      targetAgent: 'outsider',
      buildPrompt: (c) => `I created this viral content with ViralBot. As someone who does not know Ecstasy Technologies at all — how does this content land? Would you stop scrolling for it? Would you engage?\n\n${c.slice(0, 1500)}`,
    },
    {
      label: '▸ Just Post It',
      targetAgent: 'executor',
      buildPrompt: (c) => `I have this viral content ready from ViralBot. Stop the debate — tell me exactly what to post, on which platform, in what order, in the next 30 minutes.\n\n${c.slice(0, 1500)}`,
    },
  ],
  contrarian: [
    {
      label: '→ Strengthen the Pitch (ContentBot)',
      targetAgent: 'content',
      buildPrompt: (c) => `The Contrarian raised these concerns. Rewrite my pitch or content to address the most critical failure point and make it resilient to the objections identified:\n\n${c.slice(0, 1500)}`,
    },
    {
      label: '→ Find Stronger Leads (ProspectBot)',
      targetAgent: 'prospect',
      buildPrompt: (c) => `The Contrarian found weaknesses in my lead strategy. Find 5 leads that would survive this level of scrutiny — higher quality, higher conversion probability:\n\n${c.slice(0, 1500)}`,
    },
    {
      label: '→ Reality-Check Revenue (RevenueTracker)',
      targetAgent: 'revenue',
      buildPrompt: (c) => `The Contrarian has challenged my assumptions. Run a conservative revenue analysis against my GHS 12,000 goal accounting for these specific failure risks:\n\n${c.slice(0, 1500)}`,
    },
  ],
  firstp: [
    {
      label: '→ Scope the New Approach (ProjectBot)',
      targetAgent: 'scope',
      buildPrompt: (c) => `The First Principles Thinker has redesigned the solution from scratch. Scope this new approach, define deliverables, and price it in GHS:\n\n${c.slice(0, 1500)}`,
    },
    {
      label: '→ Write for New Approach (ContentBot)',
      targetAgent: 'content',
      buildPrompt: (c) => `The First Principles Thinker identified a fundamentally better approach. Write a pitch, X post, or proposal that positions this new angle for Ecstasy Technologies:\n\n${c.slice(0, 1500)}`,
    },
  ],
  expansionist: [
    {
      label: '→ Find Leads in New Segment (ProspectBot)',
      targetAgent: 'prospect',
      buildPrompt: (c) => `The Expansionist identified adjacent markets and untapped segments. Find 5 leads in these new areas that Ecstasy Technologies has not targeted yet:\n\n${c.slice(0, 1500)}`,
    },
    {
      label: '→ Amplify New Angle (ViralBot)',
      targetAgent: 'viral',
      buildPrompt: (c) => `The Expansionist found new markets, trends, and angles I can capitalise on. Create viral content that reaches these expanded audiences for Ecstasy Technologies:\n\n${c.slice(0, 1500)}`,
    },
  ],
  outsider: [
    {
      label: '→ Rewrite With Fresh Eyes (ContentBot)',
      targetAgent: 'content',
      buildPrompt: (c) => `The Outsider gave an honest first impression of my content. Rewrite it from scratch based on this fresh perspective — make it land better for someone who does not know Ecstasy Technologies:\n\n${c.slice(0, 1500)}`,
    },
    {
      label: '→ Fresh Perspective Content (ViralBot)',
      targetAgent: 'viral',
      buildPrompt: (c) => `The Outsider noticed what a fresh audience really sees. Use this outsider perspective to create viral content that hooks people who have never heard of Ecstasy Technologies:\n\n${c.slice(0, 1500)}`,
    },
  ],
  executor: [
    {
      label: '→ Find Lead NOW (ProspectBot)',
      targetAgent: 'prospect',
      buildPrompt: (c) => `The Executor says take action now. Find the single highest-probability lead I should contact in the next hour — most likely to convert, fastest to respond:\n\n${c.slice(0, 1500)}`,
    },
    {
      label: '→ Send This NOW (ContentBot)',
      targetAgent: 'content',
      buildPrompt: (c) => `The Executor says act immediately. Write the exact message I should send right now to move a deal forward — no revisions, just the message ready to copy-paste:\n\n${c.slice(0, 1500)}`,
    },
  ],
  scout: [
    {
      label: '→ Write Reply (ContentBot)',
      targetAgent: 'content',
      buildPrompt: (c) => `SocialScout found this social media lead or prospect signal. Write the exact reply, comment, or DM to send immediately — confident, brief, one clear CTA to ecstasytechnologies.com:\n\n${c.slice(0, 1500)}`,
    },
    {
      label: '→ Scope & Price It (ProjectBot)',
      targetAgent: 'scope',
      buildPrompt: (c) => `SocialScout identified this potential client from social media. Scope a realistic project for their business type and generate a GHS-priced proposal:\n\n${c.slice(0, 1500)}`,
    },
    {
      label: '→ Add to Pipeline (RevenueTracker)',
      targetAgent: 'revenue',
      buildPrompt: (c) => `SocialScout found these social media leads. Log them to my pipeline and calculate their combined value against my GHS 12,000 monthly goal:\n\n${c.slice(0, 1500)}`,
    },
    {
      label: '→ Find Offline Leads Too (ProspectBot)',
      targetAgent: 'prospect',
      buildPrompt: (c) => `SocialScout found leads in these industries on social media. Find 5 more businesses in the same sectors that I can call directly — name, location, phone, no website:\n\n${c.slice(0, 1500)}`,
    },
    {
      label: '→ Create Content From This (ViralBot)',
      targetAgent: 'viral',
      buildPrompt: (c) => `SocialScout found this lead signal — someone asking for a website on social media. Create a viral post that positions Ecstasy Technologies as the obvious choice for people searching for these exact services:\n\n${c.slice(0, 1500)}`,
    },
    {
      label: '▸ Reply NOW',
      targetAgent: 'executor',
      buildPrompt: (c) => `SocialScout found this lead. Tell me exactly what to do in the next 5 minutes to claim this prospect before a competitor does:\n\n${c.slice(0, 1500)}`,
    },
  ],
}

// ─── Deal pipeline model & storage ───────────────────────────────────────────

type DealStage = 'found' | 'contacted' | 'interested' | 'proposal' | 'negotiating' | 'closed' | 'lost'
const STAGES: DealStage[] = ['found', 'contacted', 'interested', 'proposal', 'negotiating', 'closed', 'lost']
const STAGE_LABELS: Record<DealStage, string> = {
  found: 'Found', contacted: 'Contacted', interested: 'Interested',
  proposal: 'Proposal Sent', negotiating: 'Negotiating', closed: 'Closed', lost: 'Lost',
}
const STAGE_WEIGHT: Record<DealStage, number> = {
  found: 0.10, contacted: 0.20, interested: 0.40,
  proposal: 0.60, negotiating: 0.75, closed: 1.00, lost: 0,
}
const STAGE_COLOR: Record<DealStage, string> = {
  found: '#8B5CF6', contacted: '#3B82F6', interested: '#10B981',
  proposal: '#F59E0B', negotiating: '#EF4444', closed: '#E84040', lost: '#9CA3AF',
}
const STAGE_STALE_MS: Record<DealStage, number> = {
  found: 3 * 86400000, contacted: 5 * 86400000, interested: 7 * 86400000,
  proposal: 10 * 86400000, negotiating: 14 * 86400000, closed: 0, lost: 0,
}

interface Deal {
  id: string
  name: string
  industry: string
  valueGHS: number
  stage: DealStage
  phone?: string
  createdAt: number
  stageChangedAt?: number
  followUpAt?: number
  lastContactedAt?: number
  whatsappHistory?: Array<{ text: string; sentAt: number }>
}

interface ParsedProspect {
  name: string
  industry: string
  address?: string
  phone?: string
  whyNeedsWebsite?: string
  servicePitch?: string
  valueGHS: number
  phonePitch?: string
}

const DEALS_KEY = 'tagett-deals-v1'
const STAGE_MIGRATE: Record<string, DealStage> = { called: 'contacted', scoped: 'interested' }
function loadDeals(): Deal[] {
  if (typeof window === 'undefined') return []
  try {
    const r = localStorage.getItem(DEALS_KEY)
    if (!r) return []
    return (JSON.parse(r) as Deal[]).map(d => ({
      ...d,
      stage: (STAGE_MIGRATE[d.stage as string] ?? d.stage) as DealStage,
    }))
  } catch { return [] }
}
function saveDeals(d: Deal[]): void {
  try { localStorage.setItem(DEALS_KEY, JSON.stringify(d)) } catch {}
}

// ─── Invoice types & storage ──────────────────────────────────────────────────

interface InvoiceMilestone {
  id: string
  label: string
  amountGHS: number
  paidAt?: number
  paymentMethod?: string
  notes?: string
}

interface Invoice {
  id: string
  clientName: string
  description: string
  dealId?: string
  totalGHS: number
  milestones: InvoiceMilestone[]
  status: 'draft' | 'sent' | 'partial' | 'paid'
  createdAt: number
  dueAt?: number
  sentAt?: number
  notes?: string
}

const INVOICES_KEY = 'tagett-invoices-v1'
function loadInvoices(): Invoice[] {
  if (typeof window === 'undefined') return []
  try { const r = localStorage.getItem(INVOICES_KEY); return r ? JSON.parse(r) : [] } catch { return [] }
}
function saveInvoices(d: Invoice[]): void {
  try { localStorage.setItem(INVOICES_KEY, JSON.stringify(d)) } catch {}
}

// ─── Social post types & storage ─────────────────────────────────────────────

type SocialPlatform = 'twitter' | 'linkedin' | 'facebook' | 'instagram' | 'tiktok'
const PLATFORM_LABELS: Record<SocialPlatform, string> = {
  twitter: 'X', linkedin: 'LinkedIn', facebook: 'Facebook', instagram: 'Instagram', tiktok: 'TikTok',
}
const PLATFORM_COLORS: Record<SocialPlatform, string> = {
  twitter: '#000000', linkedin: '#0A66C2', facebook: '#1877F2', instagram: '#E1306C', tiktok: '#010101',
}

interface SocialPost {
  id: string
  content: string
  platforms: SocialPlatform[]
  status: 'draft' | 'scheduled' | 'posted'
  scheduledFor?: number
  postedAt?: number
  createdAt: number
  category?: string
}

const SOCIAL_POSTS_KEY = 'tagett-social-posts-v1'
function loadSocialPosts(): SocialPost[] {
  if (typeof window === 'undefined') return []
  try { const r = localStorage.getItem(SOCIAL_POSTS_KEY); return r ? JSON.parse(r) : [] } catch { return [] }
}
function saveSocialPosts(d: SocialPost[]): void {
  try { localStorage.setItem(SOCIAL_POSTS_KEY, JSON.stringify(d)) } catch {}
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

function parseProspects(text: string): ParsedProspect[] {
  // Split on numbered prospect blocks (1., 2., 3. …)
  const blocks = text.split(/(?=\n\s*\d+\.\s+Business Name|\n\s*---|\n\s*\*\*\d+\.)/i)
  const results: ParsedProspect[] = []

  for (const block of blocks) {
    const nameMatch = block.match(/Business Name\s*[—–\-]+\s*(.+?)(?:\n|$)/i)
      || block.match(/^\s*\d+\.\s+\*{0,2}(.+?)\*{0,2}\s*(?:\n|$)/)
    if (!nameMatch) continue
    const name = nameMatch[1].replace(/\*+/g, '').trim()
    if (name.length < 2) continue

    const field = (label: string) => {
      const m = block.match(new RegExp(label + '\\s*:?\\s*(.+?)(?:\\n|$)', 'i'))
      return m ? m[1].replace(/\*+/g, '').trim() : undefined
    }

    const phoneRaw = field('Phone')
    let phone: string | undefined
    if (phoneRaw) {
      const digits = phoneRaw.replace(/\D/g, '')
      if (digits.startsWith('233') && digits.length === 12) phone = '+' + digits
      else if (digits.startsWith('0') && digits.length === 10) phone = '+233' + digits.slice(1)
      else if (digits.length === 9) phone = '+233' + digits
      else phone = phoneRaw
    }

    const valueRaw = field('Estimated value')
    let valueGHS = 0
    if (valueRaw) {
      const m = valueRaw.match(/GHS\s*([\d,]+)|₵\s*([\d,]+)|([\d,]+)/)
      if (m) valueGHS = parseInt((m[1] || m[2] || m[3]).replace(/,/g, ''), 10) || 0
    }

    const pitchRaw = field('Phone pitch')
    const phonePitch = pitchRaw ? pitchRaw.replace(/^["""'`]|["""'`]$/g, '').trim() : undefined

    results.push({
      name,
      industry: field('Industry') ?? 'Unknown',
      address: field('Address'),
      phone,
      whyNeedsWebsite: field('Why they need a website'),
      servicePitch: field('Service to pitch'),
      valueGHS,
      phonePitch,
    })
  }

  return results.filter(p => p.name.length > 1)
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
      {isOn ? <IconBell color={GOLD} /> : <IconBellOff />}
    </IconButton>
  )
}

// ─── Theme ────────────────────────────────────────────────────────────────────

function useTheme() {
  const [theme, setTheme] = useState<'dark' | 'light'>('light')

  useEffect(() => {
    const saved = localStorage.getItem('revenue-hub-theme') as 'dark' | 'light' | null
    const initial = saved ?? 'light'
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
    <IconButton onClick={onToggle} title={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}>
      {theme === 'light' ? '☽' : '☀'}
    </IconButton>
  )
}

function SignOutButton() {
  const [loading, setLoading] = useState(false)
  const handleSignOut = async () => {
    setLoading(true)
    await fetch('/api/auth/signout', { method: 'POST' })
    window.location.href = '/login'
  }
  return (
    <IconButton onClick={handleSignOut} title="Sign out" disabled={loading}>
      ⏻
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
  const next = () => (step < 2 ? setStep(step + 1) : onComplete())

  const AgentCard = ({ id }: { id: AgentId }) => {
    const a = AGENTS[id]
    return (
      <div key={id} style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 12, padding: '12px 10px', display: 'flex', flexDirection: 'column', gap: 4 }}>
        <span style={{ fontSize: 20, lineHeight: 1 }}>{a.icon}</span>
        <div style={{ fontFamily: FONT_HEADING, fontWeight: 600, fontSize: 12, color: TEXT }}>{a.short}</div>
        <div style={{ fontSize: 10, color: MUTED, lineHeight: 1.4, fontFamily: FONT_BODY }}>{a.description}</div>
      </div>
    )
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: BG, zIndex: 200,
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      padding: '0 36px env(safe-area-inset-bottom)',
    }}>
      <div style={{ flex: 1 }} />

      {step === 0 && (
        <>
          <img src="/icon-192.png" alt="Tagett" width={72} height={72} style={{ borderRadius: 18, marginBottom: 22 }} />
          <div style={{ fontFamily: FONT_HEADING, fontWeight: 800, fontSize: 28, color: TEXT, marginBottom: 10, letterSpacing: '-0.02em' }}>
            Tagett
          </div>
          <div style={{ fontSize: 13, color: MUTED, textAlign: 'center', lineHeight: 1.6, marginBottom: 40, fontFamily: FONT_BODY }}>
            Ten AI agents working as one system. Find leads, close deals, go viral, and hit GHS 12,000/month.
          </div>
        </>
      )}

      {step === 1 && (
        <>
          <div style={{ fontSize: 9, fontFamily: FONT_HEADING, fontWeight: 600, color: GOLD, letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 12, alignSelf: 'flex-start' }}>Operators</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 18, width: '100%' }}>
            {MAIN_AGENT_IDS.map((id) => <AgentCard key={id} id={id} />)}
          </div>
          <div style={{ fontFamily: FONT_HEADING, fontWeight: 700, fontSize: 18, color: TEXT, marginBottom: 8, textAlign: 'center' }}>
            Five operators. One pipeline.
          </div>
          <div style={{ fontSize: 13, color: MUTED, textAlign: 'center', lineHeight: 1.6, marginBottom: 36, fontFamily: FONT_BODY }}>
            Find leads, write pitches, scope deals, go viral, and track every GHS toward the goal.
          </div>
        </>
      )}

      {step === 2 && (
        <>
          <div style={{ fontSize: 9, fontFamily: FONT_HEADING, fontWeight: 600, color: GOLD, letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 12, alignSelf: 'flex-start' }}>The Council</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 18, width: '100%' }}>
            {COUNCIL_AGENT_IDS.map((id) => <AgentCard key={id} id={id} />)}
          </div>
          <div style={{ fontFamily: FONT_HEADING, fontWeight: 700, fontSize: 18, color: TEXT, marginBottom: 8, textAlign: 'center' }}>
            Meet The Council.
          </div>
          <div style={{ fontSize: 13, color: MUTED, textAlign: 'center', lineHeight: 1.6, marginBottom: 36, fontFamily: FONT_BODY }}>
            Five advisors that pressure-test every decision. No operator acts without The Council's check.
          </div>
        </>
      )}

      <div style={{ display: 'flex', gap: 6, marginBottom: 20 }}>
        {[0, 1, 2].map((i) => (
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
        {step < 2 ? 'Continue' : 'Get Started'}
      </button>

      {step === 0 && (
        <button onClick={onComplete} style={{ marginTop: 16, marginBottom: 8, fontSize: 13, color: MUTED, fontFamily: FONT_BODY }}>
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

function ProspectActionChips({ content, onOpenImport }: { content: string; onOpenImport?: (p: ParsedProspect[]) => void }) {
  const prospects = extractProspects(content)
  const parsed = parseProspects(content)
  if (prospects.length === 0 && parsed.length === 0) return null
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
      {parsed.length > 0 && onOpenImport && (
        <button onClick={() => onOpenImport(parsed)} style={{ alignSelf: 'flex-start', marginTop: 2, display: 'inline-flex', alignItems: 'center', gap: 5, padding: '5px 14px', borderRadius: 20, border: `1px solid ${GOLD}60`, background: `${GOLD}10`, color: GOLD, fontSize: 12, fontFamily: FONT_HEADING, fontWeight: 600, cursor: 'pointer' }}>
          ＋ Import {parsed.length} lead{parsed.length !== 1 ? 's' : ''} to Pipeline
        </button>
      )}
    </div>
  )
}

// ─── SocialShareBar ───────────────────────────────────────────────────────────

type PostStatus = 'idle' | 'posting' | 'done' | 'error'
type BufferProfile = { id: string; service: string; username: string }

function SocialShareBar({ content, schedule = false }: { content: string; schedule?: boolean }) {
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
        body: JSON.stringify({ text: post, profileIds: profiles.map(p => p.id), now: !schedule }),
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

  const [liCopied, setLiCopied] = useState(false)
  const handleLinkedIn = useCallback(async () => {
    try { await navigator.clipboard.writeText(content) } catch { /* ignore */ }
    setLiCopied(true)
    setTimeout(() => setLiCopied(false), 3000)
    window.open('https://www.linkedin.com/post/new/', '_blank', 'noopener,noreferrer')
  }, [content])

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
                    {s === 'idle' && (schedule ? '📅 Schedule' : '↑ Post')}
                    {s === 'posting' && '…'}
                    {s === 'done' && (schedule ? '✓ Scheduled' : '✓ Posted')}
                    {s === 'error' && '✗ Failed'}
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        <a href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(content.slice(0, 280))}`} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '5px 12px', borderRadius: 20, border: `1px solid ${X_BLUE}40`, background: `${X_BLUE}08`, color: X_BLUE, fontSize: 12, fontFamily: FONT_BODY, fontWeight: 500, textDecoration: 'none' }}>
          𝕏 Post to X
        </a>
        <button onClick={handleLinkedIn} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '5px 12px', borderRadius: 20, border: `1px solid ${liCopied ? LI_BLUE : LI_BLUE + '60'}`, background: liCopied ? `${LI_BLUE}18` : `${LI_BLUE}10`, color: LI_BLUE, fontSize: 12, fontFamily: FONT_BODY, fontWeight: 500, cursor: 'pointer' }}>
          {liCopied ? '✓ Copied — paste in LinkedIn' : 'in Post to LinkedIn'}
        </button>
        <a href={`https://wa.me/?text=${encodeURIComponent(content.slice(0, 1500))}`} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '5px 12px', borderRadius: 20, border: `1px solid ${WA_GREEN}60`, background: `${WA_GREEN}10`, color: WA_GREEN, fontSize: 12, fontFamily: FONT_BODY, fontWeight: 500, textDecoration: 'none' }}>
          ✆ WhatsApp
        </a>
        <button onClick={handleCopy} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '5px 12px', borderRadius: 20, border: `1px solid ${copied ? GOLD + '80' : BORDER}`, background: copied ? `${GOLD}18` : SURFACE2, color: copied ? GOLD : MUTED, fontSize: 12, fontFamily: FONT_BODY, fontWeight: 500 }}>
          {copied ? '✓ Copied' : '📋 Copy'}
        </button>
      </div>
    </div>
  )
}

// ─── ProposalDownload ─────────────────────────────────────────────────────────

function ProposalDownload({ content }: { content: string }) {
  const download = () => {
    const escaped = content.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Ecstasy Technologies Proposal</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Georgia, 'Times New Roman', serif; max-width: 720px; margin: 48px auto; padding: 0 32px; color: #1a1a1a; line-height: 1.7; }
  .logo { font-family: Arial, sans-serif; font-weight: 800; font-size: 22px; color: #C8A96E; letter-spacing: 0.05em; margin-bottom: 2px; }
  .tagline { font-family: Arial, sans-serif; font-size: 13px; color: #888; margin-bottom: 40px; }
  pre { white-space: pre-wrap; font-family: Georgia, serif; font-size: 14px; line-height: 1.8; }
  .footer { margin-top: 56px; padding-top: 16px; border-top: 1px solid #e0e0e0; font-family: Arial, sans-serif; font-size: 11px; color: #aaa; display: flex; justify-content: space-between; }
  @media print { body { margin: 24px; } }
</style>
</head>
<body>
  <div class="logo">Ecstasy Technologies</div>
  <div class="tagline">ecstasytechnologies.com · Building software Africa trusts.</div>
  <pre>${escaped}</pre>
  <div class="footer"><span>Prepared by Ecstasy Technologies, Ghana</span><span>${new Date().toLocaleDateString('en-GH', { year: 'numeric', month: 'long', day: 'numeric' })}</span></div>
  <script>window.onload = () => { setTimeout(() => window.print(), 300) }</script>
</body>
</html>`
    const blob = new Blob([html], { type: 'text/html' })
    const url = URL.createObjectURL(blob)
    window.open(url, '_blank')
    setTimeout(() => URL.revokeObjectURL(url), 10000)
  }

  return (
    <div style={{ marginTop: 10, paddingLeft: 34 }}>
      <button onClick={download} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 14px', borderRadius: 20, border: `1px solid ${GOLD}60`, background: `${GOLD}10`, color: GOLD, fontSize: 12, fontFamily: FONT_BODY, fontWeight: 500, cursor: 'pointer' }}>
        ↓ Download Proposal PDF
      </button>
    </div>
  )
}

// ─── ChatMessage ──────────────────────────────────────────────────────────────

function ChatMessage({ message, agentId, isLast, onHandoff, onOpenImport }: {
  message: Message
  agentId?: AgentId
  isLast?: boolean
  onHandoff?: (targetAgent: AgentId, prompt: string) => void
  onOpenImport?: (p: ParsedProspect[]) => void
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
        <ProspectActionChips content={message.content} onOpenImport={onOpenImport} />
      )}
      {!isUser && isLast && (agentId === 'content' || agentId === 'viral') && (
        <SocialShareBar content={message.content} schedule={agentId === 'viral'} />
      )}
      {!isUser && isLast && agentId === 'scope' && (
        <ProposalDownload content={message.content} />
      )}
      {!isUser && isLast && agentId && onHandoff && (
        <HandoffChips agentId={agentId} content={message.content} onHandoff={onHandoff} />
      )}
    </div>
  )
}

// ─── ImportProspectsModal ─────────────────────────────────────────────────────

function ImportProspectsModal({ prospects, existingDeals, onImport, onClose }: {
  prospects: ParsedProspect[]
  existingDeals: Deal[]
  onImport: (selected: ParsedProspect[], followUpDays: number) => void
  onClose: () => void
}) {
  const [selected, setSelected] = useState<Set<number>>(() => new Set(prospects.map((_, i) => i)))
  const [followUpDays, setFollowUpDays] = useState(2)
  const [done, setDone] = useState(false)

  const existingPhones = new Set(existingDeals.map(d => d.phone?.replace(/\D/g, '')).filter(Boolean))
  const existingNames = new Set(existingDeals.map(d => d.name.toLowerCase().trim()))

  const dupType = (p: ParsedProspect): 'phone' | 'name' | null => {
    if (p.phone && existingPhones.has(p.phone.replace(/\D/g, ''))) return 'phone'
    if (existingNames.has(p.name.toLowerCase().trim())) return 'name'
    return null
  }

  const toggle = (i: number) => setSelected(prev => {
    const next = new Set(prev)
    if (next.has(i)) next.delete(i); else next.add(i)
    return next
  })

  const handleConfirm = () => {
    onImport(prospects.filter((_, i) => selected.has(i)), followUpDays)
    setDone(true)
    setTimeout(onClose, 1200)
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: '#00000090', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }} onClick={onClose}>
      <div style={{ background: SURFACE, borderRadius: 14, padding: 20, maxWidth: 460, width: '100%', maxHeight: '85vh', display: 'flex', flexDirection: 'column', border: `1px solid ${BORDER}` }} onClick={e => e.stopPropagation()}>

        {done ? (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10, padding: '30px 0' }}>
            <div style={{ fontSize: 32 }}>✓</div>
            <div style={{ fontFamily: FONT_HEADING, fontWeight: 700, fontSize: 15, color: GOLD }}>{selected.size} lead{selected.size !== 1 ? 's' : ''} imported</div>
            <div style={{ fontSize: 12, color: MUTED, fontFamily: FONT_BODY }}>Added to Found stage with {followUpDays}-day follow-up</div>
          </div>
        ) : (
          <>
            <div style={{ fontFamily: FONT_HEADING, fontWeight: 700, fontSize: 15, color: TEXT, marginBottom: 2 }}>Import to Pipeline</div>
            <div style={{ fontSize: 12, color: MUTED, fontFamily: FONT_BODY, marginBottom: 14 }}>{prospects.length} prospect{prospects.length !== 1 ? 's' : ''} parsed · tap to deselect</div>

            <div style={{ flex: 1, overflowY: 'auto', marginBottom: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {prospects.map((p, i) => {
                const dup = dupType(p)
                const on = selected.has(i)
                return (
                  <div key={i} onClick={() => toggle(i)} style={{ padding: '10px 12px', borderRadius: 10, border: `1px solid ${dup ? '#F59E0B40' : on ? `${GOLD}40` : BORDER}`, background: dup ? '#F59E0B06' : on ? `${GOLD}06` : SURFACE2, cursor: 'pointer', opacity: on ? 1 : 0.5 }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                      <div style={{ width: 17, height: 17, borderRadius: 4, border: `2px solid ${on ? GOLD : BORDER}`, background: on ? GOLD : 'transparent', flexShrink: 0, marginTop: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.12s' }}>
                        {on && <span style={{ color: '#fff', fontSize: 10, lineHeight: 1 }}>✓</span>}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontFamily: FONT_HEADING, fontWeight: 600, fontSize: 13, color: TEXT }}>{p.name}</div>
                        <div style={{ fontSize: 11, color: MUTED, fontFamily: FONT_BODY, marginTop: 1 }}>
                          {p.industry}{p.phone ? ` · ${p.phone}` : ''}{p.valueGHS > 0 ? ` · ₵${p.valueGHS.toLocaleString()}` : ''}
                        </div>
                        {p.address && <div style={{ fontSize: 11, color: MUTED, fontFamily: FONT_BODY, marginTop: 1 }}>{p.address}</div>}
                        {p.servicePitch && <div style={{ fontSize: 11, color: MUTED, fontFamily: FONT_BODY, marginTop: 1, fontStyle: 'italic' }}>{p.servicePitch}</div>}
                        {dup && <div style={{ fontSize: 10, color: '#F59E0B', fontFamily: FONT_BODY, marginTop: 3 }}>⚠ Possible duplicate ({dup === 'phone' ? 'same phone' : 'similar name'})</div>}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Follow-up selector */}
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 11, color: MUTED, fontFamily: FONT_BODY, marginBottom: 6 }}>Auto-schedule first follow-up in</div>
              <div style={{ display: 'flex', gap: 6 }}>
                {[1, 2, 3, 5, 7].map(d => (
                  <button key={d} onClick={() => setFollowUpDays(d)} style={{ flex: 1, padding: '6px 0', borderRadius: 16, border: `1px solid ${followUpDays === d ? GOLD : BORDER}`, background: followUpDays === d ? `${GOLD}15` : 'none', color: followUpDays === d ? GOLD : MUTED, fontSize: 11, fontFamily: FONT_HEADING, fontWeight: followUpDays === d ? 600 : 400, cursor: 'pointer' }}>
                    {d}d
                  </button>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={onClose} style={{ flex: 1, padding: '10px 0', border: `1px solid ${BORDER}`, borderRadius: 8, background: 'none', color: MUTED, fontSize: 13, fontFamily: FONT_BODY, cursor: 'pointer' }}>Cancel</button>
              <button onClick={handleConfirm} disabled={selected.size === 0} style={{ flex: 2, padding: '10px 0', border: 'none', borderRadius: 8, background: selected.size === 0 ? SURFACE2 : GOLD, color: selected.size === 0 ? MUTED : '#fff', fontSize: 13, fontFamily: FONT_HEADING, fontWeight: 600, cursor: selected.size === 0 ? 'default' : 'pointer', transition: 'background 0.15s' }}>
                Import {selected.size} Lead{selected.size !== 1 ? 's' : ''} →
              </button>
            </div>
          </>
        )}
      </div>
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
          Select an industry and location. ProspectBot searches Google and business directories to find real businesses without websites — with actual phone numbers.
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
        <IconPlay size={9} color={loading ? MUTED : GOLD} /> Run
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
      }}
    >
      {loading ? <><ThinkingDots /> Generating…</> : <><IconPlay color={BG} /> {label}</>}
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
          GHS {earned.toLocaleString()} / {MONTHLY_GOAL_GHS.toLocaleString()}
        </div>
      </div>
    </div>
  )
}

// ─── CommandCenter ────────────────────────────────────────────────────────────

// ─── ForecastCard ─────────────────────────────────────────────────────────────

function ForecastCard({ deals }: { deals: Deal[] }) {
  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
  const dayOfMonth = now.getDate()
  const daysLeft = daysInMonth - dayOfMonth

  const closedThisMonth = deals.filter(d => {
    if (d.stage !== 'closed') return false
    return new Date(d.stageChangedAt ?? d.createdAt) >= monthStart
  })
  const earned = closedThisMonth.reduce((s, d) => s + d.valueGHS, 0)
  const dailyRate = earned / Math.max(dayOfMonth, 1)
  const projected = Math.round(dailyRate * daysInMonth)
  const pct = Math.min(100, Math.round((projected / MONTHLY_GOAL_GHS) * 100))
  const gap = Math.max(0, MONTHLY_GOAL_GHS - earned)
  const avgDeal = closedThisMonth.length > 0 ? earned / closedThisMonth.length : 3750
  const dealsNeeded = Math.ceil(gap / avgDeal)

  return (
    <div style={{ margin: '10px 16px 0', padding: '12px 14px', borderRadius: 12, border: `1px solid ${BORDER}`, background: SURFACE2 }}>
      <div style={{ fontSize: 9, fontFamily: FONT_HEADING, fontWeight: 600, color: MUTED, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 8 }}>Month Forecast</div>
      <div style={{ background: BG, borderRadius: 4, height: 5, marginBottom: 10, overflow: 'hidden' }}>
        <div style={{ height: '100%', borderRadius: 4, background: GOLD, width: `${pct}%`, transition: 'width 0.5s ease' }} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
        <div>
          <span style={{ fontFamily: FONT_HEADING, fontWeight: 700, fontSize: 18, color: TEXT }}>GHS {projected.toLocaleString()}</span>
          <span style={{ fontSize: 11, color: MUTED, fontFamily: FONT_BODY, marginLeft: 5 }}>projected</span>
        </div>
        <span style={{ fontSize: 12, color: GOLD, fontFamily: FONT_HEADING, fontWeight: 700 }}>{pct}%</span>
      </div>
      <div style={{ fontSize: 11, color: MUTED, fontFamily: FONT_BODY, lineHeight: 1.55 }}>
        {earned === 0
          ? `No closed deals yet · need ~${dealsNeeded} deals at GHS ${Math.round(avgDeal).toLocaleString()} avg to hit goal`
          : gap <= 0
          ? '🎯 On track to hit GHS 12,000 this month!'
          : `GHS ${gap.toLocaleString()} gap · ~${dealsNeeded} more deal${dealsNeeded !== 1 ? 's' : ''} · ${daysLeft} day${daysLeft !== 1 ? 's' : ''} left`}
      </div>
    </div>
  )
}

function CommandCenter({ deals, earnedGHS, theme, onToggleTheme, notifToggle, onNavigate, onRunBrief, briefResult, briefLoading }: {
  deals: Deal[]
  earnedGHS: number
  theme: 'dark' | 'light'
  onToggleTheme: () => void
  notifToggle: React.ReactNode
  onNavigate: (v: ViewId) => void
  onRunBrief: () => void
  briefResult: string
  briefLoading: boolean
}) {
  const stageCounts = useMemo(() => {
    const c: Record<DealStage, number> = { found: 0, contacted: 0, interested: 0, proposal: 0, negotiating: 0, closed: 0, lost: 0 }
    deals.forEach(d => c[d.stage]++)
    return c
  }, [deals])

  const pipelineValue = deals.filter(d => d.stage !== 'closed').reduce((s, d) => s + d.valueGHS, 0)

  return (
    <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', paddingTop: 'max(48px, env(safe-area-inset-top))' } as React.CSSProperties}>
      <div style={{ padding: '16px 16px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <div>
          <div style={{ fontFamily: FONT_HEADING, fontWeight: 800, fontSize: 20, color: TEXT, letterSpacing: '-0.02em' }}>Command Center</div>
          <div style={{ fontSize: 12, color: MUTED, fontFamily: FONT_BODY, marginTop: 2 }}>Ecstasy Technologies · GHS 12,000 target</div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {notifToggle}
          <ThemeToggle theme={theme} onToggle={onToggleTheme} />
        </div>
      </div>

      {/* Goal + pipeline summary */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '8px 16px 0' }}>
        <GoalRing earned={earnedGHS} />
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: FONT_HEADING, fontSize: 11, color: MUTED, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Active Pipeline</div>
          <div style={{ fontFamily: FONT_HEADING, fontSize: 24, fontWeight: 700, color: TEXT, marginTop: 2 }}>
            GHS {pipelineValue.toLocaleString()}
          </div>
          <div style={{ fontSize: 12, color: MUTED, fontFamily: FONT_BODY, marginTop: 2 }}>
            {deals.filter(d => d.stage !== 'closed').length} open deals
          </div>
        </div>
      </div>

      {/* Stage chips */}
      <div style={{ display: 'flex', gap: 6, padding: '12px 16px 0', overflowX: 'auto' } as React.CSSProperties}>
        {STAGES.map(s => (
          <button key={s} onClick={() => onNavigate('pipeline')} style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            padding: '8px 14px', borderRadius: 10, flexShrink: 0, cursor: 'pointer',
            border: `1px solid ${s === 'closed' ? GOLD + '60' : BORDER}`,
            background: s === 'closed' ? `${GOLD}12` : SURFACE2,
          }}>
            <span style={{ fontFamily: FONT_HEADING, fontWeight: 700, fontSize: 18, color: s === 'closed' ? GOLD : TEXT }}>
              {stageCounts[s]}
            </span>
            <span style={{ fontSize: 9, color: MUTED, fontFamily: FONT_HEADING, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', whiteSpace: 'nowrap', marginTop: 2 }}>
              {STAGE_LABELS[s].replace(' ✓', '')}
            </span>
          </button>
        ))}
      </div>

      {/* Forecast */}
      <ForecastCard deals={deals} />

      {/* Morning Brief */}
      <div style={{ margin: '16px 16px 0', padding: 16, borderRadius: 12, border: `1px solid ${GOLD}40`, background: `${GOLD}08` }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: briefResult ? 12 : 0 }}>
          <div>
            <div style={{ fontFamily: FONT_HEADING, fontWeight: 700, fontSize: 14, color: TEXT }}>Morning Brief</div>
            <div style={{ fontSize: 11, color: MUTED, fontFamily: FONT_BODY, marginTop: 2 }}>Executor: today's 3 highest-leverage actions</div>
          </div>
          <button onClick={onRunBrief} disabled={briefLoading} style={{
            padding: '8px 16px', borderRadius: 8,
            background: briefLoading ? SURFACE2 : GOLD, color: briefLoading ? MUTED : BG,
            fontFamily: FONT_HEADING, fontWeight: 700, fontSize: 13,
            border: 'none', cursor: briefLoading ? 'not-allowed' : 'pointer', flexShrink: 0,
          }}>
            {briefLoading ? <ThinkingDots /> : <><IconPlay color={BG} size={10} /> Run</>}
          </button>
        </div>
        {briefResult && (
          <div style={{ fontSize: 13, color: TEXT, fontFamily: FONT_BODY, lineHeight: 1.65, whiteSpace: 'pre-wrap', borderTop: `1px solid ${BORDER}`, paddingTop: 10, maxHeight: 260, overflowY: 'auto' } as React.CSSProperties}>
            {briefResult}
          </div>
        )}
      </div>

      {/* Operator quick-access */}
      <div style={{ padding: '16px 16px 0' }}>
        <div style={{ fontSize: 9, fontFamily: FONT_HEADING, fontWeight: 600, color: MUTED, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 8 }}>Operators</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
          {MAIN_AGENT_IDS.map(id => {
            const a = AGENTS[id]
            return (
              <button key={id} onClick={() => onNavigate(id)} style={{
                padding: '12px 10px', borderRadius: 10, textAlign: 'left', cursor: 'pointer',
                border: `1px solid ${BORDER}`, background: SURFACE2,
                display: 'flex', flexDirection: 'column', gap: 4,
              }}>
                <span style={{ fontSize: 20 }}>{a.icon}</span>
                <span style={{ fontFamily: FONT_HEADING, fontWeight: 600, fontSize: 12, color: TEXT }}>{a.short}</span>
                <span style={{ fontSize: 10, color: MUTED, fontFamily: FONT_BODY, lineHeight: 1.3 }}>{a.description}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Council quick-access */}
      <div style={{ padding: '12px 16px 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <div style={{ fontSize: 9, fontFamily: FONT_HEADING, fontWeight: 600, color: MUTED, letterSpacing: '0.12em', textTransform: 'uppercase' }}>The Council</div>
          <button onClick={() => onNavigate('council')} style={{ fontSize: 10, padding: '3px 10px', borderRadius: 10, border: `1px solid ${GOLD}50`, background: `${GOLD}10`, color: GOLD, fontFamily: FONT_HEADING, fontWeight: 600, cursor: 'pointer', letterSpacing: '0.04em' }}>
            ⊙ Open Chamber
          </button>
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {COUNCIL_AGENT_IDS.map(id => {
            const a = AGENTS[id]
            return (
              <button key={id} onClick={() => onNavigate(id)} style={{
                padding: '6px 12px', borderRadius: 20, cursor: 'pointer',
                border: `1px solid ${BORDER}`, background: 'transparent',
                display: 'flex', alignItems: 'center', gap: 6,
              }}>
                <span style={{ fontSize: 14, color: MUTED }}>{a.icon}</span>
                <span style={{ fontFamily: FONT_HEADING, fontSize: 11, fontWeight: 500, color: MUTED }}>{a.short}</span>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ─── WhatsAppModal ────────────────────────────────────────────────────────────

function WhatsAppModal({ deal, onClose, onSent }: {
  deal: Deal
  onClose: () => void
  onSent: (id: string, text: string) => void
}) {
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)

  const generate = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          systemPrompt: 'You are ContentBot for Ecstasy Technologies, a web design and development company in Accra, Ghana. Write concise, friendly WhatsApp messages for prospect outreach. Output only the message body — no subject line, no labels.',
          messages: [{ role: 'user', content: `Write a WhatsApp cold-open message for this prospect:\n\nBusiness: ${deal.name}\nIndustry: ${deal.industry || 'unknown'}\nEstimated value: GHS ${deal.valueGHS.toLocaleString()}\nStage: ${STAGE_LABELS[deal.stage]}\n\nRequirements:\n- 3–4 sentences, friendly and direct\n- Briefly introduce Ecstasy Technologies\n- Reference something specific to their industry\n- End with a soft CTA (not pushy)\n- No emojis unless natural` }],
        }),
      })
      const d = await res.json()
      setMessage(d.text ?? '')
    } finally { setLoading(false) }
  }

  const copy = async () => {
    try { await navigator.clipboard.writeText(message) } catch { /* fallback: user copies manually */ }
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const send = () => {
    if (!deal.phone) return
    const digits = deal.phone.replace(/\D/g, '')
    const num = digits.startsWith('0') ? '233' + digits.slice(1) : digits
    const url = message ? `https://wa.me/${num}?text=${encodeURIComponent(message)}` : `https://wa.me/${num}`
    window.open(url, '_blank')
    if (message) onSent(deal.id, message)
    onClose()
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 300, display: 'flex', alignItems: 'flex-end' }}>
      <div style={{ background: SURFACE, borderRadius: '16px 16px 0 0', width: '100%', maxHeight: '85vh', display: 'flex', flexDirection: 'column', padding: '20px 20px 28px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <div>
            <div style={{ fontFamily: FONT_HEADING, fontWeight: 700, fontSize: 15, color: TEXT }}>WhatsApp Message</div>
            <div style={{ fontSize: 12, color: MUTED, fontFamily: FONT_BODY, marginTop: 2 }}>{deal.name}</div>
          </div>
          <button onClick={onClose} style={{ fontSize: 18, color: MUTED, background: 'none', border: 'none', cursor: 'pointer', padding: '0 2px' }}>✕</button>
        </div>

        <textarea
          value={message}
          onChange={e => setMessage(e.target.value)}
          placeholder="Type or generate a WhatsApp message…"
          rows={6}
          style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: `1px solid ${BORDER}`, background: SURFACE2, color: TEXT, fontSize: 14, fontFamily: FONT_BODY, resize: 'none', outline: 'none', lineHeight: 1.6, boxSizing: 'border-box', marginBottom: 12 }}
        />

        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={generate} disabled={loading} style={{ flex: 1, padding: '9px 10px', borderRadius: 8, border: `1px solid ${BORDER}`, background: SURFACE2, color: TEXT, fontFamily: FONT_HEADING, fontSize: 12, fontWeight: 500, cursor: loading ? 'wait' : 'pointer', opacity: loading ? 0.6 : 1 }}>
            {loading ? 'Generating…' : '✦ Generate'}
          </button>
          <button onClick={copy} disabled={!message} style={{ padding: '9px 14px', borderRadius: 8, border: `1px solid ${BORDER}`, background: copied ? `${GOLD}15` : SURFACE2, color: copied ? GOLD : TEXT, fontFamily: FONT_HEADING, fontSize: 12, fontWeight: 500, cursor: 'pointer', opacity: message ? 1 : 0.4 }}>
            {copied ? 'Copied!' : 'Copy'}
          </button>
          <button onClick={send} disabled={!deal.phone} style={{ flex: 1, padding: '9px 10px', borderRadius: 8, border: 'none', background: WA_GREEN, color: '#fff', fontFamily: FONT_HEADING, fontSize: 12, fontWeight: 700, cursor: deal.phone ? 'pointer' : 'not-allowed', opacity: deal.phone ? 1 : 0.5 }}>
            Send on WhatsApp
          </button>
        </div>

        {!deal.phone && (
          <div style={{ marginTop: 8, fontSize: 12, color: '#e05c5c', fontFamily: FONT_BODY }}>No phone number — add one to this deal to send directly.</div>
        )}

        {(deal.whatsappHistory?.length ?? 0) > 0 && (
          <div style={{ marginTop: 16, borderTop: `1px solid ${BORDER}`, paddingTop: 12, overflowY: 'auto' }}>
            <div style={{ fontSize: 10, fontFamily: FONT_HEADING, fontWeight: 600, color: MUTED, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>Sent</div>
            {deal.whatsappHistory!.slice().reverse().map((h, i) => (
              <div key={i} style={{ marginBottom: 8, padding: '8px 10px', borderRadius: 8, background: SURFACE2, border: `1px solid ${BORDER}` }}>
                <div style={{ fontSize: 10, color: MUTED, fontFamily: FONT_BODY, marginBottom: 3 }}>
                  {new Date(h.sentAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                </div>
                <div style={{ fontSize: 13, color: TEXT, fontFamily: FONT_BODY, lineHeight: 1.5 }}>{h.text}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── DealCard ─────────────────────────────────────────────────────────────────

function DealCard({ deal, onDelete, onUpdate, onOpenAgent, onPublishToWebsite, onSetFollowUp, onWhatsApp, isDragging, onDragStart, onDragEnd }: {
  deal: Deal
  onDelete: (id: string) => void
  onUpdate: (id: string, updates: Partial<Deal>) => void
  onOpenAgent: (agentId: AgentId, prompt: string) => void
  onPublishToWebsite: (deal: Deal) => void
  onSetFollowUp: (id: string, ts: number | undefined) => void
  onWhatsApp: (deal: Deal) => void
  isDragging: boolean
  onDragStart: () => void
  onDragEnd: () => void
}) {
  const now = Date.now()
  const isOverdue = !!deal.followUpAt && deal.followUpAt < now
  const staleMs = STAGE_STALE_MS[deal.stage]
  const isStale = staleMs > 0 && (now - (deal.stageChangedAt ?? deal.createdAt)) > staleMs
  const followUpLabel = deal.followUpAt
    ? new Date(deal.followUpAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
    : null

  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData('dealId', deal.id)
        e.dataTransfer.effectAllowed = 'move'
        onDragStart()
      }}
      onDragEnd={onDragEnd}
      style={{
        padding: '10px 11px', borderRadius: 10, cursor: 'grab',
        border: `1px solid ${isStale ? '#e05c5c50' : deal.stage === 'closed' ? `${GOLD}60` : BORDER}`,
        background: deal.stage === 'lost' ? SURFACE2 : deal.stage === 'closed' ? `${GOLD}08` : SURFACE,
        opacity: isDragging ? 0.35 : 1,
        transition: 'opacity 0.15s',
        userSelect: 'none', WebkitUserSelect: 'none',
      } as React.CSSProperties}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 6 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: FONT_HEADING, fontWeight: 600, fontSize: 13, color: deal.stage === 'lost' ? MUTED : TEXT, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{deal.name}</div>
          {deal.industry && <div style={{ fontSize: 11, color: MUTED, fontFamily: FONT_BODY, marginTop: 1 }}>{deal.industry}</div>}
          <div style={{ fontFamily: FONT_HEADING, fontSize: 13, fontWeight: 700, color: deal.stage === 'closed' ? GOLD : deal.stage === 'lost' ? MUTED : TEXT, marginTop: 3 }}>
            GHS {deal.valueGHS.toLocaleString()}
          </div>
        </div>
        <button onClick={() => onDelete(deal.id)} style={{ width: 22, height: 22, flexShrink: 0, borderRadius: 5, border: `1px solid ${BORDER}`, background: 'transparent', color: MUTED, fontSize: 10, cursor: 'pointer' }}>✕</button>
      </div>

      {isStale && (
        <div style={{ marginTop: 5, display: 'flex', alignItems: 'center', gap: 3, fontSize: 10, color: '#e05c5c', fontFamily: FONT_BODY }}>
          <IconWarning size={10} color="#e05c5c" /> Stale — no movement
        </div>
      )}

      <button
        onClick={() => onWhatsApp(deal)}
        style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 6, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
      >
        <span style={{ fontSize: 11, color: deal.phone ? WA_GREEN : MUTED, fontFamily: FONT_BODY }}>
          {deal.phone ?? '+ Add WhatsApp'}
        </span>
        {deal.lastContactedAt && (
          <span style={{ fontSize: 10, color: MUTED, fontFamily: FONT_BODY }}>
            · {new Date(deal.lastContactedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
          </span>
        )}
      </button>

      {followUpLabel && (
        <div style={{ marginTop: 5, display: 'flex', alignItems: 'center', gap: 3, fontSize: 10, color: isOverdue ? '#e05c5c' : MUTED, fontFamily: FONT_BODY }}>
          {isOverdue ? <IconWarning size={10} color="#e05c5c" /> : <IconBellSmall color={MUTED} />}
          {isOverdue ? 'Overdue · ' : ''}{followUpLabel}
          <button onClick={() => onSetFollowUp(deal.id, undefined)} style={{ marginLeft: 2, fontSize: 9, color: MUTED, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>✕</button>
        </div>
      )}

      <div style={{ display: 'flex', gap: 4, marginTop: 8, flexWrap: 'wrap' }}>
        <button onClick={() => onOpenAgent('content', `Write a WhatsApp pitch for:\nBusiness: ${deal.name}\nIndustry: ${deal.industry}\nValue: GHS ${deal.valueGHS}\nStage: ${STAGE_LABELS[deal.stage]}`)} style={{ fontSize: 10, padding: '3px 7px', borderRadius: 10, border: `1px solid ${BORDER}`, background: 'transparent', color: MUTED, fontFamily: FONT_BODY, cursor: 'pointer' }}>
          Pitch
        </button>
        <button onClick={() => onOpenAgent('scope', `Scope this: ${deal.name} (${deal.industry || 'general'}, GHS ${deal.valueGHS})`)} style={{ fontSize: 10, padding: '3px 7px', borderRadius: 10, border: `1px solid ${BORDER}`, background: 'transparent', color: MUTED, fontFamily: FONT_BODY, cursor: 'pointer' }}>
          Scope
        </button>
        <a href={`https://www.google.com/maps/search/${encodeURIComponent(`${deal.name}${deal.industry ? ' ' + deal.industry : ''} Ghana`)}`} target="_blank" rel="noopener noreferrer" style={{ fontSize: 10, padding: '3px 7px', borderRadius: 10, border: `1px solid ${BORDER}`, background: 'transparent', color: MUTED, fontFamily: FONT_BODY, cursor: 'pointer', textDecoration: 'none' }}>
          📍 Maps
        </a>
        <label style={{ fontSize: 10, padding: '3px 7px', borderRadius: 10, border: `1px solid ${BORDER}`, background: 'transparent', color: MUTED, fontFamily: FONT_BODY, cursor: 'pointer' }}>
          {followUpLabel ? '+ Change' : '+ Follow-up'}
          <input type="date" style={{ position: 'absolute', opacity: 0, width: 0, height: 0, pointerEvents: 'none' }}
            value={deal.followUpAt ? new Date(deal.followUpAt).toISOString().split('T')[0] : ''}
            onChange={e => onSetFollowUp(deal.id, e.target.value ? new Date(e.target.value).getTime() : undefined)} />
        </label>
        {deal.stage === 'closed' && (
          <button onClick={() => onPublishToWebsite(deal)} style={{ fontSize: 10, padding: '3px 7px', borderRadius: 10, border: `1px solid ${GOLD}60`, background: `${GOLD}10`, color: GOLD, fontFamily: FONT_BODY, cursor: 'pointer' }}>
            ↑ Portfolio
          </button>
        )}
      </div>
    </div>
  )
}

// ─── DealPipeline (Kanban) ────────────────────────────────────────────────────

function DealPipeline({ deals, onAdd, onMove, onDelete, onUpdate, onOpenAgent, onPublishToWebsite, onSetFollowUp }: {
  deals: Deal[]
  onAdd: (d: Omit<Deal, 'id' | 'createdAt'>) => void
  onMove: (id: string, stage: DealStage) => void
  onDelete: (id: string) => void
  onUpdate: (id: string, updates: Partial<Deal>) => void
  onOpenAgent: (agentId: AgentId, prompt: string) => void
  onPublishToWebsite: (deal: Deal) => void
  onSetFollowUp: (id: string, ts: number | undefined) => void
}) {
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name: '', industry: '', valueGHS: '', phone: '' })
  const [dragId, setDragId] = useState<string | null>(null)
  const [dropStage, setDropStage] = useState<DealStage | null>(null)
  const [waModal, setWaModal] = useState<Deal | null>(null)

  const handleSubmit = () => {
    if (!form.name) return
    onAdd({ name: form.name, industry: form.industry, valueGHS: parseInt(form.valueGHS, 10) || 0, stage: 'found', phone: form.phone || undefined })
    setForm({ name: '', industry: '', valueGHS: '', phone: '' })
    setShowForm(false)
  }

  const handleWaSent = (id: string, text: string) => {
    const deal = deals.find(d => d.id === id)
    if (!deal) return
    onUpdate(id, {
      lastContactedAt: Date.now(),
      whatsappHistory: [...(deal.whatsappHistory ?? []), { text, sentAt: Date.now() }],
    })
  }

  const closedValue = deals.filter(d => d.stage === 'closed').reduce((s, d) => s + d.valueGHS, 0)
  const forecast = Math.round(deals.reduce((s, d) => s + d.valueGHS * STAGE_WEIGHT[d.stage], 0))
  const inputStyle: React.CSSProperties = { padding: '8px 12px', borderRadius: 8, border: `1px solid ${BORDER}`, background: SURFACE2, color: TEXT, fontSize: 14, fontFamily: FONT_BODY, outline: 'none', width: '100%', boxSizing: 'border-box' }

  const overdueDeals = deals.filter(d => d.followUpAt && d.followUpAt < Date.now() && d.stage !== 'closed' && d.stage !== 'lost')

  const exportDealsCSV = () => {
    const rows = [
      ['Name', 'Industry', 'Stage', 'Value (GHS)', 'Phone', 'Follow-up', 'Last Contacted', 'Created'],
      ...deals.map(d => [
        d.name, d.industry, STAGE_LABELS[d.stage], String(d.valueGHS), d.phone ?? '',
        d.followUpAt ? new Date(d.followUpAt).toLocaleDateString('en-GB') : '',
        d.lastContactedAt ? new Date(d.lastContactedAt).toLocaleDateString('en-GB') : '',
        new Date(d.createdAt).toLocaleDateString('en-GB'),
      ])
    ]
    downloadCSV(`tagett-deals-${new Date().toISOString().slice(0,10)}.csv`, rows)
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      {/* Overdue follow-up banner */}
      {overdueDeals.length > 0 && (
        <div style={{ padding: '8px 16px', background: `${GOLD}15`, borderBottom: `1px solid ${GOLD}40`, display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          <span style={{ fontSize: 14 }}>⏰</span>
          <span style={{ flex: 1, fontSize: 12, color: GOLD, fontFamily: FONT_HEADING, fontWeight: 600 }}>
            {overdueDeals.length} overdue follow-up{overdueDeals.length > 1 ? 's' : ''}: {overdueDeals.map(d => d.name).join(', ')}
          </span>
        </div>
      )}
      {/* Header */}
      <div style={{ padding: '14px 16px 10px', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontFamily: FONT_HEADING, fontWeight: 700, fontSize: 16, color: TEXT }}>Pipeline</div>
            <div style={{ fontSize: 12, color: MUTED, fontFamily: FONT_BODY, marginTop: 1 }}>
              GHS {closedValue.toLocaleString()} closed · Forecast GHS {forecast.toLocaleString()}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <button onClick={exportDealsCSV} title="Export CSV" style={{ padding: '7px 10px', borderRadius: 8, background: SURFACE2, color: MUTED, fontFamily: FONT_HEADING, fontWeight: 600, fontSize: 12, border: `1px solid ${BORDER}`, cursor: 'pointer' }}>
              ↓ CSV
            </button>
            <button onClick={() => setShowForm(v => !v)} style={{ padding: '7px 14px', borderRadius: 8, background: GOLD, color: '#fff', fontFamily: FONT_HEADING, fontWeight: 700, fontSize: 13, border: 'none', cursor: 'pointer' }}>
              + Deal
            </button>
          </div>
        </div>

        {showForm && (
          <div style={{ marginTop: 12, padding: 12, borderRadius: 10, border: `1px solid ${GOLD}40`, background: `${GOLD}06`, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Business name *" style={inputStyle} />
            <input value={form.industry} onChange={e => setForm(p => ({ ...p, industry: e.target.value }))} placeholder="Industry" style={inputStyle} />
            <input value={form.valueGHS} onChange={e => setForm(p => ({ ...p, valueGHS: e.target.value }))} placeholder="Value (GHS)" type="number" style={inputStyle} />
            <input value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} placeholder="Phone (+233…)" style={inputStyle} />
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={handleSubmit} style={{ flex: 1, padding: '9px', borderRadius: 8, background: GOLD, color: '#fff', fontFamily: FONT_HEADING, fontWeight: 700, fontSize: 13, border: 'none', cursor: 'pointer' }}>Add</button>
              <button onClick={() => setShowForm(false)} style={{ padding: '9px 14px', borderRadius: 8, background: SURFACE2, color: MUTED, fontFamily: FONT_BODY, fontSize: 13, border: `1px solid ${BORDER}`, cursor: 'pointer' }}>Cancel</button>
            </div>
          </div>
        )}
      </div>

      {/* Kanban board */}
      <div style={{ flex: 1, minHeight: 0, overflowX: 'auto', overflowY: 'hidden', display: 'flex', padding: '0 12px 16px', gap: 10, WebkitOverflowScrolling: 'touch' } as React.CSSProperties}>
        {STAGES.map(stage => {
          const stageDeals = deals.filter(d => d.stage === stage)
          const stageValue = stageDeals.reduce((s, d) => s + d.valueGHS, 0)
          const col = STAGE_COLOR[stage]
          const isTarget = dropStage === stage

          return (
            <div
              key={stage}
              onDragOver={e => { e.preventDefault(); setDropStage(stage) }}
              onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setDropStage(null) }}
              onDrop={e => {
                e.preventDefault()
                const id = e.dataTransfer.getData('dealId')
                if (id) onMove(id, stage)
                setDragId(null); setDropStage(null)
              }}
              style={{
                flexShrink: 0, width: 204, display: 'flex', flexDirection: 'column',
                borderRadius: 12,
                border: `1.5px solid ${isTarget ? col : BORDER}`,
                background: isTarget ? `${col}0C` : SURFACE2,
                transition: 'border-color 0.15s, background 0.15s',
              }}
            >
              {/* Column header */}
              <div style={{ padding: '10px 12px 8px', flexShrink: 0, borderBottom: `1px solid ${BORDER}` }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{ width: 7, height: 7, borderRadius: '50%', background: col, flexShrink: 0 }} />
                  <div style={{ fontFamily: FONT_HEADING, fontSize: 10, fontWeight: 700, color: TEXT, textTransform: 'uppercase', letterSpacing: '0.07em', flex: 1 }}>
                    {STAGE_LABELS[stage]}
                  </div>
                  <span style={{ fontSize: 10, color: MUTED, fontFamily: FONT_BODY, background: SURFACE, borderRadius: 10, padding: '1px 6px', border: `1px solid ${BORDER}` }}>
                    {stageDeals.length}
                  </span>
                </div>
                {stageValue > 0 && (
                  <div style={{ fontSize: 11, color: col, fontFamily: FONT_HEADING, fontWeight: 600, marginTop: 4 }}>
                    GHS {stageValue.toLocaleString()}
                  </div>
                )}
              </div>

              {/* Cards */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '8px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                {stageDeals.length === 0 && (
                  <div style={{ fontSize: 11, color: MUTED, fontFamily: FONT_BODY, padding: '12px 4px', opacity: 0.4, textAlign: 'center' }}>
                    Drop here
                  </div>
                )}
                {stageDeals.map(deal => (
                  <DealCard
                    key={deal.id}
                    deal={deal}
                    onDelete={onDelete}
                    onUpdate={onUpdate}
                    onOpenAgent={onOpenAgent}
                    onPublishToWebsite={onPublishToWebsite}
                    onSetFollowUp={onSetFollowUp}
                    onWhatsApp={d => setWaModal(d)}
                    isDragging={dragId === deal.id}
                    onDragStart={() => setDragId(deal.id)}
                    onDragEnd={() => { setDragId(null); setDropStage(null) }}
                  />
                ))}
              </div>
            </div>
          )
        })}
      </div>

      {waModal && (
        <WhatsAppModal deal={waModal} onClose={() => setWaModal(null)} onSent={handleWaSent} />
      )}
    </div>
  )
}

// ─── InvoicesView ────────────────────────────────────────────────────────────

const INV_STATUS_LABEL: Record<Invoice['status'], string> = {
  draft: 'Draft', sent: 'Sent', partial: 'Part Paid', paid: 'Paid',
}
const INV_STATUS_COLOR: Record<Invoice['status'], string> = {
  draft: '#6B7280', sent: '#3B82F6', partial: '#F59E0B', paid: '#10B981',
}

function InvoicesView({ deals }: { deals: Deal[] }) {
  const [invoices, setInvoices] = useState<Invoice[]>(loadInvoices)
  const [tab, setTab] = useState<'all' | 'pending' | 'paid'>('all')
  const [showForm, setShowForm] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [payModal, setPayModal] = useState<{ invoiceId: string; milestone: InvoiceMilestone } | null>(null)
  const [payForm, setPayForm] = useState({ method: 'Momo', notes: '' })
  const [form, setForm] = useState({ clientName: '', description: '', totalGHS: '', dealId: '', dueDate: '', notes: '' })

  useEffect(() => { saveInvoices(invoices) }, [invoices])

  // Hydrate from Supabase on mount
  useEffect(() => {
    fetch('/api/invoices', { cache: 'no-store' })
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (Array.isArray(d) && d.length > 0) { setInvoices(d); saveInvoices(d) } })
      .catch(() => {})
  }, [])

  // Debounced sync to Supabase on every change
  const invoiceSyncRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => {
    if (invoiceSyncRef.current) clearTimeout(invoiceSyncRef.current)
    invoiceSyncRef.current = setTimeout(() => {
      fetch('/api/invoices', {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(invoices),
      }).catch(() => {})
    }, 1500)
  }, [invoices])

  const createInvoice = () => {
    if (!form.clientName || !form.totalGHS) return
    const total = parseInt(form.totalGHS, 10) || 0
    const dep = Math.round(total * 0.5)
    const inv: Invoice = {
      id: Date.now().toString(),
      clientName: form.clientName,
      description: form.description,
      dealId: form.dealId || undefined,
      totalGHS: total,
      status: 'draft',
      createdAt: Date.now(),
      dueAt: form.dueDate ? new Date(form.dueDate).getTime() : undefined,
      notes: form.notes || undefined,
      milestones: [
        { id: '1', label: 'Deposit (50%)', amountGHS: dep },
        { id: '2', label: 'Balance (50%)', amountGHS: total - dep },
      ],
    }
    setInvoices(prev => [...prev, inv])
    setForm({ clientName: '', description: '', totalGHS: '', dealId: '', dueDate: '', notes: '' })
    setShowForm(false)
    setExpandedId(inv.id)
  }

  const recordPayment = () => {
    if (!payModal) return
    const { invoiceId, milestone } = payModal
    setInvoices(prev => prev.map(inv => {
      if (inv.id !== invoiceId) return inv
      const milestones = inv.milestones.map(m =>
        m.id === milestone.id ? { ...m, paidAt: Date.now(), paymentMethod: payForm.method, notes: payForm.notes || undefined } : m
      )
      const paidCount = milestones.filter(m => m.paidAt).length
      const status: Invoice['status'] = paidCount === milestones.length ? 'paid' : paidCount > 0 ? 'partial' : inv.status
      return { ...inv, milestones, status }
    }))
    setPayModal(null)
    setPayForm({ method: 'Momo', notes: '' })
  }

  const unpayMilestone = (invoiceId: string, milestoneId: string) => {
    setInvoices(prev => prev.map(inv => {
      if (inv.id !== invoiceId) return inv
      const milestones = inv.milestones.map(m => m.id === milestoneId ? { ...m, paidAt: undefined, paymentMethod: undefined, notes: undefined } : m)
      const paidCount = milestones.filter(m => m.paidAt).length
      const status: Invoice['status'] = paidCount === milestones.length ? 'paid' : paidCount > 0 ? 'partial' : 'sent'
      return { ...inv, milestones, status }
    }))
  }

  const markSent = (id: string) => {
    setInvoices(prev => prev.map(inv => inv.id === id ? { ...inv, status: 'sent', sentAt: Date.now() } : inv))
  }

  const deleteInvoice = (id: string) => setInvoices(prev => prev.filter(inv => inv.id !== id))

  const printInvoice = (inv: Invoice) => {
    const html = `<!DOCTYPE html><html><head><title>Invoice — ${inv.clientName}</title>
<style>body{font-family:Arial,sans-serif;padding:48px;max-width:700px;margin:0 auto;color:#111}
h1{color:#E84040;font-size:28px;margin-bottom:4px}
.company{color:#666;font-size:13px;margin-bottom:28px}
.meta{margin-bottom:24px;font-size:14px;line-height:1.8}
table{width:100%;border-collapse:collapse;margin:20px 0}
th{background:#f5f5f5;padding:10px 12px;text-align:left;font-size:12px;text-transform:uppercase;letter-spacing:0.05em}
td{padding:10px 12px;border-bottom:1px solid #eee;font-size:14px}
.total-row td{font-weight:700;font-size:16px;border-top:2px solid #111;border-bottom:none}
.paid{color:#10B981}.pending{color:#F59E0B}
.footer{margin-top:32px;font-size:12px;color:#999}
@media print{body{padding:24px}}</style></head><body>
<h1>INVOICE</h1>
<div class="company">Ecstasy Technologies · ecstasytechnologies.com · info@ecstasytechnologies.com</div>
<div class="meta">
<strong>Billed to:</strong> ${inv.clientName}<br>
${inv.description ? `<strong>Project:</strong> ${inv.description}<br>` : ''}
<strong>Date:</strong> ${new Date(inv.createdAt).toLocaleDateString('en-GB',{day:'numeric',month:'long',year:'numeric'})}<br>
${inv.dueAt ? `<strong>Due:</strong> ${new Date(inv.dueAt).toLocaleDateString('en-GB',{day:'numeric',month:'long',year:'numeric'})}<br>` : ''}
</div>
<table>
<tr><th>Milestone</th><th>Amount (GHS)</th><th>Status</th></tr>
${inv.milestones.map(m=>`<tr><td>${m.label}</td><td>${m.amountGHS.toLocaleString()}</td>
<td class="${m.paidAt?'paid':'pending'}">${m.paidAt?`✓ Paid ${new Date(m.paidAt).toLocaleDateString('en-GB')} · ${m.paymentMethod??''}`:m.notes??'Pending'}</td></tr>`).join('')}
<tr class="total-row"><td>Total</td><td>${inv.totalGHS.toLocaleString()}</td><td></td></tr>
</table>
${inv.notes?`<p style="font-size:13px;color:#555">${inv.notes}</p>`:''}
<div class="footer">Thank you for your business! · Payment via Mobile Money or Bank Transfer</div>
</body></html>`
    const w = window.open('', '_blank')
    if (w) { w.document.write(html); w.document.close(); setTimeout(() => w.print(), 500) }
  }

  const totalInvoiced = invoices.reduce((s, inv) => s + inv.totalGHS, 0)
  const totalCollected = invoices.reduce((s, inv) =>
    s + inv.milestones.filter(m => m.paidAt).reduce((ms, m) => ms + m.amountGHS, 0), 0)
  const outstanding = totalInvoiced - totalCollected

  const filtered = invoices.filter(inv =>
    tab === 'pending' ? inv.status !== 'paid' : tab === 'paid' ? inv.status === 'paid' : true
  )

  const inputStyle: React.CSSProperties = { padding: '8px 12px', borderRadius: 8, border: `1px solid ${BORDER}`, background: SURFACE2, color: TEXT, fontSize: 14, fontFamily: FONT_BODY, outline: 'none', width: '100%', boxSizing: 'border-box' }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      {/* Stats header */}
      <div style={{ padding: '14px 16px 10px', flexShrink: 0, borderBottom: `1px solid ${BORDER}` }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <div style={{ fontFamily: FONT_HEADING, fontWeight: 700, fontSize: 16, color: TEXT }}>Invoices</div>
          <div style={{ display: 'flex', gap: 6 }}>
            <button onClick={() => {
              const rows = [
                ['Client', 'Description', 'Total GHS', 'Collected GHS', 'Outstanding GHS', 'Status', 'Created', 'Due'],
                ...invoices.map(inv => {
                  const collected = inv.milestones.filter(m => m.paidAt).reduce((s, m) => s + m.amountGHS, 0)
                  return [inv.clientName, inv.description, String(inv.totalGHS), String(collected), String(inv.totalGHS - collected), inv.status, new Date(inv.createdAt).toLocaleDateString('en-GB'), inv.dueAt ? new Date(inv.dueAt).toLocaleDateString('en-GB') : '']
                })
              ]
              downloadCSV(`tagett-invoices-${new Date().toISOString().slice(0,10)}.csv`, rows)
            }} title="Export CSV" style={{ padding: '7px 10px', borderRadius: 8, background: SURFACE2, color: MUTED, fontFamily: FONT_HEADING, fontWeight: 600, fontSize: 12, border: `1px solid ${BORDER}`, cursor: 'pointer' }}>
              ↓ CSV
            </button>
            <button onClick={() => setShowForm(v => !v)} style={{ padding: '7px 14px', borderRadius: 8, background: GOLD, color: '#fff', fontFamily: FONT_HEADING, fontWeight: 700, fontSize: 13, border: 'none', cursor: 'pointer' }}>
              + Invoice
            </button>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          {[['Invoiced', totalInvoiced, TEXT], ['Collected', totalCollected, '#10B981'], ['Outstanding', outstanding, outstanding > 0 ? GOLD : MUTED]].map(([label, val, color]) => (
            <div key={label as string} style={{ flex: 1, padding: '8px 10px', borderRadius: 10, background: SURFACE2, border: `1px solid ${BORDER}` }}>
              <div style={{ fontSize: 9, fontFamily: FONT_HEADING, fontWeight: 600, color: MUTED, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{label}</div>
              <div style={{ fontSize: 14, fontFamily: FONT_HEADING, fontWeight: 700, color: color as string, marginTop: 2 }}>GHS {(val as number).toLocaleString()}</div>
            </div>
          ))}
        </div>

        {showForm && (
          <div style={{ marginTop: 12, padding: 14, borderRadius: 10, border: `1px solid ${GOLD}40`, background: `${GOLD}06`, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <input value={form.clientName} onChange={e => setForm(p => ({ ...p, clientName: e.target.value }))} placeholder="Client name *" style={inputStyle} />
            <input value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder="Project description" style={inputStyle} />
            <input value={form.totalGHS} onChange={e => setForm(p => ({ ...p, totalGHS: e.target.value }))} placeholder="Total value (GHS) *" type="number" style={inputStyle} />
            <select value={form.dealId} onChange={e => setForm(p => ({ ...p, dealId: e.target.value }))} style={{ ...inputStyle }}>
              <option value="">Link to deal (optional)</option>
              {deals.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
            <input value={form.dueDate} onChange={e => setForm(p => ({ ...p, dueDate: e.target.value }))} type="date" placeholder="Due date" style={inputStyle} />
            <textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} placeholder="Notes / payment terms" rows={2} style={{ ...inputStyle, resize: 'none', lineHeight: 1.5 }} />
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={createInvoice} style={{ flex: 1, padding: '9px', borderRadius: 8, background: GOLD, color: '#fff', fontFamily: FONT_HEADING, fontWeight: 700, fontSize: 13, border: 'none', cursor: 'pointer' }}>Create</button>
              <button onClick={() => setShowForm(false)} style={{ padding: '9px 14px', borderRadius: 8, background: SURFACE2, color: MUTED, fontFamily: FONT_BODY, fontSize: 13, border: `1px solid ${BORDER}`, cursor: 'pointer' }}>Cancel</button>
            </div>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: `1px solid ${BORDER}`, flexShrink: 0 }}>
        {(['all', 'pending', 'paid'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} style={{ flex: 1, height: 36, fontFamily: FONT_HEADING, fontSize: 12, fontWeight: tab === t ? 600 : 400, color: tab === t ? GOLD : MUTED, borderBottom: `2px solid ${tab === t ? GOLD : 'transparent'}`, background: 'none', border: 'none', borderBottomStyle: 'solid', borderBottomWidth: 2, borderBottomColor: tab === t ? GOLD : 'transparent', cursor: 'pointer', textTransform: 'capitalize' }}>
            {t === 'all' ? 'All' : t === 'pending' ? 'Pending' : 'Paid'}
          </button>
        ))}
      </div>

      {/* Invoice list */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px' }}>
        {filtered.length === 0 && (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: MUTED, fontFamily: FONT_BODY, fontSize: 14 }}>
            No invoices yet — create one above
          </div>
        )}
        {filtered.map(inv => {
          const paidGHS = inv.milestones.filter(m => m.paidAt).reduce((s, m) => s + m.amountGHS, 0)
          const isExpanded = expandedId === inv.id
          const col = INV_STATUS_COLOR[inv.status]
          return (
            <div key={inv.id} style={{ marginBottom: 10, borderRadius: 12, border: `1px solid ${inv.status === 'paid' ? '#10B98140' : BORDER}`, background: inv.status === 'paid' ? '#10B98108' : SURFACE, overflow: 'hidden' }}>
              {/* Invoice header */}
              <div style={{ padding: '12px 14px', cursor: 'pointer', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }} onClick={() => setExpandedId(isExpanded ? null : inv.id)}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                    <span style={{ fontFamily: FONT_HEADING, fontWeight: 600, fontSize: 14, color: TEXT }}>{inv.clientName}</span>
                    <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 10, background: `${col}20`, color: col, fontFamily: FONT_HEADING, fontWeight: 600 }}>{INV_STATUS_LABEL[inv.status]}</span>
                    {inv.dueAt && inv.dueAt < Date.now() && inv.status !== 'paid' && (
                      <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 10, background: '#EF444420', color: '#EF4444', fontFamily: FONT_HEADING, fontWeight: 600 }}>Overdue</span>
                    )}
                  </div>
                  {inv.description && <div style={{ fontSize: 12, color: MUTED, fontFamily: FONT_BODY, marginTop: 2 }}>{inv.description}</div>}
                  <div style={{ display: 'flex', gap: 12, marginTop: 6 }}>
                    <span style={{ fontSize: 13, fontFamily: FONT_HEADING, fontWeight: 700, color: TEXT }}>GHS {inv.totalGHS.toLocaleString()}</span>
                    {paidGHS > 0 && <span style={{ fontSize: 12, color: '#10B981', fontFamily: FONT_BODY }}>GHS {paidGHS.toLocaleString()} received</span>}
                    {inv.totalGHS - paidGHS > 0 && inv.status !== 'draft' && <span style={{ fontSize: 12, color: GOLD, fontFamily: FONT_BODY }}>GHS {(inv.totalGHS - paidGHS).toLocaleString()} outstanding</span>}
                  </div>
                  {inv.status !== 'draft' && inv.totalGHS > 0 && (
                    <div style={{ marginTop: 6, height: 4, borderRadius: 2, background: BORDER, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${Math.round((paidGHS / inv.totalGHS) * 100)}%`, background: '#10B981', borderRadius: 2, transition: 'width 0.3s' }} />
                    </div>
                  )}
                </div>
                <span style={{ fontSize: 12, color: MUTED, marginTop: 2 }}>{isExpanded ? '▲' : '▼'}</span>
              </div>

              {/* Expanded detail */}
              {isExpanded && (
                <div style={{ borderTop: `1px solid ${BORDER}`, padding: '12px 14px', background: SURFACE2 }}>
                  {/* Milestones */}
                  <div style={{ marginBottom: 12 }}>
                    {inv.milestones.map(m => (
                      <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, padding: '8px 10px', borderRadius: 8, background: SURFACE, border: `1px solid ${m.paidAt ? '#10B98130' : BORDER}` }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 13, fontFamily: FONT_HEADING, fontWeight: 500, color: TEXT }}>{m.label}</div>
                          <div style={{ fontSize: 12, color: m.paidAt ? '#10B981' : MUTED, fontFamily: FONT_BODY, marginTop: 1 }}>
                            GHS {m.amountGHS.toLocaleString()}
                            {m.paidAt && ` · Paid ${new Date(m.paidAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} via ${m.paymentMethod ?? ''}`}
                            {m.notes && ` · ${m.notes}`}
                          </div>
                        </div>
                        {m.paidAt
                          ? <button onClick={() => unpayMilestone(inv.id, m.id)} style={{ fontSize: 11, padding: '3px 8px', borderRadius: 6, border: `1px solid ${BORDER}`, background: 'transparent', color: MUTED, cursor: 'pointer', fontFamily: FONT_BODY }}>Undo</button>
                          : <button onClick={() => { setPayModal({ invoiceId: inv.id, milestone: m }); setPayForm({ method: 'Momo', notes: '' }) }} style={{ fontSize: 11, padding: '3px 8px', borderRadius: 6, border: 'none', background: '#10B981', color: '#fff', cursor: 'pointer', fontFamily: FONT_HEADING, fontWeight: 600 }}>Mark Paid</button>
                        }
                      </div>
                    ))}
                  </div>

                  {inv.dueAt && (
                    <div style={{ fontSize: 12, color: inv.dueAt < Date.now() && inv.status !== 'paid' ? '#e05c5c' : MUTED, fontFamily: FONT_BODY, marginBottom: 8 }}>
                      Due: {new Date(inv.dueAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                      {inv.dueAt < Date.now() && inv.status !== 'paid' ? ' — Overdue' : ''}
                    </div>
                  )}

                  {/* Actions */}
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {inv.status === 'draft' && <button onClick={() => markSent(inv.id)} style={{ fontSize: 11, padding: '4px 10px', borderRadius: 7, border: `1px solid ${BORDER}`, background: 'transparent', color: TEXT, cursor: 'pointer', fontFamily: FONT_HEADING }}>Mark Sent</button>}
                    <button onClick={() => printInvoice(inv)} style={{ fontSize: 11, padding: '4px 10px', borderRadius: 7, border: `1px solid ${BORDER}`, background: 'transparent', color: TEXT, cursor: 'pointer', fontFamily: FONT_HEADING }}>Print / PDF</button>
                    <button onClick={() => deleteInvoice(inv.id)} style={{ fontSize: 11, padding: '4px 10px', borderRadius: 7, border: `1px solid #e05c5c40`, background: 'transparent', color: '#e05c5c', cursor: 'pointer', fontFamily: FONT_HEADING }}>Delete</button>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Record payment modal */}
      {payModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 300, display: 'flex', alignItems: 'flex-end' }}>
          <div style={{ background: SURFACE, borderRadius: '16px 16px 0 0', width: '100%', padding: '20px 20px 28px' }}>
            <div style={{ fontFamily: FONT_HEADING, fontWeight: 700, fontSize: 15, color: TEXT, marginBottom: 4 }}>Record Payment</div>
            <div style={{ fontSize: 13, color: MUTED, fontFamily: FONT_BODY, marginBottom: 16 }}>
              {payModal.milestone.label} · GHS {payModal.milestone.amountGHS.toLocaleString()}
            </div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
              {['Momo', 'Bank', 'Cash', 'Other'].map(m => (
                <button key={m} onClick={() => setPayForm(p => ({ ...p, method: m }))} style={{ flex: 1, padding: '8px 4px', borderRadius: 8, border: `1px solid ${payForm.method === m ? GOLD : BORDER}`, background: payForm.method === m ? `${GOLD}15` : 'transparent', color: payForm.method === m ? GOLD : TEXT, fontFamily: FONT_HEADING, fontSize: 12, fontWeight: payForm.method === m ? 600 : 400, cursor: 'pointer' }}>
                  {m}
                </button>
              ))}
            </div>
            <input value={payForm.notes} onChange={e => setPayForm(p => ({ ...p, notes: e.target.value }))} placeholder="Notes (optional)" style={{ ...inputStyle, marginBottom: 12 }} />
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={recordPayment} style={{ flex: 1, padding: '10px', borderRadius: 8, background: '#10B981', color: '#fff', fontFamily: FONT_HEADING, fontWeight: 700, fontSize: 14, border: 'none', cursor: 'pointer' }}>Confirm Payment</button>
              <button onClick={() => setPayModal(null)} style={{ padding: '10px 16px', borderRadius: 8, background: SURFACE2, color: MUTED, fontFamily: FONT_BODY, fontSize: 13, border: `1px solid ${BORDER}`, cursor: 'pointer' }}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── SocialCalendarView ───────────────────────────────────────────────────────

const SOCIAL_CATEGORIES = [
  { id: 'tip', label: 'Website Tip', prompt: 'Write 2 social media posts — one for X (short, punchy, under 280 chars, bold opinion) and one for LinkedIn (professional, 3-5 sentences, founder insight) — about practical website tips for Ghanaian businesses. Label each post with "X:" or "LinkedIn:" on its own line.' },
  { id: 'pain-point', label: 'Pain Point', prompt: 'Write 2 social media posts — one for X and one for LinkedIn — about the real cost of not having a professional website for a business in Ghana. End with a soft CTA for Ecstasy Technologies. Label each "X:" or "LinkedIn:".' },
  { id: 'deal-win', label: 'Client Win', prompt: 'Write 2 social media posts — one for X and one for LinkedIn — celebrating a new website project completion for a Ghanaian business. Keep it proud and specific. Label each "X:" or "LinkedIn:".' },
  { id: 'local', label: 'Ghana Market', prompt: 'Write 2 social media posts — one for X and one for LinkedIn — in a conversational Ghana-market tone about why local businesses need a strong digital presence in 2025. Reference real Ghanaian sectors. Label each "X:" or "LinkedIn:".' },
  { id: 'portfolio', label: 'Portfolio', prompt: 'Write 2 social media posts — one for X and one for LinkedIn — showcasing Ecstasy Technologies portfolio of websites for Ghanaian businesses: clinics, real estate, hotels, schools. Label each "X:" or "LinkedIn:".' },
]

const PLATFORM_ICONS: Record<SocialPlatform, string> = {
  twitter: '𝕏', linkedin: 'in', facebook: 'f', instagram: '◎', tiktok: '♪',
}

function SocialCalendarView() {
  const [posts, setPosts] = useState<SocialPost[]>(loadSocialPosts)
  const [tab, setTab] = useState<'drafts' | 'scheduled' | 'posted'>('drafts')
  const [generating, setGenerating] = useState(false)
  const [category, setCategory] = useState('tip')
  const [profiles, setProfiles] = useState<BufferProfile[]>([])
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editContent, setEditContent] = useState('')
  const [postingId, setPostingId] = useState<string | null>(null)
  const [newContent, setNewContent] = useState('')
  const [selectedPlatforms, setSelectedPlatforms] = useState<SocialPlatform[]>(['twitter', 'linkedin'])
  const [showCompose, setShowCompose] = useState(false)

  useEffect(() => { saveSocialPosts(posts) }, [posts])

  // Hydrate from Supabase on mount
  useEffect(() => {
    fetch('/api/social-posts', { cache: 'no-store' })
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (Array.isArray(d) && d.length > 0) { setPosts(d); saveSocialPosts(d) } })
      .catch(() => {})
  }, [])

  // Debounced sync to Supabase on every change
  const socialSyncRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => {
    if (socialSyncRef.current) clearTimeout(socialSyncRef.current)
    socialSyncRef.current = setTimeout(() => {
      fetch('/api/social-posts', {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(posts),
      }).catch(() => {})
    }, 1500)
  }, [posts])

  useEffect(() => {
    fetch('/api/social/buffer')
      .then(r => r.ok ? r.json() : [])
      .then(d => { if (Array.isArray(d)) setProfiles(d) })
      .catch(() => {})
  }, [])

  const generate = async () => {
    setGenerating(true)
    try {
      const cat = SOCIAL_CATEGORIES.find(c => c.id === category)!
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          systemPrompt: 'You are ViralBot for Ecstasy Technologies, a web agency in Ghana. Generate engaging social media content. Output exactly 2 posts: one labelled "X:" (under 280 chars, punchy) and one labelled "LinkedIn:" (professional, 3-5 sentences). Each label must be on its own line followed by the post text.',
          messages: [{ role: 'user', content: cat.prompt }],
        }),
      })
      const d = await res.json()
      const text: string = d.text ?? ''
      const platformMap: Record<string, SocialPlatform> = { 'x': 'twitter', 'twitter': 'twitter', 'linkedin': 'linkedin', 'instagram': 'instagram', 'facebook': 'facebook', 'tiktok': 'tiktok' }
      const parsed: SocialPost[] = []
      const lines = text.split('\n')
      let current: { platform: SocialPlatform; lines: string[] } | null = null
      for (const line of lines) {
        const m = line.match(/^(X|Twitter|LinkedIn|Instagram|Facebook|TikTok):\s*/i)
        if (m) {
          if (current && current.lines.join('\n').trim()) {
            parsed.push({ id: `${Date.now()}-${parsed.length}`, content: current.lines.join('\n').trim(), platforms: [current.platform], status: 'draft', createdAt: Date.now(), category })
          }
          current = { platform: platformMap[m[1].toLowerCase()] ?? 'twitter', lines: [line.replace(m[0], '').trim()] }
        } else if (current) {
          current.lines.push(line)
        }
      }
      if (current && current.lines.join('\n').trim()) {
        parsed.push({ id: `${Date.now()}-${parsed.length}`, content: current.lines.join('\n').trim(), platforms: [current.platform], status: 'draft', createdAt: Date.now(), category })
      }
      if (parsed.length === 0) {
        parsed.push({ id: Date.now().toString(), content: text.trim(), platforms: ['twitter'], status: 'draft', createdAt: Date.now(), category })
      }
      setPosts(prev => [...parsed, ...prev])
    } finally { setGenerating(false) }
  }

  const addManual = () => {
    if (!newContent.trim()) return
    setPosts(prev => [{ id: Date.now().toString(), content: newContent.trim(), platforms: selectedPlatforms, status: 'draft', createdAt: Date.now() }, ...prev])
    setNewContent('')
    setShowCompose(false)
  }

  const postNow = async (post: SocialPost) => {
    setPostingId(post.id)
    try {
      if (profiles.length > 0) {
        const res = await fetch('/api/social/buffer', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ text: post.content, profileIds: profiles.map(p => p.id), now: true }),
        })
        if (res.ok) {
          setPosts(prev => prev.map(p => p.id === post.id ? { ...p, status: 'posted', postedAt: Date.now() } : p))
        }
      }
    } finally { setPostingId(null) }
  }

  const queuePost = async (post: SocialPost) => {
    setPostingId(post.id)
    try {
      if (profiles.length > 0) {
        const res = await fetch('/api/social/buffer', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ text: post.content, profileIds: profiles.map(p => p.id), now: false }),
        })
        if (res.ok) {
          setPosts(prev => prev.map(p => p.id === post.id ? { ...p, status: 'scheduled' } : p))
        }
      }
    } finally { setPostingId(null) }
  }

  const copyPost = async (content: string) => {
    try { await navigator.clipboard.writeText(content) } catch {}
  }

  const deletePost = (id: string) => setPosts(prev => prev.filter(p => p.id !== id))

  const saveEdit = (id: string) => {
    setPosts(prev => prev.map(p => p.id === id ? { ...p, content: editContent } : p))
    setEditingId(null)
  }

  const filtered = posts.filter(p =>
    tab === 'drafts' ? p.status === 'draft' :
    tab === 'scheduled' ? p.status === 'scheduled' :
    p.status === 'posted'
  )

  const tweetUrl = (text: string) => `https://twitter.com/intent/tweet?text=${encodeURIComponent(text.slice(0, 280))}`
  const [liCopiedId, setLiCopiedId] = useState<string | null>(null)
  const handleLinkedInPost = async (post: SocialPost) => {
    try { await navigator.clipboard.writeText(post.content) } catch { /* ignore */ }
    setLiCopiedId(post.id)
    setTimeout(() => setLiCopiedId(null), 3000)
    window.open('https://www.linkedin.com/post/new/', '_blank', 'noopener,noreferrer')
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      {/* Header */}
      <div style={{ padding: '14px 16px 12px', flexShrink: 0, borderBottom: `1px solid ${BORDER}` }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <div style={{ fontFamily: FONT_HEADING, fontWeight: 700, fontSize: 16, color: TEXT }}>Social Calendar</div>
          <div style={{ display: 'flex', gap: 6 }}>
            <button onClick={() => setShowCompose(v => !v)} style={{ padding: '6px 12px', borderRadius: 8, border: `1px solid ${BORDER}`, background: SURFACE2, color: TEXT, fontFamily: FONT_HEADING, fontSize: 12, fontWeight: 500, cursor: 'pointer' }}>
              + Write
            </button>
            {profiles.length > 0 && (
              <div style={{ fontSize: 11, color: MUTED, fontFamily: FONT_BODY, padding: '6px 10px', background: SURFACE2, borderRadius: 8, border: `1px solid ${BORDER}` }}>
                Buffer: {profiles.map(p => p.service).join(' · ')}
              </div>
            )}
          </div>
        </div>

        {/* Manual compose */}
        {showCompose && (
          <div style={{ marginBottom: 10, padding: 12, borderRadius: 10, border: `1px solid ${BORDER}`, background: SURFACE2 }}>
            <textarea value={newContent} onChange={e => setNewContent(e.target.value)} placeholder="Write a post…" rows={4} style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: `1px solid ${BORDER}`, background: SURFACE, color: TEXT, fontSize: 14, fontFamily: FONT_BODY, resize: 'none', outline: 'none', lineHeight: 1.6, boxSizing: 'border-box', marginBottom: 8 }} />
            <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 8 }}>
              {(['twitter', 'linkedin'] as SocialPlatform[]).map(p => (
                <button key={p} onClick={() => setSelectedPlatforms(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p])} style={{ fontSize: 11, padding: '3px 9px', borderRadius: 10, border: `1px solid ${selectedPlatforms.includes(p) ? PLATFORM_COLORS[p] : BORDER}`, background: selectedPlatforms.includes(p) ? `${PLATFORM_COLORS[p]}18` : 'transparent', color: selectedPlatforms.includes(p) ? PLATFORM_COLORS[p] : MUTED, fontFamily: FONT_HEADING, fontWeight: 500, cursor: 'pointer' }}>
                  {PLATFORM_ICONS[p]} {PLATFORM_LABELS[p]}
                </button>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={addManual} style={{ flex: 1, padding: '8px', borderRadius: 8, background: GOLD, color: '#fff', fontFamily: FONT_HEADING, fontWeight: 700, fontSize: 13, border: 'none', cursor: 'pointer' }}>Add to Drafts</button>
              <button onClick={() => setShowCompose(false)} style={{ padding: '8px 12px', borderRadius: 8, background: 'transparent', color: MUTED, border: `1px solid ${BORDER}`, cursor: 'pointer', fontFamily: FONT_BODY, fontSize: 13 }}>Cancel</button>
            </div>
          </div>
        )}

        {/* AI generate */}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <select value={category} onChange={e => setCategory(e.target.value)} style={{ flex: 1, padding: '7px 10px', borderRadius: 8, border: `1px solid ${BORDER}`, background: SURFACE2, color: TEXT, fontSize: 13, fontFamily: FONT_BODY, outline: 'none' }}>
            {SOCIAL_CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
          </select>
          <button onClick={generate} disabled={generating} style={{ padding: '7px 14px', borderRadius: 8, border: 'none', background: GOLD, color: '#fff', fontFamily: FONT_HEADING, fontWeight: 700, fontSize: 13, cursor: generating ? 'wait' : 'pointer', opacity: generating ? 0.7 : 1, whiteSpace: 'nowrap' }}>
            {generating ? 'Generating…' : '✦ Generate 3'}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: `1px solid ${BORDER}`, flexShrink: 0 }}>
        {(['drafts', 'scheduled', 'posted'] as const).map(t => {
          const count = posts.filter(p => t === 'drafts' ? p.status === 'draft' : t === 'scheduled' ? p.status === 'scheduled' : p.status === 'posted').length
          return (
            <button key={t} onClick={() => setTab(t)} style={{ flex: 1, height: 36, fontFamily: FONT_HEADING, fontSize: 12, fontWeight: tab === t ? 600 : 400, color: tab === t ? GOLD : MUTED, borderBottom: `2px solid ${tab === t ? GOLD : 'transparent'}`, background: 'none', border: 'none', borderBottomStyle: 'solid', borderBottomWidth: 2, borderBottomColor: tab === t ? GOLD : 'transparent', cursor: 'pointer' }}>
              {t.charAt(0).toUpperCase() + t.slice(1)} {count > 0 ? `(${count})` : ''}
            </button>
          )
        })}
      </div>

      {/* Posts list */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px' }}>
        {filtered.length === 0 && (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: MUTED, fontFamily: FONT_BODY, fontSize: 14 }}>
            {tab === 'drafts' ? 'Generate or write posts above' : tab === 'scheduled' ? 'No posts queued in Buffer yet' : 'No posts sent yet'}
          </div>
        )}
        {filtered.map(post => {
          const isPosting = postingId === post.id
          const isEditing = editingId === post.id
          return (
            <div key={post.id} style={{ marginBottom: 10, padding: '12px 14px', borderRadius: 12, border: `1px solid ${post.status === 'posted' ? '#10B98130' : BORDER}`, background: SURFACE }}>
              {/* Platform badges */}
              {post.platforms.length > 0 && (
                <div style={{ display: 'flex', gap: 5, marginBottom: 8, flexWrap: 'wrap' }}>
                  {post.platforms.map(p => (
                    <span key={p} style={{ fontSize: 10, padding: '2px 7px', borderRadius: 10, background: `${PLATFORM_COLORS[p]}15`, color: PLATFORM_COLORS[p], fontFamily: FONT_HEADING, fontWeight: 600 }}>
                      {PLATFORM_ICONS[p]} {PLATFORM_LABELS[p]}
                    </span>
                  ))}
                  {post.category && <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 10, background: SURFACE2, color: MUTED, fontFamily: FONT_BODY }}>{SOCIAL_CATEGORIES.find(c => c.id === post.category)?.label}</span>}
                </div>
              )}

              {/* Content */}
              {isEditing ? (
                <div style={{ marginBottom: 8 }}>
                  <textarea value={editContent} onChange={e => setEditContent(e.target.value)} rows={5} style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: `1px solid ${BORDER}`, background: SURFACE2, color: TEXT, fontSize: 13, fontFamily: FONT_BODY, resize: 'none', outline: 'none', lineHeight: 1.6, boxSizing: 'border-box' }} />
                  <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                    <button onClick={() => saveEdit(post.id)} style={{ fontSize: 12, padding: '4px 10px', borderRadius: 7, border: 'none', background: GOLD, color: '#fff', cursor: 'pointer', fontFamily: FONT_HEADING, fontWeight: 600 }}>Save</button>
                    <button onClick={() => setEditingId(null)} style={{ fontSize: 12, padding: '4px 10px', borderRadius: 7, border: `1px solid ${BORDER}`, background: 'transparent', color: MUTED, cursor: 'pointer', fontFamily: FONT_BODY }}>Cancel</button>
                  </div>
                </div>
              ) : (
                <div style={{ fontSize: 14, color: TEXT, fontFamily: FONT_BODY, lineHeight: 1.65, whiteSpace: 'pre-wrap', marginBottom: 10 }}>
                  {post.content}
                </div>
              )}

              {/* Post timestamp */}
              {post.postedAt && (
                <div style={{ fontSize: 11, color: '#10B981', fontFamily: FONT_BODY, marginBottom: 6 }}>
                  ✓ Posted {new Date(post.postedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                </div>
              )}

              {/* Actions */}
              {!isEditing && (
                <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                  {post.status === 'draft' && (
                    <>
                      {(post.platforms.includes('twitter') || !post.platforms.includes('linkedin')) && (
                        <a href={tweetUrl(post.content)} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, padding: '4px 10px', borderRadius: 8, border: `1px solid #00000030`, background: '#00000008', color: '#000', fontFamily: FONT_HEADING, fontWeight: 600, textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}>
                          𝕏 Post to X
                        </a>
                      )}
                      {post.platforms.includes('linkedin') && (
                        <button onClick={() => handleLinkedInPost(post)} style={{ fontSize: 11, padding: '4px 10px', borderRadius: 8, border: `1px solid ${LI_BLUE}40`, background: liCopiedId === post.id ? `${LI_BLUE}18` : `${LI_BLUE}08`, color: LI_BLUE, fontFamily: FONT_HEADING, fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center' }}>
                          {liCopiedId === post.id ? '✓ Copied — paste in LinkedIn' : 'in Post to LinkedIn'}
                        </button>
                      )}
                      {profiles.length > 0 && (
                        <button onClick={() => queuePost(post)} disabled={isPosting} style={{ fontSize: 11, padding: '4px 10px', borderRadius: 8, border: `1px solid ${BORDER}`, background: 'transparent', color: TEXT, cursor: isPosting ? 'wait' : 'pointer', fontFamily: FONT_HEADING, opacity: isPosting ? 0.6 : 1 }}>
                          📅 Buffer Queue
                        </button>
                      )}
                    </>
                  )}
                  <button onClick={() => copyPost(post.content)} style={{ fontSize: 11, padding: '3px 9px', borderRadius: 8, border: `1px solid ${BORDER}`, background: 'transparent', color: MUTED, cursor: 'pointer', fontFamily: FONT_BODY }}>Copy</button>
                  {!isEditing && post.status !== 'posted' && <button onClick={() => { setEditingId(post.id); setEditContent(post.content) }} style={{ fontSize: 11, padding: '3px 9px', borderRadius: 8, border: `1px solid ${BORDER}`, background: 'transparent', color: MUTED, cursor: 'pointer', fontFamily: FONT_BODY }}>Edit</button>}
                  <button onClick={() => deletePost(post.id)} style={{ fontSize: 11, padding: '3px 9px', borderRadius: 8, border: `1px solid #e05c5c30`, background: 'transparent', color: '#e05c5c', cursor: 'pointer', fontFamily: FONT_BODY }}>✕</button>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── DataQualityView ─────────────────────────────────────────────────────────

function normalizeGhanaPhone(raw: string): string {
  const d = raw.replace(/\D/g, '')
  if (d.startsWith('233') && d.length === 12) return '+' + d
  if (d.startsWith('0') && d.length === 10) return '+233' + d.slice(1)
  if (d.length === 9) return '+233' + d
  return raw
}

function dealCompleteness(d: Deal): number {
  let s = 0
  if (d.phone) s += 25
  if (d.industry && d.industry !== 'Unknown') s += 25
  if (d.valueGHS > 0) s += 25
  if (d.followUpAt || d.stage === 'closed' || d.stage === 'lost') s += 25
  return s
}

function DataQualityView({ deals, onUpdate }: { deals: Deal[]; onUpdate: (id: string, updates: Partial<Deal>) => void }) {
  const [tab, setTab] = useState<'health' | 'duplicates' | 'issues'>('health')
  const [clients, setClients] = useState<Client[]>([])
  const [fixingPhone, setFixingPhone] = useState(false)
  const [dismissedDups, setDismissedDups] = useState<Set<string>>(new Set())
  const [confirmMerge, setConfirmMerge] = useState<Deal[] | null>(null)

  useEffect(() => {
    fetch('/api/clients').then(r => r.ok ? r.json() : []).then(setClients).catch(() => {})
  }, [])

  // ── Health metrics ──
  const withPhone    = deals.filter(d => !!d.phone).length
  const withValue    = deals.filter(d => d.valueGHS > 0).length
  const withIndustry = deals.filter(d => !!d.industry && d.industry !== 'Unknown').length
  const withFollowUp = deals.filter(d => !!d.followUpAt || d.stage === 'closed' || d.stage === 'lost').length
  const avgScore = deals.length === 0 ? 100 : Math.round(deals.reduce((s, d) => s + dealCompleteness(d), 0) / deals.length)

  // ── Phone normalization candidates ──
  const needsNorm = deals.filter(d => {
    if (!d.phone) return false
    const norm = normalizeGhanaPhone(d.phone)
    return norm !== d.phone && norm.startsWith('+233')
  })

  // ── Duplicates: same phone digits ──
  const byPhone = new Map<string, Deal[]>()
  for (const d of deals) {
    if (!d.phone) continue
    const key = d.phone.replace(/\D/g, '')
    if (!byPhone.has(key)) byPhone.set(key, [])
    byPhone.get(key)!.push(d)
  }
  const phoneDups = [...byPhone.values()].filter(arr => {
    if (arr.length < 2) return false
    const key = arr.map(x => x.id).sort().join(',')
    return !dismissedDups.has(key)
  })

  // ── Duplicates: similar name (share same first word, more than 1 deal) ──
  const byFirstWord = new Map<string, Deal[]>()
  for (const d of deals) {
    const word = d.name.trim().toLowerCase().split(/\s+/)[0]
    if (word.length < 3) continue
    if (!byFirstWord.has(word)) byFirstWord.set(word, [])
    byFirstWord.get(word)!.push(d)
  }
  const nameDups = [...byFirstWord.values()].filter(arr => {
    if (arr.length < 2) return false
    // Only flag if at least two have different full names (not exact same name repeated)
    const unique = new Set(arr.map(d => d.name.toLowerCase()))
    if (unique.size < 2) return false
    const key = arr.map(x => x.id).sort().join(',')
    if (dismissedDups.has(key)) return false
    // Exclude if already caught by phone dups
    return !phoneDups.some(g => g.some(d => arr.some(a => a.id === d.id)))
  })

  const totalDups = phoneDups.length + nameDups.length

  // ── Per-deal issues ──
  const issueDeals = deals.map(d => {
    const issues: string[] = []
    if (!d.phone) issues.push('No phone number')
    if (d.valueGHS === 0) issues.push('Deal value ₵0')
    if (!d.industry || d.industry === 'Unknown') issues.push('Industry not set')
    if (!d.followUpAt && d.stage !== 'closed' && d.stage !== 'lost') issues.push('No follow-up date')
    if (d.phone && normalizeGhanaPhone(d.phone) !== d.phone && normalizeGhanaPhone(d.phone).startsWith('+233')) issues.push('Phone not in +233 format')
    return { deal: d, issues }
  }).filter(x => x.issues.length > 0).sort((a, b) => b.issues.length - a.issues.length)

  const scoreColor = (s: number) => s >= 75 ? '#10B981' : s >= 50 ? '#F59E0B' : '#EF4444'

  const handleNormalizeAll = () => {
    setFixingPhone(true)
    for (const d of needsNorm) onUpdate(d.id, { phone: normalizeGhanaPhone(d.phone!) })
    setTimeout(() => setFixingPhone(false), 600)
  }

  const handleMerge = (keep: Deal, remove: Deal) => {
    const updates: Partial<Deal> = {}
    if (!keep.phone && remove.phone) updates.phone = remove.phone
    if ((!keep.industry || keep.industry === 'Unknown') && remove.industry) updates.industry = remove.industry
    if (keep.valueGHS === 0 && remove.valueGHS > 0) updates.valueGHS = remove.valueGHS
    if (!keep.followUpAt && remove.followUpAt) updates.followUpAt = remove.followUpAt
    if (!keep.whatsappHistory?.length && remove.whatsappHistory?.length) updates.whatsappHistory = remove.whatsappHistory
    if (Object.keys(updates).length) onUpdate(keep.id, updates)
    onUpdate(remove.id, { stage: 'lost', name: `[MERGED] ${remove.name}` })
    setConfirmMerge(null)
  }

  const StatBar = ({ label, count, total }: { label: string; count: number; total: number }) => {
    const pct = total === 0 ? 0 : Math.round((count / total) * 100)
    const col = pct >= 75 ? '#10B981' : pct >= 50 ? '#F59E0B' : '#EF4444'
    return (
      <div style={{ marginBottom: 10 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
          <span style={{ fontSize: 12, color: MUTED, fontFamily: FONT_BODY }}>{label}</span>
          <span style={{ fontSize: 12, fontFamily: FONT_HEADING, fontWeight: 600, color: col }}>{count}/{total} ({pct}%)</span>
        </div>
        <div style={{ height: 5, background: SURFACE2, borderRadius: 3, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${pct}%`, background: col, borderRadius: 3, transition: 'width 0.4s' }} />
        </div>
      </div>
    )
  }

  const DupGroup = ({ group, label, borderColor }: { group: Deal[]; label: string; borderColor: string }) => {
    const key = group.map(x => x.id).sort().join(',')
    return (
      <div style={{ background: SURFACE, border: `1px solid ${borderColor}`, borderRadius: 10, padding: '12px 14px', marginBottom: 10 }}>
        <div style={{ fontSize: 11, color: MUTED, fontFamily: FONT_BODY, marginBottom: 8 }}>{label}</div>
        {group.map(d => (
          <div key={d.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 0', borderTop: `1px solid ${BORDER}` }}>
            <div>
              <div style={{ fontSize: 13, fontFamily: FONT_HEADING, fontWeight: 600, color: TEXT }}>{d.name}</div>
              <div style={{ fontSize: 11, color: MUTED, fontFamily: FONT_BODY }}>{STAGE_LABELS[d.stage]} · ₵{d.valueGHS.toLocaleString()}{d.phone ? ` · ${d.phone}` : ''}</div>
            </div>
            <button onClick={() => setConfirmMerge(group)} style={{ fontSize: 11, padding: '4px 10px', background: 'none', border: `1px solid ${BORDER}`, borderRadius: 6, color: MUTED, cursor: 'pointer', fontFamily: FONT_BODY, flexShrink: 0 }}>Merge</button>
          </div>
        ))}
        <button onClick={() => setDismissedDups(prev => new Set([...prev, key]))} style={{ marginTop: 6, fontSize: 11, color: MUTED, background: 'none', border: 'none', cursor: 'pointer', fontFamily: FONT_BODY }}>Dismiss</button>
      </div>
    )
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ padding: '14px 16px 10px', borderBottom: `1px solid ${BORDER}`, flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontFamily: FONT_HEADING, fontWeight: 700, fontSize: 15, color: TEXT }}>Data Quality</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ fontSize: 22, fontWeight: 700, fontFamily: FONT_HEADING, color: scoreColor(avgScore) }}>{avgScore}%</span>
            <span style={{ fontSize: 11, color: MUTED, fontFamily: FONT_BODY }}>health</span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 14, marginTop: 6 }}>
          <span style={{ fontSize: 11, color: MUTED, fontFamily: FONT_BODY }}><span style={{ color: issueDeals.length > 0 ? GOLD : MUTED, fontWeight: 600 }}>{issueDeals.length}</span> issues</span>
          <span style={{ fontSize: 11, color: MUTED, fontFamily: FONT_BODY }}><span style={{ color: totalDups > 0 ? '#EF4444' : MUTED, fontWeight: 600 }}>{totalDups}</span> duplicates</span>
          <span style={{ fontSize: 11, color: MUTED, fontFamily: FONT_BODY }}><span style={{ color: needsNorm.length > 0 ? '#F59E0B' : MUTED, fontWeight: 600 }}>{needsNorm.length}</span> phone fixes</span>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: `1px solid ${BORDER}`, flexShrink: 0 }}>
        {(['health', 'duplicates', 'issues'] as const).map(t => {
          const badge = t === 'duplicates' ? totalDups : t === 'issues' ? issueDeals.length : 0
          return (
            <button key={t} onClick={() => setTab(t)} style={{ flex: 1, padding: '9px 4px', fontSize: 12, fontFamily: FONT_HEADING, fontWeight: tab === t ? 600 : 400, color: tab === t ? GOLD : MUTED, background: 'none', border: 'none', borderBottom: `2px solid ${tab === t ? GOLD : 'transparent'}`, cursor: 'pointer' }}>
              {t === 'health' ? 'Health' : t === 'duplicates' ? 'Duplicates' : 'Issues'}
              {badge > 0 && <span style={{ marginLeft: 4, fontSize: 10, background: tab === t ? `${GOLD}25` : SURFACE2, color: tab === t ? GOLD : MUTED, padding: '1px 5px', borderRadius: 8 }}>{badge}</span>}
            </button>
          )
        })}
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '14px 16px' }}>

        {/* ── Health tab ── */}
        {tab === 'health' && (
          <>
            <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 10, padding: '14px 16px', marginBottom: 14 }}>
              <div style={{ fontFamily: FONT_HEADING, fontWeight: 600, fontSize: 13, color: TEXT, marginBottom: 12 }}>Deal Pipeline ({deals.length} deals)</div>
              <StatBar label="Has phone number" count={withPhone} total={deals.length} />
              <StatBar label="Has deal value set" count={withValue} total={deals.length} />
              <StatBar label="Has industry" count={withIndustry} total={deals.length} />
              <StatBar label="Has follow-up / resolved" count={withFollowUp} total={deals.length} />
            </div>

            {needsNorm.length > 0 && (
              <div style={{ background: `${GOLD}0A`, border: `1px solid ${GOLD}35`, borderRadius: 10, padding: '12px 14px', marginBottom: 14 }}>
                <div style={{ fontFamily: FONT_HEADING, fontWeight: 600, fontSize: 13, color: TEXT, marginBottom: 4 }}>Phone Normalization</div>
                <div style={{ fontSize: 12, color: MUTED, fontFamily: FONT_BODY, marginBottom: 10 }}>
                  {needsNorm.length} deal{needsNorm.length > 1 ? 's' : ''} not in Ghana +233 format
                </div>
                {needsNorm.slice(0, 4).map(d => (
                  <div key={d.id} style={{ fontSize: 11, fontFamily: FONT_BODY, color: MUTED, marginBottom: 3 }}>
                    {d.name}: <span style={{ color: '#EF4444' }}>{d.phone}</span> → <span style={{ color: '#10B981' }}>{normalizeGhanaPhone(d.phone!)}</span>
                  </div>
                ))}
                {needsNorm.length > 4 && <div style={{ fontSize: 11, color: MUTED, fontFamily: FONT_BODY, marginBottom: 4 }}>+{needsNorm.length - 4} more</div>}
                <button onClick={handleNormalizeAll} disabled={fixingPhone} style={{ marginTop: 8, padding: '6px 14px', background: GOLD, color: '#fff', border: 'none', borderRadius: 6, fontSize: 12, fontFamily: FONT_HEADING, fontWeight: 600, cursor: fixingPhone ? 'default' : 'pointer', opacity: fixingPhone ? 0.6 : 1 }}>
                  {fixingPhone ? 'Fixing…' : `Normalize All (${needsNorm.length})`}
                </button>
              </div>
            )}

            {clients.length > 0 && (
              <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 10, padding: '14px 16px' }}>
                <div style={{ fontFamily: FONT_HEADING, fontWeight: 600, fontSize: 13, color: TEXT, marginBottom: 12 }}>Client Database ({clients.length} clients)</div>
                <StatBar label="Has phone" count={clients.filter(c => !!c.phone).length} total={clients.length} />
                <StatBar label="Has email" count={clients.filter(c => !!c.email).length} total={clients.length} />
                <StatBar label="Has website" count={clients.filter(c => !!c.website).length} total={clients.length} />
                <StatBar label="Has industry" count={clients.filter(c => !!c.industry).length} total={clients.length} />
              </div>
            )}
          </>
        )}

        {/* ── Duplicates tab ── */}
        {tab === 'duplicates' && (
          <>
            {totalDups === 0 ? (
              <div style={{ textAlign: 'center', padding: '48px 0', color: MUTED, fontFamily: FONT_BODY, fontSize: 13 }}>✓ No duplicate deals detected</div>
            ) : (
              <>
                {phoneDups.length > 0 && (
                  <>
                    <div style={{ fontSize: 11, fontFamily: FONT_HEADING, fontWeight: 600, color: MUTED, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>Phone Duplicates</div>
                    {phoneDups.map(group => (
                      <DupGroup key={group.map(x => x.id).sort().join(',')} group={group} label={`Same phone: ${group[0].phone}`} borderColor="#EF444428" />
                    ))}
                  </>
                )}
                {nameDups.length > 0 && (
                  <>
                    <div style={{ fontSize: 11, fontFamily: FONT_HEADING, fontWeight: 600, color: MUTED, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8, marginTop: phoneDups.length > 0 ? 16 : 0 }}>Name Duplicates</div>
                    {nameDups.map(group => (
                      <DupGroup key={group.map(x => x.id).sort().join(',')} group={group} label={`Similar name: "${group[0].name.split(' ')[0]}…" (${group.length} deals)`} borderColor="#F59E0B28" />
                    ))}
                  </>
                )}
              </>
            )}
          </>
        )}

        {/* ── Issues tab ── */}
        {tab === 'issues' && (
          <>
            {issueDeals.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '48px 0', color: MUTED, fontFamily: FONT_BODY, fontSize: 13 }}>✓ All deals have complete data</div>
            ) : issueDeals.map(({ deal, issues }) => (
              <div key={deal.id} style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 10, padding: '12px 14px', marginBottom: 10 }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 8 }}>
                  <div>
                    <div style={{ fontSize: 13, fontFamily: FONT_HEADING, fontWeight: 600, color: TEXT }}>{deal.name}</div>
                    <div style={{ fontSize: 11, color: MUTED, fontFamily: FONT_BODY }}>{STAGE_LABELS[deal.stage]} · ₵{deal.valueGHS.toLocaleString()}</div>
                  </div>
                  <span style={{ fontSize: 10, background: `${GOLD}18`, color: GOLD, padding: '2px 8px', borderRadius: 10, fontFamily: FONT_HEADING, fontWeight: 600, flexShrink: 0 }}>{issues.length}</span>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                  {issues.map(issue => {
                    const canFix = issue === 'Phone not in +233 format' && deal.phone
                    return (
                      <span key={issue} onClick={canFix ? () => onUpdate(deal.id, { phone: normalizeGhanaPhone(deal.phone!) }) : undefined}
                        style={{ fontSize: 10, background: '#EF444412', color: '#EF4444', padding: '2px 8px', borderRadius: 10, fontFamily: FONT_BODY, cursor: canFix ? 'pointer' : 'default', textDecoration: canFix ? 'underline' : 'none' }}>
                        {canFix ? `Fix: ${issue}` : issue}
                      </span>
                    )
                  })}
                </div>
              </div>
            ))}
          </>
        )}
      </div>

      {/* Merge modal */}
      {confirmMerge && (
        <div style={{ position: 'fixed', inset: 0, background: '#00000088', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: 20 }}>
          <div style={{ background: SURFACE, borderRadius: 12, padding: 20, maxWidth: 360, width: '100%', border: `1px solid ${BORDER}` }}>
            <div style={{ fontFamily: FONT_HEADING, fontWeight: 700, fontSize: 15, color: TEXT, marginBottom: 6 }}>Merge Duplicates</div>
            <div style={{ fontSize: 12, color: MUTED, fontFamily: FONT_BODY, marginBottom: 16 }}>Choose which deal to keep. Missing fields will be copied from the other; it will be marked [MERGED] and moved to Lost.</div>
            {confirmMerge.map((d, i) => (
              <button key={d.id} onClick={() => handleMerge(d, confirmMerge[i === 0 ? 1 : 0])}
                style={{ display: 'block', width: '100%', textAlign: 'left', padding: '10px 12px', marginBottom: 8, border: `1px solid ${BORDER}`, borderRadius: 8, background: SURFACE2, cursor: 'pointer' }}>
                <div style={{ fontFamily: FONT_HEADING, fontWeight: 600, fontSize: 13, color: TEXT }}>{d.name}</div>
                <div style={{ fontSize: 11, color: MUTED, fontFamily: FONT_BODY }}>{STAGE_LABELS[d.stage]} · ₵{d.valueGHS.toLocaleString()} · {d.phone || 'no phone'}</div>
                <div style={{ fontSize: 11, color: GOLD, fontFamily: FONT_BODY, marginTop: 3 }}>Keep this one →</div>
              </button>
            ))}
            <button onClick={() => setConfirmMerge(null)} style={{ width: '100%', padding: '8px 0', border: `1px solid ${BORDER}`, borderRadius: 8, background: 'none', color: MUTED, fontSize: 13, fontFamily: FONT_BODY, cursor: 'pointer', marginTop: 4 }}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── WebsiteProjectsView ─────────────────────────────────────────────────────

const BLANK_PROJECT = (): Partial<WebsiteProject> => ({
  title: '', category: 'Website', description: '', image: '',
  features: [], technologies: [], link: '', client: '',
  year: new Date().getFullYear(), featured: false, status: 'completed',
})

const CASE_STUDIES_KEY = 'tagett-case-studies-v1'
function loadCaseStudies(): Record<number, string> {
  if (typeof window === 'undefined') return {}
  try { return JSON.parse(localStorage.getItem(CASE_STUDIES_KEY) ?? '{}') } catch { return {} }
}
function saveCaseStudies(d: Record<number, string>) {
  try { localStorage.setItem(CASE_STUDIES_KEY, JSON.stringify(d)) } catch {}
}

const CASE_STUDY_SYSTEM = `You write crisp, persuasive case studies for Ecstasy Technologies, a web and software agency in Ghana (ecstasytechnologies.com). Output EXACTLY in this format — no extra text before or after:

PROBLEM
[What challenge did the client face? Why did they need a digital solution? 1–2 sentences.]

SOLUTION
[What did Ecstasy Technologies build? Mention 2–3 specific features. 2–3 sentences.]

RESULT
[What changed for the client? Business impact — visibility, efficiency, credibility, bookings. 1–2 sentences.]

PROOF_SNIPPET
[One compelling sentence for a WhatsApp cold pitch to a similar business in Ghana. Must start with "We built" or "We helped".]`

async function generateCaseStudyText(p: WebsiteProject): Promise<string> {
  const userMsg = `Client: ${p.client || p.title}
Type: ${p.category}
Project: ${p.title}
Description: ${p.description}
Features: ${p.features.join(', ')}
Technologies: ${p.technologies.join(', ')}`
  const res = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ systemPrompt: CASE_STUDY_SYSTEM, messages: [{ role: 'user', content: userMsg }] }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error ?? 'Generation failed')
  return data.text as string
}

function parseCaseStudy(text: string) {
  const parts = text.split(/\n(?=PROBLEM|SOLUTION|RESULT|PROOF_SNIPPET)/i)
  const s: Record<string, string> = {}
  for (const p of parts) {
    const m = p.match(/^(PROBLEM|SOLUTION|RESULT|PROOF_SNIPPET)\s*\n([\s\S]+)/i)
    if (m) s[m[1].toUpperCase()] = m[2].trim()
  }
  return { problem: s['PROBLEM'] ?? '', solution: s['SOLUTION'] ?? '', result: s['RESULT'] ?? '', proof: s['PROOF_SNIPPET'] ?? '' }
}

function projectMatchesIndustry(p: WebsiteProject, q: string): boolean {
  const kw = q.toLowerCase()
  return [p.title, p.description, p.client ?? '', p.category].some(f => f.toLowerCase().includes(kw))
}

// ─── ImageUploader ─────────────────────────────────────────────────────────────

function ImageUploader({ value, onChange }: { value: string; onChange: (url: string) => void }) {
  const [uploading, setUploading] = useState(false)
  const [preview, setPreview] = useState<string | null>(value && !value.startsWith('data:') ? null : value || null)
  const [dragOver, setDragOver] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const upload = async (file: File) => {
    setUploading(true)
    const reader = new FileReader()
    reader.onload = async (e) => {
      const base64 = e.target?.result as string
      setPreview(base64)
      try {
        const res = await fetch('/api/website/upload', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ base64, filename: file.name }),
        })
        const data = await res.json()
        if (res.ok) { onChange(data.path) }
        else { onChange(base64) } // fall back to data URL
      } catch { onChange(base64) }
      finally { setUploading(false) }
    }
    reader.readAsDataURL(file)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file?.type.startsWith('image/')) upload(file)
  }

  const displayUrl = value && !value.startsWith('data:') ? value : ''

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div
        onDrop={handleDrop}
        onDragOver={e => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onClick={() => inputRef.current?.click()}
        style={{
          border: `2px dashed ${dragOver ? GOLD : BORDER}`, borderRadius: 10,
          padding: preview ? 4 : '18px 16px', cursor: 'pointer', textAlign: 'center',
          background: dragOver ? `${GOLD}08` : SURFACE2, transition: 'all 0.15s',
          minHeight: 56, display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >
        {preview ? (
          <img src={preview} alt="preview" style={{ maxHeight: 100, maxWidth: '100%', borderRadius: 6, objectFit: 'cover' }} />
        ) : (
          <div style={{ fontSize: 12, color: MUTED, fontFamily: FONT_BODY, lineHeight: 1.5 }}>
            {uploading ? 'Uploading…' : '↑ Drop screenshot here or tap to select'}
          </div>
        )}
      </div>
      <input ref={inputRef} type="file" accept="image/*" style={{ display: 'none' }}
        onChange={e => { const f = e.target.files?.[0]; if (f) upload(f) }} />
      <input
        value={displayUrl}
        onChange={e => { onChange(e.target.value); setPreview(null) }}
        placeholder="Or paste image URL manually"
        style={{ padding: '8px 12px', borderRadius: 8, border: `1px solid ${BORDER}`, background: SURFACE2, color: TEXT, fontSize: 13, fontFamily: FONT_BODY, outline: 'none', width: '100%', boxSizing: 'border-box' }}
      />
    </div>
  )
}

function WebsiteProjectsView({ prefill, onClearPrefill, onOpenAgent }: {
  prefill?: Partial<WebsiteProject> | null
  onClearPrefill?: () => void
  onOpenAgent?: (agentId: AgentId, prompt: string) => void
}) {
  const [projects, setProjects] = useState<WebsiteProject[]>([])
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState('')
  const [form, setForm] = useState<Partial<WebsiteProject>>(BLANK_PROJECT())
  const [editing, setEditing] = useState<number | 'new' | null>(null)
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState('')
  const [deleting, setDeleting] = useState<number | null>(null)
  const [techInput, setTechInput] = useState('')
  const [featureInput, setFeatureInput] = useState('')
  const [bulkImporting, setBulkImporting] = useState(false)
  const [bulkMsg, setBulkMsg] = useState('')
  const [caseStudies, setCaseStudies] = useState<Record<number, string>>(() => loadCaseStudies())
  const [generatingId, setGeneratingId] = useState<number | null>(null)

  // Hydrate case studies from Supabase on mount
  useEffect(() => {
    fetch('/api/case-studies', { cache: 'no-store' })
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d && typeof d === 'object' && Object.keys(d).length > 0) { setCaseStudies(d); saveCaseStudies(d) } })
      .catch(() => {})
  }, [])

  // Sync case studies to Supabase whenever they change
  const csSyncRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => {
    if (Object.keys(caseStudies).length === 0) return
    if (csSyncRef.current) clearTimeout(csSyncRef.current)
    csSyncRef.current = setTimeout(() => {
      fetch('/api/case-studies', {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(caseStudies),
      }).catch(() => {})
    }, 1500)
  }, [caseStudies])
  const [openStudyId, setOpenStudyId] = useState<number | null>(null)
  const [matchIndustry, setMatchIndustry] = useState('')
  const [studyError, setStudyError] = useState('')
  const [copiedProof, setCopiedProof] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [syncMsg, setSyncMsg] = useState('')
  const showForm = editing !== null

  const handleSyncAll = async () => {
    if (projects.length === 0) return
    setSyncing(true); setSyncMsg('')
    let ok = 0; let failed = 0
    for (const p of projects) {
      try {
        const res = await fetch('/api/website/projects', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(p),
        })
        if (res.ok) ok++; else failed++
      } catch { failed++ }
    }
    setSyncing(false)
    setSyncMsg(failed === 0 ? `✓ ${ok} project${ok !== 1 ? 's' : ''} synced to website` : `${ok} synced, ${failed} failed`)
    setTimeout(() => setSyncMsg(''), 4000)
  }

  const handleGenerateCaseStudy = async (p: WebsiteProject) => {
    if (openStudyId === p.id) { setOpenStudyId(null); return }
    setOpenStudyId(p.id)
    if (caseStudies[p.id]) return
    setGeneratingId(p.id)
    setStudyError('')
    try {
      const text = await generateCaseStudyText(p)
      const updated = { ...caseStudies, [p.id]: text }
      setCaseStudies(updated)
      saveCaseStudies(updated)
    } catch (err) {
      setStudyError(err instanceof Error ? err.message : 'Generation failed')
    } finally { setGeneratingId(null) }
  }

  const handleCopyProof = async (proof: string) => {
    await navigator.clipboard.writeText(proof).catch(() => {})
    setCopiedProof(true)
    setTimeout(() => setCopiedProof(false), 2000)
  }

  const handleBulkImport = async () => {
    setBulkImporting(true)
    setBulkMsg('')
    try {
      const res = await fetch('/api/website/bulk', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(SEED_PROJECTS),
      })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error ?? 'Import failed')
      if (d.added === 0) {
        setBulkMsg(`All ${d.skipped} projects already published.`)
      } else {
        setBulkMsg(`✓ Imported ${d.added} project${d.added !== 1 ? 's' : ''}${d.skipped ? ` (${d.skipped} already existed)` : ''}.`)
        const freshRes = await fetch('/api/website/projects')
        const freshData = await freshRes.json()
        if (Array.isArray(freshData)) setProjects(freshData)
      }
    } catch (err) {
      setBulkMsg(err instanceof Error ? err.message : 'Import failed')
    } finally {
      setBulkImporting(false)
    }
  }

  useEffect(() => {
    fetch('/api/website/projects')
      .then(r => r.json())
      .then(d => { if (Array.isArray(d)) setProjects(d); else setFetchError(d.error ?? 'Failed to load') })
      .catch(() => setFetchError('Network error'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (!prefill) return
    setForm({ ...BLANK_PROJECT(), ...prefill })
    setEditing('new')
    onClearPrefill?.()
  }, [prefill, onClearPrefill])

  const openNew = () => { setForm(BLANK_PROJECT()); setEditing('new'); setTechInput(''); setFeatureInput(''); setSaveMsg('') }
  const openEdit = (p: WebsiteProject) => { setForm({ ...p }); setEditing(p.id); setTechInput(''); setFeatureInput(''); setSaveMsg('') }
  const cancel = () => { setEditing(null); setSaveMsg('') }

  const set = (key: keyof WebsiteProject, val: unknown) => setForm(prev => ({ ...prev, [key]: val }))

  const addTech = () => {
    const t = techInput.trim()
    if (!t) return
    setForm(prev => ({ ...prev, technologies: [...(prev.technologies ?? []), t] }))
    setTechInput('')
  }
  const removeTech = (t: string) => setForm(prev => ({ ...prev, technologies: (prev.technologies ?? []).filter(x => x !== t) }))

  const addFeature = () => {
    const f = featureInput.trim()
    if (!f) return
    setForm(prev => ({ ...prev, features: [...(prev.features ?? []), f] }))
    setFeatureInput('')
  }
  const removeFeature = (f: string) => setForm(prev => ({ ...prev, features: (prev.features ?? []).filter(x => x !== f) }))

  const handleSave = async () => {
    if (!form.title?.trim() || !form.description?.trim()) { setSaveMsg('Title and description are required.'); return }
    setSaving(true); setSaveMsg('')
    const payload: Partial<WebsiteProject> & { title: string; description: string } = {
      ...(editing !== 'new' && { id: editing as number }),
      title: form.title!.trim(),
      category: form.category ?? 'Website',
      description: form.description!.trim(),
      image: form.image?.trim() || '',
      features: form.features ?? [],
      technologies: form.technologies ?? [],
      year: form.year ?? new Date().getFullYear(),
      link: form.link?.trim() || undefined,
      client: form.client?.trim() || undefined,
      featured: form.featured ?? false,
      status: form.status ?? 'completed',
      updatedAt: new Date().toISOString(),
    }
    try {
      const res = await fetch('/api/website/projects', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload) })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error ?? 'Publish failed')
      // Use the image path returned by the API (may differ if image was mirrored to public/)
      const saved: WebsiteProject = { ...payload, id: d.id ?? (editing as number), image: d.image ?? payload.image } as WebsiteProject
      setProjects(prev => { const i = prev.findIndex(p => p.id === saved.id); return i >= 0 ? prev.map((p, j) => j === i ? saved : p) : [saved, ...prev] })
      setSaveMsg('✓ Published to website!')
      setEditing(null)
    } catch (err) {
      setSaveMsg(err instanceof Error ? err.message : 'Failed')
    } finally { setSaving(false) }
  }

  const handleDelete = async (id: number) => {
    setDeleting(id)
    try {
      const res = await fetch('/api/website/projects', { method: 'DELETE', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ id }) })
      if (res.ok) setProjects(prev => prev.filter(p => p.id !== id))
    } finally { setDeleting(null) }
  }

  const inputStyle: React.CSSProperties = { padding: '8px 12px', borderRadius: 8, border: `1px solid ${BORDER}`, background: SURFACE2, color: TEXT, fontSize: 14, fontFamily: FONT_BODY, outline: 'none', width: '100%', boxSizing: 'border-box' }
  const labelStyle: React.CSSProperties = { fontSize: 10, fontFamily: FONT_HEADING, fontWeight: 600, color: MUTED, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 4, display: 'block' }

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '16px 12px' } as React.CSSProperties}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <div>
          <div style={{ fontFamily: FONT_HEADING, fontWeight: 700, fontSize: 17, color: TEXT }}>Website Projects</div>
          <div style={{ fontSize: 12, color: MUTED, fontFamily: FONT_BODY, marginTop: 2 }}>ecstasytechnologies.com · {projects.length} published</div>
        </div>
        {!showForm && (
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={handleBulkImport} disabled={bulkImporting} style={{ padding: '7px 12px', borderRadius: 8, background: 'transparent', color: bulkImporting ? MUTED : GOLD, fontFamily: FONT_HEADING, fontWeight: 600, fontSize: 12, border: `1px solid ${GOLD}60`, cursor: bulkImporting ? 'default' : 'pointer' }}>
              {bulkImporting ? '…importing' : '↑ Import Missing'}
            </button>
            <button onClick={handleSyncAll} disabled={syncing || projects.length === 0} style={{ padding: '7px 12px', borderRadius: 8, background: 'transparent', color: syncing ? MUTED : '#10B981', fontFamily: FONT_HEADING, fontWeight: 600, fontSize: 12, border: `1px solid #10B98160`, cursor: syncing ? 'default' : 'pointer' }}>
              {syncing ? '…syncing' : '⟳ Sync All'}
            </button>
            <button onClick={openNew} style={{ padding: '7px 14px', borderRadius: 8, background: GOLD, color: BG, fontFamily: FONT_HEADING, fontWeight: 700, fontSize: 13, border: 'none', cursor: 'pointer' }}>
              + Add Project
            </button>
          </div>
        )}
      </div>
      {syncMsg && (
        <div style={{ fontSize: 12, color: syncMsg.startsWith('✓') ? '#10B981' : '#f87171', fontFamily: FONT_BODY, marginBottom: 10 }}>
          {syncMsg}
        </div>
      )}
      {bulkMsg && (
        <div style={{ fontSize: 12, color: bulkMsg.startsWith('✓') ? GOLD : '#f87171', fontFamily: FONT_BODY, marginBottom: 10 }}>
          {bulkMsg}
        </div>
      )}

      {fetchError && (
        <div style={{ padding: '10px 14px', borderRadius: 8, background: '#2a101040', border: '1px solid #f8717140', color: '#f87171', fontSize: 13, fontFamily: FONT_BODY, marginBottom: 12 }}>
          {fetchError}
          {fetchError.includes('GITHUB_WEBSITE_TOKEN') && (
            <div style={{ marginTop: 6, fontSize: 11, opacity: 0.8 }}>Add GITHUB_WEBSITE_TOKEN to your Vercel environment variables.</div>
          )}
        </div>
      )}

      {/* Project form */}
      {showForm && (
        <div style={{ marginBottom: 16, padding: 16, borderRadius: 12, border: `1px solid ${GOLD}40`, background: `${GOLD}08` }}>
          <div style={{ fontFamily: FONT_HEADING, fontWeight: 700, fontSize: 14, color: TEXT, marginBottom: 14 }}>
            {editing === 'new' ? 'New Project' : 'Edit Project'}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <label style={labelStyle}>Project Title *</label>
              <input value={form.title ?? ''} onChange={e => set('title', e.target.value)} placeholder="Lavimac Royal Hotel Website" style={inputStyle} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <div>
                <label style={labelStyle}>Category *</label>
                <select value={form.category ?? 'Website'} onChange={e => set('category', e.target.value)} style={{ ...inputStyle, cursor: 'pointer' }}>
                  {PROJECT_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Year</label>
                <input type="number" value={form.year ?? new Date().getFullYear()} onChange={e => set('year', parseInt(e.target.value, 10))} style={inputStyle} />
              </div>
            </div>
            <div>
              <label style={labelStyle}>Client Name</label>
              <input value={form.client ?? ''} onChange={e => set('client', e.target.value)} placeholder="Lavimac Royal Hotel" style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Description *</label>
              <textarea value={form.description ?? ''} onChange={e => set('description', e.target.value)} placeholder="A professional website for a luxury hotel in Kumasi, Ghana..." rows={3} style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.5 }} />
            </div>
            <div>
              <label style={labelStyle}>Live Site URL</label>
              <input value={form.link ?? ''} onChange={e => set('link', e.target.value)} placeholder="https://lavimachotel.com" style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Cover Image</label>
              <ImageUploader value={form.image ?? ''} onChange={v => set('image', v)} />
            </div>
            <div>
              <label style={labelStyle}>Technologies</label>
              <div style={{ display: 'flex', gap: 6 }}>
                <input value={techInput} onChange={e => setTechInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTech() }}} placeholder="e.g. Next.js" style={{ ...inputStyle, flex: 1 }} />
                <button onClick={addTech} style={{ padding: '8px 12px', borderRadius: 8, border: `1px solid ${BORDER}`, background: SURFACE2, color: MUTED, fontFamily: FONT_BODY, fontSize: 13, cursor: 'pointer', whiteSpace: 'nowrap' }}>Add</button>
              </div>
              {(form.technologies ?? []).length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 6 }}>
                  {(form.technologies ?? []).map(t => (
                    <span key={t} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 8px', borderRadius: 12, border: `1px solid ${GOLD}60`, background: `${GOLD}10`, color: GOLD, fontSize: 11, fontFamily: FONT_BODY }}>
                      {t}
                      <button onClick={() => removeTech(t)} style={{ background: 'none', border: 'none', color: GOLD, cursor: 'pointer', fontSize: 11, padding: 0, lineHeight: 1 }}>×</button>
                    </span>
                  ))}
                </div>
              )}
            </div>
            <div>
              <label style={labelStyle}>Key Features</label>
              <div style={{ display: 'flex', gap: 6 }}>
                <input value={featureInput} onChange={e => setFeatureInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addFeature() }}} placeholder="e.g. Online booking system" style={{ ...inputStyle, flex: 1 }} />
                <button onClick={addFeature} style={{ padding: '8px 12px', borderRadius: 8, border: `1px solid ${BORDER}`, background: SURFACE2, color: MUTED, fontFamily: FONT_BODY, fontSize: 13, cursor: 'pointer', whiteSpace: 'nowrap' }}>Add</button>
              </div>
              {(form.features ?? []).length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 6 }}>
                  {(form.features ?? []).map(f => (
                    <span key={f} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 8px', borderRadius: 12, border: `1px solid ${BORDER}`, background: SURFACE2, color: MUTED, fontSize: 11, fontFamily: FONT_BODY }}>
                      {f}
                      <button onClick={() => removeFeature(f)} style={{ background: 'none', border: 'none', color: MUTED, cursor: 'pointer', fontSize: 11, padding: 0, lineHeight: 1 }}>×</button>
                    </span>
                  ))}
                </div>
              )}
            </div>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <div>
                <label style={labelStyle}>Status</label>
                <select value={form.status ?? 'completed'} onChange={e => set('status', e.target.value)} style={{ ...inputStyle, cursor: 'pointer' }}>
                  <option value="completed">Completed</option>
                  <option value="in-progress">In Progress</option>
                </select>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingTop: 16 }}>
                <input type="checkbox" id="featured-cb" checked={form.featured ?? false} onChange={e => set('featured', e.target.checked)} style={{ width: 16, height: 16, cursor: 'pointer' }} />
                <label htmlFor="featured-cb" style={{ ...labelStyle, marginBottom: 0, cursor: 'pointer', textTransform: 'none', fontSize: 13, color: TEXT }}>Featured on homepage</label>
              </div>
            </div>
          </div>

          {saveMsg && (
            <div style={{ marginTop: 10, fontSize: 13, color: saveMsg.startsWith('✓') ? GOLD : '#f87171', fontFamily: FONT_BODY }}>{saveMsg}</div>
          )}

          <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
            <button onClick={handleSave} disabled={saving} style={{ flex: 1, padding: '11px', borderRadius: 8, background: saving ? SURFACE2 : GOLD, color: saving ? MUTED : BG, fontFamily: FONT_HEADING, fontWeight: 700, fontSize: 14, border: 'none', cursor: saving ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              {saving ? <><ThinkingDots /> Publishing…</> : '↑ Publish to Website'}
            </button>
            <button onClick={cancel} style={{ padding: '11px 16px', borderRadius: 8, background: SURFACE2, color: MUTED, fontFamily: FONT_BODY, fontSize: 13, border: `1px solid ${BORDER}`, cursor: 'pointer' }}>Cancel</button>
          </div>
        </div>
      )}

      {/* Published projects list */}
      {loading && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: MUTED, fontSize: 13, fontFamily: FONT_BODY, padding: '8px 0' }}>
          <ThinkingDots /> Loading published projects…
        </div>
      )}

      {!loading && projects.length === 0 && !fetchError && (
        <div style={{ fontSize: 13, color: MUTED, fontFamily: FONT_BODY, padding: '8px 0', opacity: 0.6 }}>
          No projects published yet. Click "+ Add Project" to publish your first project to ecstasytechnologies.com.
        </div>
      )}

      {/* Industry match filter */}
      {!showForm && projects.length > 0 && (
        <div style={{ marginBottom: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
          <input
            value={matchIndustry}
            onChange={e => setMatchIndustry(e.target.value)}
            placeholder="Find case study for prospect industry (e.g. hotel, clinic, school)…"
            style={{ flex: 1, padding: '7px 12px', borderRadius: 8, border: `1px solid ${BORDER}`, background: SURFACE2, color: TEXT, fontSize: 12, fontFamily: FONT_BODY, outline: 'none' }}
          />
          {matchIndustry && <button onClick={() => setMatchIndustry('')} style={{ fontSize: 13, color: MUTED, background: 'none', border: 'none', cursor: 'pointer' }}>✕</button>}
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {projects
          .filter(p => !matchIndustry || projectMatchesIndustry(p, matchIndustry))
          .map(p => {
            const isMatch = !!matchIndustry && projectMatchesIndustry(p, matchIndustry)
            const study = caseStudies[p.id]
            const isOpen = openStudyId === p.id
            const isGenerating = generatingId === p.id
            const parsed = study ? parseCaseStudy(study) : null

            return (
              <div key={p.id}>
                <div style={{ padding: '12px 14px', borderRadius: isOpen ? '10px 10px 0 0' : 10, border: `1px solid ${isMatch ? `${GOLD}60` : BORDER}`, background: isMatch ? `${GOLD}06` : SURFACE2 }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <span style={{ fontFamily: FONT_HEADING, fontWeight: 600, fontSize: 13, color: TEXT }}>{p.title}</span>
                        {p.featured && <span style={{ fontSize: 9, padding: '2px 6px', borderRadius: 8, background: `${GOLD}20`, color: GOLD, fontFamily: FONT_HEADING, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Featured</span>}
                        {p.status === 'in-progress' && <span style={{ fontSize: 9, padding: '2px 6px', borderRadius: 8, background: '#3b82f620', color: '#3b82f6', fontFamily: FONT_HEADING, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' }}>In Progress</span>}
                      </div>
                      <div style={{ fontSize: 11, color: MUTED, fontFamily: FONT_BODY, marginTop: 2 }}>{p.category} · {p.year}{p.client ? ` · ${p.client}` : ''}</div>
                      <div style={{ fontSize: 12, color: MUTED, fontFamily: FONT_BODY, marginTop: 4, lineHeight: 1.5 }}>{p.description.slice(0, 100)}{p.description.length > 100 ? '…' : ''}</div>
                      {(p.technologies ?? []).length > 0 && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 6 }}>
                          {p.technologies.map(t => <span key={t} style={{ fontSize: 9, padding: '2px 6px', borderRadius: 8, border: `1px solid ${BORDER}`, color: MUTED, fontFamily: FONT_BODY }}>{t}</span>)}
                        </div>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                      {p.link && <a href={p.link} target="_blank" rel="noopener noreferrer" title="View live site" style={{ width: 28, height: 28, borderRadius: 6, border: `1px solid ${BORDER}`, background: 'transparent', color: MUTED, fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none' }}>↗</a>}
                      <button onClick={() => openEdit(p)} style={{ width: 28, height: 28, borderRadius: 6, border: `1px solid ${BORDER}`, background: 'transparent', color: MUTED, fontSize: 11, cursor: 'pointer' }}>✎</button>
                      <button onClick={() => handleDelete(p.id)} disabled={deleting === p.id} style={{ width: 28, height: 28, borderRadius: 6, border: `1px solid ${BORDER}`, background: 'transparent', color: MUTED, fontSize: 11, cursor: 'pointer', opacity: deleting === p.id ? 0.4 : 1 }}>✕</button>
                    </div>
                  </div>
                  {/* Case Study toggle button */}
                  <button onClick={() => handleGenerateCaseStudy(p)} style={{ marginTop: 8, display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 14, border: `1px solid ${isOpen ? `${GOLD}60` : BORDER}`, background: isOpen ? `${GOLD}12` : 'none', color: isOpen ? GOLD : MUTED, fontSize: 11, fontFamily: FONT_HEADING, fontWeight: isOpen ? 600 : 400, cursor: 'pointer' }}>
                    {isGenerating ? <><ThinkingDots /> Generating…</> : isOpen ? '▾ Case Study' : '▸ Case Study'}
                    {study && !isOpen && <span style={{ fontSize: 9, background: `${GOLD}20`, color: GOLD, padding: '1px 5px', borderRadius: 8 }}>ready</span>}
                  </button>
                </div>

                {/* Inline case study panel */}
                {isOpen && (
                  <div style={{ border: `1px solid ${GOLD}40`, borderTop: 'none', borderRadius: '0 0 10px 10px', background: `${GOLD}04`, padding: '14px 16px' }}>
                    {isGenerating && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: MUTED, fontSize: 12, fontFamily: FONT_BODY }}>
                        <ThinkingDots /> Generating case study…
                      </div>
                    )}
                    {studyError && !isGenerating && (
                      <div style={{ fontSize: 12, color: '#f87171', fontFamily: FONT_BODY }}>{studyError}</div>
                    )}
                    {parsed && !isGenerating && (
                      <>
                        {[
                          { label: 'Problem', text: parsed.problem, color: '#EF4444' },
                          { label: 'Solution', text: parsed.solution, color: '#3B82F6' },
                          { label: 'Result', text: parsed.result, color: '#10B981' },
                        ].map(s => s.text ? (
                          <div key={s.label} style={{ marginBottom: 12 }}>
                            <div style={{ fontSize: 10, fontFamily: FONT_HEADING, fontWeight: 700, color: s.color, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 4 }}>{s.label}</div>
                            <div style={{ fontSize: 12, color: TEXT, fontFamily: FONT_BODY, lineHeight: 1.65 }}>{s.text}</div>
                          </div>
                        ) : null)}

                        {parsed.proof && (
                          <div style={{ marginTop: 4, padding: '10px 12px', borderRadius: 8, border: `1px solid ${GOLD}40`, background: `${GOLD}08` }}>
                            <div style={{ fontSize: 10, fontFamily: FONT_HEADING, fontWeight: 700, color: GOLD, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 5 }}>Pitch Proof</div>
                            <div style={{ fontSize: 12, color: TEXT, fontFamily: FONT_BODY, lineHeight: 1.65, fontStyle: 'italic', marginBottom: 8 }}>"{parsed.proof}"</div>
                            <button onClick={() => handleCopyProof(parsed.proof)} style={{ fontSize: 11, padding: '4px 12px', borderRadius: 14, border: `1px solid ${GOLD}50`, background: copiedProof ? `${GOLD}20` : 'none', color: GOLD, fontFamily: FONT_HEADING, fontWeight: 600, cursor: 'pointer' }}>
                              {copiedProof ? '✓ Copied' : 'Copy'}
                            </button>
                          </div>
                        )}

                        <div style={{ display: 'flex', gap: 6, marginTop: 12, flexWrap: 'wrap' }}>
                          <button onClick={() => onOpenAgent?.('content', `Use this Ecstasy Technologies case study to write a personalised WhatsApp cold pitch for a similar ${p.category.toLowerCase()} business in Ghana:\n\n${study}`)}
                            style={{ padding: '5px 12px', borderRadius: 14, border: `1px solid ${BORDER}`, background: 'none', color: MUTED, fontSize: 11, fontFamily: FONT_HEADING, cursor: 'pointer' }}>
                            → Use in WhatsApp Pitch
                          </button>
                          <button onClick={() => onOpenAgent?.('viral', `Create 3 social media posts (X, LinkedIn, Instagram) showcasing this Ecstasy Technologies case study to attract similar clients:\n\n${study}`)}
                            style={{ padding: '5px 12px', borderRadius: 14, border: `1px solid ${BORDER}`, background: 'none', color: MUTED, fontSize: 11, fontFamily: FONT_HEADING, cursor: 'pointer' }}>
                            → Create Social Posts
                          </button>
                          <button onClick={() => { const updated = { ...caseStudies }; delete updated[p.id]; setCaseStudies(updated); saveCaseStudies(updated); setOpenStudyId(null) }}
                            style={{ padding: '5px 12px', borderRadius: 14, border: `1px solid ${BORDER}`, background: 'none', color: MUTED, fontSize: 11, fontFamily: FONT_BODY, cursor: 'pointer', opacity: 0.6 }}>
                            Regenerate
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            )
          })}
      </div>

      {!showForm && !loading && (
        <div style={{ marginTop: 20, padding: 14, borderRadius: 10, border: `1px solid ${BORDER}`, background: SURFACE2 }}>
          <div style={{ fontFamily: FONT_HEADING, fontWeight: 600, fontSize: 12, color: MUTED, marginBottom: 6 }}>Website Integration Setup</div>
          <div style={{ fontSize: 12, color: MUTED, fontFamily: FONT_BODY, lineHeight: 1.65 }}>
            In your Ecstasy Technologies Next.js repo, import projects from <code style={{ background: SURFACE, padding: '1px 5px', borderRadius: 4, fontSize: 11 }}>data/projects.json</code> instead of hardcoded data. Tagett commits to that file automatically on every publish.
          </div>
        </div>
      )}
    </div>
  )
}

// ─── PinnedNotesPanel ─────────────────────────────────────────────────────────

function PinnedNotesPanel({ open, notes, onClose, onChange }: {
  open: boolean; notes: string; onClose: () => void; onChange: (v: string) => void
}) {
  if (!open) return null
  const lineCount = notes.trim().split('\n').filter(Boolean).length
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex' } as React.CSSProperties}>
      <div onClick={onClose} style={{ flex: 1, background: '#00000050' }} />
      <div style={{ width: Math.min(340, window.innerWidth - 40), background: SURFACE, display: 'flex', flexDirection: 'column', borderLeft: `1px solid ${BORDER}` }}>
        <div style={{ padding: '14px 16px 12px', borderBottom: `1px solid ${BORDER}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontFamily: FONT_HEADING, fontWeight: 700, fontSize: 14, color: TEXT }}>📌 Pinned Context</div>
            <div style={{ fontSize: 10, color: MUTED, fontFamily: FONT_BODY, marginTop: 2 }}>Injected into every agent automatically</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: MUTED, fontSize: 20, cursor: 'pointer', lineHeight: 1 }}>✕</button>
        </div>
        <div style={{ padding: 12, flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ fontSize: 11, color: MUTED, fontFamily: FONT_BODY, lineHeight: 1.55 }}>
            Write anything agents should always know: agreed prices, active client names, your focus this week, personal rules.
          </div>
          <textarea
            value={notes}
            onChange={e => onChange(e.target.value)}
            placeholder={'e.g.\n• Current clients: Solani Construction (GHS 3,800), Jokran Hotel (GHS 4,000)\n• Website price: GHS 3,500–4,000\n• This week: follow up on stale proposals first'}
            style={{ flex: 1, background: SURFACE2, border: `1px solid ${BORDER}`, borderRadius: 10, color: TEXT, fontSize: 13, fontFamily: FONT_BODY, padding: 12, resize: 'none', lineHeight: 1.6, outline: 'none', minHeight: 200 }}
          />
        </div>
        {notes.trim() && (
          <div style={{ padding: '0 14px 14px' }}>
            <div style={{ fontSize: 10, color: GOLD, fontFamily: FONT_HEADING, fontWeight: 600, letterSpacing: '0.06em', display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: GOLD, flexShrink: 0, display: 'inline-block' }} />
              Active · {lineCount} line{lineCount !== 1 ? 's' : ''} injected into all agents
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── MobileHeader ─────────────────────────────────────────────────────────────

function MobileHeader({ agent, earnedGHS, theme, onToggleTheme, notifToggle, onOpenNotes, hasNotes }: {
  agent: Agent
  earnedGHS: number
  theme: 'dark' | 'light'
  onToggleTheme: () => void
  notifToggle: React.ReactNode
  onOpenNotes: () => void
  hasNotes: boolean
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
          <button onClick={onOpenNotes} title="Pinned Context" style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, color: hasNotes ? GOLD : MUTED, padding: '2px 4px', lineHeight: 1 }}>📌</button>
          <ThemeToggle theme={theme} onToggle={onToggleTheme} />
          <GoalRing earned={earnedGHS} mini />
        </div>
      </div>
    </div>
  )
}

// ─── CouncilChamber ──────────────────────────────────────────────────────────

function CouncilChamber({ pinnedNotes, workspace }: { pinnedNotes?: string; workspace?: Record<string, string> }) {
  const [input, setInput] = useState('')
  const [topic, setTopic] = useState('')
  const [responses, setResponses] = useState<Partial<Record<AgentId, string>>>({})
  const [loading, setLoading] = useState<Partial<Record<AgentId, boolean>>>({})
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const anyLoading = Object.values(loading).some(Boolean)

  const convene = async () => {
    const q = input.trim()
    if (!q || anyLoading) return
    setTopic(q)
    setInput('')
    setResponses({})
    const init: Partial<Record<AgentId, boolean>> = {}
    COUNCIL_AGENT_IDS.forEach(id => { init[id] = true })
    setLoading(init)

    // Fetch live project data so advisors respond about REAL context
    let liveSnapshot = ''
    try {
      const [rawDeals, rawClients, rawInvoices] = await Promise.all([
        fetch('/api/deals').then(r => r.ok ? r.json() : []).catch(() => []),
        fetch('/api/clients').then(r => r.ok ? r.json() : []).catch(() => []),
        fetch('/api/invoices').then(r => r.ok ? r.json() : []).catch(() => []),
      ])

      const deals: Deal[] = Array.isArray(rawDeals) ? rawDeals.map((d: Record<string, unknown>) => ({
        id: String(d.id ?? ''),
        name: String(d.name ?? ''),
        industry: String(d.industry ?? ''),
        createdAt: Number(d.createdAt ?? d.created_at ?? 0),
        phone: d.phone as string | undefined,
        valueGHS: Number(d.value_ghs ?? d.valueGHS ?? 0),
        stage: (STAGE_MIGRATE[d.stage as string] ?? d.stage) as DealStage,
      })) : []
      const clients: Client[] = Array.isArray(rawClients) ? rawClients : []
      const invoices: Invoice[] = Array.isArray(rawInvoices) ? rawInvoices : []

      const closedDeals = deals.filter(d => d.stage === 'closed')
      const activeDeals = deals.filter(d => d.stage !== 'closed' && d.stage !== 'lost')
      const lostDeals = deals.filter(d => d.stage === 'lost')
      const closedGHS = closedDeals.reduce((s, d) => s + d.valueGHS, 0)
      const activeGHS = activeDeals.reduce((s, d) => s + d.valueGHS, 0)
      const paidGHS = invoices.filter(i => i.status === 'paid').reduce((s, i) => s + i.totalGHS, 0)
      const outstandingGHS = invoices.filter(i => i.status !== 'paid').reduce((s, i) => s + i.totalGHS, 0)

      const dealLines = deals.length > 0
        ? deals.slice(0, 25).map(d =>
            `  - ${d.name} | ${STAGE_LABELS[d.stage]} | GHS ${d.valueGHS.toLocaleString()} | ${d.industry}${d.phone ? ` | ${d.phone}` : ''}`
          ).join('\n')
        : '  (no deals in pipeline yet)'

      const clientLines = clients.length > 0
        ? clients.slice(0, 15).map(c =>
            `  - ${c.name}${c.industry ? ` | ${c.industry}` : ''}${c.phone ? ` | ${c.phone}` : ''}${c.website ? ` | ${c.website}` : ''}`
          ).join('\n')
        : '  (no clients yet)'

      liveSnapshot = `
— LIVE PROJECT DATA (real data, pulled right now) —
Company: Ecstasy Technologies | Owner: Dominic Kudom | Goal: GHS 12,000/month

PIPELINE SUMMARY:
  Closed/Won: ${closedDeals.length} deals — GHS ${closedGHS.toLocaleString()} (${Math.round((closedGHS / 12000) * 100)}% of monthly goal)
  Active: ${activeDeals.length} deals — GHS ${activeGHS.toLocaleString()} potential
  Lost: ${lostDeals.length} deals

ALL PIPELINE DEALS (${deals.length} total):
${dealLines}

CLIENTS ON RECORD (${clients.length} total):
${clientLines}

INVOICES:
  Paid: GHS ${paidGHS.toLocaleString()} | Outstanding: GHS ${outstandingGHS.toLocaleString()} across ${invoices.filter(i => i.status !== 'paid').length} invoice(s)
— END LIVE DATA —`
    } catch { /* non-fatal — advisors proceed without live data */ }

    await Promise.allSettled(
      COUNCIL_AGENT_IDS.map(async (agentId) => {
        try {
          const enrichedQ = liveSnapshot ? `${q}\n\n${liveSnapshot}` : q
          const text = await callChat(AGENTS[agentId].systemPrompt, [{ role: 'user', content: enrichedQ }], pinnedNotes, agentId, workspace)
          setResponses(prev => ({ ...prev, [agentId]: text }))
        } catch (err) {
          setResponses(prev => ({ ...prev, [agentId]: `Error: ${err instanceof Error ? err.message : 'Failed'}` }))
        } finally {
          setLoading(prev => ({ ...prev, [agentId]: false }))
        }
      })
    )
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{ padding: '14px 16px 10px', borderBottom: `1px solid ${BORDER}`, flexShrink: 0 }}>
        <div style={{ fontFamily: FONT_HEADING, fontWeight: 700, fontSize: 15, color: TEXT }}>Council Chamber</div>
        <div style={{ fontSize: 11, color: MUTED, fontFamily: FONT_BODY, marginTop: 2 }}>All five advisors respond simultaneously. Bring a decision, idea, or dilemma.</div>
      </div>

      {topic && (
        <div style={{ padding: '8px 16px', background: `${GOLD}08`, borderBottom: `1px solid ${GOLD}20`, flexShrink: 0 }}>
          <div style={{ fontSize: 9, color: GOLD, fontFamily: FONT_HEADING, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 2 }}>Topic</div>
          <div style={{ fontSize: 13, color: TEXT, fontFamily: FONT_BODY, lineHeight: 1.5 }}>{topic}</div>
        </div>
      )}

      <div style={{ flex: 1, overflowY: 'auto', padding: 12 } as React.CSSProperties}>
        {!topic ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 10, opacity: 0.45 }}>
            <div style={{ fontSize: 36, lineHeight: 1 }}>⊙</div>
            <div style={{ fontFamily: FONT_HEADING, fontWeight: 600, fontSize: 14, color: MUTED }}>The Council awaits</div>
            <div style={{ fontSize: 12, color: MUTED, fontFamily: FONT_BODY, textAlign: 'center', maxWidth: 240, lineHeight: 1.5 }}>
              Type a question or decision below. All five advisors will respond at once.
            </div>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 10 }}>
            {COUNCIL_AGENT_IDS.map(agentId => {
              const a = AGENTS[agentId]
              const response = responses[agentId]
              const isLoading = loading[agentId]
              const done = !!response && !isLoading
              return (
                <div key={agentId} style={{
                  padding: '12px 14px', borderRadius: 12,
                  border: `1px solid ${done ? BORDER : `${BORDER}80`}`,
                  background: done ? SURFACE2 : `${SURFACE2}60`,
                  display: 'flex', flexDirection: 'column', gap: 8,
                  transition: 'all 0.2s',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                    <span style={{ fontSize: 17, lineHeight: 1, color: done ? TEXT : MUTED }}>{a.icon}</span>
                    <span style={{ fontFamily: FONT_HEADING, fontWeight: 700, fontSize: 11, color: done ? TEXT : MUTED, letterSpacing: '0.02em' }}>{a.short ?? a.label.replace(/^\d+\s*/, '')}</span>
                    {isLoading && <ThinkingDots />}
                    {done && <span style={{ marginLeft: 'auto', fontSize: 9, padding: '2px 6px', borderRadius: 6, background: `${GOLD}15`, color: GOLD, fontFamily: FONT_HEADING, fontWeight: 600, letterSpacing: '0.06em' }}>SPOKE</span>}
                  </div>
                  {isLoading && !response && (
                    <div style={{ fontSize: 12, color: MUTED, fontFamily: FONT_BODY, lineHeight: 1.6 }}>Deliberating…</div>
                  )}
                  {response && (
                    <div style={{ fontSize: 12, color: TEXT, fontFamily: FONT_BODY, lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{response}</div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      <div style={{ padding: '10px 12px 12px', borderTop: `1px solid ${BORDER}`, flexShrink: 0 }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', background: SURFACE2, border: `1px solid ${BORDER}`, borderRadius: 12, padding: '8px 8px 8px 14px' }}>
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); convene() } }}
            placeholder="Bring a decision to The Council… (Enter to convene)"
            rows={1}
            style={{ flex: 1, background: 'none', border: 'none', outline: 'none', color: TEXT, fontSize: 15, resize: 'none', lineHeight: 1.5, maxHeight: 100, overflowY: 'auto', fontFamily: FONT_BODY }}
            onInput={e => { const t = e.currentTarget; t.style.height = 'auto'; t.style.height = Math.min(t.scrollHeight, 100) + 'px' }}
          />
          <button onClick={convene} disabled={!input.trim() || anyLoading} style={{
            padding: '8px 14px', borderRadius: 8,
            background: input.trim() && !anyLoading ? GOLD : SURFACE2,
            color: input.trim() && !anyLoading ? BG : MUTED,
            fontFamily: FONT_HEADING, fontWeight: 700, fontSize: 13,
            border: 'none', cursor: input.trim() && !anyLoading ? 'pointer' : 'not-allowed',
            transition: 'all 0.15s', flexShrink: 0,
          }}>
            {anyLoading ? '…' : 'Convene'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── ClientsView ─────────────────────────────────────────────────────────────

interface Client {
  id: string
  name: string
  phone?: string
  whatsapp?: string
  email?: string
  website?: string
  industry?: string
  notes?: string
  created_at?: string
}

const BLANK_CLIENT: Omit<Client, 'id' | 'created_at'> = { name: '', phone: '', whatsapp: '', email: '', website: '', industry: '', notes: '' }

function ClientsView({ onOpenAgent }: { onOpenAgent: (agentId: AgentId, prompt: string) => void }) {
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<string | 'new' | null>(null)
  const [form, setForm] = useState<typeof BLANK_CLIENT>(BLANK_CLIENT)
  const [saving, setSaving] = useState(false)
  const [searchQ, setSearchQ] = useState('')

  const load = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/clients')
      const data = await res.json()
      if (Array.isArray(data)) setClients(data)
    } catch { /* non-fatal */ }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const openNew = () => { setForm(BLANK_CLIENT); setEditing('new') }
  const openEdit = (c: Client) => { setForm({ name: c.name, phone: c.phone ?? '', whatsapp: c.whatsapp ?? '', email: c.email ?? '', website: c.website ?? '', industry: c.industry ?? '', notes: c.notes ?? '' }); setEditing(c.id) }
  const set = (k: keyof typeof BLANK_CLIENT, v: string) => setForm(p => ({ ...p, [k]: v }))

  const handleSave = async () => {
    if (!form.name.trim()) return
    setSaving(true)
    try {
      if (editing === 'new') {
        const res = await fetch('/api/clients', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(form) })
        const data = await res.json()
        if (res.ok) setClients(p => [data, ...p])
      } else {
        await fetch('/api/clients', { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ id: editing, ...form }) })
        setClients(p => p.map(c => c.id === editing ? { ...c, ...form } : c))
      }
      setEditing(null)
    } catch { /* non-fatal */ }
    finally { setSaving(false) }
  }

  const handleDelete = async (id: string) => {
    await fetch('/api/clients', { method: 'DELETE', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ id }) })
    setClients(p => p.filter(c => c.id !== id))
  }

  const inputStyle: React.CSSProperties = { padding: '8px 12px', borderRadius: 8, border: `1px solid ${BORDER}`, background: SURFACE2, color: TEXT, fontSize: 14, fontFamily: FONT_BODY, outline: 'none', width: '100%', boxSizing: 'border-box' }
  const labelStyle: React.CSSProperties = { fontSize: 10, fontFamily: FONT_HEADING, fontWeight: 600, color: MUTED, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 4, display: 'block' }

  const visible = clients.filter(c =>
    !searchQ || c.name.toLowerCase().includes(searchQ.toLowerCase()) || (c.industry ?? '').toLowerCase().includes(searchQ.toLowerCase())
  )

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '16px 12px' }}>
      <div style={{ maxWidth: 680, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, gap: 10 }}>
          <div>
            <div style={{ fontFamily: FONT_HEADING, fontWeight: 700, fontSize: 15, color: TEXT }}>Clients</div>
            <div style={{ fontSize: 12, color: MUTED, fontFamily: FONT_BODY, marginTop: 2 }}>{clients.length} contact{clients.length !== 1 ? 's' : ''}</div>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input value={searchQ} onChange={e => setSearchQ(e.target.value)} placeholder="Search…" style={{ ...inputStyle, width: 140, padding: '6px 10px', fontSize: 12 }} />
            <button onClick={openNew} style={{ padding: '7px 14px', background: GOLD, border: 'none', borderRadius: 8, color: BG, fontFamily: FONT_HEADING, fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>+ Add Client</button>
          </div>
        </div>

        {editing && (
          <div style={{ border: `1px solid ${BORDER}`, borderRadius: 12, padding: '16px', marginBottom: 14, background: SURFACE }}>
            <div style={{ fontFamily: FONT_HEADING, fontWeight: 600, fontSize: 13, color: TEXT, marginBottom: 12 }}>{editing === 'new' ? 'New Client' : 'Edit Client'}</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {([['name', 'Client Name *'], ['industry', 'Industry'], ['phone', 'Phone'], ['whatsapp', 'WhatsApp'], ['email', 'Email'], ['website', 'Website URL']] as [keyof typeof BLANK_CLIENT, string][]).map(([k, label]) => (
                <div key={k} style={{ gridColumn: k === 'name' ? 'span 2' : undefined }}>
                  <label style={labelStyle}>{label}</label>
                  <input value={form[k]} onChange={e => set(k, e.target.value)} style={inputStyle} placeholder={label.replace(' *', '')} />
                </div>
              ))}
              <div style={{ gridColumn: 'span 2' }}>
                <label style={labelStyle}>Notes</label>
                <textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows={3} style={{ ...inputStyle, resize: 'vertical' }} placeholder="Project history, preferences, key contacts…" />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
              <button onClick={handleSave} disabled={saving || !form.name.trim()} style={{ flex: 1, padding: '9px 0', background: GOLD, border: 'none', borderRadius: 8, color: BG, fontFamily: FONT_HEADING, fontWeight: 700, fontSize: 13, cursor: saving ? 'default' : 'pointer', opacity: saving || !form.name.trim() ? 0.6 : 1 }}>
                {saving ? 'Saving…' : 'Save Client'}
              </button>
              <button onClick={() => setEditing(null)} style={{ padding: '9px 16px', background: 'none', border: `1px solid ${BORDER}`, borderRadius: 8, color: MUTED, fontFamily: FONT_BODY, fontSize: 13, cursor: 'pointer' }}>Cancel</button>
            </div>
          </div>
        )}

        {loading && <div style={{ textAlign: 'center', padding: '48px 0', color: MUTED, fontFamily: FONT_BODY }}><ThinkingDots /></div>}

        {!loading && visible.length === 0 && (
          <div style={{ textAlign: 'center', padding: '64px 0', color: MUTED, fontFamily: FONT_BODY }}>
            <div style={{ fontSize: 28, marginBottom: 12 }}>👥</div>
            <div style={{ fontSize: 14, marginBottom: 6 }}>{searchQ ? 'No clients match your search' : 'No clients yet'}</div>
            {!searchQ && <div style={{ fontSize: 12 }}>Add your first client to keep all contact info in one place.</div>}
          </div>
        )}

        {visible.map(c => (
          <div key={c.id} style={{ border: `1px solid ${BORDER}`, borderRadius: 10, padding: '12px 14px', marginBottom: 8, background: SURFACE }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: FONT_HEADING, fontWeight: 600, fontSize: 14, color: TEXT }}>{c.name}</div>
                {c.industry && <div style={{ fontSize: 11, color: MUTED, fontFamily: FONT_BODY, marginTop: 1 }}>{c.industry}</div>}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 7 }}>
                  {c.phone && <a href={`tel:${c.phone}`} style={{ fontSize: 11, color: MUTED, fontFamily: FONT_BODY, textDecoration: 'none' }}>📞 {c.phone}</a>}
                  {c.whatsapp && <a href={`https://wa.me/${c.whatsapp.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, color: WA_GREEN, fontFamily: FONT_BODY, textDecoration: 'none' }}>💬 WhatsApp</a>}
                  {c.email && <a href={`mailto:${c.email}`} style={{ fontSize: 11, color: MUTED, fontFamily: FONT_BODY, textDecoration: 'none' }}>✉ {c.email}</a>}
                  {c.website && <a href={c.website} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, color: GOLD, fontFamily: FONT_BODY, textDecoration: 'none' }}>↗ Website</a>}
                  <a href={`https://www.google.com/maps/search/${encodeURIComponent(`${c.name}${c.industry ? ' ' + c.industry : ''} Ghana`)}`} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, color: '#4285F4', fontFamily: FONT_BODY, textDecoration: 'none' }}>📍 Maps</a>
                </div>
                {c.notes && <div style={{ fontSize: 11, color: MUTED, fontFamily: FONT_BODY, marginTop: 7, lineHeight: 1.5 }}>{c.notes.slice(0, 120)}{c.notes.length > 120 ? '…' : ''}</div>}
              </div>
              <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                <button onClick={() => openEdit(c)} style={{ fontSize: 11, padding: '4px 9px', border: `1px solid ${BORDER}`, borderRadius: 6, background: 'none', color: MUTED, cursor: 'pointer', fontFamily: FONT_BODY }}>Edit</button>
                <button onClick={() => handleDelete(c.id)} style={{ fontSize: 11, padding: '4px 9px', border: `1px solid ${BORDER}`, borderRadius: 6, background: 'none', color: MUTED, cursor: 'pointer', fontFamily: FONT_BODY }}>✕</button>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 5, marginTop: 10, flexWrap: 'wrap' }}>
              <button onClick={() => onOpenAgent('content', `Write a professional follow-up or proposal for this client:\nName: ${c.name}\nIndustry: ${c.industry ?? 'unknown'}\n${c.notes ? 'Notes: ' + c.notes : ''}`)} style={{ fontSize: 10, padding: '3px 8px', borderRadius: 12, border: `1px solid ${BORDER}`, background: 'transparent', color: MUTED, fontFamily: FONT_BODY, cursor: 'pointer' }}>
                ✦ Write Pitch
              </button>
              <button onClick={() => onOpenAgent('scope', `Scope a project for this client:\nName: ${c.name}\nIndustry: ${c.industry ?? 'unknown'}\n${c.notes ? 'Notes: ' + c.notes : ''}`)} style={{ fontSize: 10, padding: '3px 8px', borderRadius: 12, border: `1px solid ${BORDER}`, background: 'transparent', color: MUTED, fontFamily: FONT_BODY, cursor: 'pointer' }}>
                ◈ Scope Project
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── GlobalSearch ─────────────────────────────────────────────────────────────

interface SearchHit {
  agent_id: string
  role: 'user' | 'assistant'
  content: string
  created_at: string
}

interface LocalHit {
  type: 'deal' | 'invoice'
  id: string
  title: string
  subtitle: string
  badge: string
  badgeColor: string
}

function ConversationSearch({ onClose, deals, invoices }: { onClose: () => void; deals: Deal[]; invoices: Invoice[] }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchHit[]>([])
  const [searching, setSearching] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { inputRef.current?.focus() }, [])

  const search = async (q: string) => {
    if (!q.trim()) { setResults([]); return }
    setSearching(true)
    try {
      const res = await fetch(`/api/conversations?q=${encodeURIComponent(q)}`)
      const data = await res.json()
      setResults(Array.isArray(data) ? data : [])
    } catch { setResults([]) }
    finally { setSearching(false) }
  }

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const handleChange = (v: string) => {
    setQuery(v)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => search(v), 400)
  }

  const agentLabel = (id: string) => AGENTS[id as AgentId]?.label ?? id

  const localHits = useMemo<LocalHit[]>(() => {
    const q = query.toLowerCase().trim()
    if (!q) return []
    const hits: LocalHit[] = []
    deals.forEach(d => {
      if ([d.name, d.industry, d.phone ?? ''].some(f => f.toLowerCase().includes(q))) {
        hits.push({ type: 'deal', id: d.id, title: d.name, subtitle: `${d.industry} · GHS ${d.valueGHS.toLocaleString()}`, badge: STAGE_LABELS[d.stage], badgeColor: STAGE_COLOR[d.stage] })
      }
    })
    invoices.forEach(inv => {
      if ([inv.clientName, inv.description].some(f => f.toLowerCase().includes(q))) {
        hits.push({ type: 'invoice', id: inv.id, title: inv.clientName, subtitle: `${inv.description} · GHS ${inv.totalGHS.toLocaleString()}`, badge: INV_STATUS_LABEL[inv.status], badgeColor: INV_STATUS_COLOR[inv.status] })
      }
    })
    return hits
  }, [query, deals, invoices])

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 200, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: 60 }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div style={{ width: '100%', maxWidth: 600, background: SURFACE, borderRadius: 14, border: `1px solid ${BORDER}`, overflow: 'hidden', maxHeight: '75vh', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', borderBottom: `1px solid ${BORDER}` }}>
          <span style={{ color: MUTED, fontSize: 16 }}>⌕</span>
          <input
            ref={inputRef}
            value={query}
            onChange={e => handleChange(e.target.value)}
            placeholder="Search deals, invoices, conversations…"
            style={{ flex: 1, background: 'none', border: 'none', outline: 'none', color: TEXT, fontSize: 15, fontFamily: FONT_BODY }}
          />
          {searching && <ThinkingDots />}
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: MUTED, fontSize: 18, cursor: 'pointer', padding: 0 }}>✕</button>
        </div>
        <div style={{ overflowY: 'auto', flex: 1 }}>
          {localHits.length > 0 && (
            <>
              <div style={{ padding: '8px 16px 4px', fontSize: 10, fontFamily: FONT_HEADING, fontWeight: 600, color: MUTED, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Deals & Invoices</div>
              {localHits.map(h => (
                <div key={`${h.type}-${h.id}`} style={{ padding: '10px 16px', borderBottom: `1px solid ${BORDER}`, display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontFamily: FONT_HEADING, fontWeight: 600, color: TEXT }}>{h.title}</div>
                    <div style={{ fontSize: 11, color: MUTED, fontFamily: FONT_BODY, marginTop: 2 }}>{h.subtitle}</div>
                  </div>
                  <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 10, background: `${h.badgeColor}20`, color: h.badgeColor, fontFamily: FONT_HEADING, fontWeight: 600, whiteSpace: 'nowrap' }}>{h.badge}</span>
                </div>
              ))}
              {results.length > 0 && <div style={{ padding: '8px 16px 4px', fontSize: 10, fontFamily: FONT_HEADING, fontWeight: 600, color: MUTED, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Conversations</div>}
            </>
          )}
          {localHits.length === 0 && results.length === 0 && query && !searching && (
            <div style={{ padding: '32px 0', textAlign: 'center', color: MUTED, fontFamily: FONT_BODY, fontSize: 13 }}>No results for &ldquo;{query}&rdquo;</div>
          )}
          {localHits.length === 0 && results.length === 0 && !query && (
            <div style={{ padding: '32px 0', textAlign: 'center', color: MUTED, fontFamily: FONT_BODY, fontSize: 13 }}>Search deals, invoices, and agent conversations</div>
          )}
          {results.map((hit, i) => {
            const dt = new Date(hit.created_at)
            const dateStr = dt.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) + ' · ' + dt.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
            const excerpt = hit.content.length > 200 ? hit.content.slice(0, 200) + '…' : hit.content
            return (
              <div key={i} style={{ padding: '12px 16px', borderBottom: `1px solid ${BORDER}` }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
                  <span style={{ fontSize: 10, fontFamily: FONT_HEADING, fontWeight: 600, color: GOLD, background: `${GOLD}18`, padding: '2px 7px', borderRadius: 10 }}>{agentLabel(hit.agent_id)}</span>
                  <span style={{ fontSize: 10, color: MUTED, fontFamily: FONT_BODY, textTransform: 'capitalize' }}>{hit.role}</span>
                  <span style={{ fontSize: 10, color: MUTED, fontFamily: FONT_BODY, marginLeft: 'auto' }}>{dateStr}</span>
                </div>
                <div style={{ fontSize: 12, color: TEXT, fontFamily: FONT_BODY, lineHeight: 1.6 }}>{excerpt}</div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ─── AgentRunHistory ──────────────────────────────────────────────────────────

interface AgentRun {
  id: string
  run_at: string
  industry: string | null
  city: string | null
  social_results: string | null
  prospect_results: string | null
  pitch_drafts: string | null
  pipeline_summary: string | null
}

function RunCard({ run }: { run: AgentRun }) {
  const [open, setOpen] = useState<string | null>(null)

  const dt = new Date(run.run_at)
  const dateStr = dt.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
  const timeStr = dt.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })

  const sections: Array<{ key: string; icon: string; label: string; content: string | null }> = [
    { key: 'social', icon: '⌖', label: 'SocialScout — Social Leads', content: run.social_results },
    { key: 'prospect', icon: '◎', label: 'ProspectBot — Business Leads', content: run.prospect_results },
    { key: 'pitches', icon: '✦', label: 'ContentBot — Pitch Drafts', content: run.pitch_drafts },
    { key: 'pipeline', icon: '⊙', label: 'RevenueBot — Pipeline Status', content: run.pipeline_summary },
  ]

  const filledCount = sections.filter(s => s.content?.trim()).length

  return (
    <div style={{ border: `1px solid ${BORDER}`, borderRadius: 10, overflow: 'hidden', marginBottom: 10 }}>
      <div
        style={{ padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', background: SURFACE }}
        onClick={() => setOpen(open === 'all' ? null : 'all')}
      >
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontFamily: FONT_HEADING, fontWeight: 600, fontSize: 13, color: TEXT }}>{dateStr} · {timeStr}</span>
            {run.industry && <span style={{ fontSize: 10, fontFamily: FONT_HEADING, color: GOLD, background: `${GOLD}18`, padding: '2px 7px', borderRadius: 10, fontWeight: 600 }}>{run.industry}</span>}
            {run.city && <span style={{ fontSize: 10, fontFamily: FONT_HEADING, color: MUTED, background: SURFACE2, padding: '2px 7px', borderRadius: 10 }}>{run.city}</span>}
          </div>
          <div style={{ fontSize: 11, color: MUTED, fontFamily: FONT_BODY, marginTop: 3 }}>{filledCount}/4 agents reported</div>
        </div>
        <span style={{ fontSize: 14, color: MUTED, transform: open === 'all' ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>▾</span>
      </div>

      {open === 'all' && (
        <div style={{ borderTop: `1px solid ${BORDER}` }}>
          {sections.map(s => (
            <div key={s.key} style={{ borderBottom: `1px solid ${BORDER}` }}>
              <button
                onClick={() => setOpen(open === s.key ? 'all' : s.key)}
                style={{ width: '100%', textAlign: 'left', padding: '10px 14px', background: 'none', border: 'none', cursor: s.content ? 'pointer' : 'default', display: 'flex', alignItems: 'center', gap: 8 }}
              >
                <span style={{ fontSize: 13, color: GOLD }}>{s.icon}</span>
                <span style={{ fontFamily: FONT_HEADING, fontSize: 12, fontWeight: 600, color: s.content ? TEXT : MUTED, letterSpacing: '0.04em', flex: 1 }}>{s.label}</span>
                {!s.content && <span style={{ fontSize: 10, color: MUTED, fontFamily: FONT_BODY }}>no data</span>}
                {s.content && <span style={{ fontSize: 12, color: MUTED }}>▾</span>}
              </button>
              {open === s.key && s.content && (
                <div style={{ padding: '0 14px 14px', background: SURFACE2 }}>
                  <pre style={{ margin: 0, fontFamily: FONT_BODY, fontSize: 12, color: TEXT, whiteSpace: 'pre-wrap', lineHeight: 1.65, wordBreak: 'break-word' }}>{s.content}</pre>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function AgentRunHistory() {
  const [runs, setRuns] = useState<AgentRun[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [offset, setOffset] = useState(0)
  const [running, setRunning] = useState(false)
  const [runStatus, setRunStatus] = useState<{ ok: boolean; msg: string } | null>(null)
  const limit = 10

  const load = async (off: number) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/agents/history?limit=${limit}&offset=${off}`)
      const data = await res.json()
      setRuns(off === 0 ? (data.runs ?? []) : prev => [...prev, ...(data.runs ?? [])])
      setTotal(data.total ?? 0)
    } catch { /* non-fatal */ }
    finally { setLoading(false) }
  }

  useEffect(() => { load(0) }, [])

  const handleRunNow = async () => {
    setRunning(true)
    setRunStatus(null)
    try {
      const res = await fetch('/api/agents/run')
      const data = await res.json()
      if (res.ok && data.ok) {
        setRunStatus({ ok: true, msg: `Run complete — ${data.industry ?? ''} · ${data.city ?? ''}` })
        setOffset(0)
        await load(0)
      } else {
        setRunStatus({ ok: false, msg: data.error ?? `Error ${res.status}` })
      }
    } catch (e) {
      setRunStatus({ ok: false, msg: e instanceof Error ? e.message : 'Network error' })
    } finally {
      setRunning(false)
    }
  }

  const hasMore = runs.length < total

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '16px 12px' }}>
      <div style={{ maxWidth: 740, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16, gap: 10 }}>
          <div>
            <div style={{ fontFamily: FONT_HEADING, fontWeight: 700, fontSize: 15, color: TEXT, letterSpacing: '0.04em' }}>Agent Run History</div>
            <div style={{ fontSize: 12, color: MUTED, fontFamily: FONT_BODY, marginTop: 2 }}>
              {total > 0 ? `${total} autonomous run${total !== 1 ? 's' : ''} saved` : 'Runs every day at 3 AM — or trigger manually below'}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
            <button onClick={() => { setOffset(0); load(0) }} disabled={loading} style={{ fontSize: 11, color: MUTED, padding: '5px 10px', border: `1px solid ${BORDER}`, borderRadius: 6, fontFamily: FONT_BODY, background: 'none', cursor: 'pointer' }}>
              Refresh
            </button>
            <button
              onClick={handleRunNow}
              disabled={running}
              style={{ fontSize: 11, color: running ? MUTED : '#fff', padding: '5px 12px', border: 'none', borderRadius: 6, fontFamily: FONT_HEADING, fontWeight: 600, background: running ? SURFACE2 : GOLD, cursor: running ? 'default' : 'pointer', transition: 'background 0.15s' }}
            >
              {running ? 'Running…' : '▶ Run Now'}
            </button>
          </div>
        </div>

        {runStatus && (
          <div style={{ marginBottom: 12, padding: '10px 14px', borderRadius: 8, background: runStatus.ok ? '#16a34a18' : '#dc262618', border: `1px solid ${runStatus.ok ? '#16a34a40' : '#dc262640'}`, fontFamily: FONT_BODY, fontSize: 12, color: runStatus.ok ? '#16a34a' : '#dc2626' }}>
            {runStatus.ok ? '✓ ' : '✗ '}{runStatus.msg}
          </div>
        )}

        {(loading || running) && runs.length === 0 && (
          <div style={{ textAlign: 'center', padding: '48px 0', color: MUTED, fontFamily: FONT_BODY, fontSize: 13 }}>
            <ThinkingDots />
            {running && <div style={{ marginTop: 8, fontSize: 11 }}>Agents are working — this takes 30–60 seconds</div>}
          </div>
        )}

        {!loading && !running && runs.length === 0 && (
          <div style={{ textAlign: 'center', padding: '64px 0', color: MUTED, fontFamily: FONT_BODY }}>
            <div style={{ fontSize: 28, marginBottom: 12 }}>🤖</div>
            <div style={{ fontSize: 14, marginBottom: 6 }}>No runs recorded yet</div>
            <div style={{ fontSize: 12, marginBottom: 16 }}>Click Run Now above to trigger the agents immediately.</div>
            <div style={{ fontSize: 11, color: MUTED }}>Requires GROQ_API_KEY and Supabase configured in Vercel.</div>
          </div>
        )}

        {runs.map(run => <RunCard key={run.id} run={run} />)}

        {hasMore && (
          <button
            onClick={() => { const next = offset + limit; setOffset(next); load(next) }}
            disabled={loading}
            style={{ width: '100%', padding: '10px 0', marginTop: 4, background: 'none', border: `1px solid ${BORDER}`, borderRadius: 8, color: loading ? MUTED : TEXT, fontFamily: FONT_HEADING, fontSize: 12, cursor: loading ? 'default' : 'pointer' }}
          >
            {loading ? 'Loading…' : `Load more (${total - runs.length} remaining)`}
          </button>
        )}
      </div>
    </div>
  )
}

// ─── ProspectMapView ──────────────────────────────────────────────────────────

interface PlaceResult {
  id: string
  name: string
  address: string
  phone?: string
  website?: string
  hasWebsite: boolean
  rating?: number
  ratingCount?: number
  mapsUrl: string
}

const GHANA_CITIES = ['Accra', 'Kumasi', 'Takoradi', 'Tamale', 'Cape Coast', 'Sunyani', 'Ho', 'Koforidua', 'Wa', 'Bolgatanga']

function ProspectMapView({ onAdd }: { onAdd: (d: Omit<Deal, 'id' | 'createdAt'>) => void }) {
  const [query, setQuery] = useState('')
  const [city, setCity] = useState('Accra')
  const [results, setResults] = useState<PlaceResult[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [noWebsiteOnly, setNoWebsiteOnly] = useState(false)
  const [added, setAdded] = useState<Set<string>>(new Set())

  const search = async () => {
    if (!query.trim()) return
    setLoading(true); setError(''); setResults([])
    try {
      const res = await fetch('/api/maps/search', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ query, city }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Search failed'); return }
      setResults(Array.isArray(data) ? data : [])
    } catch { setError('Network error') }
    finally { setLoading(false) }
  }

  const handleAdd = (p: PlaceResult) => {
    onAdd({
      name: p.name,
      industry: query,
      valueGHS: 0,
      stage: 'found',
      phone: p.phone ? p.phone.replace(/\s/g, '').replace(/^0/, '+233') : undefined,
    })
    setAdded(prev => new Set([...prev, p.id]))
  }

  const visible = noWebsiteOnly ? results.filter(p => !p.hasWebsite) : results
  const noWebsiteCount = results.filter(p => !p.hasWebsite).length

  const inputStyle: React.CSSProperties = { padding: '8px 12px', borderRadius: 8, border: `1px solid ${BORDER}`, background: SURFACE2, color: TEXT, fontSize: 14, fontFamily: FONT_BODY, outline: 'none', boxSizing: 'border-box' }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      {/* Search bar */}
      <div style={{ padding: '14px 16px', borderBottom: `1px solid ${BORDER}`, flexShrink: 0 }}>
        <div style={{ fontFamily: FONT_HEADING, fontWeight: 700, fontSize: 15, color: TEXT, marginBottom: 10 }}>
          Find Prospects on Google Maps
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && search()}
            placeholder="e.g. restaurants, clinics, pharmacies…"
            style={{ ...inputStyle, flex: 2, minWidth: 160 }}
          />
          <select
            value={city}
            onChange={e => setCity(e.target.value)}
            style={{ ...inputStyle, flex: 1, minWidth: 100 }}
          >
            {GHANA_CITIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <button
            onClick={search}
            disabled={loading || !query.trim()}
            style={{ padding: '8px 18px', borderRadius: 8, background: loading || !query.trim() ? SURFACE2 : GOLD, color: loading || !query.trim() ? MUTED : '#fff', border: 'none', fontFamily: FONT_HEADING, fontWeight: 700, fontSize: 13, cursor: loading || !query.trim() ? 'default' : 'pointer' }}
          >
            {loading ? '…' : 'Search'}
          </button>
        </div>

        {results.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 10 }}>
            <div style={{ fontSize: 12, color: MUTED, fontFamily: FONT_BODY }}>
              {results.length} businesses found · <span style={{ color: GOLD, fontWeight: 600 }}>{noWebsiteCount} without a website</span>
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: 5, cursor: 'pointer', marginLeft: 'auto' }}>
              <input type="checkbox" checked={noWebsiteOnly} onChange={e => setNoWebsiteOnly(e.target.checked)} />
              <span style={{ fontSize: 11, fontFamily: FONT_BODY, color: MUTED }}>No website only</span>
            </label>
          </div>
        )}

        {error && <div style={{ marginTop: 8, fontSize: 12, color: '#f87171', fontFamily: FONT_BODY }}>{error}</div>}
      </div>

      {/* Results */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '10px 16px' }}>
        {!loading && results.length === 0 && !error && (
          <div style={{ textAlign: 'center', padding: '48px 0', color: MUTED, fontFamily: FONT_BODY }}>
            <div style={{ fontSize: 28, marginBottom: 10 }}>📍</div>
            <div style={{ fontSize: 14 }}>Search for businesses in Ghana</div>
            <div style={{ fontSize: 12, marginTop: 6, opacity: 0.7 }}>Businesses without a website are flagged as prime prospects</div>
          </div>
        )}
        {loading && (
          <div style={{ textAlign: 'center', padding: '48px 0', color: MUTED, fontFamily: FONT_BODY }}>
            <ThinkingDots />
            <div style={{ fontSize: 12, marginTop: 10 }}>Searching Google Maps…</div>
          </div>
        )}
        {visible.map(p => {
          const isAdded = added.has(p.id)
          const isPrime = !p.hasWebsite
          return (
            <div key={p.id} style={{
              marginBottom: 10, borderRadius: 12, padding: '12px 14px',
              border: `1px solid ${isPrime ? `${GOLD}50` : BORDER}`,
              background: isPrime ? `${GOLD}06` : SURFACE,
            }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                    <span style={{ fontFamily: FONT_HEADING, fontWeight: 600, fontSize: 14, color: TEXT }}>{p.name}</span>
                    {isPrime && (
                      <span style={{ fontSize: 9, padding: '2px 7px', borderRadius: 10, background: `${GOLD}25`, color: GOLD, fontFamily: FONT_HEADING, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                        No Website
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: 11, color: MUTED, fontFamily: FONT_BODY, marginTop: 3 }}>{p.address}</div>
                  <div style={{ display: 'flex', gap: 10, marginTop: 6, flexWrap: 'wrap' }}>
                    {p.phone && (
                      <a href={`tel:${p.phone}`} style={{ fontSize: 11, color: MUTED, fontFamily: FONT_BODY, textDecoration: 'none' }}>📞 {p.phone}</a>
                    )}
                    {p.rating && (
                      <span style={{ fontSize: 11, color: MUTED, fontFamily: FONT_BODY }}>⭐ {p.rating.toFixed(1)} ({p.ratingCount?.toLocaleString()})</span>
                    )}
                    {p.website && (
                      <a href={p.website} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, color: MUTED, fontFamily: FONT_BODY, textDecoration: 'none', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 180, whiteSpace: 'nowrap' }}>↗ {p.website.replace(/^https?:\/\//, '').replace(/\/$/, '')}</a>
                    )}
                    <a href={p.mapsUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, color: '#4285F4', fontFamily: FONT_BODY, textDecoration: 'none' }}>📍 View on Maps</a>
                  </div>
                </div>
                <button
                  onClick={() => handleAdd(p)}
                  disabled={isAdded}
                  style={{
                    flexShrink: 0, padding: '5px 12px', borderRadius: 8,
                    border: `1px solid ${isAdded ? BORDER : isPrime ? GOLD : BORDER}`,
                    background: isAdded ? SURFACE2 : isPrime ? GOLD : 'transparent',
                    color: isAdded ? MUTED : isPrime ? '#fff' : MUTED,
                    fontFamily: FONT_HEADING, fontWeight: 600, fontSize: 11,
                    cursor: isAdded ? 'default' : 'pointer',
                  }}
                >
                  {isAdded ? '✓ Added' : '+ Pipeline'}
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── AnalyticsView ────────────────────────────────────────────────────────────

function AnalyticsView({ deals }: { deals: Deal[] }) {
  const [invoices, setInvoices] = useState<Invoice[]>(loadInvoices)

  useEffect(() => {
    fetch('/api/invoices', { cache: 'no-store' })
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (Array.isArray(d) && d.length > 0) setInvoices(d) })
      .catch(() => {})
  }, [])

  // Monthly revenue collected (last 6 months)
  const months = useMemo(() => {
    const result: { label: string; collected: number; invoiced: number }[] = []
    for (let i = 5; i >= 0; i--) {
      const d = new Date()
      d.setDate(1)
      d.setMonth(d.getMonth() - i)
      const y = d.getFullYear(); const m = d.getMonth()
      const label = d.toLocaleDateString('en-GB', { month: 'short', year: '2-digit' })
      let collected = 0; let invoiced = 0
      invoices.forEach(inv => {
        const created = new Date(inv.createdAt)
        if (created.getFullYear() === y && created.getMonth() === m) invoiced += inv.totalGHS
        inv.milestones.forEach(ms => {
          if (ms.paidAt) {
            const pd = new Date(ms.paidAt)
            if (pd.getFullYear() === y && pd.getMonth() === m) collected += ms.amountGHS
          }
        })
      })
      result.push({ label, collected, invoiced })
    }
    return result
  }, [invoices])

  const maxVal = Math.max(...months.map(m => Math.max(m.collected, m.invoiced)), 1)

  // Deal funnel
  const stageCounts = useMemo(() => STAGES.map(s => ({ stage: s, count: deals.filter(d => d.stage === s).length, value: deals.filter(d => d.stage === s).reduce((sum, d) => sum + d.valueGHS, 0) })), [deals])

  // Top clients by invoice value
  const topClients = useMemo(() => {
    const map: Record<string, number> = {}
    invoices.forEach(inv => { map[inv.clientName] = (map[inv.clientName] ?? 0) + inv.totalGHS })
    return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 5)
  }, [invoices])

  const totalCollected = invoices.reduce((s, inv) => s + inv.milestones.filter(m => m.paidAt).reduce((ms, m) => ms + m.amountGHS, 0), 0)
  const totalInvoiced = invoices.reduce((s, inv) => s + inv.totalGHS, 0)
  const closedDeals = deals.filter(d => d.stage === 'closed').length
  const totalDeals = deals.filter(d => d.stage !== 'lost').length
  const conversionRate = totalDeals > 0 ? Math.round((closedDeals / totalDeals) * 100) : 0

  const card = (label: string, value: string, sub?: string) => (
    <div style={{ flex: 1, minWidth: 120, padding: '12px 14px', borderRadius: 12, background: SURFACE2, border: `1px solid ${BORDER}` }}>
      <div style={{ fontSize: 9, fontFamily: FONT_HEADING, fontWeight: 600, color: MUTED, textTransform: 'uppercase', letterSpacing: '0.1em' }}>{label}</div>
      <div style={{ fontSize: 18, fontFamily: FONT_HEADING, fontWeight: 700, color: TEXT, marginTop: 4 }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: MUTED, fontFamily: FONT_BODY, marginTop: 2 }}>{sub}</div>}
    </div>
  )

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
      <div style={{ fontFamily: FONT_HEADING, fontWeight: 700, fontSize: 16, color: TEXT, marginBottom: 14 }}>Analytics</div>

      {/* KPI cards */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 20 }}>
        {card('Collected', `GHS ${totalCollected.toLocaleString()}`, `of GHS ${totalInvoiced.toLocaleString()} invoiced`)}
        {card('Outstanding', `GHS ${(totalInvoiced - totalCollected).toLocaleString()}`, `${invoices.filter(i => i.status !== 'paid' && i.status !== 'draft').length} open invoices`)}
        {card('Conversion', `${conversionRate}%`, `${closedDeals} of ${totalDeals} deals closed`)}
        {card('Pipeline', `GHS ${Math.round(deals.reduce((s, d) => s + d.valueGHS * STAGE_WEIGHT[d.stage], 0)).toLocaleString()}`, 'weighted forecast')}
      </div>

      {/* Monthly revenue chart */}
      <div style={{ marginBottom: 20, padding: '14px 16px', borderRadius: 12, background: SURFACE, border: `1px solid ${BORDER}` }}>
        <div style={{ fontSize: 11, fontFamily: FONT_HEADING, fontWeight: 600, color: MUTED, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 12 }}>Monthly Revenue (GHS)</div>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 80 }}>
          {months.map(m => (
            <div key={m.label} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
              <div style={{ width: '100%', display: 'flex', gap: 2, alignItems: 'flex-end', height: 64 }}>
                <div style={{ flex: 1, background: BORDER, borderRadius: '2px 2px 0 0', height: `${Math.round((m.invoiced / maxVal) * 100)}%`, minHeight: m.invoiced > 0 ? 2 : 0 }} title={`Invoiced: GHS ${m.invoiced.toLocaleString()}`} />
                <div style={{ flex: 1, background: '#10B981', borderRadius: '2px 2px 0 0', height: `${Math.round((m.collected / maxVal) * 100)}%`, minHeight: m.collected > 0 ? 2 : 0 }} title={`Collected: GHS ${m.collected.toLocaleString()}`} />
              </div>
              <div style={{ fontSize: 9, color: MUTED, fontFamily: FONT_HEADING, fontWeight: 500, textAlign: 'center' }}>{m.label}</div>
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}><div style={{ width: 8, height: 8, borderRadius: 2, background: BORDER }} /><span style={{ fontSize: 10, color: MUTED, fontFamily: FONT_BODY }}>Invoiced</span></div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}><div style={{ width: 8, height: 8, borderRadius: 2, background: '#10B981' }} /><span style={{ fontSize: 10, color: MUTED, fontFamily: FONT_BODY }}>Collected</span></div>
        </div>
      </div>

      {/* Deal funnel */}
      <div style={{ marginBottom: 20, padding: '14px 16px', borderRadius: 12, background: SURFACE, border: `1px solid ${BORDER}` }}>
        <div style={{ fontSize: 11, fontFamily: FONT_HEADING, fontWeight: 600, color: MUTED, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 12 }}>Deal Funnel</div>
        {stageCounts.filter(s => s.stage !== 'lost').map(s => (
          <div key={s.stage} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <div style={{ width: 70, fontSize: 11, fontFamily: FONT_HEADING, fontWeight: 500, color: STAGE_COLOR[s.stage], flexShrink: 0 }}>{STAGE_LABELS[s.stage]}</div>
            <div style={{ flex: 1, height: 14, background: SURFACE2, borderRadius: 3, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${deals.length > 0 ? Math.round((s.count / deals.length) * 100) : 0}%`, background: STAGE_COLOR[s.stage], borderRadius: 3, opacity: 0.8 }} />
            </div>
            <div style={{ width: 24, fontSize: 11, fontFamily: FONT_HEADING, fontWeight: 700, color: TEXT, textAlign: 'right', flexShrink: 0 }}>{s.count}</div>
            <div style={{ width: 80, fontSize: 10, color: MUTED, fontFamily: FONT_BODY, textAlign: 'right', flexShrink: 0 }}>GHS {s.value.toLocaleString()}</div>
          </div>
        ))}
        {stageCounts.find(s => s.stage === 'lost') && (
          <div style={{ marginTop: 8, fontSize: 11, color: MUTED, fontFamily: FONT_BODY }}>
            {stageCounts.find(s => s.stage === 'lost')!.count} lost deal{stageCounts.find(s => s.stage === 'lost')!.count !== 1 ? 's' : ''}
          </div>
        )}
      </div>

      {/* Top clients */}
      {topClients.length > 0 && (
        <div style={{ padding: '14px 16px', borderRadius: 12, background: SURFACE, border: `1px solid ${BORDER}` }}>
          <div style={{ fontSize: 11, fontFamily: FONT_HEADING, fontWeight: 600, color: MUTED, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 12 }}>Top Clients by Invoice Value</div>
          {topClients.map(([name, val], i) => (
            <div key={name} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: i < topClients.length - 1 ? 8 : 0 }}>
              <div style={{ width: 18, fontSize: 10, fontFamily: FONT_HEADING, fontWeight: 700, color: GOLD }}>{i + 1}</div>
              <div style={{ flex: 1, fontSize: 13, fontFamily: FONT_HEADING, fontWeight: 500, color: TEXT }}>{name}</div>
              <div style={{ fontSize: 13, fontFamily: FONT_HEADING, fontWeight: 700, color: TEXT }}>GHS {val.toLocaleString()}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── BottomNav (4 tabs) ───────────────────────────────────────────────────────

function BottomNav({ activeView, onSelect }: {
  activeView: ViewId
  onSelect: (tab: MobileTab) => void
}) {
  const activeTab = getMobileTab(activeView)
  const tabs: Array<{ id: MobileTab; label: string; icon: (a: boolean) => React.ReactNode }> = [
    { id: 'home',   label: 'Home',   icon: (a) => <TabIconHome active={a} /> },
    { id: 'work',   label: 'Work',   icon: (a) => <TabIconWork active={a} /> },
    { id: 'agents', label: 'Agents', icon: (a) => <TabIconAgents active={a} /> },
    { id: 'more',   label: 'More',   icon: (a) => <TabIconMore active={a} /> },
  ]
  return (
    <div style={{ background: SURFACE, borderTop: `1px solid ${BORDER}`, flexShrink: 0, paddingBottom: 'env(safe-area-inset-bottom)' }}>
      <div style={{ display: 'flex', height: 56 }}>
        {tabs.map(tab => {
          const isActive = tab.id === activeTab
          return (
            <button key={tab.id} onClick={() => onSelect(tab.id)} style={{
              flex: 1, display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center', gap: 3,
              background: 'none', border: 'none', cursor: 'pointer',
              color: isActive ? GOLD : MUTED,
              boxShadow: isActive ? `inset 0 2px 0 0 ${GOLD}` : 'none',
              paddingTop: 10, paddingBottom: 6, transition: 'color 0.15s',
            }}>
              {tab.icon(isActive)}
              <span style={{ fontFamily: FONT_HEADING, fontSize: 9, fontWeight: isActive ? 700 : 400, letterSpacing: '0.04em' }}>{tab.label}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ─── SubTabs (horizontal tab bar used inside Work / More) ─────────────────────

function SubTabs({ items, active, onSelect }: {
  items: Array<{ id: ViewId; label: string }>
  active: ViewId
  onSelect: (id: ViewId) => void
}) {
  return (
    <div style={{ display: 'flex', background: SURFACE, borderBottom: `1px solid ${BORDER}`, flexShrink: 0 }}>
      {items.map(item => {
        const isActive = item.id === active
        return (
          <button key={item.id} onClick={() => onSelect(item.id)} style={{
            flex: 1, padding: '10px 8px', fontSize: 13, fontFamily: FONT_HEADING,
            fontWeight: isActive ? 600 : 400, color: isActive ? GOLD : MUTED,
            background: 'none', border: 'none', cursor: 'pointer',
            borderBottom: `2px solid ${isActive ? GOLD : 'transparent'}`,
            marginBottom: -1, transition: 'color 0.15s',
          }}>
            {item.label}
          </button>
        )
      })}
    </div>
  )
}

// ─── MissionBar ───────────────────────────────────────────────────────────────

const MISSION_AGENTS: Array<{ id: AgentId; label: string }> = [
  { id: 'scout', label: 'Scout' },
  { id: 'prospect', label: 'Prospect' },
  { id: 'content', label: 'Content' },
  { id: 'scope', label: 'Scope' },
  { id: 'revenue', label: 'Revenue' },
  { id: 'viral', label: 'Viral' },
]

function MissionBar({ workspace, earnedGHS, pipelineGHS, onClearWorkspace }: {
  workspace: Record<string, string>
  earnedGHS: number
  pipelineGHS: number
  onClearWorkspace: () => void
}) {
  const pct = Math.min(100, Math.round((earnedGHS / MONTHLY_GOAL_GHS) * 100))
  const hasAny = MISSION_AGENTS.some(a => workspace[a.id]?.trim())
  return (
    <div style={{ padding: '5px 12px', background: SURFACE, borderBottom: `1px solid ${BORDER}`, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, minHeight: 30 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0, overflow: 'hidden' }}>
        <span style={{ fontSize: 10, color: GOLD, fontFamily: FONT_BODY, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', flexShrink: 0 }}>Mission</span>
        <span style={{ fontSize: 11, color: TEXT, fontFamily: FONT_BODY, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          GHS {earnedGHS.toLocaleString()} closed · GHS {pipelineGHS.toLocaleString()} pipeline · {pct}% of GHS 12k
        </span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
        {MISSION_AGENTS.map(a => (
          <div key={a.id} title={`${a.label}: ${workspace[a.id]?.trim() ? 'has context' : 'no output yet'}`}
            style={{ width: 7, height: 7, borderRadius: '50%', background: workspace[a.id]?.trim() ? GOLD : BORDER, transition: 'background 0.3s' }} />
        ))}
        {hasAny && (
          <button onClick={onClearWorkspace} title="Clear team context" style={{ fontSize: 10, color: MUTED, background: 'none', border: 'none', cursor: 'pointer', padding: '0 2px', lineHeight: 1, marginLeft: 2 }}>✕</button>
        )}
      </div>
    </div>
  )
}

// ─── ScoutToolbar ─────────────────────────────────────────────────────────────

const SCOUT_PRESETS = [
  { label: 'Need website Ghana', query: 'Search Reddit and web for Ghana businesses saying they need a website or web developer. Find at least 3 specific businesses or individuals looking for websites.' },
  { label: 'Poor website complaints', query: 'Find businesses in Ghana complaining about their current website being slow, outdated, or unprofessional. Check social media and forums.' },
  { label: 'New domain registrations', query: 'Search for businesses in Accra or Kumasi that recently registered a domain in the last 6 months but may not have a proper website yet. Check if their domains are active.' },
  { label: 'Web dev keywords', query: 'Search Reddit for recent posts with keywords: "need a web developer", "website for my business", "website developer Ghana", "how to get a website". List the most relevant prospects.' },
  { label: 'Expired websites', query: 'Find businesses in Ghana whose websites appear to be down, expired, or have broken links. These are warm leads for a rebuild.' },
  { label: 'Competitor analysis', query: 'Search for other web development companies in Ghana. What are they offering? What gaps exist that Ecstasy Technologies can fill?' },
]

function ScoutToolbar({ onSend, loading }: { onSend: (q: string) => void; loading: boolean }) {
  return (
    <div style={{ padding: '8px 12px 6px', borderBottom: `1px solid ${BORDER}`, background: SURFACE, flexShrink: 0 }}>
      <div style={{ fontSize: 10, color: MUTED, fontFamily: FONT_BODY, marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Quick searches</div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {SCOUT_PRESETS.map(p => (
          <button key={p.label} onClick={() => !loading && onSend(p.query)}
            disabled={loading}
            style={{ fontSize: 11, fontFamily: FONT_BODY, color: loading ? MUTED : GOLD, border: `1px solid ${loading ? BORDER : GOLD + '60'}`, borderRadius: 14, padding: '3px 10px', background: 'transparent', cursor: loading ? 'default' : 'pointer', transition: 'background 0.15s, border-color 0.15s', whiteSpace: 'nowrap' }}
            onMouseEnter={(e) => { if (!loading) e.currentTarget.style.background = `${GOLD}14` }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}>
            {p.label}
          </button>
        ))}
      </div>
    </div>
  )
}

// ─── ChatInput ────────────────────────────────────────────────────────────────

function ChatInput({ agentShort, onSend, loading, prefill, onClearPrefill }: {
  agentShort: string; onSend: (text: string) => void; loading: boolean
  prefill?: string | null; onClearPrefill?: () => void
}) {
  const [input, setInput] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (prefill) { setInput(prefill); onClearPrefill?.() }
  }, [prefill, onClearPrefill])

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

function MessageList({ messages, loading, agent, onSend, onRunBriefing, onHandoff, onOpenImport }: {
  messages: Message[]
  loading: boolean
  agent: Agent
  onSend: (text: string) => void
  onRunBriefing: () => void
  onHandoff: (targetAgent: AgentId, prompt: string) => void
  onOpenImport?: (p: ParsedProspect[]) => void
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
            <div style={{ fontSize: 32, marginBottom: 16, opacity: 0.2 }}>{agent.icon}</div>
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
              onOpenImport={onOpenImport}
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
  const [activeView, setActiveView] = useState<ViewId>('home')
  const [allChats, setAllChats] = useState<AllChats>(() => ({} as AllChats))
  const [deals, setDeals] = useState<Deal[]>([])
  const [pageInvoices, setPageInvoices] = useState<Invoice[]>(loadInvoices)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [briefResult, setBriefResult] = useState('')
  const [briefLoading, setBriefLoading] = useState(false)
  const [websitePrefill, setWebsitePrefill] = useState<Partial<WebsiteProject> | null>(null)
  const [viralPrefill, setViralPrefill] = useState<string | null>(null)
  const [notesOpen, setNotesOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [importModal, setImportModal] = useState<ParsedProspect[] | null>(null)
  const [pinnedNotes, setPinnedNotes] = useState(() =>
    typeof window !== 'undefined' ? (localStorage.getItem('tagett-pinned-notes-v1') ?? '') : ''
  )
  const [workspace, setWorkspace] = useState<Record<string, string>>(() => {
    if (typeof window === 'undefined') return {}
    try { return JSON.parse(localStorage.getItem('tagett-workspace-v1') ?? '{}') }
    catch { return {} }
  })

  useEffect(() => {
    // Show localStorage immediately, then hydrate from Supabase
    setAllChats(loadAllChats())
    fetch('/api/conversations', { cache: 'no-store' })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        // Only overwrite localStorage when Supabase actually has conversations.
        // An empty {} means Supabase isn't set up or the table is empty — keep
        // whatever localStorage already loaded so messages survive refresh.
        if (data && typeof data === 'object' && Object.keys(data).length > 0) {
          setAllChats(data as AllChats)
          saveAllChats(data as AllChats)
        }
      })
      .catch(() => {})
  }, [])

  // Load pinned notes from Supabase on mount (localStorage shows immediately)
  useEffect(() => {
    fetch('/api/notes', { cache: 'no-store' })
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.value) { setPinnedNotes(d.value); localStorage.setItem('tagett-pinned-notes-v1', d.value) } })
      .catch(() => {})
  }, [])

  // Keep page-level invoices in sync for global search
  useEffect(() => {
    fetch('/api/invoices', { cache: 'no-store' })
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (Array.isArray(d) && d.length > 0) setPageInvoices(d) })
      .catch(() => {})
  }, [])

  // Load workspace (team intel) from Supabase on mount
  useEffect(() => {
    fetch('/api/workspace', { cache: 'no-store' })
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (d && typeof d === 'object' && Object.keys(d).some(k => d[k]?.trim())) {
          setWorkspace(d)
          localStorage.setItem('tagett-workspace-v1', JSON.stringify(d))
        }
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    // Show local data immediately, then hydrate from Supabase
    const local = loadDeals()
    if (local.length > 0) setDeals(local)
    fetch('/api/deals', { cache: 'no-store' })
      .then(r => r.json())
      .then(d => { if (Array.isArray(d) && d.length > 0) { setDeals(d); saveDeals(d) } })
      .catch(() => {})
  }, [])

  // ── Stale proposal notifications ─────────────────────────────────────────
  useEffect(() => {
    if (deals.length === 0) return
    const STALE_MS = 3 * 24 * 60 * 60 * 1000
    const NOTIFIED_KEY = 'tagett-notified-proposals-v1'
    const notified: Record<string, number> = JSON.parse(localStorage.getItem(NOTIFIED_KEY) ?? '{}')
    const now = Date.now()
    const stale = deals.filter(d =>
      d.stage === 'proposal' &&
      (d.stageChangedAt ?? d.createdAt) < now - STALE_MS &&
      (!notified[d.id] || now - notified[d.id] > STALE_MS)
    )
    if (stale.length === 0) return
    stale.forEach(deal => {
      fetch('/api/notify/send', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          title: `Follow up: ${deal.name}`,
          body: 'Proposal has been waiting 3+ days. Send a WhatsApp now.',
        }),
      }).catch(() => {})
      notified[deal.id] = now
    })
    localStorage.setItem(NOTIFIED_KEY, JSON.stringify(notified))
  }, [deals])
  useEffect(() => { saveAllChats(allChats) }, [allChats])

  const workspaceSyncRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => {
    localStorage.setItem('tagett-workspace-v1', JSON.stringify(workspace))
    if (workspaceSyncRef.current) clearTimeout(workspaceSyncRef.current)
    workspaceSyncRef.current = setTimeout(() => {
      fetch('/api/workspace', {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(workspace),
      }).catch(() => {})
    }, 1500)
  }, [workspace])

  const notesSyncRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => {
    localStorage.setItem('tagett-pinned-notes-v1', pinnedNotes)
    if (notesSyncRef.current) clearTimeout(notesSyncRef.current)
    notesSyncRef.current = setTimeout(() => {
      fetch('/api/notes', {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ value: pinnedNotes }),
      }).catch(() => {})
    }, 1500)
  }, [pinnedNotes])

  const dbSyncRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => {
    saveDeals(deals) // Always write to localStorage immediately
    if (dbSyncRef.current) clearTimeout(dbSyncRef.current)
    dbSyncRef.current = setTimeout(() => {
      fetch('/api/deals', {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(deals),
      }).catch(() => {})
    }, 1500)
  }, [deals])

  const activeAgent: AgentId | null = AGENT_IDS.includes(activeView as AgentId) ? activeView as AgentId : null
  const agent = activeAgent ? AGENTS[activeAgent] : AGENTS.prospect
  const messages: Message[] = activeAgent ? (allChats[activeAgent] ?? []) : []

  const handleSend = useCallback(async (text: string) => {
    if (!activeAgent) return
    const userMsg: Message = { role: 'user', content: text }
    const next = [...(allChats[activeAgent] ?? []), userMsg]
    setAllChats((prev) => ({ ...prev, [activeAgent]: next }))
    saveMessage(activeAgent, 'user', text)
    setLoading(true); setError(null)
    try {
      const liveWorkspace = { ...workspace, _live: buildPipelineSnapshot(deals, pageInvoices) }
      const reply = await callChat(AGENTS[activeAgent].systemPrompt, next, pinnedNotes, activeAgent, liveWorkspace)
      setAllChats((prev) => ({ ...prev, [activeAgent]: [...(prev[activeAgent] ?? []), { role: 'assistant', content: reply }] }))
      saveMessage(activeAgent, 'assistant', reply)
      setWorkspace((prev) => ({ ...prev, [activeAgent]: reply.slice(0, 700) }))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally { setLoading(false) }
  }, [activeAgent, allChats, workspace, pinnedNotes, deals, pageInvoices])

  const handleRunBriefing = useCallback(() => {
    if (agent.dailyPrompt) handleSend(agent.dailyPrompt)
  }, [agent.dailyPrompt, handleSend])

  const handleRunBrief = useCallback(async () => {
    setBriefLoading(true); setBriefResult('')
    try {
      const liveWorkspace = { ...workspace, _live: buildPipelineSnapshot(deals, pageInvoices) }
      const reply = await callChat(AGENTS.executor.systemPrompt, [{ role: 'user', content: AGENTS.executor.dailyPrompt }], pinnedNotes, 'executor', liveWorkspace)
      setBriefResult(reply)
    } catch (err) {
      setBriefResult('Error: ' + (err instanceof Error ? err.message : 'Unknown'))
    } finally { setBriefLoading(false) }
  }, [pinnedNotes, workspace, deals, pageInvoices])

  const handleClear = useCallback(() => {
    if (!activeAgent) return
    setAllChats((prev) => ({ ...prev, [activeAgent]: [] }))
    clearMessages(activeAgent)
    setError(null)
  }, [activeAgent])

  const handleHandoff = useCallback(async (targetAgent: AgentId, prompt: string) => {
    setActiveView(targetAgent); setError(null)
    const userMsg: Message = { role: 'user', content: prompt }
    let msgs: Message[] = []
    setAllChats((prev) => { msgs = [...(prev[targetAgent] ?? []), userMsg]; return { ...prev, [targetAgent]: msgs } })
    saveMessage(targetAgent, 'user', prompt)
    setLoading(true)
    try {
      const liveWorkspace = { ...workspace, _live: buildPipelineSnapshot(deals, pageInvoices) }
      const reply = await callChat(AGENTS[targetAgent].systemPrompt, msgs, pinnedNotes, targetAgent, liveWorkspace)
      setAllChats((prev) => ({ ...prev, [targetAgent]: [...(prev[targetAgent] ?? []), { role: 'assistant', content: reply }] }))
      saveMessage(targetAgent, 'assistant', reply)
      setWorkspace((prev) => ({ ...prev, [targetAgent]: reply.slice(0, 700) }))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally { setLoading(false) }
  }, [pinnedNotes, workspace, deals, pageInvoices])

  const handleOpenAgent = useCallback((agentId: AgentId, prompt: string) => {
    handleHandoff(agentId, prompt)
  }, [handleHandoff])

  const handleAddDeal = useCallback((d: Omit<Deal, 'id' | 'createdAt'>) => {
    setDeals(prev => [...prev, { ...d, id: Date.now().toString(), createdAt: Date.now() }])
  }, [])

  const handleImportProspects = useCallback((selected: ParsedProspect[], followUpDays: number) => {
    const base = Date.now()
    const followUpAt = base + followUpDays * 24 * 60 * 60 * 1000
    setDeals(prev => [
      ...prev,
      ...selected.map((p, i) => ({
        id: (base + i).toString(),
        name: p.name,
        industry: p.industry,
        valueGHS: p.valueGHS,
        stage: 'found' as DealStage,
        phone: p.phone,
        followUpAt,
        createdAt: base + i,
        stageChangedAt: base + i,
      })),
    ])
    setImportModal(null)
  }, [])

  const handleMoveDeal = useCallback((id: string, stage: DealStage) => {
    const deal = deals.find(d => d.id === id)
    setDeals(prev => prev.map(d => d.id === id ? { ...d, stage, stageChangedAt: Date.now() } : d))
    if (stage === 'closed' && deal) {
      const category = /mobile|app/i.test(deal.industry) ? 'Mobile App' :
        /software|system|erp/i.test(deal.industry) ? 'Business Software' :
        /gis|map|geo/i.test(deal.industry) ? 'GIS solution' :
        /web app|application/i.test(deal.industry) ? 'Web Application' : 'Website'
      const prompt = `We just closed a deal and completed a project! Write a viral project reveal for Ecstasy Technologies:\n\nClient: ${deal.name}\nBusiness type: ${deal.industry}\nProject type: ${category}\nDeal value: GHS ${deal.valueGHS.toLocaleString()}\n\nDeliver:\n1. A viral X thread (6 tweets). Hook with the project reveal, walk through what we built, end with a CTA to ecstasytechnologies.com. Specify which screenshot to attach.\n2. A LinkedIn founder post. Tell the story of this client win: what they needed, what we built, what changes for them now.\n\nWrite as Dominic Kudom, CEO of Ecstasy Technologies. Make it immediately postable.`
      setViralPrefill(prompt)
      setTimeout(() => { setActiveView('viral'); setError(null) }, 700)
    }
  }, [deals])

  const handleDeleteDeal = useCallback((id: string) => {
    setDeals(prev => prev.filter(d => d.id !== id))
  }, [])

  const handleUpdateDeal = useCallback((id: string, updates: Partial<Deal>) => {
    setDeals(prev => prev.map(d => d.id === id ? { ...d, ...updates } : d))
  }, [])

  const handleSetFollowUp = useCallback((id: string, ts: number | undefined) => {
    setDeals(prev => prev.map(d => d.id === id ? { ...d, followUpAt: ts } : d))
  }, [])

  const handlePublishDealToWebsite = useCallback((deal: Deal) => {
    setWebsitePrefill({
      title: deal.name,
      category: deal.industry ? (
        /mobile|app/i.test(deal.industry) ? 'Mobile App' :
        /software|system|erp/i.test(deal.industry) ? 'Business Software' :
        /gis|map|geo/i.test(deal.industry) ? 'GIS' :
        /web app|application/i.test(deal.industry) ? 'Web Application' : 'Website'
      ) : 'Website',
      client: deal.name,
      year: new Date().getFullYear(),
      status: 'completed',
      featured: false,
      technologies: [],
      features: [],
    })
    setActiveView('website')
    setError(null)
  }, [])

  const earnedGHS = useMemo(() => {
    const fromDeals = deals.filter(d => d.stage === 'closed').reduce((s, d) => s + d.valueGHS, 0)
    if (fromDeals > 0) return fromDeals
    let max = 0
    for (const m of allChats.revenue ?? []) {
      for (const match of m.content.match(/GHS\s*([\d,]+)/gi) ?? []) {
        const val = parseInt(match.replace(/[^0-9]/g, ''), 10)
        if (val < MONTHLY_GOAL_GHS && val > max) max = val
      }
    }
    return max
  }, [deals, allChats.revenue])

  const pipelineGHS = useMemo(
    () => deals.filter(d => d.stage !== 'closed').reduce((s, d) => s + d.valueGHS, 0),
    [deals]
  )

  const notifToggle = <NotifToggle status={notifStatus} onSubscribe={subscribe} onUnsubscribe={unsubscribe} onTest={sendTest} />

  if (onboarded === null) return null
  if (!onboarded) return <OnboardingScreen onComplete={completeOnboarding} />

  // ── Mobile ─────────────────────────────────────────────────────────────────
  if (isMobile) {
    // Maps a tab tap to the right ViewId, staying on current sub-view if already there
    const handleTabSelect = (tab: MobileTab) => {
      if (tab === 'home') { setActiveView('home'); setError(null); return }
      if (tab === 'work'   && !WORK_VIEWS.includes(activeView))  { setActiveView('pipeline'); setError(null); return }
      if (tab === 'agents' && !AGENT_VIEWS.includes(activeView)) { setActiveView('council');  setError(null); return }
      if (tab === 'more'   && !MORE_VIEWS.includes(activeView))  { setActiveView('social');   setError(null); return }
      setError(null)
    }

    const shell = (content: React.ReactNode) => (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100dvh', background: BG, overflow: 'hidden' }}>
        <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {content}
        </div>
        <BottomNav activeView={activeView} onSelect={handleTabSelect} />
      </div>
    )

    const viewHeader = (title: string) => (
      <div style={{ paddingTop: 'env(safe-area-inset-top)', background: SURFACE, borderBottom: `1px solid ${BORDER}`, flexShrink: 0 }}>
        <div style={{ height: 48, padding: '0 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontFamily: FONT_HEADING, fontWeight: 700, fontSize: 11, color: GOLD, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Tagett</div>
            <div style={{ fontFamily: FONT_HEADING, fontWeight: 600, fontSize: 14, color: TEXT }}>{title}</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {notifToggle}
            <ThemeToggle theme={theme} onToggle={toggleTheme} />
            <SignOutButton />
            <GoalRing earned={earnedGHS} mini />
          </div>
        </div>
      </div>
    )

    // ── Home ──────────────────────────────────────────────────────────────────
    if (activeView === 'home') return shell(
      <CommandCenter deals={deals} earnedGHS={earnedGHS} theme={theme} onToggleTheme={toggleTheme} notifToggle={notifToggle} onNavigate={(v) => { setActiveView(v); setError(null) }} onRunBrief={handleRunBrief} briefResult={briefResult} briefLoading={briefLoading} />
    )

    // ── Work tab (Deals + Clients) ────────────────────────────────────────────
    if (WORK_VIEWS.includes(activeView)) return shell(
      <>
        {viewHeader('Work')}
        <SubTabs
          items={[{ id: 'pipeline', label: 'Deals' }, { id: 'clients', label: 'Clients' }, { id: 'invoices', label: 'Invoices' }, { id: 'prospect-map', label: '📍 Find' }]}
          active={activeView as ViewId}
          onSelect={(v) => { setActiveView(v); setError(null) }}
        />
        {activeView === 'pipeline'      && <DealPipeline deals={deals} onAdd={handleAddDeal} onMove={handleMoveDeal} onDelete={handleDeleteDeal} onUpdate={handleUpdateDeal} onOpenAgent={handleOpenAgent} onPublishToWebsite={handlePublishDealToWebsite} onSetFollowUp={handleSetFollowUp} />}
        {activeView === 'clients'       && <ClientsView onOpenAgent={handleOpenAgent} />}
        {activeView === 'invoices'      && <InvoicesView deals={deals} />}
        {activeView === 'prospect-map'  && <ProspectMapView onAdd={handleAddDeal} />}
      </>
    )

    // ── More tab (Website + History) ──────────────────────────────────────────
    if (MORE_VIEWS.includes(activeView)) return shell(
      <>
        {viewHeader('More')}
        <SubTabs
          items={[{ id: 'social', label: 'Social' }, { id: 'website', label: 'Website' }, { id: 'analytics', label: 'Analytics' }, { id: 'history', label: 'History' }, { id: 'data-quality', label: 'Data' }]}
          active={activeView as ViewId}
          onSelect={(v) => { setActiveView(v); setError(null) }}
        />
        {activeView === 'social'        && <SocialCalendarView />}
        {activeView === 'website'       && <WebsiteProjectsView prefill={websitePrefill} onClearPrefill={() => setWebsitePrefill(null)} onOpenAgent={handleOpenAgent} />}
        {activeView === 'analytics'     && <AnalyticsView deals={deals} />}
        {activeView === 'history'       && <AgentRunHistory />}
        {activeView === 'data-quality'  && <DataQualityView deals={deals} onUpdate={handleUpdateDeal} />}
      </>
    )

    // ── Agents tab (Council + 6 operators) ───────────────────────────────────
    // Horizontal agent selector pill bar
    const AgentPicker = (
      <div style={{ background: SURFACE, borderBottom: `1px solid ${BORDER}`, flexShrink: 0, overflowX: 'auto', WebkitOverflowScrolling: 'touch' } as React.CSSProperties}>
        <style>{`.ap::-webkit-scrollbar{display:none}`}</style>
        <div className="ap" style={{ display: 'flex', gap: 6, padding: '7px 12px', minWidth: 'max-content' }}>
          {(['council', ...MAIN_AGENT_IDS] as ViewId[]).map(id => {
            const isActive = id === activeView
            const label = id === 'council' ? 'Council' : AGENTS[id as AgentId].short
            const count = id !== 'council' ? Math.floor((allChats[id as AgentId]?.length ?? 0) / 2) : 0
            return (
              <button key={id} onClick={() => { setActiveView(id); setError(null) }} style={{
                padding: '4px 12px', borderRadius: 20,
                border: `1px solid ${isActive ? GOLD : BORDER}`,
                background: isActive ? `${GOLD}15` : 'transparent',
                color: isActive ? GOLD : MUTED,
                fontSize: 12, fontFamily: FONT_HEADING, fontWeight: isActive ? 600 : 400,
                whiteSpace: 'nowrap', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5,
              }}>
                {label}
                {count > 0 && <span style={{ fontSize: 9, background: isActive ? `${GOLD}30` : SURFACE2, padding: '1px 5px', borderRadius: 8, color: isActive ? GOLD : MUTED }}>{count}</span>}
              </button>
            )
          })}
        </div>
      </div>
    )

    if (activeView === 'council') return shell(
      <>
        {viewHeader('Council Chamber')}
        {AgentPicker}
        <CouncilChamber pinnedNotes={pinnedNotes} workspace={workspace} />
      </>
    )

    const AgentSubheader = (
      <div style={{ padding: '10px 16px 8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, borderBottom: `1px solid ${BORDER}`, flexShrink: 0 }}>
        <span style={{ fontSize: 12, color: MUTED, fontFamily: FONT_BODY, flex: 1 }}>{agent.description}</span>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          {agent.id !== 'prospect' && <BriefingButton label={agent.briefingLabel} onClick={handleRunBriefing} loading={loading} size="small" />}
          {messages.length > 0 && <button onClick={handleClear} style={{ fontSize: 12, color: MUTED, padding: '4px 10px', border: `1px solid ${BORDER}`, borderRadius: 6, fontFamily: FONT_BODY, minHeight: 30 }}>Clear</button>}
        </div>
      </div>
    )

    return shell(
      <>
        <MobileHeader agent={agent} earnedGHS={earnedGHS} theme={theme} onToggleTheme={toggleTheme} notifToggle={notifToggle} onOpenNotes={() => setNotesOpen(true)} hasNotes={!!pinnedNotes.trim()} />
        {AgentPicker}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {AgentSubheader}
          <MissionBar workspace={workspace} earnedGHS={earnedGHS} pipelineGHS={pipelineGHS} onClearWorkspace={() => setWorkspace({})} />
          {error && <ErrorBanner error={error} onDismiss={() => setError(null)} />}
          <MessageList messages={messages} loading={loading} agent={agent} onSend={handleSend} onRunBriefing={handleRunBriefing} onHandoff={handleHandoff} onOpenImport={setImportModal} />
          {activeAgent === 'scout' && <ScoutToolbar onSend={handleSend} loading={loading} />}
          <ChatInput agentShort={agent.short} onSend={handleSend} loading={loading} prefill={activeAgent === 'viral' ? viralPrefill : null} onClearPrefill={() => setViralPrefill(null)} />
        </div>
        <PinnedNotesPanel open={notesOpen} notes={pinnedNotes} onClose={() => setNotesOpen(false)} onChange={setPinnedNotes} />
        {importModal && <ImportProspectsModal prospects={importModal} existingDeals={deals} onImport={handleImportProspects} onClose={() => setImportModal(null)} />}
      </>
    )
  }

  // ── Desktop ────────────────────────────────────────────────────────────────
  const renderDesktopNavBtn = (v: ViewId, icon: string, label: string, description: string) => {
    const isActive = v === activeView
    return (
      <button key={v} onClick={() => { setActiveView(v); setError(null) }} style={{ width: '100%', display: 'block', textAlign: 'left', padding: '9px 12px', borderRadius: 8, marginBottom: 2, background: isActive ? `${GOLD}18` : 'transparent', transition: 'background 0.15s' }}
        onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.background = `${GOLD}0A` }}
        onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.background = 'transparent' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 15, color: isActive ? GOLD : MUTED }}>{icon}</span>
          <span style={{ fontFamily: FONT_HEADING, fontSize: 13, fontWeight: isActive ? 600 : 400, color: isActive ? GOLD : TEXT }}>{label}</span>
        </div>
        <div style={{ fontSize: 11, color: MUTED, marginTop: 2, fontFamily: FONT_BODY, paddingLeft: 23 }}>{description}</div>
      </button>
    )
  }

  const renderAgentNavBtn = (id: AgentId) => {
    const a = AGENTS[id]; const isActive = id === activeView
    const msgCount = (allChats[id] ?? []).length
    return (
      <button key={id} onClick={() => { setActiveView(id); setError(null) }} style={{ width: '100%', display: 'block', textAlign: 'left', padding: '9px 12px', borderRadius: 8, marginBottom: 2, background: isActive ? `${GOLD}18` : 'transparent', transition: 'background 0.15s' }}
        onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.background = `${GOLD}0A` }}
        onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.background = 'transparent' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontFamily: FONT_HEADING, fontSize: 13, fontWeight: isActive ? 600 : 400, color: isActive ? GOLD : TEXT }}>{a.label}</span>
          {msgCount > 0 && <span style={{ fontSize: 10, fontFamily: FONT_BODY, color: isActive ? GOLD : MUTED, background: isActive ? `${GOLD}20` : SURFACE2, padding: '1px 6px', borderRadius: 10 }}>{Math.floor(msgCount / 2)}</span>}
        </div>
        <div style={{ fontSize: 11, color: MUTED, marginTop: 2, fontFamily: FONT_BODY }}>{a.description}</div>
      </button>
    )
  }

  const renderMainContent = () => {
    if (activeView === 'home') return (
      <CommandCenter deals={deals} earnedGHS={earnedGHS} theme={theme} onToggleTheme={toggleTheme} notifToggle={notifToggle} onNavigate={(v) => { setActiveView(v); setError(null) }} onRunBrief={handleRunBrief} briefResult={briefResult} briefLoading={briefLoading} />
    )
    if (activeView === 'pipeline') return (
      <DealPipeline deals={deals} onAdd={handleAddDeal} onMove={handleMoveDeal} onDelete={handleDeleteDeal} onUpdate={handleUpdateDeal} onOpenAgent={handleOpenAgent} onPublishToWebsite={handlePublishDealToWebsite} onSetFollowUp={handleSetFollowUp} />
    )
    if (activeView === 'website') return (
      <WebsiteProjectsView prefill={websitePrefill} onClearPrefill={() => setWebsitePrefill(null)} onOpenAgent={handleOpenAgent} />
    )
    if (activeView === 'council')      return <CouncilChamber pinnedNotes={pinnedNotes} workspace={workspace} />
    if (activeView === 'history')      return <AgentRunHistory />
    if (activeView === 'clients')      return <ClientsView onOpenAgent={handleOpenAgent} />
    if (activeView === 'invoices')     return <InvoicesView deals={deals} />
    if (activeView === 'social')       return <SocialCalendarView />
    if (activeView === 'analytics')    return <AnalyticsView deals={deals} />
    if (activeView === 'prospect-map') return <ProspectMapView onAdd={handleAddDeal} />
    if (activeView === 'data-quality') return <DataQualityView deals={deals} onUpdate={handleUpdateDeal} />
    return (
      <>
        <div style={{ padding: '16px 20px', borderBottom: `1px solid ${BORDER}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <div>
            <div style={{ fontFamily: FONT_HEADING, fontWeight: 600, fontSize: 15, color: TEXT }}>{agent.label}</div>
            <div style={{ fontSize: 12, color: MUTED, marginTop: 2, fontFamily: FONT_BODY }}>{agent.description}</div>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <button onClick={() => setSearchOpen(true)} title="Search conversations" style={{ fontSize: 15, color: MUTED, padding: '4px 8px', border: `1px solid ${BORDER}`, borderRadius: 6, background: 'none', cursor: 'pointer' }}>⌕</button>
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
        <MissionBar workspace={workspace} earnedGHS={earnedGHS} pipelineGHS={pipelineGHS} onClearWorkspace={() => setWorkspace({})} />
        {error && <ErrorBanner error={error} onDismiss={() => setError(null)} />}
        <MessageList messages={messages} loading={loading} agent={agent} onSend={handleSend} onRunBriefing={handleRunBriefing} onHandoff={handleHandoff} onOpenImport={setImportModal} />
        {activeAgent === 'scout' && <ScoutToolbar onSend={handleSend} loading={loading} />}
        <ChatInput agentShort={agent.short} onSend={handleSend} loading={loading} prefill={activeAgent === 'viral' ? viralPrefill : null} onClearPrefill={() => setViralPrefill(null)} />
      </>
    )
  }

  return (
    <div style={{ display: 'flex', height: '100dvh', background: BG, overflow: 'hidden' }}>
      <div style={{ width: 240, flexShrink: 0, background: SURFACE, borderRight: `1px solid ${BORDER}`, display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '20px 20px 16px', borderBottom: `1px solid ${BORDER}` }}>
          <div style={{ fontFamily: FONT_HEADING, fontWeight: 700, fontSize: 14, color: GOLD, letterSpacing: '0.05em', textTransform: 'uppercase' }}>Tagett</div>
          <div style={{ fontSize: 11, color: MUTED, marginTop: 2, fontFamily: FONT_BODY }}>Ecstasy Technologies</div>
        </div>
        <nav style={{ padding: '12px 10px', flex: 1, overflowY: 'auto' }}>
          <button onClick={() => setNotesOpen(true)} style={{ width: '100%', display: 'block', textAlign: 'left', padding: '9px 12px', borderRadius: 8, marginBottom: 2, background: pinnedNotes.trim() ? `${GOLD}18` : 'transparent', transition: 'background 0.15s', border: 'none', cursor: 'pointer' }}
            onMouseEnter={(e) => { if (!pinnedNotes.trim()) e.currentTarget.style.background = `${GOLD}0A` }}
            onMouseLeave={(e) => { if (!pinnedNotes.trim()) e.currentTarget.style.background = 'transparent' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 15, color: pinnedNotes.trim() ? GOLD : MUTED }}>📌</span>
              <span style={{ fontFamily: FONT_HEADING, fontSize: 13, fontWeight: pinnedNotes.trim() ? 600 : 400, color: pinnedNotes.trim() ? GOLD : TEXT }}>Notes</span>
            </div>
            <div style={{ fontSize: 11, color: MUTED, marginTop: 2, fontFamily: FONT_BODY, paddingLeft: 23 }}>
              {pinnedNotes.trim() ? 'Context active — all agents see this' : 'Pinned context for all agents'}
            </div>
          </button>
          {renderDesktopNavBtn('home', '⌂', 'Command Center', 'Goal, brief & overview')}
          {renderDesktopNavBtn('pipeline', '◫', 'Deal Pipeline', 'Track deals by stage')}
          {renderDesktopNavBtn('website', '↑', 'Website Projects', 'Publish to ecstasytechnologies.com')}
          {renderDesktopNavBtn('council', '⊙', 'Council Chamber', 'All 5 advisors respond together')}
          {renderDesktopNavBtn('history', '◷', 'Run History', 'Browse every autonomous agent run')}
          {renderDesktopNavBtn('clients', '👥', 'Clients', 'Contact database')}
          {renderDesktopNavBtn('invoices', '◎', 'Invoices', 'Billing & payment tracking')}
          {renderDesktopNavBtn('social', '⌖', 'Social Calendar', 'Schedule & publish content')}
          {renderDesktopNavBtn('data-quality', '◈', 'Data Quality', 'Deduplicate & clean CRM')}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '10px 4px 6px' }}>
            <div style={{ flex: 1, height: 1, background: BORDER }} />
            <span style={{ fontSize: 9, fontFamily: FONT_HEADING, fontWeight: 600, color: MUTED, letterSpacing: '0.12em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>Operators</span>
            <div style={{ flex: 1, height: 1, background: BORDER }} />
          </div>
          {MAIN_AGENT_IDS.map(renderAgentNavBtn)}
        </nav>
        <div style={{ borderTop: `1px solid ${BORDER}` }}>
          <div style={{ padding: '10px 16px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            {notifToggle}
            <ThemeToggle theme={theme} onToggle={toggleTheme} />
            <SignOutButton />
          </div>
          <GoalRing earned={earnedGHS} />
        </div>
      </div>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {renderMainContent()}
      </div>
      <PinnedNotesPanel open={notesOpen} notes={pinnedNotes} onClose={() => setNotesOpen(false)} onChange={setPinnedNotes} />
      {searchOpen && <ConversationSearch onClose={() => setSearchOpen(false)} deals={deals} invoices={pageInvoices} />}
      {importModal && <ImportProspectsModal prospects={importModal} existingDeals={deals} onImport={handleImportProspects} onClose={() => setImportModal(null)} />}
    </div>
  )
}
