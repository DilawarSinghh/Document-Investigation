-- Storage: private, per-user bucket for document uploads.
-- Files are stored at <user_id>/<workspace_id>/<filename> so the
-- foldername check in the RLS policy isolates every user.
-- The app reads document text from the DB (RLS-protected), never via
-- public storage URLs.

insert into storage.buckets (id, name, public)
values ('documents', 'documents', false)
on conflict (id) do nothing;

drop policy if exists "user docs isolated" on storage.objects;
create policy "user docs isolated" on storage.objects
  for all
  using (
    bucket_id = 'documents'
    and auth.uid()::text = (storage.foldername(name))[1]
  )
  with check (
    bucket_id = 'documents'
    and auth.uid()::text = (storage.foldername(name))[1]
  );
