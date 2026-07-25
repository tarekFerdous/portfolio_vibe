-- Add visibility column to projects for hide/show toggle in the admin panel
alter table projects add column if not exists visibility text not null default 'visible' check (visibility in ('visible', 'hidden'));
