-- Allow a commenter to edit their own comment (PRD #113, slice #120).
-- Both `using` and `with check` are scoped to auth.uid() = author_id so a
-- non-owner can neither target another author's row nor produce a row that
-- would belong to someone else.
create policy "Auth update own comments" on comments for update
  using (auth.uid() = author_id)
  with check (auth.uid() = author_id);
