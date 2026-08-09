begin;

create extension if not exists pgtap with schema extensions;
select plan(8);

select ok(
  exists (
    select 1
    from pg_constraint
    where conrelid = 'public.user_documents'::regclass
      and conname = 'user_documents_payload_safety_check'
  ),
  'user documents enforce recursive payload safety'
);

select ok(
  has_function_privilege(
    'authenticated',
    'private.is_safe_json_tree(jsonb, integer)',
    'EXECUTE'
  ),
  'authenticated writes can evaluate the recursive payload safety check'
);

select ok(
  has_function_privilege(
    'authenticated',
    'private.sync_character_image_reference()',
    'EXECUTE'
  ),
  'the character image reference trigger is executable for normal document writes'
);

insert into auth.users (id, instance_id, aud, role, email, is_anonymous, created_at, updated_at)
values (
  '00000000-0000-4000-8000-000000000021',
  '00000000-0000-0000-0000-000000000000',
  'authenticated',
  'authenticated',
  'hardening@example.test',
  false,
  now(),
  now()
);

insert into public.characters (id, user_id, client_id, name, server, is_main)
values (
  '10000000-0000-4000-8000-000000000021',
  '00000000-0000-4000-8000-000000000021',
  'character-hardening',
  'Hardening',
  'Chocobo',
  true
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000021', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

select throws_ok(
  $$insert into public.user_documents (user_id, document_type, payload, schema_version)
    values (
      '00000000-0000-4000-8000-000000000021',
      'memo',
      '{"memosByCharacter":{"__proto__":"unsafe"}}'::jsonb,
      1
    )$$,
  '23514',
  null,
  'reserved nested JSON keys are rejected'
);

select throws_ok(
  format(
    $$insert into public.user_documents (user_id, document_type, payload, schema_version)
      values (
        '00000000-0000-4000-8000-000000000021',
        'memo',
        jsonb_build_object('memosByCharacter', jsonb_build_object('character', repeat('x', %s))),
        1
      )$$,
    16001
  ),
  '23514',
  null,
  'oversized nested strings are rejected'
);

select lives_ok(
  $$insert into public.user_documents (user_id, document_type, payload, schema_version)
    values (
      '00000000-0000-4000-8000-000000000021',
      'characters',
      '{"characters":[{"id":"character-hardening","name":"Hardening","server":"Chocobo","isMain":true,"profileImageId":"character-image-hardening"}],"activeCharacterId":"character-hardening"}'::jsonb,
      1
    )$$,
  'valid character document remains writable'
);

select is(
  (
    select profile_image_path
    from public.characters
    where id = '10000000-0000-4000-8000-000000000021'
  ),
  'character-image-hardening',
  'character image references are retained by document writes'
);

select is(
  (
    select count(*)
    from public.user_documents
    where user_id = '00000000-0000-4000-8000-000000000021'
  ),
  1::bigint,
  'rejected payloads do not create documents'
);

reset role;
select * from finish();
rollback;
