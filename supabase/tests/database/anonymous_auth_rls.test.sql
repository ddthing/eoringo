begin;

create extension if not exists pgtap with schema extensions;
select plan(17);

select ok(
  (select relrowsecurity and relforcerowsecurity
   from pg_class
   where oid = 'public.profiles'::regclass),
  'profiles keeps forced RLS for anonymous sessions'
);
select ok(
  (select relrowsecurity and relforcerowsecurity
   from pg_class
   where oid = 'public.characters'::regclass),
  'characters keeps forced RLS for anonymous sessions'
);
select ok(
  (select relrowsecurity and relforcerowsecurity
   from pg_class
   where oid = 'public.user_documents'::regclass),
  'user documents keep forced RLS for anonymous sessions'
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
    '00000000-0000-0000-0000-000000000101',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'permanent-boundary@example.test',
    false,
    now(),
    now()
  ),
  (
    '00000000-0000-0000-0000-000000000102',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    null,
    true,
    now(),
    now()
  );

insert into public.profiles (user_id, nickname)
values
  ('00000000-0000-0000-0000-000000000101', 'Permanent'),
  ('00000000-0000-0000-0000-000000000102', 'Guest');

insert into public.characters (id, user_id, client_id, name, server, is_main)
values
  (
    '10000000-0000-0000-0000-000000000101',
    '00000000-0000-0000-0000-000000000101',
    'boundary-permanent',
    'Permanent',
    'Chocobo',
    true
  ),
  (
    '10000000-0000-0000-0000-000000000102',
    '00000000-0000-0000-0000-000000000102',
    'boundary-anonymous',
    'Guest',
    'Chocobo',
    true
  );

insert into public.user_documents (user_id, document_type, payload, schema_version)
values
  (
    '00000000-0000-0000-0000-000000000101',
    'memo',
    '{"memosByCharacter":{}}'::jsonb,
    1
  ),
  (
    '00000000-0000-0000-0000-000000000102',
    'memo',
    '{"memosByCharacter":{}}'::jsonb,
    1
  );

set local role authenticated;
select set_config(
  'request.jwt.claims',
  json_build_object(
    'role', 'authenticated',
    'sub', '00000000-0000-0000-0000-000000000101',
    'is_anonymous', false
  )::text,
  true
);
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000101', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

select is(
  (select count(*) from public.profiles),
  1::bigint,
  'permanent users see only their own profile'
);
select is(
  (select count(*) from public.characters),
  1::bigint,
  'permanent users see only their own character'
);
select is(
  (select count(*) from public.user_documents),
  1::bigint,
  'permanent users see only their own document'
);
select results_eq(
  $$with changed as (
      update public.user_documents
      set payload = '{"memosByCharacter":{"anonymous":"blocked"}}'::jsonb
      where user_id = '00000000-0000-0000-0000-000000000102'
      returning 1
    )
    select count(*)::bigint from changed$$,
  $$values (0::bigint)$$,
  'permanent users cannot update anonymous documents'
);
select throws_ok(
  $$insert into public.user_documents (user_id, document_type, payload, schema_version)
    values (
      '00000000-0000-0000-0000-000000000102',
      'dday',
      '{"eventsByCharacter":{}}'::jsonb,
      1
    )$$,
  '42501',
  null,
  'permanent users cannot insert documents for anonymous users'
);

select set_config(
  'request.jwt.claims',
  json_build_object(
    'role', 'authenticated',
    'sub', '00000000-0000-0000-0000-000000000102',
    'is_anonymous', true
  )::text,
  true
);
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000102', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

select is(
  (select count(*) from public.profiles),
  1::bigint,
  'anonymous users see only their own profile'
);
select is(
  (select count(*) from public.characters),
  1::bigint,
  'anonymous users see only their own character'
);
select is(
  (select count(*) from public.user_documents),
  1::bigint,
  'anonymous users see only their own document'
);
select lives_ok(
  $$insert into public.user_documents (user_id, document_type, payload, schema_version)
    values (
      '00000000-0000-0000-0000-000000000102',
      'dday',
      '{"eventsByCharacter":{}}'::jsonb,
      1
    )$$,
  'anonymous users can write their own bounded document'
);
select throws_ok(
  $$insert into public.user_documents (user_id, document_type, payload, schema_version)
    values (
      '00000000-0000-0000-0000-000000000101',
      'history',
      '{"entriesByDate":{}}'::jsonb,
      1
    )$$,
  '42501',
  null,
  'anonymous users cannot insert documents for permanent users'
);
select results_eq(
  $$with changed as (
      update public.user_documents
      set payload = '{"memosByCharacter":{"permanent":"blocked"}}'::jsonb
      where user_id = '00000000-0000-0000-0000-000000000101'
      returning 1
    )
    select count(*)::bigint from changed$$,
  $$values (0::bigint)$$,
  'anonymous users cannot update permanent documents'
);
select is(
  (select count(*) from public.user_documents),
  2::bigint,
  'anonymous writes do not expose or alter permanent documents'
);
select ok(
  not has_function_privilege(
    'authenticated',
    'public.apply_local_migration(uuid, uuid, jsonb, jsonb)',
    'EXECUTE'
  ),
  'anonymous users cannot execute the privileged migration function'
);
select throws_ok(
  $$select count(*) from private.secure_operations$$,
  '42501',
  null,
  'anonymous users cannot access private operations'
);

reset role;
select * from finish();
rollback;
