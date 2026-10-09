-- Create the post-photos storage bucket to replace blog-photos (PRD #128 / issue #132).
-- Storage buckets can't be renamed in place, so this is a copy-and-cutover:
-- this migration creates the new bucket + policies, scripts/migrate-post-photos-bucket.ts
-- copies the objects and rewrites the DB URLs, and a later migration drops the old
-- blog-photos bucket once that script has been run and verified against the live project.

insert into storage.buckets (id, name, public)
values ('post-photos', 'post-photos', true)
on conflict (id) do nothing;

create policy "Public read post-photos objects" on storage.objects
  for select using (bucket_id = 'post-photos');
create policy "Auth write post-photos objects" on storage.objects
  for all using (bucket_id = 'post-photos' and auth.role() = 'authenticated');
