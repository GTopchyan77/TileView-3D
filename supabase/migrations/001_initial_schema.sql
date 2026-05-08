create extension if not exists pgcrypto;

create table if not exists public.tiles (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  image_url text not null,
  width_cm numeric not null,
  height_cm numeric not null,
  finish text,
  tone text,
  created_at timestamptz not null default now()
);

create table if not exists public.scenes (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  room_type text not null,
  active_surface text,
  floor_tile_id text,
  left_wall_tile_id text,
  right_wall_tile_id text,
  back_wall_tile_id text,
  objects jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists scenes_set_updated_at on public.scenes;
create trigger scenes_set_updated_at
before update on public.scenes
for each row
execute function public.set_updated_at();

alter table public.tiles enable row level security;
alter table public.scenes enable row level security;

drop policy if exists "demo public read tiles" on public.tiles;
create policy "demo public read tiles"
on public.tiles
for select
to anon, authenticated
using (true);

drop policy if exists "demo public insert tiles" on public.tiles;
create policy "demo public insert tiles"
on public.tiles
for insert
to anon, authenticated
with check (true);

drop policy if exists "demo public read scenes" on public.scenes;
create policy "demo public read scenes"
on public.scenes
for select
to anon, authenticated
using (true);

drop policy if exists "demo public insert scenes" on public.scenes;
create policy "demo public insert scenes"
on public.scenes
for insert
to anon, authenticated
with check (true);

drop policy if exists "demo public update scenes" on public.scenes;
create policy "demo public update scenes"
on public.scenes
for update
to anon, authenticated
using (true)
with check (true);
