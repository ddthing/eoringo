create table public.push_notification_delivery_attempts (
  subscription_id uuid not null
    references public.push_notification_subscriptions(id) on delete cascade,
  delivery_key text not null
    check (char_length(btrim(delivery_key)) between 1 and 128),
  claim_token uuid not null,
  state text not null default 'claimed'
    check (state in ('claimed', 'sent')),
  claimed_at timestamptz not null default now(),
  sent_at timestamptz,
  last_error text
    check (last_error is null or char_length(last_error) between 1 and 512),
  primary key (subscription_id, delivery_key)
);

create index push_notification_delivery_attempts_claim_idx
  on public.push_notification_delivery_attempts (state, claimed_at);

alter table public.push_notification_delivery_attempts enable row level security;
alter table public.push_notification_delivery_attempts force row level security;

revoke all on table public.push_notification_delivery_attempts from public, anon, authenticated;
grant select, insert, update, delete on table public.push_notification_delivery_attempts to service_role;

create or replace function public.claim_push_notification_delivery(
  p_subscription_id uuid,
  p_delivery_key text,
  p_claim_token uuid,
  p_lease_seconds integer default 300
)
returns table (claimed boolean)
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if p_subscription_id is null
    or p_claim_token is null
    or char_length(btrim(coalesce(p_delivery_key, ''))) not between 1 and 128
    or p_lease_seconds not between 60 and 3600 then
    raise exception 'invalid delivery claim';
  end if;

  return query
  insert into public.push_notification_delivery_attempts as attempt (
    subscription_id,
    delivery_key,
    claim_token,
    state,
    claimed_at,
    sent_at,
    last_error
  )
  select
    subscription.id,
    p_delivery_key,
    p_claim_token,
    'claimed',
    pg_catalog.now(),
    null,
    null
  from public.push_notification_subscriptions as subscription
  where subscription.id = p_subscription_id
    and subscription.notification_enabled
  on conflict (subscription_id, delivery_key) do update
    set claim_token = excluded.claim_token,
        state = 'claimed',
        claimed_at = pg_catalog.now(),
        sent_at = null,
        last_error = null
    where attempt.state <> 'sent'
      and attempt.claimed_at < pg_catalog.now() - pg_catalog.make_interval(secs => p_lease_seconds)
  returning true;
end;
$$;

create or replace function public.complete_push_notification_delivery(
  p_subscription_id uuid,
  p_delivery_key text,
  p_claim_token uuid
)
returns table (completed boolean)
language sql
security invoker
set search_path = ''
as $$
  with completed_attempt as (
    update public.push_notification_delivery_attempts
    set state = 'sent',
        sent_at = pg_catalog.now(),
        claim_token = p_claim_token,
        last_error = null
    where subscription_id = p_subscription_id
      and delivery_key = p_delivery_key
      and claim_token = p_claim_token
      and state = 'claimed'
    returning subscription_id, delivery_key
  ), updated_subscription as (
    update public.push_notification_subscriptions as subscription
    set last_delivery_key = completed_attempt.delivery_key,
        last_error = null
    from completed_attempt
    where subscription.id = completed_attempt.subscription_id
    returning subscription.id
  )
  select true
  from updated_subscription;
$$;

create or replace function public.record_failed_push_notification_delivery(
  p_subscription_id uuid,
  p_delivery_key text,
  p_claim_token uuid,
  p_error text
)
returns table (recorded boolean)
language sql
security invoker
set search_path = ''
as $$
  with failed_attempt as (
    update public.push_notification_delivery_attempts
    set last_error = left(nullif(btrim(p_error), ''), 512),
        claimed_at = pg_catalog.now()
    where subscription_id = p_subscription_id
      and delivery_key = p_delivery_key
      and claim_token = p_claim_token
      and state = 'claimed'
    returning subscription_id
  ), updated_subscription as (
    update public.push_notification_subscriptions as subscription
    set last_error = left(nullif(btrim(p_error), ''), 512)
    from failed_attempt
    where subscription.id = failed_attempt.subscription_id
    returning subscription.id
  )
  select true
  from updated_subscription;
$$;

revoke all on function public.claim_push_notification_delivery(uuid, text, uuid, integer)
  from public, anon, authenticated;
revoke all on function public.complete_push_notification_delivery(uuid, text, uuid)
  from public, anon, authenticated;
revoke all on function public.record_failed_push_notification_delivery(uuid, text, uuid, text)
  from public, anon, authenticated;

grant execute on function public.claim_push_notification_delivery(uuid, text, uuid, integer)
  to service_role;
grant execute on function public.complete_push_notification_delivery(uuid, text, uuid)
  to service_role;
grant execute on function public.record_failed_push_notification_delivery(uuid, text, uuid, text)
  to service_role;
