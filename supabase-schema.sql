-- ============================================================
-- Tagett — Ecstasy Technologies Operator Dashboard
-- Full Supabase schema — 12 tables
--
-- HOW TO USE
--   Paste this entire script into the Supabase SQL Editor and run it.
--   Safe to re-run: CREATE TABLE IF NOT EXISTS + ALTER TABLE ADD COLUMN IF NOT EXISTS
--   means existing data is never touched.
--
-- TABLES
--   1.  deals               CRM pipeline deals
--   2.  clients             Contact / prospect database
--   3.  conversations       All agent chat history (every agent's messages)
--   4.  settings            Key-value store (pinned notes, etc.)
--   5.  push_subscriptions  Browser push notification endpoints
--   6.  agent_runs          Autonomous daily sales run records
--   7.  invoices            Invoice headers
--   8.  invoice_milestones  Payment milestones within an invoice
--   9.  social_posts        Social content calendar
--   10. case_studies        AI-generated portfolio case studies
--   11. workspace           Team intel — per-agent summary used as AI context
--   12. website_projects    Portfolio project data (mirror of GitHub projects.json)
-- ============================================================


-- ─── 1. DEALS ────────────────────────────────────────────────────────────────
-- CRM pipeline deals.  Synced bidirectionally with the app every 1.5 s.

CREATE TABLE IF NOT EXISTS deals (
  id                TEXT        PRIMARY KEY,  -- Unix-ms timestamp string
  name              TEXT        NOT NULL,
  industry          TEXT        NOT NULL DEFAULT 'Unknown',
  value_ghs         NUMERIC     NOT NULL DEFAULT 0,
  stage             TEXT        NOT NULL DEFAULT 'found',
    -- found | contacted | interested | proposal | negotiating | closed | lost
  phone             TEXT,
  created_at        BIGINT      NOT NULL,     -- Unix ms
  stage_changed_at  BIGINT,
  follow_up_at      BIGINT,
  last_contacted_at BIGINT,
  whatsapp_history  JSONB       DEFAULT '[]'::JSONB
    -- [{text: string, sentAt: number}]
);

ALTER TABLE deals ADD COLUMN IF NOT EXISTS industry          TEXT    NOT NULL DEFAULT 'Unknown';
ALTER TABLE deals ADD COLUMN IF NOT EXISTS value_ghs         NUMERIC NOT NULL DEFAULT 0;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS stage             TEXT    NOT NULL DEFAULT 'found';
ALTER TABLE deals ADD COLUMN IF NOT EXISTS phone             TEXT;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS stage_changed_at  BIGINT;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS follow_up_at      BIGINT;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS last_contacted_at BIGINT;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS whatsapp_history  JSONB   DEFAULT '[]'::JSONB;

CREATE INDEX IF NOT EXISTS deals_stage_idx        ON deals (stage);
CREATE INDEX IF NOT EXISTS deals_follow_up_at_idx ON deals (follow_up_at) WHERE follow_up_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS deals_created_at_idx   ON deals (created_at DESC);

ALTER TABLE deals ENABLE ROW LEVEL SECURITY;


-- ─── 2. CLIENTS ──────────────────────────────────────────────────────────────
-- Contact / prospect database.  Full CRUD via /api/clients.

CREATE TABLE IF NOT EXISTS clients (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT        NOT NULL,
  phone       TEXT,
  whatsapp    TEXT,
  email       TEXT,
  website     TEXT,
  industry    TEXT,
  notes       TEXT,
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE clients ADD COLUMN IF NOT EXISTS phone      TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS whatsapp   TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS email      TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS website    TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS industry   TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS notes      TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

CREATE INDEX IF NOT EXISTS clients_name_idx       ON clients (lower(name));
CREATE INDEX IF NOT EXISTS clients_industry_idx   ON clients (industry);
CREATE INDEX IF NOT EXISTS clients_created_at_idx ON clients (created_at DESC);

ALTER TABLE clients ENABLE ROW LEVEL SECURITY;


-- ─── 3. CONVERSATIONS ────────────────────────────────────────────────────────
-- Every message sent to or received from any agent.
-- agent_id identifies which agent:
--   prospect | content | scope | revenue | viral | scout | council
--   (and any future agents — just use their id string)

CREATE TABLE IF NOT EXISTS conversations (
  id         BIGSERIAL   PRIMARY KEY,
  agent_id   TEXT        NOT NULL,
  role       TEXT        NOT NULL CHECK (role IN ('user', 'assistant')),
  content    TEXT        NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS conversations_agent_id_idx   ON conversations (agent_id);
CREATE INDEX IF NOT EXISTS conversations_created_at_idx ON conversations (created_at ASC);
CREATE INDEX IF NOT EXISTS conversations_content_idx
  ON conversations USING gin(to_tsvector('english', content));

ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;


-- ─── 4. SETTINGS ─────────────────────────────────────────────────────────────
-- Generic key-value store.
-- Current keys: pinned_notes

CREATE TABLE IF NOT EXISTS settings (
  key        TEXT        PRIMARY KEY,
  value      TEXT        NOT NULL DEFAULT '',
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

INSERT INTO settings (key, value) VALUES ('pinned_notes', '')
ON CONFLICT (key) DO NOTHING;


-- ─── 5. PUSH SUBSCRIPTIONS ───────────────────────────────────────────────────
-- Web Push (VAPID) subscriptions for browser notifications.

CREATE TABLE IF NOT EXISTS push_subscriptions (
  id           BIGSERIAL   PRIMARY KEY,
  endpoint     TEXT        NOT NULL UNIQUE,
  subscription JSONB       NOT NULL,  -- full PushSubscription object from browser
  created_at   TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;


-- ─── 6. AGENT RUNS ───────────────────────────────────────────────────────────
-- Records of every autonomous daily sales run (Vercel Cron).
-- Shown in the History view.

CREATE TABLE IF NOT EXISTS agent_runs (
  id               BIGSERIAL   PRIMARY KEY,
  run_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  industry         TEXT,        -- randomly-picked industry for this run
  city             TEXT,        -- randomly-picked Ghanaian city for this run
  social_results   TEXT,        -- SocialScout output
  prospect_results TEXT,        -- ProspectBot output
  pitch_drafts     TEXT,        -- ContentBot drafted pitches
  pipeline_summary TEXT         -- RevenueBot pipeline status
);

ALTER TABLE agent_runs ADD COLUMN IF NOT EXISTS industry         TEXT;
ALTER TABLE agent_runs ADD COLUMN IF NOT EXISTS city             TEXT;
ALTER TABLE agent_runs ADD COLUMN IF NOT EXISTS social_results   TEXT;
ALTER TABLE agent_runs ADD COLUMN IF NOT EXISTS prospect_results TEXT;
ALTER TABLE agent_runs ADD COLUMN IF NOT EXISTS pitch_drafts     TEXT;
ALTER TABLE agent_runs ADD COLUMN IF NOT EXISTS pipeline_summary TEXT;

CREATE INDEX IF NOT EXISTS agent_runs_run_at_idx ON agent_runs (run_at DESC);

ALTER TABLE agent_runs ENABLE ROW LEVEL SECURITY;


-- ─── 7. INVOICES ─────────────────────────────────────────────────────────────
-- Invoice headers.  Milestones (deposits/payments) live in invoice_milestones.
-- Synced bidirectionally via /api/invoices.

CREATE TABLE IF NOT EXISTS invoices (
  id          TEXT        PRIMARY KEY,  -- Unix-ms timestamp string
  client_name TEXT        NOT NULL,
  description TEXT        NOT NULL DEFAULT '',
  deal_id     TEXT        REFERENCES deals (id) ON DELETE SET NULL,
  total_ghs   NUMERIC     NOT NULL DEFAULT 0,
  status      TEXT        NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'sent', 'partial', 'paid')),
  created_at  BIGINT      NOT NULL,    -- Unix ms
  due_at      BIGINT,
  sent_at     BIGINT,
  notes       TEXT
);

ALTER TABLE invoices ADD COLUMN IF NOT EXISTS description TEXT NOT NULL DEFAULT '';
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS deal_id     TEXT REFERENCES deals (id) ON DELETE SET NULL;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS due_at      BIGINT;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS sent_at     BIGINT;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS notes       TEXT;

CREATE INDEX IF NOT EXISTS invoices_status_idx     ON invoices (status);
CREATE INDEX IF NOT EXISTS invoices_created_at_idx ON invoices (created_at DESC);
CREATE INDEX IF NOT EXISTS invoices_deal_id_idx    ON invoices (deal_id) WHERE deal_id IS NOT NULL;

ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;


-- ─── 8. INVOICE MILESTONES ───────────────────────────────────────────────────
-- Deposit / payment milestones within an invoice.
-- Deleted automatically when the parent invoice is deleted (CASCADE).

CREATE TABLE IF NOT EXISTS invoice_milestones (
  id             TEXT    PRIMARY KEY,  -- Unix-ms timestamp string
  invoice_id     TEXT    NOT NULL REFERENCES invoices (id) ON DELETE CASCADE,
  label          TEXT    NOT NULL,
  amount_ghs     NUMERIC NOT NULL DEFAULT 0,
  paid_at        BIGINT,              -- Unix ms; NULL = unpaid
  payment_method TEXT,                -- Momo | Bank | Cash | Other
  notes          TEXT
);

ALTER TABLE invoice_milestones ADD COLUMN IF NOT EXISTS paid_at        BIGINT;
ALTER TABLE invoice_milestones ADD COLUMN IF NOT EXISTS payment_method TEXT;
ALTER TABLE invoice_milestones ADD COLUMN IF NOT EXISTS notes          TEXT;

CREATE INDEX IF NOT EXISTS milestones_invoice_id_idx ON invoice_milestones (invoice_id);

ALTER TABLE invoice_milestones ENABLE ROW LEVEL SECURITY;


-- ─── 9. SOCIAL POSTS ─────────────────────────────────────────────────────────
-- Social content calendar: drafts, scheduled, and posted content.
-- Synced bidirectionally via /api/social-posts.

CREATE TABLE IF NOT EXISTS social_posts (
  id            TEXT    PRIMARY KEY,  -- Unix-ms timestamp string
  content       TEXT    NOT NULL,
  platforms     JSONB   NOT NULL DEFAULT '[]'::JSONB,
    -- ['twitter','linkedin','facebook','instagram','tiktok']
  status        TEXT    NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'scheduled', 'posted')),
  scheduled_for BIGINT,   -- Unix ms; set when status = 'scheduled'
  posted_at     BIGINT,   -- Unix ms; set when status = 'posted'
  created_at    BIGINT    NOT NULL,
  category      TEXT      -- Pain Points | Tips | Case Study | Portfolio | Promo
);

ALTER TABLE social_posts ADD COLUMN IF NOT EXISTS scheduled_for BIGINT;
ALTER TABLE social_posts ADD COLUMN IF NOT EXISTS posted_at     BIGINT;
ALTER TABLE social_posts ADD COLUMN IF NOT EXISTS category      TEXT;

CREATE INDEX IF NOT EXISTS social_posts_status_idx     ON social_posts (status);
CREATE INDEX IF NOT EXISTS social_posts_created_at_idx ON social_posts (created_at DESC);

ALTER TABLE social_posts ENABLE ROW LEVEL SECURITY;


-- ─── 10. CASE STUDIES ────────────────────────────────────────────────────────
-- AI-generated case studies for portfolio projects.
-- Keyed by project_id (matches website_projects.id).
-- Synced via /api/case-studies.

CREATE TABLE IF NOT EXISTS case_studies (
  project_id    INTEGER     PRIMARY KEY,  -- website_projects.id
  project_title TEXT,
  raw_text      TEXT        NOT NULL,     -- full AI output
  problem       TEXT,
  solution      TEXT,
  result        TEXT,
  proof_snippet TEXT,
  generated_at  TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE case_studies ADD COLUMN IF NOT EXISTS project_title TEXT;
ALTER TABLE case_studies ADD COLUMN IF NOT EXISTS problem       TEXT;
ALTER TABLE case_studies ADD COLUMN IF NOT EXISTS solution      TEXT;
ALTER TABLE case_studies ADD COLUMN IF NOT EXISTS result        TEXT;
ALTER TABLE case_studies ADD COLUMN IF NOT EXISTS proof_snippet TEXT;

ALTER TABLE case_studies ENABLE ROW LEVEL SECURITY;


-- ─── 11. WORKSPACE ───────────────────────────────────────────────────────────
-- Team intel: the latest summary output of each agent, used as context
-- when talking to other agents (the "workspace" / team intel bar).
-- One row per agent.  Updated in real time via /api/workspace.

CREATE TABLE IF NOT EXISTS workspace (
  agent_id   TEXT        PRIMARY KEY,
    -- prospect | content | scope | revenue | viral | scout | council
  summary    TEXT        NOT NULL DEFAULT '',
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE workspace ENABLE ROW LEVEL SECURITY;

-- Seed all known agents so rows exist from the start
INSERT INTO workspace (agent_id, summary) VALUES
  ('prospect', ''), ('content', ''), ('scope', ''),
  ('revenue',  ''), ('viral',   ''), ('scout', ''),
  ('council',  '')
ON CONFLICT (agent_id) DO NOTHING;


-- ─── 12. WEBSITE PROJECTS ────────────────────────────────────────────────────
-- Portfolio projects — mirrors the GitHub-hosted projects.json so data
-- is never lost if the repo is unavailable.
-- Synced via /api/website/projects whenever a project is saved or deleted.

CREATE TABLE IF NOT EXISTS website_projects (
  id           INTEGER     PRIMARY KEY,
  title        TEXT        NOT NULL,
  category     TEXT        NOT NULL DEFAULT 'Website',
    -- Website | Web Application | Mobile App | Business Software | GIS
  description  TEXT        NOT NULL DEFAULT '',
  image        TEXT        NOT NULL DEFAULT '',
  features     JSONB       NOT NULL DEFAULT '[]'::JSONB,
  technologies JSONB       NOT NULL DEFAULT '[]'::JSONB,
  link         TEXT,
  year         INTEGER,
  client       TEXT,
  featured     BOOLEAN     DEFAULT false,
  status       TEXT        DEFAULT 'completed',
    -- completed | in-progress
  updated_at   TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE website_projects ADD COLUMN IF NOT EXISTS link       TEXT;
ALTER TABLE website_projects ADD COLUMN IF NOT EXISTS year       INTEGER;
ALTER TABLE website_projects ADD COLUMN IF NOT EXISTS client     TEXT;
ALTER TABLE website_projects ADD COLUMN IF NOT EXISTS featured   BOOLEAN DEFAULT false;
ALTER TABLE website_projects ADD COLUMN IF NOT EXISTS status     TEXT    DEFAULT 'completed';
ALTER TABLE website_projects ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

CREATE INDEX IF NOT EXISTS website_projects_category_idx ON website_projects (category);
CREATE INDEX IF NOT EXISTS website_projects_featured_idx ON website_projects (featured) WHERE featured = true;

ALTER TABLE website_projects ENABLE ROW LEVEL SECURITY;


-- ============================================================
-- SECURITY NOTE
-- All tables have RLS enabled.  The app uses SUPABASE_SERVICE_ROLE_KEY
-- server-side (via /api/* routes), which bypasses RLS automatically.
-- Never expose the service role key to the browser.
-- If you add multi-user auth later, add per-user policies here.
-- ============================================================
