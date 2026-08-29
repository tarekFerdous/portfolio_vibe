alter table blogs add column if not exists excerpt text;
alter table blogs add column if not exists cover_image_url text;
alter table blogs add column if not exists author text not null default 'Tarek Ferdous';
