create schema if not exists private;

revoke all on schema private from public, anon, authenticated;

create table public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  nickname text not null default 'Guest'
    check (char_length(btrim(nickname)) between 1 and 40)
    check (nickname !~ '[[:cntrl:]]'),
  account_state text not null default 'active'
    check (account_state in ('active', 'pending_deletion', 'merged')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.characters (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  client_id text not null
    check (char_length(client_id) between 1 and 128)
    check (client_id not in ('__proto__', 'constructor', 'prototype')),
  name text not null
    check (char_length(btrim(name)) between 1 and 40)
    check (name !~ '[[:cntrl:]]'),
  server text not null
    check (char_length(btrim(server)) between 1 and 80)
    check (server !~ '[[:cntrl:]]'),
  is_main boolean not null default false,
  profile_image_path text
    check (profile_image_path is null or char_length(profile_image_path) <= 512),
  sort_order integer not null default 0 check (sort_order between 0 and 10000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id),
  unique (user_id, client_id)
);

create unique index characters_one_main_per_user
  on public.characters (user_id)
  where is_main;

create index characters_user_id_idx on public.characters (user_id);

create table public.user_documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  character_id uuid,
  document_type text not null
    check (document_type in ('characters', 'tasks', 'dday', 'memo', 'allowance', 'history')),
  payload jsonb not null
    check (jsonb_typeof(payload) = 'object')
    check (octet_length(payload::text) <= 2097152),
  schema_version integer not null check (schema_version between 1 and 1000),
  revision bigint not null default 0 check (revision >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  foreign key (character_id, user_id)
    references public.characters (id, user_id)
    on delete cascade,
  unique nulls not distinct (user_id, character_id, document_type)
);

create index user_documents_user_id_idx on public.user_documents (user_id);
create index user_documents_character_id_idx on public.user_documents (character_id)
  where character_id is not null;
create index user_documents_active_lookup_idx
  on public.user_documents (user_id, document_type)
  where deleted_at is null;

create table private.secure_operations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  related_user_id uuid references auth.users(id) on delete set null,
  operation_type text not null
    check (operation_type in ('migration', 'merge_ticket', 'merge_audit', 'deletion_request')),
  status text not null default 'pending'
    check (status in ('pending', 'completed', 'consumed', 'cancelled', 'expired')),
  token_hash bytea,
  payload jsonb not null default '{}'::jsonb
    check (jsonb_typeof(payload) = 'object')
    check (octet_length(payload::text) <= 65536),
  expires_at timestamptz,
  consumed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index secure_operations_active_token_hash_idx
  on private.secure_operations (token_hash)
  where token_hash is not null and consumed_at is null;
create index secure_operations_expiry_idx on private.secure_operations (expires_at)
  where expires_at is not null;
create index secure_operations_user_idx on private.secure_operations (user_id, operation_type);

create function private.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create function private.bump_document_revision()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.user_id <> old.user_id
    or new.character_id is distinct from old.character_id
    or new.document_type <> old.document_type then
    raise exception 'document identity is immutable' using errcode = '22023';
  end if;

  new.revision = old.revision + 1;
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function private.set_updated_at();

create trigger characters_set_updated_at
before update on public.characters
for each row execute function private.set_updated_at();

create trigger user_documents_bump_revision
before update on public.user_documents
for each row execute function private.bump_document_revision();

create trigger secure_operations_set_updated_at
before update on private.secure_operations
for each row execute function private.set_updated_at();

alter table public.profiles enable row level security;
alter table public.characters enable row level security;
alter table public.user_documents enable row level security;
alter table private.secure_operations enable row level security;
alter table public.profiles force row level security;
alter table public.characters force row level security;
alter table public.user_documents force row level security;
alter table private.secure_operations force row level security;

revoke all on table public.profiles from anon, authenticated;
revoke all on table public.characters from anon, authenticated;
revoke all on table public.user_documents from anon, authenticated;
revoke all on table private.secure_operations from anon, authenticated;

revoke all on all functions in schema private from public, anon, authenticated;
alter default privileges in schema private revoke execute on functions from public, anon, authenticated;

grant usage on schema public to authenticated;
grant select on table public.profiles, public.characters, public.user_documents to authenticated;
grant insert (user_id, nickname) on table public.profiles to authenticated;
grant update (nickname) on table public.profiles to authenticated;
grant insert (id, user_id, client_id, name, server, is_main, profile_image_path, sort_order)
  on table public.characters to authenticated;
grant update (client_id, name, server, is_main, profile_image_path, sort_order)
  on table public.characters to authenticated;
grant delete on table public.characters to authenticated;
grant insert (id, user_id, character_id, document_type, payload, schema_version)
  on table public.user_documents to authenticated;
grant update (payload, schema_version, deleted_at)
  on table public.user_documents to authenticated;
