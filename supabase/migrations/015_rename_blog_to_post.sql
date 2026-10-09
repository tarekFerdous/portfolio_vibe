-- Rename the admin "blog" data layer to "post" to match the already-correct
-- public-facing /posts naming (PRD #128 / issue #129).

alter table blogs rename to posts;
alter table blog_blocks rename to post_blocks;
alter table post_blocks rename column blog_id to post_id;

drop policy if exists "Public read published blogs" on posts;
create policy "Public read published posts" on posts for select
  to anon
  using (status = 'published');

drop policy if exists "Authenticated read all blogs" on posts;
create policy "Authenticated read all posts" on posts for select
  to authenticated
  using (true);

drop policy if exists "Auth write blogs" on posts;
create policy "Auth write posts" on posts for all
  using (auth.jwt() ->> 'email' = 'tarekferdous3@gmail.com');

drop policy if exists "Public read blog_blocks" on post_blocks;
create policy "Public read post_blocks" on post_blocks for select using (true);

drop policy if exists "Auth write blog_blocks" on post_blocks;
create policy "Auth write post_blocks" on post_blocks for all
  using (auth.jwt() ->> 'email' = 'tarekferdous3@gmail.com');
