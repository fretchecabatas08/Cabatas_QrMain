
import { useEffect, useState } from 'react';
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
  ActivityIndicator,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import { COLORS } from '@/constants/colors';
import { useAuth } from '@/docs/lib/auth';
import { supabase } from '@/docs/lib/supabase';

type SettingsSection = 'account' | 'security' | 'about' | null;

type NotificationPreferences = {
  event_notifications: boolean;
  event_updates: boolean;
  event_reminders: boolean;
};

const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  event_notifications: false,
  event_updates: false,
  event_reminders: false,
};

export default function SettingsScreen() {
  const { user, role } = useAuth();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [activeSection, setActiveSection] =
    useState<SettingsSection>(null);
  const [notificationPreferences, setNotificationPreferences] =
    useState<NotificationPreferences>(DEFAULT_NOTIFICATION_PREFERENCES);
  const [loadingPreferences, setLoadingPreferences] = useState(true);
  const [savingPreference, setSavingPreference] = useState<keyof NotificationPreferences | null>(null);

  useEffect(() => {
    let cancelled = false;

    const loadNotificationPreferences = async () => {
      if (!user?.id) {
        setNotificationPreferences(DEFAULT_NOTIFICATION_PREFERENCES);
        setLoadingPreferences(false);
        return;
      }

      setLoadingPreferences(true);
      try {
        const { data, error } = await supabase
          .from('notification_preferences')
          .select('event_notifications, event_updates, event_reminders')
          .eq('user_id', user.id)
          .maybeSingle();

        if (error) throw error;
        if (!cancelled && data) {
          setNotificationPreferences({
            event_notifications: data.event_notifications ?? false,
            event_updates: data.event_updates ?? false,
            event_reminders: data.event_reminders ?? false,
          });
        }
      } catch (error: any) {
        if (!cancelled) {
          Alert.alert(
            'Notification Settings',
            error?.message ?? 'Could not load notification preferences.'
          );
        }
      } finally {
        if (!cancelled) setLoadingPreferences(false);
      }
    };

    loadNotificationPreferences();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const updateNotificationPreference = async (
    key: keyof NotificationPreferences,
    value: boolean
  ) => {
    if (!user?.id || savingPreference) return;

    const previousPreferences = notificationPreferences;
    const nextPreferences = { ...notificationPreferences, [key]: value };
    setNotificationPreferences(nextPreferences);
    setSavingPreference(key);

    try {
      const { error } = await supabase
        .from('notification_preferences')
        .upsert(
          {
            user_id: user.id,
            ...nextPreferences,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id' }
        );

      if (error) throw error;
    } catch (error: any) {
      setNotificationPreferences(previousPreferences);
      Alert.alert(
        'Could Not Save',
        error?.message ?? 'Your notification preference was not saved. Please try again.'
      );
    } finally {
      setSavingPreference(null);
    }
  };

  const roleLabel =
    role === 'admin'
      ? 'Administrator'
      : role === 'teacher'
        ? 'Teacher'
        : 'Student';

  const displayName =
    user?.user_metadata?.full_name ||
    user?.user_metadata?.name ||
    user?.email?.split('@')[0] ||
    'User';

  const handleChangePassword = async () => {
    if (!password || !confirmPassword) {
      Alert.alert(
        'Missing Information',
        'Please fill in both password fields.',
      );
      return;
    }

    if (password.length < 6) {
      Alert.alert('Weak Password', 'Use at least 6 characters.');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert(
        'Password Mismatch',
        'Your passwords do not match.',
      );
      return;
    }

    setSaving(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password,
      });

      if (error) {
        Alert.alert('Update Failed', error.message);
        return;
      }

      setPassword('');
      setConfirmPassword('');
      setActiveSection(null);
      Alert.alert('Success', 'Your password has been updated.');
    } catch (error: any) {
      Alert.alert(
        'Error',
        error?.message ?? 'Could not update password.',
      );
    } finally {
      setSaving(false);
    }
  };

  const settingsItems = [
    {
      section: 'account' as const,
      icon: 'person-circle-outline' as const,
      title: 'Account Information',
      description: 'View your account email and assigned role.',
    },
    {
      section: 'security' as const,
      icon: 'shield-checkmark-outline' as const,
      title: 'Security',
      description: 'Keep your account password secure.',
    },
    {
      section: 'about' as const,
      icon: 'information-circle-outline' as const,
      title: 'About QR Attendance',
      description: 'Campus attendance and event management system.',
    },
  ];

  const closeModal = () => {
    if (!saving) setActiveSection(null);
  };

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.title}>Settings</Text>
      <Text style={styles.subtitle}>
        Manage your account and security preferences.
      </Text>

      <View style={styles.roleCard}>
        <View style={styles.roleIcon}>
          <Ionicons
            name="settings-outline"
            size={27}
            color={COLORS.primaryDark}
          />
        </View>

        <View style={styles.roleInfo}>
          <Text style={styles.roleTitle}>Your Account</Text>
          <Text style={styles.roleEmail}>
            {user?.email ?? 'No email available'}
          </Text>

          <View style={styles.roleBadge}>
            <Text style={styles.roleBadgeText}>{roleLabel}</Text>
          </View>
        </View>
      </View>

      <Text style={styles.sectionTitle}>Account & Security</Text>

      <View style={styles.card}>
        {settingsItems.map((item, index) => (
          <Pressable
            key={item.section}
            onPress={() => setActiveSection(item.section)}
            accessibilityRole="button"
            accessibilityLabel={item.title}
            style={({ pressed }) => [
              styles.infoRow,
              index !== settingsItems.length - 1 && styles.rowBorder,
              pressed && styles.pressedRow,
            ]}
          >
            <View style={styles.itemIcon}>
              <Ionicons
                name={item.icon}
                size={23}
                color={COLORS.primary}
              />
            </View>

            <View style={styles.itemContent}>
              <Text style={styles.itemTitle}>{item.title}</Text>
              <Text style={styles.itemDescription}>
                {item.description}
              </Text>
            </View>

            <Ionicons
              name="chevron-forward"
              size={19}
              color={COLORS.textSecondary}
            />
          </Pressable>
        ))}
      </View>

      <Text style={styles.sectionTitle}>Notification Preferences</Text>
      <View style={styles.card}>
        <View style={styles.notificationHeader}>
          <View style={styles.notificationHeaderIcon}>
            <Ionicons name="notifications-outline" size={23} color={COLORS.primaryDark} />
          </View>
          <View style={styles.notificationHeaderText}>
            <Text style={styles.itemTitle}>Choose your alerts</Text>
            <Text style={styles.itemDescription}>
              Turn on the notifications that you want to receive.
            </Text>
          </View>
          {loadingPreferences ? (
            <ActivityIndicator color={COLORS.primary} size="small" />
          ) : null}
        </View>

        <View style={[styles.notificationRow, styles.rowBorder]}>
          <View style={styles.notificationCopy}>
            <Text style={styles.notificationTitle}>Event Notifications</Text>
            <Text style={styles.notificationTag}>Opt-in</Text>
            <Text style={styles.itemDescription}>
              Receive alerts when new campus events are created.
            </Text>
          </View>
          <Switch
            value={notificationPreferences.event_notifications}
            onValueChange={(value) => updateNotificationPreference('event_notifications', value)}
            disabled={loadingPreferences || savingPreference !== null || !user?.id}
            trackColor={{ false: COLORS.border, true: COLORS.primary }}
            thumbColor="#FFFFFF"
            accessibilityLabel="Event Notifications"
          />
        </View>

        <View style={[styles.notificationRow, styles.rowBorder]}>
          <View style={styles.notificationCopy}>
            <Text style={styles.notificationTitle}>Event Updates</Text>
            <Text style={styles.notificationTag}>Optional</Text>
            <Text style={styles.itemDescription}>
              Get notified when event details or schedules change.
            </Text>
          </View>
          <Switch
            value={notificationPreferences.event_updates}
            onValueChange={(value) => updateNotificationPreference('event_updates', value)}
            disabled={loadingPreferences || savingPreference !== null || !user?.id}
            trackColor={{ false: COLORS.border, true: COLORS.primary }}
            thumbColor="#FFFFFF"
            accessibilityLabel="Event Updates"
          />
        </View>

        <View style={styles.notificationRow}>
          <View style={styles.notificationCopy}>
            <Text style={styles.notificationTitle}>Event Reminders</Text>
            <Text style={styles.notificationTag}>Optional</Text>
            <Text style={styles.itemDescription}>
              Get reminders before an event starts.
            </Text>
          </View>
          <Switch
            value={notificationPreferences.event_reminders}
            onValueChange={(value) => updateNotificationPreference('event_reminders', value)}
            disabled={loadingPreferences || savingPreference !== null || !user?.id}
            trackColor={{ false: COLORS.border, true: COLORS.primary }}
            thumbColor="#FFFFFF"
            accessibilityLabel="Event Reminders"
          />
        </View>

        <Text style={styles.notificationFootnote}>
          Your choices are saved to your account. Actual alerts will work once the notification delivery features are connected.
        </Text>
      </View>

      <Text style={styles.sectionTitle}>Change Password</Text>

      <View style={styles.card}>
        <Text style={styles.fieldLabel}>New Password</Text>

        <View style={styles.passwordRow}>
          <TextInput
            style={styles.passwordInput}
            placeholder="Enter new password"
            placeholderTextColor={COLORS.textSecondary}
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPassword}
            autoCapitalize="none"
            autoCorrect={false}
            editable={!saving}
          />

          <Pressable
            onPress={() => setShowPassword((value) => !value)}
            style={styles.eyeButton}
            accessibilityRole="button"
            accessibilityLabel={
              showPassword ? 'Hide password' : 'Show password'
            }
          >
            <Ionicons
              name={showPassword ? 'eye-off-outline' : 'eye-outline'}
              size={21}
              color={COLORS.textSecondary}
            />
          </Pressable>
        </View>

        <Text style={styles.fieldLabel}>Confirm New Password</Text>

        <TextInput
          style={styles.input}
          placeholder="Re-enter new password"
          placeholderTextColor={COLORS.textSecondary}
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          secureTextEntry={!showPassword}
          autoCapitalize="none"
          autoCorrect={false}
          editable={!saving}
        />

        <Pressable
          style={[styles.saveButton, saving && styles.disabledButton]}
          onPress={handleChangePassword}
          disabled={saving}
          accessibilityRole="button"
        >
          {saving ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <>
              <Ionicons
                name="lock-closed-outline"
                size={18}
                color="#FFFFFF"
              />
              <Text style={styles.saveButtonText}>
                Update Password
              </Text>
            </>
          )}
        </Pressable>
      </View>

      <Text style={styles.footer}>
        QR Attendance App · Account settings
      </Text>

      <Modal
        visible={activeSection !== null}
        transparent
        animationType="fade"
        onRequestClose={closeModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View style={styles.modalHeading}>
                <View style={styles.modalIcon}>
                  <Ionicons
                    name={
                      activeSection === 'account'
                        ? 'person-circle-outline'
                        : activeSection === 'security'
                          ? 'shield-checkmark-outline'
                          : 'information-circle-outline'
                    }
                    size={25}
                    color={COLORS.primaryDark}
                  />
                </View>

                <Text style={styles.modalTitle}>
                  {activeSection === 'account'
                    ? 'Account Information'
                    : activeSection === 'security'
                      ? 'Security'
                      : 'About QR Attendance'}
                </Text>
              </View>

              <Pressable
                onPress={closeModal}
                disabled={saving}
                style={styles.closeButton}
                accessibilityRole="button"
                accessibilityLabel="Close"
              >
                <Ionicons
                  name="close"
                  size={23}
                  color={COLORS.textSecondary}
                />
              </Pressable>
            </View>

            {activeSection === 'account' && (
              <View style={styles.modalBody}>
                <View style={styles.avatar}>
                  <Ionicons
                    name="person"
                    size={34}
                    color={COLORS.primaryDark}
                  />
                </View>

                <Text style={styles.accountName}>{displayName}</Text>
                <Text style={styles.accountRole}>{roleLabel}</Text>

                <View style={styles.detailRow}>
                  <Ionicons
                    name="mail-outline"
                    size={20}
                    color={COLORS.primary}
                  />
                  <View style={styles.detailContent}>
                    <Text style={styles.detailLabel}>Email Address</Text>
                    <Text style={styles.detailValue}>
                      {user?.email ?? 'Not available'}
                    </Text>
                  </View>
                </View>

                <View style={styles.detailRow}>
                  <Ionicons
                    name="shield-checkmark-outline"
                    size={20}
                    color={COLORS.primary}
                  />
                  <View style={styles.detailContent}>
                    <Text style={styles.detailLabel}>Assigned Role</Text>
                    <Text style={styles.detailValue}>{roleLabel}</Text>
                  </View>
                </View>

                <Pressable
                  style={styles.saveButton}
                  onPress={closeModal}
                >
                  <Text style={styles.saveButtonText}>Done</Text>
                </Pressable>
              </View>
            )}

            {activeSection === 'security' && (
              <View style={styles.modalBody}>
                <View style={styles.aboutIcon}>
                  <Ionicons
                    name="lock-closed-outline"
                    size={31}
                    color={COLORS.primaryDark}
                  />
                </View>

                <Text style={styles.aboutHeading}>
                  Protect your account
                </Text>
                <Text style={styles.aboutText}>
                  Use a strong password that you do not share with
                  other people. You can change your password using
                  the form on the Settings screen.
                </Text>

                <Pressable
                  style={styles.saveButton}
                  onPress={() => setActiveSection(null)}
                >
                  <Text style={styles.saveButtonText}>
                    Go to Change Password
                  </Text>
                </Pressable>
              </View>
            )}

            {activeSection === 'about' && (
              <View style={styles.modalBody}>
                <View style={styles.aboutIcon}>
                  <Ionicons
                    name="qr-code-outline"
                    size={35}
                    color={COLORS.primaryDark}
                  />
                </View>

                <Text style={styles.aboutHeading}>
                  QR Attendance
                </Text>
                <Text style={styles.aboutVersion}>
                  Campus Attendance Management System
                </Text>

                <Text style={styles.aboutText}>
                  QR Attendance is designed to help the school manage
                  events and record student attendance using QR codes.
                  It provides account access based on user roles and
                  attendance history for authorized users.
                </Text>

                <View style={styles.featureList}>
                  {[
                    ['qr-code-outline', 'QR attendance scanning'],
                    ['calendar-outline', 'Event management'],
                    ['time-outline', 'Attendance history'],
                    ['people-outline', 'Role-based access'],
                  ].map(([icon, label]) => (
                    <View key={label} style={styles.featureRow}>
                      <Ionicons
                        name={icon as keyof typeof Ionicons.glyphMap}
                        size={19}
                        color={COLORS.primary}
                      />
                      <Text style={styles.featureText}>{label}</Text>
                    </View>
                  ))}
                </View>

                <Text style={styles.credits}>
                  Developed for campus attendance management.
                </Text>

                <Pressable
                  style={styles.saveButton}
                  onPress={closeModal}
                >
                  <Text style={styles.saveButtonText}>Done</Text>
                </Pressable>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  container: {
    padding: 20,
    paddingBottom: 40,
  },
  title: {
    fontSize: 27,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 21,
    color: COLORS.textSecondary,
    marginTop: 5,
    marginBottom: 20,
  },
  roleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 18,
    backgroundColor: COLORS.primary,
    borderRadius: 20,
    marginBottom: 25,
  },
  roleIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: COLORS.accent ?? '#FFC928',
    alignItems: 'center',
    justifyContent: 'center',
  },
  roleInfo: {
    flex: 1,
  },
  roleTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  roleEmail: {
    fontSize: 13,
    color: '#FFFFFF',
    marginTop: 4,
  },
  roleBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginTop: 8,
  },
  roleBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.primaryDark,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginBottom: 12,
  },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 16,
    marginBottom: 24,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 15,
    paddingHorizontal: 2,
  },
  pressedRow: {
    opacity: 0.65,
    backgroundColor: COLORS.background,
  },
  rowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  itemIcon: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemContent: {
    flex: 1,
  },
  itemTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  itemDescription: {
    fontSize: 12,
    lineHeight: 18,
    color: COLORS.textSecondary,
    marginTop: 3,
  },
  notificationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  notificationHeaderIcon: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: COLORS.accent ?? '#FFC928',
    alignItems: 'center',
    justifyContent: 'center',
  },
  notificationHeaderText: {
    flex: 1,
  },
  notificationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 15,
  },
  notificationCopy: {
    flex: 1,
  },
  notificationTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  notificationTag: {
    alignSelf: 'flex-start',
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.primaryDark,
    backgroundColor: COLORS.accent ?? '#FFC928',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
    marginTop: 5,
    marginBottom: 4,
    overflow: 'hidden',
  },
  notificationFootnote: {
    fontSize: 11,
    lineHeight: 16,
    color: COLORS.textSecondary,
    marginTop: 10,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 7,
    marginTop: 8,
  },
  input: {
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingHorizontal: 13,
    paddingVertical: 12,
    fontSize: 14,
    color: COLORS.textPrimary,
    marginBottom: 12,
  },
  passwordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    backgroundColor: COLORS.background,
    marginBottom: 12,
  },
  passwordInput: {
    flex: 1,
    paddingHorizontal: 13,
    paddingVertical: 12,
    fontSize: 14,
    color: COLORS.textPrimary,
  },
  eyeButton: {
    paddingHorizontal: 13,
    paddingVertical: 10,
  },
  saveButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 9,
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 14,
    marginTop: 12,
  },
  disabledButton: {
    opacity: 0.65,
  },
  saveButtonText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(9, 25, 48, 0.58)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 480,
    maxHeight: '90%',
    backgroundColor: COLORS.card,
    borderRadius: 22,
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 18,
  },
  modalHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  modalIcon: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: COLORS.accent ?? '#FFC928',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  closeButton: {
    padding: 5,
  },
  modalBody: {
    alignItems: 'center',
  },
  avatar: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: COLORS.accent ?? '#FFC928',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  accountName: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.textPrimary,
    textAlign: 'center',
  },
  accountRole: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primary,
    backgroundColor: COLORS.background,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginTop: 8,
    marginBottom: 18,
  },
  detailRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 13,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  detailContent: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginTop: 4,
  },
  aboutIcon: {
    width: 68,
    height: 68,
    borderRadius: 22,
    backgroundColor: COLORS.accent ?? '#FFC928',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 13,
  },
  aboutHeading: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.textPrimary,
    textAlign: 'center',
  },
  aboutVersion: {
    fontSize: 12,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: 6,
  },
  aboutText: {
    fontSize: 13,
    lineHeight: 21,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: 14,
  },
  featureList: {
    width: '100%',
    marginTop: 16,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    paddingVertical: 9,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  featureText: {
    fontSize: 13,
    color: COLORS.textPrimary,
    fontWeight: '600',
  },
  credits: {
    fontSize: 11,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: 14,
  },
  footer: {
    textAlign: 'center',
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
});
