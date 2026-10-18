import { useCallback, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Alert,
  TextInput,
  Pressable,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';

import AppButton from '@/components/AppButton';
import { COLORS } from '@/constants/colors';
import { useAuth, signOut } from '@/docs/lib/auth';
import {
  getProfile,
  updateProfile,
  type Profile,
} from '@/docs/lib/profile';

export default function ProfileScreen() {
  const { user, role } = useAuth();
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [draftName, setDraftName] = useState('');
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

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

  const handleSaveName = async () => {
    if (!user) return;

    setSaving(true);

    const { error } = await updateProfile(user.id, {
      full_name: draftName.trim(),
    });

    setSaving(false);

    if (error) {
      Alert.alert('Error', error);
      return;
    }

    setProfile((prev) =>
      prev
        ? {
            ...prev,
            full_name: draftName.trim(),
          }
        : prev
    );

    setEditing(false);
  };

  const handleSignOut = async () => {
    setLoading(true);

    try {
      await signOut();
      router.replace('/login');
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to sign out.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>My Profile</Text>

      {user && (
        <View style={styles.infoCard}>
           {/* Role */}
          <View
            style={[
              styles.roleBadge,
              profile?.role === 'student' &&
                styles.roleBadgeStudent,
            ]}
          >
            <Text style={styles.roleBadgeText}>
              {profile?.role === 'admin'
                ? 'Admin'
                : profile?.role === 'teacher'
                  ? 'Teacher'
                  : 'Student'}
            </Text>
          </View>
          

          {/* Name */}
          <Text style={styles.label}>Name</Text>

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

          {/* Email */}
          <Text style={styles.label}>Email</Text>
          <Text style={styles.value}>{user.email}</Text>

          {/* User ID */}
          <Text style={styles.label}>User ID</Text>
          <Text style={styles.valueSmall}>{user.id}</Text>
        </View>
      )}
      
{role === 'admin' && (
  <Pressable
    style={styles.adminButton}
    onPress={() => router.push('/admin')}
  >
    <Text style={styles.adminButtonText}>
      🛡️  Admin Dashboard
    </Text>
  </Pressable>
)}


      <AppButton
      
        title={loading ? 'Signing Out...' : 'Sign Out'}
        icon="log-out-outline"
        onPress={handleSignOut}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    paddingHorizontal: 24,
    paddingTop: 24,
  },

  title: {
    fontSize: 20,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 16,
  },

  infoCard: {
    backgroundColor: COLORS.card,
    borderRadius: 14,
    padding: 16,
    marginBottom: 24,
  },

  roleBadge: {
    alignSelf: 'flex-start',
    backgroundColor: COLORS.primary,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
    marginBottom: 8,
  },

  roleBadgeStudent: {
    opacity: 0.8,
  },

  roleBadgeText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  label: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: 4,
    marginTop: 12,
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
  },

  editHint: {
    fontSize: 13,
    fontWeight: '600',
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
    paddingVertical: 9,
    fontSize: 15,
    color: COLORS.textPrimary,
  },

  saveButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },

  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  
adminButton: {
  backgroundColor: COLORS.card,
  borderWidth: 1,
  borderColor: COLORS.primary,
  borderRadius: 12,
  paddingVertical: 14,
  paddingHorizontal: 16,
  alignItems: 'center',
  marginBottom: 12,
},

adminButtonText: {
  color: COLORS.primary,
  fontSize: 15,
  fontWeight: '700',
},

});