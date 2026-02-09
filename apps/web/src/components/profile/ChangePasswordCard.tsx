// ===========================================
// Change Password Card
// ===========================================

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Card, CardContent, CardHeader, Divider, TextField, Button, Box, Alert } from '@mui/material';
import { useMutation } from '@tanstack/react-query';
import { changePasswordSchema, type ChangePasswordInput } from '@fullstack-template/shared';
import { userApi } from '../../api/user.api.js';
import { useNotification } from '../../hooks/useNotification.js';

export function ChangePasswordCard() {
  const notify = useNotification();

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

  return (
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
          onSubmit={handleSubmit((data) => changePasswordMutation.mutate(data))}
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
            helperText={errors.newPassword?.message || 'At least 8 characters'}
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
  );
}
