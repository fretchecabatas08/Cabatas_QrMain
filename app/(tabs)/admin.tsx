import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useState } from 'react';
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
import { supabase } from '@/docs/lib/supabase';

type UserProfile = {
  id: string;
  email: string;
  full_name: string | null;
  role: 'student' | 'teacher' | 'admin';
};

export default function AdminScreen() {
  const { role, user } = useAuth();

  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  async function loadUsers() {
    setLoadingUsers(true);

    const { data, error } = await supabase
      .from('profiles')
      .select('id, email, full_name, role')
      .order('email');

    if (error) {
      console.log('ADMIN USERS ERROR:', error);
      setUsers([]);
    } else {
      setUsers((data ?? []) as UserProfile[]);
    }

    setLoadingUsers(false);
  }

  async function changeRole(
    userId: string,
    newRole: 'student' | 'teacher' | 'admin'
  ) {
    if (userId === user?.id) {
      Alert.alert(
        'Action Not Allowed',
        'You cannot change your own administrator role.'
      );
      return;
    }

    const { error } = await supabase
      .from('profiles')
      .update({ role: newRole })
      .eq('id', userId);

    if (error) {
      Alert.alert('Error', error.message);
      return;
    }

    Alert.alert(
      'Role Updated',
      `User role changed to ${newRole}.`
    );

    loadUsers();
  }

  useEffect(() => {
    if (role === 'admin') {
      loadUsers();
    }
  }, [role]);

  if (role === null) {
    return (
      <View style={styles.centerContainer}>
        <Ionicons
          name="person-circle-outline"
          size={64}
          color={COLORS.primary}
        />

        <Text style={styles.title}>
          Checking your account...
        </Text>

        <Text style={styles.subtitle}>
          Please wait while we check your account role.
        </Text>
      </View>
    );
  }

  if (role !== 'admin') {
    return (
      <View style={styles.centerContainer}>
        <Ionicons
          name="lock-closed-outline"
          size={64}
          color={COLORS.primary}
        />

        <Text style={styles.title}>
          Administrators Only
        </Text>

        <Text style={styles.subtitle}>
          Only administrator accounts can access the admin dashboard.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>
            Administrator Dashboard
          </Text>

          <Text style={styles.headerSubtitle}>
            Manage registered users
          </Text>
        </View>

        <Ionicons
          name="shield-checkmark-outline"
          size={36}
          color={COLORS.primary}
        />
      </View>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>
          User Management
        </Text>

        <Text style={styles.userCount}>
          {users.length} user{users.length !== 1 ? 's' : ''}
        </Text>
      </View>

      {loadingUsers ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator
            size="large"
            color={COLORS.primary}
          />

          <Text style={styles.loadingText}>
            Loading users...
          </Text>
        </View>
      ) : (
        <FlatList
          data={users}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons
                name="people-outline"
                size={50}
                color={COLORS.textSecondary}
              />

              <Text style={styles.emptyTitle}>
                No users found
              </Text>

              <Text style={styles.emptyText}>
                There are no registered users to display.
              </Text>
            </View>
          }
          renderItem={({ item }) => {
            const isCurrentUser = item.id === user?.id;

            return (
              <View style={styles.userCard}>
                <View style={styles.userIcon}>
                  <Ionicons
                    name="person-outline"
                    size={24}
                    color={COLORS.primary}
                  />
                </View>

                <View style={styles.userInfo}>
                  <Text style={styles.userName}>
                    {item.full_name || 'No name'}
                  </Text>

                  <Text style={styles.userEmail}>
                    {item.email}
                  </Text>

                  <View style={styles.roleBadge}>
                    <Text style={styles.roleText}>
                      {item.role.toUpperCase()}
                    </Text>
                  </View>

                  <View style={styles.roleButtons}>
                    <Pressable
                      disabled={isCurrentUser}
                      style={[
                        styles.roleButton,
                        isCurrentUser &&
                          styles.disabledRoleButton,
                      ]}
                      onPress={() =>
                        changeRole(item.id, 'student')
                      }
                    >
                      <Text style={styles.roleButtonText}>
                        Student
                      </Text>
                    </Pressable>

                    <Pressable
                      disabled={isCurrentUser}
                      style={[
                        styles.roleButton,
                        isCurrentUser &&
                          styles.disabledRoleButton,
                      ]}
                      onPress={() =>
                        changeRole(item.id, 'teacher')
                      }
                    >
                      <Text style={styles.roleButtonText}>
                        Teacher
                      </Text>
                    </Pressable>

                    <Pressable
                      disabled={isCurrentUser}
                      style={[
                        styles.roleButton,
                        isCurrentUser &&
                          styles.disabledRoleButton,
                      ]}
                      onPress={() =>
                        changeRole(item.id, 'admin')
                      }
                    >
                      <Text style={styles.roleButtonText}>
                        Admin
                      </Text>
                    </Pressable>
                  </View>

                  {isCurrentUser && (
                    <Text style={styles.currentUserText}>
                      Current account
                    </Text>
                  )}
                </View>
              </View>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    padding: 20,
  },

  centerContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
    padding: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },

  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },

  headerSubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 4,
  },

  title: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.textPrimary,
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 8,
  },

  subtitle: {
    fontSize: 15,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },

  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },

  sectionTitle: {
    fontSize: 19,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },

  userCount: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },

  list: {
    paddingBottom: 20,
  },

  userCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
  },

  userIcon: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },

  userInfo: {
    flex: 1,
  },

  userName: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },

  userEmail: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 3,
  },

  roleBadge: {
    alignSelf: 'flex-start',
    marginTop: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: COLORS.background,
  },

  roleText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.primary,
  },

  roleButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 10,
    gap: 6,
  },

  roleButton: {
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    paddingHorizontal: 9,
    paddingVertical: 6,
  },

  disabledRoleButton: {
    opacity: 0.4,
  },

  roleButtonText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.primary,
  },

  currentUserText: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 6,
  },

  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  loadingText: {
    marginTop: 10,
    fontSize: 14,
    color: COLORS.textSecondary,
  },

  emptyContainer: {
    alignItems: 'center',
    paddingTop: 60,
  },

  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginTop: 12,
  },

  emptyText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: 6,
  },
});