import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect, router } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { COLORS } from '@/constants/colors';
import { useAuth } from '@/docs/lib/auth';
import { supabase } from '@/docs/lib/supabase';
import { getProfile } from '@/docs/lib/profile';

type QuickAction = {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
  route: string;
};

type RecentCheckIn = {
  id: string;
  studentName: string;
  eventTitle: string;
  scannedAt: string;
};

type RecentEvent = {
  id: string;
  title: string;
  event_code: string;
  start: string | null;
  end: string | null;
  status: string | null;
};

const formatTime = (value: string) =>
  new Date(value).toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });

export default function AdminDashboard() {
  const { role, user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [fullName, setFullName] = useState('Administrator');
  const [stats, setStats] = useState({
    activeEvents: 0,
    todayCheckIns: 0,
    totalUsers: 0,
  });
  const [recentEvents, setRecentEvents] = useState<RecentEvent[]>([]);
  const [recentCheckIns, setRecentCheckIns] = useState<RecentCheckIn[]>([]);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (role !== 'admin') {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');

    try {
      if (user) {
        const profile = await getProfile(user.id);
        setFullName(
          profile?.full_name?.trim() ||
            user.user_metadata?.full_name?.trim() ||
            'Administrator',
        );
      }

      const now = new Date();
      const startOfDay = new Date(now);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(now);
      endOfDay.setHours(23, 59, 59, 999);
      const nowIso = now.toISOString();

      const [usersRes, activeEventsRes, todayRes, eventsRes, checkInsRes] =
        await Promise.all([
          supabase
            .from('profiles')
            .select('*', { count: 'exact', head: true }),
          supabase
            .from('events')
            .select('id', { count: 'exact', head: true })
            .lte('start', nowIso)
            .gte('end', nowIso),
          supabase
            .from('attendance')
            .select('*', { count: 'exact', head: true })
            .gte('scanned_at', startOfDay.toISOString())
            .lte('scanned_at', endOfDay.toISOString()),
          supabase
            .from('events')
            .select('id,title,event_code,start,"end",status')
            .order('created_at', { ascending: false })
            .limit(4),
          supabase
            .from('attendance')
            .select('id,event_id,student_id,scanned_at')
            .order('scanned_at', { ascending: false })
            .limit(5),
        ]);

      const failed = [
        usersRes,
        activeEventsRes,
        todayRes,
        eventsRes,
        checkInsRes,
      ].find((result) => result.error);
      if (failed?.error) throw failed.error;

      setStats({
        activeEvents: activeEventsRes.count ?? 0,
        todayCheckIns: todayRes.count ?? 0,
        totalUsers: usersRes.count ?? 0,
      });
      setRecentEvents((eventsRes.data ?? []) as RecentEvent[]);

      const checkIns = checkInsRes.data ?? [];
      const eventIds = [...new Set(checkIns.map((row) => row.event_id))];
      const studentIds = [...new Set(checkIns.map((row) => row.student_id))];

      const [eventNamesRes, studentNamesRes] = await Promise.all([
        eventIds.length
          ? supabase.from('events').select('id,title').in('id', eventIds)
          : Promise.resolve({ data: [], error: null }),
        studentIds.length
          ? supabase.from('profiles').select('id,full_name,email').in('id', studentIds)
          : Promise.resolve({ data: [], error: null }),
      ]);

      if (eventNamesRes.error) throw eventNamesRes.error;
      if (studentNamesRes.error) throw studentNamesRes.error;

      const eventMap = new Map(
        (eventNamesRes.data ?? []).map((event: any) => [event.id, event.title]),
      );
      const studentMap = new Map(
        (studentNamesRes.data ?? []).map((profile: any) => [
          profile.id,
          profile.full_name?.trim() || profile.email || 'Student',
        ]),
      );

      setRecentCheckIns(
        checkIns.map((row) => ({
          id: row.id,
          studentName: studentMap.get(row.student_id) || 'Student',
          eventTitle: eventMap.get(row.event_id) || 'Campus event',
          scannedAt: row.scanned_at,
        })),
      );
    } catch (e: any) {
      console.error('Admin dashboard load error:', e);
      setError(e?.message ?? 'Could not load dashboard data. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [role, user]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  if (role !== 'admin') {
    return (
      <View style={s.center}>
        <Ionicons name="lock-closed-outline" size={44} color={COLORS.primary} />
        <Text style={s.pageTitle}>Administrators Only</Text>
        <Text style={s.muted}>This dashboard is available only to administrator accounts.</Text>
      </View>
    );
  }

  const actions: QuickAction[] = [
    { icon: 'people-outline', title: 'Manage Users', description: 'Review student and teacher accounts', route: '/users' },
    { icon: 'calendar-outline', title: 'Manage Events', description: 'Create and update campus events', route: '/events-admin' },
    { icon: 'time-outline', title: 'Attendance History', description: 'Review attendance records', route: '/history' },
    { icon: 'bar-chart-outline', title: 'System Reports', description: 'View detailed statistics', route: '/reports' },
  ];

  return (
    <ScrollView style={s.screen} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
      <View style={s.topRow}>
        <View style={s.brandIcon}>
          <Ionicons name="grid-outline" size={24} color={COLORS.primaryDark} />
        </View>
        <View style={s.brandTextWrap}>
          <Text style={s.brandTitle}>QR-ATT</Text>
          <Text style={s.brandCaption}>ADMIN WORKSPACE</Text>
        </View>
        <View style={s.adminBadge}><Text style={s.adminBadgeText}>ADMIN</Text></View>
      </View>

      <View style={s.welcome}>
        <Text style={s.kicker}>CAMPUS OPERATIONS</Text>
        <Text style={s.welcomeTitle}>Welcome, {fullName}!</Text>
        <Text style={s.welcomeCopy}>Here’s what’s happening with your attendance system today.</Text>
      </View>

      <View style={s.sectionHeader}>
        <View>
          <Text style={s.sectionTitle}>Today at a glance</Text>
          <Text style={s.sectionCaption}>Live operational overview</Text>
        </View>
        <Pressable onPress={load} style={s.refreshButton} accessibilityLabel="Refresh dashboard">
          <Ionicons name="refresh-outline" size={19} color={COLORS.primary} />
        </Pressable>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={COLORS.primary} style={{ marginVertical: 28 }} />
      ) : error ? (
        <View style={s.errorCard}>
          <Ionicons name="alert-circle-outline" size={24} color={COLORS.danger} />
          <Text style={s.errorText}>{error}</Text>
          <Pressable style={s.retryButton} onPress={load}><Text style={s.retryText}>Try again</Text></Pressable>
        </View>
      ) : (
        <View style={s.statsGrid}>
          <View style={[s.statCard, s.statCardDark]}>
            <View style={s.statIconAccent}><Ionicons name="radio-outline" size={21} color={COLORS.primaryDark} /></View>
            <Text style={s.statValueLight}>{stats.activeEvents}</Text>
            <Text style={s.statLabelLight}>Active Events</Text>
          </View>
          <View style={s.statCard}>
            <View style={s.statIcon}><Ionicons name="checkmark-done-outline" size={21} color={COLORS.primary} /></View>
            <Text style={s.statValue}>{stats.todayCheckIns}</Text>
            <Text style={s.statLabel}>Today's Check-ins</Text>
          </View>
          <View style={s.statCard}>
            <View style={s.statIcon}><Ionicons name="people-outline" size={21} color={COLORS.primary} /></View>
            <Text style={s.statValue}>{stats.totalUsers}</Text>
            <Text style={s.statLabel}>Registered Users</Text>
          </View>
        </View>
      )}

      <View style={s.sectionHeader}>
        <View>
          <Text style={s.sectionTitle}>Quick Actions</Text>
          <Text style={s.sectionCaption}>Common admin tasks</Text>
        </View>
      </View>
      <View style={s.actionGrid}>
        {actions.map((action, index) => (
          <Pressable key={action.title} style={[s.actionCard, index === 1 && s.actionCardAccent]} onPress={() => router.push(action.route as any)}>
            <View style={[s.actionIcon, index === 1 && s.actionIconWhite]}>
              <Ionicons name={action.icon} size={23} color={COLORS.primaryDark} />
            </View>
            <Text style={s.actionTitle}>{action.title}</Text>
            <Text style={s.actionDescription}>{action.description}</Text>
            <View style={s.actionArrow}><Ionicons name="arrow-forward" size={17} color={COLORS.primaryDark} /></View>
          </Pressable>
        ))}
      </View>

      <View style={s.sectionHeader}>
        <View>
          <Text style={s.sectionTitle}>Recent Check-ins</Text>
          <Text style={s.sectionCaption}>Latest attendance activity</Text>
        </View>
        <Pressable onPress={() => router.push('/history')}><Text style={s.viewAll}>View history</Text></Pressable>
      </View>
      {loading ? null : recentCheckIns.length === 0 ? (
        <View style={s.emptyCard}>
          <Ionicons name="time-outline" size={28} color={COLORS.textSecondary} />
          <Text style={s.emptyTitle}>No check-ins yet</Text>
          <Text style={s.muted}>Recent attendance records will appear here.</Text>
        </View>
      ) : (
        recentCheckIns.map((checkIn) => (
          <View key={checkIn.id} style={s.checkInRow}>
            <View style={s.checkIcon}><Ionicons name="checkmark" size={18} color={COLORS.success} /></View>
            <View style={s.checkInInfo}>
              <Text style={s.checkInName}>{checkIn.studentName}</Text>
              <Text style={s.muted} numberOfLines={1}>{checkIn.eventTitle}</Text>
            </View>
            <Text style={s.checkInTime}>{formatTime(checkIn.scannedAt)}</Text>
          </View>
        ))
      )}

      <View style={s.sectionHeader}>
        <View>
          <Text style={s.sectionTitle}>Recently Created Events</Text>
          <Text style={s.sectionCaption}>Latest event setup</Text>
        </View>
        <Pressable onPress={() => router.push('/events-admin')}><Text style={s.viewAll}>View all</Text></Pressable>
      </View>
      {loading ? null : recentEvents.length === 0 ? (
        <View style={s.emptyCard}><Text style={s.muted}>No events have been created yet.</Text></View>
      ) : recentEvents.map((event) => (
        <View key={event.id} style={s.eventRow}>
          <View style={s.eventIcon}><Ionicons name="calendar-outline" size={21} color={COLORS.primary} /></View>
          <View style={s.eventInfo}>
            <Text style={s.eventTitle} numberOfLines={1}>{event.title}</Text>
            <Text style={s.muted}>{event.event_code}</Text>
            <Text style={s.muted}>Starts: {event.start ? formatTime(event.start) : 'Not set'}</Text>
          </View>
          <View style={s.statusPill}><Text style={s.statusText}>{event.status || 'Created'}</Text></View>
        </View>
      ))}
      <Text style={s.footer}>QR-ATT • Campus Attendance Management</Text>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: 18, paddingBottom: 38 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: COLORS.background, gap: 10 },
  topRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 22, gap: 11 },
  brandIcon: { width: 48, height: 48, borderRadius: 15, backgroundColor: '#FFC928', alignItems: 'center', justifyContent: 'center' },
  brandTextWrap: { flex: 1 },
  brandTitle: { fontSize: 20, fontWeight: '900', color: COLORS.textPrimary, letterSpacing: 0.4 },
  brandCaption: { fontSize: 9, fontWeight: '800', letterSpacing: 1.5, color: COLORS.textSecondary, marginTop: 2 },
  adminBadge: { backgroundColor: COLORS.primary, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20 },
  adminBadgeText: { color: '#FFFFFF', fontSize: 10, fontWeight: '800', letterSpacing: 0.8 },
  welcome: { backgroundColor: COLORS.primaryDark, borderRadius: 24, padding: 23, marginBottom: 25 },
  kicker: { color: '#FFC928', fontSize: 10, fontWeight: '900', letterSpacing: 2 },
  welcomeTitle: { color: '#FFFFFF', fontSize: 25, fontWeight: '900', marginTop: 13 },
  welcomeCopy: { color: '#E7EEF8', fontSize: 14, lineHeight: 21, marginTop: 7 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4, marginBottom: 12 },
  sectionTitle: { color: COLORS.textPrimary, fontSize: 19, fontWeight: '900' },
  sectionCaption: { color: COLORS.textSecondary, fontSize: 12, marginTop: 3 },
  refreshButton: { width: 40, height: 40, borderRadius: 13, backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border, alignItems: 'center', justifyContent: 'center' },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 24 },
  statCard: { flexGrow: 1, flexBasis: '30%', minWidth: 145, backgroundColor: COLORS.card, borderRadius: 18, borderWidth: 1, borderColor: COLORS.border, padding: 15 },
  statCardDark: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  statIcon: { width: 38, height: 38, borderRadius: 12, backgroundColor: COLORS.surface, alignItems: 'center', justifyContent: 'center' },
  statIconAccent: { width: 38, height: 38, borderRadius: 12, backgroundColor: '#FFC928', alignItems: 'center', justifyContent: 'center' },
  statValue: { fontSize: 27, fontWeight: '900', color: COLORS.textPrimary, marginTop: 13 },
  statValueLight: { fontSize: 27, fontWeight: '900', color: '#FFFFFF', marginTop: 13 },
  statLabel: { color: COLORS.textSecondary, fontSize: 12, marginTop: 3 },
  statLabelLight: { color: '#E7EEF8', fontSize: 12, marginTop: 3 },
  actionGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 23 },
  actionCard: { width: '48%', flexGrow: 1, minWidth: 145, minHeight: 154, padding: 14, borderRadius: 18, backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border },
  actionCardAccent: { backgroundColor: '#FFC928', borderColor: '#FFC928' },
  actionIcon: { width: 42, height: 42, borderRadius: 13, backgroundColor: COLORS.surface, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  actionIconWhite: { backgroundColor: '#FFFFFF' },
  actionTitle: { fontSize: 14, fontWeight: '800', color: COLORS.textPrimary },
  actionDescription: { color: COLORS.textSecondary, fontSize: 11, lineHeight: 16, marginTop: 5, paddingRight: 8 },
  actionArrow: { position: 'absolute', right: 12, top: 12 },
  viewAll: { color: COLORS.primary, fontSize: 12, fontWeight: '800' },
  checkInRow: { flexDirection: 'row', alignItems: 'center', gap: 11, padding: 13, borderRadius: 15, backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border, marginBottom: 9 },
  checkIcon: { width: 36, height: 36, borderRadius: 12, backgroundColor: '#E7F8EF', alignItems: 'center', justifyContent: 'center' },
  checkInInfo: { flex: 1 },
  checkInName: { color: COLORS.textPrimary, fontSize: 13, fontWeight: '800' },
  checkInTime: { color: COLORS.textSecondary, fontSize: 10, maxWidth: 94, textAlign: 'right' },
  emptyCard: { alignItems: 'center', justifyContent: 'center', padding: 22, backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border, borderRadius: 17, marginBottom: 20 },
  emptyTitle: { color: COLORS.textPrimary, fontSize: 14, fontWeight: '800', marginTop: 7 },
  eventRow: { flexDirection: 'row', alignItems: 'center', gap: 11, backgroundColor: COLORS.card, borderRadius: 16, borderWidth: 1, borderColor: COLORS.border, padding: 13, marginBottom: 9 },
  eventIcon: { width: 42, height: 42, borderRadius: 13, backgroundColor: COLORS.surface, alignItems: 'center', justifyContent: 'center' },
  eventInfo: { flex: 1 },
  eventTitle: { fontSize: 14, fontWeight: '800', color: COLORS.textPrimary },
  statusPill: { paddingHorizontal: 9, paddingVertical: 6, borderRadius: 20, backgroundColor: '#E7F8EF' },
  statusText: { color: COLORS.success, fontSize: 10, fontWeight: '800' },
  muted: { fontSize: 12, lineHeight: 18, color: COLORS.textSecondary, marginTop: 3 },
  errorCard: { padding: 16, borderRadius: 16, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.card, marginBottom: 22, gap: 8 },
  errorText: { color: COLORS.danger, fontSize: 13, lineHeight: 19 },
  retryButton: { alignSelf: 'flex-start', backgroundColor: COLORS.primary, paddingHorizontal: 14, paddingVertical: 9, borderRadius: 10, marginTop: 3 },
  retryText: { color: '#FFFFFF', fontSize: 12, fontWeight: '800' },
  pageTitle: { fontSize: 23, fontWeight: '900', color: COLORS.textPrimary, marginTop: 8 },
  footer: { color: COLORS.textSecondary, textAlign: 'center', fontSize: 10, marginTop: 20 },
});
