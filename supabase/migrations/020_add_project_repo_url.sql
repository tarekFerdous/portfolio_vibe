-- GitHub repo whose README is rendered on the public project page
-- (PRD #149 / issue #152). Nullable: projects without a repo fall back to
-- project_description.

alter table projects add column if not exists repo_url text;
