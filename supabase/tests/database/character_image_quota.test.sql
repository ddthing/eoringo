begin;

create extension if not exists pgtap with schema extensions;
select plan(26);

select ok(
  (select relrowsecurity and relforcerowsecurity
   from pg_class
   where oid = 'private.character_image_quota'::regclass),
  'character image quota state is protected by forced RLS'
);
select ok(
  (select relrowsecurity and relforcerowsecurity
   from pg_class
   where oid = 'private.character_image_upload_reservations'::regclass),
  'character image reservations are protected by forced RLS'
);
select ok(
  not has_function_privilege(
    'authenticated',
    'public.reserve_character_image_upload(uuid, text, integer, jsonb)',
    'EXECUTE'
  ),
  'browser clients cannot reserve image quota directly'
);
select ok(
  has_function_privilege(
    'service_role',
    'public.reserve_character_image_upload(uuid, text, integer, jsonb)',
    'EXECUTE'
  ),
  'the Edge Function service role can reserve image quota'
);
select ok(
  not has_function_privilege(
    'authenticated',
    'public.finalize_character_image_upload(uuid)',
    'EXECUTE'
  ),
  'browser clients cannot finalize image quota directly'
);
select ok(
  has_function_privilege(
    'service_role',
    'public.release_character_image_upload(uuid)',
    'EXECUTE'
  ),
  'the Edge Function service role can release image quota'
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
) values
  (
    '00000000-0000-4000-8000-000000000020',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'quota-one@example.test',
    false,
    now(),
    now()
  ),
  (
    '00000000-0000-4000-8000-000000000021',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'quota-two@example.test',
    false,
    now(),
    now()
  ),
  (
    '00000000-0000-4000-8000-000000000022',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'quota-three@example.test',
    false,
    now(),
    now()
  );

create temporary table quota_fixture (
  fixture_name text primary key,
  user_id uuid not null,
  existing_objects jsonb not null
) on commit drop;

insert into quota_fixture (fixture_name, user_id, existing_objects)
values
  ('one', '00000000-0000-4000-8000-000000000020', '[]'::jsonb),
  (
    'two',
    '00000000-0000-4000-8000-000000000021',
    (
      select jsonb_agg(
        jsonb_build_object(
          'imageId', 'character-image-item-' || image_number,
          'bytes', 200000
        )
        order by image_number
      )
      from generate_series(1, 50) as item(image_number)
    )
  ),
  (
    'three',
    '00000000-0000-4000-8000-000000000022',
    (
      select jsonb_agg(
        jsonb_build_object(
          'imageId', 'character-image-item-' || image_number,
          'bytes', 200000
        )
        order by image_number
      )
      from generate_series(1, 49) as item(image_number)
    )
  );

create temporary table quota_reservations (
  reservation_name text primary key,
  reservation_id uuid not null
) on commit drop;

insert into quota_reservations (reservation_name, reservation_id)
select
  'initial',
  (public.reserve_character_image_upload(
    '00000000-0000-4000-8000-000000000020',
    'character-image-alpha',
    400000,
    (select existing_objects from quota_fixture where fixture_name = 'one')
  )->>'reservationId')::uuid;

select is(
  (select (public.reserve_character_image_upload(
    '00000000-0000-4000-8000-000000000020',
    'character-image-alpha',
    400000,
    (select existing_objects from quota_fixture where fixture_name = 'one')
  )->>'code')),
  'image_upload_in_progress',
  'a second upload for the same image cannot overlap the first reservation'
);

select is(
  (public.release_character_image_upload(
    (select reservation_id from quota_reservations where reservation_name = 'initial')
  )->>'ok')::boolean,
  true,
  'a failed upload can release its reservation'
);

insert into quota_reservations (reservation_name, reservation_id)
select
  'after-release',
  (public.reserve_character_image_upload(
    '00000000-0000-4000-8000-000000000020',
    'character-image-alpha',
    400000,
    (select existing_objects from quota_fixture where fixture_name = 'one')
  )->>'reservationId')::uuid;

select is(
  (public.finalize_character_image_upload(
    (select reservation_id from quota_reservations where reservation_name = 'after-release')
  )->>'ok')::boolean,
  true,
  'a successful upload finalizes its reservation'
);
select is(
  (select count(*) from private.character_image_quota_items
   where user_id = '00000000-0000-4000-8000-000000000020'),
  1::bigint,
  'finalizing a new image records one quota item'
);
select is(
  (select sum(byte_size) from private.character_image_quota_items
   where user_id = '00000000-0000-4000-8000-000000000020'),
  400000::bigint,
  'finalizing a new image records its byte size'
);

