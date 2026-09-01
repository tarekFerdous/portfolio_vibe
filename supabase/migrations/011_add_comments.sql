-- Comments table for the nested comment system (PRD #113).
-- This slice (#118) only exercises top-level comments, but parent_comment_id
-- is included now so #119 (threaded replies) doesn't need a follow-up migration.

create table if not exists comments (
  id uuid primary key default gen_random_uuid(),
  blog_id uuid not null references blogs(id) on delete cascade,
  parent_comment_id uuid references comments(id) on delete cascade,
  author_id uuid not null references auth.users(id) on delete cascade,
  author_email text not null,
  content text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

-- Non-empty (after trimming whitespace) and bounded so a comment can't blow
-- up the layout or the database; 10000 chars is generous for a comment body.
alter table comments add constraint comments_content_length check (
  char_length(trim(content)) > 0 and char_length(content) <= 10000
);

create index if not exists comments_blog_id_idx on comments (blog_id);
create index if not exists comments_parent_comment_id_idx on comments (parent_comment_id);

alter table comments enable row level security;

-- Comments are public to read, including by anonymous visitors.
create policy "Public read comments" on comments for select using (true);

-- A commenter may only insert a comment as themselves: the row's author_id
-- must match the authenticated user, and author_email must match the email
-- on their verified session (not an arbitrary string the client could pass).
create policy "Auth insert own comments" on comments for insert
  with check (auth.uid() = author_id and author_email = auth.jwt() ->> 'email');
