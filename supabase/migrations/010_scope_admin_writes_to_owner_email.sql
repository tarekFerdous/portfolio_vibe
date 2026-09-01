-- Scope write access to the site owner's email instead of any authenticated user.
-- This literal must stay in sync with the ADMIN_EMAIL env var used by application code
-- (middleware.ts) since Postgres RLS policies can't read Next.js environment variables.

drop policy if exists "Auth write intro" on intro;
drop policy if exists "Auth write intro_covers" on intro_covers;
drop policy if exists "Auth write projects" on projects;
drop policy if exists "Auth write blogs" on blogs;
drop policy if exists "Auth write blog_blocks" on blog_blocks;
drop policy if exists "Auth write contacts" on contacts;

create policy "Auth write intro" on intro for all
  using (auth.jwt() ->> 'email' = 'tarekferdous3@gmail.com');
create policy "Auth write intro_covers" on intro_covers for all
  using (auth.jwt() ->> 'email' = 'tarekferdous3@gmail.com');
create policy "Auth write projects" on projects for all
  using (auth.jwt() ->> 'email' = 'tarekferdous3@gmail.com');
create policy "Auth write blogs" on blogs for all
  using (auth.jwt() ->> 'email' = 'tarekferdous3@gmail.com');
create policy "Auth write blog_blocks" on blog_blocks for all
  using (auth.jwt() ->> 'email' = 'tarekferdous3@gmail.com');
create policy "Auth write contacts" on contacts for all
  using (auth.jwt() ->> 'email' = 'tarekferdous3@gmail.com');
