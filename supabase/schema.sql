-- =====================================================================
--  INVEST EDGE PRO — Supabase backend
--  Run this whole file once in: Supabase Dashboard -> SQL Editor -> New query
--  It is safe to re-run (uses IF NOT EXISTS / CREATE OR REPLACE / DROP IF EXISTS).
-- =====================================================================

create extension if not exists pgcrypto;

-- =====================================================================
-- 1. TABLES
-- =====================================================================

create table if not exists public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  username    text not null,
  full_name   text,
  phone       text,
  balance     numeric(14,2) not null default 0 check (balance >= 0),
  is_admin    boolean not null default false,
  created_at  timestamptz not null default now()
);
create unique index if not exists profiles_username_lower_idx on public.profiles (lower(username));

create table if not exists public.plans (
  id             uuid primary key default gen_random_uuid(),
  name           text not null,
  price          numeric(14,2) not null check (price > 0),
  duration_days  integer not null check (duration_days > 0),
  benefits       text[] not null default '{}',
  active         boolean not null default true,
  sort_order     integer not null default 0,
  created_at     timestamptz not null default now()
);

create table if not exists public.deposits (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references public.profiles (id) on delete cascade,
  method          text not null check (method in ('jazzcash', 'easypaisa', 'bank')),
  amount          numeric(14,2) not null check (amount > 0),
  transaction_id  text not null check (length(trim(transaction_id)) between 4 and 64),
  proof_path      text,
  status          text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  admin_note      text,
  processed_by    uuid references public.profiles (id),
  processed_at    timestamptz,
  created_at      timestamptz not null default now()
);
create index if not exists deposits_user_idx   on public.deposits (user_id, created_at desc);
create index if not exists deposits_status_idx on public.deposits (status, created_at);
-- The same transaction ID cannot be submitted twice for a method (unless the earlier one was rejected)
create unique index if not exists deposits_txn_unique_idx
  on public.deposits (method, lower(trim(transaction_id)))
  where status <> 'rejected';

create table if not exists public.withdrawals (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references public.profiles (id) on delete cascade,
  method          text not null check (method in ('jazzcash', 'easypaisa', 'bank')),
  amount          numeric(14,2) not null check (amount > 0),
  account_number  text not null,
  account_name    text not null,
  bank_name       text,
  status          text not null default 'pending' check (status in ('pending', 'paid', 'rejected')),
  admin_note      text,
  processed_by    uuid references public.profiles (id),
  processed_at    timestamptz,
  created_at      timestamptz not null default now()
);
create index if not exists withdrawals_user_idx   on public.withdrawals (user_id, created_at desc);
create index if not exists withdrawals_status_idx on public.withdrawals (status, created_at);

create table if not exists public.subscriptions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles (id) on delete cascade,
  plan_id     uuid references public.plans (id) on delete set null,
  plan_name   text not null,
  price       numeric(14,2) not null,
  starts_at   timestamptz not null default now(),
  expires_at  timestamptz not null,
  created_at  timestamptz not null default now()
);
create index if not exists subscriptions_user_idx on public.subscriptions (user_id, expires_at desc);

create table if not exists public.transactions (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references public.profiles (id) on delete cascade,
  type           text not null check (type in ('deposit', 'purchase', 'withdrawal', 'refund')),
  amount         numeric(14,2) not null,          -- signed: + credit, - debit
  balance_after  numeric(14,2) not null,
  note           text,
  ref_id         uuid,                            -- deposit / withdrawal / subscription id
  created_at     timestamptz not null default now()
);
create index if not exists transactions_user_idx on public.transactions (user_id, created_at desc);

-- =====================================================================
-- 2. HELPERS
-- =====================================================================

-- SECURITY DEFINER so it can be used inside RLS policies without recursion.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select p.is_admin from public.profiles p where p.id = auth.uid()), false);
$$;

create or replace function public.method_label(p_method text)
returns text
language sql
immutable
as $$
  select case p_method
    when 'jazzcash'  then 'JazzCash'
    when 'easypaisa' then 'EasyPaisa'
    when 'bank'      then 'Bank Transfer'
    else p_method
  end;
$$;

