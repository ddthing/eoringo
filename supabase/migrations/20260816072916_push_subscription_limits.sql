create table private.push_notification_subscription_quotas (
  user_id uuid primary key references auth.users(id) on delete cascade,
  subscription_count integer not null default 0
    check (subscription_count >= 0),
  updated_at timestamptz not null default pg_catalog.now()
);

create table private.push_notification_rate_limits (
  user_id uuid primary key references auth.users(id) on delete cascade,
  window_started_at timestamptz not null,
  request_count integer not null default 0
    check (request_count between 0 and 30),
  updated_at timestamptz not null default pg_catalog.now()
);

insert into private.push_notification_subscription_quotas (user_id, subscription_count)
select user_id, count(*)::integer
from public.push_notification_subscriptions
group by user_id
on conflict (user_id) do update
set subscription_count = excluded.subscription_count,
    updated_at = pg_catalog.now();

alter table private.push_notification_subscription_quotas enable row level security;
alter table private.push_notification_subscription_quotas force row level security;
alter table private.push_notification_rate_limits enable row level security;
alter table private.push_notification_rate_limits force row level security;

revoke all on table private.push_notification_subscription_quotas
  from public, anon, authenticated;
revoke all on table private.push_notification_rate_limits
  from public, anon, authenticated;

grant select, insert, update, delete
  on table private.push_notification_subscription_quotas
  to service_role;
grant select, insert, update, delete
  on table private.push_notification_rate_limits
  to service_role;

create or replace function public.upsert_push_notification_subscription(
  p_user_id uuid,
  p_endpoint text,
  p_p256dh text,
  p_auth text,
  p_timezone text,
  p_notification_time time without time zone,
  p_task_summary jsonb
)
returns table (stored boolean, quota_exceeded boolean, endpoint_conflict boolean)
language plpgsql
security invoker
set search_path = ''
as $$
declare
  current_count integer;
  existing_user_id uuid;
  inserted_id uuid;
begin
  if p_user_id is null or p_endpoint is null then
    raise exception 'invalid push subscription';
  end if;

  insert into private.push_notification_subscription_quotas (user_id, subscription_count)
  values (p_user_id, 0)
  on conflict (user_id) do nothing;

  select subscription_count
  into current_count
  from private.push_notification_subscription_quotas
  where user_id = p_user_id
  for update;

  select subscription.user_id
  into existing_user_id
  from public.push_notification_subscriptions as subscription
  where subscription.endpoint = p_endpoint
  for update;

  if existing_user_id is not null then
    if existing_user_id <> p_user_id then
      return query select false, false, true;
      return;
    end if;

    update public.push_notification_subscriptions
    set p256dh = p_p256dh,
        auth = p_auth,
        timezone = p_timezone,
        notification_time = p_notification_time,
        notification_enabled = true,
        task_summary = p_task_summary,
        last_error = null
    where user_id = p_user_id
      and endpoint = p_endpoint;

    return query select true, false, false;
    return;
  end if;

  select count(*)::integer
  into current_count
  from public.push_notification_subscriptions
  where user_id = p_user_id;

  update private.push_notification_subscription_quotas
  set subscription_count = current_count,
      updated_at = pg_catalog.now()
  where user_id = p_user_id;

  if current_count >= 5 then
    return query select false, true, false;
    return;
  end if;

  insert into public.push_notification_subscriptions (
    user_id,
    endpoint,
    p256dh,
    auth,
    timezone,
    notification_time,
    notification_enabled,
    task_summary,
    last_error
  ) values (
    p_user_id,
    p_endpoint,
    p_p256dh,
    p_auth,
    p_timezone,
    p_notification_time,
    true,
    p_task_summary,
    null
  )
  on conflict (endpoint) do nothing
  returning id into inserted_id;

  if inserted_id is null then
    return query select false, false, true;
    return;
  end if;

  update private.push_notification_subscription_quotas
  set subscription_count = current_count + 1,
      updated_at = pg_catalog.now()
  where user_id = p_user_id;

  return query select true, false, false;
end;
$$;

create or replace function public.delete_push_notification_subscription(
  p_user_id uuid,
  p_endpoint text
)
returns table (deleted boolean)
language plpgsql
security invoker
set search_path = ''
as $$
declare
  deleted_id uuid;
begin
  if p_user_id is null or p_endpoint is null then
    raise exception 'invalid push subscription';
  end if;

  insert into private.push_notification_subscription_quotas (user_id, subscription_count)
  values (p_user_id, 0)
  on conflict (user_id) do nothing;

  perform 1
  from private.push_notification_subscription_quotas
  where user_id = p_user_id
  for update;

  delete from public.push_notification_subscriptions
  where user_id = p_user_id
    and endpoint = p_endpoint
  returning id into deleted_id;

  if deleted_id is null then
    return query select false;
    return;
  end if;

  update private.push_notification_subscription_quotas
  set subscription_count = greatest(subscription_count - 1, 0),
      updated_at = pg_catalog.now()
  where user_id = p_user_id;

  return query select true;
end;
$$;

create or replace function public.consume_push_subscription_rate_limit(
  p_user_id uuid
)
returns table (allowed boolean, retry_after_seconds integer)
language plpgsql
security invoker
set search_path = ''
as $$
declare
  current_started_at timestamptz;
  current_count integer;
  current_time timestamptz := pg_catalog.clock_timestamp();
  retry_after integer;
begin
  if p_user_id is null then
    raise exception 'invalid rate limit user';
  end if;

  insert into private.push_notification_rate_limits (
    user_id,
    window_started_at,
    request_count
  ) values (
    p_user_id,
    current_time,
    0
  )
  on conflict (user_id) do nothing;

  select window_started_at, request_count
  into current_started_at, current_count
  from private.push_notification_rate_limits
  where user_id = p_user_id
  for update;

  if current_started_at <= current_time - pg_catalog.make_interval(secs => 600) then
    update private.push_notification_rate_limits
    set window_started_at = current_time,
        request_count = 1,
        updated_at = pg_catalog.now()
    where user_id = p_user_id;

    return query select true, 0;
    return;
  end if;

  if current_count < 30 then
    update private.push_notification_rate_limits
    set request_count = current_count + 1,
        updated_at = pg_catalog.now()
    where user_id = p_user_id;

    return query select true, 0;
    return;
  end if;

  retry_after := greatest(
    1,
    least(
      600,
      ceil(extract(epoch from (
        current_started_at + pg_catalog.make_interval(secs => 600) - current_time
      )))::integer
    )
  );

  return query select false, retry_after;
end;
$$;

revoke all on function public.upsert_push_notification_subscription(
  uuid, text, text, text, text, time without time zone, jsonb
) from public, anon, authenticated;
revoke all on function public.delete_push_notification_subscription(uuid, text)
  from public, anon, authenticated;
revoke all on function public.consume_push_subscription_rate_limit(uuid)
  from public, anon, authenticated;

grant execute on function public.upsert_push_notification_subscription(
  uuid, text, text, text, text, time without time zone, jsonb
) to service_role;
grant execute on function public.delete_push_notification_subscription(uuid, text)
  to service_role;
grant execute on function public.consume_push_subscription_rate_limit(uuid)
  to service_role;
