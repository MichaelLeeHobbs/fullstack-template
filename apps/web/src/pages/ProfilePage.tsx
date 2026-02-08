// ===========================================
// Profile Page
// ===========================================
// User profile with info, change password, and preferences.

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
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
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  InputAdornment,
  Stack,
} from '@mui/material';
import { LightMode, DarkMode, SettingsBrightness, ContentCopy, Block, Warning, Add } from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { changePasswordSchema, type ChangePasswordInput } from '@fullstack-template/shared';
import { userApi } from '../api/user.api.js';
import { useNotification } from '../hooks/useNotification.js';
import { useThemeStore } from '../stores/theme.store.js';
import { useAuthStore } from '../stores/auth.store.js';
import { useMyApiKeys, useCreateApiKey, useRevokeApiKey } from '../hooks/useApiKeys.js';
import type { ApiKey, CreateApiKeyInput } from '../types/api-key.js';

export function ProfilePage() {
  const notify = useNotification();
  const queryClient = useQueryClient();
  const { setMode } = useThemeStore();
  const { updatePreferences } = useAuthStore();

  // API Keys
  const { data: myKeys } = useMyApiKeys();
  const createKeyMutation = useCreateApiKey();
  const revokeKeyMutation = useRevokeApiKey();
  const [createKeyOpen, setCreateKeyOpen] = useState(false);
  const [keyName, setKeyName] = useState('');
  const [rawKeyDialog, setRawKeyDialog] = useState<string | null>(null);
  const [revokeKeyTarget, setRevokeKeyTarget] = useState<ApiKey | null>(null);

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

      {/* API Keys */}
      <Card sx={{ mb: 3 }}>
        <CardHeader
          title="API Keys"
          action={
            <Button size="small" startIcon={<Add />} onClick={() => setCreateKeyOpen(true)}>
              Create Key
            </Button>
          }
        />
        <Divider />
        <CardContent>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Name</TableCell>
                  <TableCell>Prefix</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Last Used</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {!myKeys || myKeys.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} align="center">No API keys</TableCell>
                  </TableRow>
                ) : (
                  myKeys.map((key) => (
                    <TableRow key={key.id}>
                      <TableCell>{key.name}</TableCell>
                      <TableCell><code>{key.prefix}...</code></TableCell>
                      <TableCell>
                        {!key.isActive ? (
                          <Chip label="Revoked" size="small" color="error" />
                        ) : key.expiresAt && new Date(key.expiresAt) < new Date() ? (
                          <Chip label="Expired" size="small" color="warning" />
                        ) : (
                          <Chip label="Active" size="small" color="success" />
                        )}
                      </TableCell>
                      <TableCell>
                        {key.lastUsedAt ? new Date(key.lastUsedAt).toLocaleDateString() : 'Never'}
                      </TableCell>
                      <TableCell align="right">
                        {key.isActive && (
                          <Tooltip title="Revoke">
                            <IconButton
                              size="small"
                              color="warning"
                              onClick={() => setRevokeKeyTarget(key)}
                            >
                              <Block fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      {/* Create Key Dialog */}
      <Dialog open={createKeyOpen} onClose={() => setCreateKeyOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Create API Key</DialogTitle>
        <DialogContent>
          <TextField
            label="Key Name"
            value={keyName}
            onChange={(e) => setKeyName(e.target.value)}
            fullWidth
            required
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateKeyOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            disabled={!keyName || createKeyMutation.isPending}
            onClick={() => {
              const input: CreateApiKeyInput = { name: keyName, permissionIds: [] };
              createKeyMutation.mutate(input, {
                onSuccess: (data) => {
                  setCreateKeyOpen(false);
                  setKeyName('');
                  setRawKeyDialog(data.rawKey);
                  notify.success('API key created');
                },
                onError: (error: Error) => notify.error(error.message || 'Failed to create'),
              });
            }}
          >
            {createKeyMutation.isPending ? 'Creating...' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Raw Key Display */}
      <Dialog open={!!rawKeyDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Stack direction="row" alignItems="center" spacing={1}>
            <Warning color="warning" /> <span>API Key Created</span>
          </Stack>
        </DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2 }}>
            This key will not be shown again. Copy and store it securely.
          </Alert>
          <TextField
            value={rawKeyDialog ?? ''}
            fullWidth
            slotProps={{
              input: {
                readOnly: true,
                sx: { fontFamily: 'monospace', fontSize: '0.85rem' },
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() => {
                        if (rawKeyDialog) {
                          navigator.clipboard.writeText(rawKeyDialog);
                          notify.success('Copied to clipboard');
                        }
                      }}
                    >
                      <ContentCopy />
                    </IconButton>
                  </InputAdornment>
                ),
              },
            }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRawKeyDialog(null)} variant="contained">Done</Button>
        </DialogActions>
      </Dialog>

      {/* Revoke Key Confirmation */}
      <Dialog open={!!revokeKeyTarget} onClose={() => setRevokeKeyTarget(null)}>
        <DialogTitle>Revoke API Key</DialogTitle>
        <DialogContent>
          Revoke key &quot;{revokeKeyTarget?.name}&quot;? It will immediately stop working.
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRevokeKeyTarget(null)}>Cancel</Button>
          <Button
            color="warning"
            variant="contained"
            disabled={revokeKeyMutation.isPending}
            onClick={() => {
              if (revokeKeyTarget) {
                revokeKeyMutation.mutate(revokeKeyTarget.id, {
                  onSuccess: () => {
                    setRevokeKeyTarget(null);
                    notify.success('API key revoked');
                  },
                  onError: (error: Error) => notify.error(error.message || 'Failed to revoke'),
                });
              }
            }}
          >
            Revoke
          </Button>
        </DialogActions>
      </Dialog>

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
