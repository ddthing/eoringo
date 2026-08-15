create table private.character_image_quota (
  user_id uuid primary key references auth.users(id) on delete cascade,
  initialized boolean not null default false,
  created_at timestamptz not null default now()
);

create table private.character_image_quota_items (
  user_id uuid not null references auth.users(id) on delete cascade,
  image_id text not null
    check (image_id ~ '^character-image-[a-z0-9-]{1,108}$'),
  byte_size integer not null check (byte_size between 1 and 524288),
  primary key (user_id, image_id)
);

create table private.character_image_upload_reservations (
  reservation_id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  image_id text not null
    check (image_id ~ '^character-image-[a-z0-9-]{1,108}$'),
  new_byte_size integer not null check (new_byte_size between 1 and 524288),
  previous_byte_size integer check (previous_byte_size between 1 and 524288),
  expires_at timestamptz not null default (now() + interval '10 minutes'),
  created_at timestamptz not null default now()
);

create unique index character_image_upload_reservations_active_image_idx
  on private.character_image_upload_reservations (user_id, image_id);
create index character_image_upload_reservations_expiry_idx
  on private.character_image_upload_reservations (user_id, expires_at);

alter table private.character_image_quota enable row level security;
alter table private.character_image_quota force row level security;
alter table private.character_image_quota_items enable row level security;
alter table private.character_image_quota_items force row level security;
alter table private.character_image_upload_reservations enable row level security;
alter table private.character_image_upload_reservations force row level security;

revoke all on table private.character_image_quota from public, anon, authenticated;
revoke all on table private.character_image_quota_items from public, anon, authenticated;
revoke all on table private.character_image_upload_reservations from public, anon, authenticated;

