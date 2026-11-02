-- SPOTROLL v2: používatelia, návrhy spotov, ban, hardening. Spusti v SQL editore PO 001_init.sql
alter table profiles add column if not exists username text, add column if not exists banned boolean not null default false,
  add column if not exists ban_reason text, add column if not exists created_at timestamptz default now();
alter table spots add column if not exists submitted_by uuid references auth.users on delete set null,
  add column if not exists status text not null default 'pending' check(status in('pending','approved','rejected')),
  add column if not exists reject_reason text;
update spots set status=case when approved then 'approved' else 'pending' end;
create index if not exists spots_status on spots(status); create index if not exists spots_by on spots(submitted_by);
-- FIX: security definer funkcie bez pevného search_path sa dajú zneužiť; banned admin už nie je admin
create or replace function is_admin() returns boolean language sql security definer stable set search_path=public as
$$ select exists(select 1 from profiles where id=auth.uid() and role='admin' and not banned) $$;
create or replace function handle_new_user() returns trigger language plpgsql security definer set search_path=public as
$$ begin insert into profiles(id,username) values(new.id,left(coalesce(new.raw_user_meta_data->>'username',split_part(new.email,'@',1)),30)); return new; end $$;
create policy spots_own_read on spots for select using(submitted_by=auth.uid());
-- profiles: používateľ nemá UPDATE policy, takže si nemôže zmeniť role/banned (iba service role cez API)
revoke update on profiles from anon, authenticated;
