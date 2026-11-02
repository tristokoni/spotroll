create table profiles(id uuid primary key references auth.users on delete cascade, role text not null default 'user' check(role in('user','admin')));
create or replace function is_admin() returns boolean language sql security definer stable as $$ select exists(select 1 from profiles where id=auth.uid() and role='admin') $$;
create table spots(
 id uuid primary key default gen_random_uuid(), name text not null, description text, locality text,
 latitude double precision not null check(latitude between -90 and 90), longitude double precision not null check(longitude between -180 and 180),
 image text, attributes jsonb not null default '{}', -- {"fireplace":true,"toilet":false}; chýba = neznáme; nové atribúty bez migrácie
 visibility text not null default 'public' check(visibility in('public','hidden','approximate_location')),
 notes text, approved boolean not null default false, active boolean not null default true,
 created_at timestamptz default now(), updated_at timestamptz default now());
create index on spots(latitude,longitude); create index on spots(approved); create index on spots(active);
create table spot_images(id uuid primary key default gen_random_uuid(), spot_id uuid references spots on delete cascade, url text not null);
create table favorites(user_id uuid references auth.users on delete cascade, spot_id uuid references spots on delete cascade, kind text check(kind in('good','fav')), primary key(user_id,spot_id,kind));
alter table profiles enable row level security; alter table spots enable row level security; alter table spot_images enable row level security; alter table favorites enable row level security;
-- verejné čítanie ide cez server API (maskuje presnú polohu); priamo cez anon kľúč číta/píše iba admin
create policy spots_admin on spots for all using(is_admin()) with check(is_admin());
create policy images_admin on spot_images for all using(is_admin()) with check(is_admin());
create policy prof_self on profiles for select using(id=auth.uid() or is_admin());
create policy fav_own on favorites for all using(user_id=auth.uid()) with check(user_id=auth.uid());
create or replace function handle_new_user() returns trigger language plpgsql security definer as $$ begin insert into profiles(id) values(new.id); return new; end $$;
create trigger on_signup after insert on auth.users for each row execute function handle_new_user();
