import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { supabase, usernameToEmail } from '../lib/supabase';

const AuthContext = createContext(null);

function friendlyAuthError(error) {
  const msg = error?.message || 'Something went wrong. Please try again.';
  if (/invalid login credentials/i.test(msg)) return 'Incorrect username/email or password.';
  if (/already registered|already exists/i.test(msg)) return 'This username is already taken. Please choose another.';
  if (/database error saving new user/i.test(msg)) return 'This username or email is already registered.';
  if (/email not confirmed/i.test(msg))
    return 'Account not activated. The admin must disable "Confirm email" in Supabase Auth settings.';
  if (/rate limit/i.test(msg)) return 'Too many attempts. Please wait a minute and try again.';
  if (/failed to fetch/i.test(msg)) return 'Network error — check your internet connection or Supabase URL.';
  if (/same.*password|different from the old/i.test(msg)) return 'New password must be different from the current one.';
  return msg;
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);

  const fetchProfile = useCallback(async (userId) => {
    if (!userId) {
      setProfile(null);
      return null;
    }
    setProfileLoading(true);
    const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
    setProfileLoading(false);
    if (error) {
      console.error('Failed to load profile:', error);
      return null;
    }
    setProfile(data);
    return data;
  }, []);

  useEffect(() => {
    let active = true;

    supabase.auth.getSession().then(async ({ data }) => {
      if (!active) return;
      setSession(data.session);
      if (data.session) await fetchProfile(data.session.user.id);
      if (active) setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, newSession) => {
      setSession(newSession);
      if (!newSession) {
        setProfile(null);
      } else if (event === 'SIGNED_IN' || event === 'USER_UPDATED') {
        // Defer DB calls out of the auth callback to avoid supabase-js lock deadlocks.
        setTimeout(() => fetchProfile(newSession.user.id), 0);
      }
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [fetchProfile]);

  const signIn = useCallback(
    async (username, password) => {
      let email = usernameToEmail(username);
      if (username.includes('@')) {
        // Typed an email: find the account's internal login email.
        const { data: loginEmail, error: lookupError } = await supabase.rpc('login_email_for', { p_email: username.trim() });
        if (!lookupError && loginEmail) email = loginEmail;
      }
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw new Error(friendlyAuthError(error));
      setSession(data.session);
      const prof = await fetchProfile(data.user.id);
      return { ...data, profile: prof };
    },
    [fetchProfile],
  );

  const signUp = useCallback(
    async ({ email, fullName, username, phone, password }) => {
      const cleanUsername = username.trim();
      const { data, error } = await supabase.auth.signUp({
        email: usernameToEmail(cleanUsername),
        password,
        options: {
          data: {
            username: cleanUsername,
            full_name: fullName?.trim() || cleanUsername,
            phone,
            email: email?.trim().toLowerCase() || null,
          },
        },
      });
      if (error) throw new Error(friendlyAuthError(error));
      if (!data.session) {
        throw new Error(
          'Account created, but "Confirm email" is still enabled in Supabase. Disable it in Authentication → Sign In / Providers → Email, then log in.',
        );
      }
      setSession(data.session);
      await fetchProfile(data.user.id);
      return data;
    },
    [fetchProfile],
  );

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setSession(null);
    setProfile(null);
  }, []);

  const updatePassword = useCallback(async (newPassword) => {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) throw new Error(friendlyAuthError(error));
  }, []);

  const userId = session?.user?.id;
  const refreshProfile = useCallback(() => fetchProfile(userId), [fetchProfile, userId]);

  const value = useMemo(
    () => ({
      session,
      user: session?.user ?? null,
      profile,
      loading,
      profileLoading,
      isAdmin: Boolean(profile?.is_admin),
      signIn,
      signUp,
      signOut,
      updatePassword,
      refreshProfile,
    }),
    [session, profile, loading, profileLoading, signIn, signUp, signOut, updatePassword, refreshProfile],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
