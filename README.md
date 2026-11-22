# Invest Edge Pro

Luxury membership & wallet web app — **React (Vite) + Tailwind CSS v3 + Supabase**.

## Folder structure

```
Invest Edge Pro/
├── .env.example                 # copy to .env and fill in
├── index.html
├── package.json
├── postcss.config.js
├── tailwind.config.js           # maroon / gold / cream theme
├── vite.config.js
├── public/
│   └── favicon.svg
├── supabase/
│   └── schema.sql               # run once in the Supabase SQL editor
└── src/
    ├── main.jsx
    ├── App.jsx                  # routes
    ├── index.css                # Tailwind + component classes (card, btn-primary, input-field…)
    ├── config.js                # ← payment accounts, WhatsApp links, min amounts
    ├── context/AuthContext.jsx  # session, profile, signIn/signUp/signOut
    ├── lib/
    │   ├── supabase.js          # client + username → email mapping
    │   └── format.js            # Rs / date / phone helpers
    ├── components/              # Header, BottomNav, Layout, Input, Modal, StatusBadge, …
    └── pages/
        ├── Login.jsx  Register.jsx  Dashboard.jsx  Plans.jsx
        ├── Deposit.jsx  Withdraw.jsx  History.jsx  Profile.jsx
        └── admin/
            ├── Admin.jsx  AdminDeposits.jsx  AdminWithdrawals.jsx
            ├── AdminPlans.jsx  AdminUsers.jsx
            └── ActionModal.jsx  StatusFilter.jsx
```

## Setup

### 1. Create a Supabase project
1. Go to <https://supabase.com/dashboard> → **New project**. Pick a name, database password and region.
2. When it is ready open **Project Settings → API** and copy the **Project URL** and the **Publishable key**.

### 2. Disable email confirmation
**Authentication → Sign In / Providers → Email** → turn **Confirm email** **OFF** → Save.
(Keep the Email provider itself enabled.) Sign-up then logs the user in immediately.

### 3. Run the SQL
**SQL Editor → New query** → paste the whole of [`supabase/schema.sql`](supabase/schema.sql) → **Run**.
Then open another **New query**, paste [`supabase/admin_users.sql`](supabase/admin_users.sql) and **Run** it too (admin user-management functions).
The first file creates the tables, triggers, RLS policies, money functions, the private `proofs` storage bucket + its policies, and 4 sample plans.

### 4. Check the storage bucket
**Storage** → you should see a **private** bucket named `proofs` (the SQL creates it).
If it is missing, click **New bucket** → name `proofs` → leave **Public bucket OFF** → Create, then re-run the SQL file so the policies are applied.

### 5. Configure the app
```bash
cp .env.example .env        # on Windows PowerShell: Copy-Item .env.example .env
```
Edit `.env`:
```
VITE_SUPABASE_URL=https://YOUR-REF.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_YOUR-KEY
```
Edit `src/config.js` to set your JazzCash / EasyPaisa / bank account details, WhatsApp support links and minimum amounts.

### 6. Install & run
```bash
npm install
npm run dev
```
Open <http://localhost:5173>.

### 7. Make yourself admin
Register an account in the app, then run in the SQL Editor:
```sql
update public.profiles set is_admin = true where lower(username) = 'your_username';
```
Refresh the app — an **Admin** button appears in the header (and in Account).

## How money moves

All balance changes happen only inside `SECURITY DEFINER` Postgres functions (called with `supabase.rpc`):

| Function | Who | Effect |
|---|---|---|
| `approve_deposit(p_deposit_id)` | admin | pending → approved, credits balance, ledger `deposit` row |
| `reject_deposit(p_deposit_id, p_note)` | admin | pending → rejected (no money moved, so no ledger row) |
| `buy_plan(p_plan_id)` | user | locks wallet, checks balance, debits, creates subscription, ledger `purchase` row |
| `request_withdrawal(...)` | user | locks wallet, checks & holds amount, creates pending withdrawal, ledger `withdrawal` row |
| `process_withdrawal(id, approve, note)` | admin | approve → `paid`; reject → refunds balance + ledger `refund` row |

Users can only update `full_name` and `phone` on their profile (column-level grants); `balance` and `is_admin` are untouchable from the client.
Deposit transaction IDs are unique per method (unless the earlier one was rejected) to block duplicate claims.
