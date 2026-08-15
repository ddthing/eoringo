begin;

create extension if not exists pgtap with schema extensions;
select plan(12);

select ok(
  (select relrowsecurity and relforcerowsecurity
   from pg_class
   where oid = 'public.push_notification_subscriptions'::regclass),
  'push subscriptions enable and force RLS'
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
  not has_table_privilege(
    'authenticated',
    'public.push_notification_subscriptions',
    'SELECT'
  ),
  'authenticated clients cannot read push subscriptions'
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
      '{"summaryDate":"2026-08-15","characters":[]}'::jsonb
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
