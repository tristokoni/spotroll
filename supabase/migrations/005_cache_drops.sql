begin;
create table public.cache_drops (
 id uuid primary key default gen_random_uuid(),
 creator_id uuid not null references auth.users on delete cascade,
 sender_id uuid not null references auth.users on delete cascade,
 recipient_id uuid not null references auth.users on delete cascade,
 kind text not null check(kind in ('gift','request')),
 title text not null check(char_length(title) between 2 and 80),
 description text not null default '' check(char_length(description)<=1500),
 hint text not null default '' check(char_length(hint)<=700),
 latitude double precision not null check(latitude between -90 and 90),
 longitude double precision not null check(longitude between -180 and 180),
 status text not null check(status in ('requested','ready','collected','cancelled')),
 pickup_note text not null default '' check(char_length(pickup_note)<=500),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 ready_at timestamptz, collected_at timestamptz, cancelled_at timestamptz,
 cancelled_by uuid references auth.users on delete set null,
 check(sender_id<>recipient_id),
 check((kind='gift' and creator_id=sender_id) or (kind='request' and creator_id=recipient_id)),
 check(status not in ('ready','collected') or ready_at is not null),
 check((status='collected')=(collected_at is not null)),
 check((status='cancelled')=(cancelled_at is not null))
);
create index cache_drops_sender on public.cache_drops(sender_id,created_at desc);
create index cache_drops_recipient on public.cache_drops(recipient_id,created_at desc);
alter table public.cache_drops enable row level security;
revoke all on public.cache_drops from anon,authenticated;
grant all on public.cache_drops to service_role;
commit;
