begin;

create extension if not exists pgtap with schema extensions;
select plan(30);

select ok(
  (select relrowsecurity and relforcerowsecurity
   from pg_class
   where oid = 'public.push_notification_subscriptions'::regclass),
  'push subscriptions enable and force RLS'
);

select ok(
  (select relrowsecurity and relforcerowsecurity
   from pg_class
   where oid = 'public.push_notification_delivery_attempts'::regclass),
  'delivery attempts enable and force RLS'
);

select ok(
  has_table_privilege(
    'service_role',
    'public.push_notification_subscriptions',
    'SELECT, INSERT, UPDATE, DELETE'
  ),
  'service role can manage push subscriptions'
);

select ok(
  has_table_privilege(
    'service_role',
    'public.push_notification_delivery_attempts',
    'SELECT, INSERT, UPDATE, DELETE'
  ),
  'service role can manage delivery attempts'
);

select ok(
  not has_table_privilege(
    'authenticated',
    'public.push_notification_subscriptions',
    'SELECT'
  ),
  'authenticated clients cannot read push subscriptions'
);

select ok(
  not has_table_privilege(
    'authenticated',
    'public.push_notification_delivery_attempts',
    'SELECT'
  ),
  'authenticated clients cannot read delivery attempts'
);

select ok(
  has_function_privilege(
    'service_role',
    'public.claim_push_notification_delivery(uuid,text,uuid,integer)',
    'EXECUTE'
  ),
  'service role can claim push deliveries'
);

select ok(
  has_function_privilege(
    'service_role',
    'public.complete_push_notification_delivery(uuid,text,uuid)',
    'EXECUTE'
  ),
  'service role can complete push deliveries'
);

select ok(
  has_function_privilege(
    'service_role',
    'public.record_failed_push_notification_delivery(uuid,text,uuid,text)',
    'EXECUTE'
  ),
  'service role can record failed push deliveries'
);

select ok(
  not has_function_privilege(
    'authenticated',
    'public.claim_push_notification_delivery(uuid,text,uuid,integer)',
    'EXECUTE'
  ),
  'authenticated clients cannot claim push deliveries'
);

select ok(
  not has_function_privilege(
    'authenticated',
    'public.complete_push_notification_delivery(uuid,text,uuid)',
    'EXECUTE'
  ),
  'authenticated clients cannot complete push deliveries'
);

select ok(
  not has_function_privilege(
    'authenticated',
    'public.record_failed_push_notification_delivery(uuid,text,uuid,text)',
    'EXECUTE'
  ),
  'authenticated clients cannot record failed push deliveries'
);

select ok(
  exists (
    select 1
    from pg_constraint
    where conrelid = 'public.push_notification_subscriptions'::regclass
      and contype = 'u'
      and pg_get_constraintdef(oid) = 'UNIQUE (endpoint)'
  ),
  'one browser endpoint belongs to one account'
);

insert into auth.users (id, instance_id, aud, role, email, is_anonymous, created_at, updated_at)
values (
  '00000000-0000-4000-8000-000000000031',
  '00000000-0000-0000-0000-000000000000',
  'authenticated',
  'authenticated',
  'push-test@example.test',
  false,
  now(),
  now()
);

set local role service_role;

select lives_ok(
  $$insert into public.push_notification_subscriptions (
      user_id,
      endpoint,
      p256dh,
      auth,
      task_summary
    ) values (
      '00000000-0000-4000-8000-000000000031',
      'https://push.example.test/send/31',
      'AabcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_-',
      'auth-value_31',
      jsonb_build_object(
        'summaryDate', '2026-08-15',
        'sourceDigest', repeat('a', 64),
        'characters', '[]'::jsonb
      )
    )$$,
  'service role can insert a valid subscription'
);

select throws_ok(
  $$insert into public.push_notification_subscriptions (
      user_id, endpoint, p256dh, auth
    ) values (
      '00000000-0000-4000-8000-000000000031',
      'http://push.example.test/send/31',
      'AabcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_-',
      'auth-value_31'
    )$$,
  '23514',
  null,
  'insecure push endpoints are rejected'
);

select throws_ok(
  $$insert into public.push_notification_subscriptions (
      user_id, endpoint, p256dh, auth
    ) values (
      '00000000-0000-4000-8000-000000000031',
      'https://push.example.test/send/32',
      'not valid key!',
      'auth-value_32'
    )$$,
  '23514',
  null,
  'invalid subscription keys are rejected'
);

