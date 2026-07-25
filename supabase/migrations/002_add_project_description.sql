-- Add project_description column to projects for a longer, multi-paragraph description
alter table projects add column if not exists project_description text not null default '';
