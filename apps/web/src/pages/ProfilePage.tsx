// ===========================================
// Profile Page
// ===========================================
// User profile with info, change password, and preferences.

import {
  Container,
  Typography,
  Card,
  CardContent,
  CardHeader,
  Divider,
  Button,
  Skeleton,
} from '@mui/material';
import { Devices } from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { userApi } from '../api/user.api.js';
import { useNotification } from '../hooks/useNotification.js';
import { useThemeStore } from '../stores/theme.store.js';
import { useAuthStore } from '../stores/auth.store.js';
import { useNavigate } from 'react-router-dom';
import { AccountInfoCard } from '../components/profile/AccountInfoCard.js';
import { PreferencesCard } from '../components/profile/PreferencesCard.js';
import { MfaCard } from '../components/profile/MfaCard.js';
import { ApiKeysCard } from '../components/profile/ApiKeysCard.js';
import { ChangePasswordCard } from '../components/profile/ChangePasswordCard.js';

export function ProfilePage() {
  const notify = useNotification();
  const queryClient = useQueryClient();
  const { setMode } = useThemeStore();
  const { updatePreferences } = useAuthStore();
  const navigate = useNavigate();

  const { data: profile, isLoading } = useQuery({
    queryKey: ['user', 'profile'],
    queryFn: userApi.getProfile,
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

      <AccountInfoCard
        email={profile?.email}
        isAdmin={profile?.isAdmin}
        createdAt={profile?.createdAt}
      />

      <PreferencesCard
        currentTheme={profile?.preferences?.theme || 'system'}
        isPending={updatePreferencesMutation.isPending}
        onThemeChange={handleThemeChange}
      />

      {/* Sessions */}
      <Card sx={{ mb: 3 }}>
        <CardHeader title="Sessions" />
        <Divider />
        <CardContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            View and manage your active sessions across devices.
          </Typography>
          <Button
            variant="outlined"
            startIcon={<Devices />}
            onClick={() => navigate('/sessions')}
          >
            Manage Sessions
          </Button>
        </CardContent>
      </Card>

      <MfaCard />
      <ApiKeysCard />
      <ChangePasswordCard />
    </Container>
  );
}
