
import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { COLORS } from '@/constants/colors';
import { useAuth } from '@/docs/lib/auth';
import {
  getAttendanceHistory,
  type AttendanceRecord,
  getTeacherEventAttendance,
  type TeacherEventAttendance,
} from '@/docs/lib/attendance';
import { getProfile, type Role } from '@/docs/lib/profile';
import { supabase } from '@/docs/lib/supabase';

type AdminEventAttendance = {
  id: string;
  event_code: string;
  title: string;
  start: string;
  end: string;
  status?: string;
  attendees: {
    id: string;
    student_id: string;
    scanned_at: string;
    name: string;
  }[];
};

const fmt = (value?: string | null) => {
  if (!value) return 'Not set';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Not set' : date.toLocaleString();
};

const shortId = (id: string) => id ? `…${id.slice(-8)}` : 'Unknown student';

function PageHeader({
  subtitle,
  onRefresh,
  refreshing,
}: {
  subtitle: string;
  onRefresh: () => void;
  refreshing: boolean;
}) {
  return (
    <View>
      <View style={s.pageHeader}>
        <View style={s.headerIcon}>
          <Ionicons
            name="time-outline"
            size={27}
            color={COLORS.textOnAccent ?? '#123B6D'}
          />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.pageTitle}>Attendance History</Text>
          <Text style={s.subtitle}>{subtitle}</Text>
        </View>
      </View>

      <Pressable
        style={s.refresh}
        onPress={onRefresh}
        disabled={refreshing}
      >
        <Ionicons
          name="refresh-outline"
          size={18}
          color={COLORS.primary}
        />
        <Text style={s.refreshText}>
          {refreshing ? 'Refreshing...' : 'Refresh records'}
        </Text>
      </Pressable>
    </View>
  );
}

function EmptyState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <View style={s.empty}>
      <View style={s.emptyIcon}>
        <Ionicons
          name="file-tray-outline"
          size={32}
          color={COLORS.primary}
        />
      </View>
      <Text style={s.emptyTitle}>{title}</Text>
      <Text style={s.muted}>{description}</Text>
    </View>
  );
}

