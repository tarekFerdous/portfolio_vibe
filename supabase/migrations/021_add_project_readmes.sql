-- Stored copy of each project's GitHub README (PRD #159 / issue #160). The
-- public project page renders only from this table and never calls GitHub;
-- the admin refreshes rows from the Projects manager.
--
-- A separate table rather than columns on `projects` because the admin form
-- upserts whole project rows, which would clobber README columns.

create table if not exists project_readmes (
  project_id uuid primary key references projects(id) on delete cascade,
  -- Null means the repo exists but has no README.
  markdown text,
  owner text,
  repo text,
  branch text,
  is_private boolean,
  html_url text,
  readme_path text,
  -- When content was last stored successfully.
  fetched_at timestamptz,
  -- Set on a failed attempt, cleared on success. Drive the admin row status.
  last_attempt_at timestamptz,
  last_error text check (last_error in ('no_access', 'rate_limited', 'network'))
);

alter table project_readmes enable row level security;

-- `projects` itself is publicly readable, so gate README reads on the parent's
-- visibility: hidden projects' (possibly private-repo) READMEs must not leak.
create policy "Public read visible project_readmes" on project_readmes for select
  using (
    exists (
      select 1 from projects
      where projects.id = project_readmes.project_id
        and projects.visibility = 'visible'
    )
  );

-- Same owner-email scoping as migration 010; also lets the admin read every row.
create policy "Auth write project_readmes" on project_readmes for all
  using (auth.jwt() ->> 'email' = 'tarekferdous3@gmail.com');
