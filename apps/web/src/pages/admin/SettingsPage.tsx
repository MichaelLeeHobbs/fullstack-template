// ===========================================
// Admin Settings Page
// ===========================================
// Manage system settings (feature flags, AI config, etc.)

import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Switch,
  TextField,
  Button,
  Tabs,
  Tab,
  Alert,
  CircularProgress,
  Container,
  Snackbar,
} from '@mui/material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '../../api/admin.api.js';

interface Setting {
  key: string;
  value: string;
  type: 'string' | 'number' | 'boolean' | 'json';
  description: string | null;
  category: string | null;
}

export function SettingsPage() {
  const [activeTab, setActiveTab] = useState<string>('');
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string }>({
    open: false,
    message: '',
  });
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ['admin', 'settings'],
    queryFn: () => adminApi.getSettings(),
  });

  const updateMutation = useMutation({
    mutationFn: ({ key, value }: { key: string; value: unknown }) =>
      adminApi.updateSetting(key, value),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'settings'] });
      setSnackbar({ open: true, message: 'Setting updated successfully' });
    },
    onError: () => {
      setSnackbar({ open: true, message: 'Failed to update setting' });
    },
  });

  // Set initial tab when data loads
  const categories = Object.keys(data?.grouped || {});
  useEffect(() => {
    if (categories.length > 0 && !activeTab && categories[0]) {
      setActiveTab(categories[0]);
    }
  }, [categories.length]); // eslint-disable-line

  if (isLoading) {
    return (
      <Container sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
        <CircularProgress />
      </Container>
    );
  }

  if (error) {
    return (
      <Container sx={{ mt: 4 }}>
        <Alert severity="error">
          Failed to load settings. Make sure you have admin access.
        </Alert>
      </Container>
    );
  }

  const currentSettings = (data?.grouped[activeTab] || []) as Setting[];

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Typography variant="h4" gutterBottom>
        System Settings
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Configure application behavior and feature flags.
      </Typography>

      {categories.length > 0 && (
        <Tabs
          value={activeTab}
          onChange={(_, v) => setActiveTab(v)}
          sx={{ mb: 3, borderBottom: 1, borderColor: 'divider' }}
        >
          {categories.map((cat) => (
            <Tab
              key={cat}
              label={cat.charAt(0).toUpperCase() + cat.slice(1)}
              value={cat}
            />
          ))}
        </Tabs>
      )}

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {currentSettings.map((setting) => (
          <SettingCard
            key={setting.key}
            setting={setting}
            onUpdate={(value) =>
              updateMutation.mutate({ key: setting.key, value })
            }
            isUpdating={updateMutation.isPending}
          />
        ))}
      </Box>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        message={snackbar.message}
      />
    </Container>
  );
}

// ===========================================
// Setting Card Component
// ===========================================

interface SettingCardProps {
  setting: Setting;
  onUpdate: (value: unknown) => void;
  isUpdating: boolean;
}

function SettingCard({ setting, onUpdate, isUpdating }: SettingCardProps) {
  const [localValue, setLocalValue] = useState(setting.value);
  const hasChanges = localValue !== setting.value;

  // Reset local value when setting changes (after mutation)
  if (setting.value !== localValue && !hasChanges) {
    setLocalValue(setting.value);
  }

  const handleSave = () => {
    let parsedValue: unknown = localValue;
    if (setting.type === 'number') {
      parsedValue = Number(localValue);
    } else if (setting.type === 'boolean') {
      parsedValue = localValue === 'true';
    }
    onUpdate(parsedValue);
  };

  const handleBooleanToggle = (checked: boolean) => {
    setLocalValue(checked ? 'true' : 'false');
    onUpdate(checked);
  };

  return (
    <Card variant="outlined">
      <CardContent>
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            gap: 2,
          }}
        >
          <Box sx={{ flex: 1 }}>
            <Typography
              variant="subtitle1"
              fontWeight="bold"
              sx={{ fontFamily: 'monospace' }}
            >
              {setting.key}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {setting.description || 'No description'}
            </Typography>
          </Box>

          {setting.type === 'boolean' ? (
            <Switch
              checked={localValue === 'true'}
              onChange={(e) => handleBooleanToggle(e.target.checked)}
              disabled={isUpdating}
            />
          ) : (
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
              <TextField
                size="small"
                value={localValue}
                onChange={(e) => setLocalValue(e.target.value)}
                type={setting.type === 'number' ? 'number' : 'text'}
                disabled={isUpdating}
                sx={{ width: 200 }}
              />
              {hasChanges && (
                <Button
                  variant="contained"
                  size="small"
                  onClick={handleSave}
                  disabled={isUpdating}
                >
                  Save
                </Button>
              )}
            </Box>
          )}
        </Box>
      </CardContent>
    </Card>
  );
}