export default function HistoryScreen() {
  const { user } = useAuth();

  const [role, setRole] = useState<Role | null>(null);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [teacherEvents, setTeacherEvents] =
    useState<TeacherEventAttendance[]>([]);
  const [adminEvents, setAdminEvents] =
    useState<AdminEventAttendance[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) {
      setRole(null);
      setRecords([]);
      setTeacherEvents([]);
      setAdminEvents([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      const profile = await getProfile(user.id);
      const currentRole = profile?.role ?? 'student';

      setRole(currentRole);

      if (currentRole === 'admin') {
        const [eventResult, attendanceResult, profileResult] =
          await Promise.all([
            supabase
              .from('events')
              .select('id,event_code,title,start,"end",status')
              .order('created_at', { ascending: false }),

            supabase
              .from('attendance')
              .select('id,event_id,student_id,scanned_at')
              .order('scanned_at', { ascending: false }),

            supabase
              .from('profiles')
              .select('id,full_name,email'),
          ]);

        const failed = [
          eventResult,
          attendanceResult,
          profileResult,
        ].find((result) => result.error);

        if (failed?.error) throw failed.error;

        const profileMap = new Map(
          (profileResult.data ?? []).map((profile) => [
            profile.id,
            profile.full_name || profile.email || shortId(profile.id),
          ])
        );

        const attendance = attendanceResult.data ?? [];

        setAdminEvents(
          (eventResult.data ?? []).map((event) => ({
            ...event,
            attendees: attendance
              .filter((item) => item.event_id === event.id)
              .map((item) => ({
                id: item.id,
                student_id: item.student_id,
                scanned_at: item.scanned_at,
                name:
                  profileMap.get(item.student_id) ||
                  shortId(item.student_id),
              })),
          }))
        );

        setRecords([]);
        setTeacherEvents([]);
      } else if (currentRole === 'teacher') {
        setTeacherEvents(await getTeacherEventAttendance(user.id));
        setRecords([]);
        setAdminEvents([]);
      } else {
        setRecords(await getAttendanceHistory(user.id));
        setTeacherEvents([]);
        setAdminEvents([]);
      }
    } catch (error: any) {
      console.error('History loading error', error);

      Alert.alert(
        'Could not load history',
        error?.message ?? 'Please try again.'
      );

      setRecords([]);
      setTeacherEvents([]);
      setAdminEvents([]);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const removeAttendance = (recordId: string) => {
    Alert.alert(
      'Remove attendance record?',
      'This action permanently removes the selected attendance record.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            const { error } = await supabase
              .from('attendance')
              .delete()
              .eq('id', recordId);

            if (error) {
              Alert.alert('Could not remove record', error.message);
            } else {
              Alert.alert('Removed', 'Attendance record was removed.');
              load();
            }
          },
        },
      ]
    );
  };

  if (!user) {
    return (
      <View style={s.center}>
        <Ionicons
          name="person-circle-outline"
          size={44}
          color={COLORS.primary}
        />
        <Text style={s.centerTitle}>Please log in</Text>
        <Text style={s.muted}>
          Log in to view your attendance history.
        </Text>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={s.center}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={s.muted}>Loading attendance history...</Text>
      </View>
    );
  }

  // ADMIN HISTORY
  if (role === 'admin') {
    const totalRecords = adminEvents.reduce(
      (sum, event) => sum + event.attendees.length,
      0
    );

    const uniqueStudents = new Set(
      adminEvents.flatMap((event) =>
        event.attendees.map((attendee) => attendee.student_id)
      )
    ).size;

    return (
      <FlatList
        style={s.screen}
        contentContainerStyle={s.content}
        data={adminEvents}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={
          <View>
            <PageHeader
              subtitle="Review attendance across all campus events."
              onRefresh={load}
              refreshing={loading}
            />

            <View style={s.hero}>
              <Text style={s.heroEyebrow}>ADMIN OVERVIEW</Text>
              <Text style={s.heroTitle}>Attendance records</Text>
              <Text style={s.heroDescription}>
                Monitor events and review student check-ins.
              </Text>

              <View style={s.heroStats}>
                <View style={s.heroStat}>
                  <Text style={s.heroValue}>{adminEvents.length}</Text>
                  <Text style={s.heroLabel}>Events</Text>
                </View>
                <View style={s.heroDivider} />
                <View style={s.heroStat}>
                  <Text style={s.heroValue}>{uniqueStudents}</Text>
                  <Text style={s.heroLabel}>Unique students</Text>
                </View>
                <View style={s.heroDivider} />
                <View style={s.heroStat}>
                  <Text style={s.heroValue}>{totalRecords}</Text>
                  <Text style={s.heroLabel}>Check-ins</Text>
                </View>
              </View>
            </View>

            <View style={s.sectionHeader}>
              <View style={{ flex: 1 }}>
                <Text style={s.sectionTitle}>All Events</Text>
                <Text style={s.sectionSubtitle}>
                  Latest events appear first
                </Text>
              </View>
              <View style={s.smallBadge}>
                <Ionicons
                  name="calendar-outline"
                  size={19}
                  color={COLORS.primary}
                />
              </View>
            </View>
          </View>
        }
        ListEmptyComponent={
          <EmptyState
            title="No events yet"
            description="Created events will appear here with their attendance records."
          />
        }
        renderItem={({ item }) => {
          const uniqueEventStudents = new Set(
            item.attendees.map((attendee) => attendee.student_id)
          ).size;

          return (
            <View style={s.eventCard}>
              <View style={s.eventHeader}>
                <View style={s.eventIcon}>
                  <Ionicons
                    name="calendar"
                    size={21}
                    color={COLORS.primary}
                  />
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={s.eventTitle}>{item.title}</Text>
                  <Text style={s.eventCode}>
                    {item.event_code || 'No event code'}
                  </Text>
                </View>

                <View style={s.countBadge}>
                  <Text style={s.countText}>{uniqueEventStudents}</Text>
                </View>
              </View>

              <View style={s.eventMetaBox}>
                <View style={s.metaRow}>
                  <Ionicons
                    name="play-circle-outline"
                    size={16}
                    color={COLORS.textSecondary}
                  />
                  <Text style={s.meta}>Start: {fmt(item.start)}</Text>
                </View>
                <View style={s.metaRow}>
                  <Ionicons
                    name="time-outline"
                    size={16}
                    color={COLORS.textSecondary}
                  />
                  <Text style={s.meta}>End: {fmt(item.end)}</Text>
                </View>
              </View>

              <View style={s.attendeeHeading}>
                <Text style={s.attendeeTitle}>Students who scanned</Text>
                <Text style={s.attendeeTotal}>
                  {item.attendees.length} records
                </Text>
              </View>

              {item.attendees.length === 0 ? (
                <Text style={s.muted}>
                  No students have scanned this event yet.
                </Text>
              ) : (
                item.attendees.map((attendee) => (
                  <View key={attendee.id} style={s.attendeeRow}>
                    <View style={s.avatar}>
                      <Ionicons
                        name="person-outline"
                        size={17}
                        color={COLORS.primary}
                      />
                    </View>

                    <View style={{ flex: 1 }}>
                      <Text style={s.student}>{attendee.name}</Text>
                      <Text style={s.muted}>
                        {fmt(attendee.scanned_at)}
                      </Text>
                    </View>

                    <Pressable
                      onPress={() => removeAttendance(attendee.id)}
                      style={s.deleteButton}
                      accessibilityLabel={`Remove attendance for ${attendee.name}`}
                    >
                      <Ionicons
                        name="trash-outline"
                        size={16}
                        color={COLORS.danger}
                      />
                    </Pressable>
                  </View>
                ))
              )}
            </View>
          );
        }}
      />
    );
  }

  // TEACHER HISTORY
  if (role === 'teacher') {
    const teacherTotal = teacherEvents.reduce(
      (sum, event) => sum + event.attendeeCount,
      0
    );

    return (
      <FlatList
        style={s.screen}
        contentContainerStyle={s.content}
        data={teacherEvents}
        keyExtractor={(item) => item.eventId}
        ListHeaderComponent={
          <View>
            <PageHeader
              subtitle="Attendance for events you created."
              onRefresh={load}
              refreshing={loading}
            />

            <View style={s.hero}>
              <Text style={s.heroEyebrow}>TEACHER OVERVIEW</Text>
              <Text style={s.heroTitle}>My event attendance</Text>
              <Text style={s.heroDescription}>
                Review check-ins for your campus events.
              </Text>

              <View style={s.heroStats}>
                <View style={s.heroStat}>
                  <Text style={s.heroValue}>{teacherEvents.length}</Text>
                  <Text style={s.heroLabel}>My events</Text>
                </View>
                <View style={s.heroDivider} />
                <View style={s.heroStat}>
                  <Text style={s.heroValue}>{teacherTotal}</Text>
                  <Text style={s.heroLabel}>Attendance records</Text>
                </View>
              </View>
            </View>

            <View style={s.sectionHeader}>
              <View style={{ flex: 1 }}>
                <Text style={s.sectionTitle}>My Events</Text>
                <Text style={s.sectionSubtitle}>
                  Student check-ins by event
                </Text>
              </View>
              <View style={s.smallBadge}>
                <Ionicons
                  name="school-outline"
                  size={19}
                  color={COLORS.primary}
                />
              </View>
            </View>
          </View>
        }
        ListEmptyComponent={
          <EmptyState
            title="No events yet"
            description="Create an event from the Teacher tab to see its attendance history."
          />
        }
        renderItem={({ item }) => (
          <View style={s.eventCard}>
            <View style={s.eventHeader}>
              <View style={s.eventIcon}>
                <Ionicons
                  name="calendar"
                  size={21}
                  color={COLORS.primary}
                />
              </View>

              <View style={{ flex: 1 }}>
                <Text style={s.eventTitle}>{item.title}</Text>
                <Text style={s.eventCode}>{item.eventCode}</Text>
              </View>

              <View style={s.countBadge}>
                <Text style={s.countText}>{item.attendeeCount}</Text>
              </View>
            </View>

            <View style={s.eventMetaBox}>
              {item.startTime ? (
                <View style={s.metaRow}>
                  <Ionicons
                    name="play-circle-outline"
                    size={16}
                    color={COLORS.textSecondary}
                  />
                  <Text style={s.meta}>Start: {fmt(item.startTime)}</Text>
                </View>
              ) : null}

              {item.endTime ? (
                <View style={s.metaRow}>
                  <Ionicons
                    name="time-outline"
                    size={16}
                    color={COLORS.textSecondary}
                  />
                  <Text style={s.meta}>End: {fmt(item.endTime)}</Text>
                </View>
              ) : null}
            </View>

            <View style={s.attendeeHeading}>
              <Text style={s.attendeeTitle}>Students who scanned</Text>
              <Text style={s.attendeeTotal}>
                {item.attendeeCount} records
              </Text>
            </View>

            {item.attendees.length === 0 ? (
              <Text style={s.muted}>
                No students have scanned this event yet.
              </Text>
            ) : (
              item.attendees.map((attendee) => (
                <View
                  key={`${attendee.studentId}-${attendee.scannedAt}`}
                  style={s.attendeeRow}
                >
                  <View style={s.avatar}>
                    <Ionicons
                      name="person-outline"
                      size={17}
                      color={COLORS.primary}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.student}>
                      {attendee.studentName ||
                        shortId(attendee.studentId)}
                    </Text>
                    <Text style={s.muted}>
                      {fmt(attendee.scannedAt)}
                    </Text>
                  </View>
                  <View style={s.presentBadge}>
                    <Ionicons
                      name="checkmark-circle"
                      size={15}
                      color={COLORS.success}
                    />
                    <Text style={s.presentText}>Present</Text>
                  </View>
                </View>
              ))
            )}
          </View>
        )}
      />
    );
  }

  // STUDENT HISTORY
  return (
    <FlatList
      style={s.screen}
      contentContainerStyle={s.content}
      data={records}
      keyExtractor={(item) => item.id}
      ListHeaderComponent={
        <View>
          <PageHeader
            subtitle="Your personal campus attendance records."
            onRefresh={load}
            refreshing={loading}
          />

          <View style={s.hero}>
            <Text style={s.heroEyebrow}>STUDENT OVERVIEW</Text>
            <Text style={s.heroTitle}>My attendance</Text>
            <Text style={s.heroDescription}>
              Keep track of the events you have checked into.
            </Text>

            <View style={s.heroStats}>
              <View style={s.heroStat}>
                <Text style={s.heroValue}>{records.length}</Text>
                <Text style={s.heroLabel}>Check-ins</Text>
              </View>
              <View style={s.heroDivider} />
              <View style={s.heroStat}>
                <Text style={s.heroValue}>
                  {new Set(records.map((record) => record.eventId)).size}
                </Text>
                <Text style={s.heroLabel}>Events attended</Text>
              </View>
            </View>
          </View>

          <View style={s.sectionHeader}>
            <View style={{ flex: 1 }}>
              <Text style={s.sectionTitle}>My Records</Text>
              <Text style={s.sectionSubtitle}>
                Your recorded QR check-ins
              </Text>
            </View>
            <View style={s.smallBadge}>
              <Ionicons
                name="checkmark-done-outline"
                size={19}
                color={COLORS.primary}
              />
            </View>
          </View>
        </View>
      }
      ListEmptyComponent={
        <EmptyState
          title="No attendance yet"
          description="Scan an event QR code to record your attendance. Your records will appear here."
        />
      }
      renderItem={({ item }) => (
        <View style={s.eventCard}>
          <View style={s.eventHeader}>
            <View style={s.eventIcon}>
              <Ionicons
  name="calendar-outline"
  size={21}
  color={COLORS.primary}
/>
            </View>

            <View style={{ flex: 1 }}>
              <Text style={s.eventTitle}>{item.eventTitle}</Text>
              <Text style={s.eventCode}>
                Event ID: {item.eventId}
              </Text>
            </View>

            <View style={s.presentBadge}>
              <Ionicons
                name="checkmark-circle"
                size={15}
                color={COLORS.success}
              />
              <Text style={s.presentText}>Present</Text>
            </View>
          </View>

          <View style={s.eventMetaBox}>
            <View style={s.metaRow}>
              <Ionicons
                name="time-outline"
                size={16}
                color={COLORS.textSecondary}
              />
              <Text style={s.meta}>Checked in: {fmt(item.scannedAt)}</Text>
            </View>
          </View>
        </View>
      )}
    />
  );
}

