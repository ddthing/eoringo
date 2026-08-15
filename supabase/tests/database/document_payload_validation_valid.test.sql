begin;

create extension if not exists pgtap with schema extensions;
select plan(7);

insert into auth.users (id, instance_id, aud, role, email, is_anonymous, created_at, updated_at)
values (
  '00000000-0000-4000-8000-000000000031',
  '00000000-0000-0000-0000-000000000000',
  'authenticated',
  'authenticated',
  'payload-validation-valid@example.test',
  false,
  now(),
  now()
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000031', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

insert into public.characters (id, user_id, client_id, name, server, is_main)
values (
  '10000000-0000-4000-8000-000000000031',
  '00000000-0000-4000-8000-000000000031',
  'character-rich',
  'Rich Character',
  'Chocobo',
  true
);

select lives_ok(
  $$insert into public.user_documents (user_id, document_type, payload, schema_version)
    values (
      '00000000-0000-4000-8000-000000000031',
      'characters',
      '{"characters":[{"id":"character-rich","name":"Rich Character","server":"Chocobo","isMain":true}],"activeCharacterId":"character-rich"}'::jsonb,
      1
    )$$,
  'valid characters payload remains writable'
);

select lives_ok(
  $$insert into public.user_documents (user_id, document_type, payload, schema_version)
    values (
      '00000000-0000-4000-8000-000000000031',
      'tasks',
      '{"completedByCharacter":{"character-rich":{"task-a":1}},"completedAtByCharacter":{"character-rich":{"task-a":"2026-08-15T00:00:00.000Z"}},"customTaskTemplatesByCharacter":{"character-rich":[{"id":"task-a","title":"Daily task","category":"daily","resetType":"daily","resetRuleId":"daily-midnight","maxCount":1,"enabledByDefault":true,"characterScoped":true,"group":"roulette","priority":0,"isDefault":false}]},"disabledDefaultTaskIdsByCharacter":{"character-rich":[]},"dailyResetKey":"2026-08-15","weeklyResetKey":"2026-W33","resetKeysByRule":{"daily-midnight":"2026-08-15"}}'::jsonb,
      1
    )$$,
  'valid tasks payload remains writable'
);

select lives_ok(
  $$insert into public.user_documents (user_id, document_type, payload, schema_version)
    values (
      '00000000-0000-4000-8000-000000000031',
      'dday',
      '{"eventsByCharacter":{"character-rich":[{"id":"event-rich","title":"Event","date":"2026-08-20","characterId":"character-rich"}]}}'::jsonb,
      1
    )$$,
  'valid dday payload remains writable'
);

select lives_ok(
  $$insert into public.user_documents (user_id, document_type, payload, schema_version)
    values (
      '00000000-0000-4000-8000-000000000031',
      'memo',
      '{"memosByCharacter":{"character-rich":"Memo"}}'::jsonb,
      1
    )$$,
  'valid memo payload remains writable'
);

select lives_ok(
  $$insert into public.user_documents (user_id, document_type, payload, schema_version)
    values (
      '00000000-0000-4000-8000-000000000031',
      'allowance',
      '{"value":42,"lastAccrualKey":"2026-08-15T00:00:00.000Z"}'::jsonb,
      1
    )$$,
  'valid allowance payload remains writable'
);

select lives_ok(
  $$insert into public.user_documents (user_id, document_type, payload, schema_version)
    values (
      '00000000-0000-4000-8000-000000000031',
      'history',
      '{"entriesByDate":{"2026-08-15":{"date":"2026-08-15","capturedAt":"2026-08-15T00:00:00.000Z","characters":{"character-rich":{"character":{"id":"character-rich","name":"Rich Character","server":"Chocobo","isMain":true},"tasks":[{"id":"task-a","title":"Daily task","category":"daily","group":"roulette","resetType":"daily","resetRuleId":"daily-midnight","maxCount":1,"count":1,"completed":true}],"memo":"Memo","progress":{"daily":{"total":1,"completed":1,"percent":100},"weekly":{"total":1,"completed":1,"percent":100},"other":{"total":0,"completed":0,"percent":0},"total":{"total":1,"completed":1,"percent":100}},"ddayEvents":[{"id":"event-rich","title":"Event","date":"2026-08-20","characterId":"character-rich"}]}}}}}'::jsonb,
      1
    )$$,
  'valid history payload remains writable'
);

select is(
  (
    select count(*)
    from public.user_documents
    where user_id = '00000000-0000-4000-8000-000000000031'
  ),
  6::bigint,
  'all valid document types are stored'
);

reset role;
select * from finish();
rollback;
