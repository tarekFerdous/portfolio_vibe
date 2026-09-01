-- Upvote/downvote comments with a net score (PRD #113, slice #122).
-- One row per (comment, voter): the unique constraint is what makes casting
-- a second, different vote an upsert (changes the row) rather than a
-- duplicate. value is constrained to -1/1 so score is just sum(value).

create table if not exists comment_votes (
  id uuid primary key default gen_random_uuid(),
  comment_id uuid not null references comments(id) on delete cascade,
  voter_id uuid not null references auth.users(id) on delete cascade,
  value smallint not null check (value in (-1, 1)),
  created_at timestamptz not null default now(),
  unique (comment_id, voter_id)
);

create index if not exists comment_votes_comment_id_idx on comment_votes (comment_id);

alter table comment_votes enable row level security;

-- Vote counts are public to read, including by anonymous visitors, so the
-- net score can be shown on every comment.
create policy "Public read comment_votes" on comment_votes for select using (true);

-- A voter may only insert a vote as themselves.
create policy "Auth insert own comment_votes" on comment_votes for insert
  with check (auth.uid() = voter_id);

-- A voter may only change their own vote (e.g. up to down).
create policy "Auth update own comment_votes" on comment_votes for update
  using (auth.uid() = voter_id)
  with check (auth.uid() = voter_id);

-- A voter may retract their own vote entirely.
create policy "Auth delete own comment_votes" on comment_votes for delete
  using (auth.uid() = voter_id);