select throws_ok(
  $$insert into public.push_notification_subscriptions (
      user_id, endpoint, p256dh, auth, task_summary
    ) values (
      '00000000-0000-4000-8000-000000000031',
      'https://push.example.test/send/33',
      'AabcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_-',
      'auth-value_33',
      '[]'::jsonb
    )$$,
  '23514',
  null,
  'task summary must be an object'
);

select throws_ok(
  $$insert into public.push_notification_subscriptions (
      user_id, endpoint, p256dh, auth, task_summary
    ) values (
      '00000000-0000-4000-8000-000000000031',
      'https://push.example.test/send/34',
      'AabcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_-',
      'auth-value_34',
      jsonb_build_object('characters', repeat('x', 66000))
    )$$,
  '23514',
  null,
  'oversized task summaries are rejected'
);

select throws_ok(
  $$insert into public.push_notification_subscriptions (
      user_id, endpoint, p256dh, auth
    ) values (
      '00000000-0000-4000-8000-000000000031',
      'https://push.example.test/send/31',
      'AabcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_-',
      'auth-value_31'
    )$$,
  '23505',
  null,
  'duplicate endpoints are rejected'
);

select is(
  coalesce((select claimed
    from public.claim_push_notification_delivery(
      (select id from public.push_notification_subscriptions
       where endpoint = 'https://push.example.test/send/31'),
      '2026-08-15:21:00',
      '00000000-0000-4000-8000-000000000041'::uuid
    )), false),
  true,
  'first delivery claim succeeds'
);

select is(
  coalesce((select recorded
    from public.record_failed_push_notification_delivery(
      (select id from public.push_notification_subscriptions
       where endpoint = 'https://push.example.test/send/31'),
      '2026-08-15:21:00',
      '00000000-0000-4000-8000-000000000041'::uuid,
      'push_delivery_failed'
    )), false),
  true,
  'failed delivery state is recorded for the claim owner'
);

select is(
  (select last_error
   from public.push_notification_subscriptions
   where endpoint = 'https://push.example.test/send/31'),
  'push_delivery_failed',
  'failed delivery updates the subscription error'
);

select is(
  coalesce((select claimed
    from public.claim_push_notification_delivery(
      (select id from public.push_notification_subscriptions
       where endpoint = 'https://push.example.test/send/31'),
      '2026-08-15:21:00',
      '00000000-0000-4000-8000-000000000042'::uuid
    )), false),
  false,
  'duplicate delivery claim is rejected while the lease is active'
);

select lives_ok(
  $$update public.push_notification_delivery_attempts
    set claimed_at = now() - interval '301 seconds'
    where subscription_id = (
      select id from public.push_notification_subscriptions
      where endpoint = 'https://push.example.test/send/31'
    )
      and delivery_key = '2026-08-15:21:00'$$,
  'expired delivery lease can be reclaimed'
);

select is(
  coalesce((select claimed
    from public.claim_push_notification_delivery(
      (select id from public.push_notification_subscriptions
       where endpoint = 'https://push.example.test/send/31'),
      '2026-08-15:21:00',
      '00000000-0000-4000-8000-000000000042'::uuid
    )), false),
  true,
  'delivery claim succeeds after the lease expires'
);

select is(
  coalesce((select completed
    from public.complete_push_notification_delivery(
      (select id from public.push_notification_subscriptions
       where endpoint = 'https://push.example.test/send/31'),
      '2026-08-15:21:00',
      '00000000-0000-4000-8000-000000000041'::uuid
    )), false),
  false,
  'delivery cannot be completed by another claim token'
);

select is(
  coalesce((select completed
    from public.complete_push_notification_delivery(
      (select id from public.push_notification_subscriptions
       where endpoint = 'https://push.example.test/send/31'),
      '2026-08-15:21:00',
      '00000000-0000-4000-8000-000000000042'::uuid
    )), false),
  true,
  'delivery completion succeeds for the claim owner'
);

select is(
  coalesce((select claimed
    from public.claim_push_notification_delivery(
      (select id from public.push_notification_subscriptions
       where endpoint = 'https://push.example.test/send/31'),
      '2026-08-15:21:00',
      '00000000-0000-4000-8000-000000000043'::uuid
    )), false),
  false,
  'completed delivery cannot be claimed again'
);

select lives_ok(
  $$update public.push_notification_subscriptions
    set notification_time = time '07:30',
        notification_enabled = false,
        last_error = 'temporary failure'
    where endpoint = 'https://push.example.test/send/31'$$,
  'service role can update delivery state'
);

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000031', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

select throws_ok(
  $$select count(*) from public.push_notification_subscriptions$$,
  '42501',
  null,
  'authenticated clients cannot access subscription rows'
);

reset role;
select * from finish();
rollback;
