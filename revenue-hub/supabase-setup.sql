-- Run this in Supabase → SQL Editor → New Query

-- 1. Deals table
create table if not exists deals (
  id              text primary key,
  name            text not null,
  industry        text not null,
  value_ghs       numeric not null default 0,
  stage           text not null default 'found',
  phone           text,
  created_at      bigint not null,
  stage_changed_at bigint,
  follow_up_at    bigint,
  updated_at      timestamptz default now()
);

-- Add follow_up_at to existing deals table if upgrading
alter table deals add column if not exists follow_up_at bigint;
alter table deals add column if not exists last_contacted_at bigint;
alter table deals add column if not exists whatsapp_history jsonb default '[]'::jsonb;
alter table deals add column if not exists replied_at bigint;
alter table deals add column if not exists call_log jsonb default '[]'::jsonb;
alter table deals add column if not exists website_check text;
alter table deals add column if not exists website_check_url text;
alter table deals add column if not exists follow_up_reason text;

-- 2. Push notification subscriptions (one row per browser/device)
create table if not exists push_subscriptions (
  endpoint        text primary key,
  subscription    jsonb not null,
  created_at      timestamptz default now()
);

-- 3. Key-value settings (pinned notes, preferences)
create table if not exists settings (
  key        text primary key,
  value      text,
  updated_at timestamptz default now()
);

-- 4. Agent conversation history (all chat messages persisted here)
create table if not exists conversations (
  id         uuid default gen_random_uuid() primary key,
  agent_id   text not null,
  role       text not null check (role in ('user', 'assistant')),
  content    text not null,
  created_at timestamptz default now()
);

create index if not exists conversations_agent_created
  on conversations (agent_id, created_at);

-- 5. Autonomous agent run log
create table if not exists agent_runs (
  id               uuid default gen_random_uuid() primary key,
  run_at           timestamptz default now(),
  industry         text,
  city             text,
  social_results   text,
  prospect_results text,
  pitch_drafts     text,
  pipeline_summary text
);

-- Optional: auto-delete runs older than 30 days to keep the table lean
-- create extension if not exists pg_cron;
-- select cron.schedule('delete-old-runs', '0 0 * * *', $$delete from agent_runs where run_at < now() - interval '30 days'$$);

-- 6. Client contact database
create table if not exists clients (
  id          uuid default gen_random_uuid() primary key,
  name        text not null,
  phone       text,
  whatsapp    text,
  email       text,
  website     text,
  industry    text,
  notes       text,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

-- 8. Shareable proposal pages (public read via service role, no auth needed to view)
create table if not exists proposals (
  id           text primary key,
  deal_id      text,
  business_name text not null,
  industry     text,
  scope        text not null default '',
  price_ghs    numeric not null default 0,
  status       text not null default 'sent',
  view_count   integer not null default 0,
  first_viewed_at bigint,
  last_viewed_at  bigint,
  created_at   bigint not null,
  updated_at   timestamptz default now()
);

-- 9. Maintenance retainers (recurring monthly revenue)
create table if not exists retainers (
  id          text primary key,
  client_name text not null,
  deal_id     text,
  phone       text,
  monthly_ghs numeric not null default 0,
  status      text not null default 'active',
  started_at  bigint not null,
  last_billed_at bigint,
  notes       text,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

-- 10. Social calendar posts
create table if not exists social_posts (
  id            text primary key,
  content       text not null,
  platforms     jsonb not null default '[]'::jsonb,
  status        text not null default 'draft',
  scheduled_for bigint,
  posted_at     bigint,
  created_at    bigint not null,
  category      text,
  result_deal_id text
);

-- Add result_deal_id to existing social_posts table if upgrading
alter table social_posts add column if not exists result_deal_id text;

-- 7. Storage bucket for project images
--    Create via: Supabase Dashboard → Storage → New bucket
--    Name: project-images
--    Public: YES (so image URLs work without auth)
--
--    Or run:
insert into storage.buckets (id, name, public)
values ('project-images', 'project-images', true)
on conflict (id) do nothing;
