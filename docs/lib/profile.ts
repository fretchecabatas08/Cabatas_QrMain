
import { supabase } from './supabase';

export type Role = 'student' | 'teacher' | 'admin';

export type Profile = {
  id: string;
  email: string;
  full_name: string | null;
  role: Role;
  avatar_url: string | null;
};

export async function getProfile(
  userId: string
): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, email, full_name, role, avatar_url')
    .eq('id', userId)
    .maybeSingle();

  if (error || !data) {
    if (error) console.error('getProfile error:', error.message);
    return null;
  }

  return data as Profile;
}

export async function updateProfile(
  userId: string,
  updates: {
    full_name?: string;
    role?: Role;
    avatar_url?: string | null;
  }
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', userId);

  return { error: error?.message ?? null };
}

export async function uploadAvatar(
  userId: string,
  imageUri: string
): Promise<{ url: string | null; error: string | null }> {
  try {
    const response = await fetch(imageUri);

    if (!response.ok) {
      return { url: null, error: 'Could not read the selected image.' };
    }

    const blob = await response.blob();
    const path = `${userId}/avatar.jpg`;

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(path, blob, {
        contentType: 'image/jpeg',
        upsert: true,
      });

    if (uploadError) {
      return { url: null, error: uploadError.message };
    }

    const { data } = supabase.storage
      .from('avatars')
      .getPublicUrl(path);

    const url = `${data.publicUrl}?t=${Date.now()}`;

    const { error: profileError } = await updateProfile(userId, {
      avatar_url: url,
    });

    if (profileError) {
      return { url: null, error: profileError };
    }

    return { url, error: null };
  } catch (error: any) {
    return {
      url: null,
      error: error?.message ?? 'Failed to upload profile picture.',
    };
  }
}
