begin;

create extension if not exists pgtap with schema extensions;
select plan(6);

insert into auth.users (id, instance_id, aud, role, email, is_anonymous, created_at, updated_at)
values (
  '00000000-0000-4000-8000-000000000030',
  '00000000-0000-0000-0000-000000000000',
  'authenticated',
  'authenticated',
  'payload-validation@example.test',
  false,
  now(),
  now()
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000030', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

select lives_ok(
  $$insert into public.user_documents (user_id, document_type, payload, schema_version)
    values (
      '00000000-0000-4000-8000-000000000030',
      'allowance',
      '{"value":42,"lastAccrualKey":"2026-08-15T00:00:00.000Z"}'::jsonb,
      1
    )$$,
  'valid allowance payload remains writable'
);

select throws_ok(
  $$insert into public.user_documents (user_id, document_type, payload, schema_version)
    values (
      '00000000-0000-4000-8000-000000000030',
      'characters',
      '{"characters":[{"id":"same","name":"A","server":"Chocobo","isMain":true},{"id":"same","name":"B","server":"Chocobo","isMain":false}],"activeCharacterId":"same"}'::jsonb,
      1
    )$$,
  '23514',
  null,
  'duplicate character IDs are rejected'
);

select throws_ok(
  $$insert into public.user_documents (user_id, document_type, payload, schema_version)
    values (
      '00000000-0000-4000-8000-000000000030',
      'tasks',
      '{"completedByCharacter":{},"completedAtByCharacter":{},"customTaskTemplatesByCharacter":{"character-a":[{"id":"task-a","title":"Task","category":"daily","resetType":"daily","resetRuleId":"daily-midnight","maxCount":1,"enabledByDefault":true,"characterScoped":true,"group":"invalid","priority":0,"isDefault":false}]},"disabledDefaultTaskIdsByCharacter":{},"dailyResetKey":"","weeklyResetKey":"","resetKeysByRule":{}}'::jsonb,
      1
    )$$,
  '23514',
  null,
  'invalid custom task groups are rejected'
);

select throws_ok(
  $$insert into public.user_documents (user_id, document_type, payload, schema_version)
    values (
      '00000000-0000-4000-8000-000000000030',
      'dday',
      '{"eventsByCharacter":{"character-a":[{"id":"event-a","title":"Event","date":"tomorrow"}]}}'::jsonb,
      1
    )$$,
  '23514',
  null,
  'invalid anniversary dates are rejected'
);

select throws_ok(
  $$insert into public.user_documents (user_id, document_type, payload, schema_version)
    values (
      '00000000-0000-4000-8000-000000000030',
      'memo',
      '{"memosByCharacter":{"character-a":123}}'::jsonb,
      1
    )$$,
  '23514',
  null,
  'memo values must remain strings'
);

select throws_ok(
  $$insert into public.user_documents (user_id, document_type, payload, schema_version)
    values (
      '00000000-0000-4000-8000-000000000030',
      'history',
      '{"entriesByDate":{"2026-08-15":{"date":"2026-08-15","capturedAt":"not-an-iso-timestamp","characters":{}}}}'::jsonb,
      1
    )$$,
  '23514',
  null,
  'history timestamps must be ISO datetimes'
);

reset role;
select * from finish();
rollback;
