-- v7.0.1 — delta de producao para re-login de usuario comum via upsert.
-- Aplica o mesmo policy que 002 adiciona para ambientes novos. Idempotente.
-- Contexto: upsertOwnProfile (SyncEngine) usa ON CONFLICT DO UPDATE; o UPDATE
-- exigia policy de admin, o que gerava 403 silencioso no re-login do usuario.
drop policy if exists "profiles self update email" on public.az104_profiles;
create policy "profiles self update email" on public.az104_profiles
  for update using (auth.uid() = user_id)
  with check (auth.uid() = user_id and role = 'user');