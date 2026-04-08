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

  async changeEmail(_userId: string, _newEmail: string) {
    // TODO: implement when API endpoint is added
    throw new Error('Change email not yet supported via API');
  },

  async changePassword(_userId: string, _currentPassword: string, newPassword: string) {
    await authFetch('/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ newPassword }),
    });
  },

  async setup2FA(userId: string) {
    // This would integrate with a 2FA service
    // For now, return mock data
    return {
      qr_code: 'data:image/png;base64,mock-qr-code',
      secret: 'ABCD-EFGH-IJKL-MNOP'
    };
  },

  async verify2FA(userId: string, code: string) {
    // This would verify the 2FA code
    // For now, mock verification
    if (code.length === 6) {
      return authFetch('/users/me', {
        method: 'PUT',
        body: JSON.stringify({ two_factor_enabled: true }),
      });
    }
    throw new Error('Invalid code');
  },
};