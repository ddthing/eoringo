-- Applied to the hosted project as migration 20260809191048.
create function private.is_safe_json_tree(value jsonb, depth integer default 0)
returns boolean
language plpgsql
immutable
strict
security definer
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
grant execute on function private.is_safe_json_tree(jsonb, integer)
  to authenticated, service_role;

alter table public.user_documents
  add constraint user_documents_payload_safety_check
  check (private.is_safe_json_tree(payload));

alter table public.characters
  drop constraint if exists characters_profile_image_path_check;

alter table public.characters
  add constraint characters_profile_image_path_safe_check
  check (
    profile_image_path is null
    or profile_image_path ~ '^character-image-[a-z0-9-]{1,108}$'
  );

create function private.sync_character_image_reference()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.document_type = 'characters' then
    update public.characters as character_row
    set profile_image_path = nullif(character_item.value->>'profileImageId', '')
    from jsonb_array_elements(new.payload->'characters') as character_item(value)
    where character_row.user_id = new.user_id
      and character_row.client_id = character_item.value->>'id';
  end if;

  return new;
end;
$$;

revoke all on function private.sync_character_image_reference()
  from public, anon;
grant execute on function private.sync_character_image_reference()
  to authenticated, service_role;

create trigger user_documents_sync_character_image_reference
after insert or update of payload on public.user_documents
for each row execute function private.sync_character_image_reference();

do $$
begin
  if to_regprocedure('public.rls_auto_enable()') is not null then
    execute 'revoke all on function public.rls_auto_enable() from public, anon, authenticated';
  end if;
end;
$$;
