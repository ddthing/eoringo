alter table public.push_notification_subscriptions
  drop constraint if exists push_notification_subscriptions_p256dh_check,
  drop constraint if exists push_notification_subscriptions_auth_check;

alter table public.push_notification_subscriptions
  add constraint push_notification_subscriptions_p256dh_check
    check (p256dh ~ '^[A-Za-z0-9_-]{20,255}$'),
  add constraint push_notification_subscriptions_auth_check
    check (auth ~ '^[A-Za-z0-9_-]{8,255}$');
