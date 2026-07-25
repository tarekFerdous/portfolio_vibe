-- Create storage buckets referenced by lib/actions/images.ts (previously only
-- documented as a comment in 001_initial_schema.sql and never actually run,
-- which is why uploads failed with "bucket not found").
insert into storage.buckets (id, name, public)
values ('intro-covers', 'intro-covers', true)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('project-covers', 'project-covers', true)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('blog-photos', 'blog-photos', true)
on conflict (id) do nothing;

-- Storage RLS: public read, authenticated write, for each bucket.
create policy "Public read intro-covers objects" on storage.objects
  for select using (bucket_id = 'intro-covers');
create policy "Auth write intro-covers objects" on storage.objects
  for all using (bucket_id = 'intro-covers' and auth.role() = 'authenticated');

create policy "Public read project-covers objects" on storage.objects
  for select using (bucket_id = 'project-covers');
create policy "Auth write project-covers objects" on storage.objects
  for all using (bucket_id = 'project-covers' and auth.role() = 'authenticated');

create policy "Public read blog-photos objects" on storage.objects
  for select using (bucket_id = 'blog-photos');
create policy "Auth write blog-photos objects" on storage.objects
  for all using (bucket_id = 'blog-photos' and auth.role() = 'authenticated');
