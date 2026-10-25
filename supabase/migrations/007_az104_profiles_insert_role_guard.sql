-- v7.0.2 — segurança: role escalation guard + topics inativos só para admin
-- + attempts/doubts: admin não pode deletar linhas de outros usuários.
-- Aplicar no SQL Editor do Supabase após 006. Idempotente.

-- 1. az104_profiles: INSERT só com role='user' (bloqueia role escalation).
drop policy if exists "profiles self insert" on public.az104_profiles;
create policy "profiles self insert" on public.az104_profiles
  for insert with check (auth.uid() = user_id and role = 'user');

-- 2. az104_study_topics: inativos só para admin.
drop policy if exists "topics read auth" on public.az104_study_topics;
create policy "topics read auth" on public.az104_study_topics
  for select using (is_active = true or public.az104_is_admin());

-- 3. az104_attempts: separar SELECT (own+admin) de mutações (só dono).
drop policy if exists "attempts own or admin" on public.az104_attempts;
create policy "attempts select own or admin" on public.az104_attempts
  for select using (auth.uid() = user_id or public.az104_is_admin());
create policy "attempts insert own" on public.az104_attempts
  for insert with check (auth.uid() = user_id);
create policy "attempts update own" on public.az104_attempts
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "attempts delete own" on public.az104_attempts
  for delete using (auth.uid() = user_id);

-- 4. az104_doubts: mesma separação.
drop policy if exists "doubts own or admin" on public.az104_doubts;
create policy "doubts select own or admin" on public.az104_doubts
  for select using (auth.uid() = user_id or public.az104_is_admin());
create policy "doubts insert own" on public.az104_doubts
  for insert with check (auth.uid() = user_id);
create policy "doubts update own" on public.az104_doubts
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "doubts delete own" on public.az104_doubts
  for delete using (auth.uid() = user_id);
