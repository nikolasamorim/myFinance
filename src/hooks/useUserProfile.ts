import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { userService } from '../services/user.service';
import { useAuth } from '../context/AuthContext';

export function useUserProfile() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['user-profile', user?.id],
    queryFn: () => userService.getUserProfile(user!.id),
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const updateProfile = useMutation({
    mutationFn: (updates: any) => userService.updateUserProfile(user!.id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-profile', user?.id] });
    },
  });

  const uploadAvatar = useMutation({
    mutationFn: (file: File) => userService.uploadAvatar(user!.id, file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-profile', user?.id] });
    },
  });

  const changeEmail = useMutation({
    mutationFn: (newEmail: string) => userService.changeEmail(user!.id, newEmail),
  });

  const changePassword = useMutation({
    mutationFn: ({ currentPassword, newPassword }: { currentPassword: string; newPassword: string }) =>
      userService.changePassword(user!.id, currentPassword, newPassword),
  });

  const setup2FA = useMutation({
    mutationFn: () => userService.setup2FA(user!.id),
  });

  const verify2FA = useMutation({
    mutationFn: (code: string) => userService.verify2FA(user!.id, code),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-profile', user?.id] });
    },
  });

  return {
    ...query,
    updateProfile,
    uploadAvatar,
    changeEmail,
    changePassword,
    setup2FA,
    verify2FA,
  };
}