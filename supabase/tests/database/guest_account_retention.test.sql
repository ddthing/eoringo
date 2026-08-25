begin;

create extension if not exists pgtap with schema extensions;
select plan(13);

select ok(
  (select relrowsecurity and relforcerowsecurity
   from pg_class
   where oid = 'public.guest_account_activity'::regclass),
  'guest activity keeps forced RLS'
);

select ok(
  has_table_privilege(
    'authenticated',
    'public.guest_account_activity',
    'SELECT'
  ),
  'authenticated clients can read through owner RLS only'
);

select ok(
  not has_table_privilege(
    'anon',
    'public.guest_account_activity',
    'SELECT'
  ),
  'unauthenticated clients cannot read guest activity'
);

select ok(
  has_function_privilege(
    'authenticated',
    'public.touch_guest_account_activity(uuid)',
    'EXECUTE'
  ),
  'authenticated clients can use the identity-bound touch function'
);

select ok(
  not has_function_privilege(
    'anon',
    'public.touch_guest_account_activity(uuid)',
    'EXECUTE'
  ),
  'unauthenticated clients cannot touch guest activity'
);

select ok(
  has_function_privilege(
    'service_role',
    'public.cleanup_expired_anonymous_accounts()',
    'EXECUTE'
  ),
  'only the scheduler role can clean up expired anonymous accounts'
);

insert into auth.users (
  id,
  instance_id,
  aud,
  role,
  email,
  is_anonymous,
  created_at,
  updated_at
) values
  (
    '00000000-0000-4000-8000-000000000061',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    null,
    true,
    now() - interval '40 days',
    now() - interval '40 days'
  ),
  (
    '00000000-0000-4000-8000-000000000062',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    null,
    true,
    now() - interval '40 days',
    now() - interval '1 day'
  ),
  (
    '00000000-0000-4000-8000-000000000063',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'retention-permanent@example.test',
    false,
    now() - interval '40 days',
    now() - interval '40 days'
  );

reset role;
set local session_replication_role = replica;
insert into public.guest_account_activity (user_id, last_seen_at, updated_at)
values
  (
    '00000000-0000-4000-8000-000000000061',
    now() - interval '31 days',
    now() - interval '31 days'
  ),
  (
    '00000000-0000-4000-8000-000000000062',
    now() - interval '1 day',
    now() - interval '1 day'
  );
set local session_replication_role = origin;

set local role authenticated;
select set_config(
  'request.jwt.claims',
  json_build_object(
    'role', 'authenticated',
    'sub', '00000000-0000-4000-8000-000000000062',
    'is_anonymous', true
  )::text,
  true
);
select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000062', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

select lives_ok(
  $$select public.touch_guest_account_activity(
    '00000000-0000-4000-8000-000000000062'
  )$$,
  'an anonymous user can refresh only its own activity'
);

select set_config(
  'request.jwt.claims',
  json_build_object(
    'role', 'authenticated',
    'sub', '00000000-0000-4000-8000-000000000063',
    'is_anonymous', false
  )::text,
  true
);
select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000063', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

select throws_ok(
  $$select public.touch_guest_account_activity(
    '00000000-0000-4000-8000-000000000063'
  )$$,
  '42501',
  null,
  'permanent users cannot write guest activity'
);

set local role service_role;
select results_eq(
  $$select user_id from public.cleanup_expired_anonymous_accounts()$$,
  $$values ('00000000-0000-4000-8000-000000000061'::uuid)$$,
  'cleanup returns and deletes only expired anonymous users'
);

reset role;

select is(
  (select count(*) from auth.users where id = '00000000-0000-4000-8000-000000000061'),
  0::bigint,
  'expired anonymous user is deleted'
);

select is(
  (select count(*) from auth.users where id = '00000000-0000-4000-8000-000000000062'),
  1::bigint,
  'recent anonymous user is retained'
);

select is(
  (select count(*) from auth.users where id = '00000000-0000-4000-8000-000000000063'),
  1::bigint,
  'permanent user is never targeted'
);

select is(
  (select count(*) from public.guest_account_activity
   where user_id = '00000000-0000-4000-8000-000000000061'),
  0::bigint,
  'activity row follows the auth cascade'
);

reset role;
select * from finish();
rollback;
