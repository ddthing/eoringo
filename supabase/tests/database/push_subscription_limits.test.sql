begin;

create extension if not exists pgtap with schema extensions;
select plan(23);

select ok(
  to_regclass('private.push_notification_subscription_quotas') is not null,
  'push subscription quota state is kept in the private schema'
);

select ok(
  (select relrowsecurity and relforcerowsecurity
   from pg_class
   where oid = 'private.push_notification_subscription_quotas'::regclass),
  'push subscription quota state is protected by forced RLS'
);

select ok(
  has_table_privilege(
    'service_role',
    'private.push_notification_subscription_quotas',
    'SELECT, INSERT, UPDATE, DELETE'
  ),
  'service role can maintain private push quota state'
);

select ok(
  not has_table_privilege(
    'authenticated',
    'private.push_notification_subscription_quotas',
    'SELECT'
  ),
  'authenticated clients cannot read private push quota state'
);

select ok(
  has_function_privilege(
    'service_role',
    'public.upsert_push_notification_subscription(uuid,text,text,text,text,time without time zone,jsonb)',
    'EXECUTE'
  ),
  'service role can atomically register push subscriptions'
);

select ok(
  has_function_privilege(
    'service_role',
    'public.delete_push_notification_subscription(uuid,text)',
    'EXECUTE'
  ),
  'service role can atomically delete push subscriptions'
);

select ok(
  has_function_privilege(
    'service_role',
    'public.consume_push_subscription_rate_limit(uuid)',
    'EXECUTE'
  ),
  'service role can consume the push subscription rate limit'
);

select ok(
  not has_function_privilege(
    'authenticated',
    'public.consume_push_subscription_rate_limit(uuid)',
    'EXECUTE'
  ),
  'authenticated clients cannot consume the private rate limit directly'
);

insert into auth.users (id, instance_id, aud, role, email, is_anonymous, created_at, updated_at)
values
  (
    '00000000-0000-4000-8000-000000000051',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'push-limit-one@example.test',
    false,
    now(),
    now()
  ),
  (
    '00000000-0000-4000-8000-000000000052',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'push-limit-two@example.test',
    false,
    now(),
    now()
  ),
  (
    '00000000-0000-4000-8000-000000000053',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'push-limit-three@example.test',
    false,
    now(),
    now()
  );

set local role service_role;

select is(
  coalesce((select stored
    from public.upsert_push_notification_subscription(
      '00000000-0000-4000-8000-000000000051'::uuid,
      'https://push.example.test/send/limit-31',
      'AabcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_-',
      'auth-value_31',
      'Asia/Seoul',
      time '21:00',
      '{"summaryDate":"2026-08-16","characters":[]}'::jsonb
    )), false),
  true,
  'first subscription is stored'
);

select is(
  coalesce((select quota_exceeded
    from public.upsert_push_notification_subscription(
      '00000000-0000-4000-8000-000000000051'::uuid,
      'https://push.example.test/send/limit-31',
      'AabcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_-',
      'auth-value_31',
      'Asia/Seoul',
      time '22:00',
      '{"summaryDate":"2026-08-16","characters":[]}'::jsonb
    )), true),
  false,
  'updating the same endpoint does not consume another quota slot'
);

select is(
  coalesce((select endpoint_conflict
    from public.upsert_push_notification_subscription(
      '00000000-0000-4000-8000-000000000052'::uuid,
      'https://push.example.test/send/limit-31',
      'AabcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_-',
      'auth-value_52',
      'Asia/Seoul',
      time '21:00',
      '{"summaryDate":"2026-08-16","characters":[]}'::jsonb
    )), false),
  true,
  'another account cannot claim an existing endpoint'
);

select lives_ok(
  $$select * from public.upsert_push_notification_subscription(
    '00000000-0000-4000-8000-000000000051'::uuid,
    'https://push.example.test/send/limit-32',
    'AabcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_-',
    'auth-value_32',
    'Asia/Seoul',
    time '21:00',
    '{"summaryDate":"2026-08-16","characters":[]}'::jsonb
  )$$,
  'second subscription is stored'
);

