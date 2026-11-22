-- =====================================================================
--  INVEST EDGE PRO — Admin user management (run AFTER schema.sql)
--  Supabase Dashboard -> SQL Editor -> New query -> paste -> Run. Safe to re-run.
-- =====================================================================

-- Ledger now also records manual admin balance adjustments
alter table public.transactions drop constraint if exists transactions_type_check;
alter table public.transactions add constraint transactions_type_check
  check (type in ('deposit', 'purchase', 'withdrawal', 'refund', 'adjustment'));

-- Deleting a user who once processed requests (an admin) must not be blocked
alter table public.deposits drop constraint if exists deposits_processed_by_fkey;
alter table public.deposits add constraint deposits_processed_by_fkey
  foreign key (processed_by) references public.profiles (id) on delete set null;

alter table public.withdrawals drop constraint if exists withdrawals_processed_by_fkey;
alter table public.withdrawals add constraint withdrawals_processed_by_fkey
  foreign key (processed_by) references public.profiles (id) on delete set null;

-- ---------------------------------------------------------------------
-- admin_update_user — edit username / full name / phone / admin flag
-- (changing the username also changes the login, since login email = username@users.investedge.app)
-- ---------------------------------------------------------------------
create or replace function public.admin_update_user(
  p_user_id   uuid,
  p_username  text,
  p_full_name text,
  p_phone     text,
  p_is_admin  boolean
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_username  text := trim(coalesce(p_username, ''));
  v_old       text;
  v_email     text;
begin
  if not public.is_admin() then
    raise exception 'Not authorized';
  end if;
  if v_username !~ '^[A-Za-z0-9_]{3,20}$' then
    raise exception 'Username must be 3-20 letters, numbers or underscore';
  end if;

  select username into v_old from public.profiles where id = p_user_id for update;
  if not found then
    raise exception 'User not found';
  end if;
  if exists (select 1 from public.profiles where lower(username) = lower(v_username) and id <> p_user_id) then
    raise exception 'Username is already taken';
  end if;
  if p_user_id = auth.uid() and not coalesce(p_is_admin, false) then
    raise exception 'You cannot remove your own admin access';
  end if;

  update public.profiles
     set username  = v_username,
         full_name = nullif(trim(p_full_name), ''),
         phone     = nullif(trim(p_phone), ''),
         is_admin  = coalesce(p_is_admin, false)
   where id = p_user_id;

  if lower(v_old) <> lower(v_username) then
    v_email := lower(v_username) || '@users.investedge.app';
    -- only users created through the app (synthetic email) get their login renamed
    update auth.users
       set email = v_email,
           raw_user_meta_data = coalesce(raw_user_meta_data, '{}'::jsonb) || jsonb_build_object('username', v_username),
           updated_at = now()
     where id = p_user_id and email like '%@users.investedge.app';
    if found then
      update auth.identities
         set identity_data = identity_data || jsonb_build_object('email', v_email),
             updated_at = now()
       where user_id = p_user_id and provider = 'email';
    end if;
  end if;
end;
$$;

-- ---------------------------------------------------------------------
-- admin_adjust_balance — add (+) or deduct (-) money with a reason; writes ledger row
-- ---------------------------------------------------------------------
create or replace function public.admin_adjust_balance(p_user_id uuid, p_amount numeric, p_note text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_amount numeric(14,2) := round(coalesce(p_amount, 0), 2);
  v_bal    numeric(14,2);
begin
  if not public.is_admin() then
    raise exception 'Not authorized';
  end if;
  if v_amount = 0 then
    raise exception 'Amount cannot be zero';
  end if;
  if coalesce(trim(p_note), '') = '' then
    raise exception 'Please enter a reason';
  end if;

  select balance into v_bal from public.profiles where id = p_user_id for update;
  if not found then
    raise exception 'User not found';
  end if;
  if v_bal + v_amount < 0 then
    raise exception 'Balance cannot go below zero (current balance: %)', v_bal;
  end if;

  update public.profiles set balance = balance + v_amount where id = p_user_id
  returning balance into v_bal;

  insert into public.transactions (user_id, type, amount, balance_after, note)
  values (p_user_id, 'adjustment', v_amount, v_bal, 'Admin adjustment: ' || trim(p_note));
end;
$$;

-- ---------------------------------------------------------------------
-- admin_assign_plan — give a user a plan, optionally charging their wallet
-- ---------------------------------------------------------------------
create or replace function public.admin_assign_plan(p_user_id uuid, p_plan_id uuid, p_charge boolean default false)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  pl      public.plans%rowtype;
  v_bal   numeric(14,2);
  v_sub   uuid;
  v_start timestamptz := now();
begin
  if not public.is_admin() then
    raise exception 'Not authorized';
  end if;

  select * into pl from public.plans where id = p_plan_id;
  if not found then
    raise exception 'Plan not found';
  end if;

  select balance into v_bal from public.profiles where id = p_user_id for update;
  if not found then
    raise exception 'User not found';
  end if;

  if p_charge then
    if v_bal < pl.price then
      raise exception 'User has insufficient balance (%) for this plan', v_bal;
    end if;
    update public.profiles set balance = balance - pl.price where id = p_user_id
    returning balance into v_bal;
  end if;

  insert into public.subscriptions (user_id, plan_id, plan_name, price, starts_at, expires_at)
  values (p_user_id, pl.id, pl.name, case when p_charge then pl.price else 0 end,
          v_start, v_start + make_interval(days => pl.duration_days))
  returning id into v_sub;

  if p_charge then
    insert into public.transactions (user_id, type, amount, balance_after, note, ref_id)
    values (p_user_id, 'purchase', -pl.price, v_bal,
            pl.name || ' plan (' || pl.duration_days || ' days) assigned by admin', v_sub);
  end if;

  return v_sub;
end;
$$;

-- ---------------------------------------------------------------------
-- admin_update_subscription — change expiry (extend, shorten, or cancel = now())
-- ---------------------------------------------------------------------
create or replace function public.admin_update_subscription(p_sub_id uuid, p_expires_at timestamptz)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Not authorized';
  end if;
  if p_expires_at is null then
    raise exception 'Expiry date is required';
  end if;

  update public.subscriptions
     set expires_at = greatest(p_expires_at, starts_at)
   where id = p_sub_id;
  if not found then
    raise exception 'Subscription not found';
  end if;
end;
$$;

-- ---------------------------------------------------------------------
-- admin_delete_subscription — remove a subscription record (no refund)
-- ---------------------------------------------------------------------
create or replace function public.admin_delete_subscription(p_sub_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Not authorized';
  end if;
  delete from public.subscriptions where id = p_sub_id;
  if not found then
    raise exception 'Subscription not found';
  end if;
end;
$$;

-- ---------------------------------------------------------------------
-- admin_set_password — reset a user's password (there is no email reset in this app)
-- ---------------------------------------------------------------------
create or replace function public.admin_set_password(p_user_id uuid, p_password text)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  if not public.is_admin() then
    raise exception 'Not authorized';
  end if;
  if length(coalesce(p_password, '')) < 6 then
    raise exception 'Password must be at least 6 characters';
  end if;

  update auth.users
     set encrypted_password = extensions.crypt(p_password, extensions.gen_salt('bf')),
         updated_at = now()
   where id = p_user_id;
  if not found then
    raise exception 'User not found';
  end if;
end;
$$;

-- ---------------------------------------------------------------------
-- admin_delete_user — permanently deletes the login + profile + all their records
-- ---------------------------------------------------------------------
create or replace function public.admin_delete_user(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Not authorized';
  end if;
  if p_user_id = auth.uid() then
    raise exception 'You cannot delete your own account';
  end if;

  delete from auth.users where id = p_user_id;   -- cascades to profiles, deposits, withdrawals, subscriptions, transactions
  if not found then
    raise exception 'User not found';
  end if;
end;
$$;

-- Permissions
revoke execute on function public.admin_update_user(uuid, text, text, text, boolean)   from public, anon;
revoke execute on function public.admin_adjust_balance(uuid, numeric, text)            from public, anon;
revoke execute on function public.admin_assign_plan(uuid, uuid, boolean)               from public, anon;
revoke execute on function public.admin_update_subscription(uuid, timestamptz)         from public, anon;
revoke execute on function public.admin_delete_subscription(uuid)                      from public, anon;
revoke execute on function public.admin_set_password(uuid, text)                       from public, anon;
revoke execute on function public.admin_delete_user(uuid)                              from public, anon;

grant execute on function public.admin_update_user(uuid, text, text, text, boolean)    to authenticated;
grant execute on function public.admin_adjust_balance(uuid, numeric, text)             to authenticated;
grant execute on function public.admin_assign_plan(uuid, uuid, boolean)                to authenticated;
grant execute on function public.admin_update_subscription(uuid, timestamptz)          to authenticated;
grant execute on function public.admin_delete_subscription(uuid)                       to authenticated;
grant execute on function public.admin_set_password(uuid, text)                        to authenticated;
grant execute on function public.admin_delete_user(uuid)                               to authenticated;
