
import { Redirect, Stack, useSegments } from 'expo-router';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { useEffect } from 'react';

import { COLORS } from '@/constants/colors';
import { useAuth, restoreAuth } from '@/docs/lib/auth';

export default function RootLayout() {
  const { session, loading, role } = useAuth();
  const segments = useSegments();

  useEffect(() => {
    void restoreAuth();
  }, []);

  console.log('[ROOT DEBUG]', {
    loading,
    role,
    hasSession: !!session,
    segments,
  });

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  const path = segments[0];
  const second = (segments as string[])[1];

  const inAuthGroup = path === 'login' || path === 'register';
  const inTabsGroup = path === '(tabs)';

  if (!session && inTabsGroup) {
    return <Redirect href="/login" />;
  }

  if (session && inAuthGroup) {
    if (role === 'admin') {
      return <Redirect href="/admin" />;
    }

    if (role === 'teacher') {
      return <Redirect href="/teacher" />;
    }

    if (role === 'student') {
      return <Redirect href="/" />;
    }
  }

  if (
    session &&
    role === 'admin' &&
    inTabsGroup &&
    (!second || second === 'index')
  ) {
    return <Redirect href="/admin" />;
  }

  if (
    session &&
    role !== 'admin' &&
    inTabsGroup &&
    ['admin', 'users', 'events-admin', 'reports'].includes(second ?? '')
  ) {
    return <Redirect href="/" />;
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="login" />
      <Stack.Screen name="register" />
      <Stack.Screen name="(tabs)" />
    </Stack>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
});
