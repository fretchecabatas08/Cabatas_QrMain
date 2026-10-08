
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

let listeners: Set<() => void> = new Set();

function notify() {
  listeners.forEach((listener) => listener());
}

export function setAuth(
  session: Session | null,
  role: Role | null = null
) {
  globalSession = session;
  globalUser = session?.user ?? null;
  globalRole = role;
  globalLoading = false;

  notify();
}

export function useAuth(): AuthState {
  const [, forceRender] = useState(0);

  useEffect(() => {
    const listener = () => {
      forceRender((n) => n + 1);
    };

    listeners.add(listener);

    return () => {
      listeners.delete(listener);
    };
  }, []);

  return {
    session: globalSession,
    user: globalUser,
    role: globalRole,
    loading: globalLoading,
  };
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

export async function signUp(
  email: string,
  password: string,
  profile?: SignUpProfile
) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });

  if (!error && data.session && profile) {
    await supabase
      .from('profiles')
      .update({
        full_name: profile.full_name,
        role: profile.role,
      })
      .eq('id', data.session.user.id);

    setAuth(data.session, profile.role);
  } else if (!error && data.session) {
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
  setAuth(null, null);

  supabase.auth.signOut().catch(() => {});

  return { error: null };
}