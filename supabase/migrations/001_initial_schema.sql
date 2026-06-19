-- Enable UUID generation
create extension if not exists "pgcrypto";

-- intro: single row holding title/role and summary
create table if not exists intro (
  id uuid primary key default gen_random_uuid(),
  title text not null default '',
  summary text not null default '',
  updated_at timestamptz default now()
);
insert into intro (title, summary) values ('', '') on conflict do nothing;

-- intro_covers: pool of cover images for random rotation
create table if not exists intro_covers (
  id uuid primary key default gen_random_uuid(),
  storage_path text not null,
  url text not null,
  created_at timestamptz default now()
);

-- projects
create table if not exists projects (
  id uuid primary key default gen_random_uuid(),
  name text not null default '',
  summary text not null default '',
  image_url text,
  skills text[] default '{}',
  display_order integer not null default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- blogs
create table if not exists blogs (
  id uuid primary key default gen_random_uuid(),
  title text not null default '',
  slug text not null unique,
  publish_date date,
  location text,
  status text not null default 'draft' check (status in ('draft', 'published')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- blog_blocks: ordered content blocks per blog post
create table if not exists blog_blocks (
  id uuid primary key default gen_random_uuid(),
  blog_id uuid not null references blogs(id) on delete cascade,
  block_type text not null check (block_type in ('text', 'photo')),
  content text,
  image_url text,
  display_order integer not null default 0
);

-- contacts: single row
create table if not exists contacts (
  id uuid primary key default gen_random_uuid(),
  email text,
  phone text,
  linkedin_url text,
  github_url text,
  location text,
  hire_me_destination text,
  updated_at timestamptz default now()
);
insert into contacts default values on conflict do nothing;

-- Row Level Security
alter table intro enable row level security;
alter table intro_covers enable row level security;
alter table projects enable row level security;
alter table blogs enable row level security;
alter table blog_blocks enable row level security;
alter table contacts enable row level security;

-- Public read policies
create policy "Public read intro" on intro for select using (true);
create policy "Public read intro_covers" on intro_covers for select using (true);
create policy "Public read projects" on projects for select using (true);
create policy "Public read published blogs" on blogs for select using (true);
create policy "Public read blog_blocks" on blog_blocks for select using (true);
create policy "Public read contacts" on contacts for select using (true);

-- Authenticated write policies
create policy "Auth write intro" on intro for all using (auth.role() = 'authenticated');
create policy "Auth write intro_covers" on intro_covers for all using (auth.role() = 'authenticated');
create policy "Auth write projects" on projects for all using (auth.role() = 'authenticated');
create policy "Auth write blogs" on blogs for all using (auth.role() = 'authenticated');
create policy "Auth write blog_blocks" on blog_blocks for all using (auth.role() = 'authenticated');
create policy "Auth write contacts" on contacts for all using (auth.role() = 'authenticated');

-- Storage buckets (run in Supabase dashboard or via CLI)
-- insert into storage.buckets (id, name, public) values ('intro-covers', 'intro-covers', true);
-- insert into storage.buckets (id, name, public) values ('project-covers', 'project-covers', true);
-- insert into storage.buckets (id, name, public) values ('blog-photos', 'blog-photos', true);
