begin;

create extension if not exists pgtap with schema extensions;
select plan(8);

select ok(
  exists (select 1 from storage.buckets where id = 'character-images'),
  'private character image bucket exists'
);
select is(
  (select public from storage.buckets where id = 'character-images'),
  false,
  'character image bucket is private'
);
select is(
  (select file_size_limit from storage.buckets where id = 'character-images'),
  524288::bigint,
  'character image bucket enforces 512 KiB files'
);
select is(
  (select allowed_mime_types from storage.buckets where id = 'character-images'),
  array['image/webp', 'image/jpeg', 'image/png']::text[],
  'character image bucket allowlists image MIME types'
);
select is(
  (select count(*) from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname like 'character_images_%'),
  2::bigint,
  'exactly two character image policies exist'
);
select ok(
  exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'character_images_select_own_path'
      and cmd = 'SELECT'
      and roles = array['authenticated']::name[]
  ),
  'authenticated users can select only through the owned-path policy'
);
select ok(
  exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'character_images_delete_own_path'
      and cmd = 'DELETE'
      and roles = array['authenticated']::name[]
  ),
  'authenticated users can delete only through the owned-path policy'
);
select is(
  (
    select count(*)
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname like 'character_images_%'
      and cmd in ('INSERT', 'UPDATE')
  ),
  0::bigint,
  'direct client image insert and update remain denied'
);

select * from finish();
rollback;
