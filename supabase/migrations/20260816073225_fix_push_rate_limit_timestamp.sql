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
  window_now timestamptz := pg_catalog.clock_timestamp();
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
    window_now,
    0
  )
  on conflict (user_id) do nothing;

  select window_started_at, request_count
  into current_started_at, current_count
  from private.push_notification_rate_limits
  where user_id = p_user_id
  for update;

  if current_started_at <= window_now - pg_catalog.make_interval(secs => 600) then
    update private.push_notification_rate_limits
    set window_started_at = window_now,
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
        current_started_at + pg_catalog.make_interval(secs => 600) - window_now
      )))::integer
    )
  );

  return query select false, retry_after;
end;
$$;

revoke all on function public.consume_push_subscription_rate_limit(uuid)
  from public, anon, authenticated;
grant execute on function public.consume_push_subscription_rate_limit(uuid)
  to service_role;
