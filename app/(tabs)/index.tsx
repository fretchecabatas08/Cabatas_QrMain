
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
  Pressable,
} from 'react-native';

import { COLORS } from '@/constants/colors';
import { useAuth } from '@/docs/lib/auth';

type ActionItem = {
  title: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
  route: string;
  highlight?: boolean;
};

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

  const roleLabel = isAdmin
    ? 'ADMINISTRATOR'
    : isTeacher
      ? 'TEACHER'
      : 'STUDENT';

  const subtitle = isStudent
    ? 'Stay on track with your campus events and attendance.'
    : isTeacher
      ? 'Manage your events and monitor student attendance.'
      : isAdmin
        ? 'Manage users, events, and attendance records.'
        : 'Welcome to QR-ATT Campus Attendance.';

  const actions: ActionItem[] = isAdmin
    ? [
        {
          title: 'User Management',
          subtitle: 'Manage accounts',
          icon: 'people-outline',
          route: '/users',
        },
        {
          title: 'Event Management',
          subtitle: 'Manage campus events',
          icon: 'calendar-outline',
          route: '/events-admin',
        },
        {
          title: 'Attendance',
          subtitle: 'View attendance records',
          icon: 'clipboard-outline',
          route: '/history',
        },
        {
          title: 'Reports',
          subtitle: 'Review summaries',
          icon: 'bar-chart-outline',
          route: '/reports',
          highlight: true,
        },
      ]
    : isTeacher
      ? [
          {
            title: 'Create Event',
            subtitle: 'Set up a new event',
            icon: 'add-circle-outline',
            route: '/teacher',
            highlight: true,
          },
          {
            title: 'My Events',
            subtitle: 'Manage your events',
            icon: 'calendar-outline',
            route: '/teacher',
          },
          {
            title: 'Attendance',
            subtitle: 'Review records',
            icon: 'people-outline',
            route: '/history',
          },
          {
            title: 'My Profile',
            subtitle: 'View your account',
            icon: 'person-outline',
            route: '/profile',
          },
        ]
      : [
          {
            title: 'Scan QR',
            subtitle: 'Record attendance',
            icon: 'scan-outline',
            route: '/scan',
            highlight: true,
          },
          {
            title: 'Events',
            subtitle: 'Explore campus events',
            icon: 'calendar-outline',
            route: '/events',
          },
          {
            title: 'My History',
            subtitle: 'Review attendance',
            icon: 'time-outline',
            route: '/history',
          },
          {
            title: 'My Profile',
            subtitle: 'View your account',
            icon: 'person-outline',
            route: '/profile',
          },
        ];

  function openRoute(route: string) {
    router.push(route as never);
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Navy brand header */}
        <View style={styles.hero}>
          <View style={styles.heroTop}>
            <View style={styles.brandRow}>
              <View style={styles.brandIcon}>
                <Ionicons
                  name="qr-code"
                  size={25}
                  color={COLORS.primaryDark}
                />
              </View>

              <View>
                <Text style={styles.brandName}>QR-ATT</Text>
                <Text style={styles.brandCaption}>
                  CAMPUS ATTENDANCE
                </Text>
              </View>
            </View>

            <View style={styles.roleBadge}>
              <Text style={styles.roleBadgeText}>{roleLabel}</Text>
            </View>
          </View>

          <View style={styles.welcomeArea}>
            <Text style={styles.greeting}>WELCOME BACK,</Text>
            <Text style={styles.name} numberOfLines={2}>
              {displayName}
            </Text>
            <Text style={styles.heroSubtitle}>{subtitle}</Text>
          </View>

          <View style={styles.heroBottomRow}>
            <View style={styles.heroAccent} />
            <Text style={styles.heroFooter}>
              YOUR CAMPUS. YOUR ATTENDANCE.
            </Text>
          </View>
        </View>

        <View style={styles.content}>
          {/* Student scan feature */}
          {isStudent && (
            <Pressable
              onPress={() => openRoute('/scan')}
              style={({ pressed }) => [
                styles.scanBanner,
                pressed && styles.pressed,
              ]}
            >
              <View style={styles.scanIconBox}>
                <Ionicons
                  name="scan-outline"
                  size={29}
                  color={COLORS.primaryDark}
                />
              </View>

              <View style={styles.scanCopy}>
                <Text style={styles.scanEyebrow}>QUICK CHECK-IN</Text>
                <Text style={styles.scanTitle}>Ready to check in?</Text>
                <Text style={styles.scanSubtitle}>
                  Scan your event QR code to record attendance.
                </Text>
              </View>

              <Ionicons
                name="arrow-forward-circle"
                size={29}
                color={COLORS.primaryDark}
              />
            </Pressable>
          )}

          {/* Dashboard heading */}
          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionTitle}>
                {isAdmin
                  ? 'Administration'
                  : isTeacher
                    ? 'Teacher Workspace'
                    : 'Your Workspace'}
              </Text>
              <Text style={styles.sectionSubtitle}>
                Choose an action to get started
              </Text>
            </View>

            <View style={styles.sectionMark}>
              <Ionicons
                name="grid-outline"
                size={19}
                color={COLORS.primary}
              />
            </View>
          </View>

          {/* Role-specific action grid */}
          <View style={styles.actionGrid}>
            {actions.map((action) => (
              <Pressable
                key={action.title}
                onPress={() => openRoute(action.route)}
                style={({ pressed }) => [
                  styles.actionCard,
                  action.highlight && styles.highlightCard,
                  pressed && styles.pressed,
                ]}
              >
                <View
                  style={[
                    styles.actionIcon,
                    action.highlight && styles.highlightIcon,
                  ]}
                >
                  <Ionicons
                    name={action.icon}
                    size={24}
                    color={
                      action.highlight
                        ? COLORS.primaryDark
                        : COLORS.primary
                    }
                  />
                </View>

                <Text style={styles.actionTitle}>
                  {action.title}
                </Text>
                <Text style={styles.actionSubtitle}>
                  {action.subtitle}
                </Text>

                <View style={styles.actionArrow}>
                  <Ionicons
                    name="arrow-forward"
                    size={16}
                    color={COLORS.textSecondary}
                  />
                </View>
              </Pressable>
            ))}
          </View>

          {/* Helpful information */}
          <View style={styles.infoCard}>
            <View style={styles.infoIcon}>
              <Ionicons
                name="shield-checkmark-outline"
                size={24}
                color={COLORS.primary}
              />
            </View>

            <View style={styles.infoContent}>
              <Text style={styles.infoTitle}>
                Attendance made simple
              </Text>
              <Text style={styles.infoText}>
                {isStudent
                  ? 'Scan the QR code provided at your school event. Check your History to review your recorded attendance.'
                  : isTeacher
                    ? 'Create events, share QR codes with students, and review attendance records through your workspace.'
                    : 'Use the administration tools to manage accounts, events, attendance records, and reports.'}
              </Text>
            </View>
          </View>

          {/* Profile shortcut for staff */}
          {(isTeacher || isAdmin) && (
            <Pressable
              onPress={() => openRoute('/profile')}
              style={({ pressed }) => [
                styles.profileLink,
                pressed && styles.pressed,
              ]}
            >
              <Ionicons
                name="person-circle-outline"
                size={22}
                color={COLORS.primary}
              />
              <Text style={styles.profileLinkText}>My Profile</Text>
              <Ionicons
                name="chevron-forward"
                size={19}
                color={COLORS.textSecondary}
              />
            </Pressable>
          )}

          <View style={styles.footer}>
            <View style={styles.footerLine} />
            <Text style={styles.footerBrand}>QR-ATT</Text>
            <Text style={styles.footerCaption}>
              CAMPUS ATTENDANCE SYSTEM
            </Text>
          </View>
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
  scrollContent: {
    paddingBottom: 30,
  },
  hero: {
    backgroundColor: COLORS.primaryDark,
    paddingHorizontal: 22,
    paddingTop: 20,
    paddingBottom: 26,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    overflow: 'hidden',
  },
  heroTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
  },
  brandIcon: {
    width: 48,
    height: 48,
    borderRadius: 15,
    backgroundColor: COLORS.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandName: {
    fontSize: 20,
    fontWeight: '900',
    color: COLORS.textOnPrimary,
    letterSpacing: 0.5,
  },
  brandCaption: {
    marginTop: 3,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1.1,
    color: '#CBD8E8',
  },
  roleBadge: {
    backgroundColor: 'rgba(255,255,255,0.10)',
    borderColor: 'rgba(255,255,255,0.25)',
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  roleBadgeText: {
    color: COLORS.textOnPrimary,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  welcomeArea: {
    marginTop: 31,
  },
  greeting: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.8,
    color: COLORS.accent,
    marginBottom: 8,
  },
  name: {
    fontSize: 30,
    lineHeight: 37,
    fontWeight: '900',
    color: COLORS.textOnPrimary,
    marginBottom: 9,
  },
  heroSubtitle: {
    fontSize: 14,
    lineHeight: 22,
    color: '#D9E4F2',
    maxWidth: 330,
  },
  heroBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    marginTop: 23,
  },
  heroAccent: {
    width: 30,
    height: 4,
    borderRadius: 3,
    backgroundColor: COLORS.accent,
  },
  heroFooter: {
    fontSize: 9,
    letterSpacing: 1.1,
    fontWeight: '800',
    color: '#CBD8E8',
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 23,
  },
  scanBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: COLORS.accent,
    padding: 16,
    borderRadius: 20,
    marginBottom: 27,
  },
  scanIconBox: {
    width: 49,
    height: 49,
    borderRadius: 15,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scanCopy: {
    flex: 1,
  },
  scanEyebrow: {
    color: COLORS.primaryDark,
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1,
    marginBottom: 4,
  },
  scanTitle: {
    color: COLORS.primaryDark,
    fontSize: 16,
    fontWeight: '900',
    marginBottom: 4,
  },
  scanSubtitle: {
    color: COLORS.primaryDark,
    fontSize: 11,
    lineHeight: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  sectionTitle: {
    color: COLORS.textPrimary,
    fontSize: 20,
    fontWeight: '900',
  },
  sectionSubtitle: {
    color: COLORS.textSecondary,
    fontSize: 12,
    marginTop: 4,
  },
  sectionMark: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 22,
  },
  actionCard: {
    width: '48%',
    flexGrow: 1,
    flexBasis: '42%',
    minHeight: 155,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 19,
    padding: 15,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.045,
    shadowRadius: 8,
    elevation: 2,
  },
  highlightCard: {
    backgroundColor: COLORS.accent,
    borderColor: COLORS.accent,
  },
  actionIcon: {
    width: 45,
    height: 45,
    borderRadius: 14,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  highlightIcon: {
    backgroundColor: '#FFFFFF',
  },
  actionTitle: {
    color: COLORS.textPrimary,
    fontSize: 14,
    fontWeight: '900',
    marginBottom: 5,
  },
  actionSubtitle: {
    color: COLORS.textSecondary,
    fontSize: 11,
    lineHeight: 16,
    paddingRight: 3,
  },
  actionArrow: {
    position: 'absolute',
    right: 12,
    top: 13,
  },
  infoCard: {
    flexDirection: 'row',
    gap: 13,
    padding: 17,
    backgroundColor: COLORS.card,
    borderRadius: 19,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  infoIcon: {
    width: 43,
    height: 43,
    borderRadius: 14,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoContent: {
    flex: 1,
  },
  infoTitle: {
    color: COLORS.textPrimary,
    fontSize: 14,
    fontWeight: '900',
    marginBottom: 6,
  },
  infoText: {
    color: COLORS.textSecondary,
    fontSize: 12,
    lineHeight: 19,
  },
  profileLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 14,
    padding: 15,
    backgroundColor: COLORS.card,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  profileLinkText: {
    flex: 1,
    color: COLORS.textPrimary,
    fontSize: 14,
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.78,
  },
  footer: {
    alignItems: 'center',
    marginTop: 28,
    paddingBottom: 10,
  },
  footerLine: {
    width: 38,
    height: 3,
    borderRadius: 3,
    backgroundColor: COLORS.accent,
    marginBottom: 12,
  },
  footerBrand: {
    color: COLORS.primary,
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 1.4,
  },
  footerCaption: {
    color: COLORS.textSecondary,
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 1.2,
    marginTop: 4,
  },
});
