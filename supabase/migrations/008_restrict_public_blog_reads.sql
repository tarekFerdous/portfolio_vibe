drop policy if exists "Public read published blogs" on blogs;

create policy "Public read published blogs" on blogs for select
  to anon
  using (status = 'published');

create policy "Authenticated read all blogs" on blogs for select
  to authenticated
  using (true);