insert into quota_reservations (reservation_name, reservation_id)
select
  'replacement',
  (public.reserve_character_image_upload(
    '00000000-0000-4000-8000-000000000020',
    'character-image-alpha',
    500000,
    (select existing_objects from quota_fixture where fixture_name = 'one')
  )->>'reservationId')::uuid;

select is(
  (
    with reservation as (
      select (public.reserve_character_image_upload(
        '00000000-0000-4000-8000-000000000020',
        'character-image-beta',
        500000,
        (select existing_objects from quota_fixture where fixture_name = 'one')
      )->>'reservationId')::uuid as reservation_id
    ),
    released as (
      select public.release_character_image_upload(reservation_id) as result
      from reservation
    )
    select (result->>'ok')::boolean from released
  ),
  true,
  'a second image reservation is accounted for and can be released'
);

select is(
  (public.finalize_character_image_upload(
    (select reservation_id from quota_reservations where reservation_name = 'replacement')
  )->>'ok')::boolean,
  true,
  'a replacement reservation can be finalized'
);
select is(
  (select count(*) from private.character_image_quota_items
   where user_id = '00000000-0000-4000-8000-000000000020'),
  1::bigint,
  'replacing an image does not consume an additional image slot'
);
select is(
  (select sum(byte_size) from private.character_image_quota_items
   where user_id = '00000000-0000-4000-8000-000000000020'),
  500000::bigint,
  'replacing an image updates its byte budget atomically'
);

select is(
  (public.reserve_character_image_upload(
    '00000000-0000-4000-8000-000000000021',
    'character-image-new',
    1000,
    (select existing_objects from quota_fixture where fixture_name = 'two')
  )->>'code'),
  'image_quota',
  'a full image count and byte quota reject a new image'
);
select is(
  (select count(*) from private.character_image_quota_items
   where user_id = '00000000-0000-4000-8000-000000000021'),
  50::bigint,
  'quota rejection still initializes all existing image records'
);

insert into quota_reservations (reservation_name, reservation_id)
select
  'full-replacement',
  (public.reserve_character_image_upload(
    '00000000-0000-4000-8000-000000000021',
    'character-image-item-1',
    100000,
    (select existing_objects from quota_fixture where fixture_name = 'two')
  )->>'reservationId')::uuid;
select is(
  (public.finalize_character_image_upload(
    (select reservation_id from quota_reservations where reservation_name = 'full-replacement')
  )->>'ok')::boolean,
  true,
  'a replacement can free bytes while the image count is full'
);
select is(
  (select count(*) from private.character_image_quota_items
   where user_id = '00000000-0000-4000-8000-000000000021'),
  50::bigint,
  'a full-quota replacement keeps the image count stable'
);
select is(
  (select sum(byte_size) from private.character_image_quota_items
   where user_id = '00000000-0000-4000-8000-000000000021'),
  9900000::bigint,
  'a full-quota replacement updates the aggregate byte total'
);

insert into quota_reservations (reservation_name, reservation_id)
select
  'concurrent-first',
  (public.reserve_character_image_upload(
    '00000000-0000-4000-8000-000000000022',
    'character-image-concurrent-a',
    200000,
    (select existing_objects from quota_fixture where fixture_name = 'three')
  )->>'reservationId')::uuid;

select is(
  (select (public.reserve_character_image_upload(
    '00000000-0000-4000-8000-000000000022',
    'character-image-concurrent-b',
    200000,
    (select existing_objects from quota_fixture where fixture_name = 'three')
  )->>'code')),
  'image_quota',
  'a second concurrent-sized reservation cannot cross the byte quota'
);

select is(
  (public.release_character_image_upload(
    (select reservation_id from quota_reservations where reservation_name = 'concurrent-first')
  )->>'ok')::boolean,
  true,
  'releasing the first reservation restores available quota'
);

insert into quota_reservations (reservation_name, reservation_id)
select
  'concurrent-after-release',
  (public.reserve_character_image_upload(
    '00000000-0000-4000-8000-000000000022',
    'character-image-concurrent-b',
    200000,
    (select existing_objects from quota_fixture where fixture_name = 'three')
  )->>'reservationId')::uuid;
select is(
  (public.finalize_character_image_upload(
    (select reservation_id from quota_reservations where reservation_name = 'concurrent-after-release')
  )->>'ok')::boolean,
  true,
  'the second upload succeeds after the first reservation is released'
);
select is(
  (select count(*) from private.character_image_quota_items
   where user_id = '00000000-0000-4000-8000-000000000022'),
  50::bigint,
  'serialized reservations keep the final image count bounded'
);
select is(
  (select count(*) from private.character_image_upload_reservations),
  0::bigint,
  'successful and failed upload paths do not leak active reservations'
);

select is(
  (public.release_character_image_upload(gen_random_uuid())->>'code'),
  'reservation_not_found',
  'releasing an unknown reservation is harmless and explicit'
);

select * from finish();
rollback;
