
import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { COLORS } from '@/constants/colors';
import { useAuth } from '@/docs/lib/auth';
import { supabase } from '@/docs/lib/supabase';

type ReportData = {
  users: number;
  students: number;
  teachers: number;
  admins: number;
  events: number;
  attendance: number;
};

type EventRow = {
  id: string;
  title: string;
  event_code: string;
  count: number;
};

export default function AdminReportsScreen() {
  const { role } = useAuth();

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<ReportData>({
    users: 0,
    students: 0,
    teachers: 0,
    admins: 0,
    events: 0,
    attendance: 0,
  });
  const [eventRows, setEventRows] = useState<EventRow[]>([]);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (role !== 'admin') {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');

    try {
      const [
        users,
        students,
        teachers,
        admins,
        eventsCount,
        attendanceCount,
        events,
        attendance,
      ] = await Promise.all([
        supabase.from('profiles').select('*', {
          count: 'exact',
          head: true,
        }),
        supabase.from('profiles').select('*', {
          count: 'exact',
          head: true,
        }).eq('role', 'student'),
        supabase.from('profiles').select('*', {
          count: 'exact',
          head: true,
        }).eq('role', 'teacher'),
        supabase.from('profiles').select('*', {
          count: 'exact',
          head: true,
        }).eq('role', 'admin'),
        supabase.from('events').select('*', {
          count: 'exact',
          head: true,
        }),
        supabase.from('attendance').select('*', {
          count: 'exact',
          head: true,
        }),
        supabase
          .from('events')
          .select('id,title,event_code')
          .order('created_at', { ascending: false }),
        supabase.from('attendance').select('event_id'),
      ]);

      const failed = [
        users,
        students,
        teachers,
        admins,
        eventsCount,
        attendanceCount,
        events,
        attendance,
      ].find((result) => result.error);

      if (failed?.error) throw failed.error;

      setData({
        users: users.count ?? 0,
        students: students.count ?? 0,
        teachers: teachers.count ?? 0,
        admins: admins.count ?? 0,
        events: eventsCount.count ?? 0,
        attendance: attendanceCount.count ?? 0,
      });

      const counts = new Map<string, number>();

      (attendance.data ?? []).forEach((record) => {
        if (!record.event_id) return;

        counts.set(
          record.event_id,
          (counts.get(record.event_id) ?? 0) + 1
        );
      });

      setEventRows(
        (events.data ?? []).map((event) => ({
          ...event,
          count: counts.get(event.id) ?? 0,
        }))
      );
    } catch (e: any) {
      setError(e?.message ?? 'Could not load report data.');
    } finally {
      setLoading(false);
    }
  }, [role]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  if (role !== 'admin') {
    return (
      <View style={styles.center}>
        <Ionicons
          name="lock-closed-outline"
          size={44}
          color={COLORS.primary}
        />
        <Text style={styles.accessTitle}>Administrators Only</Text>
        <Text style={styles.muted}>
          Reports are available only to administrator accounts.
        </Text>
      </View>
    );
  }

  const metrics = [
    {
      label: 'Total Users',
      value: data.users,
      icon: 'people-outline' as const,
      color: COLORS.primary,
    },
    {
      label: 'Students',
      value: data.students,
      icon: 'school-outline' as const,
      color: COLORS.primary,
    },
    {
      label: 'Teachers',
      value: data.teachers,
      icon: 'person-outline' as const,
      color: COLORS.primary,
    },
    {
      label: 'Administrators',
      value: data.admins,
      icon: 'shield-checkmark-outline' as const,
      color: COLORS.primary,
    },
    {
      label: 'Total Events',
      value: data.events,
      icon: 'calendar-outline' as const,
      color: COLORS.primary,
    },
    {
      label: 'Attendance Records',
      value: data.attendance,
      icon: 'checkmark-done-outline' as const,
      color: COLORS.primary,
    },
  ];

  const maxAttendance = Math.max(
    1,
    ...eventRows.map((event) => event.count)
  );

  const exportReport = async () => {
    const header = [
      'Event Title',
      'Event Code',
      'Attendance Records',
    ];

    const rows = eventRows.map((event) => [
      event.title,
      event.event_code,
      String(event.count),
    ]);

    const escapeCSV = (value: string) =>
      `"${value.replace(/"/g, '""')}"`;

    const csv = [header, ...rows]
      .map((row) => row.map(escapeCSV).join(','))
      .join('\r\n');

    try {
      const { Share } = await import('react-native');

      await Share.share({
        title: 'QR Attendance Report',
        message: csv,
      });
    } catch {
      Alert.alert(
        'Export unavailable',
        'Unable to open the sharing options on this device.'
      );
    }
  };

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
    >
      {/* Page heading */}
      <View style={styles.header}>
        <View style={styles.headerIcon}>
          <Ionicons
            name="bar-chart-outline"
            size={27}
            color={COLORS.textOnAccent ?? '#123B6D'}
          />
        </View>

        <View style={styles.headerText}>
          <Text style={styles.pageTitle}>System Reports</Text>
          <Text style={styles.subtitle}>
            Analytics and summaries from your QR attendance system.
          </Text>
        </View>
      </View>

      {/* Actions */}
      <View style={styles.toolbar}>
        <View style={styles.liveIndicator}>
          <View style={styles.liveDot} />
          <Text style={styles.liveText}>DATABASE SUMMARY</Text>
        </View>

        <Pressable
          style={styles.refreshButton}
          onPress={load}
          disabled={loading}
        >
          <Ionicons
            name="refresh-outline"
            size={18}
            color={COLORS.primary}
          />
          <Text style={styles.refreshText}>Refresh</Text>
        </Pressable>
      </View>

      {loading ? (
        <ActivityIndicator
          size="large"
          color={COLORS.primary}
          style={{ margin: 40 }}
        />
      ) : error ? (
        <View style={styles.errorCard}>
          <Ionicons
            name="alert-circle-outline"
            size={30}
            color={COLORS.danger}
          />
          <Text style={styles.errorTitle}>Unable to load reports</Text>
          <Text style={styles.muted}>{error}</Text>

          <Pressable style={styles.retryButton} onPress={load}>
            <Text style={styles.retryText}>Try Again</Text>
          </Pressable>
        </View>
      ) : (
        <>
          {/* Highlight card */}
          <View style={styles.heroCard}>
            <View style={styles.heroTop}>
              <View style={{ flex: 1 }}>
                <Text style={styles.heroEyebrow}>
                  ATTENDANCE OVERVIEW
                </Text>
                <Text style={styles.heroTitle}>
                  Your campus at a glance
                </Text>
                <Text style={styles.heroDescription}>
                  A summary of registered users, campus events,
                  and recorded attendance.
                </Text>
              </View>

              <View style={styles.heroIcon}>
                <Ionicons
                  name="analytics-outline"
                  size={29}
                  color={COLORS.primaryDark}
                />
              </View>
            </View>

            <View style={styles.heroDivider} />

            <View style={styles.heroStats}>
              <View style={styles.heroStat}>
                <Text style={styles.heroStatValue}>{data.users}</Text>
                <Text style={styles.heroStatLabel}>Registered users</Text>
              </View>

              <View style={styles.heroStatDivider} />

              <View style={styles.heroStat}>
                <Text style={styles.heroStatValue}>{data.events}</Text>
                <Text style={styles.heroStatLabel}>Total events</Text>
              </View>

              <View style={styles.heroStatDivider} />

              <View style={styles.heroStat}>
                <Text style={styles.heroStatValue}>{data.attendance}</Text>
                <Text style={styles.heroStatLabel}>Records</Text>
              </View>
            </View>
          </View>

          {/* Summary cards */}
          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionTitle}>System Overview</Text>
              <Text style={styles.sectionDescription}>
                Account and activity totals
              </Text>
            </View>

            <View style={styles.sectionBadge}>
              <Ionicons
                name="stats-chart-outline"
                size={17}
                color={COLORS.primary}
              />
            </View>
          </View>

          <View style={styles.metricsGrid}>
            {metrics.map((metric) => (
              <View key={metric.label} style={styles.metricCard}>
                <View style={styles.metricTop}>
                  <View style={styles.metricIcon}>
                    <Ionicons
                      name={metric.icon}
                      size={22}
                      color={metric.color}
                    />
                  </View>

                  <Ionicons
                    name="trending-up-outline"
                    size={17}
                    color={COLORS.textSecondary}
                  />
                </View>

                <Text style={styles.metricValue}>{metric.value}</Text>
                <Text style={styles.metricLabel}>{metric.label}</Text>
              </View>
            ))}
          </View>

          {/* Attendance by event */}
          <View style={styles.sectionHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.sectionTitle}>
                Attendance by Event
              </Text>
              <Text style={styles.sectionDescription}>
                Compare recorded attendance across events
              </Text>
            </View>

            <View style={styles.sectionBadge}>
              <Ionicons
                name="bar-chart-outline"
                size={18}
                color={COLORS.primary}
              />
            </View>
          </View>

          <View style={styles.chartCard}>
            <View style={styles.chartHeading}>
              <Text style={styles.chartTitle}>Event activity</Text>
              <Text style={styles.chartCaption}>
                Attendance records
              </Text>
            </View>

            {eventRows.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons
                  name="calendar-outline"
                  size={36}
                  color={COLORS.textSecondary}
                />
                <Text style={styles.emptyTitle}>No events yet</Text>
                <Text style={styles.muted}>
                  Create an event to see its attendance summary here.
                </Text>
              </View>
            ) : (
              eventRows.map((event) => {
                const progress = event.count / maxAttendance;

                return (
                  <View key={event.id} style={styles.chartRow}>
                    <View style={styles.chartRowTop}>
                      <View style={styles.eventNameGroup}>
                        <View style={styles.eventBullet} />
                        <View style={{ flex: 1 }}>
                          <Text style={styles.eventTitle}>
                            {event.title}
                          </Text>
                          <Text style={styles.eventCode}>
                            {event.event_code}
                          </Text>
                        </View>
                      </View>

                      <View style={styles.attendanceNumber}>
                        <Text style={styles.attendanceValue}>
                          {event.count}
                        </Text>
                        <Text style={styles.attendanceLabel}>
                          records
                        </Text>
                      </View>
                    </View>

                    <View style={styles.progressTrack}>
                      <View
                        style={[
                          styles.progressFill,
                          {
                            width: `${progress * 100}%`,
                          },
                        ]}
                      />
                    </View>
                  </View>
                );
              })
            )}
          </View>

          {/* Export */}
          <View style={styles.exportCard}>
            <View style={styles.exportIcon}>
              <Ionicons
                name="document-text-outline"
                size={25}
                color={COLORS.primary}
              />
            </View>

            <View style={styles.exportContent}>
              <Text style={styles.exportTitle}>Export Event Report</Text>
              <Text style={styles.exportDescription}>
                Share a CSV summary of events and attendance counts.
              </Text>
            </View>

            <Pressable
              style={styles.exportButton}
              onPress={exportReport}
              disabled={eventRows.length === 0}
            >
              <Ionicons
                name="share-outline"
                size={17}
                color="#FFFFFF"
              />
              <Text style={styles.exportButtonText}>Export</Text>
            </Pressable>
          </View>

          <Text style={styles.footer}>
            QR-ATT · Campus Attendance Reporting
          </Text>
        </>
      )}
    </ScrollView>
  );
}

