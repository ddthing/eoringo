-- Keep the browser-facing touch path invoker-secured. RLS, not definer
-- privileges, authorizes the current anonymous identity.
create policy guest_activity_select_own
on public.guest_account_activity
for select
to authenticated
using (
  (select auth.uid()) = user_id
  and ((select auth.jwt()) ->> 'is_anonymous')::boolean is true
);

create policy guest_activity_insert_own
on public.guest_account_activity
for insert
to authenticated
with check (
  (select auth.uid()) = user_id
  and ((select auth.jwt()) ->> 'is_anonymous')::boolean is true
);

create policy guest_activity_update_own
on public.guest_account_activity
for update
to authenticated
using (
  (select auth.uid()) = user_id
  and ((select auth.jwt()) ->> 'is_anonymous')::boolean is true
)
with check (
  (select auth.uid()) = user_id
  and ((select auth.jwt()) ->> 'is_anonymous')::boolean is true
);

grant select on table public.guest_account_activity to authenticated;
grant insert (user_id) on table public.guest_account_activity to authenticated;
grant update (last_seen_at, updated_at)
  on table public.guest_account_activity
  to authenticated;

create or replace function private.set_guest_account_activity_timestamps()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.last_seen_at = pg_catalog.now();
  new.updated_at = pg_catalog.now();
  return new;
end;
$$;

create trigger guest_account_activity_set_timestamps
before insert or update on public.guest_account_activity
for each row execute function private.set_guest_account_activity_timestamps();

create or replace function public.touch_guest_account_activity(p_user_id uuid)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if p_user_id is null or p_user_id is distinct from (select auth.uid()) then
    raise exception 'guest activity identity mismatch' using errcode = '42501';
  end if;

  if ((select auth.jwt()) ->> 'is_anonymous')::boolean is not true then
    raise exception 'anonymous account required' using errcode = '42501';
  end if;

  insert into public.guest_account_activity (user_id)
  values (p_user_id)
  on conflict (user_id) do update
  set last_seen_at = pg_catalog.now(),
      updated_at = pg_catalog.now();
end;
$$;

revoke all on function public.touch_guest_account_activity(uuid)
  from public, anon;
grant execute on function public.touch_guest_account_activity(uuid)
  to authenticated;
