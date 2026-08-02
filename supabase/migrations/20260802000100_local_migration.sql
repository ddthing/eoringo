create function private.has_exact_json_keys(value jsonb, expected text[])
returns boolean
language sql
immutable
strict
set search_path = ''
as $$
  select jsonb_typeof(value) = 'object'
    and value ?& expected
    and not exists (
      select 1
      from jsonb_object_keys(value) as key
      where not (key = any (expected))
    );
$$;

create function private.is_valid_document_payload(
  document_type text,
  schema_version integer,
  payload jsonb
)
returns boolean
language plpgsql
immutable
strict
security definer
set search_path = ''
as $$
begin
  if schema_version <> 1 or jsonb_typeof(payload) <> 'object' then
    return false;
  end if;

  case document_type
    when 'characters' then
      return private.has_exact_json_keys(payload, array['characters', 'activeCharacterId'])
        and jsonb_typeof(payload->'characters') = 'array'
        and jsonb_array_length(payload->'characters') between 1 and 50
        and jsonb_typeof(payload->'activeCharacterId') = 'string';
    when 'memo' then
      return private.has_exact_json_keys(payload, array['memosByCharacter'])
        and jsonb_typeof(payload->'memosByCharacter') = 'object';
    when 'dday' then
      return private.has_exact_json_keys(payload, array['eventsByCharacter'])
        and jsonb_typeof(payload->'eventsByCharacter') = 'object';
    when 'allowance' then
      return private.has_exact_json_keys(payload, array['value', 'lastAccrualKey'])
        and jsonb_typeof(payload->'value') = 'number'
        and (payload->>'value')::numeric between 0 and 100
        and trunc((payload->>'value')::numeric) = (payload->>'value')::numeric
        and jsonb_typeof(payload->'lastAccrualKey') = 'string'
        and char_length(payload->>'lastAccrualKey') <= 80;
    when 'tasks' then
      return private.has_exact_json_keys(
        payload,
        array[
          'completedByCharacter',
          'completedAtByCharacter',
          'customTaskTemplatesByCharacter',
          'disabledDefaultTaskIdsByCharacter',
          'dailyResetKey',
          'weeklyResetKey',
          'resetKeysByRule'
        ]
      )
        and jsonb_typeof(payload->'completedByCharacter') = 'object'
        and jsonb_typeof(payload->'completedAtByCharacter') = 'object'
        and jsonb_typeof(payload->'customTaskTemplatesByCharacter') = 'object'
        and jsonb_typeof(payload->'disabledDefaultTaskIdsByCharacter') = 'object'
        and jsonb_typeof(payload->'dailyResetKey') = 'string'
        and jsonb_typeof(payload->'weeklyResetKey') = 'string'
        and jsonb_typeof(payload->'resetKeysByRule') = 'object';
    when 'history' then
      return private.has_exact_json_keys(payload, array['entriesByDate'])
        and jsonb_typeof(payload->'entriesByDate') = 'object';
    else
      return false;
  end case;
end;
$$;

alter table public.user_documents
  add constraint user_documents_payload_shape_check
  check (private.is_valid_document_payload(document_type, schema_version, payload));

