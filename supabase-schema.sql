-- ============================================================
-- Tagett — Ecstasy Technologies Operator Dashboard
-- Full Supabase schema
-- Paste this entire script into the Supabase SQL Editor and run it.
-- Safe to re-run: all statements use CREATE TABLE IF NOT EXISTS.
-- ============================================================


-- ─── 1. DEALS ────────────────────────────────────────────────────────────────
-- CRM pipeline deals. Synced bidirectionally with the app's local state.

CREATE TABLE IF NOT EXISTS deals (
  id               TEXT        PRIMARY KEY,   -- timestamp string e.g. "1718900000000"
  name             TEXT        NOT NULL,
  industry         TEXT        NOT NULL DEFAULT 'Unknown',
  value_ghs        NUMERIC     NOT NULL DEFAULT 0,
  stage            TEXT        NOT NULL DEFAULT 'found',
    -- found | contacted | interested | proposal | negotiating | closed | lost
  phone            TEXT,
  created_at       BIGINT      NOT NULL,      -- Unix ms timestamp
  stage_changed_at BIGINT,
  follow_up_at     BIGINT,
  last_contacted_at BIGINT,
  whatsapp_history JSONB       DEFAULT '[]'::JSONB
    -- array of { text: string, sentAt: number }
);

CREATE INDEX IF NOT EXISTS deals_stage_idx         ON deals (stage);
CREATE INDEX IF NOT EXISTS deals_follow_up_at_idx  ON deals (follow_up_at) WHERE follow_up_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS deals_created_at_idx    ON deals (created_at DESC);

ALTER TABLE deals ENABLE ROW LEVEL SECURITY;


-- ─── 2. CLIENTS ──────────────────────────────────────────────────────────────
-- Contact/prospect database. Full CRUD via /api/clients.

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

CREATE INDEX IF NOT EXISTS clients_name_idx       ON clients (lower(name));
CREATE INDEX IF NOT EXISTS clients_industry_idx   ON clients (industry);
CREATE INDEX IF NOT EXISTS clients_created_at_idx ON clients (created_at DESC);

ALTER TABLE clients ENABLE ROW LEVEL SECURITY;


-- ─── 3. CONVERSATIONS ────────────────────────────────────────────────────────
-- Agent chat history. One row per message, grouped by agent_id on read.

