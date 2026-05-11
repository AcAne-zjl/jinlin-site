create table if not exists public.moments (
  id text primary key,
  created_at timestamptz not null default now(),
  type text not null default 'note',
  category text not null,
  date date not null default current_date,
  title text not null,
  excerpt text not null,
  body text not null,
  tags text[] not null default '{}',
  image text not null default '',
  alt text not null default '',
  url text not null default '',
  color text not null default '#ffffff'
);

alter table public.moments enable row level security;

drop policy if exists "Anyone can read moments" on public.moments;
create policy "Anyone can read moments"
on public.moments
for select
using (true);

drop policy if exists "Anyone can insert moments" on public.moments;
create policy "Anyone can insert moments"
on public.moments
for insert
with check (true);
