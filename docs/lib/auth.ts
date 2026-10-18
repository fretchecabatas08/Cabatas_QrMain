
import { useState, useEffect } from 'react';

import { supabase } from './supabase';

import type { Session, User } from '@supabase/supabase-js';

export type Role = 'student' | 'teacher' | 'admin';
type AuthState = {
  session: Session | null;
  user: User | null;
  role: Role | null;
  loading: boolean;
};

let globalSession: Session | null = null;
let globalUser: User | null = null;
let globalRole: Role | null = null;
let globalLoading = false;

// Keep authentication restoration single-run across RootLayout remounts.
let restorePromise: Promise<void> | null = null;
let restoreCompleted = false;

let listeners: Set<() => void> = new Set();

function notify() {
  console.log('[AUTH DEBUG] notify state:', {
    loading: globalLoading,
    hasSession: !!globalSession,
    role: globalRole,
    listeners: listeners.size,
  });

  listeners.forEach((listener) => listener());
}

export function setAuth(
  session: Session | null,
  role: Role | null = null,
) {
  globalSession = session;
  globalUser = session?.user ?? null;
  globalRole = role;
  globalLoading = false;

  notify();
}

export function useAuth(): AuthState {
  const [authState, setAuthState] = useState<AuthState>({
    session: globalSession,
    user: globalUser,
    role: globalRole,
    loading: globalLoading,
  });

  useEffect(() => {
    const listener = () => {
  console.log('[AUTH DEBUG] listener state:', {
    loading: globalLoading,
    hasSession: !!globalSession,
    role: globalRole,
  });

  setAuthState({
    session: globalSession,
    user: globalUser,
    role: globalRole,
    loading: globalLoading,
  });
};

    listeners.add(listener);

    // Sync with the latest global state when subscribing.
    listener();

    return () => {
      listeners.delete(listener);
    };
  }, []);

  return authState;
}

export type SignUpProfile = {
  full_name: string;
  role: Role;
};

async function getUserRole(userId: string): Promise<Role | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .maybeSingle();

  if (error || !data) {
    console.log('ROLE ERROR:', error);
    console.log('ROLE DATA:', data);
    return null;
  }

  return data.role as Role;
}




export function restoreAuth(): Promise<void> {
  if (restoreCompleted) return Promise.resolve();
  if (restorePromise) return restorePromise;

  globalLoading = true;
  notify();

  restorePromise = (async () => {
    let timedOut = false;
    let timeoutId: ReturnType<typeof setTimeout> | undefined;

    const restoreTask = (async () => {
      try {
        console.log('[AUTH] Starting session restoration');

        const { data, error } = await supabase.auth.getSession();

        if (timedOut) return;

        if (error || !data.session) {
          if (error) {
            console.error('[AUTH] Session error:', error.message);
          }

          setAuth(null, null);
          return;
        }

        console.log('[AUTH] Session found');

        const role = await getUserRole(data.session.user.id);

        if (timedOut) return;

        console.log('[AUTH] Role restored:', role);
        setAuth(data.session, role);
      } catch (error) {
        if (!timedOut) {
          console.error('[AUTH] Restore failed:', error);
          setAuth(null, null);
        }
      }
    })();

    const timeoutTask = new Promise<void>((resolve) => {
      timeoutId = setTimeout(() => {
        timedOut = true;
        console.error(
          '[AUTH] Restoration timed out after 12 seconds'
        );
        setAuth(null, null);
        resolve();
      }, 12000);
    });

    try {
      await Promise.race([restoreTask, timeoutTask]);
    } finally {
      if (timeoutId) clearTimeout(timeoutId);

      globalLoading = false;
      restoreCompleted = true;
      restorePromise = null;
      notify();

      console.log('[AUTH] Restoration finished'); 
    }
  })();

  return restorePromise;
}



export async function signUp(
  email: string,
  password: string,
  profile?: SignUpProfile
) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: profile ? { full_name: profile.full_name, role: profile.role } : {},
    },
  });

  if (!error && data.session) {
    const role = await getUserRole(data.session.user.id);

    setAuth(data.session, role);
  }

  return { data, error };
}

export async function signIn(
  email: string,
  password: string
) {
  const { data, error } =
    await supabase.auth.signInWithPassword({
      email,
      password,
    });

  if (!error && data.session) {
    const role = await getUserRole(data.session.user.id);

    setAuth(data.session, role);
  }

  return { data, error };
}


export async function signOut() {
  try {
    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error('[AUTH] Sign out error:', error.message);
      return { error };
    }

    setAuth(null, null);
    console.log('[AUTH] Signed out successfully');

    return { error: null };
  } catch (error) {
    console.error('[AUTH] Sign out failed:', error);
    return {
      error: error instanceof Error
        ? error
        : new Error('Unable to sign out.'),
    };
  }
}
