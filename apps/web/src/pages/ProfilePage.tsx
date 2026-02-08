// ===========================================
// Profile Page
// ===========================================
// User profile with info, change password, and preferences.

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Container,
  Typography,
  Card,
  CardContent,
  CardHeader,
  TextField,
  Button,
  Box,
  Divider,
  ToggleButtonGroup,
  ToggleButton,
  Alert,
  Skeleton,
} from '@mui/material';
import { LightMode, DarkMode, SettingsBrightness } from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { changePasswordSchema, type ChangePasswordInput } from '@fullstack-template/shared';
import { userApi } from '../api/user.api.js';
import { useNotification } from '../hooks/useNotification.js';
import { useThemeStore } from '../stores/theme.store.js';
import { useAuthStore } from '../stores/auth.store.js';

export function ProfilePage() {
  const notify = useNotification();
  const queryClient = useQueryClient();
  const { setMode } = useThemeStore();
  const { updatePreferences } = useAuthStore();

  // Fetch profile
  const { data: profile, isLoading } = useQuery({
    queryKey: ['user', 'profile'],
    queryFn: userApi.getProfile,
  });

  // Change password form
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isValid },
  } = useForm<ChangePasswordInput>({
    resolver: zodResolver(changePasswordSchema),
    mode: 'onChange',
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
  });

  const changePasswordMutation = useMutation({
    mutationFn: (data: ChangePasswordInput) =>
      userApi.changePassword(data.currentPassword, data.newPassword),
    onSuccess: () => {
      notify.success('Password changed successfully');
      reset();
    },
    onError: (error: Error) => {
      notify.error(error.message || 'Failed to change password');
    },
  });

  const updatePreferencesMutation = useMutation({
    mutationFn: userApi.updatePreferences,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['user', 'profile'] });
      setMode(data.theme);
      updatePreferences(data);
      notify.success('Preferences saved');
    },
    onError: () => {
      notify.error('Failed to save preferences');
    },
  });

  const onChangePassword = (data: ChangePasswordInput) => {
    changePasswordMutation.mutate(data);
  };

  const handleThemeChange = (
    _: React.MouseEvent<HTMLElement>,
    value: 'light' | 'dark' | 'system' | null
  ) => {
    if (value) {
      updatePreferencesMutation.mutate({ theme: value });
    }
  };

  if (isLoading) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Skeleton variant="text" width={200} height={40} />
        <Skeleton variant="rectangular" height={200} sx={{ mt: 2 }} />
        <Skeleton variant="rectangular" height={150} sx={{ mt: 2 }} />
        <Skeleton variant="rectangular" height={250} sx={{ mt: 2 }} />
      </Container>
    );
  }

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Typography variant="h4" gutterBottom>
        Profile
      </Typography>

      {/* Account Info */}
      <Card sx={{ mb: 3 }}>
        <CardHeader title="Account Information" />
        <Divider />
        <CardContent>
          <Box sx={{ display: 'grid', gap: 2 }}>
            <Box>
              <Typography variant="caption" color="text.secondary">
                Email
              </Typography>
              <Typography variant="body1">{profile?.email}</Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">
                Role
              </Typography>
              <Typography variant="body1">
                {profile?.isAdmin ? 'Administrator' : 'User'}
              </Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">
                Member Since
              </Typography>
              <Typography variant="body1">
                {profile?.createdAt
                  ? new Date(profile.createdAt).toLocaleDateString()
                  : '-'}
              </Typography>
            </Box>
          </Box>
        </CardContent>
      </Card>

      {/* Preferences */}
      <Card sx={{ mb: 3 }}>
        <CardHeader title="Preferences" />
        <Divider />
        <CardContent>
          <Typography variant="subtitle2" gutterBottom>
            Theme
          </Typography>
          <ToggleButtonGroup
            value={profile?.preferences?.theme || 'system'}
            exclusive
            onChange={handleThemeChange}
            disabled={updatePreferencesMutation.isPending}
          >
            <ToggleButton value="light">
              <LightMode sx={{ mr: 1 }} /> Light
            </ToggleButton>
            <ToggleButton value="dark">
              <DarkMode sx={{ mr: 1 }} /> Dark
            </ToggleButton>
            <ToggleButton value="system">
              <SettingsBrightness sx={{ mr: 1 }} /> System
            </ToggleButton>
          </ToggleButtonGroup>
        </CardContent>
      </Card>

      {/* Change Password */}
      <Card>
        <CardHeader title="Change Password" />
        <Divider />
        <CardContent>
          {changePasswordMutation.isError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {changePasswordMutation.error?.message || 'Failed to change password'}
            </Alert>
          )}
          <Box
            component="form"
            onSubmit={handleSubmit(onChangePassword)}
            noValidate
            sx={{
              display: 'flex',
              flexDirection: 'column',
              gap: 2,
              maxWidth: 400,
            }}
          >
            <TextField
              {...register('currentPassword')}
              type="password"
              label="Current Password"
              error={!!errors.currentPassword}
              helperText={errors.currentPassword?.message}
              autoComplete="current-password"
            />
            <TextField
              {...register('newPassword')}
              type="password"
              label="New Password"
              error={!!errors.newPassword}
              helperText={errors.newPassword?.message || 'At least 8 characters, one uppercase, one number'}
              autoComplete="new-password"
            />
            <TextField
              {...register('confirmPassword')}
              type="password"
              label="Confirm New Password"
              error={!!errors.confirmPassword}
              helperText={errors.confirmPassword?.message}
              autoComplete="new-password"
            />
            <Button
              type="submit"
              variant="contained"
              disabled={changePasswordMutation.isPending || !isValid}
            >
              {changePasswordMutation.isPending ? 'Changing...' : 'Change Password'}
            </Button>
          </Box>
        </CardContent>
      </Card>
    </Container>
  );
}

export default ProfilePage;
