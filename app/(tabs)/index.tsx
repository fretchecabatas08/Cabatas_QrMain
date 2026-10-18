import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import AppButton from '@/components/AppButton';
import { COLORS } from '@/constants/colors';
import { useAuth } from '@/docs/lib/auth';

export default function Index() {
  const { user, role } = useAuth();

  const normalizedRole = String(role ?? '').toLowerCase();
  const isStudent = normalizedRole === 'student';
  const isTeacher = normalizedRole === 'teacher';
  const isAdmin = normalizedRole === 'admin';

  const displayName =
    user?.user_metadata?.full_name ||
    user?.email?.split('@')[0] ||
    (isTeacher ? 'Teacher' : isAdmin ? 'Admin' : 'Student');

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.pagePadding}>
          {/* Brand */}
          <View style={styles.topRow}>
            <View style={styles.brandMark}>
              <Ionicons
                name="qr-code"
                size={23}
                color={COLORS.textOnPrimary}
              />
            </View>

            <View style={styles.topCopy}>
              <Text style={styles.brandName}>QR-ATT</Text>
              <Text style={styles.brandCaption}>CAMPUS ATTENDANCE</Text>
            </View>

            <View style={styles.rolePill}>
              <Text style={styles.roleText}>
                {normalizedRole || 'USER'}
              </Text>
            </View>
          </View>

          {/* Welcome */}
          <View style={styles.welcomeBlock}>
            <Text style={styles.greeting}>WELCOME BACK</Text>
            <Text style={styles.mainTitle}>{displayName}</Text>

            <Text style={styles.subtitle}>
              {isStudent
                ? 'Keep your school event attendance simple. Scan the event QR code when you arrive.'
                : isTeacher
                  ? 'Manage your school events and monitor student attendance in one place.'
                  : isAdmin
                    ? 'Manage users, events, and attendance records from your dashboard.'
                    : 'Welcome to QR-ATT Campus Attendance.'}
            </Text>
          </View>

          {/* STUDENT ONLY: Scan QR card */}
          {isStudent && (
            <View style={styles.scanCard}>
              <View style={styles.scanIcon}>
                <Ionicons
                  name="scan-outline"
                  size={34}
                  color={COLORS.primary}
                />
              </View>

              <View style={styles.scanCopy}>
                <Text style={styles.scanTitle}>Ready to check in?</Text>
                <Text style={styles.scanSubtitle}>
                  Open the scanner and record your attendance.
                </Text>
              </View>

              <AppButton
                theme="primary"
                title="Scan QR Code"
                icon="qr-code-outline"
                onPress={() => router.push('/scan')}
              />
            </View>
          )}

          {/* TEACHER DASHBOARD */}
          {isTeacher && (
            <>
              <Text style={styles.sectionTitle}>Teacher Quick Actions</Text>

              <View style={styles.quickActions}>
                <AppButton
                  title="Create Event"
                  icon="add-circle-outline"
                  onPress={() => router.push('/teacher')}
                />

                <AppButton
                  title="My Events"
                  icon="calendar-outline"
                  onPress={() => router.push('/teacher')}
                />

                <AppButton
                  title="Attendance Records"
                  icon="people-outline"
                  onPress={() => router.push('/history')}
                />
              </View>

              <View style={styles.infoCard}>
                <View style={styles.infoIcon}>
                  <Ionicons
                    name="school-outline"
                    size={22}
                    color={COLORS.primary}
                  />
                </View>

                <View style={styles.infoCopy}>
                  <Text style={styles.infoTitle}>
                    Manage your school events
                  </Text>
                  <Text style={styles.infoText}>
                    Create events, share event QR codes, and review attendance
                    records using your teacher tools.
                  </Text>
                </View>
              </View>
            </>
          )}

          {/* ADMIN DASHBOARD */}
          {isAdmin && (
            <>
              <Text style={styles.sectionTitle}>Admin Quick Actions</Text>

              <View style={styles.quickActions}>
                <AppButton
                  title="User Management"
                  icon="people-outline"
                  onPress={() => router.push('/users')}
                />

                <AppButton
                  title="Event Management"
                  icon="calendar-outline"
                  onPress={() => router.push('/events-admin')}
                />

                <AppButton
                  title="Attendance Records"
                  icon="clipboard-outline"
                  onPress={() => router.push('/history')}
                />

                <AppButton
                  title="Reports"
                  icon="bar-chart-outline"
                  onPress={() => router.push('/reports')}
                />
              </View>
            </>
          )}

          {/* STUDENT QUICK ACCESS */}
          {isStudent && (
            <>
              <Text style={styles.sectionTitle}>Quick access</Text>

              <View style={styles.quickActions}>
                <AppButton
                  title="Attendance History"
                  icon="time-outline"
                  onPress={() => router.push('/history')}
                />

                <AppButton
                  title="My Profile"
                  icon="person-circle-outline"
                  onPress={() => router.push('/profile')}
                />
              </View>

              <View style={styles.infoCard}>
                <View style={styles.infoIcon}>
                  <Ionicons
                    name="shield-checkmark-outline"
                    size={22}
                    color={COLORS.primary}
                  />
                </View>

                <View style={styles.infoCopy}>
                  <Text style={styles.infoTitle}>
                    Attendance made easy
                  </Text>
                  <Text style={styles.infoText}>
                    Scan the QR code provided for your school event and review
                    your recorded attendance in History.
                  </Text>
                </View>
              </View>
            </>
          )}

          {/* Profile access for Teacher and Admin */}
          {(isTeacher || isAdmin) && (
            <View style={styles.profileAction}>
              <AppButton
                title="My Profile"
                icon="person-circle-outline"
                onPress={() => router.push('/profile')}
              />
            </View>
          )}

          <Text style={styles.footer}>
            QR-ATT • School Event Attendance
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 28,
  },
  pagePadding: {
    paddingHorizontal: 22,
    paddingTop: 14,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 30,
    gap: 11,
  },
  brandMark: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topCopy: {
    flex: 1,
  },
  brandName: {
    color: COLORS.textPrimary,
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  brandCaption: {
    color: COLORS.textSecondary,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1.2,
    marginTop: 2,
  },
  rolePill: {
    backgroundColor: COLORS.surface,
    borderColor: COLORS.border,
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  roleText: {
    color: COLORS.primaryDark,
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  welcomeBlock: {
    marginBottom: 24,
  },
  greeting: {
    color: COLORS.primary,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.7,
    marginBottom: 8,
  },
  mainTitle: {
    fontSize: 30,
    lineHeight: 36,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 23,
    color: COLORS.textSecondary,
  },
  scanCard: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 22,
    padding: 18,
    marginBottom: 28,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 14,
    elevation: 2,
  },
  scanIcon: {
    width: 58,
    height: 58,
    borderRadius: 18,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  scanCopy: {
    marginBottom: 18,
  },
  scanTitle: {
    fontSize: 19,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginBottom: 5,
  },
  scanSubtitle: {
    fontSize: 13,
    lineHeight: 19,
    color: COLORS.textSecondary,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginBottom: 13,
  },
  quickActions: {
    gap: 10,
    marginBottom: 22,
  },
  profileAction: {
    marginTop: 4,
  },
  infoCard: {
    flexDirection: 'row',
    gap: 12,
    padding: 16,
    borderRadius: 18,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  infoIcon: {
    width: 40,
    height: 40,
    borderRadius: 13,
    backgroundColor: COLORS.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoCopy: {
    flex: 1,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginBottom: 5,
  },
  infoText: {
    fontSize: 12,
    lineHeight: 18,
    color: COLORS.textSecondary,
  },
  footer: {
    textAlign: 'center',
    color: COLORS.textSecondary,
    fontSize: 11,
    marginTop: 24,
  },
});