const s = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    padding: 16,
    paddingBottom: 36,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.background,
    padding: 24,
    gap: 10,
  },
  centerTitle: {
    fontSize: 21,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  pageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
    marginBottom: 16,
  },
  headerIcon: {
    width: 54,
    height: 54,
    borderRadius: 17,
    backgroundColor: COLORS.accent ?? '#FFC928',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pageTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  subtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
    lineHeight: 19,
    marginTop: 4,
  },
  refresh: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 13,
    paddingVertical: 10,
    borderRadius: 12,
    marginBottom: 18,
  },
  refreshText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primary,
  },
  hero: {
    backgroundColor: COLORS.primary,
    borderRadius: 22,
    padding: 21,
    marginBottom: 25,
  },
  heroEyebrow: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.7,
    color: COLORS.accent ?? '#FFC928',
  },
  heroTitle: {
    fontSize: 23,
    fontWeight: '800',
    color: '#FFFFFF',
    marginTop: 9,
  },
  heroDescription: {
    fontSize: 13,
    lineHeight: 20,
    color: '#FFFFFF',
    marginTop: 6,
  },
  heroStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    marginTop: 20,
    paddingTop: 17,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.25)',
  },
  heroStat: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  heroValue: {
    fontSize: 25,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  heroLabel: {
    fontSize: 10,
    color: '#FFFFFF',
    textAlign: 'center',
    marginTop: 4,
  },
  heroDivider: {
    width: 1,
    height: 35,
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 13,
  },
  sectionTitle: {
    fontSize: 19,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  sectionSubtitle: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  smallBadge: {
    width: 40,
    height: 40,
    borderRadius: 13,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  eventCard: {
    backgroundColor: COLORS.card,
    borderRadius: 19,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 16,
    marginBottom: 13,
  },
  eventHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
  },
  eventIcon: {
    width: 43,
    height: 43,
    borderRadius: 14,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  eventTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  eventCode: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  countBadge: {
    minWidth: 42,
    height: 42,
    paddingHorizontal: 8,
    borderRadius: 21,
    backgroundColor: COLORS.success,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  eventMetaBox: {
    backgroundColor: COLORS.background,
    borderRadius: 12,
    padding: 11,
    marginTop: 14,
    gap: 7,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 7,
  },
  meta: {
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
    color: COLORS.textSecondary,
  },
  attendeeHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginTop: 17,
    marginBottom: 8,
  },
  attendeeTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  attendeeTotal: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  attendeeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: 11,
    marginTop: 9,
  },
  avatar: {
    width: 35,
    height: 35,
    borderRadius: 12,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  student: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  muted: {
    fontSize: 12,
    lineHeight: 18,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  presentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#E7F8EF',
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  presentText: {
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.success,
  },
  deleteButton: {
    width: 36,
    height: 36,
    borderRadius: 11,
    backgroundColor: '#FDEBED',
    alignItems: 'center',
    justifyContent: 'center',
  },
  empty: {
    alignItems: 'center',
    padding: 27,
    backgroundColor: COLORS.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginTop: 4,
  },
  emptyIcon: {
    width: 62,
    height: 62,
    borderRadius: 20,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginTop: 3,
  },
});