CREATE TABLE IF NOT EXISTS conversations (
  id         BIGSERIAL   PRIMARY KEY,
  agent_id   TEXT        NOT NULL,
    -- prospect | content | scope | revenue | viral | scout | council | ...
  role       TEXT        NOT NULL CHECK (role IN ('user', 'assistant')),
  content    TEXT        NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS conversations_agent_id_idx   ON conversations (agent_id);
CREATE INDEX IF NOT EXISTS conversations_created_at_idx ON conversations (created_at ASC);
CREATE INDEX IF NOT EXISTS conversations_content_idx    ON conversations USING gin(to_tsvector('english', content));

ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;


-- ─── 4. SETTINGS ─────────────────────────────────────────────────────────────
-- Generic key-value store. Currently used for pinned_notes.
-- Add more keys here without schema changes (workspace state, preferences, etc.)

CREATE TABLE IF NOT EXISTS settings (
  key        TEXT        PRIMARY KEY,
  value      TEXT        NOT NULL DEFAULT '',
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- Seed the pinned_notes key so it exists even before the user sets it
INSERT INTO settings (key, value)
VALUES ('pinned_notes', '')
ON CONFLICT (key) DO NOTHING;


-- ─── 5. PUSH SUBSCRIPTIONS ───────────────────────────────────────────────────
-- Web Push (VAPID) subscriptions for browser notifications.

CREATE TABLE IF NOT EXISTS push_subscriptions (
  id           BIGSERIAL   PRIMARY KEY,
  endpoint     TEXT        NOT NULL UNIQUE,
  subscription JSONB       NOT NULL,    -- full PushSubscription object from browser
  created_at   TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;


-- ─── 6. AGENT RUNS ───────────────────────────────────────────────────────────
-- Records of every autonomous daily sales run (Vercel Cron).

CREATE TABLE IF NOT EXISTS agent_runs (
  id               BIGSERIAL   PRIMARY KEY,
  run_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  industry         TEXT,         -- randomly-picked industry for this run
  city             TEXT,         -- randomly-picked Ghanaian city for this run
  social_results   TEXT,         -- SocialScout output
  prospect_results TEXT,         -- ProspectBot output
  pitch_drafts     TEXT,         -- ContentBot drafted pitches
  pipeline_summary TEXT          -- RevenueBot pipeline status
);

CREATE INDEX IF NOT EXISTS agent_runs_run_at_idx ON agent_runs (run_at DESC);

ALTER TABLE agent_runs ENABLE ROW LEVEL SECURITY;


-- ─── 7. INVOICES ─────────────────────────────────────────────────────────────
-- Invoice and payment tracking. Currently stored in localStorage;
-- migrate by moving INVOICES_KEY data here via /api/invoices.

CREATE TABLE IF NOT EXISTS invoices (
  id           TEXT        PRIMARY KEY,   -- timestamp string
  client_name  TEXT        NOT NULL,
  description  TEXT        NOT NULL DEFAULT '',
  deal_id      TEXT        REFERENCES deals (id) ON DELETE SET NULL,
  total_ghs    NUMERIC     NOT NULL DEFAULT 0,
  status       TEXT        NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','sent','partial','paid')),
  created_at   BIGINT      NOT NULL,      -- Unix ms
  due_at       BIGINT,
  sent_at      BIGINT,
  notes        TEXT
);

CREATE INDEX IF NOT EXISTS invoices_status_idx     ON invoices (status);
CREATE INDEX IF NOT EXISTS invoices_created_at_idx ON invoices (created_at DESC);
CREATE INDEX IF NOT EXISTS invoices_deal_id_idx    ON invoices (deal_id) WHERE deal_id IS NOT NULL;

ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;


-- ─── 8. INVOICE MILESTONES ───────────────────────────────────────────────────
-- Deposit / payment milestones within an invoice.

CREATE TABLE IF NOT EXISTS invoice_milestones (
  id             TEXT        PRIMARY KEY,   -- timestamp string
  invoice_id     TEXT        NOT NULL REFERENCES invoices (id) ON DELETE CASCADE,
  label          TEXT        NOT NULL,
  amount_ghs     NUMERIC     NOT NULL DEFAULT 0,
  paid_at        BIGINT,                   -- Unix ms; NULL = unpaid
  payment_method TEXT,                     -- Momo | Bank | Cash | Other
  notes          TEXT
);

CREATE INDEX IF NOT EXISTS milestones_invoice_id_idx ON invoice_milestones (invoice_id);

ALTER TABLE invoice_milestones ENABLE ROW LEVEL SECURITY;


-- ─── 9. SOCIAL POSTS ─────────────────────────────────────────────────────────
-- Social content calendar: drafts, scheduled, and posted content.
-- Currently stored in localStorage (tagett-social-posts-v1).

CREATE TABLE IF NOT EXISTS social_posts (
  id            TEXT        PRIMARY KEY,   -- timestamp string
  content       TEXT        NOT NULL,
  platforms     JSONB       NOT NULL DEFAULT '[]'::JSONB,
    -- array of 'twitter' | 'linkedin' | 'facebook' | 'instagram' | 'tiktok'
  status        TEXT        NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','scheduled','posted')),
  scheduled_for BIGINT,     -- Unix ms; NULL unless status = 'scheduled'
  posted_at     BIGINT,     -- Unix ms; NULL unless status = 'posted'
  created_at    BIGINT      NOT NULL,
  category      TEXT        -- Pain Points | Tips | Case Study | Portfolio | Promo
);

CREATE INDEX IF NOT EXISTS social_posts_status_idx     ON social_posts (status);
CREATE INDEX IF NOT EXISTS social_posts_created_at_idx ON social_posts (created_at DESC);

ALTER TABLE social_posts ENABLE ROW LEVEL SECURITY;


-- ─── 10. CASE STUDIES ────────────────────────────────────────────────────────
-- AI-generated case studies for portfolio projects.
-- Currently stored in localStorage (tagett-case-studies-v1).
-- project_id matches WebsiteProject.id from the GitHub-hosted projects.json.

CREATE TABLE IF NOT EXISTS case_studies (
  project_id   INTEGER     PRIMARY KEY,   -- WebsiteProject.id
  project_title TEXT,
  raw_text     TEXT        NOT NULL,      -- full AI-generated case study
  problem      TEXT,
  solution     TEXT,
  result       TEXT,
  proof_snippet TEXT,
  generated_at TIMESTAMPTZ DEFAULT now(),
  updated_at   TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE case_studies ENABLE ROW LEVEL SECURITY;


-- ============================================================
-- SECURITY NOTE
-- All tables have RLS enabled. The app uses SUPABASE_SERVICE_ROLE_KEY
-- which bypasses RLS automatically — no policies are required for
-- server-side routes. Never expose the service role key client-side.
-- If you add multi-user auth in the future, add per-user policies here.
-- ============================================================
