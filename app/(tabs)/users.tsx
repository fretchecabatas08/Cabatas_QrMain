import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { COLORS } from '@/constants/colors';
import { useAuth } from '@/docs/lib/auth';
import { supabase } from '@/docs/lib/supabase';

type Role = 'student' | 'teacher' | 'admin';
type ChangeableRole = 'student' | 'teacher';

type UserProfile = {
  id: string;
  email: string;
  full_name: string | null;
  role: Role;
};

export default function AdminUsersScreen() {
  const { role, user } = useAuth();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [changing, setChanging] = useState(false);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | Role>('all');
  const [pendingChange, setPendingChange] = useState<{
    target: UserProfile;
    next: ChangeableRole;
  } | null>(null);
  const [notice, setNotice] = useState('');

  const load = useCallback(async () => {
    if (role !== 'admin') {
      setLoading(false);
      setRefreshing(false);
      return;
    }

    setLoading(true);
    const { data, error } = await supabase
      .from('profiles')
      .select('id,email,full_name,role')
      .order('email');

    if (error) {
      setNotice(`Could not load users: ${error.message}`);
    } else {
      setUsers((data ?? []) as UserProfile[]);
      setNotice('');
    }

    setLoading(false);
    setRefreshing(false);
  }, [role]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const filtered = useMemo(
    () =>
      users.filter((u) => {
        const term = search.trim().toLowerCase();
        return (
          (filter === 'all' || u.role === filter) &&
          (!term ||
            `${u.full_name ?? ''} ${u.email}`.toLowerCase().includes(term))
        );
      }),
    [users, search, filter],
  );

  function requestRoleChange(target: UserProfile, next: ChangeableRole) {
    if (target.id === user?.id) {
      setNotice('You cannot change your own account role.');
      return;
    }

    if (target.role === 'admin') {
      setNotice('Administrator roles cannot be changed from this screen.');
      return;
    }

    if (target.role === next) return;

    setNotice('');
    setPendingChange({ target, next });
  }

  async function confirmRoleChange() {
    if (!pendingChange || changing) return;

    const { target, next } = pendingChange;

    if (role !== 'admin') {
      setNotice('Only an administrator can change user roles.');
      setPendingChange(null);
      return;
    }

    if (target.id === user?.id || target.role === 'admin') {
      setNotice('This role change is not allowed.');
      setPendingChange(null);
      return;
    }

    setChanging(true);

    const { data, error } = await supabase
      .from('profiles')
      .update({ role: next })
      .eq('id', target.id)
      .eq('role', target.role)
      .select('id,role')
      .maybeSingle();

    setChanging(false);
    setPendingChange(null);

    if (error) {
      setNotice(
        `Role update failed: ${error.message}. Check the Supabase RLS policy and role-protection trigger.`,
      );
      return;
    }

    if (!data) {
      setNotice(
        'No role was changed. Supabase may be blocking this update, or the profile role has changed. Refresh and try again.',
      );
      await load();
      return;
    }

    setNotice(
      `${target.full_name || target.email} is now ${next}.`,
    );
    await load();
  }

  if (role !== 'admin') {
    return (
      <View style={s.center}>
        <Ionicons
          name="lock-closed-outline"
          size={42}
          color={COLORS.primary}
        />
        <Text style={s.title}>Administrators Only</Text>
      </View>
    );
  }

  return (
    <View style={s.screen}>
      <ScrollView
        contentContainerStyle={s.content}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={s.title}>User Management</Text>
        <Text style={s.subtitle}>
          Manage Student and Teacher profiles. Administrator access is
          restricted.
        </Text>

        <View style={s.summary}>
          <Ionicons
            name="people-outline"
            size={24}
            color={COLORS.primaryDark}
          />
          <View>
            <Text style={s.summaryValue}>{users.length}</Text>
            <Text style={s.muted}>Registered users</Text>
          </View>
          <Pressable
            style={s.refresh}
            onPress={() => {
              setRefreshing(true);
              void load();
            }}
            accessibilityRole="button"
            accessibilityLabel="Refresh users"
          >
            {refreshing ? (
              <ActivityIndicator color={COLORS.primaryDark} />
            ) : (
              <Ionicons
                name="refresh-outline"
                size={21}
                color={COLORS.primaryDark}
              />
            )}
          </Pressable>
        </View>

        <View style={s.searchBox}>
          <Ionicons
            name="search-outline"
            size={20}
            color={COLORS.textSecondary}
          />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search name or email"
            placeholderTextColor={COLORS.textSecondary}
            style={s.searchInput}
            autoCapitalize="none"
          />
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.filters}
        >
          {(['all', 'student', 'teacher', 'admin'] as const).map((item) => (
            <Pressable
              key={item}
              onPress={() => setFilter(item)}
              style={[s.filter, filter === item && s.filterActive]}
            >
              <Text
                style={[
                  s.filterText,
                  filter === item && s.filterTextActive,
                ]}
              >
                {item === 'all'
                  ? 'All users'
                  : item[0].toUpperCase() + item.slice(1)}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        {!!notice && (
          <View style={s.notice}>
            <Text style={s.noticeText}>{notice}</Text>
            <Pressable onPress={() => setNotice('')} accessibilityRole="button">
              <Ionicons
                name="close"
                size={18}
                color={COLORS.textSecondary}
              />
            </Pressable>
          </View>
        )}

        {loading ? (
          <ActivityIndicator
            size="large"
            color={COLORS.primary}
            style={{ margin: 28 }}
          />
        ) : filtered.length === 0 ? (
          <View style={s.empty}>
            <Ionicons
              name="people-outline"
              size={42}
              color={COLORS.textSecondary}
            />
            <Text style={s.cardTitle}>No users found</Text>
            <Text style={s.muted}>Try another search or filter.</Text>
          </View>
        ) : (
          filtered.map((item) => (
            <View key={item.id} style={s.userCard}>
              <View style={s.avatar}>
                <Ionicons
                  name={
                    item.role === 'admin'
                      ? 'shield-checkmark-outline'
                      : item.role === 'teacher'
                        ? 'school-outline'
                        : 'person-outline'
                  }
                  size={23}
                  color={COLORS.primaryDark}
                />
              </View>

              <View style={s.userInfo}>
                <Text style={s.cardTitle}>
                  {item.full_name || 'No name provided'}
                </Text>
                <Text style={s.muted}>{item.email}</Text>
                <View
                  style={[
                    s.badge,
                    item.role === 'admin' && s.adminBadge,
                  ]}
                >
                  <Text style={s.badgeText}>{item.role.toUpperCase()}</Text>
                </View>

                {item.role === 'admin' ? (
                  <Text style={s.protectedText}>
                    <Ionicons name="shield-checkmark-outline" size={13} />{' '}
                    Administrator role protected
                  </Text>
                ) : item.id === user?.id ? (
                  <Text style={s.muted}>Your current account</Text>
                ) : (
                  <>
                    <Text style={s.actionLabel}>Change role</Text>
                    <View style={s.roleButtons}>
                      {(['student', 'teacher'] as const).map((r) => (
                        <Pressable
                          key={r}
                          onPress={() => requestRoleChange(item, r)}
                          disabled={changing || item.role === r}
                          style={[
                            s.roleButton,
                            item.role === r && s.roleButtonSelected,
                            (changing || item.role === r) && s.roleButtonDisabled,
                          ]}
                          accessibilityRole="button"
                          accessibilityLabel={`Change ${item.email} to ${r}`}
                        >
                          <Text
                            style={[
                              s.roleButtonText,
                              item.role === r && s.roleButtonTextSelected,
                            ]}
                          >
                            {r[0].toUpperCase() + r.slice(1)}
                          </Text>
                        </Pressable>
                      ))}
                    </View>
                  </>
                )}
              </View>
            </View>
          ))
        )}
      </ScrollView>

      <Modal
        visible={pendingChange !== null}
        transparent
        animationType="fade"
        onRequestClose={() => {
          if (!changing) setPendingChange(null);
        }}
      >
        <View style={s.modalBackdrop}>
          <View style={s.modalCard}>
            <View style={s.modalIcon}>
              <Ionicons
                name="shield-checkmark-outline"
                size={28}
                color={COLORS.primaryDark}
              />
            </View>
            <Text style={s.modalTitle}>Confirm role change</Text>
            <Text style={s.modalBody}>
              Change {pendingChange?.target.full_name ||
                pendingChange?.target.email}{' '}
              to {pendingChange?.next}?
            </Text>
            <Text style={s.modalHint}>
              Administrator access cannot be assigned or changed here.
            </Text>
            <View style={s.modalActions}>
              <Pressable
                style={s.cancelButton}
                onPress={() => setPendingChange(null)}
                disabled={changing}
              >
                <Text style={s.cancelText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[s.confirmButton, changing && s.buttonDisabled]}
                onPress={() => void confirmRoleChange()}
                disabled={changing}
              >
                {changing ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={s.confirmText}>Confirm</Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: 18, paddingBottom: 32 },
  center: {
    flex: 1,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  title: { fontSize: 26, fontWeight: '800', color: COLORS.textPrimary },
  subtitle: {
    fontSize: 14,
    lineHeight: 21,
    color: COLORS.textSecondary,
    marginTop: 5,
    marginBottom: 18,
  },
  summary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
    padding: 16,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 17,
    marginBottom: 14,
  },
  summaryValue: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  muted: { fontSize: 13, color: COLORS.textSecondary, marginTop: 3 },
  refresh: {
    marginLeft: 'auto',
    padding: 9,
    backgroundColor: COLORS.surface,
    borderRadius: 12,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 14,
    paddingHorizontal: 13,
    marginBottom: 12,
  },
  searchInput: { flex: 1, minHeight: 48, color: COLORS.textPrimary },
  filters: { gap: 8, paddingBottom: 14 },
  filter: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 20,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  filterActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  filterText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  filterTextActive: { color: '#FFFFFF' },
  notice: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    padding: 12,
    borderRadius: 12,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 12,
  },
  noticeText: { flex: 1, color: COLORS.textPrimary, fontSize: 13, lineHeight: 19 },
  userCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 17,
    padding: 15,
    marginBottom: 11,
  },
  avatar: {
    width: 43,
    height: 43,
    borderRadius: 14,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userInfo: { flex: 1 },
  cardTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: COLORS.surface,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 8,
    marginTop: 8,
  },
  adminBadge: { backgroundColor: '#E8E1F8' },
  badgeText: { fontSize: 10, fontWeight: '800', color: COLORS.primaryDark },
  protectedText: {
    color: COLORS.primaryDark,
    fontSize: 12,
    fontWeight: '600',
    marginTop: 12,
  },
  actionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textSecondary,
    marginTop: 12,
  },
  roleButtons: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 7 },
  roleButton: {
    borderRadius: 9,
    paddingHorizontal: 11,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.background,
  },
  roleButtonSelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  roleButtonDisabled: { opacity: 0.7 },
  roleButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  roleButtonTextSelected: { color: '#FFFFFF' },
  empty: {
    alignItems: 'center',
    padding: 30,
    backgroundColor: COLORS.card,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(25, 20, 38, 0.48)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 22,
  },
  modalCard: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: COLORS.card,
    borderRadius: 20,
    padding: 22,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  modalIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 12,
  },
  modalTitle: {
    textAlign: 'center',
    fontSize: 19,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  modalBody: {
    textAlign: 'center',
    color: COLORS.textPrimary,
    fontSize: 14,
    lineHeight: 21,
    marginTop: 12,
  },
  modalHint: {
    textAlign: 'center',
    color: COLORS.textSecondary,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 8,
  },
  modalActions: { flexDirection: 'row', gap: 10, marginTop: 22 },
  cancelButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cancelText: { color: COLORS.textSecondary, fontWeight: '700' },
  confirmButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 11,
    backgroundColor: COLORS.primary,
  },
  confirmText: { color: '#FFFFFF', fontWeight: '700' },
  buttonDisabled: { opacity: 0.65 },
});
