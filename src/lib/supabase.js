import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
// Supabase now labels this the "publishable" key (sb_publishable_...); the legacy "anon" JWT key also works.
const supabaseAnonKey =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

// ---------- "Remember me" ----------
// Checked   -> session kept in localStorage (stays logged in after closing the browser)
// Unchecked -> session kept in sessionStorage (logged out when the browser/tab is closed)
const REMEMBER_KEY = 'iep-remember';
const LAST_USER_KEY = 'iep-last-user';

export function getRememberMe() {
  try {
    return localStorage.getItem(REMEMBER_KEY) !== '0';
  } catch {
    return true;
  }
}

export function setRememberMe(value, username = '') {
  try {
    localStorage.setItem(REMEMBER_KEY, value ? '1' : '0');
    if (value && username) localStorage.setItem(LAST_USER_KEY, username.trim());
    else localStorage.removeItem(LAST_USER_KEY);
  } catch {
    /* storage unavailable */
  }
}

export function getRememberedUsername() {
  try {
    return localStorage.getItem(LAST_USER_KEY) || '';
  } catch {
    return '';
  }
}

const authStorage = {
  getItem(key) {
    try {
      return localStorage.getItem(key) ?? sessionStorage.getItem(key);
    } catch {
      return null;
    }
  },
  setItem(key, value) {
    try {
      if (getRememberMe()) {
        localStorage.setItem(key, value);
        sessionStorage.removeItem(key);
      } else {
        sessionStorage.setItem(key, value);
        localStorage.removeItem(key);
      }
    } catch {
      /* storage unavailable */
    }
  },
  removeItem(key) {
    try {
      localStorage.removeItem(key);
      sessionStorage.removeItem(key);
    } catch {
      /* storage unavailable */
    }
  },
};

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
      storage: authStorage,
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
