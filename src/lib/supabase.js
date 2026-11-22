import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
// Supabase now labels this the "publishable" key (sb_publishable_...); the legacy "anon" JWT key also works.
const supabaseAnonKey =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

// Fallback values only keep the app from crashing before .env is filled in;
// App.jsx shows a setup screen when isSupabaseConfigured is false.
export const supabase = createClient(
  supabaseUrl || 'http://localhost:54321',
  supabaseAnonKey || 'missing-anon-key',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
    },
  },
);

/**
 * A second client that never stores a session. Admins use it to create new users
 * via auth.signUp without being logged out of their own admin session.
 */
let signupClient = null;
export function getSignupClient() {
  if (!signupClient) {
    signupClient = createClient(supabaseUrl || 'http://localhost:54321', supabaseAnonKey || 'missing-anon-key', {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
        storageKey: 'iep-admin-signup',
      },
    });
  }
  return signupClient;
}

export const EMAIL_DOMAIN = 'users.investedge.app';

/**
 * Supabase Auth needs an email, so usernames are mapped to a synthetic address.
 * If a real email is typed (e.g. an admin created in the Supabase dashboard), it is used as-is.
 */
export function usernameToEmail(username) {
  const value = String(username).trim().toLowerCase();
  return value.includes('@') ? value : `${value}@${EMAIL_DOMAIN}`;
}

/** Turns Postgres / PostgREST errors into a short user-facing message. */
export function friendlyDbError(error, fallback = 'Something went wrong. Please try again.') {
  if (!error) return fallback;
  if (error.code === '23505') return 'This transaction ID has already been submitted.';
  if (error.code === '42501') return 'You are not allowed to perform this action.';
  if (/failed to fetch/i.test(error.message || '')) return 'Network error — please check your connection.';
  return error.message || fallback;
}