const s = StyleSheet.create({});

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    padding: 18,
    paddingBottom: 40,
  },
  center: {
    flex: 1,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  accessTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginTop: 14,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
    marginBottom: 20,
  },
  headerIcon: {
    width: 54,
    height: 54,
    borderRadius: 17,
    backgroundColor: COLORS.accent ?? '#FFC928',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: {
    flex: 1,
  },
  pageTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  subtitle: {
    fontSize: 13,
    lineHeight: 19,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 18,
    gap: 10,
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.success,
  },
  liveText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
    color: COLORS.textSecondary,
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 13,
    paddingVertical: 10,
    borderRadius: 12,
  },
  refreshText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.primary,
  },
  heroCard: {
    backgroundColor: COLORS.primary,
    borderRadius: 22,
    padding: 21,
    marginBottom: 27,
  },
  heroTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  heroEyebrow: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.7,
    color: COLORS.accent ?? '#FFC928',
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
    marginTop: 9,
  },
  heroDescription: {
    fontSize: 13,
    lineHeight: 20,
    color: '#FFFFFF',
    marginTop: 7,
  },
  heroIcon: {
    width: 48,
    height: 48,
    borderRadius: 15,
    backgroundColor: COLORS.accent ?? '#FFC928',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroDivider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.25)',
    marginVertical: 19,
  },
  heroStats: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  heroStat: {
    flex: 1,
    alignItems: 'center',
  },
  heroStatValue: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  heroStatLabel: {
    fontSize: 10,
    color: '#FFFFFF',
    marginTop: 4,
    textAlign: 'center',
  },
  heroStatDivider: {
    width: 1,
    height: 34,
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 13,
    gap: 10,
  },
  sectionTitle: {
    fontSize: 19,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  sectionDescription: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 4,
    lineHeight: 18,
  },
  sectionBadge: {
    width: 40,
    height: 40,
    borderRadius: 13,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 27,
  },
  metricCard: {
    width: '47%',
    flexGrow: 1,
    backgroundColor: COLORS.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 15,
  },
  metricTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  metricIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metricValue: {
    fontSize: 29,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginTop: 13,
  },
  metricLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 3,
  },
  chartCard: {
    backgroundColor: COLORS.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 17,
    marginBottom: 22,
  },
  chartHeading: {
    marginBottom: 18,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  chartCaption: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  chartRow: {
    marginBottom: 21,
  },
  chartRowTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 10,
  },
  eventNameGroup: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  eventBullet: {
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: COLORS.accent ?? '#FFC928',
    marginTop: 5,
  },
  eventTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  eventCode: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 3,
  },
  attendanceNumber: {
    alignItems: 'flex-end',
  },
  attendanceValue: {
    fontSize: 17,
    fontWeight: '800',
    color: COLORS.primary,
  },
  attendanceLabel: {
    fontSize: 10,
    color: COLORS.textSecondary,
  },
  progressTrack: {
    height: 9,
    backgroundColor: COLORS.background,
    borderRadius: 8,
    overflow: 'hidden',
  },
  progressFill: {
    height: 9,
    backgroundColor: COLORS.primary,
    borderRadius: 8,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 24,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  muted: {
    fontSize: 13,
    lineHeight: 19,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  exportCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 18,
    padding: 15,
  },
  exportIcon: {
    width: 45,
    height: 45,
    borderRadius: 14,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  exportContent: {
    flex: 1,
  },
  exportTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  exportDescription: {
    fontSize: 11,
    lineHeight: 16,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  exportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.primary,
    borderRadius: 11,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  exportButtonText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  errorCard: {
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 22,
    gap: 10,
  },
  errorTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: COLORS.danger,
  },
  retryButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    paddingHorizontal: 18,
    paddingVertical: 11,
    marginTop: 5,
  },
  retryText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  footer: {
    textAlign: 'center',
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 20,
  },
});