create function private.validate_character_image_object_list(p_objects jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  object_item jsonb;
  object_bytes numeric;
begin
  if p_objects is null or jsonb_typeof(p_objects) <> 'array' then
    raise exception 'invalid character image object list' using errcode = '22023';
  end if;

  if jsonb_array_length(p_objects) > 51 then
    raise exception 'invalid character image object list' using errcode = '22023';
  end if;

  for object_item in
    select value
    from jsonb_array_elements(p_objects) as entry(value)
  loop
    if jsonb_typeof(object_item) <> 'object'
      or not (object_item ? 'imageId')
      or not (object_item ? 'bytes')
      or (select count(*) from jsonb_object_keys(object_item)) <> 2
      or (object_item->>'imageId') is null
      or (object_item->>'bytes') is null
      or (object_item->>'imageId') !~ '^character-image-[a-z0-9-]{1,108}$'
      or (object_item->>'bytes') !~ '^[0-9]+$' then
      raise exception 'invalid character image object list' using errcode = '22023';
    end if;

    object_bytes := (object_item->>'bytes')::numeric;

    if object_bytes <> trunc(object_bytes)
      or object_bytes < 1
      or object_bytes > 524288 then
      raise exception 'invalid character image object list' using errcode = '22023';
    end if;
  end loop;

  if (
    select count(*)
    from jsonb_array_elements(p_objects) as entry(value)
  ) <> (
    select count(distinct value->>'imageId')
    from jsonb_array_elements(p_objects) as entry(value)
  ) then
    raise exception 'duplicate character image object' using errcode = '22023';
  end if;
end;
$$;

create function private.character_image_object_size(
  p_objects jsonb,
  p_image_id text
)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select (entry.value->>'bytes')::integer
  from jsonb_array_elements(p_objects) as entry(value)
  where entry.value->>'imageId' = p_image_id
  limit 1;
$$;

create function public.reserve_character_image_upload(
  p_user_id uuid,
  p_image_id text,
  p_byte_size integer,
  p_existing_objects jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  quota_row private.character_image_quota%rowtype;
  reservation_row private.character_image_upload_reservations%rowtype;
  object_item jsonb;
  object_size integer;
  committed_count bigint;
  committed_bytes bigint;
  reserved_count bigint;
  reserved_bytes bigint;
  current_item_bytes integer;
  projected_count bigint;
  projected_bytes bigint;
begin
  if p_user_id is null
    or not exists (
      select 1
      from auth.users
      where id = p_user_id
        and coalesce(is_anonymous, false) = false
    ) then
    return jsonb_build_object('ok', false, 'code', 'invalid_user');
  end if;

  if p_image_id is null
    or p_image_id !~ '^character-image-[a-z0-9-]{1,108}$'
    or p_byte_size is null
    or p_byte_size < 1
    or p_byte_size > 524288 then
    return jsonb_build_object('ok', false, 'code', 'invalid_request');
  end if;

  perform private.validate_character_image_object_list(p_existing_objects);

  insert into private.character_image_quota (user_id)
  values (p_user_id)
  on conflict (user_id) do nothing;

  select *
  into quota_row
  from private.character_image_quota
  where user_id = p_user_id
  for update;

  -- A crashed Edge Function may leave a reservation behind. Reconcile it
  -- conservatively from the fresh Storage listing before releasing the lease.
  for reservation_row in
    select *
    from private.character_image_upload_reservations
    where user_id = p_user_id
      and expires_at <= now()
    order by expires_at, reservation_id
    for update
  loop
    object_size := private.character_image_object_size(
      p_existing_objects,
      reservation_row.image_id
    );

    if object_size is not null then
      insert into private.character_image_quota_items (user_id, image_id, byte_size)
      values (p_user_id, reservation_row.image_id, object_size)
      on conflict (user_id, image_id) do update
      set byte_size = excluded.byte_size;
    elsif reservation_row.previous_byte_size is null then
      -- The upload may have completed after the caller's listing. Keeping a
      -- conservative item prevents a retry from exceeding the hard quota.
      insert into private.character_image_quota_items (user_id, image_id, byte_size)
      values (p_user_id, reservation_row.image_id, reservation_row.new_byte_size)
      on conflict (user_id, image_id) do update
      set byte_size = greatest(
        private.character_image_quota_items.byte_size,
        excluded.byte_size
      );
    end if;

    delete from private.character_image_upload_reservations
    where reservation_id = reservation_row.reservation_id;
  end loop;

  if not quota_row.initialized then
    for object_item in
      select value
      from jsonb_array_elements(p_existing_objects) as entry(value)
    loop
      insert into private.character_image_quota_items (user_id, image_id, byte_size)
      values (
        p_user_id,
        object_item->>'imageId',
        (object_item->>'bytes')::integer
      );
    end loop;

    update private.character_image_quota
    set initialized = true
    where user_id = p_user_id;
  end if;

  if exists (
    select 1
    from private.character_image_upload_reservations
    where user_id = p_user_id
      and image_id = p_image_id
  ) then
    return jsonb_build_object('ok', false, 'code', 'image_upload_in_progress');
  end if;

  select count(*), coalesce(sum(byte_size), 0)
  into committed_count, committed_bytes
  from private.character_image_quota_items
  where user_id = p_user_id;

  select
    coalesce(sum(case when previous_byte_size is null then 1 else 0 end), 0),
    coalesce(sum(new_byte_size - coalesce(previous_byte_size, 0)), 0)
  into reserved_count, reserved_bytes
  from private.character_image_upload_reservations
  where user_id = p_user_id;

  select byte_size
  into current_item_bytes
  from private.character_image_quota_items
  where user_id = p_user_id
    and image_id = p_image_id;

  projected_count := committed_count
    + reserved_count
    + case when current_item_bytes is null then 1 else 0 end;
  projected_bytes := committed_bytes
    + reserved_bytes
    - coalesce(current_item_bytes, 0)
    + p_byte_size;

  if projected_count > 50 or projected_bytes > 10485760 then
    return jsonb_build_object('ok', false, 'code', 'image_quota');
  end if;

  insert into private.character_image_upload_reservations (
    user_id,
    image_id,
    new_byte_size,
    previous_byte_size
  )
  values (
    p_user_id,
    p_image_id,
    p_byte_size,
    current_item_bytes
  )
  returning * into reservation_row;

  return jsonb_build_object(
    'ok', true,
    'reservationId', reservation_row.reservation_id,
    'expiresAt', reservation_row.expires_at
  );
end;
$$;

create function public.finalize_character_image_upload(p_reservation_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  reservation_row private.character_image_upload_reservations%rowtype;
begin
  select *
  into reservation_row
  from private.character_image_upload_reservations
  where reservation_id = p_reservation_id;

  if not found then
    return jsonb_build_object('ok', false, 'code', 'reservation_not_found');
  end if;

  perform 1
  from private.character_image_quota
  where user_id = reservation_row.user_id
  for update;

  select *
  into reservation_row
  from private.character_image_upload_reservations
  where reservation_id = p_reservation_id
  for update;

  if not found then
    return jsonb_build_object('ok', false, 'code', 'reservation_not_found');
  end if;

  insert into private.character_image_quota_items (user_id, image_id, byte_size)
  values (
    reservation_row.user_id,
    reservation_row.image_id,
    reservation_row.new_byte_size
  )
  on conflict (user_id, image_id) do update
  set byte_size = excluded.byte_size;

  delete from private.character_image_upload_reservations
  where reservation_id = p_reservation_id;

  return jsonb_build_object('ok', true);
end;
$$;

create function public.release_character_image_upload(p_reservation_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  reservation_user_id uuid;
begin
  select user_id
  into reservation_user_id
  from private.character_image_upload_reservations
  where reservation_id = p_reservation_id;

  if not found then
    return jsonb_build_object('ok', false, 'code', 'reservation_not_found');
  end if;

  perform 1
  from private.character_image_quota
  where user_id = reservation_user_id
  for update;

  delete from private.character_image_upload_reservations
  where reservation_id = p_reservation_id;

  return jsonb_build_object('ok', true);
end;
$$;

revoke all on function private.validate_character_image_object_list(jsonb)
  from public, anon, authenticated;
revoke all on function private.character_image_object_size(jsonb, text)
  from public, anon, authenticated;
revoke all on function public.reserve_character_image_upload(uuid, text, integer, jsonb)
  from public, anon, authenticated;
revoke all on function public.finalize_character_image_upload(uuid)
  from public, anon, authenticated;
revoke all on function public.release_character_image_upload(uuid)
  from public, anon, authenticated;
grant execute on function public.reserve_character_image_upload(uuid, text, integer, jsonb)
  to service_role;
grant execute on function public.finalize_character_image_upload(uuid)
  to service_role;
grant execute on function public.release_character_image_upload(uuid)
  to service_role;
