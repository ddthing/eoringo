-- Keep anonymous Auth identities bounded without exposing activity data to browser roles.
create table public.guest_account_activity (
  user_id uuid primary key references auth.users(id) on delete cascade,
  last_seen_at timestamptz not null default pg_catalog.now(),
  updated_at timestamptz not null default pg_catalog.now()
);

create index guest_account_activity_last_seen_idx
  on public.guest_account_activity (last_seen_at, user_id);

alter table public.guest_account_activity enable row level security;
alter table public.guest_account_activity force row level security;

revoke all on table public.guest_account_activity from public, anon, authenticated;
grant select, insert, update, delete
  on table public.guest_account_activity
  to service_role;

-- The browser can only touch the currently authenticated anonymous identity.
create function public.touch_guest_account_activity(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_user_id is null or p_user_id is distinct from (select auth.uid()) then
    raise exception 'guest activity identity mismatch' using errcode = '42501';
  end if;

  if not exists (
    select 1
    from auth.users
    where id = p_user_id
      and is_anonymous is true
  ) then
    raise exception 'anonymous account required' using errcode = '42501';
  end if;

  insert into public.guest_account_activity (user_id, last_seen_at, updated_at)
  values (p_user_id, pg_catalog.now(), pg_catalog.now())
  on conflict (user_id) do update
  set last_seen_at = excluded.last_seen_at,
      updated_at = excluded.updated_at;
end;
$$;

revoke all on function public.touch_guest_account_activity(uuid)
  from public, anon;
grant execute on function public.touch_guest_account_activity(uuid)
  to authenticated;

-- Called only by the existing cron-authenticated scheduler. The limit keeps one
-- invocation bounded and lets later runs drain a large backlog safely.
create function public.cleanup_expired_anonymous_accounts()
returns table (user_id uuid)
language plpgsql
security definer
set search_path = ''
as $$
declare
  expired_user_id uuid;
  deleted_user_id uuid;
begin
  for expired_user_id in
    select auth_user.id
    from auth.users as auth_user
    left join public.guest_account_activity as activity
      on activity.user_id = auth_user.id
    where auth_user.is_anonymous is true
      and coalesce(activity.last_seen_at, auth_user.created_at)
        < pg_catalog.now() - pg_catalog.make_interval(days => 30)
    order by coalesce(activity.last_seen_at, auth_user.created_at), auth_user.id
    limit 100
  loop
    delete from auth.users
    where id = expired_user_id
    returning id into deleted_user_id;

    if deleted_user_id is not null then
      user_id := deleted_user_id;
      return next;
    end if;
  end loop;
end;
$$;

revoke all on function public.cleanup_expired_anonymous_accounts()
  from public, anon, authenticated;
grant execute on function public.cleanup_expired_anonymous_accounts()
  to service_role;
