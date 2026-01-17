// ===========================================
// Profile Page
// ===========================================
// User profile with info, change password, and preferences.

import { useState } from 'react';
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

  // Change password state
  const [passwords, setPasswords] = useState({
    current: '',
    new: '',
    confirm: '',
  });
  const [passwordError, setPasswordError] = useState('');

  const changePasswordMutation = useMutation({
    mutationFn: () =>
      userApi.changePassword(passwords.current, passwords.new),
    onSuccess: () => {
      notify.success('Password changed successfully');
      setPasswords({ current: '', new: '', confirm: '' });
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

  const handleChangePassword = () => {
    setPasswordError('');

    if (passwords.new !== passwords.confirm) {
      setPasswordError('Passwords do not match');
      return;
    }
    if (passwords.new.length < 8) {
      setPasswordError('Password must be at least 8 characters');
      return;
    }

    changePasswordMutation.mutate();
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
          {passwordError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {passwordError}
            </Alert>
          )}
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              gap: 2,
              maxWidth: 400,
            }}
          >
            <TextField
              type="password"
              label="Current Password"
              value={passwords.current}
              onChange={(e) =>
                setPasswords({ ...passwords, current: e.target.value })
              }
              autoComplete="current-password"
            />
            <TextField
              type="password"
              label="New Password"
              value={passwords.new}
              onChange={(e) =>
                setPasswords({ ...passwords, new: e.target.value })
              }
              autoComplete="new-password"
            />
            <TextField
              type="password"
              label="Confirm New Password"
              value={passwords.confirm}
              onChange={(e) =>
                setPasswords({ ...passwords, confirm: e.target.value })
              }
              autoComplete="new-password"
            />
            <Button
              variant="contained"
              onClick={handleChangePassword}
              disabled={
                changePasswordMutation.isPending ||
                !passwords.current ||
                !passwords.new ||
                !passwords.confirm
              }
            >
              {changePasswordMutation.isPending
                ? 'Changing...'
                : 'Change Password'}
            </Button>
          </Box>
        </CardContent>
      </Card>
    </Container>
  );
}

export default ProfilePage;
