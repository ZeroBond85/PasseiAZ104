-- v7.0 — PasseiSimuladosTI (filho: az104). Auditoria admin à prova de forja.
-- Trigger AFTER UPDATE OF role grava o log atomicamente (auth.uid() = ator).
-- RLS de az104_admin_logs: só SELECT + INSERT (sem UPDATE/DELETE).
-- Trava: não rebaixa a si mesmo nem o último admin.

create or replace function public.az104_log_role_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.role is distinct from new.role then
    if new.user_id = auth.uid() and new.role = 'user' and old.role = 'admin' then
      raise exception 'self_demotion_not_allowed';
    end if;
    if new.role = 'user' and old.role = 'admin' then
      if (select count(*) from public.az104_profiles where role = 'admin') <= 1 then
        raise exception 'last_admin_demotion_not_allowed';
      end if;
    end if;
    insert into public.az104_admin_logs (actor_id, action, target_type, target_id, meta)
    values (
      auth.uid(),
      'role.change',
      'profile',
      new.user_id::text,
      jsonb_build_object('role', new.role, 'previous', old.role)
    );
  end if;
  return new;
end;
$$;

drop trigger if exists az104_profiles_role_audit on public.az104_profiles;
create trigger az104_profiles_role_audit
  after update of role on public.az104_profiles
  for each row
  execute function public.az104_log_role_change();

-- RLS: admin_logs só SELECT + INSERT (sem UPDATE/DELETE).
drop policy if exists "admin_logs admin only" on public.az104_admin_logs;
create policy "admin_logs admin select" on public.az104_admin_logs
  for select using (public.az104_is_admin());
create policy "admin_logs admin insert" on public.az104_admin_logs
  for insert with check (public.az104_is_admin());
