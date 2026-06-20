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

const MONTHLY_GOAL_GHS = 12_000

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
type ViewId = 'home' | 'pipeline' | 'website' | 'council' | AgentId

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
Fastest to close: [Business Name] — call them first.`,
    systemPrompt: `You are ProspectBot, a lead generation AI for Ecstasy Technologies based in Ghana (ecstasytechnologies.com).

Your job is to find REAL businesses in Ghana that do NOT have a website and qualify them as leads for web development, mobile app, and business software services.

CRITICAL — REAL BUSINESSES ONLY: You MUST use the search_web tool to find actual businesses. Search Google/DuckDuckGo for queries like:
- "[industry] [location] Ghana"
- "[industry] in [location] site:facebook.com OR site:google.com"
- "[business type] [location] contact phone Ghana"
- "best [industry] in [location] Ghana"
Search multiple times if needed. NEVER invent or make up businesses, phone numbers, or addresses. Only report what you find in search results.

How to find phone numbers: Search for the business name + "Ghana" + "phone" or "contact". Check Facebook pages, Google Maps listings, and business directories.

Output format for each REAL prospect found:
1. Business Name — [exact name from search]
   Industry: [type]
   Address: [actual address from search results]
   Phone: [real number found online, or "Not found — search '[business name] Ghana phone'"]
   Why they need a website: [specific reason based on what you found]
   Service to pitch: [web design / mobile app / business software / GIS]
   Estimated value: GHS [amount]
   Phone pitch: "[one sentence to say when they pick up]"
   Source: [where you found this business — Google, Facebook, etc.]

If you find fewer than 5 real businesses, say so honestly and suggest better search terms. Do NOT pad with invented entries.

PIPELINE ROLE: You are the top of the funnel in a 5-agent revenue machine targeting GHS 12,000/month. Your leads feed ContentBot (writes the pitch), ProjectBot (scopes the proposal), and ViralBot (finds patterns across your lead lists to create viral content attracting similar clients inbound). Always end your lead list with a PIPELINE SUMMARY showing total estimated GHS value and % of the GHS 12,000 monthly goal.

COUNCIL ACCOUNTABILITY — After your response, always include a "— Council Check —" section with exactly two lines:
⊗ Contrarian: [one sentence — what is the most likely reason these specific leads will not convert?]
▸ Executor: [one action — what should Dominic do in the next 2 hours based on this lead list?]`,
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

COUNCIL ACCOUNTABILITY — After your response, always include a "— Council Check —" section with exactly two lines:
⊗ Contrarian: [one sentence — what is the most likely reason this content will not land with the prospect?]
▸ Executor: [one action — what should Dominic send or do in the next 2 hours based on this content?]`,
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

COUNCIL ACCOUNTABILITY — After your response, always include a "— Council Check —" section with exactly two lines:
⊗ Contrarian: [one sentence — what is the most likely reason this scope or proposal will fall apart?]
▸ Executor: [one action — what should Dominic do in the next 2 hours to move this proposal to a signed deal?]`,
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

COUNCIL ACCOUNTABILITY — After your response, always include a "— Council Check —" section with exactly two lines:
⊗ Contrarian: [one sentence — what is the most likely reason this revenue plan will miss the GHS 12,000 target?]
▸ Executor: [one action — what is the single most important revenue action Dominic should take in the next 2 hours?]`,
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

1. VIRAL X THREAD (6 tweets) — Project reveal
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

Write everything as Dominic Agyapong. Immediately postable.`,
    systemPrompt: `You are ViralBot, a viral social media strategist for Ecstasy Technologies, a software studio based in Ghana (ecstasytechnologies.com). You help Dominic Agyapong build a massive following that converts to inbound software clients — by showcasing REAL completed projects with screenshots as social proof.

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

Always write as Dominic Agyapong. No placeholders. Immediately postable.

PIPELINE ROLE: Viral project content attracts inbound clients who see the work and want the same. After your content output, always add:
"This content targets: [client type]
Estimated contract value if they inquire: GHS [range]
Pipeline contribution if 1 lead converts: [X]% of GHS 12,000 goal"

