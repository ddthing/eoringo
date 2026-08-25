begin;

select plan(2);

select has_index(
  'private',
  'secure_operations',
  'secure_operations_related_user_id_idx',
  'secure_operations related_user_id has a covering index'
);

select has_index(
  'public',
  'user_documents',
  'user_documents_character_id_user_id_idx',
  'user_documents character_id and user_id have a covering index'
);

select * from finish();

rollback;