create function public.apply_local_migration(
  p_user_id uuid,
  p_migration_id uuid,
  p_documents jsonb,
  p_document_digests jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  existing_operation private.secure_operations%rowtype;
  migration_document jsonb;
  character_payload jsonb;
  character_value jsonb;
begin
  if p_user_id is null or p_migration_id is null then
    raise exception 'invalid migration identity' using errcode = '22023';
  end if;

  select * into existing_operation
  from private.secure_operations
  where id = p_migration_id;

  if found then
    if existing_operation.user_id <> p_user_id
      or existing_operation.operation_type <> 'migration'
      or existing_operation.status <> 'completed' then
      raise exception 'migration replay rejected' using errcode = '42501';
    end if;

    return existing_operation.payload;
  end if;

  if not exists (
    select 1 from auth.users
    where id = p_user_id and is_anonymous is false
  ) then
    raise exception 'permanent authenticated user required' using errcode = '42501';
  end if;

  if jsonb_typeof(p_documents) <> 'array'
    or jsonb_array_length(p_documents) <> 6
    or jsonb_typeof(p_document_digests) <> 'object'
    or (select count(distinct value->>'documentType') from jsonb_array_elements(p_documents)) <> 6 then
    raise exception 'invalid migration documents' using errcode = '22023';
  end if;

  if exists (select 1 from public.characters where user_id = p_user_id)
    or exists (select 1 from public.user_documents where user_id = p_user_id) then
    raise exception 'destination account is not empty' using errcode = '23505';
  end if;

  for migration_document in select value from jsonb_array_elements(p_documents)
  loop
    if not private.has_exact_json_keys(
      migration_document,
      array['documentType', 'schemaVersion', 'payload', 'digest']
    )
      or migration_document->>'documentType' not in (
        'characters', 'tasks', 'dday', 'memo', 'allowance', 'history'
      )
      or (migration_document->>'schemaVersion')::integer <> 1
      or migration_document->>'digest' !~ '^[0-9a-f]{64}$'
      or p_document_digests->>(migration_document->>'documentType')
        <> migration_document->>'digest'
      or not private.is_valid_document_payload(
        migration_document->>'documentType',
        (migration_document->>'schemaVersion')::integer,
        migration_document->'payload'
      ) then
      raise exception 'invalid migration document' using errcode = '22023';
    end if;

    if migration_document->>'documentType' = 'characters' then
      character_payload := migration_document->'payload';

      if (
        select count(*)
        from jsonb_array_elements(character_payload->'characters') as character_item
        where character_item->>'isMain' = 'true'
      ) <> 1
        or (
          select count(distinct character_item->>'id')
          from jsonb_array_elements(character_payload->'characters') as character_item
        ) <> jsonb_array_length(character_payload->'characters')
        or not exists (
          select 1
          from jsonb_array_elements(character_payload->'characters') as character_item
          where character_item->>'id' = character_payload->>'activeCharacterId'
        ) then
        raise exception 'invalid character set' using errcode = '22023';
      end if;

      for character_value in select value from jsonb_array_elements(character_payload->'characters')
      loop
        if not private.has_exact_json_keys(
          character_value,
          case
            when character_value ? 'profileImageId'
              then array['id', 'name', 'server', 'isMain', 'profileImageId']
            else array['id', 'name', 'server', 'isMain']
          end
        ) then
          raise exception 'invalid character' using errcode = '22023';
        end if;

        insert into public.characters (
          user_id,
          client_id,
          name,
          server,
          is_main,
          sort_order
        ) values (
          p_user_id,
          character_value->>'id',
          character_value->>'name',
          character_value->>'server',
          (character_value->>'isMain')::boolean,
          (select count(*) from public.characters where user_id = p_user_id)
        );
      end loop;
    end if;

    insert into public.user_documents (
      user_id,
      character_id,
      document_type,
      payload,
      schema_version
    ) values (
      p_user_id,
      null,
      migration_document->>'documentType',
      migration_document->'payload',
      (migration_document->>'schemaVersion')::integer
    );
  end loop;

  insert into public.profiles (user_id, nickname)
  values (p_user_id, 'Guest')
  on conflict (user_id) do nothing;

  insert into private.secure_operations (
    id,
    user_id,
    operation_type,
    status,
    payload
  ) values (
    p_migration_id,
    p_user_id,
    'migration',
    'completed',
    jsonb_build_object(
      'migrationId', p_migration_id,
      'documentDigests', p_document_digests
    )
  );

  return jsonb_build_object(
    'migrationId', p_migration_id,
    'documentDigests', p_document_digests
  );
end;
$$;

revoke all on function public.apply_local_migration(uuid, uuid, jsonb, jsonb)
  from public, anon, authenticated;
grant execute on function public.apply_local_migration(uuid, uuid, jsonb, jsonb)
  to service_role;

revoke all on function private.has_exact_json_keys(jsonb, text[])
  from public, anon, authenticated;
revoke all on function private.is_valid_document_payload(text, integer, jsonb)
  from public, anon, authenticated;
grant execute on function private.is_valid_document_payload(text, integer, jsonb)
  to authenticated;
