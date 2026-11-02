begin;
create table public.trips (
 id uuid primary key default gen_random_uuid(), owner_id uuid not null references auth.users on delete cascade,
 title text not null check(char_length(title) between 2 and 80), notes text not null default '' check(char_length(notes)<=2000),
 trip_date date, spot_ids uuid[] not null check(cardinality(spot_ids) between 1 and 10), shared boolean not null default false,
 created_at timestamptz not null default now()
);
create table public.polls (
 id uuid primary key default gen_random_uuid(), owner_id uuid not null references auth.users on delete cascade,
 title text not null check(char_length(title) between 2 and 80), spot_ids uuid[] not null check(cardinality(spot_ids) between 2 and 8),
 closed boolean not null default false, created_at timestamptz not null default now()
);
create table public.poll_votes (
 poll_id uuid not null references public.polls on delete cascade, user_id uuid not null references auth.users on delete cascade,
 spot_id uuid not null references public.spots on delete cascade, updated_at timestamptz not null default now(), primary key(poll_id,user_id)
);
create function public.check_poll_vote() returns trigger language plpgsql set search_path=public as $$
declare p public.polls;
begin
 select * into p from public.polls where id=new.poll_id for update;
 if not found or p.closed then raise exception 'Hlasovanie je uzavreté.'; end if;
 if not (new.spot_id=any(p.spot_ids)) then raise exception 'Neplatná možnosť.'; end if;
 new.updated_at=now(); return new;
end $$;
create trigger validate_poll_vote before insert or update on public.poll_votes for each row execute function public.check_poll_vote();
create table public.visits (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users on delete cascade,
 spot_id uuid not null references public.spots on delete cascade, visited_on date not null,
 note text not null default '' check(char_length(note)<=2000), photo_path text,
 created_at timestamptz not null default now(), unique(user_id,spot_id,visited_on)
);
create table public.spot_tips (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users on delete cascade,
 spot_id uuid not null references public.spots on delete cascade,
 category text not null check(category in ('access','water','condition','crowds','other')),
 body text not null check(char_length(body) between 5 and 700), hidden boolean not null default false,
 created_at timestamptz not null default now()
);
create index on public.trips(owner_id);create index on public.polls(owner_id);
create index on public.visits(user_id,visited_on);create index on public.spot_tips(created_at desc);
alter table public.trips enable row level security;alter table public.polls enable row level security;
alter table public.poll_votes enable row level security;alter table public.visits enable row level security;alter table public.spot_tips enable row level security;
-- Access goes through authenticated server endpoints with ownership checks. No direct client access.
revoke all on public.trips,public.polls,public.poll_votes,public.visits,public.spot_tips from anon,authenticated;
grant all on public.trips,public.polls,public.poll_votes,public.visits,public.spot_tips to service_role;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values ('visit-photos','visit-photos',false,5242880,array['image/jpeg','image/png','image/webp']) on conflict(id) do nothing;
commit;
