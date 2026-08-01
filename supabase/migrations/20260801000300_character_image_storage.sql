insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'character-images',
  'character-images',
  false,
  524288,
  array['image/webp', 'image/jpeg', 'image/png']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

create policy character_images_select_own_path
on storage.objects
for select
to authenticated
using (
  bucket_id = 'character-images'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
);

create policy character_images_delete_own_path
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'character-images'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
);

-- No INSERT or UPDATE policy is created. Uploads must pass through the
-- validating Edge Function, which writes to a server-selected owned path.
