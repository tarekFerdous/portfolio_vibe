-- Manual README source (PRD #163 / issue #164). Org/private projects can't (or
-- shouldn't) publish their GitHub README, so the admin pastes a sanitized one.
--
-- Kept beside the GitHub copy rather than overwriting `markdown`, so switching
-- the source back and forth never loses either text. GitHub refreshes only
-- write the GitHub columns; `source = 'manual'` makes the page render
-- `manual_markdown` instead. The existing RLS policies cover the new columns.

alter table project_readmes
  add column if not exists source text not null default 'github'
    check (source in ('github', 'manual')),
  add column if not exists manual_markdown text,
  add column if not exists manual_updated_at timestamptz;
