-- Human-readable, unique slugs for public project pages at /projects/[slug]
-- (PRD #149 / issue #150). Backfill mirrors lib/utils/slug.ts `slugify`:
-- lowercase, runs of non-alphanumerics -> '-', leading/trailing '-' trimmed.
-- Any collisions among existing rows get a numeric suffix so the unique
-- constraint can be added safely.

alter table projects add column if not exists slug text;

update projects
set slug = trim(both '-' from regexp_replace(lower(name), '[^a-z0-9]+', '-', 'g'))
where slug is null or slug = '';

update projects
set slug = 'project'
where slug = '';

with ranked as (
  select id, slug, row_number() over (partition by slug order by display_order, created_at) as n
  from projects
)
update projects p
set slug = ranked.slug || '-' || ranked.n
from ranked
where p.id = ranked.id and ranked.n > 1;

alter table projects alter column slug set not null;
alter table projects add constraint projects_slug_key unique (slug);
alter table projects add constraint projects_slug_format
  check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$');
