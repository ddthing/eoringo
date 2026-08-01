create policy profiles_select_own
on public.profiles
for select
to authenticated
using ((select auth.uid()) = user_id);

create policy profiles_insert_own
on public.profiles
for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy profiles_update_own
on public.profiles
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy characters_select_own
on public.characters
for select
to authenticated
using ((select auth.uid()) = user_id);

create policy characters_insert_own
on public.characters
for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy characters_update_own
on public.characters
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy characters_delete_own
on public.characters
for delete
to authenticated
using ((select auth.uid()) = user_id);

create policy user_documents_select_own
on public.user_documents
for select
to authenticated
using ((select auth.uid()) = user_id);

create policy user_documents_insert_own
on public.user_documents
for insert
to authenticated
with check (
  (select auth.uid()) = user_id
  and (
    character_id is null
    or exists (
      select 1
      from public.characters as owned_character
      where owned_character.id = character_id
        and owned_character.user_id = (select auth.uid())
    )
  )
);

create policy user_documents_update_own
on public.user_documents
for update
to authenticated
using ((select auth.uid()) = user_id)
with check (
  (select auth.uid()) = user_id
  and (
    character_id is null
    or exists (
      select 1
      from public.characters as owned_character
      where owned_character.id = character_id
        and owned_character.user_id = (select auth.uid())
    )
  )
);