-- =====================================================================
-- 3. AUTO-CREATE PROFILE ON SIGN-UP (reads username / phone from user metadata)
-- =====================================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, username, phone, full_name)
  values (
    new.id,
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'username'), ''), split_part(new.email, '@', 1)),
    nullif(trim(new.raw_user_meta_data ->> 'phone'), ''),
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''),
             nullif(trim(new.raw_user_meta_data ->> 'username'), ''))
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- =====================================================================
-- 4. TABLE PRIVILEGES (column-level) — users can never touch balance / is_admin
-- =====================================================================

revoke all on public.profiles      from anon, authenticated;
revoke all on public.plans         from anon, authenticated;
revoke all on public.deposits      from anon, authenticated;
revoke all on public.withdrawals   from anon, authenticated;
revoke all on public.subscriptions from anon, authenticated;
revoke all on public.transactions  from anon, authenticated;

grant select                          on public.profiles      to authenticated;
grant update (full_name, phone)       on public.profiles      to authenticated;

grant select, insert, update          on public.plans         to authenticated;  -- insert/update limited to admins by RLS

grant select                          on public.deposits      to authenticated;
grant insert (user_id, method, amount, transaction_id, proof_path)
                                      on public.deposits      to authenticated;

grant select                          on public.withdrawals   to authenticated;  -- inserts only via request_withdrawal()
grant select                          on public.subscriptions to authenticated;  -- inserts only via buy_plan()
grant select                          on public.transactions  to authenticated;  -- inserts only via functions

-- =====================================================================
-- 5. ROW LEVEL SECURITY
-- =====================================================================

alter table public.profiles      enable row level security;
alter table public.plans         enable row level security;
alter table public.deposits      enable row level security;
alter table public.withdrawals   enable row level security;
alter table public.subscriptions enable row level security;
alter table public.transactions  enable row level security;

-- profiles
drop policy if exists "profiles_select_own_or_admin" on public.profiles;
create policy "profiles_select_own_or_admin" on public.profiles
  for select to authenticated
  using (id = auth.uid() or public.is_admin());

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- plans
drop policy if exists "plans_select" on public.plans;
create policy "plans_select" on public.plans
  for select to authenticated
  using (active or public.is_admin());

drop policy if exists "plans_admin_insert" on public.plans;
create policy "plans_admin_insert" on public.plans
  for insert to authenticated
  with check (public.is_admin());

drop policy if exists "plans_admin_update" on public.plans;
create policy "plans_admin_update" on public.plans
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- deposits
drop policy if exists "deposits_select_own_or_admin" on public.deposits;
create policy "deposits_select_own_or_admin" on public.deposits
  for select to authenticated
  using (user_id = auth.uid() or public.is_admin());

drop policy if exists "deposits_insert_own" on public.deposits;
create policy "deposits_insert_own" on public.deposits
  for insert to authenticated
  with check (
    user_id = auth.uid()
    and (proof_path is null or proof_path like auth.uid()::text || '/%')
  );

-- withdrawals
drop policy if exists "withdrawals_select_own_or_admin" on public.withdrawals;
create policy "withdrawals_select_own_or_admin" on public.withdrawals
  for select to authenticated
  using (user_id = auth.uid() or public.is_admin());

-- subscriptions
drop policy if exists "subscriptions_select_own_or_admin" on public.subscriptions;
create policy "subscriptions_select_own_or_admin" on public.subscriptions
  for select to authenticated
  using (user_id = auth.uid() or public.is_admin());

-- transactions
drop policy if exists "transactions_select_own_or_admin" on public.transactions;
create policy "transactions_select_own_or_admin" on public.transactions
  for select to authenticated
  using (user_id = auth.uid() or public.is_admin());

-- =====================================================================
-- 6. MONEY FUNCTIONS (the ONLY way balances change) — call via supabase.rpc()
-- =====================================================================

