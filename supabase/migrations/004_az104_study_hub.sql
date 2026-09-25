-- v7.1 — Study Hub (Sprint 4, PLAN-3). Cole no SQL Editor do Supabase e rode.
-- Tópicos curados (Microsoft Learn PT-BR) + perfil de estudo por usuário.
-- Seed inicial: data/study-topics.json (espelho versionado; CI mensal valida URLs).
-- ⚠️ Idempotente: pode rodar de novo sem duplicar (ON CONFLICT DO NOTHING no seed).

-- -------------------------------------------------------------------------
-- 1. az104_study_topics — curadoria de links por família de assunto.
--    match: prefixos de subdomain do banco cobertos pelo tópico (jsonb).
--    Leitura: qualquer autenticado. Escrita: só admin (aba Admin, Sprint 4).
-- -------------------------------------------------------------------------
create table if not exists public.az104_study_topics (
  id uuid not null primary key default gen_random_uuid(),
  domain text not null,
  topic text not null,
  label text not null,
  url text not null,
  source text not null default 'mslearn',
  match jsonb not null default '[]'::jsonb,
  order_idx int not null default 0,
  is_active boolean not null default true,
  last_checked timestamptz,
  last_status int,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (domain, topic)
);

create index if not exists az104_study_topics_domain_idx
  on public.az104_study_topics (domain);

alter table public.az104_study_topics enable row level security;

drop policy if exists "topics read auth" on public.az104_study_topics;
create policy "topics read auth" on public.az104_study_topics
  for select using (auth.role() = 'authenticated');

drop policy if exists "topics admin write" on public.az104_study_topics;
create policy "topics admin write" on public.az104_study_topics
  for all using (public.az104_is_admin())
  with check (public.az104_is_admin());

-- -------------------------------------------------------------------------
-- 2. az104_study_profile — plano de estudo persistido por usuário.
--    weak_domains: [{domain, pct, updated_at}]
--    study_links: [{topic_id, url, label, priority, seen_at}]
--    drill_history: [{date, questions, score}]
--    preferences: {auto_drill, notify}
-- -------------------------------------------------------------------------
create table if not exists public.az104_study_profile (
  user_id uuid not null primary key references auth.users (id) on delete cascade,
  weak_domains jsonb not null default '[]'::jsonb,
  study_links jsonb not null default '[]'::jsonb,
  drill_history jsonb not null default '[]'::jsonb,
  preferences jsonb not null default '{}'::jsonb,
  updated_at bigint not null default 0
);

alter table public.az104_study_profile enable row level security;

drop policy if exists "study_profile own" on public.az104_study_profile;
create policy "study_profile own" on public.az104_study_profile
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- -------------------------------------------------------------------------
-- Notas de manutencao
--  - Seed manual inicial (owner, SQL Editor): INSERT ... SELECT a partir de
--    data/study-topics.json (um INSERT por tópico, ON CONFLICT (domain, topic)
--    DO UPDATE SET url/label/match — preserva last_checked/status).
--  - CI mensal study-links.yml valida cada url (HEAD + redirect) e abre PR
--    atualizando data/study-topics.json; re-seed manual após merge.
--  - App sem env / modo local: IDB espelha tudo (topics seedados do JSON no
--    primeiro load); Supabase é espelho, como o resto da plataforma.
-- -------------------------------------------------------------------------
