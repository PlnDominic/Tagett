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
  updated_at      timestamptz default now()
);

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

-- 5. Storage bucket for project images
--    Create via: Supabase Dashboard → Storage → New bucket
--    Name: project-images
--    Public: YES (so image URLs work without auth)
--
--    Or run:
insert into storage.buckets (id, name, public)
values ('project-images', 'project-images', true)
on conflict (id) do nothing;
