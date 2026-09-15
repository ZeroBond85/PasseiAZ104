-- L1 — PasseiSimuladosTI (filho: az104). Cole no SQL Editor do Supabase e rode.
-- Prefixo az104_: novos filhos copiam o padrão (ex.: dp900_).

create table if not exists public.az104_progress (
  user_id uuid not null references auth.users (id) on delete cascade,
  question_id text not null,
  box int not null default 0 check (box >= 0 and box <= 4),
  due_at bigint not null default 0,
  usage_count int not null default 0,
  last_seen_at bigint not null default 0,
  updated_at bigint not null default 0,
  primary key (user_id, question_id)
);

create table if not exists public.az104_sessions (
  user_id uuid not null references auth.users (id) on delete cascade,
  simulado_id text not null,
  state_json jsonb not null default '{}'::jsonb,
  updated_at bigint not null default 0,
  primary key (user_id, simulado_id)
);

create index if not exists az104_progress_updated_idx on public.az104_progress (user_id, updated_at desc);
create index if not exists az104_sessions_updated_idx on public.az104_sessions (user_id, updated_at desc);

alter table public.az104_progress enable row level security;
alter table public.az104_sessions enable row level security;

drop policy if exists "own rows" on public.az104_progress;
create policy "own rows" on public.az104_progress
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own rows" on public.az104_sessions;
create policy "own rows" on public.az104_sessions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
