begin;

create extension if not exists pgtap with schema extensions;
select plan(9);

select ok(
  not has_function_privilege(
    'authenticated',
    'public.apply_local_migration(uuid, uuid, jsonb, jsonb)',
    'EXECUTE'
  ),
  'authenticated browser clients cannot call the privileged migration function'
);

select ok(
  has_function_privilege(
    'service_role',
    'public.apply_local_migration(uuid, uuid, jsonb, jsonb)',
    'EXECUTE'
  ),
  'only the service role can execute the migration function'
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
) values (
  '00000000-0000-4000-8000-000000000010',
  '00000000-0000-0000-0000-000000000000',
  'authenticated',
  'authenticated',
  'migration@example.test',
  false,
  now(),
  now()
);

create temporary table migration_fixture (
  documents jsonb not null,
  digests jsonb not null
) on commit drop;

insert into migration_fixture (documents, digests)
values (
  '[
    {
      "documentType":"characters",
      "schemaVersion":1,
      "payload":{
        "characters":[{"id":"character-a","name":"A","server":"Chocobo","isMain":true}],
        "activeCharacterId":"character-a"
      },
      "digest":"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
    },
    {
      "documentType":"tasks",
      "schemaVersion":1,
      "payload":{
        "completedByCharacter":{},
        "completedAtByCharacter":{},
        "customTaskTemplatesByCharacter":{},
        "disabledDefaultTaskIdsByCharacter":{},
        "dailyResetKey":"",
        "weeklyResetKey":"",
        "resetKeysByRule":{}
      },
      "digest":"bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb"
    },
    {
      "documentType":"dday",
      "schemaVersion":1,
      "payload":{"eventsByCharacter":{}},
      "digest":"cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc"
    },
    {
      "documentType":"memo",
      "schemaVersion":1,
      "payload":{"memosByCharacter":{}},
      "digest":"dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd"
    },
    {
      "documentType":"allowance",
      "schemaVersion":1,
      "payload":{"value":0,"lastAccrualKey":""},
      "digest":"eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee"
    },
    {
      "documentType":"history",
      "schemaVersion":1,
      "payload":{"entriesByDate":{}},
      "digest":"ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff"
    }
  ]'::jsonb,
  '{
    "characters":"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    "tasks":"bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
    "dday":"cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc",
    "memo":"dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd",
    "allowance":"eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
    "history":"ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff"
  }'::jsonb
);

select lives_ok(
  $$select public.apply_local_migration(
    '00000000-0000-4000-8000-000000000010',
    '00000000-0000-4000-8000-000000000011',
    documents,
    digests
  ) from migration_fixture$$,
  'a permanent user can receive one validated atomic migration'
);

select is(
  (select count(*) from public.user_documents where user_id = '00000000-0000-4000-8000-000000000010'),
  6::bigint,
  'migration writes all six bounded domain documents'
);

select is(
  (select count(*) from public.characters where user_id = '00000000-0000-4000-8000-000000000010'),
  1::bigint,
  'migration creates relational characters'
);

select is(
  (select count(*) from private.secure_operations where id = '00000000-0000-4000-8000-000000000011'),
  1::bigint,
  'migration stores one private idempotency receipt'
);

select lives_ok(
  $$select public.apply_local_migration(
    '00000000-0000-4000-8000-000000000010',
    '00000000-0000-4000-8000-000000000011',
    documents,
    digests
  ) from migration_fixture$$,
  'replaying the same migration ID returns its original receipt'
);

select is(
  (select count(*) from public.user_documents where user_id = '00000000-0000-4000-8000-000000000010'),
  6::bigint,
  'idempotent replay does not duplicate documents'
);

select throws_ok(
  $$insert into public.user_documents (user_id, document_type, payload, schema_version)
    values (
      '00000000-0000-4000-8000-000000000010',
      'memo',
      '{"unexpected":true}'::jsonb,
      1
    )$$,
  '23514',
  null,
  'database rejects a malformed domain payload even for a privileged writer'
);

select * from finish();
rollback;
