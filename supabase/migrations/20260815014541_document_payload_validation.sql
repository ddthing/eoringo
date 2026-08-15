create or replace function private.is_valid_json_id(value jsonb)
returns boolean
language plpgsql
immutable
strict
set search_path = ''
as $$
declare
  text_value text;
begin
  if jsonb_typeof(value) <> 'string' then
    return false;
  end if;

  text_value := btrim(value #>> '{}');

  return char_length(text_value) between 1 and 128
    and text_value not in ('__proto__', 'constructor', 'prototype');
end;
$$;

create or replace function private.is_valid_json_text(
  value jsonb,
  min_length integer,
  max_length integer,
  trim_value boolean default false
)
returns boolean
language plpgsql
immutable
strict
set search_path = ''
as $$
declare
  text_value text;
begin
  if jsonb_typeof(value) <> 'string' then
    return false;
  end if;

  text_value := value #>> '{}';
  if trim_value then
    text_value := btrim(text_value);
  end if;

  return char_length(text_value) between min_length and max_length;
end;
$$;

create or replace function private.is_valid_json_enum(value jsonb, allowed_values text[])
returns boolean
language plpgsql
immutable
strict
set search_path = ''
as $$
begin
  return jsonb_typeof(value) = 'string'
    and (value #>> '{}') = any (allowed_values);
end;
$$;

create or replace function private.is_valid_json_integer(
  value jsonb,
  min_value numeric,
  max_value numeric
)
returns boolean
language plpgsql
immutable
strict
set search_path = ''
as $$
declare
  number_value numeric;
begin
  if jsonb_typeof(value) <> 'number' then
    return false;
  end if;

  begin
    number_value := (value #>> '{}')::numeric;
  exception when others then
    return false;
  end;

  return number_value = trunc(number_value)
    and number_value between min_value and max_value;
end;
$$;

create or replace function private.is_valid_json_date_key(value jsonb)
returns boolean
language plpgsql
immutable
strict
set search_path = ''
as $$
begin
  return jsonb_typeof(value) = 'string'
    and (value #>> '{}') ~ '^\d{4}-\d{2}-\d{2}$';
end;
$$;

create or replace function private.is_valid_json_timestamp(value jsonb)
returns boolean
language plpgsql
immutable
strict
set search_path = ''
as $$
begin
  return jsonb_typeof(value) = 'string'
    and (value #>> '{}') ~ '^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$';
end;
$$;

create or replace function private.has_allowed_json_keys(value jsonb, allowed_keys text[])
returns boolean
language plpgsql
immutable
strict
set search_path = ''
as $$
declare
  key_value text;
begin
  if jsonb_typeof(value) <> 'object' then
    return false;
  end if;

  for key_value in select key from jsonb_object_keys(value) as entry(key)
  loop
    if not key_value = any (allowed_keys) then
      return false;
    end if;
  end loop;

  return true;
end;
$$;

create or replace function private.is_valid_json_array(value jsonb, max_elements integer)
returns boolean
language plpgsql
immutable
strict
set search_path = ''
as $$
begin
  if jsonb_typeof(value) <> 'array' then
    return false;
  end if;

  return jsonb_array_length(value) <= max_elements;
end;
$$;

create or replace function private.is_valid_json_record(value jsonb, max_entries integer)
returns boolean
language plpgsql
immutable
strict
set search_path = ''
as $$
declare
  key_value text;
begin
  if jsonb_typeof(value) <> 'object' then
    return false;
  end if;

  if (select count(*) from jsonb_object_keys(value)) > max_entries then
    return false;
  end if;

  for key_value in select key from jsonb_object_keys(value) as entry(key)
  loop
    if not private.is_valid_json_id(to_jsonb(key_value)) then
      return false;
    end if;
  end loop;

  return true;
end;
$$;

create or replace function private.is_valid_task_template(value jsonb)
returns boolean
language plpgsql
immutable
strict
set search_path = ''
as $$
declare
  reset_rule_ids constant text[] := array[
    'daily-midnight', 'daily-0500', 'daily-1700', 'weekly-tue-1700',
    'weekly-fri-1700', 'weekly-sat-2100', 'interval-18h', 'manual'
  ];
  task_groups constant text[] := array[
    'roulette', 'delivery', 'combat', 'pvp', 'housing', 'lifestyle', 'event', 'custom'
  ];
begin
  if jsonb_typeof(value) <> 'object'
    or not private.has_allowed_json_keys(
      value,
      array[
        'id', 'title', 'description', 'category', 'resetType', 'resetRuleId',
        'availabilityRuleId', 'retentionDays', 'maxCount', 'enabledByDefault',
        'characterScoped', 'group', 'priority', 'icon', 'note', 'isDefault'
      ]
    )
    or not value ?& array[
      'id', 'title', 'category', 'resetType', 'resetRuleId', 'maxCount',
      'enabledByDefault', 'characterScoped', 'group', 'priority', 'isDefault'
    ] then
    return false;
  end if;

  return private.is_valid_json_id(value->'id')
    and private.is_valid_json_text(value->'title', 1, 120, true)
    and (not (value ? 'description') or private.is_valid_json_text(value->'description', 0, 500))
    and private.is_valid_json_enum(value->'category', array['daily', 'weekly', 'custom'])
    and private.is_valid_json_enum(value->'resetType', array['daily', 'weekly', 'eighteenHours', 'manual'])
    and private.is_valid_json_enum(value->'resetRuleId', reset_rule_ids)
    and (not (value ? 'availabilityRuleId') or private.is_valid_json_enum(value->'availabilityRuleId', reset_rule_ids))
    and (not (value ? 'retentionDays') or private.is_valid_json_integer(value->'retentionDays', 1, 3650))
    and private.is_valid_json_integer(value->'maxCount', 1, 1000000)
    and jsonb_typeof(value->'enabledByDefault') = 'boolean'
    and jsonb_typeof(value->'characterScoped') = 'boolean'
    and private.is_valid_json_enum(value->'group', task_groups)
    and private.is_valid_json_integer(value->'priority', 0, 1000000)
    and (not (value ? 'icon') or private.is_valid_json_text(value->'icon', 0, 80))
    and (not (value ? 'note') or private.is_valid_json_text(value->'note', 0, 1000))
    and value->'isDefault' = 'false'::jsonb;
end;
$$;

create or replace function private.is_valid_dday_event(value jsonb)
returns boolean
language plpgsql
immutable
strict
set search_path = ''
as $$
begin
  if jsonb_typeof(value) <> 'object'
    or not private.has_allowed_json_keys(value, array['id', 'title', 'date', 'characterId'])
    or not value ?& array['id', 'title', 'date'] then
    return false;
  end if;

  return private.is_valid_json_id(value->'id')
    and private.is_valid_json_text(value->'title', 1, 120, true)
    and private.is_valid_json_date_key(value->'date')
    and (not (value ? 'characterId') or private.is_valid_json_id(value->'characterId'));
end;
$$;

create or replace function private.is_valid_progress(value jsonb)
returns boolean
language plpgsql
immutable
strict
set search_path = ''
as $$
begin
  return jsonb_typeof(value) = 'object'
    and private.has_exact_json_keys(value, array['total', 'completed', 'percent'])
    and private.is_valid_json_integer(value->'total', 0, 5000)
    and private.is_valid_json_integer(value->'completed', 0, 5000)
    and private.is_valid_json_integer(value->'percent', 0, 100);
end;
$$;

create or replace function private.is_valid_history_task(value jsonb)
returns boolean
language plpgsql
immutable
strict
set search_path = ''
as $$
begin
  if jsonb_typeof(value) <> 'object'
    or not private.has_allowed_json_keys(
      value,
      array['id', 'title', 'category', 'group', 'resetType', 'resetRuleId', 'maxCount', 'count', 'completed']
    )
    or not value ?& array['id', 'title', 'category', 'group', 'resetType', 'maxCount', 'count', 'completed'] then
    return false;
  end if;

  return private.is_valid_json_id(value->'id')
    and private.is_valid_json_text(value->'title', 1, 120, true)
    and private.is_valid_json_enum(value->'category', array['daily', 'weekly', 'custom'])
    and private.is_valid_json_enum(value->'group', array[
      'roulette', 'delivery', 'combat', 'pvp', 'housing', 'lifestyle', 'event', 'custom'
    ])
    and private.is_valid_json_enum(value->'resetType', array['daily', 'weekly', 'eighteenHours', 'manual'])
    and (not (value ? 'resetRuleId') or private.is_valid_json_enum(value->'resetRuleId', array[
      'daily-midnight', 'daily-0500', 'daily-1700', 'weekly-tue-1700',
      'weekly-fri-1700', 'weekly-sat-2100', 'interval-18h', 'manual'
    ]))
    and private.is_valid_json_integer(value->'maxCount', 1, 1000000)
    and private.is_valid_json_integer(value->'count', 0, 1000000)
    and jsonb_typeof(value->'completed') = 'boolean';
end;
$$;

create or replace function private.is_valid_history_character(value jsonb)
returns boolean
language plpgsql
immutable
strict
set search_path = ''
as $$
declare
  array_item jsonb;
begin
  if jsonb_typeof(value) <> 'object'
    or not private.has_exact_json_keys(value, array['character', 'tasks', 'memo', 'progress', 'ddayEvents'])
    or jsonb_typeof(value->'character') <> 'object'
    or not private.has_exact_json_keys(value->'character', array['id', 'name', 'server', 'isMain'])
    or not private.is_valid_json_array(value->'tasks', 1000)
    or not private.is_valid_json_array(value->'ddayEvents', 200) then
    return false;
  end if;

  if not private.is_valid_json_id(value->'character'->'id')
    or not private.is_valid_json_text(value->'character'->'name', 1, 40, true)
    or not private.is_valid_json_text(value->'character'->'server', 0, 80)
    or jsonb_typeof(value->'character'->'isMain') <> 'boolean'
    or not private.is_valid_json_text(value->'memo', 0, 16000)
    or jsonb_typeof(value->'progress') <> 'object'
    or not private.has_exact_json_keys(value->'progress', array['daily', 'weekly', 'other', 'total'])
    or not private.is_valid_progress(value->'progress'->'daily')
    or not private.is_valid_progress(value->'progress'->'weekly')
    or not private.is_valid_progress(value->'progress'->'other')
    or not private.is_valid_progress(value->'progress'->'total') then
    return false;
  end if;

  for array_item in select task_value from jsonb_array_elements(value->'tasks') as entry(task_value)
  loop
    if not private.is_valid_history_task(array_item) then
      return false;
    end if;
  end loop;

  for array_item in select event_value from jsonb_array_elements(value->'ddayEvents') as entry(event_value)
  loop
    if not private.is_valid_dday_event(array_item) then
      return false;
    end if;
  end loop;

  return true;
end;
$$;

create or replace function private.is_valid_history_day(value jsonb)
returns boolean
language plpgsql
immutable
strict
set search_path = ''
as $$
declare
  record_item record;
begin
  if jsonb_typeof(value) <> 'object'
    or not private.has_exact_json_keys(value, array['date', 'capturedAt', 'characters'])
    or not private.is_valid_json_date_key(value->'date')
    or not private.is_valid_json_timestamp(value->'capturedAt')
    or not private.is_valid_json_record(value->'characters', 50) then
    return false;
  end if;

  for record_item in select key, character_value from jsonb_each(value->'characters') as entry(key, character_value)
  loop
    if not private.is_valid_history_character(record_item.character_value) then
      return false;
    end if;
  end loop;

  return true;
end;
$$;

create or replace function private.is_valid_document_payload(
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
declare
  record_item record;
  nested_item record;
  array_item jsonb;
begin
  if schema_version <> 1 or jsonb_typeof(payload) <> 'object' then
    return false;
  end if;

  case document_type
    when 'characters' then
      if octet_length(payload::text) > 65536
        or not private.has_exact_json_keys(payload, array['characters', 'activeCharacterId'])
        or not private.is_valid_json_array(payload->'characters', 50)
        or jsonb_array_length(payload->'characters') < 1
        or not private.is_valid_json_id(payload->'activeCharacterId') then
        return false;
      end if;

      for array_item in select value from jsonb_array_elements(payload->'characters') as entry(value)
      loop
        if jsonb_typeof(array_item) <> 'object'
          or not private.has_allowed_json_keys(array_item, array['id', 'name', 'server', 'isMain', 'profileImageId'])
          or not array_item ?& array['id', 'name', 'server', 'isMain']
          or not private.is_valid_json_id(array_item->'id')
          or not private.is_valid_json_text(array_item->'name', 1, 40, true)
          or not private.is_valid_json_text(array_item->'server', 1, 80, true)
          or jsonb_typeof(array_item->'isMain') <> 'boolean'
          or (array_item ? 'profileImageId' and not private.is_valid_json_text(array_item->'profileImageId', 0, 256)) then
          return false;
        end if;
      end loop;

      if (
        select count(distinct character_value->>'id')
        from jsonb_array_elements(payload->'characters') as entry(character_value)
      ) <> jsonb_array_length(payload->'characters')
        or (
          select count(*)
          from jsonb_array_elements(payload->'characters') as entry(character_value)
          where character_value->'isMain' = 'true'::jsonb
        ) <> 1
        or not exists (
          select 1
          from jsonb_array_elements(payload->'characters') as entry(character_value)
          where character_value->>'id' = payload->>'activeCharacterId'
        ) then
        return false;
      end if;

      return true;

    when 'tasks' then
      if octet_length(payload::text) > 524288
        or not private.has_exact_json_keys(
          payload,
          array[
            'completedByCharacter', 'completedAtByCharacter', 'customTaskTemplatesByCharacter',
            'disabledDefaultTaskIdsByCharacter', 'dailyResetKey', 'weeklyResetKey', 'resetKeysByRule'
          ]
        )
        or not private.is_valid_json_record(payload->'completedByCharacter', 50)
        or not private.is_valid_json_record(payload->'completedAtByCharacter', 50)
        or not private.is_valid_json_record(payload->'customTaskTemplatesByCharacter', 50)
        or not private.is_valid_json_record(payload->'disabledDefaultTaskIdsByCharacter', 50)
        or not private.is_valid_json_text(payload->'dailyResetKey', 0, 80)
        or not private.is_valid_json_text(payload->'weeklyResetKey', 0, 80)
        or not private.has_allowed_json_keys(payload->'resetKeysByRule', array[
          'daily-midnight', 'daily-0500', 'daily-1700', 'weekly-tue-1700',
          'weekly-fri-1700', 'weekly-sat-2100', 'interval-18h', 'manual'
        ]) then
        return false;
      end if;

      for record_item in select key, value from jsonb_each(payload->'completedByCharacter') as entry(key, value)
      loop
        if not private.is_valid_json_record(record_item.value, 1000) then
          return false;
        end if;

        for nested_item in select key, value from jsonb_each(record_item.value) as entry(key, value)
        loop
          if jsonb_typeof(nested_item.value) <> 'boolean'
            and not private.is_valid_json_integer(nested_item.value, 0, 1000000) then
            return false;
          end if;
        end loop;
      end loop;

      for record_item in select key, value from jsonb_each(payload->'completedAtByCharacter') as entry(key, value)
      loop
        if not private.is_valid_json_record(record_item.value, 1000) then
          return false;
        end if;

        for nested_item in select key, value from jsonb_each(record_item.value) as entry(key, value)
        loop
          if not private.is_valid_json_timestamp(nested_item.value) then
            return false;
          end if;
        end loop;
      end loop;

      for record_item in select key, value from jsonb_each(payload->'customTaskTemplatesByCharacter') as entry(key, value)
      loop
        if not private.is_valid_json_array(record_item.value, 500) then
          return false;
        end if;

        for array_item in select value from jsonb_array_elements(record_item.value) as entry(value)
        loop
          if not private.is_valid_task_template(array_item) then
            return false;
          end if;
        end loop;
      end loop;

      for record_item in select key, value from jsonb_each(payload->'disabledDefaultTaskIdsByCharacter') as entry(key, value)
      loop
        if not private.is_valid_json_array(record_item.value, 1000) then
          return false;
        end if;

        for array_item in select value from jsonb_array_elements(record_item.value) as entry(value)
        loop
          if not private.is_valid_json_id(array_item) then
            return false;
          end if;
        end loop;
      end loop;

      for record_item in select key, value from jsonb_each(payload->'resetKeysByRule') as entry(key, value)
      loop
        if not private.is_valid_json_text(record_item.value, 0, 80) then
          return false;
        end if;
      end loop;

      return true;

    when 'dday' then
      if octet_length(payload::text) > 131072
        or not private.has_exact_json_keys(payload, array['eventsByCharacter'])
        or not private.is_valid_json_record(payload->'eventsByCharacter', 50) then
        return false;
      end if;

      for record_item in select key, value from jsonb_each(payload->'eventsByCharacter') as entry(key, value)
      loop
        if not private.is_valid_json_array(record_item.value, 200) then
          return false;
        end if;

        for array_item in select value from jsonb_array_elements(record_item.value) as entry(value)
        loop
          if not private.is_valid_dday_event(array_item) then
            return false;
          end if;
        end loop;
      end loop;

      return true;

    when 'memo' then
      if octet_length(payload::text) > 131072
        or not private.has_exact_json_keys(payload, array['memosByCharacter'])
        or not private.is_valid_json_record(payload->'memosByCharacter', 50) then
        return false;
      end if;

      for record_item in select key, value from jsonb_each(payload->'memosByCharacter') as entry(key, value)
      loop
        if not private.is_valid_json_text(record_item.value, 0, 16000) then
          return false;
        end if;
      end loop;

      return true;

    when 'allowance' then
      return octet_length(payload::text) <= 4096
        and private.has_exact_json_keys(payload, array['value', 'lastAccrualKey'])
        and private.is_valid_json_integer(payload->'value', 0, 100)
        and private.is_valid_json_text(payload->'lastAccrualKey', 0, 80);

    when 'history' then
      if octet_length(payload::text) > 2097152
        or not private.has_exact_json_keys(payload, array['entriesByDate'])
        or not private.is_valid_json_record(payload->'entriesByDate', 400) then
        return false;
      end if;

      for record_item in select key, value from jsonb_each(payload->'entriesByDate') as entry(key, value)
      loop
        if not private.is_valid_history_day(record_item.value) then
          return false;
        end if;
      end loop;

      return true;

    else
      return false;
  end case;
end;
$$;

revoke all on function private.is_valid_json_id(jsonb) from public, anon, authenticated;
revoke all on function private.is_valid_json_text(jsonb, integer, integer, boolean) from public, anon, authenticated;
revoke all on function private.is_valid_json_enum(jsonb, text[]) from public, anon, authenticated;
revoke all on function private.is_valid_json_integer(jsonb, numeric, numeric) from public, anon, authenticated;
revoke all on function private.is_valid_json_date_key(jsonb) from public, anon, authenticated;
revoke all on function private.is_valid_json_timestamp(jsonb) from public, anon, authenticated;
revoke all on function private.has_allowed_json_keys(jsonb, text[]) from public, anon, authenticated;
revoke all on function private.is_valid_json_array(jsonb, integer) from public, anon, authenticated;
revoke all on function private.is_valid_json_record(jsonb, integer) from public, anon, authenticated;
revoke all on function private.is_valid_task_template(jsonb) from public, anon, authenticated;
revoke all on function private.is_valid_dday_event(jsonb) from public, anon, authenticated;
revoke all on function private.is_valid_progress(jsonb) from public, anon, authenticated;
revoke all on function private.is_valid_history_task(jsonb) from public, anon, authenticated;
revoke all on function private.is_valid_history_character(jsonb) from public, anon, authenticated;
revoke all on function private.is_valid_history_day(jsonb) from public, anon, authenticated;
revoke all on function private.is_valid_document_payload(text, integer, jsonb)
  from public, anon;
grant execute on function private.is_valid_document_payload(text, integer, jsonb)
  to authenticated;
