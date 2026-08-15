-- PostgreSQL does not provide jsonb_object_length(jsonb). Count object keys
-- through the supported set-returning function while preserving the existing
-- recursive payload safety contract.
create or replace function private.is_safe_json_tree(value jsonb, depth integer default 0)
returns boolean
language plpgsql
immutable
strict
set search_path = ''
as $$
declare
  item record;
  value_type text := jsonb_typeof(value);
begin
  if depth > 24 then
    return false;
  end if;

  if value_type = 'object' then
    if (select count(*) from jsonb_object_keys(value)) > 1000 then
      return false;
    end if;

    for item in select key, child from jsonb_each(value) as entry(key, child)
    loop
      if char_length(item.key) > 128
        or item.key in ('__proto__', 'constructor', 'prototype')
        or not private.is_safe_json_tree(item.child, depth + 1) then
        return false;
      end if;
    end loop;

    return true;
  end if;

  if value_type = 'array' then
    if jsonb_array_length(value) > 1000 then
      return false;
    end if;

    return not exists (
      select 1
      from jsonb_array_elements(value) as entry(child)
      where not private.is_safe_json_tree(entry.child, depth + 1)
    );
  end if;

  if value_type = 'string' then
    return char_length(value #>> '{}') <= 16000;
  end if;

  return value_type is distinct from 'null';
end;
$$;

revoke all on function private.is_safe_json_tree(jsonb, integer)
  from public, anon, authenticated;
grant usage on schema private to authenticated;
grant execute on function private.is_safe_json_tree(jsonb, integer)
  to authenticated, service_role;
