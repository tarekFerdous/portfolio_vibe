-- Add bg_color column to projects for a fallback accent panel background when
-- a project has no cover image yet.
alter table projects add column if not exists bg_color text;