-- ---------- approve_deposit (admin) ----------
create or replace function public.approve_deposit(p_deposit_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  d      public.deposits%rowtype;
  v_bal  numeric(14,2);
begin
  if not public.is_admin() then
    raise exception 'Not authorized';
  end if;

  select * into d from public.deposits where id = p_deposit_id for update;
  if not found then
    raise exception 'Deposit not found';
  end if;
  if d.status <> 'pending' then
    raise exception 'Deposit has already been processed';
  end if;

  update public.deposits
     set status = 'approved', processed_by = auth.uid(), processed_at = now()
   where id = d.id;

  update public.profiles
     set balance = balance + d.amount
   where id = d.user_id
  returning balance into v_bal;

  insert into public.transactions (user_id, type, amount, balance_after, note, ref_id)
  values (d.user_id, 'deposit', d.amount, v_bal,
          'Deposit via ' || public.method_label(d.method) || ' (TID ' || d.transaction_id || ')', d.id);
end;
$$;

-- ---------- reject_deposit (admin) ----------
-- No money moved, so no ledger row; the deposit history shows the rejection + reason.
create or replace function public.reject_deposit(p_deposit_id uuid, p_note text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  d public.deposits%rowtype;
begin
  if not public.is_admin() then
    raise exception 'Not authorized';
  end if;

  select * into d from public.deposits where id = p_deposit_id for update;
  if not found then
    raise exception 'Deposit not found';
  end if;
  if d.status <> 'pending' then
    raise exception 'Deposit has already been processed';
  end if;

  update public.deposits
     set status = 'rejected',
         admin_note = nullif(trim(p_note), ''),
         processed_by = auth.uid(),
         processed_at = now()
   where id = d.id;
end;
$$;

-- ---------- buy_plan (user) ----------
create or replace function public.buy_plan(p_plan_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid    uuid := auth.uid();
  pl       public.plans%rowtype;
  v_bal    numeric(14,2);
  v_sub    uuid;
  v_start  timestamptz := now();
begin
  if v_uid is null then
    raise exception 'Not authenticated';
  end if;

  select * into pl from public.plans where id = p_plan_id and active;
  if not found then
    raise exception 'This plan is not available';
  end if;

  -- lock the user's wallet row
  select balance into v_bal from public.profiles where id = v_uid for update;
  if not found then
    raise exception 'Profile not found';
  end if;
  if v_bal < pl.price then
    raise exception 'Insufficient balance. Please deposit first.';
  end if;

  update public.profiles
     set balance = balance - pl.price
   where id = v_uid
  returning balance into v_bal;

  insert into public.subscriptions (user_id, plan_id, plan_name, price, starts_at, expires_at)
  values (v_uid, pl.id, pl.name, pl.price, v_start, v_start + make_interval(days => pl.duration_days))
  returning id into v_sub;

  insert into public.transactions (user_id, type, amount, balance_after, note, ref_id)
  values (v_uid, 'purchase', -pl.price, v_bal,
          'Purchased ' || pl.name || ' plan (' || pl.duration_days || ' days)', v_sub);

  return v_sub;
end;
$$;

-- ---------- request_withdrawal (user) — holds the amount immediately ----------
create or replace function public.request_withdrawal(
  p_method          text,
  p_amount          numeric,
  p_account_number  text,
  p_account_name    text,
  p_bank_name       text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid     uuid := auth.uid();
  v_amount  numeric(14,2) := round(coalesce(p_amount, 0), 2);
  v_bal     numeric(14,2);
  v_id      uuid;
begin
  if v_uid is null then
    raise exception 'Not authenticated';
  end if;
  if p_method not in ('jazzcash', 'easypaisa', 'bank') then
    raise exception 'Invalid withdrawal method';
  end if;
  if v_amount <= 0 then
    raise exception 'Amount must be greater than zero';
  end if;
  if coalesce(trim(p_account_number), '') = '' or coalesce(trim(p_account_name), '') = '' then
    raise exception 'Account number and account holder name are required';
  end if;
  if p_method = 'bank' and coalesce(trim(p_bank_name), '') = '' then
    raise exception 'Bank name is required for bank withdrawals';
  end if;

  select balance into v_bal from public.profiles where id = v_uid for update;
  if not found then
    raise exception 'Profile not found';
  end if;
  if v_bal < v_amount then
    raise exception 'Insufficient balance';
  end if;

  update public.profiles
     set balance = balance - v_amount
   where id = v_uid
  returning balance into v_bal;

  insert into public.withdrawals (user_id, method, amount, account_number, account_name, bank_name)
  values (v_uid, p_method, v_amount, trim(p_account_number), trim(p_account_name), nullif(trim(p_bank_name), ''))
  returning id into v_id;

  insert into public.transactions (user_id, type, amount, balance_after, note, ref_id)
  values (v_uid, 'withdrawal', -v_amount, v_bal,
          'Withdrawal request to ' || public.method_label(p_method) || ' (pending)', v_id);

  return v_id;
end;
$$;

-- ---------- process_withdrawal (admin) — approve = mark paid, reject = refund ----------
create or replace function public.process_withdrawal(
  p_withdrawal_id uuid,
  p_approve       boolean,
  p_note          text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  w      public.withdrawals%rowtype;
  v_bal  numeric(14,2);
begin
  if not public.is_admin() then
    raise exception 'Not authorized';
  end if;

  select * into w from public.withdrawals where id = p_withdrawal_id for update;
  if not found then
    raise exception 'Withdrawal not found';
  end if;
  if w.status <> 'pending' then
    raise exception 'Withdrawal has already been processed';
  end if;

  if p_approve then
    update public.withdrawals
       set status = 'paid', admin_note = nullif(trim(p_note), ''),
           processed_by = auth.uid(), processed_at = now()
     where id = w.id;

    -- money already left the wallet when requested; update the ledger note
    update public.transactions
       set note = 'Withdrawal paid to ' || public.method_label(w.method) || ' (' || w.account_number || ')'
     where ref_id = w.id and type = 'withdrawal';
  else
    update public.withdrawals
       set status = 'rejected', admin_note = nullif(trim(p_note), ''),
           processed_by = auth.uid(), processed_at = now()
     where id = w.id;

    update public.profiles
       set balance = balance + w.amount
     where id = w.user_id
    returning balance into v_bal;

    update public.transactions
       set note = 'Withdrawal request to ' || public.method_label(w.method) || ' (rejected)'
     where ref_id = w.id and type = 'withdrawal';

    insert into public.transactions (user_id, type, amount, balance_after, note, ref_id)
    values (w.user_id, 'refund', w.amount, v_bal,
            'Refund: withdrawal rejected' || coalesce(' — ' || nullif(trim(p_note), ''), ''), w.id);
  end if;
end;
$$;

-- Function permissions: only signed-in users may call them (admin checks are inside).
revoke execute on function public.is_admin()                                         from public, anon;
revoke execute on function public.handle_new_user()                                  from public, anon, authenticated;
revoke execute on function public.approve_deposit(uuid)                              from public, anon;
revoke execute on function public.reject_deposit(uuid, text)                         from public, anon;
revoke execute on function public.buy_plan(uuid)                                     from public, anon;
revoke execute on function public.request_withdrawal(text, numeric, text, text, text) from public, anon;
revoke execute on function public.process_withdrawal(uuid, boolean, text)            from public, anon;

grant execute on function public.is_admin()                                          to authenticated;
grant execute on function public.approve_deposit(uuid)                               to authenticated;
grant execute on function public.reject_deposit(uuid, text)                          to authenticated;
grant execute on function public.buy_plan(uuid)                                      to authenticated;
grant execute on function public.request_withdrawal(text, numeric, text, text, text) to authenticated;
grant execute on function public.process_withdrawal(uuid, boolean, text)             to authenticated;

-- =====================================================================
-- 7. STORAGE — private bucket "proofs" (users upload into "<their user id>/...")
-- =====================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('proofs', 'proofs', false, 5242880, array['image/png', 'image/jpeg', 'image/webp'])
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "proofs_insert_own_folder" on storage.objects;
create policy "proofs_insert_own_folder" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'proofs'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "proofs_select_own_or_admin" on storage.objects;
create policy "proofs_select_own_or_admin" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'proofs'
    and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin())
  );

drop policy if exists "proofs_delete_own_folder" on storage.objects;
create policy "proofs_delete_own_folder" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'proofs'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- =====================================================================
-- 8. SEED — 4 sample membership plans (only if the table is empty)
-- =====================================================================

insert into public.plans (name, price, duration_days, benefits, sort_order)
select * from (values
  ('Bronze',   1000::numeric,  30, array['Daily market insights', 'Basic portfolio tracker', 'Email support', 'Access to community group'], 1),
  ('Silver',   2500::numeric,  60, array['Everything in Bronze', 'Weekly expert signals', 'Priority WhatsApp support', 'Monthly strategy webinar'], 2),
  ('Gold',     5000::numeric,  90, array['Everything in Silver', 'Daily premium signals', 'Personal account manager', 'Risk management toolkit'], 3),
  ('Platinum', 10000::numeric, 180, array['Everything in Gold', '1-on-1 monthly consultation', 'VIP early-access opportunities', '24/7 dedicated support line'], 4)
) as seed(name, price, duration_days, benefits, sort_order)
where not exists (select 1 from public.plans);

-- =====================================================================
-- 9. MAKE YOURSELF ADMIN (run separately after registering in the app):
--    update public.profiles set is_admin = true where lower(username) = 'your_username';
-- =====================================================================
