
import { useCallback, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Alert,
  TextInput,
  Pressable,
  Image,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useFocusEffect, useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';

import AppButton from '@/components/AppButton';
import { COLORS } from '@/constants/colors';
import { useAuth, signOut } from '@/docs/lib/auth';
import {
  getProfile,
  updateProfile,
  uploadAvatar,
  type Profile,
} from '@/docs/lib/profile';

export default function ProfileScreen() {
  const { user, role } = useAuth();

  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [draftName, setDraftName] = useState('');
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const router = useRouter();

  const loadProfile = useCallback(async () => {
    if (!user) return;

    const p = await getProfile(user.id);
    setProfile(p);
    setDraftName(p?.full_name ?? '');
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      loadProfile();
    }, [loadProfile])
  );

  const handleChoosePhoto = async () => {
    if (!user || uploadingPhoto) return;

    try {
      const permission =
        await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permission.granted) {
        Alert.alert(
          'Gallery Permission',
          'Please allow photo library access to choose your profile picture.'
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (result.canceled || !result.assets?.[0]?.uri) return;

      setUploadingPhoto(true);

      const { url, error } = await uploadAvatar(
        user.id,
        result.assets[0].uri
      );

      if (error || !url) {
        Alert.alert(
          'Upload Failed',
          error ?? 'Could not save your photo.'
        );
        return;
      }

      setProfile((previous) =>
        previous ? { ...previous, avatar_url: url } : previous
      );

      Alert.alert('Success', 'Your profile picture has been updated!');
    } catch (error: any) {
      Alert.alert(
        'Error',
        error?.message ?? 'Could not choose your profile picture.'
      );
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleSaveName = async () => {
    if (!user || saving) return;

    setSaving(true);

    try {
      const { error } = await updateProfile(user.id, {
        full_name: draftName.trim(),
      });

      if (error) {
        Alert.alert('Error', error);
        return;
      }

      setProfile((previous) =>
        previous
          ? { ...previous, full_name: draftName.trim() }
          : previous
      );

      setEditing(false);
      Alert.alert('Success', 'Your name has been updated.');
    } catch (error: any) {
      Alert.alert('Error', error?.message ?? 'Could not update your name.');
    } finally {
      setSaving(false);
    }
  };

  const handleSignOut = async () => {
    if (loading) return;

    setLoading(true);

    try {
      await signOut();
      router.replace('/login');
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'Failed to sign out.');
    } finally {
      setLoading(false);
    }
  };

  const displayName =
    profile?.full_name || user?.email?.split('@')[0] || 'User';

  const roleLabel =
    profile?.role === 'admin'
      ? 'Administrator'
      : profile?.role === 'teacher'
        ? 'Teacher'
        : 'Student';

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.container}
    >
      <Text style={styles.title}>My Profile</Text>
      <Text style={styles.subtitle}>
        Manage your account and personal information
      </Text>

      {user && (
        <>
          <View style={styles.profileCard}>
            <View style={styles.avatarWrapper}>
              {profile?.avatar_url ? (
                <Image
                  source={{ uri: profile.avatar_url }}
                  style={styles.avatar}
                />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <Ionicons
                    name="person"
                    size={48}
                    color={COLORS.primary}
                  />
                </View>
              )}

              <Pressable
                style={styles.cameraButton}
                onPress={handleChoosePhoto}
                disabled={uploadingPhoto}
                accessibilityLabel="Change profile picture"
              >
                {uploadingPhoto ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Ionicons
                    name="camera"
                    size={19}
                    color="#FFFFFF"
                  />
                )}
              </Pressable>
            </View>

            <Text style={styles.profileName}>{displayName}</Text>
            <Text style={styles.profileEmail}>{user.email}</Text>

            <View style={styles.roleBadge}>
              <Ionicons
                name="shield-checkmark"
                size={15}
                color={COLORS.primaryDark}
              />
              <Text style={styles.roleText}>{roleLabel}</Text>
            </View>

            <Pressable
              style={styles.changePhotoButton}
              onPress={handleChoosePhoto}
              disabled={uploadingPhoto}
            >
              <Ionicons
                name="image-outline"
                size={18}
                color={COLORS.primary}
              />
              <Text style={styles.changePhotoText}>
                {uploadingPhoto ? 'Uploading Photo...' : 'Change Photo'}
              </Text>
            </Pressable>
          </View>

          <View style={styles.infoCard}>
            <Text style={styles.sectionTitle}>
              Personal Information
            </Text>

            <Text style={styles.label}>Full Name</Text>

            {editing ? (
              <View style={styles.nameEditRow}>
                <TextInput
                  style={styles.nameInput}
                  value={draftName}
                  onChangeText={setDraftName}
                  placeholder="Enter your name"
                  placeholderTextColor={COLORS.textSecondary}
                  editable={!saving}
                  autoCapitalize="words"
                />

                <Pressable
                  style={styles.saveButton}
                  onPress={handleSaveName}
                  disabled={saving}
                >
                  <Text style={styles.saveButtonText}>
                    {saving ? 'Saving...' : 'Save'}
                  </Text>
                </Pressable>

                <Pressable
                  onPress={() => {
                    setDraftName(profile?.full_name ?? '');
                    setEditing(false);
                  }}
                  disabled={saving}
                >
                  <Ionicons
                    name="close-circle-outline"
                    size={24}
                    color={COLORS.textSecondary}
                  />
                </Pressable>
              </View>
            ) : (
              <Pressable
                style={styles.nameRow}
                onPress={() => setEditing(true)}
              >
                <Text style={styles.value}>
                  {profile?.full_name || 'Tap to add your name'}
                </Text>
                <Text style={styles.editHint}>Edit</Text>
              </Pressable>
            )}

            <Text style={styles.label}>Email Address</Text>
            <Text style={styles.value}>{user.email}</Text>

            <Text style={styles.label}>Account Role</Text>
            <Text style={styles.value}>{roleLabel}</Text>

            <Text style={styles.label}>User ID</Text>
            <Text selectable style={styles.valueSmall}>
              {user.id}
            </Text>
          </View>
        </>
      )}

      {/* Settings - visible to all roles */}
      <Pressable
        style={styles.menuButton}
        onPress={() => router.push('/settings')}
      >
        <View style={styles.menuIcon}>
          <Ionicons
            name="settings-outline"
            size={22}
            color={COLORS.primary}
          />
        </View>
        <View style={styles.menuTextContainer}>
          <Text style={styles.menuTitle}>Settings</Text>
          <Text style={styles.menuDescription}>
            Account security and preferences
          </Text>
        </View>
        <Ionicons
          name="chevron-forward"
          size={20}
          color={COLORS.textSecondary}
        />
      </Pressable>

      {/* Admin Dashboard - admin only */}
      {role === 'admin' && (
        <Pressable
          style={styles.menuButton}
          onPress={() => router.push('/admin')}
        >
          <View style={styles.menuIcon}>
            <Ionicons
              name="grid-outline"
              size={22}
              color={COLORS.primaryDark}
            />
          </View>
          <View style={styles.menuTextContainer}>
            <Text style={styles.menuTitle}>Admin Dashboard</Text>
            <Text style={styles.menuDescription}>
              Manage the attendance system
            </Text>
          </View>
          <Ionicons
            name="chevron-forward"
            size={20}
            color={COLORS.textSecondary}
          />
        </Pressable>
      )}

      <View style={styles.signOutContainer}>
        <AppButton
          title={loading ? 'Signing Out...' : 'Sign Out'}
          icon="log-out-outline"
          onPress={handleSignOut}
        />
      </View>
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
    paddingTop: 24,
    paddingBottom: 40,
  },
  title: {
    fontSize: 27,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 5,
    marginBottom: 20,
    lineHeight: 21,
  },
  profileCard: {
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: 22,
    padding: 24,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  avatarWrapper: {
    width: 116,
    height: 116,
    marginBottom: 16,
    position: 'relative',
  },
  avatar: {
    width: 116,
    height: 116,
    borderRadius: 58,
    borderWidth: 3,
    borderColor: COLORS.primary,
  },
  avatarPlaceholder: {
    width: 116,
    height: 116,
    borderRadius: 58,
    backgroundColor: COLORS.background,
    borderWidth: 3,
    borderColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraButton: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: COLORS.card,
  },
  profileName: {
    fontSize: 21,
    fontWeight: '800',
    color: COLORS.textPrimary,
    textAlign: 'center',
  },
  profileEmail: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 5,
    textAlign: 'center',
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.background,
    paddingHorizontal: 13,
    paddingVertical: 7,
    borderRadius: 20,
    marginTop: 12,
  },
  roleText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primaryDark,
  },
  changePhotoButton: {
    marginTop: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.background,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 18,
  },
  changePhotoText: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: '700',
  },
  infoCard: {
    backgroundColor: COLORS.card,
    borderRadius: 18,
    padding: 18,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginBottom: 6,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textSecondary,
    marginBottom: 5,
    marginTop: 15,
  },
  value: {
    fontSize: 15,
    color: COLORS.textPrimary,
    fontWeight: '500',
  },
  valueSmall: {
    fontSize: 11,
    color: COLORS.textSecondary,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 30,
    gap: 8,
  },
  editHint: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.primary,
  },
  nameEditRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  nameInput: {
    flex: 1,
    backgroundColor: COLORS.background,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: COLORS.textPrimary,
  },
  saveButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  menuButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    backgroundColor: COLORS.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 12,
  },
  menuIcon: {
    width: 44,
    height: 44,
    borderRadius: 13,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuTextContainer: {
    flex: 1,
  },
  menuTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  menuDescription: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  signOutContainer: {
    marginTop: 8,
  },
});
