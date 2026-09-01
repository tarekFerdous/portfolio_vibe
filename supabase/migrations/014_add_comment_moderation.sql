-- Admin comment moderation (PRD #116, slice #127): let the site owner remove
-- any comment, distinct from a self-deleted one.

alter table comments add column if not exists removed_by_moderator boolean not null default false;

-- Additive to "Auth update own comments" (migration 012) — a row can be
-- updated either by its own author or by the admin identity.
create policy "Admin moderate comments" on comments for update
  using (auth.jwt() ->> 'email' = 'tarekferdous3@gmail.com')
  with check (auth.jwt() ->> 'email' = 'tarekferdous3@gmail.com');
