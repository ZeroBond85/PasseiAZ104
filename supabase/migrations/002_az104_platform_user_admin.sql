-- v7.0 — PasseiSimuladosTI (filho: az104). Cole no SQL Editor do Supabase e rode.
-- Multi-filho: petições de leitura que todo filho usa (progress/sessions) vêm do 001.
-- 002 adiciona o núcleo de PLATAFORMA: históricos, dúvidas, perfis (admin), atividade e
-- recomendações por usuário.
-- ⚠️ VALIDAR no SQL Editor antes de habilitar o front: rode e teste com 2 usuários.
--    Só depois mire o P2/P5 do front (padrão documentado em docs/ARCHITECTURE.md ADR).
-- Nomenclatura: prefixo az104_ + RLS "own rows" + admin via is_admin().

-- -------------------------------------------------------------------------
-- 1. az104_profiles — papel por usuário. Seed do dono: UPDATE manual depois.
--    ORDEM OBRIGATÓRIA: tabela antes da função (FUNCTION é "language sql" e o
--    CREATE valida referências na hora; com função antes ⇒ erro 42P01).
-- -------------------------------------------------------------------------
create table if not exists public.az104_profiles (
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null default 'user' check (role in ('user', 'admin')),
  email text not null default '',
  created_at timestamptz not null default now(),
  primary key (user_id)
);

alter table public.az104_profiles enable row level security;

-- -------------------------------------------------------------------------
-- 0. Helper de admin (SECURITY DEFINER: roda como owner, sem recursão de RLS).
--    is_admin() é usado nas policies "own + admin". NUNCA como guard de UI.
-- -------------------------------------------------------------------------
create or replace function public.az104_is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.az104_profiles
    where user_id = auth.uid() and role = 'admin'
  );
$$;

drop policy if exists "profiles own or admin" on public.az104_profiles;
create policy "profiles own or admin" on public.az104_profiles
  for select using (auth.uid() = user_id or public.az104_is_admin());

drop policy if exists "profiles self insert" on public.az104_profiles;
create policy "profiles self insert" on public.az104_profiles
  for insert with check (auth.uid() = user_id);

-- Só admin promove; usuario nao altera o próprio role.
drop policy if exists "profiles admin update" on public.az104_profiles;
create policy "profiles admin update" on public.az104_profiles
  for update using (public.az104_is_admin()) with check (public.az104_is_admin());

-- -------------------------------------------------------------------------
-- 2. az104_attempts — histórico de simulados finalizados (append-only).
--    answers: [{questionId, correct, given, expected}]
--    byDomain: {dominio: {total, correct}}
--    errorTags: {questionId: 'concept_gap|silly_mistake|misread|trap|timeout'}
--    Em combinação com progress/sessions cada viagem offline é reconstituível.
-- -------------------------------------------------------------------------
create table if not exists public.az104_attempts (
  id uuid not null primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  kind text not null default 'simulado' check (kind in ('simulado', 'seed')),
  simulado_id text,
  started_at bigint not null default 0,
  finished_at bigint not null default 0,
  duration_seconds int not null default 0,
  questions int not null default 0,
  score int not null default 0,
  passed boolean not null default false,
  answers jsonb not null default '[]'::jsonb,
  by_domain jsonb not null default '{}'::jsonb,
  error_tags jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists az104_attempts_user_finished_idx
  on public.az104_attempts (user_id, finished_at desc);

alter table public.az104_attempts enable row level security;

drop policy if exists "attempts own or admin" on public.az104_attempts;
create policy "attempts own or admin" on public.az104_attempts
  for all using (auth.uid() = user_id or public.az104_is_admin())
  with check (auth.uid() = user_id);

-- -------------------------------------------------------------------------
-- 3. az104_doubts — duvida persistente por questao (nota) + status.
--    (Conceito distinto da flag efemera de sessão, que vive so no TipoSession.)
-- -------------------------------------------------------------------------
create table if not exists public.az104_doubts (
  id uuid not null primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  question_id text not null,
  note text not null default '',
  tag text,
  resolved boolean not null default false,
  created_at bigint not null default 0,
  updated_at bigint not null default 0,
  resolved_at bigint,
  unique (user_id, question_id)
);

create index if not exists az104_doubts_user_updated_idx
  on public.az104_doubts (user_id, updated_at desc);

alter table public.az104_doubts enable row level security;

drop policy if exists "doubts own or admin" on public.az104_doubts;
create policy "doubts own or admin" on public.az104_doubts
  for all using (auth.uid() = user_id or public.az104_is_admin())
  with check (auth.uid() = user_id);

-- -------------------------------------------------------------------------
-- 4. az104_activity_log — dia ativo para streak (cobre sessao parcial, que
--    nao grava progress). kind: simulado | questions_10 | resolved_doubt |
--    leitner_session | answered_1  (ephemeral helpers apenas marcam dia).
-- -------------------------------------------------------------------------
create table if not exists public.az104_activity_log (
  user_id uuid not null references auth.users (id) on delete cascade,
  activity_date date not null,
  kind text not null default 'answered_1',
  created_at bigint not null default 0,
  primary key (user_id, activity_date, kind)
);

alter table public.az104_activity_log enable row level security;

drop policy if exists "activity own" on public.az104_activity_log;
create policy "activity own" on public.az104_activity_log
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- -------------------------------------------------------------------------
-- 5. az104_study_suggestions — snapshot da análise diária (o RECOMENDADO no
--    dia X). Histórico p/ medir "segui o plano? melhorou?".
-- -------------------------------------------------------------------------
create table if not exists public.az104_study_suggestions (
  id uuid not null primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  generated_at bigint not null default 0,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists az104_study_suggestions_user_gen_idx
  on public.az104_study_suggestions (user_id, generated_at desc);

alter table public.az104_study_suggestions enable row level security;

drop policy if exists "suggestions own" on public.az104_study_suggestions;
create policy "suggestions own" on public.az104_study_suggestions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- -------------------------------------------------------------------------
-- 6. az104_admin_logs — auditoria de acoes administrativas.
--    Sem UI própria em v7.0: consultar via SQL Editor (owner) / exports.
-- -------------------------------------------------------------------------
create table if not exists public.az104_admin_logs (
  id uuid not null primary key default gen_random_uuid(),
  actor_id uuid not null references auth.users (id) on delete cascade,
  action text not null,
  target_type text not null default '',
  target_id text not null default '',
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists az104_admin_logs_actor_created_idx
  on public.az104_admin_logs (actor_id, created_at desc);

alter table public.az104_admin_logs enable row level security;

drop policy if exists "admin_logs admin only" on public.az104_admin_logs;
create policy "admin_logs admin only" on public.az104_admin_logs
  for all using (public.az104_is_admin()) with check (public.az104_is_admin());

-- -------------------------------------------------------------------------
-- Notas de manutencao
--  - Owner do banco nunca sofre RLS; o app usa anon key + RLS como primeiro
--    filtro de leitura por usuario. O postgres password NAO e revelado.
--  - Para promover o dono: update az104_profiles set role='admin'
--    where user_id = '<seu uid>';  (via SQL Editor, autenticado como owner)
--  - Estrategia de sync (client): append-only para attempts (imutavel),
--    upsert para doubts/profiles/activity/suggestions (latest timestamp wins).
-- -------------------------------------------------------------------------