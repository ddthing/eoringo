create table public.push_notification_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null
    check (char_length(endpoint) between 20 and 2048)
    check (endpoint ~ '^https://[^[:space:]]+$'),
  p256dh text not null
    check (p256dh ~ '^[A-Za-z0-9_-]{20,255}$'),
  auth text not null
    check (auth ~ '^[A-Za-z0-9_-]{8,255}$'),
  timezone text not null default 'Asia/Seoul'
    check (char_length(btrim(timezone)) between 1 and 64)
    check (timezone ~ '^[A-Za-z0-9_./+~-]+$'),
  notification_time time without time zone not null default time '21:00',
  notification_enabled boolean not null default true,
  task_summary jsonb not null default '{"summaryDate":null,"characters":[]}'::jsonb
    check (jsonb_typeof(task_summary) = 'object')
    check (octet_length(task_summary::text) <= 65536),
  last_delivery_key text
    check (last_delivery_key is null or char_length(last_delivery_key) between 1 and 128),
  last_error text
    check (last_error is null or char_length(last_error) between 1 and 512),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (endpoint)
);

create index push_notification_subscriptions_user_idx
  on public.push_notification_subscriptions (user_id);
create index push_notification_subscriptions_due_idx
  on public.push_notification_subscriptions (notification_enabled, notification_time)
  where notification_enabled;

create trigger push_notification_subscriptions_set_updated_at
before update on public.push_notification_subscriptions
for each row execute function private.set_updated_at();

alter table public.push_notification_subscriptions enable row level security;
alter table public.push_notification_subscriptions force row level security;

revoke all on table public.push_notification_subscriptions from public, anon, authenticated;
grant select, insert, update, delete on table public.push_notification_subscriptions to service_role;