COUNCIL ACCOUNTABILITY — After your response, always include a "— Council Check —" section with exactly two lines:
⊗ Contrarian: [one sentence — what is the most likely reason this content will not go viral or attract clients?]
▸ Executor: [one action — what should Dominic post first and on which platform in the next 30 minutes?]`,
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

You are not here to improve the existing plan. You are here to show what Dominic would build if he started with a blank page today.`,
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
2. List exactly 3 things Dominic can do in the next 2 hours to generate revenue or move a deal forward
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
    systemPrompt: `You are SocialScout, a social media listening and inbound lead generation specialist for Ecstasy Technologies (ecstasytechnologies.com), a software studio in Ghana run by Dominic Agyapong.

Your job is to find Ghanaian businesses and individuals who are actively signalling that they need a website or software developer — through posts, comments, reviews, or complaints — so Dominic can reach them before any competitor does.

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
Comment reply: "Hey [name], I build websites for Ghanaian businesses like yours. Prices start at GHS 3,500. Check our work at ecstasytechnologies.com — DM me if you want a quick chat."
DM: "Hi [name], saw your post about needing a website. We're a Ghanaian software studio — we've built sites for hotels, shops, clinics and more. Takes 2 weeks. Starts at GHS 3,500. Want to see some examples? → ecstasytechnologies.com"

COUNCIL ACCOUNTABILITY — After your response, always include a "— Council Check —" section with exactly two lines:
⊗ Contrarian: [one sentence — what is the most likely reason these leads won't convert?]
▸ Executor: [one action — what is the single search Dominic should run in the next 10 minutes?]`,
  },
}

const AGENT_IDS = Object.keys(AGENTS) as AgentId[]
const MAIN_AGENT_IDS: AgentId[] = ['prospect', 'content', 'scope', 'revenue', 'viral', 'scout']
const COUNCIL_AGENT_IDS: AgentId[] = ['contrarian', 'firstp', 'expansionist', 'outsider', 'executor']

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
  return Object.entries(workspace)
    .filter(([id, v]) => id !== excludeId && v?.trim())
    .map(([id, v]) => `[${TEAM_LABELS[id] ?? id}]: ${v.slice(0, 500)}`)
    .join('\n\n')
}

const TEAM_MISSION_HEADER = `TEAM: You are part of Ecstasy Technologies' 6-agent revenue team. Shared goal: GHS 12,000 in new deals per month. Pipeline: SocialScout → ProspectBot → ContentBot → ProjectBot → RevenueBot → ViralBot. When TEAM INTEL is present below, build directly on your teammates' work — don't start from scratch.\n\n`

async function callChat(
  systemPrompt: string,
  messages: Message[],
  pinnedNotes?: string,
  agentId?: string,
  workspace?: Record<string, string>
): Promise<string> {
  let fullPrompt = TEAM_MISSION_HEADER + systemPrompt

  if (pinnedNotes?.trim()) {
    fullPrompt += `\n\n— PINNED CONTEXT (always use this) —\n${pinnedNotes.trim()}\n— END PINNED CONTEXT —`
  }

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

type DealStage = 'found' | 'called' | 'scoped' | 'proposal' | 'closed'
const STAGES: DealStage[] = ['found', 'called', 'scoped', 'proposal', 'closed']
const STAGE_LABELS: Record<DealStage, string> = { found: 'Found', called: 'Called', scoped: 'Scoped', proposal: 'Proposal Sent', closed: 'Closed ✓' }

interface Deal {
  id: string
  name: string
  industry: string
  valueGHS: number
  stage: DealStage
  phone?: string
  createdAt: number
  stageChangedAt?: number
}

const DEALS_KEY = 'tagett-deals-v1'
function loadDeals(): Deal[] {
  if (typeof window === 'undefined') return []
  try { const r = localStorage.getItem(DEALS_KEY); return r ? JSON.parse(r) : [] } catch { return [] }
}
function saveDeals(d: Deal[]): void {
  try { localStorage.setItem(DEALS_KEY, JSON.stringify(d)) } catch {}
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
          <img src="/icon-192.png" alt="Tagett" width={72} height={72} style={{ borderRadius: 18, marginBottom: 22, boxShadow: `0 0 36px ${GOLD}40` }} />
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
        <a href={`https://wa.me/?text=${encodeURIComponent(content.slice(0, 1500))}`} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '5px 12px', borderRadius: 20, border: `1px solid ${WA_GREEN}60`, background: `${WA_GREEN}10`, color: WA_GREEN, fontSize: 12, fontFamily: FONT_BODY, fontWeight: 500, textDecoration: 'none' }}>
          ✆ WhatsApp
        </a>
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
    const c: Record<DealStage, number> = { found: 0, called: 0, scoped: 0, proposal: 0, closed: 0 }
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
            {briefLoading ? <ThinkingDots /> : '▶ Run'}
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

