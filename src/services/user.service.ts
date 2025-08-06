import { supabase } from '../lib/supabase';

export const userService = {
  async getUserProfile(userId: string) {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error) throw error;
    return data;
  },

  async updateUserProfile(userId: string, updates: any) {
    // Map frontend field names to database column names
    const mappedUpdates: any = {};
    
    if (updates.name !== undefined) {
      mappedUpdates.user_name = updates.name;
    }
    if (updates.email !== undefined) {
      mappedUpdates.user_email = updates.email;
    }
    
    // Copy other fields that match database schema
    const directFields = [
      'avatar_url', 'tags', 'description', 'gender', 'birth_date',
      'hometown', 'nationality', 'languages', 'marital_status',
      'permanent_address', 'current_address', 'two_factor_enabled'
    ];
    
    directFields.forEach(field => {
      if (updates[field] !== undefined) {
        mappedUpdates[field] = updates[field];
      }
    });

    const { data, error } = await supabase
      .from('users')
      .update(mappedUpdates)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async uploadAvatar(userId: string, file: File) {
    // Upload file to Supabase Storage
    const fileExt = file.name.split('.').pop();
    const fileName = `${userId}.${fileExt}`;
    const filePath = `avatars/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(filePath, file, { upsert: true });

    if (uploadError) throw uploadError;

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('avatars')
      .getPublicUrl(filePath);

    // Update user profile with avatar URL
    const { data, error } = await supabase
      .from('users')
      .update({ avatar_url: publicUrl })
      .eq('user_id', userId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async changeEmail(userId: string, newEmail: string) {
    // This would typically involve Supabase Auth
    const { error } = await supabase.auth.updateUser({
      email: newEmail
    });

    if (error) throw error;
  },

  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    // This would typically involve Supabase Auth
    const { error } = await supabase.auth.updateUser({
      password: newPassword
    });

    if (error) throw error;
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
      const { data, error } = await supabase
        .from('users')
        .update({ two_factor_enabled: true })
        .eq('user_id', userId)
        .select()
        .single();

      if (error) throw error;
      return data;
    }
    throw new Error('Invalid code');
  },
};