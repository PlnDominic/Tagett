// ─── Shared types & lookup tables ──────────────────────────────────────────────
// Extracted from app/page.tsx — these are pure type/data declarations with no
// component or business-logic dependencies, so they're safe to share across the
// app without pulling in the rest of page.tsx.

export interface Message {
  role: 'user' | 'assistant'
  content: string
}

export type AgentId = 'prospect' | 'content' | 'scope' | 'revenue' | 'viral' | 'scout' | 'contrarian' | 'firstp' | 'expansionist' | 'outsider' | 'executor'
export type ViewId = 'home' | 'pipeline' | 'website' | 'council' | 'history' | 'clients' | 'invoices' | 'social' | 'data-quality' | 'analytics' | 'prospect-map' | AgentId

export type MobileTab = 'home' | 'work' | 'agents' | 'more'

// ─── Website project types (mirrors API route & ecstasytechnologies.com schema)
export type ProjectCategory = 'Website' | 'Web Application' | 'Mobile App' | 'Business Software' | 'GIS'
export const PROJECT_CATEGORIES: ProjectCategory[] = ['Website', 'Web Application', 'Mobile App', 'Business Software', 'GIS']

export interface WebsiteProject {
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

export interface Agent {
  id: AgentId
  icon: string
  label: string
  short: string
  description: string
  systemPrompt: string
  dailyPrompt: string
  briefingLabel: string
}

export type AllChats = Record<AgentId, Message[]>

// ─── Deal pipeline model ────────────────────────────────────────────────────────

export type DealStage = 'found' | 'contacted' | 'interested' | 'proposal' | 'negotiating' | 'closed' | 'lost'
export const STAGES: DealStage[] = ['found', 'contacted', 'interested', 'proposal', 'negotiating', 'closed', 'lost']
export const STAGE_LABELS: Record<DealStage, string> = {
  found: 'Found', contacted: 'Contacted', interested: 'Interested',
  proposal: 'Proposal Sent', negotiating: 'Negotiating', closed: 'Closed', lost: 'Lost',
}
export const STAGE_WEIGHT: Record<DealStage, number> = {
  found: 0.10, contacted: 0.20, interested: 0.40,
  proposal: 0.60, negotiating: 0.75, closed: 1.00, lost: 0,
}
export const STAGE_COLOR: Record<DealStage, string> = {
  found: '#8B5CF6', contacted: '#3B82F6', interested: '#10B981',
  proposal: '#F59E0B', negotiating: '#EF4444', closed: '#E84040', lost: '#9CA3AF',
}
export const STAGE_STALE_MS: Record<DealStage, number> = {
  found: 3 * 86400000, contacted: 5 * 86400000, interested: 7 * 86400000,
  proposal: 10 * 86400000, negotiating: 14 * 86400000, closed: 0, lost: 0,
}

export interface Deal {
  id: string
  name: string
  industry: string
  valueGHS: number
  stage: DealStage
  phone?: string
  createdAt: number
  stageChangedAt?: number
  followUpAt?: number
  followUpReason?: 'referral'
  lastContactedAt?: number
  whatsappHistory?: Array<{ text: string; sentAt: number }>
  repliedAt?: number
  callLog?: Array<{ calledAt: number }>
  websiteCheck?: 'confirmed_no_site' | 'found_site' | 'unclear'
  websiteCheckUrl?: string
  // Multi-touch follow-up sequence: number of touches sent so far (1 = the
  // initial pitch). The follow-up cron advances this and schedules the next
  // touch (day 3 → day 7 → day 14 break-up) until the client replies,
  // the deal closes/loses, or the sequence completes.
  sequenceStep?: number
}

export interface ParsedProspect {
  name: string
  industry: string
  address?: string
  phone?: string
  whyNeedsWebsite?: string
  servicePitch?: string
  valueGHS: number
  phonePitch?: string
}

// ─── Invoices ─────────────────────────────────────────────────────────────────

export interface InvoiceMilestone {
  id: string
  label: string
  amountGHS: number
  paidAt?: number
  paymentMethod?: string
  notes?: string
}

export interface Invoice {
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

// ─── Maintenance retainers (recurring revenue) ─────────────────────────────────

export interface Retainer {
  id: string
  clientName: string
  dealId?: string
  phone?: string
  monthlyGHS: number
  status: 'active' | 'paused' | 'cancelled'
  startedAt: number
  lastBilledAt?: number
  notes?: string
}

// ─── Social posts ───────────────────────────────────────────────────────────────

export type SocialPlatform = 'twitter' | 'linkedin' | 'facebook' | 'instagram' | 'tiktok' | 'status'
export const PLATFORM_LABELS: Record<SocialPlatform, string> = {
  twitter: 'X', linkedin: 'LinkedIn', facebook: 'Facebook', instagram: 'Instagram', tiktok: 'TikTok', status: 'WA Status',
}
export const PLATFORM_COLORS: Record<SocialPlatform, string> = {
  twitter: '#000000', linkedin: '#0A66C2', facebook: '#1877F2', instagram: '#E1306C', tiktok: '#010101', status: '#25D366',
}
export const PLATFORM_ICONS: Record<SocialPlatform, string> = {
  twitter: '𝕏', linkedin: 'in', facebook: 'f', instagram: '◎', tiktok: '♪', status: '💬',
}

export interface SocialPost {
  id: string
  content: string
  platforms: SocialPlatform[]
  status: 'draft' | 'scheduled' | 'posted'
  scheduledFor?: number
  postedAt?: number
  createdAt: number
  category?: string
  resultDealId?: string
}

// ─── Clients ─────────────────────────────────────────────────────────────────

export interface Client {
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
