import { supabase } from '../lib/supabase';
import { authFetch } from '../lib/apiClient';

export const userService = {
  async getUserProfile(_userId: string) {
    return authFetch('/users/me');
  },

  async updateUserProfile(_userId: string, updates: any) {
    const mappedUpdates: any = {};

    if (updates.name !== undefined) mappedUpdates.user_name = updates.name;

    const directFields = [
      'avatar_url', 'tags', 'description', 'gender', 'birth_date',
      'hometown', 'nationality', 'languages', 'marital_status',
      'permanent_address', 'current_address', 'two_factor_enabled',
    ];
    directFields.forEach(field => {
      if (updates[field] !== undefined) mappedUpdates[field] = updates[field];
    });

    return authFetch('/users/me', { method: 'PUT', body: JSON.stringify(mappedUpdates) });
  },

  async uploadAvatar(userId: string, file: File) {
    const fileExt = file.name.split('.').pop();
    const fileName = `${userId}.${fileExt}`;
    const filePath = `avatars/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(filePath, file, { upsert: true });

    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage
      .from('avatars')
      .getPublicUrl(filePath);

    return authFetch('/users/me', { method: 'PUT', body: JSON.stringify({ avatar_url: publicUrl }) });
  },

  async changeEmail(_userId: string, newEmail: string) {
    return authFetch<{ message: string }>('/auth/change-email', {
      method: 'POST',
      body: JSON.stringify({ newEmail }),
    });
  },

  async changePassword(_userId: string, currentPassword: string, newPassword: string) {
    await authFetch('/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ currentPassword, newPassword }),
    });
  },

  async setup2FA(_userId: string) {
    return authFetch<{ factor_id: string; qr_code: string; secret: string; uri: string }>(
      '/auth/2fa/enroll',
      { method: 'POST' },
    );
  },

  async verify2FA(_userId: string, factorId: string, code: string) {
    return authFetch<{ message: string; access_token?: string }>('/auth/2fa/verify', {
      method: 'POST',
      body: JSON.stringify({ factor_id: factorId, code }),
    });
  },

  async disable2FA(_userId: string) {
    return authFetch<{ message: string }>('/auth/2fa/disable', {
      method: 'POST',
    });
  },
};