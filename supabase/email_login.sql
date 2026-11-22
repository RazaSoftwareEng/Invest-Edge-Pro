-- =====================================================================
--  INVEST EDGE PRO — Email on profiles + login with email OR username
--  Run AFTER schema.sql and admin_users.sql. Safe to re-run.
-- =====================================================================

-- 1) Store the user's real email on the profile (unique, case-insensitive)
alter table public.profiles add column if not exists email text;
create unique index if not exists profiles_email_lower_idx
  on public.profiles (lower(email)) where email is not null;

-- Backfill users created in the Supabase dashboard with a real email
update public.profiles p
   set email = lower(u.email)
  from auth.users u
 where p.id = u.id
   and p.email is null
   and u.email not like '%@users.investedge.app';

-- 2) Sign-up trigger now also saves the email from user metadata
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, username, phone, full_name, email)
  values (
    new.id,
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'username'), ''), split_part(new.email, '@', 1)),
    nullif(trim(new.raw_user_meta_data ->> 'phone'), ''),
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''),
             nullif(trim(new.raw_user_meta_data ->> 'username'), '')),
    coalesce(nullif(lower(trim(new.raw_user_meta_data ->> 'email')), ''),
             case when new.email not like '%@users.investedge.app' then lower(new.email) end)
  );
  return new;
end;
$$;

-- 3) Login helper: turns a typed email into the account's auth login email.
--    (App users sign in internally as username@users.investedge.app.)
create or replace function public.login_email_for(p_email text)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select u.email
       from public.profiles p
       join auth.users u on u.id = p.id
      where lower(p.email) = lower(trim(p_email))
      limit 1),
    lower(trim(p_email))
  );
$$;

revoke execute on function public.login_email_for(text) from public;
grant execute on function public.login_email_for(text) to anon, authenticated;
