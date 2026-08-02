begin;

create extension if not exists pgtap with schema extensions;
select plan(14);

select ok(
  (select relrowsecurity and relforcerowsecurity from pg_class where oid = 'public.profiles'::regclass),
  'profiles enables and forces RLS'
);
select ok(
  (select relrowsecurity and relforcerowsecurity from pg_class where oid = 'public.characters'::regclass),
  'characters enables and forces RLS'
);
select ok(
  (select relrowsecurity and relforcerowsecurity from pg_class where oid = 'public.user_documents'::regclass),
  'user_documents enables and forces RLS'
);
select ok(
  (select relrowsecurity and relforcerowsecurity from pg_class where oid = 'private.secure_operations'::regclass),
  'private operations enables and forces RLS'
);

insert into auth.users (id, instance_id, aud, role, email, created_at, updated_at)
values
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'a@example.test', now(), now()),
  ('00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'b@example.test', now(), now());

insert into public.profiles (user_id, nickname)
values
  ('00000000-0000-0000-0000-000000000001', 'A'),
  ('00000000-0000-0000-0000-000000000002', 'B');

insert into public.characters (id, user_id, client_id, name, server, is_main)
values
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'character-a', 'A', 'Chocobo', true),
  ('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000002', 'character-b', 'B', 'Chocobo', true);

insert into public.user_documents (user_id, document_type, payload, schema_version)
values ('00000000-0000-0000-0000-000000000002', 'memo', '{"memosByCharacter":{}}'::jsonb, 1);

set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

select is(
  (select count(*) from public.profiles),
  1::bigint,
  'user A sees only their profile'
);
select is(
  (select count(*) from public.characters),
  1::bigint,
  'user A sees only their character'
);

select lives_ok(
  $$insert into public.user_documents (user_id, document_type, payload, schema_version)
    values ('00000000-0000-0000-0000-000000000001', 'memo', '{"memosByCharacter":{}}'::jsonb, 1)$$,
  'user A inserts their document'
);

select throws_ok(
  $$insert into public.user_documents (user_id, document_type, payload, schema_version)
    values ('00000000-0000-0000-0000-000000000002', 'tasks', '{}'::jsonb, 1)$$,
  '42501',
  null,
  'user A cannot insert for user B'
);

select throws_ok(
  $$insert into public.user_documents (user_id, character_id, document_type, payload, schema_version)
    values (
      '00000000-0000-0000-0000-000000000001',
      '10000000-0000-0000-0000-000000000002',
      'dday',
      '{}'::jsonb,
      1
    )$$,
  '42501',
  null,
  'user A cannot reference user B character'
);

update public.user_documents
set payload = '{"memosByCharacter":{"character-a":"updated"}}'::jsonb
where user_id = '00000000-0000-0000-0000-000000000001'
  and document_type = 'memo';

select is(
  (
    select revision
    from public.user_documents
    where user_id = '00000000-0000-0000-0000-000000000001'
      and document_type = 'memo'
  ),
  1::bigint,
  'owned document updates increment revision server-side'
);

select results_eq(
  $$with changed as (
      update public.user_documents
      set payload = '{}'::jsonb
      where user_id = '00000000-0000-0000-0000-000000000002'
      returning 1
    )
    select count(*)::bigint from changed$$,
  $$values (0::bigint)$$,
  'user A cannot update user B document'
);

select throws_ok(
  $$update public.user_documents
    set user_id = '00000000-0000-0000-0000-000000000002'
    where user_id = '00000000-0000-0000-0000-000000000001'$$,
  '42501',
  null,
  'client cannot update document ownership column'
);

select throws_ok(
  $$select count(*) from private.secure_operations$$,
  '42501',
  null,
  'authenticated users cannot access private operations'
);

reset role;
set local role anon;
select set_config('request.jwt.claim.sub', '', true);
select set_config('request.jwt.claim.role', 'anon', true);

select throws_ok(
  $$select count(*) from public.profiles$$,
  '42501',
  null,
  'unauthenticated anon role has no profile access'
);

reset role;
select * from finish();
rollback;
