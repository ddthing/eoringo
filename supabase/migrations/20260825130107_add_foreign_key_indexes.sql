-- Keep parent deletes and referential checks from scanning the child tables.
create index secure_operations_related_user_id_idx
  on private.secure_operations (related_user_id);

create index user_documents_character_id_user_id_idx
  on public.user_documents (character_id, user_id);

drop index if exists public.user_documents_character_id_idx;