// ─── DealCard ─────────────────────────────────────────────────────────────────

function DealCard({ deal, onMove, onDelete, onOpenAgent, onPublishToWebsite }: {
  deal: Deal
  onMove: (id: string, stage: DealStage) => void
  onDelete: (id: string) => void
  onOpenAgent: (agentId: AgentId, prompt: string) => void
  onPublishToWebsite: (deal: Deal) => void
}) {
  const idx = STAGES.indexOf(deal.stage)
  return (
    <div style={{ padding: '10px 12px', borderRadius: 10, border: `1px solid ${deal.stage === 'closed' ? GOLD + '60' : BORDER}`, background: deal.stage === 'closed' ? `${GOLD}08` : SURFACE2 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: FONT_HEADING, fontWeight: 600, fontSize: 13, color: TEXT }}>{deal.name}</div>
          {deal.industry && <div style={{ fontSize: 11, color: MUTED, fontFamily: FONT_BODY, marginTop: 1 }}>{deal.industry}</div>}
          <div style={{ fontFamily: FONT_HEADING, fontSize: 14, fontWeight: 700, color: deal.stage === 'closed' ? GOLD : TEXT, marginTop: 4 }}>
            GHS {deal.valueGHS.toLocaleString()}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
          {idx > 0 && <button onClick={() => onMove(deal.id, STAGES[idx - 1])} style={{ width: 26, height: 26, borderRadius: 6, border: `1px solid ${BORDER}`, background: 'transparent', color: MUTED, fontSize: 13, cursor: 'pointer' }}>←</button>}
          {idx < STAGES.length - 1 && <button onClick={() => onMove(deal.id, STAGES[idx + 1])} style={{ width: 26, height: 26, borderRadius: 6, border: `1px solid ${GOLD}60`, background: `${GOLD}10`, color: GOLD, fontSize: 13, cursor: 'pointer' }}>→</button>}
          <button onClick={() => onDelete(deal.id)} style={{ width: 26, height: 26, borderRadius: 6, border: `1px solid ${BORDER}`, background: 'transparent', color: MUTED, fontSize: 11, cursor: 'pointer' }}>✕</button>
        </div>
      </div>
      {deal.phone && (
        <a href={`https://wa.me/${deal.phone.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 6, fontSize: 11, color: WA_GREEN, fontFamily: FONT_BODY, textDecoration: 'none' }}>
          📱 {deal.phone}
        </a>
      )}
      <div style={{ display: 'flex', gap: 5, marginTop: 8, flexWrap: 'wrap' }}>
        <button onClick={() => onOpenAgent('content', `Write a pitch or follow-up for this deal:\nBusiness: ${deal.name}\nIndustry: ${deal.industry}\nValue: GHS ${deal.valueGHS}\nStage: ${deal.stage}`)} style={{ fontSize: 10, padding: '3px 8px', borderRadius: 12, border: `1px solid ${BORDER}`, background: 'transparent', color: MUTED, fontFamily: FONT_BODY, cursor: 'pointer' }}>
          ✦ Write Pitch
        </button>
        <button onClick={() => onOpenAgent('scope', `Scope this deal:\nBusiness: ${deal.name}\nIndustry: ${deal.industry}\nBudget: GHS ${deal.valueGHS}`)} style={{ fontSize: 10, padding: '3px 8px', borderRadius: 12, border: `1px solid ${BORDER}`, background: 'transparent', color: MUTED, fontFamily: FONT_BODY, cursor: 'pointer' }}>
          ◈ Scope It
        </button>
        <button onClick={() => onOpenAgent('executor', `Deal at stage "${deal.stage}": ${deal.name} (${deal.industry}, GHS ${deal.valueGHS}). What is the single most important action to move it forward right now?`)} style={{ fontSize: 10, padding: '3px 8px', borderRadius: 12, border: `1px solid ${BORDER}`, background: 'transparent', color: MUTED, fontFamily: FONT_BODY, cursor: 'pointer' }}>
          ▸ Next Action
        </button>
        {deal.stage === 'closed' && (
          <button onClick={() => onPublishToWebsite(deal)} style={{ fontSize: 10, padding: '3px 8px', borderRadius: 12, border: `1px solid ${GOLD}60`, background: `${GOLD}10`, color: GOLD, fontFamily: FONT_BODY, cursor: 'pointer' }}>
            ↑ Website
          </button>
        )}
      </div>
    </div>
  )
}

// ─── DealPipeline ─────────────────────────────────────────────────────────────

function DealPipeline({ deals, onAdd, onMove, onDelete, onOpenAgent, onPublishToWebsite }: {
  deals: Deal[]
  onAdd: (d: Omit<Deal, 'id' | 'createdAt'>) => void
  onMove: (id: string, stage: DealStage) => void
  onDelete: (id: string) => void
  onOpenAgent: (agentId: AgentId, prompt: string) => void
  onPublishToWebsite: (deal: Deal) => void
}) {
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name: '', industry: '', valueGHS: '', phone: '' })

  const handleSubmit = () => {
    if (!form.name || !form.valueGHS) return
    onAdd({ name: form.name, industry: form.industry, valueGHS: parseInt(form.valueGHS, 10) || 0, stage: 'found', phone: form.phone })
    setForm({ name: '', industry: '', valueGHS: '', phone: '' })
    setShowForm(false)
  }

  const closedValue = deals.filter(d => d.stage === 'closed').reduce((s, d) => s + d.valueGHS, 0)
  const inputStyle: React.CSSProperties = { padding: '8px 12px', borderRadius: 8, border: `1px solid ${BORDER}`, background: SURFACE2, color: TEXT, fontSize: 14, fontFamily: FONT_BODY, outline: 'none', width: '100%', boxSizing: 'border-box' }

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '16px 12px' } as React.CSSProperties}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <div style={{ fontFamily: FONT_HEADING, fontWeight: 700, fontSize: 17, color: TEXT }}>Deal Pipeline</div>
          <div style={{ fontSize: 12, color: MUTED, fontFamily: FONT_BODY, marginTop: 2 }}>
            GHS {closedValue.toLocaleString()} closed · {deals.filter(d => d.stage !== 'closed').length} open
          </div>
        </div>
        <button onClick={() => setShowForm(!showForm)} style={{ padding: '8px 14px', borderRadius: 8, background: GOLD, color: BG, fontFamily: FONT_HEADING, fontWeight: 700, fontSize: 13, border: 'none', cursor: 'pointer' }}>
          + Deal
        </button>
      </div>

      {showForm && (
        <div style={{ marginBottom: 16, padding: 14, borderRadius: 12, border: `1px solid ${GOLD}40`, background: `${GOLD}08`, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Business name *" style={inputStyle} />
          <input value={form.industry} onChange={e => setForm(p => ({ ...p, industry: e.target.value }))} placeholder="Industry" style={inputStyle} />
          <input value={form.valueGHS} onChange={e => setForm(p => ({ ...p, valueGHS: e.target.value }))} placeholder="Value (GHS) *" type="number" style={inputStyle} />
          <input value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} placeholder="Phone (+233…)" style={inputStyle} />
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={handleSubmit} style={{ flex: 1, padding: '9px', borderRadius: 8, background: GOLD, color: BG, fontFamily: FONT_HEADING, fontWeight: 700, fontSize: 13, border: 'none', cursor: 'pointer' }}>Add Deal</button>
            <button onClick={() => setShowForm(false)} style={{ padding: '9px 14px', borderRadius: 8, background: SURFACE2, color: MUTED, fontFamily: FONT_BODY, fontSize: 13, border: `1px solid ${BORDER}`, cursor: 'pointer' }}>Cancel</button>
          </div>
        </div>
      )}

      {STAGES.map(stage => {
        const stageDeals = deals.filter(d => d.stage === stage)
        return (
          <div key={stage} style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <div style={{ fontSize: 10, fontFamily: FONT_HEADING, fontWeight: 600, color: stage === 'closed' ? GOLD : MUTED, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                {STAGE_LABELS[stage]}
              </div>
              <div style={{ flex: 1, height: 1, background: BORDER }} />
              <div style={{ fontSize: 10, color: MUTED, fontFamily: FONT_BODY }}>{stageDeals.length}</div>
            </div>
            {stageDeals.length === 0 && (
              <div style={{ fontSize: 12, color: MUTED, fontFamily: FONT_BODY, padding: '4px 0', opacity: 0.5 }}>No deals yet</div>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {stageDeals.map(deal => <DealCard key={deal.id} deal={deal} onMove={onMove} onDelete={onDelete} onOpenAgent={onOpenAgent} onPublishToWebsite={onPublishToWebsite} />)}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ─── WebsiteProjectsView ─────────────────────────────────────────────────────

const BLANK_PROJECT = (): Partial<WebsiteProject> => ({
  title: '', category: 'Website', description: '', image: '',
  features: [], technologies: [], link: '', client: '',
  year: new Date().getFullYear(), featured: false, status: 'completed',
})

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

function WebsiteProjectsView({ prefill, onClearPrefill }: {
  prefill?: Partial<WebsiteProject> | null
  onClearPrefill?: () => void
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
  const showForm = editing !== null

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
            <button onClick={openNew} style={{ padding: '7px 14px', borderRadius: 8, background: GOLD, color: BG, fontFamily: FONT_HEADING, fontWeight: 700, fontSize: 13, border: 'none', cursor: 'pointer' }}>
              + Add Project
            </button>
          </div>
        )}
      </div>
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

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {projects.map(p => (
          <div key={p.id} style={{ padding: '12px 14px', borderRadius: 10, border: `1px solid ${BORDER}`, background: SURFACE2 }}>
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
          </div>
        ))}
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
    await Promise.allSettled(
      COUNCIL_AGENT_IDS.map(async (agentId) => {
        try {
          const text = await callChat(AGENTS[agentId].systemPrompt, [{ role: 'user', content: q }], pinnedNotes, agentId, workspace)
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

// ─── BottomNav ────────────────────────────────────────────────────────────────

function BottomNav({ activeView, allChats, onSelect }: {
  activeView: ViewId; allChats: AllChats; onSelect: (v: ViewId) => void
}) {
  const renderViewBtn = (v: ViewId, icon: string, label: string) => {
    const isActive = v === activeView
    return (
      <button key={v} onClick={() => onSelect(v)} style={{
        width: 60, flexShrink: 0, minHeight: 56, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', gap: 2, background: 'none',
        borderTop: `2px solid ${isActive ? GOLD : 'transparent'}`,
        paddingTop: 10, paddingBottom: 8, transition: 'border-color 0.15s',
      }}>
        <span style={{ fontSize: 17, lineHeight: 1, color: isActive ? GOLD : MUTED, transition: 'color 0.15s' }}>{icon}</span>
        <span style={{ fontFamily: FONT_HEADING, fontSize: 9, fontWeight: isActive ? 700 : 400, color: isActive ? GOLD : MUTED, letterSpacing: '0.02em', textAlign: 'center', lineHeight: 1.2 }}>{label}</span>
      </button>
    )
  }

  const renderAgentBtn = (id: AgentId) => {
    const a = AGENTS[id]
    const isActive = id === activeView
    const turnCount = Math.floor((allChats[id]?.length ?? 0) / 2)
    return (
      <button key={id} onClick={() => onSelect(id)} style={{
        width: 60, flexShrink: 0, minHeight: 56, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', gap: 2, background: 'none',
        borderTop: `2px solid ${isActive ? TEXT : 'transparent'}`,
        paddingTop: 10, paddingBottom: 8, transition: 'border-color 0.15s',
      }}>
        <span style={{ fontSize: 17, lineHeight: 1, color: isActive ? TEXT : MUTED, transition: 'color 0.15s' }}>{a.icon}</span>
        <span style={{ fontFamily: FONT_HEADING, fontSize: 9, fontWeight: isActive ? 700 : 400, color: isActive ? TEXT : MUTED, letterSpacing: '0.02em', textAlign: 'center', lineHeight: 1.2 }}>{a.short}</span>
        {turnCount > 0 && <span style={{ fontFamily: FONT_BODY, fontSize: 8, color: MUTED, background: SURFACE2, padding: '1px 4px', borderRadius: 6 }}>{turnCount}</span>}
      </button>
    )
  }

  const divider = (key: string) => <div key={key} style={{ width: 1, background: BORDER, flexShrink: 0, margin: '8px 2px', alignSelf: 'stretch' }} />

  return (
    <div style={{ background: SURFACE, borderTop: `1px solid ${BORDER}`, paddingTop: 6, paddingBottom: 0, flexShrink: 0, overflowX: 'auto', WebkitOverflowScrolling: 'touch' } as React.CSSProperties}>
      <style>{`.tn::-webkit-scrollbar{display:none}`}</style>
      <div className="tn" style={{ display: 'flex', minWidth: 'max-content' }}>
        {renderViewBtn('home', '⌂', 'Home')}
        {renderViewBtn('pipeline', '◫', 'Deals')}
        {renderViewBtn('website', '↑', 'Website')}
        {renderViewBtn('council', '⊙', 'Council')}
        {divider('d1')}
        {MAIN_AGENT_IDS.map(renderAgentBtn)}
        {divider('d2')}
        {COUNCIL_AGENT_IDS.map(renderAgentBtn)}
      </div>
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
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [briefResult, setBriefResult] = useState('')
  const [briefLoading, setBriefLoading] = useState(false)
  const [websitePrefill, setWebsitePrefill] = useState<Partial<WebsiteProject> | null>(null)
  const [viralPrefill, setViralPrefill] = useState<string | null>(null)
  const [notesOpen, setNotesOpen] = useState(false)
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
    fetch('/api/conversations')
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data && typeof data === 'object') {
          setAllChats(data as AllChats)
          saveAllChats(data as AllChats)
        }
      })
      .catch(() => {})
  }, [])

  // Load pinned notes from Supabase on mount (localStorage shows immediately)
  useEffect(() => {
    fetch('/api/notes')
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.value) { setPinnedNotes(d.value); localStorage.setItem('tagett-pinned-notes-v1', d.value) } })
      .catch(() => {})
  }, [])

  useEffect(() => {
    // Show local data immediately, then hydrate from Supabase
    const local = loadDeals()
    if (local.length > 0) setDeals(local)
    fetch('/api/deals')
      .then(r => r.json())
      .then(d => { if (Array.isArray(d)) { setDeals(d); saveDeals(d) } })
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
  useEffect(() => { localStorage.setItem('tagett-workspace-v1', JSON.stringify(workspace)) }, [workspace])

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
      const reply = await callChat(AGENTS[activeAgent].systemPrompt, next, pinnedNotes, activeAgent, workspace)
      setAllChats((prev) => ({ ...prev, [activeAgent]: [...(prev[activeAgent] ?? []), { role: 'assistant', content: reply }] }))
      saveMessage(activeAgent, 'assistant', reply)
      setWorkspace((prev) => ({ ...prev, [activeAgent]: reply.slice(0, 700) }))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally { setLoading(false) }
  }, [activeAgent, allChats, workspace, pinnedNotes])

  const handleRunBriefing = useCallback(() => {
    if (agent.dailyPrompt) handleSend(agent.dailyPrompt)
  }, [agent.dailyPrompt, handleSend])

  const handleRunBrief = useCallback(async () => {
    setBriefLoading(true); setBriefResult('')
    try {
      const reply = await callChat(AGENTS.executor.systemPrompt, [{ role: 'user', content: AGENTS.executor.dailyPrompt }], pinnedNotes, 'executor', workspace)
      setBriefResult(reply)
    } catch (err) {
      setBriefResult('Error: ' + (err instanceof Error ? err.message : 'Unknown'))
    } finally { setBriefLoading(false) }
  }, [pinnedNotes, workspace])

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
      const reply = await callChat(AGENTS[targetAgent].systemPrompt, msgs, pinnedNotes, targetAgent, workspace)
      setAllChats((prev) => ({ ...prev, [targetAgent]: [...(prev[targetAgent] ?? []), { role: 'assistant', content: reply }] }))
      saveMessage(targetAgent, 'assistant', reply)
      setWorkspace((prev) => ({ ...prev, [targetAgent]: reply.slice(0, 700) }))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally { setLoading(false) }
  }, [pinnedNotes, workspace])

  const handleOpenAgent = useCallback((agentId: AgentId, prompt: string) => {
    handleHandoff(agentId, prompt)
  }, [handleHandoff])

  const handleAddDeal = useCallback((d: Omit<Deal, 'id' | 'createdAt'>) => {
    setDeals(prev => [...prev, { ...d, id: Date.now().toString(), createdAt: Date.now() }])
  }, [])

  const handleMoveDeal = useCallback((id: string, stage: DealStage) => {
    const deal = deals.find(d => d.id === id)
    setDeals(prev => prev.map(d => d.id === id ? { ...d, stage, stageChangedAt: Date.now() } : d))
    if (stage === 'closed' && deal) {
      const category = /mobile|app/i.test(deal.industry) ? 'Mobile App' :
        /software|system|erp/i.test(deal.industry) ? 'Business Software' :
        /gis|map|geo/i.test(deal.industry) ? 'GIS solution' :
        /web app|application/i.test(deal.industry) ? 'Web Application' : 'Website'
      const prompt = `We just closed a deal and completed a project! Write a viral project reveal for Ecstasy Technologies:\n\nClient: ${deal.name}\nBusiness type: ${deal.industry}\nProject type: ${category}\nDeal value: GHS ${deal.valueGHS.toLocaleString()}\n\nDeliver:\n1. A viral X thread (6 tweets) — hook with the project reveal, walk through what we built, end with CTA to ecstasytechnologies.com. Specify which screenshot to attach.\n2. A LinkedIn founder post — tell the story of this client win, what they needed, what we built, what changes for them now.\n\nWrite as Dominic Agyapong. Make it immediately postable.`
      setViralPrefill(prompt)
      setTimeout(() => { setActiveView('viral'); setError(null) }, 700)
    }
  }, [deals])

  const handleDeleteDeal = useCallback((id: string) => {
    setDeals(prev => prev.filter(d => d.id !== id))
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
    const shell = (content: React.ReactNode) => (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100dvh', background: BG, overflow: 'hidden' }}>
        {content}
        <BottomNav activeView={activeView} allChats={allChats} onSelect={(v) => { setActiveView(v); setError(null) }} />
      </div>
    )

    if (activeView === 'home') return shell(
      <CommandCenter deals={deals} earnedGHS={earnedGHS} theme={theme} onToggleTheme={toggleTheme} notifToggle={notifToggle} onNavigate={(v) => { setActiveView(v); setError(null) }} onRunBrief={handleRunBrief} briefResult={briefResult} briefLoading={briefLoading} />
    )

    if (activeView === 'pipeline') return shell(
      <DealPipeline deals={deals} onAdd={handleAddDeal} onMove={handleMoveDeal} onDelete={handleDeleteDeal} onOpenAgent={handleOpenAgent} onPublishToWebsite={handlePublishDealToWebsite} />
    )

    if (activeView === 'website') return shell(
      <WebsiteProjectsView prefill={websitePrefill} onClearPrefill={() => setWebsitePrefill(null)} />
    )

    if (activeView === 'council') return shell(<CouncilChamber pinnedNotes={pinnedNotes} workspace={workspace} />)

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
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {AgentSubheader}
          <MissionBar workspace={workspace} earnedGHS={earnedGHS} pipelineGHS={pipelineGHS} onClearWorkspace={() => setWorkspace({})} />
          {error && <ErrorBanner error={error} onDismiss={() => setError(null)} />}
          <MessageList messages={messages} loading={loading} agent={agent} onSend={handleSend} onRunBriefing={handleRunBriefing} onHandoff={handleHandoff} />
          {activeAgent === 'scout' && <ScoutToolbar onSend={handleSend} loading={loading} />}
          <ChatInput agentShort={agent.short} onSend={handleSend} loading={loading} prefill={activeAgent === 'viral' ? viralPrefill : null} onClearPrefill={() => setViralPrefill(null)} />
        </div>
        <PinnedNotesPanel open={notesOpen} notes={pinnedNotes} onClose={() => setNotesOpen(false)} onChange={setPinnedNotes} />
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
      <DealPipeline deals={deals} onAdd={handleAddDeal} onMove={handleMoveDeal} onDelete={handleDeleteDeal} onOpenAgent={handleOpenAgent} onPublishToWebsite={handlePublishDealToWebsite} />
    )
    if (activeView === 'website') return (
      <WebsiteProjectsView prefill={websitePrefill} onClearPrefill={() => setWebsitePrefill(null)} />
    )
    if (activeView === 'council') return <CouncilChamber pinnedNotes={pinnedNotes} workspace={workspace} />
    return (
      <>
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
        <MissionBar workspace={workspace} earnedGHS={earnedGHS} pipelineGHS={pipelineGHS} onClearWorkspace={() => setWorkspace({})} />
        {error && <ErrorBanner error={error} onDismiss={() => setError(null)} />}
        <MessageList messages={messages} loading={loading} agent={agent} onSend={handleSend} onRunBriefing={handleRunBriefing} onHandoff={handleHandoff} />
        {activeAgent === 'scout' && <ScoutToolbar onSend={handleSend} loading={loading} />}
        <ChatInput agentShort={agent.short} onSend={handleSend} loading={loading} prefill={activeAgent === 'viral' ? viralPrefill : null} onClearPrefill={() => setViralPrefill(null)} />
      </>
    )
  }

  return (
    <div style={{ display: 'flex', height: '100vh', background: BG, overflow: 'hidden' }}>
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
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '10px 4px 6px' }}>
            <div style={{ flex: 1, height: 1, background: BORDER }} />
            <span style={{ fontSize: 9, fontFamily: FONT_HEADING, fontWeight: 600, color: MUTED, letterSpacing: '0.12em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>Operators</span>
            <div style={{ flex: 1, height: 1, background: BORDER }} />
          </div>
          {MAIN_AGENT_IDS.map(renderAgentNavBtn)}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '10px 4px 8px' }}>
            <div style={{ flex: 1, height: 1, background: BORDER }} />
            <span style={{ fontSize: 9, fontFamily: FONT_HEADING, fontWeight: 600, color: MUTED, letterSpacing: '0.12em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>The Council</span>
            <div style={{ flex: 1, height: 1, background: BORDER }} />
          </div>
          {COUNCIL_AGENT_IDS.map(renderAgentNavBtn)}
        </nav>
        <div style={{ borderTop: `1px solid ${BORDER}` }}>
          <div style={{ padding: '10px 16px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            {notifToggle}
            <ThemeToggle theme={theme} onToggle={toggleTheme} />
          </div>
          <GoalRing earned={earnedGHS} />
        </div>
      </div>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {renderMainContent()}
      </div>
      <PinnedNotesPanel open={notesOpen} notes={pinnedNotes} onClose={() => setNotesOpen(false)} onChange={setPinnedNotes} />
    </div>
  )
}