select lives_ok(
  $$select * from public.upsert_push_notification_subscription(
    '00000000-0000-4000-8000-000000000051'::uuid,
    'https://push.example.test/send/limit-33',
    'AabcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_-',
    'auth-value_33',
    'Asia/Seoul',
    time '21:00',
    '{"summaryDate":"2026-08-16","characters":[]}'::jsonb
  )$$,
  'third subscription is stored'
);

select lives_ok(
  $$select * from public.upsert_push_notification_subscription(
    '00000000-0000-4000-8000-000000000051'::uuid,
    'https://push.example.test/send/limit-34',
    'AabcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_-',
    'auth-value_34',
    'Asia/Seoul',
    time '21:00',
    '{"summaryDate":"2026-08-16","characters":[]}'::jsonb
  )$$,
  'fourth subscription is stored'
);

select lives_ok(
  $$select * from public.upsert_push_notification_subscription(
    '00000000-0000-4000-8000-000000000051'::uuid,
    'https://push.example.test/send/limit-35',
    'AabcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_-',
    'auth-value_35',
    'Asia/Seoul',
    time '21:00',
    '{"summaryDate":"2026-08-16","characters":[]}'::jsonb
  )$$,
  'fifth subscription is stored'
);

select is(
  coalesce((select stored
    from public.upsert_push_notification_subscription(
      '00000000-0000-4000-8000-000000000051'::uuid,
      'https://push.example.test/send/limit-36',
      'AabcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_-',
      'auth-value_36',
      'Asia/Seoul',
      time '21:00',
      '{"summaryDate":"2026-08-16","characters":[]}'::jsonb
    )), true),
  false,
  'sixth subscription is rejected by the per-user quota'
);

select is(
  coalesce((select quota_exceeded
    from public.upsert_push_notification_subscription(
      '00000000-0000-4000-8000-000000000051'::uuid,
      'https://push.example.test/send/limit-36',
      'AabcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_-',
      'auth-value_36',
      'Asia/Seoul',
      time '21:00',
      '{"summaryDate":"2026-08-16","characters":[]}'::jsonb
    )), false),
  true,
  'sixth subscription reports quota exhaustion'
);

select is(
  coalesce((select deleted
    from public.delete_push_notification_subscription(
      '00000000-0000-4000-8000-000000000051'::uuid,
      'https://push.example.test/send/limit-32'
    )), false),
  true,
  'deleting a subscription releases a quota slot'
);

select is(
  coalesce((select stored
    from public.upsert_push_notification_subscription(
      '00000000-0000-4000-8000-000000000051'::uuid,
      'https://push.example.test/send/limit-36',
      'AabcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_-',
      'auth-value_36',
      'Asia/Seoul',
      time '21:00',
      '{"summaryDate":"2026-08-16","characters":[]}'::jsonb
    )), false),
  true,
  'a new subscription is accepted after deletion'
);

select is(
  (select count(*)
   from public.push_notification_subscriptions
   where user_id = '00000000-0000-4000-8000-000000000051'),
  5::bigint,
  'the user has no more than five stored subscriptions'
);

select is(
  coalesce((select allowed
    from public.consume_push_subscription_rate_limit(
      '00000000-0000-4000-8000-000000000053'::uuid
    )), false),
  true,
  'the first subscription management request is allowed'
);

do $$
declare
  request_number integer;
  ignored_allowed boolean;
begin
  for request_number in 1..29 loop
    select allowed
    into ignored_allowed
    from public.consume_push_subscription_rate_limit(
      '00000000-0000-4000-8000-000000000053'::uuid
    );
  end loop;
end;
$$;

select is(
  coalesce((select allowed
    from public.consume_push_subscription_rate_limit(
      '00000000-0000-4000-8000-000000000053'::uuid
    )), true),
  false,
  'the thirty-first request in ten minutes is rejected'
);

select ok(
  (select retry_after_seconds between 1 and 600
   from public.consume_push_subscription_rate_limit(
     '00000000-0000-4000-8000-000000000053'::uuid
   )),
  'rate limiting returns a bounded retry delay'
);

reset role;
select * from finish();
rollback;
