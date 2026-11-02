begin;
alter table public.profiles add column username_key text generated always as (lower(btrim(username))) stored;
create unique index profiles_username_unique on public.profiles(username_key) where username_key is not null and username_key<>'';
-- Preserve existing names. New duplicate signups receive a unique suffix, never an existing user's identity.
create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path=public as $$
declare candidate text;
begin
 candidate=left(nullif(btrim(new.raw_user_meta_data->>'username'),''),30);
 if candidate is null then candidate='objavitel_'||left(replace(new.id::text,'-',''),12); end if;
 begin
  insert into profiles(id,username) values(new.id,candidate);
 exception when unique_violation then
  insert into profiles(id,username) values(new.id,left(candidate,17)||'_'||left(replace(new.id::text,'-',''),12));
 end;
 return new;
end $$;
create table public.friendships (
 id uuid primary key default gen_random_uuid(), requester_id uuid not null references auth.users on delete cascade,
 recipient_id uuid not null references auth.users on delete cascade,
 status text not null default 'pending' check(status in ('pending','accepted','declined','cancelled')),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 check(requester_id<>recipient_id)
);
create unique index friendships_pair_unique on public.friendships(least(requester_id,recipient_id),greatest(requester_id,recipient_id));
create index on public.friendships(requester_id,status);create index on public.friendships(recipient_id,status);
alter table public.friendships enable row level security;
revoke all on public.friendships from anon,authenticated;
grant all on public.friendships to service_role;
commit;
